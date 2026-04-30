Sales & Quotes API (Updated)
=============================

The Sales & Quotes API provides comprehensive endpoints for managing draft quotes, processing sales, and generating reports. The system uses a draft-first workflow with automatic validation and atomic transaction processing.

.. versionadded:: 2.0
   Draft quote system with session-based isolation and automatic clearing after sale processing.

Overview
--------

**Key Features:**

* **Draft Quote Management**: Session-specific draft quotes that auto-save as items are added
* **Charge Code Validation**: Real-time validation with descriptive error messages
* **Atomic Processing**: Quote-to-sale conversion in a single database transaction
* **Fractional Quantities**: Support for decimal quantities (0.5 units, 1.25 meters, etc.)
* **Stock Validation**: Comprehensive stock checking before processing
* **Auto-Cleanup**: Draft quotes automatically cleared after successful processing

**Workflow:**

1. Add items to draft quote → ``POST /api/sales/quotes``
2. Validate charge code → Automatic validation on process
3. Process quote → ``POST /api/sales/quotes/:id/process``
4. Draft automatically cleared → System handles cleanup

Draft Quote Endpoints
---------------------

Get Current Draft Quote
~~~~~~~~~~~~~~~~~~~~~~~

.. http:get:: /api/sales/quotes/current-draft

   Retrieves the current draft quote for the authenticated user's session.

   **Query Parameters:**
   
   * **sessionId** (string, required) – Session identifier for draft isolation

   **Example Request:**

   .. code-block:: http

      GET /api/sales/quotes/current-draft?sessionId=abc123 HTTP/1.1
      Host: localhost:5000
      Authorization: Bearer eyJhbGc...

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "id": 123,
        "quoteId": "Q20251205-001",
        "chargeCode": "PHYSICS-LAB",
        "subtotalAmount": "2599.98",
        "vatAmount": "519.99",
        "totalAmount": "3119.97",
        "vatApplied": true,
        "status": "draft",
        "items": [
          {
            "id": 1,
            "itemId": 45,
            "itemName": "Dell Laptop XPS 13",
            "itemSku": "DELL-XPS13-001",
            "quantity": "2.00",
            "unitPrice": "1299.99",
            "vatRate": "0.2000",
            "vatAmount": "519.99",
            "subtotal": "2599.98",
            "totalWithVat": "3119.97"
          }
        ],
        "createdAt": "2025-12-05T10:30:00.000Z",
        "updatedAt": "2025-12-05T10:32:00.000Z"
      }

   **Not Found Response (404):**

   .. code-block:: json

      {
        "message": "No draft quote found for this session"
      }

   **Status Codes:**
   
   * **200** – Draft quote retrieved successfully
   * **404** – No draft quote exists for this session
   * **401** – Unauthorized (not authenticated)

Create or Update Draft Quote
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/sales/quotes

   Creates a new draft quote or updates the existing draft for the session.
   This endpoint is idempotent - calling it multiple times will update the same draft.

   **Request Body:**

   .. code-block:: json

      {
        "chargeCode": "PHYSICS-LAB",
        "items": [
          {
            "itemId": 45,
            "quantity": 2.0
          },
          {
            "itemId": 67,
            "quantity": 0.5
          }
        ],
        "vatApplied": true,
        "customerNotes": "For Room 204 lab setup",
        "sessionId": "abc123"
      }

   **Field Descriptions:**

   * **chargeCode** (string, required) – Valid charge code for billing
   * **items** (array, required) – Array of items with quantities
     
     * **itemId** (integer) – Database ID of the item
     * **quantity** (decimal) – Quantity to order (supports decimals like 0.5)
   
   * **vatApplied** (boolean, optional) – Whether to apply VAT (default: true)
   * **customerNotes** (string, optional) – Additional notes for the order
   * **sessionId** (string, required) – Session identifier

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "message": "Draft quote saved successfully",
        "quote": {
          "id": 123,
          "quoteId": "Q20251205-001",
          "chargeCode": "PHYSICS-LAB",
          "totalAmount": "3119.97",
          "status": "draft"
        }
      }

   **Error Response - Invalid Charge Code (400):**

   .. code-block:: json

      {
        "message": "Invalid charge code: 'INVALID-CODE' does not exist"
      }

   **Status Codes:**
   
   * **200** – Draft quote created/updated successfully
   * **400** – Invalid input (missing fields, invalid charge code)
   * **401** – Unauthorized

