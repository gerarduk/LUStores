Authentication API
==================

The LUStores system supports multiple authentication methods to provide secure access to the application and its APIs.

Overview
--------

The authentication system is designed to be flexible and secure, supporting:

- Local username/password authentication
- University Single Sign-On (SSO)
- SAML-based authentication
- Session management
- API key authentication for system endpoints

Authentication Methods
----------------------

Local Authentication
~~~~~~~~~~~~~~~~~~~~

**Endpoint**: ``POST /api/auth/login``

Basic username and password authentication for local users.

**Request Body**:

.. code-block:: json

   {
     "username": "string",
     "password": "string"
   }

**Response**:

.. code-block:: json

   {
     "success": true,
     "user": {
       "id": "string",
       "username": "string",
       "role": "string"
     },
     "session": {
       "token": "string",
       "expires": "ISO8601 datetime"
     }
   }

University SSO
~~~~~~~~~~~~~~

**Endpoint**: ``GET /api/auth/university``

Redirects to university SSO provider for authentication.

**Query Parameters**:

- ``return_url`` (optional): URL to redirect after successful authentication

**Response**: HTTP redirect to SSO provider

SAML Authentication
~~~~~~~~~~~~~~~~~~~

**Endpoint**: ``POST /api/auth/saml``

SAML-based authentication for enterprise integration.

**Request**: SAML assertion (XML)

**Response**: Session token and user information

Session Management
------------------

Logout
~~~~~~

**Endpoint**: ``POST /api/auth/logout``

Invalidates the current session.

**Headers**:

- ``Authorization: Bearer <session_token>``

**Response**:

.. code-block:: json

   {
     "success": true,
     "message": "Logged out successfully"
   }

Session Validation
~~~~~~~~~~~~~~~~~~

**Endpoint**: ``GET /api/auth/validate``

Validates the current session and returns user information.

**Headers**:

- ``Authorization: Bearer <session_token>``

**Response**:

.. code-block:: json

   {
     "valid": true,
     "user": {
       "id": "string",
       "username": "string",
       "role": "string"
     },
     "expires": "ISO8601 datetime"
   }

API Key Authentication
----------------------

For system management endpoints, API key authentication is used.

**Header Format**:

.. code-block:: text

   Authorization: Bearer <api_key>

**Scope**: System management endpoints (``/api/system/*``)

Configuration
-------------

Authentication configuration is managed through environment variables:

.. code-block:: bash

   # Local authentication
   LOCAL_AUTH_ENABLED=true
   
   # University SSO
   UNIVERSITY_SSO_ENABLED=true
   UNIVERSITY_SSO_URL=https://sso.university.edu
   UNIVERSITY_SSO_CLIENT_ID=your_client_id
   
   # SAML
   SAML_ENABLED=true
   SAML_IDP_URL=https://idp.example.com
   SAML_CERT_PATH=/path/to/certificate
   
   # Session configuration
   SESSION_SECRET=your_session_secret
   SESSION_TIMEOUT=3600

Security Considerations
-----------------------

- All authentication endpoints use HTTPS in production
- Sessions are stored securely with expiration
- API keys are generated with sufficient entropy
- Authentication attempts are rate-limited
- Failed authentication attempts are logged

Error Responses
---------------

Authentication errors return appropriate HTTP status codes:

**401 Unauthorized**:

.. code-block:: json

   {
     "error": "Authentication required",
     "code": "AUTH_REQUIRED"
   }

**403 Forbidden**:

.. code-block:: json

   {
     "error": "Access denied",
     "code": "ACCESS_DENIED"
   }

**429 Too Many Requests**:

.. code-block:: json

   {
     "error": "Too many authentication attempts",
     "code": "RATE_LIMITED"
   }

Testing Authentication
----------------------

The test suite includes comprehensive authentication testing:

- Local login/logout flows
- Session validation
- API key authentication
- Error handling scenarios
- Security validation

See the :doc:`../testing-guide` for details on authentication testing.

.. note::
   The System Management API requires special authentication and is used for administrative functions including test execution and system monitoring.