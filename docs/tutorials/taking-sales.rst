Tutorial: Taking Sales and Processing Quotes
=============================================

This comprehensive tutorial guides you through the complete sales workflow, from creating quotes to payment reconciliation. This is the primary revenue-generating process in the system.

.. important::
   **Critical Requirement**: Every sale MUST have a valid charge code. Have your charge code ready before starting!

.. contents:: Tutorial Steps
   :local:
   :depth: 2

---

What You'll Learn
-----------------

By the end of this tutorial, you'll understand:

* The three-tier quote system (draft/saved/completed)
* How to browse and add items to quotes
* **Charge code validation** (critical accounting gate)
* The difference between saving and processing quotes
* How to process quotes into completed sales
* **Payment vs reconciliation** (isPaid flag)
* How to mark sales as paid for accounting
* How to view and export sales reports

---

Prerequisites
-------------

Before You Start
~~~~~~~~~~~~~~~~

**Required**:
   - Any user role (User, Manager, or Admin)
   - Valid charge code you're authorized to use
   - Items in inventory to sell

**What You'll Need**:
   - **Charge code**: MUST be valid (check with your department)
   - Customer information (name, email, department) - if saving quote
   - List of items and quantities needed

**Important for Basic Users**:
   - You can only use charge codes assigned to you
   - Check with admin which codes you're authorized for
   - Cannot access Reports page (managers/admins only)

**Estimated Time**: 5-10 minutes per sale

---

Understanding the Sales Lifecycle
----------------------------------

Before We Start: The Three-Tier System
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The system has THREE types of quotes/sales:

**1. Draft Quote** (Temporary Shopping Cart)
   - Automatically created when you add first item
   - Tied to your browser session
   - **Expires after 4 hours** of inactivity
   - Items NOT reserved (stock can change)
   - Quick transactions, no saving needed

**2. Saved Quote** (Persistent, Named)
   - Explicitly saved with a name
   - Stored in database permanently
   - Can be edited, duplicated, deleted
   - Used for quotes needing approval
   - Reusable for recurring orders

**3. Completed Sale** (Final Transaction)
   - Result of **processing** a quote (draft or saved)
   - **Stock immediately deducted**
   - **Immutable** (cannot be edited)
   - Charge code validated and locked in
   - Full audit trail created

**4. Paid Sale** (Reconciled)
   - Completed sale marked as paid
   - ``isPaid`` flag set to true
   - Indicates accounting reconciliation complete
   - Shows in reports as paid for billing

.. important::
   **Key Distinction**:

   - **Completed sale** = Items left stockroom (stock deducted)
   - **Paid sale** = Reconciled to charge code for accounting (isPaid flag)

   These are SEPARATE steps!

---

Step 1: Navigate to Sales & Quotes
-----------------------------------

Accessing the Interface
~~~~~~~~~~~~~~~~~~~~~~~

1. Log into LUStores
2. Click **"Sales & Quotes"** in the left sidebar
3. You'll see the main interface with tabs:
   - **Browse Items**: Search and add items to cart
   - **Current Quote**: Manage your draft quote (shopping cart)
   - **Saved Quotes**: View persistent quotes you've saved
   - **Stock Check**: Overview of inventory levels

.. tip::
   **First Time?** Start with the "Browse Items" tab to search for products.

---

Step 2: Browse and Search for Items
------------------------------------

Finding Items to Sell
~~~~~~~~~~~~~~~~~~~~~

In the **Browse Items** tab:

1. **Search Bar**: Type item name, SKU, or category
   - Real-time filtering as you type
   - Example: Type "microscope" to find all microscopes

2. **Results Show**:
   - Item name and SKU
   - **Current stock level** (critical!)
   - **Location** (where to find it) - shown during processing
   - **Unit price** (with VAT)
   - **Category** badge
   - **Stock status** indicator:
     * 🟢 **In Stock** (>5 units available)
     * 🟡 **Low Stock** (1-5 units)
     * 🔴 **Out of Stock** (0 units) - cannot add to cart

**Example Search Results**:

