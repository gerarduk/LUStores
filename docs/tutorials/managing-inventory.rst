Tutorial: Managing Inventory
============================

This tutorial guides you through managing inventory items, including adding new items, updating stock levels, setting locations, and maintaining accurate inventory records.

.. note::
   **Who can access**: Managers and System Admins only. Basic users have read-only access to inventory.

.. contents:: Tutorial Steps
   :local:
   :depth: 2

---

What You'll Learn
-----------------

By the end of this tutorial, you'll be able to:

* Add new items with all required details
* Set up **location** and **unit** fields for tracking
* Configure prices and VAT rates correctly
* Update stock levels manually
* Understand stock movements and audit trails
* Set minimum stock thresholds for alerts
* Use bulk import/export for efficiency

---

Prerequisites
-------------

Before You Start
~~~~~~~~~~~~~~~~

**Required**:
   - Role: Manager or System Admin
   - Permissions: ``inventory.create``, ``inventory.edit``

**Recommended Knowledge**:
   - Understanding of VAT (Value Added Tax) rates
   - Your warehouse/storage layout
   - Standard units of measurement for your items

**Estimated Time**: 5 minutes per item

---

Step 1: Navigate to Inventory
------------------------------

Accessing Inventory Management
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Log into LUStores
2. Click **"Inventory"** in the left sidebar
3. You'll see the inventory management interface

**What You See**:
   - List of all existing items
   - **"Add Item"** button (top right)
   - Search and filter options
   - Current stock levels with color coding
   - Category badges

---

Step 2: Adding a New Item
--------------------------

Starting the Process
~~~~~~~~~~~~~~~~~~~~

1. Click **"Add Item"** button (top right)
2. The "New Item" form opens

**Filling Out Required Fields**

Step 2a: Basic Information
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Item Name** (Required):
   - Clear, descriptive name
   - Example: "Laboratory Microscope 40x-1000x"
   - Avoid abbreviations unless standard
   - Searchable, so be specific

**SKU (Stock Keeping Unit)** (Required):
   - Unique identifier for this item
   - Format: Your choice, but be consistent
   - Examples:
     * "LAB-MICRO-001" (prefix-category-number)
     * "CHEM-BEAKER-500ML"
     * "OFF-CHAIR-EXEC-001"
   - **Must be unique** across all items

.. tip::
   **SKU Best Practices**:

   - Use consistent format (CATEGORY-TYPE-NUMBER)
   - Include size/capacity if relevant
   - Keep it short but meaningful
   - Avoid special characters except hyphen/underscore

**Category** (Required):
   - Select from dropdown
   - Categories help organize inventory
   - Used for reporting and filtering
   - If category doesn't exist, contact admin to create it

**Example**:

.. code-block:: text

   Basic Information:
   ─────────────────
   Item Name: Laboratory Microscope 40x-1000x
   SKU: LAB-MICRO-001
   Category: Laboratory Equipment ▼

Step 2b: Storage and Measurement
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Location** (Recommended):
   - Physical storage location
   - Format: Room/Area, Shelf/Rack, Bin/Position
   - Examples:
     * "Lab Store, Shelf 3A, Bin 05"
     * "Chemistry Building, Room 204, Cabinet B"
     * "Warehouse A, Aisle 12, Shelf 4"

**Why Important**:
   - Helps staff find items quickly
   - **Shown on picking lists** when processing sales
   - Reduces time wasted searching
   - Improves stock-take accuracy

**Unit** (Recommended):
   - How quantities are measured
   - Select from dropdown or type custom

**Common Units**:
   - **Countable**: pieces, units, items, boxes, packages
   - **Weight**: kg, grams, pounds, ounces
   - **Length**: meters, feet, centimeters, inches
   - **Volume**: liters, gallons, milliliters
   - **Area**: square meters, square feet

**Why Important**:
   - Clarifies quantity meaning (2.5 meters vs 2.5 pieces)
   - Prevents errors
   - Allows fractional quantities for measured items

**Example**:

.. code-block:: text

   Storage & Measurement:
   ──────────────────────
   Location: Lab Store, Shelf 3A, Bin 05
   Unit: pieces ▼

   (For cable: meters, liquid: liters, etc.)

Step 2c: Pricing and VAT
~~~~~~~~~~~~~~~~~~~~~~~~~

**Price** (Required):
   - Sale price in GBP (£)
   - Can be different from purchase cost
   - Example: £495.00

