==================================
Docker Architecture & Deployment
==================================

System Overview
===============

This document describes the Docker container architecture for LUStores running on a VM host, including volume mappings, networking, and data persistence strategies.

Architecture Diagram
====================

.. mermaid::

   graph TB
       subgraph "Host VM"
           subgraph "Docker Network: lustores_network<br/>172.20.0.0/16"
               subgraph "Web Layer"
                   NGINX[nginx:alpine<br/>:80, :443<br/>SSL Termination]
               end

               subgraph "Application Layer"
                   APP[LUStores App<br/>st7ma784/lustores:latest<br/>:5000]
                   AUTH[Replit Auth<br/>st7ma784/replitauth:latest<br/>:3001]
               end

               subgraph "Data Layer"
                   DB[(PostgreSQL 15<br/>:5432<br/>university_inventory)]
                   REDIS[(Redis 7<br/>:6379<br/>Session Store)]
               end

               subgraph "Support Services"
                   CERTBOT[Certbot<br/>SSL Renewal]
                   WATCHTOWER[Watchtower<br/>Auto-updates]
               end
           end

           subgraph "Host Volumes"
               DBVOL[/db<br/>PostgreSQL Data]
               REDISVOL[redis_data<br/>Redis Data]
               LOGS[./logs<br/>Application Logs]
               CERTBOT_CONF[./certbot/conf<br/>SSL Certificates]
               CERTBOT_WWW[./certbot/www<br/>ACME Challenge]
               NGINX_CONF[./nginx<br/>Config Files]
               ENV[.env.prod<br/>Environment Config]
           end
       end

       subgraph "External"
           INTERNET((Internet<br/>Users))
           DOCKERHUB((Docker Hub<br/>Image Registry))
           LETSENCRYPT((Let's Encrypt<br/>Certificate Authority))
       end

       INTERNET -->|HTTPS :443| NGINX
       INTERNET -->|HTTP :80| NGINX
       NGINX -->|proxy_pass| APP
       APP -->|health checks| NGINX
       APP --> DB
       APP --> REDIS
       APP --> AUTH
       CERTBOT -->|cert renewal| LETSENCRYPT
       CERTBOT --> CERTBOT_CONF
       CERTBOT --> CERTBOT_WWW
       NGINX --> CERTBOT_CONF
       NGINX --> NGINX_CONF
       NGINX --> LOGS
       DB --> DBVOL
       REDIS --> REDISVOL
       APP --> LOGS
       WATCHTOWER -->|monitors| APP
       WATCHTOWER -->|monitors| AUTH
       WATCHTOWER -->|pulls updates| DOCKERHUB

Container Details
=================

nginx - Reverse Proxy & SSL Termination
----------------------------------------

- **Image**: ``nginx:alpine``
- **Ports**:

  - ``80:80`` - HTTP (redirects to HTTPS)
  - ``443:443`` - HTTPS

- **Volumes**:

  - ``./nginx/nginx.conf.template:/etc/nginx/templates/default.conf.template:ro``
  - ``./certbot/conf:/etc/letsencrypt:ro`` - SSL certificates
  - ``./certbot/www:/var/www/certbot:ro`` - ACME challenges
  - ``./logs/nginx:/var/log/nginx`` - Access & error logs

- **Health Check**: ``nc -z 127.0.0.1 80`` every 30s
- **Restart Policy**: ``unless-stopped``

app - Main LUStores Application
--------------------------------

- **Image**: ``st7ma784/lustores:latest``
- **Internal Port**: ``5000`` (not exposed externally)
- **Environment**:

  - ``NODE_ENV=production``
  - ``DATABASE_URL`` - PostgreSQL connection
  - ``SESSION_SECRET``, ``JWT_SECRET`` - Security keys
  - ``DOMAIN``, ``EMAIL`` - Deployment config

- **Depends On**: ``db`` (healthy), ``replit-auth`` (healthy)
- **Volumes**: ``./logs:/app/logs`` - Application logs
- **Health Check**: ``wget --spider http://127.0.0.1:5000/health`` every 30s
- **Restart Policy**: ``unless-stopped``
- **Labels**: ``com.centurylinklabs.watchtower.enable=true`` - Auto-update enabled

db - PostgreSQL Database
-------------------------

.. warning::
   The database volume is mounted at ``/db`` on the host - this is CRITICAL for backups!

- **Image**: ``postgres:15-alpine``
- **Port**: ``5432:5432``
- **Database**: ``university_inventory``
- **Volumes**:

  - ``/db:/var/lib/postgresql/data`` - **CRITICAL**: Host volume at ``/db``
  - ``./init.sql:/docker-entrypoint-initdb.d/init.sql`` - Schema initialization

- **Environment**:

  - ``POSTGRES_DB=university_inventory``
  - ``POSTGRES_USER=postgres``
  - ``POSTGRES_PASSWORD=${DB_PASSWORD}``
  - ``PGDATA=/var/lib/postgresql/data/pgdata``

- **Health Check**: ``pg_isready -U postgres -d university_inventory`` every 10s
- **Restart Policy**: ``unless-stopped``

redis - Session Store & Cache
------------------------------

- **Image**: ``redis:7-alpine``
- **Port**: ``6379:6379``
- **Volumes**: ``redis_data:/data`` - Named Docker volume
- **Command**: ``redis-server --appendonly yes`` - AOF persistence enabled
- **Restart Policy**: ``unless-stopped``

replit-auth - Authentication Service
-------------------------------------

- **Image**: ``st7ma784/replitauth:latest``
- **Port**: ``3001:3001``
- **Environment**:

  - ``PORT=3001``
  - ``JWT_SECRET=${JWT_SECRET}``
  - ``ALLOWED_ORIGINS=https://${DOMAIN}``

- **Health Check**: ``wget --spider http://127.0.0.1:3001/health`` every 30s
- **Restart Policy**: ``unless-stopped``
- **Labels**: Watchtower enabled with graceful shutdown (``SIGTERM``)

certbot - SSL Certificate Management
-------------------------------------

- **Image**: ``certbot/certbot``
- **Volumes**:

  - ``./certbot/conf:/etc/letsencrypt`` - Certificate storage
  - ``./certbot/www:/var/www/certbot`` - ACME challenge directory
  - ``./logs/certbot:/var/log/certbot`` - Renewal logs

- **Environment**:

  - ``DOMAIN=${DOMAIN}`` - Your domain name
  - ``EMAIL=${EMAIL}`` - Admin email for notifications
  - ``CERTBOT_STAGING`` - Use staging server for testing

- **Function**: Automatically renews certificates every 12 hours
- **Restart Policy**: ``unless-stopped``

watchtower - Automatic Container Updates
-----------------------------------------

- **Image**: ``containrrr/watchtower:latest``
- **Volumes**: ``/var/run/docker.sock:/var/run/docker.sock`` - Docker API access
- **Environment**:

  - ``WATCHTOWER_CLEANUP=true`` - Remove old images
  - ``WATCHTOWER_SCHEDULE=0 */15 * * * *`` - Check every 15 minutes
  - ``WATCHTOWER_LABEL_ENABLE=true`` - Only update labeled containers
  - ``WATCHTOWER_NOTIFICATION_WEBHOOK_URL`` - Notifications to app

- **Restart Policy**: ``unless-stopped``
- **Labels**: ``watchtower.enable=false`` - Don't update itself

Network Configuration
======================

**Network**: ``lustores_network``

- **Driver**: ``bridge``
- **Subnet**: ``172.20.0.0/16``
- **Purpose**: Isolated internal communication between containers

Service Discovery
-----------------

Docker DNS automatically resolves container names:

- ``http://app:5000`` - Application
- ``http://replit-auth:3001`` - Auth service
- ``postgresql://postgres:${DB_PASSWORD}@db:5432/university_inventory`` - Database

Volume Strategy
===============

Critical Data Volumes (MUST BACKUP)
------------------------------------

PostgreSQL Database - /db (Host Volume)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. danger::
   This is the MOST important data to backup!

- **Location**: ``/db`` on host VM
- **Contains**: All application data, users, inventory, orders, sales
- **Backup Strategy**: See :doc:`backup-restore`

Redis Data - redis_data (Docker Volume)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- **Type**: Named Docker volume
- **Contains**: Session data, cache
- **Backup Priority**: Medium (transient data)
- **Location**: Managed by Docker (typically ``/var/lib/docker/volumes/``)

Configuration Files (MUST BACKUP)
----------------------------------

SSL Certificates - ./certbot/conf
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- **Contains**: Let's Encrypt certificates and keys
- **Backup Priority**: High
- **Renewal**: Automatic via certbot, but backup recommended

Environment Configuration - .env.prod
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. danger::
   Store encrypted backup in secure location!

- **Contains**: All secrets, passwords, configuration
- **Backup Priority**: CRITICAL
- **Security**: Never commit to git, store encrypted

Nginx Configuration - ./nginx/
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- **Contains**: Web server configuration
- **Backup Priority**: Medium (can be recreated, but contains custom settings)

Port Mapping
============

.. list-table:: Port Configuration
   :header-rows: 1
   :widths: 20 15 15 15 35

   * - Service
     - Internal
     - External
     - Protocol
     - Purpose
   * - nginx
     - 80
     - 80
     - HTTP
     - Redirect to HTTPS
   * - nginx
     - 443
     - 443
     - HTTPS
     - Main access point
   * - app
     - 5000
     - (none)
     - HTTP
     - Internal only (via nginx)
   * - replit-auth
     - 3001
     - 3001
     - HTTP
     - Auth service
   * - db
     - 5432
     - 5432
     - PostgreSQL
     - Database (exposed for admin)
   * - redis
     - 6379
     - 6379
     - Redis
     - Cache (exposed for admin)

.. note::
   In production, consider closing external access to db:5432 and redis:6379 by removing port mappings from docker-compose.prod.yml

Data Flow
=========

.. mermaid::

   sequenceDiagram
       participant User
       participant nginx
       participant app
       participant auth as replit-auth
       participant db as PostgreSQL
       participant redis as Redis

       User->>nginx: HTTPS Request :443
       nginx->>nginx: Terminate SSL
       nginx->>app: HTTP Request :5000
       app->>auth: Validate Token :3001
       auth-->>app: Token Valid
       app->>db: Query Data :5432
       db-->>app: Return Results
       app->>redis: Cache Session :6379
       redis-->>app: Session Stored
       app-->>nginx: HTTP Response
       nginx-->>User: HTTPS Response

Health Monitoring
=================

All critical services have health checks:

.. list-table:: Health Check Configuration
   :header-rows: 1
   :widths: 15 30 10 10 10 15

   * - Service
     - Check Command
     - Interval
     - Timeout
     - Retries
     - Start Period
   * - nginx
     - ``nc -z 127.0.0.1 80``
     - 30s
     - 10s
     - 3
     - 30s
   * - app
     - ``wget --spider .../health``
     - 30s
     - 10s
     - 5
     - 60s
   * - db
     - ``pg_isready -U postgres``
     - 10s
     - 5s
     - 5
     - 30s
   * - replit-auth
     - ``wget --spider .../health``
     - 30s
     - 10s
     - 3
     - 30s

Monitoring Commands
-------------------

Check health status::

    docker compose -f docker-compose.prod.yml ps

View health logs::

    docker compose -f docker-compose.prod.yml logs -f app

Automatic Updates (Watchtower)
===============================

Watchtower monitors Docker Hub for new images and automatically updates:

- **app** (``st7ma784/lustores:latest``)
- **replit-auth** (``st7ma784/replitauth:latest``)

Update Process
--------------

1. Watchtower checks Docker Hub every 15 minutes
2. If new image found, pulls the update
3. Stops old container gracefully
4. Starts new container
5. Removes old image
6. Sends webhook notification to app

Manual Override
---------------

Disable watchtower temporarily::

    docker compose -f docker-compose.prod.yml stop watchtower

Update specific service manually::

    docker compose -f docker-compose.prod.yml pull app
    docker compose -f docker-compose.prod.yml up -d app

Security Considerations
=======================

1. **SSL/TLS**: All external traffic encrypted via Let's Encrypt certificates
2. **Internal Network**: Containers communicate via isolated Docker network
3. **Secrets**: Managed via ``.env.prod`` file (not committed to git)
4. **Updates**: Automatic security updates via Watchtower
5. **Health Checks**: Automatic restart on failures
6. **Firewall**: Only ports 80 and 443 should be publicly accessible

Troubleshooting
===============

See :doc:`qrh` (Quick Reference Handbook) for common issues and solutions.

Quick diagnostic commands::

    # Check all container status
    docker compose -f docker-compose.prod.yml ps

    # View logs for specific service
    docker compose -f docker-compose.prod.yml logs -f app

    # Restart specific service
    docker compose -f docker-compose.prod.yml restart app

    # Check disk space
    df -h /db

    # Check Docker volumes
    docker volume ls
    docker volume inspect lustores_redis_data

Related Documentation
=====================

- :doc:`qrh` - Quick Reference Handbook for operators
- :doc:`backup-restore` - Backup and restore procedures
- :doc:`/deployment/production` - Production deployment guide
- :doc:`/deployment/docker` - Docker setup guide
