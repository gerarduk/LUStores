/**
 * Referential Integrity Management
 * 
 * This module handles the complex relationships between entities in the system,
 * providing safe deletion strategies and reference management.
 */

import { db } from './dbConfig';
import { 
  users, items, categories, sales, quotes, orders, suppliers,
  stockMovements, saleItems, quoteItems, orderItems, sources,
  chargecodes, userPermissions
} from '../shared/schema';
import { eq, count } from 'drizzle-orm';

export interface DeletionCheck {
  canDelete: boolean;
  blockedBy: Array<{
    table: string;
    count: number;
    description: string;
  }>;
  warnings: Array<{
    table: string;
    count: number;
    description: string;
    action: 'cascade' | 'nullify';
  }>;
}

export class ReferentialIntegrityManager {
  
  /**
   * Check if a user can be safely deleted or what would happen
   */
  async checkUserDeletion(userId: string): Promise<DeletionCheck> {
    const blockedBy = [];
    const warnings = [];

    // Check items created by user
    const [itemsCreated] = await db
      .select({ count: count() })
      .from(items)
      .where(eq(items.createdBy, userId));

    if (itemsCreated.count > 0) {
      warnings.push({
        table: 'items',
        count: itemsCreated.count,
        description: `${itemsCreated.count} items will have their creator reference nullified`,
        action: 'nullify' as const
      });
    }

    // Check stock movements
    const [stockMovementsPerformed] = await db
      .select({ count: count() })
      .from(stockMovements)
      .where(eq(stockMovements.performedBy, userId));

    if (stockMovementsPerformed.count > 0) {
      warnings.push({
        table: 'stockMovements',
        count: stockMovementsPerformed.count,
        description: `${stockMovementsPerformed.count} stock movements will have their performer reference nullified`,
        action: 'nullify' as const
      });
    }

    // Check sales processed by user
    const [salesProcessed] = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.processedBy, userId));

    if (salesProcessed.count > 0) {
      warnings.push({
        table: 'sales',
        count: salesProcessed.count,
        description: `${salesProcessed.count} sales will have their processor reference nullified`,
        action: 'nullify' as const
      });
    }

    // Check quotes created by user
    const [quotesCreated] = await db
      .select({ count: count() })
      .from(quotes)
      .where(eq(quotes.createdBy, userId));

    if (quotesCreated.count > 0) {
      warnings.push({
        table: 'quotes',
        count: quotesCreated.count,
        description: `${quotesCreated.count} quotes will have their creator reference nullified`,
        action: 'nullify' as const
      });
    }

    // Check orders created by user
    const [ordersCreated] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.createdBy, userId));

    if (ordersCreated.count > 0) {
      warnings.push({
        table: 'orders',
        count: ordersCreated.count,
        description: `${ordersCreated.count} orders will have their creator reference nullified`,
        action: 'nullify' as const
      });
    }

    return {
      canDelete: blockedBy.length === 0,
      blockedBy,
      warnings
    };
  }

  /**
   * Check if a category can be safely deleted
   */
  async checkCategoryDeletion(categoryId: number): Promise<DeletionCheck> {
    const blockedBy = [];
    const warnings = [];

    // Check items in this category
    const [itemsInCategory] = await db
      .select({ count: count() })
      .from(items)
      .where(eq(items.categoryId, categoryId));

    if (itemsInCategory.count > 0) {
      blockedBy.push({
        table: 'items',
        count: itemsInCategory.count,
        description: `${itemsInCategory.count} items are still in this category. Move or delete them first.`
      });
    }

    return {
      canDelete: blockedBy.length === 0,
      blockedBy,
      warnings
    };
  }

  /**
   * Check if an item can be safely deleted
   */
  async checkItemDeletion(itemId: number): Promise<DeletionCheck> {
    const blockedBy = [];
    const warnings = [];

    // Check sale items
    const [saleItemsCount] = await db
      .select({ count: count() })
      .from(saleItems)
      .where(eq(saleItems.itemId, itemId));

    if (saleItemsCount.count > 0) {
      blockedBy.push({
        table: 'saleItems',
        count: saleItemsCount.count,
        description: `Item appears in ${saleItemsCount.count} sales and cannot be deleted for audit purposes.`
      });
    }

    // Check quote items
    const [quoteItemsCount] = await db
      .select({ count: count() })
      .from(quoteItems)
      .where(eq(quoteItems.itemId, itemId));

    if (quoteItemsCount.count > 0) {
      blockedBy.push({
        table: 'quoteItems',
        count: quoteItemsCount.count,
        description: `Item appears in ${quoteItemsCount.count} quotes. Delete quotes first.`
      });
    }

    // Check stock movements (these can be cascade deleted)
    const [stockMovementsCount] = await db
      .select({ count: count() })
      .from(stockMovements)
      .where(eq(stockMovements.itemId, itemId));

    if (stockMovementsCount.count > 0) {
      warnings.push({
        table: 'stockMovements',
        count: stockMovementsCount.count,
        description: `${stockMovementsCount.count} stock movement records will be deleted`,
        action: 'cascade' as const
      });
    }

    // Check sources (supplier relationships)
    const [sourcesCount] = await db
      .select({ count: count() })
      .from(sources)
      .where(eq(sources.itemId, itemId));

    if (sourcesCount.count > 0) {
      warnings.push({
        table: 'sources',
        count: sourcesCount.count,
        description: `${sourcesCount.count} supplier relationships will be deleted`,
        action: 'cascade' as const
      });
    }

    return {
      canDelete: blockedBy.length === 0,
      blockedBy,
      warnings
    };
  }

  /**
   * Check if a supplier can be safely deleted
   */
  async checkSupplierDeletion(supplierId: string): Promise<DeletionCheck> {
    const blockedBy = [];
    const warnings = [];

    // Check orders from this supplier
    const [ordersCount] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.supplierId, supplierId));

    if (ordersCount.count > 0) {
      blockedBy.push({
        table: 'orders',
        count: ordersCount.count,
        description: `${ordersCount.count} orders exist from this supplier and cannot be deleted for audit purposes.`
      });
    }

    // Check sources (item relationships)
    const [sourcesCount] = await db
      .select({ count: count() })
      .from(sources)
      .where(eq(sources.supplierId, supplierId));

    if (sourcesCount.count > 0) {
      warnings.push({
        table: 'sources',
        count: sourcesCount.count,
        description: `${sourcesCount.count} item relationships will be deleted`,
        action: 'cascade' as const
      });
    }

    return {
      canDelete: blockedBy.length === 0,
      blockedBy,
      warnings
    };
  }

  /**
   * Safely delete a user by nullifying references
   */
  async safeDeleteUser(userId: string): Promise<void> {
    const check = await this.checkUserDeletion(userId);
    
    if (!check.canDelete) {
      throw new Error(`Cannot delete user: ${check.blockedBy.map(b => b.description).join(', ')}`);
    }

    // Begin transaction
    await db.transaction(async (tx) => {
      // Nullify all audit trail references
      await tx.update(items)
        .set({ createdBy: null })
        .where(eq(items.createdBy, userId));

      await tx.update(items)
        .set({ updatedBy: null })
        .where(eq(items.updatedBy, userId));

      await tx.update(stockMovements)
        .set({ performedBy: null })
        .where(eq(stockMovements.performedBy, userId));

      await tx.update(sales)
        .set({ processedBy: null })
        .where(eq(sales.processedBy, userId));

      await tx.update(quotes)
        .set({ createdBy: null })
        .where(eq(quotes.createdBy, userId));

      await tx.update(quotes)
        .set({ processedBy: null })
        .where(eq(quotes.processedBy, userId));

      await tx.update(orders)
        .set({ createdBy: null })
        .where(eq(orders.createdBy, userId));

      await tx.update(orders)
        .set({ receivedBy: null })
        .where(eq(orders.receivedBy, userId));

      await tx.update(chargecodes)
        .set({ authorisedBy: null })
        .where(eq(chargecodes.authorisedBy, userId));

      // Delete user permissions first
      await tx.delete(userPermissions)
        .where(eq(userPermissions.userId, userId));

      // Finally delete the user
      await tx.delete(users)
        .where(eq(users.id, userId));
    });
  }

  /**
   * Safely delete an item by handling cascades
   */
  async safeDeleteItem(itemId: number): Promise<void> {
    const check = await this.checkItemDeletion(itemId);
    
    if (!check.canDelete) {
      throw new Error(`Cannot delete item: ${check.blockedBy.map(b => b.description).join(', ')}`);
    }

    // Begin transaction
    await db.transaction(async (tx) => {
      // Delete dependent records first
      await tx.delete(stockMovements)
        .where(eq(stockMovements.itemId, itemId));

      await tx.delete(sources)
        .where(eq(sources.itemId, itemId));

      // Finally delete the item
      await tx.delete(items)
        .where(eq(items.id, itemId));
    });
  }

  /**
   * Safely delete a supplier
   */
  async safeDeleteSupplier(supplierId: string): Promise<void> {
    const check = await this.checkSupplierDeletion(supplierId);
    
    if (!check.canDelete) {
      throw new Error(`Cannot delete supplier: ${check.blockedBy.map(b => b.description).join(', ')}`);
    }

    // Begin transaction
    await db.transaction(async (tx) => {
      // Delete dependent records first
      await tx.delete(sources)
        .where(eq(sources.supplierId, supplierId));

      // Finally delete the supplier
      await tx.delete(suppliers)
        .where(eq(suppliers.id, supplierId));
    });
  }

  /**
   * Check if a quote can be safely deleted
   */
  async checkQuoteDeletion(quoteId: number): Promise<DeletionCheck> {
    const blockedBy: Array<{
      table: string;
      count: number;
      description: string;
    }> = [];
    const warnings: Array<{
      table: string;
      count: number;
      description: string;
      action: 'cascade' | 'nullify';
    }> = [];

    // Check quote items (these should be cascaded)
    const [quoteItemsCount] = await db
      .select({ count: count() })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    if (quoteItemsCount.count > 0) {
      warnings.push({
        table: 'quoteItems',
        count: quoteItemsCount.count,
        description: `${quoteItemsCount.count} quote items will be deleted`,
        action: 'cascade' as const
      });
    }

    return {
      canDelete: blockedBy.length === 0,
      blockedBy,
      warnings
    };
  }

  /**
   * Safely delete a quote and all its dependent records
   */
  async safeDeleteQuote(quoteId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      // Delete quote items first
      await tx.delete(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));

      // Finally delete the quote
      await tx.delete(quotes)
        .where(eq(quotes.id, quoteId));
    });
  }
}

export const referentialIntegrity = new ReferentialIntegrityManager();
