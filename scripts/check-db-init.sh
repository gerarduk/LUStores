#!/bin/bash
# Database initialization check script
# This script helps ensure the database is properly initialized regardless of existing data

set -e

# Function to check if database exists and has required tables
check_database() {
    echo "Checking database initialization status..."
    
    # Wait for PostgreSQL to be ready
    until pg_isready -h db -p 5432 -U postgres; do
        echo "Waiting for PostgreSQL to be ready..."
        sleep 2
    done
    
    # Check if the database exists
    if psql -h db -U postgres -lqt | cut -d \| -f 1 | grep -qw university_inventory; then
        echo "✅ Database 'university_inventory' exists"
        
        # Check if required tables exist
        TABLE_COUNT=$(psql -h db -U postgres -d university_inventory -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'items', 'orders', 'sessions');")
        
        if [ "$TABLE_COUNT" -eq 4 ]; then
            echo "✅ All required tables exist"
            return 0
        else
            echo "⚠️  Some required tables are missing. Found $TABLE_COUNT/4 tables."
            echo "📝 Running database initialization..."
            psql -h db -U postgres -d university_inventory -f /app/init.sql
            return 0
        fi
    else
        echo "❌ Database 'university_inventory' does not exist"
        echo "📝 Database will be created automatically by PostgreSQL init process"
        return 1
    fi
}

# Function to create database if it doesn't exist
ensure_database() {
    echo "Ensuring database exists..."
    psql -h db -U postgres -c "CREATE DATABASE university_inventory;" 2>/dev/null || echo "Database already exists or will be created by init process"
}

# Main execution
if [ "$1" = "check" ]; then
    check_database
elif [ "$1" = "ensure" ]; then
    ensure_database
    check_database
else
    echo "Usage: $0 {check|ensure}"
    echo "  check  - Check if database and tables exist"
    echo "  ensure - Ensure database exists and check tables"
    exit 1
fi
