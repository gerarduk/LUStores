=======================
Bulk Label Printing
=======================

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

The Bulk Label Printing feature allows you to generate and print QR code labels for multiple inventory items simultaneously. This feature is essential for efficiently deploying a QR code-based inventory system across your warehouse or facility.

**Key Benefits:**

- ⚡ **Time Savings:** Generate hundreds of labels in minutes instead of hours
- 🎯 **Selective Printing:** Filter items by category, location, or status
- 👁️ **Preview First:** Review all labels before committing to print
- 📄 **Print-Optimized:** Labels automatically format for A4 paper (3 per row)
- 🏷️ **Complete Information:** Each label includes QR code, name, SKU, location, and description

Use Cases
---------

**Initial Deployment**
   Print labels for all active inventory items when first implementing the QR system.

**New Item Batches**
   Generate labels for newly added items after receiving shipments.

**Location-Based Printing**
   Print labels for items in a specific warehouse location during reorganization.

**Replacement Labels**
   Reprint labels that have been damaged, faded, or lost.

**Category-Specific Labels**
   Print labels for a specific category (e.g., all Electronics items).

Prerequisites
=============

**Access Requirements:**

- **User Role:** Admin
- **Authenticated Session:** Must be logged in
- **Permissions:** Settings access

**Equipment Needed:**

- **Printer:** Standard office printer (laser or inkjet)
- **Paper:** A4 size paper (210mm × 297mm)
- **Optional:** Label sheets compatible with A4 paper (70mm × 40mm labels)

.. note::
   While the system is optimized for A4 paper, it also works with US Letter size (8.5" × 11") with minimal margin differences.

Accessing Bulk Label Printing
==============================

**Navigation Method 1: Settings Menu**

1. Click your **profile icon** in the top-right corner
2. Select **Settings** from the dropdown
3. Click the **Label Printing** tab

**Navigation Method 2: Direct URL**

Navigate to ``/settings`` and click **Label Printing** tab

Using the Label Printing Feature
=================================

Step 1: Select Filters
-----------------------

The first step is to filter which items you want to print labels for.

**Category Filter**

Filter items by their assigned category:

1. Click the **Category** dropdown
2. Select a specific category (e.g., "Electronics", "Chemicals", "Consumables")
3. Or select **"All Categories"** to include items from all categories

**Example:** Print labels only for "Office Supplies" category items.

**Location Filter**

Filter items by their physical location:

1. Click the **Location** dropdown
2. Select a specific location (e.g., "Lab-A-Shelf-3", "Storage-Room-2")
3. Or select **"All Locations"** to include items from all locations

**Example:** Print labels for all items in "Lab-B" to reorganize that laboratory.

.. tip::
   **Location Naming Convention:** Use a consistent format like ``Room-Section-Shelf`` (e.g., ``Lab-A-Shelf-3``) for easier filtering and organization.

**Status Filter**

Filter items by their active/inactive status:

- **All:** Include both active and inactive items
- **Active Only:** Only include items currently in use (default)
- **Inactive Only:** Only include items that have been deactivated

**Recommendation:** Use "Active Only" to avoid printing labels for discontinued items.

**Item Count Badge**

As you adjust filters, the **item count badge** updates in real-time showing how many items match your criteria:

.. code-block:: text

   [42 items match your filters]

**Example:** If you select Category="Electronics" and Status="Active", you might see "23 items match your filters".

Step 2: Generate Labels
------------------------

Once you've configured your filters, generate the QR code labels.

1. Review the **item count** to ensure you're printing the correct number of labels
2. Click **Generate Labels** button
3. A **loading spinner** appears with "Generating..." text
4. QR code generation occurs (typically 5-10ms per item)
5. A **success toast** notification appears when complete

**Generation Time Estimates:**

===================  ===================  =================
Item Count           Generation Time      User Experience
===================  ===================  =================
1-50 items           < 1 second           Instant
51-100 items         1-2 seconds          Very fast
101-200 items        2-4 seconds          Fast
201-500 items        5-10 seconds         Acceptable
500+ items           10+ seconds          Confirmation dialog
===================  ===================  =================

**Large Batch Confirmation:**

If you select more than 200 items, a confirmation dialog appears:

.. code-block:: text

   You have 342 items selected. Generating this many QR codes may take a while. Continue?

   [Cancel]  [Continue]

This prevents accidental generation of very large label sets.

Step 3: Review Preview
----------------------

