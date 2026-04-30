====================
Permissions Guide
====================

.. contents:: Table of Contents
   :depth: 3
   :local:

Overview
========

LUStores implements a comprehensive permission system that provides fine-grained control over user access to features and operations. This guide documents all 45+ permissions, their functions, and how to manage them effectively.

**Key Concepts:**

- 🎭 **Role-Based Access:** Three built-in roles (User, Superuser, Admin)
- 🔐 **Fine-Grained Permissions:** 45+ individual permissions
- 🔄 **Permission Inheritance:** Permissions cascade from roles
- ⚡ **Explicit Grants:** Override role defaults for specific users
- 🛡️ **Least Privilege:** Grant minimum permissions needed

Role Hierarchy
==============

LUStores has three built-in user roles with increasing privilege levels:

User (Basic Access)
-------------------

**Purpose:** Standard users who perform daily operations

**Default Permissions:**
- View inventory, sales, and orders
- Create sales and quotes
- Update stock levels
- View reports (limited)

**Typical Users:**
- Laboratory staff
- Warehouse workers
- Sales counter staff
- Department assistants

**Cannot Do:**
- Modify system settings
- Manage other users
- Delete records permanently
- Access backups or migrations

Superuser (Advanced Access)
----------------------------

**Purpose:** Department managers and power users

**Default Permissions:**
- All User permissions
- Create and edit items
- Manage suppliers
- Create and receive orders
- Access detailed reports
- Manage categories
- Assign charge codes

**Typical Users:**
- Department managers
- Procurement officers
- Lab managers
- Finance coordinators

**Cannot Do:**
- Manage user accounts
- Modify system-level settings
- Create backups
- Perform database migrations
- Reset user passwords

Admin (Full Access)
-------------------

**Purpose:** System administrators with full control

**Default Permissions:**
- All Superuser permissions
- Manage users (create, edit, delete)
- Reset user passwords
- Modify system settings
- Create and restore backups
- Access all administrative functions
- Manage permissions

**Typical Users:**
- IT administrators
- System administrators
- Technical staff

**Responsibility:**
- System security
- User management
- Backup procedures
- Disaster recovery

Permission Inheritance
----------------------

Permissions cascade from roles:

.. code-block:: text

   Admin (All 45+ Permissions)
     └── Superuser (~35 Permissions)
           └── User (~20 Permissions)

**Example:**

- User has ``inventory.view``
- Superuser **inherits** ``inventory.view`` + gains ``inventory.edit``
- Admin **inherits both** + gains ``inventory.delete``

Permission Categories
=====================

Permissions are organized into 9 functional categories:

Inventory Permissions
---------------------

Control access to inventory management features.

==========================  ========================================
Permission                  Description
==========================  ========================================
``inventory.view``          View inventory items
``inventory.add``           Create new items
``inventory.edit``          Modify existing items
``inventory.delete``        Delete items (with safety checks)
``inventory.manage_stock``  Adjust stock levels
``inventory.bulk_edit``     Perform bulk operations
``inventory.export``        Export inventory data
==========================  ========================================

**Use Cases:**

- **View only:** Warehouse staff browsing inventory
- **Add/Edit:** Procurement creating new items
- **Delete:** Admins cleaning up discontinued items
- **Manage stock:** Staff adjusting quantities after counts
- **Bulk edit:** Managers updating VAT rates for categories

Sales Permissions
-----------------

Control access to sales and quote features.

==========================  ========================================
Permission                  Description
==========================  ========================================
``sales.view``              View sales transactions
``sales.create``            Create new sales
``sales.process``           Process quotes into sales
``sales.refund``            Issue refunds
``sales.mark_paid``         Mark sales as paid/unpaid
``sales.export``            Export sales data
==========================  ========================================

**Use Cases:**

- **View:** Finance reviewing transaction history
- **Create:** Counter staff processing customer purchases
- **Process:** Converting approved quotes to sales
- **Refund:** Managers handling returns
- **Mark paid:** Accounting reconciling payments
- **Export:** Finance generating monthly reports

Quote Permissions
-----------------

Control access to quote/draft management.

==========================  ========================================
Permission                  Description
==========================  ========================================
``quotes.view``             View quotes
``quotes.create``           Create draft quotes
``quotes.edit``             Modify quotes
``quotes.delete``           Delete draft quotes
``quotes.process``          Convert quotes to sales
==========================  ========================================

**Use Cases:**

