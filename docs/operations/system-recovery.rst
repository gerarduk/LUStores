System Recovery and Emergency Procedures
=========================================

.. danger::
   **EMERGENCY GUIDE**: This document provides critical recovery procedures for system failures. Bookmark this page for quick access during emergencies.

This guide covers emergency recovery procedures, system restart protocols, backup and restore operations, and troubleshooting for critical failures.

.. contents:: Quick Navigation
   :local:
   :depth: 2

---

Quick Recovery Steps
--------------------

When the System is Down
~~~~~~~~~~~~~~~~~~~~~~~

**Fast Recovery Checklist** (5 minutes):

.. code-block:: bash

   # 1. Stop all services gracefully
   docker-compose -f docker-compose.prod.yml down

   # 2. Check system health
   docker ps -a                    # See all containers
   docker logs lustores_app        # Check app logs
   docker logs lustores_db         # Check database logs
   docker logs lustores_nginx      # Check nginx logs

   # 3. Restart services in proper order
   #    DATABASE FIRST (wait 30 seconds for init)
   docker-compose -f docker-compose.prod.yml up -d db
   sleep 30

   #    APP AND REDIS (wait 15 seconds)
   docker-compose -f docker-compose.prod.yml up -d app redis
   sleep 15

   #    NGINX LAST
   docker-compose -f docker-compose.prod.yml up -d nginx

   # 4. Verify health
   curl http://localhost/health
   curl https://yourdomain.com/health

**If this doesn't work**: Proceed to specific failure scenarios below.

Health Check Commands
~~~~~~~~~~~~~~~~~~~~~

**Quick Status Check**:

.. code-block:: bash

   # Check which services are running
   docker-compose -f docker-compose.prod.yml ps

   # Check Docker daemon
   sudo systemctl status docker

   # Check disk space (common issue)
   df -h

   # Check memory usage
   free -h

   # Check logs for errors
   docker-compose -f docker-compose.prod.yml logs --tail=50

**Expected Healthy Output**:

.. code-block:: text

   NAME                STATUS              PORTS
   lustores_db         Up 5 minutes       0.0.0.0:5432->5432/tcp
   lustores_app        Up 4 minutes       0.0.0.0:5000->5000/tcp
   lustores_redis      Up 4 minutes       0.0.0.0:6379->6379/tcp
   lustores_nginx      Up 4 minutes       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp

---

Common Failure Scenarios
------------------------

Scenario 1: Database Won't Start
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - ``lustores_db`` container exits immediately
   - Logs show: "database files are incompatible" or "could not open file"
   - App can't connect to database

**Diagnosis**:

.. code-block:: bash

   # Check database logs
   docker logs lustores_db

   # Common error messages:
   # - "FATAL: database files are incompatible with server"
   # - "FATAL: could not create shared memory segment"
   # - "data directory has wrong ownership"

**Solutions**:

**Solution A: Volume Corruption** (if logs show incompatibility):

.. code-block:: bash

   # DANGER: This deletes ALL data. Restore from backup after.
   docker-compose -f docker-compose.prod.yml down
   docker volume rm lustores_postgres_data

   # Restore from backup (see Database Backup section below)
   docker-compose -f docker-compose.prod.yml up -d db
   sleep 30
   cat backup-latest.sql | docker exec -i lustores_db psql -U postgres inventory

**Solution B: Permissions Issue**:

.. code-block:: bash

   # Fix volume permissions
   docker-compose -f docker-compose.prod.yml down
   sudo chown -R 999:999 /var/lib/docker/volumes/lustores_postgres_data
   docker-compose -f docker-compose.prod.yml up -d db

**Solution C: PostgreSQL Version Mismatch**:

.. code-block:: bash

   # Check current PostgreSQL version
   docker exec lustores_db psql -U postgres -c "SELECT version();"

   # If version mismatch, upgrade using pg_upgrade
   # See PostgreSQL upgrade documentation

