API Overview
============

The University Inventory Management System provides a comprehensive RESTful API that enables programmatic access to all system functionality. This API is designed to be MCP (Model Context Protocol) ready, making it perfect for chatbot integration and automated workflows.

Introduction
------------

The API follows REST principles and returns JSON responses with consistent error handling. All endpoints require authentication, and many operations are restricted based on user roles.

**Base URL**: ``/api``

**API Version**: ``1.0.0``

**Response Format**: JSON

**Authentication**: OAuth 2.0 with session management

Key Features
------------

🔐 **Secure Access**
   - OAuth integration with university systems
   - Role-based authorization
   - Session-based authentication with automatic refresh

📊 **Comprehensive Data Access**
   - Full CRUD operations for inventory items
   - Category management
   - Stock movement tracking
   - User management (admin only)
   - Notes system for contextual annotations
   - Bulk operations for efficient inventory management

🤖 **MCP Integration Ready**
   - Structured responses perfect for AI assistants
   - Consistent error handling
   - Descriptive endpoint documentation
   - Query parameter support for filtering

📈 **Analytics & Reporting**
   - Dashboard statistics
   - Low stock alerts
   - Category analytics
   - Historical data access

Authentication
--------------

All API endpoints require authentication. The system uses session-based authentication with OAuth 2.0.

**Authentication Flow:**

1. **Initiate Login**: Navigate to ``/api/login``
2. **OAuth Redirect**: User authenticates with university system
3. **Session Creation**: System creates authenticated session
4. **API Access**: Include session cookie in subsequent requests

**Session Management:**

.. code-block:: http

   GET /api/auth/user HTTP/1.1
   Host: localhost:5000
   Cookie: connect.sid=s%3A...

**Response Format:**

.. code-block:: json

   {
     "id": "user123",
     "email": "user@university.edu",
     "firstName": "John",
     "lastName": "Doe",
     "role": "manager",
     "isActive": true
   }

Error Handling
--------------

The API uses standard HTTP status codes and returns detailed error information.

**Standard Status Codes:**

- ``200 OK`` - Successful request
- ``201 Created`` - Resource created successfully
- ``400 Bad Request`` - Invalid request data
- ``401 Unauthorized`` - Authentication required
- ``403 Forbidden`` - Insufficient permissions
- ``404 Not Found`` - Resource not found
- ``500 Internal Server Error`` - Server error

**Error Response Format:**

.. code-block:: json

   {
     "message": "Validation error",
     "errors": [
       {
         "field": "name",
         "message": "Name is required"
       }
     ]
   }

API Endpoints Overview
----------------------

Authentication Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/auth/user``
     - Get current user information
   * - GET
     - ``/api/login``
     - Initiate login flow
   * - GET
     - ``/api/logout``
     - Logout current user

Dashboard Endpoints
~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/dashboard/stats``
     - Get dashboard statistics
   * - GET
     - ``/api/dashboard/low-stock``
     - Get low stock items
   * - GET
     - ``/api/dashboard/category-stats``
     - Get category statistics

Inventory Endpoints
~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/items``
     - List inventory items (with pagination)
   * - GET
     - ``/api/items/:id``
     - Get specific item details
   * - POST
     - ``/api/items``
     - Create new item (Manager+)
   * - PUT
     - ``/api/items/:id``
     - Update item (Manager+)
   * - DELETE
     - ``/api/items/:id``
     - Delete item (Manager+)
   * - POST
     - ``/api/items/:id/stock``
     - Update item stock (Manager+)

Category Endpoints
~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/categories``
     - List all categories
   * - POST
     - ``/api/categories``
     - Create category (Manager+)
   * - PUT
     - ``/api/categories/:id``
     - Update category (Manager+)
   * - DELETE
     - ``/api/categories/:id``
     - Delete category (Admin)

Stock Movement Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/stock-movements``
     - Get stock movement history

