===============================
Backup & Restore Procedures
===============================

.. danger::
   **CRITICAL**: Regularly backup your data! Hardware failures and data corruption can happen without warning.

This guide provides comprehensive backup and restore procedures for LUStores, including automated and manual methods.

Overview
========

LUStores stores critical data in several locations that must be backed up regularly to ensure business continuity.

Critical Data Locations
=======================

.. list-table:: Backup Priority Matrix
   :header-rows: 1
   :widths: 25 20 20 35

   * - Component
     - Priority
     - Backup Frequency
     - Location
   * - PostgreSQL Database
     - **CRITICAL**
     - Daily (automated)
     - ``/db`` on host
   * - Environment Config (.env.prod)
     - **CRITICAL**
     - After any change
     - Project root
   * - SSL Certificates
     - HIGH
     - Weekly
     - ``./certbot/conf``
   * - Nginx Configuration
     - MEDIUM
     - After changes
     - ``./nginx/``
   * - Redis Data
     - LOW
     - Optional (transient)
     - ``redis_data`` volume
   * - Application Logs
     - LOW
     - Optional (archival)
     - ``./logs/``

Backup Architecture
===================

.. mermaid::

   graph TB
       subgraph "Source Data (VM Host)"
           DB[("/db<br/>PostgreSQL Data<br/><b>CRITICAL</b>")]
           ENV[(".env.prod<br/>Secrets & Config<br/><b>CRITICAL</b>")]
           SSL[("./certbot/conf<br/>SSL Certificates<br/><b>HIGH</b>")]
           NGINX[("./nginx/<br/>Web Config<br/><b>MEDIUM</b>")]
           REDIS[("redis_data<br/>Cache/Sessions<br/><b>LOW</b>")]
       end

       subgraph "Backup Methods"
           AUTO["Automated Daily Backup<br/>(via Interface)"]
           MANUAL["Manual Backup<br/>(Command Line)"]
           DOCKER["Docker Volume Backup<br/>(Full System)"]
       end

       subgraph "Backup Storage"
           LOCAL["Local Backup Dir<br/>./backups/"]
           REMOTE["Remote Storage<br/>(Recommended)"]
           CLOUD["Cloud Storage<br/>(S3, Azure, etc.)"]
       end

       DB --> AUTO
       DB --> MANUAL
       DB --> DOCKER
       ENV --> MANUAL
       SSL --> MANUAL
       NGINX --> MANUAL
       REDIS --> DOCKER

       AUTO --> LOCAL
       MANUAL --> LOCAL
       DOCKER --> LOCAL

       LOCAL -.->|Copy| REMOTE
       LOCAL -.->|Upload| CLOUD

       style DB fill:#ff6b6b
       style ENV fill:#ff6b6b
       style SSL fill:#ffd93d
       style AUTO fill:#6bcf7f
       style REMOTE fill:#4d96ff
       style CLOUD fill:#4d96ff

Backup Methods
==============

Method 1: Automated Backup via Interface (Recommended)
-------------------------------------------------------

The LUStores interface provides an automated backup feature for non-technical users.

**Steps:**

1. Log in as an admin user
2. Navigate to **Admin** → **System Management**
3. Click **"Create Backup"** button
4. Wait for confirmation (typically 30-60 seconds)
5. Download the backup file when prompted

**What's Included:**

- ✅ Complete PostgreSQL database dump
- ✅ Timestamp and metadata
- ✅ Compressed format (.sql.gz)

**What's NOT Included:**

- ❌ Environment configuration (.env.prod)
- ❌ SSL certificates
- ❌ Nginx configuration

.. note::
   Automated backups are stored in ``./backups/`` directory on the host and are retained for 30 days.

Method 2: Manual Database Backup (Command Line)
------------------------------------------------

For administrators with SSH access to the VM.

Quick Backup
~~~~~~~~~~~~

::

    # Navigate to project directory
    cd /data/LUStores

    # Create backup with timestamp
    docker compose -f docker-compose.prod.yml exec -T db \
        pg_dump -U postgres university_inventory \
        | gzip > "backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

    # Verify backup was created
    ls -lh backups/

Comprehensive Backup (Database + Config)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

