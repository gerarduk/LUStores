System Architecture
===================

This document provides a comprehensive overview of the University Inventory Management System architecture, including component relationships, data flow, and design decisions.

Overview
--------

The system follows a modern full-stack architecture with clear separation of concerns:

.. code-block:: text

   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │   Client (React)│    │  Server (Node)  │    │ Database (PG)   │
   │                 │◄──►│                 │◄──►│                 │
   │ - UI Components │    │ - REST API      │    │ - Tables        │
   │ - State Mgmt    │    │ - Auth          │    │ - Relations     │
   │ - Routing       │    │ - Business Logic│    │ - Indexes       │
   └─────────────────┘    └─────────────────┘    └─────────────────┘

Architecture Principles
-----------------------

**Single Page Application (SPA)**
   - React-based frontend with client-side routing
   - API-driven architecture for data operations
   - Responsive design for mobile compatibility

**RESTful API Design**
   - Consistent endpoint structure
   - HTTP status codes for operation results
   - JSON request/response format

**Database-First Approach**
   - Schema-driven development using Drizzle ORM
   - Type-safe database operations
   - Automated migrations and schema validation

**Security by Design**
   - Authentication required for all operations
   - Role-based access control (RBAC)
   - Session management with secure cookies

Technology Stack
----------------

Frontend Technologies
~~~~~~~~~~~~~~~~~~~~~

**Core Framework**
   - **React 18**: Modern component-based UI library
   - **TypeScript**: Type safety and developer experience
   - **Vite**: Fast development server and build tool

**UI Components**
   - **Tailwind CSS**: Utility-first CSS framework
   - **Shadcn/UI**: Pre-built accessible components
   - **Lucide Icons**: Consistent iconography
   - **Radix UI**: Headless component primitives

**State Management**
   - **TanStack Query**: Server state management and caching
   - **React Hook Form**: Form state and validation
   - **Zod**: Runtime type validation

**Routing**
   - **Wouter**: Lightweight client-side routing
   - **History API**: Browser navigation support

Backend Technologies
~~~~~~~~~~~~~~~~~~~~

**Runtime & Framework**
   - **Node.js 20**: JavaScript runtime environment
   - **Express.js**: Web application framework
   - **TypeScript**: Type-safe server development

**Database & ORM**
   - **PostgreSQL**: Relational database system
   - **Drizzle ORM**: Type-safe database toolkit
   - **Connection Pooling**: Optimized database connections

**Authentication**
   - **Passport.js**: Authentication middleware
   - **SAML 2.0**: University SSO integration
   - **Express Sessions**: Session management

**Development Tools**
   - **TSX**: TypeScript execution
   - **ESLint**: Code linting
   - **Prettier**: Code formatting

File Structure and Layout
-------------------------

Project Root Structure
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   university-inventory/
   ├── client/                 # Frontend React application
   │   ├── src/
   │   │   ├── components/     # Reusable UI components
   │   │   ├── pages/         # Route-specific page components
   │   │   ├── hooks/         # Custom React hooks
   │   │   ├── lib/           # Utility functions and configurations
   │   │   ├── App.tsx        # Main application component
   │   │   ├── main.tsx       # Application entry point
   │   │   └── index.css      # Global styles
   │   └── index.html         # HTML template
   ├── server/                # Backend Node.js application
   │   ├── db.ts             # Database connection setup
   │   ├── index.ts          # Server entry point
   │   ├── routes.ts         # API route definitions
   │   ├── storage.ts        # Data access layer
   │   ├── replitAuth.ts     # Replit OAuth implementation
   │   ├── universitySso.ts  # SAML SSO implementation
   │   └── vite.ts           # Development server integration
   ├── shared/               # Shared code between client/server
   │   └── schema.ts         # Database schema and types
   ├── docs/                 # Documentation source files
   │   ├── api/             # API documentation
   │   ├── tutorials/       # Step-by-step guides
   │   ├── user-guide/      # User documentation
   │   ├── development/     # Developer documentation
   │   └── deployment/      # Deployment guides
   ├── .github/             # GitHub workflows
   │   └── workflows/       # CI/CD pipeline definitions
   ├── package.json         # Node.js dependencies and scripts
   ├── tsconfig.json        # TypeScript configuration
   ├── tailwind.config.ts   # Tailwind CSS configuration
   ├── vite.config.ts       # Vite build configuration
   └── Dockerfile           # Container deployment configuration

Frontend Architecture
---------------------

Component Hierarchy
~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   App.tsx
   ├── Router (wouter)
   │   ├── Landing.tsx (unauthenticated)
   │   └── Authenticated Routes
   │       ├── Dashboard.tsx
   │       │   ├── StatsCards.tsx
   │       │   ├── SidePanel.tsx
   │       │   └── InventoryTable.tsx
   │       ├── Inventory.tsx
   │       │   ├── ItemModal.tsx
   │       │   └── InventoryTable.tsx
   │       ├── Reports.tsx
   │       ├── Users.tsx (admin only)
   │       └── Documentation.tsx
   └── Layout Components
       ├── TopBar.tsx
       ├── Sidebar.tsx
       └── UI Components (shadcn/ui)