.. code-block:: text

   Search: "microscope"

   Results:
   ┌──────────────────────────────────────────────────────┐
   │ Laboratory Microscope                                │
   │ SKU: LAB-MICRO-001  |  Category: Lab Equipment      │
   │ Stock: 12 pieces 🟢  |  Price: £495.00 (inc VAT)    │
   │ Location: Lab Store, Shelf 3A                        │
   │ [Add to Quote]                                        │
   └──────────────────────────────────────────────────────┘

Understanding Stock Indicators
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**In Stock (Green)**:
   - Plenty available (>5 units or above minimum stock)
   - Safe to add to quote

**Low Stock (Yellow)**:
   - Limited availability (1-5 units)
   - Check with manager before large orders
   - May trigger reorder

**Out of Stock (Red)**:
   - 0 units available
   - "Add to Quote" button disabled
   - Contact manager to restock

.. warning::
   **Stock Validation**: The system validates stock when you add items AND when you process the quote. Stock can change between adding and processing!

---

Step 3: Add Items to Your Quote
--------------------------------

Adding Items to Draft Quote
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For each item you want to sell:

1. Enter **quantity** in the "Qty" field
   - Whole numbers for countable items (5 chairs)
   - Decimals for measured items (2.5 meters of cable)

2. Click **"Add to Quote"** button

3. System validates:
   - Is quantity available in stock?
   - Is quantity positive number?
   - Is item active?

4. If validation passes:
   - Item added to your draft quote
   - Appears in "Current Quote" tab
   - Running total updates

**Example Adding Item**:

.. code-block:: text

   Item: Safety Goggles
   Stock Available: 25 pieces
   Price: £9.60 (inc VAT)

   Enter Quantity: [10] ← Type quantity
   [Add to Quote] ← Click button

   ✓ Item added to quote
   Subtotal: £96.00 (10 × £9.60)

**If Insufficient Stock**:

.. code-block:: text

   ❌ Cannot add to quote
   Requested: 30 pieces
   Available: 25 pieces

   Please reduce quantity or contact inventory manager