After generation completes, a **preview section** appears below the filters.

**Preview Features:**

- **Scrollable Container:** Preview area has a fixed height (500px) with vertical scroll
- **Grid Layout:** Labels displayed in responsive grid (matches print layout)
- **Item Count:** Header shows "Preview (42 labels)" with total count
- **Visual Accuracy:** Labels appear exactly as they will print

**What Each Label Shows:**

===================  =====================================
Element              Description
===================  =====================================
**QR Code**          30mm × 30mm QR code encoding the SKU
**Item Name**        Full item name (truncated if > 2 lines)
**SKU**              Stock Keeping Unit code
**Location**         Physical location (e.g., Lab-A-Shelf-3)
**Description**      Item description (truncated if > 2 lines)
===================  =====================================

**Review Checklist:**

✅ Verify QR codes are visible and properly sized
✅ Check item names are correct
✅ Confirm SKUs match your records
✅ Ensure locations are accurate
✅ Review descriptions for completeness

.. warning::
   **Missing Data Handling:** If an item lacks a location or description, the label displays "N/A" or an empty field. Consider updating item data before printing.

Step 4: Print Labels
--------------------

Once you've reviewed the preview, print the labels.

1. Click **Print Labels** button (enabled only after generation)
2. Browser **print dialog** opens automatically
3. **Configure print settings** (see next section)
4. Click **Print** in the browser dialog
5. Labels print to your selected printer

**Print Settings to Configure:**

====================  ===============================
Setting               Recommendation
====================  ===============================
**Destination**       Select your printer
**Pages**             All pages
**Color**             Black & white (sufficient for QR codes)
**Paper Size**        A4 (or Letter)
**Orientation**       Portrait
**Margins**           Default (5mm)
**Scale**             100% (do not scale)
====================  ===============================

.. tip::
   **Print to PDF First:** Before printing to physical paper, print to PDF to verify layout. This saves paper and toner when testing.

Print Specifications
====================

Layout Details
--------------

The label printing system uses a **fixed grid layout** optimized for A4 paper:

===================  ===================
Specification        Value
===================  ===================
**Labels per Row**   3
**Rows per Page**    7
**Labels per Page**  21
**Label Width**      70mm
**Label Height**     40mm
**QR Code Size**     30mm × 30mm
**Margin**           5mm around page
**Gap**              None (labels are adjacent)
===================  ===================

**Paper Utilization:**

- **A4 Paper:** 210mm × 297mm
- **Usable Area:** 200mm × 287mm (after 5mm margins)
- **Efficiency:** 95% paper utilization
- **Waste:** Minimal (~5% margins)

Label Content Layout
--------------------

Each label follows this structure:

.. code-block:: text

   ┌──────────────────────────────┐
   │ Item Name (Bold, 11pt)       │
   │                               │
   │  ┌──────┐   SKU: ABC-123     │
   │  │  QR  │   Loc: Lab-A-2     │
   │  │ CODE │                     │
   │  └──────┘                     │
   │                               │
   │ Description text here...      │
   │ (8pt, gray, max 2 lines)     │
   └──────────────────────────────┘

**Typography:**

