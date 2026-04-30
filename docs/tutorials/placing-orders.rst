Tutorial: Placing Purchase Orders
===================================

This step-by-step tutorial guides you through the complete purchase order workflow, from creating orders to receiving items into inventory.

.. note::
   **Who can access**: Managers and System Admins only. Basic users cannot create or manage purchase orders.

.. contents:: Tutorial Steps
   :local:
   :depth: 2

---

What You'll Learn
-----------------

By the end of this tutorial, you'll be able to:

* Create purchase orders for new inventory
* Add items to orders (both new and existing items)
* Handle delivery charges and VAT calculations
* Upload and attach invoice PDFs to orders
* Receive orders and reconcile quantities
* View order history and track order status

---

Prerequisites
-------------

Before You Start
~~~~~~~~~~~~~~~~

**Required Access**:
   - Role: Manager or System Admin
   - Permissions: ``orders.create``, ``orders.receive``

**What You'll Need**:
   - Supplier information (name, contact details)
   - List of items to order with quantities and prices
   - Invoice PDF (if available)
   - Delivery charge amount (if applicable)

**Estimated Time**: 10-15 minutes per order

---

Step 1: Navigate to Orders Page
--------------------------------

Accessing Orders
~~~~~~~~~~~~~~~~

1. Log into the LUStores system
2. Click **"Orders"** in the left sidebar
3. You'll see the Orders management interface

**What You See**:
   - List of existing orders (if any)
   - **"Create Order"** button (top right)
   - Filters for order status (pending, received, cancelled)
   - Search bar for finding orders by ID or supplier

.. tip::
   **Quick Check**: If you don't see the "Orders" menu item, verify your role with an administrator. Basic users cannot access this feature.

---

Step 2: Create a New Purchase Order
------------------------------------

Starting the Order
~~~~~~~~~~~~~~~~~~

1. Click the **"Create Order"** button
2. The "New Purchase Order" form opens

Filling Out Order Details
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Step 2a: Select Supplier** (Optional but Recommended)

- **If supplier exists**:
  1. Click the **"Select Supplier"** dropdown
  2. Search for supplier by name
  3. Select from the list
  4. Supplier details auto-fill (contact info, account number)

- **If supplier doesn't exist**:
  1. Leave supplier blank for now
  2. You can add items without a supplier
  3. Or click "Create New Supplier" link (opens supplier form)

.. note::
   **Supplier is optional**: You can create orders without a supplier, but it's recommended for tracking and reordering.

**Step 2b: Set Order Date**

- **Order Date**: Defaults to today
- Can be changed if recording a historical order
- Format: DD/MM/YYYY

**Step 2c: Add Reference Number** (Optional)

- **Reference Number**: Your internal PO number or reference
- Example: "PO-2025-001", "Q1-Lab-Equipment"
- Helps with internal tracking and matching to finance systems

**Step 2d: Expected Delivery Date** (Optional)

- When you expect items to arrive
- Useful for planning and tracking late deliveries

**Example Form**:

.. code-block:: text

   Supplier: [Scientific Supplies Ltd ▼]
   Order Date: 29/01/2025
   Reference Number: PO-2025-BIO-001
   Expected Delivery: 05/02/2025
   Notes: Lab equipment for Spring semester

---

Step 3: Add Items to the Order
-------------------------------

Two Ways to Add Items
~~~~~~~~~~~~~~~~~~~~~

You can add items that:
1. **Already exist in inventory** (link to existing items)
2. **Don't exist yet** (create new items while ordering)

Method A: Adding Existing Items
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**When to use**: Reordering items already in your inventory

1. Click **"Add Existing Item"** button
2. Search for item by name or SKU
3. Select item from search results
4. Fill in order details:

   **Quantity**:
      - How many units you're ordering
      - Example: 10 pieces, 25.5 meters

   **Unit Cost**:
      - Price per unit (excluding VAT)
      - Example: £12.50 per piece
      - Currency: GBP (£)

   **VAT Rate** (optional):
      - Defaults to 20% (standard UK VAT)
      - Can be changed to 5% (reduced rate) or 0% (zero-rated)
      - System calculates total automatically

5. Click **"Add to Order"**

**Example**:

.. code-block:: text

   Item: Laboratory Microscope (SKU: LAB-MICRO-001)
   Quantity: 5 pieces
   Unit Cost: £450.00
   VAT Rate: 20%
   ---
   Subtotal: £2,250.00
   VAT: £450.00
   Total: £2,700.00

Method B: Creating New Items While Ordering
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**When to use**: Ordering items not yet in your inventory

1. Click **"Create New Item"** button
2. Fill in item details:

   **Required Fields**:
      - **Name**: Item description (e.g., "Pipette Tips 10-200µL")
      - **SKU**: Unique stock-keeping unit (e.g., "LAB-TIPS-200")
      - **Category**: Select from dropdown (e.g., "Laboratory Supplies")

   **Recommended Fields**:
      - **Location**: Where it will be stored (e.g., "Lab Store, Shelf 3A")
      - **Unit**: Measurement type (pieces, kg, meters, liters)
      - **Minimum Stock**: Low-stock alert threshold

   **Pricing**:
      - **Price**: Sale price (can differ from order cost)
      - **VAT Included**: Yes/No (affects price calculation)

3. Fill in order details (quantity, unit cost, VAT rate)
4. Click **"Add to Order"**

**What Happens**:
   - Item is created in inventory with initial stock of 0
   - Item added to current order
   - When order is received, stock will be updated

.. important::
   **New items start with 0 stock**: Stock is only added when the order is marked as received.

Adding Multiple Items
~~~~~~~~~~~~~~~~~~~~~

Repeat Step 3 (Method A or B) for each item in your order:

1. Add first item
2. Item appears in order items list
3. Click "Add Existing Item" or "Create New Item" again
4. Add next item
5. Continue until all items added

**You'll see**:
   - List of all order items
   - Quantities and prices
   - Individual subtotals
   - Running order total (updates automatically)

**Example Order Items List**:

.. code-block:: text

   Items in Order:
   ┌────────────────────────────┬─────────┬───────────┬────────────┐
   │ Item                       │ Qty     │ Unit Cost │ Total      │
   ├────────────────────────────┼─────────┼───────────┼────────────┤
   │ Laboratory Microscope      │ 5       │ £450.00   │ £2,250.00  │
   │ Pipette Tips 10-200µL      │ 10 box  │ £15.50    │ £155.00    │
   │ Safety Goggles             │ 25      │ £8.00     │ £200.00    │
   └────────────────────────────┴─────────┴───────────┴────────────┘

   Subtotal: £2,605.00
   VAT (20%): £521.00
   Order Total: £3,126.00

---

Step 4: Handle Delivery Charges
--------------------------------

Adding Delivery Costs
~~~~~~~~~~~~~~~~~~~~~~

If the supplier charges for delivery:

1. Scroll to **"Delivery Charge"** field
2. Enter delivery cost (excluding VAT): £25.00
3. System automatically:
   - Adds VAT to delivery charge
   - Distributes delivery cost across order items proportionally
   - Updates item costs

**Why Distribute Delivery Charges?**:
   - True cost per item includes delivery
   - Accurate inventory valuation
   - Better profitability calculations

**Example**:

.. code-block:: text

   BEFORE delivery charge:
   - Item A: £100.00 (50% of subtotal)
   - Item B: £100.00 (50% of subtotal)
   - Delivery: £0.00
   - Total: £200.00 + VAT

   AFTER £20.00 delivery charge added:
   - Item A: £110.00 (£100 + £10 allocated delivery)
   - Item B: £110.00 (£100 + £10 allocated delivery)
   - Delivery: £20.00 (distributed to items)
   - Total: £220.00 + VAT

.. note::
   **Proportional Allocation**: Delivery charge is split based on each item's percentage of the subtotal.

---

Step 5: Upload Invoice PDF (Optional)
--------------------------------------

Attaching Invoice Documents
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you have the supplier's invoice as a PDF:

1. Scroll to **"Upload Invoice"** section
2. Click **"Choose File"** button
3. Select PDF from your computer
4. File uploads automatically

**Supported Formats**:
   - PDF files only (.pdf)
   - Maximum size: 10MB

**Benefits**:
   - Keeps invoice with order for reference
   - Audit trail for accounting
   - Easy retrieval for disputes or returns

