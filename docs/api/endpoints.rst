API Endpoints Reference
=======================

This section provides detailed documentation for all API endpoints in the University Inventory Management System.

Authentication Endpoints
------------------------

Get Current User
~~~~~~~~~~~~~~~~

.. http:get:: /api/auth/user

   Retrieves information about the currently authenticated user.

   **Example Request:**

   .. code-block:: http

      GET /api/auth/user HTTP/1.1
      Host: localhost:5000
      Cookie: connect.sid=s%3A...

   **Example Response:**

   .. code-block:: json

      {
        "id": "user123",
        "email": "john.doe@university.edu",
        "firstName": "John",
        "lastName": "Doe",
        "role": "manager",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }

   **Status Codes:**
   
   - **200** – User information retrieved successfully
   - **401** – Unauthorized (not logged in)

Dashboard Endpoints
-------------------

Get Dashboard Statistics
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/dashboard/stats

   Retrieves key statistics for the dashboard overview.

   **Example Response:**

   .. code-block:: json

      {
        "totalItems": 1250,
        "lowStockItems": 15,
        "totalValue": 125000.50,
        "activeUsers": 25
      }

   **Status Codes:**
   
   - **200** – Statistics retrieved successfully
   - **401** – Unauthorized

Get Low Stock Items
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/dashboard/low-stock

   Retrieves items that are at or below their minimum stock threshold.

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 123,
          "name": "Dell Laptop XPS 13",
          "sku": "DELL-XPS13-001",
          "currentStock": 3,
          "minimumStock": 5,
          "price": "1299.99",
          "category": {
            "id": 1,
            "name": "IT Equipment",
            "color": "blue"
          }
        }
      ]

Get Category Statistics
~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/dashboard/category-stats

   Retrieves statistics grouped by category.

   **Example Response:**

   .. code-block:: json

      [
        {
          "category": {
            "id": 1,
            "name": "IT Equipment",
            "color": "blue"
          },
          "itemCount": 45,
          "totalValue": 65000.00
        }
      ]

Inventory Endpoints
-------------------

List Inventory Items
~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/items

   Retrieves a paginated list of inventory items with optional filtering.

   **Query Parameters:**
   
   - **page** (int) – Page number (default: 1)
   - **limit** (int) – Items per page (default: 10, max: 100)
   - **search** (string) – Search term for item names/descriptions
   - **categoryId** (int) – Filter by category ID

   **Example Request:**

   .. code-block:: http

      GET /api/items?page=1&limit=20&search=laptop&categoryId=1 HTTP/1.1
      Host: localhost:5000

   **Example Response:**

   .. code-block:: json

      {
        "items": [
          {
            "id": 123,
            "name": "Dell Laptop XPS 13",
            "sku": "DELL-XPS13-001",
            "description": "High-performance laptop for faculty use",
            "categoryId": 1,
            "price": "1299.99",
            "currentStock": 15,
            "minimumStock": 5,
            "isActive": true,
            "createdBy": "admin123",
            "createdAt": "2025-01-01T00:00:00.000Z",
            "updatedAt": "2025-01-15T10:30:00.000Z",
            "category": {
              "id": 1,
              "name": "IT Equipment",
              "description": "Computers and technology devices",
              "icon": "fas fa-laptop",
              "color": "blue"
            },
            "createdBy": {
              "id": "admin123",
              "email": "admin@university.edu",
              "firstName": "Admin",
              "lastName": "User"
            }
          }
        ],
        "total": 150
      }

Get Specific Item
~~~~~~~~~~~~~~~~~

.. http:get:: /api/items/(int:id)

   Retrieves detailed information for a specific inventory item.

   **Path Parameters:**
   
   - **id** (int) – Item ID

   **Example Response:**

   .. code-block:: json

      {
        "id": 123,
        "name": "Dell Laptop XPS 13",
        "sku": "DELL-XPS13-001",
        "description": "High-performance laptop for faculty use",
        "categoryId": 1,
        "price": "1299.99",
        "currentStock": 15,
        "minimumStock": 5,
        "isActive": true,
        "category": {
          "id": 1,
          "name": "IT Equipment"
        },
        "createdBy": {
          "id": "admin123",
          "email": "admin@university.edu"
        }
      }

   **Status Codes:**
   
   - **200** – Item retrieved successfully
   - **404** – Item not found

Create New Item
~~~~~~~~~~~~~~~

.. http:post:: /api/items

   Creates a new inventory item. Requires Manager or Admin role.

   **Request Body:**

   .. code-block:: json

      {
        "name": "MacBook Pro 16-inch",
        "sku": "APPLE-MBP16-001",
        "description": "Latest MacBook Pro for design department",
        "categoryId": 1,
        "price": "2499.99",
        "currentStock": 10,
        "minimumStock": 3
      }

   **Example Response:**

   .. code-block:: json

      {
        "id": 124,
        "name": "MacBook Pro 16-inch",
        "sku": "APPLE-MBP16-001",
        "description": "Latest MacBook Pro for design department",
        "categoryId": 1,
        "price": "2499.99",
        "currentStock": 10,
        "minimumStock": 3,
        "isActive": true,
        "createdBy": "manager123",
        "createdAt": "2025-01-20T14:30:00.000Z"
      }

   **Status Codes:**
   
   - **201** – Item created successfully
   - **400** – Validation error
   - **403** – Insufficient permissions

Update Item
~~~~~~~~~~~

.. http:put:: /api/items/(int:id)

   Updates an existing inventory item. Requires Manager or Admin role.

   **Path Parameters:**
   
   - **id** (int) – Item ID

   **Request Body:**

   .. code-block:: json

      {
        "name": "MacBook Pro 16-inch (Updated)",
        "price": "2399.99",
        "currentStock": 12
      }

