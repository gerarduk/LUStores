#!/bin/bash

# Production Deployment Script with SSL Certificate Management
# This script handles the complete deployment process including SSL certificate generation

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"
ENV_FILE=".env.prod"
LOG_FILE="deployment.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment file
validate_environment() {
    print_status "Validating environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file $ENV_FILE not found!"
        echo "Please create $ENV_FILE with the following variables:"
        echo "DOMAIN=your-domain.com"
        echo "EMAIL=your-email@domain.com"
        echo "POSTGRES_PASSWORD=your_secure_password"
        echo "JWT_SECRET=your_jwt_secret"
        exit 1
    fi
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check required variables
    if [[ -z "$DOMAIN" ]]; then
        print_error "DOMAIN variable not set in $ENV_FILE"
        exit 1
    fi
    
    if [[ -z "$EMAIL" ]]; then
        print_error "EMAIL variable not set in $ENV_FILE"
        exit 1
    fi
    
    if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "example.com" ]]; then
        print_warning "Domain is set to $DOMAIN - SSL certificates will not be generated"
        SKIP_SSL=true
    else
        SKIP_SSL=false
    fi
    
    print_success "Environment validation completed"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists docker compose; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs/nginx
    mkdir -p certbot/conf
    mkdir -p certbot/www
    mkdir -p postgres_data
    
    print_success "Directories created"
}

# Function to build application
build_application() {
    print_status "Building application with clean cache..."
    
    # Build the application image with no cache to ensure clean build
    docker compose -f $COMPOSE_FILE build --no-cache app
    
    if [[ $? -eq 0 ]]; then
        print_success "Application build completed"
    else
        print_error "Application build failed"
        exit 1
    fi
}

# Function to start database first
start_database() {
    print_status "Starting database..."
    
    docker compose -f $COMPOSE_FILE up -d db
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Check if database is responsive
    for i in {1..30}; do
        if docker compose -f $COMPOSE_FILE exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            print_success "Database is ready"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            print_error "Database failed to start within timeout"
            exit 1
        fi
        
        sleep 2
    done
}

# Function to start application
start_application() {
    print_status "Starting application..."
    
    docker compose -f $COMPOSE_FILE up -d app
    
    # Wait for application to be ready
    print_status "Waiting for application to be ready..."
    sleep 15
    
    # Check if application is responsive
    for i in {1..30}; do
        if docker compose -f $COMPOSE_FILE exec -T app curl -f http://localhost:3000/health >/dev/null 2>&1; then
            print_success "Application is ready"
            break
        fi
        
        if [[ $i -eq 30 ]]; then
            print_error "Application failed to start within timeout"
            exit 1
        fi
        
        sleep 2
    done
}

