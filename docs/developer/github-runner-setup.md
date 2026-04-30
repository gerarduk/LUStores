# GitHub Runner Token Management Guide

## Current Working Solution ✅

The production runner is now working with a simplified configuration:

```yaml
# docker-compose.prod.yml
githubrunner:
  image: myoung34/github-runner:latest
  environment:
    - REPO_URL=https://github.com/st7ma784/LUStores
    - RUNNER_NAME=${RUNNER_NAME:-lustores-prod-runner}
    - RUNNER_TOKEN=${RUNNER_TOKEN}
    - LABELS=${RUNNER_LABELS:-lustores,production,docker,self-hosted}
    - EPHEMERAL=${EPHEMERAL_RUNNER:-true}
    - DISABLE_AUTOMATIC_DEREGISTRATION=${DISABLE_AUTO_DEREG:-false}
    - RUNNER_GROUP=${RUNNER_GROUP:-default}
    - RUNNER_ALLOW_RUNASROOT=true
```

### Quick Token Refresh
When the registration token expires (every hour), generate a new one:

```bash
# Using GitHub CLI
gh api --method POST -H "Accept: application/vnd.github.v3+json" \
  repos/st7ma784/LUStores/actions/runners/registration-token

# Update .env.prod with the new token
# Then restart: docker compose --env-file .env.prod -f docker-compose.prod.yml restart githubrunner
```

### Quick Setup with Script
```bash
# Run the automated GitHub App setup script
./scripts/setup-github-app.sh
```

### Manual GitHub App Setup

#### Step 1: Create GitHub App
1. Go to: https://github.com/settings/apps/new
2. Fill in the app details:
   - GitHub App name: `LUStores Runner`
   - Homepage URL: `https://github.com/st7ma784/LUStores`
   - Webhook URL: (leave empty)

3. Repository permissions (set to **Read & Write**):
   - **Actions**
   - **Administration** 
   - **Metadata** (Read only)

4. After creating:
   - Note the **App ID**
   - Generate and download a **private key**
   - **Install the app** on your repository

#### Step 2: Configure Environment
Update your `.env.prod` file:
```bash
# GitHub App Configuration (Recommended)
GITHUB_APP_TOKEN=your_app_installation_token
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY_FILE=/path/to/github-app-private-key.pem
RUNNER_REGISTRATION_TYPE=app

# Runner Settings
RUNNER_NAME=lustores-prod-runner
RUNNER_LABELS=lustores,production,docker,self-hosted
EPHEMERAL_RUNNER=true
```

#### Step 3: Deploy Runner
```bash
# Using the enhanced runner with GitHub App support
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d githubrunner

# Or use the custom JWT-based runner
docker compose --env-file .env.prod -f docker-compose.github-runners.yml --profile github-jwt up -d
```

## Fallback Solution - Registration Token

### Quick Fix - Manual Token Refresh
1. Go to: https://github.com/st7ma784/LUStores/settings/actions/runners
2. Click **"New self-hosted runner"**
3. Copy the token from the configuration command
4. Update `.env.prod`:
   ```bash
   RUNNER_TOKEN=YOUR_NEW_TOKEN_HERE
   RUNNER_REGISTRATION_TYPE=token
   ```
5. Restart: `docker compose restart githubrunner`

### Automated Token Refresh
```bash
# Use the token refresh script
./scripts/refresh-runner-token.sh
```

## Deployment Options

### Option 1: Standard Runner (Current)
- Uses `myoung34/github-runner:latest`
- Supports both token and GitHub App authentication
- Configuration in `docker-compose.prod.yml`

### Option 2: Custom JWT Runner
- Custom-built image with JWT token generation
- Automatic token refresh every 50 minutes
- Use profile: `--profile github-jwt`

### Option 3: Official GitHub Runner
- Uses `ghcr.io/actions/actions-runner:latest`
- GitHub's official image
- Use profile: `--profile github-official`

## Security Best Practices

1. **Use GitHub Apps for production**
2. **Keep private keys secure** - never commit to git
3. **Use ephemeral runners** - auto-cleanup after jobs
4. **Limit runner permissions** - only required repository access
5. **Monitor runner activity** - check logs regularly

## Troubleshooting

### Common Issues

#### "404 Not Found" Error
- **Cause**: Expired registration token
- **Solution**: Generate new token or switch to GitHub App

#### "No runner found" 
- **Cause**: Runner not properly registered
- **Solution**: Check logs and restart container

#### "Permission denied"
- **Cause**: GitHub App missing permissions
- **Solution**: Update app permissions in GitHub settings

### Checking Status
```bash
# Check runner container status
docker compose ps githubrunner

# View runner logs
docker compose logs -f githubrunner

# Check if runner is registered in GitHub
# Go to: https://github.com/st7ma784/LUStores/settings/actions/runners
```

## GitHub Actions Workflow Optimization

The workflows now ignore Docker Compose file changes to prevent unnecessary runs:

```yaml
on:
  push:
    paths-ignore:
      - 'docker-compose*.yml'
      - 'docs/**'
      - '*.md'
```

This ensures that infrastructure changes don't trigger the full CI/CD pipeline unnecessarily.
