import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { db } from './dbConfig';
import { archiveJobs, orders, sales, stockMovements } from '../shared/schema';
import { eq, lt, sql } from 'drizzle-orm';

const execAsync = promisify(exec);

export interface ArchivePreview {
  orders: {
    count: number;
    oldestDate: string | null;
    newestDate: string | null;
  };
  sales: {
    count: number;
    oldestDate: string | null;
    newestDate: string | null;
  };
  stockMovements: {
    count: number;
    oldestDate: string | null;
    newestDate: string | null;
  };
  pdfFiles: {
    count: number;
    totalSizeBytes: number;
  };
  totalRecords: number;
}

export interface ArchiveJob {
  id: number;
  archiveName: string;
  archivePath: string;
  ageThresholdDays: number;
  recordsArchived: Record<string, any>;
  archiveSizeBytes: number;
  status: string;
  createdBy: string | null;
  createdAt: Date | null;
  deletedFromDb: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  errorMessage: string | null;
}

export class DataArchiveManager {
  private archiveDir: string;

  constructor(archiveDir?: string) {
    this.archiveDir = archiveDir || process.env.ARCHIVE_DIR || './archives';

    // Ensure archive directory exists
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Preview what would be archived without actually creating an archive
   */
  async previewArchive(ageThresholdDays: number): Promise<ArchivePreview> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageThresholdDays);