Update Item Stock
~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/(int:id)/stock

   Updates the stock level for an item with audit tracking. Requires Manager or Admin role.

   **Path Parameters:**
   
   - **id** (int) – Item ID

   **Request Body:**

   .. code-block:: json

      {
        "quantity": 20,
        "type": "in",
        "reason": "New shipment received"
      }

   **Stock Types:**
   
   - **in** – Stock received (adds to current stock)
   - **out** – Stock issued (subtracts from current stock)
   - **adjustment** – Manual adjustment (sets stock to exact quantity)

   **Status Codes:**
   
   - **200** – Stock updated successfully
   - **400** – Invalid stock operation
   - **403** – Insufficient permissions

Bulk Import Items
~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk-import

   Imports multiple inventory items from CSV data. Requires authentication.

   **Request Body:**

   .. code-block:: json

      {
        "items": [
          {
            "name": "Dell Laptop XPS 13",
            "sku": "DELL-XPS13-001",
            "description": "High-performance laptop",
            "categoryName": "IT Equipment",
            "price": "1299.99",
            "currentStock": 10,
            "minimumStock": 5
          },
          {
            "name": "Office Chair",
            "sku": "CHAIR-001",
            "description": "Ergonomic office chair",
            "categoryName": "Furniture",
            "price": "299.99",
            "currentStock": 15,
            "minimumStock": 3
          }
        ]
      }

   **Field Requirements:**

   - **name** (string, required) – Item name
   - **sku** (string, required) – Unique identifier
   - **description** (string, optional) – Item description
   - **categoryName** (string, required) – Exact category name (case-insensitive)
   - **price** (string, required) – Unit price as decimal number
   - **currentStock** (number, required) – Current quantity
   - **minimumStock** (number, optional) – Low stock threshold (defaults to 0)

   **Example Response:**

   .. code-block:: json

      {
        "successful": 15,
        "failed": 2,
        "errors": [
          "Item 3: Category 'Invalid Category' not found",
          "Item 7: Missing required field 'name'"
        ]
      }

   **Validation Rules:**

   - All required fields must be present and non-empty
   - Category names must match existing categories exactly
   - Price and stock values must be valid numbers
   - SKU must be unique across all items
   - Items are processed sequentially for data integrity

   **Status Codes:**
   
   - **200** – Import completed (check response for individual item results)
   - **400** – Invalid request format or empty items array
   - **401** – Unauthorized
   - **500** – Server error during import

   **Performance Notes:**

   - Large imports (100+ items) may take several minutes
   - Items are validated and created individually
   - Failed items don't affect successful imports
   - Import continues even if some items fail validation

Delete Item
~~~~~~~~~~~

.. http:delete:: /api/items/(int:id)

   Soft deletes an inventory item (marks as inactive). Requires Manager or Admin role.

   **Path Parameters:**
   
   - **id** (int) – Item ID

   **Status Codes:**
   
   - **204** – Item deleted successfully
   - **403** – Insufficient permissions
   - **404** – Item not found

Bulk Operations Endpoints
--------------------------

Bulk operations allow performing actions on multiple items simultaneously, improving efficiency for large-scale inventory management tasks.

Bulk Delete Items
~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/delete

   Permanently deletes multiple items. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789]
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "3 items deleted successfully"
      }

   **Status Codes:**

   - **200** – Items deleted successfully
   - **400** – Invalid request (empty or invalid itemIds)
   - **403** – Insufficient permissions
   - **500** – Server error

Bulk Set Items Inactive
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/set-inactive

   Marks multiple items as inactive. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789]
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "3 items marked as inactive"
      }

   **Status Codes:**

   - **200** – Items updated successfully
   - **400** – Invalid request
   - **403** – Insufficient permissions

Bulk Set Items Active
~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/set-active

   Marks multiple items as active. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789]
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "3 items marked as active"
      }

   **Status Codes:**

   - **200** – Items updated successfully
   - **400** – Invalid request
   - **403** – Insufficient permissions

Bulk Set Stock to Zero
~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/set-stock-zero

   Sets current stock to zero for multiple items. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789]
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "Stock set to zero for 3 items"
      }

   **Status Codes:**

   - **200** – Stock updated successfully
   - **400** – Invalid request
   - **403** – Insufficient permissions

Bulk Export Items
~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/export

   Exports multiple items to CSV or Excel format.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789],
        "format": "xlsx"
      }

   **Parameters:**

   - **itemIds** (array) – Array of item IDs to export
   - **format** (string) – Export format: ``csv`` or ``xlsx`` (default: ``xlsx``)

   **Response:**

   Returns a downloadable file with Content-Type ``application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`` or ``text/csv``

   **Status Codes:**

   - **200** – Export successful
   - **400** – Invalid request
   - **403** – Insufficient permissions

Bulk Add Note to Items
~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/add-note

   Adds the same note to multiple items. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789],
        "noteText": "Supplier price increase expected next quarter"
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "Note added to 3 items"
      }

   **Status Codes:**

   - **200** – Notes created successfully
   - **400** – Invalid request
   - **403** – Insufficient permissions

Bulk Change VAT Rate
~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/change-vat-rate

   Updates the VAT rate for multiple items. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789],
        "vatRate": "0.20"
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "VAT rate updated for 3 items"
      }

   **Status Codes:**

   - **200** – VAT rates updated successfully
   - **400** – Invalid request (missing vatRate or invalid value)
   - **403** – Insufficient permissions

Bulk Change Category
~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/items/bulk/change-category

   Moves multiple items to a different category. Requires Admin or Manager role.

   **Request Body:**

   .. code-block:: json

      {
        "itemIds": [123, 456, 789],
        "categoryId": 5
      }

   **Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "3 items moved to category \"Laboratory Equipment\""
      }

   **Status Codes:**

   - **200** – Categories updated successfully
   - **400** – Invalid request (missing categoryId or category not found)
   - **403** – Insufficient permissions
   - **404** – Category not found

Category Endpoints
------------------

List Categories
~~~~~~~~~~~~~~~