State Management Strategy
~~~~~~~~~~~~~~~~~~~~~~~~~

**Server State (TanStack Query)**
   - API data fetching and caching
   - Background refetching
   - Optimistic updates
   - Error handling

**Client State (React State)**
   - UI state (modals, forms)
   - Component-specific state
   - Temporary data

**Form State (React Hook Form)**
   - Form validation
   - Field-level state
   - Submission handling

Data Flow Patterns
~~~~~~~~~~~~~~~~~~

**Read Operations**
   1. Component mounts
   2. TanStack Query fetches data
   3. Loading state displayed
   4. Data received and cached
   5. Component renders with data

**Write Operations**
   1. User interaction triggers mutation
   2. Optimistic update (optional)
   3. API request sent
   4. Success: Cache invalidated and refetched
   5. Error: Rollback and show error message

Backend Architecture
--------------------

Request Processing Flow
~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   HTTP Request
   │
   ├── Express Middleware Stack
   │   ├── Session Management
   │   ├── Authentication Check
   │   ├── Role Authorization
   │   └── Request Parsing
   │
   ├── Route Handler
   │   ├── Input Validation (Zod)
   │   ├── Business Logic
   │   └── Storage Operations
   │
   ├── Database Layer (Drizzle)
   │   ├── Query Building
   │   ├── Connection Pooling
   │   └── Result Mapping
   │
   └── HTTP Response
       ├── Success: JSON Data
       └── Error: Error Object

API Design Patterns
~~~~~~~~~~~~~~~~~~~

**RESTful Endpoints**
   - ``GET /api/items`` - List resources
   - ``POST /api/items`` - Create resource
   - ``GET /api/items/:id`` - Get specific resource
   - ``PUT /api/items/:id`` - Update resource
   - ``DELETE /api/items/:id`` - Delete resource

**Response Format**
   .. code-block:: json

      {
        "data": { /* resource data */ },
        "meta": {
          "total": 150,
          "page": 1,
          "limit": 10
        }
      }

**Error Format**
   .. code-block:: json

      {
        "error": "Validation failed",
        "message": "SKU is required",
        "code": "VALIDATION_ERROR",
        "details": { /* field errors */ }
      }

Authentication Architecture
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Multi-Provider Support**
   1. Check for SAML configuration
   2. Initialize SAML strategy if available
   3. Fallback to Replit OAuth
   4. Session-based authentication

**Middleware Chain**
   1. Session deserialization
   2. User authentication check
   3. Role-based authorization
   4. Request processing

**Session Management**
   - PostgreSQL session store
   - Secure cookie configuration
   - Automatic session cleanup

Database Architecture
---------------------


Schema Design
~~~~~~~~~~~~~

**Core Tables**
   - ``sessions``: Session storage for authentication (Replit/local/SSO)
   - ``users``: User accounts, roles, and profile info
   - ``categories``: Inventory categories
   - ``items``: Inventory items, linked to categories and users
   - ``stock_movements``: Audit trail for stock changes, linked to items and users
   - ``sales``: Completed sales transactions, linked to users
   - ``sale_items``: Line items for each sale, linked to sales and items
   - ``quotes``: Draft quotes, linked to users
   - ``quote_items``: Line items for each quote, linked to quotes and items
   - ``suppliers``: Supplier information
   - ``sources``: Many-to-many link between items and suppliers
   - ``orders``: Bulk procurement orders, linked to suppliers and users
   - ``order_items``: Items in each order, linked to orders, items, and categories
   - ``chargecodes``: Charge code definitions, linked to users
   - ``charge_code_exclusions``: Exclusions for charge codes by category, linked to users
   - ``system_settings``: Configurable system settings
   - ``user_permissions``: Granular user permissions, linked to users
   - ``permission_definitions``: Permission definitions and default roles
   - ``system_tests``: System test results

**Relationship Patterns**
   - One-to-Many: categories → items, users → items, users → stock_movements, users → sales, users → orders, orders → order_items, sales → sale_items, quotes → quote_items
   - Many-to-Many: items ↔ suppliers (via ``sources``)
   - Charge code exclusions: chargecodes → categories (via ``charge_code_exclusions``)

**Indexing Strategy**
   - Primary keys for unique identification
   - Foreign keys for relationship integrity
   - Search indexes on frequently queried fields (e.g., sessions.expire)
   - Composite/unique indexes for complex queries and constraints

**Schema File**
   - The schema is defined in ``/shared/schema.ts`` using Drizzle ORM and Zod for type safety and validation.

**TypeScript Types**
   - All table types and insert/update types are exported from ``/shared/schema.ts`` for use across backend and (optionally) frontend.

**Notes**
   - All tables use snake_case naming in the database.
   - Foreign keys are enforced for all relationships.
   - Timestamps (``createdAt``, ``updatedAt``) are present on most tables.
   - Role-based access and permissions are managed via ``users``, ``user_permissions``, and ``permission_definitions``.

