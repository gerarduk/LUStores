#!/bin/bash

# Pre-deployment Check Script
# This script validates the environment before production deployment

echo "🔍 Pre-deployment validation for LUStores..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ERRORS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_check() {
    if [ $2 -eq 0 ]; then
        echo -e "✅ ${GREEN}$1${NC}"
    else
        echo -e "❌ ${RED}$1${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

print_warning() {
    echo -e "⚠️  ${YELLOW}$1${NC}"
}

echo "1. Checking required files..."
echo "================================"

# Check .env.prod
if [ -f ".env.prod" ]; then
    print_check ".env.prod file exists" 0
    
    # Check required environment variables
    source .env.prod
    required_vars=("DOMAIN" "EMAIL" "DATABASE_URL" "SESSION_SECRET" "JWT_SECRET" "DB_PASSWORD")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_check "All required environment variables present" 0
    else
        print_check "Missing environment variables: ${missing_vars[*]}" 1
    fi
else
    print_check ".env.prod file exists" 1
fi

# Check nginx configuration
if [ -f "nginx/nginx.conf" ]; then
    print_check "nginx/nginx.conf exists" 0
    
    # Test nginx syntax
    if docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t >/dev/null 2>&1; then
        print_check "nginx configuration syntax is valid" 0
    else
        print_check "nginx configuration syntax is valid" 1
    fi
else
    print_check "nginx/nginx.conf exists" 1
fi

# Check Docker Compose files
if [ -f "docker-compose.yml" ]; then
    print_check "docker-compose.yml exists" 0
else
    print_check "docker-compose.yml exists" 1
fi

if [ -f "docker-compose.prod.yml" ]; then
    print_check "docker-compose.prod.yml exists" 0
else
    print_check "docker-compose.prod.yml exists" 1
fi

echo ""
echo "2. Checking Docker environment..."
echo "================================"

# Check Docker
if command -v docker >/dev/null 2>&1; then
    print_check "Docker is installed" 0
    
    if docker info >/dev/null 2>&1; then
        print_check "Docker daemon is running" 0
    else
        print_check "Docker daemon is running" 1
    fi
else
    print_check "Docker is installed" 1
fi

# Check Docker Compose
if command -v docker-compose >/dev/null 2>&1; then
    print_check "Docker Compose is installed" 0
else
    print_check "Docker Compose is installed" 1
fi

echo ""
echo "3. Checking existing containers..."
echo "================================"

# Check for running containers
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_warning "Some containers are already running"
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
else
    print_check "No conflicting containers running" 0
fi

echo ""
echo "4. Checking volumes..."
echo "================================"

# Check for existing PostgreSQL volume
if docker volume ls | grep -q "postgres_data"; then
    print_warning "PostgreSQL data volume already exists - may contain existing data"
    echo "   Use './scripts/reset-database.sh' if you need to start fresh"
else
    print_check "No existing PostgreSQL volume found" 0
fi

echo ""
echo "5. Summary..."
echo "================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "✅ ${GREEN}Pre-deployment validation passed!${NC}"
    echo "   You can proceed with deployment:"
    echo "   ./scripts/deploy-production.sh"
else
    echo -e "❌ ${RED}Pre-deployment validation failed with $ERRORS error(s)${NC}"
    echo "   Please fix the issues above before deploying."
    exit 1
fi

echo ""
echo "Additional preparation scripts:"
echo "  ./scripts/setup-nginx.sh       - Set up nginx configuration"
echo "  ./scripts/reset-database.sh    - Reset PostgreSQL database"
echo "  ./scripts/manage-watchtower.sh - Manage Watchtower operations"
