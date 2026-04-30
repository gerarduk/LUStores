import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Trash2,
  Calendar,
  Database,
  Clock,
  HardDrive,
  Play,
  Pause,
  Settings,
  AlertTriangle,
  Download,
  Archive,
  Loader2
} from 'lucide-react';
import ArchiveManager from '@/components/ArchiveManager';

interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
  description?: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: string;
  newestBackup?: string;
  scheduledCount: number;
  manualCount: number;
}

interface ScheduleStatus {
  active: boolean;
  cronExpression?: string;
  nextRun?: string;
}

interface BackupJob {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  filename?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  backup?: BackupInfo;
}

export default function Backups() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [backupDescription, setBackupDescription] = useState('');
  const [compression, setCompression] = useState(true);
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [activeBackupJob, setActiveBackupJob] = useState<BackupJob | null>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    dropExisting: true, // Default to true for safer restores
    dataOnly: false,
    schemaOnly: false
  });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for backup job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await apiRequest('GET', `/api/backups/jobs/${jobId}`);
      const job: BackupJob = await response.json();
      setActiveBackupJob(job);

      if (job.status === 'completed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        toast({
          title: "Backup Created",
          description: "Database backup has been created successfully."
        });
        queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
        queryClient.invalidateQueries({ queryKey: ['/api/backups/stats'] });
        setShowCreateDialog(false);
        setBackupDescription('');
        setActiveBackupJob(null);
      } else if (job.status === 'failed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        toast({
          title: "Backup Failed",
          description: job.error || "Failed to create database backup.",
          variant: "destructive"
        });
        setActiveBackupJob(null);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  };

  // Fetch backups list
  const { data: backups = [], isLoading: loadingBackups } = useQuery<BackupInfo[]>({
    queryKey: ['/api/backups'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch backup statistics
  const { data: stats } = useQuery<BackupStats>({
    queryKey: ['/api/backups/stats'],
    refetchInterval: 30000
  });

  // Fetch schedule status
  const { data: scheduleStatus } = useQuery<ScheduleStatus>({
    queryKey: ['/api/backups/schedule/status'],
    refetchInterval: 10000
  });

  // Create backup mutation (now async with job polling)
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/backups', {
        compression,
        description: backupDescription
      });
      return await response.json();
    },
    onSuccess: (data: { jobId: string; status: string; filename: string; startedAt: string }) => {
      // Start polling for job status
      setActiveBackupJob({
        id: data.jobId,
        status: data.status as 'pending' | 'in_progress',
        filename: data.filename,
        startedAt: data.startedAt
      });
      
      toast({
        title: "Backup Started",
        description: "Database backup is being created. This may take a minute..."
      });
      
      // Poll every 2 seconds for job status
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(data.jobId);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to start database backup.",
        variant: "destructive"
      });
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await apiRequest('POST', `/api/backups/${filename}/restore`, restoreOptions);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Restore Complete",
        description: "Database has been restored successfully."
      });
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore database.",
        variant: "destructive"
      });
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await apiRequest('DELETE', `/api/backups/${filename}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "Backup file has been deleted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/backups/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete backup.",
        variant: "destructive"
      });
    }
  });

  // Schedule backup mutation
  const scheduleBackupMutation = useMutation({
    mutationFn: async (expression: string) => {
      const response = await apiRequest('POST', '/api/backups/schedule', { cronExpression: expression });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: "Backup schedule has been configured successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups/schedule/status'] });
      setShowScheduleDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Schedule Failed",
        description: error.message || "Failed to configure backup schedule.",
        variant: "destructive"
      });
    }
  });

  // Stop schedule mutation
  const stopScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/backups/schedule');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule Stopped",
        description: "Automatic backups have been disabled."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups/schedule/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Stop Failed",
        description: error.message || "Failed to stop backup schedule.",
        variant: "destructive"
      });
    }
  });

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backups/${filename}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${filename}...`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download backup",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Management</h1>
        <p className="text-muted-foreground">
          Manage database backups, archives, and automated schedules
        </p>
      </div>

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="backups" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="archives" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Backup Schedule</DialogTitle>
                <DialogDescription>
                  Set up automatic database backups using cron expressions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Input
                    id="cron"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 2 * * * (daily at 2 AM)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Examples: "0 2 * * *" (daily 2 AM), "0 2 * * 0" (weekly Sunday 2 AM)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => scheduleBackupMutation.mutate(cronExpression)}
                    disabled={scheduleBackupMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Schedule
                  </Button>
                  {scheduleStatus?.active && (
                    <Button 
                      variant="outline"
                      onClick={() => stopScheduleMutation.mutate()}
                      disabled={stopScheduleMutation.isPending}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Schedule
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Database className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Database Backup</DialogTitle>
                <DialogDescription>
                  Create a manual backup of the database
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={backupDescription}
                    onChange={(e) => setBackupDescription(e.target.value)}
                    placeholder="e.g., Before system update"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={compression}
                    onCheckedChange={(checked) => setCompression(!!checked)}
                  />
                  <Label htmlFor="compression">Enable compression</Label>
                </div>
                {activeBackupJob && (activeBackupJob.status === 'pending' || activeBackupJob.status === 'in_progress') && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Backup in progress: {activeBackupJob.filename}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        This may take a minute for large databases...
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending || !!activeBackupJob}
                  className="w-full"
                >
                  {createBackupMutation.isPending || activeBackupJob ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {activeBackupJob ? 'Backup in Progress...' : 'Starting...'}
                    </>
                  ) : (
                    'Create Backup'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBackups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduledCount}</div>
              <p className="text-xs text-muted-foreground">
                {scheduleStatus?.active ? 'Active' : 'Inactive'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.manualCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Status Alert */}
      {scheduleStatus && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Automatic backups are {scheduleStatus.active ? 'enabled' : 'disabled'}.
            {scheduleStatus.active && ' Next backup will occur according to the configured schedule.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            Manage your database backup files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="text-center py-8">Loading backups...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No backups found. Create your first backup to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup: BackupInfo) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{backup.filename}</h3>
                      <Badge variant={backup.type === 'scheduled' ? 'default' : 'secondary'}>
                        {backup.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatDate(backup.createdAt)}</span>
                      <span>{formatFileSize(backup.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadBackup(backup.filename)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setShowRestoreDialog(true);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBackupMutation.mutate(backup.filename)}
                      disabled={deleteBackupMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Restore Database
            </DialogTitle>
            <DialogDescription>
              This will restore the database from the selected backup. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedBackup.filename}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {formatDate(selectedBackup.createdAt)} | 
                  Size: {formatFileSize(selectedBackup.size)}
                </p>
              </div>
              
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Restoring a backup will overwrite your current database. 
                    Make sure you have a current backup before proceeding.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dropExisting"
                    checked={restoreOptions.dropExisting}
                    onCheckedChange={(checked) => 
                      setRestoreOptions(prev => ({ ...prev, dropExisting: !!checked }))
                    }
                  />
                  <Label htmlFor="dropExisting">Drop existing data before restore (recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dataOnly"
                    checked={restoreOptions.dataOnly}
                    onCheckedChange={(checked) => 
                      setRestoreOptions(prev => ({ ...prev, dataOnly: !!checked }))
                    }
                  />
                  <Label htmlFor="dataOnly">Restore data only (no schema)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="schemaOnly"
                    checked={restoreOptions.schemaOnly}
                    onCheckedChange={(checked) => 
                      setRestoreOptions(prev => ({ ...prev, schemaOnly: !!checked }))
                    }
                  />
                  <Label htmlFor="schemaOnly">Restore schema only (no data)</Label>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This operation will modify your database. Make sure you have a recent backup before proceeding.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRestoreDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => restoreBackupMutation.mutate(selectedBackup.filename)}
                  disabled={restoreBackupMutation.isPending}
                  className="flex-1"
                >
                  {restoreBackupMutation.isPending ? 'Restoring...' : 'Restore Database'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="archives">
          <ArchiveManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}