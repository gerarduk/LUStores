========================
Reports & Analytics
========================

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

The Reports & Analytics system provides comprehensive insights into your inventory, sales, and procurement activities. LUStores offers two main reporting interfaces:

1. **Reports Page** - Detailed sales reports, filtering, and payment tracking
2. **Sales Analytics Page** - Visual dashboards and trend analysis

**Key Capabilities:**

- 📊 Sales reports by charge code, time period, and category
- 💰 Payment reconciliation (paid vs unpaid sales)
- 📈 Trend analysis and forecasting
- 📑 Excel export for external analysis
- 🔍 Drill-down into specific transactions
- 📅 Custom date range reporting

Prerequisites
=============

**Access Requirements:**

- **User Role:** User, Superuser, or Admin
- **Permissions:** ``reports.view``, ``sales.view``
- **Authenticated Session:** Must be logged in

**Data Requirements:**

- Sales data must exist (completed transactions)
- Charge codes must be associated with sales
- Items must be categorized for category-level reports

Reports Page
============

The Reports page (``/reports``) provides detailed, filterable sales reports with payment tracking capabilities.

Accessing the Reports Page
---------------------------

**Navigation:**

1. Click **Reports** in the main navigation menu, or
2. Navigate directly to ``/reports``

Page Layout
-----------

The Reports page consists of three main sections:

1. **Filter Controls** (Top) - Date range, charge code, paid/unpaid filters
2. **Summary Cards** (Middle) - Key metrics (total revenue, transaction count, etc.)
3. **Data Table** (Bottom) - Detailed transaction list with actions

Filter Controls
===============

Date Range Filters
------------------

Select the time period for your report:

**Quick Filters:**

======================  ========================
Filter                  Date Range
======================  ========================
**Today**               Current day (00:00 - 23:59)
**Last 7 Days**         Previous 7 days
**Last 30 Days**        Previous 30 days
**This Month**          Current calendar month
**Last Month**          Previous calendar month
**This Quarter**        Current fiscal quarter
**This Year**           Current calendar year
**Custom Range**        User-defined start/end dates
======================  ========================

**Using Custom Date Range:**

1. Click **Custom Range** button
2. Select **Start Date** from date picker
3. Select **End Date** from date picker
4. Click **Apply**
5. Report updates with selected range

.. tip::
   **Keyboard Shortcut:** Press ``Ctrl+D`` (Windows/Linux) or ``Cmd+D`` (macOS) to quickly open the date range picker.

Charge Code Filter
------------------

Filter sales by charge code:

1. Click **Charge Code** dropdown
2. Select specific charge code (e.g., "PROJ-2024-001")
3. Or select **"All Charge Codes"** to show all sales

**Use Cases:**

- Track spending for a specific project
- Generate invoices per charge code
- Monitor charge code usage patterns
- Identify charge codes nearing budget limits

Paid/Unpaid Filter
------------------

Filter sales by payment status:

**Filter Options:**

- **All Sales** - Show both paid and unpaid transactions (default)
- **Paid Only** - Show only sales marked as paid
- **Unpaid Only** - Show only sales awaiting payment

**Use Case:**

Generate a list of unpaid sales to follow up with accounts payable.

Category Filter
---------------

Filter by item category (if items in sale belong to specific category):

1. Click **Category** dropdown
2. Select category (e.g., "Electronics", "Chemicals")
3. Or select **"All Categories"**

**Note:** Sales are included if **any item** in the sale belongs to the selected category.

Summary Cards
=============

After applying filters, summary cards display key metrics:

Total Revenue
-------------

Total monetary value of all sales in the selected period.

**Calculation:**

.. code-block:: text

   Total Revenue = Σ (sale.totalAmount)

**Includes:** VAT if configured as VAT-inclusive pricing

**Display Format:** ``£12,345.67``

Total Transactions
------------------

Count of individual sale transactions.

**Calculation:**

.. code-block:: text

   Total Transactions = COUNT(sales)

**Display Format:** ``142 transactions``

Average Order Value (AOV)
--------------------------

Average revenue per transaction.

**Calculation:**

.. code-block:: text

   AOV = Total Revenue ÷ Total Transactions

**Display Format:** ``£87.34``

**Interpretation:**
- **High AOV:** Customers purchasing more items per transaction
- **Low AOV:** Frequent small transactions
- **Trends:** Track AOV over time to identify patterns