.. http:get:: /api/categories

   Retrieves all inventory categories.

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 1,
          "name": "IT Equipment",
          "description": "Computers, laptops, and technology devices",
          "icon": "fas fa-laptop",
          "color": "blue",
          "createdAt": "2025-01-01T00:00:00.000Z"
        },
        {
          "id": 2,
          "name": "Office Supplies",
          "description": "Pens, paper, and general office materials",
          "icon": "fas fa-paperclip",
          "color": "green",
          "createdAt": "2025-01-01T00:00:00.000Z"
        }
      ]

Create Category
~~~~~~~~~~~~~~~

.. http:post:: /api/categories

   Creates a new category. Requires Manager or Admin role.

   **Request Body:**

   .. code-block:: json

      {
        "name": "Medical Equipment",
        "description": "Medical devices and supplies",
        "icon": "fas fa-stethoscope",
        "color": "red"
      }

Stock Movement Endpoints
------------------------

Get Stock Movements
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/stock-movements

   Retrieves stock movement history with optional filtering.

   **Query Parameters:**
   
   - **itemId** (int) – Filter by specific item
   - **limit** (int) – Number of records (default: 50, max: 100)

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 456,
          "itemId": 123,
          "type": "in",
          "quantity": 10,
          "previousStock": 5,
          "newStock": 15,
          "reason": "New shipment",
          "performedBy": "manager123",
          "createdAt": "2025-01-20T14:30:00.000Z",
          "item": {
            "id": 123,
            "name": "Dell Laptop XPS 13",
            "sku": "DELL-XPS13-001"
          },
          "performedBy": {
            "id": "manager123",
            "email": "manager@university.edu",
            "firstName": "Jane",
            "lastName": "Manager"
          }
        }
      ]

Notes Endpoints
---------------

Notes provide contextual annotations for items, sales, orders, charge codes, and other entities. Each note includes the creator's information and timestamp.

Get All Notes
~~~~~~~~~~~~~

.. http:get:: /api/notes

   Retrieves all notes with optional filtering.

   **Query Parameters:**

   - **referenceType** (string, optional) – Filter by entity type (``item``, ``sale``, ``order``, ``charge_code``, etc.)
   - **referenceId** (string, optional) – Filter by specific entity ID

   **Example Request:**

   .. code-block:: http

      GET /api/notes?referenceType=item&referenceId=123 HTTP/1.1
      Host: localhost:5000
      Cookie: connect.sid=s%3A...

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 45,
          "text": "This item is frequently out of stock during exam periods",
          "referenceType": "item",
          "referenceId": "123",
          "createdBy": "user@university.edu",
          "createdAt": "2025-01-10T14:30:00.000Z",
          "updatedAt": "2025-01-10T14:30:00.000Z"
        }
      ]

   **Status Codes:**

   - **200** – Notes retrieved successfully
   - **401** – Unauthorized

Get Notes for Entity
~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/notes/(string:referenceType)/(string:referenceId)

   Retrieves all notes for a specific entity.

   **Path Parameters:**

   - **referenceType** (string) – Entity type (``item``, ``sale``, ``order``, ``charge_code``, ``vendor``)
   - **referenceId** (string) – Entity ID

   **Example Request:**

   .. code-block:: http

      GET /api/notes/sale/S2025-001 HTTP/1.1
      Host: localhost:5000
      Cookie: connect.sid=s%3A...

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 78,
          "text": "Customer requested expedited delivery",
          "referenceType": "sale",
          "referenceId": "S2025-001",
          "createdBy": "manager@university.edu",
          "createdAt": "2025-01-12T09:15:00.000Z",
          "updatedAt": "2025-01-12T09:15:00.000Z"
        }
      ]

   **Status Codes:**

   - **200** – Notes retrieved successfully
   - **401** – Unauthorized
   - **404** – Entity not found

Create Note
~~~~~~~~~~~

.. http:post:: /api/notes

   Creates a new note for an entity.

   **Request Body:**

   .. code-block:: json

      {
        "text": "Supplier confirmed backorder expected in 2 weeks",
        "referenceType": "item",
        "referenceId": "456"
      }

   **Response:**

   .. code-block:: json

      {
        "id": 92,
        "text": "Supplier confirmed backorder expected in 2 weeks",
        "referenceType": "item",
        "referenceId": "456",
        "createdBy": "admin@university.edu",
        "createdAt": "2025-01-12T16:20:00.000Z",
        "updatedAt": "2025-01-12T16:20:00.000Z"
      }

   **Status Codes:**

   - **201** – Note created successfully
   - **400** – Invalid request (missing required fields)
   - **401** – Unauthorized

Update Note
~~~~~~~~~~~

.. http:put:: /api/notes/(int:id)

   Updates an existing note. Users can only update their own notes unless they have admin privileges.

   **Path Parameters:**

   - **id** (integer) – Note ID

   **Request Body:**

   .. code-block:: json

      {
        "text": "Updated: Backorder now expected in 3 weeks"
      }

   **Status Codes:**

   - **200** – Note updated successfully
   - **400** – Invalid request
   - **401** – Unauthorized
   - **403** – Forbidden (not note creator or admin)
   - **404** – Note not found

Delete Note
~~~~~~~~~~~

.. http:delete:: /api/notes/(int:id)

   Deletes a note. Users can only delete their own notes unless they have admin privileges.

   **Path Parameters:**

   - **id** (integer) – Note ID

   **Status Codes:**

   - **204** – Note deleted successfully
   - **401** – Unauthorized
   - **403** – Forbidden (not note creator or admin)
   - **404** – Note not found

Get Note Count
~~~~~~~~~~~~~~

.. http:get:: /api/notes/count/(string:referenceType)/(string:referenceId)

   Gets the count of notes for a specific entity (used for displaying note indicators).

   **Path Parameters:**

   - **referenceType** (string) – Entity type
   - **referenceId** (string) – Entity ID

   **Example Response:**

   .. code-block:: json

      {
        "count": 3
      }

   **Status Codes:**

   - **200** – Count retrieved successfully
   - **401** – Unauthorized

