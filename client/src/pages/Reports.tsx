import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import NotesIndicator from "@/components/NotesIndicator";
import { ChevronDown, ChevronUp, CalendarIcon, Plus, Filter } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import type { Category, Supplier, Chargecode } from "@shared/schema";

interface SaleData {
  id: number;
  saleId: string;
  chargeCode: string;
  total: number;
  totalAmount: string;
  isPaid: boolean;
  createdAt: string;
  processedBy: {
    firstName: string;
    lastName: string;
  };
  deliveredTo?: string;
  deliveredToEmail?: string;
  deliveredAt?: string;
  customerNotes?: string;
  notes?: string;
  items: {
    itemName?: string;
    name?: string;
    itemSku?: string;
    sku?: string;
    unitPrice?: string;
    price?: string;
    quantity: string | number;
    vatRate?: string | number;
    vatIncluded?: boolean;
    vatAmount?: string | number;
    subtotal?: string | number;
    totalWithVat?: string | number;
  }[];
}

interface SalesFilters {
  chargeCode: string;
  sku: string;
  startDate: string;
  endDate: string;
  timePeriod: string;
  showUnpaidOnly: boolean;
  category: string;
  vendor: string;
  page: number;
  limit: number;
}

interface SalesReportData {
  data: {
    summary: {
      totalSales: number;
      totalAmount: number;
      uniqueChargeCodes: number;
    };
    sales: SaleData[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

interface AggregatedItem {
  name: string;
  sku: string;
  quantity: number;
  totalValue: number;
}

export default function Reports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedChargeCodes, setExpandedChargeCodes] = useState<Set<string>>(new Set());
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentChargeCode, setAdjustmentChargeCode] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [editingQuantities, setEditingQuantities] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<SaleData | null>(null);
  const [editedQuantities, setEditedQuantities] = useState<Record<number, number>>({});
  const [refundingItem, setRefundingItem] = useState<{ saleId: number; itemIndex: number } | null>(null);
  const [refundQuantity, setRefundQuantity] = useState<number>(0);
  const [refundNote, setRefundNote] = useState("");
  const [chargeCodeOpen, setChargeCodeOpen] = useState(false);
  const [chargeCodeSearch, setChargeCodeSearch] = useState("");
  const [debouncedChargeCodeSearch, setDebouncedChargeCodeSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [debouncedVendorSearch, setDebouncedVendorSearch] = useState("");
  const [skuInput, setSkuInput] = useState("");

  // Debounce charge code search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedChargeCodeSearch(chargeCodeSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [chargeCodeSearch]);

  // Debounce vendor search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedVendorSearch(vendorSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [vendorSearch]);

  // Debounce SKU filter input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSalesFilters(prev => ({ ...prev, sku: skuInput, page: 1 }));
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [skuInput]);

