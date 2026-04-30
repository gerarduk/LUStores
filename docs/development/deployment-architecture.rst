Deployment Architecture
======================

This guide provides comprehensive documentation for deploying and maintaining LUStores in production environments. It covers Docker containerization, GitHub Actions CI/CD pipelines, SSL/HTTPS configuration, and auto-update mechanisms.

.. contents:: Table of Contents
   :local:
   :depth: 2

Overview
--------

LUStores uses a modern containerized deployment architecture with:

- **Docker** for consistent, reproducible environments
- **GitHub Actions** for automated CI/CD
- **Nginx** for reverse proxy and SSL termination
- **PostgreSQL 15** for data persistence
- **Redis 7** for session storage and caching
- **Watchtower** for automated container updates
- **Let's Encrypt** for free SSL certificates

The system supports multiple deployment targets:

1. **Development**: Hot-reload enabled, debug tools, local auth
2. **Production**: Multi-container orchestration, SSL, auto-updates
3. **Kubernetes**: Scalable cluster deployment with load balancing

Docker Architecture
-------------------

Multi-Stage Dockerfile
~~~~~~~~~~~~~~~~~~~~~~

The Dockerfile uses a multi-stage build strategy for optimized images:

**Build Stages**:

1. ``deps`` (Node.js 24 Alpine)
   - Installs build dependencies (Python, Make, G++)
   - Copies package.json and runs ``npm install``
   - Creates base layer with node_modules

2. ``build`` (From deps)
   - Compiles TypeScript to JavaScript
   - Bundles frontend with Vite
   - Builds Sphinx documentation (optional with ``SKIP_DOCS=1``)
   - Optimizes for production

3. ``development`` (From deps)
   - Includes dev dependencies and source files
   - Enables hot-reload (Vite HMR)
   - Exposes ports 5000 (backend) and 5173 (frontend)
   - Command: ``npm run dev``

4. ``test`` (From deps)
   - Includes test frameworks (Jest, testing-library)
   - Sets ``NODE_ENV=test``
   - Command: ``npm run test``

5. ``e2e-test`` (Microsoft Playwright image)
   - Includes Playwright browsers (Chromium)
   - Adds Node.js 24 on top of Playwright base
   - Command: ``npm run test:e2e-comprehensive``

6. ``production`` (Node.js 24 Alpine)
   - **Minimal runtime image** (no build tools)
   - Includes only production dependencies
   - Copies built artifacts from ``build`` stage
   - Adds PostgreSQL client for database operations
   - Runs as non-root user ``appuser`` (UID 1001)
   - Health check: ``wget http://localhost:5000/health``
   - Command: ``npm run start``

**Key Optimizations**:

- Layer caching: Dependencies installed before source code
- Build args: ``SKIP_DOCS=1`` to skip Sphinx build
- Memory limits: ``NODE_OPTIONS="--max-old-space-size=2048"``
- Production image size: ~350MB (vs ~1.2GB with dev dependencies)

Development Environment
~~~~~~~~~~~~~~~~~~~~~~~

**File**: ``docker-compose.yml``

**Services**:

- **app** (development target)
  - Ports: 5000 (API), 5173 (Vite dev server)
  - Volumes: Source code mounted for hot-reload
  - Environment: ``NODE_ENV=development``, ``DEV_ADMIN_OVERRIDE=true``
  - Depends on: ``db``, ``replit-auth``

- **db** (PostgreSQL 15)
  - Port: 5432
  - Volume: ``postgres_data`` for persistence
  - Initialization: ``init.sql`` auto-executed on first start
  - Health check: ``pg_isready -U postgres``

- **redis** (Redis 7)
  - Port: 6379
  - Volume: ``redis_data`` for AOF persistence
  - Command: ``redis-server --appendonly yes``

- **replit-auth** (Local auth service)
  - Port: 3001
  - Mock authentication for development
  - Environment: ``JWT_SECRET=local-replit-jwt-secret``

**Test Services** (Profile: ``testing``):

- **test**: Runs unit tests with coverage
- **test-sales**: Runs sales module tests specifically
- **test-watch**: Interactive test watcher
- **test-coverage**: Generates coverage reports
- **test-integration**: Integration tests with live database
- **test-db**: Isolated PostgreSQL for testing (port 5433)

**Usage**:

