Sales & Quotes User Guide
=========================

The Sales & Quotes module provides a comprehensive interface for creating sales quotes, processing them into completed sales, and managing payment reconciliation. This guide walks you through all features including the critical charge code validation system.

Overview
--------

The Sales & Quotes system allows you to:

* Browse available inventory items with real-time stock levels and **location/unit information**
* Create **draft quotes** (temporary shopping cart) or **saved quotes** (persistent, named)
* **Process quotes into completed sales** with automatic stock deduction
* **Validate charge codes** (mandatory for all sales - critical accounting gate)
* **Mark sales as paid** for charge code reconciliation
* Export quotes and sales data as CSV files
* Generate professional invoices for printing or email
* Monitor stock levels across all categories

.. important::
   **The Three-Tier Quote System**: The system distinguishes between draft quotes (temporary, 4-hour expiration), saved quotes (persistent, reusable), and completed sales (immutable with stock deduction). Understanding this lifecycle is essential for proper workflow.

Understanding the Sales Lifecycle
----------------------------------

Draft Quotes (Temporary Shopping Cart)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**What it is**: A temporary, session-based quote that acts like a shopping cart.

**Key Features**:
- Automatically created when you start adding items
- Tied to your browser session (sessionId)
- **Expires after 4 hours of inactivity**
- Items are validated but **not reserved** - stock can change
- Can be saved as a named quote or processed directly into a sale

**When to use**: Quick transactions where you're ready to complete the sale immediately.

Saved Quotes (Persistent, Named)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**What it is**: A persistent quote saved to the database with a name and customer information.

**Key Features**:
- **Persistent** - doesn't expire, can be accessed anytime
- Named for easy reference (e.g., "Biology Lab Equipment - Spring 2025")
- Includes customer details (name, email, department)
- Can be **edited, duplicated, or deleted**
- Can be processed into a sale at any time
- Status: ``saved``

**When to use**:
- Quotes requiring approval before purchase
- Recurring orders you want to reuse
- Multi-step procurement processes

Completed Sales (Immutable Records)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**What it is**: A finalized sale that has been processed from a quote.

**Key Features**:
- **Immutable** - cannot be edited (only refunded)
- Stock is **immediately deducted** from inventory
- Full **audit trail** created (stock movements recorded)
- Includes snapshot of items at time of sale (price, VAT, name, SKU)
- Status: ``completed`` (or ``paid`` after reconciliation)
- **Charge code validated and locked in**

**When to use**: This is the final step - items are leaving inventory.

Paid Sales (Reconciled to Charge Code)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**What it is**: A completed sale that has been marked as paid/reconciled to its charge code.

**Key Features**:
- Same as completed sale but ``isPaid = true``
- Indicates accounting reconciliation is complete
- Shows in reports as paid for billing purposes
- Used for charge code financial tracking

**When to use**: After completing the accounting reconciliation (marking in Reports page).

.. note::
   **Critical Distinction**: A "completed sale" means items left the stockroom (stock deducted). A "paid sale" means it's been reconciled to the charge code for accounting (isPaid flag). These are separate steps because accounting workflows often happen after physical distribution.

Understanding Charge Codes (Critical!)
---------------------------------------

.. danger::
   **Every sale MUST have a valid charge code.** This is the accounting gate that links sales to departmental budgets and financial tracking. You cannot process a quote into a sale without a valid charge code.

What are Charge Codes?
~~~~~~~~~~~~~~~~~~~~~~~

Charge codes are alphanumeric codes (e.g., "CS-2025-001", "BIO-LAB-SPRING") that link sales to specific:

* **Departmental budgets**: Which department/project is paying
* **Financial accounts**: For accounting and billing
* **Grant funding**: For research grants and sponsored projects
* **Cost centers**: For internal cost allocation

Why They Matter
~~~~~~~~~~~~~~~~

1. **Financial Accountability**: Every sale is tied to a budget line for tracking
2. **Audit Compliance**: Required for financial audits and reporting
3. **Budget Management**: Prevents overspending on unauthorized accounts
4. **Billing**: Enables accurate billing and cost recovery

