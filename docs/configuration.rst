Configuration Guide
===================

This guide covers all configuration options for the University Inventory Management System, including environment variables, database settings, and deployment configurations.

Environment Configuration
-------------------------

The system uses environment variables for configuration. These can be set in various ways depending on your deployment method.

Core Application Settings
~~~~~~~~~~~~~~~~~~~~~~~~~

**NODE_ENV**
   - **Description**: Application environment mode
   - **Values**: `development`, `production`, `test`
   - **Default**: `production`
   - **Example**: `NODE_ENV=production`

**PORT**
   - **Description**: Port number for the application server
   - **Default**: `5000`
   - **Example**: `PORT=3000`

Database Configuration
~~~~~~~~~~~~~~~~~~~~~~

**DATABASE_URL**
   - **Description**: Complete PostgreSQL connection string
   - **Required**: Yes
   - **Format**: `postgresql://user:password@host:port/database`
   - **Example**: `DATABASE_URL=postgresql://inventory_user:secure_pass@localhost:5432/university_inventory`

**Individual Database Settings** (Alternative to DATABASE_URL):

**PGHOST**
   - **Description**: PostgreSQL server hostname
   - **Default**: `localhost`
   - **Example**: `PGHOST=db.university.edu`

**PGPORT**
   - **Description**: PostgreSQL server port
   - **Default**: `5432`
   - **Example**: `PGPORT=5432`

**PGUSER**
   - **Description**: PostgreSQL username
   - **Required**: Yes
   - **Example**: `PGUSER=inventory_user`

**PGPASSWORD**
   - **Description**: PostgreSQL password
   - **Required**: Yes
   - **Example**: `PGPASSWORD=secure_password_123`

**PGDATABASE**
   - **Description**: PostgreSQL database name
   - **Required**: Yes
   - **Example**: `PGDATABASE=university_inventory`

Authentication Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**SESSION_SECRET**
   - **Description**: Secret key for session encryption
   - **Required**: Yes
   - **Security**: Must be a strong, random string
   - **Generation**: `openssl rand -hex 32`
   - **Example**: `SESSION_SECRET=abc123def456...`

**REPL_ID**
   - **Description**: Replit application identifier for OAuth
   - **Required**: Yes (for Replit authentication)
   - **Example**: `REPL_ID=your-repl-application-id`

**REPLIT_DOMAINS**
   - **Description**: Comma-separated list of allowed domains
   - **Required**: Yes
   - **Example**: `REPLIT_DOMAINS=yourdomain.com,www.yourdomain.com,localhost:5000`

**ISSUER_URL**
   - **Description**: OAuth issuer URL
   - **Default**: `https://replit.com/oidc`
   - **Example**: `ISSUER_URL=https://auth.university.edu/oidc`

Optional Configuration
~~~~~~~~~~~~~~~~~~~~~~

**REDIS_URL**
   - **Description**: Redis connection string for session caching
   - **Optional**: Yes (falls back to PostgreSQL sessions)
   - **Example**: `REDIS_URL=redis://localhost:6379`

**LOG_LEVEL**
   - **Description**: Application logging level
   - **Values**: `error`, `warn`, `info`, `debug`
   - **Default**: `info`
   - **Example**: `LOG_LEVEL=debug`

Configuration Methods
---------------------

Environment File (.env)
~~~~~~~~~~~~~~~~~~~~~~~

For development and testing, create a `.env` file in the project root:

.. code-block:: bash

   # Database Configuration
   DATABASE_URL=postgresql://inventory_user:password@localhost:5432/university_inventory
   
   # Application Settings
   NODE_ENV=development
   PORT=5000
   
   # Session Security
   SESSION_SECRET=your-super-secure-session-secret-here
   
   # Authentication
   REPL_ID=your-repl-id
   REPLIT_DOMAINS=localhost:5000,127.0.0.1:5000
   ISSUER_URL=https://replit.com/oidc

Docker Environment
~~~~~~~~~~~~~~~~~~

For Docker deployments, configure environment variables in `docker-compose.yml`:

.. code-block:: yaml

   services:
     app:
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://postgres:password@db:5432/university_inventory
         - SESSION_SECRET=your-secure-session-secret
         - REPL_ID=your-repl-id
         - REPLIT_DOMAINS=yourdomain.com

System Environment
~~~~~~~~~~~~~~~~~~

For production deployments, set environment variables at the system level:

.. code-block:: bash

   # Linux/macOS
   export DATABASE_URL="postgresql://user:pass@host:5432/db"
   export SESSION_SECRET="your-secret"
   
   # Or add to ~/.bashrc for persistence
   echo 'export DATABASE_URL="postgresql://..."' >> ~/.bashrc

Database Configuration
----------------------

PostgreSQL Setup
~~~~~~~~~~~~~~~~

**Database Creation:**

.. code-block:: sql

   -- Create database
   CREATE DATABASE university_inventory;
   
   -- Create user with appropriate permissions
   CREATE USER inventory_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE university_inventory TO inventory_user;

.. code-block:: sql

   -- Connect to the database and grant schema permissions
   GRANT ALL ON SCHEMA public TO inventory_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO inventory_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO inventory_user;

**Connection Pool Settings:**

The application uses connection pooling for optimal database performance:

.. code-block:: javascript

   // Automatic configuration based on DATABASE_URL
   {
     max: 20,          // Maximum connections
     min: 0,           // Minimum connections
     acquire: 30000,   // Connection timeout (ms)
     idle: 10000       // Idle timeout (ms)
   }

