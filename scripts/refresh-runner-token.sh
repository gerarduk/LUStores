#!/bin/bash

# GitHub Runner Token Management Script
# This script helps manage GitHub self-hosted runner tokens

set -e

REPO_OWNER="st7ma784"
REPO_NAME="LUStores"
ENV_FILE=".env.prod"

echo "🔧 GitHub Runner Token Management"
echo "================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install it from: https://cli.github.com/"
    echo "   Or use manual token generation instead."
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 You need to authenticate with GitHub CLI first:"
    echo "   Run: gh auth login"
    exit 1
fi

echo "📡 Generating new runner registration token..."

# Generate new registration token
NEW_TOKEN=$(gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    /repos/$REPO_OWNER/$REPO_NAME/actions/runners/registration-token \
    --jq '.token')

if [ -z "$NEW_TOKEN" ]; then
    echo "❌ Failed to generate new token. Check your permissions."
    exit 1
fi

echo "✅ New token generated: ${NEW_TOKEN:0:8}..."

# Update .env.prod file
if [ -f "$ENV_FILE" ]; then
    # Create backup
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d-%H%M%S)"
    
    # Update the token
    if grep -q "RUNNER_TOKEN=" "$ENV_FILE"; then
        sed -i "s/RUNNER_TOKEN=.*/RUNNER_TOKEN=$NEW_TOKEN/" "$ENV_FILE"
        echo "✅ Updated RUNNER_TOKEN in $ENV_FILE"
    else
        echo "RUNNER_TOKEN=$NEW_TOKEN" >> "$ENV_FILE"
        echo "✅ Added RUNNER_TOKEN to $ENV_FILE"
    fi
else
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

echo ""
echo "🚀 Next steps:"
echo "1. Restart the GitHub runner container:"
echo "   docker compose --env-file .env.prod -f docker-compose.prod.yml restart githubrunner"
echo ""
echo "2. Check the logs:"
echo "   docker compose --env-file .env.prod -f docker-compose.prod.yml logs githubrunner"
echo ""
echo "⏰ Note: Registration tokens expire after 1 hour."
echo "   Consider setting up a GitHub App for production use."