Get Note Counts (Batch)
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/notes/counts/batch

   Gets note counts for multiple entities in a single request (optimized for table views).

   **Request Body:**

   .. code-block:: json

      {
        "referenceType": "item",
        "referenceIds": ["123", "456", "789"]
      }

   **Response:**

   .. code-block:: json

      {
        "counts": {
          "123": 2,
          "456": 0,
          "789": 5
        }
      }

   **Status Codes:**

   - **200** – Counts retrieved successfully
   - **400** – Invalid request
   - **401** – Unauthorized

User Management Endpoints
-------------------------

List Users
~~~~~~~~~~

.. http:get:: /api/users

   Retrieves all system users. Requires Admin role.

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": "user123",
          "email": "john.doe@university.edu",
          "firstName": "John",
          "lastName": "Doe",
          "role": "manager",
          "isActive": true,
          "createdAt": "2025-01-01T00:00:00.000Z"
        }
      ]

Update User Role
~~~~~~~~~~~~~~~~

.. http:put:: /api/users/(string:id)/role

   Updates a user's role. Requires Admin role.

   **Path Parameters:**
   
   - **id** (string) – User ID

   **Request Body:**

   .. code-block:: json

      {
        "role": "manager"
      }

   **Valid Roles:**

   - **user** – Read-only access
   - **manager** – Inventory management
   - **admin** – Full system access

Update User Picking List Preference
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/users/(string:id)/preferences/picking-list

   Updates a user's preference for displaying picking lists after completing sales. Users can update their own preferences; admins can update any user's preferences.

   **Path Parameters:**

   - **id** (string) – User ID

   **Request Body:**

   .. code-block:: json

      {
        "showPickingList": true
      }

   **Response:**

   .. code-block:: json

      {
        "message": "Preference updated successfully",
        "user": {
          "id": "user123",
          "email": "john.doe@university.edu",
          "showPickingList": true
        }
      }

   **Status Codes:**

   - **200** – Preference updated successfully
   - **400** – Invalid request (showPickingList must be boolean)
   - **401** – Unauthorized
   - **403** – Forbidden (cannot update other users' preferences)

Sales & Quotes Endpoints
------------------------

For detailed Sales & Quotes API documentation, see :doc:`sales-quotes`.

Key endpoints:

* :http:post:`/api/sales/quotes` - Create sales quotes with stock validation
* :http:post:`/api/sales/stock-check` - Validate stock availability
* :http:get:`/api/sales/low-stock-report` - Generate low stock reports

Mark Sale as Paid
~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/sales/(int:id)/paid

   Marks a completed sale as paid (reconciled). Requires Manager or Admin role.

   **Path Parameters:**

   - **id** (integer) – Sale ID

   **Response:**

   .. code-block:: json

      {
        "message": "Sale marked as paid successfully",
        "sale": {
          "id": 123,
          "saleId": "S2025-001",
          "isPaid": true,
          "updatedAt": "2025-01-12T10:30:00.000Z"
        }
      }

   **Status Codes:**

   - **200** – Sale marked as paid
   - **401** – Unauthorized
   - **403** – Insufficient permissions
   - **404** – Sale not found

Mark Sale as Unpaid
~~~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/sales/(int:id)/unpaid

   Marks a sale as unpaid (reverses payment reconciliation). Requires Admin role.

   **Path Parameters:**

   - **id** (integer) – Sale ID

   **Response:**

   .. code-block:: json

      {
        "message": "Sale marked as unpaid successfully",
        "sale": {
          "id": 123,
          "saleId": "S2025-001",
          "isPaid": false,
          "updatedAt": "2025-01-12T10:35:00.000Z"
        }
      }

   **Status Codes:**

   - **200** – Sale marked as unpaid
   - **401** – Unauthorized
   - **403** – Insufficient permissions (requires Admin)
   - **404** – Sale not found

Record Sale Recipient
~~~~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/sales/(int:id)/recipient

   Records who received the items from a completed sale. This provides delivery confirmation tracking.

   **Path Parameters:**

   - **id** (integer) – Sale ID

   **Request Body:**

   .. code-block:: json

      {
        "deliveredTo": "Dr. Jane Smith",
        "deliveredToEmail": "jane.smith@university.edu"
      }

   **Response:**

   .. code-block:: json

      {
        "message": "Recipient recorded successfully",
        "sale": {
          "id": 123,
          "saleId": "S2025-001",
          "deliveredTo": "Dr. Jane Smith",
          "deliveredToEmail": "jane.smith@university.edu",
          "deliveredAt": "2025-01-12T11:00:00.000Z"
        }
      }

   **Status Codes:**

   - **200** – Recipient recorded successfully
   - **400** – Invalid request (deliveredTo is required)
   - **401** – Unauthorized
   - **404** – Sale not found

Documentation Endpoint
----------------------

Get API Documentation
~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/docs

   Returns comprehensive API documentation and schema information.

   **Example Response:**

   .. code-block:: json

      {
        "title": "University Inventory Management API",
        "version": "1.0.0",
        "description": "RESTful API for managing university inventory",
        "endpoints": {
          "authentication": "...",
          "dashboard": "...",
          "items": "...",
          "sales": "..."
        }
      }

System Alerts Endpoints
-----------------------

Get System Alerts
~~~~~~~~~~~~~~~~~

.. http:get:: /api/system/alerts

   Retrieves current system alerts for monitoring dashboard.

   **Example Response:**

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
            "message": "15 items below minimum stock"
          }
        ],
        "hasSystemAlerts": true
      }

   **Status Codes:**
   
   - **200** – Alerts retrieved successfully
   - **401** – Unauthorized

Suppliers Endpoints
-------------------

List Suppliers
~~~~~~~~~~~~~~

.. http:get:: /api/suppliers

   Retrieves all suppliers in the system.

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": "supplier-001",
          "name": "TechCorp Ltd",
          "contact": "John Smith",
          "email": "orders@techcorp.com",
          "phone": "+1-555-0123",
          "address": "123 Tech Street, Silicon Valley, CA"
        }
      ]

Get Supplier Details
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/suppliers/(string:id)

   Retrieves detailed information for a specific supplier.

   **Path Parameters:**
   
   - **id** (string) – Supplier ID

