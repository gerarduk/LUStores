/**
 * @fileoverview Sales and Quote Management Component
 * 
 * This component provides the main user interface for creating draft quotes,
 * managing quote items, and processing sales with comprehensive validation.
 * 
 * Key Features:
 * - Session-based draft quote management with auto-save
 * - Real-time stock availability checking
 * - Charge code validation with descriptive error messages
 * - Support for fractional/decimal quantities
 * - Atomic quote-to-sale conversion
 * - Automatic draft cleanup after successful processing
 * - Bulk item addition and quote clearing
 * 
 * Workflow:
 * 1. User searches for items and adds to draft quote
 * 2. System validates stock availability in real-time
 * 3. User enters valid charge code (validated against database)
 * 4. User processes quote → Creates sale, reduces stock, clears draft
 * 5. System provides immediate feedback on success/errors
 * 
 * State Management:
 * - React Query for server state (draft quotes, items, saved quotes)
 * - Local React state for UI interactions (selected items, quantities)
 * - Session storage for draft quote persistence across page refreshes
 * 
 * @module client/pages/Sales
 * @requires react
 * @requires @tanstack/react-query
 * @requires @/hooks/useAuth
 * @requires @/components/ui/*
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getAuthToken } from "@/utils/auth";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, Download, Calculator, FileText, Trash2, Edit, ChevronDown, Plus, PlusCircle, Minus, Loader2, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import NotesIndicator from "@/components/NotesIndicator";
import SearchInput from "@/components/shared/SearchInput";
import BarcodeScanner from "@/components/BarcodeScanner";
import { getSessionId } from "@/utils/sessionManager";
import type { Chargecode, User, QuoteItem } from "@shared/schema";

/**
 * Represents an item in the quote cart.
 * @interface QuoteItem
 */
interface QuoteItem {
  /** Database ID of the item */
  id: number;
  /** Display name of the item */
  name: string;
  /** Stock Keeping Unit identifier */
  sku: string;
  /** Unit price (base price before VAT) */
  price: number;
  /** Current stock level */
  currentStock: number;
  /** Quantity requested in this quote */
  requestedQuantity: number;
  /** Unit of measurement (optional, e.g., "meters", "liters") */
  unit?: string;
  /** Physical location of the item (optional) */
  location?: string;
  /** VAT rate as decimal (e.g., 0.20 for 20%) */
  vatRate?: number;
  /** Whether VAT is included in the price */
  vatIncluded?: boolean;
  /** Category information */
  category: {
    /** Category name */
    name: string;
  };
}

/**
 * Represents an item from the API/inventory list.
 * @interface ApiItem
 */
interface ApiItem {
  /** Database ID of the item */
  id: number;
  /** Display name of the item */
  name: string;
  /** Stock Keeping Unit identifier */
  sku: string;
  /** Unit price (base price before VAT) */
  price: number;
  currentStock: number;
  vatRate?: number;
  vatIncluded?: boolean;
  description?: string;
  /** Unit of measurement (optional, e.g., "meters", "liters") */
  unit?: string;
  /** Physical location of the item (optional) */
  location?: string;
  category: {
    name: string;
  };
}

interface ItemsApiResponse {
  items: ApiItem[];
  total?: number;
}

interface QuotesApiResponse {
  quotes: SavedQuote[];
  total?: number;
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface SavedQuote {
  id: number;
  quoteId: string;
  quoteName?: string;
  chargeCode: string;
  totalAmount: string;
  customerInfo?: {
    name?: string;
    email?: string;
    department?: string;
    [key: string]: unknown;
  } | null;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    firstName: string;
    lastName: string;
    email: string;
  };
  items: Array<{
    id: number;
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: string;
    vatRate: string;
    vatAmount: string;
    quantity: number;
    subtotal: string;
    totalWithVat: string;
  }>;
}

