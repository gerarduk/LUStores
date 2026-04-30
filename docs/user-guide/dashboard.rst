Dashboard User Guide
====================

The Dashboard is your central hub for monitoring and managing your university's inventory. This guide explains how to use all dashboard features effectively.

Dashboard Overview
------------------

When you first log in, you'll see the main dashboard with several key sections:

- **Statistics Cards** at the top showing critical metrics
- **Low Stock Alerts** on the right side for immediate attention
- **Category Overview** showing inventory distribution
- **Recent Activity** feed for tracking changes

Understanding Key Metrics
-------------------------

Statistics Cards
~~~~~~~~~~~~~~~~

**Total Items**
   Shows the complete count of all inventory items in your system.
   
   - Includes active items only
   - Updates in real-time as items are added/removed
   - Click to view detailed inventory list

**Low Stock Items**
   Displays items that have fallen below their minimum stock threshold.
   
   - Red background indicates urgent attention needed
   - Number shows count of items requiring restocking
   - Click to see specific low stock items

**Total Value**
   Represents the combined monetary value of all inventory.
   
   - Calculated using current stock × unit price
   - Helps track investment in inventory
   - Updated automatically with price changes

**Active Users**
   Shows number of users currently using the system.
   
   - Helps monitor system usage
   - Useful for planning maintenance windows
   - Admin-only metric for system monitoring

Low Stock Alerts Panel
----------------------

Purpose and Function
~~~~~~~~~~~~~~~~~~~~

The Low Stock Alerts panel helps you proactively manage inventory levels by highlighting items that need attention.

**Alert Criteria**
   Items appear in this panel when:
   - Current stock ≤ minimum stock threshold
   - Item is marked as active
   - Item belongs to a category you have access to

**Alert Information**
   Each alert shows:
   - Item name and SKU
   - Current stock level
   - Minimum stock threshold
   - Category information
   - Quick action buttons

Taking Action on Alerts
~~~~~~~~~~~~~~~~~~~~~~~

**Immediate Actions**
   1. **View Details**: Click item name to see full information
   2. **Update Stock**: Use quick stock buttons to adjust levels
   3. **Edit Minimum**: Modify threshold if it's too high/low
   4. **Order More**: Use supplier information to reorder

**Workflow Example**
   
   .. code-block:: text
   
      1. Notice "Dell Laptops" showing 2/5 (current/minimum)
      2. Click "Update Stock" button
      3. Select "Stock In" and enter quantity received
      4. Add reason: "Received shipment from Dell"
      5. Alert automatically clears when stock > minimum

Category Overview Section
-------------------------

Understanding the Display
~~~~~~~~~~~~~~~~~~~~~~~~~

The Category Overview shows how your inventory is distributed across different categories.

**Visual Elements**
   - **Category Cards**: Each category has its own card
   - **Item Count**: Number of items in each category
   - **Total Value**: Combined value of items in category
   - **Color Coding**: Matches category colors for easy identification

**Sorting Options**
   - By item count (most items first)
   - By total value (highest value first)
   - Alphabetical by category name
   - Custom order (admin configurable)

Using Category Information
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Quick Navigation**
   Click any category card to:
   - View all items in that category
   - Filter inventory by category
   - Access category management (if authorized)

**Planning and Analysis**
   Use this section to:
   - Identify which categories need more attention
   - Balance inventory investment across categories
   - Plan purchasing strategies
   - Monitor category growth over time

Recent Activity Feed
--------------------

Activity Types
~~~~~~~~~~~~~~

The Recent Activity feed shows the latest inventory movements and changes:

**Stock Movements**
   - Items received (stock in)
   - Items issued (stock out)
   - Stock adjustments and corrections

**Item Changes**
   - New items added
   - Item information updated
   - Items marked inactive

**User Activities**
   - New user registrations
   - Role changes
   - Login activities (admin view)

**System Events**
   - Automated low stock alerts
   - Scheduled reports generated
   - System maintenance notifications

Reading Activity Entries
~~~~~~~~~~~~~~~~~~~~~~~~

Each activity entry contains:

.. code-block:: text

   [Timestamp] [User] [Action] [Item/Target]
   
   Examples:
   10:30 AM - John Smith updated stock for "Dell Laptop XPS 13" (+5 units)
   09:15 AM - Sarah Johnson added new item "Epson Projector Model X"
   08:45 AM - System generated low stock alert for "Office Paper"

**Entry Details**
   - **Who**: User who performed the action
   - **What**: Type of action taken
   - **When**: Timestamp of the action
   - **Where**: Item or system component affected
   - **Why**: Reason provided (for stock movements)

Customizing Your Dashboard
--------------------------

Personal Preferences
~~~~~~~~~~~~~~~~~~~~