Create Supplier
~~~~~~~~~~~~~~~

.. http:post:: /api/suppliers

   Creates a new supplier. Requires authentication.

   **Request Body:**

   .. code-block:: json

      {
        "id": "supplier-002",
        "name": "Office Supplies Inc",
        "contact": "Jane Doe",
        "email": "sales@officesupplies.com",
        "phone": "+1-555-0456",
        "address": "456 Supply Ave, Business Park, NY"
      }

Update Supplier
~~~~~~~~~~~~~~~

.. http:put:: /api/suppliers/(string:id)

   Updates an existing supplier. Requires authentication.

Delete Supplier
~~~~~~~~~~~~~~~

.. http:delete:: /api/suppliers/(string:id)

   Deletes a supplier. Requires Admin or Superuser role.

   **Status Codes:**
   
   - **204** – Supplier deleted successfully
   - **403** – Insufficient permissions
   - **404** – Supplier not found

Link Item to Supplier
~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/suppliers/(string:id)/items

   Links an item to a supplier for sourcing information.

   **Request Body:**

   .. code-block:: json

      {
        "itemId": 123,
        "price": "99.99",
        "notes": "Bulk discount available for orders over 50 units"
      }

Remove Item Source
~~~~~~~~~~~~~~~~~

.. http:delete:: /api/sources/(int:id)

   Removes an item-supplier relationship. Requires Admin or Superuser role.

Charge Codes Endpoints
----------------------

List Charge Codes
~~~~~~~~~~~~~~~~~

.. http:get:: /api/chargecodes

   Retrieves all available charge codes.

   **Example Response:**

   .. code-block:: json

      [
        {
          "code": "DEPT-IT-2025",
          "title": "IT Department Budget 2025",
          "authorisedBy": "admin123",
          "validFrom": "2025-01-01T00:00:00.000Z",
          "validUntil": "2025-12-31T23:59:59.000Z",
          "costCentre": "CC-IT-001"
        }
      ]

Get Charge Code Details
~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/chargecodes/(string:code)

   Retrieves detailed information for a specific charge code.

Create Charge Code
~~~~~~~~~~~~~~~~~

.. http:post:: /api/chargecodes

   Creates a new charge code. Requires Admin or Superuser role.

   **Request Body:**

   .. code-block:: json

      {
        "code": "PROJ-AI-2025",
        "title": "AI Research Project 2025",
        "validFrom": "2025-01-01T00:00:00.000Z",
        "validUntil": "2025-12-31T23:59:59.000Z",
        "pin": "1234",
        "costCentre": "CC-RESEARCH-001"
      }

Update Charge Code
~~~~~~~~~~~~~~~~~

.. http:put:: /api/chargecodes/(string:code)

   Updates an existing charge code. Requires Admin or Superuser role.

Delete Charge Code
~~~~~~~~~~~~~~~~~

.. http:delete:: /api/chargecodes/(string:code)

   Deletes a charge code. Requires Admin role.

Get Expiring Charge Codes
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/chargecodes/expiring/soon

   Retrieves charge codes that are expiring soon (within 30 days).

Get Authorized Users for Charge Code
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/chargecodes/(string:code)/authorized-users

   Retrieves the list of users authorized to use a specific charge code. Used for displaying authorized users in picking lists and validating permissions.

   **Path Parameters:**

   - **code** (string) – Charge code (e.g., ``DEPT001``)

   **Example Request:**

   .. code-block:: http

      GET /api/chargecodes/PHYS001/authorized-users HTTP/1.1
      Host: localhost:5000
      Cookie: connect.sid=s%3A...

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 15,
          "chargeCode": "PHYS001",
          "userName": "Dr. Jane Smith",
          "email": "jane.smith@university.edu",
          "department": "Physics Department",
          "notes": "Primary contact for lab equipment"
        },
        {
          "id": 16,
          "chargeCode": "PHYS001",
          "userName": "Prof. John Doe",
          "email": "john.doe@university.edu",
          "department": "Physics Department",
          "notes": null
        }
      ]

   **Status Codes:**

   - **200** – Authorized users retrieved successfully
   - **401** – Unauthorized
   - **404** – Charge code not found

Orders Endpoints
---------------

List Orders
~~~~~~~~~~~

.. http:get:: /api/orders

   Retrieves all orders in the system.

   **Example Response:**

   .. code-block:: json

      [
        {
          "id": 1,
          "orderId": "O202501291234",
          "supplierId": "supplier-001",
          "status": "pending",
          "totalAmount": "1299.99",
          "notes": "Urgent delivery required",
          "createdBy": "manager123",
          "createdAt": "2025-01-29T10:00:00.000Z"
        }
      ]

Upload Invoice for Processing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/orders/upload-invoice

   Uploads and processes an invoice PDF for order creation.

   **Content-Type:** ``multipart/form-data``

   **Form Data:**
   
   - **invoice** (file) – PDF invoice file (max 10MB)

   **Example Response:**

   .. code-block:: json

      {
        "success": true,
        "message": "Invoice processed successfully",
        "extractedData": {
          "supplierName": "TechCorp Ltd",
          "invoiceNumber": "INV-2025-001",
          "total": "1299.99",
          "items": [
            {
              "name": "Dell Laptop XPS 13",
              "quantity": 1,
              "unitPrice": "1299.99"
            }
          ]
        }
      }

Import Order from Invoice
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/orders/import-from-invoice

   Creates an order directly from an uploaded invoice PDF.

   **Content-Type:** ``multipart/form-data``

Settings and Permissions Endpoints
----------------------------------

Get System Settings
~~~~~~~~~~~~~~~~~~

.. http:get:: /api/settings

   Retrieves all system settings. Requires Admin role.

Update System Setting
~~~~~~~~~~~~~~~~~~~~

.. http:put:: /api/settings/(string:key)

   Updates a specific system setting. Requires Admin role.

   **Request Body:**

   .. code-block:: json

      {
        "value": {"enabled": true, "threshold": 10}
      }

Get User Permissions
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/settings/users

   Retrieves all users with their permissions. Requires Admin role.

