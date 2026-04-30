// Mock storage implementation for testing sales functionality
import type { IStorage } from '../storage';
import type { 
  User, 
  UpsertUser, 
  Category, 
  InsertCategory, 
  Item, 
  InsertItem, 
  UpdateItem, 
  ItemWithCategory, 
  StockMovement, 
  StockMovementWithDetails,
  Sale,
  InsertSale,
  SaleItem,
  SaleWithDetails,
  Quote,
  InsertQuote,
  QuoteItem,
  Supplier,
  InsertSupplier,
  Source,
  InsertSource,
  Order,
  InsertOrder,
  OrderItem,
  Chargecode,
  InsertChargecode,
  ChargeCodeExclusion
} from '../../shared/schema';

export class MockStorage implements IStorage {
  // Test helper property to store category names for reference in tests
  public testCategoryNames: {
    stationery: string;
    itEquipment: string;
    officeFurniture: string;
  } = {
    stationery: '',
    itEquipment: '',
    officeFurniture: ''
  };

  private users: User[] = [];
  private categories: Category[] = [];
  private items: Item[] = [];
  private stockMovements: StockMovement[] = [];
  private sales: Sale[] = [];
  private saleItems: SaleItem[] = [];
  private quotes: Quote[] = [];
  private quoteItems: QuoteItem[] = [];
  private suppliers: Supplier[] = [];
  private sources: Source[] = [];
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private chargeCodes: Chargecode[] = [];
  private chargeCodeExclusions: ChargeCodeExclusion[] = [];
  private nextId = 1;
  private categoryIdCounter = 1;
  private itemIdCounter = 1;
  private saleIdCounter = 1;
  private quoteIdCounter = 1;
  private sourceIdCounter = 1;
  private orderIdCounter = 1;

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existing = this.users.find(u => u.id === user.id);
    if (existing) {
      Object.assign(existing, user, { updatedAt: new Date() });
      return existing;
    }
    const newUser: User = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    this.users.push(newUser);
    return newUser;
  }

  async createLocalUser(user: {
    email: string;
    password_hash: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }): Promise<User> {
    const newUser: User = {
      id: `user_${this.nextId++}`,
      ...user,
      lastLogin: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    user.role = role;
    user.updatedAt = new Date();
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string, mustChangePassword?: boolean): Promise<User> {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');
    user.password_hash = passwordHash;
    user.mustChangePassword = mustChangePassword ?? false;
    user.updatedAt = new Date();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.lastLogin = new Date();
    }
  }

  async deactivateUser(id: string): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.isActive = false;
      user.updatedAt = new Date();
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return [...this.categories];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory: Category = {
      id: this.categoryIdCounter++,
      name: (category as any).name,
      description: (category as any).description ?? null,
      icon: (category as any).icon ?? "fas fa-box",
      color: (category as any).color ?? "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const existing = this.categories.find(c => c.id === id);
    if (!existing) throw new Error('Category not found');
    Object.assign(existing, category, { updatedAt: new Date() });
    return existing;
  }

  async deleteCategory(id: number): Promise<void> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      this.categories.splice(index, 1);
    }
  }

  // Item operations
  async getItems(page?: number, limit?: number, search?: string, categoryId?: number): Promise<{
    items: ItemWithCategory[];
    total: number;
  }> {
    let filteredItems = [...this.items];
    
    if (search) {
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (categoryId) {
      filteredItems = filteredItems.filter(item => item.categoryId === categoryId);
    }

    const itemsWithCategory = filteredItems.map(item => {
      const category = this.categories.find(c => c.id === item.categoryId)!;
      const createdBy = this.users.find(u => u.id === item.createdBy)!;
      const updatedBy = item.updatedBy ? this.users.find(u => u.id === item.updatedBy) : undefined;
      
      return {
        ...item,
        category,
        createdBy,
        updatedBy,
      } as ItemWithCategory;
    });

    if (page && limit) {
      const start = (page - 1) * limit;
      return {
        items: itemsWithCategory.slice(start, start + limit),
        total: filteredItems.length,
      };
    }

    return {
      items: itemsWithCategory,
      total: filteredItems.length,
    };
  }

  async getItem(id: number): Promise<ItemWithCategory | undefined> {
    const item = this.items.find(i => i.id === id);
    if (!item) return undefined;
    
    const category = this.categories.find(c => c.id === item.categoryId)!;
    const createdBy = this.users.find(u => u.id === item.createdBy)!;
    const updatedBy = item.updatedBy ? this.users.find(u => u.id === item.updatedBy) : undefined;
    
    return {
      ...item,
      category,
      createdBy,
      updatedBy,
    } as ItemWithCategory;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const newItem: Item = {
      id: this.itemIdCounter++,
      name: (item as any).name,
      sku: (item as any).sku,
      description: (item as any).description ?? null,
      categoryId: (item as any).categoryId,
      price: (item as any).price,
      vatRate: (item as any).vatRate ?? "0.2000",
      vatIncluded: (item as any).vatIncluded ?? true,
      currentStock: (item as any).currentStock ?? 0,
      minimumStock: (item as any).minimumStock ?? 0,
      isActive: (item as any).isActive ?? true,
      notesId: (item as any).notesId ?? null,
      createdBy: (item as any).createdBy,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(newItem);
    return newItem;
  }

  async updateItem(id: number, item: Partial<UpdateItem>, updatedBy: string): Promise<Item> {
    const existing = this.items.find(i => i.id === id);
    if (!existing) throw new Error('Item not found');
    Object.assign(existing, item, { updatedBy, updatedAt: new Date() });
    return existing;
  }

  async deleteItem(id: number): Promise<void> {
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  // Stock operations
  async updateStock(itemId: number, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string, performedBy: string): Promise<void> {
    const item = this.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    const previousStock = item.currentStock;
    const newStock = previousStock + quantity;
    
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    item.currentStock = newStock;

    const movement: StockMovement = {
      id: this.nextId++,
      itemId,
      type,
      quantity,
      previousStock,
      newStock,
      reason: reason || null,
      performedBy,
      createdAt: new Date(),
    };
    this.stockMovements.push(movement);
  }

  async getStockMovements(itemId?: number, limit?: number): Promise<StockMovementWithDetails[]> {
    let movements = [...this.stockMovements];
    
    if (itemId) {
      movements = movements.filter(m => m.itemId === itemId);
    }
    
    if (limit) {
      movements = movements.slice(-limit);
    }

    return movements.map(movement => {
      const item = this.items.find(i => i.id === movement.itemId)!;
      const performedBy = this.users.find(u => u.id === movement.performedBy)!;
      
      return {
        ...movement,
        item,
        performedBy,
      } as StockMovementWithDetails;
    });
  }

  // Sales operations
  async createSale(
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
  ): Promise<Sale> {
    // Generate sale ID
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const counter = this.saleIdCounter++;
    const counterStr = counter.toString().padStart(3, '0');
    const saleId = `S${dateStr}${timeStr}${counterStr}`;

    const newSale: Sale = {
      id: this.nextId++,
      saleId,
      chargeCode: (saleData as any).chargeCode,
      subtotalAmount: (saleData as any).subtotalAmount,
      vatAmount: (saleData as any).vatAmount || "0.00",
      totalAmount: (saleData as any).totalAmount,
      vatApplied: (saleData as any).vatApplied ?? true,
      customerInfo: (saleData as any).customerInfo,
      notesId: (saleData as any).notesId ?? undefined,
      status: (saleData as any).status || 'completed',
      isPaid: (saleData as any).isPaid ?? false,
      processedBy, // Use the provided processedBy parameter
      createdAt: now,
      updatedAt: now,
    };
    this.sales.push(newSale);

    // Create sale items
    const createdItems: SaleItem[] = [];
    for (const item of items) {
      const saleItem: SaleItem = {
        id: this.nextId++,
        saleId: newSale.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate.toString(),
        vatAmount: item.vatAmount.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
        totalWithVat: item.totalWithVat.toString(),
        createdAt: now,
      };
      this.saleItems.push(saleItem);
      createdItems.push(saleItem);
    }

    // processedByUser is needed for validation but not used in return
    // const processedByUser = this.users.find(u => u.id === newSale.processedBy)!;
    
    return newSale;
  }

  async markSaleAsPaid(saleId: number): Promise<Sale> {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }
    
    sale.isPaid = true;
    sale.status = 'paid'; // Update status to 'paid' as expected by tests
    sale.updatedAt = new Date();
    return sale;
  }

  async getSales(page?: number, limit?: number, chargeCode?: string, startDate?: Date, endDate?: Date): Promise<{
    sales: SaleWithDetails[];
    total: number;
  }> {
    let filteredSales = [...this.sales];
    
    if (chargeCode) {
      filteredSales = filteredSales.filter(sale => 
        sale.chargeCode.toLowerCase().includes(chargeCode.toLowerCase())
      );
    }
    
    if (startDate) {
      filteredSales = filteredSales.filter(sale => 
        sale.createdAt && sale.createdAt >= startDate
      );
    }
    
    if (endDate) {
      filteredSales = filteredSales.filter(sale => 
        sale.createdAt && sale.createdAt <= endDate
      );
    }

    const salesWithDetails = filteredSales.map(sale => {
      const processedBy = this.users.find(u => u.id === sale.processedBy);
      const items = this.saleItems.filter(item => item.saleId === sale.id);
      
      // Debug logging
      // if (!processedBy) {
      //   console.log('DEBUG: User not found for sale.processedBy:', sale.processedBy);
      //   console.log('DEBUG: Available user IDs:', this.users.map(u => u.id));
      // }
      
      return {
        ...sale,
        processedBy,
        items,
      } as SaleWithDetails;
    });

    if (page && limit) {
      const start = (page - 1) * limit;
      return {
        sales: salesWithDetails.slice(start, start + limit),
        total: filteredSales.length,
      };
    }

    return {
      sales: salesWithDetails,
      total: filteredSales.length,
    };
  }

  async getSalesByChargeCode(startDate?: Date, endDate?: Date): Promise<Array<{
    chargeCode: string;
    sales: SaleWithDetails[];
    total: number;
  }>> {
    let filteredSales = [...this.sales];
    
    if (startDate) {
      filteredSales = filteredSales.filter(sale => 
        sale.createdAt && sale.createdAt >= startDate
      );
    }
    
    if (endDate) {
      filteredSales = filteredSales.filter(sale => 
        sale.createdAt && sale.createdAt <= endDate
      );
    }

    // Group sales by charge code
    const groupedSales = new Map<string, Sale[]>();
    filteredSales.forEach(sale => {
      const existing = groupedSales.get(sale.chargeCode) || [];
      existing.push(sale);
      groupedSales.set(sale.chargeCode, existing);
    });

    // Convert to required format
    const result: Array<{
      chargeCode: string;
      sales: SaleWithDetails[];
      total: number;
    }> = [];

    const chargeCodes = Array.from(groupedSales.keys());
    for (const chargeCode of chargeCodes) {
      const sales = groupedSales.get(chargeCode)!;
      const salesWithDetails = sales.map(sale => {
        const processedBy = this.users.find(u => u.id === sale.processedBy)!;
        const items = this.saleItems.filter(item => item.saleId === sale.id);
        
        return {
          ...sale,
          processedBy,
          items,
        } as SaleWithDetails;
      });

      result.push({
        chargeCode,
        sales: salesWithDetails,
        total: sales.length,
      });
    }

    return result;
  }

  // Supplier operations
  async getSuppliers(): Promise<Supplier[]> {
    return [...this.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.find(s => s.id === id);
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    // Validate required fields
    if (!supplierData.id || supplierData.id.trim() === '') {
      throw new Error('Supplier ID is required');
    }
    if (!supplierData.name || supplierData.name.trim() === '') {
      throw new Error('Supplier name is required');
    }
  
    // Validate email format if provided
    if (supplierData.email && supplierData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplierData.email)) {
        throw new Error('Invalid email format');
      }
    }
  
    // Check for duplicate supplier ID
    const existingSupplier = this.suppliers.find(s => s.id === supplierData.id);
    if (existingSupplier) {
      throw new Error(`Supplier with ID '${supplierData.id}' already exists`);
    }
    
    const supplier: Supplier = {
      id: supplierData.id,
      name: supplierData.name,
      // Convert empty values to null to match interface
      email: supplierData.email?.trim() || null,
      contact: supplierData.contact?.trim() || null,
      phone: supplierData.phone?.trim() || null,
      address: supplierData.address?.trim() || null,
      notesId: (supplierData as any).notesId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.suppliers.push(supplier);
    
    // Convert null values to undefined for test expectations
    return {
      ...supplier,
      email: supplier.email === null ? undefined : supplier.email,
      contact: supplier.contact === null ? undefined : supplier.contact,
      phone: supplier.phone === null ? undefined : supplier.phone,
      address: supplier.address === null ? undefined : supplier.address,
    } as Supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const supplier = this.suppliers.find(s => s.id === id);
    if (!supplier) throw new Error(`Supplier ${id} not found`);
    
    Object.assign(supplier, supplierData, { updatedAt: new Date() });
    return supplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Supplier ${id} not found`);
    
    this.suppliers.splice(index, 1);
    // Also remove related sources
    this.sources = this.sources.filter(s => s.supplierId !== id);
  }

  // Source operations
  async createSource(sourceData: InsertSource): Promise<Source> {
    const source: Source = {
      id: this.sourceIdCounter++,
      itemId: sourceData.itemId,
      supplierId: sourceData.supplierId,
      price: sourceData.price || null,
      notesId: sourceData.notesId ?? undefined,
      createdAt: new Date(),
    };
    this.sources.push(source);
    return source;
  }

  async deleteSource(id: number): Promise<void> {
    const index = this.sources.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Source ${id} not found`);
    
    this.sources.splice(index, 1);
  }

  async getSupplierWithItems(supplierId: string): Promise<Supplier & { items: Array<ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }> }> {
    const supplier = this.suppliers.find(s => s.id === supplierId);
    if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

    // Get items from sources (direct assignments)
    const sourceItems = this.sources
      .filter(s => s.supplierId === supplierId)
      .map(source => {
        const item = this.items.find(i => i.id === source.itemId);
        const category = item ? this.categories.find(c => c.id === item.categoryId) : undefined;
        
        if (!item || !category) return null;
        
        // For mock storage, we'll create a simplified ItemWithCategory
        return {
          ...item,
          category,
          createdBy: { id: item.createdBy, email: 'mock@example.com', firstName: 'Mock', lastName: 'User' } as any,
          unitCost: source.price || undefined,
          lastOrderDate: undefined as Date | undefined,
        } as ItemWithCategory & { unitCost?: string; lastOrderDate?: Date };
      })
      .filter(item => item !== null) as Array<ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }>;

    // Get items from received orders (implicit vendor stocking)
    const receivedOrders = this.orders.filter(o => o.supplierId === supplierId && o.status === 'received');
    const orderItemsFromSupplier: Array<ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }> = [];
    
    for (const order of receivedOrders) {
      const orderItems = this.orderItems.filter(oi => oi.orderId === order.id && oi.itemId);
      
      for (const orderItem of orderItems) {
        if (orderItem.itemId) {
          const item = this.items.find(i => i.id === orderItem.itemId);
          const category = item ? this.categories.find(c => c.id === item.categoryId) : undefined;
          
          if (item && category) {
            orderItemsFromSupplier.push({
              ...item,
              category,
              createdBy: { id: item.createdBy, email: 'mock@example.com', firstName: 'Mock', lastName: 'User' } as any,
              unitCost: orderItem.unitCost,
              lastOrderDate: order.receivedAt || order.createdAt || undefined,
            } as ItemWithCategory & { unitCost?: string; lastOrderDate?: Date });
          }
        }
      }
    }

    // Combine and deduplicate items
    const itemMap = new Map<number, ItemWithCategory & { unitCost?: string; lastOrderDate?: Date }>();

    // Add source items
    for (const item of sourceItems) {
      itemMap.set(item.id, item);
    }

    // Add/update with order items
    for (const item of orderItemsFromSupplier) {
      const existing = itemMap.get(item.id);
      if (existing) {
        // Update with order info if more recent or if no existing cost
        if (!existing.unitCost || (item.lastOrderDate && (!existing.lastOrderDate || item.lastOrderDate > existing.lastOrderDate))) {
          existing.unitCost = item.unitCost;
          existing.lastOrderDate = item.lastOrderDate;
        }
      } else {
        itemMap.set(item.id, item);
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
    const totalItems = this.items.length;
    const lowStockItems = this.items.filter(item => item.currentStock <= item.minimumStock).length;
    const totalValue = this.items.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const stock = item.currentStock;
      const vatRate = item.vatRate;
      return sum + (item.vatIncluded ? price * stock : price * stock * (1 + vatRate));
    }, 0);
    const totalValueExVAT = this.items.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const stock = item.currentStock;
      const vatRate = item.vatRate;
      return sum + (item.vatIncluded ? price * stock / (1 + vatRate) : price * stock);
    }, 0);
    const totalUnits = this.items.reduce((sum, item) => sum + item.currentStock, 0);
    const activeUsers = this.users.filter(user => user.isActive).length;

    return {
      totalItems,
      lowStockItems,
      totalValue,
      totalValueExVAT,
      totalUnits,
      activeUsers,
    };
  }

  async getLowStockItems(): Promise<ItemWithCategory[]> {
    const lowStockItems = this.items.filter(item => item.currentStock <= item.minimumStock);
    return lowStockItems.map(item => {
      const category = this.categories.find(c => c.id === item.categoryId)!;
      const createdBy = this.users.find(u => u.id === item.createdBy)!;
      const updatedBy = item.updatedBy ? this.users.find(u => u.id === item.updatedBy) : undefined;
      
      return {
        ...item,
        category,
        createdBy,
        updatedBy,
      } as ItemWithCategory;
    });
  }

  async getCategoryStats(): Promise<Array<{
    category: Category;
    itemCount: number;
    totalValue: number;
  }>> {
    return this.categories.map(category => {
      const categoryItems = this.items.filter(item => item.categoryId === category.id);
      const itemCount = categoryItems.length;
      const totalValue = categoryItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.currentStock), 0);
      
      return {
        category,
        itemCount,
        totalValue,
      };
    });
  }

  // Quote operations
  async createQuote(quoteData: Omit<InsertQuote, 'quoteId'>, items: Array<{
    itemId: number;
    itemName: string;
    itemSku: string;
    unitPrice: number;
    quantity: number;
    vatRate: number;
    vatAmount: number;
    subtotal: number;
    totalWithVat: number;
  }>): Promise<Quote & { items: QuoteItem[] }> {
    // Generate quote ID
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const counter = this.quoteIdCounter++;
    const counterStr = counter.toString().padStart(3, '0');
    const quoteId = `Q${dateStr}${timeStr}${counterStr}`;

    const newQuote: Quote = {
      id: this.nextId++,
      quoteId,
      chargeCode: (quoteData as any).chargeCode,
      subtotalAmount: (quoteData as any).subtotalAmount,
      vatAmount: (quoteData as any).vatAmount || "0.00",
      totalAmount: (quoteData as any).totalAmount,
      vatApplied: (quoteData as any).vatApplied ?? true,
      customerInfo: (quoteData as any).customerInfo,
      notesId: (quoteData as any).notesId ?? undefined,
      status: (quoteData as any).status || 'draft',
      sessionId: (quoteData as any).sessionId || null,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdBy: (quoteData as any).createdBy,
      processedBy: null,
      processedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.quotes.push(newQuote);

    // Create quote items
    const createdItems: QuoteItem[] = [];
    for (const item of items) {
      const quoteItem: QuoteItem = {
        id: this.nextId++,
        quoteId: newQuote.id,
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate.toString(),
        vatAmount: item.vatAmount.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
        totalWithVat: item.totalWithVat.toString(),
        createdAt: now,
      };
      this.quoteItems.push(quoteItem);
      createdItems.push(quoteItem);
    }

    return { ...newQuote, items: createdItems };
  }

  async getQuotes(page?: number, limit?: number, status?: string, createdBy?: string): Promise<{
    quotes: Array<Quote & { items: QuoteItem[]; creator: User; processor?: User }>;
    total: number;
  }> {
    let filteredQuotes = [...this.quotes];
    
    if (status) {
      filteredQuotes = filteredQuotes.filter(quote => quote.status === status);
    }
    
    if (createdBy) {
      filteredQuotes = filteredQuotes.filter(quote => quote.createdBy === createdBy);
    }

    const quotesWithDetails = filteredQuotes.map(quote => {
      const creator = this.users.find(u => u.id === quote.createdBy)!;
      const processor = quote.processedBy ? this.users.find(u => u.id === quote.processedBy) : undefined;
      const items = this.quoteItems.filter(item => item.quoteId === quote.id);
      
      return {
        ...quote,
        creator,
        processor,
        items,
      };
    });

    if (page && limit) {
      const start = (page - 1) * limit;
      return {
        quotes: quotesWithDetails.slice(start, start + limit),
        total: filteredQuotes.length,
      };
    }

    return {
      quotes: quotesWithDetails,
      total: filteredQuotes.length,
    };
  }

  async getQuote(id: number): Promise<(Quote & { items: QuoteItem[]; creator: User; processor?: User }) | undefined> {
    const quote = this.quotes.find(q => q.id === id);
    if (!quote) return undefined;
    
    const creator = this.users.find(u => u.id === quote.createdBy)!;
    const processor = quote.processedBy ? this.users.find(u => u.id === quote.processedBy) : undefined;
    const items = this.quoteItems.filter(item => item.quoteId === quote.id);
    
    return {
      ...quote,
      creator,
      processor,
      items,
    };
  }

  async updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote> {
    const existing = this.quotes.find(q => q.id === id);
    if (!existing) throw new Error('Quote not found');
    Object.assign(existing, quoteData, { updatedAt: new Date() });
    return existing;
  }

  async deleteQuote(id: number): Promise<void> {
    const quoteIndex = this.quotes.findIndex(q => q.id === id);
    if (quoteIndex !== -1) {
      this.quotes.splice(quoteIndex, 1);
      // Remove related quote items
      this.quoteItems = this.quoteItems.filter(item => item.quoteId !== id);
    }
  }

  async processQuote(id: number, processedBy: string): Promise<Sale> {
    const quote = await this.getQuote(id);
    if (!quote) throw new Error('Quote not found');
    if (quote.status !== 'draft') throw new Error('Quote is not in draft status');

    // Convert quote to sale
    const saleData = {
      chargeCode: quote.chargeCode,
      subtotalAmount: quote.subtotalAmount,
      vatAmount: quote.vatAmount,
      totalAmount: quote.totalAmount,
      vatApplied: quote.vatApplied,
      customerInfo: quote.customerInfo,
      notesId: quote.notesId || undefined,
      status: 'completed' as const
    };

    const saleItems = quote.items.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      itemSku: item.itemSku,
      unitPrice: parseFloat(item.unitPrice),
      quantity: item.quantity,
      vatRate: parseFloat(item.vatRate),
      vatAmount: parseFloat(item.vatAmount),
      subtotal: parseFloat(item.subtotal),
      totalWithVat: parseFloat(item.totalWithVat),
    }));

    const sale = await this.createSale(saleData, saleItems, processedBy);

    // Update quote status
    const quoteToUpdate = this.quotes.find(q => q.id === id)!;
    quoteToUpdate.status = 'processed';
    quoteToUpdate.processedBy = processedBy;
    quoteToUpdate.processedAt = new Date();
    quoteToUpdate.updatedAt = new Date();

    return sale;
  }

  // Order operations (mock implementations for testing)
  async getOrders(page: number = 1, limit: number = 20, status?: string, supplierId?: string): Promise<{
    orders: Array<Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }>;
    total: number;
  }> {
    let filteredOrders = this.orders;
    
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
    }
    
    if (supplierId) {
      filteredOrders = filteredOrders.filter(o => o.supplierId === supplierId);
    }
    
    const start = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(start, start + limit);
    
    const ordersWithDetails = paginatedOrders.map(order => {
      const orderItems = this.orderItems.filter(oi => oi.orderId === order.id);
      const supplier = order.supplierId ? this.suppliers.find(s => s.id === order.supplierId) : undefined;
      const creator = this.users.find(u => u.id === order.createdBy) || {
        id: order.createdBy,
        email: 'unknown@example.com',
        firstName: 'Unknown',
        lastName: 'User',
        role: 'user',
        isActive: true,
        mustChangePassword: false,
        lastLogin: null,
        profileImageUrl: null,
        password_hash: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const receivedBy = order.receivedBy ? this.users.find(u => u.id === order.receivedBy) : undefined;
      
      return {
        ...order,
        items: orderItems,
        supplier,
        creator,
        receivedBy
      } as Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User };
    });
    
    return {
      orders: ordersWithDetails,
      total: filteredOrders.length
    };
  }

  async getOrder(id: number): Promise<(Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User }) | undefined> {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;
    
    const orderItems = this.orderItems.filter(oi => oi.orderId === order.id);
    const supplier = order.supplierId ? this.suppliers.find(s => s.id === order.supplierId) : undefined;
    const creator = this.users.find(u => u.id === order.createdBy) || {
      id: order.createdBy,
      email: 'unknown@example.com',
      firstName: 'Unknown',
      lastName: 'User',
      role: 'user',
      isActive: true,
      mustChangePassword: false,
      lastLogin: null,
      profileImageUrl: null,
      password_hash: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const receivedBy = order.receivedBy ? this.users.find(u => u.id === order.receivedBy) : undefined;
    
    return {
      ...order,
      items: orderItems,
      supplier,
      creator,
      receivedBy
    } as Order & { items: OrderItem[]; supplier?: Supplier; creator: User; receivedBy?: User };
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
  }>): Promise<Order> {
    // Generate order ID
    const orderId = `O${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(this.orderIdCounter++).padStart(4, '0')}`;
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0).toFixed(2);
    
    const order: Order = {
      id: this.nextId++,
      orderId,
      supplierId: orderData.supplierId || null,
      status: orderData.status || 'pending',
      notesId: (orderData as any).notesId ?? null,
      totalAmount,
      createdBy: orderData.createdBy,
      receivedBy: null,
      receivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.orders.push(order);
    
    // Create order items
    for (const itemData of items) {
      const orderItem: OrderItem = {
        id: this.nextId++,
        orderId: order.id,
        itemId: itemData.itemId || null,
        itemName: itemData.itemName,
        itemSku: itemData.itemSku,
        itemDescription: itemData.itemDescription || null,
        categoryId: itemData.categoryId || null,
        unitCost: itemData.unitCost,
        quantity: itemData.quantity,
        totalCost: itemData.totalCost,
        received: itemData.received || false,
        createdAt: new Date(),
      };
      this.orderItems.push(orderItem);
    }
    
    return order;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order> {
    const order = this.orders.find(o => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    
    Object.assign(order, orderData, { updatedAt: new Date() });
    return order;
  }

  async receiveOrder(id: number, receivedBy: string, receivedItems: Array<{
    orderItemId: number;
    receivedQuantity: number;
    addToInventory?: boolean;
  }>): Promise<Order> {
    const order = this.orders.find(o => o.id === id);
    if (!order) throw new Error(`Order ${id} not found`);
    
    // Mark order as received
    order.status = 'received';
    order.receivedBy = receivedBy;
    order.receivedAt = new Date();
    order.updatedAt = new Date();
    
    // Update order items
    for (const receivedItem of receivedItems) {
      const orderItem = this.orderItems.find(oi => oi.id === receivedItem.orderItemId);
      if (orderItem) {
        orderItem.received = true;
        
        // Add to inventory if requested and item exists
        if (receivedItem.addToInventory && orderItem.itemId) {
          const item = this.items.find(i => i.id === orderItem.itemId);
          if (item) {
            item.currentStock = parseFloat(item.currentStock.toString()) + parseFloat(receivedItem.receivedQuantity.toString());
            item.updatedAt = new Date();
          }
        }
      }
    }
    
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) throw new Error(`Order ${id} not found`);
    
    this.orders.splice(index, 1);
    // Remove related order items
    this.orderItems = this.orderItems.filter(oi => oi.orderId !== id);
  }

  // Helper methods for testing
  reset(): void {
    this.users = [];
    this.categories = [];
    this.items = [];
    this.stockMovements = [];
    this.sales = [];
    this.saleItems = [];
    this.quotes = [];
    this.quoteItems = [];
    this.suppliers = [];
    this.sources = [];
    this.orders = [];
    this.orderItems = [];
    this.nextId = 1;
    this.categoryIdCounter = 1;
    this.itemIdCounter = 1;
    this.saleIdCounter = 1;
    this.quoteIdCounter = 1;
    this.sourceIdCounter = 1;
    this.orderIdCounter = 1;
  }

  seedTestData(): void {
    // Create test user
    this.users.push({
      id: 'test-user-1',
      email: 'test@example.com',
      password_hash: 'hashed',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      mustChangePassword: false,
      lastLogin: null,
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test category
    this.categories.push({
      id: 1,
      name: 'Test Category',
      description: 'Test category description',
      icon: 'fas fa-box',
      color: 'blue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test items
    this.items.push({
      id: 1,
      name: 'Test Item 1',
      sku: 'TEST001',
      description: 'Test item description',
      categoryId: 1,
      price: '10.50',
      vatRate: '0.2000',
      vatIncluded: true,
      currentStock: 100,
      minimumStock: 10,
      isActive: true,
      notesId: null,
      createdBy: 'test-user-1',
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.items.push({
      id: 2,
      name: 'Test Item 2',
      sku: 'TEST002',
      description: 'Another test item',
      categoryId: 1,
      price: '25.00',
      vatRate: '0.2000',
      vatIncluded: true,
      currentStock: 50,
      minimumStock: 5,
      isActive: true,
      notesId: null,
      createdBy: 'test-user-1',
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.nextId = 3;

    // Add some test charge codes
    this.chargeCodes.push({
      code: 'VALID001',
      title: 'Valid Charge Code',
      authorisedBy: 'test-user-1',
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      pin: null,
      costCentre: 'CC001',
      notesId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.chargeCodes.push({
      code: 'EXPIRED001',
      title: 'Expired Charge Code',
      authorisedBy: 'test-user-1',
      validFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (expired)
      pin: null,
      costCentre: 'CC002',
      notesId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.chargeCodes.push({
      code: 'FUTURE001',
      title: 'Future Charge Code',
      authorisedBy: 'test-user-1',
      validFrom: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      validUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // 100 days from now
      pin: null,
      costCentre: 'CC003',
      notesId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.chargeCodes.push({
      code: 'EXPIRING001',
      title: 'Expiring Soon Charge Code',
      authorisedBy: 'test-user-1',
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now (expiring soon)
      pin: '1234',
      costCentre: 'CC004',
      notesId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Add missing stub methods for interface compliance
  async getSuppliersWithOrderHistory(): Promise<any[]> {
    return [];
  }

  async getSupplierOrderHistory(_supplierId: string): Promise<any[]> {
    return [];
  }

  // Charge code operations
  async getChargeCodes(): Promise<Chargecode[]> {
    return [...this.chargeCodes];
  }

  async getChargeCode(code: string): Promise<Chargecode | undefined> {
    return this.chargeCodes.find(cc => cc.code === code);
  }

  async createChargeCode(chargeCodeData: InsertChargecode): Promise<Chargecode> {
    const newChargeCode: Chargecode = {
      code: chargeCodeData.code,
      title: chargeCodeData.title,
      authorisedBy: chargeCodeData.authorisedBy || null,
      validFrom: chargeCodeData.validFrom || null,
      validUntil: chargeCodeData.validUntil || null,
      pin: chargeCodeData.pin || null,
      costCentre: chargeCodeData.costCentre || null,
      notesId: (chargeCodeData as any).notesId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chargeCodes.push(newChargeCode);
    return newChargeCode;
  }

  async updateChargeCode(code: string, chargeCodeData: Partial<InsertChargecode>): Promise<Chargecode> {
    const chargeCode = this.chargeCodes.find(cc => cc.code === code);
    if (!chargeCode) {
      throw new Error(`Charge code ${code} not found`);
    }
    Object.assign(chargeCode, chargeCodeData, { updatedAt: new Date() });
    return chargeCode;
  }

  async deleteChargeCode(code: string): Promise<void> {
    const index = this.chargeCodes.findIndex(cc => cc.code === code);
    if (index !== -1) {
      this.chargeCodes.splice(index, 1);
    }
  }

  async getExpiringChargeCodes(daysAhead: number = 90): Promise<Chargecode[]> {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return this.chargeCodes.filter(cc => 
      cc.validUntil && 
      new Date(cc.validUntil) <= futureDate && 
      new Date(cc.validUntil) > new Date()
    );
  }

  // Charge code exclusion operations
  async getChargeCodeExclusions(chargeCode: string): Promise<number[]> {
    return this.chargeCodeExclusions
      .filter(ex => ex.chargeCode === chargeCode)
      .map(ex => ex.categoryId);
  }

  async createChargeCodeExclusion(chargeCode: string, categoryId: number, createdBy: string): Promise<void> {
    const newExclusion: ChargeCodeExclusion = {
      id: this.nextId++,
      chargeCode,
      categoryId,
      createdBy,
      createdAt: new Date(),
    };
    this.chargeCodeExclusions.push(newExclusion);
  }

  async deleteChargeCodeExclusion(chargeCode: string, categoryId: number): Promise<void> {
    const index = this.chargeCodeExclusions.findIndex(ex => 
      ex.chargeCode === chargeCode && ex.categoryId === categoryId
    );
    if (index !== -1) {
      this.chargeCodeExclusions.splice(index, 1);
    }
  }

  async isChargeCodeExcludedForCategory(chargeCode: string, categoryId: number): Promise<boolean> {
    return this.chargeCodeExclusions.some(ex => 
      ex.chargeCode === chargeCode && ex.categoryId === categoryId
    );
  }

  async countSalesByChargeCode(chargeCode: string): Promise<number> {
    return this.sales.filter(sale => sale.chargeCode === chargeCode).length;
  }

  // Missing referential integrity methods
  async checkUserDeletion(_userId: string): Promise<any> {
    return {
      canDelete: true,
      references: [],
      warnings: []
    };
  }

  async safeDeleteUser(userId: string): Promise<void> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users.splice(userIndex, 1);
    }
  }

  async checkCategoryDeletion(_categoryId: number): Promise<any> {
    return {
      canDelete: true,
      references: [],
      warnings: []
    };
  }

  async safeDeleteCategory(categoryId: number): Promise<void> {
    const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex !== -1) {
      this.categories.splice(categoryIndex, 1);
    }
  }

  async checkItemDeletion(_itemId: number): Promise<any> {
    return {
      canDelete: true,
      references: [],
      warnings: []
    };
  }

  async safeDeleteItem(itemId: number): Promise<void> {
    const itemIndex = this.items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
      this.items.splice(itemIndex, 1);
    }
  }

  async checkQuoteDeletion(_quoteId: number): Promise<any> {
    return {
      canDelete: true,
      references: [],
      warnings: []
    };
  }

  async safeDeleteQuote(quoteId: number): Promise<void> {
    const quoteIndex = this.quotes.findIndex(q => q.id === quoteId);
    if (quoteIndex !== -1) {
      this.quotes.splice(quoteIndex, 1);
      this.quoteItems = this.quoteItems.filter(item => item.quoteId !== quoteId);
    }
  }

  async checkSupplierDeletion(_supplierId: string): Promise<any> {
    return {
      canDelete: true,
      references: [],
      warnings: []
    };
  }

  async safeDeleteSupplier(supplierId: string): Promise<void> {
    const supplierIndex = this.suppliers.findIndex(s => s.id === supplierId);
    if (supplierIndex !== -1) {
      this.suppliers.splice(supplierIndex, 1);
    }
  }

  // Notes operations (using polymorphic association pattern)
  private notes: Array<{
    id: number;
    text: string;
    referenceType: string;
    referenceId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  private noteIdCounter = 1;

  async createNote(noteData: {
    text: string;
    referenceType: string;
    referenceId: string;
    createdBy: string;
  }): Promise<any> {
    const newNote = {
      id: this.noteIdCounter++,
      ...noteData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notes.push(newNote);
    return newNote;
  }

  async getNotesByReference(referenceType: string, referenceId: string): Promise<any[]> {
    return this.notes.filter(note => 
      note.referenceType === referenceType && note.referenceId === referenceId
    );
  }

  async updateNote(id: number, data: { text: string }): Promise<any | null> {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return null;
    
    this.notes[noteIndex] = {
      ...this.notes[noteIndex],
      text: data.text,
      updatedAt: new Date(),
    };
    return this.notes[noteIndex];
  }

  async deleteNote(id: number): Promise<boolean> {
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return false;
    
    this.notes.splice(noteIndex, 1);
    return true;
  }

  async getNotesCount(referenceType: string, referenceId: string): Promise<number> {
    return this.notes.filter(note => 
      note.referenceType === referenceType && note.referenceId === referenceId
    ).length;
  }

  async getUserNotes(userId: string, page: number = 1, limit: number = 10, referenceType?: string): Promise<{
    notes: any[];
    total: number;
  }> {
    let userNotes = this.notes.filter(note => note.createdBy === userId);
    
    if (referenceType) {
      userNotes = userNotes.filter(note => note.referenceType === referenceType);
    }
    
    const total = userNotes.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotes = userNotes.slice(startIndex, endIndex);
    
    return {
      notes: paginatedNotes,
      total: total
    };
  }

  async exportNotesToCSV(): Promise<string> {
    if (this.notes.length === 0) {
      return 'id,text,referenceType,referenceId,createdBy,createdAt\n';
    }
    
    const csvHeader = 'id,text,referenceType,referenceId,createdBy,createdAt\n';
    const csvRows = this.notes.map(note => 
      `${note.id},"${note.text}",${note.referenceType},${note.referenceId},${note.createdBy},${note.createdAt.toISOString()}`
    ).join('\n');
    
    return csvHeader + csvRows + '\n';
  }

  // Missing draft quote methods
  async getCurrentDraftQuote(userId: string, sessionId?: string): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
    const draftQuote = this.quotes.find(quote => 
      quote.status === 'draft' && 
      (quote.createdBy === userId || (sessionId && quote.sessionId === sessionId))
    );
    
    if (!draftQuote) {
      return undefined;
    }
    
    const items = this.quoteItems.filter(item => item.quoteId === draftQuote.id);
    return { ...draftQuote, items };
  }

  async touchDraftQuote(quoteId: number, sessionId: string): Promise<void> {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (quote && quote.status === 'draft') {
      quote.sessionId = sessionId;
      quote.lastAccessedAt = new Date();
    }
  }

  async cleanupExpiredDrafts(): Promise<number> {
    const now = new Date();
    const expiredQuotes = this.quotes.filter(quote => 
      quote.status === 'draft' && 
      quote.expiresAt && 
      quote.expiresAt < now
    );
    
    for (const quote of expiredQuotes) {
      // Remove quote items
      this.quoteItems = this.quoteItems.filter(item => item.quoteId !== quote.id);
      // Remove quote
      this.quotes = this.quotes.filter(q => q.id !== quote.id);
    }
    
    return expiredQuotes.length;
  }

  async migrateDraftToSession(userId: string, sessionId: string): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
    const userDraft = this.quotes.find(quote => 
      quote.status === 'draft' && 
      quote.createdBy === userId && 
      !quote.sessionId
    );
    
    if (!userDraft) {
      return undefined;
    }
    
    userDraft.sessionId = sessionId;
    userDraft.lastAccessedAt = new Date();
    
    const items = this.quoteItems.filter(item => item.quoteId === userDraft.id);
    return { ...userDraft, items };
  }

  // Additional methods that might be missing
  async updateDraftQuote(quoteId: number, updates: Partial<Quote>): Promise<Quote | undefined> {
    const quote = this.quotes.find(q => q.id === quoteId && q.status === 'draft');
    if (!quote) {
      return undefined;
    }
    
    Object.assign(quote, updates, { updatedAt: new Date() });
    return quote;
  }

  async deleteDraftQuote(quoteId: number): Promise<void> {
    const quoteIndex = this.quotes.findIndex(q => q.id === quoteId && q.status === 'draft');
    if (quoteIndex === -1) {
      return;
    }
    
    // Remove quote items
    this.quoteItems = this.quoteItems.filter(item => item.quoteId !== quoteId);
    // Remove quote
    this.quotes.splice(quoteIndex, 1);
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
    const quote = this.quotes.find(q => q.id === quoteId && q.status === 'draft');
    if (!quote) {
      throw new Error(`Draft quote with id ${quoteId} not found`);
    }

    const newItem: QuoteItem = {
      id: this.nextId++,
      quoteId,
      itemId: item.itemId,
      itemName: item.itemName,
      itemSku: item.itemSku,
      unitPrice: item.unitPrice.toString(),
      vatRate: item.vatRate.toString(),
      vatAmount: item.vatAmount.toString(),
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
      totalWithVat: item.totalWithVat.toString(),
      createdAt: new Date(),
    };
    
    this.quoteItems.push(newItem);
    quote.updatedAt = new Date();
    
    const items = this.quoteItems.filter(qi => qi.quoteId === quoteId);
    return { ...quote, items };
  }

  async updateDraftQuoteChargeCode(quoteId: number, chargeCode: string): Promise<Quote & { items: QuoteItem[] }> {
    const quote = this.quotes.find(q => q.id === quoteId && q.status === 'draft');
    if (!quote) {
      throw new Error(`Draft quote with id ${quoteId} not found`);
    }

    quote.chargeCode = chargeCode;
    quote.updatedAt = new Date();
    
    const items = this.quoteItems.filter(qi => qi.quoteId === quoteId);
    return { ...quote, items };
  }

  async updateDraftQuoteItems(quoteId: number, items: Array<any>): Promise<QuoteItem[]> {
    // Remove existing items
    this.quoteItems = this.quoteItems.filter(item => item.quoteId !== quoteId);
    
    // Add new items
    const newItems: QuoteItem[] = [];
    for (const item of items) {
      const quoteItem: QuoteItem = {
        id: this.nextId++,
        quoteId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        unitPrice: item.unitPrice.toString(),
        vatRate: item.vatRate.toString(),
        vatAmount: item.vatAmount.toString(),
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
        totalWithVat: item.totalWithVat.toString(),
        createdAt: new Date(),
      };
      this.quoteItems.push(quoteItem);
      newItems.push(quoteItem);
    }
    
    return newItems;
  }
}
