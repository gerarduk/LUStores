===================================
Quick Reference Handbook (QRH)
===================================

.. important::
   This Quick Reference Handbook provides step-by-step procedures for common issues.
   **No technical expertise required** - just follow the checklists carefully.

How to Use This Guide
======================

1. **Identify the problem** from the table of contents below
2. **Follow the checklist** step-by-step - don't skip steps
3. **Check each box** as you complete it
4. **If problem persists**, contact IT support with the procedure you tried

Emergency Contact
=================

📞 **IT Support Hotline**: [Your IT Support Number]
📧 **Email**: inventory-support@university.edu
🌐 **Server Location**: [Your VM hostname/IP]

.. danger::
   **EMERGENCY ONLY**: If the system is completely down and users cannot access critical data,
   call IT support immediately before attempting any procedures.

Quick Problem Finder
====================

.. list-table:: Find Your Problem
   :header-rows: 1
   :widths: 40 60

   * - Problem
     - Procedure
   * - Cannot access website
     - :ref:`qrh-cannot-access`
   * - Website is slow
     - :ref:`qrh-slow-performance`
   * - Login not working
     - :ref:`qrh-login-failed`
   * - Database connection errors
     - :ref:`qrh-database-error`
   * - SSL/HTTPS certificate expired
     - :ref:`qrh-ssl-expired`
   * - Disk space full
     - :ref:`qrh-disk-full`
   * - Service crashed/not responding
     - :ref:`qrh-service-crashed`
   * - Need to create backup
     - :ref:`qrh-create-backup`
   * - Need to restore from backup
     - :ref:`qrh-restore-backup`
   * - Container keeps restarting
     - :ref:`qrh-container-restart`
   * - Application showing errors
     - :ref:`qrh-app-errors`

.. _qrh-cannot-access:

CANNOT ACCESS WEBSITE
=======================

**Symptoms**: Users report website is down, shows "Connection refused" or "Cannot connect"

Checklist
---------

☐ **Step 1**: Open terminal/SSH to the server

☐ **Step 2**: Check if Docker containers are running::

    cd /data/LUStores
    docker compose -f docker-compose.prod.yml ps

☐ **Step 3**: Look at the STATUS column:

   - If you see "Up" for all services → Go to Step 6
   - If any service shows "Exit" or "Restarting" → Continue to Step 4

☐ **Step 4**: Check which service is down:

   - If **nginx** is down → Go to :ref:`qrh-nginx-down`
   - If **app** is down → Go to :ref:`qrh-app-down`
   - If **db** is down → Go to :ref:`qrh-db-down`

☐ **Step 5**: Restart all services::

    docker compose -f docker-compose.prod.yml restart

☐ **Step 6**: Wait 60 seconds for services to start

☐ **Step 7**: Test website access in browser

☐ **Step 8**: If still not working, check firewall::

    # Check if ports 80 and 443 are open
    sudo ufw status

☐ **Step 9**: If firewall is blocking, open ports::

    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

☐ **Step 10**: Test again. If still failing → **Contact IT Support**

.. _qrh-nginx-down:

NGINX SERVICE DOWN
------------------

☐ **Step 1**: Check nginx logs::

    docker compose -f docker-compose.prod.yml logs --tail=50 nginx

☐ **Step 2**: Look for error messages (write them down for IT if needed)

☐ **Step 3**: Restart nginx::

    docker compose -f docker-compose.prod.yml restart nginx

☐ **Step 4**: Wait 30 seconds

☐ **Step 5**: Check status::

    docker compose -f docker-compose.prod.yml ps nginx

☐ **Step 6**: If still not "Up" → **Contact IT Support** with the error messages from Step 2

.. _qrh-app-down:

APPLICATION SERVICE DOWN
------------------------

☐ **Step 1**: Check application logs::

    docker compose -f docker-compose.prod.yml logs --tail=50 app

☐ **Step 2**: Look for error messages mentioning:

   - "Database" → Database might be the problem, check :ref:`qrh-db-down`
   - "Port already in use" → Port conflict, continue below
   - Other errors → Write them down for IT support

☐ **Step 3**: Restart application::

    docker compose -f docker-compose.prod.yml restart app

☐ **Step 4**: Wait 60 seconds (app takes longer to start)

☐ **Step 5**: Check status::

    docker compose -f docker-compose.prod.yml ps app

☐ **Step 6**: Check health::

    curl http://localhost:5000/health

☐ **Step 7**: If you see ``{"status":"healthy"}`` → Success!

