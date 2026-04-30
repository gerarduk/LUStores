Database Backup and Restore Guide
=================================

This comprehensive guide covers database backup and restoration capabilities for administrators of the University Inventory Management System.

Overview
--------

Database backups are essential for protecting your university's inventory data against:

- Hardware failures and system crashes
- Data corruption or accidental deletion
- Security incidents and ransomware attacks
- Human errors during maintenance
- Software bugs or upgrade issues

The system provides both manual and automated backup capabilities with full restoration options.

Backup Features
---------------

Manual Backups
~~~~~~~~~~~~~~

Create on-demand backups for specific situations:

**When to Create Manual Backups:**
- Before system updates or maintenance
- Prior to major data imports or changes
- Before user training sessions
- As part of disaster recovery testing

**Manual Backup Process:**
1. Navigate to "Database Backups" in the admin menu
2. Click "Create Backup" button
3. Add optional description (e.g., "Before semester data import")
4. Choose compression settings
5. Click "Create Backup" to start the process

Scheduled Automatic Backups
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Configure automated backups to run regularly without manual intervention:

**Default Schedule:**
- Daily backups at 2:00 AM
- Configurable using standard cron expressions
- Automatic cleanup of old backups

**Configuring Backup Schedule:**
1. Go to Database Backups page
2. Click "Schedule" button
3. Enter cron expression or choose preset
4. Click "Start Schedule" to activate

**Common Schedule Examples:**

.. code-block:: text

   Daily at 2 AM:        0 2 * * *
   Weekly on Sunday:     0 2 * * 0
   Twice daily:          0 2,14 * * *
   Every 6 hours:        0 */6 * * *
   Monthly on 1st:       0 2 1 * *

Backup Types and Options
------------------------

Compression Options
~~~~~~~~~~~~~~~~~~~

**Compressed Backups (.backup files):**
- Smaller file size (typically 60-80% reduction)
- Faster transfer and storage
- Custom PostgreSQL format
- Supports selective restoration

**Uncompressed Backups (.sql files):**
- Human-readable SQL format
- Easy to inspect and modify
- Compatible with standard SQL tools
- Larger file size

**Recommendation:** Use compressed backups for regular automated backups and storage efficiency.

Backup Content Options
~~~~~~~~~~~~~~~~~~~~~~

**Full Backup (Default):**
- Complete database schema and data
- All tables, indexes, and constraints
- User accounts and permissions
- Recommended for disaster recovery

**Schema Only:**
- Database structure without data
- Useful for testing and development
- Quick to create and restore
- Good for system architecture backups

**Data Only:**
- Table contents without structure
- Used for data migration scenarios
- Assumes target database exists
- Preserves existing schema modifications

Restoration Process
-------------------

Understanding Restoration
~~~~~~~~~~~~~~~~~~~~~~~~~

Database restoration replaces current data with backup contents. This process:

- **Cannot be undone** once completed
- **Overwrites existing data** (if selected)
- **Requires admin privileges** for security
- **Should be tested** in development first

**Pre-Restoration Checklist:**
1. Verify backup file integrity
2. Ensure no users are actively using the system
3. Create a current backup before restoration
4. Test restoration process in development environment
5. Notify users of planned downtime

Step-by-Step Restoration
~~~~~~~~~~~~~~~~~~~~~~~~

**Restoration Process:**

1. **Select Backup File:**
   - Choose from available backup list
   - Verify creation date and file size
   - Check backup type (manual/scheduled)

2. **Configure Restoration Options:**
   - **Drop Existing Data:** Remove current data before restore
   - **Data Only:** Restore data without changing schema
   - **Schema Only:** Update structure without data

3. **Execute Restoration:**
   - Review settings carefully
   - Click "Restore Database"
   - Monitor progress in logs
   - Verify system functionality

**Restoration Options Explained:**

.. code-block:: text

   Drop Existing Data:
   ✓ Complete replacement of database
   ✓ Cleanest restoration method
   ✗ All current data is lost
   
   Data Only Restore:
   ✓ Preserves schema customizations
   ✓ Updates data to backup state
   ✗ May fail if schema differs
   
   Schema Only Restore:
   ✓ Updates database structure
   ✓ Preserves current data
   ✗ Data may become inconsistent

Backup Management
-----------------

Monitoring Backup Health
~~~~~~~~~~~~~~~~~~~~~~~~

**Backup Statistics Dashboard:**
- Total number of backups
- Combined storage usage
- Oldest and newest backup dates
- Count of manual vs. scheduled backups

**Regular Monitoring Tasks:**
- Review backup success/failure logs
- Check available storage space
- Verify backup file integrity
- Test restoration procedures quarterly

**Warning Signs:**
- Backup failures for multiple days
- Rapidly increasing backup sizes
- Storage space running low
- Old backups not being cleaned up

Storage Management
~~~~~~~~~~~~~~~~~~

**Automatic Cleanup:**
- Keeps last 30 backups by default (configurable)
- Automatically removes oldest backups
- Preserves at least one backup always
- Runs after each new backup creation

