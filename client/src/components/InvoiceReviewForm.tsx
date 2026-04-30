import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle, Check } from 'lucide-react';

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

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}

interface InvoiceReviewFormProps {
  parsedData: ParsedInvoice;
  pdfFile: File;
  onSubmit: (editedData: ParsedInvoice, pdfFile: File) => Promise<void>;
  onCancel: () => void;
}

export default function InvoiceReviewForm({
  parsedData,
  pdfFile,
  onSubmit,
  onCancel
}: InvoiceReviewFormProps) {
  const [formData, setFormData] = useState<ParsedInvoice>(parsedData);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch suppliers for autocomplete
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Try to match supplier on mount
  useEffect(() => {
    if (suppliers.length > 0 && parsedData.supplier.name) {
      const match = suppliers.find(s =>
        s.name.toLowerCase().includes(parsedData.supplier.name.toLowerCase()) ||
        parsedData.supplier.name.toLowerCase().includes(s.name.toLowerCase())
      );
      if (match) {
        setSelectedSupplierId(match.id);
      }
    }
  }, [suppliers, parsedData.supplier.name]);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier: {
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: prev.supplier.address
        }
      }));
    }
  };

  const handleSupplierFieldChange = (field: keyof ParsedInvoice['supplier'], value: string) => {
    setFormData(prev => ({
      ...prev,
      supplier: {
        ...prev.supplier,
        [field]: value
      }
    }));
  };

  const handleItemChange = (index: number, field: keyof ParsedInvoice['items'][0], value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };

      // Recalculate total cost if quantity or unit cost changed
      if (field === 'quantity' || field === 'unitCost') {
        newItems[index].totalCost = newItems[index].quantity * newItems[index].unitCost;
      }

      // Recalculate subtotal and total
      const subtotal = newItems.reduce((sum, item) => sum + item.totalCost, 0);
      const vatAmount = prev.vatAmount || (subtotal * 0.2); // Preserve VAT or calculate 20%
      const total = subtotal + vatAmount;

      return {
        ...prev,
        items: newItems,
        subtotal,
        vatAmount,
        total
      };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sku: '',
          name: '',
          quantity: 1,
          unitCost: 0,
          totalCost: 0
        }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const subtotal = newItems.reduce((sum, item) => sum + item.totalCost, 0);
      const vatAmount = prev.vatAmount || (subtotal * 0.2);
      const total = subtotal + vatAmount;

      return {
        ...prev,
        items: newItems,
        subtotal,
        vatAmount,
        total
      };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData, pdfFile);
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSupplierConfidence = () => {
    if (!selectedSupplierId) return null;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return null;

    const nameMatch = supplier.name.toLowerCase() === parsedData.supplier.name.toLowerCase();
    const emailMatch = supplier.email && parsedData.supplier.email &&
      supplier.email.toLowerCase() === parsedData.supplier.email.toLowerCase();

    if (nameMatch && emailMatch) return { level: 'high', text: 'High confidence match' };
    if (nameMatch) return { level: 'medium', text: 'Name matches' };
    return { level: 'low', text: 'Possible match' };
  };

  const confidence = getSupplierConfidence();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Review & Edit Invoice Data</h3>
        <p className="text-sm text-muted-foreground">
          Verify the extracted information before creating the order
        </p>
      </div>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Information</CardTitle>
          {confidence && (
            <Badge variant={confidence.level === 'high' ? 'default' : confidence.level === 'medium' ? 'secondary' : 'outline'}>
              {confidence.level === 'high' ? <Check className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {confidence.text}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="supplier-select">Select Existing Supplier</Label>
            <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger id="supplier-select">
                <SelectValue placeholder="Select a supplier or enter new details below" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier-name">Name *</Label>
              <Input
                id="supplier-name"
                value={formData.supplier.name}
                onChange={(e) => handleSupplierFieldChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier-email">Email</Label>
              <Input
                id="supplier-email"
                type="email"
                value={formData.supplier.email || ''}
                onChange={(e) => handleSupplierFieldChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                value={formData.supplier.phone || ''}
                onChange={(e) => handleSupplierFieldChange('phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier-address">Address</Label>
              <Input
                id="supplier-address"
                value={formData.supplier.address || ''}
                onChange={(e) => handleSupplierFieldChange('address', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order-id">Order ID</Label>
              <Input
                id="order-id"
                value={formData.orderId}
                onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Line Items</CardTitle>
            <CardDescription>{formData.items.length} item(s)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Unit Cost</TableHead>
                  <TableHead className="w-[120px]">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.sku}
                        onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                        placeholder="SKU"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        min="0"
                        step="1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">£{item.totalCost.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Subtotal:</span>
            <span className="font-medium">£{formData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">VAT:</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formData.vatAmount}
                onChange={(e) => {
                  const vatAmount = Number(e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    vatAmount,
                    total: prev.subtotal + vatAmount
                  }));
                }}
                className="w-32 text-right"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-lg">£{formData.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {formData.items.some(item => !item.sku || !item.name) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some items are missing SKU or name. Please fill in all required fields.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !formData.supplier.name ||
            formData.items.length === 0 ||
            formData.items.some(item => !item.sku || !item.name)
          }
        >
          {isSubmitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </div>
    </div>
  );
}
