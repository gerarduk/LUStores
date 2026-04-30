==================
Settings Guide
==================

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

The Settings page provides comprehensive system configuration options for LUStores administrators. All Settings are restricted to users with the **admin role** to ensure system integrity and security.

The Settings page is organized into **10 tabs**, each covering a specific aspect of system configuration:

1. **Appearance** - Theme and visual customization
2. **General** - Core system settings
3. **VAT Rates** - Tax configuration
4. **Security** - Authentication and session management
5. **Pages** - Page-level visibility permissions
6. **Permissions** - User access control
7. **Notifications** - System alerts and badges
8. **Database Schema** - Data model visualization
9. **Migration** - Database migration tools (Superuser only)
10. **Label Printing** - Bulk QR code label generation

Accessing Settings
==================

**Prerequisites:**
- User role: **Admin** or **Superuser**
- Authenticated session

**Navigation:**
1. Click your **profile icon** in the top-right corner
2. Select **Settings** from the dropdown menu, or
3. Navigate directly to ``/settings`` in your browser

.. note::
   If you don't see the Settings option, contact your system administrator to verify your user role permissions.

Tab 1: Appearance
=================

The Appearance tab allows you to customize the visual theme of the LUStores interface.

Theme Selection
---------------

LUStores supports three theme modes:

**Light Mode**
   Default bright theme optimized for well-lit environments. Uses white backgrounds with dark text for maximum readability during daytime use.

**Dark Mode**
   Dark theme designed to reduce eye strain in low-light environments. Features dark backgrounds with light text and reduced brightness.

**System Preference**
   Automatically matches your operating system's theme setting. Theme switches automatically when you change your OS preference (Windows Settings, macOS System Preferences, or Linux desktop environment).

Changing Your Theme
-------------------

1. Navigate to **Settings > Appearance**
2. Select your preferred theme from the three options
3. The theme applies immediately without refreshing the page
4. Your preference is saved to browser localStorage and persists across sessions

.. tip::
   **Keyboard Shortcut:** Press ``Ctrl+Shift+T`` (Windows/Linux) or ``Cmd+Shift+T`` (macOS) to quickly toggle between light and dark modes from any page.

Theme Persistence
-----------------

Your theme preference is stored locally in your browser. This means:

- ✅ Theme persists across browser sessions
- ✅ Each browser maintains its own theme preference
- ✅ Works offline (no server communication needed)
- ❌ Does not sync across different devices or browsers

Future Enhancements
-------------------

Future releases may include:

- Custom color schemes
- High contrast mode for accessibility
- Custom accent colors
- Per-page theme overrides

Tab 2: General Settings
=======================

General Settings control core system behavior for inventory, orders, and notifications.

Settings Categories
-------------------

General Settings are organized into three categories:

1. **Inventory Settings** - Stock management behavior
2. **Orders Settings** - Procurement workflow configuration
3. **Notifications Settings** - Alert thresholds and triggers

Inventory Settings
------------------

**Low Stock Threshold**
   Number of items below which an item is considered "low stock" and triggers notifications.

   - **Default:** 10 units
   - **Range:** 1-1000
   - **Type:** Integer
   - **Impact:** Dashboard alerts, notification badges, low stock reports

**Automatic Stock Deduction**
   Enable/disable automatic inventory reduction when sales are completed.

   - **Default:** Enabled
   - **Type:** Boolean toggle
   - **When Enabled:** Stock decrements immediately upon sale completion
   - **When Disabled:** Manual stock adjustments required

**Allow Negative Stock**
   Permit items to have negative stock quantities (back-ordering).

   - **Default:** Disabled
   - **Type:** Boolean toggle
   - **When Enabled:** Sales can proceed even if stock is insufficient
   - **When Disabled:** Sales blocked when stock < quantity requested
   - **Recommendation:** Keep disabled unless your workflow supports back-orders

Orders Settings
---------------

**Automatic Order Approval**
   Bypass manual approval for procurement orders.

   - **Default:** Disabled
   - **Type:** Boolean toggle
   - **When Enabled:** Orders immediately move to "Approved" status
   - **When Disabled:** Orders require manual approval before processing

**Order Notification Recipients**
   Email addresses to notify when new orders are created or received.

   - **Format:** Comma-separated email list
   - **Example:** ``procurement@example.com, manager@example.com``

Notifications Settings
----------------------

