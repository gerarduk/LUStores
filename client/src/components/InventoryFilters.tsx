/**
 * Inventory Filters Component
 *
 * Provides filtering UI for Inventory page:
 * - Category filter
 * - Stock status filter (All, In Stock, Low Stock, Out of Stock, Inactive)
 * - VAT rate filter
 * - Price range filter
 * - Active/Inactive toggle
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { X, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface InventoryFiltersState {
  categoryId?: number;
  stockStatus?: string;
  vatRate?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}

interface InventoryFiltersProps {
  filters: InventoryFiltersState;
  onChange: (filters: InventoryFiltersState) => void;
  onReset: () => void;
}

export function InventoryFilters({ filters, onChange, onReset }: InventoryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch categories for dropdown
  const { data: categories } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/categories'],
  });

  // Fetch VAT rates
  const { data: vatRates } = useQuery<Array<{ rate: string }>>({
    queryKey: ['/api/settings/vat-rates'],
  });

  const handleFilterChange = (key: keyof InventoryFiltersState, value: InventoryFiltersState[keyof InventoryFiltersState]) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'isActive' && value === undefined) return false;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const getFilterChips = () => {
    const chips = [];

    if (filters.categoryId) {
      const category = categories?.find(c => c.id === filters.categoryId);
      chips.push({
        label: `Category: ${category?.name || 'Unknown'}`,
        onRemove: () => handleFilterChange('categoryId', undefined),
      });
    }

    if (filters.stockStatus) {
      chips.push({
        label: `Stock: ${filters.stockStatus}`,
        onRemove: () => handleFilterChange('stockStatus', undefined),
      });
    }

    if (filters.vatRate) {
      chips.push({
        label: `VAT: ${filters.vatRate}%`,
        onRemove: () => handleFilterChange('vatRate', undefined),
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceText = filters.minPrice && filters.maxPrice
        ? `£${filters.minPrice} - £${filters.maxPrice}`
        : filters.minPrice
        ? `From £${filters.minPrice}`
        : `Up to £${filters.maxPrice}`;
      chips.push({
        label: `Price: ${priceText}`,
        onRemove: () => {
          handleFilterChange('minPrice', undefined);
          handleFilterChange('maxPrice', undefined);
        },
      });
    }

    if (filters.isActive !== undefined) {
      chips.push({
        label: filters.isActive ? 'Active Only' : 'Inactive Only',
        onRemove: () => handleFilterChange('isActive', undefined),
      });
    }

    return chips;
  };

  const filterChips = getFilterChips();

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
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-900 dark:text-blue-300">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="pr-1 flex items-center gap-1"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select
                  value={filters.categoryId?.toString() || ""}
                  onValueChange={(value) =>
                    handleFilterChange('categoryId', value ? parseInt(value) : undefined)
                  }
                >
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="stock-filter">Stock Status</Label>
                <Select
                  value={filters.stockStatus || ""}
                  onValueChange={(value) =>
                    handleFilterChange('stockStatus', value || undefined)
                  }
                >
                  <SelectTrigger id="stock-filter">
                    <SelectValue placeholder="All Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Stock Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* VAT Rate Filter */}
              <div className="space-y-2">
                <Label htmlFor="vat-filter">VAT Rate</Label>
                <Select
                  value={filters.vatRate || ""}
                  onValueChange={(value) =>
                    handleFilterChange('vatRate', value || undefined)
                  }
                >
                  <SelectTrigger id="vat-filter">
                    <SelectValue placeholder="All VAT Rates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All VAT Rates</SelectItem>
                    {vatRates?.map((vr, index) => (
                      <SelectItem key={index} value={vr.rate}>
                        {parseFloat(vr.rate) * 100}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price Range</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    min="0"
                    step="0.01"
                    value={filters.minPrice ?? ''}
                    onChange={(e) =>
                      handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full"
                  />
                  <span className="text-gray-500">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    min="0"
                    step="0.01"
                    value={filters.maxPrice ?? ''}
                    onChange={(e) =>
                      handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Active/Inactive Filter */}
              <div className="space-y-2">
                <Label htmlFor="active-filter">Status</Label>
                <Select
                  value={
                    filters.isActive === true
                      ? "active"
                      : filters.isActive === false
                      ? "inactive"
                      : ""
                  }
                  onValueChange={(value) =>
                    handleFilterChange(
                      'isActive',
                      value === "active" ? true : value === "inactive" ? false : undefined
                    )
                  }
                >
                  <SelectTrigger id="active-filter">
                    <SelectValue placeholder="All Items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Items</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