**What Gets Stored**:
   - Original PDF filename
   - Upload date and user
   - Link to download invoice later

.. tip::
   **Best Practice**: Always upload invoices when available. Makes reconciliation and audits much easier.

---

Step 6: Add Order Notes (Optional)
-----------------------------------

Internal Notes
~~~~~~~~~~~~~~

Use the **"Notes"** field for:

- Special instructions (e.g., "Deliver to Lab 204, not main office")
- Urgency (e.g., "Urgent - needed for class on 05/02")
- Payment details (e.g., "Paid via university purchase card #1234")
- Contact person (e.g., "Contact Dr. Smith for delivery")

**Example Notes**:

.. code-block:: text

   URGENT: Needed for Biology 101 lab on 05/02/2025
   Deliver to: Chemistry Building, Lab 204
   Contact: Dr. Smith (ext. 5678)
   Payment: University PO #UC-2025-00123

---

Step 7: Review and Create Order
--------------------------------

Final Review
~~~~~~~~~~~~

Before submitting:

1. **Double-check all items**:
   - Quantities correct?
   - Prices match supplier quote?
   - Unit costs exclude VAT (VAT added separately)?

2. **Verify totals**:
   - Subtotal matches your calculations
   - VAT calculated correctly
   - Delivery charge (if any) is correct

3. **Confirm supplier** (if selected):
   - Correct supplier selected
   - Contact details accurate

**Example Final Review**:

.. code-block:: text

   Purchase Order Summary
   =====================
   Supplier: Scientific Supplies Ltd
   Reference: PO-2025-BIO-001
   Order Date: 29/01/2025
   Expected Delivery: 05/02/2025

   Items: 3
   Subtotal: £2,605.00
   Delivery: £25.00
   VAT (20%): £526.00
   ──────────────────
   Total: £3,156.00

   Invoice: lab-equipment-invoice.pdf ✓
   Notes: URGENT - needed for class...

Submit the Order
~~~~~~~~~~~~~~~~

1. Click **"Create Purchase Order"** button (bottom of form)
2. Order is saved to database
3. **Order ID generated**: Example: O202501291234
4. Confirmation message appears
5. **Order Status**: Set to "Pending"

**What Happens Next**:
   - Order appears in Orders list with status "Pending"
   - Items remain at 0 stock until order received
   - You'll receive order later (Step 8)

.. success::
   **Order Created!** Your purchase order O202501291234 has been created successfully.

---

Step 8: Receiving the Order
----------------------------

When Items Arrive
~~~~~~~~~~~~~~~~~

When the physical items arrive from the supplier:

1. Navigate to **Orders** page
2. Find your order in the list (search by order ID or supplier)
3. Click **"Receive Order"** button next to the order

The Receiving Form
~~~~~~~~~~~~~~~~~~

You'll see a form showing:

- All ordered items with quantities
- Input fields for **received quantities**
- Notes field for discrepancies

**Step 8a: Enter Received Quantities**

For each item:

1. Check physical items received
2. Enter **actual quantity received** in the "Received" column
3. If quantity matches order, just confirm
4. If quantity differs, enter actual amount

**Example**:

.. code-block:: text

   Item: Laboratory Microscope
   Ordered: 5 pieces
   Received: [5] ← Enter actual received quantity

   Item: Pipette Tips
   Ordered: 10 boxes
   Received: [8] ← Only 8 boxes arrived (2 backordered)

**Step 8b: Handle Discrepancies**

If received quantity ≠ ordered quantity:

**Shortage (Less Than Ordered)**:
   - Enter actual quantity received
   - Add note explaining: "Only 8 boxes received, 2 on backorder"
   - Stock will be increased by actual received amount only

**Overage (More Than Ordered)**:
   - Enter actual quantity received (if accepting the extra)
   - Add note: "Supplier sent 12 instead of 10, keeping extras"
   - Or reject extras and enter ordered amount

**Damaged/Rejected Items**:
   - Don't count damaged items in received quantity
   - Add note: "2 boxes damaged in transit, rejected"
   - Contact supplier for replacement

**Step 8c: Add Receiving Notes** (if needed)

.. code-block:: text

   Receiving Notes:
   ────────────────
   - Delivery received 05/02/2025 10:30 AM
   - 2 boxes of pipette tips on backorder (supplier notified)
   - All items inspected and in good condition
   - Invoice matches order total

