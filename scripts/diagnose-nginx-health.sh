#!/bin/bash

# Nginx Health Diagnostic Script
# Comprehensive diagnostic tool for nginx Docker container health issues

echo "🏥 NGINX HEALTH DIAGNOSTIC SCRIPT"
echo "=================================="
echo "$(date)"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if nginx container is running
check_nginx_container() {
    echo -e "${BLUE}📦 CONTAINER STATUS CHECK${NC}"
    echo "----------------------------"
    
    # Get nginx container info
    NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
    
    if [ -z "$NGINX_CONTAINER" ]; then
        echo -e "${RED}❌ No nginx container found running${NC}"
        
        # Check if container exists but is stopped
        STOPPED_NGINX=$(docker ps -a --filter "name=nginx" --format "table {{.Names}}\t{{.Status}}")
        if [ ! -z "$STOPPED_NGINX" ]; then
            echo -e "${YELLOW}⚠️  Found stopped nginx container:${NC}"
            echo "$STOPPED_NGINX"
        fi
        return 1
    else
        echo -e "${GREEN}✅ Nginx container found:${NC}"
        echo "$NGINX_CONTAINER"
    fi
    
    # Get container ID
    CONTAINER_ID=$(docker ps --filter "name=nginx" --format "{{.ID}}")
    echo "Container ID: $CONTAINER_ID"
    echo ""
    return 0
}

# Function to check nginx container health
check_container_health() {
    echo -e "${BLUE}💊 CONTAINER HEALTH STATUS${NC}"
    echo "----------------------------"
    
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_ID 2>/dev/null)
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ Container health status: $HEALTH_STATUS${NC}"
    elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
        echo -e "${RED}❌ Container health status: $HEALTH_STATUS${NC}"
        
        # Get last few health check results
        echo ""
        echo "Recent health check logs:"
        docker inspect --format='{{range .State.Health.Log}}{{.Start}}: {{.Output}}{{end}}' $CONTAINER_ID | tail -5
    else
        echo -e "${YELLOW}⚠️  Container health status: ${HEALTH_STATUS:-unknown}${NC}"
    fi
    echo ""
}

# Function to check nginx process inside container
check_nginx_process() {
    echo -e "${BLUE}⚙️  NGINX PROCESS CHECK${NC}"
    echo "------------------------"
    
    # Check if nginx process is running
    NGINX_PROCESSES=$(docker exec $CONTAINER_ID ps aux | grep nginx | grep -v grep)
    
    if [ -z "$NGINX_PROCESSES" ]; then
        echo -e "${RED}❌ No nginx processes found running in container${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Nginx processes found:${NC}"
        echo "$NGINX_PROCESSES"
    fi
    echo ""
}

