Sales & Quotes API
==================

The Sales & Quotes API provides endpoints for managing sales quotes, stock checking, and generating reports for the inventory management system.

Overview
--------

The Sales API allows users to:

* Create and manage sales quotes
* Validate stock availability for multiple items
* Generate low stock reports
* Export quotes as CSV or invoices

All sales endpoints require authentication and follow the standard error response format.

Endpoints
---------

Create Quote
~~~~~~~~~~~~

.. http:post:: /api/sales/quotes

   Creates a new sales quote with stock validation.

   **Request Body:**

   .. code-block:: json

      {
        "chargeCode": "DEPT-IT-2025",
        "items": [
          {
            "id": 1,
            "quantity": 5
          },
          {
            "id": 2,
            "quantity": 2
          }
        ],
        "vatApplied": true,
        "customerInfo": {
          "name": "John Doe",
          "email": "john@example.com",
          "organization": "Example Corp",
          "department": "IT Department"
        },
        "notes": "Special handling required"
      }

   **Response (200 OK):**

   .. code-block:: json

      {
        "id": 123,
        "quoteId": "Q202501291234",
        "chargeCode": "DEPT-IT-2025",
        "items": [
          {
            "id": 1,
            "itemId": 1,
            "itemName": "Office Chair",
            "itemSku": "CHAIR-001",
            "unitPrice": "299.99",
            "vatRate": "0.2000",
            "vatAmount": "300.00",
            "quantity": 5,
            "subtotal": "1499.95",
            "totalWithVat": "1799.94",
            "category": {
              "name": "Furniture"
            }
          }
        ],
        "subtotalAmount": "1499.95",
        "vatAmount": "300.00",
        "totalAmount": "1799.95",
        "vatApplied": true,
        "customerInfo": {
          "name": "John Doe",
          "email": "john@example.com",
          "organization": "Example Corp",
          "department": "IT Department"
        },
        "notes": "Special handling required",
        "status": "draft",
        "createdBy": "user123",
        "createdAt": "2025-01-29T18:00:00.000Z",
        "updatedAt": "2025-01-29T18:00:00.000Z"
      }

   **Error Response (400 Bad Request):**

   .. code-block:: json

      {
        "message": "Insufficient stock for some items",
        "insufficientItems": [
          {
            "id": 1,
            "available": false,
            "currentStock": 3,
            "requested": 5
          }
        ]
      }

   :statuscode 200: Quote created successfully
   :statuscode 400: Insufficient stock or invalid request
   :statuscode 401: Authentication required
   :statuscode 500: Internal server error

Stock Check
~~~~~~~~~~~

.. http:post:: /api/sales/stock-check

   Validates stock availability for multiple items without creating a quote.

   **Request Body:**

   .. code-block:: json

      {
        "items": [
          {
            "id": 1,
            "quantity": 5
          },
          {
            "id": 2,
            "quantity": 2
          }
        ]
      }

   **Response (200 OK):**

   .. code-block:: json

      {
        "items": [
          {
            "id": 1,
            "name": "Office Chair",
            "currentStock": 10,
            "requestedQuantity": 5,
            "available": true,
            "price": 299.99
          },
          {
            "id": 2,
            "name": "Desk Lamp",
            "currentStock": 1,
            "requestedQuantity": 2,
            "available": false,
            "price": 49.99
          }
        ]
      }

   :statuscode 200: Stock check completed
   :statuscode 401: Authentication required
   :statuscode 500: Internal server error

Low Stock Report
~~~~~~~~~~~~~~~~

.. http:get:: /api/sales/low-stock-report

   Generates a comprehensive low stock report with category statistics.

   **Response (200 OK):**

   .. code-block:: json

      {
        "lowStockItems": [
          {
            "id": 1,
            "name": "Office Chair",
            "sku": "CHAIR-001",
            "currentStock": 2,
            "minimumStock": 5,
            "price": 299.99,
            "category": {
              "name": "Furniture"
            }
          }
        ],
        "categoryStats": [
          {
            "category": {
              "id": 1,
              "name": "Furniture"
            },
            "itemCount": 15,
            "totalValue": 12500.00
          }
        ],
        "totalLowStockValue": 599.98,
        "criticalItems": [
          {
            "id": 2,
            "name": "Broken Item",
            "currentStock": 0
          }
        ]
      }

   :statuscode 200: Report generated successfully
   :statuscode 401: Authentication required
   :statuscode 500: Internal server error

