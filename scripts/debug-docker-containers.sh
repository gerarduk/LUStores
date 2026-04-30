#!/bin/bash
# Docker Container Debugging Script for Production
# This script helps diagnose why containers are being killed quickly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="lustores"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to check system resources
check_system_resources() {
    log "=== SYSTEM RESOURCES ==="
    
    # Memory usage
    echo "Memory Usage:"
    free -h
    echo
    
    # Disk usage
    echo "Disk Usage:"
    df -h
    echo
    
    # System load
    echo "System Load:"
    uptime
    echo
    
    # Check for OOM killer activity
    echo "OOM Killer Activity (last 50 lines):"
    if [ -f /var/log/kern.log ]; then
        grep -i "killed process" /var/log/kern.log | tail -20 || echo "No OOM killer activity found"
    elif [ -f /var/log/messages ]; then
        grep -i "killed process" /var/log/messages | tail -20 || echo "No OOM killer activity found"
    else
        dmesg | grep -i "killed process" | tail -20 || echo "No OOM killer activity found"
    fi
    echo
}

# Function to check Docker daemon status
check_docker_daemon() {
    log "=== DOCKER DAEMON STATUS ==="
    
    echo "Docker Version:"
    docker version --format "Client: {{.Client.Version}}, Server: {{.Server.Version}}"
    echo
    
    echo "Docker System Info:"
    docker system df
    echo
    
    echo "Docker Events (last 50):"
    docker events --since 1h --until now | tail -50 || echo "No recent Docker events"
    echo
}

# Function to analyze container logs
analyze_container_logs() {
    local container_name=$1
    local lines=${2:-100}
    
    log "=== ANALYZING LOGS FOR: $container_name ==="
    
    # Check if container exists
    if ! docker ps -a --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        error "Container $container_name not found"
        return 1
    fi
    
    # Container status
    echo "Container Status:"
    docker ps -a --filter "name=$container_name" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo
    
    # Container inspect for exit codes and restart info
    echo "Container Details:"
    docker inspect "$container_name" --format '
Container: {{.Name}}
State: {{.State.Status}}
Exit Code: {{.State.ExitCode}}
Started At: {{.State.StartedAt}}
Finished At: {{.State.FinishedAt}}
Restart Count: {{.RestartCount}}
OOMKilled: {{.State.OOMKilled}}
Error: {{.State.Error}}
'
    echo
    
    # Resource limits
    echo "Resource Limits:"
    docker inspect "$container_name" --format '
Memory Limit: {{.HostConfig.Memory}}
CPU Shares: {{.HostConfig.CpuShares}}
CPU Quota: {{.HostConfig.CpuQuota}}
CPU Period: {{.HostConfig.CpuPeriod}}
'
    echo
    
    # Recent logs
    echo "Recent Logs (last $lines lines):"
    docker logs --tail "$lines" --timestamps "$container_name" 2>&1 || echo "Could not retrieve logs"
    echo
    
    # If container is running, show real-time stats
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "^${container_name}$"; then
        echo "Current Resource Usage:"
        docker stats "$container_name" --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        echo
    fi
}

