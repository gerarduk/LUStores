import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Chargecode, User, Category, Supplier } from "@shared/schema";

interface SalesAnalyticsFilters {
  startDate: string;
  endDate: string;
  timePeriod: string;
  category: string;
  vendor: string;
  chargeCode: string;
  sku: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

// Custom tooltip style for dark mode support
const customTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
  padding: '8px 12px',
};

// Smart currency formatter for Y-axis that adapts to value range
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 10000) {
    return `£${(value / 1000).toFixed(0)}k`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  } else {
    return `£${value.toFixed(0)}`;
  }
};

export default function SalesAnalytics() {
  const { toast } = useToast();

  const [filters, setFilters] = useState<SalesAnalyticsFilters>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return {
      startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(tomorrow, 'yyyy-MM-dd'),
      timePeriod: 'last_30_days',
      category: 'all',
      vendor: 'all',
      chargeCode: 'all',
      sku: '',
    };
  });

  const [chargeCodeOpen, setChargeCodeOpen] = useState(false);
  const [chargeCodeSearch, setChargeCodeSearch] = useState('');
  const [debouncedChargeCodeSearch, setDebouncedChargeCodeSearch] = useState('');
  const [skuInput, setSkuInput] = useState('');

  // Create stable query key to prevent unnecessary refetches
  const analyticsQueryKey = useMemo(() => [
    'sales-analytics',
    filters.startDate,
    filters.endDate,
    filters.timePeriod,
    filters.category,
    filters.vendor,
    filters.chargeCode,
    filters.sku
  ], [filters]);

  // Fetch analytics data
  const { data: analyticsData, isLoading, isFetching, error } = useQuery({
    queryKey: analyticsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await apiRequest("GET", `/api/analytics?${params.toString()}`);
      return response.json();
    },
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
  const [vendorSearch, setVendorSearch] = useState("");
  const [debouncedVendorSearch, setDebouncedVendorSearch] = useState("");

  // Debounce vendor search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedVendorSearch(vendorSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [vendorSearch]);
  
  // Fetch charge codes for filter dropdown
  const { data: chargeCodes } = useQuery({
    queryKey: ['charge-codes'],
    queryFn: () => apiRequest("GET", '/api/chargecodes').then(res => res.json()),
  });

  // Debounce charge code search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedChargeCodeSearch(chargeCodeSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [chargeCodeSearch]);

  // Debounce SKU filter input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, sku: skuInput }));
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [skuInput]);

  const handleTimePeriodChange = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'this_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'last_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() - now.getDay());
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'this_quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'last_quarter': {
        const lastQuarterStart = Math.floor((now.getMonth() - 3) / 3) * 3;
        const lastQuarterEnd = lastQuarterStart + 3;
        startDate = new Date(now.getFullYear(), lastQuarterStart, 1);
        endDate = new Date(now.getFullYear(), lastQuarterEnd, 1);
        break;
      }
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        // Set endDate to tomorrow to include all of today
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        // Don't change dates for custom - just update timePeriod
        setFilters(prev => ({
          ...prev,
          timePeriod: period,
        }));
        return;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
    }

    setFilters(prev => ({
      ...prev,
      timePeriod: period,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }));
  };

  const clearFilters = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setSkuInput('');
    setFilters({
      startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(tomorrow, 'yyyy-MM-dd'),
      timePeriod: 'last_30_days',
      category: 'all',
      vendor: 'all',
      chargeCode: 'all',
      sku: '',
    });
  };

  // Prepare chart data
  const revenueByCategoryData = useMemo(() => {
    if (!analyticsData?.revenueByCategory) return [];
    return analyticsData.revenueByCategory.map((item, index) => ({
      name: item.category,
      value: item.revenue,
      percentage: item.percentage,
      fill: COLORS[index % COLORS.length],
    }));
  }, [analyticsData]);

  const salesTrendData = useMemo(() => {
    if (!analyticsData?.salesTrend) return [];
    return analyticsData.salesTrend.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      revenue: item.revenue,
      quantity: item.quantity,
      transactions: item.transactions,
    }));
  }, [analyticsData]);

  const topItemsData = useMemo(() => {
    if (!analyticsData?.topItems) return [];
    return analyticsData.topItems.slice(0, 10).map((item, index) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      fullName: item.name,
      value: item.revenue,
      quantity: item.quantity,
      fill: COLORS[index % COLORS.length],
    }));
  }, [analyticsData]);

  const topItemsByQuantityData = useMemo(() => {
    if (!analyticsData?.topItems) return [];
    const sortedByQuantity = [...analyticsData.topItems].sort((a, b) => b.quantity - a.quantity);
    return sortedByQuantity.slice(0, 10).map((item, index) => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      fullName: item.name,
      value: item.quantity,
      fill: COLORS[index % COLORS.length],
    }));
  }, [analyticsData]);

  // Memoized formatters to prevent infinite re-renders
  const currencyFormatter = useCallback((value: number | string) => `£${Number(value).toFixed(2)}`, []);
  const quantityFormatter = useCallback((value: number | string) => `${Number(value).toFixed(0)} units`, []);
  const pieLabelFormatter = useCallback((data: { name: string; payload: { percentage: number } }) => `${data.name}: ${data.payload.percentage}%`, []);
  
  // Create stable name maps for formatters
  const topItemsNameMap = useMemo(() => {
    const map = new Map();
    topItemsData.forEach((item: { name: string; fullName: string }) => {
      map.set(item.name, item.fullName);
    });
    return map;
  }, [topItemsData]);
  
  const topItemsByQuantityNameMap = useMemo(() => {
    const map = new Map();
    topItemsByQuantityData.forEach((item: { name: string; fullName: string }) => {
      map.set(item.name, item.fullName);
    });
    return map;
  }, [topItemsByQuantityData]);
  
  const topItemsLabelFormatter = useCallback((label: string) => {
    return topItemsNameMap.get(label) || label;
  }, [topItemsNameMap]);
  
  const topItemsByQuantityLabelFormatter = useCallback((label: string) => {
    return topItemsByQuantityNameMap.get(label) || label;
  }, [topItemsByQuantityNameMap]);

  // Memoized selected charge code data to prevent re-renders
  const selectedChargeCodeData = useMemo(() => {
    if (filters.chargeCode === 'all' || !chargeCodes) return null;
    const selectedCode = chargeCodes.find((code: Chargecode) => code.code === filters.chargeCode);
    return selectedCode?.authorizedUsers?.length ? selectedCode : null;
  }, [filters.chargeCode, chargeCodes]);

  // Memoized selected charge code display to prevent re-renders
  const selectedChargeCodeDisplay = useMemo(() => {
    if (!selectedChargeCodeData) return null;
    return (
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <div className="font-medium text-blue-900 mb-1">
          <i className="fas fa-users mr-1"></i>
          Authorized Users ({selectedChargeCodeData.authorizedUsers.length}):
        </div>
        <div className="flex flex-wrap gap-1">
          {selectedChargeCodeData.authorizedUsers.map((user: User, index: number) => (
            <span key={index} className="inline-block bg-white px-2 py-1 rounded border text-blue-800">
              {user.userName}
            </span>
          ))}
        </div>
      </div>
    );
  }, [selectedChargeCodeData]);

  // Fetch inventory stats for inventory analytics section
  const { data: inventoryStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiRequest("GET", '/api/dashboard/stats').then(res => res.json()),
  });

  const { data: categoryStats } = useQuery({
    queryKey: ['category-stats'],
    queryFn: () => apiRequest("GET", '/api/dashboard/category-stats').then(res => res.json()),
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => apiRequest("GET", '/api/items/low-stock').then(res => res.json()),
  });

  const { data: stockMovements } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => apiRequest("GET", '/api/stock-movements?limit=5').then(res => res.json()),
  });

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading analytics",
        description: "Failed to load sales analytics data. Please try again.",
        variant: "destructive",
      });
    }
  }, [error]); // Removed toast from dependencies since it should be stable

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Analytics</h1>
          <p className="text-muted-foreground mt-1">Visual insights into your sales performance</p>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
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
              <Label htmlFor="time-period">Time Period</Label>
              <Select value={filters.timePeriod} onValueChange={handleTimePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
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
                value={filters.startDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilters(prev => ({ ...prev, startDate: e.target.value, timePeriod: 'custom' }));
                  }
                }}
                disabled={filters.timePeriod !== 'custom'}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setFilters(prev => ({ ...prev, endDate: e.target.value, timePeriod: 'custom' }));
                  }
                }}
                disabled={filters.timePeriod !== 'custom'}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
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

            {/* Vendor Filter
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={filters.vendor} onValueChange={(value) => setFilters(prev => ({ ...prev, vendor: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={filters.vendor} onValueChange={(value) => setFilters(prev => ({ ...prev, vendor: value }))}>
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
            {/* Charge Code Filter */}
            <div className="space-y-2">
              <Label htmlFor="charge-code">Charge Code</Label>
              <Popover open={chargeCodeOpen} onOpenChange={setChargeCodeOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between"
                  >
                    {filters.chargeCode === 'all' ? 'All Charge Codes' : filters.chargeCode}
                    <i className="fas fa-chevron-down h-4 w-4 opacity-50" />
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
                        setFilters(prev => ({ ...prev, chargeCode: 'all' }));
                        setChargeCodeOpen(false);
                        setChargeCodeSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        filters.chargeCode === 'all' ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                    >
                      All Charge Codes
                    </button>
                    {chargeCodes
                      ?.filter((code: any) =>
                        debouncedChargeCodeSearch.length === 0 ||
                        code.code.toLowerCase().includes(debouncedChargeCodeSearch.toLowerCase())
                      )
                      .map((code: any) => (
                        <button
                          key={code.code}
                          onClick={() => {
                            setFilters(prev => ({ ...prev, chargeCode: code.code }));
                            setChargeCodeOpen(false);
                            setChargeCodeSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            code.code === filters.chargeCode ? 'bg-blue-100 dark:bg-blue-900' : ''
                          }`}
                        >
                          {code.code}
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
              {/* Show authorized users for selected charge code */}
              {selectedChargeCodeDisplay}
            </div>

            {/* SKU Filter */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Filter by SKU..."
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
              />
            </div>

            {/* Clear Filters */}
            <div className="space-y-2 flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active filter banner */}
      {(filters.sku || (filters.vendor && filters.vendor !== 'all') || (filters.category && filters.category !== 'all')) && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
          <Filter className="w-4 h-4 flex-shrink-0" />
          <span>
            Filtering analytics by:
            {filters.sku && <strong className="ml-1">SKU "{filters.sku}"</strong>}
            {filters.vendor && filters.vendor !== 'all' && <strong className="ml-1">Vendor</strong>}
            {filters.category && filters.category !== 'all' && <strong className="ml-1">Category</strong>}
            {analyticsData && <span className="ml-1">— {analyticsData.summary.totalTransactions} matching transaction{analyticsData.summary.totalTransactions !== 1 ? 's' : ''}</span>}
            {filters.vendor && filters.vendor !== 'all' && (
              <span className="ml-1 text-xs opacity-75">(vendor filter requires items to be linked via the Suppliers page)</span>
            )}
          </span>
          {isFetching && <i className="fas fa-spinner fa-spin ml-auto"></i>}
        </div>
      )}

      {/* Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{analyticsData.summary.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              <i className="fas fa-boxes h-4 w-4 text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.summary.totalQuantity.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <i className="fas fa-shopping-cart h-4 w-4 text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.summary.totalTransactions.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <i className="fas fa-calculator h-4 w-4 text-muted-foreground"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{analyticsData.summary.averageOrderValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {isLoading || (isFetching && !analyticsData) ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-university-blue"></div>
        </div>
      ) : analyticsData ? (
        <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={pieLabelFormatter}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueByCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={currencyFormatter}
                      contentStyle={customTooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No category data available</p>
              )}
            </CardContent>
          </Card>

          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip 
                      formatter={currencyFormatter}
                      contentStyle={customTooltipStyle}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No trend data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Items by Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Items by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {topItemsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topItemsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip
                      formatter={currencyFormatter}
                      labelFormatter={topItemsLabelFormatter}
                      contentStyle={customTooltipStyle}
                    />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No item data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Items by Quantity */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Items by Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              {topItemsByQuantityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topItemsByQuantityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={quantityFormatter}
                      labelFormatter={topItemsByQuantityLabelFormatter}
                      contentStyle={customTooltipStyle}
                    />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No item data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory Analytics Section */}
        {inventoryStats && (
          <>
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Inventory Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inventory Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-chart-pie mr-2 text-university-blue"></i>
                    Inventory Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Items</span>
                      <span className="font-semibold text-foreground">{inventoryStats.totalItems || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-semibold text-foreground">
                        £{inventoryStats.totalValue?.toLocaleString() || "0"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Low Stock Alerts</span>
                      <span className="font-semibold text-orange-600">{inventoryStats.lowStockItems || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Users</span>
                      <span className="font-semibold text-foreground">{inventoryStats.activeUsers || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-chart-bar mr-2 text-university-blue"></i>
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(categoryStats) && categoryStats.length > 0 ? categoryStats.map((category: any) => (
                      <div key={category.category.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center`}>
                            <i className={`${category.category.icon} text-blue-600 dark:text-blue-400 text-sm`}></i>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{category.category.name}</p>
                            <p className="text-xs text-muted-foreground">{category.itemCount} items</p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          £{category.totalValue.toLocaleString()}
                        </span>
                      </div>
                    )) : <p className="text-center text-muted-foreground py-4">No category data available</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-exclamation-triangle mr-2 text-orange-600"></i>
                    Low Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(lowStockItems) && lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">{item.currentStock}</p>
                          <p className="text-xs text-muted-foreground">Min: {item.minimumStock}</p>
                        </div>
                      </div>
                    )) : <p className="text-center text-muted-foreground py-4">No low stock alerts</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Stock Movements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-exchange-alt mr-2 text-university-blue"></i>
                    Recent Stock Movements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(stockMovements) && stockMovements.length > 0 ? stockMovements.slice(0, 5).map((movement: any) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{movement.item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)} •
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            movement.type === 'in' ? 'text-green-600' :
                            movement.type === 'out' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '='}{Math.abs(movement.quantity)}
                          </p>
                          <p className="text-xs text-muted-foreground">Stock: {movement.newStock}</p>
                        </div>
                      </div>
                    )) : <p className="text-center text-muted-foreground py-4">No recent movements</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <i className="fas fa-search text-3xl opacity-30 text-muted-foreground"></i>
            <p className="text-muted-foreground font-medium">No data for the selected filters</p>
            {(filters.sku || (filters.vendor && filters.vendor !== 'all') || (filters.category && filters.category !== 'all')) && (
              <div className="text-center text-sm text-muted-foreground max-w-sm">
                {filters.vendor && filters.vendor !== 'all' && (
                  <p>Vendor filter works by matching items linked to this vendor via the <strong>Suppliers</strong> page. If items haven't been linked, no results will appear.</p>
                )}
                {filters.sku && (
                  <p>SKU filter searches item snapshots recorded at time of sale. Try a partial SKU or check the SKU in Inventory.</p>
                )}
                <button onClick={clearFilters} className="mt-2 text-primary underline hover:no-underline text-xs">Clear all filters</button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}