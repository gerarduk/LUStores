#!/usr/bin/env python3
"""
Legacy MySQL/MariaDB to PostgreSQL Migration Script
==================================================

This script migrates data from the legacy physics_stores MySQL/MariaDB database
to the new PostgreSQL schema using Drizzle ORM structure.

The script supports two data sources:
1. Direct connection to MySQL/MariaDB database
2. Parsing SQL backup files

Legacy Tables → New Tables Mapping:
- users → users (with schema transformation)
- stock → items + categories + stockMovements
--- {'YTODATE': 'ST8178', 'LOCATION': None, 'SUPPLY1': 'POST-IT PAGE MARKERS', 'REF2': None, 'ORDERNO': '3.00000', 'SIZE': '6.41000', 'MIN': None, 'ONORDER': None, 'REORDER': '1.00000', 'PREFIX': '4.00000', 'CODE': '1.00000', 'REF1': None, 'DESC2': None, 'PRICE': None, 'HIDDEN': None, 'SUPPLY2': 'L03', 'SUPPLY3': '1085509', 'DESC1': None, 'UNITS': None, 'PREVYR': None, 'BALANCE': None, 'REF3': 'N'}:
- supplier → suppliers (with schema transformation for sources table, because each item can have multiple suppliers and vice versa)
- charge → charge codes 
---- the charge table is used to store charge codes, which are then linked to sales, ensuring each has a unique code, and that it is authorised correctly.

- issues → quotes + quoteItems
----- an issue is seen as a "cart" or pending quote, which can be converted to a sale later.

-   orders ->   sales + saleItems (with transformation)
----- sales are the final transactions, which can be historical or current, summing up paid charges and items sold.
- periods → (reference data for date ranges, may not need migration)
- vatparams → (VAT configuration, integrated into items)

LEGACY TABLES:
users: 8 records
  Sample record: ['USERNAME', 'USERPASSWORD', 'LEVEL']

stock: 7632 records
  Sample LEGACY record: ['SIZE', 'BALANCE', 'HIDDEN', 'DESC1', 'CODE', 'PRICE', 'ONORDER', 'REF3', 'SUPPLY1', 'SUPPLY3', 'SUPPLY2', 'REORDER', 'ORDERNO', 'REF1', 'PREVYR', 'YTODATE', 'LOCATION', 'UNITS', 'DESC2', 'MIN', 'REF2', 'PREFIX']
New PostgreSQL schema for `items` (from dbInit.ts):
  id SERIAL PRIMARY KEY
  name VARCHAR(200) NOT NULL     --- should be taken from SUPPLY1
  sku VARCHAR(100) NOT NULL UNIQUE   --- YTODaTE or SUPPLY3
  description TEXT                   --- should be taken from DESC1 or DESC2 and SUPPLY1
  category_id INTEGER NOT NULL REFERENCES categories(id)  
  price DECIMAL(10                        ---- Should be Code or Price
  2) NOT NULL
  current_stock INTEGER NOT NULL DEFAULT 0    ---- should be taken from PREFIX? 
  minimum_stock INTEGER NOT NULL DEFAULT 0    ---- should be taken from MIN
  is_active BOOLEAN NOT NULL DEFAULT true
  created_by VARCHAR NOT NULL REFERENCES users(id)  
  updated_by VARCHAR REFERENCES users(id)
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

supplier: 235 records
  Sample record: ['ADDRESS2', 'ACCOUNT', 'ADDRESS4', 'CODE', 'ADDRESS3', 'FAX', 'ADDRESS1', 'TELEPHONE', 'NAME', 'NOTES']
New PostgreSQL schema for `supplier` (from dbInit.ts):
  id VARCHAR PRIMARY KEY
  name VARCHAR NOT NULL
  contact VARCHAR
  email VARCHAR
  phone VARCHAR
  address VARCHAR
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()
  
  
charge: 522 records
  Sample record: ['ACTIVITY', 'PIN', 'AUTHORISE1', 'START', 'COSTCENTRE', 'AUTHORISE3', 'ONHOLD', 'AUTHORISE2', 'TITLE', 'END']
New PostgreSQL schema for `chargecodes` (from dbInit.ts):
    code VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    authorised_by VARCHAR REFERENCES users(id),
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    pin VARCHAR,
    cost_centre VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
issues: 69766 records
  Sample record: ['DATE', 'ACTIVITY', 'PIN', 'REASON', 'VALUE', 'COSTCENTRE', 'STOCK_CODE', 'PERIODCODE', 'ISSUEDTO', 'USER', 'QUANTITY']
New PostgreSQL schema for `issues` (from dbInit.ts):
  id SERIAL PRIMARY KEY
  quote_id VARCHAR(50) NOT NULL UNIQUE
  charge_code VARCHAR(100) NOT NULL
  total_amount DECIMAL(122) NOT NULL
  customer_info JSONB
  notes TEXT
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
  created_by VARCHAR NOT NULL REFERENCES users(id)
  processed_by VARCHAR REFERENCES users(id)
  processed_at TIMESTAMP
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

orders: 1022 records
  Sample record: ['DATE', 'ORDER_NO', 'PRICE', 'VALUE', 'RECD_DATE', 'STOCK_CODE', 'OUTSTAND', 'QTY', 'SUPPLIER']
NEW PostgreSQL schema for `orders` (from dbInit.ts):
  order_id
  supplier_id VARCHAR NOT NULL REFERENCES suppliers(id)
  subtotal_amount DECIMAL(10, 2) NOT NULL 
  Recd_date TIMESTAMP
  DATE TIMESTAMP
  OUTSTAND INTEGER NOT NULL DEFAULT 0
New PostgreSQL schema for `orderItems' (from dbInit.ts):
  stock VARCHAR(100) NOT NULL REFERENCES stock(sku)
  order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id)
  qty INTEGER NOT NULL

periods: 172 records
  Sample record: ['ACTIVEDATE', 'PERIODCODE', 'VOUCHERDATE']

vatparams: 1 records
  Sample record: ['VAT']


This script is also going to generate an ER diagram for the old and new schema, showing how the new one solves some of the many-to-many relationships of the old one, such as: items and suppliers.
This report will be generated in the same directory as this script, named `legacy_migration_report.md` and in the docs under explanations and development.


"""

import re
import os
import json
import uuid
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import pymysql
import argparse
import pymysql
import argparse