Total Items Sold
----------------

Total quantity of items across all sales.

**Calculation:**

.. code-block:: text

   Total Items Sold = Σ (sale_item.quantity)

**Display Format:** ``1,234 items``

**Note:** Accounts for decimal quantities (e.g., 2.5kg counts as 2.5 items)

Unpaid Sales
------------

Count and total value of sales not yet marked as paid.

**Display:**

.. code-block:: text

   23 Unpaid Sales (£1,456.78)

**Color Coding:**
- **Red:** High unpaid value (>£1000)
- **Orange:** Medium unpaid value (£500-£1000)
- **Gray:** Low/no unpaid value

VAT Collected
-------------

Total VAT amount collected across all sales (if VAT is enabled).

**Calculation:**

.. code-block:: text

   VAT Collected = Σ (sale.vatAmount)

**Display Format:** ``£2,469.13``

Data Table
==========

The data table displays individual sale transactions with details and actions.

Table Columns
-------------

======================  ========================================
Column                  Description
======================  ========================================
**Sale ID**             Unique sale identifier (S20250112...)
**Date**                Sale completion date and time
**Charge Code**         Associated charge code
**Items**               Number of line items in sale
**Total**               Sale total amount (inc. VAT)
**VAT**                 VAT amount charged
**Status**              Paid/Unpaid badge
**Actions**             Mark as paid, view details, export
======================  ========================================

Sorting
-------

Click column headers to sort:

- **First Click:** Sort ascending
- **Second Click:** Sort descending
- **Third Click:** Reset to default

**Default Sort:** Date (most recent first)

Pagination
----------

Navigate through large datasets:

- **Rows per page:** 10, 25, 50, 100 (default: 25)
- **Page navigation:** Previous/Next buttons
- **Page indicator:** "Showing 1-25 of 142 results"

Marking Sales as Paid
======================

Individual Mark as Paid
------------------------

Mark a single sale as paid:

1. Locate the sale in the data table
2. Click **Mark as Paid** button in the Actions column
3. Confirmation dialog appears
4. Click **Confirm**
5. Status badge changes from **Unpaid** (red) to **Paid** (green)
6. Unpaid sales count updates

**Confirmation Dialog:**

.. code-block:: text

   Mark Sale as Paid

   Are you sure you want to mark Sale #S20250112-1030-001 as paid?
   Total Amount: £123.45

   [Cancel]  [Confirm]

.. note::
   Marking as paid is **reversible**. You can mark a sale as unpaid again if needed.

Bulk Mark as Paid
-----------------

Mark multiple sales as paid simultaneously:

1. **Select sales:**

   - Check boxes next to sales in the table
   - Or click **Select All** checkbox in table header

2. **Open bulk actions:**

   - **Bulk Actions** button appears when selections exist
   - Click **Bulk Actions** > **Mark as Paid**

3. **Confirm:**

   - Confirmation dialog shows selected count
   - Click **Confirm**

4. **Processing:**

   - Progress indicator appears
   - Each sale processes individually
   - Success toast shows completion count

**Bulk Confirmation Dialog:**

.. code-block:: text

   Mark 15 Sales as Paid

   Are you sure you want to mark 15 sales as paid?
   Total Value: £2,345.67

   This action will update all selected sales.

   [Cancel]  [Confirm]

**Best Practice:** Filter for unpaid sales first, then select all to bulk update payment status.

Marking Sales as Unpaid
------------------------

Reverse the paid status (useful for accounting corrections):

1. Filter for **Paid Only** sales
2. Locate the sale to reverse
3. Click **Mark as Unpaid** button
4. Confirmation dialog appears
5. Click **Confirm**
6. Status changes back to **Unpaid**

Payment Reconciliation Workflow
================================

**Typical Workflow:**

1. **Generate Unpaid Report**

   - Set date range (e.g., "Last Month")
   - Set filter to "Unpaid Only"
   - Export to Excel
   - Send to accounts payable

2. **Receive Payment Confirmation**

   - Accounts payable confirms payments received
   - Provides list of paid sale IDs

3. **Update Payment Status**

   - Filter for unpaid sales
   - Select confirmed paid sales
   - Bulk mark as paid