- **Create:** Staff building quotes for customers
- **Edit:** Modifying quotes before approval
- **Delete:** Removing abandoned drafts
- **Process:** Completing approved quotes

Orders Permissions
------------------

Control access to purchase order features.

==========================  ========================================
Permission                  Description
==========================  ========================================
``orders.view``             View purchase orders
``orders.create``           Create new orders
``orders.edit``             Modify pending orders
``orders.receive``          Mark orders as received
``orders.delete``           Delete orders (safety checks)
``orders.upload_invoice``   Upload invoice PDFs
==========================  ========================================

**Use Cases:**

- **View:** Staff checking order status
- **Create:** Procurement placing orders
- **Receive:** Warehouse marking deliveries
- **Upload invoice:** Finance attaching invoices

Suppliers Permissions
---------------------

Control access to vendor/supplier management.

==========================  ========================================
Permission                  Description
==========================  ========================================
``suppliers.view``          View supplier information
``suppliers.add``           Create new suppliers
``suppliers.edit``          Modify supplier details
``suppliers.delete``        Delete suppliers
``suppliers.manage``        Full supplier management (all above)
==========================  ========================================

**Use Cases:**

- **View:** Staff checking supplier contacts
- **Manage:** Procurement maintaining vendor database

Categories Permissions
----------------------

Control access to item categorization.

==========================  ========================================
Permission                  Description
==========================  ========================================
``categories.view``         View categories
``categories.add``          Create new categories
``categories.edit``         Modify categories
``categories.delete``       Delete categories
==========================  ========================================

**Use Cases:**

- **View:** All users browsing categories
- **Add/Edit:** Admins organizing inventory structure
- **Delete:** Admins removing unused categories

Users & Permissions
-------------------

Control access to user account management.

==========================  ========================================
Permission                  Description
==========================  ========================================
``users.view``              View user accounts
``users.add``               Create new users
``users.edit``              Modify user details
``users.delete``            Deactivate users
``users.reset_password``    Reset user passwords
``users.manage_permissions``  Grant/revoke permissions
``users.assign_chargecode`` Assign charge codes to users
==========================  ========================================

**Use Cases:**

- **View:** Admins reviewing user list
- **Add:** Admins onboarding new staff
- **Reset password:** Help desk resetting forgotten passwords
- **Manage permissions:** Admins customizing access
- **Assign chargecode:** Managers authorizing budget access

Reports Permissions
-------------------

Control access to reporting features.

==========================  ========================================
Permission                  Description
==========================  ========================================
``reports.view``            View reports page
``reports.generate``        Generate custom reports
``reports.export``          Export reports to Excel/CSV
``reports.financial``       View financial reports (sales totals)
==========================  ========================================

**Use Cases:**

- **View:** Staff checking basic reports
- **Generate:** Managers creating custom reports
- **Export:** Finance exporting for external analysis
- **Financial:** Finance viewing sensitive financial data

Settings Permissions
--------------------

Control access to system configuration.

==========================  ========================================
Permission                  Description
==========================  ========================================
``settings.view``           View settings page
``settings.edit``           Modify system settings
``settings.manage_vat``     Configure VAT rates
``settings.permissions``    Manage user permissions
==========================  ========================================

**Use Cases:**

- **View:** Admins checking configuration
- **Edit:** Admins modifying settings
- **Manage VAT:** Finance configuring tax rates
- **Permissions:** Admins controlling access

Backup & System
---------------

Control access to critical system operations.

==========================  ========================================
Permission                  Description
==========================  ========================================
``backup.view``             View backup list
``backup.create``           Create database backups
``backup.restore``          Restore from backups
``backup.download``         Download backup files
``system.manage``           Access system management features
``migration.execute``       Run database migrations
==========================  ========================================

**Use Cases:**

- **View:** Admins checking backup status
- **Create:** Automated backup schedules
- **Restore:** Emergency disaster recovery
- **Migration:** Upgrading database schema

Managing Permissions
====================

Viewing User Permissions
------------------------

1. Navigate to **Settings > Permissions** tab
2. User list displays all accounts
3. Click user's row to expand permissions
4. Green checkmarks indicate granted permissions
5. Gray checkmarks indicate inherited (role-based) permissions
6. Empty boxes indicate denied permissions

**Permission Indicators:**

- ✅ **Green Checkmark:** Explicitly granted
- ☑️ **Gray Checkmark:** Inherited from role
- ⬜ **Empty Box:** Not granted