**SSL Configuration:**

For production databases, enable SSL:

.. code-block:: bash

   DATABASE_URL=postgresql://user:pass@host:5432/db?ssl=true&sslmode=require

Session Storage
~~~~~~~~~~~~~~~

**PostgreSQL Sessions (Default):**

Sessions are stored in PostgreSQL by default using the `sessions` table:

.. code-block:: sql

   CREATE TABLE sessions (
     sid varchar NOT NULL COLLATE "default",
     sess json NOT NULL,
     expire timestamp(6) NOT NULL
   );

**Redis Sessions (Optional):**

For better performance with high user loads, configure Redis:

.. code-block:: bash

   REDIS_URL=redis://localhost:6379

Security Configuration
----------------------

Session Security
~~~~~~~~~~~~~~~~

**Secure Cookie Settings:**

The application automatically configures secure cookies based on environment:

.. code-block:: javascript

   // Production settings
   {
     httpOnly: true,      // Prevent XSS attacks
     secure: true,        // HTTPS only
     maxAge: 604800000,   // 1 week
     sameSite: 'strict'   // CSRF protection
   }

**Session Secret Requirements:**

- Minimum 32 characters
- Random and unpredictable
- Different for each environment
- Regularly rotated in production

Authentication Security
~~~~~~~~~~~~~~~~~~~~~~~

**OAuth Configuration:**

Ensure proper OAuth settings:

.. code-block:: bash

   # Use university domain for production
   REPLIT_DOMAINS=inventory.university.edu
   
   # Multiple domains for development
   REPLIT_DOMAINS=localhost:5000,127.0.0.1:5000,dev.university.edu

**HTTPS Requirements:**

For production deployments:

- Use HTTPS for all traffic
- Configure SSL certificates
- Set secure cookie flags
- Enable HSTS headers

Application Configuration
-------------------------

Default Categories
~~~~~~~~~~~~~~~~~~

The system initializes with default categories on first startup:

.. code-block:: javascript

   [
     {
       name: "IT Equipment",
       description: "Computers, laptops, and technology devices",
       icon: "fas fa-laptop",
       color: "blue"
     },
     {
       name: "Office Supplies", 
       description: "Pens, paper, and general office materials",
       icon: "fas fa-paperclip",
       color: "green"
     },
     // ... additional default categories
   ]

User Roles
~~~~~~~~~~

Default user role configuration:

.. code-block:: javascript

   {
     defaultRole: "user",    // New users get this role
     roles: {
       user: ["read"],
       manager: ["read", "write"],
       admin: ["read", "write", "admin"]
     }
   }

Logging Configuration
~~~~~~~~~~~~~~~~~~~~~

**Log Levels:**

- **error**: Critical errors only
- **warn**: Warnings and errors
- **info**: General information (default)
- **debug**: Detailed debugging information

**Production Logging:**

.. code-block:: bash

   LOG_LEVEL=warn
   LOG_FORMAT=json
   LOG_OUTPUT=file

Deployment-Specific Configuration
---------------------------------

Development Environment
~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   NODE_ENV=development
   LOG_LEVEL=debug
   DATABASE_URL=postgresql://postgres:password@localhost:5432/inventory_dev
   REPLIT_DOMAINS=localhost:5000,127.0.0.1:5000

Production Environment
~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   NODE_ENV=production
   LOG_LEVEL=warn
   DATABASE_URL=postgresql://inventory_user:secure_pass@db.university.edu:5432/university_inventory
   REPLIT_DOMAINS=inventory.university.edu
   SESSION_SECRET=very-secure-random-string-for-production

Docker Production
~~~~~~~~~~~~~~~~~

.. code-block:: yaml

   version: '3.8'
   services:
     app:
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/university_inventory
         - SESSION_SECRET=${SESSION_SECRET}
         - REPL_ID=${REPL_ID}
         - REPLIT_DOMAINS=${DOMAIN_NAME}
       restart: unless-stopped

Configuration Validation
------------------------

The application validates configuration on startup:

**Required Variables Check:**

.. code-block:: bash

   # Run configuration check
   npm run config:check

**Database Connection Test:**

.. code-block:: bash

   # Test database connectivity
   npm run db:test

**Authentication Test:**

.. code-block:: bash

   # Verify OAuth configuration
   npm run auth:test

Troubleshooting Configuration
-----------------------------

Common Issues
~~~~~~~~~~~~~

**Database Connection Errors:**

1. Verify DATABASE_URL format
2. Check database server accessibility
3. Confirm user permissions
4. Test manual connection

**Authentication Issues:**

1. Verify REPL_ID and domain configuration
2. Check OAuth callback URLs
3. Confirm SESSION_SECRET is set
4. Test authentication flow

**Permission Errors:**

1. Check file system permissions
2. Verify environment variable access
3. Confirm database user privileges

Configuration Best Practices
----------------------------

Security
~~~~~~~~

1. **Never commit secrets to version control**
2. **Use different secrets for each environment**
3. **Regularly rotate session secrets**
4. **Enable SSL/TLS in production**
5. **Restrict database access by IP**

Performance
~~~~~~~~~~~

1. **Use Redis for session storage in production**
2. **Configure appropriate connection pools**
3. **Enable database query optimization**
4. **Set proper cache headers**

Monitoring
~~~~~~~~~~

1. **Configure application logging**
2. **Set up health checks**
3. **Monitor database performance**
4. **Track authentication metrics**

For additional configuration support, consult the deployment guides or contact your system administrator.