**Prevention**:
   - **Daily backups**: Automated backup script (see Backup section)
   - **Monitor disk space**: Ensure adequate space for database growth
   - **Version pinning**: Lock PostgreSQL version in docker-compose.prod.yml

Scenario 2: App Container Crash-Looping
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - ``lustores_app`` container restarts repeatedly
   - Logs show connection errors or startup failures
   - HTTP 502 Bad Gateway from nginx

**Diagnosis**:

.. code-block:: bash

   # Watch app logs in real-time
   docker logs -f lustores_app

   # Common error patterns:
   # - "ECONNREFUSED" → Can't connect to database/redis
   # - "MODULE_NOT_FOUND" → Missing dependencies
   # - "EADDRINUSE" → Port already in use
   # - "Segmentation fault" → Node.js crash (serious)

**Solutions**:

**Solution A: Database Connection Failure**:

.. code-block:: bash

   # Verify database is running and healthy
   docker exec lustores_db psql -U postgres -c "SELECT 1;"

   # Check DATABASE_URL environment variable
   docker-compose -f docker-compose.prod.yml config | grep DATABASE_URL

   # Ensure correct format:
   # DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/inventory

**Solution B: Missing Environment Variables**:

.. code-block:: bash

   # Check .env.prod file exists and is complete
   cat .env.prod

   # Required variables:
   # - DATABASE_URL
   # - SESSION_SECRET
   # - JWT_SECRET
   # - DB_PASSWORD
   # - DOMAIN
   # - EMAIL

   # Restart app after fixing .env.prod
   docker-compose -f docker-compose.prod.yml up -d app

**Solution C: Dependency Issue**:

.. code-block:: bash

   # Rebuild app image with fresh dependencies
   docker-compose -f docker-compose.prod.yml build --no-cache app
   docker-compose -f docker-compose.prod.yml up -d app

**Solution D: Port Conflict**:

.. code-block:: bash

   # Check if port 5000 is in use
   sudo lsof -i :5000

   # Kill conflicting process or change app port

**Prevention**:
   - **Health checks**: Monitor ``/health`` endpoint
   - **Structured logging**: Review logs regularly for warnings
   - **Test deployments**: Staging environment before production

Scenario 3: Nginx 502 Bad Gateway
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - Website returns "502 Bad Gateway"
   - Nginx is running but can't reach app
   - App container is healthy but unreachable

**Diagnosis**:

.. code-block:: bash

   # Check nginx logs
   docker logs lustores_nginx

   # Common errors:
   # - "connect() failed (111: Connection refused)"
   # - "no resolver defined to resolve app"
   # - "upstream timed out"

**Solutions**:

**Solution A: DNS Resolution Issue** (most common with Watchtower):

.. code-block:: bash

   # Nginx can't resolve "app" hostname after Watchtower update
   # FIX: Restart nginx to refresh DNS cache
   docker-compose -f docker-compose.prod.yml restart nginx

**Solution B: App Not Ready**:

.. code-block:: bash

   # App still starting up
   # Wait 30 seconds and retry
   sleep 30
   curl http://localhost/health

**Solution C: Nginx Configuration Error**:

.. code-block:: bash

   # Test nginx configuration
   docker exec lustores_nginx nginx -t

   # If config invalid, check nginx.conf
   docker exec lustores_nginx cat /etc/nginx/nginx.conf

   # Fix configuration and reload
   docker-compose -f docker-compose.prod.yml restart nginx

**Solution D: Network Issue**:

.. code-block:: bash

   # Check if app and nginx on same Docker network
   docker network inspect lustores_network

   # Both should be listed in "Containers"

**Prevention**:
   - **Dynamic DNS**: nginx.conf already configured with ``resolver 127.0.0.11`` for Docker DNS
   - **Health checks**: Nginx waits for app to be healthy before routing
   - **Monitoring**: Regular health endpoint checks

Scenario 4: SSL Certificate Expired
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - Browser shows "Your connection is not private"
   - Certificate expired warning
   - HTTPS doesn't work, HTTP does

