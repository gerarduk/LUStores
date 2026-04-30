#!/bin/bash

# Custom entrypoint that generates GitHub App tokens before starting the runner
# This allows the runner to authenticate using GitHub Apps instead of registration tokens

set -e

echo "Starting GitHub Actions Runner with GitHub App authentication..."

# Check if we should use GitHub App authentication
if [ -n "$GITHUB_APP_ID" ] && [ -f "$GITHUB_APP_PRIVATE_KEY_FILE" ]; then
    echo "Using GitHub App authentication..."
    
    # Generate access token using GitHub App
    ACCESS_TOKEN=$(/usr/local/bin/generate-app-token.sh)
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo "ERROR: Failed to generate GitHub App access token"
        exit 1
    fi
    
    echo "Successfully obtained GitHub App access token"
    export ACCESS_TOKEN="$ACCESS_TOKEN"
    
    # Clear the registration token since we're using App authentication
    unset RUNNER_TOKEN
    
elif [ -n "$RUNNER_TOKEN" ]; then
    echo "Using registration token authentication..."
    
else
    echo "ERROR: Either GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY_FILE or RUNNER_TOKEN must be provided"
    exit 1
fi

# Add token refresh logic for long-running containers
if [ -n "$GITHUB_APP_ID" ]; then
    # Start token refresh in background
    (
        while true; do
            # Refresh token every 50 minutes (tokens expire after 1 hour)
            sleep 3000
            echo "Refreshing GitHub App access token..."
            NEW_TOKEN=$(/usr/local/bin/generate-app-token.sh)
            if [ -n "$NEW_TOKEN" ]; then
                export ACCESS_TOKEN="$NEW_TOKEN"
                echo "Access token refreshed successfully"
            else
                echo "WARNING: Failed to refresh access token"
            fi
        done
    ) &
fi

# Call the original entrypoint from the base image
exec /entrypoint.sh "$@"
