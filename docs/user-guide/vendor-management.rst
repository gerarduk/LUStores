====================
Vendor Management
====================

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

The Vendor Management system (also called Suppliers) allows you to track your relationships with external suppliers, manage contact information, and associate items with their vendors for procurement planning.

**Key Features:**

- 📇 Centralized vendor contact database
- 🔗 Link items to their suppliers
- 💰 Track pricing per supplier
- 📝 Add notes to vendor records
- 📦 View order history per vendor
- ✅ Safe deletion with conflict checking

Use Cases
=========

**Procurement Planning**
   Identify which vendors supply specific items when placing orders.

**Price Comparison**
   Compare pricing across multiple vendors for the same item.

**Vendor Performance Tracking**
   Document vendor reliability, quality, and service through notes.

**Contact Management**
   Maintain up-to-date contact information for ordering and support.

**Order History**
   Review past orders from each vendor to identify patterns.

Prerequisites
=============

**Access Requirements:**

- **User Role:** User, Superuser, or Admin
- **Permissions:** ``suppliers.view``, ``suppliers.manage``
- **Authenticated Session:** Must be logged in

Accessing Vendor Management
============================

**Navigation Method 1: Main Menu**

1. Click **Vendors** or **Suppliers** in the main navigation
2. Or navigate to ``/suppliers`` or ``/vendors``

**Navigation Method 2: From Orders**

1. Navigate to **Orders** page
2. Click on an order
3. Click vendor name to view vendor details

Creating a Vendor
=================

Step-by-Step
------------

1. **Navigate to Vendors Page**

   - Click **Vendors** in main navigation

2. **Click Add Vendor**

   - Button located at top-right of page
   - **Add Vendor** or **+ New Vendor** button

3. **Fill in Vendor Information**

   **Required Fields:**

   - **Name:** Vendor business name

   **Optional Fields:**

   - **Contact Person:** Primary contact name
   - **Email:** Vendor email address
   - **Phone:** Vendor phone number
   - **Address:** Physical or mailing address
   - **Account Number:** Your customer account number with this vendor
   - **Website:** Vendor website URL
   - **Notes:** Any additional information

4. **Save Vendor**

   - Click **Save** button
   - Success toast appears: "Vendor created successfully"
   - Redirected to vendor list or vendor detail page

Vendor Information Fields
--------------------------

=====================  =================================  ==============
Field                  Description                        Required
=====================  =================================  ==============
**Name**               Vendor business name               Yes
**Contact Person**     Primary point of contact           No
**Email**              Vendor email address               No
**Phone**              Phone number                       No
**Address**            Full mailing/physical address      No
**Account Number**     Your account # with vendor         No
**Website**            Vendor website URL                 No
**Notes**              Additional information             No
=====================  =================================  ==============

**Best Practices:**

- Use official business name for consistency
- Include full contact details to avoid delays
- Store account numbers for faster ordering
- Add notes for special ordering instructions

**Example:**

.. code-block:: text

   Name: Scientific Supplies Ltd
   Contact: John Smith
   Email: orders@scisupplies.co.uk
   Phone: +44 20 1234 5678
   Address: 123 Lab Street, London, UK, SW1A 1AA
   Account Number: CUST-98765
   Website: https://www.scisupplies.co.uk
   Notes: Minimum order £50. Free shipping on orders >£500. Account rep: Jane Doe (ext. 234)

Viewing Vendors
===============

Vendor List
-----------

The Vendors page displays all vendors in a table:

**Table Columns:**

===================  =======================================
Column               Description
===================  =======================================
**Name**             Vendor business name
**Contact**          Contact person name
**Email**            Email address
**Phone**            Phone number
**Items**            Count of items from this vendor
**Orders**           Count of orders placed with vendor
**Actions**          Edit, Delete, View Details
===================  =======================================

**Sorting:**

- Click column headers to sort
- Default: Alphabetical by name

**Search:**

- Search box filters vendors by name, contact, or email
- Real-time filtering as you type

Vendor Detail Page
------------------

Click a vendor name to view detailed information:

**Sections:**

