Inventory Management Guide
==========================

This comprehensive guide covers everything you need to know about managing inventory items in the University Inventory Management System.

Overview of Inventory Management
--------------------------------

The inventory system allows you to:

- Track all university assets and supplies
- Monitor stock levels and movements
- Organize items by categories
- Generate reports and analytics
- Maintain audit trails for accountability

Navigation and Interface
------------------------

Accessing Inventory
~~~~~~~~~~~~~~~~~~~

1. Click "Inventory" in the left sidebar
2. The main inventory view displays all items you have access to
3. Use the toolbar for quick actions and filtering

**Main Interface Elements:**

- **Search Bar**: Find items by name, SKU, or description
- **Filter Panel**: Narrow results by category, stock level, or other criteria
- **Add Item Button**: Create new inventory entries (Manager/Admin only)
- **Export Options**: Download inventory data
- **Bulk Actions**: Perform operations on multiple items

Understanding the Item List
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Each item in the list shows:

.. code-block:: text

   Item Name                    SKU              Category        Stock    Value
   Dell Laptop XPS 13          LAP-DEL-XPS13    IT Equipment    15/5     $19,497
   Epson Projector PL1781       PROJ-EP-1781     AV Equipment    3/2      $2,699
   Office Paper (Ream)          SUP-PAP-A4       Supplies        45/20    $225

**Column Explanations:**

- **Item Name**: Descriptive name of the item
- **SKU**: Unique Stock Keeping Unit identifier
- **Category**: Organizational grouping
- **Stock**: Current/Minimum levels
- **Value**: Total value (current stock × unit price)

Adding New Items
----------------

Creating Your First Item
~~~~~~~~~~~~~~~~~~~~~~~~

**Step-by-Step Process:**

1. Click "Add Item" button
2. Fill out the item form with required information
3. Review details and click "Save"

**Required Fields:**

.. code-block:: text

   Item Name: Clear, descriptive name
   SKU: Unique identifier (auto-generated if left blank)
   Category: Select from existing categories
   Current Stock: Number of units currently available
   Minimum Stock: Threshold for low stock alerts
   Unit Price: Cost per individual item

**Optional Fields:**

.. code-block:: text

   Description: Detailed item description
   Location: Where item is stored
   Supplier: Vendor information
   Model Number: Manufacturer's model
   Serial Numbers: For tracked items

Best Practices for Item Creation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Naming Conventions:**

- Use consistent, descriptive names
- Include brand, model, and key specifications
- Avoid abbreviations that aren't widely understood

Good Examples:
- "Dell OptiPlex 7090 Desktop Computer"
- "Epson PowerLite 1781W Wireless Projector"
- "HP LaserJet Pro M404n Printer"

Poor Examples:
- "Computer"
- "Proj #3"
- "HP Thing"

**SKU Best Practices:**

SKUs should be:
- Unique across your entire inventory
- Meaningful to users
- Consistent in format
- Easy to type and remember

**SKU Format Examples:**

.. code-block:: text

   Pattern: [CATEGORY]-[BRAND]-[MODEL]-[VARIANT]
   
   Examples:
   DESK-DEL-OPT7090-i5        (Desktop, Dell, OptiPlex 7090, i5)
   PROJ-EPS-PL1781-WIFI       (Projector, Epson, PowerLite 1781, WiFi)
   PRIN-HP-LJ404-BW           (Printer, HP, LaserJet 404, Black/White)

Managing Stock Levels
---------------------

Understanding Stock Status
~~~~~~~~~~~~~~~~~~~~~~~~~~

Items have different stock status indicators:

**Status Colors:**
- **Green**: Adequate stock (above minimum)
- **Yellow**: Getting low (within 20% of minimum)
- **Red**: Low stock (at or below minimum)
- **Gray**: Out of stock (zero quantity)

Updating Stock Quantities
~~~~~~~~~~~~~~~~~~~~~~~~~

**Stock In (Receiving Items):**

1. Find the item in inventory list
2. Click "Stock" button or stock quantity
3. Select "Stock In"
4. Enter quantity received
5. Provide reason (e.g., "New shipment from vendor")
6. Click "Update Stock"

**Stock Out (Issuing Items):**

1. Locate item to be issued
2. Click "Stock" button
3. Select "Stock Out"
4. Enter quantity being issued
5. Provide reason (e.g., "Deployed to Smith Hall Lab")
6. Confirm the update

**Stock Adjustment:**

Use when correcting discrepancies or conducting physical counts:

1. Select "Adjustment" in stock dialog
2. Enter the correct total quantity
3. System calculates the adjustment automatically
4. Provide reason for adjustment
5. Save the change

