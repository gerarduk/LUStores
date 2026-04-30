Frequently Asked Questions (FAQ)
=================================

This comprehensive FAQ addresses common questions from users, administrators, and developers. Questions are organized by topic for easy navigation.

.. contents:: Quick Navigation
   :local:
   :depth: 2

---

User Questions
--------------

Sales and Quotes
~~~~~~~~~~~~~~~~

**Q: Why can't I add items to my quote?**

A: There are several possible reasons:

1. **Insufficient Stock**: The system validates stock availability. Check the item's current stock level in the Browse Items tab.
   - Solution: Reduce quantity to available amount or contact inventory manager for restock timeline

2. **Item Inactive**: The item may have been marked as inactive
   - Solution: Search for active items only or contact admin to reactivate

3. **Permission Issue**: Your role may not allow quote creation
   - Solution: Verify your user role with administrator

4. **Session Expired**: Draft quote session may have timed out (4-hour expiry)
   - Solution: Refresh page and start a new quote

**Q: What's the difference between saving a quote and processing a quote?**

A: These are fundamentally different actions:

**Saving a Quote**:
   - Creates a **persistent, named quote** in the database
   - Quote can be edited, duplicated, or deleted later
   - **No stock deduction** - items remain in inventory
   - Use for: Quotes requiring approval, recurring orders

**Processing a Quote**:
   - Converts quote into a **completed sale**
   - Stock is **immediately deducted** from inventory
   - Transaction is **immutable** (can only be refunded)
   - Requires valid charge code
   - Use for: Final transaction when items leave stockroom

**Q: How do I mark a sale as paid?**

A: Follow these steps:

1. Navigate to **Reports** page (left sidebar)
2. Use filters to find the sale:
   - Filter by charge code
   - Set date range
   - Select "Unpaid Only" in payment status filter
3. Locate your sale in the list
4. Click the **"Mark as Paid"** button next to the sale
5. Confirm the action

**Note**: Only managers and admins can mark sales as paid. Basic users cannot access the Reports page.

**Q: Why do I need a charge code for every sale?**

A: Charge codes are mandatory for financial accountability:

**Financial Tracking**:
   - Links every sale to a specific departmental budget
   - Enables cost recovery and inter-departmental billing
   - Required for financial audits and reporting

**Budget Management**:
   - Prevents overspending on unauthorized accounts
   - Tracks grant funding and project expenses
   - Enforces budget allocation rules

**Compliance**:
   - University financial regulations require charge code tracking
   - Demonstrates proper fiscal responsibility
   - Provides audit trail for all expenditures

**Q: What does "charge code on hold" mean?**

A: A charge code placed "on hold" is temporarily restricted from use:

**Common Reasons**:
   - **Budget freeze**: Department budget pending approval or renewal
   - **Overspent**: Code has exceeded allocated budget
   - **Pending renewal**: Code expired and awaiting new fiscal year allocation
   - **Investigation**: Under review for irregularities

**What to Do**:
   1. Check the hold reason (shown in error message)
   2. Contact your department administrator or finance office
   3. Use an alternative charge code if available
   4. Wait for hold to be lifted (admin will update status)

**Q: Can I edit a sale after it's been processed?**

A: **No, completed sales are immutable** to maintain audit integrity.

**Why?**:
   - Stock has already been deducted
   - Audit trail must remain accurate
   - Financial records are locked once created

**If you need to correct a sale**:
   - Use the **refund workflow** to return items to stock
   - Create a new sale with correct information
   - Add notes explaining the correction

**Q: How do I find items with specific locations?**

A: Location search depends on your role:

**Admin Users**:
   - Access **Inventory** page
   - Location field visible in item list
   - Use search/filter to find items by location
   - Example: Search "Room 204" to find all items in that room

**Basic Users**:
   - Location not visible in inventory browse (admin-only feature)
   - Location **is shown** when processing quotes (on picking lists)
   - Request location information from administrator if needed

Inventory and Stock
~~~~~~~~~~~~~~~~~~~

**Q: What does "Low Stock" mean?**

A: Low stock indicates items approaching depletion:

**Thresholds**:
   - **In Stock**: More than 5 units available (or above minimum stock setting)
   - **Low Stock**: 1-5 units available (or below minimum stock setting)
   - **Out of Stock**: 0 units available

**What to Do**:
   - **Users**: Avoid ordering low-stock items; check with manager first
   - **Managers**: Create purchase order to restock
   - **Admins**: Review minimum stock thresholds and adjust if needed

**Q: Why can't I see item locations?**

A: **Location visibility is restricted to admins** to prevent unauthorized access to storage areas.

**Where Locations ARE Visible**:
   - **Admin Inventory View**: Full location shown in item list
   - **Sale Conversion**: Location included on picking lists when processing quotes
   - **Exported Reports**: Admins can export with locations

**Why Restricted?**:
   - Security: Prevents unauthorized access to high-value storage areas
   - Workflow: Only warehouse staff and admins need location access

**Q: What are "units" and why do they matter?**

A: Units specify how quantities are measured:

**Examples**:
   - **Pieces**: Countable items (chairs, monitors, microscopes)
   - **Meters**: Length-based (cables, tubing, fabric)
   - **Kilograms**: Weight-based (chemicals, bulk materials)
   - **Liters**: Volume-based (liquids, solutions)

**Why Important?**:
   - **Prevents Errors**: "2.5" could mean 2.5 meters or 2.5 pieces - unit clarifies
   - **Correct Inventory**: Ensures accurate quantity interpretation
   - **Fractional Quantities**: Allows "15.5 meters" for non-countable items

Charge Codes
~~~~~~~~~~~~

**Q: My charge code is valid, but I get "not authorized" error. Why?**

A: You may not be authorized to use that specific charge code:

**Reason**: The charge code has **user authorization restrictions**:
   - Configured in ``charge_code_assignments`` table
   - Only listed users can use the code
   - Basic users are restricted to assigned codes only

**Solution**:
   1. **Contact Admin**: Request access to the charge code
   2. **Use Assigned Code**: Check which codes you're authorized for
   3. **Manager/Admin Help**: They can assign codes to your account

**Q: Can charge codes expire?**

A: **Yes**, charge codes can have time validity windows:

**Validity Fields**:
   - ``validFrom``: Code activates on this date
   - ``validUntil``: Code expires after this date

**Use Cases**:
   - **Fiscal Year Codes**: Valid for one academic/calendar year
   - **Project Codes**: Linked to grant duration (e.g., 3-year research grant)
   - **Temporary Codes**: Short-term event or project budgets

**What Happens When Expired**:
   - Code cannot be used for new sales
   - Error message: "Charge code has expired"
   - Contact finance department for renewal or new code

Reports and Analytics
~~~~~~~~~~~~~~~~~~~~~

**Q: How do I export sales data to Excel?**

A: Follow these steps:

1. Navigate to **Reports** page
2. Apply filters:
   - Date range
   - Charge code
   - Payment status
3. Click **"Export to Excel"** or **"Download XLSX"** button
4. File downloads with name like ``sales-report-2025-01-29.xlsx``

**Contains**:
   - Sale ID, Date, User
   - Charge code
   - Items with quantities and prices
   - VAT breakdown
   - Total amounts
   - Payment status

**Q: Can I see sales from other users?**

A: Depends on your role:

**Basic Users**:
   - **Cannot access Reports page** at all
   - Can only see their own quote history

**Managers**:
   - **Full access to all sales** across all users
   - Can filter by charge code, date, user
   - Can export reports

**Admins**:
   - **Full access like managers**
   - Plus user management capabilities

---

Administrator Questions
-----------------------

User Management
~~~~~~~~~~~~~~~

**Q: How do I assign charge codes to users?**

A: Use the Charge Code Manager on the Users page:

1. Navigate to **Users** page (admin-only)
2. Select the user you want to modify
3. Scroll to **"Charge Code Assignments"** section
4. Click **"Assign Charge Code"** button
5. Select charge code from dropdown
6. Click **"Save"** to confirm

**Result**:
   - User can now use the assigned charge code for sales
   - Basic users are restricted to assigned codes only
   - Managers and admins have access to all codes (no restrictions)

**Q: How do I backup the database?**