**Diagnosis**:

.. code-block:: bash

   # Check certificate expiry
   docker exec lustores_certbot certbot certificates

   # Output shows:
   #   Expiry Date: 2025-01-01 (EXPIRED)

**Solutions**:

**Solution A: Manual Renewal**:

.. code-block:: bash

   # Force certificate renewal
   docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email your-email@university.edu \
     --agree-tos \
     --no-eff-email \
     --force-renewal \
     -d yourdomain.com

   # Reload nginx to use new certificate
   docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

**Solution B: Fix Auto-Renewal**:

.. code-block:: bash

   # Certbot auto-renewal runs every 12 hours via certbot service
   # Check certbot service is running
   docker-compose -f docker-compose.prod.yml ps certbot

   # Check certbot logs
   docker logs lustores_certbot

   # Ensure certbot service is configured for renewal
   docker-compose -f docker-compose.prod.yml restart certbot

**Solution C: Domain Verification Failed**:

.. code-block:: bash

   # Let's Encrypt needs to verify domain ownership via HTTP
   # Ensure /.well-known/acme-challenge/ accessible

   # Test HTTP access (nginx must allow this path)
   curl http://yourdomain.com/.well-known/acme-challenge/test

   # Should return 404 (not 502 or connection refused)

**Prevention**:
   - **Certbot auto-renewal**: Already configured in ``docker-compose.prod.yml``
   - **Monitoring**: Check certificate expiry monthly
   - **Alerts**: Set up reminder 30 days before expiry

Scenario 5: Watchtower Updated and Broke Something
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - System was working, suddenly broken after Watchtower update
   - New Docker image deployed with bugs
   - Need to roll back to previous version

**Diagnosis**:

.. code-block:: bash

   # Check Watchtower logs
   docker logs lustores_watchtower

   # Find recent update timestamp
   # Check app logs for errors after that time
   docker logs lustores_app --since="2025-01-29T10:00:00"

**Solutions**:

**Solution A: Roll Back to Previous Image**:

.. code-block:: bash

   # 1. Stop current containers
   docker-compose -f docker-compose.prod.yml down

   # 2. List recent image versions
   docker images lustores/app --format "{{.ID}}\t{{.CreatedAt}}\t{{.Tag}}"

   # Output:
   # abc123def456    2025-01-29 10:00:00    latest    ← Current (broken)
   # xyz789ghi012    2025-01-28 14:30:00    latest    ← Previous (working)

   # 3. Tag previous image as latest
   docker tag xyz789ghi012 lustores/app:latest

   # 4. Restart services
   docker-compose -f docker-compose.prod.yml up -d

**Solution B: Disable Watchtower Temporarily**:

.. code-block:: bash

   # Stop Watchtower to prevent further updates
   docker-compose -f docker-compose.prod.yml stop watchtower

   # Fix the issue manually
   # Re-enable Watchtower when ready
   docker-compose -f docker-compose.prod.yml start watchtower

**Solution C: Pin Specific Image Version**:

.. code-block:: bash

   # Edit docker-compose.prod.yml
   # Change:
   #   image: lustores/app:latest
   # To:
   #   image: lustores/app:xyz789ghi012  # Specific SHA or tag

   # Restart
   docker-compose -f docker-compose.prod.yml up -d app

**Prevention**:
   - **Staging environment**: Test updates before production
   - **Manual updates**: Disable Watchtower, update manually after testing
   - **Image tagging**: Use semantic versioning (v1.0.0, v1.0.1) instead of ``latest``
   - **Rollback plan**: Always keep previous 3 images

Scenario 6: Disk Space Full
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:
   - Services failing randomly
   - Database can't write
   - Logs show "No space left on device"

**Diagnosis**:

.. code-block:: bash

   # Check disk usage
   df -h

   # Output shows:
   # /dev/sda1    50G   49G   0G   100%  /

   # Check Docker disk usage
   docker system df

**Solutions**:

**Solution A: Clean Old Docker Resources**:

.. code-block:: bash

   # Remove stopped containers
   docker container prune -f

   # Remove unused images (keep recent ones)
   docker image prune -a --filter "until=168h"  # Older than 7 days

   # Remove unused volumes (CAREFUL - may delete data)
   docker volume prune -f

   # Remove unused networks
   docker network prune -f

   # Full cleanup (DANGEROUS - removes ALL unused resources)
   docker system prune -a --volumes -f

**Solution B: Clean Application Logs**:

.. code-block:: bash

   # Truncate Docker container logs
   sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log

   # Or limit log size in docker-compose.prod.yml:
   # logging:
   #   options:
   #     max-size: "10m"
   #     max-file: "3"

**Solution C: Expand Disk**:

.. code-block:: bash

   # For cloud VMs: Expand disk via provider console, then:
   sudo growpart /dev/sda 1
   sudo resize2fs /dev/sda1

**Prevention**:
   - **Monitoring**: Set up disk space alerts at 80% usage
   - **Log rotation**: Configure Docker log limits
   - **Regular cleanup**: Weekly ``docker system prune`` cron job

---

Database Backup and Restore
----------------------------

Creating Backups
~~~~~~~~~~~~~~~~

**Manual Backup** (run before major changes):

.. code-block:: bash

   # Create backup with timestamp
   docker exec lustores_db pg_dump -U postgres inventory > backup-$(date +%Y%m%d-%H%M%S).sql

   # With compression (recommended for large databases)
   docker exec lustores_db pg_dump -U postgres inventory | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

   # Verify backup created
   ls -lh backup-*.sql.gz

**Automated Daily Backups**:

Create ``/root/scripts/backup-database.sh``:

.. code-block:: bash

   #!/bin/bash
   # Daily database backup script

   BACKUP_DIR="/backups/lustores"
   DATE=$(date +%Y%m%d)
   KEEP_DAYS=7

   # Create backup directory
   mkdir -p "$BACKUP_DIR"

   # Create backup
   docker exec lustores_db pg_dump -U postgres inventory | \
     gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"

   # Delete backups older than KEEP_DAYS
   find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +$KEEP_DAYS -delete

   # Log result
   echo "$(date): Backup completed - backup-$DATE.sql.gz" >> /var/log/lustores-backup.log

**Schedule with Cron**:

.. code-block:: bash

   # Edit crontab
   sudo crontab -e

   # Add daily backup at 2 AM
   0 2 * * * /root/scripts/backup-database.sh

Restoring from Backup
~~~~~~~~~~~~~~~~~~~~~~

**Full Database Restore**:

.. code-block:: bash

   # 1. Stop application (prevents new writes)
   docker-compose -f docker-compose.prod.yml stop app

   # 2. Drop existing database (DANGER!)
   docker exec lustores_db psql -U postgres -c "DROP DATABASE IF EXISTS inventory;"

   # 3. Create fresh database
   docker exec lustores_db psql -U postgres -c "CREATE DATABASE inventory;"

   # 4. Restore from backup
   gunzip < backup-20250129.sql.gz | docker exec -i lustores_db psql -U postgres inventory

   # OR without compression:
   cat backup-20250129.sql | docker exec -i lustores_db psql -U postgres inventory

   # 5. Restart application
   docker-compose -f docker-compose.prod.yml start app

**Verify Restore**:

.. code-block:: bash

   # Check database size
   docker exec lustores_db psql -U postgres inventory -c "\dt+"

   # Check recent data
   docker exec lustores_db psql -U postgres inventory -c "SELECT COUNT(*) FROM items;"

   # Test application
   curl http://localhost/health

**Partial Restore** (specific table):

.. code-block:: bash

   # Extract single table from backup
   docker exec lustores_db pg_restore -U postgres -d inventory -t items backup.dump

Backup Best Practices
~~~~~~~~~~~~~~~~~~~~~