Charge Code Validation
~~~~~~~~~~~~~~~~~~~~~~~

When you enter a charge code, the system validates:

**1. Existence**: Does the charge code exist in the database?

**2. Time Validity** (if applicable):
   - ``validFrom`` date: Code not yet active
   - ``validUntil`` date: Code has expired

**3. Hold Status**:
   - Code may be temporarily placed "on hold" with a reason
   - Example: Budget freeze, pending approval, overspent

**4. Category Restrictions**:
   - Some codes can't be used for certain item categories
   - Example: "Office Supplies" code blocked for "IT Equipment" category
   - Configured via ``charge_code_exclusions`` table

**5. User Authorization** (optional):
   - Codes can be restricted to authorized users only
   - Basic users may only use assigned codes
   - Managers and admins have access to all codes

**6. PIN Protection** (optional):
   - High-value codes may require PIN entry

Common Charge Code Errors
~~~~~~~~~~~~~~~~~~~~~~~~~~

**"Charge code does not exist"**
   - Typo in code entry (codes are case-sensitive)
   - Code not yet created in system
   - Contact your department administrator

**"Charge code is not valid yet"**
   - Code has a ``validFrom`` date in the future
   - Wait until the start date or contact admin

**"Charge code has expired"**
   - Code has a ``validUntil`` date in the past
   - Request a new code or extension

**"Charge code is on hold"**
   - Budget freeze or approval pending
   - Check the hold reason or contact finance department

**"This charge code cannot be used for these items"**
   - Category restriction in place
   - Example: Can't use "Lab Supplies" code for "Furniture"
   - Use appropriate code for item category or contact admin

**"You are not authorized to use this charge code"**
   - Code restricted to specific users
   - Contact admin to request access

Getting Started
---------------

Accessing Sales & Quotes
~~~~~~~~~~~~~~~~~~~~~~~~~

1. Log into the inventory management system
2. Click on **"Sales & Quotes"** in the left sidebar
3. The interface opens with three main tabs:
   - **Browse Items**: Search and add items to quotes
   - **Current Quote**: Manage your active draft quote
   - **Saved Quotes**: View and manage persistent quotes
   - **Stock Check**: Overview of inventory levels

.. tip::
   **Have your charge code ready** before starting! You'll need it to process any quote into a sale.

Browse Items Tab
----------------

The Browse Items tab is your starting point for creating quotes.

Searching for Items
~~~~~~~~~~~~~~~~~~~

.. image:: /_static/screenshots/sales-browse.png
   :alt: Browse Items Interface
   :width: 800px

**Search Features:**
- **Text Search**: Search by item name, SKU, or category
- **Real-time Results**: Instant filtering as you type
- **Category Badges**: Visual indicators for item categories
- **Stock Status**: Color-coded badges showing availability

**Stock Status Indicators:**
- 🟢 **In Stock**: More than 5 units available
- 🟡 **Low Stock**: 1-5 units available
- 🔴 **Out of Stock**: 0 units available

Adding Items to Quote
~~~~~~~~~~~~~~~~~~~~~

1. **Find Your Item**: Use the search box to locate items
2. **Enter Quantity**: Type the desired quantity in the "Qty" field
3. **Add to Quote**: Click the "Add" button
4. **Validation**: The system automatically checks stock availability

.. note::
   The system prevents you from adding more items than are currently in stock.

Current Quote Tab
-----------------

The Current Quote tab manages your active quote and provides export options.

Managing Quote Items
~~~~~~~~~~~~~~~~~~~~

**Modify Quantities:**
- Click in the quantity field to adjust amounts
- The system validates against available stock
- Subtotals update automatically

**Remove Items:**
- Click the "Remove" button to delete items from the quote
- The total recalculates immediately

**View Quote Summary:**
- Total amount displayed prominently
- Item count shown
- Individual subtotals for each item

Export Options
~~~~~~~~~~~~~~

