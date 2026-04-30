Code Structure Guide
====================

This guide explains how the University Inventory Management System code is organized, making it easy for developers to understand and extend the application.

Project Architecture Overview
-----------------------------

The system follows a modern full-stack TypeScript architecture with clear separation between frontend, backend, and shared components:

.. code-block:: text

   LUStores/
   ├── .github/                   # GitHub Actions CI/CD workflows
   │   └── workflows/
   │       └── main.yml          # Comprehensive CI/CD pipeline
   ├── client/                    # React frontend application
   │   ├── src/
   │   │   ├── components/        # Reusable UI components
   │   │   ├── hooks/            # Custom React hooks
   │   │   ├── lib/              # Utility libraries
   │   │   ├── pages/            # Page components (routes)
   │   │   ├── App.tsx           # Main application component
   │   │   ├── main.tsx          # Application entry point
   │   │   └── index.css         # Global styles and CSS variables
   │   ├── index.html            # HTML template
   │   └── tsconfig.json         # Client TypeScript config
   ├── server/                   # Express.js backend
   │   ├── __tests__/            # Jest test suites
   │   ├── routes.ts             # API route definitions
   │   ├── storage.ts            # Database operations layer
   │   ├── dbConfig.ts           # Database connection setup
   │   ├── dbInit.ts             # Database initialization
   │   ├── localAuth.ts          # Email/password authentication
   │   ├── universitySso.ts      # SAML SSO integration
   │   ├── permissions.ts        # Role-based access control
   │   ├── backup.ts             # Database backup system
   │   ├── invoiceParser.ts      # PDF invoice processing
   │   └── index.ts              # Server entry point
   ├── shared/                   # Shared TypeScript definitions
   │   └── schema.ts             # Database schema and types
   ├── docker/                   # Docker configurations
   │   └── replit-auth/          # Local authentication service
   ├── performance-tests/        # k6 load testing scripts
   │   └── load-test.js          # Performance test definitions
   ├── scripts/                  # Build and deployment scripts
   │   ├── init-database.ts      # Database initialization
   │   ├── generate-migration.ts # Database migration generator
   │   └── test-automation.sh    # Test automation scripts
   ├── docs/                     # Sphinx documentation
   │   ├── admin/                # Administration guides
   │   ├── api/                  # API reference
   │   ├── developer/            # Developer documentation
   │   ├── deployment/           # Deployment guides
   │   ├── reference/            # Technical reference
   │   ├── tutorials/            # User tutorials
   │   └── user-guide/           # User documentation
   ├── tests/                    # Additional test files
   ├── migrations/               # Database migration files
   ├── coverage/                 # Test coverage reports
   ├── reports/                  # Generated test reports
   ├── logs/                     # Application logs
   ├── docker-compose.yml        # Development environment
   ├── docker-compose.prod.yml   # Production environment
   ├── Dockerfile                # Container definition
   ├── package.json              # Project dependencies
   ├── tsconfig.json             # Root TypeScript config
   ├── tsconfig.server.json      # Server TypeScript config
   ├── vite.config.ts            # Frontend build configuration
   ├── tailwind.config.ts        # Tailwind CSS configuration
   └── jest.config.js            # Jest testing configuration

Frontend Architecture (client/)
-------------------------------

React Application Structure
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Core Application Files:**

``client/src/App.tsx``
   Main application component that handles routing and authentication state. Contains the router logic that shows different pages based on user authentication status.

``client/src/main.tsx``
   Application entry point that sets up React Query, theming, and renders the main App component.

**Component Organization:**

