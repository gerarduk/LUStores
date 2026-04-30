/**
 * @fileoverview Enhanced CSV Import Component
 * 
 * Provides a robust CSV import interface with validation and preview.
 * Features:
 * - Drag and drop file upload
 * - CSV parsing with validation
 * - Preview before import
 * - Error reporting
 * - Template download
 * - Field mapping
 * 
 * @module client/components/CSVImport
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, Download, AlertCircle } from "lucide-react";

type CSVRowData = Record<string, string | number | boolean | null>;

interface CSVImportProps {
  onImport: (data: CSVRowData[]) => Promise<{ successful: number; failed: number; errors?: string[] }>;
  templateColumns: { key: string; label: string; required?: boolean }[];
  entityName?: string;
  maxPreviewRows?: number;
}

export default function CSVImport({
  onImport,
  templateColumns,
  entityName = "items",
  maxPreviewRows = 10
}: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRowData[]>([]);
  const [previewData, setPreviewData] = useState<CSVRowData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = templateColumns.map(col => col.label).join(',');
    const example = templateColumns.map(col => {
      if (col.key === 'name') return 'Example Item';
      if (col.key === 'sku') return 'SKU-001';
      if (col.key === 'price') return '9.99';
      if (col.key === 'currentStock') return '100';
      if (col.key === 'category') return 'Category Name';
      if (col.key === 'location') return 'A1-B2-C3';
      return 'value';
    }).join(',');
    
    const csv = `${headers}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}-import-template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CSVRowData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setParseErrors(['CSV file must have at least a header row and one data row']);
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const errors: string[] = [];
    
    // Validate headers
    const requiredColumns = templateColumns.filter(col => col.required);
    const missingColumns = requiredColumns.filter(
      col => !headers.some(h => h.toLowerCase() === col.label.toLowerCase())
    );
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.map(c => c.label).join(', ')}`);
    }

    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const row: CSVRowData = {};
      
      headers.forEach((header, i) => {
        const column = templateColumns.find(
          col => col.label.toLowerCase() === header.toLowerCase()
        );
        if (column) {
          row[column.key] = values[i] || '';
        }
      });
      
      row._rowNumber = index + 2; // +2 because index 0 is row 1, and we skip header
      return row;
    });

    setParseErrors(errors);
    return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      processFile(droppedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setParsedData(data);
      setPreviewData(data.slice(0, maxPreviewRows));
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0 || parseErrors.length > 0) return;
    
    setIsProcessing(true);
    try {
      const result = await onImport(parsedData);
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        successful: 0,
        failed: parsedData.length,
        errors: [(error as Error).message]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setPreviewData([]);
    setImportResult(null);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CSV Import</span>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardTitle>
        <CardDescription>
          Import {entityName} in bulk from a CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-university-blue transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drop CSV file here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports CSV files up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <>
            {/* File Info */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {parsedData.length} rows • {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Change File
              </Button>
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {parseErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            {previewData.length > 0 && parseErrors.length === 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">Preview (first {maxPreviewRows} rows)</h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {templateColumns.map(col => (
                            <TableHead key={col.key}>{col.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, i) => (
                          <TableRow key={i}>
                            {templateColumns.map(col => (
                              <TableCell key={col.key}>{row[col.key] || '-'}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isProcessing}
                    className="bg-university-blue hover:bg-university-dark"
                  >
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>Import {parsedData.length} {entityName}</>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Import Result */}
            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                {importResult.failed > 0 ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <Badge variant="default" className="bg-green-600">
                        {importResult.successful} Successful
                      </Badge>
                      {importResult.failed > 0 && (
                        <Badge variant="destructive">
                          {importResult.failed} Failed
                        </Badge>
                      )}
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