export default function Sales() {
  const { user } = useAuth() as { user: User };
  const { toast } = useToast();
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [chargeCode, setChargeCode] = useState("");
  const [chargeCodeValidation, setChargeCodeValidation] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: "" });
  const [validatedChargeCodeData, setValidatedChargeCodeData] = useState<Chargecode | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showSaveQuoteDialog, setShowSaveQuoteDialog] = useState(false);
  const [showAuthorizedUsersDialog, setShowAuthorizedUsersDialog] = useState(false);
  const [quoteName, setQuoteName] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [showCustomQuantityDialog, setShowCustomQuantityDialog] = useState(false);
  const [customQuantity, setCustomQuantity] = useState("1");
  const [quoteStockFilter, setQuoteStockFilter] = useState<string>("saved");
  const [quoteSortBy, setQuoteSortBy] = useState<string>("name-asc");
  const [showVAT, setShowVAT] = useState<boolean>(true); // Toggle for VAT display
  // Consolidated quote processing dialog (from saved quotes list: date selection + picking list + recipient)
  const [showProcessCompleteDialog, setShowProcessCompleteDialog] = useState(false);
  // Direct sale completion dialog (from quote form "Complete Sale" button)
  const [showLocationConfirmDialog, setShowLocationConfirmDialog] = useState(false);
  // Picking list dialog (shown after direct sale completion or when processing quotes)
  const [processDate, setProcessDate] = useState<Date>(new Date());
  const [quoteToProcess, setQuoteToProcess] = useState<number | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);
  const [barcodeScanResult, setBarcodeScanResult] = useState<{
    success: boolean;
    message: string;
    itemName?: string;
  } | null>(null);
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const [pickingListData, setPickingListData] = useState<{
    items: Array<{
      id: number;
      name: string;
      sku: string;
      quantity: number;
      location?: string;
    }>;
    saleId?: string;        // String ID (e.g., "S123")
    salePkId?: number;      // Numeric primary key for direct API access
    quoteId?: string;
    chargeCode?: string;
    customerNotes?: string;
    authorizedUsers?: User[];
  } | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [issuedTo, setIssuedTo] = useState<string>("");
  const [issuedToEmail, setIssuedToEmail] = useState<string | undefined>(undefined);

  // Debounce search term to avoid triggering API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400); // 400ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    const newSelection = new Set(selectedItemIds);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItemIds(newSelection);
  };

  // Bulk action handlers
  const handleBulkAddToQuote = (quantity: number) => {
    if (selectedItemIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to add to quote",
        variant: "destructive",
      });
      return;
    }

    const selectedItems = filteredItems.filter(item => selectedItemIds.has(item.id));
    let addedCount = 0;
    let skippedCount = 0;

    selectedItems.forEach(item => {
      // Allow fractional quantities as long as stock doesn't go negative
      const numQuantity = Number(quantity);
      const numCurrentStock = Number(item.currentStock);
      if (numQuantity > numCurrentStock || numCurrentStock - numQuantity < 0) {
        skippedCount++;
        return;
      }
      addToQuote(item, quantity);
      addedCount++;
    });

    setSelectedItemIds(new Set()); // Clear selection after adding

    if (skippedCount > 0) {
      toast({
        title: "Partially Added",
        description: `Added ${addedCount} items. Skipped ${skippedCount} due to insufficient stock.`,
      });
    } else {
      toast({
        title: "Items Added",
        description: `${addedCount} items added to quote with quantity ${quantity}`,
      });
    }
  };

  const handleBulkRemoveFromQuote = () => {
    if (selectedItemIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to remove from quote",
        variant: "destructive",
      });
      return;
    }

    const itemsInQuote = Array.from(selectedItemIds).filter(itemId =>
      quoteItems.some(qi => qi.id === itemId)
    );

    if (itemsInQuote.length === 0) {
      toast({
        title: "No items to remove",
        description: "None of the selected items are in the current quote",
        variant: "destructive",
      });
      return;
    }

    itemsInQuote.forEach(itemId => {
      removeFromQuote(itemId);
    });

    setSelectedItemIds(new Set());

    toast({
      title: "Items Removed",
      description: `${itemsInQuote.length} items removed from quote`,
    });
  };

  const handleBulkExport = () => {
    if (selectedItemIds.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to export",
        variant: "destructive",
      });
      return;
    }

    const selectedItems = filteredItems.filter(item => selectedItemIds.has(item.id));
    const headers = ['Item Name', 'SKU', 'Category', 'Price', 'Current Stock', 'VAT Rate'];
    const rows = selectedItems.map(item => [
      item.name,
      item.sku,
      item.category.name,
      `£${parseFloat(item.price.toString()).toFixed(2)}`,
      item.currentStock.toString(),
      `${((item.vatRate ?? 0.20) * 100).toFixed(1)}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Items Exported",
      description: `${selectedItems.length} items exported to CSV`,
    });
  };

  const handleBulkAction = (action: string) => {
    switch (action) {
      case "add-all-qty-1":
        handleBulkAddToQuote(1);
        break;
      case "add-custom-qty":
        setShowCustomQuantityDialog(true);
        break;
      case "remove-from-quote":
        handleBulkRemoveFromQuote();
        break;
      case "export":
        handleBulkExport();
        break;
    }
  };

  const confirmCustomQuantityAdd = () => {
    const qty = parseFloat(customQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    handleBulkAddToQuote(qty);
    setShowCustomQuantityDialog(false);
    setCustomQuantity("1");
  };

  // Handle barcode scanner input
  const handleBarcodeScanned = async (barcode: string) => {
    console.log('🔍 Barcode scanned:', barcode);
    setIsProcessingBarcode(true);
    setBarcodeScanResult(null);

    try {
      // Find item by SKU or barcode
      const matchingItem = items?.items?.find((item: ApiItem) => 
        item.sku?.toLowerCase() === barcode.toLowerCase() ||
        item.name?.toLowerCase().includes(barcode.toLowerCase())
      );

      if (!matchingItem) {
        setBarcodeScanResult({
          success: false,
          message: `No item found with SKU/barcode: ${barcode}`
        });
        toast({
          title: "Item Not Found",
          description: `No item matches barcode: ${barcode}`,
          variant: "destructive",
        });
        return;
      }

      // Check if item already in quote
      const existingItem = quoteItems.find(qi => qi.id === matchingItem.id);
      if (existingItem) {
        // Increment quantity
        setQuoteItems(prev => prev.map(item =>
          item.id === matchingItem.id
            ? { ...item, requestedQuantity: item.requestedQuantity + 1 }
            : item
        ));
        
        setBarcodeScanResult({
          success: true,
          message: `Quantity increased to ${existingItem.requestedQuantity + 1}`,
          itemName: matchingItem.name
        });
        
        toast({
          title: "Quantity Updated",
          description: `${matchingItem.name} quantity: ${existingItem.requestedQuantity + 1}`,
        });
      } else {
        // Add new item to quote
        addToQuote(matchingItem, 1);
        
        setBarcodeScanResult({
          success: true,
          message: "Item added to quote",
          itemName: matchingItem.name
        });
        
        toast({
          title: "Item Added",
          description: `${matchingItem.name} added to quote`,
        });
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setBarcodeScanResult({
        success: false,
        message: "Error processing barcode"
      });
      toast({
        title: "Error",
        description: "Failed to process barcode scan",
        variant: "destructive",
      });
    } finally {
      setIsProcessingBarcode(false);
      // Clear result after 3 seconds
      setTimeout(() => setBarcodeScanResult(null), 3000);
    }
  };

  // Debug: Track quoteItems state changes
  useEffect(() => {
    console.log(`🔄 quoteItems state changed:`, quoteItems);
    console.log(`📊 New quoteItems length: ${quoteItems.length}`);
  }, [quoteItems]);
  const [selectedQuoteForSale, setSelectedQuoteForSale] = useState<SavedQuote | null>(null);
  const [salePin, setSalePin] = useState("");
  const [saleChargeCode, setSaleChargeCode] = useState("");
  const [showPricesWithVAT, setShowPricesWithVAT] = useState(false); // Toggle for Browse Items price display
  const queryClient = useQueryClient();

  // Helper function to ensure UI synchronization after draft quote operations
  const ensureUISynchronization = async (operation: string) => {
    console.log(`🔄 Ensuring UI synchronization after ${operation}...`);
    
    try {
      // 1. Invalidate cache
      const sessionId = getSessionId();
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes/current-draft", sessionId] });
      
      // 2. Force refetch with a small delay to ensure backend processing is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      const refetchResult = await refetchDraftQuote();
      
      console.log(`✅ UI synchronization successful after ${operation}:`, {
        hasData: !!refetchResult.data,
        itemCount: refetchResult.data?.items?.length || 0
      });
      
      return refetchResult;
    } catch (error) {
      console.warn(`⚠️ UI synchronization partially failed after ${operation}:`, error);
      throw error;
    }
  };

  const { data: items, isLoading, error } = useQuery<ItemsApiResponse>({
    queryKey: ["/api/items", { search: debouncedSearchTerm, limit: 1000 }],
    queryFn: async () => {
      console.log('🔍 Fetching items with search:', debouncedSearchTerm);
      const params = new URLSearchParams({
        limit: '1000',
        page: '1'
      });
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      
      const response = await apiRequest('GET', `/api/items?${params.toString()}`);
      const data = await response.json();
      console.log('🔍 Items response:', data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    // Keep previous data while fetching new results to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });

  // Debug logging for items data
  useEffect(() => {
    console.log('🔍 Sales: Items data changed:', items);
    console.log('🔍 Sales: Items loading state:', isLoading);
    console.log('🔍 Sales: Items error:', error);
    if (items) {
      console.log('🔍 Sales: Items count:', items.items?.length || 'NO ITEMS PROPERTY');
      console.log('🔍 Sales: Full items structure:', JSON.stringify(items, null, 2));
    }
  }, [items, isLoading, error]);

  const { data: savedQuotes, isLoading: isLoadingQuotes, error: savedQuotesError } = useQuery<QuotesApiResponse, Error, SavedQuote[]>({
    queryKey: ["/api/sales/quotes"],
    queryFn: async () => {
      console.log('🔍 Fetching saved quotes...');
      // Request all quotes (no status filter)
      const response = await apiRequest('GET', '/api/sales/quotes');
      const data = await response.json();
      console.log('🔍 Saved quotes response:', data);
      return data;
    },
    select: (data) => {
      console.log('🔍 Saved quotes select:', data);
      return data?.quotes || [];
    },
  });

  // Debug logging for saved quotes
  useEffect(() => {
    console.log('🔍 Saved quotes state changed:', {
      savedQuotes: savedQuotes,
      isLoading: isLoadingQuotes,
      error: savedQuotesError,
      length: savedQuotes?.length
    });
  }, [savedQuotes, isLoadingQuotes, savedQuotesError]);

  // Load current draft quote with session support
  const { data: currentDraftQuote, isLoading: isLoadingDraft, error: draftQuoteError, refetch: refetchDraftQuote } = useQuery({
    queryKey: ["/api/sales/quotes/current-draft", getSessionId()],
    queryFn: async () => {
      const sessionId = getSessionId();
      const response = await apiRequest('GET', `/api/sales/quotes/current-draft?sessionId=${encodeURIComponent(sessionId)}`);
      return response.json();
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry if draft quote doesn't exist (404)
      if ((error as any)?.status === 404) return false;
      return failureCount < 3;
    },
    // Enable background refetching to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Data is considered stale after 5 seconds for quicker updates
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Handle draft quote loading with comprehensive state synchronization
  useEffect(() => {
    console.log('🔄 Draft quote useEffect triggered:', {
      hasDraftQuote: !!currentDraftQuote,
      hasItems: currentDraftQuote?.items?.length || 0,
      isLoading: isLoadingDraft,
      sessionId: getSessionId()
    });

    if (currentDraftQuote && currentDraftQuote.items && currentDraftQuote.items.length > 0) {
      console.log('📥 Loading draft quote from database:', {
        itemCount: currentDraftQuote.items.length,
        chargeCode: currentDraftQuote.chargeCode,
        sessionId: getSessionId()
      });

      // Update local state from database with robust mapping
      // FIX: Look up current stock from the items list instead of using dbItem.currentStock (which doesn't exist)
      const quoteItemsFromDb = currentDraftQuote.items.map((dbItem: QuoteItem) => {
        // Find the matching item in the items list to get the actual current stock
        const matchingItem = items?.items?.find((item: ApiItem) => item.id === dbItem.itemId);
        // Ensure stock is converted to number to prevent string comparison issues
        const stock = matchingItem?.currentStock ?? 0;
        const actualCurrentStock = typeof stock === 'string' ? parseFloat(stock) : Number(stock);

        return {
          id: dbItem.itemId,
          name: dbItem.itemName || 'Unknown Item',
          sku: dbItem.itemSku || 'NO-SKU',
          price: parseFloat(dbItem.unitPrice) || 0,
          currentStock: actualCurrentStock, // Numeric: properly converted
          requestedQuantity: parseFloat(dbItem.quantity.toString()) || 1, // Numeric: properly converted
          unit: matchingItem?.unit || 'pieces',
          location: matchingItem?.location || '',
          vatRate: dbItem.vatRate != null ? parseFloat(dbItem.vatRate) : 0.20,
          vatIncluded: matchingItem?.vatIncluded !== false,
          category: { name: dbItem.categoryName || matchingItem?.category?.name || 'Unknown' }
        };
      });

      setQuoteItems(quoteItemsFromDb);
      setChargeCode(currentDraftQuote.chargeCode || '');

      console.log('✅ Successfully updated React state from database:', {
        itemCount: quoteItemsFromDb.length,
        chargeCode: currentDraftQuote.chargeCode,
        items: quoteItemsFromDb.map(item => `${item.name} (qty: ${item.requestedQuantity}, stock: ${item.currentStock})`)
      });
    } else if (currentDraftQuote && (!currentDraftQuote.items || currentDraftQuote.items.length === 0)) {
      // Draft quote exists but has no items
      console.log('📭 Draft quote exists but has no items, clearing local state');
      setQuoteItems([]);
      setChargeCode(currentDraftQuote.chargeCode || '');
    } else if (!isLoadingDraft && !currentDraftQuote) {
      // No draft quote exists and not loading
      console.log('📭 No draft quote found, clearing local state');
      setQuoteItems([]);
      setChargeCode('');
    }
    // If still loading, don't change anything
  }, [currentDraftQuote, isLoadingDraft, items]);

  // Handle draft quote loading errors
  useEffect(() => {
    if (draftQuoteError && (draftQuoteError as any)?.status !== 404) {
      console.error('❌ Failed to load draft quote:', draftQuoteError);
    }
  }, [draftQuoteError]);

  // Auto-update charge code in database when it changes
  useEffect(() => {
    // Only update if we have a current draft quote and charge code is not empty
    if (currentDraftQuote && chargeCode && chargeCode !== currentDraftQuote.chargeCode) {
      const timeoutId = setTimeout(() => {
        console.log('🔄 Auto-updating charge code in database:', chargeCode);
        updateChargeCodeMutation.mutate(chargeCode);
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [chargeCode, currentDraftQuote]);

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: {
      chargeCode: string;
      customerInfo?: {
        name?: string;
        email?: string;
        department?: string;
        [key: string]: unknown;
      } | null;
      notes?: string;
      items: Array<{
        itemId: number;
        quantity: number;
      }>;
    }) => {
      console.log('🔍 createQuoteMutation called with data:', JSON.stringify(quoteData, null, 2));
      const response = await apiRequest('POST', '/api/sales/quotes', quoteData);
      console.log('🔍 createQuoteMutation response status:', response.status);
      const result = await response.json();
      console.log('🔍 createQuoteMutation response data:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ createQuoteMutation onSuccess called with data:', data);
      toast({
        title: "Quote Saved",
        description: "The quote has been saved successfully.",
      });
      setQuoteItems([]);
      setChargeCode("");
      setCustomerNotes("");
      setEditingQuoteId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes"] });
    },
    onError: (error: Error) => {
      console.error('❌ createQuoteMutation onError called with error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process quote mutation
  const processQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, processDate }: { quoteId: number; processDate?: Date }) => {
      const token = getAuthToken();
      const response = await fetch(`/api/sales/quotes/${quoteId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ processDate: processDate?.toISOString() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process quote');
      }
      
      const result = await response.json();
      return { ...result, quoteId };
    },
    onSuccess: async (data) => {
      // Prepare picking list data
      const quote = savedQuotes?.find(q => q.id === data.quoteId);
      if (quote && quote.items) {
        // Fetch authorized users for the charge code if present
        let authorizedUsers: any[] = [];
        if (quote.chargeCode) {
          try {
            const authUsersResponse = await fetch(
              `/api/chargecodes/${encodeURIComponent(quote.chargeCode)}/authorized-users`,
              { credentials: 'include' }
            );
            if (authUsersResponse.ok) {
              authorizedUsers = await authUsersResponse.json();
            }
          } catch (error) {
            console.error('Failed to fetch authorized users:', error);
            // Continue without authorized users
          }
        }

        setPickingListData({
          items: quote.items.map(item => ({
            id: item.itemId,
            name: item.itemName,
            sku: item.itemSku,
            quantity: parseFloat(item.quantity.toString()),
            unit: (item as any).unit || 'pcs',
            location: (item as any).location || 'Unknown',
            category: (item as any).categoryName
          })),
          saleId: data.saleId?.toString(),
          salePkId: data.id || (data as any).sale?.id,  // Store numeric ID directly
          quoteId: data.quoteId?.toString(),
          chargeCode: quote.chargeCode || '',
          customerNotes: (quote as any).customerNotes || (quote as any).customerInfo || '',
          authorizedUsers
        });

        // Picking list is now shown in the unified dialog
        // No need to set showPickingList - it will be displayed within the consolidated dialog
      }
      
      toast({
        title: "Quote Processed",
        description: "The quote has been processed and converted to a sale. Picking list is ready.",
      });
      
      // Clear the draft quote from database and local state - wait for completion
      await clearDraftQuoteMutation.mutateAsync();
      
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/reports"] }); // FIX: Invalidate reports to show new sale
    },
    onError: (error: Error) => {
      // Parse error message to make it more user-friendly
      const errorMessage = error.message || "Failed to process quote. Please try again.";
      let errorTitle = "Cannot Process Quote";
      
      // Customize title based on error type for better user feedback
      if (errorMessage.toLowerCase().includes('invalid charge code') || 
          errorMessage.toLowerCase().includes('does not exist')) {
        errorTitle = "Invalid Charge Code";
      } else if (errorMessage.toLowerCase().includes('missing a charge code')) {
        errorTitle = "Missing Charge Code";
      } else if (errorMessage.toLowerCase().includes('expired')) {
        errorTitle = "Charge Code Expired";
      } else if (errorMessage.toLowerCase().includes('not yet valid')) {
        errorTitle = "Charge Code Not Yet Valid";
      } else if (errorMessage.toLowerCase().includes('cannot be used') || 
                 errorMessage.toLowerCase().includes('category restrictions')) {
        errorTitle = "Charge Code Restrictions";
      } else if (errorMessage.toLowerCase().includes('insufficient stock')) {
        errorTitle = "Insufficient Stock";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 8000, // Show error longer for important messages with details
      });
    },
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      console.log('🔥 deleteQuoteMutation called with quoteId:', quoteId);
      const result = await apiRequest('DELETE', `/api/sales/quotes/${quoteId}`);
      console.log('🔥 Delete API response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('✅ deleteQuoteMutation onSuccess triggered');
      toast({
        title: "Quote Deleted",
        description: "The quote has been deleted successfully.",
      });
      // Invalidate and refetch the saved quotes immediately
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes"] });
      queryClient.refetchQueries({ queryKey: ["/api/sales/quotes"] });
    },
    onError: (error: Error) => {
      console.error('❌ deleteQuoteMutation onError:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const salesMutation = useMutation({
    mutationFn: async (saleData: {
      chargeCode: string;
      customerNotes: string;
      deliveredTo?: string;
      deliveredToEmail?: string;
      items: Array<{
        itemId: number;
        itemName: string;
        itemSku: string;
        unitPrice: number;
        quantity: number;
        vatRate: number;
        vatAmount: number;
        subtotal: number;
        totalWithVat: number;
      }>;
      totalAmount: number;
      processDate?: string;
      // Additional fields for picking list
      pickingListItems?: Array<{
        id: number;
        name: string;
        sku: string;
        quantity: number;
        unit?: string;
        location?: string;
        category?: string;
      }>;
    }) => {
      const response = await apiRequest('POST', '/api/sales', saleData);
      // Return both the API response and the picking list data
      return { 
        ...response, 
        pickingListItems: saleData.pickingListItems,
        chargeCode: saleData.chargeCode,
        customerNotes: saleData.customerNotes
      };
    },
    onSuccess: async (data) => {
      toast({
        title: "Sale Completed",
        description: "The sale has been successfully recorded.",
      });
      
      // Set up picking list data from the sale
      if (data.pickingListItems && data.pickingListItems.length > 0) {
        // Fetch authorized users for the charge code if present
        let authorizedUsers: any[] = [];
        if (data.chargeCode) {
          try {
            console.log('🔍 Fetching authorized users for charge code:', data.chargeCode);
            const authUsersResponse = await fetch(
              `/api/chargecodes/${encodeURIComponent(data.chargeCode)}/authorized-users`,
              { credentials: 'include' }
            );
            if (authUsersResponse.ok) {
              authorizedUsers = await authUsersResponse.json();
              console.log('✅ Authorized users fetched:', authorizedUsers);
            } else {
              console.warn('⚠️ Failed to fetch authorized users. Status:', authUsersResponse.status);
            }
          } catch (error) {
            console.error('❌ Failed to fetch authorized users:', error);
          }
        }

        console.log('📋 Setting picking list data with', authorizedUsers.length, 'authorized users');
        setPickingListData({
          items: data.pickingListItems,
          saleId: (data as any).sale?.id?.toString() || (data as any).saleId?.toString(),
          salePkId: (data as any).sale?.id || (data as any).id,  // Store numeric ID directly
          chargeCode: data.chargeCode || '',
          customerNotes: data.customerNotes || '',
          authorizedUsers
        });

        // Show picking list only if user preference allows (default: true)
        if ((user as any)?.showPickingList !== false) {
          console.log('📋 Showing picking list dialog');
          setShowPickingList(true);
        }
      }

      // Save recipient if one was selected before sale completion (direct sale flow)
      const salePkId = (data as any).sale?.id || (data as any).id;
      if (selectedRecipient && salePkId) {
        try {
          console.log('📝 Saving selected recipient:', selectedRecipient, 'for sale:', salePkId);
          const response = await fetch(`/api/sales/${salePkId}/recipient`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deliveredTo: selectedRecipient
            })
          });
          if (response.ok) {
            console.log('✅ Recipient saved successfully');
          } else {
            console.warn('⚠️ Failed to save recipient:', response.status);
          }
        } catch (error) {
          console.error('❌ Error saving recipient:', error);
        }
        setSelectedRecipient(null);
      }

      // Clear draft quote from database if it exists
      try {
        const sessionId = getSessionId();
        await apiRequest('DELETE', `/api/sales/quotes/current-draft?sessionId=${encodeURIComponent(sessionId)}`);
        console.log('✅ Draft quote cleared from database after sale completion');
      } catch (error) {
        console.log('ℹ️ No draft quote to clear (this is fine):', error);
      }
      
      setQuoteItems([]);
      setChargeCode("");
      setCustomerNotes("");
      setEditingQuoteId(null);
      setIssuedTo("");
      setIssuedToEmail(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/reports"] }); // FIX: Invalidate reports to show new sale
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes/current-draft"] }); // FIX: Clear draft quote cache
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete the sale. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate sale from quote mutation
  const generateSaleFromQuoteMutation = useMutation({
    mutationFn: async (saleData: {
      quoteId: number;
      pin: string;
      chargeCode: string;
    }) => {
      return apiRequest('POST', `/api/sales/quotes/${saleData.quoteId}/generate-sale`, {
        pin: saleData.pin,
        chargeCode: saleData.chargeCode,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sale Generated",
        description: "The sale has been successfully generated from the quote.",
      });
      setShowSaleDialog(false);
      setSelectedQuoteForSale(null);
      setSalePin("");
      setSaleChargeCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate sale. Please check your PIN and try again.",
        variant: "destructive",
      });
    },
  });

  const saveQuote = async () => {
    console.log('🔍 saveQuote function called');
    
    if (!chargeCode.trim()) {
      console.log('❌ Save Quote failed: Missing charge code');
      toast({
        title: "Missing Charge Code",
        description: "Please enter a charge code before saving the quote.",
        variant: "destructive",
      });
      return;
    }

    if (quoteItems.length === 0) {
      console.log('❌ Save Quote failed: Empty quote');
      toast({
        title: "Empty Quote", 
        description: "No items in quote to save.",
        variant: "destructive",
      });
      return;
    }

    // Show quote name dialog instead of directly saving
    setShowSaveQuoteDialog(true);
  };

  const confirmSaveQuote = async () => {
    if (!quoteName.trim()) {
      toast({
        title: "Missing Quote Name",
        description: "Please enter a name for your quote.",
        variant: "destructive",
      });
      return;
    }

    const quoteData = {
      chargeCode: chargeCode.trim(),
      quoteName: quoteName.trim(),
      customerInfo: null,
      notes: customerNotes.trim() || undefined,
      items: quoteItems.map(item => ({
        itemId: item.id,
        quantity: item.requestedQuantity,
      })),
    };

    console.log('🔍 Saving quote with data:', JSON.stringify(quoteData, null, 2));

    try {
      const result = await createQuoteMutation.mutateAsync(quoteData);
      console.log('✅ Quote save successful, result:', result);
      
      // Close dialog and reset form
      setShowSaveQuoteDialog(false);
      setQuoteName("");
    } catch (error) {
      console.error('❌ Quote save error:', error);
    }
  };

  const loadQuoteForEditing = (quote: SavedQuote) => {
    // Convert saved quote items back to QuoteItem format with VAT information
    const convertedItems: QuoteItem[] = quote.items.map(item => {
      const unitPrice = parseFloat(item.unitPrice);
      const vatRate = item.vatRate != null ? parseFloat(String(item.vatRate)) : 0.20;
      const totalWithVat = parseFloat(item.totalWithVat);
      
      // Determine if VAT was included in the original price
      // If unitPrice ≈ totalWithVat/quantity, then VAT was included
      const vatIncluded = Math.abs(unitPrice - (totalWithVat / item.quantity)) < 0.01;
      
      return {
        id: item.itemId,
        name: item.itemName,
        sku: item.itemSku,
        price: unitPrice,
        currentStock: 0, // Will be updated when we fetch current stock
        requestedQuantity: parseFloat(item.quantity.toString()) || 1, // Convert to number
        unit: 'pieces', // Default unit for loaded quotes
        location: '', // Default location for loaded quotes
        vatRate: vatRate,
        vatIncluded: vatIncluded,
        category: { name: '' }, // Will be updated when we fetch current data
      };
    });

    setQuoteItems(convertedItems);
    setChargeCode(quote.chargeCode);
    setCustomerNotes(quote.notes || '');
    setEditingQuoteId(quote.id);

    // Update with current stock and category info
    Promise.all(
      convertedItems.map(async (item) => {
        const currentItem = items?.items?.find((i: ApiItem) => i.id === item.id);
        if (currentItem) {
          // Ensure stock is converted to number to prevent string comparison issues
          const stock = currentItem.currentStock ?? 0;
          const actualCurrentStock = typeof stock === 'string' ? parseFloat(stock) : Number(stock);
          return {
            ...item,
            currentStock: actualCurrentStock, // Numeric: properly converted
            category: currentItem.category,
            // Preserve the VAT settings from the quote, but update stock/category
            vatRate: item.vatRate,
            vatIncluded: item.vatIncluded,
          };
        }
        return item;
      })
    ).then(updatedItems => {
      setQuoteItems(updatedItems);
    });

    toast({
      title: "Quote Loaded",
      description: "Quote loaded for editing. You can modify items or save changes.",
    });
  };

  const processQuote = async (quoteId: number) => {
    // Open consolidated dialog for process date selection
    setQuoteToProcess(quoteId);
    setProcessDate(new Date()); // Default to now
    setShowProcessCompleteDialog(true);
  };

  const confirmProcessQuote = async () => {
    if (quoteToProcess === null) return;
    
    try {
      await processQuoteMutation.mutateAsync({ 
        quoteId: quoteToProcess, 
        processDate 
      });
      // Don't close dialog - keep it open to show picking list
      setQuoteToProcess(null);
      // Success toast is shown by the mutation's onSuccess handler
    } catch (error) {
      // Error toast is shown by the mutation's onError handler
      console.error('Quote processing error:', error);
    }
  };

  const deleteQuote = (quoteId: number) => {
    console.log('🗑️ Delete quote clicked for ID:', quoteId);
    setQuoteToDelete(quoteId);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteQuote = async () => {
    if (quoteToDelete === null) return;
    
    console.log('🗑️ User confirmed deletion for quote ID:', quoteToDelete);
    
    try {
      console.log('🗑️ Calling deleteQuoteMutation for quote ID:', quoteToDelete);
      await deleteQuoteMutation.mutateAsync(quoteToDelete);
      console.log('✅ Quote deleted successfully');
      setShowDeleteConfirmDialog(false);
      setQuoteToDelete(null);
    } catch (error) {
      console.error('❌ Quote deletion error:', error);
    }
  };

  const completeSale = async () => {
    if (!chargeCode.trim()) {
      toast({
        title: "Missing Charge Code",
        description: "Please enter a charge code before completing the sale.",
        variant: "destructive",
      });
      return;
    }

    // Validate charge code before allowing sale
    if (chargeCodeValidation.isValid === false) {
      toast({
        title: "Invalid Charge Code",
        description: `Cannot complete sale: ${chargeCodeValidation.message}`,
        variant: "destructive",
      });
      return;
    }

    // If not yet validated, validate now and use the returned result directly
    // (React state updates are async, so we can't rely on chargeCodeValidation.isValid immediately)
    if (chargeCodeValidation.isValid === null) {
      const validationResult = await validateChargeCode(chargeCode);
      if (validationResult.isValid !== true) {
        toast({
          title: "Invalid Charge Code",
          description: `Cannot complete sale: ${validationResult.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (quoteItems.length === 0) {
      toast({
        title: "Empty Quote",
        description: "No items in quote to complete sale.",
        variant: "destructive",
      });
      return;
    }

    // For direct sale completion (not from quote list), show location confirmation dialog
    // This dialog will then call confirmCompleteSale() directly
    setShowLocationConfirmDialog(true);
  };

  const confirmCompleteSale = async () => {
    // Prevent multiple submissions while mutation is in progress
    if (salesMutation.isPending) {
      console.warn('Sale is already being processed. Please wait.');
      return;
    }

    const saleData = {
      chargeCode: chargeCode.trim(),
      customerNotes: customerNotes.trim() || '',
      deliveredTo: issuedTo.trim() || undefined,
      deliveredToEmail: issuedToEmail || undefined,
      items: quoteItems.map(item => {
        const vatCalc = calculateVATForItem(item);
        return {
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          unitPrice: item.price,
          quantity: item.requestedQuantity,
          vatRate: item.vatRate ?? 0.20,
          vatAmount: vatCalc.vatAmount,
          subtotal: vatCalc.subtotal,
          totalWithVat: vatCalc.totalWithVat,
        };
      }),
      totalAmount: calculateTotal(),
      processDate: processDate.toISOString(),
      // Include picking list data for post-sale display
      pickingListItems: quoteItems.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.requestedQuantity,
        unit: item.unit || 'pcs',
        location: item.location || 'Unknown',
        category: item.category?.name
      }))
    };

    try {
      await salesMutation.mutateAsync(saleData);
    } catch (error) {
      console.error('Sale completion error:', error);
      toast({
        title: "Sale Completion Failed",
        description: error instanceof Error ? error.message : "An error occurred while completing the sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate sale from saved quote
  const handleGenerateSale = (quote: SavedQuote) => {
    setSelectedQuoteForSale(quote);
    setSaleChargeCode(quote.chargeCode); // Pre-fill with quote's charge code
    setShowSaleDialog(true);
  };

  const filteredItems = (items?.items || [])
    .filter((item: ApiItem) => {
      // Stock status filter (client-side)
      if (stockFilter !== "all") {
        const numStock = Number(item.currentStock);
        switch (stockFilter) {
          case "in-stock":
            if (numStock <= 0) return false;
            break;
          case "low-stock":
            if (numStock > 5 || numStock <= 0) return false;
            break;
          case "out-of-stock":
            if (numStock > 0) return false;
            break;
        }
      }

      // Note: Search filter is now handled server-side via query parameters
      return true;
    })
    .sort((a, b) => {
      // Sorting
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return parseFloat(a.price.toString()) - parseFloat(b.price.toString());
        case "price-desc":
          return parseFloat(b.price.toString()) - parseFloat(a.price.toString());
        case "stock-asc":
          return a.currentStock - b.currentStock;
        case "stock-desc":
          return b.currentStock - a.currentStock;
        case "sku-asc":
          return a.sku.localeCompare(b.sku);
        case "sku-desc":
          return b.sku.localeCompare(a.sku);
        default:
          return 0;
      }
    });

  // Debug logging for filtered items
  useEffect(() => {
    console.log('🔍 Sales: filteredItems count:', filteredItems.length);
    console.log('🔍 Sales: searchTerm:', searchTerm);
    console.log('🔍 Sales: items?.items exists:', !!items?.items);
    console.log('🔍 Sales: items?.items length:', items?.items?.length || 'NO ITEMS');
    if (filteredItems.length > 0) {
      console.log('🔍 Sales: First filtered item:', filteredItems[0]);
    }
  }, [filteredItems, searchTerm, items]);

  // Add item to draft quote mutation with session support
  const addToDraftQuoteMutation = useMutation({
    mutationFn: async ({ item, quantity }: { item: ApiItem, quantity: number }) => {
      const sessionId = getSessionId();
      const response = await apiRequest('POST', '/api/sales/quotes/current-draft/items', {
        itemId: item.id,
        quantity,
        chargeCode: chargeCode || '',
        sessionId
      });
      return response.json();
    },
    onSuccess: async (updatedQuote: any) => {
      console.log('✅ Item added to draft quote in database:', updatedQuote);
      
      try {
        // Use centralized UI synchronization helper
        await ensureUISynchronization('item addition');
      } catch (syncError) {
        console.warn('⚠️ UI synchronization failed, falling back to local state update:', syncError);

        // Fallback: Update local state from API response
        if (updatedQuote && updatedQuote.items) {
          const quoteItemsFromDb = updatedQuote.items.map((dbItem: any) => {
            // FIX: Look up current stock from items list
            const matchingItem = items?.items?.find((item: ApiItem) => item.id === dbItem.itemId);
            // Ensure stock is converted to number to prevent string comparison issues
            const stock = matchingItem?.currentStock ?? 0;
            const actualCurrentStock = typeof stock === 'string' ? parseFloat(stock) : Number(stock);
            return {
              id: dbItem.itemId,
              name: dbItem.itemName,
              sku: dbItem.itemSku,
              price: parseFloat(dbItem.unitPrice),
              currentStock: actualCurrentStock, // Numeric: properly converted
              requestedQuantity: parseFloat(dbItem.quantity.toString()) || dbItem.quantity, // Numeric: properly converted
              vatRate: parseFloat(dbItem.vatRate),
              vatIncluded: matchingItem?.vatIncluded !== false,
              category: { name: matchingItem?.category?.name || 'Unknown' }
            };
          });
          setQuoteItems(quoteItemsFromDb);
          setChargeCode(updatedQuote.chargeCode || chargeCode);
          console.log('📝 Updated local state with fallback data');
        }
      }
      
      toast({
        title: "Added to Quote",
        description: `Item added to quote and saved to database`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Failed to add item to draft quote:', error);
      toast({
        title: "Error",
        description: "Failed to add item to quote",
        variant: "destructive",
      });
    }
  });

  // Update charge code mutation with session support
  const updateChargeCodeMutation = useMutation({
    mutationFn: async (chargeCode: string) => {
      const sessionId = getSessionId();
      const response = await apiRequest('PATCH', '/api/sales/quotes/current-draft/charge-code', {
        chargeCode,
        sessionId
      });
      return response.json();
    },
    onSuccess: (updatedQuote: any) => {
      console.log('✅ Charge code updated in database:', updatedQuote);
      setChargeCode(updatedQuote.chargeCode);

      // Show positive feedback when charge code is set (especially for empty quotes)
      if (quoteItems.length === 0) {
        toast({
          title: "Charge Code Saved",
          description: "Great start! Now add items to your quote from the Browse Items tab.",
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ Failed to update charge code:', error);
      toast({
        title: "Error",
        description: "Failed to update charge code",
        variant: "destructive",
      });
    }
  });

  // Remove item from draft quote mutation
  const removeFromDraftQuoteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const sessionId = getSessionId();
      const response = await apiRequest('DELETE', `/api/sales/quotes/current-draft/items/${itemId}`, {
        sessionId
      });
      return response.json();
    },
    onSuccess: async (updatedQuote: any) => {
      console.log('✅ Item removed from draft quote in database:', updatedQuote);

      try {
        // Use centralized UI synchronization helper
        await ensureUISynchronization('item removal');
      } catch (syncError) {
        console.warn('⚠️ UI synchronization failed, falling back to local state update:', syncError);

        // Fallback: Update local state from API response
        if (updatedQuote && updatedQuote.items) {
          const quoteItemsFromDb = updatedQuote.items.map((dbItem: any) => {
            // FIX: Look up current stock from items list
            const matchingItem = items?.items?.find((item: ApiItem) => item.id === dbItem.itemId);
            // Ensure stock is converted to number to prevent string comparison issues
            const stock = matchingItem?.currentStock ?? 0;
            const actualCurrentStock = typeof stock === 'string' ? parseFloat(stock) : Number(stock);
            return {
              id: dbItem.itemId,
              name: dbItem.itemName,
              sku: dbItem.itemSku,
              price: parseFloat(dbItem.unitPrice),
              currentStock: actualCurrentStock, // Numeric: properly converted
              requestedQuantity: parseFloat(dbItem.quantity.toString()) || dbItem.quantity, // Numeric: properly converted
              vatRate: parseFloat(dbItem.vatRate),
              vatIncluded: matchingItem?.vatIncluded !== false,
              category: { name: matchingItem?.category?.name || 'Unknown' }
            };
          });
          setQuoteItems(quoteItemsFromDb);
        } else {
          // No items left, clear the quote
          setQuoteItems([]);
        }
        console.log('📝 Updated local state with fallback data after removal');
      }

      toast({
        title: "Removed from Quote",
        description: "Item removed from quote and database",
      });
    },
    onError: (error: Error) => {
      console.error('❌ Failed to remove item from draft quote:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from quote",
        variant: "destructive",
      });
    }
  });

  // Clear draft quote mutation
  const clearDraftQuoteMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      const response = await apiRequest('DELETE', `/api/sales/quotes/current-draft?sessionId=${encodeURIComponent(sessionId)}`);
      return response.json();
    },
    onSuccess: async () => {
      console.log('✅ Draft quote cleared from database');

      // Clear local state
      setQuoteItems([]);
      setChargeCode("");
      setCustomerNotes("");
      setEditingQuoteId(null);

      // Invalidate and explicitly refetch the draft quote
      const sessionId = getSessionId();
      await queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes/current-draft", sessionId] });
      await refetchDraftQuote();

      toast({
        title: "Quote Cleared",
        description: "Quote has been cleared from the database",
      });
    },
    onError: (error: Error) => {
      console.error('❌ Failed to clear draft quote:', error);
      toast({
        title: "Error",
        description: "Failed to clear quote from database",
        variant: "destructive",
      });
    }
  });

  const addToQuote = (item: ApiItem, quantity: number) => {
    console.log(`🔍 addToQuote called: item=${item.name}, quantity=${quantity}`);
    
    if (quantity <= 0) {
      console.log(`❌ Invalid quantity: ${quantity} <= 0`);
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Use fresh current stock value, not stale quote data
    const currentStock = Number(getCurrentStock(item.id));
    const numQuantity = Number(quantity);

    // Allow adding quantity as long as resulting stock is non-negative
    if (currentStock - numQuantity < 0) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${currentStock} units available (cannot result in negative stock)`,
        variant: "destructive",
      });
      return;
    }

    // Use API to add item to draft quote instead of local state
    addToDraftQuoteMutation.mutate({ item, quantity });
  };

  const removeFromQuote = (itemId: number) => {
    // Use API to remove item from draft quote instead of local state
    removeFromDraftQuoteMutation.mutate(itemId);
  };

  const updateQuoteQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromQuote(itemId);
      return;
    }

    const item = quoteItems.find(qi => qi.id === itemId);
    if (!item) return;

    // Use fresh current stock value, with fallback to stored value when item not in filtered search results
    const currentStock = Number(getCurrentStock(item.id, item.currentStock));
    const numQuantity = Number(quantity);

    // Allow updating quantity as long as resulting stock is non-negative
    if (currentStock - numQuantity < 0) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${currentStock} units available (cannot result in negative stock)`,
        variant: "destructive",
      });
      return;
    }

    // Find the item in the items list to get full details for API call
    const apiItem = filteredItems.find(i => i.id === itemId);
    if (apiItem) {
      // Use the same API call as addToQuote to update quantity
      addToDraftQuoteMutation.mutate({ item: apiItem, quantity });
    }
  };

  const calculateVATForItem = (item: QuoteItem) => {
    const unitPrice = parseFloat(item.price.toString());
    const vatRate = item.vatRate ?? 0.20; // Default to 20% VAT only if null/undefined
    const vatIncluded = item.vatIncluded !== false; // Default to VAT included
    const quantity = item.requestedQuantity;
    
    let subtotal, vatAmount, totalWithVat;
    
    if (vatIncluded) {
      // Price includes VAT - calculate backwards
      totalWithVat = unitPrice * quantity;
      subtotal = totalWithVat / (1 + vatRate);
      vatAmount = totalWithVat - subtotal;
    } else {
      // Price excludes VAT - calculate forwards
      subtotal = unitPrice * quantity;
      vatAmount = subtotal * vatRate;
      totalWithVat = subtotal + vatAmount;
    }
    
    return { subtotal, vatAmount, totalWithVat };
  };

  const calculateTotals = () => {
    let totalSubtotal = 0;
    let totalVAT = 0;
    let totalWithVAT = 0;
    
    quoteItems.forEach(item => {
      const { subtotal, vatAmount, totalWithVat } = calculateVATForItem(item);
      totalSubtotal += subtotal;
      totalVAT += vatAmount;
      totalWithVAT += totalWithVat;
    });
    
    return {
      subtotal: totalSubtotal,
      vat: totalVAT,
      total: totalWithVAT
    };
  };

  const calculateTotal = () => {
    return calculateTotals().total;
  };

  const exportToCSV = () => {
    const headers = ['Item Name', 'SKU', 'Category', 'Unit Price', 'Quantity', 'Unit', 'Location', 'Subtotal (ex VAT)', 'VAT', 'Total (inc VAT)'];
    const rows = quoteItems.map(item => {
      const vatCalc = calculateVATForItem(item);
      return [
        item.name,
        item.sku,
        item.category.name,
        `£${parseFloat(item.price.toString()).toFixed(2)}`,
        item.requestedQuantity.toString(),
        item.unit || 'pieces',
        item.location || '',
        `£${vatCalc.subtotal.toFixed(2)}`,
        `£${vatCalc.vatAmount.toFixed(2)}`,
        `£${vatCalc.totalWithVat.toFixed(2)}`
      ];
    });
    
    const totals = calculateTotals();
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Subtotal (ex VAT),,,,,,£${totals.subtotal.toFixed(2)},`,
      `VAT,,,,,,,£${totals.vat.toFixed(2)}`,
      `Total (inc VAT),,,,,,£${totals.total.toFixed(2)}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Quote Exported",
      description: "Quote has been exported as CSV",
    });
  };

  const generateInvoice = () => {
    const invoiceWindow = window.open('', '_blank');
    const invoiceContent = `
      <html>
        <head>
          <title>Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: #1e40af; }
            .invoice-details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f8f9fa; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">University Inventory System</div>
            <div>Sales Quote</div>
          </div>
          
          <div class="invoice-details">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Prepared by:</strong> ${user?.firstName} ${user?.lastName} (${user?.email})</p>
            <p><strong>Quote ID:</strong> Q${Date.now()}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Location</th>
                <th>Subtotal (ex VAT)</th>
                <th>VAT</th>
                <th>Total (inc VAT)</th>
              </tr>
            </thead>
            <tbody>
              ${quoteItems.map(item => {
                const vatCalc = calculateVATForItem(item);
                return `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td>${item.category.name}</td>
                  <td>£${parseFloat(item.price.toString()).toFixed(2)}</td>
                  <td>${item.requestedQuantity}</td>
                  <td>${item.unit || 'pieces'}</td>
                  <td>${item.location || ''}</td>
                  <td>£${vatCalc.subtotal.toFixed(2)}</td>
                  <td>£${vatCalc.vatAmount.toFixed(2)}</td>
                  <td>£${vatCalc.totalWithVat.toFixed(2)}</td>
                </tr>`;
              }).join('')}
              ${(() => {
                const totals = calculateTotals();
                return `
                <tr style="border-top: 2px solid #333;">
                  <td colspan="5"><strong>Subtotal (ex VAT)</strong></td>
                  <td><strong>£${totals.subtotal.toFixed(2)}</strong></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="5"><strong>VAT</strong></td>
                  <td></td>
                  <td><strong>£${totals.vat.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
                <tr class="total-row">
                  <td colspan="5"><strong>Total (inc VAT)</strong></td>
                  <td></td>
                  <td></td>
                  <td><strong>£${totals.total.toFixed(2)}</strong></td>
                </tr>`;
              })()}
            </tbody>
          </table>

          <div class="footer">
            <p>This is a quote and not a final invoice. Prices and availability subject to change.</p>
          </div>
        </body>
      </html>
    `;
    
    invoiceWindow?.document.write(invoiceContent);
    invoiceWindow?.document.close();
    invoiceWindow?.print();

    toast({
      title: "Invoice Generated",
      description: "Invoice has been generated and opened for printing",
    });
  };

  // Helper to get CURRENT stock from items list, with fallback for when search filter hides items
  const getCurrentStock = (itemId: number, fallbackStock?: number): number => {
    const currentItem = items?.items?.find((i: ApiItem) => i.id === itemId);
    // If item found in filtered list, use that stock value
    if (currentItem) {
      const stock = currentItem.currentStock ?? 0;
      return typeof stock === 'string' ? parseFloat(stock) : Number(stock);
    }
    // Fallback to provided stock value (from quote item's stored data) when item not in filtered list
    if (fallbackStock !== undefined) {
      return typeof fallbackStock === 'string' ? parseFloat(fallbackStock as unknown as string) : Number(fallbackStock);
    }
    return 0;
  };

  // Helper to determine if a unit type supports decimal quantities
  const isDecimalUnit = (unit?: string): boolean => {
    if (!unit) return false;
    const decimalUnits = ['kg', 'g', 'liters', 'litres', 'l', 'ml', 'meters', 'metres', 'm', 'cm', 'mm', 'oz', 'lb', 'lbs'];
    return decimalUnits.includes(unit.toLowerCase());
  };

  // Validate charge code when user tabs out
  // Returns the validation result directly to avoid race conditions with state updates
  const validateChargeCode = async (code: string): Promise<{ isValid: boolean | null; message: string }> => {
    if (!code.trim()) {
      setChargeCodeValidation({ isValid: null, message: "" });
      setValidatedChargeCodeData(null);
      return { isValid: null, message: "" };
    }

    try {
      const response = await apiRequest('GET', `/api/chargecodes/${encodeURIComponent(code.trim())}`);
      const chargeCodeData = await response.json();

      // Check if expired
      if (chargeCodeData.validUntil && new Date(chargeCodeData.validUntil) < new Date()) {
        const result = {
          isValid: false as const,
          message: `Expired on ${new Date(chargeCodeData.validUntil).toLocaleDateString()}`
        };
        setChargeCodeValidation(result);
        setValidatedChargeCodeData(null);
        return result;
      }

      // Check if not yet valid
      if (chargeCodeData.validFrom && new Date(chargeCodeData.validFrom) > new Date()) {
        const result = {
          isValid: false as const,
          message: `Not valid until ${new Date(chargeCodeData.validFrom).toLocaleDateString()}`
        };
        setChargeCodeValidation(result);
        setValidatedChargeCodeData(null);
        return result;
      }

      // Check if on hold
      if (chargeCodeData.onHold) {
        const holdMessage = chargeCodeData.holdReason
          ? `On hold: ${chargeCodeData.holdReason}`
          : "Currently on hold";
        const result = {
          isValid: false as const,
          message: holdMessage
        };
        setChargeCodeValidation(result);
        setValidatedChargeCodeData(null);
        return result;
      }

      // Valid - store the full charge code data including authorized users
      const result = { isValid: true as const, message: "Valid" };
      setChargeCodeValidation(result);
      setValidatedChargeCodeData(chargeCodeData);

      // Show authorized users dialog if there are authorized users
      if (chargeCodeData.authorizedUsers && chargeCodeData.authorizedUsers.length > 0) {
        setShowAuthorizedUsersDialog(true);
      }
      return result;
    } catch {
      // Charge code doesn't exist
      const result = { isValid: false as const, message: "Invalid charge code" };
      setChargeCodeValidation(result);
      setValidatedChargeCodeData(null);
      return result;
    }
  };

  const getStockBadge = (currentStock: number | string, requestedQuantity?: number | string) => {
    // Ensure both values are numbers to prevent string comparison issues
    const numCurrentStock = typeof currentStock === 'string' ? parseFloat(currentStock) : Number(currentStock);
    const numRequestedQty = requestedQuantity 
      ? (typeof requestedQuantity === 'string' ? parseFloat(requestedQuantity) : Number(requestedQuantity))
      : 0;

    // Handle NaN cases
    if (isNaN(numCurrentStock)) {
      return <Badge variant="secondary">Unknown Stock</Badge>;
    }

    // Check if requested quantity would result in negative stock
    if (numRequestedQty > 0 && numCurrentStock - numRequestedQty < 0) {
      return <Badge variant="destructive">Insufficient Stock</Badge>;
    }
    if (numCurrentStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (numCurrentStock <= 5) {
      return <Badge variant="secondary">Low Stock</Badge>;
    }
    return <Badge variant="default">In Stock</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-blue mx-auto mb-4"></div>
            <p className="text-medium-gray">Loading sales interface...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle recipient selection
  const handleRecipientSelected = async (userName: string, email?: string) => {
    if (!pickingListData?.salePkId) {
      toast({
        title: "Error",
        description: "Sale ID not found. Cannot record recipient.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use the numeric sale ID directly from pickingListData - no extra API call needed
      const response = await fetch(`/api/sales/${pickingListData.salePkId}/recipient`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deliveredTo: userName,
          deliveredToEmail: email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record recipient');
      }

      setSelectedRecipient(userName);

      toast({
        title: "Recipient Recorded",
        description: `Items marked as delivered to ${userName}`
      });

      // Close the unified dialog after recipient is recorded
      setShowProcessCompleteDialog(false);
      setPickingListData(null);
      setSelectedRecipient(null);

      // Invalidate reports to show updated recipient
      queryClient.invalidateQueries({ queryKey: ["/api/sales/reports"] });
    } catch (error) {
      console.error('Error recording recipient:', error);
      toast({
        title: "Error",
        description: "Failed to record recipient. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Sales & Quotes</h1>
          <p className="text-sm text-medium-gray mt-2 max-w-2xl">
            Create quotes to see the cost of removing items from stores, then convert them to sales to process withdrawals and bill your charge code. Save quotes for later use or check stock levels before processing.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-medium-gray">
            Items in Quote: {quoteItems.length}
          </div>
          <div className="text-sm font-medium text-university-blue">
            {(() => {
              const totals = calculateTotals();
              return (
                <div className="flex flex-col text-right">
                  <div>Subtotal: £{totals.subtotal.toFixed(2)}</div>
                  <div>VAT: £{totals.vat.toFixed(2)}</div>
                  <div className="font-semibold">Total: £{totals.total.toFixed(2)}</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Browse Items</span>
          </TabsTrigger>
          <TabsTrigger value="quote" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Current Quote ({quoteItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Saved Quotes ({savedQuotes?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Stock Check</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Barcode Scanner Section */}
          <BarcodeScanner 
            onItemScanned={handleBarcodeScanned}
            isProcessing={isProcessingBarcode}
            lastScanResult={barcodeScanResult}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Available Items</span>
                </div>
                {selectedItemIds.size > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-medium-gray">
                      {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItemIds(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="bg-university-blue hover:bg-university-dark">
                          Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleBulkAction("add-all-qty-1")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add All to Quote (Qty 1)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction("add-custom-qty")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add All (Custom Qty)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkAction("remove-from-quote")}>
                          <Minus className="mr-2 h-4 w-4" />
                          Remove from Quote
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                          <Download className="mr-2 h-4 w-4" />
                          Export Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </CardTitle>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search items by name, SKU, or category..."
                    className="flex-1 max-w-md"
                  />
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="vat-toggle" className="text-sm font-medium cursor-pointer">
                      Show prices with VAT
                    </Label>
                    <Switch
                      id="vat-toggle"
                      checked={showPricesWithVAT}
                      onCheckedChange={setShowPricesWithVAT}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Status</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                      <SelectItem value="sku-asc">SKU (A-Z)</SelectItem>
                      <SelectItem value="sku-desc">SKU (Z-A)</SelectItem>
                      <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                      <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                      <SelectItem value="stock-asc">Stock (Low-High)</SelectItem>
                      <SelectItem value="stock-desc">Stock (High-Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>

              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItemIds.size > 0 && selectedItemIds.size === filteredItems.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all items"
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price & VAT</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Add to Quote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: ApiItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-medium-gray">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            £{(() => {
                              const basePrice = parseFloat(String(item.price));
                              const vatRate = typeof item.vatRate === 'string' ? parseFloat(item.vatRate) : (item.vatRate ?? 0.20);
                              const vatIncluded = item.vatIncluded !== false;
                              
                              if (showPricesWithVAT) {
                                // Show price including VAT
                                if (vatIncluded) {
                                  // Price already includes VAT
                                  return basePrice.toFixed(2);
                                } else {
                                  // Add VAT to ex-VAT price
                                  return (basePrice * (1 + vatRate)).toFixed(2);
                                }
                              } else {
                                // Show price excluding VAT
                                if (vatIncluded) {
                                  // Remove VAT from inc-VAT price
                                  return (basePrice / (1 + vatRate)).toFixed(2);
                                } else {
                                  // Price already excludes VAT
                                  return basePrice.toFixed(2);
                                }
                              }
                            })()}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              showPricesWithVAT
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            }`}>
                              {showPricesWithVAT ? 'VAT Inc.' : 'VAT Exc.'}
                            </span>
                            <span className="text-xs text-medium-gray">
                              {((item.vatRate ?? 0.20) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{getStockBadge(item.currentStock)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="1"
                            max={item.currentStock}
                            placeholder="Qty"
                            className="w-20"
                            id={`qty-${item.id}`}
                            disabled={item.currentStock === 0}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`qty-${item.id}`) as HTMLInputElement;
                              // Ensure quantity is always at least 1
                              const rawValue = input.value?.trim();
                              const parsedValue = parseInt(rawValue || '1');
                              const quantity = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue;
                              console.log(`🔢 Adding to quote: quantity=${quantity} for item=${item.name}`);
                              addToQuote(item, quantity);
                              input.value = '';
                            }}
                            disabled={item.currentStock === 0}
                            className="bg-university-blue hover:bg-university-dark"
                          >
                            Add
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-medium-gray mx-auto mb-4" />
                  <p className="text-medium-gray">No items found matching your search</p>
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-red-700 dark:text-red-300 text-sm">Error loading items: {error.message}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quote" className="space-y-6">
          <div 
            className="border-l-4 border-amber-400 dark:border-amber-600 p-4 mb-4"
            style={{ backgroundColor: isDark ? 'rgba(120, 53, 15, 0.2)' : 'white' }}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Important:</strong> Quote values are estimates based on current prices and stock levels. Prices and availability are subject to change until the point of sale.
                </p>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Current Quote</span>
                </div>
                {quoteItems.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowVAT(!showVAT)}
                      className="flex items-center space-x-2"
                      title={showVAT ? "Switch to prices excluding VAT" : "Switch to prices including VAT"}
                    >
                      <Calculator className="h-4 w-4" />
                      <span>{showVAT ? "Prices with VAT" : "Prices ex VAT"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportToCSV}
                      className="flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV</span>
                    </Button>
                    <Button
                      onClick={generateInvoice}
                      className="bg-university-blue hover:bg-university-dark flex items-center space-x-2"
                    >
                      <Calculator className="h-4 w-4" />
                      <span>Generate Invoice</span>
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                console.log(`📋 Current Quote tab rendering: ${quoteItems.length} items`);
                console.log(`📋 Quote items:`, quoteItems);
                return null;
              })()}
              <div className="space-y-4">
                {quoteItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-university-blue mx-auto mb-4" />
                    {chargeCode.trim() ? (
                      <>
                        <p className="text-lg font-medium text-charcoal mb-2">Ready to build your quote!</p>
                        <p className="text-sm text-medium-gray mb-4">
                          Charge code <span className="font-mono font-semibold text-university-blue">{chargeCode}</span> is set
                        </p>
                        <p className="text-sm text-medium-gray">
                          Switch to the <span className="font-semibold">Browse Items</span> tab to add items to your quote
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium text-charcoal mb-2">Start by entering a charge code</p>
                        <p className="text-sm text-medium-gray">
                          Enter your charge code below, then browse items to add to your quote
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>{showVAT ? "Unit Price (inc VAT)" : "Unit Price (ex VAT)"}</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Stock Status</TableHead>
                        {showVAT ? (
                          <>
                            <TableHead>Subtotal (ex VAT)</TableHead>
                            <TableHead>VAT</TableHead>
                            <TableHead>Total (inc VAT)</TableHead>
                          </>
                        ) : (
                          <TableHead>Total (ex VAT)</TableHead>
                        )}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <Badge variant="outline" className="mt-1">{item.category.name}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell className="font-medium">
                            £{(() => {
                              const unitPrice = parseFloat(String(item.price));
                              const vatRate = typeof item.vatRate === 'string' ? parseFloat(item.vatRate) : (item.vatRate ?? 0.20);
                              const vatIncluded = item.vatIncluded !== false;

                              if (showVAT) {
                                // Show unit price including VAT
                                if (vatIncluded) {
                                  return unitPrice.toFixed(2); // Already includes VAT
                                } else {
                                  return (unitPrice * (1 + vatRate)).toFixed(2); // Add VAT
                                }
                              } else {
                                // Show unit price excluding VAT
                                if (vatIncluded) {
                                  return (unitPrice / (1 + vatRate)).toFixed(2); // Remove VAT
                                } else {
                                  return unitPrice.toFixed(2); // Already excludes VAT
                                }
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={isDecimalUnit(item.unit) ? "0.01" : "1"}
                              step={isDecimalUnit(item.unit) ? "0.01" : "1"}
                              max={getCurrentStock(item.id, item.currentStock)}
                              value={item.requestedQuantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Don't remove items while typing - only update the quantity
                                // Item removal happens on blur if value is 0 or empty
                                if (val !== '' && val !== '0') {
                                  const numVal = parseFloat(val);
                                  if (!isNaN(numVal) && numVal > 0) {
                                    updateQuoteQuantity(item.id, numVal);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // If empty or 0, remove the item
                                const val = parseFloat(e.target.value) || 0;
                                if (val === 0) {
                                  removeFromQuote(item.id);
                                }
                              }}
                              className="w-24 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            {item.location ? (
                              <div className="text-xs text-medium-gray">
                                <i className="fas fa-map-marker-alt mr-1"></i>
                                {item.location}
                              </div>
                            ) : (
                              <span className="text-xs text-medium-gray">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStockBadge(getCurrentStock(item.id, item.currentStock), item.requestedQuantity)}
                          </TableCell>
                          {showVAT ? (
                            <>
                              <TableCell className="font-medium">
                                £{calculateVATForItem(item).subtotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="font-medium">
                                £{calculateVATForItem(item).vatAmount.toFixed(2)}
                              </TableCell>
                              <TableCell className="font-medium">
                                £{calculateVATForItem(item).totalWithVat.toFixed(2)}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="font-medium">
                              £{calculateVATForItem(item).subtotal.toFixed(2)}
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFromQuote(item.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                
                {/* Charge Code and Notes Section - Always visible */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal">
                      Charge Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter charge code (required)"
                      value={chargeCode}
                      onChange={(e) => {
                        setChargeCode(e.target.value);
                        // Reset validation and charge code data when user types
                        setChargeCodeValidation({ isValid: null, message: "" });
                        setValidatedChargeCodeData(null);
                      }}
                      onBlur={(e) => validateChargeCode(e.target.value)}
                      className={`w-full ${
                        chargeCodeValidation.isValid === false
                          ? 'border-red-500 focus:border-red-600 bg-red-50'
                          : chargeCodeValidation.isValid === true
                            ? 'border-green-500 focus:border-green-600'
                            : !chargeCode.trim()
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300'
                      }`}
                    />
                    {chargeCodeValidation.isValid === false && (
                      <p className="text-xs text-red-600 font-medium">
                        ✗ {chargeCodeValidation.message}
                      </p>
                    )}
                    {chargeCodeValidation.isValid === true && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ {chargeCodeValidation.message}
                      </p>
                    )}
                    {chargeCodeValidation.isValid === null && quoteItems.length === 0 && (
                      <div className="flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-blue-700">
                          {chargeCode.trim()
                            ? "Charge code saved! Add items from the Browse Items tab to continue."
                            : "Enter your charge code first - it will be saved automatically when you add items."}
                        </p>
                      </div>
                    )}
                    {chargeCodeValidation.isValid === null && quoteItems.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Ready - Save as quote or complete sale directly
                      </p>
                    )}
                    {/* Show authorized users button if charge code is valid and has people listed */}
                    {chargeCodeValidation.isValid === true && validatedChargeCodeData &&
                     validatedChargeCodeData.authorizedUsers &&
                     validatedChargeCodeData.authorizedUsers.length > 0 && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAuthorizedUsersDialog(true)}
                          className="text-xs h-7"
                        >
                          <i className="fas fa-users mr-1"></i>
                          View {validatedChargeCodeData.authorizedUsers.length} Authorized Person{validatedChargeCodeData.authorizedUsers.length !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-charcoal">
                      Notes (Optional)
                    </label>
                    <Input
                      placeholder="Additional notes for this quote/sale"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Total and Action Section - Always visible */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="bg-university-light p-4 rounded-lg">
                    {(() => {
                      const totals = calculateTotals();
                      return (
                        <div className="space-y-1">
                          {showVAT ? (
                            <>
                              <div className="text-sm text-university-blue">
                                Subtotal (ex VAT): £{totals.subtotal.toFixed(2)}
                              </div>
                              <div className="text-sm text-university-blue">
                                VAT: £{totals.vat.toFixed(2)}
                              </div>
                              <div className="text-lg font-semibold text-university-blue border-t pt-1">
                                Total (inc VAT): £{totals.total.toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <div className="text-lg font-semibold text-university-blue">
                              Total (ex VAT): £{totals.subtotal.toFixed(2)}
                            </div>
                          )}
                          <div className="text-sm text-medium-gray">
                            {quoteItems.reduce((total, item) => total + parseFloat(String(item.requestedQuantity)), 0).toFixed(2)} items
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    {/* Process Date Selector */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-charcoal whitespace-nowrap">
                        Process on:
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="datetime-local"
                          value={processDate.toISOString().slice(0, 16)}
                          onChange={(e) => {
                            // Parse datetime-local format properly (YYYY-MM-DDTHH:mm)
                            // The value is in local time, not UTC, so we need to parse it carefully
                            const [datePart, timePart] = e.target.value.split('T');
                            if (datePart && timePart) {
                              const [year, month, day] = datePart.split('-');
                              const [hours, minutes] = timePart.split(':');
                              const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                              setProcessDate(newDate);
                            }
                          }}
                          className="w-[200px]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProcessDate(new Date())}
                          className="h-9 px-3 text-xs"
                          title="Set to now"
                        >
                          Now
                        </Button>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => clearDraftQuoteMutation.mutate()}
                      className="flex items-center space-x-2"
                      disabled={quoteItems.length === 0}
                    >
                      <span>Clear Quote</span>
                    </Button>
                    <Button
                      onClick={saveQuote}
                      disabled={!chargeCode.trim() || quoteItems.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{editingQuoteId ? 'Update Quote' : 'Save Quote'}</span>
                    </Button>
                    <Button
                      onClick={completeSale}
                      disabled={!chargeCode.trim() || quoteItems.length === 0 || chargeCodeValidation.isValid === false || salesMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                    >
                      {salesMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Complete Sale</span>
                        </>
                      )}
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <div 
            className="border-l-4 border-amber-400 dark:border-amber-600 p-4 mb-4"
            style={{ backgroundColor: isDark ? 'rgba(120, 53, 15, 0.2)' : 'white' }}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Notice:</strong> Saved quotes reflect prices and stock levels at the time of creation. Current prices and availability may differ. Please verify before processing.
                </p>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Saved Quotes</span>
              </CardTitle>
              <div className="flex items-center gap-4 mt-4">
                <Select value={quoteStockFilter} onValueChange={setQuoteStockFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="saved">Saved (Named Quotes)</SelectItem>
                    <SelectItem value="draft">Draft (Unsaved)</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={quoteSortBy} onValueChange={setQuoteSortBy}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingQuotes ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-blue mx-auto mb-4"></div>
                  <p className="text-medium-gray">Loading saved quotes...</p>
                </div>
              ) : savedQuotes?.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-medium-gray mx-auto mb-4" />
                  <p className="text-medium-gray">No saved quotes yet</p>
                  <p className="text-sm text-medium-gray">Create a quote to see it here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote Name</TableHead>
                      <TableHead>Charge Code</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedQuotes
                      ?.filter((quote) => {
                        // Status filter logic
                        if (quoteStockFilter === "all") return true;
                        
                        // 'saved' means quotes with names that aren't drafts
                        if (quoteStockFilter === "saved") {
                          return quote.quoteName && quote.status !== "draft";
                        }
                        
                        // For draft and processed, match the actual status
                        return quote.status === quoteStockFilter;
                      })
                      .sort((a, b) => {
                        // Sorting
                        switch (quoteSortBy) {
                          case "date-desc":
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                          case "date-asc":
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                          case "amount-desc":
                            return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
                          case "amount-asc":
                            return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
                          case "name-asc":
                            return (a.quoteName || a.quoteId).localeCompare(b.quoteName || b.quoteId);
                          case "name-desc":
                            return (b.quoteName || b.quoteId).localeCompare(a.quoteName || a.quoteId);
                          default:
                            return 0;
                        }
                      })
                      .map((quote: SavedQuote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.quoteName || quote.quoteId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{quote.chargeCode}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">£{parseFloat(quote.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>{quote.items.length} items</TableCell>
                        <TableCell>
                          <Badge 
                            variant={quote.status === 'draft' ? 'secondary' : 
                                   quote.status === 'processed' ? 'default' : 'destructive'}
                          >
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {quote.creator.firstName} {quote.creator.lastName}
                        </TableCell>
                        <TableCell>
                          <NotesIndicator
                            referenceType="quote"
                            referenceId={quote.id.toString()}
                            entityName={`Quote ${quote.quoteId}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {(quote.status === 'draft' || quote.status === 'saved') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadQuoteForEditing(quote)}
                                  className="flex items-center space-x-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  <span>Restore</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => processQuote(quote.id)}
                                  disabled={processQuoteMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                                >
                                  {processQuoteMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ShoppingCart className="h-3 w-3" />
                                  )}
                                  <span>{processQuoteMutation.isPending ? 'Processing...' : 'Process'}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteQuote(quote.id)}
                                  disabled={deleteQuoteMutation.isPending}
                                  className="flex items-center space-x-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </Button>
                              </>
                            )}
                            {quote.status === 'processed' && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateSale(quote)}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
                              >
                                <ShoppingCart className="h-3 w-3" />
                                <span>Generate Sale</span>
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
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Stock Check - Current Quote</span>
              </CardTitle>
              <p className="text-sm text-medium-gray mt-2">
                Check stock levels for all items in your current quote to ensure availability before processing.
              </p>
            </CardHeader>
            <CardContent>
              {quoteItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-medium-gray mx-auto mb-4" />
                  <p className="text-medium-gray">No items in current quote</p>
                  <p className="text-sm text-medium-gray">Add items to your quote to check stock levels</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="text-green-600 dark:text-green-400 font-semibold">Sufficient Stock</div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {quoteItems.filter(item => Number(getCurrentStock(item.id, item.currentStock)) >= Number(item.requestedQuantity)).length}
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                      <div className="text-yellow-600 dark:text-yellow-400 font-semibold">Low Stock Warning</div>
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {quoteItems.filter(item => Number(getCurrentStock(item.id, item.currentStock)) > 0 && Number(getCurrentStock(item.id, item.currentStock)) < Number(item.requestedQuantity)).length}
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <div className="text-red-600 dark:text-red-400 font-semibold">Insufficient Stock</div>
                      <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {quoteItems.filter(item => Number(getCurrentStock(item.id, item.currentStock)) < Number(item.requestedQuantity)).length}
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Requested Qty</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Unit Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.map((item) => {
                        const currentStock = getCurrentStock(item.id, item.currentStock);
                        const stockDifference = currentStock - item.requestedQuantity;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-medium-gray font-mono">{item.sku}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category.name}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.requestedQuantity} {item.unit || 'pieces'}</TableCell>
                            <TableCell>
                              {item.location ? (
                                <div className="text-xs text-medium-gray">
                                  <i className="fas fa-map-marker-alt mr-1"></i>
                                  {item.location}
                                </div>
                              ) : (
                                <span className="text-xs text-medium-gray">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{currentStock}</TableCell>
                            <TableCell className={`font-medium ${stockDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stockDifference >= 0 ? `+${stockDifference}` : stockDifference}
                            </TableCell>
                            <TableCell>{getStockBadge(currentStock, item.requestedQuantity)}</TableCell>
                            <TableCell className="font-medium">£{parseFloat(item.price.toString()).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sale Confirmation Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Sale</DialogTitle>
            <DialogDescription>
              Enter your PIN to confirm and generate the sale from this quote.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="sale-pin">PIN</Label>
              <Input
                id="sale-pin"
                placeholder="Enter your PIN"
                value={salePin}
                onChange={(e) => setSalePin(e.target.value)}
                type="password"
              />
            </div>
            <div>
              <Label htmlFor="sale-charge-code">Charge Code</Label>
              <Input
                id="sale-charge-code"
                placeholder="Enter charge code"
                value={saleChargeCode}
                onChange={(e) => setSaleChargeCode(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaleDialog(false);
                setSelectedQuoteForSale(null);
                setSalePin("");
                setSaleChargeCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedQuoteForSale) {
                  generateSaleFromQuoteMutation.mutate({
                    quoteId: selectedQuoteForSale.id,
                    pin: salePin,
                    chargeCode: saleChargeCode,
                  });
                }
              }}
              disabled={generateSaleFromQuoteMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {generateSaleFromQuoteMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Confirm Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Quote Name Dialog */}
      <Dialog open={showSaveQuoteDialog} onOpenChange={setShowSaveQuoteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Quote</DialogTitle>
            <DialogDescription>
              Enter a name for your quote to save it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quoteName" className="text-right">
                Quote Name
              </Label>
              <Input
                id="quoteName"
                name="quoteName"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="Enter quote name"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveQuoteDialog(false);
                setQuoteName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSaveQuote}
              disabled={createQuoteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createQuoteMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Save Quote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Quantity Dialog */}
      <Dialog open={showCustomQuantityDialog} onOpenChange={setShowCustomQuantityDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Items with Custom Quantity</DialogTitle>
            <DialogDescription>
              Enter the quantity to add for all {selectedItemIds.size} selected items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customQuantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="customQuantity"
                name="customQuantity"
                type="number"
                min="1"
                step="1"
                value={customQuantity}
                onChange={(e) => setCustomQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomQuantityDialog(false);
                setCustomQuantity("1");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCustomQuantityAdd}
              className="bg-university-blue hover:bg-university-dark text-white"
            >
              Add to Quote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Date Dialog */}
      <Dialog open={showProcessCompleteDialog} onOpenChange={setShowProcessCompleteDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {pickingListData ? (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2 text-green-600" />
                  Complete Sale - Review & Confirm
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Process Quote
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {pickingListData 
                ? `Total: £${(pickingListData.items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)).toFixed(2)}`
                : "Select when this sale should be recorded. Defaults to now, but you can backdate or forward date as needed."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* STEP 1: Process Date Selection */}
            {!pickingListData && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="processDate" className="text-right">
                  Process on
                </Label>
                <Input
                  id="processDate"
                  name="processDate"
                  type="datetime-local"
                  value={processDate.toISOString().slice(0, 16)}
                  onChange={(e) => setProcessDate(new Date(e.target.value))}
                  className="col-span-3"
                />
              </div>
            )}

            {/* STEP 2: Packing List & Confirmation (shown after date is processed) */}
            {pickingListData && (
              <>
                {/* PIN Required Warning */}
                {validatedChargeCodeData?.pin && (
                  <div 
                    className="border border-amber-300 dark:border-amber-600 rounded-lg p-4 mb-4"
                    style={{ backgroundColor: isDark ? 'rgba(120, 53, 15, 0.2)' : 'white' }}
                  >
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-lock text-amber-600 dark:text-amber-400 mt-1"></i>
                      <div>
                        <div className="font-semibold text-amber-900 dark:text-amber-200">PIN Required</div>
                        <div className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                          This charge code ({pickingListData.chargeCode}) requires PIN verification.
                          Please ensure you have authorization before completing this sale.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Authorized Users */}
                {pickingListData.authorizedUsers && pickingListData.authorizedUsers.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="font-semibold text-blue-900 mb-3 flex items-center">
                      <i className="fas fa-users mr-2"></i>
                      Authorized Users for {pickingListData.chargeCode}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {pickingListData.authorizedUsers.map((user: any, index: number) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-card rounded border border-blue-100 dark:border-blue-800">
                          <div className="flex-shrink-0 w-6 h-6 bg-university-blue text-white rounded-full flex items-center justify-center text-xs">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-charcoal">{user.userName}</div>
                            {user.email && (
                              <div className="text-xs text-gray-600 flex items-center mt-0.5">
                                <i className="fas fa-envelope mr-1 text-gray-400 text-xs"></i>
                                {user.email}
                              </div>
                            )}
                            {user.department && (
                              <div className="text-xs text-gray-600 flex items-center mt-0.5">
                                <i className="fas fa-building mr-1 text-gray-400 text-xs"></i>
                                {user.department}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Item Locations (Packing List) */}
                {(user as any)?.showPickingList !== false && (
                  <div className="space-y-3 my-4">
                    <div className="font-semibold text-charcoal mb-2 flex items-center">
                      <i className="fas fa-map-marker-alt mr-2 text-green-600"></i>
                      Item Locations
                    </div>
                    {pickingListData.items.map((item, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 bg-muted">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-charcoal">{item.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              SKU: {item.sku} • Qty: {item.quantity.toFixed(2)} {item.unit || 'pcs'}
                            </div>
                            <div className="flex items-center mt-2">
                              <i className="fas fa-map-marker-alt text-green-600 mr-2"></i>
                              <span className="font-medium text-green-700">
                                {item.location || 'Location not set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recipient Selection */}
                {pickingListData.authorizedUsers && pickingListData.authorizedUsers.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="font-semibold text-green-900 mb-3 flex items-center">
                      <i className="fas fa-user-check mr-2"></i>
                      Who received these items?
                    </div>
                    <div className="space-y-2">
                      {pickingListData.authorizedUsers.map((user: any, index: number) => (
                        <Button
                          key={index}
                          variant={selectedRecipient === user.userName ? "default" : "outline"}
                          className={`w-full justify-start text-left h-auto py-3 px-4 ${
                            selectedRecipient === user.userName 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          onClick={() => handleRecipientSelected(user.userName, user.email)}
                        >
                          <div className="flex flex-col">
                            <div className="font-medium">{user.userName}</div>
                            {user.email && (
                              <div className="text-xs opacity-70">{user.email}</div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                    
                    {/* Manual Entry Option */}
                    <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                      <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                        Or enter a different name:
                      </div>
                      <Input
                        placeholder="Enter recipient name"
                        value={selectedRecipient && !pickingListData.authorizedUsers.find((u: any) => u.userName === selectedRecipient) ? selectedRecipient : ''}
                        onChange={(e) => handleRecipientSelected(e.target.value, undefined)}
                        className="!bg-white dark:!bg-gray-800 dark:text-white dark:border-gray-600"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <div className="text-sm text-blue-800">
                    <i className="fas fa-info-circle mr-2"></i>
                    Please collect items from the locations shown above before completing this sale.
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowProcessCompleteDialog(false);
                setQuoteToProcess(null);
                setPickingListData(null);
                setSelectedRecipient(null);
              }}
            >
              Cancel
            </Button>
            {!pickingListData && (
              <Button
                onClick={confirmProcessQuote}
                disabled={processQuoteMutation.isPending}
                className="bg-university-blue hover:bg-university-dark text-white"
              >
                {processQuoteMutation.isPending ? 'Processing...' : 'Next: Review Items'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Confirmation Dialog (for direct sale completion from quote form) */}
      <Dialog open={showLocationConfirmDialog} onOpenChange={setShowLocationConfirmDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-green-600" />
              Confirm Sale - Item Locations
            </DialogTitle>
            <DialogDescription>
              Review item locations, specify who the items are issued to, and confirm charge code details. Total: £{calculateTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {/* PIN Required Warning */}
          {validatedChargeCodeData?.pin && (
            <div 
              className="border border-amber-300 dark:border-amber-600 rounded-lg p-4 mb-4"
              style={{ backgroundColor: isDark ? 'rgba(120, 53, 15, 0.2)' : 'white' }}
            >
              <div className="flex items-start space-x-3">
                <i className="fas fa-lock text-amber-600 dark:text-amber-400 mt-1"></i>
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-200">PIN Required</div>
                  <div className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    This charge code ({chargeCode}) requires PIN verification.
                    Please ensure you have authorization before completing this sale.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Authorized Users */}
          {validatedChargeCodeData?.authorizedUsers && validatedChargeCodeData.authorizedUsers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="font-semibold text-blue-900 mb-3 flex items-center">
                <i className="fas fa-users mr-2"></i>
                Authorized Users for {chargeCode}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {validatedChargeCodeData.authorizedUsers.map((user: any, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-card rounded border border-blue-100 dark:border-blue-800">
                    <div className="flex-shrink-0 w-6 h-6 bg-university-blue text-white rounded-full flex items-center justify-center text-xs">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-charcoal">{user.userName}</div>
                      {user.email && (
                        <div className="text-xs text-gray-600 flex items-center mt-0.5">
                          <i className="fas fa-envelope mr-1 text-gray-400 text-xs"></i>
                          {user.email}
                        </div>
                      )}
                      {user.department && (
                        <div className="text-xs text-gray-600 flex items-center mt-0.5">
                          <i className="fas fa-building mr-1 text-gray-400 text-xs"></i>
                          {user.department}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item Locations */}
          <div className="space-y-3 my-4">
            <div className="font-semibold text-charcoal mb-2 flex items-center">
              <i className="fas fa-map-marker-alt mr-2 text-green-600"></i>
              Item Locations
            </div>
            {quoteItems.map((item, index) => (
              <div key={index} className="border border-border rounded-lg p-4 bg-muted">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-charcoal">{item.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      SKU: {item.sku} • Qty: {parseFloat(String(item.requestedQuantity)).toFixed(2)} {item.unit || 'pieces'}
                    </div>
                    <div className="flex items-center mt-2">
                      <i className="fas fa-map-marker-alt text-green-600 mr-2"></i>
                      <span className="font-medium text-green-700">
                        {item.location || 'Location not set'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-university-blue">
                      £{(parseFloat(String(item.requestedQuantity)) * item.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Issued To Selection */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 my-4">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
              <i className="fas fa-user-check mr-2"></i>
              Issued To
            </div>

            {validatedChargeCodeData?.authorizedUsers && validatedChargeCodeData.authorizedUsers.length > 0 ? (
              <>
                <div className="space-y-2 mb-4">
                  {validatedChargeCodeData.authorizedUsers.map((user: any, index: number) => (
                    <Button
                      key={index}
                      type="button"
                      variant={issuedTo === user.userName ? "default" : "outline"}
                      className={`w-full justify-start text-left h-auto py-2 px-3 ${
                        issuedTo === user.userName
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      onClick={() => {
                        setIssuedTo(user.userName);
                        setIssuedToEmail(user.email);
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{user.userName}</div>
                        {user.email && (
                          <div className="text-xs opacity-80 mt-0.5">{user.email}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Manual Entry Option */}
                <div className="pt-3 border-t border-green-200 dark:border-green-700">
                  <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    Or enter a different name:
                  </div>
                  <Input
                    placeholder="Enter recipient name"
                    value={issuedTo && !validatedChargeCodeData.authorizedUsers.find((u: any) => u.userName === issuedTo) ? issuedTo : ''}
                    onChange={(e) => {
                      setIssuedTo(e.target.value);
                      setIssuedToEmail(undefined);
                    }}
                    className="bg-background border-green-200 dark:border-green-800"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                  Enter the name of the person receiving these items:
                </p>
                <Input
                  placeholder="Enter recipient name"
                  value={issuedTo}
                  onChange={(e) => {
                    setIssuedTo(e.target.value);
                    setIssuedToEmail(undefined);
                  }}
                  className="bg-background border-green-200 dark:border-green-800"
                />
              </>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <div className="text-sm text-blue-800">
              <i className="fas fa-info-circle mr-2"></i>
              Please collect items from the locations shown above before completing this sale.
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowLocationConfirmDialog(false);
                setIssuedTo("");
                setIssuedToEmail(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400"
              disabled={salesMutation.isPending}
              onClick={async () => {
                setShowLocationConfirmDialog(false);
                await confirmCompleteSale();
              }}
            >
              {salesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Confirm & Complete Sale
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAuthorizedUsersDialog} onOpenChange={setShowAuthorizedUsersDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className="fas fa-users mr-2 text-university-blue"></i>
              Authorized Users for {chargeCode}
            </DialogTitle>
            <DialogDescription>
              The following people are authorized to use this charge code:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {validatedChargeCodeData?.authorizedUsers?.map((user: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-muted rounded-lg border border-border">
                  <div className="flex-shrink-0 w-8 h-8 bg-university-blue text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-charcoal">{user.userName}</div>
                    {user.email && (
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <i className="fas fa-envelope mr-1 text-gray-400"></i>
                        {user.email}
                      </div>
                    )}
                    {user.department && (
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <i className="fas fa-building mr-1 text-gray-400"></i>
                        {user.department}
                      </div>
                    )}
                    {user.notes && (
                      <div className="text-sm text-gray-600 mt-2 italic">
                        {user.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowAuthorizedUsersDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setQuoteToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteQuote}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}