``client/src/components/``
   Reusable UI components organized by functionality:

   - ``ui/`` - Base UI components (buttons, forms, cards) from shadcn/ui
   - ``InventoryTable.tsx`` - Main inventory display component
   - ``ItemModal.tsx`` - Add/edit item dialog with location/unit tracking **[ADDED 2025]**
   - ``Sidebar.tsx`` - Navigation sidebar with role-based menu items
   - ``TopBar.tsx`` - Header with user profile and notifications
   - ``StatsCards.tsx`` - Dashboard statistics display
   - ``DatabaseERD.tsx`` - Interactive database schema diagram **[ADDED 2025]**
   - ``DatabaseSchemaManager.tsx`` - Migration guide and schema documentation **[ADDED 2025]**

**Page Components:**

``client/src/pages/``
   Each page represents a route in the application:

   - ``Landing.tsx`` - Public landing page for unauthenticated users
   - ``Login.tsx`` - Authentication interface (both SSO and local)
   - ``Dashboard.tsx`` - Main dashboard with statistics and overview
   - ``Inventory.tsx`` - Inventory management with search, filters, location/unit tracking
   - ``SalesQuotes.tsx`` - Sales and quotes with 3-tier lifecycle (draft/saved/completed) **[ADDED 2025]**
   - ``Orders.tsx`` - Purchase order management with supplier tracking
   - ``Users.tsx`` - User management with charge code assignments **[UPDATED 2025]**
   - ``Settings.tsx`` - System settings with permission management **[UPDATED 2025]**
   - ``Reports.tsx`` - Report generation, analytics, and payment reconciliation **[UPDATED 2025]**
   - ``Backups.tsx`` - Database backup management (admin only)
   - ``Documentation.tsx`` - Embedded documentation viewer

**Utility Libraries:**

``client/src/lib/``
   Shared utility functions and helpers:

   - ``roleUtils.ts`` - Role display names and badge utilities **[ADDED 2025]**
   - ``queryClient.ts`` - React Query configuration
   - ``utils.ts`` - General utility functions

Backend Architecture (server/)
-------------------------------

Core Server Files
~~~~~~~~~~~~~~~~~

**Application Entry Point:**

``server/index.ts``
   Express.js server setup with middleware stack, session management, and route registration. Includes health check endpoint and graceful shutdown handling.

**API Route Definitions:**

``server/routes.ts``
   Complete API endpoint definitions with role-based access control. Routes are organized by domain:

   - **Items API**: CRUD operations with location/unit fields **[UPDATED 2025]**
   - **Sales & Quotes API**: Draft/saved/completed lifecycle management **[UPDATED 2025]**
   - **Orders API**: Purchase order management
   - **Users API**: User management with charge code assignments **[UPDATED 2025]**
   - **Charge Codes API**: Validation and assignment endpoints **[ADDED 2025]**
   - **Reports API**: Analytics with payment reconciliation **[UPDATED 2025]**
   - **Permissions API**: Permission management endpoints **[ADDED 2025]**

**Data Access Layer:**

``server/storage.ts``
   Database operations using Drizzle ORM. Provides abstraction for all database queries with type safety.

**Database Configuration:**

``server/dbConfig.ts``
   PostgreSQL connection setup with connection pooling and error handling.

``server/dbInit.ts``
   Database initialization and schema verification on startup.

Authentication and Authorization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Local Authentication:**

``server/localAuth.ts``
   Email/password authentication with bcrypt hashing. Supports password reset and must-change-password flows.

**SSO Integration:**

``server/universitySso.ts``
   SAML-based university single sign-on integration with automatic user provisioning.

**Permission System:** **[ADDED 2025]**

``server/permissions.ts``
   Three-tier role-based access control:

   - **User**: Restricted to assigned charge codes, read-only inventory
   - **Manager**: Access to all charge codes, full CRUD operations
   - **System Admin**: Full system access including user management

   Permission checking middleware:

   .. code-block:: typescript

      // Check specific permission
      requirePermission('manage_users')

      // Check role level
      requireRole(['admin', 'superuser'])

      // Combined role and permission check
      requireRole('superuser', { permissions: ['create_orders'] })

**Charge Code Assignment:** **[ADDED 2025]**

