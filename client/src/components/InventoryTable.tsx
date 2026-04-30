import { useState } from "react";
import { useQuery as useReactQuery, useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatStockDisplay } from "@/lib/stockHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Package, Trash2, EyeOff, Eye, Archive, Download, ChevronDown, MessageSquarePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCodeGenerator from "./QRCodeGenerator";
import NotesIndicator from "./NotesIndicator";
import EmptyState from "./shared/EmptyState";
import StatusBadge from "./shared/StatusBadge";
import type { ItemWithCategory, User, Category, Supplier } from "@shared/schema";

// Type for order history row
interface ItemOrderHistoryRow {
  orderId: number;
  orderDate: string;
  supplier: Supplier | null;
  quantity: number;
  unitCost: string;
  totalCost: string;
  vendorSku: string | null;
}

interface InventoryTableProps {
  items: ItemWithCategory[];
  allFilteredItems?: ItemWithCategory[];
  total: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onEditItem?: (item: ItemWithCategory) => void;
  showPagination?: boolean;
  title?: string;
  itemsPerPage?: number;
  showPricesIncVAT?: boolean;
}

interface VATRate {
  value: string;
  label: string;
}

export default function InventoryTable({
  items,
  allFilteredItems = [],
  total,
  currentPage = 1,
  onPageChange,
  onEditItem,
  showPagination = true,
  title = "Inventory Items",
  itemsPerPage = 10,
  showPricesIncVAT = true,
}: InventoryTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCodeItem, setQRCodeItem] = useState<ItemWithCategory | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showVatRateDialog, setShowVatRateDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [bulkNoteText, setBulkNoteText] = useState("");
  const [selectedVatRate, setSelectedVatRate] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [showOrderHistoryFor, setShowOrderHistoryFor] = useState<ItemWithCategory | null>(null);

  // Fetch order history for a given item (when modal is open)
  const { data: orderHistory, isLoading: orderHistoryLoading } = useReactQuery<ItemOrderHistoryRow[]>({
    queryKey: showOrderHistoryFor ? ["/api/items", showOrderHistoryFor.id, "order-history"] : [],
    queryFn: async () => {
      if (!showOrderHistoryFor) return [];
      const res = await apiRequest("GET", `/api/items/${showOrderHistoryFor.id}/order-history`);
      return await res.json();
    },
    enabled: !!showOrderHistoryFor,
  });

  const canEdit = (user as User)?.role === "admin" || (user as User)?.role === "manager" || (user as User)?.role === "superuser";
  const canViewLocation = (user as User)?.role === "admin" || (user as User)?.role === "superuser";

  // Fetch VAT rates
  const { data: vatRatesData } = useQuery<{ vatRates: VATRate[] }>({
    queryKey: ["/api/settings/vat-rates"],
  });

  // Fetch categories for bulk category change
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Handle select all on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map(item => item.id)));
      setSelectAllPages(false);
    } else {
      setSelectedItems(new Set());
      setSelectAllPages(false);
    }
  };

  // Handle select all across all pages
  const handleSelectAllPages = () => {
    const allIds = allFilteredItems.map(item => item.id);
    setSelectedItems(new Set(allIds));
    setSelectAllPages(true);
  };

  // Handle individual selection
  const handleSelectItem = (itemId: number, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
    setSelectAllPages(false);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectAllPages(false);
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await apiRequest("POST", "/api/items/bulk/delete", { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: `${selectedItems.size} item(s) deleted successfully`,
      });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete items",
        variant: "destructive",
      });
    },
  });

  // Bulk set inactive mutation
  const bulkSetInactiveMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await apiRequest("POST", "/api/items/bulk/set-inactive", { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: `${selectedItems.size} item(s) set to inactive`,
      });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set items inactive",
        variant: "destructive",
      });
    },
  });

  // Bulk set active mutation
  const bulkSetActiveMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await apiRequest("POST", "/api/items/bulk/set-active", { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: `${selectedItems.size} item(s) set to active`,
      });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set items active",
        variant: "destructive",
      });
    },
  });

  // Bulk set stock to 0 mutation
  const bulkSetStockZeroMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      await apiRequest("POST", "/api/items/bulk/set-stock-zero", { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: `Stock set to 0 for ${selectedItems.size} item(s)`,
      });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  // Export selected items
  const handleExportSelected = async () => {
    try {
      const response = await apiRequest("POST", "/api/items/bulk/export", {
        itemIds: Array.from(selectedItems),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Items exported successfully",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export items",
        variant: "destructive",
      });
    }
  };

  // Bulk add note mutation
  const bulkAddNoteMutation = useMutation({
    mutationFn: async ({ itemIds, noteText }: { itemIds: number[], noteText: string }) => {
      await apiRequest("POST", "/api/items/bulk/add-note", { itemIds, noteText });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Note added to ${selectedItems.size} item(s)`,
      });
      clearSelection();
      setShowNoteDialog(false);
      setBulkNoteText("");
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add notes",
        variant: "destructive",
      });
    },
  });

  // Bulk change VAT rate mutation
  const bulkChangeVatRateMutation = useMutation({
    mutationFn: async ({ itemIds, vatRate }: { itemIds: number[], vatRate: string }) => {
      await apiRequest("POST", "/api/items/bulk/change-vat-rate", { itemIds, vatRate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: `VAT rate updated for ${selectedItems.size} item(s)`,
      });
      clearSelection();
      setShowVatRateDialog(false);
      setSelectedVatRate("");
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update VAT rate",
        variant: "destructive",
      });
    },
  });

  // Bulk change category mutation
  const bulkChangeCategoryMutation = useMutation({
    mutationFn: async ({ itemIds, categoryId }: { itemIds: number[], categoryId: string }) => {
      await apiRequest("POST", "/api/items/bulk/change-category", { itemIds, categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Success",
        description: `Category updated for ${selectedItems.size} item(s)`,
      });
      clearSelection();
      setShowCategoryDialog(false);
      setSelectedCategoryId("");
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (item: ItemWithCategory) => {
    if (!item.isActive) {
      return <StatusBadge status="neutral" label="Inactive" />;
    }
    if (parseFloat(item.currentStock.toString()) <= parseFloat(item.minimumStock.toString())) {
      return <StatusBadge status="warning" label="Low Stock" />;
    }
    return <StatusBadge status="success" label="In Stock" />;
  };

  const getCategoryColor = (category: Category) => {
    const colorMap: Record<string, string> = {
      blue: "category-blue",
      green: "category-green",
      orange: "category-orange",
      purple: "category-purple",
      brown: "category-brown",
    };
    return colorMap[category.color] || "bg-gray-100 text-gray-600";
  };

  const handleDelete = (item: ItemWithCategory) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item",
        variant: "destructive",
      });
      return;
    }

    const itemIds = Array.from(selectedItems);

    switch (action) {
      case "delete":
        setShowDeleteDialog(true);
        break;
      case "set-inactive":
        bulkSetInactiveMutation.mutate(itemIds);
        break;
      case "set-active":
        bulkSetActiveMutation.mutate(itemIds);
        break;
      case "set-stock-zero":
        bulkSetStockZeroMutation.mutate(itemIds);
        break;
      case "add-note":
        setShowNoteDialog(true);
        break;
      case "change-vat-rate":
        setShowVatRateDialog(true);
        break;
      case "change-category":
        setShowCategoryDialog(true);
        break;
      case "export":
        handleExportSelected();
        break;
    }
  };

  const handleBulkNoteSubmit = () => {
    if (!bulkNoteText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note",
        variant: "destructive",
      });
      return;
    }

    const itemIds = Array.from(selectedItems);
    bulkAddNoteMutation.mutate({ itemIds, noteText: bulkNoteText.trim() });
  };

  const handleBulkVatRateSubmit = () => {
    if (!selectedVatRate) {
      toast({
        title: "Error",
        description: "Please select a VAT rate",
        variant: "destructive",
      });
      return;
    }

    const itemIds = Array.from(selectedItems);
    bulkChangeVatRateMutation.mutate({ itemIds, vatRate: selectedVatRate });
  };

  const handleBulkCategorySubmit = () => {
    if (!selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const itemIds = Array.from(selectedItems);
    bulkChangeCategoryMutation.mutate({ itemIds, categoryId: selectedCategoryId });
  };

  const confirmBulkDelete = () => {
    const itemIds = Array.from(selectedItems);
    bulkDeleteMutation.mutate(itemIds);
    setShowDeleteDialog(false);
  };

  const totalPages = Math.ceil(total / itemsPerPage);
  const allSelected = items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;
  const allPageSelected = allSelected && items.length > 0 && total > items.length && !selectAllPages;

  return (
    <>
      <Card className="bg-card rounded-xl shadow-sm border border-border">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>

            {/* Bulk Actions Menu */}
            {canEdit && selectedItems.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-medium-gray">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleBulkAction("set-active")}>
                      <Eye className="mr-2 h-4 w-4" />
                      Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("set-inactive")}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Set Inactive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction("set-stock-zero")}>
                      <Archive className="mr-2 h-4 w-4" />
                      Set Stock to 0
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction("change-vat-rate")}>
                      <i className="fas fa-percent mr-2 h-4 w-4" />
                      Change VAT Rate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("change-category")}>
                      <i className="fas fa-folder mr-2 h-4 w-4" />
                      Change Category
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("add-note")}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Add Note to Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("delete")}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Select All Pages Banner */}
        {allPageSelected && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              All {items.length} items on this page are selected.
              {" "}
              <button
                onClick={handleSelectAllPages}
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                Select all {total} items
              </button>
            </p>
          </div>
        )}

        {selectAllPages && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              All {total} items are selected.
            </p>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {canEdit && (
                    <th className="px-6 py-3 text-left">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all items"
                        className={someSelected ? "data-[state=checked]:bg-gray-400" : ""}
                      />
                    </th>
                  )}
                  <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                    Item
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                    Stock
                  </th>
                  {canViewLocation && (
                    <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                      Location
                    </th>
                  )}
                  <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                    Price & VAT
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-medium-gray uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-accent transition-colors ${!item.isActive ? 'opacity-60' : ''}`}
                  >
                    {canEdit && (
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <i className={`${item.category.icon} text-medium-gray`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-charcoal">{item.name}</p>
                          <p className="text-xs text-medium-gray">SKU: {item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${
                        parseFloat(item.currentStock.toString()) <= parseFloat(item.minimumStock.toString())
                          ? "text-warning font-medium"
                          : "text-charcoal"
                      }`}>
                        {formatStockDisplay(item.currentStock)} {item.unit || 'pieces'}
                      </span>
                    </td>
                    {canViewLocation && (
                      <td className="px-6 py-4">
                        {item.location ? (
                          <div className="flex items-center text-sm text-charcoal">
                            <i className="fas fa-map-marker-alt mr-2 text-medium-gray"></i>
                            {item.location}
                          </div>
                        ) : (
                          <span className="text-xs text-medium-gray italic">No location set</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm font-medium text-charcoal">
                          {showPricesIncVAT 
                            ? `£${parseFloat(item.price).toFixed(2)}`
                            : `£${(parseFloat(item.price) / (1 + parseFloat(item.vatRate ?? '0.20'))).toFixed(2)}`
                          }
                        </span>
                        <div className="text-xs text-medium-gray mt-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.vatIncluded
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            }`}>
                              {showPricesIncVAT ? 'Inc. VAT' : 'Ex. VAT'}
                            </span>
                            <span className="text-medium-gray">
                              {(parseFloat(item.vatRate ?? '0.20') * 100).toFixed(1)}%
                            </span>
                          </div>
                          {showPricesIncVAT && item.vatIncluded && (
                            <div className="text-xs text-medium-gray mt-1">
                              Ex VAT: £{(parseFloat(item.price) / (1 + parseFloat(item.vatRate ?? '0.20'))).toFixed(2)}
                            </div>
                          )}
                          {!showPricesIncVAT && item.vatIncluded && (
                            <div className="text-xs text-medium-gray mt-1">
                              Inc VAT: £{parseFloat(item.price).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQRCodeItem(item)}
                        className="text-university-blue hover:text-university-dark border-university-blue hover:bg-university-blue hover:text-white"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </td>
                    <td className="px-6 py-4">
                      <NotesIndicator
                        referenceType="item"
                        referenceId={item.id.toString()}
                        entityName={item.name}
                      />
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => setShowOrderHistoryFor(item)}
                                                      className="text-university-blue hover:text-university-dark"
                                                    >
                                                      <i className="fas fa-history"></i> See Past Orders
                                                    </Button>
                                {/* See Past Orders Modal */}
                                <Dialog open={!!showOrderHistoryFor} onOpenChange={open => { if (!open) setShowOrderHistoryFor(null); }}>
                                  <DialogContent className="sm:max-w-[700px]">
                                    <DialogHeader>
                                      <DialogTitle>Past Orders for {showOrderHistoryFor?.name}</DialogTitle>
                                      <DialogDescription>
                                        This shows all previous orders and suppliers for this item.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-2">
                                      {orderHistoryLoading ? (
                                        <div>Loading...</div>
                                      ) : orderHistory && orderHistory.length > 0 ? (
                                        <table className="min-w-full text-sm border">
                                          <thead>
                                            <tr>
                                              <th className="px-2 py-1 border">Order ID</th>
                                              <th className="px-2 py-1 border">Date</th>
                                              <th className="px-2 py-1 border">Supplier</th>
                                              <th className="px-2 py-1 border">Vendor Ref</th>
                                              <th className="px-2 py-1 border">Quantity</th>
                                              <th className="px-2 py-1 border">Unit Cost</th>
                                              <th className="px-2 py-1 border">Total Cost</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {orderHistory.map((row) => (
                                              <tr key={row.orderId + row.orderDate}>
                                                <td className="px-2 py-1 border">{row.orderId}</td>
                                                <td className="px-2 py-1 border">{new Date(row.orderDate).toLocaleDateString()}</td>
                                                <td className="px-2 py-1 border">{row.supplier?.name || <span className="italic text-gray-400">Unknown</span>}</td>
                                                <td className="px-2 py-1 border">{row.vendorSku || <span className="italic text-gray-400">-</span>}</td>
                                                <td className="px-2 py-1 border">{row.quantity}</td>
                                                <td className="px-2 py-1 border">£{parseFloat(row.unitCost).toFixed(2)}</td>
                                                <td className="px-2 py-1 border">£{parseFloat(row.totalCost).toFixed(2)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <div className="text-gray-500 italic">No past orders found for this item.</div>
                                      )}
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setShowOrderHistoryFor(null)}>Close</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditItem?.(item)}
                            className="text-university-blue hover:text-university-dark"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-error hover:text-red-700"
                            disabled={deleteItemMutation.isPending}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {showPagination && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-medium-gray">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, total)}</span> of{" "}
                  <span className="font-medium">{total}</span> results
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange?.(pageNum)}
                        className={currentPage === pageNum ? "bg-university-blue hover:bg-university-dark" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-sm text-medium-gray">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange?.(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="No inventory items found"
              description="Try adjusting your search or add new items to get started."
            />
          )}
        </CardContent>

        {/* QR Code Generator Modal */}
        <QRCodeGenerator
          sku={qrCodeItem?.sku || ""}
          itemName={qrCodeItem?.name || ""}
          isOpen={!!qrCodeItem}
          onClose={() => setQRCodeItem(null)}
        />
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add Note to {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              This note will be added to all {selectedItems.size} selected items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-note">Note</Label>
              <Textarea
                id="bulk-note"
                placeholder="Enter your note here..."
                value={bulkNoteText}
                onChange={(e) => setBulkNoteText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                setBulkNoteText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkNoteSubmit}
              disabled={bulkAddNoteMutation.isPending || !bulkNoteText.trim()}
            >
              {bulkAddNoteMutation.isPending ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Change VAT Rate Dialog */}
      <Dialog open={showVatRateDialog} onOpenChange={setShowVatRateDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Change VAT Rate for {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              This will update the VAT rate for all {selectedItems.size} selected items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vat-rate-select">VAT Rate</Label>
              <Select value={selectedVatRate} onValueChange={setSelectedVatRate}>
                <SelectTrigger id="vat-rate-select">
                  <SelectValue placeholder="Select a VAT rate" />
                </SelectTrigger>
                <SelectContent>
                  {vatRatesData?.vatRates?.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value}>
                      {rate.label} ({(parseFloat(rate.value) * 100).toFixed(1)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVatRateDialog(false);
                setSelectedVatRate("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkVatRateSubmit}
              disabled={bulkChangeVatRateMutation.isPending || !selectedVatRate}
            >
              {bulkChangeVatRateMutation.isPending ? "Updating..." : "Update VAT Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Change Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Change Category for {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              This will update the category for all {selectedItems.size} selected items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-select">Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCategoryDialog(false);
                setSelectedCategoryId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCategorySubmit}
              disabled={bulkChangeCategoryMutation.isPending || !selectedCategoryId}
            >
              {bulkChangeCategoryMutation.isPending ? "Updating..." : "Change Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
