#!/usr/bin/env python3
"""
Forensic analysis script to identify exact discrepancies between source and target stock values.
"""

import pyodbc
import psycopg2
from decimal import Decimal
from collections import defaultdict
import sys

# Source database connection (MariaDB/MSSQL)
def get_source_connection():
    try:
        conn = pyodbc.connect(
            'DRIVER={ODBC Driver 18 for SQL Server};'
            'SERVER=193.60.133.73;'
            'DATABASE=ST7MA784;'
            'UID=ST7MA784;'
            'PWD=F7pVkNnUTT;'
            'TrustServerCertificate=yes;'
        )
        return conn
    except Exception as e:
        print(f"Failed to connect to source database: {e}")
        sys.exit(1)

# Target database connection (PostgreSQL)
def get_target_connection():
    try:
        conn = psycopg2.connect(
            host='db',
            port=5432,
            database='lustores',
            user='postgres',
            password='postgres'
        )
        return conn
    except Exception as e:
        print(f"Failed to connect to target database: {e}")
        sys.exit(1)

def analyze_source_data(source_conn):
    """Analyze source database stock values."""
    cursor = source_conn.cursor()
    
    print("\n" + "="*80)
    print("SOURCE DATABASE ANALYSIS (ST7MA784)")
    print("="*80)
    
    # Get all items with their values
    cursor.execute("""
        SELECT 
            STOCK_CODE,
            DESCRIPTION,
            BALANCE,
            PRICE_EX_VAT,
            SELLING_PRICE,
            PRICE_EX_VAT * BALANCE as value_ex_vat,
            SELLING_PRICE * BALANCE as value_inc_vat
        FROM STOCK
        WHERE BALANCE > 0
        ORDER BY STOCK_CODE
    """)
    
    items = cursor.fetchall()
    
    total_value_ex_vat = Decimal('0')
    total_value_inc_vat = Decimal('0')
    total_items = 0
    
    # Group by first 2 letters
    groups = defaultdict(lambda: {
        'count': 0,
        'total_qty': Decimal('0'),
        'value_ex_vat': Decimal('0'),
        'value_inc_vat': Decimal('0'),
        'items': []
    })
    
    for row in items:
        stock_code = row[0] or 'UNKNOWN'
        description = row[1] or ''
        balance = Decimal(str(row[2] or 0))
        price_ex_vat = Decimal(str(row[3] or 0))
        selling_price = Decimal(str(row[4] or 0))
        value_ex_vat = Decimal(str(row[5] or 0))
        value_inc_vat = Decimal(str(row[6] or 0))
        
        total_value_ex_vat += value_ex_vat
        total_value_inc_vat += value_inc_vat
        total_items += 1
        
        # Calculate VAT rate
        if price_ex_vat > 0:
            vat_rate = ((selling_price - price_ex_vat) / price_ex_vat) * 100
        else:
            vat_rate = Decimal('0')
        
        # Group by first 2 letters
        prefix = stock_code[:2] if len(stock_code) >= 2 else stock_code
        groups[prefix]['count'] += 1
        groups[prefix]['total_qty'] += balance
        groups[prefix]['value_ex_vat'] += value_ex_vat
        groups[prefix]['value_inc_vat'] += value_inc_vat
        groups[prefix]['items'].append({
            'code': stock_code,
            'description': description,
            'qty': balance,
            'price_ex_vat': price_ex_vat,
            'selling_price': selling_price,
            'vat_rate': vat_rate,
            'value_ex_vat': value_ex_vat,
            'value_inc_vat': value_inc_vat
        })
    
    print(f"\nTotal items with stock: {total_items}")
    print(f"Total value (exc VAT): £{total_value_ex_vat:,.2f}")
    print(f"Total value (inc VAT): £{total_value_inc_vat:,.2f}")
    
    print("\n" + "-"*80)
    print("BREAKDOWN BY PREFIX (First 2 letters of STOCK_CODE)")
    print("-"*80)
    print(f"{'Prefix':<8} {'Count':<8} {'Total Qty':<12} {'Value Ex VAT':<16} {'Value Inc VAT':<16}")
    print("-"*80)
    
    for prefix in sorted(groups.keys()):
        g = groups[prefix]
        print(f"{prefix:<8} {g['count']:<8} {g['total_qty']:>11.2f} £{g['value_ex_vat']:>13,.2f} £{g['value_inc_vat']:>13,.2f}")
    
    return groups, total_value_ex_vat, total_value_inc_vat