Database table: ``charge_code_assignments``
   Links users to authorized charge codes with assignment tracking (who assigned, when, notes).

Business Logic Modules
~~~~~~~~~~~~~~~~~~~~~~~

**Charge Code Validation:** **[ADDED 2025]**

Validation rules enforced server-side:

1. **Existence Check**: Code must exist in ``chargecodes`` table
2. **Time Validity**: ``validFrom`` and ``validUntil`` date range checks
3. **Hold Status**: Reject codes with ``onHold = true``
4. **Category Restrictions**: Check ``charge_code_exclusions`` table
5. **User Authorization**: Verify user has access (basic users only see assigned codes)
6. **PIN Protection**: Require PIN for high-value codes (if configured)

**Sales Lifecycle Management:** **[UPDATED 2025]**

Three-tier quote/sale system:

1. **Draft Quotes** (Session-based):
   - Stored in Redis with 4-hour expiration
   - Tied to ``sessionId``
   - Items not reserved (stock can change)
   - Can be saved or processed directly

2. **Saved Quotes** (Persistent):
   - Stored in ``quotes`` table with status ``saved``
   - Named quotes with customer information
   - Can be edited, duplicated, or processed
   - No stock reservation

3. **Completed Sales** (Immutable):
   - Stored in ``sales`` table with status ``completed``
   - Stock immediately deducted
   - Charge code validated and locked in
   - Full audit trail via ``stock_movements``
   - ``isPaid = false`` (payment reconciliation comes later)

4. **Paid Sales** (Reconciled):
   - Same as completed but ``isPaid = true``
   - Indicates accounting reconciliation complete
   - Marked via Reports page

**Sale Processing Transaction:**

.. code-block:: typescript

   // Atomic transaction for quote → sale conversion
   async function processSale(quoteId: string, chargeCode: string) {
     return db.transaction(async (tx) => {
       // 1. Validate charge code
       await validateChargeCode(chargeCode, items, userId);

       // 2. Create sale record
       const sale = await tx.insert(sales).values({
         chargeCode,
         status: 'completed',
         isPaid: false,
         totalAmount,
       });

       // 3. Create sale item snapshots (immutable)
       await tx.insert(saleItems).values(
         items.map(item => ({
           saleId: sale.id,
           itemId: item.id,
           name: item.name,  // Snapshot
           sku: item.sku,    // Snapshot
           price: item.price, // Snapshot at time of sale
           vatRate: item.vatRate,
           location: item.location,  // For picking
           unit: item.unit,          // For quantity interpretation
           quantity: item.quantity,
         }))
       );

       // 4. Deduct stock and create audit trail
       for (const item of items) {
         await tx.update(items)
           .set({ currentStock: sql`${items.currentStock} - ${item.quantity}` })
           .where(eq(items.id, item.id));

         await tx.insert(stockMovements).values({
           itemId: item.id,
           type: 'out',
           quantity: item.quantity,
           reason: `Sale ${sale.id}`,
           performedBy: userId,
         });
       }

       // 5. Clear draft quote or mark saved quote as processed
       if (isDraftQuote) {
         await clearDraftQuote(sessionId);
       } else {
         await tx.update(quotes)
           .set({ status: 'processed' })
           .where(eq(quotes.id, quoteId));
       }

       return sale;
     });
   }

**Invoice Parsing:**

``server/invoiceParser.ts``
   PDF invoice processing for automated data extraction from supplier invoices.

**Database Backup:**

``server/backup.ts``
   Automated PostgreSQL backup system with compression and retention policies.

DevOps and Testing Infrastructure
---------------------------------

CI/CD Pipeline Structure
~~~~~~~~~~~~~~~~~~~~~~~~

The application uses GitHub Actions for comprehensive CI/CD automation:

