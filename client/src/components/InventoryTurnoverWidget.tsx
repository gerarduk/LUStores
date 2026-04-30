/**
 * Inventory Turnover Dashboard Widget
 *
 * Displays:
 * - Overall turnover rate
 * - Fast movers vs slow movers count
 * - Top performers table
 * - Items needing attention
 * - Turnover trend chart
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Package, BarChart3 } from 'lucide-react';
import { TableSkeleton } from './LoadingSkeleton';

interface TurnoverSummary {
  overallTurnoverRate: number;
  totalRevenue: number;
  fastMovers: number;
  slowMovers: number;
  deadStock: number;
  topPerformers: TurnoverMetric[];
  worstPerformers: TurnoverMetric[];
}

interface TurnoverMetric {
  itemId: string;
  sku: string;
  name: string;
  category?: string;
  turnoverRate: number;
  daysToSell: number;
  averageStock: number;
  totalSold: number;
  revenueGenerated: number;
  classification: 'fast' | 'medium' | 'slow' | 'dead';
}

interface ItemsNeedingAttention {
  overstock: TurnoverMetric[];
  slowMovers: TurnoverMetric[];
  deadStock: TurnoverMetric[];
}

export function InventoryTurnoverWidget() {
  const [dateRange, setDateRange] = useState('30'); // days

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  // Fetch turnover summary
  const { data: summary, isLoading: loadingSummary } = useQuery<TurnoverSummary>({
    queryKey: ['inventory-turnover-summary', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/analytics/inventory-turnover/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return response.json();
    },
  });

  // Fetch items needing attention
  const { data: attention, isLoading: loadingAttention } = useQuery<ItemsNeedingAttention>({
    queryKey: ['inventory-attention', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/analytics/inventory-turnover/attention?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Turnover Analysis</h2>
          <p className="text-gray-600 text-sm mt-1">
            Track stock efficiency and identify optimization opportunities
          </p>
        </div>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Overall Turnover"
            value={`${summary?.overallTurnoverRate.toFixed(2)}x`}
            description="Times per year"
            icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
            trend={summary?.overallTurnoverRate > 4 ? 'good' : 'warning'}
          />

          <MetricCard
            title="Fast Movers"
            value={summary?.fastMovers || 0}
            description="High turnover items"
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            trend="good"
          />

          <MetricCard
            title="Slow Movers"
            value={summary?.slowMovers || 0}
            description="Low turnover items"
            icon={<TrendingDown className="h-4 w-4 text-yellow-600" />}
            trend="warning"
          />

          <MetricCard
            title="Dead Stock"
            value={summary?.deadStock || 0}
            description="No sales in period"
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            trend="bad"
          />
        </div>
      )}

      {/* Tabs for Different Views */}
      <Tabs defaultValue="top" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top">Top Performers</TabsTrigger>
          <TabsTrigger value="attention">Needs Attention</TabsTrigger>
          <TabsTrigger value="slow">Slow Movers</TabsTrigger>
        </TabsList>

        {/* Top Performers */}
        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Performing Items</CardTitle>
              <CardDescription>
                Highest turnover rates - these items sell quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <TurnoverTable items={summary?.topPerformers || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Needing Attention */}
        <TabsContent value="attention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Overstocked Items
              </CardTitle>
              <CardDescription>
                High inventory with low turnover - consider promotions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAttention ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <TurnoverTable items={attention?.overstock || []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-red-600" />
                Dead Stock
              </CardTitle>
              <CardDescription>
                No sales in selected period - consider clearance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAttention ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <TurnoverTable items={attention?.deadStock || []} showZeroSales />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slow Movers */}
        <TabsContent value="slow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Moving Inventory</CardTitle>
              <CardDescription>
                Items with low turnover rates - may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <TableSkeleton rows={10} columns={6} />
              ) : (
                <TurnoverTable items={summary?.worstPerformers || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  trend: 'good' | 'warning' | 'bad';
}) {
  const trendColors = {
    good: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    bad: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  return (
    <Card className={trendColors[trend]}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function TurnoverTable({
  items,
  showZeroSales = false,
}: {
  items: TurnoverMetric[];
  showZeroSales?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No items found in this category
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead className="text-right">Turnover Rate</TableHead>
            <TableHead className="text-right">Days to Sell</TableHead>
            <TableHead className="text-right">Avg Stock</TableHead>
            <TableHead className="text-right">Total Sold</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.itemId} className="hover:bg-gray-50">
              <TableCell className="font-medium">{item.sku}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.name}</div>
                  {item.category && (
                    <div className="text-xs text-gray-500">{item.category}</div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {item.turnoverRate.toFixed(2)}x
              </TableCell>
              <TableCell className="text-right">
                {item.daysToSell === 9999 ? (
                  <span className="text-gray-400">N/A</span>
                ) : (
                  `${item.daysToSell} days`
                )}
              </TableCell>
              <TableCell className="text-right">{item.averageStock}</TableCell>
              <TableCell className="text-right">
                {showZeroSales && item.totalSold === 0 ? (
                  <span className="text-red-600 font-medium">0</span>
                ) : (
                  item.totalSold
                )}
              </TableCell>
              <TableCell className="text-right">
                £{item.revenueGenerated.toFixed(2)}
              </TableCell>
              <TableCell>
                <ClassificationBadge classification={item.classification} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClassificationBadge({
  classification,
}: {
  classification: 'fast' | 'medium' | 'slow' | 'dead';
}) {
  const variants = {
    fast: { label: 'Fast', className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' },
    medium: { label: 'Medium', className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' },
    slow: { label: 'Slow', className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' },
    dead: { label: 'Dead', className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' },
  };

  const variant = variants[classification];

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${variant.className}`}
    >
      {variant.label}
    </span>
  );
}