1. **3-2-1 Rule**:
   - **3** copies of data (original + 2 backups)
   - **2** different storage media (local disk + cloud storage)
   - **1** off-site backup (cloud or remote server)

2. **Test Restores Monthly**:
   - Verify backups are not corrupted
   - Practice restore procedure
   - Time how long restore takes

3. **Retention Policy**:
   - Daily backups: Keep 7 days
   - Weekly backups: Keep 4 weeks
   - Monthly backups: Keep 12 months

4. **Encryption** (for sensitive data):

   .. code-block:: bash

      # Encrypt backup
      docker exec lustores_db pg_dump -U postgres inventory | \
        gzip | \
        openssl enc -aes-256-cbc -salt -out backup-encrypted.sql.gz.enc

      # Decrypt for restore
      openssl enc -d -aes-256-cbc -in backup-encrypted.sql.gz.enc | \
        gunzip | \
        docker exec -i lustores_db psql -U postgres inventory

---

Complete System Rebuild
------------------------

When All Else Fails
~~~~~~~~~~~~~~~~~~~

**Nuclear Option**: Full system rebuild from backup:

.. code-block:: bash

   # 1. Backup current state (just in case)
   docker exec lustores_db pg_dump -U postgres inventory > emergency-backup.sql

   # 2. Stop and remove all containers
   docker-compose -f docker-compose.prod.yml down -v

   # 3. Remove all volumes (DELETES ALL DATA)
   docker volume rm lustores_postgres_data lustores_redis_data

   # 4. Pull fresh images
   docker-compose -f docker-compose.prod.yml pull

   # 5. Start services
   docker-compose -f docker-compose.prod.yml up -d

   # 6. Wait for database initialization
   sleep 60

   # 7. Restore from backup
   cat backup-latest.sql | docker exec -i lustores_db psql -U postgres inventory

   # 8. Verify system health
   curl https://yourdomain.com/health

   # 9. Test login and basic functionality

---

Emergency Contacts and Escalation
----------------------------------

Contact Tree
~~~~~~~~~~~~

**Level 1 - First Response** (0-15 minutes):
   - Check this document for solutions
   - Attempt quick recovery steps
   - Review recent logs

**Level 2 - System Administrator** (15-30 minutes):
   - Contact: IT Admin (admin@university.edu)
   - Escalate if: Unable to restore service, data corruption suspected
   - Provide: Logs, error messages, steps attempted

**Level 3 - Infrastructure Team** (30-60 minutes):
   - Contact: Infrastructure Team (infrastructure@university.edu)
   - Escalate if: Hardware failure, network issues, disk failure
   - Provide: Full system diagnostics

**Level 4 - Vendor Support** (1+ hours):
   - Contact: Cloud provider support (if cloud-hosted)
   - Escalate if: Platform-level issues, need vendor intervention

Critical Information to Collect
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Before contacting support, gather:

1. **Timeline**:
   - When did issue start?
   - What changed before issue started?
   - What error messages appeared?

2. **Logs** (last 100 lines):

   .. code-block:: bash

      docker logs --tail=100 lustores_app > app-logs.txt
      docker logs --tail=100 lustores_db > db-logs.txt
      docker logs --tail=100 lustores_nginx > nginx-logs.txt

3. **System State**:

   .. code-block:: bash

      docker-compose -f docker-compose.prod.yml ps > containers-status.txt
      df -h > disk-usage.txt
      free -h > memory-usage.txt

4. **Configuration**:
   - .env.prod file (REDACT SECRETS!)
   - docker-compose.prod.yml version
   - Recent changes (from git log or deployment records)

Post-Incident Review
~~~~~~~~~~~~~~~~~~~~

After resolving major incidents:

1. **Document What Happened**:
   - Root cause analysis
   - Timeline of events
   - Resolution steps

2. **Update Procedures**:
   - Add new failure scenario to this document
   - Update runbooks
   - Create preventive measures

3. **Improve Monitoring**:
   - Add alerts for this failure mode
   - Enhance health checks
   - Set up dashboards