# Function to check container health
check_container_health() {
    local container_name=$1
    
    log "=== HEALTH CHECK FOR: $container_name ==="
    
    # Health check status
    health_status=$(docker inspect "$container_name" --format '{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
    echo "Health Status: $health_status"
    
    if [ "$health_status" != "no-health-check" ] && [ "$health_status" != "" ]; then
        echo "Health Check Logs:"
        docker inspect "$container_name" --format '{{range .State.Health.Log}}{{.Start}}: {{.Output}}{{end}}' 2>/dev/null | tail -5
    fi
    echo
}

# Function to check Docker Compose status
check_compose_status() {
    log "=== DOCKER COMPOSE STATUS ==="
    
    if [ -f "$SCRIPT_DIR/../docker-compose.prod.yml" ]; then
        cd "$SCRIPT_DIR/.."
        echo "Compose Services Status:"
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
        echo
        
        echo "Compose Configuration Test:"
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet && echo "✓ Configuration is valid" || echo "✗ Configuration has errors"
        echo
    else
        warn "docker-compose.prod.yml not found"
    fi
}

# Function to check for common issues
check_common_issues() {
    log "=== CHECKING COMMON ISSUES ==="
    
    # Check for port conflicts
    echo "Port Usage Check:"
    netstat -tulpn | grep -E ":(80|443|5000|5432|6379|3001)" || echo "No conflicts found on common ports"
    echo
    
    # Check environment variables
    echo "Environment File Check:"
    if [ -f "$SCRIPT_DIR/../.env.prod" ]; then
        echo "✓ .env.prod exists"
        # Check for critical variables without showing sensitive data
        grep -E "^(DATABASE_URL|DOMAIN|EMAIL)" "$SCRIPT_DIR/../.env.prod" | sed 's/=.*/=***/' || echo "Some critical env vars may be missing"
    else
        error ".env.prod file not found"
    fi
    echo
    
    # Check file permissions
    echo "File Permissions Check:"
    ls -la "$SCRIPT_DIR/../docker-compose"*.yml 2>/dev/null || echo "Docker compose files not found"
    echo
    
    # Check for disk space issues
    echo "Disk Space Check:"
    docker system df
    echo
}

# Function to generate debugging report
generate_debug_report() {
    local report_file="docker-debug-$(date +%Y%m%d-%H%M%S).log"
    
    log "=== GENERATING COMPREHENSIVE DEBUG REPORT ==="
    
    {
        echo "Docker Debug Report - $(date)"
        echo "================================"
        echo
        
        check_system_resources
        check_docker_daemon
        check_compose_status
        
        # Analyze each service
        for service in app replit-auth db redis nginx certbot watchtower githubrunner; do
            container_name="${PROJECT_NAME}-${service}-1"
            if docker ps -a --format "{{.Names}}" | grep -q "$container_name"; then
                analyze_container_logs "$container_name" 200
                check_container_health "$container_name"
            else
                echo "Container $container_name not found"
                echo
            fi
        done
        
        check_common_issues
        
    } > "$report_file"
    
    log "Debug report saved to: $report_file"
}

# Function to monitor containers in real-time
monitor_containers() {
    log "=== REAL-TIME CONTAINER MONITORING ==="
    info "Press Ctrl+C to stop monitoring"
    
    # Start monitoring in background
    {
        while true; do
            clear
            echo "=== Container Status - $(date) ==="
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            echo
            
            echo "=== Resource Usage ==="
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
            echo
            
            echo "=== Recent Events ==="
            docker events --since 30s | tail -10
            echo
            
            sleep 10
        done
    }
}

# Function to setup continuous logging
setup_continuous_logging() {
    local log_dir="$SCRIPT_DIR/../logs/debug"
    mkdir -p "$log_dir"
    
    log "=== SETTING UP CONTINUOUS LOGGING ==="
    info "Logs will be saved to: $log_dir"
    
    # Log Docker events
    nohup docker events --format '{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}' > "$log_dir/docker-events.log" 2>&1 &
    
    # Log system resources every minute
    {
        while true; do
            echo "$(date): $(free -m | grep '^Mem:' | awk '{print "Memory: "$3"/"$2" MB ("$3/$2*100"%)"}'), Load: $(uptime | awk -F'load average:' '{print $2}')"
            sleep 60
        done
    } > "$log_dir/system-resources.log" 2>&1 &
    
    log "Continuous logging started (PID: $!)"
    echo "To stop: pkill -f 'docker events'"
}

# Main function
main() {
    case "${1:-help}" in
        "resources")
            check_system_resources
            ;;
        "daemon")
            check_docker_daemon
            ;;
        "logs")
            if [ -z "$2" ]; then
                error "Please specify container name. Usage: $0 logs <container_name>"
                exit 1
            fi
            analyze_container_logs "$2" "${3:-100}"
            ;;
        "health")
            if [ -z "$2" ]; then
                error "Please specify container name. Usage: $0 health <container_name>"
                exit 1
            fi
            check_container_health "$2"
            ;;
        "compose")
            check_compose_status
            ;;
        "issues")
            check_common_issues
            ;;
        "report")
            generate_debug_report
            ;;
        "monitor")
            monitor_containers
            ;;
        "continuous")
            setup_continuous_logging
            ;;
        "all")
            check_system_resources
            check_docker_daemon
            check_compose_status
            check_common_issues
            ;;
        "help"|*)
            echo "Docker Container Debugging Script"
            echo "Usage: $0 [command] [options]"
            echo
            echo "Commands:"
            echo "  resources    - Check system resources (memory, disk, load)"
            echo "  daemon       - Check Docker daemon status"
            echo "  logs <name>  - Analyze specific container logs"
            echo "  health <name>- Check specific container health"
            echo "  compose      - Check Docker Compose status"
            echo "  issues       - Check for common issues"
            echo "  report       - Generate comprehensive debug report"
            echo "  monitor      - Real-time container monitoring"
            echo "  continuous   - Setup continuous logging"
            echo "  all          - Run all checks except monitoring"
            echo "  help         - Show this help"
            echo
            echo "Examples:"
            echo "  $0 all                    # Run all diagnostic checks"
            echo "  $0 logs lustores-app-1    # Analyze app container logs"
            echo "  $0 monitor                # Real-time monitoring"
            echo "  $0 report                 # Generate full debug report"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