Update User Permission
~~~~~~~~~~~~~~~~~~~~~

.. http:put:: /api/settings/users/(string:userId)/permissions/(string:permission)

   Grants or revokes a specific permission for a user. Requires Admin role.

   **Request Body:**

   .. code-block:: json

      {
        "granted": true
      }

Get Permission Definitions
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/settings/permissions

   Retrieves all available permission definitions.

Webhook Endpoints
----------------

Watchtower Webhook
~~~~~~~~~~~~~~~~~

.. http:post:: /api/webhook/watchtower

   Receives deployment notifications from Watchtower container updates.

GitHub Webhook
~~~~~~~~~~~~~

.. http:post:: /api/webhook/github

   Receives notifications from GitHub repository events.

Deployment Notifications Endpoints
----------------------------------

Get Deployment Notifications
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/notifications/deployments

   Retrieves recent deployment notifications.

Delete Deployment Notification
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:delete:: /api/notifications/deployments/(string:id)

   Removes a specific deployment notification.

Safe Deletion Endpoints
-----------------------

Check User Deletion Safety
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/users/(string:id)/deletion-check

   Checks if a user can be safely deleted. Requires Admin or Superuser role.

Safe Delete User
~~~~~~~~~~~~~~~

.. http:delete:: /api/users/(string:id)/safe

   Safely deletes a user after validation. Requires Admin role.

Check Category Deletion Safety
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/categories/(int:id)/deletion-check

   Checks if a category can be safely deleted. Requires Admin or Superuser role.

Safe Delete Category
~~~~~~~~~~~~~~~~~~~

.. http:delete:: /api/categories/(int:id)/safe

   Safely deletes a category after validation. Requires Admin or Superuser role.

Check Item Deletion Safety
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/items/(int:id)/deletion-check

   Checks if an item can be safely deleted. Requires Admin or Superuser role.

Safe Delete Item
~~~~~~~~~~~~~~~

.. http:delete:: /api/items/(int:id)/safe

   Safely deletes an item after validation. Requires Admin or Superuser role.

Check Supplier Deletion Safety
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/suppliers/(string:id)/deletion-check

   Checks if a supplier can be safely deleted. Requires Admin or Superuser role.

Safe Delete Supplier
~~~~~~~~~~~~~~~~~~~

.. http:delete:: /api/suppliers/(string:id)/safe

   Safely deletes a supplier after validation. Requires Admin or Superuser role.

Health Check Endpoints
----------------------

Application Health Check
~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /health

   Basic health check endpoint for load balancers and monitoring.

   **Example Response:**

   .. code-block:: json

      {
        "status": "healthy",
        "timestamp": "2025-01-20T14:30:00.000Z"
      }

API Health Check
~~~~~~~~~~~~~~~

.. http:get:: /api/health

   Detailed API health check with system information.

   **Example Response:**

   .. code-block:: json

      {
        "status": "healthy",
        "database": "connected",
        "version": "1.0.0",
        "uptime": 3600,
        "timestamp": "2025-01-20T14:30:00.000Z"
      }

File Upload Endpoints
--------------------

Upload Invoice File
~~~~~~~~~~~~~~~~~~

.. http:post:: /api/upload/invoice

   Generic invoice upload endpoint for processing.

   **Content-Type:** ``multipart/form-data``

   **Form Data:**
   
   - **invoice** (file) – PDF invoice file (max 10MB)

MCP Integration Endpoints
-------------------------

Get Charge Code Analytics
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/mcp/charge-code-analytics

   Retrieves analytics data for charge code usage and spending patterns.

   **Example Response:**

   .. code-block:: json

      {
        "totalSpending": 125000.50,
        "chargeCodeBreakdown": [
          {
            "code": "DEPT-IT-2025",
            "spent": 45000.00,
            "percentage": 36
          }
        ],
        "monthlyTrends": [
          {
            "month": "2025-01",
            "spending": 15000.00
          }
        ]
      }

Get Top Selling Items
~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/mcp/top-sellers

   Retrieves the most frequently sold items with analytics.

Get Department Performance
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/mcp/department-performance

   Retrieves performance metrics by department based on charge code usage.

Archives Endpoints
------------------

The Archives API provides endpoints for managing data archiving operations, allowing administrators
to archive old records and manage archived data.

List Archives
~~~~~~~~~~~~~

.. http:get:: /api/archives

   Retrieves all archive jobs with their status and metadata.

   **Example Response:**

   .. code-block:: json

      {
        "archives": [
          {
            "id": 1,
            "archiveName": "archive-2025-01-01",
            "archivePath": "/backups/archives/archive-2025-01-01.json",
            "ageThresholdDays": 365,
            "recordsArchived": {
              "sales": 150,
              "orders": 45,
              "stock_movements": 1200
            },
            "archiveSizeBytes": 524288,
            "status": "completed",
            "createdAt": "2025-01-01T00:00:00.000Z"
          }
        ]
      }

   **Status Codes:**

   - **200** – Archives listed successfully
   - **401** – Unauthorized
   - **403** – Forbidden (admin only)

Create Archive
~~~~~~~~~~~~~~

.. http:post:: /api/archives/create

   Creates a new archive of records older than the specified threshold.

   **Request Body:**

   .. code-block:: json

      {
        "ageThresholdDays": 365,
        "includeRecordTypes": ["sales", "orders", "stock_movements"]
      }

   **Status Codes:**

   - **201** – Archive created successfully
   - **400** – Invalid request
   - **401** – Unauthorized

Download Archive
~~~~~~~~~~~~~~~~

.. http:get:: /api/archives/(int:id)/download

   Downloads an archive file.

   **Path Parameters:**

   - **id** (integer) – Archive ID

   **Status Codes:**

   - **200** – File download started
   - **404** – Archive not found

Preview Archive
~~~~~~~~~~~~~~~