- **Item Name:** 11pt bold, black, truncated after 2 lines
- **SKU/Location:** 9pt monospace, black
- **Description:** 8pt, gray (#6B7280), truncated after 2 lines
- **QR Code:** 120px × 120px (30mm × 30mm at 96 DPI)

QR Code Details
---------------

**QR Code Contents:**

Each QR code encodes the item's **SKU** (Stock Keeping Unit) as plain text.

**Example:** If an item has SKU ``LAB-CHEM-001``, scanning the QR code returns the text string ``LAB-CHEM-001``.

**QR Code Configuration:**

- **Width:** 120 pixels (30mm at 96 DPI)
- **Margin:** 1 module (minimum white space around QR code)
- **Error Correction:** Medium (default, ~15% correction)
- **Color:** Black foreground, white background
- **Format:** PNG data URL embedded in HTML

**Scanning Compatibility:**

The generated QR codes are compatible with:

- ✅ Smartphone cameras (iOS Camera app, Android native)
- ✅ Dedicated barcode scanners
- ✅ LUStores mobile barcode scanner (BarcodeScanner component)
- ✅ Third-party QR code scanner apps

Best Practices
==============

Planning Your Label Deployment
-------------------------------

**1. Inventory Audit First**
   Before printing labels, audit your inventory to ensure:

   - All items have accurate locations
   - SKUs are unique and correct
   - Descriptions are complete
   - Inactive items are marked inactive

**2. Print in Batches**
   Instead of printing all labels at once:

   - Print by category or location
   - Verify first batch scans correctly
   - Adjust label format if needed
   - Continue with remaining batches

**3. Label Organization**
   After printing:

   - Cut labels carefully
   - Organize by location before applying
   - Keep extras for replacements
   - Store unused labels in a dry, dark place

Label Application
-----------------

**Placement Guidelines:**

✅ **Do:**
- Apply labels to flat, clean surfaces
- Use the same placement on all items (consistency)
- Apply at eye level when possible
- Keep labels away from moisture/heat
- Ensure QR codes are not folded or creased

❌ **Don't:**
- Apply labels to curved surfaces (QR codes may distort)
- Cover labels with tape or plastic (reflections interfere with scanning)
- Apply in direct sunlight (labels fade faster)
- Apply to dirty/greasy surfaces (labels won't stick)

**Adhesive Options:**

=====================  ==========================  ====================
Adhesive Type          Best For                    Durability
=====================  ==========================  ====================
**Self-adhesive**      Most surfaces               Permanent
**Removable labels**   Temporary or changing items Easily repositioned
**Laminated labels**   Outdoor or harsh conditions Weatherproof
**Magnetic labels**    Metal surfaces              Removable
=====================  ==========================  ====================

Testing QR Codes
----------------

After applying labels, test QR code scanning:

**Method 1: Smartphone Camera**

1. Open your phone's camera app
2. Point camera at QR code
3. Tap the notification/banner that appears
4. Verify it displays the correct SKU

**Method 2: LUStores Scanner**

1. Navigate to **Sales** page in LUStores
2. Click **Browse Items** tab
3. Click **Scan Barcode** button
4. Point camera at QR code
5. Verify item is added to quote with correct details

**Method 3: Dedicated Scanner**

1. Configure scanner to output as keyboard input
2. Click in a text field
3. Scan QR code
4. Verify SKU appears in the text field

If scanning fails, see Troubleshooting section.

Maintenance and Replacement
----------------------------

**Label Lifespan:**

==================  ==================  =====================
Environment         Expected Lifespan   Replacement Schedule
==================  ==================  =====================
**Indoor Office**   2-3 years           As needed
**Warehouse**       1-2 years           Annual audit
**Laboratory**      6-12 months         Bi-annual check
**Outdoor**         3-6 months          Quarterly
==================  ==================  =====================

**Signs Labels Need Replacement:**

- QR code no longer scans reliably
- Label is faded or discolored
- Label is torn, creased, or peeling
- Text is illegible
- Adhesive has failed

Troubleshooting
===============

Common Issues
-------------

**QR Codes Won't Scan**

**Symptoms:**
- Smartphone camera doesn't recognize QR code
- Scanner beeps but doesn't capture SKU
- Multiple scan attempts required

**Solutions:**

1. **Check QR Code Size:** Ensure printed QR codes are at least 25mm × 25mm

   - If too small, adjust browser zoom before printing
   - Print at 100% scale (no scaling)

2. **Verify Print Quality:** QR codes should be sharp, not fuzzy

   - Use higher printer quality setting
   - Replace low toner/ink cartridges
   - Use better quality paper

3. **Test Different Scanners:** Some scanners perform better than others

   - Try smartphone camera app
   - Try LUStores mobile scanner
   - Try dedicated barcode scanner

4. **Improve Lighting:** QR codes need adequate lighting to scan

   - Avoid shadows over the QR code
   - Avoid glare from overhead lights
   - Use indirect lighting

5. **Check QR Code Integrity:** Ensure QR code is not damaged

   - No folds or creases
   - No marks or stains
   - Not covered by tape or lamination with glare

**Labels Per Row Incorrect**

**Symptoms:**
- Labels not aligned in 3-column layout
- Labels cut off at page edges
- Uneven spacing between labels

**Solutions:**

1. **Browser Print Settings:**

   - Set paper size to A4 (210mm × 297mm)
   - Set margins to Default (5mm)
   - Set scale to 100% (no scaling)
   - Disable "Headers and Footers"
   - Disable "Background Graphics" (optional)

2. **Printer Configuration:**

   - Verify printer paper size setting matches A4
   - Check printer driver for custom margins
   - Use printer's "borderless" mode if available

3. **Browser Compatibility:**

   - Works best in **Chrome** or **Edge**
   - Firefox may have slight layout differences
   - Safari (macOS) may require manual margin adjustment

**Preview Shows Incorrect Data**

**Symptoms:**
- Item names don't match expected items
- SKUs appear incorrect
- Locations show old data

**Solutions:**

1. **Refresh Filters:** Clear filters and reapply them

   - Click **Clear Filters** button
   - Reselect desired filters
   - Click **Generate Labels** again

2. **Verify Inventory Data:** Check item details in Inventory page

   - Navigate to **Inventory**
   - Search for the item in question
   - Verify name, SKU, location are correct
   - Update if needed, then regenerate labels

3. **Clear Browser Cache:** Cached data may be stale

   - Press ``Ctrl+Shift+R`` (Windows/Linux) or ``Cmd+Shift+R`` (macOS) to hard refresh
   - Or clear browser cache in settings
   - Log out and log back in

**Generation Takes Too Long**

**Symptoms:**
- "Generating..." spinner runs for more than 30 seconds
- Browser becomes unresponsive
- Page freezes

**Solutions:**

1. **Reduce Batch Size:** Generate labels in smaller batches

   - Instead of 500 items, try 100 at a time
   - Use more specific filters to reduce item count

2. **Close Other Tabs:** Free up browser resources

   - Close unnecessary browser tabs
   - Close other applications

3. **Use Modern Browser:** Older browsers may be slower

   - Update to latest Chrome, Edge, or Firefox
   - Avoid Internet Explorer

**Print Dialog Doesn't Open**

**Symptoms:**
- Clicking "Print Labels" button does nothing
- No print dialog appears
- No error message shown

**Solutions:**

1. **Check Browser Pop-up Blocker:**

   - Allow pop-ups for LUStores domain
   - Check browser address bar for blocked pop-up icon

2. **Browser Permissions:**

   - Grant print permission to LUStores
   - Check browser settings > Site Permissions

3. **Try Keyboard Shortcut:**

   - With preview visible, press ``Ctrl+P`` (Windows/Linux) or ``Cmd+P`` (macOS) manually

Advanced Usage
==============

Custom Label Sizes (Future)
----------------------------

Future releases may support custom label sizes:

- Avery label templates (5160, 5161, 5162, etc.)
- Custom dimensions (configurable width/height)
- Different layouts (2-per-row, 4-per-row)

Exporting Labels as PDF (Future)
---------------------------------

Future releases may include:

- **Save as PDF** button to generate downloadable PDF
- Batch PDF generation for record-keeping
- Email PDF to specific recipients

Label Templates (Future)
-------------------------

Future releases may allow:

- Multiple label layouts (QR on left, QR on top, etc.)
- Customizable fields (show/hide description, location, etc.)
- Barcode + QR code hybrid labels

Integration with Mobile Scanner
================================

Labels printed from this feature work seamlessly with the LUStores mobile barcode scanner.

**Workflow:**

1. Print labels using Bulk Label Printing
2. Apply labels to physical items
3. Use Mobile Scanner to add items to quotes
4. Scanner reads QR code → retrieves item → adds to quote

See :doc:`../MOBILE_SCANNER_GUIDE` for detailed mobile scanning workflows.

Related Documentation
=====================

- :doc:`settings-guide` - Settings page overview (Tab 9 covers Label Printing)
- :doc:`inventory` - Managing inventory items and locations
- :doc:`../MOBILE_SCANNER_GUIDE` - Using the mobile barcode scanner
- :doc:`../tutorials/managing-inventory` - Inventory management tutorials

Summary
=======

The Bulk Label Printing feature provides a complete solution for deploying QR code labels across your inventory:

✅ **Filter items** by category, location, and status
✅ **Generate QR codes** for multiple items simultaneously
✅ **Preview labels** before printing
✅ **Print optimized layouts** (3 labels per row on A4 paper)
✅ **Test QR codes** with mobile devices and scanners

**Key Takeaways:**

1. **Start Small:** Print test batches before full deployment
2. **Verify Data:** Ensure inventory data is accurate before printing
3. **Test Scanning:** Verify QR codes scan correctly after applying labels
4. **Maintain Labels:** Replace damaged or faded labels regularly
5. **Use Filters:** Leverage category and location filters for targeted printing

For questions or issues, see :doc:`../reference/troubleshooting` or contact your system administrator.
