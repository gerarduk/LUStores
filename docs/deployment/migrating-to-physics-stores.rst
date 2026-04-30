Migrating to Physics Stores Guide
=================================

This guide provides step-by-step instructions for migrating the LUStores application to a new "Physics Stores" deployment under your own GitHub account and Docker Hub registry.

Overview
--------

The migration involves:

- Forking the repository to your GitHub account
- Setting up your own Docker Hub registry
- Updating GitHub Actions workflows
- Modifying deployment scripts and Docker Compose files
- Configuring environment variables

Prerequisites
-------------

- GitHub account with repository creation permissions
- Docker Hub account
- Basic knowledge of Git, Docker, and environment variables

Step 1: Fork the Repository
===========================

Fork the Original Repository
----------------------------

1. Navigate to the original LUStores repository: https://github.com/st7ma784/LUStores
2. Click the **"Fork"** button in the top-right corner
3. Select your GitHub account as the destination
4. Name the repository ``PhysicsStores`` or your preferred name
5. Ensure **"Copy the main branch only"** is unchecked to copy all branches
6. Click **"Create fork"**

Clone Your Fork
^^^^^^^^^^^^^^^

.. code-block:: bash

   # Clone your forked repository
   git clone https://github.com/YOUR_USERNAME/PhysicsStores.git
   cd PhysicsStores

   # Set up the original repository as upstream for future updates
   git remote add upstream https://github.com/st7ma784/LUStores.git

Verify the Fork
^^^^^^^^^^^^^^^

.. code-block:: bash

   # Check remotes
   git remote -v

   # Should show:
   # origin    https://github.com/YOUR_USERNAME/PhysicsStores.git (fetch)
   # origin    https://github.com/YOUR_USERNAME/PhysicsStores.git (push)
   # upstream  https://github.com/st7ma784/LUStores.git (fetch)
   # upstream  https://github.com/st7ma784/LUStores.git (push)

Step 2: Set Up Docker Hub Registry
==================================

Create Docker Hub Repository
----------------------------

1. Log in to `Docker Hub <https://hub.docker.com/>`_
2. Click **"Create Repository"**
3. Set repository name to ``physicsstores`` (or your preferred name)
4. Make it **Public** (recommended for easier deployment)
5. Click **"Create"**

Create Docker Hub Access Token
------------------------------