class LegacyDataMigrator:
    def __init__(self, pg_connection_string: str, mysql_config: Optional[Dict[str, str]] = None):
        """Initialize the migrator with PostgreSQL connection and optional MySQL config."""
        self.pg_conn = psycopg2.connect(pg_connection_string)
        self.pg_conn.autocommit = False
        self.SKUs=set()  # Track unique SKUs to avoid duplicates

        # MySQL connection config (optional, for direct database reading)
        self.mysql_config = mysql_config
        self.mysql_conn = None
        
        # Data storage for parsed legacy data
        self.legacy_data = {
            'users': [],
            'stock': [],
            'supplier': [],
            'charge': [],
            'issues': [],
            'orders': [],
            'periods': [],
            'vatparams': []
        }
        
        # Mapping dictionaries for foreign key relationships
        self.user_id_mapping = {}  # legacy_id -> new_id
        self.category_id_mapping = {}  # category_name -> id
        self.item_id_mapping = {}  # legacy_stock_id -> new_item_id
        self.supplier_mapping = {}  # supplier_id -> supplier_info
        self.vat_params = {}  # VAT configuration from legacy
        
        # Error tracking
        self.migration_errors = {
            'users': [],
            'suppliers': [],
            'items': [],
            'chargecodes': [],
            'sales': [],
            'quotes': [],
            'orders': []
        }
        self.migration_stats = {
            'users': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'suppliers': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'items': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'chargecodes': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'sales': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'quotes': {'attempted': 0, 'succeeded': 0, 'failed': 0},
            'orders': {'attempted': 0, 'succeeded': 0, 'failed': 0}
        }

    def _log_error(self, table: str, item_id: str, error: str, item_data: dict = None):
        """Log migration error without cluttering console."""
        self.migration_errors[table].append({
            'id': item_id,
            'error': str(error),
            'data': item_data
        })
        self.migration_stats[table]['failed'] += 1

    def _log_success(self, table: str):
        """Log successful migration."""
        self.migration_stats[table]['succeeded'] += 1

    def _log_attempt(self, table: str):
        """Log migration attempt."""
        self.migration_stats[table]['attempted'] += 1

    def migrate_charges_to_sales(self):
        """Migrate legacy charge code metadata columns to the new chargecodes table."""
        print("Migrating charge codes to chargecodes table...")
        cursor = self.pg_conn.cursor()
        # Create chargecodes table if not exists
    #     code VARCHAR PRIMARY KEY,
    # title VARCHAR NOT NULL,
    # authorised_by VARCHAR REFERENCES users(id),
    # valid_from TIMESTAMP,
    # valid_until TIMESTAMP,
    # pin VARCHAR,
    # cost_centre VARCHAR,
    # created_at TIMESTAMP DEFAULT NOW(),
    # updated_at TIMESTAMP DEFAULT NOW()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chargecodes (
                code VARCHAR PRIMARY KEY,
                pin VARCHAR,
                authorised_by VARCHAR,
                activity VARCHAR,
                start VARCHAR,
                end VARCHAR,
                title VARCHAR,
                onhold VARCHAR,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        # Build a set of all charge codes referenced in legacy data
        chargecodes_seen = set()
        for charge in self.legacy_data['charge']:
            code = str(charge.get('COSTCENTRE') or charge.get('chargecode'))
            if code:
                chargecodes_seen.add(code)
        # Also add any charge codes referenced in issues/orders if present
        for issue in self.legacy_data.get('issues', []):
            code = issue.get('COSTCENTRE') or issue.get('chargecode')
            if code:
                chargecodes_seen.add(code)
        for order in self.legacy_data.get('orders', []):
            code = order.get('COSTCENTRE') or order.get('chargecode')
            if code:
                chargecodes_seen.add(code)
        migrated = 0
        for code in chargecodes_seen:
            # Find a representative charge row for this code
            charge_row = next((c for c in self.legacy_data['charge'] if (c.get('COSTCENTRE') or c.get('chargecode')) == code), None)
            # If not found in charge, try issues or orders
            if not charge_row:
                charge_row = next((i for i in self.legacy_data.get('issues', []) if (i.get('COSTCENTRE') or i.get('chargecode')) == code), None)
            if not charge_row:
                charge_row = next((o for o in self.legacy_data.get('orders', []) if (o.get('COSTCENTRE') or o.get('chargecode')) == code), None)
            # Map legacy columns to new schema
            data = {
                'code': code,
                'pin': charge_row.get('PIN') if charge_row else "NULL",
                'authorised_by': "dev_admin_001",
                'activity': charge_row.get('ACTIVITY') if charge_row else "NULL",
                'start': charge_row.get('START') if charge_row else "NULL",
                'end': charge_row.get('END') if charge_row else "NULL",
                'title': charge_row.get('TITLE') if charge_row else "NULL",
                'onhold': charge_row.get('ONHOLD') if charge_row else "NULL",
            }

            
            try:
                cursor.execute('''
                    INSERT INTO chargecodes (code, pin, authorised_by,  start, end, title, onhold, created_at, updated_at)
                    VALUES (%(code)s, %(pin)s, %(authorised_by)s, %(start)s, %(end)s, %(title)s, %(onhold)s, NOW(), NOW())
                    ON CONFLICT (code) DO UPDATE SET
                        pin = EXCLUDED.pin,
                        authorised_by = EXCLUDED.authorised_by,
                        start = EXCLUDED.start,
                        end = EXCLUDED.end,
                        title = EXCLUDED.title,
                        onhold = EXCLUDED.onhold,
                        updated_at = NOW()
                ''', data)
                migrated += 1
            except Exception as e:
                print(f"Error migrating chargecode {code}: {e}")
        self.pg_conn.commit()
        print(f"Migrated {migrated} chargecodes.")

    def migrate_issues_to_quotes(self):
        """Migrate issues to quotes (treating issues as pending quotes)."""
        print("Migrating issues to quotes...")
        cursor = self.pg_conn.cursor()
        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        admin_user = cursor.fetchone()
        default_user_id = admin_user[0] if admin_user else list(self.user_id_mapping.values())[0]
        migrated_quotes = 0
        failed = False
        fail_err=" "
        for issue in self.legacy_data['issues']:
            try:
                quote_data = {
                    'quote_id': f"LEGACY-Q{issue['id']}",
                    'charge_code': issue.get('chargecode', f"LEGACY-ISSUE-{issue['id']}"),
                    'subtotal_amount': Decimal('0.00'),
                    'vat_amount': Decimal('0.00'),
                    'total_amount': Decimal('0.00'),
                    'vat_applied': True,
                    'customer_info': json.dumps({'legacy_issue_id': issue['id']}),
                    'notes': issue.get('notes', ''),
                    'status': 'draft',
                    'created_by': default_user_id,
                    'created_at': self._parse_legacy_date(issue.get('date')),
                    'updated_at': datetime.now(timezone.utc)
                }
                stock_id = issue.get('stock_id')
                item_id = self.item_id_mapping.get(stock_id)
                if item_id:
                    cursor.execute("SELECT name, sku, price FROM items WHERE id = %s", (item_id,))
                    item_result = cursor.fetchone()
                    if item_result:
                        item_name, item_sku, item_price = item_result
                        quantity = int(issue.get('quantity', 1))
                        unit_price = item_price
                        subtotal = unit_price * quantity
                        vat_amount = subtotal * Decimal('0.2000')
                        total = subtotal + vat_amount
                        quote_data['subtotal_amount'] = subtotal
                        quote_data['vat_amount'] = vat_amount
                        quote_data['total_amount'] = total
                insert_quote_query = """
                    INSERT INTO quotes (quote_id, charge_code, subtotal_amount, vat_amount, total_amount,
                                       vat_applied, customer_info, notes, status, created_by, created_at, updated_at)
                    VALUES (%(quote_id)s, %(charge_code)s, %(subtotal_amount)s, %(vat_amount)s, %(total_amount)s,
                            %(vat_applied)s, %(customer_info)s, %(notes)s, %(status)s, %(created_by)s,
                            %(created_at)s, %(updated_at)s)
                    RETURNING id
                """
                cursor.execute(insert_quote_query, quote_data)
                quote_result = cursor.fetchone()
                if not quote_result:
                    continue
                quote_db_id = quote_result[0]
                if item_id and 'item_result' in locals():
                    item_name, item_sku, item_price = item_result
                    quantity = int(issue.get('quantity', 1))
                    unit_price = item_price
                    vat_rate = Decimal('0.2000')
                    subtotal = unit_price * quantity
                    vat_amount = subtotal * vat_rate
                    total_with_vat = subtotal + vat_amount
                    quote_item_data = {
                        'quote_id': quote_db_id,
                        'item_id': item_id,
                        'item_name': item_name,
                        'item_sku': item_sku,
                        'unit_price': unit_price,
                        'vat_rate': vat_rate,
                        'vat_amount': vat_amount,
                        'quantity': quantity,
                        'subtotal': subtotal,
                        'total_with_vat': total_with_vat,
                        'created_at': datetime.now(timezone.utc)
                    }
                    insert_item_query = """
                        INSERT INTO quote_items (quote_id, item_id, item_name, item_sku, unit_price, vat_rate,
                                                vat_amount, quantity, subtotal, total_with_vat, created_at)
                        VALUES (%(quote_id)s, %(item_id)s, %(item_name)s, %(item_sku)s, %(unit_price)s, %(vat_rate)s,
                                %(vat_amount)s, %(quantity)s, %(subtotal)s, %(total_with_vat)s, %(created_at)s)
                    """
                    cursor.execute(insert_item_query, quote_item_data)
                migrated_quotes += 1
            except Exception as e:
                failed=True
                fail_err = str(e)
        if failed:
            print(f"Error migrating issue id: {fail_err}")
        self.pg_conn.commit()
        print(f"Migrated {migrated_quotes} quotes from issues")

    def migrate_orders_to_sales(self):
        """Migrate orders as historical sales."""
        print("Migrating orders to sales (historical)...")
        cursor = self.pg_conn.cursor()
        migrated_orders = 0
        for order in self.legacy_data['orders']:
            try:
                # Use order id as sale_id, mark as historical
                sale_data = {
                    'sale_id': f"LEGACY-O{order['id']}",
                    'charge_code': order.get('chargecode', f"LEGACY-ORDER-{order['id']}"),
                    'subtotal_amount': Decimal(order.get('subtotal', '0.00')),
                    'vat_amount': Decimal(order.get('vat', '0.00')),
                    'total_amount': Decimal(order.get('total', '0.00')),
                    'vat_applied': True,
                    'customer_info': json.dumps({'legacy_order_id': order['id']}),
                    'notes': f"Historical order migrated from legacy system. {order.get('notes', '')}",
                    'status': 'historical',
                    'processed_by': None,
                    'created_at': self._parse_legacy_date(order.get('date')),
                    'updated_at': datetime.now(timezone.utc)
                }
                print("order total :", sale_data['total_amount'])
                insert_sale_query = """
                    INSERT INTO sales (sale_id, charge_code, subtotal_amount, vat_amount, total_amount, 
                                     vat_applied, customer_info, notes, status, processed_by, created_at, updated_at)
                    VALUES (%(sale_id)s, %(charge_code)s, %(subtotal_amount)s, %(vat_amount)s, %(total_amount)s,
                            %(vat_applied)s, %(customer_info)s, %(notes)s, %(status)s, %(processed_by)s,
                            %(created_at)s, %(updated_at)s)
                """
                cursor.execute(insert_sale_query, sale_data)
                migrated_orders += 1
            except Exception as e:
                print(f"Error migrating order {order.get('id', 'unknown')}: {e}")
        self.pg_conn.commit()
        print(f"Migrated {migrated_orders} historical orders to sales table.")

    def migrate_suppliers(self):
        """Create suppliers table and migrate supplier data."""
        print("Migrating suppliers...")
        cursor = self.pg_conn.cursor()
        # Create suppliers table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                contact VARCHAR,
                email VARCHAR,
                phone VARCHAR,
                address VARCHAR,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        migrated = 0
        for supplier in self.legacy_data['supplier']:
            try:
                cursor.execute('''
                    INSERT INTO suppliers (id, name, contact, email, phone, address, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                ''', (
                    supplier.get('id'),
                    supplier.get('name', ''),
                    supplier.get('contact', ''),
                    supplier.get('email', ''),
                    supplier.get('phone', ''),
                    supplier.get('address', '')
                ))
                migrated += 1
            except Exception as e:
                print(f"Error migrating supplier {supplier.get('id')}: {e}")
        self.pg_conn.commit()
        print(f"Migrated {migrated} suppliers.")

    def migrate_chargecodes(self):
        """Migrate legacy charge data to chargecodes table."""
        print("Migrating charge codes...")
        cursor = self.pg_conn.cursor()
        
        # Create chargecodes table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chargecodes (
                code VARCHAR PRIMARY KEY,
                pin VARCHAR,
                authorised_by VARCHAR,
                activity VARCHAR,
                title VARCHAR,
                valid_from TIMESTAMP,
                valid_until TIMESTAMP,
                on_hold BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
    
 
        migrated = 0
        for charge_record in self.legacy_data.get('charge', []):
            self._log_attempt('chargecodes')
            auth= charge_record.get('AUTHORISE1')
            if not charge_record.get('AUTHORISE1') or charge_record.get('AUTHORISE1') not in self.user_id_mapping:
                # If the authorised_by user is not in the new users table, pick a superuser that is
                auth= "dev_admin_001"
                #check authorised_by field is in users table
                cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
                admin_user = cursor.fetchone()
                # if admin_user:

                #     print(f"Authorised by user {admin_user} being used")
            try:
                cursor.execute('''
                    INSERT INTO chargecodes (
                        code, pin, authorised_by,
                        title,  valid_from, valid_until
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (code) DO UPDATE SET
                        pin = EXCLUDED.pin,
                        authorised_by = EXCLUDED.authorised_by,
                        title = EXCLUDED.title,
                        valid_from = EXCLUDED.valid_from,
                        valid_until = EXCLUDED.valid_until,
                        updated_at = NOW()
                ''', (
                    str(charge_record.get('COSTCENTRE', '')),
                    str(charge_record.get('PIN')),
                    auth,
                    str(charge_record.get('TITLE')),
                    self._parse_legacy_date(charge_record.get('START')),
                    self._parse_legacy_date(charge_record.get('END')),
                ))
                
                self._log_success('chargecodes')
                migrated += 1
            except Exception as e:
                self._log_error('chargecodes', charge_record.get('COSTCENTRE', 'unknown'), str(e), charge_record)
        
        self.pg_conn.commit()
        print(f"Migrated {migrated} charge codes.")

    def migrate_orders_to_orders_and_items(self):
        """Migrate legacy orders to orders and order_items tables."""
        print("Migrating orders...")
        cursor = self.pg_conn.cursor()
        
        # Create orders and order_items tables if they don't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                order_id SERIAL PRIMARY KEY,
                supplier_id VARCHAR REFERENCES suppliers(id),
                subtotal_amount DECIMAL(15, 2) NOT NULL,
                received_date TIMESTAMP,
                order_date TIMESTAMP,
                outstanding_amount DECIMAL(15, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id VARCHAR NOT NULL REFERENCES orders(order_id),
                sku VARCHAR(100) NOT NULL REFERENCES stock(sku),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15, 2),
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Group orders by ORDER_NO
        orders_grouped = {}
        for order_record in self.legacy_data.get('orders', []):
            order_no = order_record.get('ORDER_NO')
            if order_no not in orders_grouped:
                orders_grouped[order_no] = []
            orders_grouped[order_no].append(order_record)
        
        migrated_orders = 0
        migrated_items = 0
        order_ids=set()
        for order_no, order_items in orders_grouped.items():
            if order_no is None:
                order_no= len(order_ids)+1
            order_ids.add(order_no)
            if not order_items:
                print(f"Skipping order with no ORDER_NO or items: {order_no}")
                self._log_error('orders', order_no, "No ORDER_NO or items found", order_items)
                continue
            self._log_attempt('orders')
            try:
                # Take first item for order-level data
                first_item = order_items[0]
                
                #check if supplier exists, if not, create a dummy supplier
                supplier_id = first_item.get('SUPPLIER', 'UNKNOWN')
                if supplier_id not in self.supplier_mapping:
                    # Create a dummy supplier if not exists
                    cursor.execute('''
                        INSERT INTO suppliers (id, name, created_at, updated_at)
                        VALUES (%s, %s, NOW(), NOW())
                        ON CONFLICT (id) DO NOTHING
                    ''', (supplier_id, supplier_id))
                    self.supplier_mapping[supplier_id] = {'id': supplier_id, 'name': supplier_id}
                
                # Insert order record
                cursor.execute('''
                    INSERT INTO orders (
                        order_id, supplier_id, subtotal_amount, 
                        received_date, order_date, outstanding_amount
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (order_id) DO NOTHING
                ''', (
                    order_no,
                    first_item.get('SUPPLIER', 'UNKNOWN'),
                    self._safe_decimal_conversion(sum(float(self._safe_float_conversion(item.get('PRICE', 0))) for item in order_items)),
                    self._parse_legacy_date(first_item.get('RECD_DATE')),
                    self._parse_legacy_date(first_item.get('DATE')),
                    self._safe_decimal_conversion(sum(float(self._safe_float_conversion(item.get('OUTSTAND', 0))) for item in order_items))
                ))
                
                self._log_success('orders')
                migrated_orders += 1
                
                # Insert order items
                for item in order_items:
                    try:
                        #get sku from stock table as per above 
                        sku = item.get('STOCK_CODE') or item.get('CODE') or item.get('SKU')
                        if not sku:
                            print(f"Skipping item with no SKU in order {order_no}: {item}")
                        
                        cursor.execute('''
                            INSERT INTO order_items (
                                order_id, sku, quantity, unit_price
                            ) VALUES (%s, %s, %s, %s)
                        ''', (
                            order_no,
                            sku,
                            int(self._safe_float_conversion(item.get('QTY', 1))),
                            self._safe_decimal_conversion(item.get('PRICE', 0))
                        ))
                        migrated_items += 1
                    except Exception as e:
                        self._log_error('orders', f"{order_no}_item", str(e), item)
                        
            except Exception as e:
                self._log_error('orders', order_no, str(e), first_item)
        
        self.pg_conn.commit()
        print(f"Migrated {migrated_orders} orders with {migrated_items} items.")

    def migrate_sales_and_charges(self):
        """Placeholder for migrating charges to sales data."""
        print("Migrating sales and charges (placeholder)...")
        # This method can be implemented when sales table structure is finalized
        print("Sales migration not yet implemented - placeholder.")

    def create_migration_summary(self):
        """Create and display migration summary."""
        print("\n" + "="*80)
        print("MIGRATION SUMMARY")
        print("="*80)
        
        total_attempted = 0
        total_succeeded = 0
        total_failed = 0
        
        for table, stats in self.migration_stats.items():
            if stats['attempted'] > 0:
                print(f"\n{table.upper()}:")
                print(f"  Attempted: {stats['attempted']}")
                print(f"  Succeeded: {stats['succeeded']}")
                print(f"  Failed: {stats['failed']}")
                if stats['failed'] > 0:
                    print(f"  Success Rate: {stats['succeeded']/stats['attempted']*100:.1f}%")
                
                total_attempted += stats['attempted']
                total_succeeded += stats['succeeded']
                total_failed += stats['failed']
        
        print(f"\nOVERALL TOTALS:")
        print(f"  Attempted: {total_attempted}")
        print(f"  Succeeded: {total_succeeded}")
        print(f"  Failed: {total_failed}")
        if total_attempted > 0:
            print(f"  Success Rate: {total_succeeded/total_attempted*100:.1f}%")
        
        # Show error summary
        if total_failed > 0:
            print(f"\nERRORS BY TABLE:\n ===========")
            for table, errors in self.migration_errors.items():
                if errors:
                    print(f"  \n {table}: {len(errors)} errors")
                    # Show first few errors as examples
                    for i, error in enumerate(errors[:3]):
                        print(f"    - {error['id']}: {error['error']}")
                    if len(errors) > 3:
                        print(f"    ... and {len(errors) - 3} more errors")

    def generate_migration_report(self):
        """Generate detailed migration report in Markdown format."""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        report_file = f"docs/explanations/legacy_migration_report_{timestamp}.md"
        
        print(f"\nGenerating migration report: {report_file}")
        
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(report_file), exist_ok=True)
            
            with open(report_file, 'w') as f:
                f.write(f"# Legacy Data Migration Report\n\n")
                f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                
                # Migration overview
                f.write("## Migration Overview\n\n")
                f.write("This report details the migration of legacy MySQL/MariaDB data to the new PostgreSQL schema.\n\n")
                
                # Legacy schema summary
                f.write("## Legacy Schema Summary\n\n")
                for table, data in self.legacy_data.items():
                    if data:
                        f.write(f"### {table}\n")
                        f.write(f"- **Records:** {len(data)}\n")
                        if data:
                            sample = data[0]
                            f.write(f"- **Fields:** {', '.join(sample.keys())}\n")
                        f.write("\n")
                
                # Migration statistics
                f.write("## Migration Statistics\n\n")
                f.write("| Table | Attempted | Succeeded | Failed | Success Rate |\n")
                f.write("|-------|-----------|-----------|--------|--------------|\n")
                
                for table, stats in self.migration_stats.items():
                    if stats['attempted'] > 0:
                        success_rate = stats['succeeded']/stats['attempted']*100
                        f.write(f"| {table} | {stats['attempted']} | {stats['succeeded']} | {stats['failed']} | {success_rate:.1f}% |\n")
                
                # Error details
                f.write("\n## Error Details\n\n")
                for table, errors in self.migration_errors.items():
                    if errors:
                        f.write(f"### {table} Errors\n\n")
                        for error in errors:
                            f.write(f"- **ID:** {error['id']}\n")
                            f.write(f"  **Error:** {error['error']}\n")
                            if error.get('data'):
                                f.write(f"  **Data:** {str(error['data'])[:200]}...\n")
                            f.write("\n")
                
                # Schema mapping
                f.write("## Schema Mapping\n\n")
                f.write("### users → users\n")
                f.write("- Legacy USERNAME → id\n")
                f.write("- Legacy USERPASSWORD → hashed password\n")
                f.write("- Legacy LEVEL → role mapping\n\n")
                
                f.write("### stock → items + categories\n")
                f.write("- Legacy SUPPLY1 → item name\n")
                f.write("- Legacy YTODATE/SUPPLY3 → SKU\n")
                f.write("- Category extraction from SUPPLY2\n\n")
                
                f.write("### supplier → suppliers\n")
                f.write("- Legacy CODE → id\n")
                f.write("- Legacy NAME → name\n")
                f.write("- Contact details mapped appropriately\n\n")
                
                f.write("### charge → chargecodes\n")
                f.write("- Legacy COSTCENTRE + ACTIVITY → code\n")
                f.write("- Authorization fields preserved\n\n")
                
                f.write("### orders → orders + order_items\n")
                f.write("- Legacy ORDER_NO → order_id\n")
                f.write("- Items grouped by order number\n\n")
                
                f.write("### issues → quotes + quote_items\n")
                f.write("- Legacy grouped by activity/date\n")
                f.write("- Individual items converted to quote_items\n\n")
        
            print(f"Migration report generated successfully: {report_file}")
            
        except Exception as e:
            print(f"Error generating migration report: {e}")

    def parse_sql_file(self, sql_file_path: str):
        """Parse the legacy SQL backup file and extract data."""
        print(f"Parsing legacy SQL file: {sql_file_path}")
        
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse each table
        self._parse_table_data(content, 'users')
        self._parse_table_data(content, 'stock')
        self._parse_table_data(content, 'supplier')
        self._parse_table_data(content, 'charge')
        self._parse_table_data(content, 'issues')
        self._parse_table_data(content, 'orders')
        self._parse_table_data(content, 'periods')
        self._parse_table_data(content, 'vatparams')
        
        print("Legacy data parsing completed.")
        self._print_data_summary()

    def _parse_table_data(self, content: str, table_name: str):
        """Parse INSERT statements for a specific table, supporting multi-row VALUES."""
        # Find CREATE TABLE statement to get column structure
        create_pattern = rf"CREATE TABLE `{table_name}`\s*\((.*?)\)(?:\s*ENGINE|\s*;)"
        create_match = re.search(create_pattern, content, re.DOTALL | re.IGNORECASE)
        if not create_match:
            print(f"Warning: CREATE TABLE for {table_name} not found")
            return
        # Extract column names from CREATE TABLE
        columns_text = create_match.group(1)
        column_pattern = r"`(\w+)`\s+[^,`]+"
        columns = re.findall(column_pattern, columns_text)
        columns =list(set(columns))  # Remove duplicates, if any
        # Find INSERT statements (multi-row)
        insert_pattern = rf"INSERT INTO `{table_name}` VALUES\s*(.*?);"
        insert_matches = re.findall(insert_pattern, content, re.DOTALL | re.IGNORECASE)
        print(f"Found {len(insert_matches)} INSERT statements for {table_name}")
        mismatches = []
        for insert_match in insert_matches:
            # Split into individual row value groups (handles nested parentheses)
            row_pattern = r"\(([^()]*?(?:\([^()]*\)[^()]*)*?)\)"
            row_matches = re.findall(row_pattern, insert_match, re.DOTALL)
            error_count = 0
            values=[]
            for row in row_matches:
                values = self._parse_insert_values(row)
                if len(values) == len(columns):
                    row_data = dict(zip(columns, values))
                    self.legacy_data[table_name].append(row_data)
                else:
                    mismatches.append(values)
                    error_count += 1
            if error_count > 0:
                print(f"Warning: {error_count} Column count mismatch for {table_name}: {len(columns)} columns, {len(values)} values")

        # If mismatches found, print detailed report
        if mismatches:
            print(f"\n=== Column Mismatch Report for table `{table_name}` ===")
            print(f"Legacy column names: {columns}")
            print(f"Number of mismatched entries: {len(mismatches)}")
            for i, values in enumerate(mismatches[:2]):
                print(f"  Example {i+1}: {values}")
            # Try to print new schema from dbInit.ts
            try:
                dbinit_path = os.path.join(os.path.dirname(__file__), 'server', 'dbInit.ts')
                if not os.path.exists(dbinit_path):
                    dbinit_path = os.path.join(os.path.dirname(__file__), '..', 'server', 'dbInit.ts')
                with open(dbinit_path, 'r', encoding='utf-8') as f:
                    dbinit_content = f.read()
                # Find the CREATE TABLE statement for this table
                new_table_name = table_name.replace(' ', '_').lower()  # Normalize table name
                new_table_name = new_table_name.replace('stock', 'items')  # Handle stock to items migration
                new_table_name = new_table_name.replace('supplier', 'suppliers')  # Handle supplier to suppliers migration
                new_table_name = new_table_name.replace('charge', 'sales')  # Handle charge to sales migration
                new_table_name = new_table_name.replace('issues', 'quotes')  # Handle issues to quotes migration
                new_table_name = new_table_name.replace('orders', 'sales')  # Handle orders to sales migration
                new_table_name = new_table_name.replace('vatparams', 'vat_parameters')  # Handle vatparams to vat_parameters migration
                new_table_name = new_table_name.replace('periods', 'date_ranges')  # Handle periods to date_ranges migration


                pattern = re.compile(
                    rf"\s+CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+{new_table_name}\s*\((.*?)\)\s*;",
                    re.DOTALL | re.IGNORECASE
                )
                match = pattern.search(dbinit_content)
                if match:
                    schema_body = match.group(1)
                    print(f"New PostgreSQL schema for `{table_name}` (from dbInit.ts):")
                    for line in schema_body.split(','):
                        line = line.strip()
                        if line:
                            print(f"  {line}")
                else:
                    print(f"Could not find CREATE TABLE for `{table_name}` in dbInit.ts.")
            except Exception as e:
                print(f"Could not fetch new schema for `{table_name}` from dbInit.ts: {e}")
            print(f"=== End of Mismatch Report for `{table_name}` ===\n")

    def _parse_insert_values(self, values_string: str) -> List[str]:
        """Parse VALUES clause from INSERT statement."""
        # This is a simplified parser - in production, you might want a more robust SQL parser
        values = []
        current_value = ""
        in_quotes = False
        quote_char = None
        i = 0
        
        while i < len(values_string):
            char = values_string[i]
            
            if not in_quotes:
                if char in ["'", '"']:
                    in_quotes = True
                    quote_char = char
                elif char == ',' and not in_quotes:
                    values.append(current_value.strip())
                    current_value = ""
                    i += 1
                    continue
                elif char == 'N' and values_string[i:i+4] == 'NULL':
                    current_value += 'NULL'
                    i += 3
                    i += 1
                    continue
            else:
                if char == quote_char:
                    # Check for escaped quote
                    if i + 1 < len(values_string) and values_string[i + 1] == quote_char:
                        current_value += char + char
                        i += 1
                    else:
                        in_quotes = False
                        quote_char = None
            
            current_value += char
            i += 1
        
        if current_value.strip():
            values.append(current_value.strip())
        
        # Clean up values
        cleaned_values = []
        for value in values:
            value = value.strip()
            if value == 'NULL':
                cleaned_values.append(None)
            elif value.startswith("'") and value.endswith("'"):
                # Remove quotes and handle escaped quotes
                cleaned_values.append(value[1:-1].replace("''", "'"))
            elif value.startswith('"') and value.endswith('"'):
                cleaned_values.append(value[1:-1].replace('""', '"'))
            else:
                cleaned_values.append(value)
        
        return cleaned_values

    def _print_data_summary(self):
        """Print summary of parsed legacy data."""
        print("\n=== Legacy Data Summary ===")
        for table_name, data in self.legacy_data.items():
            print(f"{table_name}: {len(data)} records")
            if data:
                print(f"  Sample record: {list(data[0].keys())}")
        print()

    def migrate_users(self):
        """Migrate users table with sensible defaults and role mapping."""
        print("Migrating users...")
        cursor = self.pg_conn.cursor()
        
        for user in self.legacy_data['users']:
            self._log_attempt('users')
            legacy_username = user.get('USERNAME')
            try:
                # Generate unique ID to avoid conflicts
                if legacy_username and legacy_username not in [None, '', 'NULL']:
                    new_user_id = f"legacy_{legacy_username}"
                else:
                    new_user_id = f"legacy_user_{self.migration_stats['users']['attempted']}"
                
                # Ensure email is unique
                email = f"{new_user_id}@legacy.local"
                
                # Map role from 'LEVEL' field
                role = user.get('LEVEL') or '1'
                
                # Insert with sensible defaults
                user_data = {
                    'id': new_user_id,
                    'email': email,
                    'password_hash': user.get('USERPASSWORD', '') or '$2b$10$default_hash',
                    'first_name': user.get('forename', '') or 'Legacy',
                    'last_name': user.get('surname', '') or 'User',
                    'role': self._map_user_role(role),
                    'is_active': True,
                    'must_change_password': True,
                    'show_picking_list': True,
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc)
                }
                
                # Store mapping
                if legacy_username:
                    self.user_id_mapping[legacy_username] = new_user_id
                
                insert_query = """
                    INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, must_change_password, show_picking_list, created_at, updated_at)
                    VALUES (%(id)s, %(email)s, %(password_hash)s, %(first_name)s, %(last_name)s, %(role)s, %(is_active)s, %(must_change_password)s, %(show_picking_list)s, %(created_at)s, %(updated_at)s)
                    ON CONFLICT (id) DO NOTHING
                """
                cursor.execute(insert_query, user_data)
                self._log_success('users')
            except Exception as e:
                self._log_error('users', legacy_username or 'unknown', e, user)
        
        self.pg_conn.commit()
        print(f"Migrated {self.migration_stats['users']['succeeded']}/{self.migration_stats['users']['attempted']} users")

    def _map_user_role(self, access_level: str) -> str:
        """Map legacy access level to new role."""
        access_mapping = {
            '1': 'user',
            '2': 'superuser', 
            '3': 'admin',
            '4': 'admin',
            '5': 'admin'
        }
        return access_mapping.get(access_level, 'user')

    def migrate_suppliers_and_vat_params(self):
        """Process suppliers and VAT parameters for use in items migration. Ensures suppliers table exists."""
        print("Processing suppliers and VAT parameters...")
        cursor = self.pg_conn.cursor()
        # Create suppliers table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                contact VARCHAR,
                email VARCHAR,
                phone VARCHAR,
                address VARCHAR,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        self.pg_conn.commit()
        
        # Process suppliers and migrate them
        for idx, supplier in enumerate(self.legacy_data['supplier']):
            self._log_attempt('suppliers')
            supplier_code = supplier.get('CODE')
            try:
                # Use CODE as primary key, fallback to index
                if not supplier_code or supplier_code in [None, '', 'NULL']:
                    supplier_code = f"legacy-supplier-{idx}"
                
                # Ensure name is not null
                supplier_name = str(supplier.get('NAME', '')).strip()
                if not supplier_name:
                    supplier_name = f"Supplier {supplier_code}"
                
                # Build address from multiple fields
                address_parts = [
                    supplier.get('ADDRESS1', ''),
                    supplier.get('ADDRESS2', ''),
                    supplier.get('ADDRESS3', ''),
                    supplier.get('ADDRESS4', '')
                ]
                full_address = ', '.join([part for part in address_parts if part and part.strip()])
                
                supplier_data = {
                    'id': supplier_code,
                    'name': supplier_name,
                    'contact': supplier.get('NOTES', '') or '',
                    'email': '',  # Not in legacy schema
                    'phone': supplier.get('TELEPHONE', '') or '',
                    'address': full_address,
                }
                
                # Store in mapping for item-supplier relationships
                self.supplier_mapping[supplier_code] = supplier_data
                
                # Insert into database
                cursor.execute('''
                    INSERT INTO suppliers (id, name, contact, email, phone, address, created_at, updated_at)
                    VALUES (%(id)s, %(name)s, %(contact)s, %(email)s, %(phone)s, %(address)s, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        contact = EXCLUDED.contact,
                        phone = EXCLUDED.phone,
                        address = EXCLUDED.address,
                        updated_at = NOW()
                ''', supplier_data)
                self._log_success('suppliers')
            except Exception as e:
                self._log_error('suppliers', supplier_code or f"idx-{idx}", e, supplier)
        
        # Process VAT parameters
        for vat_param in self.legacy_data['vatparams']:
            period = vat_param.get('period', 'default')
            self.vat_params[period] = {
                'vat_rate': float(vat_param.get('VAT', 0.2)),  # Corrected field name
                'vat_applied': True
            }
        
        self.pg_conn.commit()
        print(f"Processed {self.migration_stats['suppliers']['succeeded']}/{self.migration_stats['suppliers']['attempted']} suppliers and {len(self.vat_params)} VAT parameters")

    def migrate_categories_and_items(self):
        """Migrate stock items to categories and items tables, and create sources (item-supplier links)."""
        print("Migrating categories and items (with sources table)...")
        cursor = self.pg_conn.cursor()
        
        # Create categories from stock data
        categories = set()
        for stock_item in self.legacy_data['stock']:
            category_name = self._extract_category(stock_item)
            categories.add(category_name)
        
        for category_name in categories:
            try:
                insert_query = """
                    INSERT INTO categories (name, description, icon, color, created_at, updated_at)
                    VALUES (%(name)s, %(description)s, %(icon)s, %(color)s, %(created_at)s, %(updated_at)s)
                    ON CONFLICT (name) DO NOTHING
                    RETURNING id
                """
                cursor.execute(insert_query, {
                    'name': category_name,
                    'description': f'Category for {category_name} items',
                    'icon': 'fas fa-box',
                    'color': 'blue',
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc)
                })
                result = cursor.fetchone()
                if result:
                    self.category_id_mapping[category_name] = result[0]
                else:
                    cursor.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
                    result = cursor.fetchone()
                    if result:
                        self.category_id_mapping[category_name] = result[0]
            except Exception as e:
                print(f"Error creating category {category_name}: {e}")
        self.pg_conn.commit()

        # Create sources table (item-supplier many-to-many)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sources (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                supplier_id VARCHAR NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                price NUMERIC,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        self.pg_conn.commit()

        # Get a default admin user for created_by
        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        admin_user = cursor.fetchone()
        default_user_id = admin_user[0] if admin_user else list(self.user_id_mapping.values())[0]
        # Migrate stock items to items table
        for stock_item in self.legacy_data['stock']:
            self._log_attempt('items')
            stock_code = stock_item.get('CODE') or stock_item.get('REF3')
            try:
                category_name = self._extract_category(stock_item)
                category_id = self.category_id_mapping.get(category_name)
                if not category_id:
                    raise Exception(f"No category ID found for {category_name}")
                
                # Correct field mapping based on schema comments
                item_name = stock_item.get('SUPPLY1', f"Item {stock_code}")  # name from SUPPLY1
                
                candidate_keys=["PREVYR", "REF3", "YTODATE","DESC2", "CODE", "SUPPLY2", "REF2", "SIZE"]
                SKU_parts=[stock_item.get(key) for key in candidate_keys if stock_item.get(key) not in [None, '', 'NULL']]
                sku= '-'.join(SKU_parts) if SKU_parts else f"legacy-{stock_code}"
                description_parts = [
                    stock_item.get('DESC1', ''),
                    stock_item.get('DESC2', ''),
                    stock_item.get('SUPPLY1', '')
                ]
                description = ' '.join([part for part in description_parts if part and part.strip()])
                
                # Price from CODE or PRICE field
                price_value = stock_item.get('CODE') or stock_item.get('PRICE', '0.00')
                if price_value in [None, '', 'N', 'NULL']:
                    price_value = '0.00'
                
                # Clean price value - remove any non-numeric characters except decimal point
                try:
                    price_value = str(price_value).replace(',', '')
                    price_value = float(price_value)
                except (ValueError, TypeError):
                    price_value = 0.00

                # Current stock from PREFIX, minimum stock from MIN
                current_stock = stock_item.get('PREFIX', 0)
                try:
                    current_stock = int(float(str(current_stock))) if current_stock not in [None, '', 'NULL'] else 0
                except (ValueError, TypeError):
                    current_stock = 0
                    
                minimum_stock = stock_item.get('MIN', 0)
                try:
                    minimum_stock = int(float(str(minimum_stock))) if minimum_stock not in [None, '', 'NULL'] else 0
                except (ValueError, TypeError):
                    minimum_stock = 0
                    
                is_active = stock_item.get('HIDDEN') != 'Y'  # Active if not hidden
                if item_name in [None, '', 'NULL']:
                    # print(f"Warning: Item name is empty for stock code {stock_item}, using default name.")
                    item_name = str(stock_item.get("PRICE")) 
                    if len(item_name) < 5:
                        item_name = f"Item {stock_code}"
                # Insert item

                item_data = {
                    'name': item_name,
                    'sku': sku,
                    'description': description,
                    'category_id': category_id,
                    'price': Decimal(price_value),
                    'current_stock': int(current_stock),
                    'minimum_stock': int(minimum_stock),
                    'is_active': is_active,
                    'created_by': default_user_id,
                    'updated_by': default_user_id,
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc)
                }
                #check numeric values 
                for key in ['price', 'current_stock', 'minimum_stock']:
                    if not isinstance(item_data[key], (int, float, Decimal)):
                        raise ValueError(f"Invalid type for {key}: {item_data[key]} ({type(item_data[key])})")
                    #check are numeric and comply 
                insert_query = """
                    INSERT INTO items (name, sku, description, category_id, price,  
                                     current_stock, minimum_stock, is_active, notes_id, created_by,updated_by, created_at, updated_at)
                    VALUES (%(name)s, %(sku)s, %(description)s, %(category_id)s, %(price)s,  
                            %(current_stock)s, %(minimum_stock)s, %(is_active)s, NULL, 
                            %(created_by)s,%(updated_by)s, %(created_at)s, %(updated_at)s)
                    RETURNING id, sku
                """
                cursor.execute(insert_query, item_data)
                result = cursor.fetchone()
                if result:
                    new_item_id = result[0]
                    sku = result[1]
                    self.SKUs.add(sku)  # Ensure sku is added to the set
                    self.item_id_mapping[stock_code] = new_item_id
                    
                    # # Link to suppliers in sources table
                    # supplier_fields = ['SUPPLY1', 'SUPPLY2', 'SUPPLY3']
                    # for supplier_field in supplier_fields:
                    #     supplier_id = stock_item.get(supplier_field)
                    #     if supplier_id and supplier_id in self.supplier_mapping:
                    #         try:
                    #             cursor.execute('''
                    #                 INSERT INTO sources (item_id, supplier_id, price, notes, created_at, updated_at)
                    #                 VALUES (%s, %s, %s, %s, NOW(), NOW())
                    #                 ON CONFLICT (item_id, supplier_id) DO NOTHING
                    #             ''', (
                    #                 new_item_id,
                    #                 supplier_id,
                    #                 Decimal(str(price_value)),
                    #                 f"Source: {supplier_field}"
                    #             ))
                    #         except Exception as source_error:
                    #             # Log source error but don't fail item migration
                    #             pass
                    
                    self._log_success('items')
                else:
                    raise Exception("Failed to insert item")
                    
            except Exception as e:
                self._log_error('items', stock_code or 'unknown', e, stock_item)
        
        self.pg_conn.commit()
        print(f"Migrated {len(self.category_id_mapping)} categories and {self.migration_stats['items']['succeeded']}/{self.migration_stats['items']['attempted']} items")

    def _extract_category(self, stock_item: Dict) -> str:
        """Extract or generate category name from stock item."""
        # Use SUPPLY1 or DESC1 to determine category
        description = " ".join([str(stock_item.get('SUPPLY1', '')), str(stock_item.get('DESC1', ''))]).lower()
        
        # Simple category extraction based on common patterns
        if any(word in description for word in ['electronic', 'circuit', 'resistor', 'capacitor']):
            return 'Electronics'
        elif any(word in description for word in ['chemical', 'acid', 'solution', 'reagent']):
            return 'Chemicals'
        elif any(word in description for word in ['tool', 'equipment', 'instrument']):
            return 'Tools & Equipment'
        elif any(word in description for word in ['glass', 'beaker', 'flask', 'tube']):
            return 'Glassware'
        elif any(word in description for word in ['safety', 'protective', 'glove', 'goggle']):
            return 'Safety Equipment'
        elif any(word in description for word in ['paper', 'stationery', 'pen', 'marker']):
            return 'Stationery'
        else:
            return 'General Supplies'

    def migrate_supplier_notes(self):
        """Migrate supplier notes from legacy NOTES field to the notes table."""
        print("Migrating supplier notes...")
        cursor = self.pg_conn.cursor()
        
        # First, ensure the notes table exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                reference_type VARCHAR(50) NOT NULL,
                reference_id VARCHAR(100) NOT NULL,
                created_by VARCHAR NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Create index if it doesn't exist
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_notes_reference 
            ON notes(reference_type, reference_id)
        ''')
        
        # Get a default user for created_by (use first admin or first user)
        cursor.execute('SELECT id FROM users WHERE level >= 1 ORDER BY level DESC LIMIT 1')
        result = cursor.fetchone()
        default_user = result[0] if result else 'admin'
        
        # Migrate supplier notes
        notes_count = 0
        if 'supplier' in self.legacy_data:
            for supplier in self.legacy_data['supplier']:
                supplier_code = supplier.get('CODE')
                supplier_notes = supplier.get('NOTES', '').strip()
                
                # Only create note if there's actual content
                if supplier_notes and supplier_notes not in [None, '', 'NULL']:
                    try:
                        # Use CODE as primary key, fallback to index if needed
                        if not supplier_code or supplier_code in [None, '', 'NULL']:
                            continue
                        
                        cursor.execute('''
                            INSERT INTO notes (text, reference_type, reference_id, created_by, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, NOW(), NOW())
                        ''', (supplier_notes, 'supplier', supplier_code, default_user))
                        notes_count += 1
                    except Exception as e:
                        print(f"  Warning: Failed to migrate notes for supplier {supplier_code}: {e}")
                        continue
        
        self.pg_conn.commit()
        print(f"Migrated {notes_count} supplier notes to notes table")

    def run_basic_migration(self, sql_file_path: Optional[str] = None):
        """Run only users, suppliers, and items migration for initial mapping."""
        try:
            print("Starting basic legacy data migration...")
            if not sql_file_path:
                raise ValueError("SQL file path required for file-based migration")
            self.parse_sql_file(sql_file_path)
            self.migrate_users()
            self.migrate_suppliers()
            self.migrate_categories_and_items()
            print("Basic migration completed!")
        except Exception as e:
            print(f"Basic migration failed: {e}")
            self.pg_conn.rollback()
            raise
        finally:
            self.pg_conn.close()

    def run_migration(self, sql_file_path: Optional[str] = None, use_mysql: bool = False):
        """Run the complete migration process."""
        try:
            print("Starting legacy data migration...")
            
            # Step 1: Load legacy data from either SQL file or MySQL database
            if use_mysql:
                if not self.mysql_config:
                    raise ValueError("MySQL configuration required for direct database migration")
                self.load_from_mysql()
            else:
                if not sql_file_path:
                    raise ValueError("SQL file path required for file-based migration")
                self.parse_sql_file(sql_file_path)
            
            # Step 2: Migrate users first (needed for foreign keys)
            self.migrate_users()
            
            # Step 3: Process suppliers and VAT params
            self.migrate_suppliers_and_vat_params()
            
            # Step 4: Migrate categories and items
            self.migrate_categories_and_items()
            
            # Step 5: Migrate supplier notes to notes table
            self.migrate_supplier_notes()
            
            # Step 6: Migrate chargecodes (legacy charge code metadata)
            self.migrate_chargecodes()
            
            # Step 7: Migrate orders to orders and order_items
            self.migrate_orders_to_orders_and_items()
            
            # Step 8: Migrate charges to sales (placeholder for now)
            self.migrate_sales_and_charges()
            
            # Step 9: Migrate issues to quotes
            self.migrate_issues_to_quotes()
            
            # Step 10: Create summary and documentation
            self.create_migration_summary()
            self.generate_migration_report()
            
            print("\nMigration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            self.pg_conn.rollback()
            raise
        finally:
            self.pg_conn.close()
            if self.mysql_conn:
                self.disconnect_mysql()

    def connect_mysql(self):
        """Connect to MySQL/MariaDB database."""
        if not self.mysql_config:
            raise ValueError("MySQL configuration not provided")
        
        try:
            print(f"Connecting to MySQL database at {self.mysql_config['host']}...")
            self.mysql_conn = pymysql.connect(
                host=self.mysql_config['host'],
                port=self.mysql_config.get('port', 3306),
                user=self.mysql_config['user'],
                password=self.mysql_config['password'],
                database=self.mysql_config['database'],
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            print("MySQL connection established successfully.")
        except Exception as e:
            print(f"Failed to connect to MySQL: {e}")
            raise

    def disconnect_mysql(self):
        """Disconnect from MySQL database."""
        if self.mysql_conn:
            self.mysql_conn.close()
            self.mysql_conn = None
            print("MySQL connection closed.")

    def load_from_mysql(self):
        """Load data directly from MySQL/MariaDB database."""
        print("Loading data from MySQL database...")
        
        if not self.mysql_conn:
            self.connect_mysql()
        
        # Define the tables to migrate and their order (respecting dependencies)
        tables_to_load = ['users', 'supplier', 'vatparams', 'periods', 'stock', 'charge', 'issues', 'orders']
        
        for table_name in tables_to_load:
            try:
                print(f"Loading table: {table_name}")
                with self.mysql_conn.cursor() as cursor:
                    # Get table structure first
                    cursor.execute(f"DESCRIBE `{table_name}`")
                    columns_info = cursor.fetchall()
                    print(f"  Columns: {[col['Field'] for col in columns_info]}")
                    
                    # Load all data from the table
                    cursor.execute(f"SELECT * FROM `{table_name}`")
                    rows = cursor.fetchall()
                    
                    # Convert MySQL data to our internal format
                    for row in rows:
                        # Convert any datetime objects to strings for consistency
                        processed_row = {}
                        for key, value in row.items():
                            if isinstance(value, datetime):
                                processed_row[key] = value.isoformat()
                            elif value is None:
                                processed_row[key] = None
                            else:
                                processed_row[key] = str(value)
                        
                        self.legacy_data[table_name].append(processed_row)
                    
                    print(f"  Loaded {len(rows)} records from {table_name}")
                    
            except Exception as e:
                print(f"Error loading table {table_name}: {e}")
                # Continue with other tables even if one fails
                continue
        
        print("MySQL data loading completed.")
        self._print_data_summary()

    def _safe_float_conversion(self, value):
        """Safely convert value to float."""
        if value is None or value == '' or value == 'NULL':
            return 0.0
        try:
            # Handle string values that might contain non-numeric characters
            if isinstance(value, str):
                # Remove any non-numeric characters except decimal point and minus
                cleaned = ''.join(c for c in value if c.isdigit() or c in '.-')
                if not cleaned or cleaned in ['.', '-', '-.']:
                    return 0.0
                return float(cleaned)
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def _safe_decimal_conversion(self, value):
        """Safely convert value to Decimal with maximum precision limits."""
        float_val = self._safe_float_conversion(value)
        # Limit to avoid overflow (max 13 digits before decimal, 2 after)
        max_val = 9999999999999.99
        min_val = -9999999999999.99
        
        if float_val > max_val:
            float_val = max_val
        elif float_val < min_val:
            float_val = min_val
            
        return Decimal(str(round(float_val, 2)))

    def _parse_legacy_date(self, date_str: Optional[str]) -> datetime:
        """Parse legacy date string to datetime object."""
        if not date_str or date_str == 'NULL':
            return datetime.now(timezone.utc)
        
        try:
            # Try common date formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y%m%d']:
                try:
                    parsed_date = datetime.strptime(str(date_str).strip(), fmt)
                    return parsed_date.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
            # If no format matches, return current time
            return datetime.now(timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)
        """Parse legacy date string to datetime object."""
        if not date_str or date_str == 'NULL':
            return datetime.now(timezone.utc)
        
        try:
            # Try common date formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                try:
                    return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
            # If no format matches, return current time
            return datetime.now(timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)

def main():
    parser = argparse.ArgumentParser(description='Migrate legacy MySQL data to PostgreSQL')
    
    # Data source options (mutually exclusive)
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument('--sql-file', help='Path to legacy SQL backup file')
    source_group.add_argument('--mysql-db', action='store_true', help='Read directly from MySQL database')
    
    # MySQL connection parameters (required if --mysql-db is used)
    parser.add_argument('--mysql-host', help='MySQL host (default: py-stores.lancaster.ac.uk)', default='py-stores.lancaster.ac.uk')
    parser.add_argument('--mysql-port', type=int, help='MySQL port (default: 3306)', default=3306)
    parser.add_argument('--mysql-user', help='MySQL username')
    parser.add_argument('--mysql-password', help='MySQL password')
    parser.add_argument('--mysql-database', help='MySQL database name (default: physics_stores)', default='physics_stores')
    
    # PostgreSQL connection
    parser.add_argument('--pg-connection', required=True, help='PostgreSQL connection string')
    
    # Options
    parser.add_argument('--dry-run', action='store_true', help='Parse data but do not migrate')
    
    args = parser.parse_args()
    
    # Validate MySQL parameters if using direct database connection
    if args.mysql_db:
        if not args.mysql_user or not args.mysql_password:
            parser.error("--mysql-user and --mysql-password are required when using --mysql-db")
    
    # Build MySQL config if needed
    mysql_config = None
    if args.mysql_db:
        mysql_config = {
            'host': args.mysql_host,
            'port': args.mysql_port,
            'user': args.mysql_user,
            'password': args.mysql_password,
            'database': args.mysql_database
        }
    
    # Initialize migrator
    migrator = LegacyDataMigrator(args.pg_connection, mysql_config)
    
    try:
        if args.dry_run:
            print("DRY RUN MODE - No data will be migrated")
            if args.mysql_db:
                migrator.load_from_mysql()
            else:
                migrator.parse_sql_file(args.sql_file)
        else:
            migrator.run_migration(
                sql_file_path=args.sql_file,
                use_mysql=args.mysql_db
            )
    finally:
        # Clean up MySQL connection if it was used
        if args.mysql_db:
            migrator.disconnect_mysql()


if __name__ == "__main__":
    main()