Granting a Permission
---------------------

**Step-by-Step:**

1. Navigate to **Settings > Permissions**
2. Find user in list
3. Click **Manage Permissions** button
4. Locate the permission to grant
5. Toggle switch to **ON** (green)
6. Click **Save Changes**
7. Success toast confirms update

**Example:**

Grant ``reports.export`` to user "jane.smith":

1. Settings > Permissions
2. Find "jane.smith@example.com"
3. Manage Permissions
4. Find "Reports" section
5. Toggle ``reports.export`` to ON
6. Save

**Result:** Jane can now export reports to Excel/CSV

Revoking a Permission
---------------------

**Step-by-Step:**

1. Navigate to **Settings > Permissions**
2. Find user in list
3. Click **Manage Permissions**
4. Locate the permission to revoke
5. Toggle switch to **OFF** (gray)
6. Click **Save Changes**
7. Confirmation dialog may appear for critical permissions
8. Confirm revocation

**Warning:** Revoking core permissions may prevent user from performing their job. Consider carefully before revoking.

Bulk Permission Changes
-----------------------

To grant the same permission to multiple users:

**Option 1: Use Role System**

1. Ensure users have correct role (User/Superuser/Admin)
2. Role grants default permissions automatically

**Option 2: Manual Grant** (for exceptions)

1. Grant permission to first user
2. Note permission name
3. Repeat for other users

.. note::
   There's no bulk grant UI currently. Consider using roles for groups of users with similar needs.

Permission Best Practices
=========================

Least Privilege Principle
--------------------------

**Definition:** Users should have the minimum permissions required to perform their job.

**Benefits:**