Update Draft Quote Charge Code
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. http:patch:: /api/sales/quotes/current-draft/charge-code

   Updates only the charge code for the current draft quote.

   **Request Body:**

   .. code-block:: json

      {
        "chargeCode": "CHEMISTRY-LAB",
        "sessionId": "abc123"
      }

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "message": "Charge code updated successfully",
        "chargeCode": "CHEMISTRY-LAB"
      }

   **Status Codes:**
   
   * **200** – Charge code updated
   * **400** – Invalid charge code
   * **404** – No draft quote found

Delete Draft Quote
~~~~~~~~~~~~~~~~~~

.. http:delete:: /api/sales/quotes/current-draft

   Clears the current draft quote from the database and removes all associated items.

   **Query Parameters:**
   
   * **sessionId** (string, required) – Session identifier

   **Example Request:**

   .. code-block:: http

      DELETE /api/sales/quotes/current-draft?sessionId=abc123 HTTP/1.1
      Host: localhost:5000
      Authorization: Bearer eyJhbGc...

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "message": "Draft quote deleted successfully"
      }

   **Status Codes:**
   
   * **200** – Draft deleted successfully
   * **404** – No draft quote found
   * **401** – Unauthorized

Process Quote (Convert to Sale)
--------------------------------

Process Quote Endpoint
~~~~~~~~~~~~~~~~~~~~~~