4. **Verify Reconciliation**

   - Check "Unpaid Sales" summary card
   - Verify count matches expectations
   - Export final report for records

5. **Monthly Closing**

   - Generate month-end report
   - Verify all sales are marked paid
   - Archive report for audit trail

Exporting Reports
=================

Excel Export
------------

Export report data to Excel for external analysis:

1. Apply desired filters (date range, charge code, etc.)
2. Click **Export** button (top-right)
3. Select **Export to Excel**
4. File downloads as ``sales-report-YYYYMMDD.xlsx``

**Excel File Contents:**

- **Summary Sheet:** Key metrics and filter parameters
- **Sales Data Sheet:** Detailed transaction list
- **Items Breakdown Sheet:** Item-level details per sale

**Columns in Sales Data Sheet:**

- Sale ID
- Date/Time
- Charge Code
- Customer Info
- Subtotal
- VAT Amount
- Total Amount
- Payment Status
- Items Count
- Processed By (user)

CSV Export
----------

Export as CSV for database imports or custom scripts:

1. Apply desired filters
2. Click **Export** > **Export to CSV**
3. File downloads as ``sales-report-YYYYMMDD.csv``

**CSV Format:**

- UTF-8 encoding
- Comma-separated
- Header row included
- Date format: ISO 8601 (YYYY-MM-DD HH:mm:ss)

PDF Export (Future)
-------------------

Future releases may include PDF export with:

- Formatted report layout
- Company logo/branding
- Digital signatures
- Print-ready format

Sales Analytics Page
====================

The Sales Analytics page (``/analytics``) provides visual dashboards and trend analysis.

Accessing Sales Analytics
--------------------------

**Navigation:**

1. Click **Analytics** in the main navigation menu, or
2. Navigate directly to ``/analytics``

Dashboard Layout
----------------

The Analytics page consists of multiple dashboard sections:

1. **Key Metrics Bar** (Top) - Quick KPI summary
2. **Revenue Trend Chart** (Middle-Left) - Time series graph
3. **Category Breakdown** (Middle-Right) - Pie chart
4. **Top Items Table** (Bottom-Left) - Best sellers
5. **Charge Code Usage** (Bottom-Right) - Bar chart

Key Metrics Bar
===============

Quick KPI summary displayed as cards:

**Metrics Displayed:**

- **Total Revenue** - Current period revenue
- **Sales Growth** - Percentage change vs previous period
- **Active Items** - Count of active inventory items
- **Low Stock Alerts** - Items below minimum stock

**Growth Indicators:**

- 📈 **Green up arrow:** Positive growth
- 📉 **Red down arrow:** Negative growth
- ➡️ **Gray horizontal:** No change

Revenue Trend Chart
====================

Line chart showing revenue over time.

**Chart Features:**

- **X-Axis:** Time (days, weeks, or months)
- **Y-Axis:** Revenue (£)
- **Line:** Daily/weekly/monthly revenue
- **Hover:** Shows exact values for each point
- **Zoom:** Click and drag to zoom into specific periods

**Time Granularity:**

- **Last 7 Days:** Daily granularity
- **Last 30 Days:** Daily granularity
- **Last 3 Months:** Weekly granularity
- **Last Year:** Monthly granularity

**Interpreting Trends:**

- **Upward Trend:** Revenue increasing over time
- **Downward Trend:** Revenue declining (investigate causes)
- **Seasonal Patterns:** Recurring peaks/valleys (e.g., academic year cycles)
- **Anomalies:** Sudden spikes or drops (verify data accuracy)

Category Breakdown
==================

Pie chart showing revenue distribution by category.

**Chart Features:**

- **Slices:** Each category represented by a colored slice
- **Size:** Proportional to category revenue
- **Labels:** Category name and percentage
- **Hover:** Shows exact revenue value
- **Click:** Drill down into category details

**Use Cases:**

- Identify top-performing categories
- Balance inventory investment across categories
- Track category trends over time
- Identify underperforming categories

Top Items Table
===============

List of best-selling items ranked by quantity sold.

**Table Columns:**

=================  =====================================
Column             Description
=================  =====================================
**Rank**           Position in top sellers list (1-10)
**Item Name**      Full item name
**Category**       Item category
**Quantity Sold**  Total quantity sold in period
**Revenue**        Total revenue from item
**Margin**         Profit margin (if cost data available)
=================  =====================================

