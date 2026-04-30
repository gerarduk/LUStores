#!/bin/bash

# Git Pull Cron Job Script
# Safely pulls the latest changes from the remote repository
# Logs all activity for debugging

# Configuration
REPO_DIR="/home/stores/LUStores"
LOG_FILE="/home/stores/LUStores/logs/git-pull-cron.log"
LOCK_FILE="/tmp/git-pull-cron.lock"

# SSH configuration for deployment environment
export GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o ConnectTimeout=10"

# Set HOME for SSH key access (important for cron jobs)
export HOME="/home/stores"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup on exit
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Check if another instance is running
if [ -f "$LOCK_FILE" ]; then
    log "ERROR: Another git pull is already running (lock file exists)"
    exit 1
fi

# Create lock file
touch "$LOCK_FILE"

log "Starting git pull cron job"

# Change to repository directory
if [ ! -d "$REPO_DIR" ]; then
    log "ERROR: Repository directory $REPO_DIR does not exist"
    exit 1
fi

cd "$REPO_DIR" || {
    log "ERROR: Could not change to directory $REPO_DIR"
    exit 1
}

# Check if it's a git repository
if [ ! -d ".git" ]; then
    log "ERROR: $REPO_DIR is not a git repository"
    exit 1
fi

log "Pulling changes from origin/$CURRENT_BRANCH"
if git pull 2>&1 | tee -a "$LOG_FILE"; then
    AFTER_COMMIT=$(git rev-parse HEAD)
    log "Pull completed successfully"
    log "Updated from $BEFORE_COMMIT to $AFTER_COMMIT"
    
    # Show what changed
    log "Changes pulled:"
    git log --oneline "$BEFORE_COMMIT".."$AFTER_COMMIT" 2>&1 | tee -a "$LOG_FILE"
else
    log "ERROR: Git pull failed"
    exit 1
fi

log "Git pull cron job completed successfully"