Notes Endpoints
~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/notes``
     - Get all notes (with filtering)
   * - GET
     - ``/api/notes/:referenceType/:referenceId``
     - Get notes for specific entity
   * - POST
     - ``/api/notes``
     - Create new note
   * - PUT
     - ``/api/notes/:id``
     - Update note
   * - DELETE
     - ``/api/notes/:id``
     - Delete note
   * - GET
     - ``/api/notes/count/:referenceType/:referenceId``
     - Get note count for entity
   * - POST
     - ``/api/notes/counts/batch``
     - Get note counts (batch)

Bulk Operations Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - POST
     - ``/api/items/bulk/delete``
     - Bulk delete items (Manager+)
   * - POST
     - ``/api/items/bulk/set-inactive``
     - Bulk set items inactive (Manager+)
   * - POST
     - ``/api/items/bulk/set-active``
     - Bulk set items active (Manager+)
   * - POST
     - ``/api/items/bulk/set-stock-zero``
     - Bulk set stock to zero (Manager+)
   * - POST
     - ``/api/items/bulk/export``
     - Bulk export items to CSV/Excel
   * - POST
     - ``/api/items/bulk/add-note``
     - Bulk add note to items (Manager+)
   * - POST
     - ``/api/items/bulk/change-vat-rate``
     - Bulk change VAT rate (Manager+)
   * - POST
     - ``/api/items/bulk/change-category``
     - Bulk change category (Manager+)

User Management Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/users``
     - List all users (Admin)
   * - POST
     - ``/api/users``
     - Create new user
   * - PUT
     - ``/api/users/:id/role``
     - Update user role (Admin)
   * - PATCH
     - ``/api/users/:id/role``
     - Update user role (Admin)
   * - DELETE
     - ``/api/users/:id``
     - Delete user (Admin)
   * - PATCH
     - ``/api/users/:id/reset-password``
     - Reset user password (Admin)
   * - POST
     - ``/api/users/reset-password``
     - Request password reset
   * - PATCH
     - ``/api/users/:id/preferences/picking-list``
     - Update picking list preference

Sales & Quotes Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - POST
     - ``/api/sales/quotes``
     - Create new quote
   * - GET
     - ``/api/sales/quotes``
     - List all quotes
   * - GET
     - ``/api/sales/quotes/:id``
     - Get quote details
   * - PUT
     - ``/api/sales/quotes/:id``
     - Update quote
   * - DELETE
     - ``/api/sales/quotes/:id``
     - Delete quote
   * - POST
     - ``/api/sales/quotes/:id/process``
     - Convert quote to sale
   * - POST
     - ``/api/sales``
     - Record new sale
   * - GET
     - ``/api/sales``
     - List sales records
   * - PATCH
     - ``/api/sales/:saleId/paid``
     - Mark sale as paid (Manager+)
   * - PATCH
     - ``/api/sales/:id/unpaid``
     - Mark sale as unpaid (Admin)
   * - PATCH
     - ``/api/sales/:id/recipient``
     - Record sale recipient
   * - POST
     - ``/api/sales/stock-check``
     - Validate stock availability
   * - GET
     - ``/api/sales/reports``
     - Generate sales reports
   * - GET
     - ``/api/sales/low-stock-report``
     - Generate low stock report

Suppliers & Procurement Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/suppliers``
     - List all suppliers
   * - GET
     - ``/api/suppliers/:id``
     - Get supplier details
   * - POST
     - ``/api/suppliers``
     - Create new supplier
   * - PUT
     - ``/api/suppliers/:id``
     - Update supplier
   * - DELETE
     - ``/api/suppliers/:id``
     - Delete supplier (Admin+)
   * - POST
     - ``/api/suppliers/:id/items``
     - Link item to supplier
   * - DELETE
     - ``/api/sources/:id``
     - Remove item-supplier link (Admin+)
   * - GET
     - ``/api/orders``
     - List all orders
   * - POST
     - ``/api/orders/upload-invoice``
     - Upload invoice PDF
   * - POST
     - ``/api/orders/import-from-invoice``
     - Create order from invoice PDF