**VAT Rate** (Required):
   - Default: 20% (standard UK VAT)
   - Other options:
     * 20% - Standard rate (most goods)
     * 5% - Reduced rate (energy-saving materials, children's car seats)
     * 0% - Zero-rated (books, newspapers, most food)

**VAT Included** (Important!):
   - **Yes**: Price INCLUDES VAT (price shown is final)
   - **No**: VAT ADDED to price (VAT calculated on top)

**Understanding VAT Included**:

.. code-block:: text

   Example 1: VAT Included = YES
   ─────────────────────────────
   Display Price: £120.00 (what customer pays)
   VAT Rate: 20%

   Calculation:
   - Net Price: £120.00 ÷ 1.20 = £100.00
   - VAT Amount: £100.00 × 0.20 = £20.00
   - Total: £120.00 ✓

   Example 2: VAT Included = NO
   ────────────────────────────
   Display Price: £100.00 (base price)
   VAT Rate: 20%

   Calculation:
   - Net Price: £100.00
   - VAT Amount: £100.00 × 0.20 = £20.00
   - Total: £100.00 + £20.00 = £120.00

.. important::
   **Get This Right!** VAT Included setting affects price calculations. If unsure, ask your finance department.

**Example**:

.. code-block:: text

   Pricing & VAT:
   ─────────────
   Price: £495.00
   VAT Rate: 20% ▼
   VAT Included: ☑ Yes

   (Customer pays £495.00 total, including £82.50 VAT)

Step 2d: Stock Information
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Current Stock**:
   - Starting quantity (can be 0)
   - Can use decimals (e.g., 2.5 meters)
   - Will be updated when orders received or sales made

**Minimum Stock** (Recommended):
   - Low-stock alert threshold
   - Example: If you want alert when below 5 units, set to 5
   - System shows yellow warning when stock below this
   - Red warning when stock hits 0

**Example**:

.. code-block:: text

   Stock Information:
   ─────────────────
   Current Stock: 10 pieces
   Minimum Stock: 5 pieces

   (Alert shown when stock drops below 5)

Step 2e: Additional Details (Optional)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Description**:
   - Detailed item description
   - Technical specifications
   - Manufacturer information
   - Notes for users

**Notes**:
   - Internal notes
   - Special handling instructions
   - Storage conditions
   - Safety information

**Example**:

.. code-block:: text

   Description:
   High-quality laboratory microscope with
   40x-1000x magnification. Includes LED
   illumination and mechanical stage.

   Notes:
   - Store in dry environment
   - Handle with care - fragile optics
   - Annual calibration required

Step 2f: Submit the Item
~~~~~~~~~~~~~~~~~~~~~~~~~

1. Review all fields
2. Click **"Create Item"** button
3. Item saved to database
4. Confirmation message appears

.. success::
   **Item Created!** Laboratory Microscope has been added to inventory.

---

Step 3: Editing Existing Items
-------------------------------

Updating Item Details
~~~~~~~~~~~~~~~~~~~~~

1. Find item in inventory list (search or scroll)
2. Click **"Edit"** button next to item
3. Edit form opens with current values
4. Modify fields as needed
5. Click **"Save Changes"**

**What You Can Edit**:
   - Name, description, notes
   - Price, VAT rate, VAT included setting
   - Location (move to new storage area)
   - Unit (if measurement system changes)
   - Minimum stock threshold
   - **Cannot change**: SKU (unique identifier)

**Example Edit**:

.. code-block:: text

   Updating: Laboratory Microscope

   Changes:
   - Location: Lab Store, Shelf 3A → Lab Store, Shelf 5B
   - Price: £495.00 → £525.00 (price increase)
   - Minimum Stock: 5 → 3 (threshold adjustment)

   [Cancel]  [Save Changes]

.. note::
   **Price Changes**: When you update price, existing quotes/sales are NOT affected. They use price snapshot from time of creation.

---

Step 4: Managing Stock Levels
------------------------------

When to Update Stock Manually
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Stock updates automatically for:
   - ✓ Purchase orders received (stock increases)
   - ✓ Sales processed (stock decreases)
   - ✓ Refunds (stock returns)

Manual updates needed for:
   - Physical inventory corrections (stock take results)
   - Damaged/lost items (write-offs)
   - Found items (stock discoveries)
   - Transfers between locations

Manual Stock Adjustment
~~~~~~~~~~~~~~~~~~~~~~~

1. Find item in inventory list
2. Click **"Adjust Stock"** button
3. Stock adjustment form opens

**Fill in Details**:

**New Stock Level**:
   - Enter the correct current stock
   - System calculates difference automatically
   - Can increase or decrease

**Reason** (Required):
   - Explain why adjustment is needed
   - Examples:
     * "Physical count found 8 units, not 10 (2 missing)"
     * "1 unit damaged in storage, written off"
     * "Found 3 units in secondary storage"
   - Detailed reasons help with audits

**Type** (Auto-selected):
   - 'adjustment' - Manual correction

**Example**:

.. code-block:: text

   Stock Adjustment: Laboratory Microscope

   Current Stock: 10 pieces
   New Stock Level: [8] ← Enter new amount

   Difference: -2 pieces

   Reason (Required):
   Physical inventory count found 2 units missing.
   Likely damaged during last semester's practicals.

   [Cancel]  [Confirm Adjustment]

**What Happens**:

1. **Stock Updated**:
   - currentStock: 10 → 8

2. **Stock Movement Created** (Audit Trail):
   - Type: 'adjustment'
   - Previous: 10
   - New: 8
   - Quantity: -2
   - Reason: Your detailed explanation
   - Performed by: Your user ID
   - Timestamp: Current date/time

.. success::
   **Stock Adjusted!** Laboratory Microscope stock updated from 10 to 8 pieces.

Understanding Stock Movements
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Every stock change creates a **stock movement record** for audit compliance:

**What's Recorded**:
   - **Who**: User ID who made the change
   - **When**: Exact timestamp
   - **What**: Item ID, previous stock, new stock
   - **Why**: Detailed reason
   - **Type**: 'in', 'out', or 'adjustment'

**Example Audit Trail**:

.. code-block:: text

   Item: Laboratory Microscope (SKU: LAB-MICRO-001)

   Stock Movement History:
   ───────────────────────────────────────────────────────
   2025-01-15 10:30  | IN         | 0 → 10   | +10
   Reason: Received Order #O202501151230
   By: admin@university.ac.uk

   2025-01-20 14:45  | OUT        | 10 → 8   | -2
   Reason: Sale #S202501201445
   By: user@university.ac.uk

   2025-01-25 09:00  | ADJUSTMENT | 8 → 7    | -1
   Reason: Physical count - 1 unit damaged
   By: manager@university.ac.uk

   2025-01-28 16:20  | OUT        | 7 → 5    | -2
   Reason: Sale #S202501281620
   By: user@university.ac.uk

   Current Stock: 5 pieces

**Viewing Audit Trail**:

1. Click on item name or "View Details"
2. Scroll to "Stock Movement History" section
3. See complete chronological history

.. tip::
   **Compliance**: This audit trail is essential for financial audits, regulatory compliance, and investigating discrepancies.

---

Step 5: Low Stock Alerts
-------------------------

Understanding Stock Status
~~~~~~~~~~~~~~~~~~~~~~~~~~

Items are color-coded based on stock levels:

**🟢 In Stock (Green)**:
   - Stock > Minimum Stock threshold
   - OR Stock > 5 (if minimum not set)
   - Sufficient availability

**🟡 Low Stock (Yellow)**:
   - Stock ≤ Minimum Stock threshold
   - OR Stock between 1-5 (if minimum not set)
   - **Action needed**: Create purchase order soon

**🔴 Out of Stock (Red)**:
   - Stock = 0
   - **Urgent**: Cannot sell, create purchase order immediately

Setting Up Low-Stock Alerts
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When creating or editing an item:

1. Set **Minimum Stock** field to desired threshold
2. Example: Set to 5 if you want alert when stock drops to 5 or below
3. System automatically shows yellow warning when threshold reached

**Example**:

.. code-block:: text

   Item: Safety Goggles
   Current Stock: 6 pieces
   Minimum Stock: 5 pieces

   Status: 🟢 In Stock

   (When stock drops to 5, status becomes 🟡 Low Stock)

Monitoring Low-Stock Items
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**In Inventory List**:
   - Yellow/red status badges immediately visible
   - Sort by stock level to see low items first
   - Filter by "Low Stock" or "Out of Stock"

**Dashboard**:
   - Quick count of low-stock items
   - Alerts for items needing reorder

**Best Practice**:
   - Check low-stock weekly
   - Create purchase orders promptly
   - Adjust minimum stock thresholds based on demand

---

Step 6: Bulk Operations
------------------------

Bulk Import (Creating Multiple Items)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**When to Use**: Adding many items at once (e.g., new product line)

1. Click **"Bulk Import"** button
2. Download CSV template
3. Fill in template with item data:

**Template Columns**:

.. code-block:: text

   name,sku,category,location,unit,price,vatRate,vatIncluded,currentStock,minimumStock,description
   "Lab Coat Size S","LAB-COAT-S","Clothing","Clothing Storage Rack 3","pieces",22.00,0.20,yes,15,5,"Standard lab coat small"
   "Lab Coat Size M","LAB-COAT-M","Clothing","Clothing Storage Rack 3","pieces",24.00,0.20,yes,20,5,"Standard lab coat medium"
   "Lab Coat Size L","LAB-COAT-L","Clothing","Clothing Storage Rack 3","pieces",24.00,0.20,yes,18,5,"Standard lab coat large"

4. Upload filled CSV file
5. System validates and imports
6. Results shown (success/errors)

**Validation**:
   - SKUs must be unique
   - Categories must exist
   - Prices must be valid numbers
   - Error report shown for failed rows

Bulk Export (Backing Up Inventory Data)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Click **"Export Inventory"** button
2. CSV file downloads with all items
3. Filename: ``inventory-export-20250129.csv``

**Uses**:
   - Backup before major changes
   - Analysis in Excel/spreadsheet
   - Migration to other systems
   - Printing inventory lists

---

Step 7: Best Practices
-----------------------

Location Management
~~~~~~~~~~~~~~~~~~~

**Consistent Format**:
   - Use standard format: "Building/Room, Area, Specific Location"
   - Example: "Chemistry Lab 204, Cabinet B, Shelf 3"

**Specific Enough**:
   - Staff should be able to find item in <2 minutes
   - Include landmark if helpful: "Near fume hood"

**Update When Moving**:
   - Always update location when relocating items
   - Prevents wasted time searching wrong location

SKU Conventions
~~~~~~~~~~~~~~~

**Develop a System**:
   - Prefix by category: LAB-, CHEM-, OFF-, IT-
   - Include item type: MICRO (microscope), BEAKER, CHAIR
   - Add size/capacity: 500ML, 40X, SIZE-M
   - Sequential number: 001, 002, 003

**Example SKU System**:

.. code-block:: text

   Category Prefixes:
   LAB-    Laboratory equipment
   CHEM-   Chemical supplies
   OFF-    Office supplies
   IT-     IT equipment
   SAFE-   Safety equipment

   Examples:
   LAB-MICRO-001    (Lab microscope #1)
   CHEM-BEAKER-500ML (500ml beaker)
   OFF-CHAIR-EXEC-001 (Executive office chair #1)
   IT-LAPTOP-DELL-001 (Dell laptop #1)
   SAFE-GOGG-001    (Safety goggles #1)

Price Management
~~~~~~~~~~~~~~~~

**Regular Reviews**:
   - Review prices quarterly
   - Adjust for supplier price changes
   - Update before new academic year

**VAT Changes**:
   - When VAT rates change, update affected items
   - Historical sales unaffected (use snapshot)

Stock Management
~~~~~~~~~~~~~~~~

**Regular Stock Takes**:
   - Physical count monthly or quarterly
   - Compare with system stock
   - Investigate and document discrepancies
   - Adjust stock to match physical count

**Document Everything**:
   - Always provide detailed reasons for adjustments
   - Helps with audits and investigations
   - Builds accountability

---

Common Scenarios
----------------

Scenario 1: Received Wrong Quantity
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problem**: Ordered 10, received 8

**Solution**:
   1. In order receiving, enter actual received: 8
   2. Stock increases by 8 (not 10)
   3. Add receiving note: "2 units on backorder"
   4. Create new order for remaining 2 units (or wait)

Scenario 2: Found Extra Stock
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problem**: Physical count found 15 units, system shows 10

**Solution**:
   1. Click "Adjust Stock"
   2. New Stock Level: 15
   3. Reason: "Physical stock take found 5 additional units in secondary storage"
   4. Confirm adjustment

Scenario 3: Damaged Items
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problem**: 3 items damaged beyond use

**Solution**:
   1. Click "Adjust Stock"
   2. New Stock Level: Current - 3
   3. Reason: "3 units damaged during storage - water leak in storage area 12/01/2025"
   4. Confirm adjustment
   5. Report damage to facilities

Scenario 4: Changing Item Location
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problem**: Moving items to new storage area

**Solution**:
   1. Click "Edit" on item
   2. Update Location field
   3. Save changes
   4. Optionally add note: "Relocated from Lab Store to Chemistry Building 204"

---

Troubleshooting
---------------

**"Cannot create item - SKU already exists"**
   - SKU must be unique
   - Check if item already in system
   - Use different SKU or edit existing item

**"VAT calculation seems wrong"**
   - Check "VAT Included" setting
   - See Step 2c for calculation examples
   - Consult finance if unsure

**"Stock didn't update after receiving order"**
   - Check order status is "Received"
   - Verify received quantities were entered
   - View stock movement history
   - Contact admin if issue persists

**"Cannot find item in list"**
   - Check if item is marked inactive
   - Try searching by SKU instead of name
   - Clear filters (may be filtered out)

---

Next Steps
----------

You now know:
   - ✓ How to add new items with all details
   - ✓ Location and unit field importance
   - ✓ Price and VAT configuration
   - ✓ Manual stock adjustments
   - ✓ Stock movement audit trails
   - ✓ Low-stock alert setup
   - ✓ Bulk import/export

**Related Tutorials**:
   - :doc:`placing-orders` - Receiving stock from suppliers
   - :doc:`taking-sales` - Processing sales (stock deduction)

**Related Guides**:
   - :doc:`/user-guide/inventory` - Detailed inventory reference
   - :doc:`/explanations/concepts` - Stock movements and audit trails

**Need Help?**
   - :doc:`/reference/faq` - Frequently asked questions
   - Email: inventory-support@university.edu
