=========================================
Docker Hub Account Migration Guide
=========================================

.. important::
   This guide helps you migrate from the development Docker Hub account (``st7ma784``)
   to your organization's production Docker Hub account. Follow all steps carefully to ensure a smooth transition.

Overview
========

When moving LUStores from development to production, you'll need to change the Docker Hub account that hosts your Docker images. This involves updating configuration files, GitHub secrets, and rebuilding images.

**What needs to change:**
- Docker image names in docker-compose files
- GitHub Actions secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN)
- CI/CD workflow configurations
- Documentation references

**Estimated time:** 30-45 minutes

Prerequisites
=============

Before You Begin
----------------

☐ **Docker Hub Production Account Created**
   - Organization or personal account set up
   - Login credentials available
   - Repository created (optional - will auto-create on first push)

☐ **GitHub Repository Access**
   - Admin or maintainer permissions on GitHub repo
   - Ability to manage repository secrets

☐ **Production Environment Access**
   - SSH access to production VM
   - Docker access on production server

☐ **Backup Created**
   - Current production database backed up (see :doc:`backup-restore`)
   - Current .env.prod file backed up

Information You'll Need
-----------------------

Gather this information before starting:

.. list-table:: Required Information
   :header-rows: 1
   :widths: 30 70

   * - Item
     - Value
   * - New Docker Hub username
     - ``___________________________``
   * - New Docker Hub token/password
     - ``___________________________``
   * - Main app image name
     - ``<username>/lustores`` (or custom name)
   * - Auth service image name
     - ``<username>/replitauth`` (or custom name)

Migration Checklist
===================

Complete Migration Steps
------------------------

Follow this checklist in order. Check each box as you complete it.

