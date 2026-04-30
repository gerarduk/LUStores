import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

interface ForeignKey {
  column: string;
  foreignTable: string;
  foreignColumn: string;
  constraintName: string;
}

interface Table {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  referencedBy: Array<{
    table: string;
    column: string;
    foreignColumn: string;
  }>;
}

interface DatabaseSchema {
  tables: Table[];
  migrationOrder: string[];
  dependencyGraph: Record<string, string[]>;
}

// Static schema data based on the current database structure
// Updated: January 2025 - Complete schema with all 20 tables and current column definitions
const SCHEMA_DATA: DatabaseSchema = {
  tables: [
    // 1. Sessions table (for authentication)
    {
      name: 'sessions',
      columns: [
        { name: 'sid', type: 'varchar', nullable: false, isPrimaryKey: true },
        { name: 'sess', type: 'jsonb', nullable: false, isPrimaryKey: false },
        { name: 'expire', type: 'timestamp', nullable: false, isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
    // 2. Users table
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'varchar', nullable: false, isPrimaryKey: true },
        { name: 'email', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'password_hash', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'first_name', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'last_name', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'role', type: 'varchar', nullable: false, defaultValue: "'user'", isPrimaryKey: false },
        { name: 'is_active', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'must_change_password', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'last_login', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'profile_image_url', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'show_picking_list', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: [
        { table: 'notes', column: 'created_by', foreignColumn: 'id' },
        { table: 'chargecodes', column: 'authorised_by', foreignColumn: 'id' },
        { table: 'chargecodes', column: 'held_by', foreignColumn: 'id' },
        { table: 'items', column: 'created_by', foreignColumn: 'id' },
        { table: 'items', column: 'updated_by', foreignColumn: 'id' },
        { table: 'orders', column: 'created_by', foreignColumn: 'id' },
        { table: 'orders', column: 'received_by', foreignColumn: 'id' },
        { table: 'quotes', column: 'created_by', foreignColumn: 'id' },
        { table: 'quotes', column: 'processed_by', foreignColumn: 'id' },
        { table: 'sales', column: 'processed_by', foreignColumn: 'id' },
        { table: 'stock_movements', column: 'performed_by', foreignColumn: 'id' },
        { table: 'charge_code_exclusions', column: 'created_by', foreignColumn: 'id' },
        { table: 'charge_code_authorized_users', column: 'created_by', foreignColumn: 'id' },
        { table: 'charge_code_assignments', column: 'assigned_by', foreignColumn: 'id' },
        { table: 'user_permissions', column: 'user_id', foreignColumn: 'id' },
        { table: 'user_permissions', column: 'granted_by', foreignColumn: 'id' },
        { table: 'permission_definitions', column: 'created_by', foreignColumn: 'id' },
        { table: 'archive_jobs', column: 'created_by', foreignColumn: 'id' },
        { table: 'archive_jobs', column: 'deleted_by', foreignColumn: 'id' },
      ]
    },
    // 3. Notes table
    {
      name: 'notes',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'text', type: 'text', nullable: false, isPrimaryKey: false },
        { name: 'reference_type', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'reference_id', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'notes_created_by_fkey' }
      ],
      referencedBy: [
        { table: 'suppliers', column: 'notes_id', foreignColumn: 'id' },
        { table: 'chargecodes', column: 'notes_id', foreignColumn: 'id' },
        { table: 'items', column: 'notes_id', foreignColumn: 'id' },
        { table: 'orders', column: 'notes_id', foreignColumn: 'id' },
        { table: 'quotes', column: 'notes_id', foreignColumn: 'id' },
        { table: 'sales', column: 'notes_id', foreignColumn: 'id' },
        { table: 'sources', column: 'notes_id', foreignColumn: 'id' },
      ]
    },
    // 4. Categories table
    {
      name: 'categories',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'icon', type: 'varchar(50)', nullable: false, defaultValue: "'fas fa-box'", isPrimaryKey: false },
        { name: 'color', type: 'varchar(50)', nullable: false, defaultValue: "'blue'", isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: [
        { table: 'items', column: 'category_id', foreignColumn: 'id' },
        { table: 'order_items', column: 'category_id', foreignColumn: 'id' },
        { table: 'charge_code_exclusions', column: 'category_id', foreignColumn: 'id' },
      ]
    },
    // 5. Suppliers table
    {
      name: 'suppliers',
      columns: [
        { name: 'id', type: 'varchar', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'contact', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'email', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'phone', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'address', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'account_number', type: 'varchar(25)', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'suppliers_notes_id_fkey' }
      ],
      referencedBy: [
        { table: 'orders', column: 'supplier_id', foreignColumn: 'id' },
        { table: 'sources', column: 'supplier_id', foreignColumn: 'id' },
      ]
    },
    // 6. Chargecodes table
    {
      name: 'chargecodes',
      columns: [
        { name: 'code', type: 'varchar', nullable: false, isPrimaryKey: true },
        { name: 'title', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'authorised_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'valid_from', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'valid_until', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'pin', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'cost_centre', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'activity', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'cat3', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'on_hold', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'hold_reason', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'held_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'held_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'authorised_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'chargecodes_authorised_by_fkey' },
        { column: 'held_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'chargecodes_held_by_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'chargecodes_notes_id_fkey' }
      ],
      referencedBy: [
        { table: 'sales', column: 'charge_code', foreignColumn: 'code' },
        { table: 'quotes', column: 'charge_code', foreignColumn: 'code' },
        { table: 'charge_code_exclusions', column: 'charge_code', foreignColumn: 'code' },
        { table: 'charge_code_authorized_users', column: 'charge_code', foreignColumn: 'code' },
        { table: 'charge_code_assignments', column: 'charge_code', foreignColumn: 'code' },
      ]
    },
    // 7. Items table
    {
      name: 'items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'category_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'price', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'decimal(5,4)', nullable: false, defaultValue: '0.2000', isPrimaryKey: false },
        { name: 'vat_included', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'current_stock', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'minimum_stock', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'unit', type: 'varchar(50)', nullable: false, defaultValue: "'pieces'", isPrimaryKey: false },
        { name: 'location', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'is_active', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'low_stock_acknowledged_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'updated_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'items_category_id_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'items_notes_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'items_created_by_fkey' },
        { column: 'updated_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'items_updated_by_fkey' }
      ],
      referencedBy: [
        { table: 'stock_movements', column: 'item_id', foreignColumn: 'id' },
        { table: 'sale_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'quote_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'order_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'sources', column: 'item_id', foreignColumn: 'id' },
      ]
    },
    // 8. Stock movements table
    {
      name: 'stock_movements',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'type', type: 'varchar(20)', nullable: false, isPrimaryKey: false },
        { name: 'quantity', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'previous_stock', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'new_stock', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'reason', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'performed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'stock_movements_item_id_fkey' },
        { column: 'performed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'stock_movements_performed_by_fkey' }
      ],
      referencedBy: []
    },
    // 9. Sales table
    {
      name: 'sales',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'sale_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'charge_code', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal_amount', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'decimal(12,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'total_amount', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_applied', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'customer_info', type: 'jsonb', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'completed'", isPrimaryKey: false },
        { name: 'is_paid', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'processed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'delivered_to', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'delivered_to_email', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'delivered_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'sales_charge_code_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'sales_notes_id_fkey' },
        { column: 'processed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'sales_processed_by_fkey' }
      ],
      referencedBy: [
        { table: 'sale_items', column: 'sale_id', foreignColumn: 'id' }
      ]
    },
    // 10. Sale items table
    {
      name: 'sale_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'sale_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'unit_price', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'decimal(5,4)', nullable: false, isPrimaryKey: false },
        { name: 'vat_included', type: 'boolean', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'quantity', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'total_with_vat', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'sale_id', foreignTable: 'sales', foreignColumn: 'id', constraintName: 'sale_items_sale_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'sale_items_item_id_fkey' }
      ],
      referencedBy: []
    },
    // 11. Quotes table
    {
      name: 'quotes',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'quote_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'quote_name', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'charge_code', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal_amount', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'decimal(12,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'total_amount', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_applied', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'customer_info', type: 'jsonb', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'draft'", isPrimaryKey: false },
        { name: 'session_id', type: 'varchar(255)', nullable: true, isPrimaryKey: false },
        { name: 'last_accessed_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'expires_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'processed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'processed_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'quotes_charge_code_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'quotes_notes_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'quotes_created_by_fkey' },
        { column: 'processed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'quotes_processed_by_fkey' }
      ],
      referencedBy: [
        { table: 'quote_items', column: 'quote_id', foreignColumn: 'id' }
      ]
    },
    // 12. Quote items table
    {
      name: 'quote_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'quote_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'unit_price', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'decimal(5,4)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'quantity', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'total_with_vat', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'quote_id', foreignTable: 'quotes', foreignColumn: 'id', constraintName: 'quote_items_quote_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'quote_items_item_id_fkey' }
      ],
      referencedBy: []
    },
    // 13. Orders table
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'order_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'supplier_id', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'pending'", isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'total_amount', type: 'decimal(12,2)', nullable: true, isPrimaryKey: false },
        { name: 'delivery_charge', type: 'decimal(10,2)', nullable: true, defaultValue: '0', isPrimaryKey: false },
        { name: 'vat_rate', type: 'decimal(5,4)', nullable: true, defaultValue: '0.2000', isPrimaryKey: false },
        { name: 'vat_included', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'update_inventory_values', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'invoice_pdf_path', type: 'varchar(500)', nullable: true, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'received_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'received_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'supplier_id', foreignTable: 'suppliers', foreignColumn: 'id', constraintName: 'orders_supplier_id_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'orders_notes_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'orders_created_by_fkey' },
        { column: 'received_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'orders_received_by_fkey' }
      ],
      referencedBy: [
        { table: 'order_items', column: 'order_id', foreignColumn: 'id' }
      ]
    },
    // 14. Order items table
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'order_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'vendor_sku', type: 'varchar(100)', nullable: true, isPrimaryKey: false },
        { name: 'item_description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'category_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'unit_cost', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'quantity', type: 'decimal(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'total_cost', type: 'decimal(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'decimal(5,4)', nullable: false, defaultValue: '0.2000', isPrimaryKey: false },
        { name: 'vat_amount', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'received', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'received_quantity', type: 'decimal(10,2)', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id', constraintName: 'order_items_order_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'order_items_item_id_fkey' },
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'order_items_category_id_fkey' }
      ],
      referencedBy: []
    },
    // 15. Sources table
    {
      name: 'sources',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'supplier_id', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'price', type: 'decimal(10,2)', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'sources_item_id_fkey' },
        { column: 'supplier_id', foreignTable: 'suppliers', foreignColumn: 'id', constraintName: 'sources_supplier_id_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'sources_notes_id_fkey' }
      ],
      referencedBy: []
    },
    // 16. Charge code exclusions table
    {
      name: 'charge_code_exclusions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'charge_code', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'category_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'charge_code_exclusions_charge_code_fkey' },
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'charge_code_exclusions_category_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'charge_code_exclusions_created_by_fkey' }
      ],
      referencedBy: []
    },
    // 17. Charge code authorized users table
    {
      name: 'charge_code_authorized_users',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'charge_code', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'user_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'email', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'department', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'notes', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'charge_code_authorized_users_charge_code_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'charge_code_authorized_users_created_by_fkey' }
      ],
      referencedBy: []
    },
    // 18. Charge code assignments table
    {
      name: 'charge_code_assignments',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'user_id', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'charge_code', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'assigned_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'assigned_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'notes', type: 'text', nullable: true, isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'user_id', foreignTable: 'users', foreignColumn: 'id', constraintName: 'charge_code_assignments_user_id_fkey' },
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'charge_code_assignments_charge_code_fkey' },
        { column: 'assigned_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'charge_code_assignments_assigned_by_fkey' }
      ],
      referencedBy: []
    },
    // 19. System settings table
    {
      name: 'system_settings',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'key', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'value', type: 'jsonb', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'category', type: 'varchar(50)', nullable: false, defaultValue: "'general'", isPrimaryKey: false },
        { name: 'is_system', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
    // 20. User permissions table
    {
      name: 'user_permissions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'user_id', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'permission', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'granted', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'granted_by', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'user_id', foreignTable: 'users', foreignColumn: 'id', constraintName: 'user_permissions_user_id_fkey' },
        { column: 'granted_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'user_permissions_granted_by_fkey' }
      ],
      referencedBy: []
    },
    // 21. Permission definitions table
    {
      name: 'permission_definitions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: false, isPrimaryKey: false },
        { name: 'category', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'default_roles', type: 'jsonb', nullable: false, isPrimaryKey: false },
        { name: 'is_system', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
    // 22. Archive jobs table
    {
      name: 'archive_jobs',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'archive_name', type: 'varchar(255)', nullable: false, isPrimaryKey: false },
        { name: 'archive_path', type: 'varchar(500)', nullable: false, isPrimaryKey: false },
        { name: 'age_threshold_days', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'records_archived', type: 'jsonb', nullable: false, defaultValue: "'{}'", isPrimaryKey: false },
        { name: 'archive_size_bytes', type: 'integer', nullable: false, defaultValue: '0', isPrimaryKey: false },
        { name: 'status', type: 'varchar(50)', nullable: false, defaultValue: "'pending'", isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'deleted_from_db', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'deleted_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'deleted_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'error_message', type: 'text', nullable: true, isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'archive_jobs_created_by_fkey' },
        { column: 'deleted_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'archive_jobs_deleted_by_fkey' }
      ],
      referencedBy: []
    },
    // 7. Items table
    {
      name: 'items',
      columns: [
        { name: 'id', type: 'varchar', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'sku', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'category_id', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'supplier_id', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'cost_price', type: 'decimal', nullable: true, isPrimaryKey: false },
        { name: 'selling_price', type: 'decimal', nullable: true, isPrimaryKey: false },
        { name: 'current_stock', type: 'decimal', nullable: false, isPrimaryKey: false },
        { name: 'min_stock_level', type: 'decimal', nullable: true, isPrimaryKey: false },
        { name: 'max_stock_level', type: 'decimal', nullable: true, isPrimaryKey: false },
        { name: 'unit', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'location', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'is_active', type: 'boolean', nullable: false, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'updated_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'notes_id', type: 'varchar', nullable: true, isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'items_category_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'items_created_by_fkey' },
        { column: 'updated_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'items_updated_by_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'items_notes_id_fkey' }
      ],
      referencedBy: [
        { table: 'stock_movements', column: 'item_id', foreignColumn: 'id' },
        { table: 'sale_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'quote_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'order_items', column: 'item_id', foreignColumn: 'id' },
        { table: 'sources', column: 'item_id', foreignColumn: 'id' },
      ]
    },
    // 8. Stock movements table
    {
      name: 'stock_movements',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'type', type: 'varchar(20)', nullable: false, isPrimaryKey: false },
        { name: 'quantity', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'previous_stock', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'new_stock', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'reason', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'performed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'stock_movements_item_id_fkey' },
        { column: 'performed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'stock_movements_performed_by_fkey' }
      ],
      referencedBy: []
    },
    // 9. Sales table
    {
      name: 'sales',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'sale_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'charge_code', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal_amount', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'numeric(12,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'total_amount', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_applied', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'customer_info', type: 'jsonb', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'completed'", isPrimaryKey: false },
        { name: 'is_paid', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'processed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'sales_notes_id_fkey' },
        { column: 'processed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'sales_processed_by_fkey' }
      ],
      referencedBy: [
        { table: 'sale_items', column: 'sale_id', foreignColumn: 'id' },
      ]
    },
    // 10. Sale items table
    {
      name: 'sale_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'sale_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'unit_price', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'numeric(5,4)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'numeric(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'quantity', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'subtotal', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'total_with_vat', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'sale_id', foreignTable: 'sales', foreignColumn: 'id', constraintName: 'sale_items_sale_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'sale_items_item_id_fkey' }
      ],
      referencedBy: []
    },
    // 11. Quotes table
    {
      name: 'quotes',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'quote_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'quote_name', type: 'varchar(200)', nullable: true, isPrimaryKey: false },
        { name: 'charge_code', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'subtotal_amount', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'numeric(12,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'total_amount', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_applied', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'customer_info', type: 'jsonb', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'draft'", isPrimaryKey: false },
        { name: 'session_id', type: 'varchar(255)', nullable: true, isPrimaryKey: false },
        { name: 'last_accessed_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'expires_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'processed_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'processed_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'quotes_notes_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'quotes_created_by_fkey' },
        { column: 'processed_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'quotes_processed_by_fkey' }
      ],
      referencedBy: [
        { table: 'quote_items', column: 'quote_id', foreignColumn: 'id' },
      ]
    },
    // 12. Quote items table
    {
      name: 'quote_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'quote_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'unit_price', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'vat_rate', type: 'numeric(5,4)', nullable: false, isPrimaryKey: false },
        { name: 'vat_amount', type: 'numeric(10,2)', nullable: false, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'quantity', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'subtotal', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'total_with_vat', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'quote_id', foreignTable: 'quotes', foreignColumn: 'id', constraintName: 'quote_items_quote_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'quote_items_item_id_fkey' }
      ],
      referencedBy: []
    },
    // 13. Orders table
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'order_id', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'supplier_id', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'status', type: 'varchar(20)', nullable: false, defaultValue: "'pending'", isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'total_amount', type: 'numeric(12,2)', nullable: true, isPrimaryKey: false },
        { name: 'delivery_charge', type: 'numeric(10,2)', nullable: true, defaultValue: '0.00', isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'received_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'received_at', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'supplier_id', foreignTable: 'suppliers', foreignColumn: 'id', constraintName: 'orders_supplier_id_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'orders_notes_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'orders_created_by_fkey' },
        { column: 'received_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'orders_received_by_fkey' }
      ],
      referencedBy: [
        { table: 'order_items', column: 'order_id', foreignColumn: 'id' },
      ]
    },
    // 14. Order items table
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'order_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'item_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'item_name', type: 'varchar(200)', nullable: false, isPrimaryKey: false },
        { name: 'item_sku', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'item_description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'category_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'unit_cost', type: 'numeric(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'quantity', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'total_cost', type: 'numeric(12,2)', nullable: false, isPrimaryKey: false },
        { name: 'received', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'order_id', foreignTable: 'orders', foreignColumn: 'id', constraintName: 'order_items_order_id_fkey' },
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'order_items_item_id_fkey' },
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'order_items_category_id_fkey' }
      ],
      referencedBy: []
    },
    // 15. Sources table (item-supplier relationship)
    {
      name: 'sources',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'item_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'supplier_id', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'price', type: 'numeric(10,2)', nullable: true, isPrimaryKey: false },
        { name: 'notes_id', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'item_id', foreignTable: 'items', foreignColumn: 'id', constraintName: 'sources_item_id_fkey' },
        { column: 'supplier_id', foreignTable: 'suppliers', foreignColumn: 'id', constraintName: 'sources_supplier_id_fkey' },
        { column: 'notes_id', foreignTable: 'notes', foreignColumn: 'id', constraintName: 'sources_notes_id_fkey' }
      ],
      referencedBy: []
    },
    // 16. Charge code exclusions table
    {
      name: 'charge_code_exclusions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'charge_code', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'category_id', type: 'integer', nullable: false, isPrimaryKey: false },
        { name: 'created_by', type: 'varchar', nullable: true, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'charge_code', foreignTable: 'chargecodes', foreignColumn: 'code', constraintName: 'charge_code_exclusions_charge_code_fkey' },
        { column: 'category_id', foreignTable: 'categories', foreignColumn: 'id', constraintName: 'charge_code_exclusions_category_id_fkey' },
        { column: 'created_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'charge_code_exclusions_created_by_fkey' }
      ],
      referencedBy: []
    },
    // 17. System settings table
    {
      name: 'system_settings',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'key', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'value', type: 'jsonb', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'category', type: 'varchar(50)', nullable: false, defaultValue: "'general'", isPrimaryKey: false },
        { name: 'is_system', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
    // 18. User permissions table
    {
      name: 'user_permissions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'user_id', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'permission', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'granted', type: 'boolean', nullable: false, defaultValue: 'true', isPrimaryKey: false },
        { name: 'granted_by', type: 'varchar', nullable: false, isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [
        { column: 'user_id', foreignTable: 'users', foreignColumn: 'id', constraintName: 'user_permissions_user_id_fkey' },
        { column: 'granted_by', foreignTable: 'users', foreignColumn: 'id', constraintName: 'user_permissions_granted_by_fkey' }
      ],
      referencedBy: []
    },
    // 19. Permission definitions table
    {
      name: 'permission_definitions',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'varchar(100)', nullable: false, isPrimaryKey: false },
        { name: 'description', type: 'text', nullable: false, isPrimaryKey: false },
        { name: 'category', type: 'varchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'default_roles', type: 'jsonb', nullable: false, isPrimaryKey: false },
        { name: 'is_system', type: 'boolean', nullable: false, defaultValue: 'false', isPrimaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
    // 20. System tests table
    {
      name: 'system_tests',
      columns: [
        { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
        { name: 'test_type', type: 'varchar(32)', nullable: false, isPrimaryKey: false },
        { name: 'status', type: 'varchar(32)', nullable: false, isPrimaryKey: false },
        { name: 'output', type: 'text', nullable: true, isPrimaryKey: false },
        { name: 'start_time', type: 'timestamp', nullable: false, isPrimaryKey: false },
        { name: 'end_time', type: 'timestamp', nullable: true, isPrimaryKey: false },
        { name: 'duration', type: 'integer', nullable: true, isPrimaryKey: false },
        { name: 'updated_at', type: 'timestamp', nullable: true, defaultValue: 'now()', isPrimaryKey: false },
      ],
      foreignKeys: [],
      referencedBy: []
    },
  ],
  // Migration order based on dependencies (independent tables first)
  migrationOrder: [
    'sessions',     // Independent (authentication)
    'users',        // Independent (no foreign keys)
    'notes',        // Depends on: users
    'categories',   // Independent
    'suppliers',    // Depends on: notes
    'chargecodes',  // Depends on: users, notes
    'items',        // Depends on: categories, users, notes
    'stock_movements', // Depends on: items, users
    'orders',       // Depends on: suppliers, users, notes
    'order_items',  // Depends on: orders, items, categories
    'sales',        // Depends on: users, notes
    'sale_items',   // Depends on: sales, items
    'quotes',       // Depends on: users, notes
    'quote_items',  // Depends on: quotes, items
    'sources',      // Depends on: items, suppliers, notes
    'charge_code_exclusions', // Depends on: chargecodes, categories, users
    'charge_code_authorized_users', // Depends on: chargecodes, users
    'charge_code_assignments', // Depends on: users, chargecodes
    'system_settings', // Independent
    'permission_definitions', // Independent
    'user_permissions', // Depends on: users
    'archive_jobs', // Depends on: users
  ],
  dependencyGraph: {
    'sessions': [],
    'users': [],
    'notes': ['users'],
    'categories': [],
    'suppliers': ['notes'],
    'chargecodes': ['users', 'notes'],
    'items': ['categories', 'users', 'notes'],
    'stock_movements': ['items', 'users'],
    'orders': ['suppliers', 'users', 'notes'],
    'order_items': ['orders', 'items', 'categories'],
    'sales': ['users', 'notes'],
    'sale_items': ['sales', 'items'],
    'quotes': ['users', 'notes'],
    'quote_items': ['quotes', 'items'],
    'sources': ['items', 'suppliers', 'notes'],
    'charge_code_exclusions': ['chargecodes', 'categories', 'users'],
    'charge_code_authorized_users': ['chargecodes', 'users'],
    'charge_code_assignments': ['users', 'chargecodes'],
    'system_settings': [],
    'permission_definitions': [],
    'user_permissions': ['users'],
    'archive_jobs': ['users'],
  }
};

const DatabaseSchemaViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const renderColumn = (column: Column) => (
    <div key={column.name} className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded">
      <div className="flex items-center space-x-2">
        {column.isPrimaryKey && (
          <span className="text-yellow-600" title="Primary Key">
            <i className="fas fa-key text-xs"></i>
          </span>
        )}
        <span className="font-mono text-sm font-medium">{column.name}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs">
          {column.type}
        </Badge>
        {!column.nullable && (
          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
            NOT NULL
          </Badge>
        )}
        {column.defaultValue && (
          <span className="text-xs text-gray-500" title={`Default: ${column.defaultValue}`}>
            <i className="fas fa-equals"></i>
          </span>
        )}
      </div>
    </div>
  );

  const renderForeignKey = (fk: ForeignKey) => (
    <div key={fk.constraintName} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded">
      <div className="flex items-center space-x-2">
        <span className="text-blue-600" title="Foreign Key">
          <i className="fas fa-link text-xs"></i>
        </span>
        <span className="font-mono text-sm">{fk.column}</span>
        <span className="text-gray-500">→</span>
        <span className="font-mono text-sm text-blue-600">{fk.foreignTable}.{fk.foreignColumn}</span>
      </div>
    </div>
  );

  const renderReferencedBy = (ref: { table: string; column: string; foreignColumn: string }) => (
    <div key={`${ref.table}.${ref.column}`} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded">
      <div className="flex items-center space-x-2">
        <span className="text-green-600" title="Referenced By">
          <i className="fas fa-arrow-left text-xs"></i>
        </span>
        <span className="font-mono text-sm text-green-600">{ref.table}.{ref.column}</span>
        <span className="text-gray-500">←</span>
        <span className="font-mono text-sm">{ref.foreignColumn}</span>
      </div>
    </div>
  );

  const renderMigrationOrder = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <i className="fas fa-exclamation-triangle text-yellow-600"></i>
          <h3 className="font-semibold text-yellow-800">Migration Order Importance</h3>
        </div>
        <p className="text-sm text-yellow-700">
          Tables must be migrated in the order shown below to maintain referential integrity. 
          Tables higher in the list have fewer dependencies and should be migrated first.
        </p>
      </div>
      
      <div className="space-y-3">
        {SCHEMA_DATA.migrationOrder.map((tableName, index) => {
          const dependencies = SCHEMA_DATA.dependencyGraph[tableName] || [];
          
          return (
            <div key={tableName} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-accent">
              <div className="flex-shrink-0">
                <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                  {index + 1}
                </Badge>
              </div>
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold">{tableName}</span>
                  {dependencies.length === 0 && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Independent
                    </Badge>
                  )}
                </div>
                {dependencies.length > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Depends on:</span>
                    <div className="flex flex-wrap gap-1">
                      {dependencies.map(dep => (
                        <Badge key={dep} variant="secondary" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTable(tableName)}
                className="text-blue-600 hover:text-blue-800"
              >
                <i className="fas fa-eye"></i>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTableList = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {SCHEMA_DATA.tables.map(table => (
        <Card 
          key={table.name} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedTable(table.name)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-mono">{table.name}</CardTitle>
              <Badge variant="outline">
                {table.columns.length} columns
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Foreign Keys:</span>
                <span className="font-semibold">{table.foreignKeys.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Referenced By:</span>
                <span className="font-semibold">{table.referencedBy.length}</span>
              </div>
              {table.foreignKeys.length > 0 && (
                <div className="text-xs text-blue-600">
                  → {table.foreignKeys.map(fk => fk.foreignTable).join(', ')}
                </div>
              )}
              {table.referencedBy.length > 0 && (
                <div className="text-xs text-green-600">
                  ← {[...new Set(table.referencedBy.map(ref => ref.table))].join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const selectedTableData = selectedTable ? SCHEMA_DATA.tables.find(t => t.name === selectedTable) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Schema</h1>
          <p className="text-gray-600">
            Interactive view of database tables, relationships, and migration dependencies
          </p>
        </div>
        {selectedTable && (
          <Button variant="outline" onClick={() => setSelectedTable(null)}>
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Overview
          </Button>
        )}
      </div>

      {selectedTableData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <i className="fas fa-table"></i>
              <span className="font-mono">{selectedTableData.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="columns" className="w-full">
              <TabsList>
                <TabsTrigger value="columns">Columns ({selectedTableData.columns.length})</TabsTrigger>
                <TabsTrigger value="relationships">
                  Foreign Keys ({selectedTableData.foreignKeys.length})
                </TabsTrigger>
                <TabsTrigger value="referenced">
                  Referenced By ({selectedTableData.referencedBy.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="columns" className="mt-4">
                <ScrollArea className="h-96">
                  <div className="space-y-1">
                    {selectedTableData.columns.map(renderColumn)}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="relationships" className="mt-4">
                <ScrollArea className="h-96">
                  {selectedTableData.foreignKeys.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTableData.foreignKeys.map(renderForeignKey)}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-unlink text-2xl mb-2"></i>
                      <p>No foreign key relationships</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="referenced" className="mt-4">
                <ScrollArea className="h-96">
                  {selectedTableData.referencedBy.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTableData.referencedBy.map(renderReferencedBy)}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-unlink text-2xl mb-2"></i>
                      <p>No incoming references</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="tables" className="w-full">
          <TabsList>
            <TabsTrigger value="tables">Tables Overview</TabsTrigger>
            <TabsTrigger value="migration">Migration Order</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tables" className="mt-6">
            {renderTableList()}
          </TabsContent>
          
          <TabsContent value="migration" className="mt-6">
            {renderMigrationOrder()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DatabaseSchemaViewer;