::

    # Create backup directory with timestamp
    BACKUP_DIR="backups/full_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # 1. Backup PostgreSQL database
    echo "Backing up database..."
    docker compose -f docker-compose.prod.yml exec -T db \
        pg_dump -U postgres -F c university_inventory \
        > "$BACKUP_DIR/database.dump"

    # 2. Backup environment configuration
    echo "Backing up configuration..."
    cp .env.prod "$BACKUP_DIR/env.prod.backup"

    # 3. Backup SSL certificates
    echo "Backing up SSL certificates..."
    tar -czf "$BACKUP_DIR/ssl_certificates.tar.gz" certbot/conf/

    # 4. Backup nginx configuration
    echo "Backing up nginx config..."
    tar -czf "$BACKUP_DIR/nginx_config.tar.gz" nginx/

    # 5. Create backup manifest
    cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
    LUStores Backup Manifest
    ========================
    Backup Date: $(date)
    Hostname: $(hostname)
    Database Size: $(du -sh $BACKUP_DIR/database.dump | cut -f1)

    Contents:
    - database.dump (PostgreSQL custom format)
    - env.prod.backup (environment configuration)
    - ssl_certificates.tar.gz (Let's Encrypt certs)
    - nginx_config.tar.gz (web server config)
    EOF

    # 6. Compress entire backup
    echo "Compressing backup..."
    tar -czf "${BACKUP_DIR}.tar.gz" -C backups "$(basename $BACKUP_DIR)"

    # 7. Clean up uncompressed directory
    rm -rf "$BACKUP_DIR"

    echo "✅ Backup completed: ${BACKUP_DIR}.tar.gz"
    ls -lh "${BACKUP_DIR}.tar.gz"

Method 3: Docker Volume Backup (Full System)
---------------------------------------------

Backs up all Docker volumes including Redis data.

::

    # Stop services (downtime required)
    docker compose -f docker-compose.prod.yml stop

    # Backup all volumes
    docker run --rm \
        -v /db:/source/db:ro \
        -v lustores_redis_data:/source/redis:ro \
        -v $(pwd)/backups:/backup \
        alpine tar czf /backup/volumes_$(date +%Y%m%d_%H%M%S).tar.gz \
        -C /source .

    # Restart services
    docker compose -f docker-compose.prod.yml start

    echo "✅ Volume backup completed"

.. warning::
   This method requires stopping services and causes downtime. Use Method 2 for zero-downtime backups.

Automated Backup Script
========================

Create a daily automated backup script.

Create Backup Script
--------------------

::

    # Create script
    cat > /usr/local/bin/lustores-backup.sh << 'EOF'
    #!/bin/bash
    set -e

    # Configuration
    PROJECT_DIR="/data/LUStores"
    BACKUP_DIR="$PROJECT_DIR/backups"
    RETENTION_DAYS=30
    LOG_FILE="$PROJECT_DIR/logs/backup.log"

    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname $LOG_FILE)"

    # Log function
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
    }

    log "Starting automated backup..."

    # Create timestamped backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/auto_backup_$TIMESTAMP.sql.gz"

    # Perform backup
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.prod.yml exec -T db \
        pg_dump -U postgres university_inventory \
        | gzip > "$BACKUP_FILE"

    # Verify backup
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "✅ Backup successful: $BACKUP_FILE ($SIZE)"
    else
        log "❌ Backup failed!"
        exit 1
    fi

    # Clean up old backups (keep last 30 days)
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "auto_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

    log "Backup process completed successfully"
    EOF

    # Make executable
    chmod +x /usr/local/bin/lustores-backup.sh

Setup Automated Daily Backup (Cron)
------------------------------------

::

    # Add to crontab (runs daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/lustores-backup.sh") | crontab -

    # Verify cron job
    crontab -l

Off-Site Backup (Recommended)
==============================

Always store backups in a separate location from the production server.

Option 1: Remote Server via SCP
--------------------------------

::

    # Copy backup to remote server
    BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    REMOTE_SERVER="backup.university.edu"
    REMOTE_PATH="/backups/lustores/"

    scp "$BACKUP_FILE" "admin@$REMOTE_SERVER:$REMOTE_PATH"

Option 2: Cloud Storage (AWS S3 Example)
-----------------------------------------

::

    # Install AWS CLI (if not already installed)
    sudo apt-get install awscli

    # Configure AWS credentials
    aws configure

    # Upload to S3
    BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    S3_BUCKET="s3://university-lustores-backups"

    aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/$(basename $BACKUP_FILE)"