Data Models
-----------

Quote Item
~~~~~~~~~~

.. code-block:: typescript

   interface QuoteItem {
     id: number;
     name: string;
     sku: string;
     price: number;
     currentStock: number;
     requestedQuantity: number;
     subtotal: number;
     category: {
       name: string;
     };
   }

Customer Information
~~~~~~~~~~~~~~~~~~~~

.. code-block:: typescript

   interface CustomerInfo {
     name?: string;
     email?: string;
     organization?: string;
     address?: string;
     phone?: string;
   }

Quote
~~~~~

.. code-block:: typescript

   interface Quote {
     id: string;                    // Format: Q{timestamp}
     items: QuoteItem[];
     total: number;
     customerInfo?: CustomerInfo;
     notes?: string;
     createdBy: string;
     createdAt: string;            // ISO 8601 format
     status: 'draft' | 'sent' | 'approved' | 'rejected';
   }

Usage Examples
--------------

Creating a Quote with JavaScript
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   // Create a quote with multiple items
   const response = await fetch('/api/sales/quotes', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       items: [
         { id: 1, quantity: 3 },
         { id: 5, quantity: 1 }
       ],
       customerInfo: {
         name: 'Jane Smith',
         email: 'jane@university.edu',
         organization: 'University Research Lab'
       },
       notes: 'Needed for Q2 research project'
     })
   });

   if (response.ok) {
     const quote = await response.json();
     console.log('Quote created:', quote.id);
     console.log('Total amount:', quote.total);
   } else {
     const error = await response.json();
     console.error('Error:', error.message);
   }

Checking Stock Availability
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   // Check if items are available before creating quote
   const stockCheck = await fetch('/api/sales/stock-check', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       items: [
         { id: 1, quantity: 10 },
         { id: 2, quantity: 5 }
       ]
     })
   });

   const result = await stockCheck.json();
   const unavailableItems = result.items.filter(item => !item.available);
   
   if (unavailableItems.length > 0) {
     console.log('Some items are not available:', unavailableItems);
   }

Frontend Integration
--------------------

The Sales & Quotes interface provides:

* **Browse Items Tab**: Search and view inventory with real-time stock levels
* **Quote Builder**: Add items with quantity validation and automatic total calculation
* **Stock Overview**: Dashboard with categorized stock status (In Stock, Low Stock, Out of Stock)
* **Export Options**: Generate CSV files and professional PDF invoices
* **Real-time Validation**: Immediate feedback on stock availability

Export Formats
~~~~~~~~~~~~~~

**CSV Export**
  Includes item details, quantities, prices, and totals in comma-separated format suitable for spreadsheet applications.

**Invoice Generation**
  Creates a professional, print-ready invoice with:
  
  * University branding
  * Quote ID and creation date
  * Itemized listing with subtotals
  * Grand total calculation
  * User information and notes

Error Handling
--------------

All endpoints return structured error responses:

.. code-block:: json

   {
     "message": "Error description",
     "details": "Additional error context (optional)"
   }

Common error scenarios:

* **401 Unauthorized**: User authentication required
* **400 Bad Request**: Invalid request data or insufficient stock
* **404 Not Found**: Requested item not found
* **500 Internal Server Error**: Database or server issues

Security
--------

* All endpoints require valid user authentication
* Stock validation prevents overselling
* User activity is logged for audit purposes
* Export functions generate temporary files that are automatically cleaned up

Best Practices
--------------

1. **Always validate stock** before creating quotes to prevent customer disappointment
2. **Use the stock check endpoint** for real-time availability when building quotes
3. **Include customer information** for better quote tracking and follow-up
4. **Add meaningful notes** to provide context for the quote
5. **Monitor low stock reports** to proactively manage inventory levels