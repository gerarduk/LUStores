import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest as makeApiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Phone, Mail, Package, Clock, ShoppingCart, Search, Edit, Trash2, StickyNote } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchInput from "@/components/shared/SearchInput";
import NotesIndicator from "@/components/NotesIndicator";
import type { Note } from "@shared/schema";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'superuser' | 'admin';
  profileImageUrl?: string;
  isActive: boolean;
}

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  createdAt: string;
  updatedAt: string;
  orderCount?: number;
  totalOrderValue?: number;
  lastOrderDate?: Date | null;
  itemsSupplied?: number;
}

interface OrderItem {
  id: number;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitCost: string;
  totalCost: string;
}

interface Order {
  id: number;
  orderId: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  notes?: string;
  items: OrderItem[];
}

interface SupplierWithOrders extends Supplier {
  orders: Order[];
}

// API helper function using token-based authentication
const apiRequest = async (method: string, url: string, data?: Partial<Supplier>) => {
  // Use the centralized apiRequest function which handles token-based auth
  const response = await makeApiRequest(method, url, data);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response;
};

export default function EnhancedVendors() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const user = authUser as User | null;
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedSkuSearch, setDebouncedSkuSearch] = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [newSupplier, setNewSupplier] = useState({
    id: '',
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    accountNumber: ''
  });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Debounce SKU search input - use longer delay for API-triggered searches
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSkuSearch(skuSearchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [skuSearchTerm]);

  // Enhanced: Support 'supplier of: [item/SKU]' search
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSuppliers = async () => {
      setSuppliersLoading(true);
      setSuppliersError(null);
      const search = debouncedSearch.trim();
      const supplierOfMatch = search.match(/^supplier\s*of\s*:\s*(.+)$/i) || search.match(/^supplierof\s*:\s*(.+)$/i);
      try {
        // Priority 1: SKU search field
        if (debouncedSkuSearch.trim()) {
          const itemQuery = encodeURIComponent(debouncedSkuSearch.trim());
          const response = await apiRequest('GET', `/api/suppliers/by-item?query=${itemQuery}`);
          const data = await response.json();
          if (!cancelled) setSuppliers(Array.isArray(data) ? data : []);
        } else if (supplierOfMatch) {
          // Priority 2: Supplier of: [item/SKU] search syntax
          const itemQuery = encodeURIComponent(supplierOfMatch[1]);
          const response = await apiRequest('GET', `/api/suppliers/by-item?query=${itemQuery}`);
          const data = await response.json();
          if (!cancelled) setSuppliers(Array.isArray(data) ? data : []);
        } else {
          // Default: all suppliers with order history
          try {
            const response = await apiRequest('GET', '/api/suppliers?withHistory=true');
            const data = await response.json();
            if (!cancelled) setSuppliers(Array.isArray(data) ? data : []);
          } catch {
            // Fallback to basic suppliers if enhanced endpoint not available
            try {
              const response = await apiRequest('GET', '/api/suppliers');
              const data = await response.json();
              if (!cancelled) setSuppliers(Array.isArray(data) ? data : []);
            } catch (basicError) {
              if (!cancelled) setSuppliersError(basicError instanceof Error ? basicError : new Error('Failed to load suppliers'));
            }
          }
        }
      } catch (err) {
        if (!cancelled) setSuppliersError(err instanceof Error ? err : new Error('Failed to load suppliers'));
      } finally {
        if (!cancelled) setSuppliersLoading(false);
      }
    };
    fetchSuppliers();
    return () => { cancelled = true; };
  }, [debouncedSearch, debouncedSkuSearch, refetchTrigger]);

  // Get detailed supplier information with orders
  const { data: supplierDetail, isLoading: supplierDetailLoading } = useQuery({
    queryKey: ['supplier-orders', selectedSupplier],
    queryFn: async () => {
      if (!selectedSupplier) return null;
      try {
        const response = await apiRequest('GET', `/api/suppliers/${selectedSupplier}?withOrders=true`);
        const data = await response.json();
        return data || null;
      } catch {
        // Fallback to basic supplier info
        console.warn('Enhanced supplier details not available, falling back to basic');
        try {
          const response = await apiRequest('GET', `/api/suppliers/${selectedSupplier}`);
          const data = await response.json();
          return data || null;
        } catch (error) {
          console.error('Failed to load supplier details:', error);
          return null;
        }
      }
    },
    enabled: !!selectedSupplier,
  });

  // Get vendor notes
  const { data: vendorNotes = [], isLoading: vendorNotesLoading } = useQuery({
    queryKey: ['vendor-notes', selectedSupplier],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      try {
        const response = await apiRequest('GET', `/api/notes/supplier/${selectedSupplier}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching vendor notes:', error);
        return [];
      }
    },
    enabled: !!selectedSupplier,
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'superuser';

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: typeof newSupplier) => {
      const response = await apiRequest('POST', '/api/suppliers', supplierData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
      setRefetchTrigger(prev => prev + 1);
      setShowAddDialog(false);
      setNewSupplier({
        id: '',
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        accountNumber: ''
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      const response = await apiRequest('PATCH', `/api/suppliers/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
      setRefetchTrigger(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', editingSupplier?.id] });
      setShowEditDialog(false);
      setEditingSupplier(null);
      if (selectedSupplier) {
        queryClient.invalidateQueries({ queryKey: ['supplier-orders', selectedSupplier] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/suppliers/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      setRefetchTrigger(prev => prev + 1);
      setShowDetails(false);
      setSelectedSupplier(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const handleSupplierClick = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    setShowDetails(true);
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.id.trim() || !newSupplier.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor ID and name are required",
        variant: "destructive",
      });
      return;
    }

    createSupplierMutation.mutate(newSupplier);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowEditDialog(true);
  };

  const handleUpdateSupplier = () => {
    if (!editingSupplier) return;

    if (!editingSupplier.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    updateSupplierMutation.mutate({
      id: editingSupplier.id,
      data: {
        name: editingSupplier.name,
        contact: editingSupplier.contact,
        email: editingSupplier.email,
        phone: editingSupplier.phone,
        address: editingSupplier.address,
        accountNumber: editingSupplier.accountNumber,
      },
    });
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete vendor "${supplier.name}"? This action cannot be undone.`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSupplierSummary = (supplier: Supplier | SupplierWithOrders) => {
    let orderCount = supplier.orderCount || 0;
    let totalValue = supplier.totalOrderValue || 0;
    let lastOrder = supplier.lastOrderDate;
    const itemsSupplied = supplier.itemsSupplied || 0;

    // If summary stats are missing but we have orders array, calculate from orders
    const supplierWithOrders = supplier as SupplierWithOrders;
    if (supplierWithOrders.orders && Array.isArray(supplierWithOrders.orders)) {
      orderCount = supplierWithOrders.orders.length;
      totalValue = supplierWithOrders.orders.reduce((sum, order) => {
        const orderTotal = typeof order.totalAmount === 'string'
          ? parseFloat(order.totalAmount)
          : order.totalAmount;
        return sum + (orderTotal || 0);
      }, 0);

      // Find most recent order date
      if (supplierWithOrders.orders.length > 0) {
        const dates = supplierWithOrders.orders
          .map(order => new Date(order.createdAt))
          .filter(date => !isNaN(date.getTime()));
        if (dates.length > 0) {
          lastOrder = dates.reduce((latest, current) =>
            current > latest ? current : latest
          );
        }
      }
    }

    return {
      orderCount,
      totalValue,
      lastOrder: lastOrder ? formatDate(lastOrder.toString()) : 'No orders',
      itemsSupplied
    };
  };

  // Filter only for non-supplier-of and non-SKU search
  const supplierOfMatch = debouncedSearch.trim().match(/^supplier\s*of\s*:\s*(.+)$/i) || debouncedSearch.trim().match(/^supplierof\s*:\s*(.+)$/i);
  const filteredSuppliers = useMemo(() => {
    const filtered = ((supplierOfMatch || debouncedSkuSearch.trim())
      ? suppliers
      : suppliers.filter((supplier) => {
          if (!debouncedSearch) return true;
          const searchLower = debouncedSearch.toLowerCase();
          return (
            supplier.name.toLowerCase().includes(searchLower) ||
            supplier.id.toLowerCase().includes(searchLower) ||
            supplier.contact?.toLowerCase().includes(searchLower) ||
            supplier.email?.toLowerCase().includes(searchLower) ||
            supplier.phone?.toLowerCase().includes(searchLower)
          );
        })
    );
    
    // Sort case-insensitively: numbers and uppercase letters first, then lowercase
    // Using localeCompare with sensitivity to get proper alphabetical sorting
    return filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });
  }, [suppliers, debouncedSearch, debouncedSkuSearch, supplierOfMatch]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Vendor Management</h1>
          <p className="text-medium-gray mt-1">Suppliers and their order history</p>
        </div>
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-university-blue hover:bg-university-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add New Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>
                  Create a new supplier/vendor for your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorId">Vendor ID *</Label>
                  <Input
                    id="vendorId"
                    placeholder="e.g., TECH-CORP-001"
                    value={newSupplier.id}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Company Name *</Label>
                  <Input
                    id="vendorName"
                    placeholder="e.g., TechCorp Solutions"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorContact">Contact Person</Label>
                  <Input
                    id="vendorContact"
                    placeholder="e.g., John Smith"
                    value={newSupplier.contact}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, contact: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorEmail">Email Address</Label>
                  <Input
                    id="vendorEmail"
                    type="email"
                    placeholder="e.g., orders@techcorp.com"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorPhone">Phone Number</Label>
                  <Input
                    id="vendorPhone"
                    placeholder="e.g., +44 20 7946 0958"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorAddress">Address</Label>
                  <Textarea
                    id="vendorAddress"
                    placeholder="e.g., 123 Business Street, London, UK"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorAccountNumber">Account Number</Label>
                  <Input
                    id="vendorAccountNumber"
                    placeholder="e.g., ACC-12345"
                    value={newSupplier.accountNumber}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, accountNumber: e.target.value }))}
                    maxLength={25}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSupplier}
                    disabled={createSupplierMutation.isPending}
                    className="bg-university-blue hover:bg-university-dark"
                  >
                    {createSupplierMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Vendor
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <div>
          <Label htmlFor="vendor-search" className="text-sm font-medium mb-2 block">
            Search Vendors
          </Label>
          <SearchInput
            id="vendor-search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, ID, contact, email, or phone..."
          />
        </div>
        <div>
          <Label htmlFor="sku-search" className="text-sm font-medium mb-2 block">
            Find Vendors by Item SKU
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="sku-search"
              value={skuSearchTerm}
              onChange={(e) => setSkuSearchTerm(e.target.value)}
              placeholder="Enter item SKU to find vendors..."
              className="pl-10"
            />
          </div>
          {debouncedSkuSearch.trim() && (
            <p className="text-xs text-blue-600 mt-1">
              Showing vendors who have sold items matching: "{debouncedSkuSearch}"
            </p>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {suppliersError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load suppliers: {(suppliersError as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Indicator */}
      {suppliersLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-blue"></div>
          <span className="ml-2 text-medium-gray">Loading suppliers...</span>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${suppliersLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {filteredSuppliers.map((supplier) => {
          const summary = getSupplierSummary(supplier);
          
          return (
            <Card 
              key={supplier.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSupplierClick(supplier.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <Building2 className="h-5 w-5 mr-2 text-university-blue flex-shrink-0" />
                    <span className="truncate">{supplier.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <NotesIndicator
                      referenceType="supplier"
                      referenceId={supplier.id}
                      entityName={supplier.name}
                    />
                    <Badge variant="outline" className="text-xs">{supplier.id}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact Information */}
                <div className="space-y-1 text-sm text-medium-gray dark:text-gray-400 min-w-0">
                  {supplier.accountNumber && (
                    <div className="flex items-center min-w-0">
                      <span className="font-medium flex-shrink-0">Account:</span>
                      <span className="ml-2 truncate">{supplier.accountNumber}</span>
                    </div>
                  )}
                  {supplier.contact && (
                    <div className="flex items-center min-w-0">
                      <span className="font-medium flex-shrink-0">Contact:</span>
                      <span className="ml-2 truncate">{supplier.contact}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center min-w-0">
                      <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center min-w-0">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>

                {/* Order Statistics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <ShoppingCart className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
                      <span className="text-lg font-semibold">{summary.orderCount}</span>
                    </div>
                    <p className="text-xs text-medium-gray dark:text-gray-400">Orders</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-lg font-semibold">
                        {summary.totalValue > 0 ? formatCurrency(summary.totalValue) : '£0'}
                      </span>
                    </div>
                    <p className="text-xs text-medium-gray dark:text-gray-400">Total Value</p>
                  </div>
                  <div className="text-center col-span-2">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium">{summary.lastOrder}</span>
                    </div>
                    <p className="text-xs text-medium-gray dark:text-gray-400">Last Order</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!suppliersLoading && filteredSuppliers.length === 0 && suppliers.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto text-medium-gray mb-4" />
            <h3 className="text-lg font-medium text-charcoal mb-2">No vendors match your search</h3>
            <p className="text-medium-gray mb-4">Try adjusting your search terms</p>
          </CardContent>
        </Card>
      )}

      {!suppliersLoading && suppliers.length === 0 && !suppliersError && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-medium-gray mb-4" />
            <h3 className="text-lg font-medium text-charcoal mb-2">No suppliers found</h3>
            <p className="text-medium-gray mb-4">Order history will appear here as suppliers are added through orders.</p>
          </CardContent>
        </Card>
      )}

      {/* Supplier Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  {supplierDetailLoading ? 'Loading...' : supplierDetail?.name || 'Supplier Details'}
                </DialogTitle>
                <DialogDescription>
                  Complete supplier information and order history
                </DialogDescription>
              </div>
              {isAdmin && supplierDetail && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSupplier(supplierDetail)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplierDetail)}
                    disabled={deleteSupplierMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {supplierDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-blue"></div>
            </div>
          ) : supplierDetail ? (
            <div className="space-y-6">
              {/* Supplier Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>ID:</strong> {supplierDetail.id}</div>
                    <div><strong>Name:</strong> {supplierDetail.name}</div>
                    {supplierDetail.accountNumber && (
                      <div><strong>Account Number:</strong> {supplierDetail.accountNumber}</div>
                    )}
                    {supplierDetail.contact && (
                      <div><strong>Contact:</strong> {supplierDetail.contact}</div>
                    )}
                    {supplierDetail.email && (
                      <div><strong>Email:</strong> {supplierDetail.email}</div>
                    )}
                    {supplierDetail.phone && (
                      <div><strong>Phone:</strong> {supplierDetail.phone}</div>
                    )}
                    {supplierDetail.address && (
                      <div><strong>Address:</strong> {supplierDetail.address}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const summary = getSupplierSummary(supplierDetail);
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                              <div className="text-xl font-bold">{summary.orderCount}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="text-xl font-bold">
                                {formatCurrency(summary.totalValue)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
                            </div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <Clock className="h-6 w-6 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
                            <div className="text-lg font-bold">
                              {summary.lastOrder}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Last Order</div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Vendor Notes Section */}
              {supplierDetail && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <StickyNote className="h-5 w-5" />
                          Vendor Notes
                        </CardTitle>
                        <DialogDescription>
                          Notes relevant to this vendor for future orders
                        </DialogDescription>
                      </div>
                      <NotesIndicator
                        referenceType="supplier"
                        referenceId={supplierDetail.id}
                        entityName={supplierDetail.name}
                        onNotesUpdated={() => queryClient.invalidateQueries({ queryKey: ['vendor-notes', selectedSupplier] })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {vendorNotesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : vendorNotes && vendorNotes.length > 0 ? (
                      <div className="space-y-3">
                        {vendorNotes.map((note: Note) => (
                          <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                            <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{note.text}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>By: {note.createdBy}</span>
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No notes yet. Click the note icon to add one.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Order History */}
              {(supplierDetail as SupplierWithOrders).orders && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(supplierDetail as SupplierWithOrders).orders.length > 0 ? (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Items</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(supplierDetail as SupplierWithOrders).orders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.orderId}</TableCell>
                                <TableCell>{formatDate(order.createdAt)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    className={
                                      order.status === 'received' 
                                        ? 'bg-green-100 text-green-800' 
                                        : order.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{order.items.length} items</TableCell>
                                <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {order.notes || 'No notes'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No order history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Supplier details not available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information
            </DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editVendorId">Vendor ID</Label>
                <Input
                  id="editVendorId"
                  value={editingSupplier.id}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorName">Company Name *</Label>
                <Input
                  id="editVendorName"
                  placeholder="e.g., TechCorp Solutions"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorContact">Contact Person</Label>
                <Input
                  id="editVendorContact"
                  placeholder="e.g., John Smith"
                  value={editingSupplier.contact || ''}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, contact: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorEmail">Email Address</Label>
                <Input
                  id="editVendorEmail"
                  type="email"
                  placeholder="e.g., orders@techcorp.com"
                  value={editingSupplier.email || ''}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorPhone">Phone Number</Label>
                <Input
                  id="editVendorPhone"
                  placeholder="e.g., +44 20 7946 0958"
                  value={editingSupplier.phone || ''}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, phone: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorAddress">Address</Label>
                <Textarea
                  id="editVendorAddress"
                  placeholder="e.g., 123 Business Street, London, UK"
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, address: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVendorAccountNumber">Account Number</Label>
                <Input
                  id="editVendorAccountNumber"
                  placeholder="e.g., ACC-12345"
                  value={editingSupplier.accountNumber || ''}
                  onChange={(e) => setEditingSupplier(prev => prev ? { ...prev, accountNumber: e.target.value } : null)}
                  maxLength={25}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingSupplier(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateSupplier}
                  disabled={updateSupplierMutation.isPending}
                  className="bg-university-blue hover:bg-university-dark"
                >
                  {updateSupplierMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Vendor
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
