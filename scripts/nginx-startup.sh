#!/bin/sh

# Nginx startup script with intelligent SSL certificate detection and improved DNS resolution
echo "Starting nginx configuration..."
echo "Domain: ${NGINX_HOST}"

# Safety: ensure NGINX_HOST is set to avoid generating invalid configs
if [ -z "${NGINX_HOST}" ]; then
    echo "❌ NGINX_HOST is not set. Set NGINX_HOST (usually your DOMAIN) before starting nginx."
    echo "   In production you can export DOMAIN in .env.prod and it will be mapped to NGINX_HOST."
    exit 1
fi

# Wait for app service to be available
echo "Waiting for app service to be available..."
timeout=60
while [ $timeout -gt 0 ]; do
    if nc -z app 5000 2>/dev/null; then
        echo "✅ App service is available"
        break
    fi
    echo "⏳ Waiting for app service... (${timeout}s remaining)"
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "⚠️  App service not available, continuing anyway..."
fi

CERT_PATH="/etc/letsencrypt/live/${NGINX_HOST}"

# Check if certificates exist
if [ -f "${CERT_PATH}/fullchain.pem" ] && [ -f "${CERT_PATH}/privkey.pem" ]; then
    echo "✅ SSL certificates found for ${NGINX_HOST}"
    
    # Check if this is a self-signed certificate
    # Use a simpler heuristic: check if the cert directory contains Let's Encrypt files
    # Let's Encrypt certs typically have a chain.pem file, self-signed usually don't
    if [ -f "${CERT_PATH}/chain.pem" ]; then
        echo "🌐 Detected CA-signed certificate (Let's Encrypt structure)"
        
        # Use standard template with OCSP stapling
        envsubst '${NGINX_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/nginx.conf
        
        echo "📋 Configuration optimized for CA-signed certificates"
    else
        echo "🔒 Detected self-signed certificate (no chain.pem found)"
        
        # Create nginx config for self-signed certificates
        envsubst '${NGINX_HOST}' < /etc/nginx/templates/default.conf.template > /tmp/nginx.conf
        
        # Remove OCSP stapling lines for self-signed certs
        sed -i '/ssl_stapling/d' /tmp/nginx.conf
        sed -i '/ssl_trusted_certificate/d' /tmp/nginx.conf
        sed -i '/resolver.*valid=300s/d' /tmp/nginx.conf
        sed -i '/resolver_timeout/d' /tmp/nginx.conf
        
        cp /tmp/nginx.conf /etc/nginx/nginx.conf
        
        echo "📋 Configuration optimized for self-signed certificates"
    fi
    
    # Test nginx configuration
    if nginx -t; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration test failed"
        echo "📄 Configuration content:"
        cat /etc/nginx/nginx.conf
        exit 1
    fi
    
else
    echo "⚠️  No SSL certificates found, using HTTP-only configuration"
    cp /etc/nginx/nginx-http.conf /etc/nginx/nginx.conf
    
    # Remove any default configurations that might conflict
    rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
fi

# Test nginx configuration before starting
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed"
    echo "📄 Current configuration:"
    cat /etc/nginx/nginx.conf
    echo "📁 Configuration directory contents:"
    ls -la /etc/nginx/
    ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "No conf.d directory"
    exit 1
fi

echo "🚀 Starting nginx..."

# Start the Watchtower monitor in the background to handle container updates
if [ -f /usr/local/bin/nginx-watchtower-monitor.sh ]; then
    echo "🔍 Starting Watchtower monitor for automatic reload on container updates..."
    sh /usr/local/bin/nginx-watchtower-monitor.sh &
fi

exec nginx -g 'daemon off;'