def analyze_target_data(target_conn):
    """Analyze target database stock values."""
    cursor = target_conn.cursor()
    
    print("\n" + "="*80)
    print("TARGET DATABASE ANALYSIS (lustores)")
    print("="*80)
    
    # Get all items with their values
    cursor.execute("""
        SELECT 
            sku,
            name,
            current_stock,
            price,
            vat_rate,
            vat_included,
            price * current_stock as value_at_price,
            CASE 
                WHEN vat_included THEN price * current_stock 
                ELSE price * current_stock * (1 + vat_rate)
            END as value_inc_vat
        FROM items
        WHERE current_stock > 0
        ORDER BY sku
    """)
    
    items = cursor.fetchall()
    
    total_value_at_price = Decimal('0')
    total_value_inc_vat = Decimal('0')
    total_items = 0
    
    # Group by first 2 letters
    groups = defaultdict(lambda: {
        'count': 0,
        'total_qty': Decimal('0'),
        'value_at_price': Decimal('0'),
        'value_inc_vat': Decimal('0'),
        'items': []
    })
    
    for row in items:
        sku = row[0] or 'UNKNOWN'
        name = row[1] or ''
        current_stock = Decimal(str(row[2] or 0))
        price = Decimal(str(row[3] or 0))
        vat_rate = Decimal(str(row[4] or 0))
        vat_included = row[5]
        value_at_price = Decimal(str(row[6] or 0))
        value_inc_vat = Decimal(str(row[7] or 0))
        
        total_value_at_price += value_at_price
        total_value_inc_vat += value_inc_vat
        total_items += 1
        
        # Group by first 2 letters
        prefix = sku[:2] if len(sku) >= 2 else sku
        groups[prefix]['count'] += 1
        groups[prefix]['total_qty'] += current_stock
        groups[prefix]['value_at_price'] += value_at_price
        groups[prefix]['value_inc_vat'] += value_inc_vat
        groups[prefix]['items'].append({
            'sku': sku,
            'name': name,
            'qty': current_stock,
            'price': price,
            'vat_rate': vat_rate,
            'vat_included': vat_included,
            'value_at_price': value_at_price,
            'value_inc_vat': value_inc_vat
        })
    
    print(f"\nTotal items with stock: {total_items}")
    print(f"Total value (at price): £{total_value_at_price:,.2f}")
    print(f"Total value (inc VAT): £{total_value_inc_vat:,.2f}")
    
    print("\n" + "-"*80)
    print("BREAKDOWN BY PREFIX (First 2 letters of SKU)")
    print("-"*80)
    print(f"{'Prefix':<8} {'Count':<8} {'Total Qty':<12} {'Value@Price':<16} {'Value Inc VAT':<16}")
    print("-"*80)
    
    for prefix in sorted(groups.keys()):
        g = groups[prefix]
        print(f"{prefix:<8} {g['count']:<8} {g['total_qty']:>11.2f} £{g['value_at_price']:>13,.2f} £{g['value_inc_vat']:>13,.2f}")
    
    return groups, total_value_at_price, total_value_inc_vat