.. http:post:: /api/sales/quotes/:id/process

   Converts a draft quote into a completed sale. This operation:

   1. **Validates** the charge code (existence, expiration, category restrictions)
   2. **Checks** stock availability for all items
   3. **Creates** a permanent sale record
   4. **Reduces** inventory stock levels atomically
   5. **Deletes** the draft quote automatically

   This is an atomic transaction - either all steps succeed or none do.

   **Path Parameters:**
   
   * **id** (integer) – Quote ID to process

   **Example Request:**

   .. code-block:: http

      POST /api/sales/quotes/123/process HTTP/1.1
      Host: localhost:5000
      Authorization: Bearer eyJhbGc...

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "message": "Quote processed successfully",
        "sale": {
          "id": 456,
          "saleId": "SALE-20251205-001",
          "chargeCode": "PHYSICS-LAB",
          "subtotalAmount": "2599.98",
          "vatAmount": "519.99",
          "totalAmount": "3119.97",
          "status": "completed",
          "createdAt": "2025-12-05T10:35:00.000Z",
          "processedBy": {
            "id": "user-123",
            "email": "john.doe@university.edu",
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      }

   **Error Responses:**

   **Missing Charge Code (400):**

   .. code-block:: json

      {
        "message": "Quote is missing a charge code. Please edit the quote and add a valid charge code before processing."
      }

   **Invalid Charge Code (400):**

   .. code-block:: json

      {
        "message": "Invalid charge code: 'DEPT999' does not exist. Available codes include: PHYSICS, CHEMISTRY, BIOLOGY, ENGINEERING"
      }

   **Expired Charge Code (400):**

   .. code-block:: json

      {
        "message": "Charge code 'OLD-LAB' has expired on 11/30/2024."
      }

   **Not Yet Valid (400):**

   .. code-block:: json

      {
        "message": "Charge code 'FUTURE-LAB' is not yet valid until 01/15/2026."
      }

   **Category Restrictions (400):**

   .. code-block:: json

      {
        "message": "Charge code 'RESTRICTED-LAB' cannot be used for some items in this quote due to category restrictions."
      }

   **Insufficient Stock (400):**

   .. code-block:: json

      {
        "message": "Insufficient stock for item 'Dell Laptop XPS 13'. Current stock: 3, Required: 5"
      }

   **Quote Not Found (404):**

   .. code-block:: json

      {
        "message": "Quote not found"
      }

   **Status Codes:**
   
   * **200** – Quote processed successfully, sale created
   * **400** – Validation failed (charge code, stock, restrictions)
   * **404** – Quote not found
   * **401** – Unauthorized
   * **500** – Server error during processing

Sales Management Endpoints
---------------------------

Get Sales Report
~~~~~~~~~~~~~~~~

.. http:get:: /api/sales/reports

   Retrieves sales data with filtering, pagination, and aggregation.

   **Query Parameters:**
   
   * **page** (integer, optional) – Page number (default: 1)
   * **limit** (integer, optional) – Results per page (default: 50, max: 100)
   * **chargeCode** (string, optional) – Filter by charge code (partial match)
   * **startDate** (string, optional) – Start date (ISO 8601 format)
   * **endDate** (string, optional) – End date (ISO 8601 format)
   * **unpaidOnly** (boolean, optional) – Show only unpaid sales
   * **format** (string, optional) – Response format: 'json' or 'csv' (default: json)

   **Example Request:**

   .. code-block:: http

      GET /api/sales/reports?page=1&limit=20&chargeCode=PHYSICS&startDate=2025-01-01&endDate=2025-12-31 HTTP/1.1
      Host: localhost:5000
      Authorization: Bearer eyJhbGc...

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "success": true,
        "data": {
          "summary": {
            "totalSales": 156,
            "totalAmount": 45678.90,
            "uniqueChargeCodes": 12
          },
          "departmentSummary": [
            {
              "department": "PHYSICS-LAB",
              "totalSales": 45,
              "totalAmount": 15234.50
            },
            {
              "department": "CHEMISTRY-LAB",
              "totalSales": 38,
              "totalAmount": 12456.78
            }
          ],
          "sales": [
            {
              "id": 456,
              "saleId": "SALE-20251205-001",
              "chargeCode": "PHYSICS-LAB",
              "total": 3119.97,
              "totalAmount": "3119.97",
              "isPaid": false,
              "status": "completed",
              "createdAt": "2025-12-05T10:35:00.000Z",
              "processedBy": {
                "firstName": "John",
                "lastName": "Doe"
              },
              "items": [
                {
                  "itemName": "Dell Laptop XPS 13",
                  "itemSku": "DELL-XPS13-001",
                  "quantity": "2.00",
                  "unitPrice": "1299.99"
                }
              ]
            }
          ],
          "pagination": {
            "page": 1,
            "limit": 20,
            "total": 156,
            "totalPages": 8
          }
        }
      }

   **CSV Export:**

   When ``format=csv``, returns CSV file with headers:

   .. code-block:: text

      Sale ID,Charge Code,Total Amount,Customer Info,Notes,Status,Processed By,Date,Items Count
      "SALE-20251205-001","PHYSICS-LAB","3119.97","","","completed","John Doe","2025-12-05T10:35:00.000Z","2"

   **Status Codes:**
   
   * **200** – Report generated successfully
   * **401** – Unauthorized

Mark Sale as Paid
~~~~~~~~~~~~~~~~~

.. http:patch:: /api/sales/:saleId/paid

   Updates a sale's status to 'paid'. This operation is used for financial reconciliation.

   **Path Parameters:**
   
   * **saleId** (integer) – Sale ID to mark as paid

   **Example Request:**

   .. code-block:: http

      PATCH /api/sales/456/paid HTTP/1.1
      Host: localhost:5000
      Authorization: Bearer eyJhbGc...

   **Success Response (200 OK):**

   .. code-block:: json

      {
        "id": 456,
        "saleId": "SALE-20251205-001",
        "status": "paid",
        "isPaid": true,
        "updatedAt": "2025-12-05T11:00:00.000Z"
      }

   **Status Codes:**
   
   * **200** – Sale marked as paid successfully
   * **404** – Sale not found
   * **401** – Unauthorized
   * **500** – Server error

Charge Code Validation
-----------------------

The system performs comprehensive charge code validation when processing quotes:

**Validation Checks:**

1. **Existence**: Charge code must exist in the ``chargecodes`` table
2. **Date Range**: Must be within ``validFrom`` and ``validUntil`` dates
3. **Category Exclusions**: Items must not belong to excluded categories
4. **Active Status**: Code must not be marked as inactive

**Example Validation Flow:**