**Step 8d: Confirm Receipt**

1. Review all received quantities
2. Check notes are accurate
3. Click **"Confirm Receipt"** button

What Happens When You Confirm
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The system automatically:

1. **Updates Stock Levels**:
   - Each item's currentStock increased by received quantity
   - If ordered 5, received 5: stock +5
   - If ordered 10, received 8: stock +8

2. **Creates Stock Movement Records**:
   - Type: 'in' (stock coming in)
   - Reason: "Received Order #O202501291234"
   - Performed by: Your user ID
   - Timestamp: Current date/time
   - Full audit trail created

3. **Updates Order Status**:
   - Status changes from "Pending" to "Received"
   - Received date recorded
   - Received by: Your user ID

4. **Locks Order**:
   - Order becomes read-only
   - Cannot edit received quantities
   - Prevents accidental changes

**Example Stock Movement**:

.. code-block:: text

   Item: Laboratory Microscope (SKU: LAB-MICRO-001)

   Stock Movement Record Created:
   ───────────────────────────────
   Type: in
   Previous Stock: 3
   New Stock: 8 (3 + 5 received)
   Quantity: +5
   Reason: "Received Order #O202501291234"
   Performed By: manager@university.edu
   Timestamp: 05/02/2025 10:45:00

.. success::
   **Order Received!** Order O202501291234 has been marked as received. Stock levels updated for 3 items.

---

Step 9: Viewing Order History
------------------------------

Finding Orders
~~~~~~~~~~~~~~

**All Orders**:
   - Navigate to Orders page
   - See list of all orders (pending and received)

**Filtering Orders**:
   - **By Status**: Pending, Received, Cancelled
   - **By Supplier**: Select supplier from dropdown
   - **By Date Range**: Start date, End date
   - **By Search**: Order ID or reference number

**Example Filters**:

.. code-block:: text

   Filters:
   ├─ Status: Pending ✓
   ├─ Supplier: Scientific Supplies Ltd
   ├─ Date Range: 01/01/2025 - 31/01/2025
   └─ Search: "PO-2025"

   Results: 3 orders

Viewing Order Details
~~~~~~~~~~~~~~~~~~~~~

To see full order details:

1. Click on order ID or **"View Details"** button
2. Order details page opens

**What You See**:
   - Order header (ID, supplier, dates, status)
   - All order items with quantities and prices
   - Delivery charge (if any)
   - Totals (subtotal, VAT, grand total)
   - Invoice PDF (download link if uploaded)
   - Order notes
   - **Receiving information** (if received):
     * Received date
     * Received by (user)
     * Received quantities
     * Receiving notes
   - Stock movement links (audit trail)

**Example Order Details**:

.. code-block:: text

   Order #O202501291234
   ════════════════════
   Status: Received ✓
   Supplier: Scientific Supplies Ltd
   Order Date: 29/01/2025
   Received Date: 05/02/2025
   Received By: manager@university.edu
   Reference: PO-2025-BIO-001

   Items (3):
   ┌─────────────────────┬─────────┬──────────┬──────────┬─────────┐
   │ Item                │ Ordered │ Received │ Unit Cost│ Total   │
   ├─────────────────────┼─────────┼──────────┼──────────┼─────────┤
   │ Lab Microscope      │ 5       │ 5 ✓      │ £450.00  │ £2,250  │
   │ Pipette Tips        │ 10      │ 8 ⚠      │ £15.50   │ £155    │
   │ Safety Goggles      │ 25      │ 25 ✓     │ £8.00    │ £200    │
   └─────────────────────┴─────────┴──────────┴──────────┴─────────┘

   Subtotal: £2,605.00
   Delivery: £25.00
   VAT (20%): £526.00
   Total: £3,156.00

   Invoice: [Download lab-equipment-invoice.pdf]

   Receiving Notes:
   - 2 boxes pipette tips on backorder
   - All items inspected, good condition

Downloading Invoices
~~~~~~~~~~~~~~~~~~~~~

If invoice PDF was uploaded:

1. Click **"Download Invoice"** link
2. PDF downloads to your computer
3. Filename includes order ID for easy identification
4. Example: ``invoice-O202501291234.pdf``

