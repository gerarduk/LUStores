File Reference Guide
====================

This comprehensive reference guide describes every file in the University Inventory Management System, explaining their purpose, structure, and relationships.

Project Structure Overview
--------------------------

.. code-block:: text

   university-inventory/
   ├── client/                 # Frontend application
   ├── server/                 # Backend API server  
   ├── shared/                 # Shared type definitions
   ├── docs/                   # Documentation source
   ├── .github/                # GitHub workflows
   └── Configuration files     # Build and deployment configs

Frontend Files (client/)
------------------------

Entry Points
~~~~~~~~~~~~

**client/index.html**
   - HTML template for the single-page application
   - Contains root div element for React mounting
   - Includes meta tags for responsive design
   - Links to favicon and other static assets

   .. code-block:: html

      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>University Inventory Management</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
      </html>

**client/src/main.tsx**
   - Application entry point and React rendering
   - Sets up React Query client and providers
   - Initializes global error handling
   - Renders root App component

   .. code-block:: typescript

      import React from 'react'
      import ReactDOM from 'react-dom/client'
      import { QueryClientProvider } from '@tanstack/react-query'
      import { queryClient } from '@/lib/queryClient'
      import App from './App'
      import './index.css'

**client/src/App.tsx**
   - Main application component with routing logic
   - Handles authentication state management
   - Defines route structure using wouter
   - Manages conditional rendering based on auth status

   .. code-block:: text

      function Router() {
        const { isAuthenticated, isLoading } = useAuth();
        
        return (
          <Switch>
            {isLoading || !isAuthenticated ? (
              <Route path="/" component={Landing} />
            ) : (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/inventory" component={Inventory} />
                {/* ... other authenticated routes */}
              </>
            )}
          </Switch>
        );
      }

Styling and Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~

**client/src/index.css**
   - Global CSS styles and Tailwind imports
   - CSS custom properties for theming
   - Base typography and layout styles
   - Dark mode color definitions

   .. code-block:: css

      @tailwind base;
      @tailwind components;
      @tailwind utilities;

      :root {
        --background: 210 11% 98%;
        --foreground: 210 11% 8%;
        --primary: 210 100% 50%;
        /* University branding colors */
      }

Page Components
~~~~~~~~~~~~~~~

**client/src/pages/Dashboard.tsx**
   - Main dashboard interface after login
   - Displays key inventory metrics and statistics
   - Contains overview cards and recent activity
   - Integrates multiple data sources for comprehensive view

   Key Features:
   - Real-time statistics (total items, low stock, value)
   - Low stock alerts panel
   - Category distribution overview
   - Quick action buttons

**client/src/pages/Inventory.tsx**
   - Primary inventory management interface
   - Item listing with search and filtering
   - Pagination for large inventories
   - Modal dialogs for item creation/editing

   Key Features:
   - Advanced search and filtering
   - Bulk operations support
   - Stock level management
   - Category-based organization

**client/src/pages/Landing.tsx**
   - Welcome page for unauthenticated users
   - University branding and system overview
   - Login call-to-action
   - Feature highlights and benefits

**client/src/pages/Reports.tsx**
   - Reporting interface for inventory analytics
   - Multiple report types and export options
   - Date range selection and filtering
   - Visualization components for data insights

**client/src/pages/Users.tsx**
   - User management interface (admin only)
   - User role assignment and permissions
   - Account status management
   - Activity monitoring

**client/src/pages/Documentation.tsx**
   - Embedded documentation viewer
   - Integration with Sphinx-generated docs
   - Context-sensitive help system
   - Quick reference guides

**client/src/pages/not-found.tsx**
   - 404 error page for invalid routes
   - Navigation suggestions
   - Search functionality
   - Friendly error messaging

Reusable Components
~~~~~~~~~~~~~~~~~~~

**client/src/components/TopBar.tsx**
   - Application header with navigation
   - User profile dropdown and logout
   - Search functionality
   - Responsive mobile menu

   Features:
   - University logo and branding
   - User authentication status
   - Quick search access
   - Mobile-responsive design

**client/src/components/Sidebar.tsx**
   - Main navigation sidebar
   - Role-based menu items
   - Collapsible design for mobile
   - Active route highlighting

   Navigation Structure:
   - Dashboard (all users)
   - Inventory (all users)
   - Reports (manager/admin)
   - Users (admin only)
   - Documentation (all users)

**client/src/components/InventoryTable.tsx**
   - Reusable table component for inventory items
   - Sorting, filtering, and pagination
   - Action buttons per user role
   - Responsive column layout

   .. code-block:: typescript

      interface InventoryTableProps {
        items: ItemWithCategory[];
        total: number;
        currentPage?: number;
        onPageChange?: (page: number) => void;
        onEditItem?: (item: ItemWithCategory) => void;
        showPagination?: boolean;
        title?: string;
      }