4. **Team Review**:
   - Share lessons learned
   - Update training materials
   - Improve response procedures

---

Monitoring and Prevention
--------------------------

Health Monitoring Setup
~~~~~~~~~~~~~~~~~~~~~~~

**Automated Health Checks** (recommended):

.. code-block:: bash

   # Create /root/scripts/health-check.sh
   #!/bin/bash

   HEALTH_URL="https://yourdomain.com/health"
   WEBHOOK="https://your-alerting-webhook.com"

   # Check health endpoint
   HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

   if [ "$HTTP_CODE" != "200" ]; then
     # Send alert
     curl -X POST "$WEBHOOK" \
       -H "Content-Type: application/json" \
       -d "{\"text\":\"LUStores health check failed: HTTP $HTTP_CODE\"}"

     # Log failure
     echo "$(date): Health check failed - HTTP $HTTP_CODE" >> /var/log/lustores-health.log
   fi

**Schedule Health Checks**:

.. code-block:: bash

   # Run every 5 minutes
   */5 * * * * /root/scripts/health-check.sh

Disk Space Monitoring
~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Create /root/scripts/disk-check.sh
   #!/bin/bash

   THRESHOLD=80
   USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

   if [ "$USAGE" -gt "$THRESHOLD" ]; then
     echo "$(date): Disk usage at ${USAGE}% - threshold ${THRESHOLD}%"
     # Send alert
   fi

**Scheduled disk checks**:

.. code-block:: bash

   # Every hour
   0 * * * * /root/scripts/disk-check.sh

---

Quick Reference Card
--------------------

Emergency Commands Cheat Sheet
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # RESTART EVERYTHING
   docker-compose -f docker-compose.prod.yml restart

   # STOP EVERYTHING
   docker-compose -f docker-compose.prod.yml down

   # VIEW LOGS (REAL-TIME)
   docker-compose -f docker-compose.prod.yml logs -f

   # CHECK HEALTH
   curl http://localhost/health

   # BACKUP DATABASE NOW
   docker exec lustores_db pg_dump -U postgres inventory > emergency-backup.sql

   # RESTORE DATABASE
   cat backup.sql | docker exec -i lustores_db psql -U postgres inventory

   # FREE UP DISK SPACE
   docker system prune -a -f

   # REBUILD APP (FRESH START)
   docker-compose -f docker-compose.prod.yml up -d --build --force-recreate app

Common Error Messages
~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Error Message
     - Quick Fix
   * - "502 Bad Gateway"
     - ``docker-compose restart nginx app``
   * - "Connection refused"
     - ``docker-compose up -d db`` (wait 30s)
   * - "No space left"
     - ``docker system prune -a -f``
   * - "Certificate expired"
     - ``docker-compose run certbot renew``
   * - "Port already in use"
     - ``sudo lsof -i :5000`` → kill process
   * - "Database incompatible"
     - Restore from backup (see section above)

---

Additional Resources
--------------------

Related Documentation
~~~~~~~~~~~~~~~~~~~~~

- :doc:`/reference/troubleshooting` - General troubleshooting guide
- :doc:`/admin/backup-restore` - Detailed backup procedures
- :doc:`/deployment/production` - Production deployment guide
- :doc:`/deployment/monitoring` - Advanced monitoring setup
- :doc:`/operations/docker-architecture` - Docker architecture reference

External Resources
~~~~~~~~~~~~~~~~~~

- `Docker Documentation <https://docs.docker.com/>`_
- `PostgreSQL Backup Guide <https://www.postgresql.org/docs/current/backup.html>`_
- `Nginx Troubleshooting <https://nginx.org/en/docs/>`_
- `Let's Encrypt Documentation <https://letsencrypt.org/docs/>`_

---

.. important::
   **Keep This Document Updated**: When you resolve a new type of incident, add it to this guide to help future responders.

.. tip::
   **Print This Page**: Keep a printed copy near your server for offline reference during network outages.
