import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Link as LinkIcon } from 'lucide-react';
import type { Order, OrderWithDetails } from '@shared/schema';
import InvoiceReviewForm from './InvoiceReviewForm';
import { useToast } from '@/hooks/use-toast';

interface InvoiceUploadProps {
  onInvoiceParsed?: (orderData: OrderWithDetails) => void;
  onInvoiceImported?: (order: Order) => void;
}

interface ParsedInvoice {
  orderId: string;
  supplier: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  subtotal: number;
  vatAmount: number;
  total: number;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}

export const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  onInvoiceParsed,
  onInvoiceImported
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAssignToOrder, setShowAssignToOrder] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Fetch orders for assignment
  const { data: ordersData } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['/api/orders'],
    enabled: showAssignToOrder,
  });

  const orders = ordersData?.orders || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const parseInvoice = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoice', selectedFile);

      setUploadProgress(30);

      const response = await fetch('/api/orders/upload-invoice', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to parse invoice');
      }

      const result = await response.json();
      setUploadProgress(100);

      setParsedInvoice(result.parsedInvoice);
      setShowPreview(true);
      
      if (onInvoiceParsed) {
        onInvoiceParsed(result.parsedInvoice);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse invoice');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const importAsOrder = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoice', selectedFile);

      const response = await fetch('/api/orders/import-from-invoice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import invoice');
      }

      const result = await response.json();
      
      if (onInvoiceImported) {
        onInvoiceImported(result.order);
      }

      // Close dialog and reset state
      setIsOpen(false);
      resetState();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import invoice');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitReviewedData = async (editedData: ParsedInvoice, pdfFile: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoice', pdfFile);
      formData.append('parsedData', JSON.stringify(editedData));

      const response = await fetch('/api/orders/create-from-parsed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const result = await response.json();

      toast({
        title: "Order Created",
        description: `Order ${result.order.orderId} created successfully from invoice.`
      });

      if (onInvoiceImported) {
        onInvoiceImported(result.order);
      }

      // Close dialog and reset state
      setIsOpen(false);
      resetState();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create order',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const assignToOrder = async () => {
    if (!selectedFile || !selectedOrderId) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoice', selectedFile);

      const response = await fetch(`/api/orders/${selectedOrderId}/upload-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign invoice to order');
      }

      const result = await response.json();

      toast({
        title: "Invoice Attached",
        description: `Invoice successfully attached to order ${selectedOrderId}`
      });

      if (onInvoiceImported) {
        onInvoiceImported(result.order);
      }

      // Close dialog and reset state
      setIsOpen(false);
      resetState();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign invoice');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to assign invoice',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setParsedInvoice(null);
    setError(null);
    setShowPreview(false);
    setShowReviewForm(false);
    setShowAssignToOrder(false);
    setSelectedOrderId('');
    setUploadProgress(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetState();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Invoice PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Invoice PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!showPreview && !showReviewForm && (
            <Card>
              <CardHeader>
                <CardTitle>Select Invoice PDF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="invoice-upload"
                  />
                  <label htmlFor="invoice-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <div className="text-lg font-medium">
                      {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Maximum file size: 10MB
                    </div>
                  </label>
                </div>

                {selectedFile && !showAssignToOrder && (
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={parseInvoice}
                      disabled={isUploading}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Extract & Create Order
                    </Button>
                    <Button
                      onClick={() => setShowAssignToOrder(true)}
                      disabled={isUploading}
                      variant="secondary"
                      className="gap-2"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Assign to Existing Order
                    </Button>
                  </div>
                )}

                {/* Assign to Order Section */}
                {selectedFile && showAssignToOrder && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="order-select">Select Order</Label>
                      <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                        <SelectTrigger id="order-select">
                          <SelectValue placeholder="Choose an order..." />
                        </SelectTrigger>
                        <SelectContent>
                          {orders.map((order) => (
                            <SelectItem key={order.id} value={order.id.toString()}>
                              {order.orderId} - {order.supplierId} ({order.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={() => setShowAssignToOrder(false)}
                        variant="outline"
                        disabled={isUploading}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={assignToOrder}
                        disabled={isUploading || !selectedOrderId}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Attach Invoice
                      </Button>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="text-sm text-center">
                      {uploadProgress < 30 ? 'Uploading...' : 
                       uploadProgress < 70 ? 'Parsing PDF...' : 'Processing...'}
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Review Form Section */}
          {showReviewForm && parsedInvoice && selectedFile && (
            <InvoiceReviewForm
              parsedData={parsedInvoice}
              pdfFile={selectedFile}
              onSubmit={handleSubmitReviewedData}
              onCancel={() => {
                setShowReviewForm(false);
                setShowPreview(true);
              }}
            />
          )}

          {/* Preview Section */}
          {showPreview && !showReviewForm && parsedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parsed Invoice Data</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPreview(false)}
                    variant="outline"
                    size="sm"
                  >
                    Back to Upload
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreview(false);
                      setShowReviewForm(true);
                    }}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review & Edit
                  </Button>
                  <Button
                    onClick={importAsOrder}
                    disabled={isUploading}
                    size="sm"
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Create Order As-Is
                  </Button>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Order ID:</span>
                      <span className="text-sm">{parsedInvoice.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Supplier:</span>
                      <span className="text-sm">{parsedInvoice.supplier.name}</span>
                    </div>
                    {parsedInvoice.supplier.email && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{parsedInvoice.supplier.email}</span>
                      </div>
                    )}
                    {parsedInvoice.supplier.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Phone:</span>
                        <span className="text-sm">{parsedInvoice.supplier.phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Subtotal:</span>
                      <span className="text-sm">£{parsedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">VAT:</span>
                      <span className="text-sm">£{parsedInvoice.vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-bold">Total:</span>
                      <span className="text-sm font-bold">£{parsedInvoice.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Items:</span>
                      <span className="text-sm">{parsedInvoice.items.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">SKU</th>
                          <th className="text-left p-2">Item Name</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Unit Cost</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedInvoice.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-mono text-xs">{item.sku}</td>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">£{item.unitCost.toFixed(2)}</td>
                            <td className="p-2 text-right">£{item.totalCost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Warnings */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Please review the parsed data carefully.</strong> PDF parsing may not be 100% accurate. 
                  Verify supplier information, item details, and totals before importing.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