**GitHub Actions Workflow** (`.github/workflows/main.yml`):
   - **Setup Dependencies**: Node.js and Docker layer caching
   - **Lint and Type Check**: Code quality validation
   - **Unit Tests**: Jest testing with PostgreSQL service container  
   - **Security Scan**: npm audit, Retire.js, and Trivy vulnerability scanning
   - **Docker Build**: Multi-stage container building and testing
   - **Performance Tests**: k6 load testing (main branch only)
   - **Integration Tests**: Full stack testing with Docker Compose
   - **Documentation**: Auto-generated docs with test result integration

Performance Testing
~~~~~~~~~~~~~~~~~~~

**k6 Load Testing** (``performance-tests/load-test.js``):
   - **Health Endpoint Testing**: Application availability and response times
   - **Authentication Flow**: Login/logout performance validation
   - **API Endpoint Testing**: Public API response time validation
   - **Concurrent User Simulation**: 20 users with staged load testing
   - **Performance Thresholds**: 95th percentile under 500ms, <10% error rate

**Test Execution Environment:**
   - Full Docker Compose stack (app, replit-auth, database, redis)
   - Service health checks and readiness validation
   - Performance metrics collection and dashboard integration

Testing Framework
~~~~~~~~~~~~~~~~

**Jest Test Structure** (``server/__tests__/``):
   - **Unit Tests**: Individual component and function testing
   - **Integration Tests**: API endpoint and database interaction testing
   - **End-to-End Tests**: Complete workflow validation
   - **Coverage Reporting**: Automated lcov report generation

**Test Database Configuration:**
   - PostgreSQL 15 Alpine service container for CI/CD
   - Isolated test database per workflow run
   - Automatic schema initialization via ``init.sql``
   - Environment-specific configurations

Docker Infrastructure
~~~~~~~~~~~~~~~~~~~~

**Container Architecture:**
   - **Development**: ``docker-compose.yml`` with hot reload volumes
   - **Production**: ``docker-compose.prod.yml`` optimized for deployment
   - **Testing**: ``docker-compose.test-prod.yml`` for CI/CD validation
   - **Multi-stage Dockerfile**: Separate development and production targets

**Service Components:**
   - **Main Application**: Node.js Express server with React frontend
   - **Authentication Service**: ``docker/replit-auth/`` local OIDC provider
   - **Database**: PostgreSQL with automated migrations
   - **Redis**: Session storage and caching
   - **pgAdmin**: Database administration interface (development)

Documentation System
~~~~~~~~~~~~~~~~~~~~

**Sphinx Documentation** (``docs/``):
   - **ReStructuredText**: Primary documentation format
   - **Auto-generated API Docs**: TypeScript API reference
   - **Test Result Integration**: Coverage reports and test results
   - **CI/CD Dashboard**: Interactive navigation interface
   - **GitHub Pages Deployment**: Automated documentation publishing

Database Schema and Migrations
-------------------------------

Schema Organization
~~~~~~~~~~~~~~~~~~~

**Shared Schema Definition** (``shared/schema.ts``):

The database schema is defined using Drizzle ORM with full TypeScript type safety. All tables are exported with inferred TypeScript types.

**Key Tables and Recent Additions:**

**Core Tables:**

- ``users`` - User accounts with role (user/superuser/admin) **[UPDATED 2025]**
- ``items`` - Inventory items with ``location`` and ``unit`` fields **[UPDATED 2025]**
- ``categories`` - Item categorization
- ``suppliers`` - Supplier management
- ``chargecodes`` - Charge codes with validity dates and hold status

**Sales and Orders:**

- ``quotes`` - Saved quotes with status (saved/processed) **[UPDATED 2025]**
- ``quote_items`` - Line items for saved quotes
- ``sales`` - Completed sales with ``isPaid`` flag **[UPDATED 2025]**
- ``sale_items`` - Immutable snapshots with location/unit **[UPDATED 2025]**
- ``orders`` - Purchase orders
- ``order_items`` - Purchase order line items

**Audit and Tracking:**