1. **Vendor Information** - Contact details, account number
2. **Associated Items** - Items supplied by this vendor with pricing
3. **Order History** - Past orders from this vendor
4. **Notes** - Vendor notes (see :doc:`notes-system`)
5. **Actions** - Edit, Delete buttons

Editing a Vendor
================

1. **Navigate to Vendor**

   - From vendor list, click **Edit** in Actions column
   - Or from vendor detail page, click **Edit Vendor**

2. **Modify Fields**

   - Update any vendor information
   - Fields are the same as creation form

3. **Save Changes**

   - Click **Save** button
   - Success toast: "Vendor updated successfully"
   - Changes appear immediately

.. note::
   Changes to vendor information do not affect past orders. Historical order data preserves the vendor details at the time of order creation.

Linking Items to Vendors
=========================

Items can be associated with multiple vendors to track pricing and availability.

Method 1: From Vendor Detail Page
----------------------------------

1. **Navigate to Vendor Detail Page**

2. **Click "Add Item" or "Link Item"**

3. **Search for Item**

   - Type item name or SKU
   - Select item from dropdown

4. **Enter Pricing (Optional)**

   - **Supplier Price:** Price this vendor charges
   - **Currency:** (if multi-currency supported)

5. **Save**

   - Click **Save** or **Add**
   - Item appears in vendor's "Associated Items" list

Method 2: From Item Edit Page
------------------------------

1. **Navigate to Inventory**

2. **Edit an Item**

3. **Scroll to "Suppliers" Section**

4. **Add Supplier**

   - Click **Add Supplier**
   - Select vendor from dropdown
   - Enter price
   - Save

**Result:** Item now linked to vendor

Viewing Item-Vendor Relationships
----------------------------------

**From Vendor Page:**

- View all items supplied by this vendor
- See pricing per item
- Compare if item is available from multiple vendors

**From Item Page:**

- View all vendors who supply this item
- Compare prices across vendors
- Identify preferred vendor

**Use Case:**

When placing an order, check which vendor has the best price for items you need.

Managing Vendor Notes
=====================

Vendors support the Notes System for tracking important information:

**Common Note Types:**

- Ordering instructions (e.g., "Requires PO# in email")
- Contact preferences (e.g., "Email only, no phone calls")
- Quality issues (e.g., "Last shipment had packaging damage")
- Delivery terms (e.g., "2-week lead time on custom items")
- Account details (e.g., "Credit terms: Net 30")

**Adding Notes to Vendors:**

1. Navigate to **Vendor Detail Page**
2. Click **Notes** tab or **Add Note** button
3. Enter note text
4. Click **Save**

See :doc:`notes-system` for complete notes documentation.

Viewing Order History
=====================

Each vendor has an order history showing past purchases:

**Order History Table:**

===================  =======================================
Column               Description
===================  =======================================
**Order ID**         Unique order identifier
**Date**             Order placement date
**Items**            Number of items in order
**Total**            Order total amount
**Status**           Pending, Received, Cancelled
**Actions**          View order details
===================  =======================================

**Use Cases:**

- Review vendor reliability (on-time delivery)
- Identify recurring orders for bulk negotiation
- Track spending per vendor over time
- Verify past order details

Deleting a Vendor
=================

Safe Deletion
-------------

LUStores uses **safe deletion** to prevent data integrity issues:

1. **Click Delete**

   - From vendor list, click **Delete** in Actions column
   - Or from vendor detail page, click **Delete Vendor**

2. **Safety Check Runs**

   - System checks for dependencies:

     - Active orders from this vendor
     - Items linked to this vendor
     - Historical order references

3. **Conflict Report**

   If conflicts exist, a dialog shows:

   .. code-block:: text

      Cannot Delete Vendor

      This vendor cannot be deleted because:
      - 15 items are linked to this vendor
      - 3 orders reference this vendor

      Suggested Actions:
      - Unlink items from this vendor first
      - Keep vendor for historical records
      - Mark vendor as "Inactive" instead

4. **Confirm Deletion**

   If no conflicts, confirmation dialog appears:

   .. code-block:: text

      Delete Vendor

      Are you sure you want to delete "Scientific Supplies Ltd"?
      This action cannot be undone.

      [Cancel]  [Delete]