Option 3: Network Attached Storage (NAS)
-----------------------------------------

::

    # Mount NAS (one-time setup)
    sudo apt-get install cifs-utils
    sudo mkdir -p /mnt/nas-backup

    # Add to /etc/fstab
    # //nas.university.edu/backups /mnt/nas-backup cifs credentials=/root/.nascreds 0 0

    # Mount
    sudo mount /mnt/nas-backup

    # Copy backups
    cp backups/*.sql.gz /mnt/nas-backup/lustores/

Restore Procedures
==================

Restore Scenario 1: Database Only
----------------------------------

**Use Case**: Data corruption, accidental deletion, need to roll back to previous state.

**Downtime**: Minimal (2-5 minutes)

Steps::

    cd /data/LUStores

    # 1. Stop the application (keeps database running)
    docker compose -f docker-compose.prod.yml stop app

    # 2. Restore from compressed backup
    gunzip -c backups/backup_20250122_020000.sql.gz | \
        docker compose -f docker-compose.prod.yml exec -T db \
        psql -U postgres -d university_inventory

    # OR restore from custom format backup
    docker compose -f docker-compose.prod.yml exec -T db \
        pg_restore -U postgres -d university_inventory -c < backups/database.dump

    # 3. Restart application
    docker compose -f docker-compose.prod.yml start app

    # 4. Verify
    docker compose -f docker-compose.prod.yml logs -f app

Restore Scenario 2: Complete System Failure
--------------------------------------------

**Use Case**: VM crash, disk failure, complete data loss.

**Downtime**: 15-30 minutes

.. mermaid::

   graph TB
       START([System Failure])

       PREP[1. Prepare New VM<br/>Install Docker & Docker Compose]
       CLONE[2. Clone Repository<br/>git clone repo]
       RESTORE_CONFIG[3. Restore .env.prod<br/>from backup]
       RESTORE_DB[4. Restore Database<br/>Extract to /db]
       RESTORE_SSL[5. Restore SSL Certs<br/>Extract to ./certbot/conf]
       RESTORE_NGINX[6. Restore nginx Config<br/>Extract to ./nginx]
       START_SERVICES[7. Start Services<br/>docker compose up -d]
       VERIFY[8. Verify System<br/>Check logs & health]
       DONE([System Restored])

       START --> PREP
       PREP --> CLONE
       CLONE --> RESTORE_CONFIG
       RESTORE_CONFIG --> RESTORE_DB
       RESTORE_DB --> RESTORE_SSL
       RESTORE_SSL --> RESTORE_NGINX
       RESTORE_NGINX --> START_SERVICES
       START_SERVICES --> VERIFY
       VERIFY --> DONE

       style START fill:#ff6b6b
       style RESTORE_CONFIG fill:#ffd93d
       style RESTORE_DB fill:#ffd93d
       style VERIFY fill:#6bcf7f
       style DONE fill:#6bcf7f

Complete Restore Steps::

    # 1. Install prerequisites on new VM
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose git

    # 2. Clone repository
    cd /data
    git clone https://github.com/st7ma784/LUStores.git
    cd LUStores

    # 3. Extract full backup
    BACKUP_FILE="full_backup_20250122_020000.tar.gz"
    tar -xzf "$BACKUP_FILE" -C .

    # 4. Restore environment configuration
    cp full_backup_20250122_020000/env.prod.backup .env.prod
    chmod 600 .env.prod

    # 5. Restore SSL certificates
    tar -xzf full_backup_20250122_020000/ssl_certificates.tar.gz

    # 6. Restore nginx configuration
    tar -xzf full_backup_20250122_020000/nginx_config.tar.gz

    # 7. Create database volume directory
    sudo mkdir -p /db
    sudo chown -R 999:999 /db

    # 8. Start database only
    docker compose -f docker-compose.prod.yml up -d db

    # Wait for database to initialize
    sleep 10

    # 9. Restore database
    docker compose -f docker-compose.prod.yml exec -T db \
        pg_restore -U postgres -d university_inventory -c \
        < full_backup_20250122_020000/database.dump

    # 10. Start all services
    docker compose -f docker-compose.prod.yml up -d

    # 11. Verify system
    docker compose -f docker-compose.prod.yml ps
    docker compose -f docker-compose.prod.yml logs -f app

Restore Scenario 3: Specific Point in Time
-------------------------------------------

**Use Case**: Need to restore to a specific date/time.

1. Identify the correct backup file::

    ls -lh backups/ | grep "20250122"

2. Follow Restore Scenario 1 steps with the specific backup file

Verification After Restore
===========================

Critical Checks
---------------

1. **Database Connection**::

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory -c "SELECT COUNT(*) FROM users;"

2. **Application Health**::

    curl https://your-domain.com/health

3. **Login Test**: Try logging in with known credentials

4. **Data Integrity**: Check recent records exist

5. **Services Running**::

    docker compose -f docker-compose.prod.yml ps

Backup Testing
==============

.. important::
   **Test your backups regularly!** A backup is only useful if it can be restored.

Monthly Backup Test Procedure
------------------------------

1. Create a test environment (separate VM or local Docker)
2. Restore latest backup following Scenario 2
3. Verify all data is accessible
4. Document any issues
5. Update procedures if needed

Test Restore Script::

    #!/bin/bash
    # Test backup restore in isolated environment

    BACKUP_FILE="$1"
    TEST_DIR="/tmp/lustores-restore-test"

    # Create test environment
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"

    # Extract and test restore
    tar -xzf "$BACKUP_FILE"
    # ... perform restore steps ...

    # Verify
    docker compose exec -T db psql -U postgres -d university_inventory -c "SELECT version();"

    # Cleanup
    docker compose down -v
    rm -rf "$TEST_DIR"

Disaster Recovery Checklist
============================

.. list-table:: Disaster Recovery Steps
   :header-rows: 1
   :widths: 10 60 15 15

   * - Step
     - Action
     - Responsible
     - Est. Time
   * - 1
     - Assess damage and determine recovery scope
     - IT Manager
     - 5 min
   * - 2
     - Provision new VM (if needed)
     - System Admin
     - 10 min
   * - 3
     - Retrieve latest backup from off-site storage
     - System Admin
     - 5 min
   * - 4
     - Install Docker and dependencies
     - System Admin
     - 5 min
   * - 5
     - Restore configuration files
     - System Admin
     - 2 min
   * - 6
     - Restore database
     - System Admin
     - 5 min
   * - 7
     - Restore SSL certificates and nginx config
     - System Admin
     - 2 min
   * - 8
     - Start services and verify
     - System Admin
     - 5 min
   * - 9
     - Test application functionality
     - QA Team
     - 10 min
   * - 10
     - Notify users of service restoration
     - IT Manager
     - 2 min

**Total Recovery Time Objective (RTO)**: 51 minutes

**Recovery Point Objective (RPO)**: 24 hours (with daily backups)

Backup Best Practices
======================

Daily Operations
----------------

- ✅ **Automated daily backups** at 2 AM (low traffic)
- ✅ **Monitor backup logs** daily for failures
- ✅ **Verify backup file sizes** are reasonable
- ✅ **Copy to off-site storage** within 24 hours

Weekly Tasks
------------

- ✅ **Manual full backup** (database + config + SSL)
- ✅ **Verify off-site backups** are accessible
- ✅ **Check disk space** in backup directory

Monthly Tasks
-------------

- ✅ **Test restore procedure** in isolated environment
- ✅ **Review backup retention policy**
- ✅ **Update documentation** if procedures change

Troubleshooting
===============

Backup Fails with "Permission Denied"
--------------------------------------

::

    # Fix permissions on backup directory
    sudo chown -R $(whoami):$(whoami) backups/
    chmod 755 backups/

Backup File is Empty or Too Small
----------------------------------

::

    # Check if database container is running
    docker compose -f docker-compose.prod.yml ps db

    # Check database size
    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory \
        -c "SELECT pg_size_pretty(pg_database_size('university_inventory'));"

Restore Fails with "Database Already Exists"
---------------------------------------------

::

    # Drop and recreate database
    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -c "DROP DATABASE university_inventory;"

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -c "CREATE DATABASE university_inventory;"

    # Then retry restore

Cannot Connect After Restore
-----------------------------

1. Check .env.prod has correct credentials
2. Verify all services are running
3. Check application logs for errors
4. Ensure database initialized correctly

Related Documentation
=====================

- :doc:`docker-architecture` - Understanding the system architecture
- :doc:`qrh` - Quick troubleshooting reference
- :doc:`/deployment/production` - Production deployment guide
- :doc:`/admin/system-management` - Admin interface backup feature
