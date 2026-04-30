#!/bin/bash

# Database Reset Script for Production
# This script safely resets the PostgreSQL database volume

echo "🗄️ PostgreSQL Database Reset Script"
echo "⚠️  WARNING: This will permanently delete all database data!"
echo ""

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.prod | xargs)

echo "Current database configuration:"
echo "  Database URL: ${DATABASE_URL}"
echo "  Domain: ${DOMAIN}"
echo ""

# Confirm action
read -p "Are you ABSOLUTELY sure you want to reset the database? Type 'RESET' to confirm: " -r
if [ "$REPLY" != "RESET" ]; then
    echo "❌ Database reset cancelled"
    exit 1
fi

echo "🛑 Stopping all services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

echo "🗑️ Removing PostgreSQL volume..."
docker volume rm $(docker volume ls -q | grep postgres_data) 2>/dev/null || true

echo "🧹 Cleaning up containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml rm -f db

echo "✅ Database reset complete"
echo ""
echo "To start fresh, run: ./scripts/deploy-production.sh"