.. http:get:: /api/archives/preview

   Previews what data would be archived with given parameters.

   **Query Parameters:**

   - **ageThresholdDays** (integer) – Age threshold in days

   **Example Response:**

   .. code-block:: json

      {
        "recordsToArchive": {
          "sales": 150,
          "orders": 45,
          "stock_movements": 1200
        },
        "estimatedSize": "500 KB"
      }

Purge Archive Data
~~~~~~~~~~~~~~~~~~

.. http:delete:: /api/archives/(int:id)/purge-data

   Permanently deletes archived data from the database after archive creation.

   **Status Codes:**

   - **200** – Data purged successfully
   - **404** – Archive not found
   - **400** – Archive not in valid state for purging

Backup Endpoints
----------------

The Backup API provides endpoints for database backup management.

List Backups
~~~~~~~~~~~~

.. http:get:: /api/backups

   Retrieves all available database backups.

   **Example Response:**

   .. code-block:: json

      {
        "backups": [
          {
            "filename": "backup-2025-01-15-120000.sql",
            "size": 10485760,
            "createdAt": "2025-01-15T12:00:00.000Z",
            "type": "manual"
          }
        ]
      }

Create Backup
~~~~~~~~~~~~~

.. http:post:: /api/backups

   Creates a new database backup.

   **Example Response:**

   .. code-block:: json

      {
        "message": "Backup created successfully",
        "filename": "backup-2025-01-15-143000.sql",
        "size": 10485760
      }

   **Status Codes:**

   - **201** – Backup created
   - **401** – Unauthorized
   - **403** – Forbidden (admin only)

Download Backup
~~~~~~~~~~~~~~~

.. http:get:: /api/backups/(string:filename)/download

   Downloads a backup file.

   **Path Parameters:**

   - **filename** (string) – Backup filename

Restore Backup
~~~~~~~~~~~~~~

.. http:post:: /api/backups/(string:filename)/restore

   Restores the database from a backup. **Warning**: This is a destructive operation.

   **Path Parameters:**

   - **filename** (string) – Backup filename

   **Status Codes:**

   - **200** – Restore completed
   - **404** – Backup not found
   - **500** – Restore failed

Delete Backup
~~~~~~~~~~~~~

.. http:delete:: /api/backups/(string:filename)

   Deletes a backup file.

   **Status Codes:**

   - **204** – Backup deleted
   - **404** – Backup not found

Backup Statistics
~~~~~~~~~~~~~~~~~

.. http:get:: /api/backups/stats

   Retrieves backup storage statistics.

   **Example Response:**

   .. code-block:: json

      {
        "totalBackups": 15,
        "totalSize": 157286400,
        "oldestBackup": "2024-12-01T00:00:00.000Z",
        "newestBackup": "2025-01-15T12:00:00.000Z"
      }

Scheduled Backups
~~~~~~~~~~~~~~~~~

.. http:get:: /api/backups/schedule/status

   Gets the current backup schedule status.

.. http:post:: /api/backups/schedule

   Updates the backup schedule configuration.

   **Request Body:**

   .. code-block:: json

      {
        "enabled": true,
        "frequency": "daily",
        "time": "03:00",
        "retention": 30
      }

Sales Refund Endpoint
---------------------

Process Refund
~~~~~~~~~~~~~~

.. http:patch:: /api/sales/(int:id)/refund

   Processes a partial or full refund for a sale. This restocks the inventory and creates
   a note documenting the refund.

   **Path Parameters:**

   - **id** (integer) – Sale ID

   **Request Body:**

   .. code-block:: json

      {
        "items": [
          {
            "itemId": 45,
            "refundQty": 1
          }
        ],
        "note": "Customer returned item - defective"
      }

   **Example Response:**

   .. code-block:: json

      {
        "message": "Refund processed successfully",
        "sale": {
          "id": 456,
          "saleId": "SALE-20251205-001",
          "totalAmount": "1559.99",
          "status": "partially_refunded"
        },
        "refundedItems": [
          {
            "itemId": 45,
            "itemName": "Dell Laptop XPS 13",
            "refundedQty": 1,
            "stockRestored": true
          }
        ]
      }

   **Status Codes:**

   - **200** – Refund processed successfully
   - **400** – Invalid refund request
   - **404** – Sale not found
   - **401** – Unauthorized
   - **403** – Forbidden (requires refund permission)

Orders Extended Endpoints
-------------------------

Receive Order
~~~~~~~~~~~~~

.. http:post:: /api/orders/(int:id)/receive

   Marks an order as received and optionally updates inventory.

   **Path Parameters:**

   - **id** (integer) – Order ID

   **Request Body:**

   .. code-block:: json

      {
        "receivedItems": [
          {
            "orderItemId": 1,
            "receivedQuantity": 10,
            "addToInventory": true
          }
        ]
      }

   **Status Codes:**

   - **200** – Order received successfully
   - **404** – Order not found
   - **400** – Invalid request

Add Order Items to Inventory
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/orders/(int:id)/add-to-inventory

   Creates new inventory items from received order items.

   **Status Codes:**

   - **200** – Items added to inventory
   - **404** – Order not found

Upload Order Invoice
~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/orders/(int:id)/upload-invoice

   Uploads an invoice PDF for an order.

   **Content-Type:** ``multipart/form-data``

   **Form Data:**

   - **invoice** (file) – PDF invoice file

Get Order Invoice
~~~~~~~~~~~~~~~~~

.. http:get:: /api/orders/(int:id)/invoice-pdf

   Downloads the invoice PDF for an order.

   **Status Codes:**

   - **200** – File download
   - **404** – Invoice not found

Import Order from Invoice
~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/orders/import-from-invoice

   Creates an order by parsing an uploaded invoice.

   **Request Body:**

   .. code-block:: json

      {
        "parsedData": {
          "supplier": "Office Supplies Ltd",
          "items": [
            {
              "name": "Paper A4",
              "quantity": 10,
              "unitCost": 5.99
            }
          ]
        }
      }

Import Order Templates
~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/orders/import-template/json

   Downloads a JSON template for bulk order import.

.. http:get:: /api/orders/import-template/csv

   Downloads a CSV template for bulk order import.