**client/src/components/ItemModal.tsx**
   - Modal dialog for item creation/editing
   - Form validation using React Hook Form
   - Category selection and SKU generation
   - Image upload support (future feature)

**client/src/components/StatsCards.tsx**
   - Dashboard statistics display cards
   - Real-time data updates
   - Visual indicators for critical metrics
   - Responsive grid layout

**client/src/components/SidePanel.tsx**
   - Dashboard side panel for quick access
   - Low stock item alerts
   - Category statistics overview
   - Recent activity feed


UI Component Library
~~~~~~~~~~~~~~~~~~~~

**client/src/components/ui/***
   - Shadcn/UI component library integration
   - Consistent design system components
   - Accessible and responsive components
   - Tailwind CSS styling

   Key Components:
   - ``button.tsx`` - Button variants and sizes
   - ``dialog.tsx`` - Modal and dialog components
   - ``form.tsx`` - Form input components
   - ``table.tsx`` - Data table components
   - ``badge.tsx`` - Status and category badges
   - ``card.tsx`` - Content container components

Database Entity Relationship Diagram (Crow's Foot Notation)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: text

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |    categories     |1   n|       |      items        |1   n|       |  stock_movements   |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | id (PK)           |             | id (PK)           |             | id (PK)           |
   | name              |             | name              |             | item_id (FK)       |
   | ...               |             | category_id (FK)  |             | performed_by (FK)  |
   +-------------------+             | created_by (FK)   |             | ...               |
                                      | updated_by (FK)   |             +-------------------+
                                      | ...               |
                                      +-------------------+

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |      users        |1   n|       |      orders       |1   n|       |    order_items     |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | id (PK)           |             | id (PK)           |             | id (PK)           |
   | email             |             | created_by (FK)   |             | order_id (FK)      |
   | ...               |             | supplier_id (FK)  |             | item_id (FK)       |
   +-------------------+             | ...               |             | ...               |
                                      +-------------------+             +-------------------+

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |      users        |1   n|       |      sales        |1   n|       |    sale_items      |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | id (PK)           |             | id (PK)           |             | id (PK)           |
   | ...               |             | processed_by (FK) |             | sale_id (FK)       |
   +-------------------+             | ...               |             | item_id (FK)       |
                                      +-------------------+             | ...               |
                                                                          +-------------------+

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |      users        |1   n|       |     quotes         |1   n|       |   quote_items      |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | id (PK)           |             | id (PK)           |             | id (PK)           |
   | ...               |             | created_by (FK)   |             | quote_id (FK)      |
   +-------------------+             | processed_by (FK) |             | item_id (FK)       |
                                      | ...               |             | ...               |
                                      +-------------------+             +-------------------+

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |    suppliers       |1  n|       |     sources        |n  1|       |      items         |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | id (PK)           |             | id (PK)           |             | id (PK)           |
   | ...               |             | supplier_id (FK)  |             | ...               |
   +-------------------+             | item_id (FK)      |             +-------------------+
                                      +-------------------+

   +-------------------+     |<--    +-------------------+     |<--    +-------------------+
   |   chargecodes      |1  n|       |charge_code_excl.  |n  1|       |   categories       |
   +-------------------+-----+       +-------------------+-----+       +-------------------+
   | code (PK)         |             | id (PK)           |             | id (PK)           |
   | ...               |             | charge_code (FK)  |             | ...               |
   +-------------------+             | category_id (FK)  |             +-------------------+
                                      | created_by (FK)   |
                                      +-------------------+

Legend:
  |1   n|  = One-to-many (crow's foot)
  |n  1|  = Many-to-one
  |n  n|  = Many-to-many (via join table)
  (PK) = Primary Key
  (FK) = Foreign Key

This diagram is a textual representation of the main relationships in the database using Crow's Foot notation. For full details, see ``shared/schema.ts``.

Hooks and Utilities
~~~~~~~~~~~~~~~~~~~

**client/src/hooks/useAuth.ts**
   - Authentication state management hook
   - User session handling
   - Automatic token refresh
   - Login/logout functionality

   .. code-block:: typescript

      export function useAuth() {
        const { data: user, isLoading } = useQuery({
          queryKey: ["/api/auth/user"],
          retry: false,
        });

        return {
          user,
          isLoading,
          isAuthenticated: !!user,
        };
      }

**client/src/lib/queryClient.ts**
   - TanStack Query configuration
   - API request handling
   - Error handling and retries
   - Response transformation

   .. code-block:: typescript

      export const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            queryFn: getQueryFn({ on401: "returnNull" }),
            retry: (failureCount, error) => {
              if (error?.status === 401) return false;
              return failureCount < 3;
            },
          },
        },
      });

**client/src/lib/utils.ts**
   - Utility functions for common operations
   - Class name concatenation (cn)
   - Date formatting helpers
   - Validation utilities

Backend Files (server/)
-----------------------

Core Server Files
~~~~~~~~~~~~~~~~~

**server/index.ts**
   - Express server entry point
   - Middleware setup and configuration
   - Error handling and logging
   - Server startup and graceful shutdown

   .. code-block:: typescript

      const app = express();
      
      // Global middleware
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      
      // Routes and error handling
      const httpServer = await registerRoutes(app);

**server/routes.ts**
   - API route definitions and handlers
   - Authentication and authorization middleware
   - Request validation using Zod schemas
   - Response formatting and error handling

   Route Structure:
   - Authentication: ``/api/auth/*``
   - Dashboard: ``/api/dashboard/*``
   - Inventory: ``/api/items/*``
   - Categories: ``/api/categories/*``
   - Users: ``/api/users/*``
   - Documentation: ``/docs`` and ``/api/docs``

**server/db.ts**
   - Database connection configuration
   - Connection pooling setup
   - Environment-based configuration
   - Database client initialization

   .. code-block:: typescript

      export const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL 
      });
      export const db = drizzle({ client: pool, schema });

**server/storage.ts**
   - Data access layer implementation
   - Database operations abstraction
   - Type-safe query building
   - Transaction management

   Interface Definition:
   
   .. code-block:: typescript

      export interface IStorage {
        // User operations
        getUser(id: string): Promise<User | undefined>;
        upsertUser(user: UpsertUser): Promise<User>;
        
        // Item operations
        getItems(options: GetItemsOptions): Promise<ItemResult>;
        createItem(item: InsertItem): Promise<Item>;
        updateItem(id: number, item: UpdateItem): Promise<Item>;
        
        // Category operations
        getCategories(): Promise<Category[]>;
        createCategory(category: InsertCategory): Promise<Category>;
      }

Authentication Files
~~~~~~~~~~~~~~~~~~~~

**server/replitAuth.ts**
   - Replit OAuth authentication implementation
   - OpenID Connect integration
   - Session management
   - Token refresh handling

   Key Functions:
   - ``setupAuth()`` - Initialize authentication
   - ``isAuthenticated`` - Middleware for protected routes
   - Session serialization/deserialization

**server/universitySso.ts**
   - SAML 2.0 SSO implementation
   - University identity provider integration
   - Attribute mapping and role assignment
   - Metadata generation

   .. code-block:: typescript

      export async function setupUniversitySso(app: Express) {
        // SAML strategy configuration
        const samlStrategy = new SamlStrategy({
          entryPoint: process.env.SAML_ENTRY_POINT!,
          issuer: process.env.SAML_ISSUER!,
          callbackUrl: process.env.SAML_CALLBACK_URL!,
          cert: process.env.SAML_CERT!,
        }, handleSamlProfile);
      }

Development and Build Files
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**server/vite.ts**
   - Development server integration
   - Hot module replacement setup
   - Static file serving
   - Proxy configuration for API requests

   .. code-block:: typescript

      export async function setupVite(app: Express, server: Server) {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'custom'
        });
        
        app.use(vite.ssrFixStacktrace);
        app.use(vite.middlewares);
      }

Shared Files (shared/)
----------------------

**shared/schema.ts**
   - Database schema definitions using Drizzle ORM
   - TypeScript type definitions
   - Validation schemas using Zod
   - Relationship definitions

   Table Definitions:
   
   .. code-block:: typescript

      export const users = pgTable("users", {
        id: varchar("id").primaryKey(),
        email: varchar("email").unique(),
        firstName: varchar("first_name"),
        lastName: varchar("last_name"),
        role: varchar("role").default("user"),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
      });

   Type Exports:
   
   .. code-block:: typescript

      export type User = typeof users.$inferSelect;
      export type UpsertUser = typeof users.$inferInsert;
      export type ItemWithCategory = Item & {
        category: Category;
        createdBy: User;
        updatedBy?: User;
      };

Documentation Files (docs/)
---------------------------

Documentation Structure
~~~~~~~~~~~~~~~~~~~~~~~

**docs/conf.py**
   - Sphinx configuration file
   - Theme and extension setup
   - HTML output configuration
   - University branding customization

**docs/index.rst**
   - Main documentation index
   - Table of contents structure
   - Section organization
   - Cross-references and navigation

**docs/_static/custom.css**
   - Custom CSS for documentation styling
   - University color scheme
   - Component-specific styling
   - Responsive design adjustments

Content Organization
~~~~~~~~~~~~~~~~~~~~

**docs/tutorials/**
   - Step-by-step learning guides
   - ``getting-started.rst`` - First-time user walkthrough
   - Hands-on exercises with real examples
   - Progressive skill building

**docs/user-guide/**
   - Detailed feature documentation
   - Task-oriented instructions
   - Screenshots and examples
   - Troubleshooting tips

**docs/api/**
   - Complete API reference
   - ``overview.rst`` - API introduction
   - ``endpoints.rst`` - Detailed endpoint documentation
   - Request/response examples

**docs/development/**
   - Developer documentation
   - ``architecture.rst`` - System architecture
   - ``file-reference.rst`` - This file
   - Code contribution guidelines

**docs/deployment/**
   - Deployment and configuration guides
   - ``docker.rst`` - Container deployment
   - ``university-sso.rst`` - SSO configuration
   - Production setup instructions

Configuration Files
-------------------

Build and Development
~~~~~~~~~~~~~~~~~~~~~

**package.json**
   - Node.js project configuration
   - Dependency management
   - Script definitions for common tasks
   - Metadata and project information

   Key Scripts:
   - ``dev`` - Start development server
   - ``build`` - Build for production
   - ``db:push`` - Push schema changes
   - ``db:studio`` - Open database GUI

**tsconfig.json**
   - TypeScript compiler configuration
   - Module resolution settings
   - Path aliases for imports
   - Strict type checking rules

   .. code-block:: json

      {
        "compilerOptions": {
          "target": "ES2020",
          "module": "ESNext",
          "strict": true,
          "paths": {
            "@/*": ["./client/src/*"],
            "@shared/*": ["./shared/*"]
          }
        }
      }

**vite.config.ts**
   - Vite build tool configuration
   - Plugin setup and optimization
   - Development server settings
   - Build output configuration

**tailwind.config.ts**
   - Tailwind CSS configuration
   - Custom color definitions
   - Component plugin integration
   - Responsive breakpoints

   .. code-block:: typescript

      export default {
        content: [
          "./client/index.html",
          "./client/src/**/*.{js,ts,jsx,tsx}",
        ],
        theme: {
          extend: {
            colors: {
              border: "hsl(var(--border))",
              primary: "hsl(var(--primary))",
            }
          }
        }
      }

