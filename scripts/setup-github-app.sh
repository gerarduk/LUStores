#!/bin/bash

# GitHub App Setup Script for Self-Hosted Runners
# This script helps set up GitHub App authentication for production runners

set -e

REPO_OWNER="st7ma784"
REPO_NAME="LUStores"
ENV_FILE=".env.prod"
APP_NAME="LUStores Runner"

echo "🔧 GitHub App Setup for Self-Hosted Runners"
echo "============================================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."
if ! command_exists gh; then
    echo "❌ GitHub CLI (gh) is required but not installed."
    echo "   Install from: https://cli.github.com/"
    echo "   Then run: gh auth login"
    exit 1
fi

if ! command_exists jq; then
    echo "❌ jq is required but not installed."
    echo "   Install with: sudo apt-get install jq"
    exit 1
fi

if ! command_exists openssl; then
    echo "❌ openssl is required but not installed."
    exit 1
fi

# Check GitHub authentication
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "❌ You need to authenticate with GitHub CLI first:"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ All dependencies are available"
echo ""

echo "🎯 Setting up GitHub App for repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Option 1: Manual GitHub App creation instructions
echo "📝 GitHub App Creation Instructions"
echo "===================================="
echo ""
echo "1. Go to: https://github.com/settings/apps/new"
echo "2. Fill in the app details:"
echo "   - GitHub App name: $APP_NAME"
echo "   - Homepage URL: https://github.com/$REPO_OWNER/$REPO_NAME"
echo "   - Webhook URL: (leave empty or use your domain)"
echo "   - Webhook secret: (optional)"
echo ""
echo "3. Repository permissions (set to Read & Write):"
echo "   - Actions"
echo "   - Administration"
echo "   - Metadata (Read only)"
echo "   - Pull requests (if you want PR workflows)"
echo ""
echo "4. After creating the app:"
echo "   - Note down the App ID"
echo "   - Generate and download a private key"
echo "   - Install the app on your repository"
echo ""

read -p "Have you created the GitHub App and noted the App ID? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please create the GitHub App first and then run this script again."
    exit 1
fi

# Get App ID from user
read -p "Enter your GitHub App ID: " APP_ID

if [ -z "$APP_ID" ]; then
    echo "❌ App ID is required"
    exit 1
fi

# Check if private key file exists
read -p "Enter the path to your GitHub App private key file: " PRIVATE_KEY_PATH

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo "❌ Private key file not found: $PRIVATE_KEY_PATH"
    exit 1
fi

# Copy private key to secure location
SECURE_KEY_PATH="./secrets/github-app-private-key.pem"
mkdir -p ./secrets
cp "$PRIVATE_KEY_PATH" "$SECURE_KEY_PATH"
chmod 600 "$SECURE_KEY_PATH"

echo "✅ Private key copied to: $SECURE_KEY_PATH"

# Generate JWT token for GitHub App authentication
echo "🔑 Generating GitHub App JWT token..."

# Create JWT header
JWT_HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Create JWT payload
NOW=$(date +%s)
IAT=$((NOW - 60))  # Issued at time (60 seconds in the past)
EXP=$((NOW + 600)) # Expiration time (10 minutes from now)

JWT_PAYLOAD=$(echo -n "{\"iat\":$IAT,\"exp\":$EXP,\"iss\":\"$APP_ID\"}" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Create JWT signature
JWT_SIGNATURE=$(echo -n "${JWT_HEADER}.${JWT_PAYLOAD}" | openssl dgst -sha256 -sign "$SECURE_KEY_PATH" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Combine into JWT
JWT_TOKEN="${JWT_HEADER}.${JWT_PAYLOAD}.${JWT_SIGNATURE}"

echo "🔍 Getting installation ID..."

# Get installation ID
INSTALLATION_ID=$(curl -s \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/installation" | jq -r '.id')

if [ "$INSTALLATION_ID" = "null" ] || [ -z "$INSTALLATION_ID" ]; then
    echo "❌ Failed to get installation ID. Make sure the GitHub App is installed on the repository."
    exit 1
fi

echo "✅ Installation ID: $INSTALLATION_ID"

# Generate installation access token
echo "🎫 Generating installation access token..."

ACCESS_TOKEN=$(curl -s \
    -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/app/installations/$INSTALLATION_ID/access_tokens" | jq -r '.token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to generate access token"
    exit 1
fi

echo "✅ Access token generated successfully"

# Update .env.prod file
echo "📝 Updating $ENV_FILE..."

# Create backup
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d-%H%M%S)"

# Update environment variables
update_env_var() {
    local var_name=$1
    local var_value=$2
    local file=$3
    
    if grep -q "^$var_name=" "$file"; then
        sed -i "s|^$var_name=.*|$var_name=$var_value|" "$file"
    elif grep -q "^# $var_name=" "$file"; then
        sed -i "s|^# $var_name=.*|$var_name=$var_value|" "$file"
    else
        echo "$var_name=$var_value" >> "$file"
    fi
}

# Update GitHub App configuration
update_env_var "GITHUB_APP_TOKEN" "$ACCESS_TOKEN" "$ENV_FILE"
update_env_var "GITHUB_APP_ID" "$APP_ID" "$ENV_FILE"
update_env_var "GITHUB_APP_PRIVATE_KEY_FILE" "$PWD/$SECURE_KEY_PATH" "$ENV_FILE"
update_env_var "RUNNER_REGISTRATION_TYPE" "app" "$ENV_FILE"

echo "✅ Updated $ENV_FILE with GitHub App configuration"
echo ""

echo "🚀 Setup Complete!"
echo "=================="
echo ""
echo "Your GitHub App is now configured. To use it:"
echo ""
echo "1. Restart the GitHub runner container:"
echo "   docker compose --env-file .env.prod -f docker-compose.prod.yml restart githubrunner"
echo ""
echo "2. Check the logs:"
echo "   docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f githubrunner"
echo ""
echo "📋 Configuration Summary:"
echo "  • App ID: $APP_ID"
echo "  • Installation ID: $INSTALLATION_ID"
echo "  • Private Key: $SECURE_KEY_PATH"
echo "  • Access Token: ${ACCESS_TOKEN:0:8}... (expires in 1 hour)"
echo ""
echo "⚠️  Important Notes:"
echo "  • The access token expires in 1 hour"
echo "  • The runner will auto-generate new tokens using the private key"
echo "  • Keep the private key file secure and don't commit it to git"
echo ""
echo "🔄 To switch back to registration tokens, change:"
echo "   RUNNER_REGISTRATION_TYPE=token"
