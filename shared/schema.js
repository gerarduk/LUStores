import { pgTable, text, varchar, timestamp, jsonb, index, serial, decimal, integer, boolean, unique, } from "drizzle-orm/pg-core";
import { z } from "zod";
import { relations } from "drizzle-orm";
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
}));
// User storage table for local and SSO authentication
export const users = pgTable("users", {
    id: varchar("id").primaryKey().notNull(),
    email: varchar("email").unique().notNull(),
    password_hash: varchar("password_hash"), // null for SSO users
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    role: varchar("role").notNull().default("user"), // user, superuser, admin
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLogin: timestamp("last_login"),
    profileImageUrl: varchar("profile_image_url"),
    showPickingList: boolean("show_picking_list").notNull().default(true), // Whether to show locations/picking list after sales
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Notes table for general purpose notes
export const notes = pgTable("notes", {
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    referenceType: varchar("reference_type", { length: 50 }).notNull(), // 'item', 'supplier', 'order', 'chargecode'
    referenceId: varchar("reference_id", { length: 100 }).notNull(), // ID of the referenced entity
    createdBy: varchar("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    referenceIdx: index("idx_notes_reference").on(table.referenceType, table.referenceId),
    createdByIdx: index("idx_notes_created_by").on(table.createdBy),
    createdAtIdx: index("idx_notes_created_at").on(table.createdAt),
}));
// Categories table for organizing items
export const categories = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }).notNull().default("fas fa-box"),
    color: varchar("color", { length: 50 }).notNull().default("blue"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Inventory items table
export const items = pgTable("items", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    description: text("description"),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.2000"), // Default 20% VAT
    vatIncluded: boolean("vat_included").notNull().default(true), // Whether price includes VAT
    currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default("0.00"),
    minimumStock: decimal("minimum_stock", { precision: 10, scale: 2 }).notNull().default("0.00"),
    unit: varchar("unit", { length: 50 }).notNull().default("pieces"), // Unit of measurement (pieces, kg, liters, etc.)
    location: varchar("location", { length: 200 }), // Physical location (room, shelf, bin, etc.)
    isActive: boolean("is_active").notNull().default(true),
    lowStockAcknowledgedAt: timestamp("low_stock_acknowledged_at"), // When user acknowledged low stock notification
    notesId: integer("notes_id").references(() => notes.id),
    createdBy: varchar("created_by").references(() => users.id), // Allow NULL for deleted users
    updatedBy: varchar("updated_by").references(() => users.id), // Allow NULL for deleted users
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    // Indexes for faster search and filtering
    nameIdx: index("idx_items_name").on(table.name),
    categoryIdx: index("idx_items_category").on(table.categoryId),
    isActiveIdx: index("idx_items_is_active").on(table.isActive),
    updatedAtIdx: index("idx_items_updated_at").on(table.updatedAt),
    // Composite index for common query pattern (active items by category)
    activeCategoryIdx: index("idx_items_active_category").on(table.isActive, table.categoryId),
}));
// Stock movements for audit trail
export const stockMovements = pgTable("stock_movements", {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id),
    type: varchar("type", { length: 20 }).notNull(), // 'in', 'out', 'adjustment'
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    previousStock: decimal("previous_stock", { precision: 10, scale: 2 }).notNull(),
    newStock: decimal("new_stock", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"),
    performedBy: varchar("performed_by").references(() => users.id), // Allow NULL for deleted users
    createdAt: timestamp("created_at").defaultNow(),
});
// Sales table for recording completed transactions
export const sales = pgTable("sales", {
    id: serial("id").primaryKey(),
    saleId: varchar("sale_id", { length: 50 }).notNull().unique(), // Generated sale ID like S202501291234
    chargeCode: varchar("charge_code", { length: 100 }).notNull(), // Customer charge code
    subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).notNull(), // Amount before VAT
    vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).notNull().default("0.00"), // Total VAT amount
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(), // Total including VAT
    vatApplied: boolean("vat_applied").notNull().default(true), // Whether VAT was applied to this sale
    customerInfo: jsonb("customer_info"), // Optional customer information
    notesId: integer("notes_id").references(() => notes.id), // Additional notes
    status: varchar("status", { length: 20 }).notNull().default("completed"), // completed, refunded, etc.
    isPaid: boolean("is_paid").notNull().default(false),
    processedBy: varchar("processed_by").references(() => users.id), // Allow NULL for deleted users
    deliveredTo: varchar("delivered_to", { length: 200 }), // Name of person who received the items
    deliveredToEmail: varchar("delivered_to_email", { length: 200 }), // Email of recipient (from authorized users)
    deliveredAt: timestamp("delivered_at"), // When recipient was recorded
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Sale items table for line items in each sale
export const saleItems = pgTable("sale_items", {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id").notNull().references(() => sales.id),
    itemId: integer("item_id").notNull().references(() => items.id),
    itemName: varchar("item_name", { length: 200 }).notNull(), // Snapshot of item name at time of sale
    itemSku: varchar("item_sku", { length: 100 }).notNull(), // Snapshot of SKU at time of sale
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // Price at time of sale (base price)
    vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull(), // VAT rate at time of sale
    vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0.00"), // VAT amount for this line
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), // Subtotal before VAT
    totalWithVat: decimal("total_with_vat", { precision: 12, scale: 2 }).notNull(), // Total including VAT
    createdAt: timestamp("created_at").defaultNow(),
});
// Quotes table for managing draft quotes before processing
export const quotes = pgTable("quotes", {
    id: serial("id").primaryKey(),
    quoteId: varchar("quote_id", { length: 50 }).notNull().unique(), // Generated quote ID like Q202501291234
    quoteName: varchar("quote_name", { length: 200 }), // User-friendly name for the quote
    chargeCode: varchar("charge_code", { length: 100 }).notNull(), // Customer charge code (required)
    subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).notNull(), // Amount before VAT
    vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).notNull().default("0.00"), // Total VAT amount
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(), // Total including VAT
    vatApplied: boolean("vat_applied").notNull().default(true), // Whether VAT was applied to this quote
    customerInfo: jsonb("customer_info"), // Optional customer information
    notesId: integer("notes_id").references(() => notes.id),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, processed, deleted
    sessionId: varchar("session_id", { length: 255 }), // Session identifier for draft quotes
    lastAccessedAt: timestamp("last_accessed_at").defaultNow(), // Last time quote was accessed
    expiresAt: timestamp("expires_at"), // When draft quote expires
    createdBy: varchar("created_by").references(() => users.id), // Allow NULL for deleted users
    processedBy: varchar("processed_by").references(() => users.id), // Set when quote is processed, allow NULL
    processedAt: timestamp("processed_at"), // Set when quote is processed
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    // Indexes for efficient session-based draft quote management
    sessionUserIdx: index("idx_quotes_session_user").on(table.sessionId, table.createdBy),
    expiryIdx: index("idx_quotes_expiry").on(table.expiresAt),
    statusSessionIdx: index("idx_quotes_status_session").on(table.status, table.sessionId),
    lastAccessedIdx: index("idx_quotes_last_accessed").on(table.lastAccessedAt),
}));
// Quote items table for line items in each quote
export const quoteItems = pgTable("quote_items", {
    id: serial("id").primaryKey(),
    quoteId: integer("quote_id").notNull().references(() => quotes.id),
    itemId: integer("item_id").notNull().references(() => items.id),
    itemName: varchar("item_name", { length: 200 }).notNull(), // Snapshot of item name at time of quote
    itemSku: varchar("item_sku", { length: 100 }).notNull(), // Snapshot of SKU at time of quote
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // Price at time of quote (base price)
    vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull(), // VAT rate at time of quote
    vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0.00"), // VAT amount for this line
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), // Subtotal before VAT
    totalWithVat: decimal("total_with_vat", { precision: 12, scale: 2 }).notNull(), // Total including VAT
    createdAt: timestamp("created_at").defaultNow(),
});
// Suppliers table
export const suppliers = pgTable("suppliers", {
    id: varchar("id").primaryKey().notNull(),
    name: varchar("name").notNull(),
    contact: varchar("contact"),
    email: varchar("email"),
    phone: varchar("phone"),
    address: varchar("address"),
    accountNumber: varchar("account_number", { length: 25 }),
    notesId: integer("notes_id").references(() => notes.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Sources table (item-supplier many-to-many)
export const sources = pgTable("sources", {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => items.id),
    supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
    price: decimal("price", { precision: 10, scale: 2 }),
    notesId: integer("notes_id").references(() => notes.id),
    createdAt: timestamp("created_at").defaultNow(),
});
// Orders table for bulk item procurement
export const orders = pgTable("orders", {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 50 }).notNull().unique(), // Generated order ID like O202501291234
    supplierId: varchar("supplier_id").references(() => suppliers.id), // Optional supplier
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, received, cancelled
    notesId: integer("notes_id").references(() => notes.id),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
    deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
    invoicePdfPath: varchar("invoice_pdf_path", { length: 500 }), // Path to uploaded invoice PDF
    createdBy: varchar("created_by").references(() => users.id), // Allow NULL for deleted users
    receivedBy: varchar("received_by").references(() => users.id), // Allow NULL for deleted users
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Order items table for items in each order
export const orderItems = pgTable("order_items", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id),
    itemId: integer("item_id").references(() => items.id), // Optional - for existing items
    itemName: varchar("item_name", { length: 200 }).notNull(),
    itemSku: varchar("item_sku", { length: 100 }).notNull(),
    vendorSku: varchar("vendor_sku", { length: 100 }), // Vendor's part number/SKU for this order
    itemDescription: text("item_description"),
    categoryId: integer("category_id").references(() => categories.id),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
    received: boolean("received").notNull().default(false),
    receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Chargecodes table
export const chargecodes = pgTable("chargecodes", {
    code: varchar("code").primaryKey().notNull(),
    title: varchar("title").notNull(),
    authorisedBy: varchar("authorised_by").references(() => users.id),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    pin: varchar("pin"),
    costCentre: varchar("cost_centre"),
    activity: varchar("activity", { length: 200 }),
    cat3: varchar("cat3", { length: 200 }),
    notesId: integer("notes_id").references(() => notes.id),
    onHold: boolean("on_hold").notNull().default(false),
    holdReason: text("hold_reason"),
    heldAt: timestamp("held_at"),
    heldBy: varchar("held_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Charge code exclusions table - defines which categories a charge code cannot be used for
export const chargeCodeExclusions = pgTable("charge_code_exclusions", {
    id: serial("id").primaryKey(),
    chargeCode: varchar("charge_code").notNull().references(() => chargecodes.code),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    createdBy: varchar("created_by").references(() => users.id), // Allow NULL for deleted users
    createdAt: timestamp("created_at").defaultNow(),
});
// Charge code authorized users table - defines who is authorized to use a charge code
export const chargeCodeAuthorizedUsers = pgTable("charge_code_authorized_users", {
    id: serial("id").primaryKey(),
    chargeCode: varchar("charge_code").notNull().references(() => chargecodes.code, { onDelete: 'cascade' }),
    userName: varchar("user_name", { length: 200 }).notNull(), // Name of authorized person
    email: varchar("email", { length: 200 }), // Optional email for reference
    department: varchar("department", { length: 200 }), // Optional department
    notes: text("notes"), // Optional notes about this authorization
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// System settings table for configurable permissions and settings
export const systemSettings = pgTable("system_settings", {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull().default("general"),
    isSystem: boolean("is_system").notNull().default(false), // System settings cannot be deleted
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// User permissions table for granular access control
export const userPermissions = pgTable("user_permissions", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id),
    permission: varchar("permission", { length: 100 }).notNull(),
    granted: boolean("granted").notNull().default(true),
    grantedBy: varchar("granted_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
    return {
        userPermissionUnique: unique().on(table.userId, table.permission),
    };
});
// Permission definitions table
export const permissionDefinitions = pgTable("permission_definitions", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    defaultRoles: jsonb("default_roles").notNull(), // Array of roles that get this permission by default
    isSystem: boolean("is_system").notNull().default(false), // System permissions cannot be deleted
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Charge code assignments table - links users to specific charge codes they can use
export const chargeCodeAssignments = pgTable("charge_code_assignments", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    chargeCode: varchar("charge_code", { length: 50 }).notNull().references(() => chargecodes.code, { onDelete: 'cascade' }),
    assignedBy: varchar("assigned_by").references(() => users.id),
    assignedAt: timestamp("assigned_at").defaultNow(),
    notes: text("notes"),
}, (table) => {
    return {
        uniqueUserCode: unique().on(table.userId, table.chargeCode),
    };
});
// Archive jobs table - tracks data archiving operations
export const archiveJobs = pgTable("archive_jobs", {
    id: serial("id").primaryKey(),
    archiveName: varchar("archive_name", { length: 255 }).notNull(),
    archivePath: varchar("archive_path", { length: 500 }).notNull(),
    ageThresholdDays: integer("age_threshold_days").notNull(),
    recordsArchived: jsonb("records_archived").notNull().default('{}'),
    archiveSizeBytes: integer("archive_size_bytes").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default('pending'),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    deletedFromDb: boolean("deleted_from_db").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by").references(() => users.id),
    errorMessage: text("error_message"),
}, (table) => {
    return {
        statusIdx: index("idx_archive_jobs_status").on(table.status),
        createdAtIdx: index("idx_archive_jobs_created_at").on(table.createdAt),
        deletedFromDbIdx: index("idx_archive_jobs_deleted_from_db").on(table.deletedFromDb),
    };
});
// Define relations
export const usersRelations = relations(users, ({ many }) => ({
    createdItems: many(items, { relationName: "created_by" }),
    updatedItems: many(items, { relationName: "updated_by" }),
    stockMovements: many(stockMovements),
    processedSales: many(sales),
    permissions: many(userPermissions, { relationName: "user_permissions" }),
    permissionsGranted: many(userPermissions, { relationName: "permissions_granted_by" }),
    chargeCodeAssignments: many(chargeCodeAssignments, { relationName: "user_charge_codes" }),
    chargeCodesAssigned: many(chargeCodeAssignments, { relationName: "charge_codes_assigned_by" }),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({
    items: many(items),
}));
export const itemsRelations = relations(items, ({ one, many }) => ({
    category: one(categories, {
        fields: [items.categoryId],
        references: [categories.id],
    }),
    createdBy: one(users, {
        fields: [items.createdBy],
        references: [users.id],
        relationName: "created_by",
    }),
    updatedBy: one(users, {
        fields: [items.updatedBy],
        references: [users.id],
        relationName: "updated_by",
    }),
    stockMovements: many(stockMovements),
    sources: many(sources),
}));
export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
    item: one(items, {
        fields: [stockMovements.itemId],
        references: [items.id],
    }),
    performedBy: one(users, {
        fields: [stockMovements.performedBy],
        references: [users.id],
    }),
}));
export const salesRelations = relations(sales, ({ one, many }) => ({
    processedBy: one(users, {
        fields: [sales.processedBy],
        references: [users.id],
    }),
    items: many(saleItems),
}));
export const saleItemsRelations = relations(saleItems, ({ one }) => ({
    sale: one(sales, {
        fields: [saleItems.saleId],
        references: [sales.id],
    }),
    item: one(items, {
        fields: [saleItems.itemId],
        references: [items.id],
    }),
}));
export const quotesRelations = relations(quotes, ({ one, many }) => ({
    createdBy: one(users, {
        fields: [quotes.createdBy],
        references: [users.id],
        relationName: "quote_created_by",
    }),
    processedBy: one(users, {
        fields: [quotes.processedBy],
        references: [users.id],
        relationName: "quote_processed_by",
    }),
    items: many(quoteItems),
}));
export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
    quote: one(quotes, {
        fields: [quoteItems.quoteId],
        references: [quotes.id],
    }),
    item: one(items, {
        fields: [quoteItems.itemId],
        references: [items.id],
    }),
}));
export const suppliersRelations = relations(suppliers, ({ many }) => ({
    sources: many(sources),
    orders: many(orders),
}));
export const sourcesRelations = relations(sources, ({ one }) => ({
    item: one(items, {
        fields: [sources.itemId],
        references: [items.id],
    }),
    supplier: one(suppliers, {
        fields: [sources.supplierId],
        references: [suppliers.id],
    }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [orders.supplierId],
        references: [suppliers.id],
    }),
    createdBy: one(users, {
        fields: [orders.createdBy],
        references: [users.id],
        relationName: "order_created_by",
    }),
    receivedBy: one(users, {
        fields: [orders.receivedBy],
        references: [users.id],
        relationName: "order_received_by",
    }),
    items: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    item: one(items, {
        fields: [orderItems.itemId],
        references: [items.id],
    }),
    category: one(categories, {
        fields: [orderItems.categoryId],
        references: [categories.id],
    }),
}));
export const chargecodesRelations = relations(chargecodes, ({ one, many }) => ({
    authorisedBy: one(users, {
        fields: [chargecodes.authorisedBy],
        references: [users.id],
    }),
    exclusions: many(chargeCodeExclusions),
    authorizedUsers: many(chargeCodeAuthorizedUsers),
    assignments: many(chargeCodeAssignments),
}));
export const chargeCodeExclusionsRelations = relations(chargeCodeExclusions, ({ one }) => ({
    chargeCode: one(chargecodes, {
        fields: [chargeCodeExclusions.chargeCode],
        references: [chargecodes.code],
    }),
    category: one(categories, {
        fields: [chargeCodeExclusions.categoryId],
        references: [categories.id],
    }),
    createdBy: one(users, {
        fields: [chargeCodeExclusions.createdBy],
        references: [users.id],
    }),
}));
export const chargeCodeAuthorizedUsersRelations = relations(chargeCodeAuthorizedUsers, ({ one }) => ({
    chargeCode: one(chargecodes, {
        fields: [chargeCodeAuthorizedUsers.chargeCode],
        references: [chargecodes.code],
    }),
    createdBy: one(users, {
        fields: [chargeCodeAuthorizedUsers.createdBy],
        references: [users.id],
    }),
}));
export const chargeCodeAssignmentsRelations = relations(chargeCodeAssignments, ({ one }) => ({
    user: one(users, {
        fields: [chargeCodeAssignments.userId],
        references: [users.id],
        relationName: "user_charge_codes",
    }),
    chargeCode: one(chargecodes, {
        fields: [chargeCodeAssignments.chargeCode],
        references: [chargecodes.code],
    }),
    assignedBy: one(users, {
        fields: [chargeCodeAssignments.assignedBy],
        references: [users.id],
        relationName: "charge_codes_assigned_by",
    }),
}));
export const archiveJobsRelations = relations(archiveJobs, ({ one }) => ({
    createdBy: one(users, {
        fields: [archiveJobs.createdBy],
        references: [users.id],
        relationName: "archive_jobs_created_by",
    }),
    deletedBy: one(users, {
        fields: [archiveJobs.deletedBy],
        references: [users.id],
        relationName: "archive_jobs_deleted_by",
    }),
}));
export const systemSettingsRelations = relations(systemSettings, ({}) => ({}));
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
    user: one(users, {
        fields: [userPermissions.userId],
        references: [users.id],
        relationName: "user_permissions",
    }),
    grantedByUser: one(users, {
        fields: [userPermissions.grantedBy],
        references: [users.id],
        relationName: "permissions_granted_by",
    }),
}));
export const permissionDefinitionsRelations = relations(permissionDefinitions, ({}) => ({}));
// Insert schemas - using manual schema definition for compatibility
export const insertUserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    password_hash: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.string().default("user"),
    isActive: z.boolean().default(true),
    mustChangePassword: z.boolean().default(false),
    lastLogin: z.date().optional(),
    profileImageUrl: z.string().optional(),
});
export const insertNoteSchema = z.object({
    text: z.string().min(1).max(10000),
    referenceType: z.string().min(1).max(50),
    referenceId: z.string().min(1).max(100),
    createdBy: z.string(),
});
export const updateNoteSchema = z.object({
    id: z.number(),
    text: z.string().min(1).max(10000).optional(),
});
export const insertCategorySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.string().default("fas fa-box"),
    color: z.string().default("blue"),
});
export const insertItemSchema = z.object({
    name: z.string().min(1).max(200),
    sku: z.string().min(1).max(100),
    description: z.string().optional(),
    categoryId: z.number(),
    price: z.string(),
    vatRate: z.string().default("0.2000"),
    vatIncluded: z.boolean().default(true),
    currentStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())).default(0),
    minimumStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())).default(0),
    unit: z.string().min(1).max(50).default("pieces"),
    location: z.string().max(200).optional(),
    isActive: z.boolean().default(true),
    notesId: z.number().optional(), // Foreign key to notes table
    createdBy: z.string(),
});
export const insertStockMovementSchema = z.object({
    itemId: z.number(),
    type: z.string(),
    quantity: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())),
    previousStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())),
    newStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())),
    reason: z.string().optional(),
    performedBy: z.string(),
});
export const insertSaleSchema = z.object({
    saleId: z.string(),
    chargeCode: z.string(),
    subtotalAmount: z.string(),
    vatAmount: z.string().default("0.00"),
    totalAmount: z.string(),
    vatApplied: z.boolean().default(true),
    customerInfo: z.any().optional(),
    notesId: z.number().optional(),
    status: z.string().default("completed"),
});
export const insertSaleItemSchema = z.object({
    saleId: z.number(),
    itemId: z.number(),
    itemName: z.string(),
    itemSku: z.string(),
    unitPrice: z.string(),
    vatRate: z.string(),
    vatAmount: z.string().default("0.00"),
    quantity: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())),
    subtotal: z.string(),
    totalWithVat: z.string(),
});
export const insertQuoteSchema = z.object({
    quoteId: z.string(),
    quoteName: z.string().max(200).optional(),
    chargeCode: z.string(),
    subtotalAmount: z.string(),
    vatAmount: z.string().default("0.00"),
    totalAmount: z.string(),
    vatApplied: z.boolean().default(true),
    customerInfo: z.any().optional(),
    notesId: z.number().optional(),
    status: z.string().default("draft"),
    createdBy: z.string(),
    processedAt: z.date().optional(),
});
export const insertQuoteItemSchema = z.object({
    quoteId: z.number(),
    itemId: z.number(),
    itemName: z.string(),
    itemSku: z.string(),
    unitPrice: z.string(),
    vatRate: z.string(),
    vatAmount: z.string().default("0.00"),
    quantity: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())),
    subtotal: z.string(),
    totalWithVat: z.string(),
});
export const insertSupplierSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    contact: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    accountNumber: z.string().max(25).optional(),
    notesId: z.number().optional(), // Foreign key to notes table
});
export const insertSourceSchema = z.object({
    itemId: z.number(),
    supplierId: z.string(),
    price: z.string().optional(),
    notesId: z.number().optional(),
});
export const insertChargecodeschema = z.object({
    code: z.string(),
    title: z.string(),
    authorisedBy: z.string().optional(),
    validFrom: z.date().optional(),
    validUntil: z.date().optional(),
    pin: z.string().optional(),
    costCentre: z.string().optional(),
    activity: z.string().max(200).optional(),
    cat3: z.string().max(200).optional(),
    notesId: z.number().optional(), // Foreign key to notes table
});
export const insertChargeCodeExclusionSchema = z.object({
    chargeCode: z.string(),
    categoryId: z.number(),
    createdBy: z.string(),
});
export const insertOrderSchema = z.object({
    orderId: z.string(),
    supplierId: z.string().optional(),
    status: z.string().default("pending"),
    notesId: z.number().optional(),
    totalAmount: z.string().optional(),
    deliveryCharge: z.string().optional(),
    createdBy: z.string(),
});
export const insertOrderItemSchema = z.object({
    orderId: z.number(),
    itemId: z.number().optional(),
    itemName: z.string().min(1),
    itemSku: z.string().min(1),
    itemDescription: z.string().optional(),
    categoryId: z.number().optional(),
    unitCost: z.string(),
    quantity: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())).refine(val => val >= 0.01, { message: "Quantity must be at least 0.01" }),
    totalCost: z.string(),
    received: z.boolean().default(false),
});
// Update schemas
export const updateItemSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    categoryId: z.number().optional(),
    price: z.string().optional(),
    vatRate: z.string().optional(),
    vatIncluded: z.boolean().optional(),
    currentStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())).optional(),
    minimumStock: z.union([z.number(), z.string()]).transform(val => parseFloat(val.toString())).optional(),
    unit: z.string().min(1).max(50).optional(),
    location: z.string().max(200).optional(),
    isActive: z.boolean().optional(),
    lowStockAcknowledgedAt: z.date().optional(),
});
export const updateCategorySchema = z.object({
    id: z.number(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
});
// System test results table (only last result per type is kept)
export const systemTests = pgTable("system_tests", {
    id: serial("id").primaryKey(),
    testType: varchar("test_type", { length: 32 }).notNull().unique(), // e.g. unit, integration, sales
    status: varchar("status", { length: 32 }).notNull(), // running, completed, failed
    output: text("output"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    duration: integer("duration"), // ms
    updatedAt: timestamp("updated_at").defaultNow(),
});
// ===========================
// Decimal Stock Helper Functions
// ===========================
/**
 * Format a stock quantity to 2 decimal places
 * @param value - The quantity value (string or number)
 * @returns Formatted string with 2 decimal places (e.g., "10.00", "10.50")
 */
export function formatStockQuantity(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return "0.00";
    return num.toFixed(2);
}
/**
 * Smart display formatting - only show decimals when needed
 * @param value - The quantity value (string or number)
 * @returns Formatted string (e.g., "10" for 10.00, "10.5" for 10.50)
 */
export function formatStockDisplay(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return "0";
    // Remove trailing zeros and unnecessary decimal point
    const formatted = num.toFixed(2);
    return formatted.replace(/\.?0+$/, '');
}
/**
 * Parse and validate a stock quantity input
 * @param value - The input value (string or number)
 * @returns Valid decimal quantity or null if invalid
 */
export function parseStockQuantity(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0)
        return null;
    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
}