**Enable Low Stock Notifications**
   Show notification badges when items fall below minimum stock.

   - **Default:** Enabled
   - **Type:** Boolean toggle

**Enable Deployment Notifications**
   Show notifications when system deployments occur.

   - **Default:** Enabled
   - **Type:** Boolean toggle
   - **Note:** Only visible to admin and superuser roles

Modifying General Settings
---------------------------

1. Navigate to **Settings > General**
2. Locate the setting you want to change
3. For **boolean settings**: Toggle the switch on/off
4. For **numeric settings**: Enter a new value in the input field
5. For **text settings**: Type the new value
6. Settings save automatically upon change
7. A success toast notification confirms the save

.. warning::
   **System-Level Settings** (marked with a lock icon) cannot be modified through the UI. These require database-level changes or environment variable updates.

Tab 3: VAT Rates
================

Configure Value Added Tax (VAT) rates for inventory items and sales.

Understanding VAT in LUStores
------------------------------

LUStores supports flexible VAT configuration:

- **Default VAT Rate:** Applied to new items unless overridden
- **Custom VAT Rates:** Per-item VAT rate configuration
- **VAT-Inclusive Pricing:** Option to include VAT in displayed prices
- **VAT Reporting:** Automatic VAT calculation in sales reports

Default VAT Rate
----------------

The default VAT rate applies to all new inventory items unless manually changed.

**Setting the Default Rate:**

1. Navigate to **Settings > VAT Rates**
2. Enter the default rate as a decimal (e.g., ``0.20`` for 20% VAT)
3. Click **Save Default Rate**
4. New items will automatically use this rate

.. note::
   Changing the default rate does **not** affect existing items. You must update existing items individually or use bulk operations.

Custom VAT Rates
----------------

You can define multiple VAT rates for different item categories:

**Common VAT Rates (UK Example):**

======================  =========  ====================
Rate Name               Decimal    Percentage
======================  =========  ====================
Standard Rate           0.2000     20%
Reduced Rate            0.0500     5%
Zero Rate               0.0000     0%
Non-VAT                 0.0000     0%
======================  =========  ====================

**Adding a Custom VAT Rate:**

1. Navigate to **Settings > VAT Rates**
2. Click **Add VAT Rate**
3. Enter:

   - **Rate Name:** Descriptive label (e.g., "Reduced Rate")
   - **Rate Value:** Decimal value (e.g., ``0.05``)
   - **Description:** Optional notes

4. Click **Save**

VAT-Inclusive vs. VAT-Exclusive
--------------------------------

LUStores supports both VAT pricing models:

**VAT-Inclusive** (Default)
   Prices displayed include VAT. The system calculates the VAT component internally.

   - **Example:** Item price = £12.00 (includes £2.00 VAT at 20%)
   - **Formula:** ``VAT Amount = Price × (VAT Rate / (1 + VAT Rate))``

**VAT-Exclusive**
   Prices displayed exclude VAT. VAT is added at checkout.

   - **Example:** Item price = £10.00 + £2.00 VAT = £12.00 total
   - **Formula:** ``VAT Amount = Price × VAT Rate``

**Setting VAT Mode:**

1. Navigate to **Settings > VAT Rates**
2. Toggle **VAT Inclusive Pricing**
3. Setting applies system-wide to all sales and quotes

Applying VAT Rates to Items
----------------------------

VAT rates are configured per-item in the Inventory page:

1. Navigate to **Inventory**
2. Click **Edit** on an item
3. Select the **VAT Rate** from the dropdown
4. Choose whether prices are **VAT Inclusive** (checkbox)
5. Save changes

**Bulk VAT Rate Changes:**

To change VAT rates for multiple items:

1. Navigate to **Inventory**
2. Select items using checkboxes
3. Click **Bulk Actions** > **Change VAT Rate**
4. Select the new rate
5. Confirm the change

VAT Reporting
-------------

VAT amounts are automatically calculated and displayed in:

- **Sales receipts** - VAT breakdown per item
- **Reports page** - Total VAT collected by period
- **Quote summaries** - VAT preview before sale completion

See :doc:`reports-analytics` for detailed VAT reporting workflows.

Tab 4: Security
===============

Security settings control authentication, sessions, and password policies.

Authentication Methods
----------------------

LUStores supports two authentication methods:

