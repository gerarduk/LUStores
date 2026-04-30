#!/bin/bash

# PostgreSQL Compatibility Check Script
# Helps ensure smooth deployments when mounting existing PostgreSQL data

set -e

DB_PATH="/db"
EXPECTED_VERSION="15"

echo "🔍 Checking PostgreSQL data compatibility..."

# Check if data directory exists and has content
if [ -d "$DB_PATH" ] && [ "$(ls -A $DB_PATH)" ]; then
    echo "📁 Existing PostgreSQL data found at $DB_PATH"
    
    # Check for version file
    if [ -f "$DB_PATH/PG_VERSION" ]; then
        EXISTING_VERSION=$(cat "$DB_PATH/PG_VERSION")
        echo "📊 Existing PostgreSQL version: $EXISTING_VERSION"
        echo "📊 Expected PostgreSQL version: $EXPECTED_VERSION"
        
        if [ "$EXISTING_VERSION" = "$EXPECTED_VERSION" ]; then
            echo "✅ PostgreSQL versions match - safe to proceed"
        else
            echo "⚠️  PostgreSQL version mismatch detected!"
            echo "   Existing: $EXISTING_VERSION"
            echo "   Expected: $EXPECTED_VERSION"
            echo ""
            echo "🔧 Recommended actions:"
            echo "   1. Backup existing data: pg_dump -h localhost -U postgres university_inventory > backup.sql"
            echo "   2. Move old data: mv $DB_PATH $DB_PATH.backup.$(date +%Y%m%d)"
            echo "   3. Create fresh directory: mkdir -p $DB_PATH"
            echo "   4. Start new PostgreSQL and restore: psql -h localhost -U postgres university_inventory < backup.sql"
            echo ""
            read -p "⚡ Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "❌ Deployment cancelled for safety"
                exit 1
            fi
        fi
    else
        echo "⚠️  No PG_VERSION file found - data directory may be corrupted or empty"
    fi
    
    # Check permissions
    echo "🔐 Checking directory permissions..."
    if [ -w "$DB_PATH" ]; then
        echo "✅ Directory is writable"
    else
        echo "❌ Directory is not writable - fixing permissions..."
        sudo chown -R 999:999 "$DB_PATH"
        sudo chmod 750 "$DB_PATH"
    fi
    
else
    echo "📁 No existing PostgreSQL data found - will initialize fresh database"
    mkdir -p "$DB_PATH"
    sudo chown -R 999:999 "$DB_PATH"
    sudo chmod 750 "$DB_PATH"
fi

echo "✅ PostgreSQL compatibility check complete"
