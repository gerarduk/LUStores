Notification Badges
==================

Overview
--------

The LUStores application displays dynamic notification badges in the top navigation bar to alert users about important system events and inventory conditions. These badges provide real-time feedback and help users stay informed about critical system status. Clicking on the badges provides quick navigation to relevant pages for taking action on the alerts.

Notification Types
------------------

System Monitoring Alerts (Server Icon)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Purpose**: Displays real-time system health and operational alerts

- **Visual Indicator**: Server icon with red badge when alerts are present
- **Navigation**: Click to go to System Management page (``/system``)
- **Update Frequency**: Refreshes every 30 seconds automatically
- **Badge Display Logic**:
  - Shows red badge only when ``hasSystemAlerts: true``
  - Displays count from API ``alertCount`` field
  - Shows "99+" for counts over 99
  - Tooltip shows detailed alert messages and navigation hint

**API Endpoint**: ``/api/system/alerts``

Low Stock Notifications (Bell Icon)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Purpose**: Alerts users when inventory items are running low on stock

- **Visual Indicator**: Bell icon with red badge when low stock items exist
- **Navigation**: Click to go to Inventory page (``/inventory``)
- **Badge Display Logic**:
  - Shows red badge when low stock items are detected
  - Displays count of items below minimum threshold
  - Shows "99+" for counts over 99
  - Tooltip shows "X low stock items" and navigation hint

**API Endpoint**: ``/api/dashboard/low-stock``

User Interface Details
----------------------

Badge Styling
~~~~~~~~~~~~~

Both notification badges use consistent styling:

- **Color**: Red background (``bg-red-600`` for system alerts, ``bg-error`` for low stock)
- **Position**: Positioned absolutely in top-right corner of respective icons
- **Size**: Small circular badge (``h-5 w-5``)
- **Text**: White text, extra small font size
- **Behavior**: Only visible when relevant conditions are met

Interactive Features
~~~~~~~~~~~~~~~~~~~

- **Hover Tooltips**: Both badges show detailed information on hover
- **Click Navigation**: 
  - **Server Icon**: Clicking navigates to System Management page (``/system``)
  - **Bell Icon**: Clicking navigates to Inventory page (``/inventory``)
- **Real-time Updates**: System alerts refresh automatically every 30 seconds
- **Responsive Design**: Badges scale appropriately on different screen sizes

Historical Issues and Solutions
-------------------------------

Hard-coded Badge Number (Resolved)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: Previously, a hard-coded notification badge displaying the number "3" appeared due to a legacy backup file.

**Root Cause**: The file ``TopBar.jsx.backup`` contained hardcoded JSX:

.. code-block:: jsx

   <Badge className="...">
     3
   </Badge>

**Resolution**: 
- **Date Fixed**: July 10, 2025
- **Action**: Removed the backup file containing the hard-coded value
- **Current Status**: All notification badges now use dynamic data from API endpoints

Technical Implementation
------------------------

The notification system is implemented in ``/client/src/components/TopBar.tsx`` using React Query for data fetching and Wouter for navigation:

.. code-block:: tsx

   // Import navigation hook
   const [location, setLocation] = useLocation();

   // System alerts from API
   const { data: systemAlerts } = useQuery<{
     alertCount: number;
     alerts: Array<{ type: string; level: string; message: string }>;
     hasSystemAlerts: boolean;
   }>({
     queryKey: ["/api/system/alerts"],
     refetchInterval: 30000, // 30 seconds
   });

   // Low stock items from API
   const { data: lowStockItems } = useQuery<any[]>({
     queryKey: ["/api/dashboard/low-stock"],
   });

   // Navigation handlers
   <Button onClick={() => setLocation("/system")}>  // System Management
   <Button onClick={() => setLocation("/inventory")}>  // Inventory Page

API Response Formats
-------------------

System Alerts Response
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: json

   {
     "alertCount": 7646,
     "alerts": [
       {
         "type": "performance",
         "level": "warning", 
         "message": "High CPU usage detected"
       },
       {
         "type": "stock",
         "level": "critical",
         "message": "15 items below minimum stock threshold"
       },
       {
         "type": "system",
         "level": "info",
         "message": "System backup completed successfully"
       }
     ],
     "hasSystemAlerts": true
   }

**Response Fields:**

- **alertCount** (number): Total number of active alerts
- **alerts** (array): Array of alert objects with details
- **hasSystemAlerts** (boolean): Whether any alerts are currently active

**Alert Object Fields:**

- **type** (string): Alert category (performance, stock, system, security)
- **level** (string): Severity level (info, warning, critical)
- **message** (string): Human-readable alert description

Low Stock Items Response
~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: json

   [
     {
       "id": 1,
       "name": "Dell Laptop XPS 13",
       "sku": "DELL-XPS13-001",
       "currentStock": 2,
       "minimumStock": 10,
       "price": "1299.99",
       "category": {
         "id": 1,
         "name": "IT Equipment",
         "color": "blue"
       }
     },
     {
       "id": 2,
       "name": "Office Chair Premium",
       "sku": "CHAIR-PREM-001", 
       "currentStock": 1,
       "minimumStock": 5,
       "price": "299.99",
       "category": {
         "id": 2,
         "name": "Furniture",
         "color": "green"
       }
     }
   ]

**Array of Item Objects:**

- **id** (number): Unique item identifier
- **name** (string): Item display name
- **sku** (string): Stock Keeping Unit code
- **currentStock** (number): Current available quantity
- **minimumStock** (number): Minimum threshold for alerts
- **price** (string): Item unit price
- **category** (object): Associated category information

Troubleshooting
---------------

Badge Not Updating
~~~~~~~~~~~~~~~~~~

1. Check that API endpoints are responding correctly
2. Verify the 30-second refresh interval for system alerts
3. Check browser network tab for failed API requests
4. Ensure proper authentication for API access

Incorrect Badge Count
~~~~~~~~~~~~~~~~~~~~

1. Verify API response data structure matches expected format
2. Check that ``alertCount`` field is present in system alerts response
3. Ensure low stock items array is properly formatted
4. Review any caching configurations that might affect real-time updates

Missing Badges
~~~~~~~~~~~~~~

1. Confirm that the TopBar component is properly imported and rendered
2. Check for JavaScript console errors
3. Verify that CSS classes are loading correctly
4. Ensure React Query is properly configured

Development Notes
-----------------

- All notification badges use React Query for efficient data fetching and caching
- System alerts refresh every 30 seconds to provide near real-time monitoring
- Low stock data refreshes based on React Query's default stale time configuration
- Badge styling uses Tailwind CSS classes for consistent design
- Badge colors follow the application's design system: red for warnings and alerts
- The implementation prioritizes performance with optimized re-rendering patterns
