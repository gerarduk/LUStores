#!/bin/bash

# Production Deployment Script
# This script deploys the application using the production environment configuration

echo "🚀 Starting production deployment..."

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "   Please ensure the .env.prod file exists with proper configuration."
    exit 1
fi

# Load environment variables from .env.prod
echo "📋 Loading production environment variables..."
export $(grep -v '^#' .env.prod | xargs)

# Validate required environment variables
required_vars=("DOMAIN" "EMAIL" "DATABASE_URL" "SESSION_SECRET" "JWT_SECRET" "DB_PASSWORD")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Error: Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo "   Please check your .env.prod file."
    exit 1
fi

echo "✅ Environment validation passed"

# Create required directories if they don't exist
echo "📁 Creating required directories..."
mkdir -p ./nginx
mkdir -p ./certbot/conf
mkdir -p ./certbot/www
mkdir -p ./logs/nginx
mkdir -p ./logs/certbot

# Ensure nginx.conf exists and is accessible
if [ ! -f "./nginx/nginx.conf" ]; then
    echo "❌ Error: nginx/nginx.conf file not found!"
    echo "   Please ensure the nginx configuration file exists."
    exit 1
fi

# Check for existing PostgreSQL data and handle it
echo "🗄️ Checking PostgreSQL data volume..."
if docker volume ls | grep -q "postgres_data"; then
    echo "⚠️ Warning: PostgreSQL data volume already exists"
    read -p "Do you want to remove the existing database volume? This will DELETE all data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️ Removing existing PostgreSQL volume..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v
        docker volume rm $(docker volume ls -q | grep postgres_data) 2>/dev/null || true
        echo "✅ PostgreSQL volume removed"
    else
        echo "ℹ️ Keeping existing PostgreSQL volume - skipping database initialization"
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Test nginx configuration
echo "🔧 Testing nginx configuration..."
if docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Error: Nginx configuration is invalid!"
    echo "   Please check your nginx/nginx.conf file."
    exit 1
fi

# Start the services
echo "🏗️ Starting production services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Test the application
echo "🧪 Testing application health..."
if curl -f "http://localhost/health" > /dev/null 2>&1; then
    echo "✅ Application is healthy and responding"
else
    echo "⚠️ Warning: Application health check failed"
    echo "   Check the logs: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs"
fi

echo "🎉 Production deployment complete!"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo "   Restart: docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart"
echo ""
echo "🌐 Application should be available at: https://${DOMAIN}"
