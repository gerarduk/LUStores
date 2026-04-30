/**
 * Inventory Turnover Analytics
 *
 * Provides advanced inventory metrics:
 * - Turnover rate (cost of goods sold / average inventory)
 * - Days to sell inventory
 * - Fast movers vs slow movers
 * - Stock efficiency by category
 */

import { db } from './dbConfig';
import { items, sales, saleItems, stockMovements, categories } from '../shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export interface InventoryTurnoverMetrics {
  itemId: string;
  sku: string;
  name: string;
  categoryName?: string;
  turnoverRate: number; // times per period
  daysToSell: number; // average days to sell through inventory
  averageStock: number;
  totalSold: number;
  revenueGenerated: number;
  classification: 'fast' | 'medium' | 'slow' | 'dead'; // ABC analysis
}

export interface TurnoverSummary {
  overallTurnoverRate: number;
  totalRevenue: number;
  fastMovers: number; // count of fast-moving items
  slowMovers: number; // count of slow-moving items
  deadStock: number; // items with zero sales
  topPerformers: InventoryTurnoverMetrics[];
  worstPerformers: InventoryTurnoverMetrics[];
}

/**
 * Calculate inventory turnover for a specific time period
 */
export async function calculateInventoryTurnover(options: {
  startDate: Date;
  endDate: Date;
  categoryId?: string;
  minTurnoverRate?: number;
}): Promise<InventoryTurnoverMetrics[]> {
  const { startDate, endDate, categoryId, minTurnoverRate } = options;

  // Calculate period in days
  const periodDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get all items with their sales data
  const query = db
    .select({
      itemId: items.id,
      sku: items.sku,
      name: items.name,
      categoryId: items.categoryId,
      categoryName: categories.name,
      currentStock: items.currentStock,
      price: items.price,
      // Aggregate sales data
      totalSold: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`,
      revenueGenerated: sql<number>`COALESCE(SUM(${saleItems.quantity} * ${saleItems.unitPrice}), 0)`,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(saleItems, eq(items.id, saleItems.itemId))
    .leftJoin(sales, and(eq(sales.id, saleItems.saleId), gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)))
    .groupBy(items.id, items.sku, items.name, items.categoryId, categories.name, items.currentStock, items.price);

  // Apply category filter if provided
  const itemsData = categoryId
    ? await query.where(eq(items.categoryId, parseInt(categoryId)))
    : await query;

  // Calculate turnover metrics for each item
  const metrics: InventoryTurnoverMetrics[] = [];

  for (const item of itemsData) {
    const totalSold = Number(item.totalSold) || 0;
    const currentStock = Number(item.currentStock) || 0;

    // Calculate average stock (simplified: current + sold / 2)
    // For more accuracy, we'd track beginning and ending inventory
    const averageStock = (currentStock + totalSold) / 2;

    // Turnover rate = units sold / average inventory
    // Then annualize it (multiply by 365 / periodDays)
    const turnoverRate =
      averageStock > 0
        ? (totalSold / averageStock) * (365 / periodDays)
        : 0;

    // Days to sell = 365 / turnover rate
    const daysToSell = turnoverRate > 0 ? 365 / turnoverRate : Infinity;

    // Classify items (ABC analysis)
    let classification: 'fast' | 'medium' | 'slow' | 'dead';
    if (totalSold === 0) {
      classification = 'dead'; // No sales
    } else if (turnoverRate >= 12) {
      classification = 'fast'; // Turns over monthly or more
    } else if (turnoverRate >= 4) {
      classification = 'medium'; // Turns over quarterly
    } else {
      classification = 'slow'; // Turns over less than quarterly
    }

    const metric: InventoryTurnoverMetrics = {
      itemId: item.itemId,
      sku: item.sku,
      name: item.name,
      categoryName: item.categoryName || undefined,
      turnoverRate,
      daysToSell: isFinite(daysToSell) ? Math.round(daysToSell) : 9999,
      averageStock: Math.round(averageStock * 10) / 10,
      totalSold,
      revenueGenerated: Number(item.revenueGenerated) || 0,
      classification,
    };

    metrics.push(metric);
  }

  // Apply minimum turnover filter if provided
  const filtered = minTurnoverRate
    ? metrics.filter((m) => m.turnoverRate >= minTurnoverRate)
    : metrics;

  // Sort by turnover rate (descending)
  return filtered.sort((a, b) => b.turnoverRate - a.turnoverRate);
}

/**
 * Get turnover summary with key insights
 */
export async function getTurnoverSummary(options: {
  startDate: Date;
  endDate: Date;
}): Promise<TurnoverSummary> {
  const metrics = await calculateInventoryTurnover(options);

  // Calculate overall metrics
  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenueGenerated, 0);
  const totalSold = metrics.reduce((sum, m) => sum + m.totalSold, 0);
  const totalAverageStock = metrics.reduce((sum, m) => sum + m.averageStock, 0);

  const periodDays = Math.ceil(
    (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const overallTurnoverRate =
    totalAverageStock > 0
      ? (totalSold / totalAverageStock) * (365 / periodDays)
      : 0;

  // Count by classification
  const fastMovers = metrics.filter((m) => m.classification === 'fast').length;
  const slowMovers = metrics.filter((m) => m.classification === 'slow').length;
  const deadStock = metrics.filter((m) => m.classification === 'dead').length;

  // Get top and worst performers
  const topPerformers = metrics
    .filter((m) => m.classification !== 'dead')
    .slice(0, 10);

  const worstPerformers = metrics
    .filter((m) => m.totalSold > 0) // Exclude dead stock
    .sort((a, b) => a.turnoverRate - b.turnoverRate)
    .slice(0, 10);

  return {
    overallTurnoverRate: Math.round(overallTurnoverRate * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    fastMovers,
    slowMovers,
    deadStock,
    topPerformers,
    worstPerformers,
  };
}

/**
 * Get turnover trends over time (monthly breakdown)
 */
export async function getTurnoverTrends(options: {
  startDate: Date;
  endDate: Date;
}): Promise<Array<{ month: string; turnoverRate: number; revenue: number }>> {
  const trends: Array<{ month: string; turnoverRate: number; revenue: number }> = [];

  // Split period into months
  const currentDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);

  while (currentDate < endDate) {
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Don't exceed end date
    if (monthEnd > endDate) {
      monthEnd.setTime(endDate.getTime());
    }

    const summary = await getTurnoverSummary({
      startDate: monthStart,
      endDate: monthEnd,
    });

    trends.push({
      month: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      turnoverRate: summary.overallTurnoverRate,
      revenue: summary.totalRevenue,
    });

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return trends;
}

/**
 * Get items that need attention (slow movers or overstocked)
 */
export async function getItemsNeedingAttention(options: {
  startDate: Date;
  endDate: Date;
}): Promise<{
  overstock: InventoryTurnoverMetrics[];
  slowMovers: InventoryTurnoverMetrics[];
  deadStock: InventoryTurnoverMetrics[];
}> {
  const metrics = await calculateInventoryTurnover(options);

  // Overstock: High stock but low turnover
  const overstock = metrics
    .filter((m) => m.averageStock > 50 && m.turnoverRate < 2)
    .sort((a, b) => b.averageStock - a.averageStock)
    .slice(0, 20);

  // Slow movers with stock
  const slowMovers = metrics
    .filter((m) => m.classification === 'slow' && m.averageStock > 0)
    .sort((a, b) => a.turnoverRate - b.turnoverRate)
    .slice(0, 20);

  // Dead stock
  const deadStock = metrics
    .filter((m) => m.classification === 'dead' && m.averageStock > 0)
    .sort((a, b) => b.averageStock - a.averageStock)
    .slice(0, 20);

  return {
    overstock,
    slowMovers,
    deadStock,
  };
}

/**
 * Calculate optimal reorder points based on turnover
 */
export async function calculateReorderPoints(options: {
  startDate: Date;
  endDate: Date;
  leadTimeDays?: number; // Default 14 days
  safetyStockDays?: number; // Default 7 days
}): Promise<Array<{
  itemId: string;
  sku: string;
  name: string;
  currentStock: number;
  averageDailySales: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  status: 'critical' | 'low' | 'adequate' | 'overstocked';
}>> {
  const { startDate, endDate, leadTimeDays = 14, safetyStockDays = 7 } = options;
  const metrics = await calculateInventoryTurnover({ startDate, endDate });

  const periodDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const reorderPoints = metrics.map((metric) => {
    const averageDailySales = metric.totalSold / periodDays;

    // Reorder point = (average daily sales × lead time) + safety stock
    const reorderPoint = Math.ceil(
      averageDailySales * leadTimeDays + averageDailySales * safetyStockDays
    );

    // Recommended order quantity = average daily sales × 30 days (monthly)
    const recommendedOrderQuantity = Math.ceil(averageDailySales * 30);

    // Determine status
    let status: 'critical' | 'low' | 'adequate' | 'overstocked';
    if (metric.averageStock <= reorderPoint * 0.5) {
      status = 'critical';
    } else if (metric.averageStock <= reorderPoint) {
      status = 'low';
    } else if (metric.averageStock <= reorderPoint * 3) {
      status = 'adequate';
    } else {
      status = 'overstocked';
    }

    return {
      itemId: metric.itemId,
      sku: metric.sku,
      name: metric.name,
      currentStock: metric.averageStock,
      averageDailySales: Math.round(averageDailySales * 100) / 100,
      reorderPoint,
      recommendedOrderQuantity,
      status,
    };
  });

  // Sort by criticality
  return reorderPoints.sort((a, b) => {
    const statusOrder = { critical: 0, low: 1, adequate: 2, overstocked: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}