**University SSO (Single Sign-On)**
   Integrates with university LDAP/AD systems for centralized authentication.

   - **Status:** Configured via environment variables
   - **User Management:** Automatic provisioning from directory
   - **Benefits:** No password management, automatic role sync

**Local Authentication**
   Traditional username/password authentication.

   - **Status:** Always available as fallback
   - **User Management:** Manual user creation by admins
   - **Benefits:** Works offline, full control over accounts

.. note::
   The authentication method is configured during deployment and cannot be changed through the UI. Contact your system administrator to switch authentication modes.

Session Management
------------------

**Session Duration**
   How long user sessions remain valid without activity.

   - **Default:** 24 hours
   - **Range:** 1-168 hours (1 week)
   - **Type:** Integer (hours)

**Concurrent Sessions**
   Allow users to be logged in on multiple devices simultaneously.

   - **Default:** Enabled
   - **When Disabled:** New login invalidates previous sessions

**Logout on Browser Close**
   End session when browser window closes.

   - **Default:** Disabled
   - **When Enabled:** Users must log in every browser session
   - **When Disabled:** Session persists (secure cookie)

Password Policies
-----------------

**For Local Authentication only:**

**Minimum Password Length**
   - **Default:** 8 characters
   - **Range:** 6-64 characters

**Require Strong Passwords**
   Enforce complexity requirements:

   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

**Password Expiration**
   Force password changes after a period.

   - **Default:** Disabled
   - **Range:** 30-365 days

**Force Password Change on First Login**
   Require users to set a new password when using temporary passwords.

   - **Default:** Enabled
   - **Recommendation:** Always keep enabled for security

Modifying Security Settings
----------------------------

1. Navigate to **Settings > Security**
2. Modify desired settings
3. Click **Save Security Settings**
4. Changes apply to new sessions immediately
5. Existing sessions remain valid until expiration

.. warning::
   Changing session duration or concurrent session settings **does not** affect currently active sessions. Users must log out and log back in for changes to take effect.

Tab 5: Pages
============

The Pages tab allows administrators to control which pages are visible to each user role. This provides page-level access control separate from feature permissions.

.. note::
   This tab requires the ``permissions.manage`` permission. Only users who can manage permissions will see this tab enabled.

Page Visibility by Role
-----------------------

The Pages tab displays a card for each user role (User, Superuser, Admin) with checkboxes for available pages:

**Available Pages:**

- **Dashboard** - Main overview page
- **Inventory** - Item management
- **Sales** - Sales and quotes
- **Orders** - Procurement orders
- **Notes** - Notes system
- **Categories** - Category management
- **Vendors** - Supplier management
- **Users** - User administration
- **Reports** - Sales reports
- **Analytics** - Sales analytics dashboard
- **Charge Codes** - Charge code management
- **Backups** - Backup management
- **System** - System management
- **Settings** - Settings page
- **Documentation** - In-app documentation

Configuring Page Access
-----------------------

1. Navigate to **Settings > Pages**
2. Find the role you want to configure (User, Superuser, or Admin)
3. Check/uncheck the pages you want that role to access
4. Changes are saved automatically and apply immediately

**Example Configuration:**

- **Users**: Dashboard, Inventory, Sales, Notes (basic operations)
- **Superusers**: All pages except Backups and Settings
- **Admins**: All pages enabled

.. tip::
   Page visibility controls the navigation menu and direct URL access. Users without access to a page will see a "Permission Denied" message if they try to access it directly.

Tab 6: Permissions
==================

The Permissions tab provides fine-grained control over user access to system features.

Understanding the Permission System
------------------------------------

LUStores implements a **role-based permission system** with three user roles:

**User** (Basic Access)
   Default role for standard users. Can view and create basic records but cannot modify system settings or manage other users.

**Superuser** (Advanced Access)
   Extended permissions for department managers. Can perform most administrative tasks except critical system operations.

**Admin** (Full Access)
   Complete system access including user management, backups, system settings, and all destructive operations.

Permission Categories
---------------------

Permissions are organized into functional categories:

====================  =================================
Category              Description
====================  =================================
Inventory             View, add, edit, delete items
Sales                 Create sales, process quotes
Orders                Place orders, receive shipments
Suppliers             Manage vendors and sources
Categories            Manage item categories
Users                 View/manage users, reset passwords
Reports               Access reporting features
Settings              View/edit system configuration
Backup                Create and restore backups
====================  =================================

Managing User Permissions
--------------------------