.. code-block:: javascript

   // 1. Check if charge code exists
   const chargeCode = await getChargeCode("PHYSICS-LAB");
   if (!chargeCode) {
     throw new Error("Invalid charge code: 'PHYSICS-LAB' does not exist");
   }

   // 2. Check if expired
   if (chargeCode.validUntil < new Date()) {
     throw new Error("Charge code has expired on " + chargeCode.validUntil);
   }

   // 3. Check if not yet valid
   if (chargeCode.validFrom > new Date()) {
     throw new Error("Charge code is not yet valid until " + chargeCode.validFrom);
   }

   // 4. Check category exclusions
   const exclusions = await getChargeCodeExclusions("PHYSICS-LAB");
   // Validate items against exclusions...

Error Handling
--------------

All endpoints return structured error responses:

**Standard Error Format:**

.. code-block:: json

   {
     "message": "Descriptive error message explaining what went wrong",
     "error": "Error details (in development mode only)"
   }

**Common Error Scenarios:**

* **400 Bad Request**: Invalid input, validation failure, business logic violation
* **401 Unauthorized**: Missing or invalid authentication token
* **404 Not Found**: Resource doesn't exist
* **409 Conflict**: Referential integrity violation
* **500 Internal Server Error**: Unexpected server error

Best Practices
--------------

**Draft Quote Management:**

* Always use the same sessionId for all draft operations
* Clear draft quotes when user logs out or abandons the cart
* Validate charge codes before allowing user to process

**Stock Management:**

* Check stock availability before adding items to quote
* Support decimal quantities for appropriate item types
* Show clear feedback when stock is insufficient

**Error Handling:**

* Display full error messages to users - they contain helpful information
* For "Invalid charge code" errors, show the list of suggested codes
* Implement retry logic for 500 errors

**Performance:**

* Use pagination for large sales reports
* Cache draft quotes on the client side
* Implement debouncing for draft quote updates

**Security:**

* Never expose internal IDs in user-facing messages
* Validate all user input on the backend
* Use parameterized queries for all database operations
* Implement rate limiting for API endpoints

Code Examples
-------------

**TypeScript/React Example - Processing a Quote:**

.. code-block:: typescript

   import { useMutation, useQueryClient } from "@tanstack/react-query";
   import { apiRequest } from "@/lib/queryClient";

   const processQuoteMutation = useMutation({
     mutationFn: async (quoteId: number) => {
       const response = await apiRequest(
         'POST', 
         `/api/sales/quotes/${quoteId}/process`
       );
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to process quote');
       }
       return response.json();
     },
     onSuccess: async () => {
       // Clear draft quote after successful processing
       await clearDraftQuoteMutation.mutateAsync();
       
       // Invalidate related queries
       queryClient.invalidateQueries({ queryKey: ["/api/sales/quotes"] });
       queryClient.invalidateQueries({ queryKey: ["/api/items"] });
       
       toast({
         title: "Quote Processed",
         description: "The quote has been processed and converted to a sale.",
       });
     },
     onError: (error: Error) => {
       // Display error message from backend
       toast({
         title: "Cannot Process Quote",
         description: error.message,
         variant: "destructive",
       });
     },
   });

**Node.js/Express Example - Creating a Draft Quote:**

.. code-block:: javascript

   app.post('/api/sales/quotes', requireAuth, async (req, res) => {
     try {
       const { chargeCode, items, sessionId, vatApplied = true } = req.body;
       const currentUserId = getCurrentUserId(req);

       // Validate charge code
       const chargeCodeRecord = await storage.getChargeCode(chargeCode);
       if (!chargeCodeRecord) {
         return res.status(400).json({ 
           message: `Invalid charge code: '${chargeCode}' does not exist` 
         });
       }

       // Create or update draft quote
       const quote = await storage.createOrUpdateDraftQuote({
         sessionId,
         chargeCode,
         items,
         vatApplied,
         createdBy: currentUserId
       });

       res.json({
         message: "Draft quote saved successfully",
         quote
       });
     } catch (error) {
       console.error("Error creating draft quote:", error);
       res.status(500).json({ message: "Failed to create draft quote" });
     }
   });

See Also
--------

* :doc:`/user-guide/sales-quotes` - User guide for sales and quotes
* :doc:`/api/endpoints` - Complete API reference
* :doc:`/development/testing` - Testing strategies for sales endpoints
* :doc:`/deployment/monitoring` - Monitoring sales and quote processing
