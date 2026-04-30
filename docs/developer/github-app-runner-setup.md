# GitHub App Runner Setup - Complete Guide

## Quick Start (Automated)

```bash
# Run the automated setup script
./scripts/setup-github-app.sh

# Follow the prompts to:
# 1. Create GitHub App
# 2. Configure environment
# 3. Deploy runner
```

## What You Get

✅ **Reliable Authentication**: GitHub App tokens last much longer than registration tokens  
✅ **Automatic Refresh**: Custom runner automatically refreshes tokens every 50 minutes  
✅ **Multiple Options**: Three different runner configurations to choose from  
✅ **Production Ready**: Comprehensive error handling and logging  

## Runner Options

### Option 1: Enhanced Standard Runner (Recommended)
**File**: `docker-compose.prod.yml`
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d githubrunner
```
- Uses `myoung34/github-runner:latest`
- Supports both GitHub App and registration token authentication
- Easy configuration through environment variables

### Option 2: Custom JWT Runner
**File**: `docker-compose.github-runners.yml` (profile: github-jwt)
```bash
docker compose --env-file .env.prod -f docker-compose.github-runners.yml --profile github-jwt up -d
```
- Custom Docker image with JWT token generation
- Automatic token refresh every 50 minutes
- Built-in error handling and fallback mechanisms

### Option 3: Official GitHub Runner
**File**: `docker-compose.github-runners.yml` (profile: github-official)
```bash
docker compose --env-file .env.prod -f docker-compose.github-runners.yml --profile github-official up -d
```
- Uses `ghcr.io/actions/actions-runner:latest`
- GitHub's official runner image
- Requires GitHub App configuration

## Environment Configuration

### Required Variables (.env.prod)
```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_FILE=/path/to/github-app-private-key.pem
GITHUB_APP_INSTALLATION_ID=12345678

# Repository Settings
REPO_URL=https://github.com/st7ma784/LUStores
RUNNER_NAME=lustores-prod-runner
RUNNER_LABELS=lustores,production,docker,self-hosted

# Runner Behavior
EPHEMERAL_RUNNER=true
RUNNER_REGISTRATION_TYPE=app
```

### Optional Variables
```bash
# Fallback to registration token if needed
RUNNER_TOKEN=your_registration_token
RUNNER_WORKDIR=/tmp/github-runner

# JWT Configuration (for custom runner)
GITHUB_TOKEN_REFRESH_INTERVAL=3000  # 50 minutes in seconds
```

## Manual GitHub App Setup

### Step 1: Create GitHub App
1. Go to: https://github.com/settings/apps/new
2. Fill in app details:
   - **App name**: `LUStores Runner` 
   - **Homepage URL**: `https://github.com/st7ma784/LUStores`
   - **Webhook URL**: (leave empty or use your domain)

3. **Repository permissions**:
   - **Actions**: Read & Write
   - **Administration**: Read & Write  
   - **Metadata**: Read

4. After creation:
   - Note the **App ID** 
   - Download the **private key** (`.pem` file)
   - **Install the app** on your repository

### Step 2: Get Installation ID
```bash
# Using GitHub CLI (if installed)
gh api /repos/st7ma784/LUStores/installation --jq .id

# Or check the setup script output
./scripts/setup-github-app.sh --get-installation-id
```

### Step 3: Deploy
```bash
# Copy private key to secure location
cp ~/Downloads/lustores-runner.*.private-key.pem ./secrets/github-app-key.pem

# Update .env.prod with actual values
# Then deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d githubrunner
```

## Monitoring & Troubleshooting

### Check Runner Status
```bash
# Container status
docker compose ps githubrunner

# Logs
docker compose logs -f githubrunner

# GitHub UI
# https://github.com/st7ma784/LUStores/settings/actions/runners
```

### Common Issues

**"Runner not found"**
- Check if runner is visible in GitHub settings
- Verify repository URL and permissions
- Restart container: `docker compose restart githubrunner`

**"Authentication failed"**
- Verify GitHub App ID and private key path
- Check installation ID is correct
- Ensure app is installed on the repository

**"Token expired"**
- Only affects registration token method
- GitHub App tokens auto-refresh
- Switch to GitHub App authentication

## Security Notes

🔐 **Private Key Security**
- Never commit private keys to git
- Store in secure location with restricted permissions
- Use environment variables for file paths

🔐 **Runner Isolation**
- Use ephemeral runners for automatic cleanup
- Limit runner to specific repository
- Monitor runner activity regularly

🔐 **Network Security**
- Runner communicates outbound only to GitHub
- No inbound connections required
- Consider firewall rules if needed

## Workflow Integration

The GitHub Actions workflows have been updated to ignore infrastructure changes:

```yaml
on:
  push:
    paths-ignore:
      - 'docker-compose*.yml'
      - 'docs/**'
      - '*.md'
```

This prevents unnecessary workflow runs when updating Docker Compose configurations.

## Migration from Registration Tokens

If you're currently using registration tokens:

1. **Keep current setup running** during migration
2. **Run setup script**: `./scripts/setup-github-app.sh`
3. **Test new runner** with a simple workflow
4. **Switch traffic** by updating workflow labels if needed
5. **Remove old runner** from GitHub settings

## Support

- **Documentation**: Check `docs/github-runner-setup.md` for detailed troubleshooting
- **Scripts**: All automation scripts are in `scripts/` directory
- **Configurations**: Multiple Docker Compose files for different scenarios
- **Logs**: Check container logs for detailed error information

---

**Pro Tip**: Start with the automated setup script - it handles most of the complexity and provides helpful guidance throughout the process!
