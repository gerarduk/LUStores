import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Package, Eye, Check, Upload, Calculator, FileText } from 'lucide-react';
import { InvoiceUpload } from '@/components/InvoiceUpload';
import { authenticatedFetch } from '@/utils/auth';
import NotesIndicator from '@/components/NotesIndicator';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'superuser' | 'admin';
}

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
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

interface Category {
  id: number;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

interface Item {
  id: number;
  name: string;
  sku: string;
  description?: string;
  categoryId: number;
  price: string;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  category?: Category;
}

interface OrderItem {
  id?: number;
  itemId?: number;
  itemName: string;
  itemSku: string;
  vendorSku?: string;
  itemDescription?: string;
  categoryId?: number;
  unitCost: string;
  quantity: number;
  totalCost: string;
  received?: boolean;
  receivedQuantity?: number;
  item?: Item;
  category?: Category;
}

interface Order {
  id: number;
  orderId: string;
  supplierId?: string;
  status: 'pending' | 'partially received' | 'received' | 'cancelled' | 'historical_migration';
  notes?: string;
  totalAmount?: string;
  deliveryCharge?: string;
  invoicePdfPath?: string;
  createdBy: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  creator: User;
  receiver?: User;
  items: OrderItem[];
}

interface NewOrderItem {
  itemId?: number;
  itemName: string;
  itemSku: string;
  itemDescription?: string;
  categoryId?: number;
  unitCost: string;
  quantity: number;
  deliveryAllocation?: number; // Delivery cost allocated to this item
  vendorSku?: string; // Vendor's stock number/SKU for this item
}

interface OrdersData {
  orders: Order[];
  total: number;
}

// API helper function using authenticatedFetch
async function apiRequest(url: string, options: RequestInit = {}) {
  try {
    const response = await authenticatedFetch(url, options);

    if (!response.ok) {
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } else {
        // If not JSON, get text for better debugging
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText.slice(0, 200)}`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText);
      throw new Error('Expected JSON response but got: ' + responseText.slice(0, 200));
    }
  } catch (error) {
    if (error instanceof SyntaxError && error.message.includes('JSON.parse')) {
      throw new Error('Invalid JSON response from server. Check server logs for details.');
    }
    throw error;
  }
}

export default function Orders() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonPreview, setJsonPreview] = useState<JsonImportData | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = useState<string>(''); // Search term for filtering items in modal
  const [debouncedItemSearchTerm, setDebouncedItemSearchTerm] = useState<string>(''); // Debounced item search term
  const [itemSearchResults, setItemSearchResults] = useState<Item[] | null>(null); // Server-side search results (null = show all pre-loaded)
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState<string>(''); // Search term for filtering suppliers in dropdown
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState<string>(''); // Debounced search term

  // Receive order dialog state
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<Order | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Map<number, { quantity: number; addToInventory: boolean }>>(new Map());

  // PDF upload state
  const [uploadingPdfForOrder, setUploadingPdfForOrder] = useState<number | null>(null);

  // Form state for new order
  const [newOrder, setNewOrder] = useState({
    supplierId: '',
    notes: '',
    items: [] as NewOrderItem[],
  });

  // Delivery and VAT state for new orders
  const [deliveryCost, setDeliveryCost] = useState('0');
  const [vatRate, setVatRate] = useState('0.20'); // Default 20% VAT
  const [vatIncluded, setVatIncluded] = useState(false); // Whether VAT is included in unit costs
  const [updateInventoryValues, setUpdateInventoryValues] = useState(false); // Whether to update item costs by weighted average

  // Validation error tracking
  const [validationErrors, setValidationErrors] = useState<{
    vatRate?: string;
    deliveryCost?: string;
    items?: {
      [itemIndex: number]: {
        itemName?: string;
        itemSku?: string;
        quantity?: string;
        unitCost?: string;
      };
    };
  }>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadItems();
  }, [currentPage]);

  // Debounce supplier search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearch);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [supplierSearch]);

  // Debounce item search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedItemSearchTerm(itemSearchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [itemSearchTerm]);

  // Server-side item fetch: always load fresh from DB, using search term when provided.
  // This runs on dialog open (isCreateDialogOpen) and on search-term change so the list
  // is never stale, regardless of when items were added to inventory.
  useEffect(() => {
    if (!isCreateDialogOpen) return;
    const fetchItems = async () => {
      setIsFetchingItems(true);
      try {
        const searchParam = debouncedItemSearchTerm
          ? `&search=${encodeURIComponent(debouncedItemSearchTerm)}`
          : '';
        // Only request a large result set when the user has typed 2+ chars.
        const effectiveLimit = debouncedItemSearchTerm && debouncedItemSearchTerm.length >= 2 ? 8000 : 100;
        const data = await apiRequest(
          `/api/items?limit=${effectiveLimit}&includeInactive=true${searchParam}`
        );
        setItemSearchResults(data.items || []);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setIsFetchingItems(false);
      }
    };
    fetchItems();
  }, [isCreateDialogOpen, debouncedItemSearchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('Loading orders from API...');
      const data: OrdersData = await apiRequest(`/api/orders?page=${currentPage}&limit=${itemsPerPage}`);
      console.log('Orders API response:', data);
      
      // Handle case where API returns null or undefined
      if (!data) {
        console.warn('Orders API returned null/undefined data');
        setOrders([]);
        setTotalOrders(0);
        return;
      }
      
      // Handle case where data is an array (legacy format)
      if (Array.isArray(data)) {
        console.log('Orders API returned array format');
        setOrders(data);
        setTotalOrders(data.length);
        return;
      }
      
      // Handle expected object format
      setOrders(data.orders || []);
      setTotalOrders(data.total || 0);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await apiRequest('/api/suppliers?limit=1000'); // Fetch all suppliers
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError('Failed to load suppliers. Please refresh the page.');
    }
  };

  const loadItems = async () => {
    try {
      // Include inactive items so they can be ordered (shown with [INACTIVE] badge)
      // Increase limit to ensure the create-order dialog can show a large inventory
      // When loading the page listing, avoid fetching thousands of items unless
      // the user has started a meaningful search elsewhere. Keep initial fetch small.
      const effectiveLimit = 100;
      const url = `/api/items?limit=${effectiveLimit}&includeInactive=true`;
      console.debug('loadItems: fetching items from', url);
      const data = await apiRequest(url);
      const fetched = data.items || [];
      console.debug(`loadItems: fetched ${fetched.length} items`);
      setItems(fetched);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const addOrderItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, {
        itemName: '',
        itemSku: '',
        itemDescription: '',
        unitCost: '',
        quantity: 1,
        vendorSku: '',
      }],
    }));
  };

  const removeOrderItem = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateOrderItem = (index: number, field: keyof NewOrderItem, value: NewOrderItem[keyof NewOrderItem]) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // If selecting an existing item, populate all details
          if (field === 'itemId' && typeof value === 'number') {
            // Prefer server-side search results (itemSearchResults) since the select lists
            // items from that result set. Fall back to the local `items` cache.
            const searchSource = (itemSearchResults && itemSearchResults.length > 0) ? itemSearchResults : items;
            const selectedItem = searchSource.find(it => it.id === value) || items.find(it => it.id === value);
            if (selectedItem) {
              return {
                ...updatedItem,
                itemName: selectedItem.name,
                itemSku: selectedItem.sku,
                itemDescription: selectedItem.description || '',
                categoryId: selectedItem.categoryId,
                unitCost: selectedItem.price,
              };
            }
          }
          
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const calculateTotal = () => {
    const itemsTotal = newOrder.items.reduce((sum, item) => {
      const cost = parseFloat(item.unitCost) || 0;
      const qty = parseFloat(item.quantity.toString()) || 0;
      return sum + (cost * qty);
    }, 0);
    
    const delivery = parseFloat(deliveryCost) || 0;
    return itemsTotal + delivery;
  };

  const calculateSubtotal = () => {
    return newOrder.items.reduce((sum, item) => {
      const cost = parseFloat(item.unitCost) || 0;
      const qty = parseFloat(item.quantity.toString()) || 0;
      return sum + (cost * qty);
    }, 0);
  };

  const splitDeliveryCostByValue = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      alert('Cannot split delivery cost: no items with value yet');
      return;
    }

    const delivery = parseFloat(deliveryCost) || 0;
    
    // Allocate delivery cost proportionally by item value
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        const itemCost = parseFloat(item.unitCost) || 0;
        const itemQty = parseFloat(item.quantity.toString()) || 0;
        const itemValue = itemCost * itemQty;
        const allocation = (itemValue / subtotal) * delivery;
        
        return {
          ...item,
          deliveryAllocation: allocation,
        };
      }),
    }));
    
    alert(`Delivery cost of £${delivery.toFixed(2)} split among ${newOrder.items.length} items by value`);
  };

  // Calculate cost preview for inventory updates
  const calculateCostPreview = () => {
    if (!updateInventoryValues || newOrder.items.length === 0) return [];

    const deliveryCostNum = parseFloat(deliveryCost) || 0;
    const vatRateNum = parseFloat(vatRate) || 0.20;
    const totalItemCost = newOrder.items.reduce((sum, item) => sum + (parseFloat(item.unitCost) * item.quantity), 0);
    const deliveryPerItem = totalItemCost > 0 ? deliveryCostNum / totalItemCost : 0;

    return newOrder.items
      .filter(item => item.itemId) // Only show preview for existing items
      .map(item => {
        const existingItem = items.find(i => i.id === item.itemId);
        if (!existingItem) return null;

        const orderUnitCost = parseFloat(item.unitCost);
        const currentStock = parseFloat(existingItem.currentStock.toString());
        const orderQuantity = item.quantity;
        const newStock = currentStock + orderQuantity;

        // Calculate effective order cost (including allocated delivery)
        const allocatedDelivery = (parseFloat(item.unitCost) * item.quantity) * deliveryPerItem;
        const effectiveOrderCost = (orderUnitCost * orderQuantity) + allocatedDelivery;

        // Handle VAT conversion if needed
        let adjustedOrderCost = effectiveOrderCost / orderQuantity; // Per unit
        if (vatIncluded !== existingItem.vatIncluded) {
          if (vatIncluded && !existingItem.vatIncluded) {
            // Order includes VAT, item excludes VAT - remove VAT
            adjustedOrderCost = adjustedOrderCost / (1 + vatRateNum);
          } else if (!vatIncluded && existingItem.vatIncluded) {
            // Order excludes VAT, item includes VAT - add VAT
            adjustedOrderCost = adjustedOrderCost * (1 + vatRateNum);
          }
        }

        // Calculate weighted average
        const currentValue = parseFloat(existingItem.price.toString()) * currentStock;
        const incomingValue = adjustedOrderCost * orderQuantity;
        const newPrice = newStock > 0 ? (currentValue + incomingValue) / newStock : adjustedOrderCost;

        return {
          itemId: existingItem.id,
          itemName: existingItem.name,
          currentPrice: parseFloat(existingItem.price.toString()),
          newPrice: parseFloat(newPrice.toFixed(2)),
          currentStock,
          orderQuantity,
          newStock
        };
      })
      .filter(Boolean) as Array<{
        itemId: number;
        itemName: string;
        currentPrice: number;
        newPrice: number;
        currentStock: number;
        orderQuantity: number;
        newStock: number;
      }>;
  };

  const handleCreateOrder = async () => {
    try {
      // Clear previous errors
      setValidationErrors({});
      setError(null);

      if (newOrder.items.length === 0) {
        setError('At least one item is required to create an order.');
        return;
      }

      const errors: typeof validationErrors = { items: {} };
      let hasErrors = false;

      // Validate VAT rate
      const vatRateNum = parseFloat(vatRate);
      if (isNaN(vatRateNum)) {
        errors.vatRate = `Invalid VAT rate: "${vatRate}" is not a valid number.`;
        hasErrors = true;
      } else if (vatRateNum < 0 || vatRateNum > 1) {
        errors.vatRate = `Invalid VAT rate: ${(vatRateNum * 100).toFixed(2)}% is out of range. Please enter a percentage between 0 and 100%.`;
        hasErrors = true;
      }

      // Validate delivery cost
      const deliveryCostNum = parseFloat(deliveryCost);
      if (isNaN(deliveryCostNum)) {
        errors.deliveryCost = `Invalid delivery cost: "${deliveryCost}" is not a valid number.`;
        hasErrors = true;
      } else if (deliveryCostNum < 0) {
        errors.deliveryCost = 'Delivery cost must be a positive number (cannot be negative).';
        hasErrors = true;
      }

      // Validate items with detailed feedback
      for (let i = 0; i < newOrder.items.length; i++) {
        const item = newOrder.items[i];
        const itemErrors: {
          itemName?: string;
          itemSku?: string;
          quantity?: string;
          unitCost?: string;
        } = {};
        
        // Check item name
        if (!item.itemName || !item.itemName.trim()) {
          itemErrors.itemName = 'Item name is required';
          hasErrors = true;
        }
        
        // Check SKU
        if (!item.itemSku || !item.itemSku.trim()) {
          itemErrors.itemSku = 'SKU is required';
          hasErrors = true;
        }
        
        // Check quantity
        if (!item.quantity) {
          itemErrors.quantity = 'Quantity is required';
          hasErrors = true;
        } else {
          const qtyNum = parseFloat(item.quantity.toString());
          if (isNaN(qtyNum)) {
            itemErrors.quantity = `"${item.quantity}" is not a valid number`;
            hasErrors = true;
          } else if (qtyNum <= 0) {
            itemErrors.quantity = `Quantity must be greater than 0`;
            hasErrors = true;
          }
        }
        
        // Check unit cost
        if (!item.unitCost) {
          itemErrors.unitCost = 'Unit cost is required';
          hasErrors = true;
        } else {
          const costNum = parseFloat(item.unitCost.toString());
          if (isNaN(costNum)) {
            itemErrors.unitCost = `"${item.unitCost}" is not a valid number`;
            hasErrors = true;
          } else if (costNum < 0) {
            itemErrors.unitCost = `Unit cost cannot be negative`;
            hasErrors = true;
          }
        }

        if (Object.keys(itemErrors).length > 0) {
          if (!errors.items) errors.items = {};
          errors.items[i] = itemErrors;
        }
      }

      if (hasErrors) {
        setValidationErrors(errors);
        setError('Please fix the validation errors below (highlighted in red).');
        return;
      }

      const orderData = {
        supplierId: newOrder.supplierId || null,
        notes: newOrder.notes || null,
        deliveryCharge: deliveryCostNum,
        vatRate: vatRateNum,
        vatIncluded: vatIncluded,
        updateInventoryValues: updateInventoryValues,
        items: newOrder.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity.toString()) || 1,
          unitCost: parseFloat(item.unitCost) || 0,
          deliveryAllocation: item.deliveryAllocation || 0,
        })),
      };

      await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      setIsCreateDialogOpen(false);
      setNewOrder({ supplierId: '', notes: '', items: [] });
      setDeliveryCost('0');
      setVatRate('0.20');
      setVatIncluded(false);
      setUpdateInventoryValues(false);
      setValidationErrors({});
      loadOrders();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(`Server error: ${errorMessage}`);
      console.error('Order creation error:', err);
    }
  };

  /**
   * Check if all items in an order have been fully received (supporting backorders)
   * An order is fully received when all items have receivedQuantity >= quantity
   */
  const isOrderFullyReceived = (order: Order): boolean => {
    if (order.items.length === 0) return false;
    
    return order.items.every(item => {
      const received = parseFloat(item.receivedQuantity?.toString() || '0');
      const ordered = parseFloat(item.quantity?.toString() || '0');
      return received >= ordered;
    });
  };

  const handleReceiveOrderClick = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Initialize received quantities with default values (0 for newly received, add to inventory enabled)
    const quantities = new Map<number, { quantity: number; addToInventory: boolean }>();
    order.items.forEach(item => {
      if (item.id) {
        // Set newly received quantity to 0 by default, not the full item quantity
        quantities.set(item.id, { quantity: 0, addToInventory: true });
      }
    });

    setReceivingOrder(order);
    setReceivedQuantities(quantities);
    setIsReceiveDialogOpen(true);
  };

  const handleUpdateReceivedQuantity = (itemId: number, field: 'quantity' | 'addToInventory', value: number | boolean) => {
    setReceivedQuantities(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, addToInventory: true };

      if (field === 'quantity' && typeof value === 'number') {
        newMap.set(itemId, { ...current, quantity: value });
      } else if (field === 'addToInventory' && typeof value === 'boolean') {
        newMap.set(itemId, { ...current, addToInventory: value });
      }

      return newMap;
    });
  };

  const handleSubmitReceiveOrder = async () => {
    if (!receivingOrder) return;

    try {
      const receivedItems = Array.from(receivedQuantities.entries()).map(([itemId, data]) => ({
        orderItemId: itemId,
        receivedQuantity: data.quantity,
        addToInventory: data.addToInventory,
      }));

      await apiRequest(`/api/orders/${receivingOrder.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ receivedItems }),
      });

      setIsReceiveDialogOpen(false);
      setReceivingOrder(null);
      setReceivedQuantities(new Map());
      loadOrders();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive order');
    }
  };

  const handleJsonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setJsonFile(file);
      parseJsonFile(file);
    } else {
      setError('Please select a valid JSON file');
    }
  };

  const parseJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const orderData = JSON.parse(content);
        
        // Validate JSON structure
        if (!orderData.supplier || !orderData.items || !Array.isArray(orderData.items)) {
          setError('JSON must have "supplier" object and "items" array');
          return;
        }

        // Validate required fields
        const requiredOrderFields = ['orderId', 'subtotal', 'vatRate', 'total'];
        const missingOrderFields = requiredOrderFields.filter(field => 
          orderData[field] === undefined || orderData[field] === null
        );
        
        if (missingOrderFields.length > 0) {
          setError(`Missing required order fields: ${missingOrderFields.join(', ')}`);
          return;
        }

        // Validate items - itemId is optional for new items
        const requiredItemFields = ['itemSku', 'itemName', 'quantity', 'unitCost'];
        const invalidItems = orderData.items.filter((item: JsonImportData['items'][0], index: number) => {
          const missing = requiredItemFields.filter(field =>
            item[field] === undefined || item[field] === null || item[field] === ''
          );
          if (missing.length > 0) {
            setError(`Item ${index + 1} missing fields: ${missing.join(', ')}`);
            return true;
          }
          return false;
        });

        if (invalidItems.length > 0) {
          return;
        }

        setJsonPreview(orderData);
        setError(null);
      } catch {
        setError('Invalid JSON file format');
      }
    };
    
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!jsonFile || !jsonPreview) return;

    try {
      const orderData = {
        orderId: jsonPreview.orderId,
        supplierId: jsonPreview.supplier?.id || null,
        notes: jsonPreview.notes || `Imported from JSON: ${jsonFile.name}`,
        subtotal: parseFloat(jsonPreview.subtotal),
        vatRate: parseFloat(jsonPreview.vatRate),
        vatAmount: parseFloat(jsonPreview.vatAmount || '0'),
        totalAmount: parseFloat(jsonPreview.total),
        receivedDate: jsonPreview.receivedDate || null,
        status: jsonPreview.status || 'pending',
        items: jsonPreview.items.map((item) => ({
          itemId: item.itemId || null,
          itemName: item.itemName,
          itemSku: item.itemSku,
          itemDescription: '',
          categoryId: null,
          quantity: item.quantity,
          unitCost: parseFloat(item.unitCost),
          vatRate: 0,
          vatAmount: 0,
          totalCost: parseFloat(item.totalCost),
        })),
      };

      await apiRequest('/api/orders/import', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      setIsImportDialogOpen(false);
      setJsonFile(null);
      setJsonPreview(null);
      loadOrders();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import JSON order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'partially received':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'received':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'historical_migration':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const handlePdfUpload = async (orderId: number, file: File) => {
    setUploadingPdfForOrder(orderId);
    try {
      const formData = new FormData();
      formData.append('invoice', file);

      const response = await authenticatedFetch(`/api/orders/${orderId}/upload-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload PDF');
      }

      await loadOrders(); // Refresh orders list
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF');
    } finally {
      setUploadingPdfForOrder(null);
    }
  };

  const downloadTemplate = (format: 'json' | 'csv') => {
    window.open(`/api/orders/import-template/${format}`, '_blank');
  };

  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Orders</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage procurement orders and bulk inventory creation
          </p>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
            <InvoiceUpload
              onInvoiceParsed={(parsedData) => {
                // Populate new order form with parsed invoice data
                const supplierName = parsedData.supplier?.name || '';
                const matchingSupplier = suppliers.find(s =>
                  s.name.toLowerCase() === supplierName.toLowerCase()
                );

                setNewOrder({
                  supplierId: matchingSupplier?.id || '',
                  notes: `Imported from invoice ${parsedData.orderId || ''}`,
                  items: parsedData.items?.map((item: ParsedInvoice['items'][0]) => ({
                    itemName: item.name || '',
                    itemSku: item.sku || '',
                    itemDescription: '',
                    unitCost: item.unitCost?.toString() || '0',
                    quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity?.toString() || '1'),
                    vendorSku: '',
                  })) || [],
                });

                // Calculate VAT rate if we have subtotal and vatAmount
                if (parsedData.subtotal && parsedData.vatAmount) {
                  const calculatedVatRate = parsedData.vatAmount / parsedData.subtotal;
                  setVatRate(calculatedVatRate.toFixed(4));
                }
                setVatIncluded(false); // Assume VAT is separate

                // Open the create dialog with pre-filled form
                setIsCreateDialogOpen(true);
                setError(null);
              }}
              onInvoiceImported={(_order) => {
                loadOrders();
                setError(null);
              }}
            />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Create a new procurement order for bulk item creation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
              {/* Supplier Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier (Optional)</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search suppliers..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className="h-10"
                    />
                    <Select
                      value={newOrder.supplierId || "no-supplier"}
                      onValueChange={(value) => setNewOrder(prev => ({ ...prev, supplierId: value === "no-supplier" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="no-supplier">No Supplier</SelectItem>
                        {suppliers
                          .filter(s =>
                            debouncedSupplierSearch.length === 0 ||
                            s.name.toLowerCase().includes(debouncedSupplierSearch.toLowerCase())
                          )
                          .map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))
                        }
                        {suppliers.filter(s =>
                          debouncedSupplierSearch.length === 0 ||
                          s.name.toLowerCase().includes(debouncedSupplierSearch.toLowerCase())
                        ).length === 0 && debouncedSupplierSearch && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No suppliers found matching "{debouncedSupplierSearch}"
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {debouncedSupplierSearch && (
                      <p className="text-xs text-muted-foreground">
                        Showing {suppliers.filter(s => s.name.toLowerCase().includes(debouncedSupplierSearch.toLowerCase())).length} of {suppliers.length} suppliers
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Order notes..."
                    rows={3}
                  />
                </div>
              </div>

              {/* VAT Configuration */}
              <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-300">VAT Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vatRate">VAT Rate (%)</Label>
                    <Input
                      id="vatRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={(parseFloat(vatRate) * 100).toFixed(2)}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value);
                        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                          return; // Prevent invalid values
                        }
                        setVatRate((percentage / 100).toFixed(4));
                      }}
                      placeholder="20.00"
                      className={validationErrors.vatRate ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                    />
                    {validationErrors.vatRate && (
                      <p className="text-sm text-red-600">{validationErrors.vatRate}</p>
                    )}
                    <p className="text-xs text-medium-gray">Enter VAT rate as percentage (e.g., 20 for 20%). Value must be between 0 and 100.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vatIncluded}
                        onChange={(e) => setVatIncluded(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>VAT Included in Unit Costs</span>
                    </Label>
                    <p className="text-xs text-medium-gray">
                      Check if the unit costs above already include VAT. Leave unchecked if costs are VAT-exclusive.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Delivery Cost Section */}
              <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-300">Delivery Cost</h3>
                  <Button 
                    onClick={splitDeliveryCostByValue}
                    size="sm"
                    variant="outline"
                    disabled={newOrder.items.length === 0 || parseFloat(deliveryCost) === 0}
                    className="bg-card hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Split by Item Value
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCost">Total Delivery Charge (£)</Label>
                    <Input
                      id="deliveryCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={deliveryCost}
                      onChange={(e) => setDeliveryCost(e.target.value)}
                      placeholder="0.00"
                      className={validationErrors.deliveryCost ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                    />
                    {validationErrors.deliveryCost && (
                      <p className="text-sm text-red-600">{validationErrors.deliveryCost}</p>
                    )}
                    <p className="text-xs text-medium-gray">
                      Enter total delivery/shipping cost for this order
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">How Delivery is Allocated</Label>
                    <p className="text-xs text-medium-gray">
                      Click "Split by Item Value" to distribute delivery cost proportionally among items based on their total value.
                      Each item will receive a share based on its percentage of the order subtotal.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Order Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Order Items</h3>
                  <Button onClick={addOrderItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {newOrder.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Existing Item (Optional)</Label>
                        <Select
                          value={item.itemId?.toString() || 'new-item'}
                          onValueChange={(value) => {
                            if (value === 'new-item') {
                              updateOrderItem(index, 'itemId', undefined);
                              setItemSearchTerm(''); // Clear search when selecting
                            } else {
                              updateOrderItem(index, 'itemId', parseInt(value));
                              setItemSearchTerm(''); // Clear search when selecting
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing item..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <div className="sticky top-0 z-10 bg-card p-2 border-b border-border">
                              <Input
                                placeholder="Search items by name or SKU..."
                                value={itemSearchTerm}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setItemSearchTerm(e.target.value);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-8"
                              />
                            </div>
                            <div className="max-h-[250px] overflow-y-auto">
                              <SelectItem value="new-item">New Item</SelectItem>
                              {isFetchingItems ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                  Loading items…
                                </div>
                              ) : (() => {
                                const sourceItems = itemSearchResults ?? items;
                                const filteredItems = sourceItems.filter((existingItem: Item) => {
                                  if (!existingItem.name || !existingItem.sku) return false;
                                  return true;
                                });

                                const totalMatches = filteredItems.length;

                                return (
                                  <>
                                    {filteredItems.map((existingItem: Item) => (
                                      <SelectItem key={existingItem.id} value={existingItem.id.toString()}>
                                        {existingItem.name} ({existingItem.sku})
                                        {existingItem.isActive === false && (
                                          <span className="ml-2 text-xs text-red-600 dark:text-red-400">[INACTIVE]</span>
                                        )}
                                      </SelectItem>
                                    ))}
                                    {totalMatches === 0 && debouncedItemSearchTerm && (
                                      <div className="p-3 text-sm text-muted-foreground text-center">
                                        No items found matching "{debouncedItemSearchTerm}"
                                      </div>
                                    )}
                                    {totalMatches === 0 && !debouncedItemSearchTerm && (
                                      <div className="p-3 text-sm text-muted-foreground text-center">
                                        No items available. Create items in the Inventory page first.
                                      </div>
                                    )}
                                    {totalMatches > 50 && (
                                      <div className="sticky bottom-0 p-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-700">
                                        <p className="text-xs text-amber-800 dark:text-amber-300 text-center font-medium">
                                          Showing {totalMatches} items. Use search to filter.
                                        </p>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Item Name *</Label>
                        <Input
                          value={item.itemName}
                          onChange={(e) => updateOrderItem(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          required
                          className={validationErrors.items?.[index]?.itemName ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                        />
                        {validationErrors.items?.[index]?.itemName && (
                          <p className="text-sm text-red-600">{validationErrors.items[index]?.itemName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>SKU *</Label>
                        <Input
                          value={item.itemSku}
                          onChange={(e) => updateOrderItem(index, 'itemSku', e.target.value)}
                          placeholder="SKU"
                          required
                          className={validationErrors.items?.[index]?.itemSku ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                        />
                        {validationErrors.items?.[index]?.itemSku && (
                          <p className="text-sm text-red-600">{validationErrors.items[index]?.itemSku}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Vendor SKU</Label>
                        <Input
                          value={item.vendorSku || ''}
                          onChange={(e) => updateOrderItem(index, 'vendorSku', e.target.value)}
                          placeholder="Vendor's stock number"
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={item.itemDescription || ''}
                          onChange={(e) => updateOrderItem(index, 'itemDescription', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Cost *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateOrderItem(index, 'unitCost', e.target.value)}
                          placeholder="0.00"
                          required
                          className={validationErrors.items?.[index]?.unitCost ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                        />
                        {validationErrors.items?.[index]?.unitCost && (
                          <p className="text-sm text-red-600">{validationErrors.items[index]?.unitCost}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            required
                            className={validationErrors.items?.[index]?.quantity ? 'border-red-500 border-2 focus:ring-red-500' : ''}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {validationErrors.items?.[index]?.quantity && (
                          <p className="text-sm text-red-600">{validationErrors.items[index]?.quantity}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {newOrder.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                )}

                {newOrder.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-right space-y-1">
                      <p className="text-sm text-medium-gray">
                        Subtotal (items): £{calculateSubtotal().toFixed(2)}
                      </p>
                      <p className="text-sm text-medium-gray">
                        Delivery: £{(parseFloat(deliveryCost) || 0).toFixed(2)}
                      </p>
                      <p className="text-lg font-semibold border-t pt-2">
                        Total: £{calculateTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inventory Value Update Option */}
              {newOrder.items.length > 0 && (
                <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="updateInventoryValues"
                      checked={updateInventoryValues}
                      onChange={(e) => setUpdateInventoryValues(e.target.checked)}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="updateInventoryValues" className="font-semibold text-green-900 cursor-pointer">
                        Update Inventory Item Values by Weighted Average Cost
                      </Label>
                      <p className="text-sm text-medium-gray mt-1">
                        When receiving this order, automatically update the stored unit price of each inventory item 
                        using a weighted average calculation between the incoming cost (including allocated delivery) 
                        and the existing stock value. This provides more accurate inventory valuation.
                      </p>
                      <div className="mt-2 p-2 bg-card rounded border border-green-200 dark:border-green-800 text-xs text-muted-foreground">
                        <strong>Example:</strong> If an item costs £10 with 100 units in stock (£1,000 value), 
                        and you order 50 units at £12 each (£600), the new average cost becomes: 
                        (£1,000 + £600) / (100 + 50) = <strong>£10.67 per unit</strong>
                      </div>

                      {/* Cost Preview */}
                      {updateInventoryValues && (() => {
                        const costPreview = calculateCostPreview();
                        if (costPreview.length === 0) return null;

                        return (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Cost Changes Preview:</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {costPreview.map(item => (
                                <div key={item.itemId} className="text-xs flex justify-between items-center">
                                  <span className="truncate mr-2">{item.itemName}</span>
                                  <span className="text-blue-700 dark:text-blue-300 font-mono">
                                    £{item.currentPrice.toFixed(2)} → £{item.newPrice.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 italic">
                              These changes will be applied when items are received into inventory.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setValidationErrors({});
                  setError(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrder} disabled={newOrder.items.length === 0}>
                  Create Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* JSON Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsImportDialogOpen(true)} 
              variant="outline"
              className="bg-card border-2 border-input hover:bg-accent"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Order from JSON/CSV</DialogTitle>
              <DialogDescription>
                Upload a JSON or CSV file with complete order structure including supplier, VAT, and items
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template Downloads */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Need a template?</h4>
                      <p className="text-sm text-blue-700">
                        Download a template file to see the required format for order imports
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => downloadTemplate('json')}
                        variant="outline"
                        size="sm"
                        className="bg-card"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        JSON Template
                      </Button>
                      <Button
                        onClick={() => downloadTemplate('csv')}
                        variant="outline"
                        size="sm"
                        className="bg-card"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        CSV Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="json-file">JSON File</Label>
                <Input
                  id="json-file"
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileChange}
                  ref={fileInputRef}
                />
                <p className="text-sm text-muted-foreground">
                  JSON structure: order details with supplier, VAT rates, and nested items array
                </p>
              </div>

              {jsonPreview && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted">
                    <h4 className="font-semibold mb-2">Order Preview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Order ID:</strong> {jsonPreview.orderId}</div>
                      <div><strong>Supplier:</strong> {jsonPreview.supplier?.name || 'N/A'}</div>
                      <div><strong>Subtotal:</strong> £{parseFloat(jsonPreview.subtotal || '0').toFixed(2)}</div>
                      <div><strong>VAT Rate:</strong> {(parseFloat(jsonPreview.vatRate || '0') * 100).toFixed(1)}%</div>
                      <div><strong>VAT Amount:</strong> £{parseFloat(jsonPreview.vatAmount || '0').toFixed(2)}</div>
                      <div><strong>Total:</strong> £{parseFloat(jsonPreview.total || '0').toFixed(2)}</div>
                      <div><strong>Status:</strong> {jsonPreview.status || 'pending'}</div>
                      <div><strong>Items:</strong> {jsonPreview.items?.length || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Items Preview</Label>
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item ID</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>VAT Rate</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jsonPreview.items?.map((item: JsonImportData['items'][0], index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.itemId}</TableCell>
                              <TableCell>{item.itemSku}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>£{parseFloat(item.unitCost || '0').toFixed(2)}</TableCell>
                              <TableCell>N/A</TableCell>
                              <TableCell>£{parseFloat(item.totalCost || '0').toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportJson} disabled={!jsonFile || !jsonPreview}>
                  Import Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            All procurement orders and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                // Calculate total from items to handle legacy orders
                const calculatedTotal = order.items.reduce((sum, item) =>
                  sum + parseFloat(item.totalCost || '0'), 0
                );
                const storedTotal = parseFloat(order.totalAmount || '0');
                // Use the larger of calculated or stored total
                const displayTotal = Math.max(calculatedTotal, storedTotal);

                return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={order.supplier?.name || 'No Supplier'}>
                      {order.supplier?.name || 'No Supplier'}
                    </div>
                  </TableCell>
                  <TableCell>{order.items.reduce((sum, item) => sum + parseFloat(item.quantity.toString()), 0).toFixed(2)} items</TableCell>
                  <TableCell>£{displayTotal.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status === 'historical_migration' ? 'Historical' : order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <NotesIndicator
                      referenceType="order"
                      referenceId={order.id.toString()}
                      entityName={`Order ${order.orderId}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsDialogOpen(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.invoicePdfPath ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/orders/${order.id}/invoice-pdf`, '_blank')}
                          title="View Invoice PDF"
                          className="text-green-600 hover:text-green-700"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      ) : (
                        <label htmlFor={`pdf-upload-${order.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Upload Invoice PDF"
                            disabled={uploadingPdfForOrder === order.id}
                          >
                            {uploadingPdfForOrder === order.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                          <input
                            id={`pdf-upload-${order.id}`}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handlePdfUpload(order.id, file);
                              }
                            }}
                          />
                        </label>
                      )}
                      {(order.status === 'pending' || order.status === 'partially received') && !isOrderFullyReceived(order) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReceiveOrderClick(order.id)}
                          title="Mark items as Received (allows backorders)"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>

          {orders.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No orders found. Create your first order to get started.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Order Details Dialog */}
    <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderId} - {selectedOrder?.supplier?.name || 'No Supplier'}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (() => {
            // Calculate total from items to handle legacy orders
            const calculatedTotal = selectedOrder.items.reduce((sum, item) =>
              sum + parseFloat(item.totalCost || '0'), 0
            );
            const storedTotal = parseFloat(selectedOrder.totalAmount || '0');
            // Use the larger of calculated or stored total
            const displayTotal = Math.max(calculatedTotal, storedTotal);

            return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
                  <p><strong>Status:</strong> <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status === 'historical_migration' ? 'Historical' : selectedOrder.status}</Badge></p>
                  <p><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p><strong>Total:</strong> £{displayTotal.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Supplier Information</h3>
                  {selectedOrder.supplier ? (
                    <>
                      <p><strong>Name:</strong> {selectedOrder.supplier.name}</p>
                      <p><strong>Contact:</strong> {selectedOrder.supplier.contact || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedOrder.supplier.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedOrder.supplier.phone || 'N/A'}</p>
                    </>
                  ) : (
                    <p>No supplier assigned</p>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Vendor SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.itemSku}</TableCell>
                        <TableCell>{item.vendorSku || 'N/A'}</TableCell>
                        <TableCell>{item.itemDescription || 'N/A'}</TableCell>
                        <TableCell>£{parseFloat(item.unitCost).toFixed(2)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>£{parseFloat(item.totalCost).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={item.received ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {item.received ? 'Received' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Order</DialogTitle>
            <DialogDescription>
              {receivingOrder?.orderId} - {receivingOrder?.supplier?.name || 'No Supplier'}
            </DialogDescription>
          </DialogHeader>

          {receivingOrder && (
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-700">
                  Adjust the received quantities for each item below. Check "Add to Inventory" to automatically update stock levels.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                          <TableHead>Ordered Qty</TableHead>
                          <TableHead>Received To Date</TableHead>
                          <TableHead>Newly Received Qty</TableHead>
                          <TableHead>Add to Inventory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivingOrder.items.map((item) => {
                      const receivedData = receivedQuantities.get(item.id!) || { quantity: 0, addToInventory: true };
                      // Use receivedQuantity if present, else fallback to 0 (parse as float to handle strings from DB)
                      const receivedToDate = parseFloat(item.receivedQuantity?.toString() || '0');
                      const remaining = item.quantity - receivedToDate;
                      const isOverSupplied = receivedData.quantity > remaining;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.itemSku}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{receivedToDate}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={receivedData.quantity}
                              onChange={(e) => handleUpdateReceivedQuantity(item.id!, 'quantity', parseFloat(e.target.value) || 0)}
                              className={`w-24 ${isOverSupplied ? 'border-red-500' : ''}`}
                            />
                            {isOverSupplied && (
                              <div className="text-xs text-red-600 mt-1">Over-supplied by {receivedData.quantity - remaining}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={receivedData.addToInventory}
                              onChange={(e) => handleUpdateReceivedQuantity(item.id!, 'addToInventory', e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReceiveOrder} className="bg-green-600 hover:bg-green-700">
                  <Package className="h-4 w-4 mr-2" />
                  Confirm Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
}