**Viewing User Permissions:**

1. Navigate to **Settings > Permissions**
2. User list displays all accounts with their roles
3. Click **View Permissions** to see granted permissions

**Granting a Permission:**

1. Navigate to **Settings > Permissions**
2. Find the user in the list
3. Click **Manage Permissions**
4. Toggle the permission **ON** (green)
5. Click **Save**

**Revoking a Permission:**

1. Navigate to **Settings > Permissions**
2. Find the user in the list
3. Click **Manage Permissions**
4. Toggle the permission **OFF** (gray)
5. Click **Save**

Permission Inheritance
----------------------

Permissions cascade from roles:

.. code-block:: text

   Admin (All Permissions)
   └── Superuser (All except critical operations)
       └── User (Basic permissions only)

**Explicitly Granted Permissions** override role defaults:

- Granting ``backup.create`` to a User gives them backup capabilities
- Revoking ``inventory.delete`` from a Superuser removes that permission

Common Permission Patterns
---------------------------

**Warehouse Staff:**
   - ``inventory.view``
   - ``inventory.edit`` (for stock adjustments)
   - ``sales.view``

**Sales Team:**
   - ``inventory.view``
   - ``sales.create``
   - ``sales.view``
   - ``quotes.create``

**Procurement Manager:**
   - ``inventory.view``
   - ``orders.create``
   - ``orders.receive``
   - ``suppliers.manage``

**Department Manager:**
   - Assign **Superuser** role (grants most permissions)
   - Optionally revoke sensitive permissions

Testing Permissions
-------------------

**Best Practice:** Test permission changes by logging in as the target user.

1. Grant/revoke permissions for test user
2. Log in as that user in an incognito/private browser window
3. Verify access to features
4. Adjust permissions as needed

.. tip::
   Keep a test user account with each role level (User, Superuser, Admin) to quickly verify permission configurations.

See :doc:`permissions-guide` for a comprehensive list of all 45+ permissions and their functions.

Tab 7: Notifications
====================

Manage system notifications and alert settings.

Notification Types
------------------

LUStores displays two types of notifications:

**Low Stock Notifications**
   Alert badges indicating items below minimum stock levels.

   - **Location:** Dashboard, Inventory page
   - **Trigger:** Item currentStock ≤ minimumStock
   - **Visibility:** All users
   - **Color:** Orange badge with item count

**Deployment Notifications**
   System update and maintenance alerts.

   - **Location:** Top bar (bell icon)
   - **Trigger:** GitHub Actions deployment, Docker Watchtower update
   - **Visibility:** Admin and Superuser only
   - **Color:** Blue badge with notification count

Notification Badges
-------------------

Notification counts appear as colored badges on:

- **Dashboard Cards** - Low stock count
- **Inventory Navigation** - Total items below minimum
- **Bell Icon** - Deployment notification count

Clearing Notifications
----------------------

**Clear Low Stock Notifications:**

1. Navigate to **Settings > Notifications**
2. Click **Clear All Low Stock Notifications**
3. Confirms with "Are you sure?" dialog
4. All low stock badges reset (items still tracked)

**Clear Deployment Notifications:**

1. Navigate to **Settings > Notifications**
2. Click **Clear All Deployment Notifications**
3. Confirms with "Are you sure?" dialog
4. Notification bell badge resets

.. note::
   Clearing low stock notifications does **not** change item stock levels. It only dismisses the notification badges. Items below minimum stock will re-trigger notifications on the next page load.

Configuring Notification Thresholds
------------------------------------

Notification thresholds are configured per-item:

**Low Stock Threshold:**

1. Navigate to **Inventory**
2. Edit an item
3. Set **Minimum Stock** value
4. Save changes
5. Notification triggers when **Current Stock** ≤ **Minimum Stock**

**Global Low Stock Threshold:**

See **Tab 2: General Settings** to set a system-wide default minimum stock level.

Notification Preferences (Future)
----------------------------------

Future releases will include:

- Email notifications for low stock
- Webhook integrations for external alerting
- Custom notification rules (e.g., notify when stock drops 50%)
- Per-user notification preferences

Tab 8: Database Schema
======================

The Database Schema tab provides an interactive Entity Relationship Diagram (ERD) and documentation explorer.

Viewing the Database Schema
----------------------------

