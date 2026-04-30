Installation Guide
==================

This guide will walk you through installing and setting up the University Inventory Management System.

Prerequisites
-------------

Before installing the system, ensure you have the following prerequisites:

System Requirements
~~~~~~~~~~~~~~~~~~~

**Software Requirements:**
- Node.js 20.0.0 or higher
- npm 10.0.0 or higher
- PostgreSQL 15.0 or higher
- Git (for version control)

**Hardware Requirements:**
- Minimum 2GB RAM (4GB recommended)
- 10GB free disk space (50GB recommended for production)
- Network connectivity for authentication services

**Operating System:**
- Linux (Ubuntu 20.04+ recommended)
- macOS 10.15+
- Windows 10/11 with WSL2

Installation Methods
--------------------

There are three primary methods to install the system:

Method 1: Docker Installation (Recommended)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Docker installation is the easiest and most reliable method for both development and production environments.

**Step 1: Install Docker**

.. code-block:: bash

   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker

**Step 2: Clone the Repository**

.. code-block:: bash

   git clone <repository-url>
   cd university-inventory-system

**Step 3: Configure Environment**

.. code-block:: bash

   # Copy environment template
   cp docker-compose.yml docker-compose.production.yml

   # Edit configuration (see Configuration section)
   nano docker-compose.production.yml

**Step 4: Start Services**

.. code-block:: bash

   # Production deployment
   docker-compose -f docker-compose.production.yml up -d

   # Development environment
   docker-compose up -d

**Step 5: Initialize Database**

.. code-block:: bash

   # Run database migrations
   docker-compose exec app npm run db:push

Method 2: Manual Installation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For development or custom deployments, you can install manually.

**Step 1: Install Node.js**

.. code-block:: bash

   # Using Node Version Manager (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20

**Step 2: Install PostgreSQL**

.. code-block:: bash

   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # Start PostgreSQL service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql

**Step 3: Setup Database**

.. code-block:: bash

   # Switch to postgres user
   sudo -u postgres psql

   # Create database and user
   CREATE DATABASE university_inventory;
   CREATE USER inventory_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE university_inventory TO inventory_user;
   \q

**Step 4: Clone and Install**

.. code-block:: bash

   # Clone repository
   git clone <repository-url>
   cd university-inventory-system

   # Install dependencies
   npm install

**Step 5: Configure Environment**

.. code-block:: bash

   # Create environment file
   cp .env.example .env

   # Edit configuration
   nano .env

**Step 6: Run Database Migrations**

.. code-block:: bash

   npm run db:push

**Step 7: Build and Start**

.. code-block:: bash

   # Build application
   npm run build

   # Start production server
   npm run start

   # Or start development server
   npm run dev

Method 3: Cloud Deployment
~~~~~~~~~~~~~~~~~~~~~~~~~~

For cloud deployments, the system can be deployed on various platforms:

**Replit Deployment**

The system is already configured for Replit deployment with the existing workflow.

**AWS/Azure/GCP**

Use the Docker images with container services like:
- AWS ECS/Fargate
- Azure Container Instances
- Google Cloud Run

Configuration
-------------

Environment Variables
~~~~~~~~~~~~~~~~~~~~~

Configure the following environment variables:

.. code-block:: bash

   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/university_inventory
   PGHOST=localhost
   PGPORT=5432
   PGUSER=inventory_user
   PGPASSWORD=secure_password
   PGDATABASE=university_inventory

   # Application Configuration
   NODE_ENV=production
   SESSION_SECRET=your-super-secure-session-secret-here

   # Authentication Configuration
   REPL_ID=your-replit-application-id
   REPLIT_DOMAINS=yourdomain.com,www.yourdomain.com
   ISSUER_URL=https://replit.com/oidc

   # Optional: Redis Configuration (for session caching)
   REDIS_URL=redis://localhost:6379

Security Configuration
~~~~~~~~~~~~~~~~~~~~~~

**Session Secret**

Generate a secure session secret:

.. code-block:: bash

   # Generate a random 64-character string
   openssl rand -hex 32

**Database Security**

1. Use strong passwords for database users
2. Restrict database access to application servers only
3. Enable SSL connections for production
4. Regular database backups

**Application Security**

1. Use HTTPS in production
2. Configure proper CORS settings
3. Set secure cookie options
4. Regular security updates

Verification
------------

After installation, verify the system is working correctly:

**Step 1: Check Services**

.. code-block:: bash

   # Docker installation
   docker-compose ps

   # Manual installation
   netstat -tlnp | grep :5000

**Step 2: Access Application**

Open your web browser and navigate to:
- Local development: http://localhost:5000
- Production: https://yourdomain.com

**Step 3: Test API**

.. code-block:: bash

   # Test API documentation endpoint
   curl http://localhost:5000/api/docs

**Step 4: Test Database Connection**

.. code-block:: bash

   # Docker installation
   docker-compose exec app npm run db:check

   # Manual installation
   npm run db:check

Troubleshooting
---------------

Common Installation Issues
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Port Already in Use**

.. code-block:: bash

   # Find process using port 5000
   sudo lsof -i :5000

   # Kill the process
   sudo kill -9 <PID>

**Database Connection Error**

1. Verify PostgreSQL is running
2. Check database credentials
3. Ensure database exists
4. Test connection manually

**Node.js Version Issues**

.. code-block:: bash

   # Check current version
   node --version

   # Install correct version
   nvm install 20
   nvm use 20

**Permission Issues**

.. code-block:: bash

   # Fix file permissions
   sudo chown -R $USER:$USER .

   # Docker permission issues
   sudo usermod -aG docker $USER

Next Steps
----------

After successful installation:

1. :doc:`quickstart` - Quick start guide
2. :doc:`configuration` - Detailed configuration options
3. :doc:`user-guide/dashboard` - User interface guide
4. :doc:`admin/user-management` - Admin configuration

Support
-------

If you encounter issues during installation:

1. Check the :doc:`reference/troubleshooting` guide
2. Review system logs for error messages
3. Contact technical support with specific error details
4. Provide system information and installation method used