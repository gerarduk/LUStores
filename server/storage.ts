
/**
 * @fileoverview Storage layer for the University Inventory Management System.
 * 
 * This module provides a comprehensive data access layer implementing the Repository pattern
 * for all database operations. It handles CRUD operations for users, inventory items, sales,
 * quotes, orders, charge codes, and related entities with proper error handling and
 * referential integrity checks.
 * 
 * Key Features:
 * - Type-safe database operations using Drizzle ORM
 * - Atomic transactions for complex operations (e.g., quote-to-sale conversion)
 * - Safe deletion with referential integrity checking
 * - Automatic audit trail creation for stock movements
 * - Draft quote management with session-based isolation
 * - Decimal/fractional quantity support for precise stock tracking
 * 
 * @module server/storage
 * @requires @shared/schema
 * @requires drizzle-orm
 */

import {
  users,
  categories,
  items as itemsTable,
  stockMovements,
  sales,
  saleItems,
  quotes,
  quoteItems,
  suppliers,
  sources,
  orders,
  orderItems,
  chargecodes,
  chargeCodeExclusions,
  chargeCodeAuthorizedUsers,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Item,
  type InsertItem,
  type UpdateItem,
  type ItemWithCategory,
  type StockMovement,
  type InsertStockMovement,
  type StockMovementWithDetails,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type SaleWithDetails,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type Supplier,
  type InsertSupplier,
  type Source,
  type InsertSource,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithDetails,
  type Chargecode,
  type InsertChargecode,
  type ChargeCodeExclusion,
  type InsertChargeCodeExclusion,
  type ChargeCodeAuthorizedUser,
  notes,
  type Note,
  type InsertNote,
  type UpdateNote,
} from "@shared/schema";
import { DRAFT_QUOTE_CONFIG } from "./draftQuoteConfig";
import { db } from "./dbConfig";
import { eq, desc, and, or, ilike, sql, count, sum, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { referentialIntegrity, type DeletionCheck } from "./referentialIntegrity";
import Decimal from "decimal.js";

/**
 * Interface defining all storage operations for the inventory management system.
 * 
 * This interface serves as the contract for the storage layer, defining all
 * available database operations. It follows the Repository pattern to abstract
 * database access and provide a clean API for business logic.
 * 
 * @interface IStorage
 */
export interface IStorage {
    /**
     * Refunds part or all of a sale in-place: reduces sale item qty, restocks inventory, appends note.
     */
    refundSaleInPlace(
      saleId: number,
      items: Array<{ itemId: number; refundQty: number }>,
      note: string,
      userId: string
    ): Promise<any>;
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  
  /**
   * Retrieves a user by their unique identifier.
   * 
   * @param {string} id - The unique user identifier (UUID or OAuth provider ID)
   * @returns {Promise<User | undefined>} The user object if found, undefined otherwise
   * @example
   * const user = await storage.getUser("user-123");
   * @param {string} user.password_hash - Bcrypt hashed password
   * @param {string} user.firstName - User's first name
   * @param {string} user.lastName - User's last name
   * @param {string} user.role - User role (user, manager, admin)
   * @param {boolean} user.isActive - Whether the account is active
   * @param {boolean} user.mustChangePassword - Force password change on next login
   * @returns {Promise<User>} The created user
   * @throws {Error} If email already exists
   */
  createLocalUser(user: {
    email: string;
    password_hash: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }): Promise<User>;
  
  /**
   * Retrieves all users in the system.
   * 
   * @returns {Promise<User[]>} Array of all users
   * @example
   * const users = await storage.getAllUsers();
   * console.log(`Total users: ${users.length}`);
   */
  getAllUsers(): Promise<User[]>;
  
  /**
   * Updates a user's role.
   * 
   * @param {string} id - User identifier
   * @param {string} role - New role (user, manager, admin)
   * @returns {Promise<User>} Updated user
   * @throws {Error} If user not found or role is invalid
   */
  updateUserRole(id: string, role: string): Promise<User>;
  
  /**
   * Updates a user's password hash.
   * 
   * @param {string} id - User identifier
   * @param {string} password_hash - New bcrypt password hash
   * @param {boolean} [mustChangePassword] - Optional flag to force password change
   * @returns {Promise<User>} Updated user
   */
  updateUserPassword(id: string, password_hash: string, mustChangePassword?: boolean): Promise<User>;
  
  /**
   * Records a user's login timestamp.
   * 
   * @param {string} id - User identifier
   * @returns {Promise<void>}
   */
  updateUserLastLogin(id: string): Promise<void>;
  
  /**
   * Deactivates a user account (soft delete).
   *
   * @param {string} id - User identifier
   * @returns {Promise<void>}
   */
  deactivateUser(id: string): Promise<void>;

  /**
   * Updates a user's picking list preference.
   *
   * @param {string} id - User identifier
   * @param {boolean} showPickingList - Whether to show picking list after sales
   * @returns {Promise<User>} Updated user
   */
  updateUserShowPickingList(id: string, showPickingList: boolean): Promise<User>;

  /**
   * Gets authorized users for a charge code.
   *
   * @param {string} chargeCode - Charge code to look up
   * @returns {Promise<ChargeCodeAuthorizedUser[]>} Array of authorized users
   */
  getChargeCodeAuthorizedUsers(chargeCode: string): Promise<ChargeCodeAuthorizedUser[]>;

  // ============================================================================
  // SAFE DELETION OPERATIONS WITH REFERENTIAL INTEGRITY CHECKS
  // ============================================================================
  
  /**
   * Checks if a user can be safely deleted without violating referential integrity.
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<DeletionCheck>} Object containing deletion safety status and blocking references
   * @example
   * const check = await storage.checkUserDeletion("user-123");
   * if (!check.canDelete) {
   *   console.log(`Cannot delete: ${check.blockedBy.join(", ")}`);
   * }
   */
  checkUserDeletion(userId: string): Promise<DeletionCheck>;
  
  /**
   * Safely deletes a user after checking referential integrity.
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<void>}
   * @throws {Error} If user has dependent records
   */
  safeDeleteUser(userId: string): Promise<void>;
  
  /**
   * Checks if a category can be safely deleted.
   * 
   * @param {number} categoryId - Category identifier
   * @returns {Promise<DeletionCheck>} Deletion safety status
   */
  checkCategoryDeletion(categoryId: number): Promise<DeletionCheck>;
  
  /**
   * Safely deletes a category.
   * 
   * @param {number} categoryId - Category identifier
   * @returns {Promise<void>}
   * @throws {Error} If category has items assigned to it
   */
  safeDeleteCategory(categoryId: number): Promise<void>;
  
  /**
   * Checks if an item can be safely deleted.
   * 
   * @param {number} itemId - Item identifier
   * @returns {Promise<DeletionCheck>} Deletion safety status
   */
  checkItemDeletion(itemId: number): Promise<DeletionCheck>;
  
  /**
   * Safely deletes an item.
   * 
   * @param {number} itemId - Item identifier
   * @returns {Promise<void>}
   * @throws {Error} If item is referenced in orders, sales, or quotes
   */
  safeDeleteItem(itemId: number): Promise<void>;
  
  /**
   * Checks if a supplier can be safely deleted.
   * 
   * @param {string} supplierId - Supplier identifier
   * @returns {Promise<DeletionCheck>} Deletion safety status
   */
  checkSupplierDeletion(supplierId: string): Promise<DeletionCheck>;
  
  /**
   * Safely deletes a supplier.
   * 
   * @param {string} supplierId - Supplier identifier
   * @returns {Promise<void>}
   * @throws {Error} If supplier has associated orders
   */
  safeDeleteSupplier(supplierId: string): Promise<void>;
  
  /**
   * Checks if a quote can be safely deleted.
   * 
   * @param {number} quoteId - Quote identifier
   * @returns {Promise<DeletionCheck>} Deletion safety status
   */
  checkQuoteDeletion(quoteId: number): Promise<DeletionCheck>;
  
  /**
   * Safely deletes a quote.
   * 
   * @param {number} quoteId - Quote identifier
   * @returns {Promise<void>}
   * @throws {Error} If quote has been processed or has dependent records
   */
  safeDeleteQuote(quoteId: number): Promise<void>;
  
  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================
  
  /**
   * Retrieves all inventory categories.
   * 
   * @returns {Promise<Category[]>} Array of all categories
   */
  getCategories(): Promise<Category[]>;
  
  /**
   * Retrieves a single category by ID.
   * 
   * @param {number} id - Category identifier
   * @returns {Promise<Category | undefined>} The category or undefined if not found
   */
  getCategory(id: number): Promise<Category | undefined>;
  
  /**
   * Creates a new inventory category.
   * 
   * @param {InsertCategory} category - Category data
   * @returns {Promise<Category>} The created category
   * @example
   * const category = await storage.createCategory({
   *   name: "Audio/Visual Equipment",
   *   description: "Projectors, cameras, and presentation tools",
   *   icon: "fas fa-video",
   *   color: "purple"
   * });
   */
  createCategory(category: InsertCategory): Promise<Category>;
  
  /**
   * Updates an existing category.
   * 
   * @param {number} id - Category identifier
   * @param {Partial<InsertCategory>} category - Partial category data to update
   * @returns {Promise<Category>} Updated category
   */
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  
  /**
   * Deletes a category.
   * 
   * WARNING: This performs a direct deletion. Use safeDeleteCategory() to check
   * for dependent records first.
   * 
   * @param {number} id - Category identifier
   * @returns {Promise<void>}
   */
  deleteCategory(id: number): Promise<void>;
  
  // ============================================================================
  // ITEM OPERATIONS
  // ============================================================================
  
  /**
   * Retrieves inventory items with pagination, search, and filtering.
   *
   * @param {number} [page=1] - Page number (1-indexed)
   * @param {number} [limit=10] - Items per page
   * @param {string} [search] - Search term for item name/description
   * @param {number} [categoryId] - Filter by category ID
   * @param {'name' | 'sku'} [searchMode] - Search mode: 'name' or 'sku'
   * @returns {Promise<{items: ItemWithCategory[], total: number}>} Paginated items and total count
   * @example
   * const result = await storage.getItems(1, 20, "laptop", 1);
   * console.log(`Found ${result.total} items, showing ${result.items.length}`);
   */
  getItems(page?: number, limit?: number, search?: string, categoryId?: number, searchMode?: 'name' | 'sku', includeInactive?: boolean): Promise<{
    items: ItemWithCategory[];
    total: number;
  }>;
  getItem(id: number): Promise<ItemWithCategory | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<UpdateItem>, updatedBy: string): Promise<Item>;
  deleteItem(id: number): Promise<void>;
  
  // Stock operations
  updateStock(itemId: number, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string, performedBy: string): Promise<void>;
  getStockMovements(itemId?: number, limit?: number): Promise<StockMovementWithDetails[]>;
  
  // Sales operations
  createSale(
    saleData: Omit<InsertSale, 'saleId'>, 
    items: Array<{
      itemId: number;
      itemName: string;
      itemSku: string;
      unitPrice: number;
      quantity: number;
      vatRate: number;
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>,
    processedBy: string
  ): Promise<Sale>;
  getSales(page?: number, limit?: number, chargeCode?: string, startDate?: Date, endDate?: Date, supplierId?: string): Promise<{
    sales: SaleWithDetails[];
    total: number;
  }>;
  getSalesForExport(chargeCode?: string, startDate?: Date, endDate?: Date, supplierId?: string): Promise<SaleWithDetails[]>;
  getSalesByChargeCode(startDate?: Date, endDate?: Date): Promise<Array<{
    chargeCode: string;
    sales: SaleWithDetails[];
    total: number;
  }>>;
  countSalesByChargeCode(chargeCode: string): Promise<number>;
  markSaleAsPaid(saleId: number): Promise<Sale>;
  markSaleAsUnpaid(saleId: number): Promise<Sale>;
  setSaleRecipient(saleId: number, deliveredTo: string, deliveredToEmail?: string): Promise<Sale>;
  getSale(saleId: number): Promise<any>;
  updateSaleItemQuantity(saleId: number, itemId: number, newQuantity: number): Promise<void>;
  recalculateSaleTotals(saleId: number): Promise<void>;
  
  /**
   * Creates a sale AND reduces stock atomically in a single transaction.
   * This ensures that either both operations succeed or both fail - preventing
   * data inconsistency where stock is reduced but sale is not recorded (or vice versa).
   * 
   * @param saleData - Sale data (charge code, totals, etc.)
   * @param items - Array of items with quantities
   * @param processedBy - User ID who processed the sale
   * @param processDate - Optional custom date for the sale
   * @returns The created sale record
   * @throws Error if any item has insufficient stock or if transaction fails
   */
  createSaleWithStockUpdate(
    saleData: Omit<InsertSale, 'saleId'>,
    items: Array<{
      itemId: number;
      itemName: string;
      itemSku: string;
      unitPrice: number;
      quantity: number;
      vatRate: number;
      vatIncluded: boolean; // Required: snapshot of whether price included VAT
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>,
    processedBy: string,
    processDate?: Date
  ): Promise<Sale>;

  // Quote operations
  createQuote(quoteData: Omit<InsertQuote, 'quoteId'>, items: Array<{
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: number;
    quantity: number;
  }>): Promise<Quote & { items: QuoteItem[] }>;
  getQuotes(page?: number, limit?: number, status?: string, createdBy?: string): Promise<{
    quotes: Array<Quote & { items: QuoteItem[]; creator: User; processor?: User }>;
    total: number;
  }>;
  getQuote(id: number): Promise<(Quote & { items: QuoteItem[]; creator: User; processor?: User }) | undefined>;
  updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote>;
  deleteQuote(id: number): Promise<void>;
  processQuote(id: number, processedBy: string): Promise<Sale>;
  
  // Draft quote operations
  getCurrentDraftQuote(userId: string, sessionId?: string): Promise<(Quote & { items: QuoteItem[] }) | undefined>;
  touchDraftQuote(quoteId: number, sessionId: string): Promise<void>;
  cleanupExpiredDrafts(): Promise<number>;
  migrateDraftToSession(userId: string, sessionId: string): Promise<(Quote & { items: QuoteItem[] }) | undefined>;
  addItemToDraftQuote(quoteId: number, item: {
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: number;
    quantity: number;
    vatRate: number;
    vatAmount: number;
    subtotal: number;
    totalWithVat: number;
  }): Promise<Quote & { items: QuoteItem[] }>;
  updateDraftQuoteChargeCode(quoteId: number, chargeCode: string): Promise<Quote & { items: QuoteItem[] }>;
  deleteDraftQuote(quoteId: number): Promise<void>;
  
  // Order operations
  getOrders(page?: number, limit?: number, status?: string, supplierId?: string): Promise<{
    orders: Array<Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }>;
    total: number;
  }>;
  getOrder(id: number): Promise<(Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }) | undefined>;
  createOrder(orderData: Omit<InsertOrder, 'orderId'>, items: Array<{
    itemId?: number;
    itemName: string;
    itemSku: string;
    itemDescription?: string;
    categoryId?: number;
    unitCost: string;
    quantity: number;
    totalCost: string;
    received?: boolean;
    vendorSku?: string;
    vatRate?: number;
    vatAmount?: number;
  }>): Promise<Order>;
  updateOrder(id: number, orderData: Partial<Order>): Promise<Order>;
  receiveOrder(id: number, receivedBy: string, receivedItems: Array<{
    orderItemId: number;
    receivedQuantity: number;
    addToInventory?: boolean;
  }>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  
  // Supplier operations
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  getSuppliersWithOrderHistory(): Promise<Array<Supplier & { 
    orderCount: number; 
    totalOrderValue: number; 
    lastOrderDate: Date | null; 
    itemsSupplied: number;
  }>>;
  getSupplierOrderHistory(supplierId: string): Promise<Array<Order & { 
    items: OrderItem[]; 
    creator: User; 
    receivedBy?: User;
  }>>;
  getSuppliersByItem(itemNameOrSku: string): Promise<Array<Supplier & {
    unitCost?: string;
    lastOrderDate?: Date;
    orderCount: number;
    totalOrderValue: number;
    itemsSupplied: number;
  }>>;
  getItemOrderHistory(itemId: number): Promise<Array<{
    orderId: number;
    orderDate: Date;
    supplier: { id: string; name: string } | null;
    quantity: number;
    unitCost: string;
    totalCost: string;
    vendorSku: string | null;
  }>>;

  
  // Source operations (supplier-item relationships)
  createSource(source: InsertSource): Promise<Source>;
  deleteSource(id: number): Promise<void>;
  getSupplierWithItems(supplierId: string): Promise<Supplier & { items: Array<ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }> }>;
  
  // Dashboard operations
  getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
    totalValueExVAT: number;
    totalUnits: number;
    activeUsers: number;
  }>;
  getLowStockItems(): Promise<ItemWithCategory[]>;
  getCategoryStats(): Promise<Array<{
    category: Category;
    itemCount: number;
    totalValue: number;
  }>>;
  
  // Charge code operations
  getChargeCodes(): Promise<Chargecode[]>;
  getChargeCode(code: string): Promise<Chargecode | undefined>;
  createChargeCode(chargeCodeData: InsertChargecode): Promise<Chargecode>;
  updateChargeCode(code: string, chargeCodeData: Partial<InsertChargecode>): Promise<Chargecode>;
  deleteChargeCode(code: string): Promise<void>;
  getExpiringChargeCodes(daysAhead?: number): Promise<Chargecode[]>;
  
  // Charge code exclusion operations
  getChargeCodeExclusions(chargeCode: string): Promise<number[]>; // Returns array of excluded category IDs
  createChargeCodeExclusion(chargeCode: string, categoryId: number, createdBy: string): Promise<void>;
  deleteChargeCodeExclusion(chargeCode: string, categoryId: number): Promise<void>;
  isChargeCodeExcludedForCategory(chargeCode: string, categoryId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {

    async refundSaleInPlace(
      saleId: number,
      items: Array<{ itemId: number; refundQty: number }>,
      note: string,
      userId: string
    ): Promise<any> {
      // Start transaction
      return await db.transaction(async (tx: any) => {
        // Get sale and sale items
        const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
        if (!sale) throw new Error('Sale not found');
        if (sale.status === 'paid') {
          throw new Error('Cannot refund a sale that has already been marked as paid.');
        }
        const saleItemsList = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
        // Map for quick lookup
        const saleItemsMap = new Map<number, any>(saleItemsList.map((si: any) => [si.itemId, si]));
        const now = new Date();
        let noteLines: string[] = [];
        let totalRefundAmount = Decimal('0');
        let totalRefundVAT = Decimal('0');

        for (const { itemId, refundQty } of items) {
          if (!saleItemsMap.has(itemId)) throw new Error(`Item ${itemId} not in sale`);
          const saleItem = saleItemsMap.get(itemId) as any;
          const refundQtyNum = parseFloat(refundQty.toString());
          const saleItemQtyNum = parseFloat(saleItem.quantity.toString());
          const newQty = Math.max(0, saleItemQtyNum - refundQtyNum);
          const actualRefund = saleItemQtyNum - newQty;
          if (actualRefund <= 0) continue; // nothing to refund

          // Calculate refund amounts
          const itemVATAmount = parseFloat(saleItem.vatAmount?.toString() || '0');
          const itemTotalWithVat = parseFloat(saleItem.totalWithVat?.toString() || '0');
          const itemSubtotal = parseFloat(saleItem.subtotal?.toString() || '0');
          const refundRatio = actualRefund / saleItemQtyNum;
          
          const refundItemVAT = Decimal(itemVATAmount.toString()).times(Decimal(refundRatio.toString()));
          const refundItemTotal = Decimal(itemTotalWithVat.toString()).times(Decimal(refundRatio.toString()));
          
          totalRefundVAT = totalRefundVAT.plus(refundItemVAT);
          totalRefundAmount = totalRefundAmount.plus(refundItemTotal);

          // Update sale item quantity
          if (newQty === 0) {
            // Delete the sale item if quantity becomes 0
            await tx.delete(saleItems).where(eq(saleItems.id, saleItem.id));
          } else {
            // Reduce the quantity
            await tx.update(saleItems).set({ 
              quantity: newQty.toString(),
              updatedAt: now 
            }).where(eq(saleItems.id, saleItem.id));
          }

          // Add refunded qty back to inventory using safe numeric addition
          const [currentItem] = await tx
            .select({ currentStock: itemsTable.currentStock })
            .from(itemsTable)
            .where(eq(itemsTable.id, itemId));
          
          if (currentItem) {
            const currentStockNum = parseFloat(currentItem.currentStock.toString());
            const newStock = currentStockNum + actualRefund;
            await tx.update(itemsTable).set({ 
              currentStock: newStock.toString(),
              updatedAt: now 
            }).where(eq(itemsTable.id, itemId));
          }

          noteLines.push(`Refunded ${actualRefund}x ${saleItem.itemName || ''} (itemId: ${itemId})`);
        }

        // Update sale totals if refunds were processed
        if (noteLines.length > 0) {
          const currentTotalAmount = Decimal(sale.totalAmount?.toString() || '0');
          const currentVATAmount = Decimal(sale.vatAmount?.toString() || '0');
          const currentSubtotalAmount = Decimal(sale.subtotalAmount?.toString() || '0');
          
          const newTotalAmount = currentTotalAmount.minus(totalRefundAmount);
          const newVATAmount = currentVATAmount.minus(totalRefundVAT);
          const newSubtotalAmount = currentSubtotalAmount.minus(totalRefundAmount.minus(totalRefundVAT));
          
          await tx.update(sales).set({
            totalAmount: newTotalAmount.toFixed(2),
            vatAmount: newVATAmount.toFixed(2),
            subtotalAmount: newSubtotalAmount.toFixed(2),
            updatedAt: now
          }).where(eq(sales.id, saleId));
        }

        // Append note to sale (concatenate to existing notes if present)
        let fullNote = noteLines.length > 0 ? `[Refund ${now.toISOString()} by ${userId}] ${noteLines.join(', ')}${note ? ' - ' + note : ''}` : '';
        if (fullNote) {
          const prevNotes = sale.notes || '';
          const newNotes = prevNotes ? prevNotes + '\n' + fullNote : fullNote;
          await tx.update(sales).set({ notes: newNotes, updatedAt: now }).where(eq(sales.id, saleId));
        }

        // Return updated sale
        const [updatedSale] = await tx.select().from(sales).where(eq(sales.id, saleId));
        return updatedSale;
      });
    }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First, try to find existing user
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);

      if (existingUser.length > 0) {
        // User exists, update it
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      } else {
        // User doesn't exist, insert it
        const [user] = await db
          .insert(users)
          .values({
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        return user;
      }
    } catch (error) {
      console.error('Error in upsertUser:', error);
      throw error;
    }
  }

  async createLocalUser(userData: {
    email: string;
    password_hash: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }): Promise<User> {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db
      .insert(users)
      .values({
        id,
        ...userData,
      })
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password_hash: string, mustChangePassword = false): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        password_hash,
        mustChangePassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
      })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
    console.log("📋 Active users from database:", allUsers.map((u: any) => ({ id: u.id, email: u.email, isActive: u.isActive })));
    return allUsers;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: string): Promise<void> {
    console.log("🗑️ Deactivating user in database:", id);
    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    console.log("🗑️ User deactivation result:", result);
  }

  async updateUserShowPickingList(id: string, showPickingList: boolean): Promise<User> {
    console.log(`🔧 Updating user ${id} showPickingList preference to ${showPickingList}`);
    const [user] = await db
      .update(users)
      .set({ showPickingList, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return user;
  }

  async getChargeCodeAuthorizedUsers(chargeCode: string): Promise<ChargeCodeAuthorizedUser[]> {
    console.log(`📋 Fetching authorized users for charge code: ${chargeCode}`);
    const authorizedUsers = await db
      .select()
      .from(chargeCodeAuthorizedUsers)
      .where(eq(chargeCodeAuthorizedUsers.chargeCode, chargeCode))
      .orderBy(chargeCodeAuthorizedUsers.userName);
    return authorizedUsers;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getItems(page = 1, limit = 10, search?: string, categoryId?: number, searchMode?: 'name' | 'sku', includeInactive = false): Promise<{
    items: ItemWithCategory[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    console.debug('storage.getItems called with', { page, limit, search, categoryId, searchMode, includeInactive });

    // Only filter by isActive if not including inactive items
    let whereConditions: any = includeInactive ? undefined : eq(itemsTable.isActive, true);

    if (categoryId) {
      const categoryCondition = and(
        whereConditions,
        eq(itemsTable.categoryId, categoryId)
      );
      if (categoryCondition) whereConditions = categoryCondition;
    }

    // Note: Search by category name is handled in the query filter below
    // since we need to join with categories table first
    let searchFilter: any = undefined;
    if (search) {
      // Search based on the search mode
      if (searchMode === 'sku') {
        // Search only in SKU
        searchFilter = ilike(itemsTable.sku, `%${search}%`);
      } else if (searchMode === 'name') {
        // Search only in name
        searchFilter = ilike(itemsTable.name, `%${search}%`);
      } else {
        // Default: Search in name, SKU, and category name
        searchFilter = or(
          ilike(itemsTable.name, `%${search}%`),
          ilike(itemsTable.sku, `%${search}%`),
          ilike(categories.name, `%${search}%`)
        );
      }
    }

    // Build final where clause safely to avoid passing undefined into `and()`
    let whereClause: any = whereConditions;
    if (searchFilter) {
      whereClause = whereConditions ? and(whereConditions, searchFilter) : searchFilter;
    }

    const [itemsList, totalResult] = await Promise.all([
      db
        .select({
          id: itemsTable.id,
          name: itemsTable.name,
          sku: itemsTable.sku,
          description: itemsTable.description,
          categoryId: itemsTable.categoryId,
          price: itemsTable.price,
          vatRate: itemsTable.vatRate,
          vatIncluded: itemsTable.vatIncluded,
          currentStock: itemsTable.currentStock,
          minimumStock: itemsTable.minimumStock,
          unit: itemsTable.unit,
          location: itemsTable.location,
          isActive: itemsTable.isActive,
          createdBy: itemsTable.createdBy,
          updatedBy: itemsTable.updatedBy,
          createdAt: itemsTable.createdAt,
          updatedAt: itemsTable.updatedAt,
          category: {
            id: categories.id,
            name: categories.name,
            description: categories.description,
            icon: categories.icon,
            color: categories.color,
            createdAt: categories.createdAt,
            updatedAt: categories.updatedAt,
          },
          createdByUser: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
        })
        .from(itemsTable)
        .leftJoin(categories, eq(itemsTable.categoryId, categories.id))
        .leftJoin(users, eq(itemsTable.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(itemsTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(itemsTable)
        .leftJoin(categories, eq(itemsTable.categoryId, categories.id))
        .where(whereClause)
    ]);

    const formattedItems: ItemWithCategory[] = itemsList.map((item: any) => ({
      ...item,
      category: item.category!,
      createdBy: item.createdByUser!,
    }));

    return {
      items: formattedItems,
      total: totalResult[0].count,
    };
  }

  async getItem(id: number): Promise<ItemWithCategory | undefined> {
    const [item] = await db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        sku: itemsTable.sku,
        description: itemsTable.description,
        categoryId: itemsTable.categoryId,
        price: itemsTable.price,
        vatRate: itemsTable.vatRate,
        vatIncluded: itemsTable.vatIncluded,
        currentStock: itemsTable.currentStock,
        minimumStock: itemsTable.minimumStock,
        unit: itemsTable.unit,
        location: itemsTable.location,
        isActive: itemsTable.isActive,
        createdBy: itemsTable.createdBy,
        updatedBy: itemsTable.updatedBy,
        createdAt: itemsTable.createdAt,
        updatedAt: itemsTable.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          icon: categories.icon,
          color: categories.color,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        },
        createdByUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(itemsTable)
      .leftJoin(categories, eq(itemsTable.categoryId, categories.id))
      .leftJoin(users, eq(itemsTable.createdBy, users.id))
      .where(eq(itemsTable.id, id));

    if (!item) return undefined;

    return {
      ...item,
      category: item.category!,
      createdBy: item.createdBy, // Return the user ID, not the user object
    };
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db
      .insert(itemsTable)
      .values({
        ...item,
        notesId: item.notesId ?? undefined, // Ensure notesId is always handled properly
      })
      .returning();
    return newItem;
  }

  async updateItem(id: number, item: Partial<UpdateItem>, updatedBy: string | null): Promise<Item> {
    // Filter out fields that shouldn't be updated
    const { 
      id: _id, 
      createdAt: _createdAt, 
      createdBy: _createdBy, 
      updatedAt: _updatedAt,
      isActive: _isActive,
      lowStockAcknowledgedAt: _lowStockAcknowledgedAt,
      notesId: _notesId,
      ...updateData 
    } = item as any;
    
    const [updatedItem] = await db
      .update(itemsTable)
      .set({ ...updateData, updatedBy, updatedAt: new Date() })
      .where(eq(itemsTable.id, id))
      .returning();
    
    return updatedItem;
  }

  async deleteItem(id: number): Promise<void> {
    await db
      .update(itemsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(itemsTable.id, id));
  }

  async updateStock(itemId: number, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string, performedBy: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      const [currentItem] = await tx
        .select({ currentStock: itemsTable.currentStock })
        .from(itemsTable)
        .where(eq(itemsTable.id, itemId));

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Convert decimal string to number for calculations
      const currentStockNum = parseFloat(currentItem.currentStock.toString());

      let newStock: number;
      switch (type) {
        case 'in':
          newStock = currentStockNum + quantity;
          break;
        case 'out':
          newStock = currentStockNum - quantity;
          break;
        case 'adjustment':
          newStock = quantity;
          break;
        default:
          throw new Error('Invalid stock movement type');
      }

      if (newStock < 0) {
        throw new Error('Cannot have negative stock');
      }

      await tx
        .update(itemsTable)
        .set({ currentStock: newStock, updatedAt: new Date() })
        .where(eq(itemsTable.id, itemId));

      // Try to create stock movement record, but don't fail if the table doesn't exist
      try {
        await tx
          .insert(stockMovements)
          .values({
            itemId,
            type,
            quantity: type === 'out' ? -quantity : quantity,
            previousStock: currentStockNum,
            newStock,
            reason,
            performedBy,
          });
      } catch (error: any) {
        // Log warning if stock movements table doesn't exist or is unavailable
        // but don't fail the stock update operation
        if (error.code === 'RELATION_NOT_FOUND' || error.message?.includes('does not exist')) {
          console.warn(`Warning: Stock movements table unavailable - stock update for item ${itemId} succeeded but movement not logged`);
        } else {
          throw error;
        }
      }
    });
  }

  async getStockMovements(itemId?: number, limit = 50): Promise<StockMovementWithDetails[]> {
    let query = db
      .select({
        id: stockMovements.id,
        itemId: stockMovements.itemId,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        previousStock: stockMovements.previousStock,
        newStock: stockMovements.newStock,
        reason: stockMovements.reason,
        performedBy: stockMovements.performedBy,
        createdAt: stockMovements.createdAt,
        item: {
          id: itemsTable.id,
          name: itemsTable.name,
          sku: itemsTable.sku,
          description: itemsTable.description,
          categoryId: itemsTable.categoryId,
          price: itemsTable.price,
          currentStock: itemsTable.currentStock,
          minimumStock: itemsTable.minimumStock,
          isActive: itemsTable.isActive,
          createdBy: itemsTable.createdBy,
          updatedBy: itemsTable.updatedBy,
          createdAt: itemsTable.createdAt,
          updatedAt: itemsTable.updatedAt,
        },
        performedByUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(stockMovements)
      .leftJoin(itemsTable, eq(stockMovements.itemId, itemsTable.id))
      .leftJoin(users, eq(stockMovements.performedBy, users.id));

    if (itemId) {
      query = query.where(eq(stockMovements.itemId, itemId));
    }

    const movements = await query
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    return movements.map((movement: any) => ({
      ...movement,
      item: movement.item!,
      performedBy: movement.performedByUser!,
    }));
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    if (!supplier) return undefined;
  
    // Convert null values to undefined for consistency
    return {
      ...supplier,
      contact: supplier.contact === null ? undefined : supplier.contact,
      email: supplier.email === null ? undefined : supplier.email,
      phone: supplier.phone === null ? undefined : supplier.phone,
      address: supplier.address === null ? undefined : supplier.address,
      accountNumber: supplier.accountNumber === null ? undefined : supplier.accountNumber,
    } as Supplier;
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    // Check for duplicate supplier ID
    const existingSupplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierData.id)).limit(1);
    if (existingSupplier.length > 0) {
      throw new Error(`Supplier with ID '${supplierData.id}' already exists`);
    }
  
    // Clean up the data - convert empty strings to null for optional fields
    const cleanedData = {
      ...supplierData,
      contact: supplierData.contact?.trim() || null,
      email: supplierData.email?.trim() || null,
      phone: supplierData.phone?.trim() || null,
      address: supplierData.address?.trim() || null,
      accountNumber: supplierData.accountNumber?.trim() || null,
    };
  
    const [supplier] = await db.insert(suppliers).values(cleanedData).returning();
  
    // Convert null values to undefined for the response to match test expectations
    return {
      ...supplier,
      contact: supplier.contact === null ? undefined : supplier.contact,
      email: supplier.email === null ? undefined : supplier.email,
      phone: supplier.phone === null ? undefined : supplier.phone,
      address: supplier.address === null ? undefined : supplier.address,
      accountNumber: supplier.accountNumber === null ? undefined : supplier.accountNumber,
    } as Supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...supplierData, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Enhanced supplier operations with order history
  async getSuppliersWithOrderHistory(): Promise<Array<Supplier & { 
    orderCount: number; 
    totalOrderValue: number; 
    lastOrderDate: Date | null; 
    itemsSupplied: number;
  }>> {
    try {
      console.log('🔍 Starting getSuppliersWithOrderHistory query...');
      
      // First, check if we have any suppliers at all
      const supplierCount = await db.select({ count: sql<number>`COUNT(*)` }).from(suppliers);
      console.log(`📊 Found ${supplierCount[0]?.count || 0} suppliers in database`);
      
      // Check if orders table exists and has data
      try {
        const orderCount = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
        console.log(`📊 Found ${orderCount[0]?.count || 0} orders in database`);
        
        // If no orders exist, return suppliers with zero stats
        if (orderCount[0]?.count === 0) {
          console.log('📋 No orders found, returning suppliers with zero stats');
          const basicSuppliers = await this.getSuppliers();
          return basicSuppliers.map(supplier => ({
            ...supplier,
            orderCount: 0,
            totalOrderValue: 0,
            lastOrderDate: null,
            itemsSupplied: 0
          }));
        }
      } catch (orderTableError) {
        console.warn('⚠️ Orders table not accessible, falling back to basic suppliers:', orderTableError);
        const basicSuppliers = await this.getSuppliers();
        return basicSuppliers.map(supplier => ({
          ...supplier,
          orderCount: 0,
          totalOrderValue: 0,
          lastOrderDate: null,
          itemsSupplied: 0
        }));
      }
      
      // Get all suppliers with their order statistics
      // Note: We use a subquery for totalOrderValue to avoid double-counting when joining to order_items
      const suppliersWithStats = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          contact: suppliers.contact,
          email: suppliers.email,
          phone: suppliers.phone,
          address: suppliers.address,
          accountNumber: suppliers.accountNumber,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
          orderCount: sql<number>`COALESCE(COUNT(DISTINCT ${orders.id}), 0)`,
          totalOrderValue: sql<number>`COALESCE((
            SELECT SUM(o.total_amount)
            FROM ${orders} o
            WHERE o.supplier_id = ${suppliers.id}
          ), 0)`,
          lastOrderDate: sql<Date | null>`MAX(${orders.createdAt})`,
          itemsSupplied: sql<number>`COALESCE(COUNT(DISTINCT ${orderItems.itemSku}), 0)`,
        })
        .from(suppliers)
        .leftJoin(orders, eq(suppliers.id, orders.supplierId))
        .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
        .groupBy(suppliers.id, suppliers.name, suppliers.contact, suppliers.email, suppliers.phone, suppliers.address, suppliers.accountNumber, suppliers.createdAt, suppliers.updatedAt)
        .orderBy(suppliers.name);

      console.log(`✅ Query completed, returning ${suppliersWithStats.length} suppliers with history`);
      return suppliersWithStats;
      
    } catch (error) {
      console.error('❌ Error in getSuppliersWithOrderHistory:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Stack trace:', error.stack);
      }
      // Fallback to basic suppliers instead of throwing
      console.log('🔄 Falling back to basic supplier list...');
      const basicSuppliers = await this.getSuppliers();
      return basicSuppliers.map(supplier => ({
        ...supplier,
        orderCount: 0,
        totalOrderValue: 0,
        lastOrderDate: null,
        itemsSupplied: 0
      }));
    }
  }

  async getSupplierOrderHistory(supplierId: string): Promise<Array<Order & { 
    items: OrderItem[]; 
    creator: User; 
    receivedBy?: User;
  }>> {
    // Get all orders for this supplier with their items
    const supplierOrders = await db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        supplierId: orders.supplierId,
        status: orders.status,
        notesId: orders.notesId || null,
        totalAmount: orders.totalAmount,
        createdBy: orders.createdBy,
        receivedBy: orders.receivedBy,
        receivedAt: orders.receivedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        creator: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        receivedByUser: sql`${users.id}`,
      })
      .from(orders)
      .innerJoin(users, eq(orders.createdBy, users.id))
      .leftJoin(sql`${users} AS received_user`, sql`${orders.receivedBy} = received_user.id`)
      .where(eq(orders.supplierId, supplierId))
      .orderBy(desc(orders.createdAt));

    // Get items for each order
    const orderIds = supplierOrders.map((order: any) => order.id);
    const allOrderItems = orderIds.length > 0 ? await db
      .select()
      .from(orderItems)
      .where(sql`${orderItems.orderId} IN (${sql.join(orderIds.map((id: number) => sql`${id}`), sql`, `)})`)
      : [];

    // Group items by order
    const itemsByOrder = allOrderItems.reduce((acc: Record<number, OrderItem[]>, item: OrderItem) => {
      if (!acc[item.orderId]) acc[item.orderId] = [];
      acc[item.orderId].push(item);
      return acc;
    }, {} as Record<number, OrderItem[]>);

    return supplierOrders.map((order: any) => ({
      ...order,
      items: itemsByOrder[order.id] || [],
      receivedBy: order.receivedByUser ? {
        id: order.receivedByUser,
        email: '',
        firstName: '',
        lastName: '',
        role: 'user' as const,
        profileImageUrl: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
    }));
  }

  async getSuppliersByItem(itemNameOrSku: string): Promise<Array<Supplier & {
    unitCost?: string;
    lastOrderDate?: Date;
    orderCount: number;
    totalOrderValue: number;
    itemsSupplied: number;
  }>> {
    // Find suppliers who have ordered items matching the name or SKU
    // Include order statistics so vendor cards display correctly
    const suppliersForItem = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        contact: suppliers.contact,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
        unitCost: sql<string>`(SELECT oi2.unit_cost FROM order_items oi2 
          INNER JOIN orders o2 ON oi2.order_id = o2.id 
          INNER JOIN items i2 ON oi2.item_id = i2.id
          WHERE o2.supplier_id = ${suppliers.id} 
          AND (LOWER(i2.name) LIKE LOWER(${'%' + itemNameOrSku + '%'}) OR LOWER(i2.sku) LIKE LOWER(${'%' + itemNameOrSku + '%'}))
          ORDER BY o2.created_at DESC LIMIT 1)`,
        lastOrderDate: sql<Date>`MAX(${orders.createdAt})`,
        // Include order statistics for vendor cards
        orderCount: sql<number>`COALESCE((SELECT COUNT(DISTINCT o3.id) FROM orders o3 WHERE o3.supplier_id = ${suppliers.id}), 0)`,
        totalOrderValue: sql<number>`COALESCE((SELECT SUM(o4.total_amount) FROM orders o4 WHERE o4.supplier_id = ${suppliers.id}), 0)`,
        itemsSupplied: sql<number>`COALESCE((SELECT COUNT(DISTINCT oi5.item_sku) FROM order_items oi5 INNER JOIN orders o5 ON oi5.order_id = o5.id WHERE o5.supplier_id = ${suppliers.id}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .innerJoin(itemsTable, eq(orderItems.itemId, itemsTable.id))
      .where(
        or(
          ilike(itemsTable.name, `%${itemNameOrSku}%`),
          ilike(itemsTable.sku, `%${itemNameOrSku}%`)
        )
      )
      .groupBy(
        suppliers.id,
        suppliers.name,
        suppliers.contact,
        suppliers.email,
        suppliers.phone,
        suppliers.address,
        suppliers.createdAt,
        suppliers.updatedAt
      )
      .orderBy(desc(sql<Date>`MAX(${orders.createdAt})`));

    return suppliersForItem;
  }

  async getItemOrderHistory(itemId: number): Promise<Array<{
    orderId: number;
    orderDate: Date;
    supplier: { id: string; name: string } | null;
    quantity: number;
    unitCost: string;
    totalCost: string;
    vendorSku: string | null;
  }>> {
    // Get order history for a specific item
    const orderHistory = await db
      .select({
        orderId: orders.id,
        orderDate: orders.createdAt,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        quantity: orderItems.quantity,
        unitCost: orderItems.unitCost,
        totalCost: orderItems.totalCost,
        vendorSku: orderItems.vendorSku,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .where(eq(orderItems.itemId, itemId))
      .orderBy(desc(orders.createdAt));

    // Transform to return supplier as object instead of just name
    return orderHistory.map((row: any) => ({
      orderId: row.orderId,
      orderDate: row.orderDate,
      supplier: row.supplierId && row.supplierName ? { id: row.supplierId, name: row.supplierName } : null,
      quantity: row.quantity,
      unitCost: row.unitCost,
      totalCost: row.totalCost,
      vendorSku: row.vendorSku || null,
    }));
  }

  async getOrder(id: number): Promise<(Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }) | undefined> {
    // First get the order with basic info
    const [orderResult] = await db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        supplierId: orders.supplierId,
        status: orders.status,
        notesId: orders.notesId,
        totalAmount: orders.totalAmount,
        createdBy: orders.createdBy,
        receivedBy: orders.receivedBy,
        receivedAt: orders.receivedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        creator: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        supplier: {
          id: suppliers.id,
          name: suppliers.name,
          contact: suppliers.contact,
          email: suppliers.email,
          phone: suppliers.phone,
          address: suppliers.address,
        }
      })
      .from(orders)
      .innerJoin(users, eq(orders.createdBy, users.id))
      .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .where(eq(orders.id, id));

    if (!orderResult) return undefined;

    // Get order items separately
    const orderItemsResult = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        itemId: orderItems.itemId,
        itemName: orderItems.itemName,
        itemSku: orderItems.itemSku,
        itemDescription: orderItems.itemDescription,
        categoryId: orderItems.categoryId,
        quantity: orderItems.quantity,
        unitCost: orderItems.unitCost,
        totalCost: orderItems.totalCost,
        received: orderItems.received,
        receivedQuantity: orderItems.receivedQuantity,
        createdAt: orderItems.createdAt,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    // Get receivedBy user if exists
    let receivedByUser = undefined;
    if (orderResult.receivedBy) {
      const [receivedUser] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, orderResult.receivedBy));
      
      receivedByUser = receivedUser;
    }

    return {
      ...orderResult,
      items: orderItemsResult,
      supplier: orderResult.supplier.id ? orderResult.supplier : undefined,
      receivedBy: receivedByUser,
    };
  }

  async createOrder(orderData: Omit<InsertOrder, 'orderId'>, items: Array<{
    itemId?: number;
    itemName: string;
    itemSku: string;
    itemDescription?: string;
    categoryId?: number;
    unitCost: string;
    quantity: number;
    totalCost: string;
    received?: boolean;
    vendorSku?: string;
    vatRate?: number;
    vatAmount?: number;
  }>): Promise<Order> {
    // ATOMIC TRANSACTION: All operations must succeed or fail together
    return await db.transaction(async (tx: any) => {
      // Generate unique order ID
      const orderId = `ORD${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(Date.now()).slice(-4)}`;
      
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
      
      // Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          orderId,
          supplierId: orderData.supplierId,
          status: orderData.status || 'pending',
          notesId: orderData.notesId ?? undefined,
          totalAmount: totalAmount.toString(),
          vatRate: orderData.vatRate?.toString() || '0.2000',
          vatIncluded: orderData.vatIncluded ?? true,
          updateInventoryValues: orderData.updateInventoryValues ?? false,
          createdBy: orderData.createdBy,
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create order');
      }

      // Insert order items with extended fields - ALL MUST SUCCEED
      if (items.length === 0) {
        throw new Error('At least one item is required for an order');
      }

      const processedItems = await Promise.all(
        items.map(async (item) => {
          let actualItemId = null;
          
          // Try to find existing item by SKU or ID
          if (item.itemSku) {
            try {
              const allItems = await this.getItems(1, 1000, item.itemSku);
              const existingItem = allItems.items.find(i => i.sku === item.itemSku);
              if (existingItem) {
                actualItemId = existingItem.id;
              }
            } catch (error) {
              // Item doesn't exist, that's okay - we'll create a new reference
            }
          }
          
          return {
            orderId: order.id,
            itemId: actualItemId || undefined,
            itemName: item.itemName,
            itemSku: item.itemSku,
            vendorSku: item.vendorSku || undefined,
            itemDescription: item.itemDescription || undefined,
            categoryId: item.categoryId || undefined,
            unitCost: item.unitCost,
            quantity: item.quantity,
            totalCost: item.totalCost,
            vatRate: item.vatRate?.toString() || orderData.vatRate?.toString() || '0.2000',
            vatAmount: item.vatAmount?.toString() || '0.00',
            received: item.received || false,
          };
        })
      );

      // Insert items one at a time to avoid Drizzle ORM column inference issues with defaults
      const insertedItems = [];
      for (const item of processedItems) {
        const [inserted] = await tx
          .insert(orderItems)
          .values({
            orderId: item.orderId,
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            vendorSku: item.vendorSku,
            itemDescription: item.itemDescription,
            categoryId: item.categoryId,
            unitCost: item.unitCost,
            quantity: item.quantity,
            totalCost: item.totalCost,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
            received: item.received,
          })
          .returning();
        
        if (!inserted) {
          throw new Error('Failed to insert order item');
        }
        insertedItems.push(inserted);
      }

      if (insertedItems.length === 0) {
        throw new Error('Failed to insert order items');
      }

      // Fetch the complete order
      const createdOrder = await tx.select().from(orders).where(eq(orders.id, order.id));
      if (!createdOrder || createdOrder.length === 0) {
        throw new Error('Failed to retrieve created order');
      }

      return createdOrder[0];
    });
  }

  async deleteOrder(id: number): Promise<void> {
    // Delete order items first due to foreign key constraint
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    // Delete the order
    await db.delete(orders).where(eq(orders.id, id));
  }

  async createQuote(quoteData: Omit<InsertQuote, 'quoteId'>, items: Array<{
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: number;
    quantity: number;
    vatRate?: number;
    vatAmount?: number;
    subtotal?: number;
    totalWithVat?: number;
  }>): Promise<Quote & { items: QuoteItem[] }> {
    // Generate unique quote ID
    const quoteId = 'Q' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Set default expiry for draft quotes
    const expiresAt = quoteData.status === 'draft' ? 
      new Date(Date.now() + DRAFT_QUOTE_CONFIG.EXPIRY_MS) : 
      undefined;
    
    console.log('🔍 STORAGE: Creating quote with quoteName:', quoteData.quoteName);
    
    const [quote] = await db
      .insert(quotes)
      .values({
        quoteId,
        quoteName: quoteData.quoteName,
        chargeCode: quoteData.chargeCode,
        subtotalAmount: quoteData.subtotalAmount,
        vatAmount: quoteData.vatAmount,
        totalAmount: quoteData.totalAmount,
        vatApplied: quoteData.vatApplied,
        customerInfo: quoteData.customerInfo,
        notesId: quoteData.notesId ?? undefined, // Ensure notesId is always handled properly
        status: quoteData.status || 'draft',
        sessionId: (quoteData as any).sessionId,
        expiresAt,
        createdBy: quoteData.createdBy,
      })
      .returning();
    
    console.log('🔍 STORAGE: Quote created - ID:', quote.id, 'quoteId:', quote.quoteId, 'quoteName:', quote.quoteName);

    let insertedItems: QuoteItem[] = [];

    // Insert quote items
    if (items.length > 0) {
      const quoteItemsData = items.map(item => {
        const subtotal = item.subtotal ?? (item.unitPrice * item.quantity);
        const vatRate = item.vatRate ?? 0.20; // 20% VAT rate
        const vatAmount = item.vatAmount ?? (subtotal * vatRate);
        const totalWithVat = item.totalWithVat ?? (subtotal + vatAmount);
        
        return {
          quoteId: quote.id,
          itemId: item.itemId,
          itemName: item.itemName,
          itemSku: item.itemSku,
          unitPrice: item.unitPrice,
          vatRate: vatRate,
          vatAmount: vatAmount,
          quantity: item.quantity,
          subtotal: subtotal,
          totalWithVat: totalWithVat,
        };
      });
      await db.insert(quoteItems).values(quoteItemsData);
    }

    // Get the created quote items to return with the quote
    const createdItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quote.id));

    return {
      ...quote,
      items: createdItems
    };
  }

  async getQuotes(page?: number, limit?: number, status?: string, createdBy?: string): Promise<{
    quotes: Array<Quote & { items: QuoteItem[]; creator: User; processor?: User }>;
    total: number;
  }> {
    const offset = (page || 1) - 1;

    // Create aliases for different user joins
    const creatorUser = alias(users, 'creatorUser');
    const processorUser = alias(users, 'processorUser');

    let query = db
      .select({
        id: quotes.id,
        quoteId: quotes.quoteId,
        quoteName: quotes.quoteName,
        status: quotes.status,
        chargeCode: quotes.chargeCode,
        subtotalAmount: quotes.subtotalAmount,
        vatAmount: quotes.vatAmount,
        totalAmount: quotes.totalAmount,
        vatApplied: quotes.vatApplied,
        customerInfo: quotes.customerInfo,
        notesId: quotes.notesId,
        createdBy: quotes.createdBy,
        processedBy: quotes.processedBy,
        processedAt: quotes.processedAt,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        creator: {
          id: creatorUser.id,
          email: creatorUser.email,
          firstName: creatorUser.firstName,
          lastName: creatorUser.lastName,
          role: creatorUser.role,
          profileImageUrl: creatorUser.profileImageUrl,
          isActive: creatorUser.isActive,
          createdAt: creatorUser.createdAt,
          updatedAt: creatorUser.updatedAt,
        },
        processor: {
          id: processorUser.id,
          email: processorUser.email,
          firstName: processorUser.firstName,
          lastName: processorUser.lastName,
          role: processorUser.role,
          profileImageUrl: processorUser.profileImageUrl,
          isActive: processorUser.isActive,
          createdAt: processorUser.createdAt,
          updatedAt: processorUser.updatedAt,
        },
        items: {
          id: quoteItems.id,
          quoteId: quoteItems.quoteId,
          itemId: quoteItems.itemId,
          itemName: quoteItems.itemName,
          itemSku: quoteItems.itemSku,
          unitPrice: quoteItems.unitPrice,
          vatRate: quoteItems.vatRate,
          vatAmount: quoteItems.vatAmount,
          quantity: quoteItems.quantity,
          subtotal: quoteItems.subtotal,
          totalWithVat: quoteItems.totalWithVat,
        },
      })
      .from(quotes)
      .leftJoin(creatorUser, eq(quotes.createdBy, creatorUser.id))
      .leftJoin(processorUser, eq(quotes.processedBy, processorUser.id))
      .leftJoin(quoteItems, eq(quotes.id, quoteItems.quoteId))
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(quotes.status, status));
    }

    if (createdBy) {
      query = query.where(eq(quotes.createdBy, createdBy));
    }

    const [result, total] = await Promise.all([
      query,
      db
        .select({ count: count() })
        .from(quotes)
        .where(status ? eq(quotes.status, status) : undefined)
        .where(createdBy ? eq(quotes.createdBy, createdBy) : undefined),
    ]);

    // Group quotes by ID and collect their items
    const quotesMap = new Map();
    
    result.forEach((row: any) => {
      const quoteId = row.id;
      
      if (!quotesMap.has(quoteId)) {
        console.log('🔍 STORAGE getQuotes - processing quote ID:', quoteId, 'quoteName:', row.quoteName);
        quotesMap.set(quoteId, {
          id: row.id,
          quoteId: row.quoteId,
          quoteName: row.quoteName,
          status: row.status,
          chargeCode: row.chargeCode,
          subtotalAmount: row.subtotalAmount,
          vatAmount: row.vatAmount,
          totalAmount: row.totalAmount,
          vatApplied: row.vatApplied,
          customerInfo: row.customerInfo,
          notesId: row.notesId,
          createdBy: row.createdBy,
          processedBy: row.processedBy,
          processedAt: row.processedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
          creator: row.creator!,
          processor: row.processor!,
        });
      }
      
      // Add item to quote if it exists (not null from left join)
      if (row.items && row.items.id) {
        quotesMap.get(quoteId).items.push(row.items);
      }
    });
    
    return {
      quotes: Array.from(quotesMap.values()),
      total: total[0]?.count || 0,
    };
  }

  async getQuote(id: number): Promise<(Quote & { items: QuoteItem[]; creator: User; processor?: User }) | undefined> {
    // Create aliases for different user joins
    const creatorUser = alias(users, 'creatorUser');
    const processorUser = alias(users, 'processorUser');

    // First get the quote with user info
    const [quote] = await db
      .select({
        id: quotes.id,
        quoteId: quotes.quoteId,
        chargeCode: quotes.chargeCode,
        subtotalAmount: quotes.subtotalAmount,
        vatAmount: quotes.vatAmount,
        totalAmount: quotes.totalAmount,
        vatApplied: quotes.vatApplied,
        customerInfo: quotes.customerInfo,
        notesId: quotes.notesId,
        quoteName: quotes.quoteName,
        status: quotes.status,
        createdBy: quotes.createdBy,
        processedBy: quotes.processedBy,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        creator: {
          id: creatorUser.id,
          email: creatorUser.email,
          firstName: creatorUser.firstName,
          lastName: creatorUser.lastName,
          role: creatorUser.role,
          profileImageUrl: creatorUser.profileImageUrl,
          isActive: creatorUser.isActive,
          createdAt: creatorUser.createdAt,
          updatedAt: creatorUser.updatedAt,
        },
        processor: {
          id: processorUser.id,
          email: processorUser.email,
          firstName: processorUser.firstName,
          lastName: processorUser.lastName,
          role: processorUser.role,
          profileImageUrl: processorUser.profileImageUrl,
          isActive: processorUser.isActive,
          createdAt: processorUser.createdAt,
          updatedAt: processorUser.updatedAt,
        },
      })
      .from(quotes)
      .leftJoin(creatorUser, eq(quotes.createdBy, creatorUser.id))
      .leftJoin(processorUser, eq(quotes.processedBy, processorUser.id))
      .where(eq(quotes.id, id));

    if (!quote) return undefined;

    // Get quote items separately
    const items = await db
      .select({
        id: quoteItems.id,
        quoteId: quoteItems.quoteId,
        itemId: quoteItems.itemId,
        itemName: quoteItems.itemName,
        itemSku: quoteItems.itemSku,
        unitPrice: quoteItems.unitPrice,
        quantity: quoteItems.quantity,
        vatRate: quoteItems.vatRate,
        vatAmount: quoteItems.vatAmount,
        subtotal: quoteItems.subtotal,
        totalWithVat: quoteItems.totalWithVat,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id));

    return {
      ...quote,
      items: items || [],
      creator: quote.creator!,
      processor: quote.processor!,
    };
  }

  async updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({ ...quoteData, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async deleteQuote(id: number): Promise<void> {
    // Delete quote items first to avoid foreign key constraint errors
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    // Then delete the quote
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  async getSales(page?: number, limit?: number, chargeCode?: string, startDate?: Date, endDate?: Date, supplierId?: string): Promise<{
    sales: SaleWithDetails[];
    total: number;
  }> {
    const offset = page && limit ? (page - 1) * limit : 0;

    let query = db
      .select({
        id: sales.id,
        saleId: sales.saleId,
        chargeCode: sales.chargeCode,
        subtotalAmount: sales.subtotalAmount,
        vatAmount: sales.vatAmount,
        totalAmount: sales.totalAmount,
        vatApplied: sales.vatApplied,
        customerInfo: sales.customerInfo,
        notesId: sales.notesId || null,
        status: sales.status,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
        deliveredTo: sales.deliveredTo,
        deliveredToEmail: sales.deliveredToEmail,
        deliveredAt: sales.deliveredAt,
        processedBy: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          mustChangePassword: users.mustChangePassword,
          lastLogin: users.lastLogin,
          password_hash: users.password_hash,
        },
      })
      .from(sales)
      .leftJoin(users, eq(sales.processedBy, users.id))
      .orderBy(desc(sales.createdAt));

    let countQuery = db.select({ count: count() }).from(sales);

    // Apply filters
    const conditions: any[] = [];
    
    if (chargeCode) {
      conditions.push(ilike(sales.chargeCode, `%${chargeCode}%`));
    }
    
    if (startDate) {
      conditions.push(sql`${sales.createdAt} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${sales.createdAt} <= ${endDate}`);
    }

    if (supplierId) {
      // Filter to sales which have at least one saleItem whose item was actually
      // supplied by this supplier according to historical received orders.
      // We infer supplier->item links from `order_items` joined with `orders` (status='received').
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${saleItems} si
        WHERE si.sale_id = ${sales.id}
          AND si.item_id IN (
            SELECT oi.item_id FROM ${orderItems} oi
            INNER JOIN ${orders} o ON oi.order_id = o.id
            WHERE o.supplier_id = ${supplierId}
              AND o.status = 'received'
              AND oi.item_id IS NOT NULL
          )
      )`);
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    if (limit) {
      query = query.limit(limit);
      if (offset) {
        query = query.offset(offset);
      }
    }

    const [salesResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    // Get sale items for each sale
    // vatIncluded is now stored as a snapshot in saleItems, no need to JOIN
    const salesWithItems = await Promise.all(
      salesResult.map(async (sale: any) => {
        const saleItemsData = await db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, sale.id));

        return {
          id: sale.id,
          saleId: sale.saleId,
          chargeCode: sale.chargeCode,
          subtotalAmount: sale.subtotalAmount,
          vatAmount: sale.vatAmount,
          totalAmount: sale.totalAmount,
          vatApplied: sale.vatApplied,
          customerInfo: sale.customerInfo,
          notesId: sale.notesId || null,
          status: sale.status,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          deliveredTo: sale.deliveredTo,
          deliveredToEmail: sale.deliveredToEmail,
          deliveredAt: sale.deliveredAt,
          processedBy: sale.processedBy,
          items: saleItemsData,
        };
      })
    );

    return {
      sales: salesWithItems,
      total: totalResult[0]?.count || 0,
    };
  }

  /**
   * Get ALL sales matching filters (no pagination) for export purposes
   * This fetches complete result set without limits for accurate exports
   */
  async getSalesForExport(chargeCode?: string, startDate?: Date, endDate?: Date, supplierId?: string): Promise<SaleWithDetails[]> {
    let query = db
      .select({
        id: sales.id,
        saleId: sales.saleId,
        chargeCode: sales.chargeCode,
        subtotalAmount: sales.subtotalAmount,
        vatAmount: sales.vatAmount,
        totalAmount: sales.totalAmount,
        vatApplied: sales.vatApplied,
        customerInfo: sales.customerInfo,
        notesId: sales.notesId || null,
        status: sales.status,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
        deliveredTo: sales.deliveredTo,
        deliveredToEmail: sales.deliveredToEmail,
        deliveredAt: sales.deliveredAt,
        processedBy: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          mustChangePassword: users.mustChangePassword,
          lastLogin: users.lastLogin,
          password_hash: users.password_hash,
        },
      })
      .from(sales)
      .leftJoin(users, eq(sales.processedBy, users.id))
      .orderBy(desc(sales.createdAt));

    const conditions: any[] = [];
    
    if (chargeCode) {
      conditions.push(ilike(sales.chargeCode, `%${chargeCode}%`));
    }
    
    if (startDate) {
      conditions.push(sql`${sales.createdAt} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${sales.createdAt} <= ${endDate}`);
    }

    if (supplierId) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${saleItems} si
        WHERE si.sale_id = ${sales.id}
          AND si.item_id IN (
            SELECT oi.item_id FROM ${orderItems} oi
            INNER JOIN ${orders} o ON oi.order_id = o.id
            WHERE o.supplier_id = ${supplierId}
              AND o.status = 'received'
              AND oi.item_id IS NOT NULL
          )
      )`);
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
    }

    const salesResult = await query;

    // vatIncluded is now stored as a snapshot in saleItems, no need to JOIN
    const salesWithItems = await Promise.all(
      salesResult.map(async (sale: any) => {
        const saleItemsData = await db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, sale.id));

        return {
          id: sale.id,
          saleId: sale.saleId,
          chargeCode: sale.chargeCode,
          subtotalAmount: sale.subtotalAmount,
          vatAmount: sale.vatAmount,
          totalAmount: sale.totalAmount,
          vatApplied: sale.vatApplied,
          customerInfo: sale.customerInfo,
          notesId: sale.notesId || null,
          status: sale.status,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          deliveredTo: sale.deliveredTo,
          deliveredToEmail: sale.deliveredToEmail,
          deliveredAt: sale.deliveredAt,
          processedBy: sale.processedBy,
          items: saleItemsData,
        };
      })
    );

    return salesWithItems;
  }

  async getSalesByChargeCode(startDate?: Date, endDate?: Date): Promise<Array<{
    chargeCode: string;
    sales: SaleWithDetails[];
    total: number;
  }>> {
    let query = db
      .select({
        chargeCode: sales.chargeCode,
      })
      .from(sales)
      .groupBy(sales.chargeCode)
      .orderBy(sales.chargeCode);

    // Apply date filters
    const conditions: any[] = [];
    
    if (startDate) {
      conditions.push(sql`${sales.createdAt} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${sales.createdAt} <= ${endDate}`);
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
    }

    const chargeCodesResult = await query;

    // Get sales for each charge code
    const result = await Promise.all(
      chargeCodesResult.map(async ({ chargeCode }: any) => {
        const { sales: chargeSales, total } = await this.getSales(
          undefined, // no pagination
          undefined,
          chargeCode,
          startDate,
          endDate
        );

        return {
          chargeCode,
          sales: chargeSales,
          total,
        };
      })
    );

    return result;
  }

  async countSalesByChargeCode(chargeCode: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.chargeCode, chargeCode));
    
    return result[0]?.count || 0;
  }

  async processQuote(id: number, processedBy: string, processDate?: Date): Promise<Sale> {
    const quote = await this.getQuote(id);
    if (!quote) throw new Error('Quote not found');

    // Validate charge code before processing
    if (!quote.chargeCode || quote.chargeCode.trim() === '') {
      throw new Error('Quote is missing a charge code. Please edit the quote and add a valid charge code before processing.');
    }

    const chargeCodeRecord = await this.getChargeCode(quote.chargeCode.trim());
    if (!chargeCodeRecord) {
      // Fetch available charge codes to help user
      const availableCodes = await db
        .select({ code: chargecodes.code })
        .from(chargecodes)
        .limit(10);
      const codeList = availableCodes.map((c: { code: string }) => c.code).join(', ');
      throw new Error(`Invalid charge code: '${quote.chargeCode}' does not exist. Available codes include: ${codeList}`);
    }

    // Check if charge code is expired
    if (chargeCodeRecord.validUntil && new Date(chargeCodeRecord.validUntil) < new Date()) {
      throw new Error(`Charge code '${quote.chargeCode}' has expired on ${new Date(chargeCodeRecord.validUntil).toLocaleDateString()}.`);
    }

    // Check if charge code is not yet valid
    if (chargeCodeRecord.validFrom && new Date(chargeCodeRecord.validFrom) > new Date()) {
      throw new Error(`Charge code '${quote.chargeCode}' is not yet valid until ${new Date(chargeCodeRecord.validFrom).toLocaleDateString()}.`);
    }

    // Check for charge code exclusions
    const excludedCategoryIds = await this.getChargeCodeExclusions(quote.chargeCode.trim());
    if (excludedCategoryIds.length > 0) {
      // Check if any items belong to excluded categories
      const excludedItems = quote.items.filter(item => {
        const dbItem = quote.items.find(i => i.itemId === item.itemId);
        return dbItem && excludedCategoryIds.includes(item.itemId);
      });

      if (excludedItems.length > 0) {
        throw new Error(`Charge code '${quote.chargeCode}' cannot be used for some items in this quote due to category restrictions.`);
      }
    }

    // ATOMIC TRANSACTION: All operations must succeed or fail together
    return await db.transaction(async (tx: any) => {
      console.log(`🔄 Starting atomic quote-to-sale conversion for quote ${id}`);
      
      // Step 1: Create sale from quote data
      // Generate unique sale ID
      const saleId = `S${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
      
      const saleData = {
        saleId: saleId,
        chargeCode: quote.chargeCode,
        subtotalAmount: quote.subtotalAmount,
        vatAmount: quote.vatAmount,
        totalAmount: quote.totalAmount,
        vatApplied: quote.vatApplied,
        customerInfo: quote.customerInfo,
        notesId: quote.notesId,
        status: 'completed' as const,
        processedBy: processedBy,
        ...(processDate ? { createdAt: processDate } : {}),
      };

      const [sale] = await tx
        .insert(sales)
        .values(saleData)
        .returning();
      
      console.log(`✅ Step 1: Created sale record with ID ${sale.id}`);

      // Step 2: Insert sale items
      const saleItemsData = quote.items.map(item => ({
        saleId: sale.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        subtotal: item.subtotal,
        totalWithVat: item.totalWithVat,
      }));

      await tx.insert(saleItems).values(saleItemsData);
      console.log(`✅ Step 2: Created ${saleItemsData.length} sale item records`);

      // Step 3: Reduce inventory stock for each item
      for (const item of quote.items) {
        // Get current stock within transaction
        const [currentItem] = await tx
          .select({ currentStock: itemsTable.currentStock })
          .from(itemsTable)
          .where(eq(itemsTable.id, item.itemId));
        
        if (!currentItem) {
          throw new Error(`Item ${item.itemId} not found`);
        }

        const currentStockNum = parseFloat(currentItem.currentStock.toString());
        const quantityNum = parseFloat(item.quantity.toString());

        if (currentStockNum < quantityNum) {
          throw new Error(`Insufficient stock for item ${item.itemName}. Available: ${currentStockNum}, Required: ${quantityNum}`);
        }

        const newStock = currentStockNum - quantityNum;

        // Reduce stock atomically
        await tx
          .update(itemsTable)
          .set({
            currentStock: newStock.toString(),
            updatedAt: new Date()
          })
          .where(eq(itemsTable.id, item.itemId));

        console.log(`✅ Step 3: Reduced stock for ${item.itemName} by ${quantityNum} (${currentStockNum} → ${newStock})`);
      }

      // Step 4a: Delete quote_items first (foreign key constraint)
      await tx
        .delete(quoteItems)
        .where(eq(quoteItems.quoteId, id));
      
      console.log(`✅ Step 4a: Deleted quote items for quote ${id}`);
      
      // Step 4b: REMOVE quote from quotes table (not just mark as processed)
      const deletedQuotes = await tx
        .delete(quotes)
        .where(eq(quotes.id, id))
        .returning();
      
      if (deletedQuotes.length === 0) {
        throw new Error(`Failed to remove quote ${id} from quotes table`);
      }
      
      console.log(`✅ Step 4b: Removed quote ${id} from quotes table`);
      console.log(`🎉 Atomic quote-to-sale conversion completed successfully`);

      return sale;
    });
  }

  // Draft quote operations
  async getCurrentDraftQuote(userId: string, sessionId?: string): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
    // If sessionId provided, look for session-specific draft first
    if (sessionId) {
      const sessionDrafts = await db
        .select()
        .from(quotes)
        .where(and(
          eq(quotes.createdBy, userId),
          eq(quotes.sessionId, sessionId),
          eq(quotes.status, 'draft'),
          sql`${quotes.expiresAt} > NOW()` // Not expired
        ))
        .orderBy(desc(quotes.lastAccessedAt))
        .limit(1);

      if (sessionDrafts.length > 0) {
        const quote = sessionDrafts[0];
        const items = await db
          .select()
          .from(quoteItems)
          .where(eq(quoteItems.quoteId, quote.id));
        
        return { ...quote, items };
      }

      // Check for recent drafts from other sessions for migration
      const recentDrafts = await db
        .select()
        .from(quotes)
        .where(and(
          eq(quotes.createdBy, userId),
          eq(quotes.status, 'draft'),
          sql`${quotes.lastAccessedAt} > NOW() - INTERVAL '24 hours'`
        ))
        .orderBy(desc(quotes.lastAccessedAt))
        .limit(1);

      if (recentDrafts.length > 0) {
        // Migrate most recent draft to current session
        const migratedQuote = await this.migrateDraftToSession(userId, sessionId);
        return migratedQuote;
      }

      // No session-specific or migrable quote found, return undefined to allow creation of new session-scoped quote
      return undefined;
    }

    // If no sessionId provided (backward compatibility), look for global draft quote
    // This handles tests and legacy code that don't use sessions
    const draftQuotes = await db
      .select()
      .from(quotes)
      .where(and(
        eq(quotes.createdBy, userId),
        eq(quotes.status, 'draft'),
        // Prefer quotes without sessionId (global quotes) for backward compatibility
        isNull(quotes.sessionId)
      ))
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (draftQuotes.length > 0) {
      const quote = draftQuotes[0];
      const items = await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quote.id));

      return { ...quote, items };
    }

    // If no global quote found, check for any draft quote (including session-scoped ones)
    // This ensures tests don't break when there are only session-scoped quotes
    const anyDraftQuotes = await db
      .select()
      .from(quotes)
      .where(and(
        eq(quotes.createdBy, userId),
        eq(quotes.status, 'draft')
      ))
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    if (anyDraftQuotes.length > 0) {
      const quote = anyDraftQuotes[0];
      const items = await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quote.id));

      return { ...quote, items };
    }

    return undefined;
  }

  async addItemToDraftQuote(quoteId: number, item: {
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: number;
    quantity: number;
    vatRate: number;
    vatAmount: number;
    subtotal: number;
    totalWithVat: number;
  }): Promise<Quote & { items: QuoteItem[] }> {
    return await db.transaction(async (tx: any) => {
      // Check if item already exists in quote
      const existingItems = await tx
        .select()
        .from(quoteItems)
        .where(and(
          eq(quoteItems.quoteId, quoteId),
          eq(quoteItems.itemId, item.itemId)
        ));

      if (existingItems.length > 0) {
        // Update existing item quantity
        await tx
          .update(quoteItems)
          .set({
            quantity: item.quantity,
            vatAmount: item.vatAmount.toString(),
            subtotal: item.subtotal.toString(),
            totalWithVat: item.totalWithVat.toString()
          })
          .where(and(
            eq(quoteItems.quoteId, quoteId),
            eq(quoteItems.itemId, item.itemId)
          ));
      } else {
        // Add new item to quote
        await tx.insert(quoteItems).values({
          quoteId,
          itemId: item.itemId,
          itemName: item.itemName,
          itemSku: item.itemSku,
          unitPrice: item.unitPrice.toString(),
          quantity: item.quantity,
          vatRate: item.vatRate.toString(),
          vatAmount: item.vatAmount.toString(),
          subtotal: item.subtotal.toString(),
          totalWithVat: item.totalWithVat.toString()
        });
      }

      // Recalculate quote totals
      const allItems = await tx
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));

      const subtotalAmount = allItems.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
      const vatAmount = allItems.reduce((sum: number, item: any) => sum + parseFloat(item.vatAmount), 0);
      const totalAmount = allItems.reduce((sum: number, item: any) => sum + parseFloat(item.totalWithVat), 0);

      // Update quote totals
      const [updatedQuote] = await tx
        .update(quotes)
        .set({
          subtotalAmount: subtotalAmount.toString(),
          vatAmount: vatAmount.toString(),
          totalAmount: totalAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      return {
        ...updatedQuote,
        items: allItems
      };
    });
  }

  async updateDraftQuoteChargeCode(quoteId: number, chargeCode: string): Promise<Quote & { items: QuoteItem[] }> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({
        chargeCode,
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId))
      .returning();

    // Get quote items
    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    return {
      ...updatedQuote,
      items
    };
  }

  async deleteDraftQuote(quoteId: number): Promise<void> {
    await db.transaction(async (tx: any) => {
      // Delete quote items first (foreign key constraint)
      await tx
        .delete(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));

      // Delete the quote
      await tx
        .delete(quotes)
        .where(eq(quotes.id, quoteId));
    });
  }

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await db
      .update(orders)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  // Missing method implementations - TODO: Implement properly
  async createSale(
    saleData: any, 
    items: Array<{
      itemId: number;
      itemName: string;
      itemSku: string;
      unitPrice: number;
      quantity: number;
      vatRate: number;
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>,
    processedBy: string,
    processDate?: Date
  ): Promise<Sale> {
    // Generate unique sale ID
    const saleId = `S${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
    
    // Properly handle customerInfo - can be a string or object
    let customerInfoJson = null;
    if (saleData.customerInfo) {
      customerInfoJson = typeof saleData.customerInfo === 'string' 
        ? saleData.customerInfo 
        : JSON.stringify(saleData.customerInfo);
    } else if (saleData.customerNotes) {
      customerInfoJson = JSON.stringify({ notes: saleData.customerNotes });
    } else if (saleData.customerName || saleData.customerEmail) {
      customerInfoJson = JSON.stringify({
        name: saleData.customerName,
        email: saleData.customerEmail
      });
    }
    
    const [sale] = await db
      .insert(sales)
      .values({
        saleId,
        chargeCode: saleData.chargeCode,
        subtotalAmount: saleData.subtotalAmount || saleData.subtotal || '0.00',
        vatAmount: saleData.vatAmount || '0.00',
        totalAmount: saleData.totalAmount || '0.00',
        vatApplied: saleData.vatApplied !== undefined ? saleData.vatApplied : true,
        customerInfo: customerInfoJson,
        notesId: saleData.notesId || null,
        status: saleData.status || (saleData.isPaid ? 'paid' : 'completed'),
        processedBy: processedBy, // FIX: Use the actual processedBy parameter!
        createdAt: processDate || new Date() // Use custom date if provided
      })
      .returning();

    const saleItemsData = items.map(item => ({
      saleId: sale.id,
      itemId: item.itemId,
      itemName: item.itemName,
      itemSku: item.itemSku,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      vatRate: item.vatRate.toString(),
      vatAmount: item.vatAmount.toString(),
      subtotal: item.subtotal.toString(),
      totalWithVat: item.totalWithVat.toString(),
    }));

    await db.insert(saleItems).values(saleItemsData);
    
    console.log(`✅ Sale created: ${saleId} by user ${processedBy} with status ${saleData.status || 'completed'}`);
    
    return sale;
  }

  /**
   * Creates a sale AND reduces stock atomically in a single transaction.
   * This ensures that either both operations succeed or both fail - preventing
   * data inconsistency where stock is reduced but sale is not recorded (or vice versa).
   */
  async createSaleWithStockUpdate(
    saleData: any,
    items: Array<{
      itemId: number;
      itemName: string;
      itemSku: string;
      unitPrice: number;
      quantity: number;
      vatRate: number;
      vatIncluded: boolean; // Required: snapshot of whether price included VAT
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>,
    processedBy: string,
    processDate?: Date
  ): Promise<Sale> {
    // Generate unique sale ID
    const saleId = `S${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    // Properly handle customerInfo - can be a string or object
    let customerInfoJson = null;
    if (saleData.customerInfo) {
      customerInfoJson = typeof saleData.customerInfo === 'string'
        ? saleData.customerInfo
        : JSON.stringify(saleData.customerInfo);
    } else if (saleData.customerNotes) {
      customerInfoJson = JSON.stringify({ notes: saleData.customerNotes });
    } else if (saleData.customerName || saleData.customerEmail) {
      customerInfoJson = JSON.stringify({
        name: saleData.customerName,
        email: saleData.customerEmail
      });
    }

    // ATOMIC TRANSACTION: All operations must succeed or fail together
    return await db.transaction(async (tx: any) => {
      console.log(`🔄 Starting atomic sale creation with stock update for ${items.length} items`);

      // Step 1: Validate stock availability for all items BEFORE any changes
      for (const item of items) {
        const [currentItem] = await tx
          .select({ currentStock: itemsTable.currentStock })
          .from(itemsTable)
          .where(eq(itemsTable.id, item.itemId));

        if (!currentItem) {
          throw new Error(`Item ${item.itemId} (${item.itemName}) not found`);
        }

        const currentStockNum = parseFloat(currentItem.currentStock.toString());
        const quantityNum = parseFloat(item.quantity.toString());

        if (currentStockNum < quantityNum) {
          throw new Error(`Insufficient stock for item ${item.itemName}. Available: ${currentStockNum}, Required: ${quantityNum}`);
        }
      }

      // Step 2: Create sale record
      const [sale] = await tx
        .insert(sales)
        .values({
          saleId,
          chargeCode: saleData.chargeCode,
          subtotalAmount: saleData.subtotalAmount || saleData.subtotal || '0.00',
          vatAmount: saleData.vatAmount || '0.00',
          totalAmount: saleData.totalAmount || '0.00',
          vatApplied: saleData.vatApplied !== undefined ? saleData.vatApplied : true,
          customerInfo: customerInfoJson,
          notesId: saleData.notesId || null,
          status: saleData.status || 'completed',
          processedBy: processedBy,
          deliveredTo: saleData.deliveredTo || null,
          deliveredToEmail: saleData.deliveredToEmail || null,
          deliveredAt: saleData.deliveredTo ? new Date() : null,
          createdAt: processDate || new Date()
        })
        .returning();

      console.log(`✅ Step 1: Created sale record with ID ${sale.id}, saleId: ${saleId}`);

      // Step 3: Create sale items with VAT included flag snapshot
      const saleItemsData = items.map(item => ({
        saleId: sale.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        vatRate: item.vatRate.toString(),
        vatIncluded: item.vatIncluded, // Snapshot at time of sale
        vatAmount: item.vatAmount.toString(),
        subtotal: item.subtotal.toString(),
        totalWithVat: item.totalWithVat.toString(),
      }));

      await tx.insert(saleItems).values(saleItemsData);
      console.log(`✅ Step 2: Created ${saleItemsData.length} sale item records`);

      // Step 4: Reduce stock for each item and create stock movement records
      for (const item of items) {
        const [currentItem] = await tx
          .select({ currentStock: itemsTable.currentStock })
          .from(itemsTable)
          .where(eq(itemsTable.id, item.itemId));

        const currentStockNum = parseFloat(currentItem.currentStock.toString());
        const quantityNum = parseFloat(item.quantity.toString());
        const newStock = currentStockNum - quantityNum;

        // Reduce stock atomically
        await tx
          .update(itemsTable)
          .set({
            currentStock: newStock.toString(),
            updatedAt: new Date()
          })
          .where(eq(itemsTable.id, item.itemId));

        // Create stock movement record for audit trail
        await tx
          .insert(stockMovements)
          .values({
            itemId: item.itemId,
            type: 'out',
            quantity: -quantityNum,
            previousStock: currentStockNum,
            newStock: newStock,
            reason: `Sale ${saleId} - ${saleData.chargeCode}`,
            performedBy: processedBy,
          });

        console.log(`✅ Step 3: Reduced stock for ${item.itemName} by ${quantityNum} (${currentStockNum} → ${newStock})`);
      }

      console.log(`🎉 Atomic sale creation completed successfully: ${saleId}`);
      return sale;
    });
  }

  async markSaleAsPaid(saleId: number): Promise<Sale> {
    const [sale] = await db
      .update(sales)
      .set({ 
        status: 'paid', 
        isPaid: true, 
        updatedAt: new Date() 
      })
      .where(eq(sales.id, saleId))
      .returning();
    
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }
    
    return sale;
  }

  async markSaleAsUnpaid(saleId: number): Promise<Sale> {
    const [sale] = await db
      .update(sales)
      .set({
        status: 'completed',
        isPaid: false,
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();

    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }

    return sale;
  }

  async setSaleRecipient(saleId: number, deliveredTo: string, deliveredToEmail?: string): Promise<Sale> {
    console.log(`📦 Setting recipient for sale ${saleId}: ${deliveredTo}`);
    const [sale] = await db
      .update(sales)
      .set({
        deliveredTo,
        deliveredToEmail: deliveredToEmail || null,
        deliveredAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();

    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }

    return sale;
  }

  async getSale(saleId: number): Promise<any> {
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId));

    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }

    // Get the sale items
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    return {
      ...sale,
      items
    };
  }

  async updateSaleItemQuantity(saleId: number, itemId: number, newQuantity: number): Promise<void> {
    await db
      .update(saleItems)
      .set({
        quantity: newQuantity.toString(),
        updatedAt: new Date()
      })
      .where(and(
        eq(saleItems.saleId, saleId),
        eq(saleItems.itemId, itemId)
      ));
  }

  async recalculateSaleTotals(saleId: number): Promise<void> {
    // Get all items for this sale
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    // Sum the pre-calculated totals from sale items
    // These values were correctly calculated at sale time with proper vatIncluded handling
    let subtotalAmount = 0;
    let vatAmount = 0;
    let totalAmount = 0;

    for (const item of items) {
      // Use the pre-stored VAT calculations from sale creation
      subtotalAmount += parseFloat(item.subtotal || '0');
      vatAmount += parseFloat(item.vatAmount || '0');
      totalAmount += parseFloat(item.totalWithVat || '0');
    }

    // Update the sale with new totals
    await db
      .update(sales)
      .set({
        subtotalAmount: subtotalAmount.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId));
  }

  async getOrders(page?: number, limit?: number, status?: string, supplierId?: string): Promise<{
    orders: Array<Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }>;
    total: number;
  }> {
    try {
      const offset = page && limit ? (page - 1) * limit : 0;
      const queryLimit = limit || 100;

      // Build the base query
      let query = db
        .select({
          order: orders,
          supplier: suppliers,
          creator: users,
          receivedByUser: {
            id: sql`${users.id}`.as('received_by_id'),
            email: sql`${users.email}`.as('received_by_email'),
            firstName: sql`${users.firstName}`.as('received_by_first_name'),
            lastName: sql`${users.lastName}`.as('received_by_last_name'),
          },
        })
        .from(orders)
        .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
        .leftJoin(users, eq(orders.createdBy, users.id))
        .leftJoin(sql`${users} AS received_by_user`, eq(orders.receivedBy, sql`received_by_user.id`))
        .orderBy(desc(orders.createdAt))
        .limit(queryLimit)
        .offset(offset);

      // Add filters
      if (status) {
        query = query.where(eq(orders.status, status));
      }
      
      if (supplierId) {
        query = query.where(eq(orders.supplierId, supplierId));
      }

      const results = await query;

      // Get total count
      let countQuery = db.select({ count: sql`count(*)`.as('count') }).from(orders);
      if (status) {
        countQuery = countQuery.where(eq(orders.status, status));
      }
      if (supplierId) {
        countQuery = countQuery.where(eq(orders.supplierId, supplierId));
      }
      
      const totalResult = await countQuery;
      const total = parseInt(totalResult[0]?.count as string) || 0;

      // For each order, get its items
      const ordersWithItems = await Promise.all(
        results.map(async (result: any) => {
          const items = await db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              itemId: orderItems.itemId,
              itemName: orderItems.itemName,
              itemSku: orderItems.itemSku,
              itemDescription: orderItems.itemDescription,
              categoryId: orderItems.categoryId,
              quantity: orderItems.quantity,
              unitCost: orderItems.unitCost,
              totalCost: orderItems.totalCost,
              received: orderItems.received,
              receivedQuantity: orderItems.receivedQuantity,
              createdAt: orderItems.createdAt,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, result.order.id));

          return {
            ...result.order,
            items: items,
            supplier: result.supplier,
            creator: result.creator,
            receivedBy: result.receivedByUser?.id ? {
              id: result.receivedByUser.id,
              email: result.receivedByUser.email,
              firstName: result.receivedByUser.firstName,
              lastName: result.receivedByUser.lastName,
            } : undefined,
          };
        })
      );

      return {
        orders: ordersWithItems,
        total,
      };
    } catch (error) {
      console.error('Error in getOrders:', error);
      // Return empty result on error to prevent crashes
      return { orders: [], total: 0 };
    }
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async receiveOrder(id: number, receivedBy: string, receivedItems: Array<{
    orderItemId: number;
    receivedQuantity: number;
    addToInventory?: boolean;
  }>): Promise<Order> {
    // Get the order to check updateInventoryValues flag
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) throw new Error('Order not found');

    // Get all order items for this order
    const allOrderItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

    // Process each received item
    for (const receivedItem of receivedItems) {
      // Get the order item
      const [orderItem] = await db.select().from(orderItems).where(eq(orderItems.id, receivedItem.orderItemId));
      if (!orderItem) continue;

      // Calculate new received quantity
      const prevReceived = parseFloat(orderItem.receivedQuantity?.toString() || '0');
      const newReceived = prevReceived + parseFloat(receivedItem.receivedQuantity.toString());
      const orderQuantity = parseFloat(orderItem.quantity.toString());

      // Update order item receivedQuantity
      await db.update(orderItems)
        .set({ receivedQuantity: newReceived, received: newReceived >= orderQuantity })
        .where(eq(orderItems.id, receivedItem.orderItemId));

      // If addToInventory is true AND order has updateInventoryValues enabled, update inventory
      if (receivedItem.addToInventory && order.updateInventoryValues && receivedItem.receivedQuantity > 0 && orderItem.itemId) {
        // Get current inventory item
        const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, orderItem.itemId));
        if (item) {
          const previousStock = parseFloat(item.currentStock.toString());
          const receivedQty = parseFloat(receivedItem.receivedQuantity.toString());
          const newStock = previousStock + receivedQty;

          // Calculate weighted average price update
          const currentPrice = parseFloat(item.price.toString());
          let orderUnitCost = parseFloat(orderItem.unitCost.toString());

          // Convert order unit cost to match item's VAT treatment
          const orderVatIncluded = order.vatIncluded;
          const itemVatIncluded = item.vatIncluded;
          const vatRate = parseFloat(orderItem.vatRate?.toString() || order.vatRate?.toString() || '0.20');

          if (orderVatIncluded !== itemVatIncluded) {
            if (orderVatIncluded && !itemVatIncluded) {
              // Order cost includes VAT, item price excludes VAT - remove VAT from order cost
              orderUnitCost = orderUnitCost / (1 + vatRate);
            } else if (!orderVatIncluded && itemVatIncluded) {
              // Order cost excludes VAT, item price includes VAT - add VAT to order cost
              orderUnitCost = orderUnitCost * (1 + vatRate);
            }
          }

          // Only update price if order has a valid cost
          let newPrice = currentPrice;
          if (orderUnitCost > 0) {
            // Weighted average: (currentValue + incomingValue) / totalQuantity
            const currentValue = currentPrice * previousStock;
            const incomingValue = orderUnitCost * receivedQty;
            if (newStock > 0) {
              newPrice = (currentValue + incomingValue) / newStock;
            } else {
              newPrice = orderUnitCost; // If no stock, use the incoming cost
            }
          }

          // Update item stock and price (weighted average)
          await db.update(itemsTable)
            .set({
              currentStock: newStock.toString(),
              price: newPrice.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(itemsTable.id, orderItem.itemId));

          // Create stock movement record
          let reason = `Received from order ${id}`;
          if (newReceived > orderQuantity) {
            reason += ` (Over-supplied by ${newReceived - orderQuantity})`;
          }
          if (Math.abs(newPrice - currentPrice) > 0.001) {
            reason += ` | Price updated: £${currentPrice.toFixed(2)} → £${newPrice.toFixed(2)} (weighted avg)`;
          }
          await db.insert(stockMovements).values({
            itemId: orderItem.itemId,
            type: 'in',
            quantity: receivedItem.receivedQuantity.toString(),
            previousStock: previousStock.toString(),
            newStock: newStock.toString(),
            reason,
            performedBy: receivedBy,
          });
        }
      }
    }

    // Re-fetch all order items to determine status
    const updatedOrderItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const allFullyReceived = updatedOrderItems.every((oi: any) => parseFloat(oi.receivedQuantity?.toString() || '0') >= oi.quantity);
    const anyReceived = updatedOrderItems.some((oi: any) => parseFloat(oi.receivedQuantity?.toString() || '0') > 0);

    // Update order status
    let status = 'pending';
    if (allFullyReceived) status = 'received';
    else if (anyReceived) status = 'partially received';
    await db.update(orders)
      .set({
        status,
        receivedBy: receivedBy,
        receivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Return the updated order
    const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, id));
    return updatedOrder;
  }

  // Source operations (supplier-item relationships)
  async createSource(sourceData: InsertSource): Promise<Source> {
    const [source] = await db.insert(sources).values(sourceData).returning();
    return source;
  }

  async deleteSource(id: number): Promise<void> {
    await db.delete(sources).where(eq(sources.id, id));
  }

  async getSupplierWithItems(supplierId: string): Promise<Supplier & { items: Array<ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }> }> {
    // Get the supplier
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }

    // Get items from sources (direct assignments)
    const sourceItems = await db
      .select({
        item: itemsTable,
        category: categories,
        unitCost: sources.price,
        lastOrderDate: sql<Date>`NULL`.as('lastOrderDate'),
      })
      .from(sources)
      .innerJoin(itemsTable, eq(sources.itemId, itemsTable.id))
      .innerJoin(categories, eq(itemsTable.categoryId, categories.id))
      .where(and(eq(sources.supplierId, supplierId), eq(itemsTable.isActive, true)));

    // Get items from received orders (implicit vendor stocking)
    const orderItemsQuery = await db
      .select({
        item: itemsTable,
        category: categories,
        unitCost: orderItems.unitCost,
        lastOrderDate: sql<Date>`MAX(${orders.receivedAt})`.as('lastOrderDate'),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(itemsTable, eq(orderItems.itemId, itemsTable.id))
      .innerJoin(categories, eq(itemsTable.categoryId, categories.id))
      .where(and(
        eq(orders.supplierId, supplierId),
        eq(orders.status, 'received'),
        eq(itemsTable.isActive, true)
      ))
      .groupBy(itemsTable.id, categories.id, orderItems.unitCost);

    // Combine and deduplicate items
    const itemMap = new Map<number, ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }>();

    // Add source items
    for (const sourceItem of sourceItems) {
      itemMap.set(sourceItem.item.id, {
        ...sourceItem.item,
        category: sourceItem.category,
        unitCost: sourceItem.unitCost || undefined,
        lastOrderDate: sourceItem.lastOrderDate || undefined,
      });
    }

    // Add/update with order items
    for (const orderItem of orderItemsQuery) {
      const existing = itemMap.get(orderItem.item.id);
      if (existing) {
        // Update with order info if more recent or if no existing cost
        if (!existing.unitCost || (orderItem.lastOrderDate && (!existing.lastOrderDate || orderItem.lastOrderDate > existing.lastOrderDate))) {
          existing.unitCost = orderItem.unitCost;
          existing.lastOrderDate = orderItem.lastOrderDate || undefined;
        }
      } else {
        itemMap.set(orderItem.item.id, {
          ...orderItem.item,
          category: orderItem.category,
          unitCost: orderItem.unitCost,
          lastOrderDate: orderItem.lastOrderDate || undefined,
        });
      }
    }

    return {
      ...supplier,
      items: Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  // Dashboard operations
  async getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
    totalValueExVAT: number;
    totalUnits: number;
    activeUsers: number;
  }> {
    const [stats] = await db
      .select({
        totalItems: count(itemsTable.id),
        totalValue: sum(sql`CASE WHEN ${itemsTable.vatIncluded} THEN ${itemsTable.price} * ${itemsTable.currentStock} ELSE ${itemsTable.price} * ${itemsTable.currentStock} * (1 + ${itemsTable.vatRate}) END`),
        totalValueExVAT: sum(sql`CASE WHEN ${itemsTable.vatIncluded} THEN ${itemsTable.price} * ${itemsTable.currentStock} / (1 + ${itemsTable.vatRate}) ELSE ${itemsTable.price} * ${itemsTable.currentStock} END`),
        totalUnits: sum(itemsTable.currentStock),
      })
      .from(itemsTable);

    const [lowStockResult] = await db
      .select({
        lowStockCount: count(itemsTable.id),
      })
      .from(itemsTable)
      .where(sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);

    const [activeUsersResult] = await db
      .select({
        activeUsers: count(users.id),
      })
      .from(users)
      .where(eq(users.isActive, true));

    return {
      totalItems: stats.totalItems || 0,
      lowStockItems: lowStockResult.lowStockCount || 0,
      totalValue: Number(stats.totalValue) || 0,
      totalValueExVAT: Number(stats.totalValueExVAT) || 0,
      totalUnits: Number(stats.totalUnits) || 0,
      activeUsers: activeUsersResult.activeUsers || 0,
    };
  }

  async getLowStockItems(): Promise<ItemWithCategory[]> {
    const lowStockItems = await db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        sku: itemsTable.sku,
        description: itemsTable.description,
        categoryId: itemsTable.categoryId,
        price: itemsTable.price,
        vatRate: itemsTable.vatRate,
        vatIncluded: itemsTable.vatIncluded,
        currentStock: itemsTable.currentStock,
        minimumStock: itemsTable.minimumStock,
        unit: itemsTable.unit,
        location: itemsTable.location,
        isActive: itemsTable.isActive,
        lowStockAcknowledgedAt: itemsTable.lowStockAcknowledgedAt,
        createdBy: itemsTable.createdBy,
        updatedBy: itemsTable.updatedBy,
        createdAt: itemsTable.createdAt,
        updatedAt: itemsTable.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          icon: categories.icon,
          color: categories.color,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        },
        createdByUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(itemsTable)
      .leftJoin(categories, eq(itemsTable.categoryId, categories.id))
      .leftJoin(users, eq(itemsTable.createdBy, users.id))
      .where(
        and(
          eq(itemsTable.isActive, true),
          sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock}`
        )
      )
      .orderBy(itemsTable.currentStock);

    return lowStockItems.map((item: any) => ({
      ...item,
      category: item.category!,
      createdBy: item.createdByUser!,
    }));
  }

  async getCategoryStats(): Promise<Array<{
    category: Category;
    itemCount: number;
    totalValue: number;
  }>> {
    const categoryStats = await db
      .select({
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          icon: categories.icon,
          color: categories.color,
          createdAt: categories.createdAt,
          updatedAt: categories.updatedAt,
        },
        itemCount: count(itemsTable.id),
        totalValue: sum(sql`${itemsTable.price} * ${itemsTable.currentStock}`),
      })
      .from(categories)
      .leftJoin(itemsTable, and(
        eq(categories.id, itemsTable.categoryId),
        eq(itemsTable.isActive, true)
      ))
      .groupBy(categories.id, categories.name, categories.description, categories.icon, categories.color, categories.createdAt, categories.updatedAt)
      .orderBy(categories.name);

    return categoryStats.map((stat: any) => ({
      category: stat.category,
      itemCount: stat.itemCount || 0,
      totalValue: Number(stat.totalValue) || 0,
    }));
  }

  // Charge code operations
  async getChargeCodes(): Promise<any[]> {
    const chargeCodesResult = await db
      .select()
      .from(chargecodes)
      .orderBy(chargecodes.code);

    // Fetch ALL authorized users in a single query instead of N+1 per charge code
    const allAuthorizedUsers = await db
      .select()
      .from(chargeCodeAuthorizedUsers)
      .orderBy(chargeCodeAuthorizedUsers.userName);

    // Group by charge code
    const usersByCode = new Map<string, typeof allAuthorizedUsers>();
    for (const user of allAuthorizedUsers) {
      const list = usersByCode.get(user.chargeCode) || [];
      list.push(user);
      usersByCode.set(user.chargeCode, list);
    }

    return chargeCodesResult.map((cc: any) => ({
      ...cc,
      authorizedUsers: usersByCode.get(cc.code) || [],
    }));
  }

  async getChargeCode(code: string): Promise<Chargecode | undefined> {
    const [chargeCode] = await db
      .select()
      .from(chargecodes)
      .where(sql`UPPER(${chargecodes.code}) = UPPER(${code})`);
    
    return chargeCode;
  }

  async createChargeCode(chargeCodeData: InsertChargecode): Promise<Chargecode> {
    const [chargeCode] = await db
      .insert(chargecodes)
      .values({
        ...chargeCodeData,
        notesId: chargeCodeData.notesId ?? undefined, // Ensure notesId is always handled properly
      })
      .returning();
    
    return chargeCode;
  }

  async updateChargeCode(code: string, chargeCodeData: Partial<InsertChargecode>): Promise<Chargecode> {
    const [chargeCode] = await db
      .update(chargecodes)
      .set({ ...chargeCodeData, updatedAt: new Date() })
      .where(eq(chargecodes.code, code))
      .returning();

    return chargeCode;
  }

  // Charge code authorized users operations
  async setChargeCodeAuthorizedUsers(chargeCode: string, users: any[], createdBy: string): Promise<void> {
    // Delete existing authorized users for this charge code
    await db
      .delete(chargeCodeAuthorizedUsers)
      .where(eq(chargeCodeAuthorizedUsers.chargeCode, chargeCode));

    // Insert new authorized users
    if (users && users.length > 0) {
      await db
        .insert(chargeCodeAuthorizedUsers)
        .values(
          users.map(user => ({
            chargeCode,
            userName: user.userName,
            email: user.email || null,
            department: user.department || null,
            notes: user.notes || null,
            createdBy,
          }))
        );
    }
  }

  async deleteChargeCodeAuthorizedUser(id: number): Promise<void> {
    await db
      .delete(chargeCodeAuthorizedUsers)
      .where(eq(chargeCodeAuthorizedUsers.id, id));
  }

  async deleteChargeCode(code: string): Promise<void> {
    await db.delete(chargecodes).where(eq(chargecodes.code, code));
  }

  async getExpiringChargeCodes(daysAhead: number = 90): Promise<Chargecode[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const expiringCodes = await db
      .select()
      .from(chargecodes)
      .where(
        and(
          sql`${chargecodes.validUntil} IS NOT NULL`,
          sql`${chargecodes.validUntil} <= ${futureDate}`,
          sql`${chargecodes.validUntil} > NOW()`
        )
      )
      .orderBy(chargecodes.validUntil);
    
    return expiringCodes;
  }

  // Charge code exclusion operations
  async getChargeCodeExclusions(chargeCode: string): Promise<number[]> {
    const exclusions = await db
      .select({ categoryId: chargeCodeExclusions.categoryId })
      .from(chargeCodeExclusions)
      .where(eq(chargeCodeExclusions.chargeCode, chargeCode));
    
    return exclusions.map((e: { categoryId: number }) => e.categoryId);
  }

  async createChargeCodeExclusion(chargeCode: string, categoryId: number, createdBy: string): Promise<void> {
    await db
      .insert(chargeCodeExclusions)
      .values({
        chargeCode,
        categoryId,
        createdBy,
      });
  }

  async deleteChargeCodeExclusion(chargeCode: string, categoryId: number): Promise<void> {
    await db
      .delete(chargeCodeExclusions)
      .where(
        and(
          eq(chargeCodeExclusions.chargeCode, chargeCode),
          eq(chargeCodeExclusions.categoryId, categoryId)
        )
      );
  }

  async isChargeCodeExcludedForCategory(chargeCode: string, categoryId: number): Promise<boolean> {
    const [exclusion] = await db
      .select()
      .from(chargeCodeExclusions)
      .where(
        and(
          eq(chargeCodeExclusions.chargeCode, chargeCode),
          eq(chargeCodeExclusions.categoryId, categoryId)
        )
      );
    
    return !!exclusion;
  }

  // Safe deletion methods with referential integrity checks
  async checkUserDeletion(userId: string): Promise<DeletionCheck> {
    return await referentialIntegrity.checkUserDeletion(userId);
  }

  async safeDeleteUser(userId: string): Promise<void> {
    await referentialIntegrity.safeDeleteUser(userId);
  }

  async checkCategoryDeletion(categoryId: number): Promise<DeletionCheck> {
    return await referentialIntegrity.checkCategoryDeletion(categoryId);
  }

  async safeDeleteCategory(categoryId: number): Promise<void> {
    // Use referential integrity manager, but first check if category is deletable
    const check = await this.checkCategoryDeletion(categoryId);
    if (!check.canDelete) {
      throw new Error(`Cannot delete category: ${check.blockedBy.map(b => b.description).join(', ')}`);
    }
    
    // Safe to delete
    await db.delete(categories).where(eq(categories.id, categoryId));
  }

  async checkItemDeletion(itemId: number): Promise<DeletionCheck> {
    return await referentialIntegrity.checkItemDeletion(itemId);
  }

  async safeDeleteItem(itemId: number): Promise<void> {
    await referentialIntegrity.safeDeleteItem(itemId);
  }

  async checkSupplierDeletion(supplierId: string): Promise<DeletionCheck> {
    return await referentialIntegrity.checkSupplierDeletion(supplierId);
  }

  async safeDeleteSupplier(supplierId: string): Promise<void> {
    await referentialIntegrity.safeDeleteSupplier(supplierId);
  }

  async checkQuoteDeletion(quoteId: number): Promise<DeletionCheck> {
    return await referentialIntegrity.checkQuoteDeletion(quoteId);
  }

  async safeDeleteQuote(quoteId: number): Promise<void> {
    await referentialIntegrity.safeDeleteQuote(quoteId);
  }

  // Notes operations
  async getNotesByReference(referenceType: string, referenceId: string): Promise<Note[]> {
    const notesList = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.referenceType, referenceType),
          eq(notes.referenceId, referenceId)
        )
      )
      .orderBy(desc(notes.createdAt));
    
    return notesList;
  }

  async getUserNotes(userId: string, options: { page: number; limit: number; referenceType?: string }): Promise<{ notes: Note[]; total: number }> {
    const offset = (options.page - 1) * options.limit;
    
    let whereConditions = [eq(notes.createdBy, userId)];
    if (options.referenceType) {
      whereConditions.push(eq(notes.referenceType, options.referenceType));
    }
    
    const [notesList, totalResult] = await Promise.all([
      db
        .select()
        .from(notes)
        .where(and(...whereConditions))
        .orderBy(desc(notes.createdAt))
        .limit(options.limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(notes)
        .where(and(...whereConditions))
    ]);
    
    return {
      notes: notesList,
      total: totalResult[0]?.count || 0
    };
  }

  async createNote(noteData: { text: string; referenceType: string; referenceId: string; createdBy: string }): Promise<Note> {
    const [note] = await db
      .insert(notes)
      .values({
        text: noteData.text,
        referenceType: noteData.referenceType,
        referenceId: noteData.referenceId,
        createdBy: noteData.createdBy
      })
      .returning();
    
    return note;
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    const [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id));
    
    return note;
  }

  async updateNote(id: number, data: { text: string }): Promise<Note | null> {
    const [note] = await db
      .update(notes)
      .set({ 
        text: data.text,
        updatedAt: new Date()
      })
      .where(eq(notes.id, id))
      .returning();
    
    return note || null;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await db
      .delete(notes)
      .where(eq(notes.id, id));
    
    return result.rowCount > 0;
  }

  async getNotesCount(referenceType: string, referenceId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(notes)
        .where(
          and(
            eq(notes.referenceType, referenceType),
            eq(notes.referenceId, referenceId)
          )
        );
      
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error('Error in getNotesCount:', error);
      return 0;
    }
  }

  async exportNotesToCSV(notesList: Note[]): Promise<string> {
    const headers = ['ID', 'Text', 'Reference Type', 'Reference ID', 'Created By', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];
    
    for (const note of notesList) {
      const row = [
        note.id.toString(),
        `"${note.text.replace(/"/g, '""')}"`, // Escape quotes in text
        note.referenceType,
        note.referenceId,
        note.createdBy,
        note.createdAt?.toISOString() || '',
        note.updatedAt?.toISOString() || ''
      ];
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n') + '\n';
  }

  async touchDraftQuote(quoteId: number, sessionId: string): Promise<void> {
    await db
      .update(quotes)
      .set({
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + DRAFT_QUOTE_CONFIG.EXPIRY_MS),
        sessionId
      })
      .where(eq(quotes.id, quoteId));
  }

  async migrateDraftToSession(userId: string, sessionId: string): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
    const recentDrafts = await db
      .select()
      .from(quotes)
      .where(and(
        eq(quotes.createdBy, userId),
        eq(quotes.status, 'draft'),
        sql`${quotes.lastAccessedAt} > NOW() - INTERVAL '24 hours'`
      ))
      .orderBy(desc(quotes.lastAccessedAt))
      .limit(1);

    if (recentDrafts.length === 0) {
      return undefined;
    }

    const [updatedQuote] = await db
      .update(quotes)
      .set({
        sessionId,
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + DRAFT_QUOTE_CONFIG.EXPIRY_MS)
      })
      .where(eq(quotes.id, recentDrafts[0].id))
      .returning();

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, updatedQuote.id));

    return { ...updatedQuote, items };
  }

  async cleanupExpiredDrafts(): Promise<number> {
    // Delete expired draft quotes and their items
    const expiredDrafts = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(
        eq(quotes.status, 'draft'),
        sql`${quotes.expiresAt} < NOW()`
      ));

    if (expiredDrafts.length === 0) {
      return 0;
    }

    const expiredIds = expiredDrafts.map((draft: { id: number }) => draft.id);

    // Delete quote items first (foreign key constraint)
    await db
      .delete(quoteItems)
      .where(sql`${quoteItems.quoteId} IN (${sql.join(expiredIds.map((id: number) => sql`${id}`), sql`, `)})`);

    // Delete the quotes
    const deletedCount = await db
      .delete(quotes)
      .where(sql`${quotes.id} IN (${sql.join(expiredIds.map((id: number) => sql`${id}`), sql`, `)})`)
      .returning({ id: quotes.id });

    console.log(`Cleaned up ${deletedCount.length} expired draft quotes`);
    return deletedCount.length;
  }
}

export const storage = new DatabaseStorage();
