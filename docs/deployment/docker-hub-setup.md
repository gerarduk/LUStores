# Docker Hub Configuration for LUStores

## Required GitHub Repository Secrets

To enable Docker Hub integration for the LUStores project, you need to configure the following secrets in your GitHub repository:

### Setting up Docker Hub Secrets

1. **Go to your GitHub repository** → Settings → Secrets and variables → Actions

2. **Add the following secrets:**

   - **`DOCKERHUB_USERNAME`**: Your Docker Hub username
   - **`DOCKERHUB_TOKEN`**: A Docker Hub access token (recommended) or password

### Creating a Docker Hub Access Token (Recommended)

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to Account Settings → Security
3. Click "New Access Token"
4. Give it a descriptive name (e.g., "GitHub Actions LUStores")
5. Select appropriate permissions (Read, Write, Delete for your repositories)
6. Copy the generated token and use it as `DOCKERHUB_TOKEN`

### Docker Hub Repository Setup

1. Create a repository on Docker Hub named `lustores/lustores`
2. Make sure your Docker Hub account has permission to push to this repository

## Current Configuration

The workflows are configured to:
- Build Docker images for the LUStores application
- Push images to `lustores/lustores` repository on Docker Hub
- Tag images with appropriate version tags (latest, branch names, etc.)

## Files Updated

- `.github/workflows/ci-cd.yml`: Updated to use Docker Hub instead of GitHub Container Registry
- `.github/workflows/docker.yml`: Updated image name to be consistent

## Troubleshooting

### Authentication Errors
- Verify that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are correctly set in repository secrets
- Ensure the Docker Hub access token has sufficient permissions

### Image Name Errors
- The image name format is now `lustores/lustores:tag`
- Make sure the Docker Hub repository exists and is accessible

### Push Failures
- Verify that your Docker Hub account has push permissions to the repository
- Check that the repository name matches exactly: `lustores/lustores`