def compare_groups(source_groups, target_groups):
    """Compare source and target groups to identify discrepancies."""
    print("\n" + "="*80)
    print("COMPARISON BY PREFIX")
    print("="*80)
    print(f"{'Prefix':<8} {'Source Count':<13} {'Target Count':<13} {'Diff Count':<12}")
    print(f"{'':8} {'Source Qty':<13} {'Target Qty':<13} {'Diff Qty':<12}")
    print(f"{'':8} {'Source Val(Inc)':<13} {'Target Val(Inc)':<13} {'Diff Value':<12}")
    print("-"*80)
    
    all_prefixes = sorted(set(list(source_groups.keys()) + list(target_groups.keys())))
    
    total_count_diff = 0
    total_qty_diff = Decimal('0')
    total_value_diff = Decimal('0')
    
    for prefix in all_prefixes:
        s = source_groups.get(prefix, {'count': 0, 'total_qty': Decimal('0'), 'value_inc_vat': Decimal('0')})
        t = target_groups.get(prefix, {'count': 0, 'total_qty': Decimal('0'), 'value_inc_vat': Decimal('0')})
        
        count_diff = t['count'] - s['count']
        qty_diff = t['total_qty'] - s['total_qty']
        value_diff = t['value_inc_vat'] - s['value_inc_vat']
        
        total_count_diff += count_diff
        total_qty_diff += qty_diff
        total_value_diff += value_diff
        
        print(f"{prefix:<8} {s['count']:<13} {t['count']:<13} {count_diff:>+11}")
        print(f"{'':8} {s['total_qty']:>12.2f} {t['total_qty']:>12.2f} {qty_diff:>+11.2f}")
        print(f"{'':8} £{s['value_inc_vat']:>11,.2f} £{t['value_inc_vat']:>11,.2f} £{value_diff:>+10,.2f}")
        print()
    
    print("-"*80)
    print(f"{'TOTAL':<8} {'':13} {'':13} {total_count_diff:>+11}")
    print(f"{'':8} {'':13} {'':13} {total_qty_diff:>+11.2f}")
    print(f"{'':8} {'':13} {'':13} £{total_value_diff:>+10,.2f}")
    
    return total_value_diff