# Function to test nginx configuration
check_nginx_config() {
    echo -e "${BLUE}📋 NGINX CONFIGURATION TEST${NC}"
    echo "-----------------------------"
    
    CONFIG_TEST=$(docker exec $CONTAINER_ID nginx -t 2>&1)
    CONFIG_EXIT_CODE=$?
    
    if [ $CONFIG_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        echo "$CONFIG_TEST"
    else
        echo -e "${RED}❌ Nginx configuration test failed${NC}"
        echo "$CONFIG_TEST"
        
        echo ""
        echo "Current nginx configuration:"
        docker exec $CONTAINER_ID cat /etc/nginx/nginx.conf
    fi
    echo ""
}

# Function to test health endpoint directly
test_health_endpoint() {
    echo -e "${BLUE}🔍 HEALTH ENDPOINT TESTING${NC}"
    echo "---------------------------"
    
    # Test health endpoint from inside container
    echo "Testing health endpoint from inside container:"
    INTERNAL_HEALTH=$(docker exec $CONTAINER_ID wget --no-verbose --tries=1 --spider http://localhost/health 2>&1)
    INTERNAL_EXIT_CODE=$?
    
    if [ $INTERNAL_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Internal health check successful${NC}"
        echo "$INTERNAL_HEALTH"
    else
        echo -e "${RED}❌ Internal health check failed${NC}"
        echo "$INTERNAL_HEALTH"
    fi
    
    echo ""
    
    # Test from host if port is exposed
    echo "Testing health endpoint from host:"
    HOST_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || wget --no-verbose --tries=1 --spider http://localhost/health 2>&1)
    HOST_EXIT_CODE=$?
    
    if [ $HOST_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ External health check successful${NC}"
        echo "HTTP Status: $HOST_HEALTH"
    else
        echo -e "${RED}❌ External health check failed${NC}"
        echo "$HOST_HEALTH"
    fi
    echo ""
}

# Function to check nginx logs
check_nginx_logs() {
    echo -e "${BLUE}📝 NGINX LOGS ANALYSIS${NC}"
    echo "-----------------------"
    
    echo "Recent nginx container logs (last 20 lines):"
    docker logs --tail 20 $CONTAINER_ID
    
    echo ""
    echo "Recent nginx error logs from inside container:"
    docker exec $CONTAINER_ID tail -10 /var/log/nginx/error.log 2>/dev/null || echo "Error log not accessible"
    
    echo ""
    echo "Recent nginx access logs from inside container:"
    docker exec $CONTAINER_ID tail -5 /var/log/nginx/access.log 2>/dev/null || echo "Access log not accessible"
    echo ""
}

# Function to check backend connectivity
check_backend_connectivity() {
    echo -e "${BLUE}🔗 BACKEND CONNECTIVITY CHECK${NC}"
    echo "-------------------------------"
    
    # Check if app container is running
    APP_CONTAINER=$(docker ps --filter "name=app" --format "{{.Names}}")
    
    if [ -z "$APP_CONTAINER" ]; then
        echo -e "${RED}❌ No app container found running${NC}"
        echo "Nginx health check may fail because backend is not available"
    else
        echo -e "${GREEN}✅ App container found: $APP_CONTAINER${NC}"
        
        # Test connectivity from nginx to app
        echo "Testing connectivity from nginx to app container:"
        BACKEND_TEST=$(docker exec $CONTAINER_ID wget --no-verbose --tries=1 --spider http://app:5000/health 2>&1)
        BACKEND_EXIT_CODE=$?
        
        if [ $BACKEND_EXIT_CODE -eq 0 ]; then
            echo -e "${GREEN}✅ Backend connectivity successful${NC}"
            echo "$BACKEND_TEST"
        else
            echo -e "${RED}❌ Backend connectivity failed${NC}"
            echo "$BACKEND_TEST"
        fi
    fi
    echo ""
}

# Function to check network connectivity
check_network() {
    echo -e "${BLUE}🌐 NETWORK CONFIGURATION${NC}"
    echo "-------------------------"
    
    # Check which networks the nginx container is connected to
    NETWORKS=$(docker inspect $CONTAINER_ID --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}')
    echo "Container networks: $NETWORKS"
    
    # Check if nginx can resolve app hostname
    echo ""
    echo "DNS resolution test (app hostname):"
    docker exec $CONTAINER_ID nslookup app 2>/dev/null || echo "nslookup not available or failed"
    
    echo ""
    echo "Network connectivity test:"
    docker exec $CONTAINER_ID ping -c 2 app 2>/dev/null || echo "ping not available or failed"
    echo ""
}

# Function to provide recommendations
provide_recommendations() {
    echo -e "${BLUE}💡 TROUBLESHOOTING RECOMMENDATIONS${NC}"
    echo "====================================="
    
    echo "Based on the diagnostic results above, here are common solutions:"
    echo ""
    echo "1. 🔄 Container restart:"
    echo "   docker-compose restart nginx"
    echo ""
    echo "2. 🔍 Check environment variables:"
    echo "   docker exec $CONTAINER_ID env | grep NGINX"
    echo ""
    echo "3. 🔧 Rebuild with no cache:"
    echo "   docker-compose down nginx && docker-compose up --build nginx"
    echo ""
    echo "4. 📊 Monitor logs in real-time:"
    echo "   docker logs -f $CONTAINER_ID"
    echo ""
    echo "5. 🏥 Manual health check:"
    echo "   docker exec $CONTAINER_ID wget --no-verbose --tries=1 --spider http://localhost/health"
    echo ""
    echo "6. 📋 Validate nginx config manually:"
    echo "   docker exec $CONTAINER_ID nginx -t"
    echo ""
    echo "7. 🔄 Force container recreation:"
    echo "   docker-compose down && docker-compose up -d"
    echo ""
}

# Main execution
main() {
    if check_nginx_container; then
        check_container_health
        check_nginx_process
        check_nginx_config
        test_health_endpoint
        check_backend_connectivity
        check_network
        check_nginx_logs
    else
        echo -e "${RED}Cannot proceed with detailed diagnostics - nginx container not found${NC}"
        echo ""
        echo "Try starting the nginx container:"
        echo "docker-compose up -d nginx"
    fi
    
    provide_recommendations
}

# Run the diagnostic
main