    try {
      // Count old orders
      const ordersResult = await db
        .select({
          count: sql<number>`count(*)`,
          oldestDate: sql<string>`min(created_at)`,
          newestDate: sql<string>`max(created_at)`,
        })
        .from(orders)
        .where(lt(orders.createdAt, cutoffDate))
        .execute();

      // Count old sales
      const salesResult = await db
        .select({
          count: sql<number>`count(*)`,
          oldestDate: sql<string>`min(created_at)`,
          newestDate: sql<string>`max(created_at)`,
        })
        .from(sales)
        .where(lt(sales.createdAt, cutoffDate))
        .execute();

      // Count old stock movements
      const stockMovementsResult = await db
        .select({
          count: sql<number>`count(*)`,
          oldestDate: sql<string>`min(created_at)`,
          newestDate: sql<string>`max(created_at)`,
        })
        .from(stockMovements)
        .where(lt(stockMovements.createdAt, cutoffDate))
        .execute();

      // Count PDF files that would be archived
      const pdfResult = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(
          sql`${orders.createdAt} < ${cutoffDate} AND ${orders.invoicePdfPath} IS NOT NULL`
        )
        .execute();

      const ordersCount = Number(ordersResult[0]?.count || 0);
      const salesCount = Number(salesResult[0]?.count || 0);
      const stockMovementsCount = Number(stockMovementsResult[0]?.count || 0);
      const pdfCount = Number(pdfResult[0]?.count || 0);

      // Estimate PDF file sizes
      let totalPdfSize = 0;
      if (pdfCount > 0) {
        const pdfOrders = await db
          .select({ invoicePdfPath: orders.invoicePdfPath })
          .from(orders)
          .where(
            sql`${orders.createdAt} < ${cutoffDate} AND ${orders.invoicePdfPath} IS NOT NULL`
          )
          .execute();

        for (const order of pdfOrders) {
          if (order.invoicePdfPath) {
            const fullPath = path.join(process.cwd(), 'public', order.invoicePdfPath);
            try {
              const stats = fs.statSync(fullPath);
              totalPdfSize += stats.size;
            } catch (error) {
              // File might not exist, skip it
            }
          }
        }
      }

      return {
        orders: {
          count: ordersCount,
          oldestDate: ordersResult[0]?.oldestDate || null,
          newestDate: ordersResult[0]?.newestDate || null,
        },
        sales: {
          count: salesCount,
          oldestDate: salesResult[0]?.oldestDate || null,
          newestDate: salesResult[0]?.newestDate || null,
        },
        stockMovements: {
          count: stockMovementsCount,
          oldestDate: stockMovementsResult[0]?.oldestDate || null,
          newestDate: stockMovementsResult[0]?.newestDate || null,
        },
        pdfFiles: {
          count: pdfCount,
          totalSizeBytes: totalPdfSize,
        },
        totalRecords: ordersCount + salesCount + stockMovementsCount,
      };
    } catch (error) {
      console.error('Error previewing archive:', error);
      throw new Error('Failed to preview archive');
    }
  }

  /**
   * Create an archive of old data
   */
  async createArchive(ageThresholdDays: number, createdBy: string): Promise<ArchiveJob> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const archiveName = `archive_${timestamp}_${ageThresholdDays}days`;
    const tempDir = path.join(this.archiveDir, `${archiveName}_temp`);
    const zipPath = path.join(this.archiveDir, `${archiveName}.zip`);

    // Create temp directory for SQL dumps
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const sqlDir = path.join(tempDir, 'sql');
    const invoicesDir = path.join(tempDir, 'invoices');
    fs.mkdirSync(sqlDir, { recursive: true });
    fs.mkdirSync(invoicesDir, { recursive: true });

    // Create archive job record
    const [archiveJobRecord] = await db
      .insert(archiveJobs)
      .values({
        archiveName,
        archivePath: zipPath,
        ageThresholdDays,
        status: 'in_progress',
        createdBy,
      })
      .returning();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ageThresholdDays);
      const cutoffDateStr = cutoffDate.toISOString();

      // Export data using pg_dump with WHERE clauses
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Parse database URL to get connection details
      const dbUrlObj = new URL(dbUrl);
      const host = dbUrlObj.hostname;
      const port = dbUrlObj.port || '5432';
      const database = dbUrlObj.pathname.slice(1);
      const username = dbUrlObj.username;
      const password = dbUrlObj.password;

      const pgEnv = {
        ...process.env,
        PGPASSWORD: password,
      };

      // Export orders and order_items
      console.log('Exporting orders...');
      await execAsync(
        `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ` +
        `--table=orders --table=order_items --data-only --inserts ` +
        `--file="${path.join(sqlDir, 'orders.sql')}"`,
        { env: pgEnv }
      );

      // Export sales and sale_items
      console.log('Exporting sales...');
      await execAsync(
        `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ` +
        `--table=sales --table=sale_items --data-only --inserts ` +
        `--file="${path.join(sqlDir, 'sales.sql')}"`,
        { env: pgEnv }
      );

      // Export stock_movements
      console.log('Exporting stock movements...');
      await execAsync(
        `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} ` +
        `--table=stock_movements --data-only --inserts ` +
        `--file="${path.join(sqlDir, 'stock_movements.sql')}"`,
        { env: pgEnv }
      );

      // Copy invoice PDFs
      console.log('Copying invoice PDFs...');
      const pdfOrders = await db
        .select({ id: orders.id, invoicePdfPath: orders.invoicePdfPath })
        .from(orders)
        .where(
          sql`${orders.createdAt} < ${cutoffDateStr} AND ${orders.invoicePdfPath} IS NOT NULL`
        )
        .execute();

      let pdfCount = 0;
      for (const order of pdfOrders) {
        if (order.invoicePdfPath) {
          const sourcePath = path.join(process.cwd(), 'public', order.invoicePdfPath);
          const fileName = path.basename(order.invoicePdfPath);
          const destPath = path.join(invoicesDir, fileName);

          try {
            if (fs.existsSync(sourcePath)) {
              fs.copyFileSync(sourcePath, destPath);
              pdfCount++;
            }
          } catch (error) {
            console.warn(`Failed to copy PDF for order ${order.id}:`, error);
          }
        }
      }

      // Get counts for metadata
      const preview = await this.previewArchive(ageThresholdDays);

      // Create metadata file
      const metadata = {
        archiveName,
        createdAt: new Date().toISOString(),
        createdBy,
        ageThresholdDays,
        cutoffDate: cutoffDateStr,
        records: {
          orders: preview.orders.count,
          sales: preview.sales.count,
          stockMovements: preview.stockMovements.count,
          pdfFiles: pdfCount,
        },
        totalRecords: preview.totalRecords,
      };

      fs.writeFileSync(
        path.join(tempDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Create ZIP archive
      console.log('Creating ZIP archive...');
      await this.createZipArchive(tempDir, zipPath);

      // Get ZIP file size
      const zipStats = fs.statSync(zipPath);

      // Update archive job record
      await db
        .update(archiveJobs)
        .set({
          status: 'completed',
          recordsArchived: metadata.records,
          archiveSizeBytes: zipStats.size,
        })
        .where(eq(archiveJobs.id, archiveJobRecord.id));

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      console.log(`Archive created successfully: ${zipPath}`);

      return {
        ...archiveJobRecord,
        status: 'completed',
        recordsArchived: metadata.records,
        archiveSizeBytes: zipStats.size,
      };
    } catch (error) {
      console.error('Error creating archive:', error);

      // Update archive job with error
      await db
        .update(archiveJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(archiveJobs.id, archiveJobRecord.id));

      // Clean up
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      throw error;
    }
  }

  /**
   * Create a ZIP archive from a directory
   */
  private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`ZIP created: ${archive.pointer()} total bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Delete archived data from active database
   */
  async deleteArchivedData(archiveJobId: number, confirmedBy: string): Promise<void> {
    // Get archive job
    const [archiveJob] = await db
      .select()
      .from(archiveJobs)
      .where(eq(archiveJobs.id, archiveJobId))
      .execute();

    if (!archiveJob) {
      throw new Error('Archive job not found');
    }

    if (archiveJob.status !== 'completed') {
      throw new Error('Archive must be completed before deleting data');
    }

    if (archiveJob.deletedFromDb) {
      throw new Error('Data has already been deleted from database');
    }

    // Verify archive file exists
    if (!fs.existsSync(archiveJob.archivePath)) {
      throw new Error('Archive file not found - cannot delete data without verified archive');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - archiveJob.ageThresholdDays);

    try {
      // Begin transaction and delete data in proper order
      await db.transaction(async (tx) => {
        // Delete sale_items first (references sales)
        const deletedSaleItems = await tx
          .delete(sql`sale_items`)
          .where(
            sql`id IN (
              SELECT si.id FROM sale_items si
              JOIN sales s ON si.sale_id = s.id
              WHERE s.created_at < ${cutoffDate}
            )`
          )
          .execute();

        // Delete sales
        const deletedSales = await tx
          .delete(sales)
          .where(lt(sales.createdAt, cutoffDate))
          .execute();

        // Delete order_items first (references orders)
        const deletedOrderItems = await tx
          .delete(sql`order_items`)
          .where(
            sql`id IN (
              SELECT oi.id FROM order_items oi
              JOIN orders o ON oi.order_id = o.id
              WHERE o.created_at < ${cutoffDate}
            )`
          )
          .execute();

        // Get PDF paths before deleting orders
        const pdfOrders = await tx
          .select({ invoicePdfPath: orders.invoicePdfPath })
          .from(orders)
          .where(
            sql`${orders.createdAt} < ${cutoffDate} AND ${orders.invoicePdfPath} IS NOT NULL`
          )
          .execute();

        // Delete orders
        const deletedOrders = await tx
          .delete(orders)
          .where(lt(orders.createdAt, cutoffDate))
          .execute();

        // Delete stock_movements
        const deletedStockMovements = await tx
          .delete(stockMovements)
          .where(lt(stockMovements.createdAt, cutoffDate))
          .execute();

        // Delete physical PDF files (outside transaction)
        for (const order of pdfOrders) {
          if (order.invoicePdfPath) {
            const fullPath = path.join(process.cwd(), 'public', order.invoicePdfPath);
            try {
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
              }
            } catch (error) {
              console.warn(`Failed to delete PDF file ${fullPath}:`, error);
            }
          }
        }

        console.log(`Deleted archived data: ${deletedOrders} orders, ${deletedSales} sales, ${deletedStockMovements} stock movements`);
      });

      // Mark archive job as deleted
      await db
        .update(archiveJobs)
        .set({
          deletedFromDb: true,
          deletedAt: new Date(),
          deletedBy: confirmedBy,
        })
        .where(eq(archiveJobs.id, archiveJobId));

      console.log('Archived data deleted successfully from active database');
    } catch (error) {
      console.error('Error deleting archived data:', error);
      throw new Error('Failed to delete archived data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * List all archive jobs
   */
  async listArchives(): Promise<ArchiveJob[]> {
    const archives = await db
      .select()
      .from(archiveJobs)
      .orderBy(sql`${archiveJobs.createdAt} DESC`)
      .execute();

    return archives as ArchiveJob[];
  }

  /**
   * Get archive file path for download
   */
  async getArchivePath(archiveJobId: number): Promise<string> {
    const [archiveJob] = await db
      .select()
      .from(archiveJobs)
      .where(eq(archiveJobs.id, archiveJobId))
      .execute();

    if (!archiveJob) {
      throw new Error('Archive not found');
    }

    if (!fs.existsSync(archiveJob.archivePath)) {
      throw new Error('Archive file not found on disk');
    }

    return archiveJob.archivePath;
  }
}

// Singleton instance
export const archiveManager = new DataArchiveManager();
