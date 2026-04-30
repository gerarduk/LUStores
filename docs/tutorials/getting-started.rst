Getting Started Tutorial
========================

Welcome to the University Inventory Management System! This tutorial will guide you through your first steps with the system, from initial setup to managing your first inventory items.

What You'll Learn
-----------------

By the end of this tutorial, you'll be able to:

- Navigate the dashboard and understand key metrics
- Create and organize inventory categories
- Add and manage inventory items
- Track stock movements and generate reports
- Understand user roles and permissions

Prerequisites
-------------

Before starting this tutorial, ensure you have:

- Access to the system (either through university SSO or admin-provided credentials)
- Basic understanding of inventory management concepts
- Web browser (Chrome, Firefox, Safari, or Edge)

Step 1: First Login and Dashboard Overview
------------------------------------------

**Logging In**

1. Navigate to your university's inventory system URL
2. Click "Sign In" or you'll be redirected to university SSO
3. Use your university credentials to authenticate
4. You'll be redirected to the main dashboard

**Understanding the Dashboard**

The dashboard provides an overview of your inventory system:

**Key Metrics Cards:**
- **Total Items**: Complete count of all inventory items
- **Low Stock Items**: Items below minimum threshold (red indicates attention needed)
- **Total Value**: Combined value of all inventory
- **Active Users**: Number of users currently using the system

**Quick Access Panels:**
- **Low Stock Alerts**: Items requiring immediate attention
- **Category Overview**: Breakdown of items by category
- **Recent Activity**: Latest inventory movements

Step 2: Understanding Categories
--------------------------------

Categories help organize your inventory into logical groups. Let's explore existing categories and create a new one.

**Viewing Categories**

1. Click "Categories" in the left sidebar
2. Review the default categories:
   - **IT Equipment**: Computers, laptops, monitors
   - **Office Supplies**: Pens, paper, furniture
   - **Laboratory Equipment**: Scientific instruments
   - **Medical Supplies**: Healthcare-related items

**Creating Your First Category**

Let's create a category for "Audio/Visual Equipment":

1. Click the "Add Category" button
2. Fill in the form:
   
   .. code-block:: text
   
      Name: Audio/Visual Equipment
      Description: Projectors, speakers, cameras, and presentation equipment
      Icon: fas fa-video (choose from available icons)
      Color: purple (select a color that stands out)

3. Click "Save Category"
4. Your new category appears in the list

**Category Best Practices**

- Use clear, descriptive names
- Choose distinct colors for easy visual identification
- Keep descriptions concise but informative
- Use relevant icons that represent the category

Step 3: Adding Your First Inventory Item
----------------------------------------

Now let's add an actual inventory item to your new category.

**Adding a New Item**

1. Navigate to "Inventory" from the sidebar
2. Click "Add Item" button
3. Fill in the item details:

   .. code-block:: text
   
      Item Name: Epson PowerLite 1781W Projector
      SKU: PROJ-EPL-1781W-001
      Description: Wireless WXGA 3LCD projector for conference rooms
      Category: Audio/Visual Equipment
      Current Stock: 5
      Minimum Stock: 2
      Unit Price: $899.99

4. Click "Save Item"

**Understanding Item Fields**

- **SKU (Stock Keeping Unit)**: Unique identifier for tracking
- **Current Stock**: How many units you currently have
- **Minimum Stock**: Threshold for low stock alerts
- **Unit Price**: Cost per individual item

**SKU Naming Conventions**

Good SKU examples:
- ``PROJ-EPL-1781W-001`` (Product type-Brand-Model-Sequence)
- ``DESK-HON-38180-02`` (Category-Manufacturer-Model-Variant)
- ``LAP-DEL-XPS13-16GB`` (Type-Brand-Model-Specification)

Step 4: Managing Stock Levels
-----------------------------

Let's practice updating stock levels and understanding stock movements.

**Recording Stock Receipt**

When new items arrive:

1. Find your projector in the inventory list
2. Click the "Stock" button next to the item
3. Select "Stock In" and enter:
   
   .. code-block:: text
   
      Quantity: 3
      Reason: New shipment from vendor
   
4. Click "Update Stock"
5. Current stock increases from 5 to 8

**Recording Stock Issue**

When items are distributed:

1. Find the item in inventory
2. Click "Stock" button
3. Select "Stock Out" and enter:
   
   .. code-block:: text
   
      Quantity: 1.5
      Reason: Issued to Physics Lab (Room 204)
   
4. Click "Update Stock"
5. Stock decreases and movement is logged

.. note::
   The system now supports decimal quantities. For example, you can issue 0.5 meters
   of cable or 1.25 liters of chemical solution.

**Viewing Stock History**

To see all stock movements:

1. Navigate to "Reports" > "Stock Movements"
2. Filter by item, date range, or movement type
3. Export to CSV for record-keeping

Step 5: Understanding Sales and Quotes
--------------------------------------

The system uses a draft quote workflow to ensure accuracy before committing sales.