1. Go to Docker Hub → Account Settings → Security
2. Click **"New Access Token"**
3. Name it ``PhysicsStores-GitHub-Actions``
4. Select **Read, Write, Delete** permissions
5. Click **"Generate"**
6. **Copy the token immediately** (you won't see it again)

Step 3: Configure GitHub Repository Secrets
===========================================

Set Up Repository Secrets
-------------------------

1. Go to your forked repository: https://github.com/YOUR_USERNAME/PhysicsStores
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secrets:

Required Secrets
^^^^^^^^^^^^^^^^

.. list-table:: Required GitHub Repository Secrets
   :header-rows: 1
   :widths: 20 30 50

   * - Secret Name
     - Value
     - Description
   * - ``DOCKERHUB_USERNAME``
     - Your Docker Hub username
     - Used for Docker Hub authentication
   * - ``DOCKERHUB_TOKEN``
     - The access token from Step 2.2
     - Docker Hub API access token

Verify Secrets
^^^^^^^^^^^^^^

After adding secrets, they should appear in the **Repository secrets** section. The values will be masked for security.

Step 4: Update GitHub Actions Workflows
=======================================

Update Docker Build & Push Workflow
-----------------------------------

Edit ``.github/workflows/docker-build-push.yml``:

.. code-block:: yaml

   env:
     REGISTRY: docker.io
     IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/physicsstores  # Changed from lustores
     REPLIT_AUTH_IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/physicsstores-auth  # Changed from replitauth

Update Main CI/CD Workflow (if needed)
-------------------------------------

Check ``.github/workflows/main.yml`` and update any hardcoded image references if present.

Test the Workflow
-----------------

1. Make a small change to trigger the workflow (add a comment to README.md)
2. Push the change to trigger GitHub Actions
3. Verify that:

   - Docker images build successfully
   - Images are pushed to your Docker Hub repository
   - The workflow completes without errors

Step 5: Update Docker Compose Files
===================================

Update Production Docker Compose
--------------------------------

Edit ``docker-compose.prod.yml``:

.. code-block:: yaml

   # Change these image references:
   app:
     image: YOUR_DOCKERHUB_USERNAME/physicsstores:latest  # Changed from st7ma784/lustores:latest

   replit-auth:
     image: YOUR_DOCKERHUB_USERNAME/physicsstores-auth:latest  # Changed from st7ma784/replitauth:latest

Update AWS Docker Compose (if used)
-----------------------------------

Edit ``docker-compose.aws.yml``:

.. code-block:: yaml

   # Change these image references:
   app:
     image: YOUR_DOCKERHUB_USERNAME/physicsstores:latest

   replit-auth:
     image: YOUR_DOCKERHUB_USERNAME/physicsstores-auth:latest

Update Kubernetes Deployment (if used)
--------------------------------------

Edit ``kube.yml``:

.. code-block:: yaml

   # Find and replace image references:
   image: YOUR_DOCKERHUB_USERNAME/physicsstores:latest
   image: YOUR_DOCKERHUB_USERNAME/physicsstores-auth:latest

Step 6: Update Deployment Scripts
=================================

Update Deploy Scripts
---------------------

The deployment scripts (``deploy-simple.sh``, ``deploy-simple.ps1``) should automatically use the images specified in ``docker-compose.prod.yml``, so they may not need changes. However, verify they reference the correct compose files.

Update Watchtower Configuration
-------------------------------

Watchtower will automatically update containers when new images are available. Ensure your Docker Hub repository is public or that Watchtower has proper authentication.

Step 7: Configure Environment Variables
========================================

Create Environment File
-----------------------

Copy the environment template and configure it:

.. code-block:: bash

   # Copy template (if it exists)
   cp .env.prod.template .env.prod

   # Or create .env.prod manually with required variables

Required Environment Variables
------------------------------

Based on ``docker-compose.prod.yml``, set these variables in ``.env.prod``:

Database Configuration
^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   DB_PASSWORD=your_secure_database_password
   DATABASE_URL=postgresql://postgres:your_secure_database_password@db:5432/university_inventory

Security Secrets
^^^^^^^^^^^^^^^^

.. code-block:: bash

   SESSION_SECRET=your_random_session_secret_32_chars_min
   JWT_SECRET=your_random_jwt_secret_32_chars_min
   JWT_EXPIRES_IN=24h

Domain Configuration
^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   DOMAIN=your-domain.com
   EMAIL=your-email@your-domain.com

SSL Configuration
^^^^^^^^^^^^^^^^^

.. code-block:: bash

   HTTPS=true
   FORCE_HTTPS=true
   CERTBOT_STAGING=1  # Set to 0 for production certificates
   USE_SELF_SIGNED=false  # Set to true for internal domains

GitHub Integration (Optional)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   GITHUB_APP_ID=your_github_app_id
   GITHUB_APP_PRIVATE_KEY=your_github_app_private_key
   REPO_OWNER=YOUR_USERNAME
   REPO_NAME=PhysicsStores
   RUNNER_NAME=physicsstores-prod-runner

Watchtower Notifications (Optional)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   WATCHTOWER_NOTIFICATION_WEBHOOK_URL=https://your-domain.com/api/webhook/watchtower

Generate Secure Secrets
-----------------------

Use these commands to generate secure random secrets:

.. code-block:: bash

   # Generate SESSION_SECRET (32+ characters)
   openssl rand -base64 32

   # Generate JWT_SECRET (32+ characters)
   openssl rand -hex 32

   # Generate DB_PASSWORD (16+ characters)
   openssl rand -base64 16

Step 8: Test the Migration
==========================

Local Testing
-------------

.. code-block:: bash

   # Test Docker Compose locally
   docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d

   # Check logs
   docker compose --env-file .env.prod logs -f app

   # Test the application
   curl http://localhost:5000/health

Production Deployment
---------------------

.. code-block:: bash

   # Run the deployment script
   chmod +x deploy-simple.sh
   ./deploy-simple.sh

Verify Deployment
-----------------

1. Check that containers are running: ``docker ps``
2. Verify images are from your registry: ``docker images``
3. Test the application at ``https://your-domain.com``
4. Check GitHub Actions workflow runs successfully

Step 9: Post-Migration Tasks
============================

Update Documentation
--------------------

- Update README.md with your repository URLs
- Update any hardcoded links to point to your fork
- Update Docker Hub links in documentation

Set Up GitHub Pages
-------------------

Configure GitHub Pages for your migrated documentation:

1. Go to your repository: https://github.com/YOUR_USERNAME/PhysicsStores
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **"GitHub Actions"**
4. The documentation will be built and deployed automatically via the existing ``docs.yml`` workflow
5. Your documentation will be available at: https://YOUR_USERNAME.github.io/PhysicsStores/

The ``docs.yml`` workflow will:

- Build the Sphinx documentation automatically
- Generate TypeScript API documentation
- Deploy everything to GitHub Pages when you push to the main branch
- Handle documentation updates whenever you modify files in the ``docs/`` directory

Update Documentation Links
^^^^^^^^^^^^^^^^^^^^^^^^^^

After setting up GitHub Pages, update any documentation links:

- Update ``README.md`` to point to your GitHub Pages URL
- Update internal documentation links to use your repository's documentation
- Verify that the documentation builds correctly with your repository name

Set Up Monitoring
-----------------

- Configure Watchtower notifications
- Set up health monitoring
- Configure backup procedures

Security Considerations
-----------------------

- Ensure Docker Hub repository visibility is appropriate
- Rotate Docker Hub tokens periodically
- Keep GitHub repository secrets secure

Troubleshooting
===============

Common Issues
-------------

Docker Hub Authentication Errors
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- Verify ``DOCKERHUB_USERNAME`` and ``DOCKERHUB_TOKEN`` are correct
- Ensure the token has Read/Write/Delete permissions
- Check that the repository exists and is accessible

Image Pull Errors
~~~~~~~~~~~~~~~~~

- Verify image names in Docker Compose files
- Check Docker Hub repository permissions
- Ensure images were successfully built and pushed

Environment Variable Errors
~~~~~~~~~~~~~~~~~~~~~~~~~~~

- Check ``.env.prod`` file exists and has correct values
- Verify variable names match those in ``docker-compose.prod.yml``
- Ensure no extra spaces or special characters

GitHub Actions Failures
~~~~~~~~~~~~~~~~~~~~~~~

- Check repository secrets are properly configured
- Verify workflow YAML syntax
- Check build logs for specific error messages

Getting Help
~~~~~~~~~~~~

- Check the `original documentation <https://st7ma784.github.io/LUStores/>`_
- Review GitHub Actions logs for detailed error messages
- Test locally before deploying to production

Maintenance
===========

Keeping Your Fork Updated
-------------------------

.. code-block:: bash

   # Fetch updates from upstream
   git fetch upstream

   # Merge updates into your main branch
   git checkout main
   git merge upstream/main

   # Push updates to your fork
   git push origin main

Updating Docker Images
----------------------

Images will be automatically updated via Watchtower, or you can manually trigger rebuilds through GitHub Actions.

---

**Note**: This guide assumes you're migrating from the original LUStores setup. Adjust paths and configurations as needed for your specific environment.