def find_item_level_discrepancies(source_groups, target_groups):
    """Find specific items that have discrepancies."""
    print("\n" + "="*80)
    print("ITEM-LEVEL DISCREPANCIES")
    print("="*80)
    
    discrepancies = []
    
    all_prefixes = sorted(set(list(source_groups.keys()) + list(target_groups.keys())))
    
    for prefix in all_prefixes:
        s_group = source_groups.get(prefix, {'items': []})
        t_group = target_groups.get(prefix, {'items': []})
        
        # Create lookups
        source_items = {item['code']: item for item in s_group['items']}
        target_items = {item['sku']: item for item in t_group['items']}
        
        # Find items in source but not in target
        for code, s_item in source_items.items():
            if code not in target_items:
                discrepancies.append({
                    'type': 'MISSING_IN_TARGET',
                    'code': code,
                    'source_qty': s_item['qty'],
                    'source_value': s_item['value_inc_vat'],
                    'target_qty': Decimal('0'),
                    'target_value': Decimal('0')
                })
        
        # Find items in target but not in source
        for sku, t_item in target_items.items():
            if sku not in source_items:
                discrepancies.append({
                    'type': 'MISSING_IN_SOURCE',
                    'code': sku,
                    'source_qty': Decimal('0'),
                    'source_value': Decimal('0'),
                    'target_qty': t_item['qty'],
                    'target_value': t_item['value_inc_vat']
                })
        
        # Find items with quantity differences
        for code in source_items:
            if code in target_items:
                s_item = source_items[code]
                t_item = target_items[code]
                
                if abs(s_item['qty'] - t_item['qty']) > Decimal('0.01'):
                    discrepancies.append({
                        'type': 'QTY_MISMATCH',
                        'code': code,
                        'source_qty': s_item['qty'],
                        'source_value': s_item['value_inc_vat'],
                        'target_qty': t_item['qty'],
                        'target_value': t_item['value_inc_vat']
                    })
                elif abs(s_item['value_inc_vat'] - t_item['value_inc_vat']) > Decimal('0.01'):
                    discrepancies.append({
                        'type': 'VALUE_MISMATCH',
                        'code': code,
                        'source_qty': s_item['qty'],
                        'source_value': s_item['value_inc_vat'],
                        'source_vat_rate': s_item.get('vat_rate', Decimal('0')),
                        'target_qty': t_item['qty'],
                        'target_value': t_item['value_inc_vat'],
                        'target_vat_rate': t_item['vat_rate'] * 100  # Convert to percentage
                    })
    
    if not discrepancies:
        print("\n✓ No item-level discrepancies found!")
        return
    
    print(f"\nFound {len(discrepancies)} discrepancies:")
    print()
    
    # Group by type
    by_type = defaultdict(list)
    for disc in discrepancies:
        by_type[disc['type']].append(disc)
    
    for disc_type, items in by_type.items():
        print(f"\n{disc_type}: {len(items)} items")
        print("-"*80)
        
        if disc_type == 'MISSING_IN_TARGET':
            print(f"{'Code':<15} {'Source Qty':<15} {'Source Value':<20}")
            print("-"*80)
            for item in items[:20]:  # Show first 20
                print(f"{item['code']:<15} {item['source_qty']:>14.2f} £{item['source_value']:>17,.2f}")
            if len(items) > 20:
                print(f"... and {len(items) - 20} more")
        
        elif disc_type == 'MISSING_IN_SOURCE':
            print(f"{'Code':<15} {'Target Qty':<15} {'Target Value':<20}")
            print("-"*80)
            for item in items[:20]:  # Show first 20
                print(f"{item['code']:<15} {item['target_qty']:>14.2f} £{item['target_value']:>17,.2f}")
            if len(items) > 20:
                print(f"... and {len(items) - 20} more")
        
        elif disc_type == 'QTY_MISMATCH':
            print(f"{'Code':<15} {'Source Qty':<12} {'Target Qty':<12} {'Difference':<12}")
            print("-"*80)
            for item in items[:20]:  # Show first 20
                diff = item['target_qty'] - item['source_qty']
                print(f"{item['code']:<15} {item['source_qty']:>11.2f} {item['target_qty']:>11.2f} {diff:>+11.2f}")
            if len(items) > 20:
                print(f"... and {len(items) - 20} more")
        
        elif disc_type == 'VALUE_MISMATCH':
            print(f"{'Code':<12} {'Src Qty':<8} {'Tgt Qty':<8} {'Src VAT%':<9} {'Tgt VAT%':<9} {'Src Val':<12} {'Tgt Val':<12} {'Diff':<10}")
            print("-"*80)
            for item in items[:20]:  # Show first 20
                diff = item['target_value'] - item['source_value']
                print(f"{item['code']:<12} {item['source_qty']:>7.2f} {item['target_qty']:>7.2f} "
                      f"{item.get('source_vat_rate', 0):>8.2f} {item.get('target_vat_rate', 0):>8.2f} "
                      f"£{item['source_value']:>10,.2f} £{item['target_value']:>10,.2f} £{diff:>+9,.2f}")
            if len(items) > 20:
                print(f"... and {len(items) - 20} more")
        
        # Calculate total impact
        total_source_value = sum(item['source_value'] for item in items)
        total_target_value = sum(item['target_value'] for item in items)
        total_diff = total_target_value - total_source_value
        print(f"\nTotal impact: £{total_diff:+,.2f}")

def main():
    print("Starting forensic stock value analysis...")
    
    source_conn = get_source_connection()
    target_conn = get_target_connection()
    
    try:
        # Analyze source
        source_groups, source_total_ex, source_total_inc = analyze_source_data(source_conn)
        
        # Analyze target
        target_groups, target_total_price, target_total_inc = analyze_target_data(target_conn)
        
        # Compare groups
        total_value_diff = compare_groups(source_groups, target_groups)
        
        # Find item-level discrepancies
        find_item_level_discrepancies(source_groups, target_groups)
        
        # Final summary
        print("\n" + "="*80)
        print("FINAL SUMMARY")
        print("="*80)
        print(f"Source total (inc VAT): £{source_total_inc:,.2f}")
        print(f"Target total (inc VAT): £{target_total_inc:,.2f}")
        print(f"Difference:             £{total_value_diff:+,.2f}")
        print(f"Percentage difference:  {(total_value_diff / source_total_inc * 100):+.2f}%")
        print()
        print(f"Migration script reported: £83,496.01")
        print(f"Dashboard shows:           £71,904.76")
        print(f"Dashboard should show:     £{target_total_inc:,.2f}")
        print("="*80)
        
    finally:
        source_conn.close()
        target_conn.close()

if __name__ == '__main__':
    main()