# Function to generate SSL certificates
generate_ssl_certificates() {
    if [[ "$SKIP_SSL" == "true" ]]; then
        print_warning "Skipping SSL certificate generation for domain: $DOMAIN"
        return 0
    fi
    
    print_status "Generating SSL certificates for domain: $DOMAIN"
    
    # Check if certificates already exist
    if [[ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
        print_warning "SSL certificates already exist for $DOMAIN"
        return 0
    fi
    
    # Start nginx in HTTP-only mode first
    print_status "Starting nginx in HTTP-only mode for certificate generation..."
    docker compose -f $COMPOSE_FILE up -d nginx
    
    sleep 5
    
    # Generate certificates using certbot
    print_status "Requesting SSL certificates from Let's Encrypt..."
    
    docker compose -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"
    
    if [[ $? -eq 0 ]]; then
        print_success "SSL certificates generated successfully"
        
        # Restart nginx to use SSL configuration
        print_status "Restarting nginx with SSL configuration..."
        docker compose -f $COMPOSE_FILE restart nginx
        
        sleep 5
        
        # Test HTTPS connection
        if curl -k -f "https://$DOMAIN/health" >/dev/null 2>&1; then
            print_success "HTTPS configuration verified"
        else
            print_warning "HTTPS verification failed, but continuing deployment"
        fi
    else
        print_error "SSL certificate generation failed"
        print_warning "Continuing with HTTP-only configuration"
    fi
}

# Function to start remaining services
start_remaining_services() {
    print_status "Starting remaining services..."
    
    # Start nginx (will auto-detect SSL certificates)
    docker compose -f $COMPOSE_FILE up -d nginx
    
    # Start Watchtower for automatic updates
    docker compose -f $COMPOSE_FILE up -d watchtower
    
    print_success "All services started"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check all services are running
    print_status "Checking service status..."
    docker compose -f $COMPOSE_FILE ps
    
    # Test HTTP connection
    if curl -f "http://$DOMAIN/health" >/dev/null 2>&1 || curl -f "http://localhost/health" >/dev/null 2>&1; then
        print_success "HTTP health check passed"
    else
        print_error "HTTP health check failed"
        return 1
    fi
    
    # Test HTTPS connection if certificates exist
    if [[ -f "certbot/conf/live/$DOMAIN/fullchain.pem" && "$SKIP_SSL" != "true" ]]; then
        if curl -k -f "https://$DOMAIN/health" >/dev/null 2>&1; then
            print_success "HTTPS health check passed"
        else
            print_warning "HTTPS health check failed"
        fi
    fi
    
    print_success "Deployment verification completed"
}

# Function to show deployment summary
show_summary() {
    print_status "Deployment Summary"
    echo "==================" | tee -a "$LOG_FILE"
    echo "Domain: $DOMAIN" | tee -a "$LOG_FILE"
    echo "HTTP URL: http://$DOMAIN" | tee -a "$LOG_FILE"
    
    if [[ -f "certbot/conf/live/$DOMAIN/fullchain.pem" && "$SKIP_SSL" != "true" ]]; then
        echo "HTTPS URL: https://$DOMAIN" | tee -a "$LOG_FILE"
        echo "SSL Status: Enabled" | tee -a "$LOG_FILE"
    else
        echo "SSL Status: Disabled" | tee -a "$LOG_FILE"
    fi
    
    echo "Services:" | tee -a "$LOG_FILE"
    docker compose -f $COMPOSE_FILE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | tee -a "$LOG_FILE"
    
    echo "" | tee -a "$LOG_FILE"
    echo "Logs:" | tee -a "$LOG_FILE"
    echo "- Application logs: docker compose -f $COMPOSE_FILE logs app" | tee -a "$LOG_FILE"
    echo "- Nginx logs: docker compose -f $COMPOSE_FILE logs nginx" | tee -a "$LOG_FILE"
    echo "- Database logs: docker compose -f $COMPOSE_FILE logs db" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo "Management:" | tee -a "$LOG_FILE"
    echo "- Stop services: docker compose -f $COMPOSE_FILE down" | tee -a "$LOG_FILE"
    echo "- View logs: docker compose -f $COMPOSE_FILE logs -f" | tee -a "$LOG_FILE"
    echo "- Update containers: Watchtower will automatically update containers with the 'com.centurylinklabs.watchtower.enable=true' label" | tee -a "$LOG_FILE"
}

# Main deployment function
main() {
    echo "LUStores Production Deployment Script" | tee "$LOG_FILE"
    echo "====================================" | tee -a "$LOG_FILE"
    echo "Started at: $(date)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    validate_environment
    check_prerequisites
    create_directories
    build_application
    start_database
    start_application
    generate_ssl_certificates
    start_remaining_services
    verify_deployment
    show_summary
    
    print_success "Deployment completed successfully!"
    echo "Finished at: $(date)" | tee -a "$LOG_FILE"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "ssl-only")
        validate_environment
        generate_ssl_certificates
        ;;
    "verify")
        validate_environment
        verify_deployment
        ;;
    "stop")
        print_status "Stopping all services..."
        docker compose -f $COMPOSE_FILE down
        print_success "All services stopped"
        ;;
    "logs")
        docker compose -f $COMPOSE_FILE logs -f
        ;;
    "status")
        docker compose -f $COMPOSE_FILE ps
        ;;
    *)
        echo "Usage: $0 [deploy|ssl-only|verify|stop|logs|status]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  ssl-only  - Generate SSL certificates only"
        echo "  verify    - Verify deployment health"
        echo "  stop      - Stop all services"
        echo "  logs      - Show service logs"
        echo "  status    - Show service status"
        exit 1
        ;;
esac
