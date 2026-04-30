#!/bin/bash

# Nginx Setup Script for Production
# This script ensures nginx configuration is properly set up

echo "🔧 Setting up Nginx configuration for production..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_DIR="$PROJECT_ROOT/nginx"
NGINX_CONF="$NGINX_DIR/nginx.conf"

# Create nginx directory if it doesn't exist
if [ ! -d "$NGINX_DIR" ]; then
    echo "📁 Creating nginx directory..."
    mkdir -p "$NGINX_DIR"
fi

# Check if nginx.conf exists
if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ Error: nginx.conf not found at $NGINX_CONF"
    echo "   Please ensure the nginx configuration file exists."
    exit 1
fi

# Verify the file is readable
if [ ! -r "$NGINX_CONF" ]; then
    echo "❌ Error: nginx.conf is not readable"
    echo "   Please check file permissions."
    exit 1
fi

echo "📊 Nginx configuration details:"
echo "  File: $NGINX_CONF"
echo "  Size: $(stat -f%z "$NGINX_CONF" 2>/dev/null || stat -c%s "$NGINX_CONF" 2>/dev/null) bytes"
echo "  Permissions: $(ls -la "$NGINX_CONF" | awk '{print $1}')"

# Test nginx configuration syntax
echo "🔍 Testing nginx configuration syntax..."
if docker run --rm -v "$NGINX_CONF:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Error: Nginx configuration syntax is invalid!"
    echo "   Please fix the configuration before proceeding."
    exit 1
fi

# Create additional required directories
echo "📁 Creating additional required directories..."
mkdir -p "$PROJECT_ROOT/certbot/conf"
mkdir -p "$PROJECT_ROOT/certbot/www"
mkdir -p "$PROJECT_ROOT/logs/nginx"
mkdir -p "$PROJECT_ROOT/logs/certbot"

echo "✅ Nginx setup complete!"
echo ""
echo "You can now run the production deployment:"
echo "  ./scripts/deploy-production.sh"
