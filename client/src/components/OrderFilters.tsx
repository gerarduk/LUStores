/**
 * Order Filters Component
 *
 * Provides filtering UI for Orders page:
 * - Status filter (pending, ordered, received, cancelled)
 * - Date range filter
 * - Supplier filter
 * - Search by order ID or reference
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, X, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Supplier } from '@shared/schema';

export interface OrderFiltersState {
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
  onReset: () => void;
}

export function OrderFilters({ filters, onChange, onReset }: OrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch suppliers for dropdown
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers-for-filter'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/suppliers');
      return response.json();
    },
  });

  const handleFilterChange = (key: keyof OrderFiltersState, value: string | undefined) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) =>
                    handleFilterChange('status', value || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select
                  value={filters.supplierId || ''}
                  onValueChange={(value) =>
                    handleFilterChange('supplierId', value || undefined)
                  }
                  disabled={loadingSuppliers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSuppliers ? 'Loading...' : 'All suppliers'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All suppliers</SelectItem>
                    {suppliers?.map((supplier: Supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) =>
                      handleFilterChange('startDate', e.target.value || undefined)
                    }
                    className="pr-8"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) =>
                      handleFilterChange('endDate', e.target.value || undefined)
                    }
                    className="pr-8"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Search */}
              <div className="space-y-2 md:col-span-2">
                <Label>Search</Label>
                <Input
                  type="text"
                  placeholder="Search by order ID or reference number..."
                  value={filters.searchTerm || ''}
                  onChange={(e) =>
                    handleFilterChange('searchTerm', e.target.value || undefined)
                  }
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Active filters:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.status && (
                    <FilterChip
                      label={`Status: ${filters.status}`}
                      onRemove={() => handleFilterChange('status', undefined)}
                    />
                  )}
                  {filters.supplierId && (
                    <FilterChip
                      label={`Supplier: ${
                        suppliers?.find((s: Supplier) => s.id === filters.supplierId)
                          ?.name || 'Selected'
                      }`}
                      onRemove={() => handleFilterChange('supplierId', undefined)}
                    />
                  )}
                  {filters.startDate && (
                    <FilterChip
                      label={`From: ${new Date(filters.startDate).toLocaleDateString()}`}
                      onRemove={() => handleFilterChange('startDate', undefined)}
                    />
                  )}
                  {filters.endDate && (
                    <FilterChip
                      label={`To: ${new Date(filters.endDate).toLocaleDateString()}`}
                      onRemove={() => handleFilterChange('endDate', undefined)}
                    />
                  )}
                  {filters.searchTerm && (
                    <FilterChip
                      label={`Search: ${filters.searchTerm}`}
                      onRemove={() => handleFilterChange('searchTerm', undefined)}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-full">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full p-0.5"
        aria-label="Remove filter"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
