/**
 * Reusable Loading Skeleton Components
 *
 * Provides consistent loading states across the application
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{ width: i === 0 ? '30%' : '20%' }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-gray-100 rounded animate-pulse"
              style={{ width: colIndex === 0 ? '30%' : '20%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={`card-skeleton-${i}`}>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-32 bg-gray-300 rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div
          className="bg-gray-100 rounded animate-pulse"
          style={{ height: `${height}px` }}
        />
      </CardContent>
    </Card>
  );
}

export function ReportPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Summary Cards */}
      <CardSkeleton count={4} />

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={5} />
        </CardContent>
      </Card>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={10} columns={6} />
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />

      {/* Date range picker */}
      <div className="flex gap-2 items-center">
        <div className="h-10 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* KPI Cards */}
      <CardSkeleton count={4} />

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton height={350} />
        <ChartSkeleton height={350} />
      </div>

      <ChartSkeleton height={400} />

      {/* Top Items Table */}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} columns={4} />
        </CardContent>
      </Card>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />

      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`detail-${i}`} className="flex justify-between py-2 border-b">
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