**Example Stock Movements:**

.. code-block:: text

   Stock In Examples:
   - "Received 10 units from Dell shipment #12345"
   - "Found 2 additional units in storage room B"
   - "Returned 1 unit from repair service"
   
   Stock Out Examples:
   - "Deployed 3 laptops to Computer Science Lab"
   - "Loaned 1 projector to Professor Johnson"
   - "Sent 2 units for repair/maintenance"
   
   Adjustment Examples:
   - "Physical count correction"
   - "Reconciliation after audit"
   - "Database correction"

Editing Item Information
------------------------

Modifying Item Details
~~~~~~~~~~~~~~~~~~~~~~

**Who Can Edit:**
- Managers and Admins can edit all item fields
- Users can view but not modify items

**Editing Process:**

1. Click on item name or "Edit" button
2. Modify fields as needed
3. Add notes about changes made
4. Save changes

**Commonly Updated Fields:**

- **Price**: Update when costs change
- **Minimum Stock**: Adjust based on usage patterns
- **Description**: Add more details or specifications
- **Location**: Update when items are moved
- **Supplier**: Change vendor information

**Change Tracking:**

All edits are automatically tracked:
- Who made the change
- When the change was made
- What fields were modified
- Previous and new values

Searching and Filtering
-----------------------

Basic Search
~~~~~~~~~~~~

**Quick Search:**
- Type in the search box at the top
- Searches across item names, SKUs, and descriptions
- Results update as you type
- Case-insensitive matching

**Search Tips:**
- Use partial words: "proj" finds "projector"
- Include model numbers: "XPS13" finds Dell XPS 13 laptops
- Search by brand: "HP" shows all HP products

Advanced Filtering
~~~~~~~~~~~~~~~~~~

**Filter Options:**

1. **Category**: Show items from specific categories
2. **Stock Level**: 
   - Low stock items only
   - Out of stock items
   - Adequately stocked items
3. **Price Range**: Filter by unit price
4. **Date Added**: Recently added items
5. **Supplier**: Items from specific vendors

**Combining Filters:**

Create powerful searches by combining multiple filters:

.. code-block:: text

   Example: IT Equipment + Low Stock + Price > $500
   Result: Expensive IT items that need restocking

**Saved Searches:**

Save frequently used filter combinations:

1. Set up your filters
2. Click "Save Search"
3. Give it a descriptive name
4. Access from "Saved Searches" dropdown

Bulk Operations
---------------

Bulk Updates
~~~~~~~~~~~~

**Selecting Multiple Items:**

1. Use checkboxes to select items
2. "Select All" for entire page
3. "Select All Matching" for filtered results

**Bulk Actions Available:**

- **Category Change**: Move items to different category
- **Price Update**: Apply percentage increase/decrease
- **Minimum Stock**: Update thresholds for multiple items
- **Export**: Download selected items
- **Deactivate**: Mark items as inactive

**Example Bulk Operations:**

.. code-block:: text

   Scenario: Annual price increase
   1. Filter by supplier "Dell"
   2. Select all Dell items
   3. Apply 5% price increase
   4. Review and confirm changes

CSV Bulk Import
~~~~~~~~~~~~~~~

The system provides a comprehensive CSV bulk import feature for efficiently adding multiple inventory items at once.

**Accessing Bulk Import:**

1. Navigate to Inventory page
2. Click "Bulk Import" button in the top toolbar
3. The import dialog will open

**Step-by-Step Import Process:**

1. **Download CSV Template**
   - Click "Download Template" to get the properly formatted CSV file
   - Template includes example data and correct column headers

2. **Prepare Your Data**
   - Open template in Excel, LibreOffice, or any spreadsheet application
   - Fill in your inventory data following the format

3. **Upload CSV File**
   - Click "Select CSV File" in the import dialog
   - Choose your completed CSV file
   - System validates file format automatically

4. **Review Import Preview**
   - Preview shows up to 10 items from your file
   - Displays items in £ pricing format
   - Shows any validation errors that need fixing

5. **Complete Import**
   - Click "Import X Items" to process all valid items
   - System reports success/failure counts
   - Failed items with specific error messages

**CSV Template Format:**

.. code-block:: text

   Required Columns:
   name,sku,description,categoryName,price,currentStock,minimumStock

   Example Data:
   Example Laptop,SKU001,High-performance laptop,IT Equipment,999.99,10,5
   Office Chair,SKU002,Ergonomic office chair,Furniture,299.99,15,3

**Field Requirements:**