A: Use Docker commands for PostgreSQL backup:

**Create Backup**:

.. code-block:: bash

   # From host machine
   docker exec lustores_db pg_dump -U postgres inventory > backup-$(date +%Y%m%d).sql

   # With compression
   docker exec lustores_db pg_dump -U postgres inventory | gzip > backup-$(date +%Y%m%d).sql.gz

**Automated Backups**:
   - See :doc:`/admin/backup-restore` for automated backup scripts
   - Recommended: Daily backups with 7-day retention

**Q: How do I add a new user?**

A: Create users through the Users page:

1. Navigate to **Users** page (admin-only)
2. Click **"Add User"** button
3. Fill in required fields:
   - Email (will be username)
   - Full name
   - Role (User, Manager, or System Admin)
4. Optionally assign charge codes (if role is User)
5. Click **"Create User"**

**Initial Password**:
   - System generates temporary password
   - User receives email with login credentials (if email configured)
   - User should change password on first login

**Q: Can I change a user's role after creation?**

A: **Yes**, roles can be updated:

1. Navigate to **Users** page
2. Click **"Edit"** next to the user
3. Change **Role** dropdown:
   - User (basic access, charge code restrictions)
   - Manager (operations access, no user management)
   - System Admin (full access)
4. Click **"Save"**

**Effect of Role Change**:
   - **User → Manager**: Gains access to Reports, Orders, all charge codes
   - **Manager → Admin**: Gains user management and system configuration access
   - **Admin → Manager**: Loses user management (be careful!)

Charge Codes and Permissions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Q: How do I put a charge code on hold?**

A: Update the charge code status:

1. Navigate to **Settings** → **Charge Codes** (admin-only)
2. Find the charge code to hold
3. Click **"Edit"**
4. Check **"Place on Hold"** checkbox
5. Enter **"Hold Reason"** (required):
   - Example: "Budget freeze pending Q2 approval"
   - Example: "Code overspent - awaiting finance review"
6. Click **"Save"**

**Effect**:
   - Code cannot be used for new sales
   - Users see error: "Charge code is on hold: [your reason]"
   - Existing sales using this code are unaffected

**To Release Hold**:
   - Edit charge code, uncheck "Place on Hold", save

**Q: How do I set up category exclusions for charge codes?**

A: Configure exclusions in Charge Code settings:

1. Navigate to **Settings** → **Charge Codes**
2. Select charge code to configure
3. Click **"Category Exclusions"** tab
4. Select categories this code **cannot** be used for
5. Click **"Save"**

**Example Use Case**:
   - "Office Supplies" code → Exclude "IT Equipment" category
   - Result: Users cannot buy computers with office supply budget

**Q: What's the difference between User, Manager, and System Admin roles?**

A: Each role has specific capabilities:

**User (Basic Access)**:
   - **Can Do**: Create sales/quotes with assigned charge codes, view inventory
   - **Cannot Do**: Access reports, manage orders, edit inventory
   - **Charge Codes**: Restricted to assigned codes only
   - **Use Case**: Department staff, students

**Manager (Operations)**:
   - **Can Do**: Everything users can do PLUS manage orders, view reports, edit inventory, use all charge codes
   - **Cannot Do**: Manage users, configure system settings
   - **Charge Codes**: Full access to all codes
   - **Use Case**: Department managers, lab supervisors

**System Admin (Full Control)**:
   - **Can Do**: Everything managers can do PLUS user management, charge code assignment, system configuration
   - **Unrestricted**: Full access to all features
   - **Use Case**: IT administrators, senior inventory managers

System Configuration
~~~~~~~~~~~~~~~~~~~~

**Q: How do I add a new category?**

A: Create categories in Settings:

1. Navigate to **Settings** → **Categories** (admin-only)
2. Click **"Add Category"** button
3. Enter category details:
   - Name (e.g., "Laboratory Equipment")
   - Description (optional)
   - Parent category (for hierarchical organization)
4. Click **"Save"**

**Result**:
   - Category available for item classification
   - Can be used in charge code exclusions
   - Shows in filters and reports

**Q: How do I enable/disable user registration?**

A: User registration is **admin-controlled** - users cannot self-register:

**Creating New Users**:
   - Only admins can create user accounts
   - No public registration page
   - Prevents unauthorized access

**For SSO Integration**:
   - See :doc:`/deployment/university-sso` for single sign-on setup
   - Allows automatic user provisioning from university identity system

---

Developer Questions
-------------------

Development and Testing
~~~~~~~~~~~~~~~~~~~~~~~

**Q: How do I run tests locally?**

A: Use Docker Compose test profiles:

**Unit Tests**:

.. code-block:: bash

   # Run all unit tests
   docker-compose run --rm test

   # Run specific test file
   docker-compose run --rm test npm test -- users.test.ts

   # Run with coverage
   docker-compose run --rm test-coverage

**Integration Tests**:

.. code-block:: bash

   # Run integration test suite
   docker-compose --profile integration run --rm test-integration

**E2E Tests** (Playwright):

.. code-block:: bash

   # Start E2E environment
   docker-compose -f docker-compose.yml -f docker-compose.e2e.yml up -d

   # Run E2E tests
   npx playwright test

**Watch Mode**:

.. code-block:: bash

   docker-compose run --rm test-watch

**Q: How do I add a new database migration?**

A: Follow the migration numbering system:

1. **Check Latest Migration**:

   .. code-block:: bash

      ls migrations/
      # Example output: 013_add_charge_code_assignments.sql

2. **Create New Migration** (next number):

   .. code-block:: bash

      # Create 014_your_migration_name.sql
      touch migrations/014_add_your_feature.sql

3. **Write SQL**:

   .. code-block:: sql

      -- File: migrations/014_add_your_feature.sql
      -- Description: Add new feature to database

      ALTER TABLE items ADD COLUMN new_field VARCHAR(255);
      CREATE INDEX idx_items_new_field ON items(new_field);

4. **Test Migration**:

   - Run migration script to verify syntax
   - Test on development database first
   - Verify rollback if needed

5. **Add to init.sql** (for new deployments):

   - Copy changes to ``init.sql`` for fresh database setups

**Important**:
   - **Sequential numbering**: Ensures correct migration order
   - **idempotent**: Use ``IF NOT EXISTS`` where possible
   - **No breaking changes**: Avoid DROP without migration path

**Q: How does Watchtower auto-update work?**

A: Watchtower monitors Docker containers and automatically updates them:

**How It Works**:

1. **Monitoring**: Checks Docker Hub every 15 minutes
2. **Comparison**: Compares running image with latest on Docker Hub
3. **Update**: If new image available:
   - Pulls latest image
   - Stops current container
   - Starts new container with same configuration
   - Removes old image
4. **Notification**: Sends webhook to app's ``/api/webhook/watchtower`` endpoint

**Configuration** (in ``docker-compose.prod.yml``):

.. code-block:: yaml

   watchtower:
     image: containrrr/watchtower
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock
     environment:
       - WATCHTOWER_POLL_INTERVAL=900  # 15 minutes
       - WATCHTOWER_LABEL_ENABLE=true
       - WATCHTOWER_NOTIFICATION_WEBHOOK_URL=http://app:5000/api/webhook/watchtower
     labels:
       - com.centurylinklabs.watchtower.enable=true

**Controlling Updates**:
   - Containers with label ``com.centurylinklabs.watchtower.enable=true`` are monitored
   - Remove label to disable auto-update for specific service
   - Stop Watchtower service to disable all auto-updates

**Rollback If Needed**:

.. code-block:: bash

   # List image history
   docker images lustores/app --format "{{.ID}} {{.CreatedAt}}"

   # Run specific older version
   docker-compose down
   docker run -d --name lustores_app lustores/app:

<IMAGE_SHA>

Architecture and Code
~~~~~~~~~~~~~~~~~~~~~

**Q: Where is the permission system logic located?**

A: Permission system spans multiple files:

**Backend**:
   - ``server/middleware-permissions.ts``: Permission middleware
   - ``server/storage-extensions-charge-codes.ts``: Charge code assignment methods
   - ``server/routes.ts``: Protected routes with ``requirePermission()``
   - ``shared/schema.ts``: ``charge_code_assignments`` table definition

