Model Context Protocol (MCP) Integration
========================================

The LUStores system is designed with Model Context Protocol (MCP) integration capabilities, enabling AI assistants and automation tools to interact with the system programmatically.

Overview
--------

MCP integration provides:

- Structured API endpoints for AI interaction
- Standardized data formats
- System management capabilities
- Testing and validation automation
- Real-time status monitoring

MCP Server Endpoints
--------------------

System Status
~~~~~~~~~~~~~

**Endpoint**: ``GET /api/mcp/status``

Provides comprehensive system status information for MCP clients.

**Response**:

.. code-block:: json

   {
     "system": {
       "status": "healthy",
       "version": "1.0.0",
       "uptime": 3600,
       "environment": "production"
     },
     "database": {
       "connected": true,
       "latency": 15
     },
     "tests": {
       "total": 66,
       "passed": 65,
       "failed": 1,
       "last_run": "2025-06-09T10:30:00Z"
     },
     "resources": {
       "memory_usage": "45%",
       "cpu_usage": "12%",
       "disk_usage": "67%"
     }
   }

Test Execution
~~~~~~~~~~~~~~

**Endpoint**: ``POST /api/mcp/test``

Allows MCP clients to trigger test execution with various parameters.

**Request Body**:

.. code-block:: json

   {
     "test_type": "unit|integration|e2e|sales|system",
     "options": {
       "coverage": true,
       "reporter": "json",
       "timeout": 300000
     }
   }

**Response**:

.. code-block:: json

   {
     "execution_id": "test_12345",
     "status": "running",
     "started_at": "2025-06-09T10:35:00Z",
     "estimated_duration": 180
   }

Test Results
~~~~~~~~~~~~

**Endpoint**: ``GET /api/mcp/test/{execution_id}``

Retrieves test execution results.

**Response**:

.. code-block:: json

   {
     "execution_id": "test_12345",
     "status": "completed",
     "results": {
       "total_tests": 66,
       "passed": 66,
       "failed": 0,
       "duration": 175,
       "coverage": {
         "lines": 85.2,
         "functions": 90.1,
         "branches": 78.5
       }
     },
     "completed_at": "2025-06-09T10:38:00Z"
   }

Data Operations
~~~~~~~~~~~~~~~

**Sales Data**: ``GET /api/mcp/sales``

Retrieve sales data in MCP-compatible format:

.. code-block:: json

   {
     "sales": [
       {
         "id": "sale_12345",
         "charge_code": "DEPT001",
         "total": 150.00,
         "items": 3,
         "timestamp": "2025-06-09T09:15:00Z"
       }
     ],
     "pagination": {
       "total": 1250,
       "page": 1,
       "limit": 50
     }
   }

**Inventory Data**: ``GET /api/mcp/inventory``

Retrieve inventory information:

.. code-block:: json

   {
     "items": [
       {
         "id": "item_001",
         "name": "Product Name",
         "category": "Electronics",
         "stock": 25,
         "price": 49.99
       }
     ],
     "categories": ["Electronics", "Books", "Supplies"]
   }

MCP Client Integration
----------------------

Configuration
~~~~~~~~~~~~~

MCP clients should configure the following settings:

.. code-block:: json

   {
     "server_url": "https://lustores.example.com",
     "api_version": "v1",
     "authentication": {
       "type": "bearer",
       "token": "your_mcp_api_key"
     },
     "timeout": 30000,
     "retry_attempts": 3
   }

Client Libraries
~~~~~~~~~~~~~~~~

The system supports standard MCP client libraries:

**Python Example**:

.. code-block:: python

   import mcp_client
   
   client = mcp_client.MCPClient(
       server_url="https://lustores.example.com",
       api_key="your_api_key"
   )
   
   # Get system status
   status = client.get_status()
   
   # Run tests
   test_result = client.run_tests("unit")
   
   # Retrieve sales data
   sales = client.get_sales(limit=100)

**JavaScript Example**:

.. code-block:: javascript

   const { MCPClient } = require('@modelcontextprotocol/client');
   
   const client = new MCPClient({
     serverUrl: 'https://lustores.example.com',
     apiKey: 'your_api_key'
   });
   
   // Get system status
   const status = await client.getStatus();
   
   // Run tests
   const testResult = await client.runTests('integration');
   
   // Retrieve inventory data
   const inventory = await client.getInventory();

Automation Capabilities
-----------------------

CI/CD Integration
~~~~~~~~~~~~~~~~~

MCP endpoints can be integrated into CI/CD pipelines:

.. code-block:: yaml

   # GitHub Actions example
   - name: Run LUStores Tests via MCP
     run: |
       curl -X POST "https://lustores.example.com/api/mcp/test" \
         -H "Authorization: Bearer ${{ secrets.MCP_API_KEY }}" \
         -H "Content-Type: application/json" \
         -d '{"test_type": "e2e", "options": {"coverage": true}}'

Monitoring Integration
~~~~~~~~~~~~~~~~~~~~~~

System monitoring tools can use MCP endpoints for health checks:

.. code-block:: bash

   # Nagios/Icinga check example
   #!/bin/bash
   response=$(curl -s "https://lustores.example.com/api/mcp/status" \
     -H "Authorization: Bearer $API_KEY")
   
   status=$(echo $response | jq -r '.system.status')
   if [ "$status" = "healthy" ]; then
     echo "OK - System is healthy"
     exit 0
   else
     echo "CRITICAL - System status: $status"
     exit 2
   fi

AI Assistant Integration
------------------------

The MCP integration enables AI assistants to:

1. **Monitor System Health**: Real-time status checking
2. **Execute Tests**: Automated testing on demand
3. **Analyze Data**: Sales and inventory analysis
4. **Generate Reports**: Automated reporting
5. **Troubleshoot Issues**: System diagnostics

Example AI Assistant Commands:

- "Check the system status"
- "Run the test suite"
- "Show me today's sales data"
- "What's the current inventory level?"
- "Generate a system health report"

Security and Authentication
---------------------------

MCP endpoints use dedicated API key authentication:

.. code-block:: text

   Authorization: Bearer mcp_key_your_secret_key

API keys are scoped specifically for MCP operations and have appropriate rate limiting.

Rate Limiting
~~~~~~~~~~~~~

MCP endpoints have the following rate limits:

- Status endpoints: 60 requests/minute
- Test execution: 10 requests/hour
- Data retrieval: 100 requests/minute

Error Handling
--------------

MCP endpoints return standardized error responses:

.. code-block:: json

   {
     "error": {
       "code": "MCP_AUTH_REQUIRED",
       "message": "MCP API key required",
       "timestamp": "2025-06-09T10:40:00Z"
     }
   }

Common error codes:

- ``MCP_AUTH_REQUIRED``: Authentication required
- ``MCP_RATE_LIMITED``: Rate limit exceeded
- ``MCP_TEST_RUNNING``: Test already in progress
- ``MCP_INVALID_REQUEST``: Invalid request format

Testing MCP Integration
-----------------------

The test suite includes MCP-specific tests:

- API endpoint validation
- Authentication testing
- Data format verification
- Error handling scenarios
- Performance testing

See the :doc:`../testing-guide` for comprehensive MCP testing documentation.

.. note::
   MCP integration is designed to work seamlessly with the existing System Management API, providing a standardized interface for AI assistants and automation tools.