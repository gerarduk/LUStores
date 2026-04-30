import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import * as cron from 'node-cron';

const execAsync = promisify(exec);

export interface BackupOptions {
  filename?: string;
  compression?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
  excludeTables?: string[];
  description?: string;
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  type: 'manual' | 'scheduled';
  description?: string;
}

export interface BackupJob {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  filename?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  backup?: BackupInfo;
}

export class DatabaseBackupManager {
  private backupDir: string;
  private maxBackups: number;
  private scheduledJob?: cron.ScheduledTask;
  private backupJobs: Map<string, BackupJob> = new Map();
  private dbConfig: {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  };

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || '30');
    this.dbConfig = this.parseConnectionString();
    // Note: ensureBackupDirectory is async and will be called when needed
    // Clean up old jobs every 5 minutes
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  private parseConnectionString(): {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  } {
    // Parse DATABASE_URL if provided, otherwise use individual PG* variables
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        return {
          host: url.hostname,
          port: url.port || '5432',
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1) // Remove leading '/'
        };
      } catch (error) {
        console.error('Failed to parse DATABASE_URL:', error);
      }
    }
    
    // Fallback to individual environment variables
    return {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || '5432',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.PGDATABASE || process.env.DB_NAME || 'university_inventory'
    };
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  private generateBackupFilename(type: 'manual' | 'scheduled' = 'manual'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `university_inventory_${type}_${timestamp}.sql`;
  }

  private buildPgDumpCommand(filename: string, options: BackupOptions = {}): string {
    const {
      compression = true,
      schemaOnly = false,
      dataOnly = false,
      excludeTables = []
    } = options;

    let command = 'pg_dump';
    
    // Connection parameters using parsed config
    command += ` --host=${this.dbConfig.host}`;
    command += ` --port=${this.dbConfig.port}`;
    command += ` --username=${this.dbConfig.user}`;
    command += ` --dbname=${this.dbConfig.database}`;

    // Backup options
    command += ' --verbose --no-password';
    
    if (compression) {
      command += ' --format=custom --compress=9';
      filename = filename.replace('.sql', '.backup');
    } else {
      command += ' --format=plain';
    }

    if (schemaOnly) command += ' --schema-only';
    if (dataOnly) command += ' --data-only';

    // Exclude tables
    excludeTables.forEach(table => {
      command += ` --exclude-table=${table}`;
    });

    // Output file
    command += ` --file="${path.join(this.backupDir, filename)}"`;

    return command;
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupInfo> {
    // Ensure backup directory exists before attempting backup
    await this.ensureBackupDirectory();
    
    const filename = options.filename || this.generateBackupFilename('manual');
    const fullPath = path.join(this.backupDir, filename);

    try {
      console.log(`Starting database backup: ${filename}`);
      console.log(`Connecting to: ${this.dbConfig.user}@${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`);

      const command = this.buildPgDumpCommand(filename, options);

      // Set PGPASSWORD for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password
      };

      let stdout, stderr;
      try {
        ({ stdout, stderr } = await execAsync(command, { env }));
      } catch (execError: any) {
        // Only throw if process actually failed (non-zero exit code)
        console.error('Backup process failed:', execError.stderr || execError);
        // Clean up partial backup file if it exists
        try { await fs.unlink(fullPath); } catch {}
        throw new Error(`Database backup failed: ${execError.stderr || execError.message || execError}`);
      }

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('Backup warnings:', stderr);
      }

      // Get file stats
      const stats = await fs.stat(fullPath);

      const backupInfo: BackupInfo = {
        id: Date.now().toString(),
        filename,
        size: stats.size,
        createdAt: new Date(),
        type: 'manual',
        description: options.description
      };

      console.log(`Backup completed successfully: ${filename} (${this.formatFileSize(stats.size)})`);

      // Save backup metadata
      await this.addBackupToMetadata(backupInfo);

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupInfo;
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error(`Database backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start a backup job asynchronously and return immediately with the job ID.
   * The backup runs in the background and progress can be checked with getBackupJob().
   */
  startBackupAsync(options: BackupOptions = {}): BackupJob {
    const jobId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = options.filename || this.generateBackupFilename('manual');
    
    const job: BackupJob = {
      id: jobId,
      status: 'pending',
      filename,
      startedAt: new Date()
    };
    
    this.backupJobs.set(jobId, job);
    
    // Start backup in background (don't await)
    this.runBackupInBackground(jobId, { ...options, filename });
    
    return job;
  }

  /**
   * Run the backup process in the background and update job status.
   */
  private async runBackupInBackground(jobId: string, options: BackupOptions): Promise<void> {
    const job = this.backupJobs.get(jobId);
    if (!job) return;
    
    job.status = 'in_progress';
    
    try {
      const backupInfo = await this.createBackup(options);
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.backup = backupInfo;
      
      console.log(`Background backup job ${jobId} completed successfully`);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : String(error);
      
      console.error(`Background backup job ${jobId} failed:`, error);
    }
  }

  /**
   * Get the status of a backup job by ID.
   */
  getBackupJob(jobId: string): BackupJob | undefined {
    return this.backupJobs.get(jobId);
  }

  /**
   * Get all active (pending/in_progress) backup jobs.
   */
  getActiveBackupJobs(): BackupJob[] {
    return Array.from(this.backupJobs.values()).filter(
      job => job.status === 'pending' || job.status === 'in_progress'
    );
  }

  /**
   * Clean up old completed/failed jobs (keep for 1 hour).
   */
  private cleanupOldJobs(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [jobId, job] of this.backupJobs.entries()) {
      if (job.completedAt && job.completedAt.getTime() < oneHourAgo) {
        this.backupJobs.delete(jobId);
      }
    }
  }

  async restoreFromBackup(filename: string, options: { 
    dropExisting?: boolean;
    createDatabase?: boolean;
    dataOnly?: boolean;
    schemaOnly?: boolean;
  } = {}): Promise<void> {
    // Ensure backup directory exists
    await this.ensureBackupDirectory();
    
    const backupPath = path.join(this.backupDir, filename);
    
    try {
      // Verify backup file exists
      await fs.access(backupPath);

      console.log(`Starting database restore from: ${filename}`);
      console.log(`Connecting to: ${this.dbConfig.user}@${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`);

      // Determine file format
      const isCustomFormat = filename.endsWith('.backup');

      let command = isCustomFormat ? 'pg_restore' : 'psql';

      // Connection parameters using parsed config
      command += ` --host=${this.dbConfig.host}`;
      command += ` --port=${this.dbConfig.port}`;
      command += ` --username=${this.dbConfig.user}`;
      command += ` --dbname=${this.dbConfig.database}`;

      if (isCustomFormat) {
        // pg_restore options
        command += ' --verbose --no-password';
        command += ' --no-owner'; // Don't restore ownership (prevents permission errors)
        command += ' --no-privileges'; // Don't restore access privileges (prevents permission errors)

        if (options.dropExisting) {
          command += ' --clean --if-exists';
        }
        if (options.createDatabase) command += ' --create';
        if (options.dataOnly) command += ' --data-only';
        if (options.schemaOnly) command += ' --schema-only';

        command += ` "${backupPath}"`;
      } else {
        // psql options for plain SQL files
        command += ' --single-transaction'; // Wrap restore in a transaction
        command += ` --file="${backupPath}"`;

        // Add ON_ERROR_STOP to stop on first error
        command += ' --set ON_ERROR_STOP=on';
      }

      // Set PGPASSWORD for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.dbConfig.password
      };

      console.log('Executing restore command...');
      console.log('Full command:', command.replace(this.dbConfig.password, '****'));
      
      let stdout, stderr;
      try {
        ({ stdout, stderr } = await execAsync(command, {
          env,
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large restores
        }));
      } catch (execError: any) {
        // For pg_restore, exit code 1 might not be fatal (especially with --no-owner/--no-privileges)
        // Check if this is a "errors ignored" situation
        const isIgnoredErrors = execError.stderr && 
          (execError.stderr.includes('errors ignored on restore') || 
           execError.stderr.includes('warnings ignored'));
        
        // For pg_restore with custom format, some warnings are expected and non-fatal
        const isCustomFormatWarning = isCustomFormat && 
          execError.code === 1 && 
          (execError.stderr.includes('warning') || isIgnoredErrors);
        
        // Also allow exit code 1 for certain non-fatal scenarios
        const isNonFatalExit = execError.code === 1 && 
          (isIgnoredErrors || execError.stderr.includes('already exists'));
        
        if (!isCustomFormatWarning && !isIgnoredErrors && !isNonFatalExit) {
          // Log detailed error information for actual failures
          console.error('Restore process failed with exit code:', execError.code);
          console.error('Command:', command.replace(this.dbConfig.password, '****'));
          console.error('Error output:', execError.stderr || execError);
          throw new Error(`Database restore failed: ${execError.stderr || execError.message || execError}`);
        } else {
          // Log the warning but continue
          console.warn('Restore completed with warnings (non-fatal):', execError.stderr);
          // Set stderr to empty so it doesn't get processed as an error below
          stderr = '';
        }
      }

      if (stderr) {
        // Filter out benign notices and warnings
        const errorLines = stderr.split('\n').filter(line =>
          !line.includes('NOTICE') &&
          !line.includes('pg_restore: warning:') &&
          !line.includes('errors ignored on restore') &&
          line.trim().length > 0
        );

        if (errorLines.length > 0) {
          console.warn('Restore warnings/errors:', errorLines.join('\n'));
          // Don't throw error for warnings that were ignored
          if (!stderr.includes('errors ignored on restore') && !stderr.includes('warnings ignored')) {
            throw new Error(`Restore completed with errors: ${errorLines.join('; ')}`);
          }
        }
      }

      if (stdout) {
        console.log('Restore output:', stdout);
      }

      console.log(`Database restore completed successfully from: ${filename}`);
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Database restore failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    // Ensure backup directory exists
    await this.ensureBackupDirectory();
    
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.endsWith('.sql') || file.endsWith('.backup') || file === 'backups-metadata.json'
      ).filter(file => file !== 'backups-metadata.json'); // Exclude metadata file itself

      const metadata = await this.loadBackupMetadata();
      const backups: BackupInfo[] = [];

      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        // Try to get metadata first, fall back to filesystem info
        const existingMetadata = metadata[file];
        
        if (existingMetadata) {
          // Use stored metadata
          backups.push(existingMetadata);
        } else {
          // Fall back to filesystem info for legacy backups
          const type = file.includes('_scheduled_') ? 'scheduled' : 'manual';
          
          backups.push({
            id: stats.mtime.getTime().toString(),
            filename: file,
            size: stats.size,
            createdAt: stats.mtime,
            type
          });
        }
      }

      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async deleteBackup(filename: string): Promise<void> {
    const backupPath = path.join(this.backupDir, filename);
    
    try {
      await fs.unlink(backupPath);
      
      // Remove from metadata
      const metadata = await this.loadBackupMetadata();
      delete metadata[filename];
      await this.saveBackupMetadata(metadata);
      
      console.log(`Backup deleted: ${filename}`);
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length > this.maxBackups) {
      const backupsToDelete = backups.slice(this.maxBackups);
      
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.filename);
      }
      
      console.log(`Cleaned up ${backupsToDelete.length} old backups`);
    }
  }

  private getMetadataFilePath(): string {
    return path.join(this.backupDir, 'backups-metadata.json');
  }

  private async loadBackupMetadata(): Promise<Record<string, BackupInfo>> {
    const metadataPath = this.getMetadataFilePath();
    
    try {
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is corrupted, return empty metadata
      return {};
    }
  }

  private async saveBackupMetadata(metadata: Record<string, BackupInfo>): Promise<void> {
    const metadataPath = this.getMetadataFilePath();
    
    try {
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to save backup metadata:', error);
    }
  }

  private async addBackupToMetadata(backupInfo: BackupInfo): Promise<void> {
    const metadata = await this.loadBackupMetadata();
    metadata[backupInfo.filename] = backupInfo;
    await this.saveBackupMetadata(metadata);
  }

  scheduleBackups(cronExpression: string = '0 2 * * *'): void {
    // Stop existing scheduled job if any
    if (this.scheduledJob) {
      this.scheduledJob.stop();
    }

    // Schedule new backup job
    this.scheduledJob = cron.schedule(cronExpression, async () => {
      try {
        console.log('Starting scheduled backup...');
        
        const filename = this.generateBackupFilename('scheduled');
        await this.createBackup({ 
          filename,
          compression: true,
          description: 'Automated scheduled backup'
        });
        
        console.log('Scheduled backup completed successfully');
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, {
      timezone: process.env.TZ || 'UTC'
    });

    console.log(`Backup scheduled with cron expression: ${cronExpression}`);
  }

  stopScheduledBackups(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = undefined;
      console.log('Scheduled backups stopped');
    }
  }

  getScheduleStatus(): { active: boolean; expression?: string } {
    return {
      active: !!this.scheduledJob,
      expression: this.scheduledJob ? 'Configured' : undefined
    };
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    scheduledCount: number;
    manualCount: number;
  }> {
    const backups = await this.listBackups();
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : undefined,
      newestBackup: backups.length > 0 ? backups[0].createdAt : undefined,
      scheduledCount: backups.filter(b => b.type === 'scheduled').length,
      manualCount: backups.filter(b => b.type === 'manual').length
    };
  }

  async validateBackup(filename: string): Promise<{ valid: boolean; error?: string }> {
    const backupPath = path.join(this.backupDir, filename);
    
    try {
      await fs.access(backupPath);
      
      // For custom format backups, use pg_restore --list to validate
      if (filename.endsWith('.backup')) {
        const command = `pg_restore --list "${backupPath}"`;
        await execAsync(command);
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}

// Singleton instance
export const backupManager = new DatabaseBackupManager();