5. **Deletion Complete**

   - Vendor removed from database
   - Success toast: "Vendor deleted successfully"

Inactive Vendors (Alternative to Deletion)
-------------------------------------------

Instead of deleting vendors, consider marking them as **inactive**:

**Benefits:**

- Preserves historical order data
- Maintains item-vendor relationships
- Can be reactivated if needed
- Safer than permanent deletion

**How to Mark Inactive:**

1. Edit vendor
2. Add note: "INACTIVE - No longer using this supplier as of YYYY-MM-DD"
3. Or add "Inactive" to vendor name: "Scientific Supplies Ltd (INACTIVE)"
4. Save

**Filtering:**

- Use search to exclude inactive vendors from view

Best Practices
==============

Vendor Data Management
----------------------

✅ **Do:**

- Keep contact information up-to-date
- Document account numbers for faster ordering
- Use consistent naming (official business names)
- Add notes for special ordering procedures
- Review vendor performance regularly

❌ **Don't:**

- Delete vendors with order history
- Create duplicate vendor records
- Store sensitive information (credit cards) in notes
- Leave contact fields empty

Price Tracking
--------------

**Maintain Supplier Prices:**

- Update prices when vendor sends new price lists
- Compare prices across vendors for the same item
- Note effective dates in vendor notes

**Use Case:**

.. code-block:: text

   Vendor Note: "Price list updated 2025-01-01. 5% increase across all items."

**Price Comparison Workflow:**

1. View item detail page
2. Check "Suppliers" section
3. Compare prices from multiple vendors
4. Select best price when ordering

Vendor Performance
------------------

**Track Vendor Reliability:**

- Add notes for delivery issues
- Document quality problems
- Record positive experiences too

**Example Notes:**

.. code-block:: text

   ✅ "Delivered 2 days early. Excellent packaging. 2025-01-10"

   ❌ "Shipment damaged. Replacement took 3 weeks. RMA #12345. 2025-01-05"

**Vendor Review Schedule:**

- **Quarterly:** Review all vendors for performance
- **Annually:** Renegotiate terms with top vendors
- **As Needed:** Address quality or delivery issues immediately

Troubleshooting
===============

Common Issues
-------------

**Cannot Find Vendor**

**Solutions:**

1. Check spelling in search box
2. Try partial name search
3. Check if vendor was deleted
4. Verify you have ``suppliers.view`` permission

**Cannot Link Item to Vendor**

**Solutions:**

1. Verify item exists and is active
2. Check if relationship already exists
3. Ensure you have ``suppliers.manage`` permission

**Cannot Delete Vendor**

**Solutions:**

1. Review conflict report for dependencies
2. Unlink items first if needed
3. Keep vendor for historical records (recommended)
4. Mark as inactive instead of deleting

**Order History Not Showing**

**Solutions:**

1. Verify orders exist from this vendor
2. Check date range filters (if applicable)
3. Refresh page
4. Verify ``orders.view`` permission

Integration with Orders
=======================

Vendors are tightly integrated with the Orders system:

**Creating an Order:**

1. Navigate to **Orders** page
2. Click **New Order**
3. Select **Vendor** from dropdown
4. Vendor contact details auto-populate
5. Add items from this vendor
6. Submit order

**See also:** :doc:`orders-management` for complete order workflows.

Related Documentation
=====================

- :doc:`orders-management` - Purchase order management
- :doc:`inventory` - Managing inventory items
- :doc:`notes-system` - Adding notes to vendors
- :doc:`../api/endpoints` - Vendor API endpoints

Summary
=======

The Vendor Management system provides comprehensive supplier tracking:

✅ **Centralized database** of vendor contact information
✅ **Item-vendor linking** with pricing
✅ **Order history** per vendor
✅ **Notes system** for tracking vendor details
✅ **Safe deletion** prevents data integrity issues
✅ **Price comparison** across multiple vendors

**Key Workflows:**

1. Create vendor with contact information
2. Link items to vendors with pricing
3. View vendor details and order history
4. Add notes for special instructions
5. Compare prices when placing orders
6. Track vendor performance over time

For API access to vendor data, see :doc:`../api/endpoints`.