  const getDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "this_week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "last_week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() - now.getDay());
        endDate.setHours(0, 0, 0, 0);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_30_days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "last_90_days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "this_quarter": {
        const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), currentQuarterStart, 1);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      }
      case "last_quarter": {
        const lastQuarterStart = Math.floor((now.getMonth() - 3) / 3) * 3;
        const lastQuarterEnd = lastQuarterStart + 3;
        startDate = new Date(now.getFullYear(), lastQuarterStart, 1);
        endDate = new Date(now.getFullYear(), lastQuarterEnd, 1);
        break;
      }
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const [salesFilters, setSalesFilters] = useState<SalesFilters>({
    chargeCode: "",
    sku: "",
    startDate: getDateRangeFromPeriod("last_month").startDate,
    endDate: getDateRangeFromPeriod("last_month").endDate,
    timePeriod: "last_month",
    showUnpaidOnly: false,
    category: "all",
    vendor: "all",
    page: 1,
    limit: 10000, // Increased limit for exports
  });

  // Fetch charge codes for filter dropdown
  const { data: chargeCodes } = useQuery({
    queryKey: ['charge-codes'],
    queryFn: () => apiRequest("GET", '/api/chargecodes').then(res => res.json()),
  });

  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest("GET", '/api/categories').then(res => res.json()),
  });

  // Fetch vendors (suppliers) for filter dropdown
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiRequest("GET", '/api/suppliers').then(res => res.json()),
  });

  // Fetch sales report
  const { data: salesReport, isFetching: isReportFetching } = useQuery({
    queryKey: ['sales-report', salesFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (salesFilters.chargeCode) params.append('chargeCode', salesFilters.chargeCode);
      if (salesFilters.sku) params.append('sku', salesFilters.sku);
      if (salesFilters.startDate) params.append('startDate', salesFilters.startDate);
      if (salesFilters.endDate) params.append('endDate', salesFilters.endDate);
      if (salesFilters.showUnpaidOnly) params.append('showUnpaidOnly', 'true');
      if (salesFilters.vendor && salesFilters.vendor !== 'all') params.append('vendor', salesFilters.vendor);
      if (salesFilters.category && salesFilters.category !== 'all') params.append('category', salesFilters.category);
      params.append('page', salesFilters.page.toString());
      params.append('limit', salesFilters.limit.toString());

      const res = await apiRequest("GET", `/api/sales/reports?${params.toString()}`);
      return await res.json() as SalesReportData;
    },
  });

  // Group sales by charge code
  const groupedSales = useMemo(() => {
    if (!salesReport?.data?.sales) return {};
    return salesReport.data.sales.reduce((acc: Record<string, SaleData[]>, sale) => {
      if (!acc[sale.chargeCode]) {
        acc[sale.chargeCode] = [];
      }
      acc[sale.chargeCode].push(sale);
      return acc;
    }, {});
  }, [salesReport]);

  // Aggregate items by charge code, filtered by active SKU/vendor if set
  const itemsByChargeCode = useMemo(() => {
    const result: Record<string, Record<string, AggregatedItem>> = {};
    const activeSku = salesFilters.sku?.toLowerCase() || '';

    Object.entries(groupedSales).forEach(([chargeCode, sales]) => {
      result[chargeCode] = {};

      sales.forEach(sale => {
        sale.items.forEach((item) => {
          const itemName = item.itemName || item.name || 'Unknown Item';
          const itemSku = item.itemSku || item.sku || 'N/A';
          const itemPrice = parseFloat(item.unitPrice || item.price || '0');
          const itemQuantity = parseFloat(item.quantity?.toString() || '0');

          // When SKU filter is active, only show items matching the filter
          if (activeSku && !itemSku.toLowerCase().includes(activeSku) && !itemName.toLowerCase().includes(activeSku)) {
            return;
          }

          const itemKey = `${itemName}-${itemSku}`;

          if (!result[chargeCode][itemKey]) {
            result[chargeCode][itemKey] = {
              name: itemName,
              sku: itemSku,
              quantity: 0,
              totalValue: 0
            };
          }

          result[chargeCode][itemKey].quantity += itemQuantity;
          result[chargeCode][itemKey].totalValue += itemQuantity * itemPrice;
        });
      });
    });

    return result;
  }, [groupedSales, salesFilters.sku]);

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const res = await apiRequest("PATCH", `/api/sales/${saleId}/paid`, { isPaid: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      toast({ title: "Success", description: "Sale marked as paid" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to mark sale as paid", variant: "destructive" });
    },
  });

  // Mark as unpaid mutation
  const markAsUnpaidMutation = useMutation({
    mutationFn: async (saleId: number) => {
      const res = await apiRequest("PATCH", `/api/sales/${saleId}/paid`, { isPaid: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      toast({ title: "Success", description: "Sale marked as unpaid" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to mark sale as unpaid", variant: "destructive" });
    },
  });

  // Bulk mark as paid mutation
  const bulkMarkAsPaidMutation = useMutation({
    mutationFn: async (saleIds: number[]) => {
      await Promise.all(
        saleIds.map(id => apiRequest("PATCH", `/api/sales/${id}/paid`, { isPaid: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      setSelectedSales(new Set());
      toast({ title: "Success", description: "Selected sales marked as paid" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to mark sales as paid", variant: "destructive" });
    },
  });

  // Refund sale mutation (for partial item refunds)
  const refundItemMutation = useMutation({
    mutationFn: async ({ saleId, items }: { saleId: number; items: Array<{ itemId: number; refundQty: number }> }) => {
      const res = await apiRequest("PATCH", `/api/sales/${saleId}/refund`, { items, note: refundNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      toast({ title: "Success", description: "Item refunded and stock returned to inventory" });
      setRefundingItem(null);
      setRefundQuantity(0);
      setRefundNote("");
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to refund item", variant: "destructive" });
    },
  });

  // Edit sale quantities mutation
  const editSaleQuantitiesMutation = useMutation({
    mutationFn: async ({ saleId, quantities }: { saleId: number, quantities: Record<number, number> }) => {
      const res = await apiRequest("PATCH", `/api/sales/${saleId}/quantities`, { quantities });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      setEditingQuantities(false);
      setSelectedSaleForEdit(null);
      setEditedQuantities({});
      toast({ title: "Success", description: "Sale quantities updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update sale quantities", variant: "destructive" });
    },
  });

  const toggleChargeCode = (code: string) => {
    const newExpanded = new Set(expandedChargeCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedChargeCodes(newExpanded);
  };

  const toggleSaleSelection = (saleId: number) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const toggleSelectAll = (saleIds: number[]) => {
    const allSelected = saleIds.every(id => selectedSales.has(id));
    const newSelected = new Set(selectedSales);

    if (allSelected) {
      saleIds.forEach(id => newSelected.delete(id));
    } else {
      saleIds.forEach(id => newSelected.add(id));
    }

    setSelectedSales(newSelected);
  };

  const handleSalesFilterChange = (field: keyof SalesFilters, value: string) => {
    setSalesFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const clearSalesFilters = () => {
    const dates = getDateRangeFromPeriod("last_month");
    setSkuInput("");
    setSalesFilters({
      chargeCode: "",
      sku: "",
      startDate: dates.startDate,
      endDate: dates.endDate,
      timePeriod: "last_month",
      showUnpaidOnly: false,
      category: "all",
      vendor: "all",
      page: 1,
      limit: 10000,
    });
  };

  const handleMarkAsPaid = (saleId: number) => {
    markAsPaidMutation.mutate(saleId);
  };

  const handleMarkAsUnpaid = (saleId: number) => {
    if (confirm('Are you sure you want to mark this sale as unpaid? This may be used for refunds or payment errors.')) {
      markAsUnpaidMutation.mutate(saleId);
    }
  };

  const handleRefundItem = (saleId: number, itemIndex: number) => {
    if (!selectedSaleForEdit) return;
    const item = selectedSaleForEdit.items[itemIndex];
    const currentQty = parseFloat(item.quantity?.toString() || '0');
    
    setRefundingItem({ saleId, itemIndex });
    setRefundQuantity(currentQty);
    setRefundNote(`Refund for ${item.itemName || item.name || 'Unknown'}`);
  };

  const handleSaveRefund = () => {
    if (!refundingItem || !selectedSaleForEdit) return;
    
    const item = selectedSaleForEdit.items[refundingItem.itemIndex];
    if (refundQuantity <= 0) {
      toast({ title: "Error", description: "Refund quantity must be greater than 0", variant: "destructive" });
      return;
    }

    const itemId = (item as any).itemId || null;
    if (!itemId) {
      toast({ title: "Error", description: "Cannot refund items that don't have an item ID", variant: "destructive" });
      return;
    }

    refundItemMutation.mutate({
      saleId: refundingItem.saleId,
      items: [{ itemId, refundQty: refundQuantity }]
    });
  };

  const handleEditQuantities = (sale: SaleData) => {
    setSelectedSaleForEdit(sale);
    // Initialize edited quantities with current quantities
    const initialQuantities: Record<number, number> = {};
    sale.items.forEach((item: SaleData['items'][0], index: number) => {
      initialQuantities[index] = parseFloat(item.quantity?.toString() || '0');
    });
    setEditedQuantities(initialQuantities);
    setEditingQuantities(true);
  };

  const handleSaveQuantities = () => {
    if (!selectedSaleForEdit) return;

    // Filter out unchanged quantities and convert to the format expected by the backend
    const quantitiesToUpdate: Record<number, number> = {};
    selectedSaleForEdit.items.forEach((item: SaleData['items'][0], index: number) => {
      const newQty = editedQuantities[index];
      const originalQty = parseFloat(item.quantity?.toString() || '0');
      if (newQty !== originalQty) {
        quantitiesToUpdate[index] = newQty;
      }
    });

    if (Object.keys(quantitiesToUpdate).length === 0) {
      toast({ title: "No changes", description: "No quantities were changed" });
      setEditingQuantities(false);
      return;
    }

    editSaleQuantitiesMutation.mutate({
      saleId: selectedSaleForEdit.id,
      quantities: quantitiesToUpdate
    });
  };

  // Handle creating an adjustment/refund
  const handleCreateAdjustment = async () => {
    if (!adjustmentChargeCode.trim()) {
      toast({
        title: "Charge code required",
        description: "Please enter a charge code",
        variant: "destructive"
      });
      return;
    }
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid non-zero amount",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Fetch MISC item
      const miscItemResponse = await apiRequest("GET", "/api/items?sku=MISC");
      const miscItemData = await miscItemResponse.json();
      
      if (!miscItemData?.items?.[0]) {
        throw new Error("MISC item not found. Please contact administrator.");
      }
      
      const misc = miscItemData.items[0];
      
      // Create sale with MISC item at custom price
      // Positive amount = refund (negative price), Negative amount = charge (positive price)
      const unitPrice = Math.abs(amount) * (amount > 0 ? -1 : 1);
      
      await apiRequest("POST", "/api/sales", {
        chargeCode: adjustmentChargeCode.trim(),
        customerNotes: `ADJUSTMENT: ${adjustmentReason || 'Manual adjustment'}`,
        processDate: adjustmentDate.toISOString(),
        items: [{
          itemId: misc.id,
          itemName: amount > 0 ? "Refund" : "Additional Charge",
          itemSku: "MISC",
          quantity: 1,
          unitPrice: unitPrice
        }]
      });
      
      toast({
        title: "Adjustment created",
        description: `${amount > 0 ? 'Refund' : 'Charge'} of £${Math.abs(amount).toFixed(2)} recorded for ${adjustmentChargeCode}`
      });
      
      setShowAdjustmentDialog(false);
      setAdjustmentChargeCode("");
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setAdjustmentDate(new Date());
      
      // Refresh sales data
      queryClient.invalidateQueries({ queryKey: ["/api/sales/reports"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create adjustment",
        variant: "destructive"
      });
    }
  };

  const handleExport = async (type: string, format: string) => {
    try {
      // Fetch ALL matching sales for export (not paginated)
      const params = new URLSearchParams();
      if (salesFilters.chargeCode) params.append('chargeCode', salesFilters.chargeCode);
      if (salesFilters.sku) params.append('sku', salesFilters.sku);
      if (salesFilters.startDate) params.append('startDate', salesFilters.startDate);
      if (salesFilters.endDate) params.append('endDate', salesFilters.endDate);
      if (salesFilters.showUnpaidOnly) params.append('showUnpaidOnly', 'true');
      if (salesFilters.vendor && salesFilters.vendor !== 'all') params.append('vendor', salesFilters.vendor);
      if (salesFilters.category && salesFilters.category !== 'all') params.append('category', salesFilters.category);
      params.append('export', 'true'); // Signal to fetch all records
      params.append('page', '1');
      params.append('limit', '999999'); // High limit for export

      const res = await apiRequest("GET", `/api/sales/reports?${params.toString()}`);
      const exportData = await res.json() as SalesReportData;

      if (!exportData?.data?.sales || exportData.data.sales.length === 0) {
        toast({ title: "No Data", description: "No sales data to export", variant: "destructive" });
        return;
      }

      // Export with all requested fields: SKU, delivered_to, units, VAT, etc.
      const dataToExport: Record<string, unknown>[] = [];

      exportData.data.sales.forEach(sale => {
        // Calculate correct transaction total by summing all line totals (which already include VAT)
        const transactionTotal = sale.items.reduce((sum, item: SaleData['items'][0]) => {
          const unitPrice = parseFloat(item.unitPrice || item.price || '0');
          const quantity = parseFloat(item.quantity?.toString() || '0');
          return sum + (unitPrice * quantity);
        }, 0);

        // Export each item as a separate row for detailed reporting
        sale.items.forEach((item: SaleData['items'][0]) => {
          const itemName = item.itemName || item.name || 'Unknown Item';
          const itemSku = item.itemSku || item.sku || 'N/A';
          const unitPrice = parseFloat(item.unitPrice || item.price || '0');
          const quantity = parseFloat(item.quantity?.toString() || '0');
          const lineTotal = unitPrice * quantity;

          // STRICT VALIDATION: vatRate must be present - error if missing
          if (item.vatRate === undefined || item.vatRate === null) {
            throw new Error(`Missing vatRate for item "${itemName}" (SKU: ${itemSku}) in sale ${sale.saleId}. VAT data must be stored at time of sale.`);
          }
          const vatRate = parseFloat(item.vatRate.toString());

          // STRICT VALIDATION: vatIncluded must be present - error if missing
          if (item.vatIncluded === undefined || item.vatIncluded === null) {
            throw new Error(`Missing vatIncluded flag for item "${itemName}" (SKU: ${itemSku}) in sale ${sale.saleId}. VAT included flag must be stored at time of sale.`);
          }
          const vatIncluded = item.vatIncluded;

          // Use pre-calculated VAT values from server if available
          let excVatAmount: number;
          let vatAmount: number;
          let incVatAmount: number;

          if (item.vatAmount !== undefined && item.subtotal !== undefined && item.totalWithVat !== undefined) {
            // Server has already calculated VAT - use those values directly
            // These values are already calculated for the full line quantity, DO NOT multiply by quantity again
            excVatAmount = parseFloat(item.subtotal?.toString() || '0');
            vatAmount = parseFloat(item.vatAmount?.toString() || '0');
            incVatAmount = parseFloat(item.totalWithVat.toString());
          } else if (vatIncluded) {
            // Fallback: Price includes VAT - extract it
            incVatAmount = lineTotal;
            excVatAmount = lineTotal / (1 + vatRate);
            vatAmount = lineTotal - excVatAmount;
          } else {
            // Fallback: Price excludes VAT - add it
            excVatAmount = lineTotal;
            vatAmount = lineTotal * vatRate;
            incVatAmount = excVatAmount + vatAmount;
          }

          // Extract reason from customer notes if this is an adjustment
          const notes = sale.customerNotes || sale.notes || '';
          const isAdjustment = notes.startsWith('ADJUSTMENT:');
          const reason = isAdjustment ? notes.replace('ADJUSTMENT:', '').trim() : notes;

          dataToExport.push({
            'Sale ID': sale.saleId,
            'Sale Date': new Date(sale.createdAt).toLocaleDateString('en-GB'),
            'Sale Time': new Date(sale.createdAt).toLocaleTimeString('en-GB'),
            'Charge Code': sale.chargeCode,
            'SKU': itemSku,
            'Item Name': itemName,
            'Quantity': quantity,
            'Unit Price': unitPrice.toFixed(2),
            'Price VAT Included': vatIncluded ? 'Yes' : 'No',
            'Line Total (Inc VAT)': incVatAmount.toFixed(2),
            'Line Total (Exc VAT)': excVatAmount.toFixed(2),
            'VAT Amount': vatAmount.toFixed(2),
            'VAT Rate': `${(vatRate * 100).toFixed(0)}%`,
            'Transaction Total': transactionTotal.toFixed(2),
            'Status': sale.isPaid ? 'Paid' : 'Unpaid',
            'Processed By': `${sale.processedBy.firstName} ${sale.processedBy.lastName}`,
            'Delivered To': sale.deliveredTo || 'N/A',
            'Delivery Date': sale.deliveredAt ? new Date(sale.deliveredAt).toLocaleString('en-GB') : 'N/A',
            'Type': isAdjustment ? (unitPrice < 0 ? 'Refund' : 'Charge') : 'Sale',
            'Notes/Reason': reason || 'N/A',
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales");

      if (format === 'csv') {
        XLSX.writeFile(wb, `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        XLSX.writeFile(wb, `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      toast({ title: "Export Complete", description: `Exported ${dataToExport.length} rows from ${exportData.data.sales.length} transactions` });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export Error", description: "Failed to export data", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Sales Reports</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <i className="fas fa-download mr-2"></i>
                Export Current View
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("current-view", "csv")}>
                <i className="fas fa-file-csv mr-2"></i>
                Export to .csv
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("current-view", "xlsx")}>
                <i className="fas fa-file-excel mr-2"></i>
                Export to .xlsx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Period */}
            <div className="space-y-2">
              <Label htmlFor="time-period-filter">Time Period</Label>
              <Select
                value={salesFilters.timePeriod}
                onValueChange={(value) => {
                  setSalesFilters(prev => ({ ...prev, timePeriod: value, page: 1 }));
                  if (value !== "custom") {
                    const { startDate, endDate } = getDateRangeFromPeriod(value);
                    setSalesFilters(prev => ({ ...prev, startDate, endDate, page: 1 }));
                  }
                }}
              >
                <SelectTrigger id="time-period-filter">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={salesFilters.startDate}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSalesFilterChange("startDate", e.target.value);
                    setSalesFilters(prev => ({ ...prev, timePeriod: "custom" }));
                  }
                }}
                disabled={salesFilters.timePeriod !== 'custom'}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={salesFilters.endDate}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSalesFilterChange("endDate", e.target.value);
                    setSalesFilters(prev => ({ ...prev, timePeriod: "custom" }));
                  }
                }}
                disabled={salesFilters.timePeriod !== 'custom'}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={salesFilters.category} onValueChange={(value) => setSalesFilters(prev => ({ ...prev, category: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Filter */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={salesFilters.vendor} onValueChange={(value) => {
                setSalesFilters(prev => ({ ...prev, vendor: value, page: 1 }));
                setVendorSearch(""); // Clear search when selecting
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="sticky top-0 z-10 bg-card p-2 border-b border-border">
                    <Input
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => {
                        e.stopPropagation();
                        setVendorSearch(e.target.value);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto">
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors
                      ?.filter((vendor: Supplier) => {
                        if (!debouncedVendorSearch) return true;
                        return vendor.name?.toLowerCase().includes(debouncedVendorSearch.toLowerCase());
                      })
                      .map((vendor: Supplier) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    {vendors?.filter((vendor: Supplier) =>
                      debouncedVendorSearch &&
                      !vendor.name?.toLowerCase().includes(debouncedVendorSearch.toLowerCase())
                    ).length === vendors?.length && debouncedVendorSearch && (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No vendors found matching "{debouncedVendorSearch}"
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Charge Code */}
            <div className="space-y-2">
              <Label htmlFor="charge-code-filter">Charge Code</Label>
              <Popover open={chargeCodeOpen} onOpenChange={setChargeCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {salesFilters.chargeCode ? salesFilters.chargeCode : 'All Charge Codes'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search charge codes..."
                      value={chargeCodeSearch}
                      onChange={(e) => setChargeCodeSearch(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSalesFilters(prev => ({ ...prev, chargeCode: '', page: 1 }));
                        setChargeCodeOpen(false);
                        setChargeCodeSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        !salesFilters.chargeCode ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      All Charge Codes
                    </button>
                    {chargeCodes
                      ?.filter((code: Chargecode) =>
                        debouncedChargeCodeSearch.length === 0 ||
                        code.code.toLowerCase().includes(debouncedChargeCodeSearch.toLowerCase())
                      )
                      .map((code: Chargecode) => (
                        <button
                          key={code.code}
                          onClick={() => {
                            setSalesFilters(prev => ({ ...prev, chargeCode: code.code, page: 1 }));
                            setChargeCodeOpen(false);
                            setChargeCodeSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            code.code === salesFilters.chargeCode ? 'bg-blue-100 dark:bg-blue-900' : ''
                          }`}
                        >
                          {code.code}
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku-filter">SKU</Label>
              <Input
                id="sku-filter"
                placeholder="Filter by SKU..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
              />
            </div>

            {/* Unpaid Only Checkbox */}
            <div className="space-y-2 flex items-end">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="unpaid-only-filter"
                  checked={salesFilters.showUnpaidOnly}
                  onChange={(e) => setSalesFilters(prev => ({ ...prev, showUnpaidOnly: e.target.checked, page: 1 }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="unpaid-only-filter" className="text-sm cursor-pointer">
                  Show unpaid sales only
                </Label>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="space-y-2 flex items-end">
              <Button variant="outline" onClick={clearSalesFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Reports Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <i className="fas fa-cash-register mr-2 text-university-blue"></i>
              Sales by Charge Code
            </CardTitle>
            <Button
              onClick={() => setShowAdjustmentDialog(true)}
              className="ml-2"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          {salesReport?.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Sales</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {salesReport.data.summary.totalSales}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Amount</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  £{salesReport.data.summary.totalAmount.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Unique Charge Codes</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {salesReport.data.summary.uniqueChargeCodes}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedSales.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedSales.size} sale{selectedSales.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  const unPaidSales = Array.from(selectedSales).filter(id => {
                    const sale = Object.values(groupedSales)
                      .flat()
                      .find((s: any) => s.id === id);
                    return sale && !sale.isPaid;
                  });
                  if (unPaidSales.length > 0) {
                    bulkMarkAsPaidMutation.mutate(unPaidSales);
                  }
                }}
                disabled={bulkMarkAsPaidMutation.isPending}
              >
                {bulkMarkAsPaidMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className="fas fa-check mr-2"></i>
                )}
                Mark as Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSales(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Active filter banner */}
          {(salesFilters.sku || (salesFilters.vendor && salesFilters.vendor !== 'all') || (salesFilters.category && salesFilters.category !== 'all')) && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Filter className="w-4 h-4 flex-shrink-0" />
              <span>
                Filtering by:
                {salesFilters.sku && <strong className="ml-1">SKU "{salesFilters.sku}"</strong>}
                {salesFilters.vendor && salesFilters.vendor !== 'all' && <strong className="ml-1">Vendor</strong>}
                {salesFilters.category && salesFilters.category !== 'all' && <strong className="ml-1">Category</strong>}
                {' — '}showing {salesReport?.data?.summary?.totalSales ?? 0} matching transaction{(salesReport?.data?.summary?.totalSales ?? 0) !== 1 ? 's' : ''}
                {salesFilters.sku && <span className="text-xs ml-1">(items table also filtered to matching rows)</span>}
              </span>
            </div>
          )}

          {/* Loading overlay while refetching */}
          {isReportFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <i className="fas fa-spinner fa-spin"></i>
              Applying filters…
            </div>
          )}

          {/* Sales List */}
          <div className="space-y-3">
            {Object.entries(groupedSales).length === 0 && !isReportFetching && (
              <div className="text-center py-12 text-muted-foreground">
                <i className="fas fa-search text-3xl mb-3 block opacity-40"></i>
                <p className="font-medium">No transactions found</p>
                {(salesFilters.sku || (salesFilters.vendor && salesFilters.vendor !== 'all') || (salesFilters.category && salesFilters.category !== 'all')) ? (
                  <p className="text-sm mt-1">
                    No sales match the active filters. Try broadening your search or{' '}
                    <button onClick={clearSalesFilters} className="underline hover:no-underline">clearing filters</button>.
                    {salesFilters.vendor && salesFilters.vendor !== 'all' && (
                      <span className="block mt-1 text-xs">Note: vendor filtering requires items to be linked to suppliers via the Suppliers page.</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm mt-1">No sales in the selected date range.</p>
                )}
              </div>
            )}
            {Object.entries(groupedSales).map(([chargeCode, sales]) => {
              const isExpanded = expandedChargeCodes.has(chargeCode);
              const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
              const aggregatedItems = itemsByChargeCode[chargeCode] || {};
              const totalUniqueItems = Object.keys(aggregatedItems).length;
              const chargeCodeUnpaidSales = (sales as any[]).filter(s => !s.isPaid).map((s: any) => s.id);
              const allChargeCodeSelected = chargeCodeUnpaidSales.length > 0 && chargeCodeUnpaidSales.every(id => selectedSales.has(id));

              return (
                <div key={chargeCode} className="border rounded-lg bg-card">
                  {/* Charge Code Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent"
                    onClick={() => toggleChargeCode(chargeCode)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allChargeCodeSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectAll(chargeCodeUnpaidSales);
                        }}
                        disabled={chargeCodeUnpaidSales.length === 0}
                        className={`w-5 h-5 rounded ${chargeCodeUnpaidSales.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}`}
                        title={chargeCodeUnpaidSales.length > 0 ? "Select all unpaid sales in this charge code" : "No unpaid sales in this charge code"}
                      />
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold text-lg text-foreground">{chargeCode}</div>
                        <div className="text-sm text-muted-foreground">
                          {sales.length} order{sales.length !== 1 ? 's' : ''} • {totalUniqueItems} unique item{totalUniqueItems !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-green-700 dark:text-green-400">
                        £{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t bg-background p-4">
                      {/* Aggregated Items Table */}
                      <div className="mb-4">
                        <h4 className="text-md font-semibold mb-2 text-university-blue">
                          <i className="fas fa-boxes mr-2"></i>
                          Items Ordered (Aggregated)
                        </h4>
                        <div className="bg-card border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="text-left p-3 font-semibold text-sm">Item Name</th>
                                <th className="text-left p-3 font-semibold text-sm">SKU</th>
                                <th className="text-right p-3 font-semibold text-sm">Total Quantity</th>
                                <th className="text-right p-3 font-semibold text-sm">Avg Unit Price</th>
                                <th className="text-right p-3 font-semibold text-sm">Total Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(aggregatedItems)
                                .sort((a, b) => b.totalValue - a.totalValue)
                                .map((item, idx) => {
                                  const avgPrice = item.quantity > 0 ? item.totalValue / item.quantity : 0;
                                  return (
                                    <tr key={idx} className="border-t hover:bg-accent">
                                      <td className="p-3 text-foreground">{item.name}</td>
                                      <td className="p-3 text-muted-foreground text-sm">{item.sku}</td>
                                      <td className="p-3 text-right font-medium text-foreground">{item.quantity.toFixed(2)}</td>
                                      <td className="p-3 text-right text-muted-foreground">
                                        £{avgPrice.toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right font-semibold text-green-700 dark:text-green-400">
                                        £{item.totalValue.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Individual Orders */}
                      <h4 className="text-md font-semibold mb-2 text-foreground mt-4">
                        <i className="fas fa-receipt mr-2"></i>
                        Individual Orders
                      </h4>
                      <div className="space-y-3">
                        {sales.map((sale) => {
                          const isSelected = selectedSales.has(sale.id);
                          return (
                            <div key={sale.id} className={`border rounded-lg p-3 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-card border-border'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSaleSelection(sale.id)}
                                    className="w-5 h-5 rounded cursor-pointer"
                                  />
                                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                    {/* Sale ID */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase">Sale ID</div>
                                      <div className="font-medium text-foreground">{sale.saleId}</div>
                                    </div>

                                    {/* Sale Date */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase">Sale Date</div>
                                      <div className="font-medium text-foreground">{new Date(sale.createdAt).toLocaleDateString()}</div>
                                      <div className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                                    </div>

                                    {/* Delivered To */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase">Delivered To</div>
                                      {sale.deliveredTo ? (
                                        <div>
                                          <div className="font-medium text-foreground flex items-center gap-1">
                                            <i className="fas fa-box-open text-xs text-green-600 dark:text-green-400"></i>
                                            {sale.deliveredTo}
                                          </div>
                                          {sale.deliveredAt && (
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(sale.deliveredAt).toLocaleDateString()}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-muted-foreground italic text-xs">Not delivered</div>
                                      )}
                                    </div>

                                    {/* Charge Code & Processed By */}
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground uppercase">Charge Code</div>
                                      <div className="font-medium text-foreground">{sale.chargeCode}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {sale.processedBy.firstName} {sale.processedBy.lastName}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <NotesIndicator
                                    referenceType="sale"
                                    referenceId={sale.id.toString()}
                                    entityName={`Sale ${sale.saleId}`}
                                  />
                                  <Badge variant={sale.isPaid ? "default" : "destructive"}>
                                    {sale.isPaid ? "Paid" : "Unpaid"}
                                  </Badge>
                                  <div className="text-right">
                                    <div className="font-semibold">£{parseFloat(sale.totalAmount).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditQuantities(sale)}
                                    disabled={editSaleQuantitiesMutation.isPending}
                                  >
                                    <i className="fas fa-edit mr-1"></i>
                                    Edit Qty
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    onClick={() => handleEditQuantities(sale)}
                                    title="Edit quantities to refund individual items"
                                  >
                                    <i className="fas fa-undo mr-1"></i>
                                    Refund Items
                                  </Button>
                                  {!sale.isPaid ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkAsPaid(sale.id)}
                                      disabled={markAsPaidMutation.isPending}
                                    >
                                      {markAsPaidMutation.isPending ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                      ) : (
                                        <>
                                          <i className="fas fa-check mr-1"></i>
                                          Mark Paid
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400"
                                      onClick={() => handleMarkAsUnpaid(sale.id)}
                                      disabled={markAsUnpaidMutation.isPending}
                                    >
                                      {markAsUnpaidMutation.isPending ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                      ) : (
                                        <>
                                          <i className="fas fa-times mr-1"></i>
                                          Unpaid
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Items List */}
                              <div className="mt-2 border-t pt-2">
                                <div className="text-sm font-medium text-foreground mb-1">Items:</div>
                                <div className="space-y-1">
                                  {sale.items.map((item: any, idx: number) => {
                                    const itemName = item.itemName || item.name || 'Unknown Item';
                                    const itemSku = item.itemSku || item.sku || 'N/A';
                                    const itemPrice = parseFloat(item.unitPrice || item.price || '0');
                                    const itemQuantity = parseFloat(item.quantity || '0');
                                    const itemTotal = itemQuantity * itemPrice;
                                    return (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                        <div className="flex-1 text-foreground">
                                          <div className="font-medium">{itemName}</div>
                                          <div className="text-xs text-muted-foreground">SKU: {itemSku}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-foreground">
                                            {itemQuantity} × £{itemPrice.toFixed(2)} = £{itemTotal.toFixed(2)}
                                          </span>
                                          {(item as any).itemId && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 h-6 px-2"
                                              onClick={() => handleRefundItem(sale.id, idx)}
                                            >
                                              <i className="fas fa-undo text-xs"></i>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </CardContent>
      </Card>

      {/* Edit Quantities Dialog */}
      <Dialog open={editingQuantities} onOpenChange={setEditingQuantities}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Sale Quantities</DialogTitle>
            <DialogDescription>
              Adjust item quantities for sale {selectedSaleForEdit?.saleId}. Stock will be updated accordingly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {selectedSaleForEdit?.items.map((item: any, index: number) => {
              const itemName = item.itemName || item.name || 'Unknown Item';
              const itemSku = item.itemSku || item.sku || 'N/A';
              const currentQty = parseFloat(item.quantity?.toString() || '0');
              const unitPrice = parseFloat(item.unitPrice || item.price || '0');

              return (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{itemName}</div>
                    <div className="text-sm text-muted-foreground">SKU: {itemSku} • £{unitPrice.toFixed(2)} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${index}`} className="text-sm whitespace-nowrap">
                      Quantity:
                    </Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min="0"
                      step="1"
                      value={editedQuantities[index] || currentQty}
                      onChange={(e) => {
                        const newQty = parseFloat(e.target.value) || 0;
                        setEditedQuantities(prev => ({ ...prev, [index]: newQty }));
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      (was: {currentQty})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingQuantities(false);
                setSelectedSaleForEdit(null);
                setEditedQuantities({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuantities}
              disabled={editSaleQuantitiesMutation.isPending}
            >
              {editSaleQuantitiesMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Charge Code Adjustment</DialogTitle>
            <DialogDescription>
              Create a refund (positive amount) or additional charge (negative amount) for a charge code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Charge Code Input */}
            <div className="space-y-2">
              <Label htmlFor="adj-chargecode">Charge Code</Label>
              <Input
                id="adj-chargecode"
                value={adjustmentChargeCode}
                onChange={(e) => setAdjustmentChargeCode(e.target.value)}
                placeholder="e.g., PYW1001"
              />
            </div>
            
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="adj-amount">Amount (£)</Label>
              <Input
                id="adj-amount"
                type="number"
                step="0.01"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Positive for refund, negative for charge"
              />
              <p className="text-sm text-muted-foreground">
                Positive amount = refund to charge code<br />
                Negative amount = additional charge
              </p>
              {parseFloat(adjustmentAmount) > 50 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Refund Reminder
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    For refunds remember to also adjust inventory as needed.
                  </p>
                </div>
              )}
            </div>
            
            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="adj-reason">Reason</Label>
              <Textarea
                id="adj-reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Reason for adjustment..."
                rows={3}
              />
            </div>
            
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(adjustmentDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={adjustmentDate}
                    onSelect={(date) => date && setAdjustmentDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdjustment}>
              Create Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Item Dialog */}
      <Dialog open={refundingItem !== null} onOpenChange={(open) => !open && setRefundingItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Refund Item</DialogTitle>
            <DialogDescription>
              Specify the quantity to refund. Stock will be returned to inventory.
            </DialogDescription>
          </DialogHeader>
          {refundingItem && selectedSaleForEdit && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <div className="font-medium text-foreground">
                  {selectedSaleForEdit.items[refundingItem.itemIndex]?.itemName || selectedSaleForEdit.items[refundingItem.itemIndex]?.name}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Current quantity: {parseFloat(selectedSaleForEdit.items[refundingItem.itemIndex]?.quantity?.toString() || '0')}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refund-qty">Quantity to Refund</Label>
                <Input
                  id="refund-qty"
                  type="number"
                  min="0"
                  step="1"
                  max={parseFloat(selectedSaleForEdit.items[refundingItem.itemIndex]?.quantity?.toString() || '0')}
                  value={refundQuantity}
                  onChange={(e) => setRefundQuantity(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-note">Refund Note (optional)</Label>
                <Textarea
                  id="refund-note"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Reason for refund..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundingItem(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRefund}
              disabled={refundItemMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {refundItemMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : (
                'Confirm Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