VAT Rate Settings
-----------------

List VAT Rates
~~~~~~~~~~~~~~

.. http:get:: /api/settings/vat-rates

   Retrieves all configured VAT rates.

   **Example Response:**

   .. code-block:: json

      {
        "rates": [
          {
            "id": 1,
            "name": "Standard Rate",
            "rate": 0.20,
            "isDefault": true
          },
          {
            "id": 2,
            "name": "Reduced Rate",
            "rate": 0.05,
            "isDefault": false
          },
          {
            "id": 3,
            "name": "Zero Rate",
            "rate": 0.00,
            "isDefault": false
          }
        ]
      }

Create VAT Rate
~~~~~~~~~~~~~~~

.. http:post:: /api/settings/vat-rates

   Creates a new VAT rate.

   **Request Body:**

   .. code-block:: json

      {
        "name": "Reduced Rate",
        "rate": 0.05,
        "isDefault": false
      }

Update VAT Rate
~~~~~~~~~~~~~~~

.. http:put:: /api/settings/vat-rates/(int:rateId)

   Updates an existing VAT rate.

Delete VAT Rate
~~~~~~~~~~~~~~~

.. http:delete:: /api/settings/vat-rates/(int:rateId)

   Deletes a VAT rate. Cannot delete the default rate.

Charge Code Hold Management
---------------------------

Put Charge Code on Hold
~~~~~~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/chargecodes/(string:code)/hold

   Puts a charge code on hold or removes hold status.

   **Request Body:**

   .. code-block:: json

      {
        "onHold": true,
        "holdReason": "Budget review pending"
      }

   **Status Codes:**

   - **200** – Hold status updated
   - **404** – Charge code not found

Charge Code Exclusions
~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/chargecodes/(string:code)/exclusions

   Gets category exclusions for a charge code.

.. http:post:: /api/chargecodes/(string:code)/exclusions

   Adds a category exclusion to a charge code.

   **Request Body:**

   .. code-block:: json

      {
        "categoryId": 5
      }

.. http:delete:: /api/chargecodes/(string:code)/exclusions/(int:categoryId)

   Removes a category exclusion from a charge code.

Stock Movement Endpoints
------------------------

Get Stock Movements
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/stock-movements

   Retrieves stock movement history with filtering.

   **Query Parameters:**

   - **itemId** (integer, optional) – Filter by item
   - **type** (string, optional) – Filter by type (in, out, adjustment)
   - **startDate** (string, optional) – Start date filter
   - **endDate** (string, optional) – End date filter
   - **limit** (integer, optional) – Number of records (default: 50)

   **Example Response:**

   .. code-block:: json

      {
        "movements": [
          {
            "id": 1,
            "itemId": 45,
            "itemName": "Dell Laptop XPS 13",
            "type": "out",
            "quantity": -2,
            "previousStock": 15,
            "newStock": 13,
            "reason": "Sale: SALE-20251205-001",
            "performedBy": {
              "id": "user123",
              "firstName": "John",
              "lastName": "Doe"
            },
            "createdAt": "2025-12-05T10:35:00.000Z"
          }
        ]
      }

Get Item Stock Movements
~~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/items/(int:id)/stock-movements

   Gets stock movement history for a specific item.

   **Path Parameters:**

   - **id** (integer) – Item ID

Item Order History
~~~~~~~~~~~~~~~~~~

.. http:get:: /api/items/(int:id)/order-history

   Gets purchase order history for an item.

   **Example Response:**

   .. code-block:: json

      {
        "orders": [
          {
            "orderId": "O-2025-001",
            "orderDate": "2025-01-10T00:00:00.000Z",
            "supplier": "Tech Supplies Ltd",
            "quantity": 10,
            "unitCost": 1100.00,
            "status": "received"
          }
        ]
      }

Sales Analytics Endpoints
-------------------------

Get Sales Analytics
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/sales

   Gets paginated sales with filtering options.

   **Query Parameters:**

   - **page** (integer) – Page number
   - **limit** (integer) – Results per page
   - **chargeCode** (string) – Filter by charge code
   - **startDate** (string) – Start date
   - **endDate** (string) – End date

Get Most Sold Items
~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/sales/analytics/most-sold-items

   Gets top selling items by quantity or revenue.

   **Query Parameters:**

   - **limit** (integer) – Number of items (default: 10)
   - **period** (string) – Time period (week, month, year)

   **Example Response:**

   .. code-block:: json

      {
        "items": [
          {
            "itemId": 45,
            "itemName": "Dell Laptop XPS 13",
            "totalQuantity": 150,
            "totalRevenue": 194998.50
          }
        ]
      }

Stock Check
~~~~~~~~~~~

.. http:post:: /api/sales/stock-check

   Validates stock availability for a list of items before processing.

   **Request Body:**

   .. code-block:: json

      {
        "items": [
          {"itemId": 45, "quantity": 2},
          {"itemId": 67, "quantity": 5}
        ]
      }

   **Example Response:**

   .. code-block:: json

      {
        "allAvailable": true,
        "items": [
          {"itemId": 45, "available": true, "currentStock": 15, "requested": 2},
          {"itemId": 67, "available": true, "currentStock": 20, "requested": 5}
        ]
      }

Low Stock Report
~~~~~~~~~~~~~~~~

.. http:get:: /api/sales/low-stock-report

   Gets items that are at or below minimum stock levels.

Authentication Status
---------------------

SSO Status
~~~~~~~~~~

.. http:get:: /api/auth/sso-status

   Gets the current SSO configuration status.

   **Example Response:**

   .. code-block:: json

      {
        "ssoEnabled": true,
        "ssoProvider": "SAML",
        "localAuthEnabled": true
      }

Notification Endpoints
----------------------

Low Stock Notifications
~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/notifications/low-stock

   Gets current low stock alerts.

.. http:post:: /api/notifications/low-stock/(int:itemId)/acknowledge

   Acknowledges a low stock notification for an item.

.. http:delete:: /api/notifications/low-stock

   Clears all acknowledged low stock notifications.