**The Sales Process**

1. **Build Draft Quote**: Add items to a quote cart
2. **Validate**: System checks charge code and stock availability
3. **Process**: Convert quote to permanent sale in one atomic operation
4. **Auto-Cleanup**: Draft quote clears automatically after processing

**Creating Your First Quote**

Let's create a quote for lab equipment:

1. Navigate to "Sales" page
2. Use the search bar to find items:
   
   .. code-block:: text
   
      Search: "microscope"

3. For each item you want to add:
   
   - Enter quantity (e.g., "2" or "0.5" for half a unit)
   - Click "Add to Quote"
   - Item appears in the quote section on the right

4. Continue adding items until your quote is complete
5. Enter the charge code:
   
   .. code-block:: text
   
      Charge Code: PHYSICS-LAB

6. Add optional notes:
   
   .. code-block:: text
   
      Customer Notes: Equipment for Room 204 setup

**Understanding Charge Codes**

Charge codes are billing identifiers required for all sales. They:

* Must be valid and in the system
* Have validity date ranges (start and end dates)
* May have category restrictions (some codes can't buy certain item types)
* Show helpful error messages when invalid

**Common Charge Code Error Messages:**

* **Invalid Code**:
  
  .. code-block:: text
  
     Invalid charge code: 'DEPT999' does not exist. 
     Available codes include: PHYSICS, CHEMISTRY, BIOLOGY, ENGINEERING

  **Solution**: Check the code spelling or request access to the code from your administrator

* **Expired Code**:
  
  .. code-block:: text
  
     Charge code 'LAB-2024' has expired on 12/31/2024.

  **Solution**: Request a new charge code or extension from your department

* **Not Yet Valid**:
  
  .. code-block:: text
  
     Charge code 'LAB-2026' is not yet valid until 01/01/2026.

  **Solution**: Use a current code or wait until the code becomes active

* **Category Restrictions**:
  
  .. code-block:: text
  
     Charge code 'IT-ONLY' cannot be used for some items due to category restrictions.

  **Solution**: Remove restricted items or use a different charge code

**Processing the Quote**

When you're ready to complete the sale:

1. Review all items and quantities in your quote
2. Verify the charge code is entered correctly
3. Check the total amount
4. Click "Process Quote"

**What Happens During Processing:**

The system performs several checks atomically:

.. code-block:: text

   1. Validate charge code exists ✓
   2. Check charge code is not expired ✓
   3. Verify no category restrictions ✓
   4. Confirm stock availability for all items ✓
   5. Create permanent sale record ✓
   6. Reduce inventory stock levels ✓
   7. Generate sale ID (e.g., SALE-20251205-001) ✓
   8. Clear draft quote automatically ✓

If any step fails, the entire operation is rolled back (no partial updates).

**Success Confirmation**

After successful processing:

* You'll see a success message: "Quote Processed"
* The quote clears automatically from your screen
* Stock levels update immediately
* A new sale record is created in Reports
* Audit trail is logged for compliance

**Handling Processing Errors**

If processing fails, you'll see specific error messages:

.. code-block:: text

   ❌ Invalid Charge Code
   Invalid charge code: 'BADCODE' does not exist.
   Available codes include: PHYSICS, CHEMISTRY, BIOLOGY

   ❌ Insufficient Stock
   Cannot process sale: Item 'Microscope' has insufficient stock.
   Current: 2, Required: 5

   ❌ Charge Code Expired
   Charge code 'OLD-LAB' has expired on 11/30/2024.

**Solution**: Fix the error (update charge code, reduce quantities, etc.) and try processing again.

**Clearing a Quote**

To start over or abandon a quote:

1. Click the "Clear Quote" button
2. Confirm the action
3. All items are removed from your quote
4. The draft quote is deleted from the database

Step 6: Working with Fractional Quantities
------------------------------------------

The system supports decimal quantities for precise tracking of continuous materials.

**When to Use Fractional Quantities:**

* **Cables and wiring** (measured in meters): 2.5m, 10.75m
* **Chemicals** (measured in liters or kilograms): 0.5L, 1.25kg  
* **Fabric or materials** (measured by length/area): 3.75m²
* **Bulk liquids**: 15.5 gallons
* **Sheet materials**: 6.25 sheets

**Adding Items with Decimals:**

When adding an item to a quote:

.. code-block:: text

   Item: "Copper Wire (per meter)"
   Quantity: 2.5
   
   Stock Check: ✓ Available (Current: 50.75m, After: 48.25m)

**Validation Rules:**

* Quantities can be decimal (e.g., 0.5, 1.25, 10.75)
* System checks if ``currentStock - quantity >= 0``
* Can't go negative, even with fractional amounts

**Example Scenario:**

.. code-block:: text

   Item: Chemical Solution X
   Current Stock: 0.8 liters
   
   ✓ Can add: 0.5 liters (leaves 0.3L remaining)
   ✓ Can add: 0.8 liters (uses all stock)
   ✗ Cannot add: 1.0 liters (would go negative)

Step 7: Viewing Reports and Analytics
-------------------------------------

The Reports page provides comprehensive sales analytics.

**Sales Reports by Charge Code**

1. Navigate to "Reports"
2. Set filters:
   
   .. code-block:: text
   
      Charge Code: PHYSICS (optional, partial match)
      Date Range: 2025-01-01 to 2025-12-31
      Show unpaid only: ☐

3. Click "Search"
4. View results grouped by charge code
5. Click charge code to expand and see:
   
   - Aggregated items with quantities and totals
   - Individual order details with SKUs
   - Mark unpaid sales as paid

**Sales Reports by Item**

Switch view mode to see:

* Total quantity sold per item
* Revenue per item
* Number of orders
* Average unit price
* Charge codes that purchased each item
* Order history over time

**Exporting Reports**

1. Set your desired filters
2. Click "Export" dropdown
3. Choose format:
   
   - CSV (for Excel/spreadsheets)
   - XLSX (native Excel format)

4. File downloads with current filter applied

**Mark Sales as Paid**

For financial reconciliation:

1. Find unpaid sales in the report
2. Select one or more sales (checkbox)
3. Click "Mark as Paid" button
4. Sales status updates to "Paid"
5. Can bulk-mark multiple sales at once

Step 8: Best Practices
----------------------

**Stock Management**

* Review low stock alerts daily on the dashboard
* Set minimum stock levels based on typical usage
* Record reasons for all stock movements
* Use fractional quantities when appropriate for precision

**Sales and Quotes**

* Always validate charge codes before building large quotes
* Add customer notes for complex orders
* Review quotes carefully before processing
* Clear abandoned quotes to keep database clean

**Charge Codes**

* Keep charge codes organized by department
* Set appropriate validity date ranges
* Document category restrictions clearly
* Provide users with a list of available codes

**Reporting**

* Export reports regularly for backup
* Use date ranges to track trends over time
* Monitor unpaid sales and follow up
* Review category analytics for budget planning

**Security**

* Never share your login credentials
* Log out when finished or when stepping away
* Report suspicious activity to administrators
* Only process sales for valid charge codes you're authorized to use

Next Steps
---------

Now that you've completed the getting started tutorial, you can:

* Explore advanced inventory features in :doc:`/user-guide/inventory`
* Learn about user management in :doc:`/admin/user-management`
* Set up automated workflows in :doc:`/deployment/monitoring`
* Integrate with external systems using :doc:`/api/overview`
* Configure charge code exclusions in :doc:`../charge-code-exclusions`

For questions or issues:

* Check the :doc:`/reference/troubleshooting` guide
* Review :doc:`/reference/faq` for common questions
* Contact your system administrator for support

1. Click "Stock" again on the same item
2. Select "Stock Out" and enter:
   
   .. code-block:: text
   
      Quantity: 2
      Reason: Deployed to Smith Hall conference room
   
3. Current stock decreases from 8 to 6

**Stock Adjustment**

For corrections or physical count updates:

1. Select "Adjustment" in the stock dialog
2. Enter the correct total quantity
3. Provide a reason for the adjustment

**Viewing Stock History**

1. Click on any item name to view details
2. Scroll to "Stock Movement History"
3. Review all past transactions with timestamps and reasons

Step 5: Understanding User Roles
--------------------------------

The system has three user roles with different capabilities:

**User Role (Read-Only)**
- View inventory items and stock levels
- Search and filter inventory
- View reports and dashboards
- Cannot modify any data

**Manager Role**
- All User permissions, plus:
- Add, edit, and delete inventory items
- Manage stock levels and movements
- Create and modify categories
- Generate detailed reports

**Admin Role**
- All Manager permissions, plus:
- Manage user accounts and roles
- Access system configuration
- View audit logs
- Manage system-wide settings

**Checking Your Role**

1. Click your profile icon in the top-right corner
2. Your current role is displayed
3. Available menu options reflect your permissions

Step 6: Basic Reporting
-----------------------

Let's generate your first inventory report.

**Inventory Summary Report**

1. Navigate to "Reports" in the sidebar
2. Select "Inventory Summary"
3. Choose date range (default is current month)
4. Click "Generate Report"

**Understanding Report Data**

The report includes:
- Total items by category
- Value distribution
- Low stock alerts
- Most/least active items

**Exporting Reports**

1. Click "Export" button on any report
2. Choose format (PDF for sharing, CSV for analysis)
3. File downloads automatically

Next Steps
----------

Now that you've completed the basic tutorial, consider these next steps:

**For Regular Users:**
- Explore advanced search features
- Set up saved searches for your common queries
- Learn about report generation and export options

**For Managers:**
- Practice bulk import of inventory items
- Set up automated low stock notifications
- Explore advanced reporting features

**For Administrators:**
- Review user management features
- Configure system-wide settings
- Set up automated backups

Congratulations! You've successfully completed the getting started tutorial. You now have the foundational knowledge to effectively use the University Inventory Management System.