**Sorting:**

- Default: Rank (1-10)
- Click headers to sort by other columns

**Use Cases:**

- Stock high-selling items adequately
- Promote top sellers to customers
- Identify items to feature in marketing
- Plan procurement based on demand

Charge Code Usage Chart
========================

Bar chart showing sales count per charge code.

**Chart Features:**

- **X-Axis:** Charge codes
- **Y-Axis:** Number of sales
- **Bars:** Height represents sale count
- **Color:** Charge codes color-coded by status (active, on-hold, expired)
- **Hover:** Shows exact sale count and total value

**Use Cases:**

- Monitor charge code usage patterns
- Identify overused charge codes (approaching budget)
- Identify underused charge codes (investigate why)
- Validate charge code reporting to funding bodies

Advanced Filtering
==================

Both Reports and Analytics pages support advanced filtering:

Multiple Filters
----------------

Combine multiple filters for precise reports:

**Example:**

- **Date Range:** Last Quarter
- **Charge Code:** PROJ-2024-015
- **Category:** Laboratory Supplies
- **Status:** Unpaid Only

**Result:** All unpaid laboratory supply purchases for project PROJ-2024-015 in the last quarter.

Saved Filter Presets (Future)
------------------------------

Future releases may include:

- Save commonly used filter combinations
- Quick preset buttons (e.g., "Monthly Unpaid Report")
- Share presets with other users
- Schedule automated report generation

Common Reporting Workflows
===========================

Monthly Financial Report
------------------------

**Goal:** Generate monthly sales summary for accounting.

**Steps:**

1. Navigate to **Reports** page
2. Set date range to **Last Month**
3. Set filter to **All Charge Codes**
4. Set status to **All Sales**
5. Review summary cards (Total Revenue, VAT Collected)
6. Click **Export to Excel**
7. Send Excel file to accounting department

Project Budget Tracking
-----------------------

**Goal:** Track spending against project budget.

**Steps:**

1. Navigate to **Reports** page
2. Set date range to **This Year**
3. Select specific **Charge Code** for project
4. Review **Total Revenue** card (total spent)
5. Compare to project budget allocation
6. Export detailed breakdown for project manager

Unpaid Sales Follow-Up
-----------------------

**Goal:** Generate list of unpaid sales for payment collection.

**Steps:**

1. Navigate to **Reports** page
2. Set date range to **Last 30 Days** (or older)
3. Set status filter to **Unpaid Only**
4. Review **Unpaid Sales** card
5. Export to Excel
6. Send to accounts payable for follow-up
7. After payment received, bulk mark as paid

Category Performance Analysis
------------------------------

**Goal:** Analyze which categories generate most revenue.

**Steps:**

1. Navigate to **Sales Analytics** page
2. Set date range to **Last Quarter**
3. Review **Category Breakdown** pie chart
4. Identify top-performing categories
5. Click category slice to drill down
6. Review top items in that category
7. Plan inventory purchases accordingly

Interpreting Data
=================

Revenue Metrics
---------------

**Total Revenue:**

- **High Revenue:** Strong sales activity (positive)
- **Low Revenue:** Investigate causes (low demand, stock issues, pricing)
- **Compare Periods:** Is revenue growing, stable, or declining?

**Average Order Value (AOV):**

- **Increasing AOV:** Customers buying more per transaction (positive)
- **Decreasing AOV:** Customers making smaller purchases (investigate)
- **Target AOV:** Set goal based on historical average

Transaction Patterns
--------------------

**High Transaction Count, Low AOV:**

- Many small purchases
- Consider promotions to increase basket size
- Evaluate if customers are finding all needed items

**Low Transaction Count, High AOV:**

- Few large purchases
- Typical for lab equipment or high-value items
- Ensure adequate stock for these items

**Declining Transaction Count:**

- Investigate potential causes:
  - Stock shortages
  - Pricing issues
  - Seasonal variations
  - System access problems

Payment Patterns
----------------

**High Unpaid Sales Percentage:**

- **> 30% unpaid:** Review payment collection process
- **Aging unpaid:** Follow up on old unpaid sales
- **Specific charge codes:** Some projects may be slower to pay

**Quick Payment Turnaround:**

- **< 10% unpaid:** Efficient payment process
- **Immediate payment:** Point-of-sale payments