**Display Options**
   Customize what you see on your dashboard:
   
   1. Click your profile icon → "Dashboard Preferences"
   2. Choose which panels to show/hide
   3. Adjust refresh intervals
   4. Set default filters

**Alert Thresholds**
   Modify when you receive alerts:
   
   - Set personal low stock thresholds
   - Choose alert delivery methods
   - Configure quiet hours
   - Select categories to monitor

**Layout Options**
   Arrange dashboard elements:
   
   - Drag and drop panels to reorder
   - Resize panels for better viewing
   - Choose compact or detailed views
   - Save multiple layout configurations

Dashboard Actions
-----------------

Quick Actions
~~~~~~~~~~~~~

**Add New Item**
   Large "+" button provides quick access to item creation:
   
   1. Click "Add New Item"
   2. Fill required fields
   3. Item immediately appears in relevant dashboard sections

**Bulk Operations**
   Access bulk functions from dashboard:
   
   - Import items from spreadsheet
   - Export inventory data
   - Generate reports
   - Update multiple items

**Search and Filter**
   Quick search bar at top of dashboard:
   
   - Search across all inventory
   - Use filters for specific categories
   - Save common searches
   - Clear filters quickly

Advanced Features
~~~~~~~~~~~~~~~~~

**Scheduled Reports**
   Set up automatic report generation:
   
   1. Go to Reports → Schedule
   2. Choose report type and frequency
   3. Set recipients and format
   4. Reports appear in dashboard when generated

**Custom Widgets**
   Add specialized dashboard widgets:
   
   - Inventory turnover charts
   - Supplier performance metrics
   - Cost analysis graphs
   - Trend indicators

**Integration Links**
   Quick access to related systems:
   
   - University purchasing system
   - Asset management system
   - Financial reporting tools
   - Supplier portals

Mobile Dashboard Usage
----------------------

Responsive Design
~~~~~~~~~~~~~~~~~

The dashboard automatically adapts to mobile devices:

**Mobile Layout**
   - Statistics cards stack vertically
   - Simplified navigation menu
   - Touch-friendly buttons
   - Swipe gestures for panels

**Mobile-Specific Features**
   - Quick stock updates via camera/barcode
   - Location-based inventory access
   - Offline mode for basic operations
   - Push notifications for alerts

**Best Practices for Mobile**
   - Use landscape mode for data entry
   - Bookmark dashboard for quick access
   - Enable location services for relevant features
   - Keep app updated for security

Troubleshooting Dashboard Issues
--------------------------------

Common Problems
~~~~~~~~~~~~~~~

**Dashboard Not Loading**
   1. Check internet connection
   2. Try refreshing the page
   3. Clear browser cache
   4. Log out and log back in
   5. Contact IT if problem persists

**Incorrect Data Showing**
   1. Check if you're viewing the right date range
   2. Verify any active filters
   3. Refresh the dashboard
   4. Check user permissions
   5. Report data issues to administrator

**Missing Features**
   1. Verify your user role and permissions
   2. Check if features are enabled for your account
   3. Try different browser
   4. Contact system administrator

**Slow Performance**
   1. Close other browser tabs
   2. Check internet speed
   3. Try during off-peak hours
   4. Report persistent issues

Getting Help
~~~~~~~~~~~~

**Built-in Help**
   - Click "?" icon for context-sensitive help
   - Hover over elements for tooltips
   - Use guided tours for new features

**Support Contacts**
   - System Administrator: For technical issues
   - Inventory Manager: For process questions
   - IT Help Desk: For access problems
   - Training Team: For additional training

Dashboard Best Practices
------------------------

Daily Routine
~~~~~~~~~~~~~

**Morning Check**
   1. Review overnight alerts
   2. Check new activity feed entries
   3. Verify critical stock levels
   4. Plan daily inventory tasks

**Throughout the Day**
   - Update stock as items move
   - Check dashboard after major activities
   - Respond to low stock alerts promptly
   - Monitor system health (admins)

**End of Day**
   1. Review completed activities
   2. Plan next day's priorities
   3. Generate needed reports
   4. Clear resolved alerts

Efficiency Tips
~~~~~~~~~~~~~~~

**Keyboard Shortcuts**
   - ``Ctrl + /`` - Open search
   - ``Ctrl + N`` - New item
   - ``Ctrl + R`` - Refresh dashboard
   - ``Ctrl + H`` - Help panel

**Quick Navigation**
   - Bookmark frequently used views
   - Use browser back/forward buttons
   - Pin important items
   - Create custom filters

**Time Management**
   - Set up automated reports
   - Use bulk operations when possible
   - Batch similar activities
   - Schedule regular review times

The dashboard is designed to give you immediate insight into your inventory status while providing quick access to the most important functions. Master these features to efficiently manage your university's inventory system.