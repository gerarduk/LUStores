import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ERDTable {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: Array<{
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    nullable: boolean;
  }>;
}

interface ERDRelationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-many' | 'one-to-one' | 'many-to-many';
}

// Simplified schema for ERD visualization
const ERD_TABLES: ERDTable[] = [
  {
    id: 'users',
    name: 'users',
    x: 50,
    y: 50,
    width: 220,
    height: 160,
    columns: [
      { name: 'id', type: 'varchar', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'email', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'first_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'last_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'role', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'is_active', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'show_picking_list', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'notes',
    name: 'notes',
    x: 350,
    y: 50,
    width: 200,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'text', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'reference_type', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'reference_id', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'categories',
    name: 'categories',
    x: 650,
    y: 50,
    width: 200,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'description', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'icon', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'color', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'suppliers',
    name: 'suppliers',
    x: 50,
    y: 280,
    width: 220,
    height: 160,
    columns: [
      { name: 'id', type: 'varchar', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'contact', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'email', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'phone', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'address', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'account_number', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'items',
    name: 'items',
    x: 350,
    y: 280,
    width: 240,
    height: 200,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'sku', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'description', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'category_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'price', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_rate', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_included', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'current_stock', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'minimum_stock', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'unit', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'location', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'is_active', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'low_stock_acknowledged_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'updated_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'stock_movements',
    name: 'stock_movements',
    x: 650,
    y: 280,
    width: 220,
    height: 160,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'item_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'type', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'quantity', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'previous_stock', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'new_stock', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'reason', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'performed_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'sales',
    name: 'sales',
    x: 50,
    y: 520,
    width: 240,
    height: 180,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'sale_id', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'charge_code', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'subtotal_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'total_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_applied', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'customer_info', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'status', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'is_paid', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'processed_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'delivered_to', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'delivered_to_email', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'delivered_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'sale_items',
    name: 'sale_items',
    x: 350,
    y: 520,
    width: 240,
    height: 180,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'sale_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'item_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'item_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'item_sku', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'unit_price', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_rate', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_included', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'quantity', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'subtotal', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'total_with_vat', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'quotes',
    name: 'quotes',
    x: 650,
    y: 520,
    width: 240,
    height: 200,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'quote_id', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'quote_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'charge_code', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'subtotal_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'total_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_applied', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'customer_info', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'status', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'session_id', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'last_accessed_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'expires_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'processed_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'processed_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'quote_items',
    name: 'quote_items',
    x: 950,
    y: 520,
    width: 240,
    height: 160,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'quote_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'item_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'item_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'item_sku', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'unit_price', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_rate', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'quantity', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'subtotal', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'total_with_vat', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'orders',
    name: 'orders',
    x: 50,
    y: 760,
    width: 240,
    height: 180,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'order_id', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'supplier_id', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'status', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'total_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'delivery_charge', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'vat_rate', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'vat_included', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'update_inventory_values', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'invoice_pdf_path', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'received_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'received_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'order_items',
    name: 'order_items',
    x: 350,
    y: 760,
    width: 260,
    height: 180,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'order_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'item_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'item_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'item_sku', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vendor_sku', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'item_description', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'category_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'unit_cost', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'quantity', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'total_cost', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_rate', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'vat_amount', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'received', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'received_quantity', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'sources',
    name: 'sources',
    x: 650,
    y: 760,
    width: 200,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'item_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'supplier_id', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'price', type: 'decimal', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'chargecodes',
    name: 'chargecodes',
    x: 950,
    y: 50,
    width: 240,
    height: 180,
    columns: [
      { name: 'code', type: 'varchar', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'title', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'authorised_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'valid_from', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'valid_until', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'pin', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'cost_centre', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'activity', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'cat3', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'on_hold', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'hold_reason', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'held_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'held_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'charge_code_exclusions',
    name: 'charge_code_exclusions',
    x: 1220,
    y: 50,
    width: 220,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'charge_code', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'category_id', type: 'integer', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'charge_code_authorized_users',
    name: 'charge_code_authorized_users',
    x: 1220,
    y: 250,
    width: 240,
    height: 160,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'charge_code', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'user_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'email', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'department', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'charge_code_assignments',
    name: 'charge_code_assignments',
    x: 1220,
    y: 470,
    width: 220,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'user_id', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'charge_code', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'assigned_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'assigned_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'notes', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'system_settings',
    name: 'system_settings',
    x: 950,
    y: 280,
    width: 220,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'key', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'value', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'description', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'category', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'is_system', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'user_permissions',
    name: 'user_permissions',
    x: 950,
    y: 470,
    width: 220,
    height: 140,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'user_id', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'permission', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'granted', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'granted_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'permission_definitions',
    name: 'permission_definitions',
    x: 950,
    y: 660,
    width: 240,
    height: 160,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'description', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'category', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'default_roles', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'is_system', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'archive_jobs',
    name: 'archive_jobs',
    x: 650,
    y: 950,
    width: 260,
    height: 180,
    columns: [
      { name: 'id', type: 'integer', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'archive_name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'archive_path', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'age_threshold_days', type: 'integer', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'records_archived', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'archive_size_bytes', type: 'integer', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'status', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'created_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'deleted_from_db', type: 'boolean', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'deleted_at', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: true },
      { name: 'deleted_by', type: 'varchar', isPrimaryKey: false, isForeignKey: true, nullable: true },
      { name: 'error_message', type: 'text', isPrimaryKey: false, isForeignKey: false, nullable: true },
    ]
  },
  {
    id: 'sessions',
    name: 'sessions',
    x: 50,
    y: 1000,
    width: 200,
    height: 120,
    columns: [
      { name: 'sid', type: 'varchar', isPrimaryKey: true, isForeignKey: false, nullable: false },
      { name: 'sess', type: 'jsonb', isPrimaryKey: false, isForeignKey: false, nullable: false },
      { name: 'expire', type: 'timestamp', isPrimaryKey: false, isForeignKey: false, nullable: false },
    ]
  },
];

const ERD_RELATIONSHIPS: ERDRelationship[] = [
  { fromTable: 'notes', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'categories', toTable: 'notes', fromColumn: 'notes_id', toColumn: 'id', type: 'one-to-one' },
  { fromTable: 'suppliers', toTable: 'notes', fromColumn: 'notes_id', toColumn: 'id', type: 'one-to-one' },
  { fromTable: 'items', toTable: 'categories', fromColumn: 'category_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'items', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'sales', toTable: 'users', fromColumn: 'processed_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'sale_items', toTable: 'sales', fromColumn: 'sale_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'sale_items', toTable: 'items', fromColumn: 'item_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'stock_movements', toTable: 'items', fromColumn: 'item_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'stock_movements', toTable: 'users', fromColumn: 'performed_by', toColumn: 'id', type: 'one-to-many' },
  // Quotes relationships
  { fromTable: 'quotes', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'quotes', toTable: 'users', fromColumn: 'processed_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'quote_items', toTable: 'quotes', fromColumn: 'quote_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'quote_items', toTable: 'items', fromColumn: 'item_id', toColumn: 'id', type: 'one-to-many' },
  // Orders relationships
  { fromTable: 'orders', toTable: 'suppliers', fromColumn: 'supplier_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'orders', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'order_items', toTable: 'orders', fromColumn: 'order_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'order_items', toTable: 'items', fromColumn: 'item_id', toColumn: 'id', type: 'one-to-many' },
  // Sources relationships (many-to-many between items and suppliers)
  { fromTable: 'sources', toTable: 'items', fromColumn: 'item_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'sources', toTable: 'suppliers', fromColumn: 'supplier_id', toColumn: 'id', type: 'one-to-many' },
  // Chargecodes relationships
  { fromTable: 'chargecodes', toTable: 'users', fromColumn: 'authorised_by', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'charge_code_exclusions', toTable: 'chargecodes', fromColumn: 'charge_code', toColumn: 'code', type: 'one-to-many' },
  { fromTable: 'charge_code_exclusions', toTable: 'categories', fromColumn: 'category_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'charge_code_exclusions', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  // Charge code assignments relationships (permission system)
  { fromTable: 'charge_code_assignments', toTable: 'users', fromColumn: 'user_id', toColumn: 'id', type: 'one-to-many' },
  { fromTable: 'charge_code_assignments', toTable: 'chargecodes', fromColumn: 'charge_code', toColumn: 'code', type: 'one-to-many' },
  { fromTable: 'charge_code_assignments', toTable: 'users', fromColumn: 'assigned_by', toColumn: 'id', type: 'one-to-many' },
  // Charge code authorized users relationships
  { fromTable: 'charge_code_authorized_users', toTable: 'chargecodes', fromColumn: 'charge_code', toColumn: 'code', type: 'one-to-many' },
  { fromTable: 'charge_code_authorized_users', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
  // Archive jobs relationships
  { fromTable: 'archive_jobs', toTable: 'users', fromColumn: 'created_by', toColumn: 'id', type: 'one-to-many' },
];

const DatabaseERD: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate SVG viewBox based on table positions
  const maxX = Math.max(...ERD_TABLES.map(t => t.x + t.width)) + 50;
  const maxY = Math.max(...ERD_TABLES.map(t => t.y + t.height)) + 50;

  const renderTable = (table: ERDTable) => {
    const isSelected = selectedTable === table.id;
    const headerHeight = 30;
    const rowHeight = 18;

    return (
      <g key={table.id}>
        {/* Table border and background */}
        <rect
          x={table.x}
          y={table.y}
          width={table.width}
          height={table.height}
          fill={isSelected ? '#eff6ff' : 'white'}
          stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={isSelected ? 2 : 1}
          rx={6}
          className="cursor-pointer"
          onClick={() => setSelectedTable(isSelected ? null : table.id)}
        />
        
        {/* Table header */}
        <rect
          x={table.x}
          y={table.y}
          width={table.width}
          height={headerHeight}
          fill={isSelected ? '#dbeafe' : '#f9fafb'}
          stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={isSelected ? 2 : 1}
          rx={6}
          className="cursor-pointer"
          onClick={() => setSelectedTable(isSelected ? null : table.id)}
        />
        
        {/* Table name */}
        <text
          x={table.x + 8}
          y={table.y + 20}
          className="fill-gray-900 text-sm font-semibold font-mono"
          style={{ fontSize: '14px' }}
        >
          {table.name}
        </text>
        
        {/* Table icon */}
        <text
          x={table.x + table.width - 20}
          y={table.y + 20}
          className="fill-gray-500"
          style={{ fontSize: '12px', fontFamily: 'FontAwesome' }}
        >
          🗃️
        </text>
        
        {/* Column separator */}
        <line
          x1={table.x}
          y1={table.y + headerHeight}
          x2={table.x + table.width}
          y2={table.y + headerHeight}
          stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={1}
        />
        
        {/* Columns */}
        {table.columns.map((column, index) => {
          const columnY = table.y + headerHeight + (index * rowHeight) + 14;
          
          return (
            <g key={column.name}>
              <text
                x={table.x + 8}
                y={columnY}
                className={`text-xs font-mono ${column.isPrimaryKey ? 'fill-yellow-700 font-semibold' : 
                  column.isForeignKey ? 'fill-blue-600' : 'fill-gray-700'}`}
                style={{ fontSize: '11px' }}
              >
                {column.isPrimaryKey && '🔑 '}
                {column.isForeignKey && !column.isPrimaryKey && '🔗 '}
                {column.name}
              </text>
              
              <text
                x={table.x + table.width - 8}
                y={columnY}
                className="fill-gray-500 text-xs"
                textAnchor="end"
                style={{ fontSize: '10px' }}
              >
                {column.type}
                {!column.nullable && '*'}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderRelationship = (rel: ERDRelationship) => {
    const fromTable = ERD_TABLES.find(t => t.id === rel.fromTable);
    const toTable = ERD_TABLES.find(t => t.id === rel.toTable);
    
    if (!fromTable || !toTable) return null;

    // Calculate connection points (simplified - center of table sides)
    const fromX = fromTable.x + (fromTable.x < toTable.x ? fromTable.width : 0);
    const fromY = fromTable.y + fromTable.height / 2;
    const toX = toTable.x + (toTable.x < fromTable.x ? toTable.width : 0);
    const toY = toTable.y + toTable.height / 2;

    // Create path with some curvature for better visualization
    const midX = (fromX + toX) / 2;
    const path = `M ${fromX} ${fromY} Q ${midX} ${fromY} ${midX} ${(fromY + toY) / 2} Q ${midX} ${toY} ${toX} ${toY}`;

    return (
      <g key={`${rel.fromTable}-${rel.toTable}-${rel.fromColumn}`}>
        {/* Relationship line */}
        <path
          d={path}
          fill="none"
          stroke="#6b7280"
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
        
        {/* Crow's foot notation at 'many' end */}
        {rel.type === 'one-to-many' && (
          <g>
            {/* Many side (crow's foot) */}
            <line x1={fromX - 10} y1={fromY - 3} x2={fromX} y2={fromY} stroke="#6b7280" strokeWidth={1} />
            <line x1={fromX - 10} y1={fromY + 3} x2={fromX} y2={fromY} stroke="#6b7280" strokeWidth={1} />
            <line x1={fromX - 10} y1={fromY} x2={fromX} y2={fromY} stroke="#6b7280" strokeWidth={1} />
            
            {/* One side (single line) */}
            <line x1={toX} y1={toY - 5} x2={toX} y2={toY + 5} stroke="#6b7280" strokeWidth={2} />
          </g>
        )}
        
        {/* Relationship label */}
        <text
          x={(fromX + toX) / 2}
          y={(fromY + toY) / 2 - 5}
          className="fill-gray-600 text-xs"
          textAnchor="middle"
          style={{ fontSize: '10px' }}
        >
          {rel.fromColumn}
        </text>
      </g>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-project-diagram"></i>
            <span>Entity Relationship Diagram</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              disabled={scale <= 0.5}
            >
              <i className="fas fa-search-minus"></i>
            </Button>
            <Badge variant="outline">{Math.round(scale * 100)}%</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              disabled={scale >= 2}
            >
              <i className="fas fa-search-plus"></i>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setScale(1); setSelectedTable(null); }}
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg bg-muted p-4">
          <ScrollArea className="w-full h-[600px]">
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${maxX} ${maxY}`}
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
              className="bg-white rounded"
            >
              {/* Arrowhead marker for relationships */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              
              {/* Render relationships first (behind tables) */}
              {ERD_RELATIONSHIPS.map(renderRelationship)}
              
              {/* Render tables */}
              {ERD_TABLES.map(renderTable)}
            </svg>
          </ScrollArea>
        </div>
        
        {selectedTable && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">Selected Table: {selectedTable}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTable(null)}>
                <i className="fas fa-times"></i>
              </Button>
            </div>
            <div className="text-sm text-blue-800">
              Click on other tables to explore relationships, or use the Schema tab for detailed information.
            </div>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span>🔑</span>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔗</span>
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>*</span>
              <span>Required (NOT NULL)</span>
            </div>
          </div>
          <div className="text-gray-500">
            Crow's foot notation: Single line = "one" relationship, multiple lines = "many" relationship
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseERD;