#!/usr/bin/env python3
"""
Enhanced MariaDB/MySQL to PostgreSQL Migration Script
=====================================================

Enhanced features:
- Individual column selection and mapping
- Custom data transformations and concatenations
- Manual data entry and correction interface
- Primary key and foreign key manipulation
- Row-by-row data review and editing
- Advanced data validation and cleaning
- Database schema visualization with crow's foot notation
- ERD generation for understanding table relationships

Author: S Mander
License: MIT
"""

import argparse
import base64
import json
import logging
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple, Any, Callable
from urllib.parse import urlparse
import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, make_response
import re

try:
    import pymysql
    import pymysql.cursors
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    from matplotlib.patches import FancyBboxPatch, ConnectionPatch
    import numpy as np
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import graphviz
    GRAPHVIZ_AVAILABLE = True
except ImportError:
    GRAPHVIZ_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseColumn:
    """Represents a database column with its properties."""
    def __init__(self, name: str, data_type: str, is_nullable: bool = True, 
                 is_primary_key: bool = False, default_value: Any = None,
                 max_length: Optional[int] = None, precision: Optional[int] = None,
                 scale: Optional[int] = None):
        self.name = name
        self.data_type = data_type
        self.is_nullable = is_nullable
        self.is_primary_key = is_primary_key
        self.default_value = default_value
        self.max_length = max_length
        self.precision = precision
        self.scale = scale
        self.foreign_key_reference = None  # (table, column) tuple if FK

class DatabaseTable:
    """Represents a database table with its columns and relationships."""
    def __init__(self, name: str, schema: str = 'public'):
        self.name = name
        self.schema = schema
        self.columns = {}  # column_name -> DatabaseColumn
        self.primary_keys = []
        self.foreign_keys = []  # List of ForeignKeyRelationship objects
        self.indexes = []
        self.constraints = []
        
    def add_column(self, column: DatabaseColumn):
        """Add a column to the table."""
        self.columns[column.name] = column
        if column.is_primary_key:
            self.primary_keys.append(column.name)
    
    def get_column_names(self) -> List[str]:
        """Get list of column names."""
        return list(self.columns.keys())

class ForeignKeyRelationship:
    """Represents a foreign key relationship between tables."""
    def __init__(self, from_table: str, from_column: str, to_table: str, to_column: str,
                 constraint_name: str = None, on_delete: str = 'NO ACTION', on_update: str = 'NO ACTION'):
        self.from_table = from_table
        self.from_column = from_column
        self.to_table = to_table
        self.to_column = to_column
        self.constraint_name = constraint_name
        self.on_delete = on_delete
        self.on_update = on_update
        self.cardinality = 'one-to-many'  # Default assumption

class DatabaseSchema:
    """Represents a complete database schema with tables and relationships."""
    def __init__(self, database_name: str):
        self.database_name = database_name
        self.tables = {}  # table_name -> DatabaseTable
        self.relationships = []  # List of ForeignKeyRelationship objects
        
    def add_table(self, table: DatabaseTable):
        """Add a table to the schema."""
        self.tables[table.name] = table
        
    def add_relationship(self, relationship: ForeignKeyRelationship):
        """Add a foreign key relationship."""
        self.relationships.append(relationship)
        
    def get_table_relationships(self, table_name: str) -> List[ForeignKeyRelationship]:
        """Get all relationships for a specific table."""
        return [rel for rel in self.relationships 
                if rel.from_table == table_name or rel.to_table == table_name]

class SchemaAnalyzer:
    """Analyzes database schemas and extracts table structures and relationships."""
    
    def __init__(self):
        self.schemas = {}  # database_name -> DatabaseSchema
    
    def analyze_mysql_schema(self, connection_config: Dict) -> DatabaseSchema:
        """Analyze MySQL/MariaDB schema and extract table information."""
        if not MYSQL_AVAILABLE:
            raise ImportError("pymysql not available for MySQL analysis")
            
        connection = pymysql.connect(**connection_config)
        schema = DatabaseSchema(connection_config.get('database', 'mysql_db'))
        
        try:
            with connection.cursor(pymysql.cursors.DictCursor) as cursor:
                # Get all tables
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                
                for table_row in tables:
                    table_name = list(table_row.values())[0]
                    table = DatabaseTable(table_name)
                    
                    # Get column information
                    cursor.execute(f"DESCRIBE `{table_name}`")
                    columns = cursor.fetchall()
                    
                    for col in columns:
                        column = DatabaseColumn(
                            name=col['Field'],
                            data_type=col['Type'],
                            is_nullable=(col['Null'] == 'YES'),
                            is_primary_key=(col['Key'] == 'PRI'),
                            default_value=col['Default']
                        )
                        table.add_column(column)
                    
                    schema.add_table(table)
                
                # Get foreign key relationships
                database_name = connection_config.get('database')
                logger.info(f"Looking for foreign keys in database: {database_name}")
                
                # First, let's see what's in the KEY_COLUMN_USAGE table
                cursor.execute("""
                    SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = %s
                """, (database_name,))
                all_keys = cursor.fetchall()
                logger.info(f"Total KEY_COLUMN_USAGE entries: {len(all_keys)}")
                
                # Check specifically for foreign keys
                cursor.execute("""
                    SELECT 
                        kcu.TABLE_NAME as from_table,
                        kcu.COLUMN_NAME as from_column,
                        kcu.REFERENCED_TABLE_NAME as to_table,
                        kcu.REFERENCED_COLUMN_NAME as to_column,
                        kcu.CONSTRAINT_NAME,
                        rc.DELETE_RULE,
                        rc.UPDATE_RULE
                    FROM information_schema.KEY_COLUMN_USAGE kcu
                    JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
                        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
                    WHERE kcu.TABLE_SCHEMA = %s
                        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
                """, (database_name,))
                
                foreign_keys = cursor.fetchall()
                logger.info(f"Found {len(foreign_keys)} foreign key relationships")
                
                # If no foreign keys found, try alternative method for MariaDB
                if len(foreign_keys) == 0:
                    logger.info("No foreign keys found with standard query, trying alternative method...")
                    for table_name, table in schema.tables.items():
                        cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
                        create_table_result = cursor.fetchone()
                        if create_table_result:
                            create_table_sql = list(create_table_result.values())[1]
                            logger.info(f"CREATE TABLE for {table_name}: {create_table_sql[:200]}...")
                            
                            # Parse foreign key constraints from CREATE TABLE statement
                            import re
                            fk_pattern = r'CONSTRAINT\s+`([^`]+)`\s+FOREIGN\s+KEY\s+\(`([^`]+)`\)\s+REFERENCES\s+`([^`]+)`\s+\(`([^`]+)`\)'
                            matches = re.findall(fk_pattern, create_table_sql, re.IGNORECASE)
                            
                            for match in matches:
                                constraint_name, from_col, to_table, to_col = match
                                logger.info(f"Parsed FK: {table_name}.{from_col} -> {to_table}.{to_col}")
                                
                                relationship = ForeignKeyRelationship(
                                    from_table=table_name,
                                    from_column=from_col,
                                    to_table=to_table,
                                    to_column=to_col,
                                    constraint_name=constraint_name,
                                    on_delete='RESTRICT',  # Default values since we can't easily parse these
                                    on_update='RESTRICT'
                                )
                                schema.add_relationship(relationship)
                                
                                # Also add to the table's foreign_keys list
                                if table_name in schema.tables:
                                    schema.tables[table_name].foreign_keys.append(relationship)
                
                for fk in foreign_keys:
                    logger.info(f"FK: {fk['from_table']}.{fk['from_column']} -> {fk['to_table']}.{fk['to_column']}")
                    relationship = ForeignKeyRelationship(
                        from_table=fk['from_table'],
                        from_column=fk['from_column'],
                        to_table=fk['to_table'],
                        to_column=fk['to_column'],
                        constraint_name=fk['CONSTRAINT_NAME'],
                        on_delete=fk['DELETE_RULE'],
                        on_update=fk['UPDATE_RULE']
                    )
                    schema.add_relationship(relationship)
                    
                    # Also add to the table's foreign_keys list
                    if fk['from_table'] in schema.tables:
                        schema.tables[fk['from_table']].foreign_keys.append(relationship)
                    
        finally:
            connection.close()
            
        self.schemas[schema.database_name] = schema
        return schema
    
    def analyze_postgresql_schema(self, connection_config: Dict) -> DatabaseSchema:
        """Analyze PostgreSQL schema and extract table information."""
        connection = psycopg2.connect(**connection_config)
        schema = DatabaseSchema(connection_config.get('database', 'postgresql_db'))
        
        try:
            with connection.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                # Get all tables in public schema
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                """)
                tables = cursor.fetchall()
                
                for table_row in tables:
                    table_name = table_row['table_name']
                    table = DatabaseTable(table_name)
                    
                    # Get column information
                    cursor.execute("""
                        SELECT 
                            column_name,
                            data_type,
                            is_nullable,
                            column_default,
                            character_maximum_length,
                            numeric_precision,
                            numeric_scale
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                        ORDER BY ordinal_position
                    """, (table_name,))
                    
                    columns = cursor.fetchall()
                    for col in columns:
                        column = DatabaseColumn(
                            name=col['column_name'],
                            data_type=col['data_type'],
                            is_nullable=(col['is_nullable'] == 'YES'),
                            default_value=col['column_default'],
                            max_length=col['character_maximum_length'],
                            precision=col['numeric_precision'],
                            scale=col['numeric_scale']
                        )
                        table.add_column(column)
                    
                    # Get primary key information
                    cursor.execute("""
                        SELECT column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.table_schema = 'public'
                        AND tc.table_name = %s
                        AND tc.constraint_type = 'PRIMARY KEY'
                    """, (table_name,))
                    
                    pk_columns = cursor.fetchall()
                    for pk in pk_columns:
                        if pk['column_name'] in table.columns:
                            table.columns[pk['column_name']].is_primary_key = True
                    
                    schema.add_table(table)
                
                # Get foreign key relationships
                cursor.execute("""
                    SELECT 
                        tc.table_name as from_table,
                        kcu.column_name as from_column,
                        ccu.table_name as to_table,
                        ccu.column_name as to_column,
                        tc.constraint_name,
                        rc.delete_rule,
                        rc.update_rule
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu
                        ON ccu.constraint_name = tc.constraint_name
                    JOIN information_schema.referential_constraints rc
                        ON tc.constraint_name = rc.constraint_name
                    WHERE tc.table_schema = 'public'
                    AND tc.constraint_type = 'FOREIGN KEY'
                """)
                
                foreign_keys = cursor.fetchall()
                for fk in foreign_keys:
                    relationship = ForeignKeyRelationship(
                        from_table=fk['from_table'],
                        from_column=fk['from_column'],
                        to_table=fk['to_table'],
                        to_column=fk['to_column'],
                        constraint_name=fk['constraint_name'],
                        on_delete=fk['delete_rule'],
                        on_update=fk['update_rule']
                    )
                    schema.add_relationship(relationship)
                    
                    # Also add to the table's foreign_keys list
                    if fk['from_table'] in schema.tables:
                        schema.tables[fk['from_table']].foreign_keys.append(relationship)
                    
        finally:
            connection.close()
            
        self.schemas[schema.database_name] = schema
        return schema

class ERDGenerator:
    """Generates Entity Relationship Diagrams with crow's foot notation."""
    
    def __init__(self):
        self.colors = {
            'table_header': '#2E86AB',  # More vibrant blue
            'table_border': '#1B365D',  # Darker blue for contrast
            'table_bg': '#FFFFFF',
            'pk_bg': '#FFD6D6',  # Lighter pink for primary keys
            'fk_bg': '#D6E9FF',  # Lighter blue for foreign keys
            'relationship_line': '#E74C3C'  # Red for relationship lines
        }
    
    def generate_matplotlib_erd(self, schema: DatabaseSchema, output_path: str = None) -> str:
        """Generate ERD using matplotlib with crow's foot notation."""
        if not MATPLOTLIB_AVAILABLE:
            raise ImportError("matplotlib not available for ERD generation")
        
        # Calculate layout
        tables = list(schema.tables.values())
        num_tables = len(tables)
        
        if num_tables == 0:
            logger.warning("No tables found in schema")
            return None
        
        # Create figure with larger size for better readability
        fig, ax = plt.subplots(1, 1, figsize=(20, 16))
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        ax.axis('off')
        
        # Calculate table positions in a grid layout with more spacing
        cols = int(np.ceil(np.sqrt(num_tables)))
        rows = int(np.ceil(num_tables / cols))
        
        table_positions = {}
        table_dimensions = {}
        
        for i, table in enumerate(tables):
            row = i // cols
            col = i % cols
            
            # Position calculation with more spacing
            x = 5 + col * 90 / cols
            y = 95 - row * 85 / rows
            
            # Table dimensions based on content - make wider for readability
            num_columns = len(table.columns)
            width = max(20, min(30, len(table.name) * 1.2 + 8))
            height = max(10, num_columns * 2 + 5)  # More height per column
            
            table_positions[table.name] = (x, y)
            table_dimensions[table.name] = (width, height)
            
            # Draw table
            self._draw_table_matplotlib(ax, table, x, y, width, height)
        
        # Draw relationships
        for relationship in schema.relationships:
            if (relationship.from_table in table_positions and 
                relationship.to_table in table_positions):
                self._draw_relationship_matplotlib(
                    ax, relationship, table_positions, table_dimensions
                )
        
        # Add title - make it more prominent
        title_text = f'Entity Relationship Diagram\n{schema.database_name.replace("_", " ").title()}'
        plt.title(title_text, fontsize=20, fontweight='bold', pad=30, 
                 bbox=dict(boxstyle="round,pad=0.5", facecolor='lightblue', alpha=0.8))
        
        # Save or show
        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            plt.close()
            return output_path
        else:
            output_path = f"schema_erd_{schema.database_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            plt.savefig(output_path, dpi=300, bbox_inches='tight',
                       facecolor='white', edgecolor='none')
            plt.close()
            return output_path
    
    def _draw_table_matplotlib(self, ax, table: DatabaseTable, x: float, y: float, 
                              width: float, height: float):
        """Draw a single table using matplotlib."""
        # Table background
        table_rect = FancyBboxPatch(
            (x, y), width, height,
            boxstyle="round,pad=0.1",
            facecolor=self.colors['table_bg'],
            edgecolor=self.colors['table_border'],
            linewidth=1.5
        )
        ax.add_patch(table_rect)
        
        # Table header - make it taller for better table name visibility
        header_rect = FancyBboxPatch(
            (x, y + height - 4), width, 4,  # Increased height from 3 to 4
            boxstyle="round,pad=0.1",
            facecolor=self.colors['table_header'],
            edgecolor=self.colors['table_border'],
            linewidth=2  # Thicker border
        )
        ax.add_patch(header_rect)
        
        # Table name - larger and more prominent
        table_display_name = table.name.replace('_', ' ').title()  # Make more readable
        ax.text(x + width/2, y + height - 2, table_display_name,
                ha='center', va='center', fontweight='bold', 
                fontsize=14, color='white')  # Increased from 10 to 14
        
        # Column list
        columns = list(table.columns.values())
        for i, column in enumerate(columns[:12]):  # Reduced from 15 to 12 for better spacing
            col_y = y + height - 7 - i * 2  # Increased spacing between columns from 1.2 to 2
            
            # Column background for PK/FK
            if column.is_primary_key:
                col_bg = self.colors['pk_bg']
                prefix = "🔑 "
            elif column.foreign_key_reference:
                col_bg = self.colors['fk_bg']
                prefix = "🔗 "
            else:
                col_bg = self.colors['table_bg']
                prefix = ""
            
            # Column text - make more readable
            column_display_name = column.name.replace('_', ' ').title()
            data_type_short = column.data_type.split('(')[0].upper()  # Simplify data type display
            column_text = f"{prefix}{column_display_name}: {data_type_short}"
            if len(column_text) > 30:  # Increased from 25 to 30
                column_text = column_text[:27] + "..."
            
            ax.text(x + 0.8, col_y, column_text,  # Slightly more indented
                    ha='left', va='center', fontsize=11,  # Increased from 8 to 11
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=col_bg, alpha=0.8))
        
        if len(columns) > 12:  # Updated from 15 to 12
            ax.text(x + 0.8, y + 1.5, f"... and {len(columns) - 12} more columns",
                    ha='left', va='center', fontsize=9, style='italic', color='gray')
    
    def _draw_relationship_matplotlib(self, ax, relationship: ForeignKeyRelationship,
                                    table_positions: Dict, table_dimensions: Dict):
        """Draw relationship line with crow's foot notation."""
        from_pos = table_positions[relationship.from_table]
        to_pos = table_positions[relationship.to_table]
        from_dim = table_dimensions[relationship.from_table]
        to_dim = table_dimensions[relationship.to_table]
        
        # Calculate connection points (center of table sides)
        from_x = from_pos[0] + from_dim[0] / 2
        from_y = from_pos[1] + from_dim[1] / 2
        to_x = to_pos[0] + to_dim[0] / 2
        to_y = to_pos[1] + to_dim[1] / 2
        
        # Draw relationship line - make it thicker
        ax.plot([from_x, to_x], [from_y, to_y], 
                color=self.colors['relationship_line'], linewidth=3, alpha=0.8)
        
        # Draw crow's foot at "many" end (from_table)
        self._draw_crows_foot(ax, from_x, from_y, to_x, to_y, at_start=True)
        
        # Draw single line at "one" end (to_table) 
        self._draw_one_mark(ax, to_x, to_y, from_x, from_y)
        
        # Add relationship label - make it more readable
        mid_x = (from_x + to_x) / 2
        mid_y = (from_y + to_y) / 2
        label_text = relationship.from_column.replace('_', ' ').title()
        ax.text(mid_x, mid_y, label_text, 
                ha='center', va='center', fontsize=10,  # Increased from 7 to 10
                fontweight='bold',
                bbox=dict(boxstyle="round,pad=0.4", facecolor='lightyellow', 
                         edgecolor='orange', alpha=0.9, linewidth=1))
    
    def _draw_crows_foot(self, ax, x1: float, y1: float, x2: float, y2: float, at_start: bool = True):
        """Draw crow's foot notation (many side)."""
        if at_start:
            base_x, base_y = x1, y1
            direction_x = x2 - x1
            direction_y = y2 - y1
        else:
            base_x, base_y = x2, y2
            direction_x = x1 - x2
            direction_y = y1 - y2
        
        # Normalize direction
        length = np.sqrt(direction_x**2 + direction_y**2)
        if length > 0:
            direction_x /= length
            direction_y /= length
        
        # Create crow's foot
        foot_length = 2
        foot_width = 1
        
        # Perpendicular direction
        perp_x = -direction_y
        perp_y = direction_x
        
        # Foot points
        tip_x = base_x + direction_x * foot_length
        tip_y = base_y + direction_y * foot_length
        
        left_x = base_x + perp_x * foot_width
        left_y = base_y + perp_y * foot_width
        
        right_x = base_x - perp_x * foot_width
        right_y = base_y - perp_y * foot_width
        
        # Draw the three lines of crow's foot
        ax.plot([tip_x, left_x], [tip_y, left_y], 
                color=self.colors['relationship_line'], linewidth=2)
        ax.plot([tip_x, right_x], [tip_y, right_y], 
                color=self.colors['relationship_line'], linewidth=2)
        ax.plot([tip_x, base_x], [tip_y, base_y], 
                color=self.colors['relationship_line'], linewidth=2)
    
    def _draw_one_mark(self, ax, x1: float, y1: float, x2: float, y2: float):
        """Draw single line notation (one side)."""
        direction_x = x2 - x1
        direction_y = y2 - y1
        
        # Normalize direction
        length = np.sqrt(direction_x**2 + direction_y**2)
        if length > 0:
            direction_x /= length
            direction_y /= length
        
        # Perpendicular direction
        perp_x = -direction_y
        perp_y = direction_x
        
        # Single line across the relationship line
        line_length = 1.5
        start_x = x1 + perp_x * line_length
        start_y = y1 + perp_y * line_length
        end_x = x1 - perp_x * line_length
        end_y = y1 - perp_y * line_length
        
        ax.plot([start_x, end_x], [start_y, end_y], 
                color=self.colors['relationship_line'], linewidth=3)
    
    def generate_graphviz_erd(self, schema: DatabaseSchema, output_path: str = None) -> str:
        """Generate ERD using Graphviz with crow's foot notation simulation."""
        if not GRAPHVIZ_AVAILABLE:
            raise ImportError("graphviz not available for ERD generation")
        
        dot = graphviz.Digraph(comment=f'ERD for {schema.database_name}')
        dot.attr(rankdir='TB', size='20,16', dpi='300')  # Larger size
        dot.attr('node', shape='plaintext', fontname='Arial', fontsize='12')  # Larger font
        dot.attr('edge', fontname='Arial', fontsize='11', fontcolor='red')  # Larger font for edges
        
        # Add tables as nodes
        for table_name, table in schema.tables.items():
            html_label = self._create_graphviz_table_html(table)
            dot.node(table_name, html_label)
        
        # Add relationships as edges with better labels
        for relationship in schema.relationships:
            edge_label = relationship.from_column.replace('_', ' ').title()  # More readable labels
            
            # Use different arrow styles to simulate crow's foot
            if relationship.cardinality == 'one-to-many':
                dot.edge(relationship.to_table, relationship.from_table,
                        label=edge_label, arrowhead='crow', arrowtail='none', 
                        color='red', penwidth='2')  # Thicker, colored lines
            else:
                dot.edge(relationship.from_table, relationship.to_table,
                        label=edge_label, arrowhead='normal', arrowtail='none',
                        color='red', penwidth='2')  # Thicker, colored lines
        
        # Save diagram
        if output_path:
            name, ext = os.path.splitext(output_path)
            dot.render(name, format=ext[1:] if ext else 'png', cleanup=True)
            return output_path
        else:
            output_name = f"schema_erd_{schema.database_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            dot.render(output_name, format='png', cleanup=True)
            return f"{output_name}.png"
    
    def _create_graphviz_table_html(self, table: DatabaseTable) -> str:
        """Create HTML table representation for Graphviz."""
        table_display_name = table.name.replace('_', ' ').title()
        html = f'''<
        <TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#2E86AB" COLOR="white"><FONT POINT-SIZE="14"><B>{table_display_name}</B></FONT></TD></TR>
        '''
        
        for column_name, column in table.columns.items():
            bg_color = ""
            icon = ""
            
            if column.is_primary_key:
                bg_color = ' BGCOLOR="#FFD6D6"'
                icon = "🔑 "
            elif column.foreign_key_reference:
                bg_color = ' BGCOLOR="#D6E9FF"'
                icon = "🔗 "
            
            column_display_name = column.name.replace('_', ' ').title()
            data_type_short = column.data_type.split('(')[0].upper()
            html += f'<TR><TD{bg_color}><FONT POINT-SIZE="11">{icon}{column_display_name}: {data_type_short}</FONT></TD></TR>\n'
        
        html += '</TABLE>>'
        return html
    
    def generate_erd(self, schema: DatabaseSchema, output_path: str = None, format_type: str = 'matplotlib') -> str:
        """Generate ERD using the specified format (matplotlib or graphviz)."""
        try:
            if format_type.lower() == 'graphviz' and GRAPHVIZ_AVAILABLE:
                return self.generate_graphviz_erd(schema, output_path)
            elif MATPLOTLIB_AVAILABLE:
                return self.generate_matplotlib_erd(schema, output_path)
            else:
                raise ImportError(f"No ERD generation libraries available. matplotlib={MATPLOTLIB_AVAILABLE}, graphviz={GRAPHVIZ_AVAILABLE}")
        except Exception as e:
            logger.error(f"Error generating ERD: {e}")
            raise

class TransformationFunction:
    """Represents a data transformation function."""
    def __init__(self, name: str, func: Callable, description: str, params: List[str] = None):
        self.name = name
        self.func = func
        self.description = description
        self.params = params or []
    
    def apply(self, value: Any, **kwargs) -> Any:
        """Apply the transformation function."""
        return self.func(value, **kwargs)

class TableRelationshipMapping:
    """Handles mapping between denormalized source tables and normalized target table relationships."""
    
    def __init__(self):
        self.relationship_mappings = {}  # source_table -> target_relationships
        self.denormalization_strategies = {}
        self.predefined_patterns = self._initialize_common_patterns()
    
    def _initialize_common_patterns(self):
        """Initialize common denormalization patterns for typical legacy schemas."""
        return {
            'order_denormalized': {
                'description': 'Single order table with line items as columns/JSON',
                'target_tables': ['orders', 'order_items'],
                'strategy': 'split_by_line_items'
            },
            'quote_denormalized': {
                'description': 'Single quote table with items embedded',
                'target_tables': ['quotes', 'quote_items'], 
                'strategy': 'split_by_line_items'
            },
            'sale_denormalized': {
                'description': 'Single sale table with item details',
                'target_tables': ['sales', 'sale_items'],
                'strategy': 'split_by_line_items'
            },
            'invoice_with_items': {
                'description': 'Invoice table with separate line items table',
                'target_tables': ['sales', 'sale_items'],
                'strategy': 'direct_mapping'
            }
        }
    
    def create_relationship_mapping(self, source_table: str, target_pattern: str, 
                                  field_mappings: Dict[str, Any]):
        """Create a mapping from source table to normalized target tables."""
        self.relationship_mappings[source_table] = {
            'pattern': target_pattern,
            'field_mappings': field_mappings,
            'created_at': datetime.now()
        }
    
    def get_table_split_strategy(self, source_table: str, sample_data: List[Dict]) -> Dict:
        """Analyze source table to suggest split strategy for normalization."""
        analysis = {
            'recommended_pattern': None,
            'confidence': 0,
            'reasons': [],
            'suggested_mappings': {}
        }
        
        if not sample_data:
            return analysis
        
        sample_row = sample_data[0]
        column_names = list(sample_row.keys())
        
        # Look for patterns indicating denormalized data
        item_indicators = []
        for col in column_names:
            col_lower = col.lower()
            if any(indicator in col_lower for indicator in ['item', 'product', 'sku', 'qty', 'quantity', 'price', 'amount']):
                item_indicators.append(col)
        
        # Check for order-like patterns
        if any(word in source_table.lower() for word in ['order', 'purchase', 'requisition']):
            if len(item_indicators) > 3:
                analysis['recommended_pattern'] = 'order_denormalized'
                analysis['confidence'] = 0.8
                analysis['reasons'].append(f"Found {len(item_indicators)} item-related columns")
        
        # Check for quote-like patterns  
        elif any(word in source_table.lower() for word in ['quote', 'estimate', 'proposal']):
            if len(item_indicators) > 3:
                analysis['recommended_pattern'] = 'quote_denormalized'
                analysis['confidence'] = 0.8
                analysis['reasons'].append(f"Found {len(item_indicators)} item-related columns")
        
        # Check for sale-like patterns
        elif any(word in source_table.lower() for word in ['sale', 'invoice', 'receipt', 'transaction']):
            if len(item_indicators) > 3:
                analysis['recommended_pattern'] = 'sale_denormalized'
                analysis['confidence'] = 0.8
                analysis['reasons'].append(f"Found {len(item_indicators)} item-related columns")
        
        return analysis

class TableRelationship:
    """Represents a relationship between tables (one-to-many, many-to-many)."""
    def __init__(self, parent_table: str, child_table: str, foreign_key: str, relationship_type: str = 'one-to-many'):
        self.parent_table = parent_table
        self.child_table = child_table
        self.foreign_key = foreign_key
        self.relationship_type = relationship_type
        self.column_mappings = {}  # Maps child columns to combined parent+child data
        
class TableMappingStrategy:
    """Represents how to map from a flat source table to normalized target tables."""
    def __init__(self, source_table: str):
        self.source_table = source_table
        self.target_tables = []  # List of target table names
        self.relationships = []  # List of TableRelationship objects
        self.column_mappings = {}  # source_column -> [(target_table, target_column, transformation)]
        self.data_grouping = {}  # How to group rows for normalization
        self.splitting_logic = {}  # Logic for splitting flat data into normalized structure

class NormalizationPlanner:
    """Plans migration from flat tables to normalized schemas."""
    
    def __init__(self):
        self.strategies = {}  # source_table -> TableMappingStrategy
        self.predefined_patterns = self._initialize_patterns()
    
    def _initialize_patterns(self) -> Dict[str, Dict]:
        """Initialize common normalization patterns for orders, quotes, sales."""
        return {
            'orders_pattern': {
                'description': 'Split flat order data into Orders + OrderItems',
                'parent_table': 'orders',
                'child_table': 'order_items',
                'foreign_key': 'order_id',
                'parent_columns': ['order_id', 'supplier_id', 'status', 'total_amount', 'created_by', 'received_by', 'received_at'],
                'child_columns': ['item_id', 'item_name', 'item_sku', 'quantity', 'unit_cost', 'total_cost'],
                'grouping_column': 'order_id'  # Group source rows by this column
            },
            'quotes_pattern': {
                'description': 'Split flat quote data into Quotes + QuoteItems',
                'parent_table': 'quotes',
                'child_table': 'quote_items',
                'foreign_key': 'quote_id',
                'parent_columns': ['quote_id', 'charge_code', 'subtotal_amount', 'vat_amount', 'total_amount', 'customer_info'],
                'child_columns': ['item_id', 'item_name', 'item_sku', 'quantity', 'unit_price', 'subtotal'],
                'grouping_column': 'quote_id'
            },
            'sales_pattern': {
                'description': 'Split flat sale data into Sales + SaleItems',
                'parent_table': 'sales',
                'child_table': 'sale_items',
                'foreign_key': 'sale_id',
                'parent_columns': ['sale_id', 'charge_code', 'subtotal_amount', 'vat_amount', 'total_amount', 'customer_info'],
                'child_columns': ['item_id', 'item_name', 'item_sku', 'quantity', 'unit_price', 'subtotal'],
                'grouping_column': 'sale_id'
            },
            'items_with_stock_pattern': {
                'description': 'Split item data with stock movements',
                'parent_table': 'items',
                'child_table': 'stock_movements',
                'foreign_key': 'item_id',
                'parent_columns': ['name', 'sku', 'description', 'category_id', 'price', 'current_stock'],
                'child_columns': ['type', 'quantity', 'reason', 'performed_by'],
                'grouping_column': 'item_id'
            }
        }
    
    def create_strategy_from_pattern(self, source_table: str, pattern_name: str) -> TableMappingStrategy:
        """Create a mapping strategy based on a predefined pattern."""
        if pattern_name not in self.predefined_patterns:
            raise ValueError(f"Unknown pattern: {pattern_name}")
            
        pattern = self.predefined_patterns[pattern_name]
        strategy = TableMappingStrategy(source_table)
        
        # Set up target tables
        strategy.target_tables = [pattern['parent_table'], pattern['child_table']]
        
        # Create relationship
        relationship = TableRelationship(
            parent_table=pattern['parent_table'],
            child_table=pattern['child_table'],
            foreign_key=pattern['foreign_key']
        )
        strategy.relationships.append(relationship)
        
        # Set grouping logic
        strategy.data_grouping['grouping_column'] = pattern['grouping_column']
        strategy.data_grouping['parent_columns'] = pattern['parent_columns']
        strategy.data_grouping['child_columns'] = pattern['child_columns']
        
        return strategy
    
    def analyze_source_table_structure(self, source_schema: Dict, table_name: str) -> Dict:
        """Analyze source table to suggest normalization strategies."""
        table_info = source_schema.get(table_name, {})
        columns = table_info.get('columns', [])
        sample_data = table_info.get('sample_data', [])
        
        suggestions = {
            'detected_patterns': [],
            'column_analysis': {},
            'data_patterns': {},
            'recommended_strategies': []
        }
        
        # Analyze column names for patterns
        column_names = [col.get('Field', col.get('column_name', '')) for col in columns]
        
        # Look for order-related patterns
        order_indicators = ['order_id', 'order_number', 'item_name', 'quantity', 'unit_price']
        if any(indicator in ' '.join(column_names).lower() for indicator in order_indicators):
            suggestions['detected_patterns'].append('orders_pattern')
        
        # Look for quote-related patterns
        quote_indicators = ['quote_id', 'quote_number', 'quotation']
        if any(indicator in ' '.join(column_names).lower() for indicator in quote_indicators):
            suggestions['detected_patterns'].append('quotes_pattern')
        
        # Look for sale-related patterns
        sale_indicators = ['sale_id', 'sale_number', 'transaction']
        if any(indicator in ' '.join(column_names).lower() for indicator in sale_indicators):
            suggestions['detected_patterns'].append('sales_pattern')
        
        # Analyze sample data for repeating patterns
        if sample_data:
            # Look for potential grouping columns
            for col_name in column_names:
                if col_name.lower().endswith('_id') or col_name.lower().endswith('_number'):
                    values = [row.get(col_name) for row in sample_data if row.get(col_name)]
                    unique_count = len(set(values))
                    total_count = len(values)
                    if unique_count < total_count:  # Indicates potential grouping
                        suggestions['column_analysis'][col_name] = {
                            'type': 'potential_grouping_key',
                            'uniqueness_ratio': unique_count / total_count if total_count > 0 else 0,
                            'sample_values': list(set(values))[:5]
                        }
        
        return suggestions

class ColumnMapping:
    """Represents a column mapping with transformations."""
    def __init__(self, source_table: str, source_column: str, target_table: str, target_column: str):
        self.source_table = source_table
        self.source_column = source_column
        self.target_table = target_table
        self.target_column = target_column
        self.transformation = None
        self.transformation_params = {}  # Parameters for transformation functions
        self.is_primary_key = False
        self.is_foreign_key = False
        self.foreign_key_target = None
        self.required = False
        self.default_value = None
        self.validation_rules = []
        self.normalization_group = None  # 'parent' or 'child' for normalized tables
        # New fields for table relationships
        self.is_split_field = False  # If this column needs to be split across multiple target rows
        self.parent_table_field = None  # If this maps to parent table in 1:many relationship
        self.split_strategy = None  # How to split this field if needed

class LegacyMigrationPlanner:
    """Specialized planner for complex legacy table migrations involving normalization."""
    
    def __init__(self):
        self.migration_templates = self._initialize_templates()
        self.custom_strategies = {}
    
    def _initialize_templates(self) -> Dict[str, Dict]:
        """Initialize common migration templates for legacy systems."""
        return {
            'flat_sales_to_normalized': {
                'description': 'Migrate flat sales table to Sales + SaleItems structure',
                'pattern': 'one_to_many_split',
                'source_structure': 'single_table',
                'target_structure': 'parent_child_tables',
                'grouping_strategy': 'by_transaction_id',
                'parent_table_mapping': {
                    'target_table': 'sales',
                    'required_fields': ['sale_id', 'charge_code', 'total_amount', 'created_at'],
                    'optional_fields': ['customer_info', 'notes', 'vat_amount', 'subtotal_amount']
                },
                'child_table_mapping': {
                    'target_table': 'sale_items',
                    'required_fields': ['sale_id', 'item_id', 'quantity', 'unit_price'],
                    'optional_fields': ['item_name', 'item_sku', 'subtotal', 'vat_rate', 'vat_amount', 'total_with_vat']
                },
                'split_logic': {
                    'type': 'multiple_items_per_row',
                    'item_detection': ['item_id', 'product_id', 'sku'],
                    'quantity_detection': ['qty', 'quantity', 'amount'],
                    'price_detection': ['price', 'unit_price', 'item_price']
                }
            },
            'flat_orders_to_normalized': {
                'description': 'Migrate flat orders table to Orders + OrderItems structure',
                'pattern': 'one_to_many_split',
                'source_structure': 'single_table',
                'target_structure': 'parent_child_tables',
                'grouping_strategy': 'by_transaction_id',
                'parent_table_mapping': {
                    'target_table': 'orders',
                    'required_fields': ['order_id', 'supplier_id', 'status', 'created_by'],
                    'optional_fields': ['total_amount', 'received_by', 'received_at', 'notes']
                },
                'child_table_mapping': {
                    'target_table': 'order_items',
                    'required_fields': ['order_id', 'item_name', 'quantity', 'unit_cost'],
                    'optional_fields': ['item_id', 'item_sku', 'category_id', 'total_cost', 'received']
                },
                'split_logic': {
                    'type': 'multiple_items_per_row',
                    'item_detection': ['item_id', 'product_id', 'sku', 'item_name'],
                    'quantity_detection': ['qty', 'quantity', 'amount'],
                    'price_detection': ['cost', 'unit_cost', 'price']
                }
            },
            'flat_quotes_to_normalized': {
                'description': 'Migrate flat quotes table to Quotes + QuoteItems structure',
                'pattern': 'one_to_many_split',
                'source_structure': 'single_table',
                'target_structure': 'parent_child_tables',
                'grouping_strategy': 'by_transaction_id',
                'parent_table_mapping': {
                    'target_table': 'quotes',
                    'required_fields': ['quote_id', 'charge_code', 'total_amount'],
                    'optional_fields': ['customer_info', 'status', 'created_by', 'vat_amount', 'subtotal_amount']
                },
                'child_table_mapping': {
                    'target_table': 'quote_items',
                    'required_fields': ['quote_id', 'item_id', 'quantity', 'unit_price'],
                    'optional_fields': ['item_name', 'item_sku', 'subtotal', 'vat_rate', 'total_with_vat']
                },
                'split_logic': {
                    'type': 'multiple_items_per_row',
                    'item_detection': ['item_id', 'product_id', 'sku'],
                    'quantity_detection': ['qty', 'quantity'],
                    'price_detection': ['price', 'unit_price']
                }
            }
        }
    
    def analyze_legacy_table_structure(self, table_name: str, sample_data: List[Dict]) -> Dict:
        """Analyze a legacy table and suggest migration strategy."""
        analysis = {
            'table_name': table_name,
            'suggested_template': None,
            'confidence': 0,
            'detected_patterns': [],
            'migration_complexity': 'simple',
            'recommended_approach': {},
            'potential_issues': []
        }
        
        if not sample_data:
            analysis['potential_issues'].append("No sample data available for analysis")
            return analysis
            
        columns = list(sample_data[0].keys())
        column_names_lower = [col.lower() for col in columns]
        
        # Detect transaction/grouping ID patterns
        id_columns = [col for col in columns if any(pattern in col.lower() 
                     for pattern in ['_id', 'id_', 'number', 'ref'])]
        
        # Detect item-related columns
        item_columns = [col for col in columns if any(pattern in col.lower() 
                       for pattern in ['item', 'product', 'sku', 'part'])]
        
        # Detect quantity columns
        qty_columns = [col for col in columns if any(pattern in col.lower() 
                      for pattern in ['qty', 'quantity', 'amount', 'count'])]
        
        # Detect price columns
        price_columns = [col for col in columns if any(pattern in col.lower() 
                        for pattern in ['price', 'cost', 'amount', 'total'])]
        
        analysis['detected_patterns'] = {
            'id_columns': id_columns,
            'item_columns': item_columns,
            'quantity_columns': qty_columns,
            'price_columns': price_columns
        }
        
        # Analyze for sales pattern
        if any(word in table_name.lower() for word in ['sale', 'invoice', 'receipt']):
            if len(item_columns) >= 2 and len(qty_columns) >= 1 and len(price_columns) >= 1:
                analysis['suggested_template'] = 'flat_sales_to_normalized'
                analysis['confidence'] = 0.8
                analysis['migration_complexity'] = 'complex'
                analysis['recommended_approach'] = {
                    'strategy': 'split_by_item_grouping',
                    'parent_table': 'sales',
                    'child_table': 'sale_items',
                    'grouping_column': self._suggest_grouping_column(id_columns, 'sale')
                }
        
        # Analyze for orders pattern
        elif any(word in table_name.lower() for word in ['order', 'purchase', 'po']):
            if len(item_columns) >= 1 and len(qty_columns) >= 1:
                analysis['suggested_template'] = 'flat_orders_to_normalized'
                analysis['confidence'] = 0.8
                analysis['migration_complexity'] = 'complex'
                analysis['recommended_approach'] = {
                    'strategy': 'split_by_item_grouping',
                    'parent_table': 'orders',
                    'child_table': 'order_items',
                    'grouping_column': self._suggest_grouping_column(id_columns, 'order')
                }
        
        # Analyze for quotes pattern
        elif any(word in table_name.lower() for word in ['quote', 'estimate']):
            if len(item_columns) >= 1 and len(qty_columns) >= 1 and len(price_columns) >= 1:
                analysis['suggested_template'] = 'flat_quotes_to_normalized'
                analysis['confidence'] = 0.8
                analysis['migration_complexity'] = 'complex'
                analysis['recommended_approach'] = {
                    'strategy': 'split_by_item_grouping',
                    'parent_table': 'quotes',
                    'child_table': 'quote_items',
                    'grouping_column': self._suggest_grouping_column(id_columns, 'quote')
                }
        
        # Check for potential migration issues
        if analysis['migration_complexity'] == 'complex':
            # Look for multiple item patterns in single row
            sample_row = sample_data[0]
            multi_item_indicators = 0
            for col_name in columns:
                if any(num in col_name.lower() for num in ['1', '2', '3', 'first', 'second']):
                    multi_item_indicators += 1
            
            if multi_item_indicators > 0:
                analysis['potential_issues'].append(
                    f"Detected {multi_item_indicators} columns suggesting multiple items per row"
                )
                analysis['migration_complexity'] = 'very_complex'
                analysis['recommended_approach']['multi_item_strategy'] = 'column_based_splitting'
        
        return analysis
    
    def _suggest_grouping_column(self, id_columns: List[str], transaction_type: str) -> str:
        """Suggest the best column for grouping transactions."""
        preferred_patterns = [f"{transaction_type}_id", f"{transaction_type}_number", "id", "ref", "number"]
        
        for pattern in preferred_patterns:
            for col in id_columns:
                if pattern in col.lower():
                    return col
                    
        return id_columns[0] if id_columns else 'id'
    
    def create_migration_strategy(self, table_name: str, template_name: str, 
                                column_mappings: Dict[str, str]) -> Dict:
        """Create a detailed migration strategy based on template and mappings."""
        if template_name not in self.migration_templates:
            raise ValueError(f"Unknown template: {template_name}")
            
        template = self.migration_templates[template_name]
        strategy = {
            'source_table': table_name,
            'template': template_name,
            'migration_type': 'complex_normalization',
            'sql_generation': {
                'parent_insert': '',
                'child_insert': '',
                'data_extraction': ''
            },
            'column_mappings': column_mappings,
            'validation_rules': [],
            'post_migration_checks': []
        }
        
        # Generate parent table SQL
        parent_mapping = template['parent_table_mapping']
        parent_columns = list(column_mappings.get('parent_fields', {}).keys())
        parent_values = list(column_mappings.get('parent_fields', {}).values())
        
        if parent_columns and parent_values:
            strategy['sql_generation']['parent_insert'] = f"""
                INSERT INTO {parent_mapping['target_table']} ({', '.join(parent_columns)})
                SELECT DISTINCT {', '.join(parent_values)}
                FROM {table_name}
                WHERE {column_mappings.get('grouping_column', 'id')} IS NOT NULL
            """
        
        # Generate child table SQL
        child_mapping = template['child_table_mapping']
        child_columns = list(column_mappings.get('child_fields', {}).keys())
        child_values = list(column_mappings.get('child_fields', {}).values())
        
        if child_columns and child_values:
            strategy['sql_generation']['child_insert'] = f"""
                INSERT INTO {child_mapping['target_table']} ({', '.join(child_columns)})
                SELECT {', '.join(child_values)}
                FROM {table_name}
                WHERE {column_mappings.get('item_condition', '1=1')}
            """
        
        return strategy

class EnhancedMigrator:
    """Enhanced migration tool with detailed column control."""
    
    def __init__(self, mariadb_config: dict, pg_config: dict):
        self.mariadb_config = mariadb_config
        self.pg_config = pg_config
        self.mariadb_conn = None
        self.pg_conn = None
        
        # Enhanced mapping structures
        self.column_mappings: Dict[str, ColumnMapping] = {}
        self.table_mappings: Dict[str, str] = {}  # source_table -> target_table
        self.transformations = self._initialize_transformations()
        self.manual_entries: Dict[str, Dict[int, Dict[str, Any]]] = {}  # table -> row_id -> column -> value
        
        # Schema information
        self.source_schema = {}
        self.target_schema = {}
        
        # Normalization support
        self.normalization_planner = NormalizationPlanner()
        self.table_strategies: Dict[str, TableMappingStrategy] = {}  # source_table -> strategy
        
        # Legacy migration planner for complex normalizations
        self.legacy_planner = LegacyMigrationPlanner()
        self.complex_migration_strategies = {}  # source_table -> complex migration strategy
        
        # Table relationship mapping for normalized schemas
        self.relationship_mapper = TableRelationshipMapping()
        self.table_dependencies = {}  # For handling parent-child relationships during migration
        self.split_mappings = {}  # source_table -> how to split into multiple target tables
        
        # Migration tracking
        self.migration_progress = {}
        self.validation_errors = []
        self.data_issues = []
        
    def _initialize_transformations(self) -> Dict[str, TransformationFunction]:
        """Initialize available transformation functions."""
        transformations = {}
        
        # Basic transformations
        transformations['identity'] = TransformationFunction(
            'identity', lambda x: x, 'No transformation'
        )
        
        transformations['uppercase'] = TransformationFunction(
            'uppercase', lambda x: str(x).upper() if x else x, 'Convert to uppercase'
        )
        
        transformations['lowercase'] = TransformationFunction(
            'lowercase', lambda x: str(x).lower() if x else x, 'Convert to lowercase'
        )
        
        transformations['trim'] = TransformationFunction(
            'trim', lambda x: str(x).strip() if x else x, 'Remove leading/trailing whitespace'
        )
        
        # Concatenation
        transformations['concat'] = TransformationFunction(
            'concat', 
            lambda x, columns=None, separator=' ': separator.join(str(col) for col in columns if col),
            'Concatenate multiple columns',
            ['columns', 'separator']
        )
        
        # Advanced concatenation with custom formatting
        transformations['advanced_concat'] = TransformationFunction(
            'advanced_concat',
            lambda x, column_mappings=None, template=None, separator=' ': 
                self._apply_advanced_concatenation(x, column_mappings, template, separator),
            'Advanced concatenation with template formatting',
            ['column_mappings', 'template', 'separator']
        )
        
        # Notes table relationship transformation
        transformations['notes_relationship'] = TransformationFunction(
            'notes_relationship',
            lambda x, reference_type=None, reference_id=None, created_by=None:
                self._create_notes_relationship(x, reference_type, reference_id, created_by),
            'Convert text field to notes table relationship',
            ['reference_type', 'reference_id', 'created_by']
        )
        
        # Date transformations
        transformations['date_format'] = TransformationFunction(
            'date_format',
            lambda x, format_from='%Y-%m-%d', format_to='%Y-%m-%d': 
                datetime.strptime(str(x), format_from).strftime(format_to) if x else x,
            'Convert date format',
            ['format_from', 'format_to']
        )
        
        # Numeric transformations
        transformations['round'] = TransformationFunction(
            'round',
            lambda x, decimals=2: round(float(x), decimals) if x and str(x).replace('.', '').isdigit() else x,
            'Round to specified decimal places',
            ['decimals']
        )
        
        # Custom mapping
        transformations['map_values'] = TransformationFunction(
            'map_values',
            lambda x, mapping=None: mapping.get(str(x), x) if mapping else x,
            'Map values using dictionary',
            ['mapping']
        )
        
        # Generate IDs
        transformations['generate_uuid'] = TransformationFunction(
            'generate_uuid',
            lambda x: str(__import__('uuid').uuid4()),
            'Generate UUID'
        )
        
        transformations['generate_sequence'] = TransformationFunction(
            'generate_sequence',
            lambda x, start=1, prefix='': f"{prefix}{start + int(x) if str(x).isdigit() else start}",
            'Generate sequence number',
            ['start', 'prefix']
        )
        
        return transformations
    
    def initialize_schema_analyzer(self):
        """Initialize schema analyzer for ERD generation."""
        self.schema_analyzer = SchemaAnalyzer()
        self.erd_generator = ERDGenerator()
    
    def analyze_source_schema(self) -> DatabaseSchema:
        """Analyze the source database schema."""
        if not hasattr(self, 'schema_analyzer'):
            self.initialize_schema_analyzer()
        
        # Prepare connection config for MySQL
        mysql_config = {
            'host': self.mariadb_config['host'],
            'port': self.mariadb_config.get('port', 3306),
            'user': self.mariadb_config['user'],
            'password': self.mariadb_config['password'],
            'database': self.mariadb_config['database'],
            'charset': 'utf8mb4'
        }
        
        return self.schema_analyzer.analyze_mysql_schema(mysql_config)
    
    def analyze_target_schema(self) -> DatabaseSchema:
        """Analyze the target PostgreSQL database schema."""
        if not hasattr(self, 'schema_analyzer'):
            self.initialize_schema_analyzer()
        
        # Prepare connection config for PostgreSQL
        pg_config = {
            'host': self.pg_config['host'],
            'port': self.pg_config.get('port', 5432),
            'user': self.pg_config['user'],
            'password': self.pg_config['password'],
            'database': self.pg_config['database']
        }
        
        return self.schema_analyzer.analyze_postgresql_schema(pg_config)
    
    def generate_schema_comparison_erd(self, output_dir: str = "schema_diagrams") -> Dict[str, str]:
        """Generate ERD diagrams for both source and target schemas."""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        results = {}
        
        try:
            # Analyze source schema
            logger.info("Analyzing source database schema...")
            source_schema = self.analyze_source_schema()
            
            # Generate source ERD
            source_erd_path = os.path.join(output_dir, f"source_schema_{source_schema.database_name}.png")
            if MATPLOTLIB_AVAILABLE:
                source_erd_path = self.erd_generator.generate_matplotlib_erd(source_schema, source_erd_path)
                results['source_matplotlib'] = source_erd_path
                logger.info(f"Source schema ERD (matplotlib) generated: {source_erd_path}")
            
            if GRAPHVIZ_AVAILABLE:
                source_graphviz_path = os.path.join(output_dir, f"source_schema_{source_schema.database_name}_graphviz.png")
                source_graphviz_path = self.erd_generator.generate_graphviz_erd(source_schema, source_graphviz_path)
                results['source_graphviz'] = source_graphviz_path
                logger.info(f"Source schema ERD (graphviz) generated: {source_graphviz_path}")
            
            # Store schema for analysis
            results['source_schema'] = source_schema
            
        except Exception as e:
            logger.error(f"Error generating source schema ERD: {e}")
            results['source_error'] = str(e)
        
        try:
            # Analyze target schema
            logger.info("Analyzing target database schema...")
            target_schema = self.analyze_target_schema()
            
            # Generate target ERD
            target_erd_path = os.path.join(output_dir, f"target_schema_{target_schema.database_name}.png")
            if MATPLOTLIB_AVAILABLE:
                target_erd_path = self.erd_generator.generate_matplotlib_erd(target_schema, target_erd_path)
                results['target_matplotlib'] = target_erd_path
                logger.info(f"Target schema ERD (matplotlib) generated: {target_erd_path}")
            
            if GRAPHVIZ_AVAILABLE:
                target_graphviz_path = os.path.join(output_dir, f"target_schema_{target_schema.database_name}_graphviz.png")
                target_graphviz_path = self.erd_generator.generate_graphviz_erd(target_schema, target_graphviz_path)
                results['target_graphviz'] = target_graphviz_path
                logger.info(f"Target schema ERD (graphviz) generated: {target_graphviz_path}")
            
            # Store schema for analysis
            results['target_schema'] = target_schema
            
        except Exception as e:
            logger.error(f"Error generating target schema ERD: {e}")
            results['target_error'] = str(e)
        
        # Generate migration guidance
        if 'source_schema' in results and 'target_schema' in results:
            guidance = self.generate_migration_guidance(results['source_schema'], results['target_schema'])
            results['migration_guidance'] = guidance
            
            # Save guidance to file
            guidance_path = os.path.join(output_dir, "migration_guidance.json")
            with open(guidance_path, 'w') as f:
                json.dump(guidance, f, indent=2, default=str)
            results['guidance_file'] = guidance_path
            logger.info(f"Migration guidance saved: {guidance_path}")
        
        return results
    
    def generate_migration_guidance(self, source_schema: DatabaseSchema, target_schema: DatabaseSchema) -> Dict:
        """Generate migration guidance based on schema comparison."""
        guidance = {
            'summary': {
                'source_tables': len(source_schema.tables),
                'target_tables': len(target_schema.tables),
                'source_relationships': len(source_schema.relationships),
                'target_relationships': len(target_schema.relationships)
            },
            'table_mapping_suggestions': {},
            'relationship_analysis': {},
            'normalization_opportunities': {},
            'potential_issues': []
        }
        
        # Analyze table mappings
        source_tables = set(source_schema.tables.keys())
        target_tables = set(target_schema.tables.keys())
        
        # Direct name matches
        direct_matches = source_tables.intersection(target_tables)
        guidance['table_mapping_suggestions']['direct_matches'] = list(direct_matches)
        
        # Potential matches (similar names)
        potential_matches = {}
        for source_table in source_tables - direct_matches:
            for target_table in target_tables - direct_matches:
                similarity = self._calculate_table_name_similarity(source_table, target_table)
                if similarity > 0.6:  # 60% similarity threshold
                    if source_table not in potential_matches:
                        potential_matches[source_table] = []
                    potential_matches[source_table].append({
                        'target': target_table,
                        'similarity': similarity
                    })
        
        guidance['table_mapping_suggestions']['potential_matches'] = potential_matches
        
        # Tables without matches
        guidance['table_mapping_suggestions']['source_only'] = list(source_tables - target_tables)
        guidance['table_mapping_suggestions']['target_only'] = list(target_tables - source_tables)
        
        # Analyze relationships
        source_rel_map = {}
        for rel in source_schema.relationships:
            key = f"{rel.from_table}->{rel.to_table}"
            source_rel_map[key] = rel
        
        target_rel_map = {}
        for rel in target_schema.relationships:
            key = f"{rel.from_table}->{rel.to_table}"
            target_rel_map[key] = rel
        
        guidance['relationship_analysis'] = {
            'matching_relationships': list(set(source_rel_map.keys()).intersection(set(target_rel_map.keys()))),
            'source_only_relationships': list(set(source_rel_map.keys()) - set(target_rel_map.keys())),
            'target_only_relationships': list(set(target_rel_map.keys()) - set(source_rel_map.keys()))
        }
        
        # Analyze normalization opportunities
        for table_name, table in source_schema.tables.items():
            if len(table.columns) > 15:  # Tables with many columns might need normalization
                guidance['normalization_opportunities'][table_name] = {
                    'reason': 'High column count',
                    'column_count': len(table.columns),
                    'suggested_action': 'Consider splitting into multiple related tables'
                }
        
        # Identify potential issues
        for source_table in source_tables:
            if source_table not in target_tables and source_table not in potential_matches:
                guidance['potential_issues'].append({
                    'type': 'unmapped_source_table',
                    'table': source_table,
                    'message': f"Source table '{source_table}' has no clear target mapping"
                })
        
        # Check for foreign key mismatches
        for rel in source_schema.relationships:
            matching_target_rel = None
            for target_rel in target_schema.relationships:
                if (rel.from_table == target_rel.from_table and 
                    rel.to_table == target_rel.to_table):
                    matching_target_rel = target_rel
                    break
            
            if not matching_target_rel:
                guidance['potential_issues'].append({
                    'type': 'missing_relationship',
                    'relationship': f"{rel.from_table}.{rel.from_column} -> {rel.to_table}.{rel.to_column}",
                    'message': f"Source relationship not found in target schema"
                })
        
        return guidance
    
    def _calculate_table_name_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two table names."""
        import difflib
        return difflib.SequenceMatcher(None, name1.lower(), name2.lower()).ratio()
    
    def print_schema_summary(self, schema: DatabaseSchema):
        """Print a summary of the database schema."""
        print(f"\n=== Database Schema Summary: {schema.database_name} ===")
        print(f"Total Tables: {len(schema.tables)}")
        print(f"Total Relationships: {len(schema.relationships)}")
        
        print("\nTables:")
        for table_name, table in schema.tables.items():
            pk_count = len(table.primary_keys)
            fk_count = len([rel for rel in schema.relationships if rel.from_table == table_name])
            print(f"  {table_name}: {len(table.columns)} columns, {pk_count} PKs, {fk_count} FKs")
        
        if schema.relationships:
            print("\nRelationships:")
            for rel in schema.relationships:
                print(f"  {rel.from_table}.{rel.from_column} -> {rel.to_table}.{rel.to_column}")
    
    def analyze_table_relationships(self, source_table: str) -> Dict:
        """Analyze source table to suggest target table relationship mappings."""
        if not self.mariadb_conn:
            self.connect_databases()
            
        # Get sample data for analysis
        cursor = self.mariadb_conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"SELECT * FROM `{source_table}` LIMIT 5")
        sample_data = cursor.fetchall()
        cursor.close()
        
        # Get column information
        cursor = self.mariadb_conn.cursor()
        cursor.execute(f"DESCRIBE `{source_table}`")
        columns = cursor.fetchall()
        cursor.close()
        
        # Use relationship mapper to analyze
        analysis = self.relationship_mapper.get_table_split_strategy(source_table, sample_data)
        
        # Add column details
        analysis['columns'] = {}
        for col in columns:
            col_name = col[0]
            analysis['columns'][col_name] = {
                'type': col[1],
                'nullable': col[2] == 'YES',
                'key': col[3],
                'default': col[4],
                'extra': col[5]
            }
        
        return analysis
    
    def create_table_split_mapping(self, source_table: str, parent_table: str, 
                                 child_table: str, split_config: Dict):
        """Create mapping for splitting denormalized table into parent/child relationship."""
        self.split_mappings[source_table] = {
            'parent_table': parent_table,
            'child_table': child_table,
            'parent_fields': split_config.get('parent_fields', []),
            'child_fields': split_config.get('child_fields', []),
            'foreign_key_field': split_config.get('foreign_key_field', 'id'),
            'child_foreign_key': split_config.get('child_foreign_key'),
            'split_strategy': split_config.get('split_strategy', 'duplicate_parent'),
            'line_item_detection': split_config.get('line_item_detection', {}),
        }
        
        # Create dependency relationship
        if parent_table not in self.table_dependencies:
            self.table_dependencies[parent_table] = []
        self.table_dependencies[parent_table].append(child_table)
    
    def get_normalized_target_patterns(self) -> Dict:
        """Get available normalized table patterns from target schema."""
        patterns = {
            'orders_pattern': {
                'parent': 'orders',
                'child': 'order_items',
                'description': 'Orders with separate line items',
                'parent_key': 'id',
                'foreign_key': 'order_id'
            },
            'quotes_pattern': {
                'parent': 'quotes', 
                'child': 'quote_items',
                'description': 'Quotes with separate line items',
                'parent_key': 'id',
                'foreign_key': 'quote_id'
            },
            'sales_pattern': {
                'parent': 'sales',
                'child': 'sale_items', 
                'description': 'Sales with separate line items',
                'parent_key': 'id',
                'foreign_key': 'sale_id'
            }
        }
        return patterns
    
    def migrate_with_relationships(self, source_table: str) -> Dict:
        """Migrate table with relationship splitting if configured."""
        results = {'success': False, 'parent_records': 0, 'child_records': 0, 'errors': []}
        
        if source_table not in self.split_mappings:
            # Regular single-table migration
            return self.migrate_table_data(source_table)
        
        split_config = self.split_mappings[source_table]
        parent_table = split_config['parent_table']
        child_table = split_config['child_table']
        
        try:
            # Get source data
            cursor = self.mariadb_conn.cursor(pymysql.cursors.DictCursor)
            cursor.execute(f"SELECT * FROM `{source_table}`")
            source_rows = cursor.fetchall()
            cursor.close()
            
            pg_cursor = self.pg_conn.cursor()
            
            for row in source_rows:
                # Extract parent record data
                parent_data = {}
                for field in split_config['parent_fields']:
                    if field in row:
                        parent_data[field] = row[field]
                
                # Insert parent record
                if parent_data:
                    parent_columns = list(parent_data.keys())
                    parent_values = list(parent_data.values())
                    placeholders = ', '.join(['%s'] * len(parent_values))
                    
                    query = f"""
                    INSERT INTO {parent_table} ({', '.join(parent_columns)}) 
                    VALUES ({placeholders}) 
                    RETURNING {split_config['foreign_key_field']}
                    """
                    
                    pg_cursor.execute(query, parent_values)
                    parent_id = pg_cursor.fetchone()[0]
                    results['parent_records'] += 1
                    
                    # Extract and insert child records
                    child_records = self._extract_child_records(row, split_config, parent_id)
                    for child_record in child_records:
                        child_columns = list(child_record.keys())
                        child_values = list(child_record.values())
                        child_placeholders = ', '.join(['%s'] * len(child_values))
                        
                        child_query = f"""
                        INSERT INTO {child_table} ({', '.join(child_columns)}) 
                        VALUES ({child_placeholders})
                        """
                        
                        pg_cursor.execute(child_query, child_values)
                        results['child_records'] += 1
            
            self.pg_conn.commit()
            results['success'] = True
            
        except Exception as e:
            self.pg_conn.rollback()
            results['errors'].append(str(e))
            logger.error(f"Migration failed for {source_table}: {e}")
            
        return results
    
    def _extract_child_records(self, parent_row: Dict, split_config: Dict, parent_id: int) -> List[Dict]:
        """Extract child records from denormalized parent row."""
        strategy = split_config.get('split_strategy', 'duplicate_parent')
        child_records = []
        
        if strategy == 'json_array':
            # Extract from JSON array field
            json_field = split_config.get('json_field')
            if json_field and parent_row.get(json_field):
                try:
                    import json
                    items = json.loads(parent_row[json_field])
                    for item in items:
                        child_record = {split_config['child_foreign_key']: parent_id}
                        child_record.update(item)
                        child_records.append(child_record)
                except json.JSONDecodeError:
                    pass
                    
        elif strategy == 'column_pattern':
            # Extract from column patterns like item1_name, item1_qty, item2_name, item2_qty
            item_pattern = split_config.get('item_pattern', r'item(\d+)_(.+)')
            import re
            
            items = {}
            for col_name, value in parent_row.items():
                match = re.match(item_pattern, col_name)
                if match and value is not None:
                    item_num = match.group(1)
                    field_name = match.group(2)
                    
                    if item_num not in items:
                        items[item_num] = {split_config['child_foreign_key']: parent_id}
                    items[item_num][field_name] = value
            
            child_records = list(items.values())
            
        elif strategy == 'single_item':
            # Single child record with specific fields
            child_record = {split_config['child_foreign_key']: parent_id}
            for field in split_config['child_fields']:
                if field in parent_row:
                    child_record[field] = parent_row[field]
            
            if len(child_record) > 1:  # More than just foreign key
                child_records.append(child_record)
        
        return child_records
    
    def _apply_advanced_concatenation(self, x, column_mappings=None, template=None, separator=' '):
        """Apply advanced concatenation with template formatting."""
        if not column_mappings:
            return str(x) if x is not None else ''
        
        # If template is provided, use it for formatting
        if template:
            try:
                # Template should have placeholders like {address1}, {address2}, etc.
                return template.format(**column_mappings)
            except KeyError as e:
                logger.warning(f"Template formatting failed: {e}")
                # Fall back to simple concatenation
        
        # Simple concatenation of all non-empty values
        values = []
        for key, value in column_mappings.items():
            if value is not None and str(value).strip():
                values.append(str(value).strip())
        
        return separator.join(values)
    
    def _create_notes_relationship(self, x, reference_type=None, reference_id=None, created_by=None):
        """Create a notes table entry and return the foreign key reference."""
        if not x or not str(x).strip():
            return None
        
        if not reference_type or not reference_id:
            logger.warning("Notes relationship requires reference_type and reference_id")
            return None
        
        try:
            # Insert into notes table
            pg_cursor = self.pg_conn.cursor()
            
            insert_query = """
                INSERT INTO notes (text, reference_type, reference_id, created_by, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id
            """
            
            pg_cursor.execute(insert_query, (
                str(x).strip(),
                reference_type,
                str(reference_id),
                created_by or 'migration_script'
            ))
            
            note_id = pg_cursor.fetchone()[0]
            pg_cursor.close()
            
            return note_id
            
        except Exception as e:
            logger.error(f"Failed to create notes relationship: {e}")
            return None
    
    def connect_databases(self):
        """Establish database connections with clear credential separation."""
        if not MYSQL_AVAILABLE:
            raise Exception("pymysql not available. Please install: pip install pymysql")
        
        # Validate MariaDB configuration
        required_mariadb_fields = ['host', 'user', 'password', 'database']
        for field in required_mariadb_fields:
            if not self.mariadb_config.get(field):
                raise Exception(f"MariaDB {field} is required")
        
        # Validate PostgreSQL configuration  
        required_pg_fields = ['host', 'user', 'password', 'database']
        for field in required_pg_fields:
            if not self.pg_config.get(field):
                raise Exception(f"PostgreSQL {field} is required")
        
        # Test MariaDB connection first
        try:
            logger.info(f"Connecting to MariaDB at {self.mariadb_config['host']} as {self.mariadb_config['user']}")
            
            # Try multiple connection approaches
            connection_attempts = []
            
            # Attempt 1: Direct connection
            connection_config = {
                'host': self.mariadb_config['host'],
                'port': int(self.mariadb_config.get('port', 3306)),
                'user': self.mariadb_config['user'],
                'password': self.mariadb_config['password'],
                'database': self.mariadb_config['database'],
                'charset': 'utf8mb4',
                'cursorclass': pymysql.cursors.DictCursor,
                'connect_timeout': 10,
                'read_timeout': 10
            }
            
            try:
                self.mariadb_conn = pymysql.connect(**connection_config)
                logger.info("MariaDB connection successful (direct)")
            except pymysql.err.OperationalError as e:
                if '1045' in str(e):  # Access denied error
                    logger.warning(f"Direct connection failed with access denied: {e}")
                    
                    # Attempt 2: Try alternative domain names for university systems
                    alternative_hosts = []
                    original_host = self.mariadb_config['host']
                    
                    # Add alternative domain variations
                    if 'py-it.lancs.ac.uk' in original_host or 'py-it.lancaster.ac.uk' in original_host:
                        alternative_hosts.extend([
                            'py-stores.lancaster.ac.uk', 
                            'py-stores.lancs.ac.uk',
                            'localhost'
                        ])
                    elif 'py-stores.lancs.ac.uk' in original_host:
                        alternative_hosts.extend([
                            'py-stores.lancaster.ac.uk',
                            'localhost'  
                        ])
                    elif 'py-stores.lancaster.ac.uk' in original_host:
                        alternative_hosts.extend([
                            'py-stores.lancs.ac.uk',
                            'localhost'
                        ])
                    else:
                        alternative_hosts = ['localhost']
                    
                    last_error = e
                    for alt_host in alternative_hosts:
                        logger.info(f"Trying alternative connection with {alt_host}...")
                        connection_config['host'] = alt_host
                        try:
                            self.mariadb_conn = pymysql.connect(**connection_config)
                            logger.info(f"MariaDB connection successful ({alt_host})")
                            break
                        except Exception as alt_error:
                            logger.warning(f"Connection to {alt_host} failed: {alt_error}")
                            last_error = alt_error
                    else:
                        # If all alternatives failed, raise the last error
                        logger.error(f"All connection attempts failed for MariaDB. Tried: {original_host}, {', '.join(alternative_hosts)}")
                        raise last_error
                else:
                    raise e
            
            # Test the MariaDB connection
            with self.mariadb_conn.cursor() as cursor:
                cursor.execute("SELECT VERSION() as version, DATABASE() as current_db, USER() as user_name")
                result = cursor.fetchone()
                logger.info(f"MariaDB connected successfully: {result['version']}, database: {result['current_db']}, user: {result['user_name']}")
                
        except Exception as e:
            # Enhanced debugging information
            logger.error("MariaDB connection failed with detailed config info:")
            logger.error(f"  Host: {self.mariadb_config.get('host', 'NOT_SET')}")
            logger.error(f"  Port: {self.mariadb_config.get('port', 'NOT_SET')}")
            logger.error(f"  User: {self.mariadb_config.get('user', 'NOT_SET')}")
            logger.error(f"  Database: {self.mariadb_config.get('database', 'NOT_SET')}")
            logger.error(f"  Password Length: {len(str(self.mariadb_config.get('password', ''))) if self.mariadb_config.get('password') else 0} chars")
            logger.error(f"MariaDB connection error: {e}", exc_info=True)
            
            # Provide helpful error messages based on error type
            error_str = str(e).lower()
            if '1045' in error_str:
                helpful_msg = "Access denied - Check username and password are correct"
            elif '2003' in error_str or 'can\'t connect' in error_str:
                helpful_msg = f"Cannot connect to server - Check if MariaDB is running on {self.mariadb_config['host']}:{self.mariadb_config.get('port', 3306)}"
            elif '1049' in error_str:
                helpful_msg = f"Database '{self.mariadb_config.get('database')}' does not exist"
            elif 'timeout' in error_str:
                helpful_msg = "Connection timeout - Check network connectivity and firewall settings"
            else:
                helpful_msg = "Unknown connection error - Check server status and credentials"
            
            raise Exception(f"MariaDB connection failed: {helpful_msg}. Original error: {str(e)}")
        
        # Test PostgreSQL connection
        try:
            logger.info(f"Connecting to PostgreSQL at {self.pg_config['host']} as {self.pg_config['user']}")
            self.pg_conn = psycopg2.connect(
                host=self.pg_config['host'],
                port=int(self.pg_config.get('port', 5432)),
                user=self.pg_config['user'],
                password=self.pg_config['password'],
                database=self.pg_config['database'],
                connect_timeout=10
            )
            
            # Test the PostgreSQL connection
            with self.pg_conn.cursor() as cursor:
                cursor.execute("SELECT version(), current_database()")
                result = cursor.fetchone()
                
                if not result or len(result) < 2:
                    raise Exception(f"PostgreSQL connection test returned incomplete data: {result}")
                
                # Verify this is actually PostgreSQL
                if not result[0].lower().startswith('postgresql'):
                    raise Exception(f"Expected PostgreSQL but connected to: {result[0]}")
                logger.info(f"PostgreSQL connected successfully: {result[0]}, database: {result[1]}")
                
        except Exception as e:
            # Close MariaDB connection if PostgreSQL fails
            if self.mariadb_conn:
                self.mariadb_conn.close()
                self.mariadb_conn = None
            raise Exception(f"PostgreSQL connection failed for user '{self.pg_config['user']}' at {self.pg_config['host']}: {str(e)}")
        
        logger.info("Both database connections established successfully")
    
    def close_connections(self):
        """Safely close database connections."""
        if self.mariadb_conn:
            try:
                self.mariadb_conn.close()
                logger.info("MariaDB connection closed")
            except:
                pass
            self.mariadb_conn = None
            
        if self.pg_conn:
            try:
                self.pg_conn.close()
                logger.info("PostgreSQL connection closed")
            except:
                pass
            self.pg_conn = None
        
    def get_source_schema(self) -> Dict[str, Dict]:
        """Get detailed schema information from source MariaDB database."""
        if not self.mariadb_conn:
            raise Exception("MariaDB connection not established")
            
        schema = {}
        
        try:
            with self.mariadb_conn.cursor() as cursor:
                # Verify we're connected to the right database
                cursor.execute("SELECT DATABASE() as current_db, USER() as user_name")
                connection_info = cursor.fetchone()
                logger.info(f"Loading source schema from {connection_info['current_db']} as {connection_info['user_name']}")
                
                # Get all tables
                cursor.execute("SHOW TABLES")
                tables = [row[f'Tables_in_{self.mariadb_config["database"]}'] for row in cursor.fetchall()]
                logger.info(f"Found {len(tables)} tables in MariaDB: {', '.join(tables[:5])}{'...' if len(tables) > 5 else ''}")
                
                for table in tables:
                    logger.info(f"Loading schema for MariaDB table: {table}")
                    
                    # Get column information
                    cursor.execute(f"DESCRIBE {table}")
                    columns = cursor.fetchall()
                    
                    # Get sample data (limit to prevent memory issues)
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5")
                    sample_data = cursor.fetchall()
                    
                    # Get foreign keys
                    cursor.execute("""
                        SELECT 
                            COLUMN_NAME,
                            REFERENCED_TABLE_NAME,
                            REFERENCED_COLUMN_NAME
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = %s 
                        AND TABLE_NAME = %s 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    """, (self.mariadb_config['database'], table))
                    foreign_keys = cursor.fetchall()
                    
                    schema[table] = {
                        'columns': columns,
                        'sample_data': sample_data,
                        'foreign_keys': foreign_keys,
                        'row_count': len(sample_data)
                    }
                    
                logger.info(f"Successfully loaded schema for {len(schema)} MariaDB tables")
                
        except Exception as e:
            logger.error(f"Error loading MariaDB schema: {e}")
            raise Exception(f"Failed to load source schema from MariaDB: {str(e)}")
        
        self.source_schema = schema
        return schema
    
    def get_target_schema(self) -> Dict[str, Dict]:
        """Get detailed schema information from target PostgreSQL database."""
        if not self.pg_conn:
            raise Exception("PostgreSQL connection not established")
            
        schema = {}
        
        try:
            with self.pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                # First, determine what type of database this connection is actually connected to
                try:
                    # Try PostgreSQL syntax first
                    cursor.execute("SELECT version(), current_database(), current_user")
                    connection_info = cursor.fetchone()
                    
                    if not connection_info:
                        raise Exception(f"PostgreSQL connection test returned no data: {connection_info}")
                    
                    # Handle RealDictCursor results - access by column name
                    version_info = connection_info['version'].lower()
                    database_name = connection_info['current_database']
                    username = connection_info['current_user']
                    
                    # Check if this is actually PostgreSQL
                    if 'postgresql' in version_info:
                        logger.info(f"Loading target schema from PostgreSQL {database_name} as {username}")
                    elif 'mariadb' in version_info or 'mysql' in version_info:
                        # This connection is actually MariaDB/MySQL, not PostgreSQL!
                        raise Exception(f"ERROR: PostgreSQL connection is actually connected to MariaDB/MySQL! Version: {version_info}. Please check your PostgreSQL configuration in the web interface.")
                    else:
                        raise Exception(f"Unknown database type for PostgreSQL connection: {version_info}")
                        
                except psycopg2.Error as e:
                    # PostgreSQL syntax failed, this might be a MariaDB connection using psycopg2
                    # Try MariaDB syntax to confirm
                    try:
                        cursor.execute("SELECT VERSION() as version, DATABASE() as current_db, USER() as user_name")
                        connection_info = cursor.fetchone()
                        
                        # Handle different cursor types safely
                        if hasattr(connection_info, 'keys') or isinstance(connection_info, dict):
                            # RealDictCursor or dict-like result
                            version_info = connection_info['version'].lower()
                        else:
                            # Regular tuple cursor
                            version_info = str(connection_info[0]).lower()
                        
                        if 'mariadb' in version_info or 'mysql' in version_info:
                            raise Exception(f"ERROR: PostgreSQL connection is actually connected to MariaDB! Version: {version_info}. You have entered MariaDB credentials in the PostgreSQL form fields. Please check your PostgreSQL configuration.")
                        else:
                            raise Exception(f"PostgreSQL connection failed with unknown database type: {version_info}")
                            
                    except Exception as e2:
                        logger.error(f"Failed to determine database type on PostgreSQL connection: {e2}")
                        raise Exception(f"PostgreSQL connection failed and database type could not be determined. Original error: {e}")
                except Exception as e:
                    logger.error(f"Error validating PostgreSQL connection: {e}")
                    logger.error(f"Exception type: {type(e)}")
                    logger.error(f"Exception repr: {repr(e)}")
                    logger.error(f"Exception args: {getattr(e, 'args', None)}")
                    raise Exception(f"PostgreSQL connection validation failed: {type(e).__name__}: {str(e) if str(e) else repr(e)}")
                
                # Get all tables in public schema
                cursor.execute("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """)
                table_rows = cursor.fetchall()
                
                if not table_rows:
                    logger.warning("No tables found in PostgreSQL public schema")
                    tables = []
                else:
                    # Handle both dict-style and tuple-style results
                    try:
                        if hasattr(table_rows[0], 'keys'):  # Dict-like object
                            tables = [row['tablename'] for row in table_rows]
                        else:  # Tuple-like object
                            tables = [row[0] for row in table_rows]
                    except (IndexError, KeyError, TypeError) as e:
                        logger.error(f"Error processing table list: {e}, row sample: {table_rows[0] if table_rows else 'None'}")
                        raise Exception(f"Failed to process PostgreSQL table list: {e}")
                
                logger.info(f"Found {len(tables)} tables in PostgreSQL: {', '.join(tables[:5])}{'...' if len(tables) > 5 else ''}")
                
                for table in tables:
                    logger.info(f"Loading schema for PostgreSQL table: {table}")
                    
                    try:
                        # Get column information
                        cursor.execute("""
                            SELECT 
                                column_name,
                                data_type,
                                is_nullable,
                                column_default,
                                character_maximum_length,
                                ordinal_position
                            FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                            ORDER BY ordinal_position
                        """, (table,))
                        column_rows = cursor.fetchall()
                        
                        if not column_rows:
                            logger.warning(f"No columns found for table {table}")
                            continue
                        
                        # Process columns safely
                        columns = []
                        for row in column_rows:
                            try:
                                column_info = {
                                    'column_name': row['column_name'],
                                    'data_type': row['data_type'],
                                    'is_nullable': row['is_nullable'],
                                    'column_default': row['column_default'],
                                    'character_maximum_length': row['character_maximum_length'],
                                    'ordinal_position': row.get('ordinal_position', 0)
                                }
                                columns.append(column_info)
                            except Exception as e:
                                logger.error(f"Error processing column for table {table}: {e}")
                                continue
                        
                        logger.info(f"  Loaded {len(columns)} columns for table {table}")
                        
                        # Get primary key information
                        cursor.execute("""
                            SELECT kcu.column_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.table_schema = 'public'
                            AND tc.table_name = %s
                            AND tc.constraint_type = 'PRIMARY KEY'
                            ORDER BY kcu.ordinal_position
                        """, (table,))
                        pk_rows = cursor.fetchall()
                        primary_keys = [row['column_name'] for row in pk_rows] if pk_rows else []
                        
                        # Get foreign key information
                        cursor.execute("""
                            SELECT
                                kcu.column_name,
                                ccu.table_name AS foreign_table_name,
                                ccu.column_name AS foreign_column_name,
                                tc.constraint_name
                            FROM information_schema.table_constraints AS tc
                            JOIN information_schema.key_column_usage AS kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            JOIN information_schema.constraint_column_usage AS ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                            WHERE tc.constraint_type = 'FOREIGN KEY'
                            AND tc.table_schema = 'public'
                            AND tc.table_name = %s
                        """, (table,))
                        fk_rows = cursor.fetchall()
                        
                        # Process foreign keys safely
                        foreign_keys = []
                        for row in fk_rows:
                            try:
                                fk_info = {
                                    'column_name': row['column_name'],
                                    'foreign_table_name': row['foreign_table_name'],
                                    'foreign_column_name': row['foreign_column_name'],
                                    'constraint_name': row['constraint_name']
                                }
                                foreign_keys.append(fk_info)
                            except Exception as e:
                                logger.error(f"Error processing foreign key for table {table}: {e}")
                                continue
                        
                        schema[table] = {
                            'columns': columns,
                            'primary_keys': primary_keys,
                            'foreign_keys': foreign_keys,
                            'row_count': 0  # Will be populated if needed
                        }
                        
                    except Exception as e:
                        logger.error(f"Error loading schema for table {table}: {e}")
                        # Continue with other tables rather than failing completely
                        schema[table] = {
                            'columns': [],
                            'primary_keys': [],
                            'foreign_keys': [],
                            'error': str(e)
                        }
                
                logger.info(f"Successfully loaded schema for {len(schema)} PostgreSQL tables")
                
        except Exception as e:
            logger.error(f"Error loading PostgreSQL schema: {e}")
            logger.error(f"Exception type: {type(e)}")
            logger.error(f"Exception repr: {repr(e)}")
            logger.error(f"Exception args: {getattr(e, 'args', None)}")
            raise Exception(f"Failed to load target schema from PostgreSQL: {type(e).__name__}: {str(e) if str(e) else repr(e)}")
        
        self.target_schema = schema
        return schema
    
    def analyze_table_for_normalization(self, table_name: str) -> Dict:
        """Analyze a source table and suggest normalization strategies."""
        return self.normalization_planner.analyze_source_table_structure(
            self.source_schema, table_name
        )
    
    def create_normalization_strategy(self, source_table: str, pattern_name: str) -> TableMappingStrategy:
        """Create a normalization strategy for a source table."""
        strategy = self.normalization_planner.create_strategy_from_pattern(source_table, pattern_name)
        self.table_strategies[source_table] = strategy
        return strategy
    
    def get_normalization_patterns(self) -> Dict[str, Dict]:
        """Get available normalization patterns."""
        return self.normalization_planner.predefined_patterns
    
    def _check_data_type_compatibility(self, source_type: str, target_type: str) -> Dict:
        """Check compatibility between source MariaDB and target PostgreSQL data types."""
        result = {'compatible': True, 'reason': '', 'suggested_transformation': None}
        
        # Normalize type names
        source_type = source_type.lower()
        target_type = target_type.lower()
        
        # Define type compatibility mappings
        compatible_types = {
            # String types
            ('varchar', 'varchar'): True,
            ('varchar', 'text'): True,
            ('text', 'text'): True,
            ('text', 'varchar'): True,
            ('char', 'varchar'): True,
            ('char', 'char'): True,
            
            # Numeric types
            ('int', 'integer'): True,
            ('integer', 'integer'): True,
            ('bigint', 'bigint'): True,
            ('smallint', 'smallint'): True,
            ('tinyint', 'smallint'): True,  # MySQL tinyint -> PostgreSQL smallint
            ('decimal', 'decimal'): True,
            ('decimal', 'numeric'): True,
            ('numeric', 'numeric'): True,
            ('float', 'real'): True,
            ('double', 'double precision'): True,
            
            # Date/time types
            ('datetime', 'timestamp'): True,
            ('timestamp', 'timestamp'): True,
            ('date', 'date'): True,
            ('time', 'time'): True,
            
            # Boolean
            ('tinyint', 'boolean'): True,  # MySQL uses tinyint(1) for boolean
            ('boolean', 'boolean'): True,
            
            # JSON
            ('json', 'json'): True,
            ('json', 'jsonb'): True,
            ('longtext', 'jsonb'): True,  # Often used for JSON in MySQL
        }
        
        # Extract base types (remove size specifications)
        base_source = source_type.split('(')[0]
        base_target = target_type.split('(')[0]
        
        # Check direct compatibility
        if (base_source, base_target) in compatible_types:
            if not compatible_types[(base_source, base_target)]:
                result['compatible'] = False
                result['reason'] = f"Types {source_type} and {target_type} are not directly compatible"
        else:
            # Check for common incompatibilities
            if base_source in ['int', 'bigint', 'smallint', 'tinyint'] and base_target in ['varchar', 'text']:
                result['compatible'] = False
                result['reason'] = "Converting numeric to string - data may need transformation"
                result['suggested_transformation'] = 'to_string'
            elif base_source in ['varchar', 'text'] and base_target in ['int', 'bigint', 'smallint']:
                result['compatible'] = False
                result['reason'] = "Converting string to numeric - may fail if data contains non-numeric values"
                result['suggested_transformation'] = 'to_numeric'
            elif base_source in ['datetime', 'timestamp'] and base_target in ['varchar', 'text']:
                result['compatible'] = False
                result['reason'] = "Converting datetime to string - consider using proper timestamp type"
                result['suggested_transformation'] = 'datetime_to_string'
            elif 'json' in base_source and base_target in ['varchar', 'text']:
                result['compatible'] = False
                result['reason'] = "Converting JSON to text - recommend using jsonb type instead"
                result['suggested_transformation'] = 'json_to_text'
            else:
                result['compatible'] = False
                result['reason'] = f"Unknown compatibility between {source_type} and {target_type}"
        
        return result
    
    def get_database_relationships(self, db_type: str = 'both') -> Dict:
        """Get foreign key relationships for crow's foot notation visualization."""
        relationships = {'tables': {}, 'relationships': []}
        
        if db_type in ['mariadb', 'both']:
            # Get MariaDB relationships
            try:
                cursor = self.mariadb_conn.cursor(pymysql.cursors.DictCursor)
                
                # Get all tables
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                table_names = [list(table.values())[0] for table in tables]
                
                for table_name in table_names:
                    # Get table columns
                    cursor.execute(f"DESCRIBE `{table_name}`")
                    columns = cursor.fetchall()
                    
                    relationships['tables'][f"mariadb.{table_name}"] = {
                        'name': table_name,
                        'database': 'mariadb',
                        'columns': [
                            {
                                'name': col['Field'],
                                'type': col['Type'],
                                'nullable': col['Null'] == 'YES',
                                'key': col['Key'],
                                'default': col['Default']
                            } for col in columns
                        ]
                    }
                    
                    # Get foreign keys
                    cursor.execute("""
                        SELECT 
                            COLUMN_NAME,
                            REFERENCED_TABLE_NAME,
                            REFERENCED_COLUMN_NAME,
                            CONSTRAINT_NAME
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                        WHERE TABLE_SCHEMA = %s 
                        AND TABLE_NAME = %s 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    """, (self.mariadb_config['database'], table_name))
                    
                    fks = cursor.fetchall()
                    for fk in fks:
                        relationships['relationships'].append({
                            'from_table': f"mariadb.{table_name}",
                            'from_column': fk['COLUMN_NAME'],
                            'to_table': f"mariadb.{fk['REFERENCED_TABLE_NAME']}",
                            'to_column': fk['REFERENCED_COLUMN_NAME'],
                            'constraint_name': fk['CONSTRAINT_NAME'],
                            'relationship_type': 'many_to_one'
                        })
                
                cursor.close()
                
            except Exception as e:
                logger.error(f"Error getting MariaDB relationships: {e}")
        
        if db_type in ['postgresql', 'both']:
            # Get PostgreSQL relationships
            try:
                cursor = self.pg_conn.cursor()
                
                # Get all tables in public schema
                cursor.execute("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """)
                tables = cursor.fetchall()
                
                for (table_name,) in tables:
                    # Get table columns with detailed info
                    cursor.execute("""
                        SELECT 
                            c.column_name,
                            c.data_type,
                            c.is_nullable,
                            c.column_default,
                            c.character_maximum_length,
                            CASE 
                                WHEN pk.column_name IS NOT NULL THEN 'PRI'
                                WHEN fk.column_name IS NOT NULL THEN 'MUL'
                                ELSE ''
                            END as key_type
                        FROM information_schema.columns c
                        LEFT JOIN (
                            SELECT ku.column_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage ku
                                ON tc.constraint_name = ku.constraint_name
                            WHERE tc.table_name = %s AND tc.constraint_type = 'PRIMARY KEY'
                        ) pk ON c.column_name = pk.column_name
                        LEFT JOIN (
                            SELECT ku.column_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage ku
                                ON tc.constraint_name = ku.constraint_name
                            WHERE tc.table_name = %s AND tc.constraint_type = 'FOREIGN KEY'
                        ) fk ON c.column_name = fk.column_name
                        WHERE c.table_name = %s
                        ORDER BY c.ordinal_position
                    """, (table_name, table_name, table_name))
                    
                    columns = cursor.fetchall()
                    
                    relationships['tables'][f"postgresql.{table_name}"] = {
                        'name': table_name,
                        'database': 'postgresql',
                        'columns': [
                            {
                                'name': col[0],
                                'type': col[1] + (f"({col[4]})" if col[4] else ""),
                                'nullable': col[2] == 'YES',
                                'key': col[5],
                                'default': col[3]
                            } for col in columns
                        ]
                    }
                    
                    # Get foreign keys
                    cursor.execute("""
                        SELECT
                            kcu.column_name, 
                            ccu.table_name AS foreign_table_name,
                            ccu.column_name AS foreign_column_name,
                            tc.constraint_name
                        FROM 
                            information_schema.table_constraints AS tc 
                            JOIN information_schema.key_column_usage AS kcu
                                ON tc.constraint_name = kcu.constraint_name
                                AND tc.table_schema = kcu.table_schema
                            JOIN information_schema.constraint_column_usage AS ccu
                                ON ccu.constraint_name = tc.constraint_name
                                AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' 
                            AND tc.table_name = %s
                    """, (table_name,))
                    
                    fks = cursor.fetchall()
                    for fk in fks:
                        relationships['relationships'].append({
                            'from_table': f"postgresql.{table_name}",
                            'from_column': fk[0],
                            'to_table': f"postgresql.{fk[1]}",
                            'to_column': fk[2],
                            'constraint_name': fk[3],
                            'relationship_type': 'many_to_one'
                        })
                
                cursor.close()
                
            except Exception as e:
                logger.error(f"Error getting PostgreSQL relationships: {e}")
        
        return relationships
    
    def _execute_complex_migration(self, strategy: Dict) -> Dict:
        """Execute a complex migration strategy with parent-child table creation."""
        results = {
            'success': False,
            'parent_records_created': 0,
            'child_records_created': 0,
            'errors': [],
            'warnings': []
        }
        
        try:
            source_table = strategy['source_table']
            
            # Start transaction
            pg_cursor = self.pg_conn.cursor()
            self.pg_conn.autocommit = False
            
            try:
                # Execute parent table insertion first
                if strategy['sql_generation']['parent_insert']:
                    logger.info(f"Inserting parent records from {source_table}")
                    pg_cursor.execute(strategy['sql_generation']['parent_insert'])
                    results['parent_records_created'] = pg_cursor.rowcount
                
                # Execute child table insertion
                if strategy['sql_generation']['child_insert']:
                    logger.info(f"Inserting child records from {source_table}")
                    pg_cursor.execute(strategy['sql_generation']['child_insert'])
                    results['child_records_created'] = pg_cursor.rowcount
                
                # Commit transaction
                self.pg_conn.commit()
                results['success'] = True
                logger.info(f"Successfully migrated {source_table}: {results['parent_records_created']} parent, {results['child_records_created']} child records")
                
            except Exception as e:
                # Rollback on error
                self.pg_conn.rollback()
                raise e
            finally:
                pg_cursor.close()
                self.pg_conn.autocommit = True
                
        except Exception as e:
            results['errors'].append(f"Migration execution failed: {str(e)}")
            logger.error(f"Complex migration failed for {strategy.get('source_table', 'unknown')}: {e}")
            
        return results
    
    def preview_normalization(self, source_table: str, limit: int = 10) -> Dict:
        """Preview how normalization would split the source data."""
        if source_table not in self.table_strategies:
            return {'error': 'No normalization strategy defined for this table'}
        
        strategy = self.table_strategies[source_table]
        
        try:
            if not self.mariadb_conn:
                self.connect_source()
            
            cursor = self.mariadb_conn.cursor()
            cursor.execute(f"SELECT * FROM {source_table} LIMIT {limit}")
            sample_data = cursor.fetchall()
            
            if not sample_data:
                return {'error': 'No sample data available'}
            
            # Group data according to strategy
            grouping_col = strategy.data_grouping.get('grouping_column')
            parent_cols = strategy.data_grouping.get('parent_columns', [])
            child_cols = strategy.data_grouping.get('child_columns', [])
            
            grouped_preview = {}
            for row in sample_data:
                group_key = row.get(grouping_col)
                if group_key not in grouped_preview:
                    grouped_preview[group_key] = {
                        'parent_data': {},
                        'child_records': []
                    }
                
                # Extract parent data (same for all rows with same group key)
                if not grouped_preview[group_key]['parent_data']:
                    for col in parent_cols:
                        if col in row:
                            grouped_preview[group_key]['parent_data'][col] = row[col]
                
                # Extract child data
                child_record = {}
                for col in child_cols:
                    if col in row:
                        child_record[col] = row[col]
                
                if child_record:  # Only add if there's actual child data
                    grouped_preview[group_key]['child_records'].append(child_record)
            
            return {
                'strategy': {
                    'source_table': source_table,
                    'target_tables': strategy.target_tables,
                    'relationships': [
                        {
                            'parent': rel.parent_table,
                            'child': rel.child_table,
                            'foreign_key': rel.foreign_key
                        } for rel in strategy.relationships
                    ]
                },
                'preview_data': grouped_preview,
                'record_count': len(sample_data),
                'group_count': len(grouped_preview)
            }
        
        except Exception as e:
            logger.error(f"Error previewing normalization: {e}")
            return {'error': f'Failed to preview normalization: {str(e)}'}
    
    def execute_normalized_migration(self, source_table: str, batch_size: int = 1000) -> Dict:
        """Execute migration using the normalization strategy."""
        if source_table not in self.table_strategies:
            return {'error': 'No normalization strategy defined for this table'}
        
        strategy = self.table_strategies[source_table]
        
        try:
            if not self.mariadb_conn:
                self.connect_source()
            if not self.pg_conn:
                self.connect_target()
            
            source_cursor = self.mariadb_conn.cursor()
            target_cursor = self.pg_conn.cursor()
            
            # Get total count
            source_cursor.execute(f"SELECT COUNT(*) as count FROM {source_table}")
            total_rows = source_cursor.fetchone()['count']
            
            migrated_parent_records = 0
            migrated_child_records = 0
            errors = []
            
            # Process in batches
            offset = 0
            while offset < total_rows:
                source_cursor.execute(f"SELECT * FROM {source_table} LIMIT {batch_size} OFFSET {offset}")
                batch_data = source_cursor.fetchall()
                
                if not batch_data:
                    break
                
                # Group the batch data
                grouping_col = strategy.data_grouping.get('grouping_column')
                parent_cols = strategy.data_grouping.get('parent_columns', [])
                child_cols = strategy.data_grouping.get('child_columns', [])
                
                grouped_batch = {}
                for row in batch_data:
                    group_key = row.get(grouping_col)
                    if group_key not in grouped_batch:
                        grouped_batch[group_key] = {
                            'parent_data': {},
                            'child_records': []
                        }
                    
                    # Extract parent data
                    if not grouped_batch[group_key]['parent_data']:
                        for col in parent_cols:
                            if col in row:
                                grouped_batch[group_key]['parent_data'][col] = row[col]
                    
                    # Extract child data
                    child_record = {}
                    for col in child_cols:
                        if col in row:
                            child_record[col] = row[col]
                    
                    if child_record:
                        grouped_batch[group_key]['child_records'].append(child_record)
                
                # Insert normalized data
                for group_key, group_data in grouped_batch.items():
                    try:
                        # Insert parent record
                        parent_table = strategy.relationships[0].parent_table
                        parent_data = group_data['parent_data']
                        
                        if parent_data:
                            columns = list(parent_data.keys())
                            values = list(parent_data.values())
                            placeholders = ', '.join(['%s'] * len(values))
                            
                            insert_query = f"""
                                INSERT INTO {parent_table} ({', '.join(columns)})
                                VALUES ({placeholders})
                                ON CONFLICT DO NOTHING
                            """
                            target_cursor.execute(insert_query, values)
                            migrated_parent_records += 1
                        
                        # Insert child records
                        child_table = strategy.relationships[0].child_table
                        foreign_key = strategy.relationships[0].foreign_key
                        
                        for child_record in group_data['child_records']:
                            child_record[foreign_key] = group_key  # Add foreign key
                            
                            columns = list(child_record.keys())
                            values = list(child_record.values())
                            placeholders = ', '.join(['%s'] * len(values))
                            
                            insert_query = f"""
                                INSERT INTO {child_table} ({', '.join(columns)})
                                VALUES ({placeholders})
                            """
                            target_cursor.execute(insert_query, values)
                            migrated_child_records += 1
                    
                    except Exception as e:
                        errors.append(f"Error migrating group {group_key}: {str(e)}")
                        logger.error(f"Error migrating group {group_key}: {e}")
                
                self.pg_conn.commit()
                offset += batch_size
                
                logger.info(f"Processed {min(offset, total_rows)}/{total_rows} rows")
            
            return {
                'success': True,
                'migrated_parent_records': migrated_parent_records,
                'migrated_child_records': migrated_child_records,
                'total_source_rows': total_rows,
                'errors': errors[:10]  # Limit error list
            }
        
        except Exception as e:
            logger.error(f"Error executing normalized migration: {e}")
            return {'error': f'Failed to execute normalized migration: {str(e)}'}

# Flask Web Interface
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'enhanced-migration-key')

# Global migrator instance
migrator = None

@app.route('/')
def index():
    return render_template('enhanced_migration_ui.html')

@app.route('/api/connect', methods=['POST'])
def api_connect():
    global migrator
    try:
        data = request.get_json()
        mariadb_config = data.get('mariadb', {})
        postgresql_config = data.get('postgresql', {})
        
        # Log connection attempts (without passwords)
        logger.info(f"Attempting MariaDB connection: {mariadb_config.get('user', 'NO_USER')}@{mariadb_config.get('host', 'NO_HOST')}/{mariadb_config.get('database', 'NO_DB')}")
        logger.info(f"Attempting PostgreSQL connection: {postgresql_config.get('user', 'NO_USER')}@{postgresql_config.get('host', 'NO_HOST')}/{postgresql_config.get('database', 'NO_DB')}")
        
        # Validate required fields before creating migrator
        required_fields = ['host', 'user', 'password', 'database']
        
        for field in required_fields:
            if not mariadb_config.get(field):
                return jsonify({'error': f'MariaDB {field} is required'}), 400
            if not postgresql_config.get(field):
                return jsonify({'error': f'PostgreSQL {field} is required'}), 400
        
        # Create migrator with validated configurations
        migrator = EnhancedMigrator(mariadb_config, postgresql_config)
        
        # Attempt connections
        try:
            migrator.connect_databases()
            logger.info("Database connections established successfully")
        except Exception as e:
            raise Exception(f"Connection failed: {str(e)}")
        
        # Load schemas only after successful connections
        try:
            source_schema = migrator.get_source_schema()
            logger.info(f"Source schema loaded successfully: {len(source_schema)} tables")
        except Exception as e:
            raise Exception(f"Failed to load source schema: {str(e)}")
        
        try:
            target_schema = migrator.get_target_schema()
            logger.info(f"Target schema loaded successfully: {len(target_schema)} tables")
        except Exception as e:
            raise Exception(f"Failed to load target schema: {str(e)}")
        
        logger.info(f"Successfully connected to both databases. Source tables: {len(source_schema)}, Target tables: {len(target_schema)}")
        
        return jsonify({
            'success': True,
            'source_tables': list(source_schema.keys()),
            'target_tables': list(target_schema.keys()),
            'transformations': {name: {
                'description': trans.description,
                'params': trans.params
            } for name, trans in migrator.transformations.items()},
            'connection_info': {
                'mariadb': f"{mariadb_config['user']}@{mariadb_config['host']}/{mariadb_config['database']}",
                'postgresql': f"{postgresql_config['user']}@{postgresql_config['host']}/{postgresql_config['database']}"
            }
        })
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Connection failed: {error_msg}")
        
        # Clean up any partial connections
        if 'migrator' in locals() and migrator:
            if hasattr(migrator, 'mariadb_conn') and migrator.mariadb_conn:
                try:
                    migrator.mariadb_conn.close()
                except:
                    pass
            if hasattr(migrator, 'pg_conn') and migrator.pg_conn:
                try:
                    migrator.pg_conn.close()
                except:
                    pass
        
        return jsonify({'error': error_msg}), 500

@app.route('/api/schema/<db_type>/<table_name>')
def api_get_table_schema(db_type, table_name):
    global migrator
    try:
        if db_type == 'source':
            schema = migrator.source_schema.get(table_name)
        elif db_type == 'target':
            schema = migrator.target_schema.get(table_name)
        else:
            return jsonify({'error': 'Invalid database type'}), 400
            
        if not schema:
            return jsonify({'error': 'Table not found'}), 404
            
        return jsonify({
            'table': table_name,
            'schema': schema
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/column-mapping', methods=['POST'])
def api_set_column_mapping():
    global migrator
    try:
        data = request.get_json()
        
        mapping = ColumnMapping(
            source_table=data['source_table'],
            source_column=data['source_column'],
            target_table=data['target_table'],
            target_column=data['target_column']
        )
        
        if 'transformation' in data:
            trans_name = data['transformation']['name']
            trans_params = data['transformation'].get('params', {})
            if trans_name in migrator.transformations:
                mapping.transformation = (trans_name, trans_params)
        
        mapping_key = f"{data['source_table']}.{data['source_column']}->{data['target_table']}.{data['target_column']}"
        migrator.column_mappings[mapping_key] = mapping
        
        return jsonify({'success': True, 'mapping_key': mapping_key})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auto-map-columns', methods=['POST'])
def api_auto_map_columns():
    global migrator
    try:
        data = request.get_json()
        source_table = data['source_table']
        target_table = data['target_table']
        
        if not migrator.source_schema.get(source_table):
            return jsonify({'error': 'Source table not found'}), 404
        if not migrator.target_schema.get(target_table):
            return jsonify({'error': 'Target table not found'}), 404
            
        source_columns = migrator.source_schema[source_table]['columns']
        target_columns = migrator.target_schema[target_table]['columns']
        
        mappings = []
        
        # Create a mapping based on column name similarity and data type compatibility
        for source_col in source_columns:
            # Handle both MariaDB (Field, Type) and PostgreSQL (column_name, data_type) formats
            source_name = (source_col.get('Field') or source_col.get('column_name', '')).lower()
            source_type = (source_col.get('Type') or source_col.get('data_type', '')).lower()
            
            best_match = None
            best_score = 0
            
            for target_col in target_columns:
                target_name = (target_col.get('Field') or target_col.get('column_name', '')).lower()
                target_type = (target_col.get('Type') or target_col.get('data_type', '')).lower()
                
                # Calculate similarity score
                score = 0
                
                # Exact name match
                if source_name == target_name:
                    score += 100
                # Partial name match
                elif source_name in target_name or target_name in source_name:
                    score += 70
                # Similar names (edit distance)
                else:
                    # Simple similarity check - count matching characters
                    matches = sum(1 for a, b in zip(source_name, target_name) if a == b)
                    max_len = max(len(source_name), len(target_name))
                    if max_len > 0:
                        score += (matches / max_len) * 50
                
                # Data type compatibility
                if are_types_compatible(source_type, target_type):
                    score += 30
                elif are_types_similar(source_type, target_type):
                    score += 15
                
                # Prefer this match if it's better
                if score > best_score and score >= 50:  # Minimum threshold
                    best_match = target_col
                    best_score = score
            
            # Create mapping if we found a good match
            if best_match:
                source_col_name = source_col.get('Field') or source_col.get('column_name', '')
                target_col_name = best_match.get('Field') or best_match.get('column_name', '')
                
                mapping_key = f"{source_table}.{source_col_name}->{target_table}.{target_col_name}"
                
                mapping = ColumnMapping(
                    source_table=source_table,
                    source_column=source_col_name,
                    target_table=target_table,
                    target_column=target_col_name
                )
                
                migrator.column_mappings[mapping_key] = mapping
                
                mappings.append({
                    'source_column': source_col_name,
                    'target_column': target_col_name,
                    'score': best_score,
                    'mapping_key': mapping_key
                })
        
        return jsonify({
            'success': True,
            'mappings': mappings,
            'total_mapped': len(mappings)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def are_types_compatible(source_type, target_type):
    """Check if source and target data types are directly compatible."""
    # Normalize type names
    source_type = source_type.lower().split('(')[0]  # Remove size specifications
    target_type = target_type.lower().split('(')[0]
    
    # Direct matches
    type_mappings = {
        'varchar': ['varchar', 'text', 'character varying'],
        'int': ['int', 'integer', 'bigint', 'smallint'],
        'decimal': ['decimal', 'numeric', 'float', 'double'],
        'datetime': ['timestamp', 'datetime'],
        'date': ['date'],
        'text': ['text', 'varchar', 'character varying'],
        'tinyint': ['boolean', 'bool', 'tinyint']
    }
    
    for source_family, target_family in type_mappings.items():
        if source_type.startswith(source_family):
            return any(target_type.startswith(t) for t in target_family)
    
    return source_type == target_type

def are_types_similar(source_type, target_type):
    """Check if types are similar enough for conversion."""
    # All numeric types are somewhat compatible
    numeric_types = ['int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'float', 'double', 'real']
    string_types = ['varchar', 'text', 'char', 'character']
    
    source_type = source_type.lower().split('(')[0]
    target_type = target_type.lower().split('(')[0]
    
    # Check if both are numeric
    source_numeric = any(source_type.startswith(t) for t in numeric_types)
    target_numeric = any(target_type.startswith(t) for t in numeric_types)
    
    if source_numeric and target_numeric:
        return True
    
    # Check if both are string types
    source_string = any(source_type.startswith(t) for t in string_types)
    target_string = any(target_type.startswith(t) for t in string_types)
    
    if source_string and target_string:
        return True
    
    return False

@app.route('/api/data/<table_name>')
def api_get_table_data(table_name):
    global migrator
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 50))
        offset = (page - 1) * page_size
        
        with migrator.mariadb_conn.cursor() as cursor:
            # Get total count
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
            total_count = cursor.fetchone()['count']
            
            # Get page data
            cursor.execute(f"SELECT * FROM {table_name} LIMIT %s OFFSET %s", (page_size, offset))
            rows = cursor.fetchall()
            
        return jsonify({
            'table': table_name,
            'rows': rows,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/manual-entry', methods=['POST'])
def api_set_manual_entry():
    global migrator
    try:
        data = request.get_json()
        table_name = data['table']
        row_id = data['row_id']
        column = data['column']
        value = data['value']
        
        if table_name not in migrator.manual_entries:
            migrator.manual_entries[table_name] = {}
        if row_id not in migrator.manual_entries[table_name]:
            migrator.manual_entries[table_name][row_id] = {}
            
        migrator.manual_entries[table_name][row_id][column] = value
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate-transformation', methods=['POST'])
def api_validate_transformation():
    global migrator
    try:
        data = request.get_json()
        trans_name = data['transformation']
        test_value = data['test_value']
        params = data.get('params', {})
        
        if trans_name not in migrator.transformations:
            return jsonify({'error': 'Unknown transformation'}), 400
            
        transformation = migrator.transformations[trans_name]
        result = transformation.apply(test_value, **params)
        
        return jsonify({
            'success': True,
            'original': test_value,
            'transformed': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/validate-mapping', methods=['POST'])
def api_validate_mapping():
    """Comprehensive validation of table mapping with verbose error reporting."""
    global migrator
    try:
        data = request.get_json()
        source_table = data['source_table']
        target_table = data['target_table']
        
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'detailed_analysis': {
                'source_info': {},
                'target_info': {},
                'mapping_analysis': {},
                'data_type_issues': [],
                'missing_mappings': [],
                'unmapped_required_columns': []
            }
        }
        
        try:
            # Get source table information
            source_columns = migrator.get_table_columns(source_table, 'mariadb')
            cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
            cursor.execute(f"SELECT COUNT(*) as row_count FROM `{source_table}`")
            source_row_count = cursor.fetchone()['row_count']
            cursor.execute(f"SELECT * FROM `{source_table}` LIMIT 3")
            source_sample = cursor.fetchall()
            cursor.close()
            
            validation_result['detailed_analysis']['source_info'] = {
                'table_name': source_table,
                'column_count': len(source_columns),
                'row_count': source_row_count,
                'columns': [{
                    'name': col['column_name'],
                    'type': col['data_type'],
                    'nullable': col['is_nullable'] == 'YES',
                    'default': col.get('column_default')
                } for col in source_columns],
                'sample_data': source_sample
            }
            
        except Exception as e:
            validation_result['errors'].append(f"Failed to analyze source table '{source_table}': {str(e)}")
            validation_result['valid'] = False
            
        try:
            # Get target table information
            target_columns = migrator.get_table_columns(target_table, 'postgresql')
            pg_cursor = migrator.pg_conn.cursor()
            pg_cursor.execute(f"SELECT COUNT(*) FROM {target_table}")
            target_row_count = pg_cursor.fetchone()[0]
            pg_cursor.close()
            
            validation_result['detailed_analysis']['target_info'] = {
                'table_name': target_table,
                'column_count': len(target_columns),
                'row_count': target_row_count,
                'columns': [{
                    'name': col['column_name'],
                    'type': col['data_type'],
                    'nullable': col['is_nullable'] == 'YES',
                    'default': col.get('column_default'),
                    'constraints': col.get('constraint_type', [])
                } for col in target_columns]
            }
            
        except Exception as e:
            validation_result['errors'].append(f"Failed to analyze target table '{target_table}': {str(e)}")
            validation_result['valid'] = False
            
        if not validation_result['valid']:
            return jsonify(validation_result)
            
        # Analyze current mappings
        current_mappings = {mapping.source_column: mapping 
                          for mapping in migrator.column_mappings 
                          if mapping.source_table == source_table and mapping.target_table == target_table}
        
        # Check for required target columns that have no mapping
        target_required_cols = [col for col in target_columns 
                              if col['is_nullable'] == 'NO' and col.get('column_default') is None]
        
        for req_col in target_required_cols:
            mapped = any(mapping.target_column == req_col['column_name'] 
                        for mapping in current_mappings.values())
            if not mapped:
                validation_result['detailed_analysis']['unmapped_required_columns'].append({
                    'column': req_col['column_name'],
                    'type': req_col['data_type'],
                    'message': f"Required column '{req_col['column_name']}' has no mapping and no default value"
                })
                validation_result['errors'].append(
                    f"Required target column '{req_col['column_name']}' ({req_col['data_type']}) has no source mapping"
                )
                validation_result['valid'] = False
        
        # Check data type compatibility for existing mappings
        for src_col, mapping in current_mappings.items():
            try:
                src_info = next((col for col in source_columns if col['column_name'] == src_col), None)
                tgt_info = next((col for col in target_columns if col['column_name'] == mapping.target_column), None)
                
                if src_info and tgt_info:
                    compatibility = migrator._check_data_type_compatibility(
                        src_info['data_type'], tgt_info['data_type']
                    )
                    
                    if not compatibility['compatible']:
                        validation_result['detailed_analysis']['data_type_issues'].append({
                            'source_column': src_col,
                            'source_type': src_info['data_type'],
                            'target_column': mapping.target_column,
                            'target_type': tgt_info['data_type'],
                            'issue': compatibility['reason'],
                            'suggested_transformation': compatibility.get('suggested_transformation')
                        })
                        validation_result['warnings'].append(
                            f"Type mismatch: {src_col} ({src_info['data_type']}) -> {mapping.target_column} ({tgt_info['data_type']}): {compatibility['reason']}"
                        )
                        
            except Exception as e:
                validation_result['warnings'].append(f"Could not validate mapping {src_col} -> {mapping.target_column}: {str(e)}")
        
        # Check for unmapped source columns
        unmapped_source = [col for col in source_columns if col['column_name'] not in current_mappings]
        if unmapped_source:
            validation_result['detailed_analysis']['missing_mappings'] = [
                {
                    'column': col['column_name'],
                    'type': col['data_type'],
                    'nullable': col['is_nullable'] == 'YES'
                } for col in unmapped_source
            ]
            validation_result['warnings'].append(f"{len(unmapped_source)} source columns are not mapped: {', '.join(col['column_name'] for col in unmapped_source)}")
        
        validation_result['detailed_analysis']['mapping_analysis'] = {
            'total_source_columns': len(source_columns),
            'mapped_columns': len(current_mappings),
            'unmapped_columns': len(unmapped_source),
            'required_target_columns': len(target_required_cols),
            'unmapped_required': len(validation_result['detailed_analysis']['unmapped_required_columns'])
        }
        
        return jsonify(validation_result)
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'errors': [f"Validation failed: {str(e)}"],
            'detailed_analysis': {}
        }), 500

@app.route('/api/database-relationships')
def api_get_database_relationships():
    """Get database relationships for crow's foot notation visualization."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        db_type = request.args.get('db_type', 'both')  # 'mariadb', 'postgresql', or 'both'
        relationships = migrator.get_database_relationships(db_type)
        
        return jsonify(relationships)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-legacy-table/<table_name>')
def api_analyze_legacy_table(table_name):
    """Analyze a legacy table structure and suggest complex migration strategy."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        if table_name not in migrator.source_schema:
            return jsonify({'error': f'Table {table_name} not found in source schema'}), 400
            
        sample_data = migrator.source_schema[table_name]['sample_data']
        analysis = migrator.legacy_planner.analyze_legacy_table_structure(table_name, sample_data)
        
        return jsonify(analysis)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-migration-templates')
def api_get_migration_templates():
    """Get available migration templates for complex normalizations."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        templates = migrator.legacy_planner.migration_templates
        return jsonify(templates)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/create-complex-migration-strategy', methods=['POST'])
def api_create_complex_migration_strategy():
    """Create a complex migration strategy for normalizing legacy data."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        data = request.get_json()
        source_table = data['source_table']
        template_name = data['template_name']
        column_mappings = data['column_mappings']
        
        strategy = migrator.legacy_planner.create_migration_strategy(
            source_table, template_name, column_mappings
        )
        
        # Store the strategy for later execution
        migrator.complex_migration_strategies[source_table] = strategy
        
        return jsonify({
            'success': True,
            'strategy': strategy
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/execute-complex-migration', methods=['POST'])
def api_execute_complex_migration():
    """Execute a complex migration strategy."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        data = request.get_json()
        source_table = data['source_table']
        
        if source_table not in migrator.complex_migration_strategies:
            return jsonify({'error': 'No migration strategy found for this table'}), 400
            
        strategy = migrator.complex_migration_strategies[source_table]
        
        # Execute the migration
        results = migrator._execute_complex_migration(strategy)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview-complex-migration/<table_name>')
def api_preview_complex_migration(table_name):
    """Preview how the complex migration would transform the data."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        if table_name not in migrator.complex_migration_strategies:
            return jsonify({'error': 'No migration strategy found for this table'}), 400
            
        strategy = migrator.complex_migration_strategies[table_name]
        
        # Get sample data and show how it would be transformed
        cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 5")
        sample_rows = cursor.fetchall()
        cursor.close()
        
        preview_data = {
            'source_sample': sample_rows,
            'transformation_preview': {},
            'sql_queries': strategy['sql_generation']
        }
        
        # Show how parent and child records would be created
        if sample_rows:
            preview_data['transformation_preview'] = {
                'parent_records': f"Would create parent records in {strategy.get('template_name', 'target').split('_')[0]}",
                'child_records': f"Would create child records in {strategy.get('template_name', 'target').split('_')[0]}_items"
            }
        
        return jsonify(preview_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-table-relationships/<table_name>')
def api_analyze_table_relationships(table_name):
    """Analyze source table for relationship patterns."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        analysis = migrator.analyze_table_relationships(table_name)
        target_patterns = migrator.get_normalized_target_patterns()
        
        return jsonify({
            'table': table_name,
            'analysis': analysis,
            'target_patterns': target_patterns
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/table-split-mapping', methods=['POST'])
def api_create_table_split_mapping():
    """Create mapping for splitting denormalized table into parent/child relationship."""
    global migrator
    try:
        data = request.get_json()
        
        source_table = data['source_table']
        parent_table = data['parent_table']
        child_table = data['child_table']
        split_config = data['split_config']
        
        migrator.create_table_split_mapping(source_table, parent_table, child_table, split_config)
        
        return jsonify({'success': True, 'message': f'Split mapping created for {source_table}'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/relationship-patterns')
def api_get_relationship_patterns():
    """Get available relationship patterns and current mappings."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        patterns = migrator.get_normalized_target_patterns()
        current_mappings = migrator.split_mappings
        
        return jsonify({
            'patterns': patterns,
            'current_mappings': current_mappings
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/migrate-with-relationships', methods=['POST'])
def api_migrate_with_relationships():
    """Execute migration with table relationship splitting."""
    global migrator
    try:
        data = request.get_json()
        source_table = data['source_table']
        
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        results = migrator.migrate_with_relationships(source_table)
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview-split-data/<table_name>')
def api_preview_split_data(table_name):
    """Preview how data would be split for parent/child relationships."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
            
        if table_name not in migrator.split_mappings:
            return jsonify({'error': 'No split mapping configured for this table'}), 400
            
        # Get sample data
        cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 3")
        sample_rows = cursor.fetchall()
        cursor.close()
        
        split_config = migrator.split_mappings[table_name]
        preview_data = []
        
        for row in sample_rows:
            # Extract parent data
            parent_data = {}
            for field in split_config['parent_fields']:
                if field in row:
                    parent_data[field] = row[field]
            
            # Extract child records
            child_records = migrator._extract_child_records(row, split_config, 'PARENT_ID_PLACEHOLDER')
            
            preview_data.append({
                'original_row': row,
                'parent_data': parent_data,
                'child_records': child_records
            })
        
        return jsonify({
            'table': table_name,
            'split_config': split_config,
            'preview_data': preview_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/normalization/patterns')
def get_normalization_patterns():
    """Get available normalization patterns."""
    global migrator
    try:
        if not migrator:
            # Return empty patterns when not connected instead of error
            return jsonify({
                'success': True,
                'patterns': {},
                'message': 'Database not connected'
            })
        
        patterns = migrator.get_normalization_patterns()
        return jsonify({
            'success': True,
            'patterns': patterns
        })
    except Exception as e:
        logger.error(f"Error getting normalization patterns: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/normalization/analyze/<table_name>')
def analyze_table_normalization(table_name):
    """Analyze a table for normalization opportunities."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        analysis = migrator.analyze_table_for_normalization(table_name)
        return jsonify({
            'success': True,
            'analysis': analysis
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/normalization/strategy', methods=['POST'])
def create_normalization_strategy():
    """Create a normalization strategy for a table."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        pattern_name = data.get('pattern_name')
        
        if not source_table or not pattern_name:
            return jsonify({'error': 'Missing source_table or pattern_name'}), 400
        
        strategy = migrator.create_normalization_strategy(source_table, pattern_name)
        
        return jsonify({
            'success': True,
            'strategy': {
                'source_table': strategy.source_table,
                'target_tables': strategy.target_tables,
                'relationships': [
                    {
                        'parent': rel.parent_table,
                        'child': rel.child_table,
                        'foreign_key': rel.foreign_key,
                        'type': rel.relationship_type
                    } for rel in strategy.relationships
                ],
                'data_grouping': strategy.data_grouping
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/visualization/generate', methods=['POST'])
def generate_schema_visualization():
    """Generate ERD visualization for both source and target schemas."""
    try:
        data = request.get_json()
        source_config = data.get('source_config', {})
        target_config = data.get('target_config', {})
        format_type = data.get('format', 'png')
        
        # Create analyzer
        analyzer = SchemaAnalyzer()
        
        # Analyze source schema
        source_db_type = source_config.get('type', '').lower()
        source_connection_config = {k: v for k, v in source_config.items() if k != 'type'}
        if 'port' in source_connection_config:
            source_connection_config['port'] = int(source_connection_config['port'])
        
        if source_db_type in ['mysql', 'mariadb']:
            source_schema = analyzer.analyze_mysql_schema(source_connection_config)
        elif source_db_type == 'postgresql':
            source_schema = analyzer.analyze_postgresql_schema(source_connection_config)
        else:
            raise ValueError(f"Unsupported source database type: {source_db_type}")
        
        # Analyze target schema
        target_db_type = target_config.get('type', '').lower()
        target_connection_config = {k: v for k, v in target_config.items() if k != 'type'}
        if 'port' in target_connection_config:
            target_connection_config['port'] = int(target_connection_config['port'])
        
        if target_db_type in ['mysql', 'mariadb']:
            target_schema = analyzer.analyze_mysql_schema(target_connection_config)
        elif target_db_type == 'postgresql':
            target_schema = analyzer.analyze_postgresql_schema(target_connection_config)
        else:
            raise ValueError(f"Unsupported target database type: {target_db_type}")
        
        # Create ERD generator
        erd_generator = ERDGenerator()
        
        # Generate ERDs
        source_diagram_data = None
        target_diagram_data = None
        
        try:
            source_diagram_path = erd_generator.generate_erd(source_schema, f"source_schema.{format_type}")
            if source_diagram_path and os.path.exists(source_diagram_path):
                with open(source_diagram_path, 'rb') as f:
                    source_diagram_data = base64.b64encode(f.read()).decode('utf-8')
                os.remove(source_diagram_path)  # Clean up
        except Exception as e:
            logger.warning(f"Failed to generate source diagram: {e}")
        
        try:
            target_diagram_path = erd_generator.generate_erd(target_schema, f"target_schema.{format_type}")
            if target_diagram_path and os.path.exists(target_diagram_path):
                with open(target_diagram_path, 'rb') as f:
                    target_diagram_data = base64.b64encode(f.read()).decode('utf-8')
                os.remove(target_diagram_path)  # Clean up
        except Exception as e:
            logger.warning(f"Failed to generate target diagram: {e}")
        
        # Collect relationships for display
        relationships = []
        for rel in source_schema.relationships:
            relationships.append({
                'parent_table': rel.to_table,
                'parent_column': rel.to_column,
                'child_table': rel.from_table,
                'child_column': rel.from_column,
                'constraint_name': rel.constraint_name
            })
        
        return jsonify({
            'success': True,
            'source_tables': len(source_schema.tables),
            'target_tables': len(target_schema.tables),
            'source_diagram': source_diagram_data,
            'target_diagram': target_diagram_data,
            'relationships': relationships
        })
    except Exception as e:
        logger.error(f"Error generating schema visualization: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/analysis/source', methods=['POST'])
def analyze_source_schema():
    """Analyze and return source database schema information."""
    try:
        data = request.get_json()
        config = data.get('config', {})
        
        # Create analyzer
        analyzer = SchemaAnalyzer()
        
        # Determine database type and use appropriate method
        db_type = config.get('type', '').lower()
        
        # Create clean connection config (remove 'type' field and convert port to int)
        connection_config = {k: v for k, v in config.items() if k != 'type'}
        if 'port' in connection_config:
            connection_config['port'] = int(connection_config['port'])
        
        if db_type in ['mysql', 'mariadb']:
            schema = analyzer.analyze_mysql_schema(connection_config)
        elif db_type == 'postgresql':
            schema = analyzer.analyze_postgresql_schema(connection_config)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        # Convert schema to JSON-serializable format
        tables_list = []
        for table in schema.tables.values():
            columns_list = []
            for col in table.columns.values():
                columns_list.append({
                    'name': col.name,
                    'data_type': col.data_type,
                    'is_nullable': col.is_nullable,
                    'is_primary_key': col.is_primary_key,
                    'default_value': col.default_value,
                    'max_length': col.max_length
                })
            
            foreign_keys_list = []
            for fk in table.foreign_keys:
                foreign_keys_list.append({
                    'constraint_name': fk.constraint_name,
                    'column_name': fk.from_column,
                    'referenced_table': fk.to_table,
                    'referenced_column': fk.to_column
                })
            
            tables_list.append({
                'name': table.name,
                'schema': table.schema,
                'columns': columns_list,
                'primary_key': ', '.join(table.primary_keys) if table.primary_keys else None,
                'foreign_keys': foreign_keys_list
            })
        
        relationships_list = []
        for rel in schema.relationships:
            relationships_list.append({
                'from_table': rel.from_table,
                'from_column': rel.from_column,
                'to_table': rel.to_table,
                'to_column': rel.to_column,
                'constraint_name': rel.constraint_name,
                'cardinality': rel.cardinality
            })
        
        return jsonify({
            'success': True,
            'schema': {
                'database_name': schema.database_name,
                'tables': tables_list,
                'relationships': relationships_list
            }
        })
    except Exception as e:
        logger.error(f"Error analyzing source schema: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/analysis/target', methods=['POST'])
def analyze_target_schema():
    """Analyze and return target database schema information."""
    try:
        data = request.get_json()
        config = data.get('config', {})
        
        # Create analyzer
        analyzer = SchemaAnalyzer()
        
        # Determine database type and use appropriate method
        db_type = config.get('type', '').lower()
        
        # Create clean connection config (remove 'type' field and convert port to int)
        connection_config = {k: v for k, v in config.items() if k != 'type'}
        if 'port' in connection_config:
            connection_config['port'] = int(connection_config['port'])
        
        if db_type in ['mysql', 'mariadb']:
            schema = analyzer.analyze_mysql_schema(connection_config)
        elif db_type == 'postgresql':
            schema = analyzer.analyze_postgresql_schema(connection_config)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        # Convert schema to JSON-serializable format
        tables_list = []
        for table in schema.tables.values():
            columns_list = []
            for col in table.columns.values():
                columns_list.append({
                    'name': col.name,
                    'data_type': col.data_type,
                    'is_nullable': col.is_nullable,
                    'is_primary_key': col.is_primary_key,
                    'default_value': col.default_value,
                    'max_length': col.max_length
                })
            
            foreign_keys_list = []
            for fk in table.foreign_keys:
                foreign_keys_list.append({
                    'constraint_name': fk.constraint_name,
                    'column_name': fk.from_column,
                    'referenced_table': fk.to_table,
                    'referenced_column': fk.to_column
                })
            
            tables_list.append({
                'name': table.name,
                'schema': table.schema,
                'columns': columns_list,
                'primary_key': ', '.join(table.primary_keys) if table.primary_keys else None,
                'foreign_keys': foreign_keys_list
            })
        
        relationships_list = []
        for rel in schema.relationships:
            relationships_list.append({
                'from_table': rel.from_table,
                'from_column': rel.from_column,
                'to_table': rel.to_table,
                'to_column': rel.to_column,
                'constraint_name': rel.constraint_name,
                'cardinality': rel.cardinality
            })
        
        return jsonify({
            'success': True,
            'schema': {
                'database_name': schema.database_name,
                'tables': tables_list,
                'relationships': relationships_list
            }
        })
    except Exception as e:
        logger.error(f"Error analyzing target schema: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/export/json', methods=['POST'])
def export_schemas_to_json():
    """Export both source and target database schemas to JSON format."""
    try:
        data = request.get_json()
        source_config = data.get('source_config', {})
        target_config = data.get('target_config', {})
        
        # Create analyzer
        analyzer = SchemaAnalyzer()
        export_data = {
            'export_timestamp': datetime.now().isoformat(),
            'export_version': '1.0',
            'schemas': {}
        }
        
        # Analyze source database if config provided
        if source_config:
            source_db_type = source_config.get('type', '').lower()
            source_connection_config = {k: v for k, v in source_config.items() if k != 'type'}
            if 'port' in source_connection_config:
                source_connection_config['port'] = int(source_connection_config['port'])
            
            if source_db_type in ['mysql', 'mariadb']:
                source_schema = analyzer.analyze_mysql_schema(source_connection_config)
            elif source_db_type == 'postgresql':
                source_schema = analyzer.analyze_postgresql_schema(source_connection_config)
            else:
                raise ValueError(f"Unsupported source database type: {source_db_type}")
            
            # Convert source schema to detailed JSON
            export_data['schemas']['source'] = {
                'database_name': source_schema.database_name,
                'database_type': source_db_type,
                'connection_info': {
                    'host': source_config.get('host'),
                    'port': source_config.get('port'),
                    'database': source_config.get('database')
                },
                'tables': {},
                'relationships': []
            }
            
            for table_name, table in source_schema.tables.items():
                table_data = {
                    'name': table.name,
                    'schema': table.schema,
                    'columns': {},
                    'primary_keys': list(table.primary_keys) if table.primary_keys else [],
                    'foreign_keys': []
                }
                
                for col_name, col in table.columns.items():
                    table_data['columns'][col_name] = {
                        'name': col.name,
                        'data_type': col.data_type,
                        'is_nullable': col.is_nullable,
                        'is_primary_key': col.is_primary_key,
                        'default_value': col.default_value,
                        'max_length': col.max_length,
                        'precision': col.precision,
                        'scale': col.scale,
                        'foreign_key_reference': col.foreign_key_reference
                    }
                
                for fk in table.foreign_keys:
                    table_data['foreign_keys'].append({
                        'constraint_name': fk.constraint_name,
                        'column_name': fk.from_column,
                        'referenced_table': fk.to_table,
                        'referenced_column': fk.to_column,
                        'on_delete': fk.on_delete,
                        'on_update': fk.on_update
                    })
                
                export_data['schemas']['source']['tables'][table_name] = table_data
            
            for rel in source_schema.relationships:
                export_data['schemas']['source']['relationships'].append({
                    'from_table': rel.from_table,
                    'from_column': rel.from_column,
                    'to_table': rel.to_table,
                    'to_column': rel.to_column,
                    'constraint_name': rel.constraint_name,
                    'cardinality': rel.cardinality,
                    'on_delete': rel.on_delete,
                    'on_update': rel.on_update
                })
        
        # Analyze target database if config provided
        if target_config:
            target_db_type = target_config.get('type', '').lower()
            target_connection_config = {k: v for k, v in target_config.items() if k != 'type'}
            if 'port' in target_connection_config:
                target_connection_config['port'] = int(target_connection_config['port'])
            
            if target_db_type in ['mysql', 'mariadb']:
                target_schema = analyzer.analyze_mysql_schema(target_connection_config)
            elif target_db_type == 'postgresql':
                target_schema = analyzer.analyze_postgresql_schema(target_connection_config)
            else:
                raise ValueError(f"Unsupported target database type: {target_db_type}")
            
            # Convert target schema to detailed JSON
            export_data['schemas']['target'] = {
                'database_name': target_schema.database_name,
                'database_type': target_db_type,
                'connection_info': {
                    'host': target_config.get('host'),
                    'port': target_config.get('port'),
                    'database': target_config.get('database')
                },
                'tables': {},
                'relationships': []
            }
            
            for table_name, table in target_schema.tables.items():
                table_data = {
                    'name': table.name,
                    'schema': table.schema,
                    'columns': {},
                    'primary_keys': list(table.primary_keys) if table.primary_keys else [],
                    'foreign_keys': []
                }
                
                for col_name, col in table.columns.items():
                    table_data['columns'][col_name] = {
                        'name': col.name,
                        'data_type': col.data_type,
                        'is_nullable': col.is_nullable,
                        'is_primary_key': col.is_primary_key,
                        'default_value': col.default_value,
                        'max_length': col.max_length,
                        'precision': col.precision,
                        'scale': col.scale,
                        'foreign_key_reference': col.foreign_key_reference
                    }
                
                for fk in table.foreign_keys:
                    table_data['foreign_keys'].append({
                        'constraint_name': fk.constraint_name,
                        'column_name': fk.from_column,
                        'referenced_table': fk.to_table,
                        'referenced_column': fk.to_column,
                        'on_delete': fk.on_delete,
                        'on_update': fk.on_update
                    })
                
                export_data['schemas']['target']['tables'][table_name] = table_data
            
            for rel in target_schema.relationships:
                export_data['schemas']['target']['relationships'].append({
                    'from_table': rel.from_table,
                    'from_column': rel.from_column,
                    'to_table': rel.to_table,
                    'to_column': rel.to_column,
                    'constraint_name': rel.constraint_name,
                    'cardinality': rel.cardinality,
                    'on_delete': rel.on_delete,
                    'on_update': rel.on_update
                })
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"database_schemas_export_{timestamp}.json"
        
        # Create response with JSON file download
        response = make_response(json.dumps(export_data, indent=2, default=str))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        
        return response
        
    except Exception as e:
        logger.error(f"Error exporting schemas to JSON: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/comparison')
def compare_schemas():
    """Compare source and target schemas and provide migration guidance."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        # Initialize schema analyzer
        migrator.initialize_schema_analyzer()
        
        # Analyze both schemas
        source_schema = migrator.analyze_source_schema()
        target_schema = migrator.analyze_target_schema()
        
        # Generate migration guidance
        guidance = migrator.generate_migration_guidance(source_schema, target_schema)
        
        return jsonify({
            'success': True,
            'guidance': guidance
        })
    except Exception as e:
        logger.error(f"Error comparing schemas: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/schema/relationships/table/<table_name>')
def get_table_relationships(table_name):
    """Get relationships for a specific table in both schemas."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        # Initialize schema analyzer
        migrator.initialize_schema_analyzer()
        
        # Analyze both schemas
        source_schema = migrator.analyze_source_schema()
        target_schema = migrator.analyze_target_schema()
        
        # Get relationships for the table
        source_relationships = source_schema.get_table_relationships(table_name)
        target_relationships = target_schema.get_table_relationships(table_name)
        
        result = {
            'table_name': table_name,
            'source_relationships': [
                {
                    'from_table': rel.from_table,
                    'from_column': rel.from_column,
                    'to_table': rel.to_table,
                    'to_column': rel.to_column,
                    'cardinality': rel.cardinality,
                    'constraint_name': rel.constraint_name
                } for rel in source_relationships
            ],
            'target_relationships': [
                {
                    'from_table': rel.from_table,
                    'from_column': rel.from_column,
                    'to_table': rel.to_table,
                    'to_column': rel.to_column,
                    'cardinality': rel.cardinality,
                    'constraint_name': rel.constraint_name
                } for rel in target_relationships
            ]
        }
        
        return jsonify({
            'success': True,
            'relationships': result
        })
    except Exception as e:
        logger.error(f"Error getting table relationships: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/normalization/preview/<table_name>')
def preview_normalization(table_name):
    """Preview how normalization would affect the data."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        limit = request.args.get('limit', 10, type=int)
        preview = migrator.preview_normalization(table_name, limit)
        
        return jsonify({
            'success': True,
            'preview': preview
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/normalization/execute', methods=['POST'])
def execute_normalization():
    """Execute the normalization migration."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        batch_size = data.get('batch_size', 1000)
        
        if not source_table:
            return jsonify({'error': 'Missing source_table'}), 400
        
        result = migrator.execute_normalized_migration(source_table, batch_size)
        
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/column-concatenation', methods=['POST'])
def api_column_concatenation():
    """Create column concatenation mapping."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        target_table = data.get('target_table')
        target_column = data.get('target_column')
        source_columns = data.get('source_columns', [])
        separator = data.get('separator', ' ')
        template = data.get('template')
        
        if not all([source_table, target_table, target_column, source_columns]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create the concatenation mapping
        mapping_key = f"{source_table}.concat_to_{target_column}"
        
        column_mapping = ColumnMapping(
            source_table=source_table,
            source_column='+'.join(source_columns),  # Special notation for concat
            target_table=target_table,
            target_column=target_column
        )
        
        # Set transformation properties after creation
        column_mapping.transformation = 'advanced_concat'
        column_mapping.transformation_params = {
            'source_columns': source_columns,
            'separator': separator,
            'template': template
        }
        
        migrator.column_mappings[mapping_key] = column_mapping
        
        return jsonify({
            'success': True,
            'mapping_key': mapping_key,
            'message': f'Concatenation mapping created for {target_column}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes-relationship', methods=['POST'])
def api_notes_relationship():
    """Create notes table relationship mapping."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        source_column = data.get('source_column')
        target_table = data.get('target_table')
        target_column = data.get('target_column', 'notes_id')
        reference_type = data.get('reference_type')
        reference_id_column = data.get('reference_id_column', 'id')
        created_by = data.get('created_by', 'migration_script')
        
        if not all([source_table, source_column, target_table, reference_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create the notes relationship mapping
        mapping_key = f"{source_table}.{source_column}_to_notes"
        
        column_mapping = ColumnMapping(
            source_table=source_table,
            source_column=source_column,
            target_table=target_table,
            target_column=target_column
        )
        
        # Set transformation properties after creation
        column_mapping.transformation = 'notes_relationship'
        column_mapping.transformation_params = {
            'reference_type': reference_type,
            'reference_id_column': reference_id_column,
            'created_by': created_by
        }
        
        migrator.column_mappings[mapping_key] = column_mapping
        
        return jsonify({
            'success': True,
            'mapping_key': mapping_key,
            'message': f'Notes relationship mapping created for {source_column}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview-concatenation', methods=['POST'])
def api_preview_concatenation():
    """Preview column concatenation results."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        source_columns = data.get('source_columns', [])
        separator = data.get('separator', ' ')
        template = data.get('template')
        limit = data.get('limit', 10)
        
        if not source_table or not source_columns:
            return jsonify({'error': 'Missing source_table or source_columns'}), 400
        
        # Get sample data
        cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
        column_list = ', '.join([f'`{col}`' for col in source_columns])
        cursor.execute(f"SELECT {column_list} FROM `{source_table}` LIMIT %s", (limit,))
        rows = cursor.fetchall()
        cursor.close()
        
        # Apply concatenation preview
        preview_results = []
        for row in rows:
            column_mappings = {col: row.get(col) for col in source_columns}
            result = migrator._apply_advanced_concatenation(
                None, column_mappings, template, separator
            )
            preview_results.append({
                'source_data': column_mappings,
                'concatenated_result': result
            })
        
        return jsonify({
            'success': True,
            'preview': preview_results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/preview-notes-relationship', methods=['POST'])
def api_preview_notes_relationship():
    """Preview notes relationship conversion."""
    global migrator
    try:
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        data = request.get_json()
        source_table = data.get('source_table')
        source_column = data.get('source_column')
        reference_type = data.get('reference_type')
        limit = data.get('limit', 10)
        
        if not all([source_table, source_column, reference_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get sample data
        cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"SELECT `{source_column}`, id FROM `{source_table}` WHERE `{source_column}` IS NOT NULL AND `{source_column}` != '' LIMIT %s", (limit,))
        rows = cursor.fetchall()
        cursor.close()
        
        # Create preview (don't actually insert)
        preview_results = []
        for row in rows:
            text_content = row.get(source_column)
            reference_id = row.get('id')
            
            preview_results.append({
                'original_text': text_content,
                'reference_type': reference_type,
                'reference_id': reference_id,
                'notes_entry': {
                    'text': text_content,
                    'reference_type': reference_type,
                    'reference_id': reference_id
                }
            })
        
        return jsonify({
            'success': True,
            'preview': preview_results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/migrate', methods=['POST'])
def api_migrate():
    global migrator
    try:
        data = request.get_json()
        
        if not data.get('mappings'):
            return jsonify({'error': 'No column mappings provided'}), 400
        
        if not migrator:
            return jsonify({'error': 'Not connected to databases'}), 400
        
        # Get the first mapping to determine source and target tables
        first_mapping = next(iter(data['mappings'].values()))
        source_table = first_mapping['sourceTable']
        target_table = first_mapping['targetTable']
        
        # Build column mappings from the provided data
        column_mappings = {}
        for mapping_id, mapping in data['mappings'].items():
            if mapping.get('sourceColumn') and mapping.get('targetColumn'):
                column_mappings[mapping['sourceColumn']] = mapping['targetColumn']
        
        logger.info(f"Starting migration from {source_table} to {target_table} with {len(column_mappings)} column mappings")
        
        # Execute actual data migration
        try:
            # Connect to databases if not already connected
            if not migrator.mariadb_conn:
                migrator.connect_source()
            if not migrator.pg_conn:
                migrator.connect_target()
            
            # Get source data
            source_cursor = migrator.mariadb_conn.cursor(pymysql.cursors.DictCursor)
            source_cursor.execute(f"SELECT * FROM `{source_table}`")
            source_rows = source_cursor.fetchall()
            source_cursor.close()
            
            logger.info(f"Found {len(source_rows)} rows in source table {source_table}")
            
            if not source_rows:
                return jsonify({
                    'success': True,
                    'rows_migrated': 0,
                    'message': f'No data found in source table {source_table}'
                })
            
            # Prepare target cursor
            target_cursor = migrator.pg_conn.cursor()
            rows_migrated = 0
            errors = []
            
            # Migrate each row
            for row in source_rows:
                try:
                    # Map source columns to target columns
                    target_data = {}
                    for source_col, target_col in column_mappings.items():
                        if source_col in row:
                            target_data[target_col] = row[source_col]
                    
                    if target_data:
                        # Prepare insert statement
                        columns = list(target_data.keys())
                        values = list(target_data.values())
                        placeholders = ', '.join(['%s'] * len(values))
                        
                        insert_query = f"""
                        INSERT INTO {target_table} ({', '.join(columns)})
                        VALUES ({placeholders})
                        ON CONFLICT DO NOTHING
                        """
                        
                        target_cursor.execute(insert_query, values)
                        rows_migrated += 1
                        
                except Exception as row_error:
                    errors.append(f"Error migrating row: {str(row_error)}")
                    logger.error(f"Error migrating row: {row_error}")
                    continue
            
            # Commit the transaction
            migrator.pg_conn.commit()
            target_cursor.close()
            
            logger.info(f"Migration completed: {rows_migrated} rows migrated")
            
            result = {
                'success': True,
                'rows_migrated': rows_migrated,
                'message': f'Migration from {source_table} to {target_table} completed successfully',
                'errors': errors[:5] if errors else []  # Limit error list
            }
            
            return jsonify(result)
            
        except Exception as migration_error:
            migrator.pg_conn.rollback()
            logger.error(f"Migration failed: {migration_error}")
            return jsonify({
                'success': False,
                'error': f'Migration failed: {str(migration_error)}',
                'rows_migrated': 0
            }), 500
        
    except Exception as e:
        logger.error(f"API migrate error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'rows_migrated': 0
        }), 500

if __name__ == '__main__':
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Enhanced Database Migration Tool')
    parser.add_argument('mode', choices=['web', 'cli', 'schema'], nargs='?', default='cli',
                       help='Mode to run: web (Flask interface), cli (command line), schema (generate ERDs)')
    parser.add_argument('--source-host', help='Source database host')
    parser.add_argument('--source-user', help='Source database user')
    parser.add_argument('--source-password', help='Source database password')
    parser.add_argument('--source-database', help='Source database name')
    parser.add_argument('--source-port', type=int, default=3306, help='Source database port (default: 3306)')
    parser.add_argument('--target-host', help='Target database host')
    parser.add_argument('--target-user', help='Target database user')
    parser.add_argument('--target-password', help='Target database password')
    parser.add_argument('--target-database', help='Target database name')
    parser.add_argument('--target-port', type=int, default=5432, help='Target database port (default: 5432)')
    parser.add_argument('--output-dir', default='schema_diagrams', help='Output directory for ERD diagrams')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Configure logging
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
    else:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    if args.mode == 'web':
        app.run(debug=True, host='0.0.0.0', port=5004)
    elif args.mode == 'schema':
        # Schema visualization mode
        if not all([args.source_host, args.source_user, args.source_password, args.source_database,
                   args.target_host, args.target_user, args.target_password, args.target_database]):
            print("Error: Schema mode requires all database connection parameters")
            print("Use --help for more information")
            sys.exit(1)
        
        # Set up database configurations
        mariadb_config = {
            'host': args.source_host,
            'port': args.source_port,
            'user': args.source_user,
            'password': args.source_password,
            'database': args.source_database
        }
        
        pg_config = {
            'host': args.target_host,
            'port': args.target_port,
            'user': args.target_user,
            'password': args.target_password,
            'database': args.target_database
        }
        
        # Create migrator and generate schema visualizations
        migrator = EnhancedMigrator(mariadb_config, pg_config)
        
        print("Analyzing database schemas and generating ERD diagrams...")
        print(f"Output directory: {args.output_dir}")
        
        try:
            # Initialize schema analyzer
            migrator.initialize_schema_analyzer()
            
            # Generate schema comparison ERDs
            results = migrator.generate_schema_comparison_erd(args.output_dir)
            
            print("\n=== Schema Visualization Results ===")
            
            if 'source_matplotlib' in results:
                print(f"✅ Source schema ERD (matplotlib): {results['source_matplotlib']}")
            if 'source_graphviz' in results:
                print(f"✅ Source schema ERD (graphviz): {results['source_graphviz']}")
            if 'target_matplotlib' in results:
                print(f"✅ Target schema ERD (matplotlib): {results['target_matplotlib']}")
            if 'target_graphviz' in results:
                print(f"✅ Target schema ERD (graphviz): {results['target_graphviz']}")
            if 'guidance_file' in results:
                print(f"✅ Migration guidance: {results['guidance_file']}")
            
            # Print schema summaries
            if 'source_schema' in results:
                migrator.print_schema_summary(results['source_schema'])
            
            if 'target_schema' in results:
                migrator.print_schema_summary(results['target_schema'])
            
            # Print migration guidance summary
            if 'migration_guidance' in results:
                guidance = results['migration_guidance']
                print(f"\n=== Migration Guidance Summary ===")
                print(f"Source tables: {guidance['summary']['source_tables']}")
                print(f"Target tables: {guidance['summary']['target_tables']}")
                print(f"Direct table matches: {len(guidance['table_mapping_suggestions']['direct_matches'])}")
                print(f"Potential issues: {len(guidance['potential_issues'])}")
                
                if guidance['potential_issues']:
                    print("\nPotential Migration Issues:")
                    for issue in guidance['potential_issues']:
                        print(f"  - {issue['type']}: {issue['message']}")
            
            # Report any errors
            if 'source_error' in results:
                print(f"❌ Source schema error: {results['source_error']}")
            if 'target_error' in results:
                print(f"❌ Target schema error: {results['target_error']}")
            
            print(f"\nDiagrams and guidance saved to: {args.output_dir}")
            
        except Exception as e:
            print(f"Error generating schema visualization: {e}")
            if args.verbose:
                import traceback
                traceback.print_exc()
            sys.exit(1)
    
    else:
        # Command line interface
        print("Enhanced Migration Tool")
        print("Modes:")
        print("  web    - Start Flask web interface")
        print("  schema - Generate ERD diagrams and migration guidance")
        print("  cli    - Command line interface (default)")
        print("\nFor schema mode, use --help to see required parameters")
        print("Example:")
        print("  python enhanced_migration.py schema \\")
        print("    --source-host localhost --source-user root --source-password pass --source-database source_db \\")
        print("    --target-host localhost --target-user postgres --target-password pass --target-database target_db")


''' To Do 
Validate mapping needs to be implemented,

And errors should be more verbose - not just error mapping row - we should see datatypes and anything missing. 

Make sure non-specified values to be none. 

The new schema visualization features provide:
1. Database schema analysis for both MySQL/MariaDB and PostgreSQL
2. ERD generation with crow's foot notation using matplotlib and/or graphviz
3. Relationship mapping and foreign key visualization
4. Migration guidance based on schema comparison
5. Web API endpoints for integration with the existing UI
6. Command-line interface for batch processing

'''