1. Navigate to **Settings > Database Schema**
2. The page displays:

   - **Entity Relationship Diagram (ERD)** - Visual representation of database tables and relationships
   - **Table List** - All database tables with row counts
   - **Quick Links** - Links to detailed schema documentation

Exploring the ERD
-----------------

The ERD visualization uses **Mermaid diagram syntax** to display:

- **Tables** - Blue boxes with table names
- **Columns** - Listed within each table box
- **Relationships** - Arrows connecting related tables
- **Cardinality** - One-to-many, many-to-many relationships

**Interacting with the ERD:**

- **Zoom:** Use browser zoom (Ctrl/Cmd + +/-)
- **Pan:** Click and drag the diagram
- **Click Tables:** Some implementations support clicking tables for details

Key Database Tables
-------------------

**Core Tables:**

- ``users`` - User accounts and authentication
- ``categories`` - Item categories with icons/colors
- ``items`` - Inventory items with SKU, pricing, stock
- ``stock_movements`` - Audit trail of all stock changes

**Sales Tables:**

- ``sales`` - Completed sales transactions
- ``sale_items`` - Line items for each sale
- ``quotes`` - Draft and saved quotes
- ``quote_items`` - Line items for each quote

**Procurement Tables:**

- ``suppliers`` - Vendor information
- ``sources`` - Item-supplier relationships (pricing)
- ``orders`` - Purchase orders
- ``order_items`` - Line items for each order

**System Tables:**

- ``chargecodes`` - Charge codes for sales tracking
- ``charge_code_exclusions`` - Category restrictions per charge code
- ``notes`` - Contextual annotations for entities
- ``system_settings`` - Configuration key-value pairs

**Permission Tables:**

- ``user_permissions`` - Granted permissions per user
- ``permission_definitions`` - Available permissions

Schema Documentation
--------------------

For detailed schema documentation including:

- Column data types
- Indexes and constraints
- Foreign key relationships
- Migration history

See :doc:`../reference/database-schema`.

Use Cases for Schema Viewer
----------------------------

**For Administrators:**
- Understand data relationships before making bulk changes
- Plan data exports or migrations
- Troubleshoot data integrity issues

**For Developers:**
- Reference table structure when building integrations
- Understand query optimization opportunities
- Plan database schema extensions

Tab 9: Migration
================

**Access:** Superuser role only

The Migration tab provides tools to migrate data from legacy systems (e.g., MariaDB) to LUStores (PostgreSQL).

.. warning::
   Database migration is a **sensitive operation** that can result in data loss if performed incorrectly. Always create backups before migrating data.

Migration Wizard
----------------

The migration wizard guides you through five steps:

**Step 1: Source Connection**
   Configure connection to your legacy database.

**Step 2: Schema Mapping**
   Map source tables and columns to LUStores schema.

**Step 3: Data Preview**
   Review sample data to validate mappings.

**Step 4: Migration Plan**
   Generate execution plan with data transformations.

**Step 5: Execute Migration**
   Run migration with progress tracking.

Testing Database Connection
----------------------------

1. Navigate to **Settings > Migration**
2. Enter source database credentials:

   - **Host:** Database server address
   - **Port:** Database port (default: 3306 for MariaDB)
   - **Database:** Database name
   - **Username:** Database user
   - **Password:** Database password
   - **Type:** Database type (MariaDB, MySQL, PostgreSQL)

3. Click **Test Connection**
4. Success message confirms connectivity
5. Error message provides troubleshooting details

Suggested Column Mappings
--------------------------

The migration tool analyzes source schema and suggests mappings:

- **Automatic Mappings:** Columns with matching names
- **Fuzzy Mappings:** Columns with similar names (requires confirmation)
- **Unmapped Columns:** Source columns not found in target schema

**Reviewing Mappings:**

1. Review each suggested mapping
2. Confirm or modify mappings
3. Mark unmapped columns for exclusion or manual mapping
4. Click **Save Mappings**

Data Preview
------------

Preview migrated data before committing:

1. Click **Preview Migration**
2. Review first 100 rows from each table
3. Verify data transformations (format conversions, null handling)
4. Check for errors or warnings

Executing Migration
-------------------

.. warning::
   **Create a backup** before executing migration. See :doc:`../operations/backup-restore` for backup procedures.

1. Review migration plan summary:

   - Tables to migrate
   - Estimated row counts
   - Data transformations

2. Check **"I have created a backup"** acknowledgment
3. Click **Execute Migration**
4. Progress bar shows migration status
5. Success/failure summary displays upon completion

