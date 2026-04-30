#!/bin/bash

# Nginx Docker Diagnostics Script
# This script helps diagnose nginx health check issues in Docker environments

echo "=== Nginx Docker Health Diagnostics ==="
echo "Date: $(date)"
echo "========================================"

# Function to check if we're inside a container
check_environment() {
    echo "🔍 Environment Check:"
    if [ -f /.dockerenv ]; then
        echo "  ✅ Running inside Docker container"
    else
        echo "  📋 Running on host system"
    fi
    echo "  🏠 Hostname: $(hostname)"
    echo "  👤 User: $(whoami)"
    echo ""
}

# Function to check Docker services
check_docker_services() {
    echo "🐳 Docker Services Status:"
    
    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
        echo "  📊 Container Status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  ❌ Cannot access Docker (permission issue?)"
        echo ""
        
        echo "  🏥 Health Check Status:"
        docker ps --format "table {{.Names}}\t{{.Status}}" --filter "health=healthy" 2>/dev/null | head -10
        docker ps --format "table {{.Names}}\t{{.Status}}" --filter "health=unhealthy" 2>/dev/null | head -10
        echo ""
    else
        echo "  ❌ Docker not available"
    fi
}

# Function to check nginx specific issues
check_nginx() {
    echo "🌐 Nginx Status:"
    
    # Check if nginx is running
    if pgrep nginx > /dev/null; then
        echo "  ✅ Nginx process is running"
        echo "  📊 Nginx processes: $(pgrep nginx | wc -l)"
    else
        echo "  ❌ Nginx process not found"
    fi
    
    # Check nginx configuration
    if command -v nginx &> /dev/null; then
        echo "  🔧 Testing nginx configuration:"
        if nginx -t &> /dev/null; then
            echo "    ✅ Nginx configuration is valid"
        else
            echo "    ❌ Nginx configuration has errors:"
            nginx -t 2>&1 | head -5
        fi
    fi
    
    # Check listening ports
    echo "  📡 Listening ports:"
    netstat -tlnp 2>/dev/null | grep nginx || ss -tlnp 2>/dev/null | grep nginx || echo "    ❌ Cannot check ports"
    echo ""
}

# Function to check network connectivity
check_network() {
    echo "🌐 Network Connectivity:"
    
    # Test local nginx
    echo "  🏠 Local nginx health check:"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health &> /dev/null; then
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health)
        echo "    📡 HTTP health check: $http_code"
    else
        echo "    ❌ HTTP health check failed"
    fi
    
    if curl -s -k -o /dev/null -w "%{http_code}" https://localhost:443/health &> /dev/null; then
        local https_code=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost:443/health)
        echo "    🔒 HTTPS health check: $https_code"
    else
        echo "    ❌ HTTPS health check failed"
    fi
    
    # Test backend connectivity
    echo "  🔗 Backend connectivity:"
    local backend_hosts=("app:5000" "localhost:5000" "127.0.0.1:5000")
    for host in "${backend_hosts[@]}"; do
        if timeout 5 bash -c "</dev/tcp/${host/:/ }" &> /dev/null; then
            echo "    ✅ Can connect to $host"
        else
            echo "    ❌ Cannot connect to $host"
        fi
    done
    echo ""
}

# Function to check log files
check_logs() {
    echo "📝 Log Analysis:"
    
    local log_paths=("/var/log/nginx" "/app/logs" "./logs")
    
    for log_path in "${log_paths[@]}"; do
        if [ -d "$log_path" ]; then
            echo "  📁 Logs in $log_path:"
            ls -la "$log_path" 2>/dev/null | head -5
            
            # Check recent errors
            if [ -f "$log_path/error.log" ]; then
                echo "  ⚠️  Recent errors (last 10):"
                tail -10 "$log_path/error.log" 2>/dev/null | sed 's/^/    /'
            fi
            
            # Check recent access logs
            if [ -f "$log_path/access.log" ]; then
                echo "  📊 Recent access (last 5):"
                tail -5 "$log_path/access.log" 2>/dev/null | sed 's/^/    /'
            fi
            echo ""
        fi
    done
}

# Function to check disk space
check_resources() {
    echo "💽 Resource Usage:"
    echo "  💾 Disk usage:"
    df -h / 2>/dev/null | sed 's/^/    /'
    
    echo "  🧠 Memory usage:"
    free -h 2>/dev/null | sed 's/^/    /' || echo "    ❌ Cannot check memory"
    
    echo "  ⚡ Load average:"
    uptime | sed 's/^/    /'
    echo ""
}

# Function to suggest fixes
suggest_fixes() {
    echo "🔧 Suggested Fixes:"
    echo ""
    echo "  1. 📋 Health Check Issues:"
    echo "     - Change health check to use HTTPS: https://localhost:443/health"
    echo "     - Add internal health check endpoint that doesn't redirect"
    echo "     - Use wget instead of curl in health check"
    echo ""
    echo "  2. 🔗 Backend Connection Issues:"
    echo "     - Ensure app container is running and healthy"
    echo "     - Check if app service is named 'app' in docker-compose"
    echo "     - Verify app is listening on port 5000"
    echo "     - Check docker network connectivity"
    echo ""
    echo "  3. 🌐 Network Issues:"
    echo "     - Restart nginx container: docker-compose restart nginx"
    echo "     - Check docker-compose network configuration"
    echo "     - Verify service names match nginx upstream config"
    echo ""
    echo "  4. 📝 Configuration Issues:"
    echo "     - Test nginx config: docker exec nginx nginx -t"
    echo "     - Reload nginx: docker exec nginx nginx -s reload"
    echo "     - Check SSL certificate paths and permissions"
    echo ""
}

# Main execution
main() {
    check_environment
    check_docker_services
    check_nginx
    check_network
    check_logs
    check_resources
    suggest_fixes
    
    echo "✅ Diagnostics complete!"
    echo "📋 Save this output and share with your team for troubleshooting."
}

# Run the diagnostics
main