**Manual Cleanup:**
- Delete specific backup files
- Remove corrupted or invalid backups
- Clean up after testing or migration
- Free storage space when needed

**Storage Recommendations:**
- Monitor backup directory size regularly
- Ensure adequate free space (3x largest backup)
- Consider external storage for long-term retention
- Implement offsite backup strategy

Configuration and Environment Variables
---------------------------------------

Backup Configuration
~~~~~~~~~~~~~~~~~~~~

**Environment Variables:**

.. code-block:: bash

   # Backup directory location
   BACKUP_DIR=/app/backups
   
   # Maximum number of backups to retain
   MAX_BACKUPS=30
   
   # Default backup schedule (cron format)
   BACKUP_SCHEDULE="0 2 * * *"
   
   # Enable/disable automatic backups
   ENABLE_AUTO_BACKUP=true
   
   # Timezone for scheduled backups
   TZ=America/New_York

**Database Connection:**
Standard PostgreSQL environment variables are used:

.. code-block:: bash

   PGHOST=database.university.edu
   PGPORT=5432
   PGUSER=inventory_user
   PGPASSWORD=secure_password
   PGDATABASE=university_inventory

Docker Configuration
~~~~~~~~~~~~~~~~~~~~

**Volume Mounts:**
Ensure backup directory is persistent:

.. code-block:: yaml

   services:
     app:
       volumes:
         - ./backups:/app/backups
         - ./data:/app/data
       environment:
         - BACKUP_DIR=/app/backups
         - MAX_BACKUPS=30

**Backup Directory Permissions:**
The application needs read/write access to the backup directory.

Security Considerations
-----------------------

Access Control
~~~~~~~~~~~~~~

**Backup Access Restrictions:**
- Only admin users can create/restore backups
- All backup operations are logged
- Backup files contain sensitive data
- Secure storage location required

**Authentication Requirements:**
- Valid admin session required
- Multi-factor authentication recommended
- Regular access review and audit
- Principle of least privilege

Data Protection
~~~~~~~~~~~~~~~

**Backup File Security:**
- Store backups in secure, encrypted location
- Limit filesystem access to backup directory
- Regular security scans of backup files
- Offsite backup encryption

**Network Security:**
- Use encrypted connections for backup transfer
- VPN access for remote backup management
- Firewall rules for backup services
- Regular security updates

Disaster Recovery Planning
--------------------------

Recovery Scenarios
~~~~~~~~~~~~~~~~~~

**Common Recovery Situations:**

**Hardware Failure:**
1. Set up new server/database
2. Install application
3. Restore latest backup
4. Verify data integrity
5. Resume operations

**Data Corruption:**
1. Identify corruption scope
2. Stop user access immediately
3. Restore from pre-corruption backup
4. Validate restored data
5. Investigate corruption cause

**Ransomware Attack:**
1. Isolate affected systems
2. Assess backup integrity
3. Restore from clean backup
4. Strengthen security measures
5. Report incident appropriately

Recovery Time Objectives
~~~~~~~~~~~~~~~~~~~~~~~~

**Planning Targets:**

.. code-block:: text

   Recovery Time Objective (RTO):
   - Critical systems: 4 hours
   - Normal operations: 24 hours
   - Full functionality: 48 hours
   
   Recovery Point Objective (RPO):
   - Maximum data loss: 24 hours
   - Daily backups minimize loss
   - Consider more frequent backups for high-activity periods

**Testing Requirements:**
- Quarterly disaster recovery tests
- Annual full recovery simulation
- Document all procedures and results
- Train multiple staff members

Troubleshooting Common Issues
-----------------------------

Backup Failures
~~~~~~~~~~~~~~~

**Common Causes and Solutions:**

**Insufficient Disk Space:**
- Monitor available storage
- Clean up old backups manually
- Increase backup directory storage
- Implement storage alerts

**Database Connection Issues:**
- Verify PostgreSQL credentials
- Check network connectivity
- Confirm database accessibility
- Review firewall rules

**Permission Problems:**
- Check backup directory permissions
- Verify PostgreSQL user privileges
- Ensure application file access
- Review Docker volume mounts

Restoration Failures
~~~~~~~~~~~~~~~~~~~~

**Troubleshooting Steps:**

**Invalid Backup File:**
- Verify file is not corrupted
- Check file size and format
- Test with backup validation tool
- Try alternative backup file

**Schema Conflicts:**
- Review restoration options
- Use "drop existing" for clean restore
- Check for custom schema modifications
- Consider schema-only restoration first

**Insufficient Privileges:**
- Verify admin user permissions
- Check database user privileges
- Ensure restoration user rights
- Review PostgreSQL grants

**Getting Help:**

For backup and restoration issues:
1. Check application logs for specific errors
2. Verify environment configuration
3. Test with smaller backup files
4. Contact database administrator
5. Review PostgreSQL documentation

This backup system ensures your university's inventory data is protected and recoverable in any situation. Regular backups and tested restoration procedures are essential for maintaining data integrity and business continuity.