☐ **Step 8**: If still failing → **Contact IT Support**

.. _qrh-db-down:

DATABASE SERVICE DOWN
---------------------

.. danger::
   **CAUTION**: Database contains all critical data. Follow carefully.

☐ **Step 1**: Check database logs::

    docker compose -f docker-compose.prod.yml logs --tail=100 db

☐ **Step 2**: Look for specific errors:

   - "disk full" or "no space" → Go to :ref:`qrh-disk-full`
   - "permission denied" → Permission issue, go to Step 4
   - "corrupted" → **STOP - Contact IT Support immediately**

☐ **Step 3**: Check disk space::

    df -h /db

☐ **Step 4**: If permission errors, fix ownership::

    sudo chown -R 999:999 /db

☐ **Step 5**: Restart database::

    docker compose -f docker-compose.prod.yml restart db

☐ **Step 6**: Wait 30 seconds for initialization

☐ **Step 7**: Check if database is accepting connections::

    docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres

☐ **Step 8**: If you see "accepting connections" → Success!

☐ **Step 9**: If database won't start → **Contact IT Support immediately**

.. _qrh-slow-performance:

WEBSITE IS SLOW
===============

**Symptoms**: Pages load slowly, timeouts, users complaining about performance

Checklist
---------

☐ **Step 1**: Check server CPU and memory::

    top

   Press 'q' to exit

☐ **Step 2**: Look at "%CPU" and "%MEM" columns:

   - If any process shows >90% CPU → Performance issue, continue below
   - If memory is low → Go to :ref:`qrh-memory-low`

☐ **Step 3**: Check Docker container resource usage::

    docker stats --no-stream

☐ **Step 4**: Check for high disk I/O::

    iostat -x 1 3

☐ **Step 5**: Check database connections::

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory \
        -c "SELECT COUNT(*) FROM pg_stat_activity;"

   - If > 50 connections → Too many connections

☐ **Step 6**: Restart application to clear connections::

    docker compose -f docker-compose.prod.yml restart app

☐ **Step 7**: Clear Redis cache::

    docker compose -f docker-compose.prod.yml restart redis

☐ **Step 8**: Test performance

☐ **Step 9**: If still slow → **Contact IT Support**

.. _qrh-login-failed:

LOGIN NOT WORKING
=================

**Symptoms**: Users cannot log in, authentication errors, "Invalid credentials"

Checklist
---------

☐ **Step 1**: Verify credentials are correct (try known admin account)

☐ **Step 2**: Check replit-auth service is running::

    docker compose -f docker-compose.prod.yml ps replit-auth

☐ **Step 3**: If not running, restart it::

    docker compose -f docker-compose.prod.yml restart replit-auth

☐ **Step 4**: Check auth service logs::

    docker compose -f docker-compose.prod.yml logs --tail=50 replit-auth

☐ **Step 5**: Verify environment configuration::

    # Check JWT_SECRET is set in .env.prod (should be long random string)
    grep JWT_SECRET .env.prod

☐ **Step 6**: Test auth service health::

    curl http://localhost:3001/health

☐ **Step 7**: If unhealthy, restart both app and auth::

    docker compose -f docker-compose.prod.yml restart replit-auth app

☐ **Step 8**: Wait 60 seconds, then test login

☐ **Step 9**: If still failing → Check database for user::

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory \
        -c "SELECT email, role FROM users LIMIT 5;"

☐ **Step 10**: If no users exist, see :doc:`/admin/first-admin-setup`

.. _qrh-database-error:

DATABASE CONNECTION ERRORS
==========================

**Symptoms**: "Could not connect to database", "Connection refused", database timeout errors

Checklist
---------

☐ **Step 1**: Verify database container is running::

    docker compose -f docker-compose.prod.yml ps db

☐ **Step 2**: Check database logs::

    docker compose -f docker-compose.prod.yml logs --tail=100 db

☐ **Step 3**: Test database connection::

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory -c "SELECT 1;"

☐ **Step 4**: If connection fails, check DATABASE_URL in .env.prod::

    grep DATABASE_URL .env.prod

   Should look like: ``postgresql://postgres:PASSWORD@db:5432/university_inventory``

☐ **Step 5**: Verify database password matches::

    grep DB_PASSWORD .env.prod
    grep POSTGRES_PASSWORD .env.prod

   These should be the same!

☐ **Step 6**: If passwords don't match, update .env.prod