Data Access Layer
~~~~~~~~~~~~~~~~~

**Storage Interface Pattern**
   - Abstract interface defining operations
   - Concrete implementation with database logic
   - Type-safe operations using Drizzle
   - Transaction support for complex operations

**Query Optimization**
   - Connection pooling for performance
   - Prepared statements for security
   - Selective field loading
   - Pagination for large datasets

Security Architecture
---------------------

Authentication Security
~~~~~~~~~~~~~~~~~~~~~~~

**SAML 2.0 Implementation**
   - Certificate-based signature verification
   - Encrypted assertion support
   - Clock skew tolerance
   - Replay attack prevention

**Session Security**
   - HTTP-only cookies
   - Secure flag for HTTPS
   - SameSite protection
   - Session rotation

Authorization Model
~~~~~~~~~~~~~~~~~~~

**Role-Based Access Control (RBAC)**
   - Three-tier role system (User, Manager, Admin)
   - Middleware-enforced permissions
   - API-level authorization checks
   - UI-level role-based rendering

**Data Security**
   - Input validation using Zod schemas
   - SQL injection prevention via ORM
   - XSS protection through React's default escaping
   - CSRF protection via SameSite cookies

Deployment Architecture
-----------------------

Development Environment
~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   Development Server (Vite)
   ├── Hot Module Replacement
   ├── TypeScript Compilation
   ├── CSS Processing
   └── Proxy to Express API

   Express Server
   ├── API Routes
   ├── Authentication
   ├── Database Connection
   └── Static File Serving

Production Environment
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   Load Balancer
   │
   ├── Application Servers (Node.js)
   │   ├── Express Application
   │   ├── Session Store (PostgreSQL)
   │   └── Health Checks
   │
   ├── Database Cluster (PostgreSQL)
   │   ├── Primary (Read/Write)
   │   ├── Replica (Read Only)
   │   └── Backup Storage
   │
   └── Static Assets (CDN)
       ├── Built Frontend
       ├── Documentation
       └── Media Files

Containerization
~~~~~~~~~~~~~~~~

**Multi-Stage Docker Build**
   1. **Base Stage**: Node.js and dependencies
   2. **Development Stage**: Development tools and hot reload
   3. **Build Stage**: Production build and documentation
   4. **Production Stage**: Minimal runtime environment

**Container Orchestration**
   - Docker Compose for local development
   - Health checks for container monitoring
   - Volume mounts for persistent data
   - Environment-based configuration

Performance Considerations
--------------------------

Frontend Performance
~~~~~~~~~~~~~~~~~~~~

**Code Splitting**
   - Route-based code splitting
   - Dynamic imports for large components
   - Lazy loading of non-critical features

**Caching Strategy**
   - TanStack Query for API response caching
   - Browser caching for static assets
   - Service worker for offline support (future)

**Bundle Optimization**
   - Tree shaking for unused code elimination
   - Minification for production builds
   - Gzip compression for assets

Backend Performance
~~~~~~~~~~~~~~~~~~~

**Database Optimization**
   - Connection pooling (max 20 connections)
   - Query optimization with indexes
   - Pagination for large datasets
   - Selective field loading

**Caching Layers**
   - Application-level caching for computed data
   - Database query result caching
   - Session storage optimization

**Resource Management**
   - Memory usage monitoring
   - CPU usage optimization
   - Graceful shutdown handling

Monitoring and Observability
----------------------------

Application Metrics
~~~~~~~~~~~~~~~~~~~

**Performance Metrics**
   - Response time monitoring
   - Database query performance
   - Memory and CPU usage
   - Error rate tracking

**Business Metrics**
   - User activity tracking
   - Inventory turnover rates
   - System utilization
   - Feature usage analytics

**Health Checks**
   - Database connectivity
   - Authentication service status
   - External service dependencies
   - Application responsiveness

Logging Strategy
~~~~~~~~~~~~~~~~

**Log Levels**
   - **Error**: System errors and exceptions
   - **Warn**: Performance issues and deprecations
   - **Info**: General application flow
   - **Debug**: Detailed troubleshooting information

**Log Format**
   .. code-block:: json

      {
        "timestamp": "2025-01-20T10:30:00Z",
        "level": "info",
        "service": "inventory-api",
        "user": "user123",
        "action": "create_item",
        "details": { /* contextual data */ }
      }

Future Architecture Considerations
----------------------------------

Scalability Improvements
~~~~~~~~~~~~~~~~~~~~~~~~

**Horizontal Scaling**
   - Stateless application design
   - Load balancer configuration
   - Database read replicas
   - Microservice migration path

**Performance Enhancements**
   - Redis caching layer
   - CDN integration
   - Database partitioning
   - Background job processing

**Feature Enhancements**
   - Real-time notifications
   - Advanced reporting engine
   - Mobile application
   - Integration APIs

This architecture documentation provides the foundation for understanding, maintaining, and extending the University Inventory Management System. For specific implementation details, refer to the individual component documentation and code comments.