Phase 1: Local Configuration (15 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 1.1: Update docker-compose.prod.yml**

Update image names in production compose file::

   # File: docker-compose.prod.yml
   # Line 111 - Change app image
   OLD: image: st7ma784/lustores:latest
   NEW: image: YOUR_DOCKERHUB_USERNAME/lustores:latest

   # Line 149 - Change replit-auth image
   OLD: image: st7ma784/replitauth:latest
   NEW: image: YOUR_DOCKERHUB_USERNAME/replitauth:latest

**Exact changes:**

.. code-block:: yaml
   :emphasize-lines: 2,8

   # Around line 111
   app:
     image: YOUR_DOCKERHUB_USERNAME/lustores:latest
     # ... rest of config

   # Around line 149
   replit-auth:
     image: YOUR_DOCKERHUB_USERNAME/replitauth:latest
     # ... rest of config

☐ **Step 1.2: Check other docker-compose files**

If you use these files, update them too::

   # File: docker-compose.aws.yml (if exists)
   # Search for st7ma784 and replace with your username

   # File: docker-compose.github-runners.yml (if exists)
   # Search for st7ma784 and replace with your username

☐ **Step 1.3: Update README.md badge** (optional)

Update GitHub Actions badge URL::

   # File: README.md
   # Line 3
   OLD: [![Comprehensive CI/CD Pipeline](https://github.com/st7ma784/LUStores/...
   NEW: [![Comprehensive CI/CD Pipeline](https://github.com/YOUR_ORG/LUStores/...

Phase 2: GitHub Configuration (10 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 2.1: Update GitHub Secrets**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Update these secrets:

.. list-table:: GitHub Secrets to Update
   :header-rows: 1
   :widths: 40 60

   * - Secret Name
     - New Value
   * - ``DOCKERHUB_USERNAME``
     - Your new Docker Hub username
   * - ``DOCKERHUB_TOKEN``
     - Your new Docker Hub access token

**How to create Docker Hub access token:**

1. Log in to https://hub.docker.com
2. Click your username → **Account Settings**
3. Click **Security** → **New Access Token**
4. Name: ``github-actions-lustores``
5. Permissions: **Read, Write, Delete**
6. Copy the token (shown only once!)
7. Save token as ``DOCKERHUB_TOKEN`` in GitHub Secrets

☐ **Step 2.2: Verify Workflow Files**

The new simplified workflows (created in this update) already use secrets properly.
No changes needed to these files:

- ``.github/workflows/docker-build-push.yml`` ✅ (uses ``${{ secrets.DOCKERHUB_USERNAME }}``)
- ``.github/workflows/docs.yml`` ✅ (no Docker Hub references)
- ``.github/workflows/tests.yml`` ✅ (no Docker Hub references)

**If you still have old workflows**, check them:

- ``.github/workflows/main.yml`` (uses secrets - OK, but consider deleting)
- ``.github/workflows/e2e-tests.yml`` (no Docker Hub references)

Phase 3: Build and Push Images (15 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 3.1: Login to new Docker Hub account locally**

On your development machine or CI environment::

   docker login
   # Enter your new Docker Hub username and password/token

☐ **Step 3.2: Build images locally**

Build both images with new names::

   cd /data/LUStores

   # Build main app image
   docker build -t YOUR_DOCKERHUB_USERNAME/lustores:latest \
     --target production .

   # Build replit-auth image
   docker build -t YOUR_DOCKERHUB_USERNAME/replitauth:latest \
     ./docker/replit-auth

☐ **Step 3.3: Tag images**

Create version tags for better tracking::

   # Tag with version
   docker tag YOUR_DOCKERHUB_USERNAME/lustores:latest \
     YOUR_DOCKERHUB_USERNAME/lustores:v1.0.0

   docker tag YOUR_DOCKERHUB_USERNAME/replitauth:latest \
     YOUR_DOCKERHUB_USERNAME/replitauth:v1.0.0

☐ **Step 3.4: Push to new Docker Hub account**

::

   # Push main app
   docker push YOUR_DOCKERHUB_USERNAME/lustores:latest
   docker push YOUR_DOCKERHUB_USERNAME/lustores:v1.0.0

   # Push auth service
   docker push YOUR_DOCKERHUB_USERNAME/replitauth:latest
   docker push YOUR_DOCKERHUB_USERNAME/replitauth:v1.0.0

☐ **Step 3.5: Verify images on Docker Hub**

1. Go to https://hub.docker.com
2. Navigate to your repositories
3. Verify you see:
   - ``YOUR_DOCKERHUB_USERNAME/lustores`` with ``latest`` and ``v1.0.0`` tags
   - ``YOUR_DOCKERHUB_USERNAME/replitauth`` with ``latest`` and ``v1.0.0`` tags

Phase 4: Production Deployment (10 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 4.1: Backup current production**

Before making changes, backup everything::

   cd /data/LUStores

   # Backup database (CRITICAL!)
   docker compose -f docker-compose.prod.yml exec -T db \
     pg_dump -U postgres university_inventory \
     | gzip > "backups/pre_dockerhub_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

   # Backup .env.prod
   cp .env.prod .env.prod.backup

☐ **Step 4.2: Update production files**

On production server::

   cd /data/LUStores

   # Pull latest code with updated docker-compose.prod.yml
   git pull origin main

   # Or manually edit docker-compose.prod.yml if not committed yet
   nano docker-compose.prod.yml
   # Update image names as in Step 1.1

☐ **Step 4.3: Pull new images**

::

   # Login to new Docker Hub account on production server
   docker login
   # Enter new credentials

   # Pull new images
   docker compose -f docker-compose.prod.yml pull

☐ **Step 4.4: Restart services with new images**

::

   # Stop current services
   docker compose -f docker-compose.prod.yml down

   # Start with new images
   docker compose -f docker-compose.prod.yml up -d

   # Wait 60 seconds for services to initialize
   sleep 60

☐ **Step 4.5: Verify production is working**

::

   # Check all services are running
   docker compose -f docker-compose.prod.yml ps

   # Check logs for errors
   docker compose -f docker-compose.prod.yml logs -f app --tail=50

   # Test website
   curl https://your-domain.com/health

   # Test login in browser

Phase 5: GitHub Actions Verification (5 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 5.1: Trigger workflow manually**

1. Go to GitHub → **Actions** tab
2. Select **Docker Build & Push** workflow
3. Click **Run workflow** → Run on main branch
4. Monitor the workflow execution

☐ **Step 5.2: Verify workflow success**

The workflow should:
- ✅ Build both images
- ✅ Tag them correctly
- ✅ Push to your new Docker Hub account
- ✅ Complete without errors

☐ **Step 5.3: Check automated pushes work**

Make a small change and push to main::

   # Make a trivial change
   echo "# Docker Hub migration completed" >> HANDOVER_SUMMARY.md

   git add HANDOVER_SUMMARY.md
   git commit -m "Test: Verify Docker Hub integration"
   git push origin main

   # Watch Actions tab - workflow should trigger automatically

Phase 6: Documentation Updates (5 min)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

☐ **Step 6.1: Update documentation references**

Update these documentation files to reference your new Docker Hub account:

.. code-block:: bash

   # Files to update:
   # - docs/operations/docker-architecture.rst
   # - docs/operations/backup-restore.rst
   # - docs/deployment/production.rst
   # - HANDOVER_SUMMARY.md

   # Use find and replace
   cd /data/LUStores
   grep -r "st7ma784" docs/ HANDOVER_SUMMARY.md

   # Update each file manually or with sed:
   find docs/ HANDOVER_SUMMARY.md -type f -exec sed -i 's/st7ma784/YOUR_USERNAME/g' {} +

☐ **Step 6.2: Commit documentation changes**

::

   git add docs/ HANDOVER_SUMMARY.md README.md
   git commit -m "docs: Update Docker Hub references to production account"
   git push origin main

Migration Verification
======================

Post-Migration Checks
---------------------

After completing all phases, verify everything works:

☐ **Production Application**
   - [ ] Website loads correctly
   - [ ] Users can log in
   - [ ] Data is intact
   - [ ] All features work

☐ **Docker Hub**
   - [ ] Images visible in new account
   - [ ] Tags are correct (latest, v1.0.0)
   - [ ] Image sizes are reasonable

☐ **GitHub Actions**
   - [ ] Workflows run successfully
   - [ ] Images push to new account
   - [ ] No authentication errors

☐ **Watchtower Auto-Updates**
   - [ ] Watchtower is running
   - [ ] Monitoring new Docker Hub account
   - [ ] Will auto-update from new images

☐ **Documentation**
   - [ ] All docs reference new account
   - [ ] No broken links
   - [ ] README badges updated

Troubleshooting
===============

Common Issues and Solutions
---------------------------

Authentication Failed
~~~~~~~~~~~~~~~~~~~~~

**Error**::

   Error response from daemon: pull access denied for YOUR_USERNAME/lustores

**Solutions:**

1. Verify Docker Hub credentials::

      docker login
      # Re-enter username and password

2. Check image name is spelled correctly in docker-compose.prod.yml

3. Verify images exist on Docker Hub::

      # Visit https://hub.docker.com/u/YOUR_USERNAME
      # Check both repositories exist

4. Ensure Docker Hub token has correct permissions (Read, Write, Delete)

Image Not Found
~~~~~~~~~~~~~~~

**Error**::

   Error response from daemon: manifest for YOUR_USERNAME/lustores:latest not found

**Solutions:**

1. Verify you pushed the images::

      docker images | grep YOUR_USERNAME

2. If missing, rebuild and push (see Phase 3)

3. Check tag names match exactly::

      # In docker-compose.prod.yml
      image: YOUR_USERNAME/lustores:latest  # Must match pushed tag

GitHub Actions Failing
~~~~~~~~~~~~~~~~~~~~~~

**Error**::

   Error: buildx failed with: error: failed to solve: YOUR_USERNAME/lustores:latest: not found

**Solutions:**

1. Check GitHub Secrets are set correctly:
   - Settings → Secrets → Actions
   - DOCKERHUB_USERNAME = your new username
   - DOCKERHUB_TOKEN = your new token

2. Re-run the workflow after fixing secrets

3. Check workflow file uses secrets::

      # In docker-build-push.yml
      username: ${{ secrets.DOCKERHUB_USERNAME }}  # ✅ Correct
      username: st7ma784  # ❌ Wrong - hardcoded

Old Images Still Being Used
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: Production pulls old images from st7ma784 account

**Solutions:**

1. Verify docker-compose.prod.yml was updated::

      grep "image:" docker-compose.prod.yml
      # Should show YOUR_USERNAME, not st7ma784

2. Remove old images::

      docker rmi st7ma784/lustores:latest
      docker rmi st7ma784/replitauth:latest

3. Force pull new images::

      docker compose -f docker-compose.prod.yml pull --ignore-pull-failures

4. Restart services::

      docker compose -f docker-compose.prod.yml up -d --force-recreate

Watchtower Not Updating
~~~~~~~~~~~~~~~~~~~~~~~~

**Issue**: Watchtower still monitoring old Docker Hub account

**Solutions:**

1. Check Watchtower configuration in docker-compose.prod.yml

2. Restart Watchtower to pick up new image names::

      docker compose -f docker-compose.prod.yml restart watchtower

3. Check Watchtower logs::

      docker compose -f docker-compose.prod.yml logs watchtower --tail=50

Rollback Procedure
==================

If Something Goes Wrong
-----------------------

If the migration fails and you need to revert to the old setup:

☐ **Step 1: Stop services**::

   docker compose -f docker-compose.prod.yml down

☐ **Step 2: Revert docker-compose.prod.yml**::

   git checkout HEAD~1 -- docker-compose.prod.yml
   # Or manually change images back to st7ma784

☐ **Step 3: Pull old images**::

   docker pull st7ma784/lustores:latest
   docker pull st7ma784/replitauth:latest

☐ **Step 4: Restart with old images**::

   docker compose -f docker-compose.prod.yml up -d

☐ **Step 5: Verify system is working**

☐ **Step 6: Investigate what went wrong**
   - Review error logs
   - Check troubleshooting section above
   - Contact support if needed

Best Practices
==============

Repository Naming Conventions
------------------------------

**Recommended image names:**

.. code-block:: text

   Organization Account:
   - org-name/lustores:latest
   - org-name/lustores-auth:latest

   Personal Account:
   - username/university-inventory:latest
   - username/university-inventory-auth:latest

**Tagging strategy:**

.. code-block:: bash

   # Always maintain these tags:
   - latest                    # Always points to newest production
   - v1.0.0, v1.1.0, etc.     # Semantic versioning
   - production                # Production environment
   - staging                   # Staging environment

   # Example:
   docker tag your-username/lustores:latest your-username/lustores:v1.0.0
   docker tag your-username/lustores:latest your-username/lustores:production

Image Maintenance
-----------------

**Regular cleanup:**

.. code-block:: bash

   # Remove old/unused images monthly
   docker image prune -a --filter "until=720h"  # Remove images older than 30 days

   # Keep only last 5 versions on Docker Hub
   # (Do this manually via Docker Hub web interface)

**Security scanning:**

.. code-block:: bash

   # Scan images for vulnerabilities before pushing
   docker scan your-username/lustores:latest

Multi-Environment Setup
------------------------

If you have multiple environments (dev, staging, prod):

.. code-block:: yaml

   # docker-compose.dev.yml
   services:
     app:
       image: your-username/lustores:dev

   # docker-compose.staging.yml
   services:
     app:
       image: your-username/lustores:staging

   # docker-compose.prod.yml
   services:
     app:
       image: your-username/lustores:latest

Quick Reference
===============

All Files That Need Updates
----------------------------

.. list-table:: File Update Checklist
   :header-rows: 1
   :widths: 40 30 30

   * - File
     - What to Change
     - Required?
   * - ``docker-compose.prod.yml``
     - Image names (2 places)
     - **YES**
   * - ``docker-compose.aws.yml``
     - Image names
     - If you use AWS
   * - GitHub Secrets
     - DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
     - **YES**
   * - ``README.md``
     - Badge URL
     - Optional
   * - ``docs/operations/docker-architecture.rst``
     - Documentation references
     - Recommended
   * - ``docs/operations/backup-restore.rst``
     - Documentation references
     - Recommended
   * - ``HANDOVER_SUMMARY.md``
     - Documentation references
     - Recommended

Commands Summary
----------------

Quick copy-paste commands for migration:

.. code-block:: bash

   # 1. Update local files
   cd /data/LUStores
   nano docker-compose.prod.yml  # Update image names

   # 2. Build and push images
   docker login
   docker build -t YOUR_USERNAME/lustores:latest --target production .
   docker build -t YOUR_USERNAME/replitauth:latest ./docker/replit-auth
   docker push YOUR_USERNAME/lustores:latest
   docker push YOUR_USERNAME/replitauth:latest

   # 3. Update production
   ssh production-server
   cd /data/LUStores
   git pull
   docker login
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d

   # 4. Verify
   docker compose -f docker-compose.prod.yml ps
   curl https://your-domain.com/health

Related Documentation
=====================

- :doc:`docker-architecture` - Understanding Docker setup
- :doc:`backup-restore` - Backup before migration
- :doc:`qrh` - Troubleshooting common issues
- :doc:`/deployment/production` - Production deployment guide

Post-Migration Notes
====================

After successful migration, remember to:

☐ **Document the change**
   - Update team documentation
   - Notify team members
   - Update runbooks

☐ **Monitor for 48 hours**
   - Watch Watchtower auto-updates
   - Check for any unexpected issues
   - Verify backups still work

☐ **Clean up old images** (after 30 days)
   - Remove old development images from production
   - Archive old Docker Hub account if no longer needed

☐ **Review access**
   - Ensure team has access to new Docker Hub account
   - Share credentials securely
   - Set up appropriate permissions

---

**Migration Complete!**

Your LUStores system is now using your production Docker Hub account.

For support, refer to :doc:`qrh` or contact your IT team.