**drizzle.config.ts**
   - Database ORM configuration
   - Migration settings
   - Schema file locations
   - Database connection configuration

Deployment Configuration
~~~~~~~~~~~~~~~~~~~~~~~~

**Dockerfile**
   - Multi-stage container build configuration
   - Development and production stages
   - Documentation building
   - Security and optimization settings

   .. code-block:: dockerfile

      # Production stage
      FROM node:20-alpine AS production
      
      # Copy built application and documentation
      COPY --from=build /app/dist ./dist
      COPY --from=build /app/docs/_build/html ./docs/_build/html
      COPY --from=build /app/node_modules ./node_modules

**docker-compose.yml**
   - Multi-service orchestration
   - Database and application services
   - Environment variable configuration
   - Volume and network setup

**.github/workflows/docs.yml**
   - GitHub Actions workflow for documentation
   - Automated building and deployment
   - GitHub Pages integration
   - Trigger configuration

**.github/workflows/deploy-docs.yml**
   - Enhanced documentation deployment
   - Sphinx building with dependencies
   - Artifact management
   - Production deployment

File Relationships and Dependencies
-----------------------------------

Import Dependencies
~~~~~~~~~~~~~~~~~~~

**Frontend Dependencies**
   - Pages import components from ``components/``
   - Components use hooks from ``hooks/``
   - All files use utilities from ``lib/``
   - Types imported from ``@shared/schema``

**Backend Dependencies**
   - Routes use storage interface from ``storage.ts``
   - Storage uses database connection from ``dbConfig.ts``
   - Authentication modules used by ``routes.ts``
   - Shared types from ``@shared/schema``

**Cross-cutting Dependencies**
   - Configuration files affect entire project
   - Shared schema used by both frontend and backend
   - Documentation references all other files

Development Workflow
~~~~~~~~~~~~~~~~~~~~

**Local Development**
   1. ``package.json`` scripts start development servers
   2. ``vite.config.ts`` configures build process
   3. ``server/vite.ts`` integrates frontend/backend
   4. Hot reloading updates both client and server

**Database Changes**
   1. Modify ``shared/schema.ts``
   2. Run ``npm run db:push`` to update database
   3. TypeScript types automatically updated
   4. Frontend and backend get new types

**Documentation Updates**
   1. Edit ``.rst`` files in ``docs/``
   2. GitHub workflow automatically builds and deploys
   3. Documentation available at GitHub Pages URL
   4. Local preview with ``make html`` in docs folder

This file reference provides a complete understanding of every component in the University Inventory Management System, enabling developers and administrators to effectively navigate, understand, and modify the system.