- ✅ Improved security (limits damage from compromised accounts)
- ✅ Reduced errors (users can't accidentally break things)
- ✅ Clear responsibilities (permissions define roles)
- ✅ Audit trail (permission changes are logged)

**Example:**

❌ **Bad:** Grant all permissions to all users "just in case"

✅ **Good:** Grant specific permissions based on job function

.. code-block:: text

   Counter Staff:
   - inventory.view
   - sales.create
   - sales.view
   - quotes.create

   Warehouse Staff:
   - inventory.view
   - inventory.manage_stock
   - orders.view
   - orders.receive

Role-Based Assignment
---------------------

**Start with Roles:**

1. Determine user's primary job function
2. Assign appropriate role (User/Superuser/Admin)
3. Role grants base permissions automatically

**Customize with Explicit Grants:**

4. Identify gaps (permissions user needs but role doesn't grant)
5. Grant specific additional permissions
6. Document why user has custom permissions

**Example:**

.. code-block:: text

   Base Role: User
   Additional Grants:
   - orders.create (user manages ordering for their lab)
   - reports.financial (user tracks departmental spending)

   Reason: User is lab manager but not full Superuser

Regular Permission Audits
--------------------------

**Quarterly Review:**

1. Review all user accounts
2. Verify users still need assigned permissions
3. Remove permissions for changed roles
4. Deactivate accounts for departed users

**What to Check:**

- ✅ Users with custom permissions (not just role defaults)
- ✅ Admin accounts (are all still active admins?)
- ✅ Recently modified permissions
- ✅ Inactive accounts (last login > 90 days)

Documentation
-------------

**Maintain a Permission Matrix:**

Create a document mapping job titles to required permissions:

.. code-block:: text

   Job Title: Laboratory Assistant
   Required Permissions:
   - inventory.view
   - sales.create
   - quotes.create
   - orders.view

   Job Title: Lab Manager
   Required Permissions:
   - Superuser role (default permissions)
   - Additional: backup.view, reports.financial

**Benefits:**

- Consistent onboarding
- Quick reference for help desk
- Audit documentation

Common Permission Scenarios
===========================

Scenario 1: New Employee
------------------------

**Situation:** Onboarding a new warehouse worker

**Steps:**

1. Create user account with **User** role
2. Base permissions from role:

   - inventory.view
   - sales.view
   - orders.view

3. Grant additional permissions:

   - inventory.manage_stock (for stock adjustments)
   - orders.receive (for marking deliveries)

4. Test: Log in as user, verify access

Scenario 2: Promotion
---------------------

**Situation:** User promoted to department manager

**Steps:**

1. Change role from **User** to **Superuser**
2. User inherits expanded permissions
3. Grant additional if needed:

   - users.assign_chargecode (for budget management)
   - reports.financial (for financial oversight)

4. Remove custom User-level grants (no longer needed)
5. Notify user of new capabilities

Scenario 3: Temporary Access
-----------------------------

**Situation:** User needs temporary backup access during disaster recovery

**Steps:**

1. Grant ``backup.restore`` permission
2. Document reason: "DR Exercise 2025-01-15"
3. Notify security team
4. **After emergency:**

   - Revoke ``backup.restore``
   - Add note to audit log

5. Review logs for actions taken

Scenario 4: Department Reorganization
--------------------------------------

**Situation:** Merging two departments, consolidating charge codes

**Steps:**

1. Review all users in both departments
2. Identify who needs ``users.assign_chargecode``
3. Standardize permissions across merged department
4. Update permission matrix documentation
5. Train users on new charge code structure

Testing Permissions
===================

Test User Accounts
------------------

**Create test accounts for each role:**

.. code-block:: text

   test-user@example.com (Role: User)
   test-superuser@example.com (Role: Superuser)
   test-admin@example.com (Role: Admin)

**Use for:**

- Testing permission changes before applying to real users
- Training new admins
- Verifying feature access

Testing Workflow
----------------

1. **Make permission change** on test account
2. **Log in as test user** (incognito browser)
3. **Test feature access:**

   - Can user access the feature?
   - Does "Permission Denied" appear when expected?
   - Are UI elements hidden/shown correctly?

4. **Verify behavior** matches expectations
5. **Apply to production** users

Troubleshooting
===============

Common Issues
-------------

**User Can't Access Feature**

**Check:**

1. ✅ User has correct role
2. ✅ Required permission is granted
3. ✅ User logged out and back in (permissions cache)
4. ✅ Feature isn't disabled in settings
5. ✅ Browser cache cleared

**Solution:**

- Grant missing permission
- Have user refresh browser (Ctrl+Shift+R)
- Check server logs for permission errors

**Permission Changes Don't Apply**

**Check:**

1. ✅ Changes were saved (success toast appeared)
2. ✅ User logged out and back in
3. ✅ Correct user was modified
4. ✅ Database connection working

**Solution:**

- Log out all users (force token refresh)
- Check database permissions table
- Verify no caching issues

**User Has Too Much Access**

**Check:**

1. ✅ User's role (Admin has all permissions)
2. ✅ Explicit grants (custom permissions)
3. ✅ Group memberships (future feature)

**Solution:**

- Review user's explicit grants
- Downgrade role if too high
- Audit recent permission changes

Security Considerations
=======================

Admin Account Security
----------------------

**Best Practices:**

- ✅ Limit number of admin accounts
- ✅ Use strong, unique passwords
- ✅ Enable 2FA (when available)
- ✅ Review admin activity logs regularly
- ✅ Deactivate unused admin accounts

**Recommendation:** Maximum 3-5 admin accounts per institution

Critical Permissions
--------------------

**High-Risk Permissions:**

- ``backup.restore`` - Can overwrite database
- ``users.delete`` - Can remove user accounts
- ``migration.execute`` - Can modify schema
- ``settings.edit`` - Can change system behavior

**Protection:**

- Grant only to trusted admins
- Require approval for grants
- Log all uses
- Review regularly

Compliance
----------

**GDPR Considerations:**

- Limit ``reports.financial`` to necessary staff
- Audit user access to personal data
- Document permission grants for compliance

**Audit Trail:**

- All permission changes are logged
- Review logs for suspicious activity
- Export logs for compliance reporting

Related Documentation
=====================

- :doc:`settings-guide` - Settings > Permissions tab usage
- :doc:`../admin/user-management` - Creating and managing users
- :doc:`../admin/roles-permissions` - Role system architecture
- :doc:`../api/endpoints` - API permission requirements

Summary
=======

The LUStores permission system provides comprehensive access control:

✅ **45+ permissions** organized into 9 categories
✅ **Three-tier role system** (User, Superuser, Admin)
✅ **Permission inheritance** from roles
✅ **Explicit grants** for customization
✅ **Least privilege** security model
✅ **Audit logging** for compliance

**Key Takeaways:**

1. Start with roles, customize with explicit grants
2. Follow least privilege principle
3. Conduct regular permission audits
4. Document custom permission patterns
5. Test permission changes thoroughly
6. Protect critical system permissions

For permission management workflows, see :doc:`settings-guide` Tab 5: Permissions.