---

Common Scenarios and Tips
-------------------------

Scenario 1: Partial Deliveries
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Situation**: Supplier delivers some items now, rest later

**Solution**:
   1. Receive order with actual quantities received
   2. Add note: "Partial delivery - 2 items on backorder ETA 12/02"
   3. For backordered items:
      - Option A: Create new order for remaining items (recommended)
      - Option B: Wait and manually adjust stock when backorder arrives

**Best Practice**: Create a new order for backordered items with reference to original order

Scenario 2: Wrong Items Received
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Situation**: Supplier sent wrong item or wrong quantity

**Solution**:
   1. **Do NOT receive** the order yet
   2. Contact supplier to resolve
   3. Once corrected items arrive, then receive order with actual quantities
   4. Add notes explaining the situation

**If Already Received**:
   - Use stock adjustments (Inventory page) to correct
   - Add detailed notes explaining the correction

Scenario 3: Recurring Orders
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Situation**: You order the same items regularly (e.g., monthly lab supplies)

**Tip**: Use reference numbers consistently:
   - Format: "MONTHLY-LAB-JAN2025", "MONTHLY-LAB-FEB2025"
   - Easy to find historical orders
   - Compare pricing over time

**Future Feature**: Order templates (coming soon - see roadmap)

Scenario 4: Emergency/Urgent Orders
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Best Practice**:
   1. Use reference number prefix: "URGENT-" or "PRIORITY-"
   2. Add clear notes with deadline and reason
   3. Include contact person for delivery
   4. Flag expected delivery date

**Example**:

.. code-block:: text

   Reference: URGENT-LAB-SAFETY-2025-02
   Notes: URGENT - Safety equipment for inspection on 08/02
          Contact: Dr. Smith (ext. 5678) for immediate delivery

---

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**"Cannot find item in search"**
   - Item may not exist yet
   - Use "Create New Item" instead of "Add Existing Item"
   - Check spelling and try SKU instead of name

**"Delivery charge not calculating correctly"**
   - Ensure delivery charge entered BEFORE reviewing totals
   - Refresh page if amount doesn't update
   - Check that items have subtotals (prices entered)

**"Cannot receive order"**
   - Check you have permission (Manager or Admin role)
   - Order must be in "Pending" status
   - Already received orders cannot be re-received

**"Stock didn't update after receiving"**
   - Check order status is "Received" (not "Pending")
   - Verify received quantities were entered
   - Check stock movements (click "View Audit Trail" on item)
   - Contact admin if issue persists

**"Invoice won't upload"**
   - Check file is PDF format
   - File size must be under 10MB
   - Try different browser if issue persists

---

Next Steps
----------

After Completing This Tutorial
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You now know how to:
   - ✓ Create purchase orders
   - ✓ Add items (existing and new)
   - ✓ Handle delivery charges and VAT
   - ✓ Upload invoices
   - ✓ Receive orders and update stock
   - ✓ View order history

**Related Tutorials**:
   - :doc:`managing-inventory` - Learn how to manage item details and stock
   - :doc:`taking-sales` - Learn how to process sales and quotes

**Related Guides**:
   - :doc:`/user-guide/orders-management` - Detailed reference for all order features
   - :doc:`/admin/user-management` - Managing user permissions for orders

**Need Help?**
   - See :doc:`/reference/faq` for common questions
   - Email: inventory-support@university.edu

---

Quick Reference Card
--------------------

Order Creation Checklist
~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   □ Select supplier (or leave blank)
   □ Set order date and reference number
   □ Add all items with quantities and prices
   □ Add delivery charge (if any)
   □ Upload invoice PDF (if available)
   □ Add notes (if needed)
   □ Review totals
   □ Click "Create Purchase Order"

Receiving Checklist
~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   □ Physical items arrived
   □ Find order in Orders list
   □ Click "Receive Order"
   □ Enter actual received quantities
   □ Add notes for any discrepancies
   □ Click "Confirm Receipt"
   □ Verify stock levels updated

Key Keyboard Shortcuts
~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Shortcut
     - Action
   * - Ctrl + F
     - Focus search box
   * - Tab
     - Navigate between fields
   * - Enter
     - Submit form (when focused on button)
   * - Esc
     - Close dialog/cancel action