CSV Export
''''''''''

.. image:: /_static/screenshots/sales-export.png
   :alt: Export Options
   :width: 600px

1. Click **"Export CSV"** button
2. File downloads automatically with format: ``quote-YYYY-MM-DD.csv``
3. Contains: Item Name, SKU, Category, Unit Price, Quantity, Subtotal

**CSV Format Example:**

.. code-block:: text

   Item Name,SKU,Category,Unit Price,Quantity,Subtotal
   Office Chair,CHAIR-001,Furniture,£299.99,2,£599.98
   Desk Lamp,LAMP-002,Office Supplies,£49.99,1,£49.99

   Total,,,,,£649.97

Professional Invoice Generation
'''''''''''''''''''''''''''''''

1. Click **"Generate Invoice"** button
2. Professional invoice opens in new window
3. Includes:
   - University branding
   - Quote ID and creation date
   - Your contact information
   - Itemized listing with subtotals
   - Grand total calculation

**Invoice Features:**
- Print-ready format
- Professional layout
- Automatic quote numbering
- User attribution
- Creation timestamp

Processing Quotes into Sales
-----------------------------

.. important::
   **This is the critical step**: Processing converts a quote (draft or saved) into a completed sale. Stock is deducted, audit trails are created, and the transaction becomes immutable.

The Processing Workflow
~~~~~~~~~~~~~~~~~~~~~~~~

**Step 1: Enter Charge Code**
   - Enter your valid charge code in the charge code field
   - System validates the code (existence, validity dates, hold status, category restrictions)
   - If validation fails, see "Common Charge Code Errors" above

**Step 2: Review Quote Items**
   - Verify all items and quantities are correct
   - Check stock availability one final time
   - Review total amount

**Step 3: Click "Process Quote" Button**
   - Atomic transaction begins
   - System performs final validation:
     * Charge code is valid
     * All items still in stock
     * Quantities haven't changed

**Step 4: Transaction Completes**
   The system automatically:

   1. **Creates the Sale Record**:
      - Generates unique sale ID (e.g., S202501291234)
      - Status set to ``completed``
      - ``isPaid`` set to ``false`` (payment reconciliation comes later)
      - Charge code locked in

   2. **Creates Sale Item Snapshots**:
      - Item name, SKU captured (immutable)
      - Price, VAT rate captured at time of sale
      - **Location and unit information included** (for staff reference)
      - Quantity recorded

   3. **Deducts Stock**:
      - Current stock reduced by sale quantities
      - Stock movements created with full audit trail
      - ``performedBy`` = your user ID
      - ``type`` = 'out' (stock leaving)
      - ``reason`` = linked to sale ID

   4. **Clears Draft Quote**:
      - If processing draft, it's removed from session
      - If processing saved quote, it's marked as processed

**Step 5: Confirmation**
   - Success message displayed
   - Sale ID provided for reference
   - Link to view sale details
   - Option to print picking list with **item locations**

What Happens to Stock
~~~~~~~~~~~~~~~~~~~~~~

When a quote is processed:

- **Immediate deduction**: Stock levels update instantly
- **Audit trail**: Every stock movement is logged with who, when, why
- **Location tracking**: Sale shows where items are physically stored
- **Cannot be reversed**: Stock can only be returned via refund process

.. warning::
   **Stock Deduction is Immediate and Irreversible**

   Processing a quote immediately removes items from inventory. If you process by mistake, you must use the refund workflow to return items to stock. Plan carefully before clicking "Process Quote"!

Location and Unit Information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When processing a quote, the system includes critical warehouse information:

**Location Field**:
   - Shows physical storage location (e.g., "Room 204, Shelf B3")
   - Helps staff locate items for picking
   - Included in printed picking lists
   - Visible in sale conversion printouts

**Unit Field**:
   - Shows measurement unit (pieces, kg, meters, liters, etc.)
   - Ensures correct quantity interpretation
   - Example: "2.5 meters" vs "2.5 pieces"
   - Critical for non-countable items

**Example Sale Item**:

.. code-block:: text

   Item: Ethernet Cable CAT6
   SKU: NET-CABLE-001
   Quantity: 15.5 meters  ← Unit shown
   Location: IT Storage, Bin 12A  ← Location for picking
   Price: £2.50/meter
   Total: £38.75

Payment Reconciliation Workflow
--------------------------------

.. note::
   **Payment reconciliation happens AFTER the sale is completed.** This is a separate accounting step that marks the sale as paid/billed.

Understanding the Separation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Why are "completing a sale" and "marking as paid" separate?**

1. **Physical vs Financial**: Items leave the stockroom immediately (sale completed), but accounting reconciliation may happen days or weeks later
2. **Workflow Flexibility**: Allows for approval workflows, invoice generation, payment processing
3. **Audit Trail**: Clear distinction between inventory movement and financial settlement

How to Mark a Sale as Paid
~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Navigate to **Reports** page in the sidebar
2. Filter sales by:
   - Charge code
   - Date range
   - Payment status (show "Unpaid Only")
3. Locate the sale to reconcile
4. Click **"Mark as Paid"** button
5. Confirm the action
6. Sale status updates to ``isPaid = true``

What Marking as Paid Does
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Sets the ``isPaid`` flag to ``true`` in the database
- Indicates accounting reconciliation is complete
- Shows sale in "Paid" filter for reports
- Used for charge code financial tracking and billing
- **Does NOT affect stock levels** (stock was already deducted)

Charge Code Financial Reports
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

After marking sales as paid:

1. **Group by Charge Code**: Reports page shows totals by charge code
2. **Export to Excel**: Download XLSX with charge code breakdown
3. **Reconciliation**: Compare with finance department records
4. **Billing**: Send charge code summaries for inter-departmental billing

**Example Report Output**:

.. code-block:: text

   Charge Code: CS-2025-Q1
   Total Sales: 15
   Total Amount: £12,450.00
   Paid: 12 sales (£10,200.00)
   Unpaid: 3 sales (£2,250.00)

   Charge Code: BIO-LAB-SPRING
   Total Sales: 8
   Total Amount: £8,930.00
   Paid: 8 sales (£8,930.00)
   Unpaid: 0 sales (£0.00)

Stock Check Tab
---------------

The Stock Check tab provides an overview of inventory status across all categories.

Stock Overview Dashboard
~~~~~~~~~~~~~~~~~~~~~~~~

.. image:: /_static/screenshots/sales-stock-overview.png
   :alt: Stock Overview Dashboard
   :width: 800px

**Key Metrics:**
- **In Stock Items**: Items with healthy stock levels (>5 units)
- **Low Stock Items**: Items needing attention (1-5 units)
- **Out of Stock**: Items requiring immediate reordering

**Detailed Item View:**
- Current stock levels
- Minimum stock thresholds
- Item pricing information
- Category organization

Best Practices
--------------

Quote Creation Workflow
~~~~~~~~~~~~~~~~~~~~~~~

1. **Plan Your Quote**
   - Review customer requirements
   - Check item availability first
   - Consider lead times for low-stock items

2. **Build Systematically**
   - Search by category or item name
   - Add items one at a time
   - Verify quantities against stock

3. **Review Before Export**
   - Double-check all quantities
   - Verify pricing accuracy
   - Ensure all required items included

4. **Professional Delivery**
   - Use invoice generation for formal quotes
   - Include notes for special requirements
   - Follow up on quote status

Stock Management
~~~~~~~~~~~~~~~~

**Proactive Monitoring:**
- Regularly check the Stock Overview
- Address low stock items promptly
- Monitor high-demand items

**Quote Planning:**
- Check stock before promising delivery
- Consider minimum stock levels
- Plan for seasonal demand fluctuations

**Communication:**
- Include stock availability in quotes
- Set realistic delivery expectations
- Inform customers of any stock constraints

Troubleshooting
---------------

Common Issues and Solutions
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**"Insufficient Stock" Error**

*Problem*: Cannot add desired quantity to quote

*Solutions*:
- Check current stock level in Browse Items tab
- Reduce quantity to available amount
- Contact inventory manager for restock timeline
- Consider partial fulfillment options

**Items Not Appearing in Search**

*Problem*: Cannot find expected items

*Solutions*:
- Check spelling and try different search terms
- Search by SKU instead of name
- Try searching by category
- Verify item is active in inventory system

**Export Not Working**

*Problem*: CSV or invoice generation fails

*Solutions*:
- Ensure pop-up blocker is disabled
- Try a different browser
- Check that quote contains items
- Refresh page and try again

**Stock Levels Appear Incorrect**

*Problem*: Displayed stock doesn't match expectations

*Solutions*:
- Refresh the page to get latest data
- Check recent stock movements in inventory
- Verify with inventory manager
- Report discrepancies for investigation

Tips for Efficiency
-------------------

Keyboard Shortcuts
~~~~~~~~~~~~~~~~~~

- **Tab**: Navigate between quantity fields
- **Enter**: Add item to quote (when quantity field is focused)
- **Ctrl+F**: Focus search box

Quick Actions
~~~~~~~~~~~~~

- **Frequent Items**: Bookmark commonly quoted items
- **Standard Quantities**: Use typical order quantities as defaults
- **Category Filtering**: Learn category names for faster searching
- **Template Quotes**: Save common quote combinations

Payment Management
------------------

Managing Sales Payment Status
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

LUStores provides comprehensive payment tracking to help reconcile which sales have been paid.

**Key Features:**

- Mark individual sales as paid/unpaid
- Bulk mark multiple sales as paid simultaneously
- Filter sales by payment status
- Track unpaid sales for follow-up
- Generate payment reconciliation reports

Understanding Payment Status
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Paid Status:**

A sale marked as "Paid" indicates payment has been received and processed through accounts payable.

.. note::
   Marking a sale as "paid" is for **accounting reconciliation** only. It does not process actual payments or integrate with payment gateways.

**Unpaid Status:**

A sale marked as "Unpaid" (default) indicates payment is pending or awaiting processing.

**Use Cases:**

- Monthly reconciliation with finance department
- Tracking outstanding payments
- Identifying sales awaiting payment processing
- Generating invoices for unpaid sales

Marking a Single Sale as Paid
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**From Reports Page:**

1. Navigate to **Reports** page
2. Locate the sale in the table
3. Click **Mark as Paid** button in Actions column
4. Confirmation dialog appears
5. Verify sale details (Sale ID, amount)
6. Click **Confirm**
7. Status badge changes from **Unpaid** (red) to **Paid** (green)

**Confirmation Dialog:**

.. code-block:: text

   Mark Sale as Paid

   Are you sure you want to mark Sale #S20250112-1030-001 as paid?
   Total Amount: £123.45
   Charge Code: PROJ-2024-001

   [Cancel]  [Confirm]

**From Sales List (if available):**

1. Navigate to **Sales** page
2. Find sale in list
3. Click Actions > **Mark as Paid**
4. Confirm in dialog

Bulk Marking Sales as Paid
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Mark multiple sales as paid simultaneously for efficient reconciliation:

**Step 1: Filter Unpaid Sales**

1. Navigate to **Reports** page
2. Set filter to **Unpaid Only**
3. Optionally set date range (e.g., "Last Month")
4. Optionally filter by charge code

**Step 2: Select Sales**

- **Option A:** Select individual sales by checking boxes
- **Option B:** Click **Select All** checkbox to select all visible sales

**Step 3: Bulk Mark as Paid**

1. **Bulk Actions** button appears when selections exist
2. Click **Bulk Actions** > **Mark as Paid**
3. Confirmation dialog shows:

   .. code-block:: text

      Mark 15 Sales as Paid

      Are you sure you want to mark 15 sales as paid?
      Total Value: £2,345.67

      This action will update all selected sales.

      [Cancel]  [Confirm]

4. Click **Confirm**
5. Progress indicator shows processing
6. Success toast: "15 sales marked as paid successfully"

**Verification:**

- Unpaid sales count decreases
- Status badges update to green "Paid"
- Sales move to paid filter

Marking Sales as Unpaid (Reversal)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If a sale was marked as paid incorrectly, you can reverse it:

1. Navigate to **Reports** page
2. Set filter to **Paid Only**
3. Locate the sale to reverse
4. Click **Mark as Unpaid** button
5. Confirmation dialog appears
6. Click **Confirm**
7. Status changes back to **Unpaid**

**Use Cases:**

- Accounting correction (payment bounced)
- Incorrect marking
- Payment reversal
- Audit adjustments

Payment Reconciliation Workflow
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Typical Monthly Workflow:**

**Week 1: Generate Unpaid Report**

1. Navigate to Reports page
2. Set date range to previous month
3. Set filter to **Unpaid Only**
4. Export to Excel
5. Send to accounts payable department

**Week 2-3: Accounts Payable Processing**

1. Accounts payable processes payments
2. Confirms which sales have been paid
3. Provides list of paid sale IDs

**Week 4: Update Payment Status**

1. Return to Reports page
2. Filter for unpaid sales from previous month
3. Select confirmed paid sales
4. Bulk mark as paid
5. Verify unpaid count is now accurate

**Month End: Final Verification**

1. Generate comprehensive report (All Sales)
2. Verify paid vs unpaid totals match accounting records
3. Archive report for audit trail
4. Address any discrepancies

Using Payment Filters
~~~~~~~~~~~~~~~~~~~~~~

**Paid Only Filter:**

Shows only sales that have been marked as paid.

**Use Cases:**

- Verify payment processing completeness
- Generate paid sales report for period
- Reconcile with bank statements

**Unpaid Only Filter:**

Shows only sales awaiting payment.

**Use Cases:**

- Identify outstanding payments
- Follow up with accounts payable
- Generate collection reports
- Track aging unpaid sales

**All Sales Filter:**

Shows both paid and unpaid sales (default).

**Use Cases:**

- Complete sales history
- Total revenue calculations
- Full period reports

Viewing Payment Status in Reports
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Payment status is displayed in multiple ways:

**Status Badge:**

- **Paid** - Green badge with checkmark
- **Unpaid** - Red/orange badge

**Summary Cards:**

The Reports page displays:

.. code-block:: text

   Unpaid Sales Card:
   23 Unpaid Sales (£1,456.78)

**Color Coding:**

- Red: High unpaid value (>£1000)
- Orange: Medium unpaid value (£500-£1000)
- Gray: Low/no unpaid value

**Excel Export:**

Exported reports include a "Payment Status" column:

- ``Paid``
- ``Unpaid``

Payment Tracking Best Practices
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Daily:**

- Review new sales
- Note any urgent payment requirements

**Weekly:**

- Check unpaid sales count
- Follow up on aging unpaid sales (>30 days)

**Monthly:**

- Generate full reconciliation report
- Bulk mark confirmed paid sales
- Archive reports for audit trail
- Address discrepancies immediately

**Quarterly:**

- Review payment processing workflows
- Identify patterns in payment delays
- Update reconciliation procedures if needed

**Documentation:**

- Keep records of who marked sales as paid
- Note reasons for payment status reversals
- Maintain audit trail for compliance

Permissions
~~~~~~~~~~~

**Mark as Paid Permission:**

- Permission: ``sales.mark_paid``
- Default roles: Superuser, Admin
- Can be granted to specific users (e.g., accounting staff)

**Viewing Payment Status:**

- Permission: ``sales.view``
- All authenticated users can view status

**Exporting Reports:**

- Permission: ``reports.export``
- Required for Excel export with payment data

Troubleshooting Payment Issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Can't Mark Sale as Paid**

**Check:**

1. ✅ User has ``sales.mark_paid`` permission
2. ✅ Sale exists and is completed
3. ✅ Sale is not a draft quote
4. ✅ Browser is not blocking action

**Solution:**

- Verify permissions in Settings > Permissions
- Refresh page and try again

**Bulk Action Fails**

**Check:**

1. ✅ All selected sales are eligible
2. ✅ Network connection is stable
3. ✅ No conflicting operations

**Solution:**

- Try marking in smaller batches (10-20 at a time)
- Check individual sales that failed

**Payment Status Not Updating**

**Check:**

1. ✅ Success toast appeared
2. ✅ User refreshed page
3. ✅ Correct filter applied

**Solution:**

- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Log out and back in

Integration with Reports
~~~~~~~~~~~~~~~~~~~~~~~~

Payment tracking integrates with the **Reports & Analytics** system.

See :doc:`reports-analytics` for detailed reporting workflows including:

- Payment reconciliation reports
- Aging unpaid sales reports
- Revenue by payment status
- Payment trend analysis

Advanced Features
-----------------

Quote Validation
~~~~~~~~~~~~~~~~

The system automatically validates:

- **Stock Availability**: Prevents overselling
- **Minimum Quantities**: Enforces any minimum order requirements
- **Price Accuracy**: Uses current pricing from inventory
- **Item Status**: Only shows active inventory items

Integration with Inventory
~~~~~~~~~~~~~~~~~~~~~~~~~~

Sales quotes integrate seamlessly with:

- **Real-time Stock**: Always shows current availability
- **Price Updates**: Automatically reflects pricing changes
- **New Items**: Immediately available for quoting
- **Category Changes**: Reflects organizational updates

Reporting Integration
~~~~~~~~~~~~~~~~~~~~~

Quote data contributes to:

- **Sales Analytics**: Track quote volume and values
- **Demand Planning**: Identify popular items
- **Stock Planning**: Inform purchasing decisions
- **Customer Insights**: Understand buying patterns

Delivery Confirmation and Recipient Tracking
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When completing a sale with a charge code, the system can track delivery confirmation to document who received the items. This feature provides accountability and helps resolve delivery disputes.

**Picking List Display**

After processing a quote into a completed sale, the system displays a picking list if the user preference is enabled (Settings > General > User Preferences):

- **Item Locations**: Shows where each item is stored in the warehouse
- **Quantities**: Lists exactly what needs to be collected
- **Authorized Users**: Displays all users authorized to receive items for the charge code
- **Recipient Selection**: Allows recording who actually received the items

**Recording Recipient**

When the picking list is displayed:

1. **Review Authorized Users**: A green panel lists all users authorized for the charge code
2. **User Information**: Shows name, email, department, and any notes for each user
3. **Select Recipient**: Click on the name of the person receiving the items
4. **Confirmation**: Selected user is highlighted with a checkmark
5. **Record Timestamp**: System automatically records delivery date and time

.. image:: /_static/images/recipient-selection.png
   :alt: Recipient selection in picking list
   :align: center

**Benefits of Recipient Tracking**

- **Accountability**: Clear record of who received specific items
- **Delivery Disputes**: Resolve questions about item delivery
- **Audit Trail**: Complete documentation for charge code usage
- **Budget Tracking**: Link expenses to specific recipients
- **Compliance**: Meet department recordkeeping requirements

**Reports Integration**

Recipient information appears in:

- **Sales Reports**: "Delivered To" column shows recipient name
- **Excel Exports**: Includes both recipient name and delivery timestamp
- **Analytics**: Filter and group by recipient for usage analysis
- **Audit Logs**: Full audit trail of delivery confirmations

**Disabling Picking Lists**

Users who don't need picking list display can disable it in Settings:

1. Navigate to **Settings** > **General** > **User Preferences**
2. Toggle **"Show Picking List After Sales"** to off
3. Picking lists will no longer appear after completing sales
4. This setting is per-user and persists across sessions

**API Integration**

Recipient data is available via API:

.. code-block:: http

   PATCH /api/sales/:id/recipient

   {
     "deliveredTo": "Dr. Jane Smith",
     "deliveredToEmail": "jane.smith@university.edu"
   }

Response includes delivery timestamp and complete sale details.

Known Issues & Workarounds
---------------------------

Stock Concatenation Bug (Refunds)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. danger::
   **Critical Bug**: There is a known issue with the refund system where stock quantities may be concatenated as strings instead of added as numbers when refunding sales.

**Symptoms:**

- After refunding a sale, stock shows incorrect values (e.g., "105" instead of 15 when adding 5 to stock of 10)
- Stock movements show string concatenation (10 + 5 = "105")
- Physical stock doesn't match system stock after refunds

**Root Cause:**

The ``refundSaleInPlace`` method in ``storage.ts`` (line 534) uses SQL template interpolation that can cause PostgreSQL to treat the refund quantity as a string:

.. code-block:: typescript

   // BUG: actualRefund might be treated as string
   currentStock: sql`${sql.identifier('currentStock')} + ${actualRefund}`

This should be:

.. code-block:: typescript

   // CORRECT: Parse to float, calculate, then set
   const currentItem = await db.select().from(itemsTable).where(eq(itemsTable.id, itemId));
   const currentStockNum = parseFloat(currentItem[0].currentStock.toString());
   const newStock = currentStockNum + actualRefund;
   await db.update(itemsTable).set({ currentStock: newStock.toString() });

**Workaround:**

Until this bug is fixed:

1. **Avoid using the refund feature** for critical transactions
2. **Manually adjust stock** via Inventory Management page instead
3. **Verify stock levels** after any refund operation
4. **Report incorrect stock immediately** to administrators

**Impact:**

- ❌ Refunds add stock incorrectly (concatenation)
- ✅ Sales deduct stock correctly (uses proper parseFloat logic)
- ✅ Orders receiving adds stock correctly (uses proper parseFloat logic)
- ✅ Manual stock adjustments work correctly

**Status:** Bug identified and documented. Fix required in ``server/storage.ts`` line 534.

**Reported:** 2026-01-12

Decimal Quantity Precision
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: When using decimal quantities (e.g., 2.5 kg, 15.3 meters), ensure proper decimal handling.

**Best Practices:**

- Use appropriate units for fractional quantities
- Avoid excessive decimal places (2 decimal places max recommended)
- Verify calculations match physical measurements
- Test fractional quantity sales before production use

**Example:**

.. code-block:: text

   ✅ Good: 2.5 meters (clear, reasonable precision)
   ❌ Bad: 2.5000001 meters (floating point error accumulation)

Charge Code Validation Timing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: Charge code validation occurs when processing a quote, not when creating it.

**Implication:**

- You can create quotes with invalid charge codes
- Validation only happens at "Process Quote" step
- This allows for draft quotes before charge codes are finalized

**Best Practice:**

- Verify charge code validity before submitting quote for approval
- Keep charge code information up-to-date
- Test charge code entry during quote creation

Support and Training
--------------------

Getting Help
~~~~~~~~~~~~

**Documentation**: This guide covers all standard functionality

**Training Videos**: Available in the Documentation section

**Support Contact**: inventory-support@university.edu

**Quick Reference**: Printable cheat sheet available in system

**User Community**: Internal forums for tips and best practices

**System Updates**: Notifications for new features and improvements

Reporting Bugs
~~~~~~~~~~~~~~

If you encounter issues like:

- Stock levels appearing incorrect
- Unexpected error messages
- Features not working as described

**Steps to Report:**

1. **Note the exact error message** or unexpected behavior
2. **Record steps to reproduce** the issue
3. **Take screenshots** if applicable
4. **Check if issue is documented** in Known Issues section above
5. **Email** inventory-support@university.edu with details
6. **Include:**

   - Your user ID
   - Date and time of issue
   - Steps that led to the problem
   - Expected vs actual behavior
   - Screenshots or error messages

**Priority Issues:**

- Data loss or corruption: **URGENT** - call support immediately
- Stock discrepancies: **HIGH** - report within 24 hours
- Feature not working: **MEDIUM** - report within 1 week
- Cosmetic issues: **LOW** - report when convenient