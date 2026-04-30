#!/bin/bash
set -e

echo "Starting GitHub Actions Runner (Alpine)..."
echo "Repository: ${GITHUB_REPOSITORY}"
echo "Runner Name: ${RUNNER_NAME}"
echo "Labels: ${RUNNER_LABELS}"

# Function to cleanup runner on exit
cleanup() {
    echo "Cleaning up..."
    if [ -f ".runner" ]; then
        echo "Removing runner from GitHub..."
        ./config.sh remove --unattended --token "${GITHUB_TOKEN}" || echo "Failed to remove runner, but continuing..."
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Configure the runner
echo "Configuring runner..."
./config.sh \
    --url "https://github.com/${GITHUB_REPOSITORY}" \
    --token "${GITHUB_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}" \
    --work "_work" \
    --unattended \
    ${RUNNER_EPHEMERAL:+--ephemeral}

echo "Starting runner..."
./run.sh