☐ **Step 7**: Restart services::

    docker compose -f docker-compose.prod.yml restart db app

☐ **Step 8**: Wait 60 seconds

☐ **Step 9**: Test application health::

    curl http://localhost:5000/health

☐ **Step 10**: If still failing → **Contact IT Support**

.. _qrh-ssl-expired:

SSL CERTIFICATE EXPIRED
========================

**Symptoms**: Browser shows "Certificate expired", "Not secure", HTTPS warnings

Checklist
---------

☐ **Step 1**: Check certificate expiration::

    docker compose -f docker-compose.prod.yml exec certbot \
        certbot certificates

☐ **Step 2**: Note the expiration date

☐ **Step 3**: If expired, renew manually::

    docker compose -f docker-compose.prod.yml exec certbot \
        certbot renew --force-renewal

☐ **Step 4**: Wait for renewal to complete (2-3 minutes)

☐ **Step 5**: Reload nginx to use new certificate::

    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

☐ **Step 6**: Test in browser (you may need to clear browser cache)

☐ **Step 7**: If renewal failed, check certbot logs::

    docker compose -f docker-compose.prod.yml logs certbot

☐ **Step 8**: Common issues:

   - **Rate limit**: Wait 7 days, use existing cert
   - **DNS not pointing to server**: Fix DNS records
   - **Port 80 blocked**: Ensure port 80 is open

☐ **Step 9**: If cannot resolve → **Contact IT Support**

.. _qrh-disk-full:

DISK SPACE FULL
===============

**Symptoms**: "No space left on device", database write errors, backup failures

Checklist
---------

☐ **Step 1**: Check disk usage::

    df -h

☐ **Step 2**: Identify which partition is full:

   - If ``/db`` is full → Database partition full, continue Step 3
   - If ``/`` (root) is full → System partition full, go to Step 6

☐ **Step 3**: Check database size::

    du -sh /db

☐ **Step 4**: Clean up old database logs::

    docker compose -f docker-compose.prod.yml exec db \
        find /var/lib/postgresql/data/pg_log -name "*.log" -mtime +7 -delete

☐ **Step 5**: Vacuum database to reclaim space::

    docker compose -f docker-compose.prod.yml exec db \
        psql -U postgres -d university_inventory -c "VACUUM FULL;"

   **Warning**: This locks tables, do during low usage

☐ **Step 6**: Clean up old Docker images::

    docker system prune -a --volumes

   Type ``y`` when prompted

☐ **Step 7**: Clean up old backups::

    # Keep only last 10 backups
    cd /data/LUStores/backups
    ls -t | tail -n +11 | xargs -r rm

☐ **Step 8**: Clean up logs::

    find ./logs -name "*.log" -mtime +30 -delete

☐ **Step 9**: Check disk space again::

    df -h

☐ **Step 10**: If still full → **Contact IT Support** to expand disk

.. _qrh-service-crashed:

SERVICE CRASHED / NOT RESPONDING
=================================

**Symptoms**: Container shows "Restarting" or "Exit 1", service keeps crashing

Checklist
---------

☐ **Step 1**: Identify which service is crashing::

    docker compose -f docker-compose.prod.yml ps

☐ **Step 2**: Check logs for the crashing service::

    docker compose -f docker-compose.prod.yml logs --tail=100 [SERVICE_NAME]

   Replace [SERVICE_NAME] with: app, db, nginx, replit-auth, redis

☐ **Step 3**: Look for specific error patterns:

   - **"Out of memory"** → Go to :ref:`qrh-memory-low`
   - **"Port already in use"** → Port conflict, go to Step 5
   - **"Permission denied"** → Permission issue, go to Step 6
   - **"Connection refused"** → Dependency not ready, go to Step 7

☐ **Step 4**: Take note of the error message for IT support

☐ **Step 5**: If port conflict, find and stop conflicting process::

    sudo lsof -i :5000  # or whichever port is conflicting
    # Kill the process if it's not Docker

☐ **Step 6**: If permission error, fix ownership::

    sudo chown -R $(whoami):$(whoami) .
    sudo chown -R 999:999 /db

☐ **Step 7**: If dependency issue, restart in order::

    docker compose -f docker-compose.prod.yml stop
    docker compose -f docker-compose.prod.yml up -d db redis
    sleep 30
    docker compose -f docker-compose.prod.yml up -d

☐ **Step 8**: Monitor restart attempts::

    docker compose -f docker-compose.prod.yml ps
    watch -n 2 'docker compose -f docker-compose.prod.yml ps'

   Press Ctrl+C to exit watch