**Frontend**:
   - ``client/src/components/ChargeCodeManager.tsx``: Admin UI for assignments
   - ``client/src/lib/roleUtils.ts``: Role display utilities
   - ``client/src/pages/Settings.tsx``: Permission editing UI

**Database**:
   - ``charge_code_assignments`` table: User-to-charge-code mappings
   - ``permissions`` table: 45 default permissions

**Q: How does charge code validation flow work?**

A: Charge code validation is multi-layered:

**Frontend Validation** (UX):
   1. User enters charge code in sales form
   2. ``onBlur`` event triggers validation API call
   3. ``/api/chargecodes/{code}/validate`` endpoint called
   4. Real-time feedback shown (valid/invalid with reason)

**Backend Validation** (Security):
   1. When processing quote: ``POST /api/sales/quotes/:id/process``
   2. Server calls ``validateChargeCode(code, userId, itemCategories)``
   3. Checks performed:
      - Existence in database
      - Time validity (validFrom/validUntil)
      - Hold status (isOnHold)
      - Category exclusions
      - User authorization (for basic users)
   4. If any check fails: HTTP 400 with detailed error message
   5. If all pass: Sale created, stock deducted

**Key Insight**:
   - **Never trust frontend**: Backend re-validates everything
   - **Atomic transaction**: Validation and stock deduction in same transaction
   - **Detailed errors**: User gets specific reason for rejection

**Q: Where should I add a new API endpoint?**

A: API endpoints are organized in ``server/routes.ts``:

**Structure**:

.. code-block:: typescript

   // Existing endpoint pattern
   app.post('/api/resource', requirePermission('permission_name'), async (req, res) => {
     // Handler logic
   });

**Steps to Add New Endpoint**:

1. **Import Dependencies**:

   .. code-block:: typescript

      import { requirePermission } from './middleware-permissions';

2. **Define Route**:

   .. code-block:: typescript

      app.post('/api/your-feature', requirePermission('your_permission'), async (req, res) => {
        try {
          // Input validation
          const { field1, field2 } = req.body;

          // Business logic
          const result = await storage.yourMethod(field1, field2);

          // Response
          res.json({ success: true, data: result });
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      });

3. **Add Permission** (if new permission needed):

   - Add to ``scripts/seed-permissions.ts``
   - Re-run seed script to add to database

4. **Add Storage Method** (if needed):

   - Add method to ``server/storage.ts``
   - Use prepared statements for SQL

5. **Test**:

   - Add unit test in ``tests/unit/``
   - Add integration test if needed

**Best Practices**:
   - Use ``requirePermission()`` middleware for protected routes
   - Validate all inputs
   - Use try-catch for error handling
   - Return consistent JSON responses

---

Troubleshooting
---------------

**Q: Where can I find solutions to common deployment issues?**

A: See dedicated troubleshooting resources:

   - :doc:`/reference/troubleshooting` - General troubleshooting guide
   - :doc:`/operations/system-recovery` - Emergency recovery procedures (how to restart, backup/restore)
   - :doc:`/deployment/docker` - Docker-specific issues

**Q: The documentation doesn't answer my question. What do I do?**

A: Additional support resources:

1. **Check Recent Updates**: See :doc:`/reference/changelog` for new features
2. **Search Documentation**: Use search function (top right)
3. **System Management API**: Use built-in diagnostics (admin access)
4. **Contact Support**: Email inventory-support@university.edu with:
   - Your role (user/manager/admin)
   - Detailed description of issue
   - Steps to reproduce
   - Error messages (screenshots helpful)
   - System information (browser, OS if frontend issue)

**Q: How do I report a bug or request a feature?**

A: Follow these channels:

**Bug Reports**:
   - Email: inventory-support@university.edu
   - Include: Steps to reproduce, expected vs actual behavior, error messages
   - Urgency level: Critical/High/Medium/Low

**Feature Requests**:
   - Submit via internal ticketing system
   - Describe use case and benefit
   - Include mockups or examples if applicable

**Security Issues**:
   - **Do NOT use public channels**
   - Email security@university.edu directly
   - We take security seriously and respond promptly