**What Happens**:
   - **Draft quote auto-created** (if first item)
   - Item added with quantity and current price
   - **Price snapshot** taken (won't change if item price changes later)
   - VAT calculated automatically

Continue Adding Items
~~~~~~~~~~~~~~~~~~~~~

Repeat Step 3 for each item:

1. Search for next item
2. Enter quantity
3. Click "Add to Quote"
4. Item appears in list

Your draft quote builds up like a shopping cart.

---

Step 4: Review Your Current Quote
----------------------------------

Viewing the Quote
~~~~~~~~~~~~~~~~~

Click **"Current Quote"** tab to see:

**Quote Details**:
   - List of all items
   - Quantities
   - Individual prices
   - Subtotals per item
   - **Running total** (updates automatically)

**Example Current Quote**:

.. code-block:: text

   Current Draft Quote
   ═══════════════════
   Created: 29/01/2025 10:30

   Items (3):
   ┌────────────────────────┬─────────┬───────────┬────────────┐
   │ Item                   │ Qty     │ Price     │ Subtotal   │
   ├────────────────────────┼─────────┼───────────┼────────────┤
   │ Laboratory Microscope  │ 2       │ £495.00   │ £990.00    │
   │ Safety Goggles         │ 10      │ £9.60     │ £96.00     │
   │ Lab Coat Size M        │ 5       │ £24.00    │ £120.00    │
   └────────────────────────┴─────────┴───────────┴────────────┘

   Total: £1,206.00 (inc VAT)

Modifying Quantities
~~~~~~~~~~~~~~~~~~~~~

To change quantities:

1. Click in quantity field
2. Type new quantity
3. Press Enter or click outside field
4. Subtotal updates automatically

**System re-validates** against current stock.

Removing Items
~~~~~~~~~~~~~~

To remove item from quote:

1. Click **"Remove"** button next to item
2. Item removed immediately
3. Total recalculates

.. note::
   **Draft Quote Auto-Save**: Changes are saved automatically. No need to click "Save" unless you want to create a persistent saved quote.

---

Step 5: Understanding Charge Codes
-----------------------------------

Why Charge Codes Matter
~~~~~~~~~~~~~~~~~~~~~~~~

.. danger::
   **STOP!** Before processing your quote, you MUST have a valid charge code.

   **Every sale requires a charge code** - this is the accounting gate that links the sale to departmental budgets.

What is a Charge Code?
~~~~~~~~~~~~~~~~~~~~~~~

A charge code is an alphanumeric code that links your sale to:

* **Departmental budget**: Which department is paying
* **Grant funding**: Research project or sponsored work
* **Cost center**: Internal cost allocation
* **Financial account**: For accounting and billing

**Examples**:
   - "CS-2025-Q1" - Computer Science dept, Q1 budget
   - "BIO-LAB-SPRING" - Biology lab supplies, Spring semester
   - "GRANT-NHS-2024-001" - NHS research grant

Getting Your Charge Code
~~~~~~~~~~~~~~~~~~~~~~~~~

**Basic Users**:
   - You can ONLY use charge codes assigned to you
   - Contact your administrator to see which codes you have
   - Cannot use unauthorized codes (system will reject)

**Managers/Admins**:
   - Can use ANY charge code in the system
   - No restrictions

**How to Find Your Codes**:
   1. Ask your department administrator
   2. Check previous sales you've made (Reports page)
   3. Department finance office will have list

Charge Code Validation
~~~~~~~~~~~~~~~~~~~~~~~

When you enter a charge code, the system checks:

**1. Exists**: Code must be in database
**2. Time Valid**: Not expired (validUntil date) or not yet active (validFrom date)
**3. Not on Hold**: Code not temporarily frozen (budget freeze, overspent, etc.)
**4. Category OK**: Code allowed for item categories in your quote
**5. User Authorized**: You're authorized to use this code (basic users only)
**6. PIN (if required)**: Some codes need PIN entry

**Example Validation**:

.. code-block:: text

   Charge Code: CS-2025-Q1

   ✓ Code exists
   ✓ Valid from 01/01/2025 to 31/03/2025
   ✓ Not on hold
   ✓ No category restrictions
   ✓ User authorized (assigned to you)
   ✓ No PIN required

   → Charge code valid! ✓

Common Charge Code Errors
~~~~~~~~~~~~~~~~~~~~~~~~~~

**"Charge code does not exist"**
   - Typo (codes are case-sensitive!)
   - Code not created yet
   - Contact admin

**"Charge code has expired"**
   - validUntil date passed
   - Request renewal or new code

**"Charge code is on hold"**
   - Budget freeze or approval pending
   - Check hold reason in error message
   - Use alternative code or wait for release

**"This charge code cannot be used for these items"**
   - Category exclusion rule
   - Example: Can't use "Office Supplies" code for IT equipment
   - Use appropriate code for item category

**"You are not authorized to use this charge code"**
   - Code restricted to certain users
   - Contact admin to request access

.. tip::
   **Pro Tip**: Keep a list of your authorized charge codes handy. Saves time and prevents errors!

---

Step 6: Choose Your Path
-------------------------

You now have TWO options:

Option A: Save Quote for Later
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**When to use**:
   - Quote needs approval before purchase
   - Recurring order you'll reuse
   - Not ready to complete sale yet
   - Want to keep quote for reference

**What happens**:
   - Quote saved to database with name
   - Can edit/delete/duplicate later
   - **No stock deduction**
   - Can process into sale anytime

→ **Go to Step 7A** (Saving Quotes)

Option B: Process Quote into Sale Now
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**When to use**:
   - Ready to complete transaction immediately
   - Items leaving stockroom now
   - Have charge code and authorization

**What happens**:
   - **Stock immediately deducted**
   - Sale becomes immutable
   - Charge code validated
   - Full audit trail created

→ **Go to Step 7B** (Processing Quotes)

.. important::
   **Decide Carefully!** Processing a quote is irreversible. Stock is deducted immediately and cannot be undone (only refunded).

---

Step 7A: Saving a Quote (Option A)
-----------------------------------

Creating a Persistent Quote
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. In "Current Quote" tab, click **"Save Quote"** button

2. Fill in quote details:

   **Quote Name** (required):
      - Descriptive name for easy finding
      - Example: "Biology Lab Equipment - Spring 2025"

   **Customer Information**:
      - **Name**: Customer or department name
      - **Email**: Contact email (optional)
      - **Department**: Department or project name

   **Notes** (optional):
      - Purpose of quote
      - Special instructions
      - Approval status

3. Click **"Save"** button

**Example Save Quote Form**:

.. code-block:: text

   Save Quote
   ══════════
   Quote Name: Biology Lab Spring Equipment

   Customer Details:
   Name: Dr. Sarah Smith
   Email: s.smith@university.ac.uk
   Department: Molecular Biology

   Notes: Equipment for MB201 practical sessions
          Approved by Head of Department

   [Cancel]  [Save Quote]

What Happens
~~~~~~~~~~~~

- Quote saved to database
- Appears in "Saved Quotes" tab
- **Draft quote cleared** from current session
- Stock NOT deducted (items still available for others)
- Can process into sale later

**Viewing Saved Quotes**:

1. Click **"Saved Quotes"** tab
2. See list of all your saved quotes
3. Options for each quote:
   - **View**: See details
   - **Edit**: Modify items or details
   - **Duplicate**: Create copy
   - **Delete**: Remove quote
   - **Process**: Convert to sale (see Step 7B)

.. success::
   **Quote Saved!** Your quote "Biology Lab Spring Equipment" has been saved successfully.

---

Step 7B: Processing a Quote into a Sale (Option B)
---------------------------------------------------

.. danger::
   **CRITICAL STEP**: This is irreversible! Stock will be deducted immediately. Double-check everything before proceeding.

The Processing Workflow
~~~~~~~~~~~~~~~~~~~~~~~~

**Step 7B-1: Enter Charge Code**

1. In "Current Quote" tab, find **"Charge Code"** field
2. Enter your charge code (example: "CS-2025-Q1")
3. System validates code (see Step 5)
4. Wait for validation confirmation

**Validation Feedback**:

.. code-block:: text

   Charge Code: [CS-2025-Q1___________]

   Validating... ⏳

   ✓ Charge code valid!
   Ready to process quote.

**If Validation Fails**:

.. code-block:: text

   ❌ Charge code error:
   "This charge code has expired (valid until 31/12/2024)"

   Please use a current charge code or contact your
   department administrator.

**Step 7B-2: Final Review**

Before clicking "Process Quote", verify:

.. code-block:: text

   Pre-Process Checklist:
   ☐ All items correct?
   ☐ Quantities accurate?
   ☐ Charge code valid?
   ☐ Ready for stock deduction?
   ☐ Customer details (if needed) entered?

**Step 7B-3: Click "Process Quote"**

1. Click **"Process Quote"** button
2. Confirmation dialog appears:

.. code-block:: text

   ⚠ Confirm Sale Processing

   This will:
   - Create completed sale (immutable)
   - Deduct stock immediately
   - Charge to: CS-2025-Q1
   - Total: £1,206.00

   This action cannot be undone.

   [Cancel]  [Confirm Process]

3. Click **"Confirm Process"**

**Step 7B-4: Processing Happens (Atomic Transaction)**

The system performs (all or nothing):

**1. Creates Sale Record**:
   - Generates unique sale ID: S202501291345
   - Status: ``completed``
   - ``isPaid``: ``false`` (payment reconciliation comes later)
   - Charge code: Locked in
   - Processed by: Your user ID
   - Timestamp: Current date/time

**2. Creates Sale Item Snapshots**:
   - Each item captured with:
     * Item name, SKU (immutable snapshot)
     * Unit price at time of sale
     * VAT rate at time of sale
     * Quantity sold
     * **Location** (for picking list)
     * **Unit** (measurement type)

**3. Deducts Stock**:
   - Each item's ``currentStock`` reduced
   - Example: 12 pieces → 10 pieces (sold 2)

**4. Creates Stock Movement Records** (Audit Trail):
   - Type: 'out' (stock leaving)
   - Previous stock → New stock
   - Reason: "Sale #S202501291345"
   - Performed by: Your user ID
   - Timestamp: Exact time

**5. Clears Draft Quote**:
   - Draft quote removed from session
   - Ready for next transaction

**Example Stock Movement Created**:

.. code-block:: text

   Item: Laboratory Microscope (SKU: LAB-MICRO-001)

   Stock Movement Record:
   ───────────────────────
   Type: out
   Previous Stock: 12 pieces
   New Stock: 10 pieces
   Quantity Sold: 2 pieces
   Reason: "Sale #S202501291345"
   Performed By: user@university.ac.uk
   Timestamp: 29/01/2025 13:45:32

**Step 7B-5: Confirmation**

.. success::
   **Sale Processed Successfully!**

   Sale ID: S202501291345
   Total: £1,206.00
   Charge Code: CS-2025-Q1
   Status: Completed (Unpaid)

   Stock has been deducted for 3 items.

   [View Sale Details]  [Print Picking List]  [Start New Sale]

Understanding Location and Unit Information
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When you process a quote, the system captures **location** and **unit** information for each item:

**Location Field**:
   - Shows where item is physically stored
   - Example: "Lab Store, Shelf 3A, Bin 12"
   - **Included in picking lists** (printable)
   - Helps staff locate items quickly

**Unit Field**:
   - Shows measurement type
   - Example: "pieces", "meters", "kilograms"
   - Prevents quantity confusion
   - Example: "2.5 meters" vs "2.5 pieces"

**Printing Picking List**:

1. Click **"Print Picking List"** after processing
2. PDF generated with:
   - Sale ID and date
   - Customer details
   - **Item list WITH locations**
   - Quantities and units
   - Instructions for staff

**Example Picking List**:

.. code-block:: text

   ╔════════════════════════════════════════════════════╗
   ║        PICKING LIST - SALE #S202501291345          ║
   ╠════════════════════════════════════════════════════╣
   ║ Date: 29/01/2025 13:45                             ║
   ║ Processed By: user@university.ac.uk                ║
   ║ Charge Code: CS-2025-Q1                            ║
   ╠════════════════════════════════════════════════════╣
   ║                                                    ║
   ║ ITEMS TO PICK:                                     ║
   ║                                                    ║
   ║ ☐ Laboratory Microscope (SKU: LAB-MICRO-001)       ║
   ║   Quantity: 2 pieces                               ║
   ║   Location: Lab Store, Shelf 3A, Bin 05           ║
   ║                                                    ║
   ║ ☐ Safety Goggles (SKU: SAFE-GOGG-001)             ║
   ║   Quantity: 10 pieces                              ║
   ║   Location: Safety Equipment Room, Shelf 1B        ║
   ║                                                    ║
   ║ ☐ Lab Coat Size M (SKU: LAB-COAT-M)               ║
   ║   Quantity: 5 pieces                               ║
   ║   Location: Clothing Storage, Rack 3               ║
   ║                                                    ║
   ║ Total Value: £1,206.00                             ║
   ╚════════════════════════════════════════════════════╝

.. tip::
   **For Staff**: Use the picking list to collect items from storage. Check off each item as you pick it.

---

Step 8: Understanding Payment Reconciliation
---------------------------------------------

Sale Completed vs Sale Paid
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

After processing (Step 7B), your sale is **completed** but **not yet paid**.

**What This Means**:

**Completed Sale** (``status = 'completed'``, ``isPaid = false``):
   - ✓ Items have physically left the stockroom
   - ✓ Stock deducted from inventory
   - ✓ Charge code recorded
   - ❌ NOT yet reconciled for accounting/billing

**Paid Sale** (``isPaid = true``):
   - ✓ All of the above
   - ✓ **PLUS**: Accounting reconciliation complete
   - ✓ Charge code billing finalized
   - ✓ Shows in "Paid" reports for invoicing

**Why Separate?**:

1. **Workflow**: Physical distribution happens immediately, accounting reconciliation happens later (days/weeks)
2. **Approval**: Sales may need management approval before marking as paid
3. **Billing Cycle**: Month-end reconciliation, inter-departmental billing
4. **Audit Trail**: Clear separation between inventory movement and financial settlement

Who Marks Sales as Paid?
~~~~~~~~~~~~~~~~~~~~~~~~~

**Basic Users**: Cannot mark as paid (no access to Reports page)

**Managers/Admins**: Mark sales as paid during reconciliation

**Typical Workflow**:
   1. **Day 1**: User processes sale (completed, unpaid)
   2. **Day 5**: Manager reviews sales in Reports
   3. **Day 7**: Manager marks sale as paid after reconciliation

---

Step 9: Marking a Sale as Paid (Managers/Admins Only)
------------------------------------------------------

.. note::
   **Basic users**: Skip this step. Only managers and admins can mark sales as paid.

When to Mark as Paid
~~~~~~~~~~~~~~~~~~~~

Mark a sale as paid when:
   - You've reconciled it to the charge code budget
   - Accounting has approved the transaction
   - Ready for inter-departmental billing
   - Month-end reconciliation complete

Accessing Sales Reports
~~~~~~~~~~~~~~~~~~~~~~~~

1. Navigate to **Reports** page (sidebar)
2. You'll see sales report interface

Filtering for Unpaid Sales
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To find sales needing reconciliation:

1. Set filter: **"Payment Status: Unpaid Only"**
2. Optional filters:
   - **Charge Code**: Specific code
   - **Date Range**: Start and end dates
   - **User**: Who created the sale

3. Click **"Apply Filters"**

**Example Filter**:

.. code-block:: text

   Filters:
   ├─ Payment Status: Unpaid Only ✓
   ├─ Charge Code: CS-2025-Q1
   ├─ Date Range: 01/01/2025 - 31/01/2025
   └─ User: All users

   Results: 8 unpaid sales

Marking Individual Sale as Paid
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For each sale to reconcile:

1. Locate sale in the list
2. Click **"Mark as Paid"** button next to sale
3. Confirmation dialog appears:

.. code-block:: text

   Mark Sale as Paid

   Sale ID: S202501291345
   Date: 29/01/2025
   Total: £1,206.00
   Charge Code: CS-2025-Q1

   This marks the sale as reconciled for accounting.

   [Cancel]  [Confirm Mark as Paid]

4. Click **"Confirm Mark as Paid"**

**What Happens**:
   - ``isPaid`` flag set to ``true``
   - Sale shows in "Paid" filter
   - Available for billing reports
   - **Stock NOT affected** (already deducted when sale was completed)

.. success::
   **Sale Marked as Paid!**

   Sale #S202501291345 is now reconciled.

Bulk Marking as Paid
~~~~~~~~~~~~~~~~~~~~~

To mark multiple sales as paid at once:

1. Select checkboxes next to sales
2. Click **"Mark Selected as Paid"** button (top of list)
3. Confirm bulk action

**Useful for**: Month-end reconciliation of all sales for a charge code

---

Step 10: Viewing and Exporting Sales Reports
---------------------------------------------

Sales Report Features
~~~~~~~~~~~~~~~~~~~~~

The Reports page provides:

**Filters**:
   - Charge code
   - Date range
   - Payment status (all, paid, unpaid)
   - User who created sale

**Grouping**:
   - **By Charge Code**: See totals per charge code
   - **By Date**: Daily/weekly/monthly summaries
   - **By User**: Who's creating sales

**Export Options**:
   - **CSV**: For spreadsheet analysis
   - **Excel (XLSX)**: Formatted with totals
   - **PDF**: Printable reports

Viewing Charge Code Summaries
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To see spending by charge code:

1. Select **"Group by Charge Code"** option
2. Report shows totals per code

**Example Output**:

.. code-block:: text

   Sales Report - Grouped by Charge Code
   Period: 01/01/2025 - 31/01/2025

   Charge Code: CS-2025-Q1
   ─────────────────────────
   Total Sales: 15
   Total Amount: £12,450.00
   Paid: 12 sales (£10,200.00)
   Unpaid: 3 sales (£2,250.00)

   Charge Code: BIO-LAB-SPRING
   ────────────────────────────
   Total Sales: 8
   Total Amount: £8,930.00
   Paid: 8 sales (£8,930.00)
   Unpaid: 0 sales (£0.00)

Exporting to Excel
~~~~~~~~~~~~~~~~~~

1. Apply desired filters
2. Click **"Export to Excel"** button
3. File downloads: ``sales-report-20250129.xlsx``

**Excel File Contains**:
   - Sale ID, Date, User
   - Customer details
   - Items with quantities and prices
   - Subtotals and VAT
   - Charge code
   - Payment status
   - Totals by charge code (if grouped)

**Use For**:
   - Charge code billing
   - Financial reconciliation
   - Department budget tracking
   - Inter-departmental invoicing

---

Common Scenarios and Tips
-------------------------

Scenario 1: Customer Changed Mind
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Before Processing**:
   - Just remove items from draft quote or delete saved quote
   - No impact on stock

**After Processing** (sale completed):
   - Cannot "undo" a sale
   - Use refund workflow (contact admin)
   - Refund returns items to stock with note

Scenario 2: Wrong Charge Code Used
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Problem**: Processed sale with wrong charge code

**Solution**:
   - Cannot change charge code after processing
   - Contact admin to:
     * Refund original sale
     * Create new sale with correct charge code
   - Add notes explaining the correction

**Prevention**: Always double-check charge code before clicking "Process Quote"!

Scenario 3: Recurring Monthly Sales
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Best Practice**: Save quote as template

1. Create quote with all items
2. Save quote with name: "Monthly Lab Supplies - Template"
3. Each month:
   - Find saved quote
   - Click "Duplicate"
   - Modify quantities if needed
   - Process with current month's charge code

Scenario 4: Large Orders Need Approval
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Workflow**:

1. Create quote and add all items
2. **Save quote** (don't process yet!)
3. Name it clearly: "Large Order - Pending Approval - £5,000"
4. Email manager: "Quote saved, please review"
5. Manager reviews saved quote
6. When approved, manager processes quote with charge code

---

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**"Cannot add item - insufficient stock"**
   - Check current stock level
   - Reduce quantity or wait for restock
   - Contact manager to create purchase order

**"Charge code validation failed"**
   - See "Common Charge Code Errors" in Step 5
   - Verify code spelling (case-sensitive!)
   - Check code validity dates
   - Contact admin if authorized user issue

**"Cannot process quote - items no longer in stock"**
   - Stock changed since you added items
   - Someone else sold same items
   - Review quote and remove out-of-stock items
   - Or reduce quantities to available amounts

**"Cannot access Reports page"**
   - Basic users don't have access to Reports
   - Only managers and admins can mark sales as paid
   - Contact manager for sales reporting needs

**"Draft quote disappeared"**
   - Draft quotes expire after 4 hours
   - Session ended (logged out)
   - Use "Save Quote" feature for persistent quotes

---

Next Steps
----------

After Completing This Tutorial
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You now know:
   - ✓ Three-tier quote system (draft/saved/completed)
   - ✓ How to browse and add items
   - ✓ Charge code validation (critical!)
   - ✓ Difference between saving and processing
   - ✓ How to process quotes into sales
   - ✓ Payment vs reconciliation (isPaid)
   - ✓ How to mark sales as paid (managers/admins)
   - ✓ How to export sales reports

**Related Tutorials**:
   - :doc:`placing-orders` - Learn how to create purchase orders
   - :doc:`managing-inventory` - Manage items and stock levels

**Related Guides**:
   - :doc:`/user-guide/sales-quotes` - Detailed reference guide
   - :doc:`/explanations/concepts` - Business logic and concepts

**Need Help?**
   - :doc:`/reference/faq` - Frequently asked questions
   - Email: inventory-support@university.edu

---

Quick Reference Card
--------------------

Sales Workflow Checklist
~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   CREATING A SALE:
   □ Navigate to Sales & Quotes
   □ Browse and search for items
   □ Add items to quote (draft cart)
   □ Review quantities and totals
   □ Have charge code ready!
   □ Enter and validate charge code
   □ Review pre-process checklist
   □ Click "Process Quote"
   □ Confirm processing
   □ Print picking list (if needed)

   RECONCILIATION (Managers/Admins):
   □ Navigate to Reports page
   □ Filter for unpaid sales
   □ Review sale details
   □ Click "Mark as Paid"
   □ Confirm action
   □ Export reports for billing

Key Reminders
~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Concept
     - Remember
   * - Draft Quote
     - Expires in 4 hours, use for quick sales
   * - Saved Quote
     - Persistent, reusable, no stock impact
   * - Completed Sale
     - Stock deducted, immutable, charge code locked
   * - Paid Sale
     - Accounting reconciled (isPaid = true)
   * - Charge Code
     - REQUIRED for all sales, validated 6 ways
   * - Processing
     - Irreversible! Double-check first
   * - Location/Unit
     - Shown on picking lists for staff
   * - Reconciliation
     - Managers/admins mark as paid in Reports