- **name**: Item name (required, descriptive)
- **sku**: Unique identifier (required, must be unique)
- **description**: Item details (optional, can be empty)
- **categoryName**: Exact category name (required, case-insensitive)
- **price**: Unit price in numbers (required, no currency symbols)
- **currentStock**: Current quantity (required, whole numbers)
- **minimumStock**: Low stock threshold (optional, defaults to 0)

**Validation Rules:**

The system validates each row for:
- Required fields are not empty
- Category names match existing categories
- Price and stock values are valid numbers
- SKU uniqueness across all items

**Error Handling:**

Common import errors and solutions:

.. code-block:: text

   Error: "Missing required columns"
   Solution: Ensure CSV has all required column headers

   Error: "Category 'XYZ' not found"  
   Solution: Use exact category names from Categories page

   Error: "Invalid price or stock values"
   Solution: Use numbers only, no currency symbols or text

   Error: "Row X: Missing required fields"
   Solution: Fill in all required columns for that row

**Best Practices:**

- **Prepare Categories First**: Create all needed categories before importing
- **Validate Data**: Check for typos in category names and numeric fields
- **Small Batches**: Test with 5-10 items first, then import larger batches
- **Backup Data**: Keep original spreadsheet as backup
- **Review Results**: Check import summary and fix any failed items

**Performance Notes:**

- Import processes items sequentially for data integrity
- Large imports (100+ items) may take several minutes
- System shows progress during import
- Page refresh is safe - import continues in background

**Post-Import Actions:**

After successful import:
- Items appear in inventory list immediately
- Dashboard statistics update automatically
- Stock movement records created for initial quantities
- All items marked as active and available

Categories and Organization
---------------------------

Understanding Categories
~~~~~~~~~~~~~~~~~~~~~~~~

Categories help organize your inventory into logical groups:

**Default Categories:**
- IT Equipment
- Office Supplies
- Laboratory Equipment
- Furniture
- Medical Supplies
- Audio/Visual Equipment

**Category Properties:**
- Name and description
- Color coding for visual identification
- Icon for quick recognition
- Access permissions

Working with Categories
~~~~~~~~~~~~~~~~~~~~~~~

**Viewing by Category:**

1. Use category filter in main inventory view
2. Click category cards on dashboard
3. Navigate to Categories section

**Creating New Categories** (Manager/Admin):

1. Go to Categories section
2. Click "Add Category"
3. Fill in details:
   - Name: Clear, descriptive title
   - Description: Purpose and contents
   - Icon: Choose from available icons
   - Color: Select distinct color

**Best Practices:**
- Keep categories broad enough to be useful
- Avoid too many subcategories
- Use consistent naming conventions
- Choose distinct colors for easy identification

Reports and Analytics
---------------------

Inventory Reports
~~~~~~~~~~~~~~~~~

**Available Report Types:**

1. **Inventory Summary**: Complete item listing
2. **Low Stock Report**: Items needing attention
3. **Category Analysis**: Distribution by category
4. **Value Report**: Financial overview
5. **Movement Report**: Recent activity

**Generating Reports:**

1. Go to Reports section
2. Select report type
3. Choose date range and filters
4. Generate report
5. Export as PDF or CSV

**Custom Reports:**

Create specialized reports:
- Filter by specific criteria
- Choose which columns to include
- Set automatic generation schedule
- Share with team members

Troubleshooting Common Issues
-----------------------------

Item Not Found
~~~~~~~~~~~~~~

**If you can't locate an item:**

1. Check search spelling
2. Try partial name search
3. Clear all filters
4. Search by SKU instead of name
5. Check if item is in different category
6. Verify item hasn't been marked inactive

Stock Discrepancies
~~~~~~~~~~~~~~~~~~~

**When stock numbers don't match physical count:**

1. Review recent stock movements
2. Check for pending transactions
3. Look for unreported movements
4. Perform physical count
5. Use stock adjustment to correct
6. Document the reason for discrepancy

Permission Issues
~~~~~~~~~~~~~~~~~

**If you can't perform an action:**

1. Check your user role
2. Verify item permissions
3. Try logging out and back in
4. Contact your system administrator
5. Request role upgrade if needed

Mobile Inventory Management
---------------------------

Mobile Features
~~~~~~~~~~~~~~~

**Available on Mobile:**
- View inventory items
- Quick stock updates
- Search and filtering
- Basic item details
- Stock movement history

**Mobile Best Practices:**
- Use landscape mode for forms
- Bookmark frequently accessed items
- Enable notifications for alerts
- Keep app updated

**Limitations:**
- No bulk operations
- Limited reporting features
- No item creation (security)
- Simplified interface

This comprehensive guide covers all aspects of inventory management. For additional help, refer to the troubleshooting section or contact your system administrator.