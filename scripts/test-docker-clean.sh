#!/bin/bash

# Test cleanup script for Docker environment
# This script ensures a clean test environment by removing persistent volumes

echo "🧹 Cleaning up test environment..."

# Stop and remove test containers
echo "Stopping test containers..."
docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true

# Remove test-specific volumes
echo "Removing test volumes..."
docker volume rm lustores-test_test_postgres_data 2>/dev/null || true
docker volume rm lustores_test_postgres_data 2>/dev/null || true

# Remove any orphaned test containers
echo "Removing orphaned containers..."
docker container prune -f 2>/dev/null || true

# Remove any test images if needed
echo "Removing test images..."
docker image prune -f 2>/dev/null || true

echo "✅ Test environment cleanup completed"

# Run the tests with fresh environment
echo "🚀 Starting fresh test environment..."
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