☐ **Step 9**: If service stabilizes (shows "Up") → Success!

☐ **Step 10**: If keeps crashing → **Contact IT Support** with error log from Step 2

.. _qrh-create-backup:

CREATE BACKUP (Emergency)
==========================

**When to use**: Before major changes, emergency backup before maintenance

Checklist
---------

☐ **Step 1**: Navigate to project directory::

    cd /data/LUStores

☐ **Step 2**: Create backup directory if needed::

    mkdir -p backups

☐ **Step 3**: Create timestamped backup::

    docker compose -f docker-compose.prod.yml exec -T db \
        pg_dump -U postgres university_inventory \
        | gzip > "backups/emergency_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

☐ **Step 4**: Verify backup was created::

    ls -lh backups/ | tail -1

☐ **Step 5**: Check file size is reasonable (should be > 1MB for existing system)

☐ **Step 6**: Copy backup to safe location::

    # Example: Copy to your home directory
    cp backups/emergency_backup_*.sql.gz ~/

☐ **Step 7**: Note the backup filename for reference

☐ **Step 8**: Backup complete!

.. note::
   For comprehensive backups including configuration, see :doc:`backup-restore`

.. _qrh-restore-backup:

RESTORE FROM BACKUP (Emergency)
================================

.. danger::
   **CRITICAL**: This will overwrite current data!
   Only use if data is corrupted or you need to roll back changes.

Checklist
---------

☐ **Step 1**: **CONFIRM** you want to restore (this cannot be undone!)

☐ **Step 2**: List available backups::

    ls -lh backups/

☐ **Step 3**: Note the filename of the backup you want to restore

☐ **Step 4**: Stop the application (keeps database running)::

    docker compose -f docker-compose.prod.yml stop app

☐ **Step 5**: Restore database::

    gunzip -c backups/[BACKUP_FILENAME].sql.gz | \
        docker compose -f docker-compose.prod.yml exec -T db \
        psql -U postgres -d university_inventory

   Replace [BACKUP_FILENAME] with actual filename from Step 3

☐ **Step 6**: Wait for restore to complete (may take several minutes)

☐ **Step 7**: Start application::

    docker compose -f docker-compose.prod.yml start app

☐ **Step 8**: Wait 60 seconds for application to initialize

☐ **Step 9**: Test website access and login

☐ **Step 10**: Verify data looks correct

☐ **Step 11**: If successful → Restoration complete!

☐ **Step 12**: If failed → **Contact IT Support immediately**

.. _qrh-container-restart:

CONTAINER KEEPS RESTARTING
===========================

**Symptoms**: Container status shows "Restarting", never stays up

Checklist
---------

☐ **Step 1**: Watch container status::

    watch -n 2 'docker compose -f docker-compose.prod.yml ps'

☐ **Step 2**: Note which container is restarting

☐ **Step 3**: Check health check status::

    docker inspect [CONTAINER_NAME] | grep -A 10 "Health"

☐ **Step 4**: Follow logs in real-time::

    docker compose -f docker-compose.prod.yml logs -f [SERVICE_NAME]

☐ **Step 5**: Look for startup errors or crash patterns

☐ **Step 6**: Common restart causes:

   - **Health check failing** → Service starts but fails health check
   - **Crash on startup** → Application error prevents start
   - **Resource limits** → Out of memory or CPU

☐ **Step 7**: If health check failing::

    # Temporarily disable health check by commenting out in docker-compose.prod.yml
    # Then restart service

☐ **Step 8**: If crashing on startup → Check dependency services are healthy

☐ **Step 9**: Check system resources::

    free -h  # Memory
    df -h    # Disk

☐ **Step 10**: If cannot stabilize → **Contact IT Support** with logs from Step 4

.. _qrh-app-errors:

APPLICATION SHOWING ERRORS
===========================

**Symptoms**: Users see error messages, 500 errors, application not functioning correctly

Checklist
---------

☐ **Step 1**: Check application logs::

    docker compose -f docker-compose.prod.yml logs --tail=200 app

☐ **Step 2**: Look for patterns:

   - **Database errors** → Go to :ref:`qrh-database-error`
   - **Authentication errors** → Go to :ref:`qrh-login-failed`
   - **File/permission errors** → Continue Step 3
   - **Specific error message** → Note it for Step 8

☐ **Step 3**: Check file permissions::

    ls -la /data/LUStores

