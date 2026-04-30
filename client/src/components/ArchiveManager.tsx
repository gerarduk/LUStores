import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Archive,
  Download,
  Trash2,
  AlertTriangle,
  FileArchive,
  Settings as SettingsIcon
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ArchiveJob {
  id: number;
  archiveName: string;
  archivePath: string;
  ageThresholdDays: number;
  recordsArchived: {
    orders?: number;
    sales?: number;
    stockMovements?: number;
    pdfFiles?: number;
  };
  archiveSizeBytes: number;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
  deletedFromDb: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  errorMessage: string | null;
}

interface ArchivePreview {
  orders: { count: number; oldestDate: string | null; newestDate: string | null };
  sales: { count: number; oldestDate: string | null; newestDate: string | null };
  stockMovements: { count: number; oldestDate: string | null; newestDate: string | null };
  pdfFiles: { count: number; totalSizeBytes: number };
  totalRecords: number;
}

interface ArchiveSettings {
  ageThresholdDays: number;
}

export default function ArchiveManager() {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchiveJob | null>(null);
  const [ageThresholdDays, setAgeThresholdDays] = useState(2190); // 6 years default
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch archive settings
  const { data: settings } = useQuery<ArchiveSettings>({
    queryKey: ['/api/archives/settings'],
  });

  // Update age threshold when settings are loaded
  React.useEffect(() => {
    if (settings?.ageThresholdDays) {
      setAgeThresholdDays(settings.ageThresholdDays);
    }
  }, [settings]);

  // Fetch archives list
  const { data: archives = [], isLoading: loadingArchives } = useQuery<ArchiveJob[]>({
    queryKey: ['/api/archives'],
    refetchInterval: 30000
  });

  // Fetch preview
  const { data: preview, isLoading: loadingPreview, refetch: refetchPreview } = useQuery<ArchivePreview>({
    queryKey: ['/api/archives/preview', ageThresholdDays],
    enabled: false
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await apiRequest('PUT', '/api/archives/settings', { ageThresholdDays: days });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: `Archive threshold set to ${ageThresholdDays} days.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/archives/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create archive mutation
  const createArchiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/archives/create', { ageThresholdDays });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Archive Created",
        description: "Data archive has been created successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/archives'] });
      setShowPreview(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete archived data mutation
  const deleteDataMutation = useMutation({
    mutationFn: async (archiveId: number) => {
      const response = await apiRequest('DELETE', `/api/archives/${archiveId}/purge-data`, {
        confirmed: true,
        confirmationCode
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Deleted",
        description: "Archived data has been deleted from the active database."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/archives'] });
      setShowDeleteConfirmation(false);
      setSelectedArchive(null);
      setConfirmationCode('');
      setConfirmationChecked(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePreview = async () => {
    setShowPreview(true);
    await refetchPreview();
  };

  const handleDownloadArchive = async (archiveId: number, archiveName: string) => {
    try {
      const response = await fetch(`/api/archives/${archiveId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download archive');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${archiveName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${archiveName}.zip...`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download archive",
        variant: "destructive"
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Archive Settings
          </CardTitle>
          <CardDescription>Configure data archiving threshold</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="threshold">Age Threshold (days)</Label>
              <Input
                id="threshold"
                type="number"
                value={ageThresholdDays}
                onChange={(e) => setAgeThresholdDays(Number(e.target.value))}
                min={1}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Approximately {Math.round(ageThresholdDays / 365)} years ({ageThresholdDays} days)
              </p>
            </div>
            <Button
              onClick={() => updateSettingsMutation.mutate(ageThresholdDays)}
              disabled={updateSettingsMutation.isPending}
            >
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview and Create Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Create Archive
          </CardTitle>
          <CardDescription>
            Preview and create an archive of data older than {ageThresholdDays} days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handlePreview}
              variant="outline"
              disabled={loadingPreview}
            >
              {loadingPreview ? 'Loading...' : 'Preview Archive'}
            </Button>
            <Button
              onClick={() => createArchiveMutation.mutate()}
              disabled={createArchiveMutation.isPending}
            >
              {createArchiveMutation.isPending ? 'Creating...' : 'Create Archive'}
            </Button>
          </div>

          {showPreview && preview && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h4 className="font-semibold">Archive Preview:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Orders:</p>
                  <p>{preview.orders.count} records</p>
                  {preview.orders.oldestDate && (
                    <p className="text-muted-foreground text-xs">
                      {new Date(preview.orders.oldestDate).toLocaleDateString()} -
                      {preview.orders.newestDate && new Date(preview.orders.newestDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Sales:</p>
                  <p>{preview.sales.count} records</p>
                  {preview.sales.oldestDate && (
                    <p className="text-muted-foreground text-xs">
                      {new Date(preview.sales.oldestDate).toLocaleDateString()} -
                      {preview.sales.newestDate && new Date(preview.sales.newestDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Stock Movements:</p>
                  <p>{preview.stockMovements.count} records</p>
                </div>
                <div>
                  <p className="font-medium">PDF Files:</p>
                  <p>{preview.pdfFiles.count} files ({formatBytes(preview.pdfFiles.totalSizeBytes)})</p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="font-semibold">Total Records: {preview.totalRecords}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archives List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Archives
          </CardTitle>
          <CardDescription>Download or manage existing archives</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingArchives ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : archives.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No archives created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((archive) => (
                  <TableRow key={archive.id}>
                    <TableCell className="font-medium">{archive.archiveName}</TableCell>
                    <TableCell>{formatDate(archive.createdAt)}</TableCell>
                    <TableCell>{formatBytes(archive.archiveSizeBytes)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {archive.recordsArchived.orders || 0} orders,
                        {archive.recordsArchived.sales || 0} sales,
                        {archive.recordsArchived.stockMovements || 0} movements
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={archive.status === 'completed' ? 'default' : 'destructive'}>
                          {archive.status}
                        </Badge>
                        {archive.deletedFromDb && (
                          <Badge variant="outline" className="ml-2">Data Deleted</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadArchive(archive.id, archive.archiveName)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {!archive.deletedFromDb && archive.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedArchive(archive);
                              setShowDeleteConfirmation(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Data
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Archived Data from Active Database
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete the archived data from your active database.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedArchive && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                <h4 className="font-semibold">Archive: {selectedArchive.archiveName}</h4>
                <p className="text-sm">
                  Records to be deleted:{' '}
                  {selectedArchive.recordsArchived.orders || 0} orders,
                  {selectedArchive.recordsArchived.sales || 0} sales,
                  {selectedArchive.recordsArchived.stockMovements || 0} stock movements
                </p>
                <p className="text-sm">
                  PDF files: {selectedArchive.recordsArchived.pdfFiles || 0}
                </p>
              </div>

              <div className="bg-destructive/10 border border-destructive rounded-lg p-4 space-y-3">
                <p className="font-semibold text-destructive">Before proceeding:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Download and verify the archive ZIP file</li>
                  <li>Ensure you have a recent database backup</li>
                  <li>Confirm you want to permanently delete this data</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirm-checkbox"
                    checked={confirmationChecked}
                    onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
                  />
                  <Label htmlFor="confirm-checkbox" className="text-sm">
                    I have downloaded and verified the archive
                  </Label>
                </div>

                <div>
                  <Label htmlFor="confirm-code">
                    Type the archive ID ({selectedArchive.id}) to confirm:
                  </Label>
                  <Input
                    id="confirm-code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder={selectedArchive.id.toString()}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setSelectedArchive(null);
                    setConfirmationCode('');
                    setConfirmationChecked(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteDataMutation.mutate(selectedArchive.id)}
                  disabled={
                    !confirmationChecked ||
                    confirmationCode !== selectedArchive.id.toString() ||
                    deleteDataMutation.isPending
                  }
                >
                  {deleteDataMutation.isPending ? 'Deleting...' : 'Delete Data Permanently'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