- ``stock_movements`` - Complete audit trail for all stock changes
- ``notes`` - Attachable notes for items, suppliers, orders, charge codes

**Permission System** **[ADDED 2025]**:

- ``permissions`` - System-wide permissions (45 permissions)
- ``user_permissions`` - User-specific permission assignments
- ``charge_code_assignments`` - Links users to authorized charge codes **[NEW TABLE]**

**Session Management:**

- ``sessions`` - Express session storage (PostgreSQL Connect)

**Critical Field Additions** **[ADDED 2025]**:

.. code-block:: typescript

   // items table
   export const items = pgTable('items', {
     // ... existing fields
     location: varchar('location', { length: 255 }),  // Physical storage
     unit: varchar('unit', { length: 50 }),           // Measurement unit
     vatIncluded: boolean('vat_included').default(false), // Price interpretation
   });

   // sales table
   export const sales = pgTable('sales', {
     // ... existing fields
     isPaid: boolean('is_paid').default(false),  // Payment reconciliation
     chargeCode: varchar('charge_code', { length: 50 }).notNull(),
   });

   // sale_items table (snapshots)
   export const saleItems = pgTable('sale_items', {
     // ... existing fields
     location: varchar('location', { length: 255 }),  // For picking
     unit: varchar('unit', { length: 50 }),           // For interpretation
     price: decimal('price', { precision: 10, scale: 2 }), // Snapshot
     vatRate: decimal('vat_rate', { precision: 5, scale: 2 }), // Snapshot
   });

   // charge_code_assignments table (NEW)
   export const chargeCodeAssignments = pgTable('charge_code_assignments', {
     id: serial('id').primaryKey(),
     userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
     chargeCode: varchar('charge_code', { length: 50 }).notNull().references(() => chargeCodes.code, { onDelete: 'cascade' }),
     assignedBy: varchar('assigned_by').references(() => users.id),
     assignedAt: timestamp('assigned_at').defaultNow(),
     notes: text('notes'),
   }, (table) => ({
     uniqueUserChargeCode: unique('unique_user_charge_code').on(table.userId, table.chargeCode),
   }));

Migration System
~~~~~~~~~~~~~~~~

**Migration Files** (``migrations/``):

Sequential SQL migration files with numbering convention:

- ``001_initial_schema.sql`` - Base tables
- ``002_add_categories.sql`` - Category system
- ...
- ``013_add_charge_code_assignments.sql`` - Permission system **[ADDED 2025]**

**Migration Execution:**

1. **Docker Startup** (``init.sql``):
   - Runs on first database initialization
   - Creates all tables if they don't exist
   - Includes latest schema with all fields

2. **Data Migration Script** (``data_migration_script.py``):
   - Auto-detects migration files in ``migrations/`` directory
   - Tracks applied migrations in ``schema_migrations`` table
   - Applies only new migrations in sequence
   - Used for upgrading existing databases

3. **Manual Migration** (``scripts/generate-migration.ts``):
   - Generates new migration files with proper numbering
   - Includes template for up/down migrations

**Migration Dependency Order:**

See :doc:`database-organization` for complete migration tier breakdown.

Key Dependencies:
- Tier 1: Users, sessions, permissions (no dependencies)
- Tier 2: Items, categories, suppliers, charge codes (depend on users)
- Tier 3: Charge code assignments (depend on users and charge codes)
- Tier 4: Quotes, orders (depend on items, suppliers)
- Tier 5: Sales, stock movements (depend on quotes, items)

Authentication Flow
-------------------

Multi-Modal Authentication System
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The system supports both university SSO and local accounts with a unified flow:

**1. Route Protection:**

.. code-block:: typescript

   // Middleware stack
   app.get('/api/protected',
     requireAuth,                    // Verify user is logged in
     requireRole(['admin', 'superuser']), // Check role permissions
     requirePermission('view_reports'),    // Check specific permission
     (req, res) => {
       // Handle authenticated request
     }
   );

