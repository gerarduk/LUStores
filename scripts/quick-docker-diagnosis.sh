#!/bin/bash
# Quick Docker Container Death Diagnostic
# This script quickly identifies the most common reasons containers die

echo "🔍 Quick Docker Container Death Diagnostic"
echo "=========================================="

# Check for immediate obvious issues
echo "1. 📊 System Resources:"
echo "   Memory: $(free -h | grep '^Mem:' | awk '{print $3"/"$2}')"
echo "   Disk: $(df -h / | tail -1 | awk '{print $5" used"}')"
echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Check for OOM kills
echo "2. 💀 OOM Killer Activity:"
oom_kills=$(dmesg | grep -i "killed process" | wc -l)
if [ $oom_kills -gt 0 ]; then
    echo "   ⚠️  Found $oom_kills OOM kills - check memory usage!"
    dmesg | grep -i "killed process" | tail -3
else
    echo "   ✅ No OOM kills detected"
fi
echo ""

# Check container exit codes
echo "3. 📋 Recent Container Exit Codes:"
docker ps -a --format "table {{.Names}}\t{{.Status}}" | head -10
echo ""

# Check for common container issues
echo "4. 🔧 Quick Container Health Check:"
for container in $(docker ps -a --format "{{.Names}}" | grep lustores); do
    status=$(docker inspect $container --format '{{.State.Status}}')
    exit_code=$(docker inspect $container --format '{{.State.ExitCode}}')
    oom=$(docker inspect $container --format '{{.State.OOMKilled}}')
    restart_count=$(docker inspect $container --format '{{.RestartCount}}')
    
    echo "   $container:"
    echo "     Status: $status (Exit: $exit_code, OOM: $oom, Restarts: $restart_count)"
    
    # Quick log check for errors
    error_count=$(docker logs $container 2>&1 | grep -i error | wc -l)
    if [ $error_count -gt 0 ]; then
        echo "     ⚠️  $error_count errors in logs - check with: docker logs $container"
    fi
done
echo ""

# Check Docker daemon issues
echo "5. 🐳 Docker Daemon Health:"
docker_errors=$(docker events --since 10m --until now 2>&1 | grep -i error | wc -l)
if [ $docker_errors -gt 0 ]; then
    echo "   ⚠️  $docker_errors Docker errors in last 10 minutes"
else
    echo "   ✅ No recent Docker daemon errors"
fi
echo ""

# Check for resource limits
echo "6. 📏 Resource Limits Check:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -10
echo ""

# Quick recommendations
echo "🎯 Quick Action Recommendations:"
echo ""

# Memory issues
available_mem=$(free -m | grep '^Mem:' | awk '{print $7}')
if [ $available_mem -lt 512 ]; then
    echo "❗ LOW MEMORY: Only ${available_mem}MB available"
    echo "   → Free up memory or add more RAM"
    echo "   → Check for memory leaks: docker stats"
fi

# Disk issues
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 85 ]; then
    echo "❗ LOW DISK SPACE: ${disk_usage}% used"
    echo "   → Clean up: docker system prune -a"
    echo "   → Check logs: sudo du -h /var/lib/docker"
fi

# Container restart issues
high_restart_containers=$(docker ps -a --format "{{.Names}}" | xargs -I {} sh -c 'echo "{}:$(docker inspect {} --format "{{.RestartCount}}")"' | awk -F: '$2 > 5 {print $1}')
if [ ! -z "$high_restart_containers" ]; then
    echo "❗ HIGH RESTART COUNT:"
    echo "$high_restart_containers" | while read container; do
        echo "   → Check logs: docker logs ${container%:*}"
    done
fi

echo ""
echo "🔧 Next Steps:"
echo "   1. Run full diagnostic: ./debug-docker-containers.sh all"
echo "   2. Check specific container: ./debug-docker-containers.sh logs <container_name>"
echo "   3. Monitor real-time: ./debug-docker-containers.sh monitor"
echo "   4. Generate report: ./debug-docker-containers.sh report"
