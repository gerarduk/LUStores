#!/bin/bash

# Watchtower Management Script for LUStores Production
# This script helps manage Watchtower operations for the production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

usage() {
    echo "Usage: $0 {status|start|stop|restart|logs|check-updates|force-update}"
    echo ""
    echo "Commands:"
    echo "  status        - Check Watchtower container status"
    echo "  start         - Start Watchtower service"
    echo "  stop          - Stop Watchtower service"
    echo "  restart       - Restart Watchtower service"
    echo "  logs          - View Watchtower logs"
    echo "  check-updates - Trigger manual update check"
    echo "  force-update  - Force update of app container"
    exit 1
}

check_requirements() {
    if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/.env.prod" ]; then
        print_warning ".env.prod file not found. Using default environment variables."
    fi
}

watchtower_status() {
    print_status "Checking Watchtower status..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" ps watchtower
}

watchtower_start() {
    print_status "Starting Watchtower service..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file .env.prod up -d watchtower
    print_success "Watchtower started successfully"
}

watchtower_stop() {
    print_status "Stopping Watchtower service..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" stop watchtower
    print_success "Watchtower stopped successfully"
}

watchtower_restart() {
    print_status "Restarting Watchtower service..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" --env-file .env.prod restart watchtower
    print_success "Watchtower restarted successfully"
}

watchtower_logs() {
    print_status "Showing Watchtower logs..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f watchtower
}

check_updates() {
    print_status "Triggering manual update check..."
    cd "$PROJECT_ROOT"
    # Send SIGUSR1 to watchtower to trigger immediate check
    WATCHTOWER_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q watchtower)
    if [ -n "$WATCHTOWER_CONTAINER" ]; then
        docker kill --signal=SIGUSR1 "$WATCHTOWER_CONTAINER"
        print_success "Update check triggered. Check logs for results."
    else
        print_error "Watchtower container not found or not running"
        exit 1
    fi
}

force_update() {
    print_warning "Force updating app container..."
    cd "$PROJECT_ROOT"
    
    # Pull latest image
    docker pull st7ma784/lustores:latest
    
    # Restart app service with new image
    docker-compose -f "$COMPOSE_FILE" --env-file .env.prod up -d app
    
    print_success "App container updated and restarted"
}

# Main script logic
case "$1" in
    status)
        check_requirements
        watchtower_status
        ;;
    start)
        check_requirements
        watchtower_start
        ;;
    stop)
        check_requirements
        watchtower_stop
        ;;
    restart)
        check_requirements
        watchtower_restart
        ;;
    logs)
        check_requirements
        watchtower_logs
        ;;
    check-updates)
        check_requirements
        check_updates
        ;;
    force-update)
        check_requirements
        force_update
        ;;
    *)
        usage
        ;;
esac

exit 0