.. code-block:: bash

   # Start development environment
   docker compose up -d

   # Run unit tests
   docker compose --profile testing run test

   # Watch mode for development
   docker compose --profile testing run test-watch

   # View logs
   docker compose logs -f app

   # Stop all services
   docker compose down

Production Environment
~~~~~~~~~~~~~~~~~~~~~~

**File**: ``docker-compose.prod.yml``

This file extends ``docker-compose.yml`` with production overrides:

**Additional Services**:

- **nginx** (Nginx Alpine)
  - Ports: 80 (HTTP), 443 (HTTPS)
  - Reverse proxy with SSL termination
  - Rate limiting: 10 req/s for API, 5 req/min for login
  - Config templates: Dynamic domain substitution
  - Volumes: SSL certificates, Nginx configs, logs
  - Health check: ``nc -z 127.0.0.1 80``
  - Startup script: ``nginx-startup.sh`` (handles SSL setup)

- **certbot** (Certbot for Let's Encrypt)
  - Auto-renewal: Checks every 12 hours
  - Volumes: Shared with Nginx for certificate storage
  - Environment: ``DOMAIN``, ``EMAIL``, ``CERTBOT_STAGING``
  - Restart policy: ``unless-stopped``

- **certbot-init** (One-time setup, profile: ``init``)
  - Obtains initial SSL certificate
  - Supports self-signed certificates (``USE_SELF_SIGNED=true``)
  - Script: ``generate-ssl.sh``

- **watchtower** (Container auto-updater)
  - Monitors: Containers with ``com.centurylinklabs.watchtower.enable=true``
  - Schedule: Every 15 minutes (``0 */15 * * * *``)
  - Cleanup: Removes old images after update
  - Webhook: ``POST /api/webhook/watchtower`` for notifications
  - **Critical**: Only monitors labeled containers (app, db, redis, nginx)

**Modified Services**:

- **app**:
  - Image: ``st7ma784/lustores:latest`` (from Docker Hub)
  - Port: 5000 (internal only, Nginx proxies)
  - Environment: Production secrets from ``.env``
  - Health check: 60s start period, 5 retries
  - Watchtower label: ``enable=true``

- **db**:
  - Volume: ``/db:/var/lib/postgresql/data`` (host mount for backups)
  - Password: ``${DB_PASSWORD}`` from environment
  - Authentication: SCRAM-SHA-256
  - PGDATA: Custom location ``/var/lib/postgresql/data/pgdata``

- **replit-auth**:
  - Image: ``st7ma784/replitauth:latest``
  - Environment: Production JWT secret
  - Allowed origins: ``https://${DOMAIN}``

**Network**:

- Custom bridge network: ``lustores_network``
- Subnet: ``172.20.0.0/16``
- Enables service discovery by name

**Production Deployment**:

.. code-block:: bash

   # First-time setup: Generate SSL certificate
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # Start production stack
   docker compose -f docker-compose.prod.yml up -d

   # Check service health
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs watchtower

   # Manual container update (Watchtower does this automatically)
   docker compose -f docker-compose.prod.yml pull app
   docker compose -f docker-compose.prod.yml up -d app

GitHub Actions CI/CD
--------------------

Automated pipelines run on every push to ``main`` branch.

Docker Build & Push Workflow
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**File**: ``.github/workflows/docker-build-push.yml``

**Triggers**:

- Push to ``main`` branch
- Pull requests to ``main``
- Manual dispatch (``workflow_dispatch``)
- Ignores: ``docs/**``, ``**.md``, docs workflow changes

**Jobs**:

1. **build-and-push**
   - Runs on: ``ubuntu-latest``
   - Uses Docker Buildx for advanced builds
   - Builds two images:
     - ``st7ma784/lustores:latest`` (main app)
     - ``st7ma784/replitauth:latest`` (auth service)
   - Tags:
     - ``latest`` (on main branch)
     - ``main-<git-sha>`` (commit-specific)
   - Cache: GitHub Actions cache (``type=gha``)
   - Push: Only on main branch pushes (not PRs)

**Docker Hub Integration**:

- Requires secrets: ``DOCKERHUB_USERNAME``, ``DOCKERHUB_TOKEN``
- Images automatically pulled by Watchtower in production

Tests Workflow
~~~~~~~~~~~~~~

**File**: ``.github/workflows/tests.yml``

**Triggers**:

- Push to ``main``
- Pull requests
- Manual dispatch
- Ignores: ``docs/**``, ``**.md``

**Jobs**:

1. **lint-and-type-check**
   - Node.js 24 setup
   - npm ci (clean install)
   - TypeScript type checking: ``npm run type-check``
   - ESLint (if configured): ``npm run lint``

2. **unit-tests**
   - PostgreSQL 15 service container (port 5432)
   - Database initialization: ``init.sql`` applied
   - Test command: ``npm run test:ci`` or ``npm test``
   - Coverage upload: Artifact retention 7 days
   - Environment: ``NODE_ENV=test``, ``DATABASE_URL=postgresql://postgres:password@localhost:5432/test_inventory``

3. **security-scan**
   - npm audit: Critical and high vulnerabilities
   - Trivy scanner: Filesystem vulnerability scan
   - SARIF upload: GitHub Security tab integration
   - Artifact upload: ``npm-audit.json``, ``trivy-results.sarif``

**Key Features**:

- Continues on error: Tests report failures but don't block
- GitHub service containers: PostgreSQL runs alongside tests
- Caching: npm cache for faster installs
- Permissions: ``security-events: write`` for SARIF uploads

Documentation Workflow
~~~~~~~~~~~~~~~~~~~~~~

**File**: ``.github/workflows/docs.yml``

**Triggers**:

- Push to ``main`` affecting:
  - ``docs/**``
  - ``**.md``
  - ``typedoc.json``
- Pull requests with docs changes
- Manual dispatch

**Jobs**:

1. **build**
   - Python 3.x setup for Sphinx
   - Node.js 24 for TypeDoc
   - Python dependencies:
     - sphinx
     - sphinx-rtd-theme
     - sphinxcontrib-httpdomain
     - myst-parser
     - sphinxcontrib-mermaid
   - TypeDoc: Generates API documentation from TypeScript
   - Sphinx: Builds HTML documentation (``make html``)
   - Creates ``.nojekyll`` file for GitHub Pages
   - Uploads artifact: ``documentation``

2. **deploy**
   - Runs only on main branch pushes
   - Downloads documentation artifact
   - Deploys to GitHub Pages
   - URL: ``https://st7ma784.github.io/LUStores/``
   - Environment: ``github-pages``

**Caching**:

- Python pip cache: ``~/.cache/pip``
- npm cache: Automatic via ``setup-node``

E2E Tests Workflow (Disabled)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**File**: ``.github/workflows/e2e-tests.yml``

**Status**: Currently disabled (all triggers commented out)

**Why Disabled**: End-to-end tests with Playwright are resource-intensive and can be flaky in CI environments. Enabled via manual dispatch only.

**Architecture** (when enabled):

- Microsoft Playwright Docker image (v1.48.2)
- Node.js 24 installed on top
- Ports: 5001 (app), 5433 (db), 6380 (redis) to avoid conflicts
- Docker Compose: Builds and starts full stack
- Health checks: Waits up to 5 minutes for app readiness
- Test execution: ``npx playwright test`` with HTML/JUnit reporters
- Cleanup: Removes all containers and volumes after tests

**Manual Execution**:

.. code-block:: bash

   # Via GitHub Actions UI
   # Navigate to Actions > E2E Tests > Run workflow

   # Locally with Docker Compose
   docker compose --profile e2e run e2e-test

Deployment Options
------------------

Docker Compose (Recommended)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Best for**: Small to medium deployments (1-100 concurrent users)

**Advantages**:

- Simple setup and management
- Single-server deployment
- Automatic service discovery
- Easy SSL configuration with Certbot
- Watchtower auto-updates

**Requirements**:

- Docker 24+ with Compose V2
- 2GB+ RAM (4GB recommended)
- 20GB+ disk space
- Public domain name (for SSL)

**Setup**:

.. code-block:: bash

   # Clone repository
   git clone https://github.com/st7ma784/LUStores.git
   cd LUStores

   # Configure environment
   cp .env.prod.example .env
   nano .env  # Edit with your values

   # Generate SSL certificate (first time only)
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # Start production stack
   docker compose -f docker-compose.prod.yml up -d

   # Verify deployment
   curl https://yourdomain.com/health

**Environment Variables** (``.env``):

.. code-block:: bash

   # Domain Configuration
   DOMAIN=yourdomain.com
   EMAIL=admin@yourdomain.com

   # Database
   DB_PASSWORD=<strong-random-password>
   DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/university_inventory

   # Security
   SESSION_SECRET=<64-char-random-string>
   JWT_SECRET=<64-char-random-string>
   JWT_EXPIRES_IN=7d

   # SSL
   CERTBOT_STAGING=  # Leave empty for production certs
   USE_SELF_SIGNED=false

   # Watchtower
   WATCHTOWER_NOTIFICATION_WEBHOOK_URL=http://app:5000/api/webhook/watchtower

**Maintenance**:

.. code-block:: bash

   # View logs
   docker compose -f docker-compose.prod.yml logs -f app

   # Restart a service
   docker compose -f docker-compose.prod.yml restart app

   # Update to latest version (Watchtower does this automatically)
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d

   # Database backup
   docker exec lustores_db pg_dump -U postgres university_inventory > backup.sql

   # Database restore
   docker exec -i lustores_db psql -U postgres university_inventory < backup.sql

Kubernetes Deployment
~~~~~~~~~~~~~~~~~~~~~~

**Best for**: Large deployments (100+ concurrent users), high availability

**File**: ``kube.yml``

**Architecture**:

- Namespace: ``lustores``
- Replicas: 2x app pods (horizontal scaling)
- Load balancing: Nginx service with LoadBalancer type
- Persistent volumes: PostgreSQL (10Gi), Redis (5Gi)
- Secrets: Database password, JWT secrets, session secrets
- Health checks: Liveness and readiness probes

**Resources** (Kubernetes):

1. **Namespace**: ``lustores`` (isolation)
2. **Persistent Volumes**:
   - ``postgres-prod-pv``: 10Gi (host path: ``/db``)
   - ``redis-pv``: 5Gi (host path: ``/mnt/data/redis``)
3. **Deployments**:
   - ``app``: 2 replicas, 512Mi-1Gi RAM, 0.5-1 CPU
   - ``db``: 1 replica (PostgreSQL 17)
   - ``redis``: 1 replica, 256Mi-512Mi RAM
   - ``nginx``: 1 replica (reverse proxy)
   - ``replit-auth``: 1 replica
   - ``github-runner``: 1 replica (optional, for self-hosted CI)
4. **Services**:
   - ``nginx``: LoadBalancer (external access)
   - ``app``, ``db``, ``redis``, ``replit-auth``: ClusterIP (internal)
5. **ConfigMaps**:
   - ``init-sql-config``: Database schema initialization
   - ``nginx-config``: Nginx reverse proxy configuration
   - ``nginx-http-config``: HTTP-only config (development)
6. **Secrets** (Base64 encoded):
   - ``db-secret``: Database password
   - ``app-secret``: Session secret, JWT secret, database URL
   - ``github-runner-secret``: GitHub runner token (optional)

**Deployment**:

.. code-block:: bash

   # Create secrets (replace with actual base64-encoded values)
   kubectl create secret generic db-secret \\
     --from-literal=password=$(echo -n 'your-db-password' | base64) \\
     -n lustores

   kubectl create secret generic app-secret \\
     --from-literal=session-secret=$(echo -n 'your-session-secret' | base64) \\
     --from-literal=jwt-secret=$(echo -n 'your-jwt-secret' | base64) \\
     --from-literal=database-url=$(echo -n 'postgresql://...' | base64) \\
     -n lustores

   # Apply Kubernetes manifest
   kubectl apply -f kube.yml

   # Check deployment status
   kubectl get pods -n lustores
   kubectl get services -n lustores

   # View logs
   kubectl logs -f deployment/app -n lustores

   # Scale app deployment
   kubectl scale deployment app --replicas=4 -n lustores

**Health Checks**:

- **Liveness probes**: Restart pod if app crashes
  - App: ``GET /health`` every 30s
  - Database: ``pg_isready`` every 10s
- **Readiness probes**: Remove from load balancer if not ready
  - App: ``GET /health`` every 10s
  - Database: ``pg_isready`` every 5s

**Advantages**:

- Horizontal scaling: Add more app pods as needed
- Self-healing: Automatic pod restarts on failure
- Rolling updates: Zero-downtime deployments
- Resource limits: Prevent resource exhaustion
- Network policies: Enhanced security

**Limitations**:

- More complex setup and management
- Requires Kubernetes cluster (GKE, EKS, AKS, self-hosted)
- ConfigMap has abbreviated ``init.sql`` (full schema needed for production)

SSL/HTTPS Configuration
-----------------------

Let's Encrypt Integration
~~~~~~~~~~~~~~~~~~~~~~~~~~

LUStores uses Let's Encrypt for free, automated SSL certificates.

**Components**:

1. **Certbot** (Docker service)
   - Image: ``certbot/certbot``
   - Auto-renewal: Every 12 hours
   - Certificate storage: ``./certbot/conf`` (shared with Nginx)
   - ACME challenge: ``./certbot/www`` (HTTP-01 validation)

2. **Nginx** (Reverse proxy)
   - Serves ACME challenge: ``/.well-known/acme-challenge/``
   - SSL termination: Decrypts HTTPS, proxies HTTP to app
   - Certificate paths:
     - ``/etc/letsencrypt/live/${DOMAIN}/fullchain.pem``
     - ``/etc/letsencrypt/live/${DOMAIN}/privkey.pem``

**First-Time Setup**:

.. code-block:: bash

   # Set environment variables
   export DOMAIN=inventory.university.edu
   export EMAIL=admin@university.edu

   # Generate certificate (production)
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # OR: Generate staging certificate (for testing, avoids rate limits)
   export CERTBOT_STAGING=--staging
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # OR: Generate self-signed certificate (development/testing)
   export USE_SELF_SIGNED=true
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

**How It Works**:

1. ``certbot-init`` runs ``generate-ssl.sh`` script
2. Script checks if certificate already exists
3. If not, runs Certbot with ACME HTTP-01 challenge
4. Certbot places challenge file in ``./certbot/www/.well-known/acme-challenge/``
5. Let's Encrypt verifies ownership by fetching ``http://${DOMAIN}/.well-known/acme-challenge/<token>``
6. Nginx serves challenge from ``./certbot/www``
7. Let's Encrypt issues certificate
8. Certificate saved to ``./certbot/conf/live/${DOMAIN}/``
9. Nginx reloads to use new certificate

**Auto-Renewal**:

The ``certbot`` service runs continuously and checks for renewal twice daily:

.. code-block:: bash

   # Certbot entrypoint (from docker-compose.prod.yml)
   entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

Certificates are renewed 30 days before expiration (Let's Encrypt issues 90-day certs).

**Manual Renewal** (if needed):

.. code-block:: bash

   # Force renewal
   docker compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal

   # Reload Nginx to use new certificate
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

Nginx Reverse Proxy
~~~~~~~~~~~~~~~~~~~

**Configuration**: ``nginx/nginx.conf.template``

**Key Features**:

1. **HTTP to HTTPS Redirect**:

   .. code-block:: nginx

      server {
          listen 80;
          server_name ${NGINX_HOST};

          location /.well-known/acme-challenge/ {
              root /var/www/certbot;
          }

          location / {
              return 301 https://$server_name$request_uri;
          }
      }

2. **HTTPS Server** (SSL termination):

   .. code-block:: nginx

      server {
          listen 443 ssl http2;
          server_name ${NGINX_HOST};

          ssl_certificate /etc/letsencrypt/live/${NGINX_HOST}/fullchain.pem;
          ssl_certificate_key /etc/letsencrypt/live/${NGINX_HOST}/privkey.pem;

          ssl_protocols TLSv1.2 TLSv1.3;
          ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...;

          location / {
              proxy_pass http://app:5000;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_set_header X-Real-IP $remote_addr;
          }
      }

3. **Security Headers**:

   - ``Strict-Transport-Security``: Force HTTPS for 2 years
   - ``X-Frame-Options: DENY``: Prevent clickjacking
   - ``X-Content-Type-Options: nosniff``: Prevent MIME sniffing
   - ``X-XSS-Protection``: Enable XSS filtering

4. **Rate Limiting**:

   .. code-block:: nginx

      limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
      limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

      location / {
          limit_req zone=api burst=20 nodelay;
          proxy_pass http://app:5000;
      }

   - API endpoints: 10 requests/second (burst 20)
   - Login endpoint: 5 requests/minute (brute-force protection)

5. **Upstream Health Checks**:

   .. code-block:: nginx

      upstream app {
          server app:5000 max_fails=3 fail_timeout=30s weight=1;
          keepalive 32;
      }

   - Mark backend as down after 3 failures
   - Retry after 30 seconds
   - Persistent connections (keepalive)

**Dynamic Configuration**:

Environment variables are substituted at runtime:

- ``${NGINX_HOST}``: Domain name (from ``DOMAIN`` env var)
- ``${DOMAIN}``: Same as ``NGINX_HOST``

This allows the same config template to work for any domain.

**Troubleshooting**:

.. code-block:: bash

   # Check Nginx config syntax
   docker compose -f docker-compose.prod.yml exec nginx nginx -t

   # View Nginx logs
   docker compose -f docker-compose.prod.yml logs nginx

   # Reload config without downtime
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

   # Test SSL certificate
   curl -vI https://yourdomain.com
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

Self-Signed Certificates (Development)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For local development or testing without a public domain:

.. code-block:: bash

   # Set environment
   export USE_SELF_SIGNED=true
   export DOMAIN=localhost

   # Generate self-signed certificate
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # Trust certificate (browser will still show warning)
   # On macOS:
   sudo security add-trusted-cert -d -r trustRoot \\
     -k /Library/Keychains/System.keychain \\
     certbot/conf/live/localhost/cert.pem

Script: ``scripts/generate-self-signed-ssl.sh``

Creates 365-day self-signed certificate with OpenSSL.

Automatic Updates with Watchtower
----------------------------------

Watchtower monitors Docker containers and automatically updates them when new images are available.

Configuration
~~~~~~~~~~~~~

From ``docker-compose.prod.yml``:

.. code-block:: yaml

   watchtower:
     image: containrrr/watchtower:latest
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock
     environment:
       - WATCHTOWER_CLEANUP=true
       - WATCHTOWER_INCLUDE_STOPPED=true
       - WATCHTOWER_REVIVE_STOPPED=false
       - WATCHTOWER_NOTIFICATION_WEBHOOK_URL=http://app:5000/api/webhook/watchtower
       - WATCHTOWER_MONITOR_ONLY=false
       - WATCHTOWER_SCHEDULE=0 */15 * * * *
       - WATCHTOWER_LABEL_ENABLE=true
     restart: unless-stopped

**How It Works**:

1. **Schedule**: Runs every 15 minutes (cron: ``0 */15 * * * *``)
2. **Label-based monitoring**: Only updates containers with ``com.centurylinklabs.watchtower.enable=true``
3. **Image check**: Pulls latest image from Docker Hub
4. **Comparison**: Compares local image digest with remote
5. **Update**: If newer image available:
   - Stops old container
   - Removes old container
   - Creates new container with same configuration
   - Starts new container
6. **Cleanup**: Removes old Docker images (``WATCHTOWER_CLEANUP=true``)
7. **Notification**: POSTs update status to ``/api/webhook/watchtower``

**Monitored Services** (have Watchtower labels):

- ``app`` (main application)
- ``db`` (PostgreSQL database)
- ``redis`` (session store)
- ``nginx`` (reverse proxy)
- ``replit-auth`` (authentication service)

**Not Monitored**:

- ``watchtower`` itself (``enable=false``)
- ``certbot`` (manual certificate management)

Deployment Workflow
~~~~~~~~~~~~~~~~~~~

This enables continuous deployment:

1. Developer pushes code to ``main`` branch
2. GitHub Actions builds Docker image (``docker-build-push.yml``)
3. Tests run (``tests.yml``)
4. Image pushed to Docker Hub (``st7ma784/lustores:latest``)
5. Within 15 minutes, Watchtower detects new image
6. Watchtower updates production containers automatically
7. Webhook notifies application of update

**Zero-Downtime Updates**:

Watchtower updates containers one at a time. With Kubernetes (2 app replicas), one pod stays running while the other updates.

**Rollback**:

If an update breaks production:

.. code-block:: bash

   # View available image tags
   docker images st7ma784/lustores

   # Roll back to previous version
   docker tag st7ma784/lustores:<previous-sha> st7ma784/lustores:latest
   docker compose -f docker-compose.prod.yml up -d app

   # Or: Pull specific commit
   docker pull st7ma784/lustores:main-abc123def
   docker tag st7ma784/lustores:main-abc123def st7ma784/lustores:latest
   docker compose -f docker-compose.prod.yml up -d app

Disabling Auto-Updates
~~~~~~~~~~~~~~~~~~~~~~~

To disable Watchtower for a specific service:

.. code-block:: yaml

   app:
     labels:
       - "com.centurylinklabs.watchtower.enable=false"

To disable Watchtower entirely:

.. code-block:: bash

   docker compose -f docker-compose.prod.yml stop watchtower
   docker compose -f docker-compose.prod.yml rm watchtower

Best Practices
--------------

Security
~~~~~~~~

1. **Never commit secrets**:
   - Use ``.env`` files (gitignored)
   - Rotate secrets regularly (90 days)
   - Use strong random strings (64+ characters)

2. **Database security**:
   - Change default password immediately
   - Use SCRAM-SHA-256 authentication
   - Restrict network access (Docker internal network)
   - Regular backups (automated cron job)

3. **SSL/TLS**:
   - Always use HTTPS in production
   - Enable HSTS (Strict-Transport-Security)
   - Use modern TLS protocols (1.2, 1.3)

4. **Container security**:
   - Run as non-root user (``appuser``)
   - Minimal production image (no build tools)
   - Regular security scans (Trivy in CI)

5. **Rate limiting**:
   - Protect API endpoints (10 req/s)
   - Protect login endpoints (5 req/min)
   - Adjust based on traffic patterns

Monitoring
~~~~~~~~~~

1. **Health checks**:

   .. code-block:: bash

      # Application health
      curl https://yourdomain.com/health

      # Container health
      docker compose -f docker-compose.prod.yml ps

      # Database health
      docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres

2. **Logs**:

   .. code-block:: bash

      # Real-time logs
      docker compose -f docker-compose.prod.yml logs -f app

      # Last 100 lines
      docker compose -f docker-compose.prod.yml logs --tail=100 app

      # Nginx access logs
      docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

3. **Resource usage**:

   .. code-block:: bash

      # Container stats
      docker stats

      # Disk usage
      docker system df

4. **Database monitoring**:

   .. code-block:: bash

      # Connection count
      docker compose -f docker-compose.prod.yml exec db \\
        psql -U postgres -d university_inventory \\
        -c "SELECT count(*) FROM pg_stat_activity;"

      # Database size
      docker compose -f docker-compose.prod.yml exec db \\
        psql -U postgres -d university_inventory \\
        -c "SELECT pg_size_pretty(pg_database_size('university_inventory'));"

Backup Strategy
~~~~~~~~~~~~~~~

1. **Database backups** (daily):

   .. code-block:: bash

      #!/bin/bash
      # /etc/cron.daily/lustores-backup.sh

      BACKUP_DIR=/backups/lustores
      DATE=$(date +%Y%m%d_%H%M%S)

      # Create backup directory
      mkdir -p $BACKUP_DIR

      # Backup database
      docker exec lustores_db pg_dump -U postgres university_inventory \\
        | gzip > $BACKUP_DIR/db_$DATE.sql.gz

      # Keep only last 30 days
      find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

2. **Volume backups**:

   .. code-block:: bash

      # Backup Docker volumes
      docker run --rm \\
        -v lustores_postgres_data:/source \\
        -v /backups/volumes:/backup \\
        alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /source .

3. **Configuration backups**:

   .. code-block:: bash

      # Backup .env and docker-compose files
      tar czf lustores_config_$(date +%Y%m%d).tar.gz \\
        .env docker-compose.prod.yml nginx/

4. **Restore procedure**:

   .. code-block:: bash

      # Stop application
      docker compose -f docker-compose.prod.yml down

      # Restore database
      gunzip < db_20250101_120000.sql.gz | \\
        docker exec -i lustores_db psql -U postgres university_inventory

      # Restore volumes
      docker run --rm \\
        -v lustores_postgres_data:/target \\
        -v /backups/volumes:/backup \\
        alpine tar xzf /backup/postgres_data_20250101.tar.gz -C /target

      # Start application
      docker compose -f docker-compose.prod.yml up -d

Performance Optimization
~~~~~~~~~~~~~~~~~~~~~~~~

1. **Database**:
   - Regular VACUUM and ANALYZE (see :doc:`database-organization`)
   - Connection pooling (built into app)
   - Indexes on frequently queried columns

2. **Redis caching**:
   - Session storage in Redis (not database)
   - AOF persistence for durability
   - Memory limit: 512MB (adjust based on session count)

3. **Nginx**:
   - Gzip compression enabled (6x compression)
   - Static file caching (future enhancement)
   - Connection keepalive (reduces overhead)

4. **Application**:
   - Production build (minified, tree-shaken)
   - No source maps in production
   - Memory limit: 2GB Node.js heap

5. **Docker**:
   - Multi-stage builds (smaller images = faster pulls)
   - Layer caching (faster rebuilds)
   - Volume mounts (not bind mounts in production)

Troubleshooting
---------------

Common Deployment Issues
~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: Container won't start

.. code-block:: bash

   # Check logs for errors
   docker compose -f docker-compose.prod.yml logs app

   # Common causes:
   # 1. Missing environment variables - check .env file
   # 2. Database not ready - check db health
   # 3. Port already in use - check `netstat -tulpn | grep 5000`

**Issue**: 502 Bad Gateway (Nginx)

.. code-block:: bash

   # Check if app is running
   docker compose -f docker-compose.prod.yml ps app

   # Check app health
   docker compose -f docker-compose.prod.yml exec app wget -O- http://localhost:5000/health

   # Check Nginx upstream config
   docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf

**Issue**: SSL certificate not working

.. code-block:: bash

   # Check certificate exists
   ls -la certbot/conf/live/${DOMAIN}/

   # Check Nginx SSL config
   docker compose -f docker-compose.prod.yml exec nginx nginx -t

   # Regenerate certificate
   docker compose -f docker-compose.prod.yml --profile init up certbot-init

   # Check Let's Encrypt rate limits
   # https://letsencrypt.org/docs/rate-limits/

**Issue**: Database connection refused

.. code-block:: bash

   # Check database is running
   docker compose -f docker-compose.prod.yml ps db

   # Check database logs
   docker compose -f docker-compose.prod.yml logs db

   # Test connection from app container
   docker compose -f docker-compose.prod.yml exec app \\
     psql postgresql://postgres:password@db:5432/university_inventory -c "SELECT 1;"

**Issue**: Watchtower not updating

.. code-block:: bash

   # Check Watchtower logs
   docker compose -f docker-compose.prod.yml logs watchtower

   # Verify labels are set
   docker inspect lustores_app | grep watchtower

   # Force manual update
   docker compose -f docker-compose.prod.yml pull app
   docker compose -f docker-compose.prod.yml up -d app

**Issue**: Out of disk space

.. code-block:: bash

   # Check disk usage
   df -h
   docker system df

   # Remove old images
   docker image prune -a

   # Remove old volumes
   docker volume prune

   # Clean build cache
   docker builder prune

Performance Issues
~~~~~~~~~~~~~~~~~~

**Symptom**: Slow API responses

1. Check database query performance (see :doc:`database-organization`)
2. Check container resource limits: ``docker stats``
3. Enable query logging to identify slow queries
4. Add database indexes for frequently filtered columns

**Symptom**: High memory usage

.. code-block:: bash

   # Check container memory
   docker stats --no-stream

   # Increase Node.js heap if needed (in docker-compose.prod.yml)
   environment:
     - NODE_OPTIONS="--max-old-space-size=4096"  # 4GB

**Symptom**: Database running out of connections

.. code-block:: bash

   # Check active connections
   docker compose -f docker-compose.prod.yml exec db \\
     psql -U postgres -d university_inventory \\
     -c "SELECT count(*) FROM pg_stat_activity;"

   # Increase max connections in PostgreSQL (init.sql or ALTER SYSTEM)
   # Default: 100

For more troubleshooting guidance, see :doc:`../operations/system-recovery` and :doc:`../reference/troubleshooting`.

Related Documentation
---------------------

- :doc:`database-organization` - Database schema and migrations
- :doc:`../operations/system-recovery` - Emergency recovery procedures
- :doc:`../reference/troubleshooting` - Common problems and solutions
- :doc:`../explanations/concepts` - Core concepts and business logic