Charge Codes Endpoints
~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/chargecodes``
     - List all charge codes
   * - GET
     - ``/api/chargecodes/:code``
     - Get charge code details
   * - POST
     - ``/api/chargecodes``
     - Create charge code (Admin+)
   * - PUT
     - ``/api/chargecodes/:code``
     - Update charge code (Admin+)
   * - DELETE
     - ``/api/chargecodes/:code``
     - Delete charge code (Admin)
   * - GET
     - ``/api/chargecodes/expiring/soon``
     - Get expiring charge codes
   * - GET
     - ``/api/chargecodes/:code/authorized-users``
     - Get authorized users for charge code

System Configuration Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/settings``
     - Get system settings (Admin)
   * - PUT
     - ``/api/settings/:key``
     - Update system setting (Admin)
   * - GET
     - ``/api/settings/users``
     - Get user permissions (Admin)
   * - PUT
     - ``/api/settings/users/:userId/permissions/:permission``
     - Update user permission (Admin)
   * - GET
     - ``/api/settings/permissions``
     - Get permission definitions
   * - GET
     - ``/api/system/alerts``
     - Get system alerts

MCP Integration Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/mcp/charge-code-analytics``
     - Charge code usage analytics
   * - GET
     - ``/api/mcp/top-sellers``
     - Top selling items analytics
   * - GET
     - ``/api/mcp/department-performance``
     - Department performance metrics

Monitoring & Health Endpoints
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/health``
     - Basic health check
   * - GET
     - ``/api/health``
     - Detailed API health check
   * - GET
     - ``/api/notifications/deployments``
     - Deployment notifications
   * - DELETE
     - ``/api/notifications/deployments/:id``
     - Delete deployment notification

Safe Deletion Endpoints
~~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - GET
     - ``/api/users/:id/deletion-check``
     - Check user deletion safety (Admin+)
   * - DELETE
     - ``/api/users/:id/safe``
     - Safely delete user (Admin)
   * - GET
     - ``/api/categories/:id/deletion-check``
     - Check category deletion safety (Admin+)
   * - DELETE
     - ``/api/categories/:id/safe``
     - Safely delete category (Admin+)
   * - GET
     - ``/api/items/:id/deletion-check``
     - Check item deletion safety (Admin+)
   * - DELETE
     - ``/api/items/:id/safe``
     - Safely delete item (Admin+)
   * - GET
     - ``/api/suppliers/:id/deletion-check``
     - Check supplier deletion safety (Admin+)
   * - DELETE
     - ``/api/suppliers/:id/safe``
     - Safely delete supplier (Admin+)

Webhook Endpoints
~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - POST
     - ``/api/webhook/watchtower``
     - Docker deployment webhooks
   * - POST
     - ``/api/webhook/github``
     - GitHub repository webhooks

File Upload Endpoints
~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Method
     - Endpoint
     - Description
   * - POST
     - ``/api/upload/invoice``
     - Upload invoice file for processing

MCP Integration
---------------

The API is designed to work seamlessly with Model Context Protocol for chatbot integration:

**Common Use Cases:**

.. code-block:: javascript

   // Check inventory for specific items
   GET /api/items?search=laptop

   // Get low stock alerts
   GET /api/dashboard/low-stock

   // Find items by category
   GET /api/items?categoryId=1

   // Get price information
   GET /api/items/123

OpenAPI Specification
---------------------

A complete OpenAPI 3.0 specification is available at:

.. code-block:: http

   GET /api/docs HTTP/1.1
   Host: localhost:5000

Next Steps
----------

- :doc:`authentication` - Detailed authentication guide
- :doc:`endpoints` - Complete endpoint documentation
- :doc:`mcp-integration` - MCP integration examples