Category Insights
-----------------

**Category Distribution:**

- **Balanced:** Revenue spread across categories (diverse operations)
- **Concentrated:** 80% from 1-2 categories (specialized operations)
- **Seasonal:** Some categories peak at specific times

**Category Growth:**

- Track category revenue over time
- Identify emerging categories (new research areas)
- Identify declining categories (phase-out)

Best Practices
==============

Regular Reporting
-----------------

**Daily:**

- Review unpaid sales
- Monitor low stock alerts

**Weekly:**

- Review sales trends
- Update payment statuses
- Check top sellers

**Monthly:**

- Generate comprehensive financial report
- Reconcile all payments
- Archive monthly reports
- Review category performance

**Quarterly:**

- Analyze trends over quarter
- Compare to previous quarters
- Budget planning for next quarter

Data Accuracy
-------------

✅ **Do:**

- Mark sales as paid promptly after payment confirmation
- Verify charge codes are correct when processing sales
- Update item categories regularly
- Export reports for audit trail

❌ **Don't:**

- Mark sales as paid without confirmation
- Change charge codes after sale completion (breaks reporting)
- Delete sales (affects historical reporting)
- Ignore unpaid sales for extended periods

Report Security
---------------

**Access Control:**

- Limit report access to appropriate roles
- Finance reports should be admin-only
- Sensitive charge code data should be protected

**Data Privacy:**

- Avoid sharing reports containing personal data
- Redact sensitive information before distribution
- Follow institutional data protection policies

Troubleshooting
===============

Common Issues
-------------

**Reports Show No Data**

**Symptoms:**
- Empty data table
- Zero values in summary cards
- "No sales found" message

**Solutions:**

1. **Verify Date Range:** Ensure date range includes sales data

   - Check database has sales in selected period
   - Expand date range to include more data

2. **Check Filters:** Remove restrictive filters

   - Try "All Charge Codes"
   - Try "All Sales" (paid/unpaid)
   - Remove category filter

3. **Verify Permissions:** Ensure user has ``reports.view`` permission

4. **Check Data Exists:** Navigate to Sales page to verify sales exist

**Export Fails**

**Symptoms:**
- Export button does nothing
- Download doesn't start
- Error message appears

**Solutions:**

1. **Browser Pop-up Blocker:** Allow downloads from LUStores domain
2. **Large Dataset:** Try exporting smaller date range
3. **Browser Compatibility:** Try different browser (Chrome recommended)

**Charts Not Displaying**

**Symptoms:**
- Blank chart areas
- "Loading..." message persists
- Chart shows error

**Solutions:**

1. **JavaScript Enabled:** Verify JavaScript is enabled in browser
2. **Browser Cache:** Clear cache and hard refresh (Ctrl+Shift+R)
3. **Ad Blockers:** Disable ad blockers (may block chart libraries)
4. **Network Issues:** Check internet connection

**Incorrect Totals**

**Symptoms:**
- Summary card totals don't match expectations
- Revenue differs from accounting records
- Missing transactions

**Solutions:**

1. **VAT Inclusion:** Verify if totals include or exclude VAT
2. **Date Range:** Confirm correct date range selected
3. **Timezone:** Check if dates align with your timezone
4. **Refunds:** Refunded sales may be excluded from totals

Related Documentation
=====================

- :doc:`sales-quotes` - Sales and quotes workflows
- :doc:`settings-guide` - System configuration (Tab 3: VAT Rates)
- :doc:`inventory` - Inventory management
- :doc:`../api/endpoints` - API endpoints for custom reports

Summary
=======

LUStores Reports & Analytics provides comprehensive tools for financial tracking and business intelligence:

✅ **Sales Reports** - Filter by date, charge code, payment status
✅ **Payment Tracking** - Mark sales as paid/unpaid individually or in bulk
✅ **Visual Analytics** - Charts and graphs for trend analysis
✅ **Excel Export** - Generate reports for external systems
✅ **Revenue Insights** - Track performance across categories and items
✅ **Reconciliation** - Payment workflow for accounting

**Key Workflows:**

1. Generate monthly financial reports
2. Track project spending by charge code
3. Follow up on unpaid sales
4. Analyze category performance
5. Identify best-selling items

For custom reporting needs or API access, see :doc:`../api/endpoints` for programmatic report generation.