**Migration Duration:**

- Small databases (< 10,000 rows): 2-5 minutes
- Medium databases (10,000-100,000 rows): 10-30 minutes
- Large databases (> 100,000 rows): 30+ minutes

Troubleshooting Migration Issues
---------------------------------

**Connection Errors:**
- Verify database credentials
- Check network connectivity (firewall rules)
- Ensure database user has SELECT permissions

**Mapping Errors:**
- Review column data types (incompatible types cause errors)
- Check for required columns (non-null constraints)

**Data Errors:**
- Validate foreign key relationships exist in target database
- Check for duplicate primary keys
- Review character encoding (UTF-8 recommended)

For detailed migration documentation, see :doc:`../developer/MIGRATION_GUIDE`.

Tab 10: Label Printing
=====================

Generate and print QR code labels for multiple inventory items.

.. note::
   For comprehensive label printing documentation, see :doc:`bulk-label-printing`.

Quick Overview
--------------

The Label Printing tab allows you to:

- Select items by **category**, **location**, and **active status**
- Generate QR codes for all selected items
- Preview labels before printing
- Print labels in a **3-per-row grid** optimized for A4 paper

**Quick Start:**

1. Navigate to **Settings > Label Printing**
2. Select filters (category, location, status)
3. Click **Generate Labels**
4. Review preview
5. Click **Print Labels**

Each label includes:

- QR code (encodes item SKU)
- Item name
- SKU
- Location
- Description (if available)

For step-by-step instructions, troubleshooting, and best practices, see :doc:`bulk-label-printing`.

Best Practices
==============

Security
--------

- **Limit Admin Access:** Only grant admin role to trusted users
- **Regular Permission Audits:** Review user permissions quarterly
- **Session Management:** Enable logout on browser close for shared computers
- **Password Policies:** Enforce strong passwords for local authentication

Configuration
-------------

- **Test Changes:** Use a test environment before modifying production settings
- **Document Custom Settings:** Keep notes on why you changed default values
- **Backup Before Migration:** Always create database backups before migrations
- **Monitor Notifications:** Don't ignore deployment notifications (may indicate issues)

User Management
---------------

- **Role-Based Access:** Use roles (User/Superuser/Admin) instead of individual permissions when possible
- **Least Privilege:** Grant minimum permissions needed for each user's job function
- **Onboarding:** Create user guides specific to your organization's workflows

Troubleshooting
===============

Common Issues
-------------

**"Permission Denied" errors after changing permissions**
   Users must log out and log back in for permission changes to take effect.

**Theme changes not persisting**
   Check browser localStorage is enabled. Incognito/private mode may not persist theme.

**Migration connection fails**
   Verify source database is running, credentials are correct, and firewall allows connection.

**Low stock notifications reappear after clearing**
   Clearing notifications only dismisses badges. Adjust item minimum stock levels or increase current stock.

**Settings changes not saving**
   Check browser console for errors. You may need admin or superuser role.

Getting Help
------------

For additional support:

- **Documentation:** :doc:`../index`
- **API Reference:** :doc:`../api/endpoints`
- **Troubleshooting Guide:** :doc:`../reference/troubleshooting`
- **System Administrator:** Contact your IT department

Related Guides
==============

- :doc:`bulk-label-printing` - Detailed label printing workflows
- :doc:`permissions-guide` - Complete permission reference
- :doc:`notes-system` - Notes system overview
- :doc:`../operations/backup-restore` - Backup and restore procedures
- :doc:`../reference/database-schema` - Complete database schema documentation
- :doc:`../developer/MIGRATION_GUIDE` - Developer migration guide

Summary
=======

The Settings page provides comprehensive system configuration across 9 specialized tabs:

✅ **Appearance** - Customize light/dark theme
✅ **General** - Configure inventory, orders, notifications
✅ **VAT Rates** - Manage tax rates and pricing
✅ **Security** - Control authentication and sessions
✅ **Permissions** - Fine-grained user access control
✅ **Notifications** - Manage system alerts
✅ **Database Schema** - Explore data relationships
✅ **Migration** - Migrate from legacy systems
✅ **Label Printing** - Generate QR code labels

Master these settings to optimize LUStores for your organization's unique workflows.

.. tip::
   **Quick Navigation:** Bookmark ``/settings`` in your browser for fast access to system configuration.