**2. Role-Based Access Control:**

.. code-block:: typescript

   export function requireRole(roles: string | string[]) {
     return (req: Request, res: Response, next: NextFunction) => {
       const user = req.user as any;
       const userRole = user?.role;

       const allowedRoles = Array.isArray(roles) ? roles : [roles];

       if (!allowedRoles.includes(userRole)) {
         return res.status(403).json({ message: "Insufficient permissions" });
       }

       next();
     };
   }

**3. Permission-Based Access Control:** **[ADDED 2025]**

.. code-block:: typescript

   export function requirePermission(permissionName: string) {
     return async (req: Request, res: Response, next: NextFunction) => {
       const user = req.user as any;

       // System admins bypass permission checks
       if (user.role === 'admin') {
         return next();
       }

       // Check if user has specific permission
       const hasPermission = await db
         .select()
         .from(userPermissions)
         .where(
           and(
             eq(userPermissions.userId, user.id),
             eq(userPermissions.permissionName, permissionName)
           )
         )
         .limit(1);

       if (!hasPermission.length) {
         return res.status(403).json({
           message: "You don't have permission to perform this action"
         });
       }

       next();
     };
   }

**4. Charge Code Authorization:** **[ADDED 2025]**

.. code-block:: typescript

   // Check if user can use a specific charge code
   export async function canUseChargeCode(
     userId: string,
     chargeCode: string
   ): Promise<boolean> {
     const user = await getUserById(userId);

     // Managers and admins can use any charge code
     if (user.role === 'admin' || user.role === 'superuser') {
       return true;
     }

     // Basic users can only use assigned charge codes
     const assignment = await db
       .select()
       .from(chargeCodeAssignments)
       .where(
         and(
           eq(chargeCodeAssignments.userId, userId),
           eq(chargeCodeAssignments.chargeCode, chargeCode)
         )
       )
       .limit(1);

     return assignment.length > 0;
   }

Three-Tier Permission Model
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**User (Basic Role):**

- View inventory (read-only)
- Create quotes and sales (with assigned charge codes only)
- View own purchase history
- Cannot manage users, items, or system settings

**Manager (Superuser Role):**

- All User permissions
- Full CRUD on inventory items (with location/unit)
- Use any charge code (no restrictions)
- Create and manage purchase orders
- View all reports and analytics
- Assign charge codes to basic users
- Cannot manage system users or permissions

**System Admin (Admin Role):**

- All Manager permissions
- User management (create, edit, delete, password reset)
- Permission assignment and role changes
- System configuration and settings
- Database backups and recovery
- Full system access (bypasses all permission checks)

Role Display Mapping
~~~~~~~~~~~~~~~~~~~~~

**Frontend Display Names** (``client/src/lib/roleUtils.ts``):

.. code-block:: typescript

   export const ROLE_DISPLAY_NAMES = {
     user: 'User',           // Basic role
     superuser: 'Manager',   // Full operations, no user mgmt
     admin: 'System Admin'   // Full system access
   };

This ensures consistent labeling throughout the UI while maintaining database compatibility with existing role values.

Related Documentation
---------------------

For more detailed information on specific components:

- :doc:`database-organization` - Complete database schema and migration details
- :doc:`deployment-architecture` - Deployment, Docker, CI/CD, and production setup
- :doc:`../explanations/concepts` - Business logic and system concepts
- :doc:`../tutorials/managing-inventory` - User guide for inventory management
- :doc:`../tutorials/taking-sales` - User guide for sales and charge code validation
- :doc:`../reference/troubleshooting` - Common development issues and solutions

Summary
-------

This code structure provides a solid foundation for university-grade inventory management while maintaining developer productivity and code quality. Recent additions in 2025 (permission system, location/unit tracking, charge code validation, and sales lifecycle management) have significantly enhanced the system's capabilities for enterprise deployment.