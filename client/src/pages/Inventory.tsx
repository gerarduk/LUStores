import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import InventoryTable from "@/components/InventoryTable";
import ItemModal from "@/components/ItemModal";
import SearchInput from "@/components/shared/SearchInput";
import QuickFilters, { type FilterPreset } from "@/components/QuickFilters";
import type { ItemWithCategory, Category } from "@shared/schema";

interface ItemsData {
  items: ItemWithCategory[];
  total: number;
}

interface ImportItem {
  name: string;
  sku: string;
  categoryName: string;
  price: string;
  currentStock: string;
  description?: string;
  cost?: string;
  minStock?: string;
}

interface BulkImportResult {
  successful: number;
  failed: number;
}

interface VATRate {
  value: string;
  label: string;
}

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"name" | "sku">("name");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [vatRateFilter, setVatRateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showPricesIncVAT, setShowPricesIncVAT] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // QuickFilters presets
  const filterPresets: FilterPreset[] = [
    { id: 'in-stock', label: 'In Stock', icon: 'check-circle' },
    { id: 'low-stock', label: 'Low Stock', icon: 'exclamation-triangle' },
    { id: 'out-of-stock', label: 'Out of Stock', icon: 'times-circle' },
    { id: 'inactive', label: 'Inactive', icon: 'ban' },
    { id: 'price-under-10', label: 'Under £10', icon: 'pound-sign' },
    { id: 'price-10-50', label: '£10-£50', icon: 'pound-sign' },
    { id: 'price-over-50', label: 'Over £50', icon: 'pound-sign' },
  ];

  const handleQuickFilterChange = (filterIds: string[]) => {
    setActiveFilters(filterIds);
    setPage(1);
  };

  // Debounce search term to avoid triggering API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to page 1 when search changes
    }, 400); // 400ms delay - good balance between responsiveness and reducing API calls

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, stockFilter, vatRateFilter, sortBy]);

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch VAT rates
  const { data: vatRatesData } = useQuery<{ vatRates: VATRate[] }>({
    queryKey: ["/api/settings/vat-rates"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings/vat-rates');
      return await response.json();
    },
  });

  // Fetch all items with search and category filtering (no pagination on server)
  const { data: itemsData, isLoading, refetch } = useQuery<ItemsData>({
    queryKey: ["/api/items", { search: debouncedSearchTerm, category: selectedCategory !== "all" ? selectedCategory : undefined, searchMode }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Fetch all items for client-side pagination
      });
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
        params.append('searchMode', searchMode);
      }
      if (selectedCategory !== "all") params.append('category', selectedCategory);

      const response = await apiRequest('GET', `/api/items?${params.toString()}`);
      return await response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    // Keep previous data while fetching new results to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });

  // Client-side filtering for stock status, VAT rate, and quick filters
  const filteredItems = (itemsData?.items || [])
    .filter((item) => {
      // Quick filters (highest priority)
      if (activeFilters.length > 0) {
        const stockFilters = activeFilters.filter(f => ['in-stock', 'low-stock', 'out-of-stock', 'inactive'].includes(f));
        const priceFilters = activeFilters.filter(f => ['price-under-10', 'price-10-50', 'price-over-50'].includes(f));
        
        // Check stock filters
        if (stockFilters.length > 0) {
          const stockMatch = stockFilters.some(filter => {
            switch (filter) {
              case 'in-stock':
                return Number(item.currentStock) > 0 && item.isActive;
              case 'low-stock':
                return Number(item.currentStock) > 0 && 
                       Number(item.currentStock) <= Number(item.minimumStock) && 
                       item.isActive;
              case 'out-of-stock':
                return Number(item.currentStock) === 0 && item.isActive;
              case 'inactive':
                return !item.isActive;
              default:
                return true;
            }
          });
          if (!stockMatch) return false;
        }
        
        // Check price filters
        if (priceFilters.length > 0) {
          const price = parseFloat(item.price);
          const priceMatch = priceFilters.some(filter => {
            switch (filter) {
              case 'price-under-10':
                return price < 10;
              case 'price-10-50':
                return price >= 10 && price <= 50;
              case 'price-over-50':
                return price > 50;
              default:
                return true;
            }
          });
          if (!priceMatch) return false;
        }
      }

      // Stock status filter (client-side) - only applies if no quick filters active
      if (stockFilter !== "all" && activeFilters.length === 0) {
        switch (stockFilter) {
          case "in-stock":
            if (Number(item.currentStock) <= 0 || !item.isActive) return false;
            break;
          case "low-stock":
            if (Number(item.currentStock) > Number(item.minimumStock) || Number(item.currentStock) <= 0 || !item.isActive) return false;
            break;
          case "out-of-stock":
            if (Number(item.currentStock) > 0 || !item.isActive) return false;
            break;
          case "inactive":
            if (item.isActive) return false;
            break;
        }
      }

      // VAT rate filter (client-side)
      if (vatRateFilter !== "all") {
        const itemVatRate = item.vatRate ?? '0.20';
        if (itemVatRate !== vatRateFilter) {
          return false;
        }
      }

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
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-desc":
          return parseFloat(b.price) - parseFloat(a.price);
        case "stock-asc":
          return Number(a.currentStock) - Number(b.currentStock);
        case "stock-desc":
          return Number(b.currentStock) - Number(a.currentStock);
        case "sku-asc":
          return a.sku.localeCompare(b.sku);
        case "sku-desc":
          return b.sku.localeCompare(a.sku);
        default:
          return 0;
      }
    });

  // Pagination for filtered items
  const itemsPerPage = 20;
  const paginatedItems = filteredItems.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const bulkImportMutation = useMutation({
    mutationFn: async (items: ImportItem[]) => {
      const response = await apiRequest("POST", "/api/items/bulk-import", { items });
      return await response.json() as BulkImportResult;
    },
    onSuccess: (result: BulkImportResult) => {
      toast({
        title: "Bulk Import Successful",
        description: `Successfully imported ${result.successful} items. ${result.failed} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsBulkImportOpen(false);
      setCsvFile(null);
      setImportPreview([]);
      setImportErrors([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import items",
        variant: "destructive",
      });
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page reset handled by useEffect
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: ItemWithCategory) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    refetch();
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const expectedHeaders = ['name', 'sku', 'description', 'categoryName', 'price', 'currentStock', 'minimumStock'];
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setImportErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
        return;
      }

      const items: ImportItem[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const item: Record<string, string> = {};

        headers.forEach((header, index) => {
          item[header] = values[index] || '';
        });

        // Validate required fields
        if (!item.name || !item.sku || !item.categoryName || !item.price || !item.currentStock) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Find category by name
        const category = categoriesData?.find((cat: Category) => 
          cat.name.toLowerCase() === item.categoryName.toLowerCase()
        );
        
        if (!category) {
          errors.push(`Row ${i + 1}: Category "${item.categoryName}" not found`);
          continue;
        }

        // Parse numeric values
        const price = parseFloat(item.price);
        const currentStock = parseInt(item.currentStock);
        const minimumStock = parseInt(item.minimumStock) || 0;

        if (isNaN(price) || isNaN(currentStock)) {
          errors.push(`Row ${i + 1}: Invalid price or stock values`);
          continue;
        }

        items.push({
          name: item.name,
          sku: item.sku,
          description: item.description || '',
          categoryName: item.categoryName,
          price: price.toString(),
          currentStock: currentStock.toString(),
          minStock: minimumStock.toString(),
        });
      }

      setImportPreview(items);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleBulkImport = () => {
    if (importPreview.length === 0) {
      toast({
        title: "No Data",
        description: "No valid items to import",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate(importPreview);
  };

  const downloadCsvTemplate = () => {
    // Use real category names from the database for the template
    const realCategories = categoriesData || [];
    let csvContent = 'name,sku,description,categoryName,price,currentStock,minimumStock\n';
    
    // In development mode, add example rows with real category names
    if (process.env.NODE_ENV === 'development' && realCategories.length > 0) {
      const firstCategory = realCategories[0]?.name || 'General';
      const secondCategory = realCategories[1]?.name || firstCategory;
      
      csvContent += `Example Item 1,TEMPLATE-001,Sample item description,${firstCategory},0.00,0,0\n`;
      csvContent += `Example Item 2,TEMPLATE-002,Another sample item,${secondCategory},0.00,0,0\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-gray-200 rounded flex-1"></div>
            <div className="h-10 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="bg-card rounded-xl h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">Inventory Management</h1>
        <div className="flex gap-3">
          <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-university-blue text-university-blue hover:bg-university-blue hover:text-white">
                <i className="fas fa-upload mr-2"></i>
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import from CSV</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-medium-gray">
                    Upload a CSV file to import multiple inventory items at once
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadCsvTemplate}
                    className="text-xs"
                  >
                    <i className="fas fa-download mr-1"></i>
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-muted">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2"
                  >
                    <i className="fas fa-file-csv mr-2"></i>
                    Select CSV File
                  </Button>
                  <p className="text-sm text-medium-gray">
                    {csvFile ? `Selected: ${csvFile.name}` : 'No file selected'}
                  </p>
                </div>

                {importErrors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-600 text-sm">Import Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {importErrors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">• {error}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {importPreview.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Preview ({importPreview.length} items)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto">
                        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground border-b border-border pb-2 mb-2">
                          <span>Name</span>
                          <span>SKU</span>
                          <span>Category</span>
                          <span>Price</span>
                          <span>Stock</span>
                          <span>Min Stock</span>
                          <span>Status</span>
                        </div>
                        {importPreview.slice(0, 10).map((item, index) => (
                          <div key={index} className="grid grid-cols-7 gap-2 text-xs py-1 border-b border-border">
                            <span className="truncate">{item.name}</span>
                            <span>{item.sku}</span>
                            <span>{item.categoryName}</span>
                            <span>£{parseFloat(item.price).toFixed(2)}</span>
                            <span>{item.currentStock}</span>
                            <span>{item.minStock}</span>
                            <Badge variant="outline" className="text-xs">Ready</Badge>
                          </div>
                        ))}
                        {importPreview.length > 10 && (
                          <p className="text-xs text-medium-gray mt-2">
                            ... and {importPreview.length - 10} more items
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBulkImportOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkImport}
                    disabled={importPreview.length === 0 || bulkImportMutation.isPending}
                    className="bg-university-blue hover:bg-university-dark"
                  >
                    {bulkImportMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Importing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>
                        Import {importPreview.length} Items
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleAddItem} className="bg-university-blue hover:bg-university-dark">
            <i className="fas fa-plus mr-2"></i>
            Add Item
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-2 flex-1 max-w-md">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={`Search by ${searchMode === "name" ? "name" : "SKU"}...`}
            className="w-full"
          />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="searchMode"
                value="name"
                checked={searchMode === "name"}
                onChange={() => setSearchMode("name")}
                className="cursor-pointer"
              />
              <span className="text-medium-gray">Search by Name</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="searchMode"
                value="sku"
                checked={searchMode === "sku"}
                onChange={() => setSearchMode("sku")}
                className="cursor-pointer"
              />
              <span className="text-medium-gray">Search by SKU</span>
            </label>
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesData?.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vatRateFilter} onValueChange={setVatRateFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="VAT Rate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All VAT Rates</SelectItem>
            {vatRatesData?.vatRates?.map((rate) => (
              <SelectItem key={rate.value} value={rate.value}>
                {rate.label} ({(parseFloat(rate.value) * 100).toFixed(1)}%)
              </SelectItem>
            ))}
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
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="vat-toggle"
            checked={showPricesIncVAT}
            onCheckedChange={setShowPricesIncVAT}
          />
          <Label htmlFor="vat-toggle" className="text-sm text-medium-gray cursor-pointer whitespace-nowrap">
            {showPricesIncVAT ? "Inc. VAT" : "Ex. VAT"}
          </Label>
        </div>
      </div>

      <QuickFilters
        presets={filterPresets}
        activeFilters={activeFilters}
        onChange={handleQuickFilterChange}
        className="mb-6"
      />

      <InventoryTable
        items={paginatedItems}
        allFilteredItems={filteredItems}
        total={filteredItems.length}
        currentPage={page}
        onPageChange={setPage}
        onEditItem={handleEditItem}
        showPagination={true}
        itemsPerPage={itemsPerPage}
        title={`Inventory Items ${searchTerm ? `(${filteredItems.length} results)` : ''}`}
        showPricesIncVAT={showPricesIncVAT}
      />

      <ItemModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={editingItem}
        categories={categoriesData || []}
      />
    </div>
  );
}
