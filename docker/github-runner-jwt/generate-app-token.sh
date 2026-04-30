#!/bin/bash

# Generate GitHub App JWT token and exchange for installation access token
# This script creates a JWT token using the GitHub App private key
# and exchanges it for an installation access token

set -e

# Check required environment variables
if [ -z "$GITHUB_APP_ID" ]; then
    echo "ERROR: GITHUB_APP_ID environment variable is required"
    exit 1
fi

if [ -z "$GITHUB_APP_PRIVATE_KEY_FILE" ] || [ ! -f "$GITHUB_APP_PRIVATE_KEY_FILE" ]; then
    echo "ERROR: GITHUB_APP_PRIVATE_KEY_FILE must point to a valid private key file"
    exit 1
fi

if [ -z "$REPO_URL" ]; then
    echo "ERROR: REPO_URL environment variable is required"
    exit 1
fi

# Extract owner and repo from URL
REPO_OWNER=$(echo "$REPO_URL" | sed 's|https://github.com/||' | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_URL" | sed 's|https://github.com/||' | cut -d'/' -f2)

echo "Generating GitHub App token for $REPO_OWNER/$REPO_NAME..."

# Create JWT header
JWT_HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Create JWT payload
NOW=$(date +%s)
IAT=$((NOW - 60))  # Issued at time (60 seconds in the past)
EXP=$((NOW + 600)) # Expiration time (10 minutes from now)

JWT_PAYLOAD=$(echo -n "{\"iat\":$IAT,\"exp\":$EXP,\"iss\":\"$GITHUB_APP_ID\"}" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Create JWT signature
JWT_SIGNATURE=$(echo -n "${JWT_HEADER}.${JWT_PAYLOAD}" | openssl dgst -sha256 -sign "$GITHUB_APP_PRIVATE_KEY_FILE" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# Combine into JWT
JWT_TOKEN="${JWT_HEADER}.${JWT_PAYLOAD}.${JWT_SIGNATURE}"

# Get installation ID if not provided
if [ -z "$GITHUB_APP_INSTALLATION_ID" ]; then
    echo "Getting installation ID for repository..."
    INSTALLATION_ID=$(curl -s \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/installation" | jq -r '.id')
    
    if [ "$INSTALLATION_ID" = "null" ] || [ -z "$INSTALLATION_ID" ]; then
        echo "ERROR: Failed to get installation ID. Make sure the GitHub App is installed on the repository."
        exit 1
    fi
    
    echo "Found installation ID: $INSTALLATION_ID"
else
    INSTALLATION_ID="$GITHUB_APP_INSTALLATION_ID"
    echo "Using provided installation ID: $INSTALLATION_ID"
fi

# Generate installation access token
echo "Generating installation access token..."
ACCESS_TOKEN=$(curl -s \
    -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/app/installations/$INSTALLATION_ID/access_tokens" | jq -r '.token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "ERROR: Failed to generate access token"
    exit 1
fi

echo "Successfully generated access token"

# Export the token for use by the runner
export ACCESS_TOKEN="$ACCESS_TOKEN"
echo "$ACCESS_TOKEN"
