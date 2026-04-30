#!/bin/bash

echo "=== Production Server Health Check ==="
echo "Checking production server status..."

# Test SSH connectivity
echo "1. Testing SSH connectivity to production server..."
if timeout 10 ssh -o ConnectTimeout=5 stores@10.44.7.220 "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection working"
    
    echo ""
    echo "2. Checking Docker containers on production server..."
    ssh stores@10.44.7.220 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null || echo "❌ Failed to get Docker status"
    
    echo ""
    echo "3. Checking Docker Compose services..."
    ssh stores@10.44.7.220 "cd LUStores && docker compose ps" 2>/dev/null || echo "❌ Failed to get Docker Compose status"
    
    echo ""
    echo "4. Checking nginx container logs (last 10 lines)..."
    ssh stores@10.44.7.220 "cd LUStores && docker compose logs --tail=10 nginx" 2>/dev/null || echo "❌ Failed to get nginx logs"
    
    echo ""
    echo "5. Checking app container logs (last 10 lines)..."
    ssh stores@10.44.7.220 "cd LUStores && docker compose logs --tail=10 app" 2>/dev/null || echo "❌ Failed to get app logs"
    
    echo ""
    echo "6. Checking system resources..."
    ssh stores@10.44.7.220 "df -h / && free -h" 2>/dev/null || echo "❌ Failed to get system resources"
    
else
    echo "❌ Cannot connect to production server via SSH"
    echo "This could mean:"
    echo "  - Server is completely down"
    echo "  - SSH service is not running"
    echo "  - Network connectivity issues"
    echo "  - Authentication problems"
fi

echo ""
echo "=== Health Check Complete ==="