☐ **Step 4**: Fix if needed::

    sudo chown -R $(whoami):$(whoami) /data/LUStores

☐ **Step 5**: Check environment configuration::

    # Verify .env.prod exists and has correct permissions
    ls -la .env.prod

☐ **Step 6**: Restart application::

    docker compose -f docker-compose.prod.yml restart app

☐ **Step 7**: Wait 60 seconds and test

☐ **Step 8**: If specific error, search this documentation for the error message

☐ **Step 9**: If still showing errors → **Contact IT Support** with error details from Step 2

.. _qrh-memory-low:

MEMORY ISSUES
=============

**Symptoms**: "Out of memory", system very slow, services crashing randomly

Checklist
---------

☐ **Step 1**: Check memory usage::

    free -h

☐ **Step 2**: Check what's using memory::

    docker stats --no-stream

☐ **Step 3**: Restart memory-intensive services::

    docker compose -f docker-compose.prod.yml restart app redis

☐ **Step 4**: Clear system cache::

    sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

☐ **Step 5**: Check for memory leaks::

    docker stats

   Press Ctrl+C after watching for 1 minute

☐ **Step 6**: If memory keeps growing → Restart all services::

    docker compose -f docker-compose.prod.yml restart

☐ **Step 7**: Consider adding swap space (temporary fix)::

    # Check current swap
    swapon --show

☐ **Step 8**: If no swap or insufficient → **Contact IT Support** to add RAM or swap

Preventive Maintenance
=======================

Weekly Checks
-------------

Perform these checks weekly to prevent problems:

☐ Check disk space::

    df -h

☐ Check Docker container health::

    docker compose -f docker-compose.prod.yml ps

☐ Verify backup created successfully::

    ls -lh backups/ | tail -5

☐ Check for security updates::

    sudo apt update && sudo apt list --upgradable

☐ Review application logs for errors::

    docker compose -f docker-compose.prod.yml logs --tail=100 app | grep -i error

Monthly Checks
--------------

☐ Test backup restore procedure (see :doc:`backup-restore`)

☐ Review SSL certificate expiration::

    docker compose -f docker-compose.prod.yml exec certbot certbot certificates

☐ Clean up old logs and backups

☐ Check for Docker image updates::

    docker compose -f docker-compose.prod.yml pull

☐ Review system performance and capacity planning

Common Error Messages & Solutions
===================================

.. list-table:: Error Reference
   :header-rows: 1
   :widths: 40 60

   * - Error Message
     - Solution
   * - "Connection refused"
     - Service not running → :ref:`qrh-cannot-access`
   * - "No space left on device"
     - Disk full → :ref:`qrh-disk-full`
   * - "Certificate has expired"
     - SSL expired → :ref:`qrh-ssl-expired`
   * - "Could not connect to database"
     - Database issue → :ref:`qrh-database-error`
   * - "Out of memory"
     - Memory issue → :ref:`qrh-memory-low`
   * - "Permission denied"
     - Fix permissions → ``sudo chown -R 999:999 /db``
   * - "Port already in use"
     - Port conflict → Check logs and restart services
   * - "Authentication failed"
     - Login problem → :ref:`qrh-login-failed`
   * - "Healthcheck failed"
     - Service unhealthy → Check logs and restart service

Escalation to IT Support
=========================

When to Contact IT Support
---------------------------

Contact IT support if:

- ❌ Following these procedures didn't fix the problem
- ❌ You see "corrupted" or "fatal" errors
- ❌ System has been down for > 15 minutes
- ❌ Data appears to be lost or corrupted
- ❌ You're unsure about any procedure

Information to Provide
-----------------------

When contacting IT support, provide:

1. **What went wrong**: Describe the problem and symptoms
2. **What you tried**: List procedures from this QRH you attempted
3. **Error messages**: Copy exact error messages you saw
4. **Logs**: Run this command and send output::

    docker compose -f docker-compose.prod.yml logs --tail=200 > ~/lustores-logs.txt

5. **System status**::

    docker compose -f docker-compose.prod.yml ps > ~/lustores-status.txt

6. **Disk space**::

    df -h > ~/lustores-disk.txt

Then send these three files (lustores-logs.txt, lustores-status.txt, lustores-disk.txt) to IT support.

Related Documentation
=====================

- :doc:`docker-architecture` - Understanding the system
- :doc:`backup-restore` - Detailed backup and restore procedures
- :doc:`/deployment/monitoring` - System monitoring
- :doc:`/reference/troubleshooting` - Advanced troubleshooting
