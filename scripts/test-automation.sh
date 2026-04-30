#!/bin/bash

# LUStores Test Automation Script
# Comprehensive testing automation with interactive menu

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
REPORTS_DIR="$PROJECT_DIR/reports"

# Ensure log directory exists
mkdir -p "$LOG_DIR"
mkdir -p "$REPORTS_DIR"

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/test-automation.log"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $(date +'%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/test-automation.log"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
    echo "[SUCCESS] $(date +'%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/test-automation.log"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $(date +'%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/test-automation.log"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        warning "Docker is not installed. Docker-based tests will not be available."
        DOCKER_AVAILABLE=false
    else
        DOCKER_AVAILABLE=true
    fi
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        warning "docker-compose is not installed. Docker-based tests will not be available."
        DOCKER_COMPOSE_AVAILABLE=false
    else
        DOCKER_COMPOSE_AVAILABLE=true
    fi
    
    # Check if we're in the correct directory
    if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
        error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    success "Prerequisites check completed."
}

# Function to setup test environment
setup_environment() {
    log "Setting up test environment..."
    
    cd "$PROJECT_DIR"
    
    # Install dependencies if node_modules doesn't exist
    if [[ ! -d "node_modules" ]]; then
        log "Installing npm dependencies..."
        npm install
    fi
    
    # Set test environment variables
    export NODE_ENV=test
    export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/test_inventory"}
    export SESSION_SECRET=${SESSION_SECRET:-"test-secret-key"}
    export CI=${CI:-false}
    
    log "Environment variables set:"
    log "  NODE_ENV=$NODE_ENV"
    log "  DATABASE_URL=$DATABASE_URL"
    log "  SESSION_SECRET=***"
    log "  CI=$CI"
    
    success "Test environment setup completed."
}

# Function to run local tests
run_local_tests() {
    local test_type=$1
    log "Running local tests: $test_type"
    
    cd "$PROJECT_DIR"
    
    case $test_type in
        "basic")
            npm test
            ;;
        "watch")
            npm run test:watch
            ;;
        "coverage")
            npm run test:coverage
            ;;
        "sales")
            npm run test:sales
            ;;
        "integration")
            npm run test:integration
            ;;
        "ci")
            npm run test:ci
            ;;
        "all")
            npm run test:all
            ;;
        *)
            error "Unknown test type: $test_type"
            return 1
            ;;
    esac
    
    success "Local tests completed: $test_type"
}

# Function to run Docker tests
run_docker_tests() {
    local test_type=$1
    
    if [[ "$DOCKER_AVAILABLE" == false ]] || [[ "$DOCKER_COMPOSE_AVAILABLE" == false ]]; then
        error "Docker or docker-compose is not available. Cannot run Docker tests."
        return 1
    fi
    
    log "Running Docker tests: $test_type"
    
    cd "$PROJECT_DIR"
    
    case $test_type in
        "basic")
            npm run test:docker
            ;;
        "sales")
            npm run test:docker-sales
            ;;
        "coverage")
            npm run test:docker-coverage
            ;;
        "watch")
            npm run test:docker-watch
            ;;
        "integration")
            npm run test:docker-integration
            ;;
        "clean")
            npm run test:clean
            ;;
        *)
            error "Unknown Docker test type: $test_type"
            return 1
            ;;
    esac
    
    success "Docker tests completed: $test_type"
}

# Function to run production tests
run_production_tests() {
    local test_type=$1
    
    if [[ "$DOCKER_COMPOSE_AVAILABLE" == false ]]; then
        error "docker-compose is not available. Cannot run production tests."
        return 1
    fi
    
    log "Running production tests: $test_type"
    
    cd "$PROJECT_DIR"
    
    case $test_type in
        "pre-deploy")
            npm run test:prod
            ;;
        "e2e")
            npm run test:e2e
            ;;
        "reports")
            npm run test:reports
            ;;
        "full-pipeline")
            npm run test:full-pipeline
            ;;
        *)
            error "Unknown production test type: $test_type"
            return 1
            ;;
    esac
    
    success "Production tests completed: $test_type"
}

# Function to clean up test environment
cleanup_environment() {
    log "Cleaning up test environment..."
    
    cd "$PROJECT_DIR"
    
    # Clean Docker containers
    if [[ "$DOCKER_COMPOSE_AVAILABLE" == true ]]; then
        npm run test:clean || true
        npm run clean:test || true
    fi
    
    # Clean coverage and reports
    rm -rf coverage || true
    rm -rf reports || true
    
    success "Test environment cleanup completed."
}

# Function to generate test reports
generate_reports() {
    log "Generating comprehensive test reports..."
    
    cd "$PROJECT_DIR"
    
    # Run tests with coverage
    npm run test:ci
    
    # Generate custom reports
    if [[ -f "scripts/generate-test-reports.js" ]]; then
        npm run test:reports
    fi
    
    # Display report locations
    echo ""
    echo -e "${PURPLE}Test Reports Generated:${NC}"
    echo -e "${CYAN}  Coverage Report:${NC} coverage/index.html"
    echo -e "${CYAN}  JUnit XML:${NC} reports/junit/js-test-results.xml"
    echo -e "${CYAN}  Test Log:${NC} $LOG_DIR/test-automation.log"
    echo ""
    
    success "Test reports generated successfully."
}

# Function to run comprehensive test suite
run_comprehensive_tests() {
    log "Running comprehensive test suite..."
    
    echo -e "${PURPLE}Starting Comprehensive Test Suite${NC}"
    echo "================================="
    echo ""
    
    # Step 1: Environment setup
    echo -e "${BLUE}Step 1: Environment Setup${NC}"
    setup_environment
    echo ""
    
    # Step 2: Linting and type checking
    echo -e "${BLUE}Step 2: Code Quality Checks${NC}"
    npm run lint:check || warning "Linting issues found"
    npm run check || error "TypeScript compilation failed"
    echo ""
    
    # Step 3: Unit tests
    echo -e "${BLUE}Step 3: Unit Tests${NC}"
    run_local_tests "ci"
    echo ""
    
    # Step 4: Integration tests
    if [[ "$DOCKER_COMPOSE_AVAILABLE" == true ]]; then
        echo -e "${BLUE}Step 4: Integration Tests${NC}"
        run_docker_tests "integration"
        echo ""
    fi
    
    # Step 5: Production tests
    if [[ "$DOCKER_COMPOSE_AVAILABLE" == true ]]; then
        echo -e "${BLUE}Step 5: Production Tests${NC}"
        run_production_tests "pre-deploy"
        echo ""
    fi
    
    # Step 6: Generate reports
    echo -e "${BLUE}Step 6: Report Generation${NC}"
    generate_reports
    echo ""
    
    success "Comprehensive test suite completed successfully!"
}

# Function to display test status
show_test_status() {
    echo -e "${PURPLE}LUStores Test Status${NC}"
    echo "==================="
    echo ""
    
    # Check if tests exist
    if [[ -d "$PROJECT_DIR/server/__tests__" ]]; then
        local test_count=$(find "$PROJECT_DIR/server/__tests__" -name "*.test.ts" | wc -l)
        echo -e "${GREEN}✓${NC} Test files found: $test_count"
    else
        echo -e "${RED}✗${NC} No test files found"
    fi
    
    # Check Jest configuration
    if [[ -f "$PROJECT_DIR/jest.config.js" ]]; then
        echo -e "${GREEN}✓${NC} Jest configuration found"
    else
        echo -e "${RED}✗${NC} Jest configuration missing"
    fi
    
    # Check Docker configuration
    if [[ -f "$PROJECT_DIR/docker-compose.test-prod.yml" ]]; then
        echo -e "${GREEN}✓${NC} Docker test configuration found"
    else
        echo -e "${YELLOW}⚠${NC} Docker test configuration missing"
    fi
    
    # Check test dependencies
    if npm list jest &>/dev/null; then
        echo -e "${GREEN}✓${NC} Jest installed"
    else
        echo -e "${RED}✗${NC} Jest not installed"
    fi
    
    # Check last test run
    if [[ -f "$PROJECT_DIR/coverage/lcov.info" ]]; then
        local last_run=$(stat -c %Y "$PROJECT_DIR/coverage/lcov.info" 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local diff=$((current_time - last_run))
        if [[ $diff -lt 3600 ]]; then
            echo -e "${GREEN}✓${NC} Tests run recently ($(($diff / 60)) minutes ago)"
        else
            echo -e "${YELLOW}⚠${NC} Tests not run recently ($(($diff / 3600)) hours ago)"
        fi
    else
        echo -e "${YELLOW}⚠${NC} No recent test coverage found"
    fi
    
    echo ""
    echo -e "${CYAN}Environment Status:${NC}"
    echo "  Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
    echo "  docker-compose: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
    echo ""
}

# Function to display interactive menu
show_menu() {
    echo -e "${PURPLE}LUStores Test Automation Menu${NC}"
    echo "=============================="
    echo ""
    echo "Local Testing:"
    echo "  1) Run basic tests"
    echo "  2) Run tests with coverage"
    echo "  3) Run sales tests"
    echo "  4) Run integration tests"
    echo "  5) Run CI tests"
    echo "  6) Run tests in watch mode"
    echo ""
    echo "Docker Testing:"
    echo "  7) Run Docker tests"
    echo "  8) Run Docker tests with coverage"
    echo "  9) Run Docker integration tests"
    echo " 10) Clean Docker test environment"
    echo ""
    echo "Production Testing:"
    echo " 11) Run pre-deployment tests"
    echo " 12) Run end-to-end tests"
    echo " 13) Run full test pipeline"
    echo ""
    echo "Utilities:"
    echo " 14) Generate test reports"
    echo " 15) Show test status"
    echo " 16) Run comprehensive test suite"
    echo " 17) Setup test environment"
    echo " 18) Clean up test environment"
    echo ""
    echo "  0) Exit"
    echo ""
}

# Main interactive menu loop
interactive_mode() {
    while true; do
        show_menu
        read -p "Enter your choice (0-18): " choice
        echo ""
        
        case $choice in
            1) run_local_tests "basic" ;;
            2) run_local_tests "coverage" ;;
            3) run_local_tests "sales" ;;
            4) run_local_tests "integration" ;;
            5) run_local_tests "ci" ;;
            6) run_local_tests "watch" ;;
            7) run_docker_tests "basic" ;;
            8) run_docker_tests "coverage" ;;
            9) run_docker_tests "integration" ;;
            10) run_docker_tests "clean" ;;
            11) run_production_tests "pre-deploy" ;;
            12) run_production_tests "e2e" ;;
            13) run_production_tests "full-pipeline" ;;
            14) generate_reports ;;
            15) show_test_status ;;
            16) run_comprehensive_tests ;;
            17) setup_environment ;;
            18) cleanup_environment ;;
            0) 
                log "Exiting test automation script"
                exit 0 
                ;;
            *)
                error "Invalid choice: $choice"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        echo ""
    done
}

# Function to handle command-line arguments
handle_arguments() {
    local command=$1
    local test_type=$2
    
    case $command in
        "local")
            run_local_tests "${test_type:-basic}"
            ;;
        "docker")
            run_docker_tests "${test_type:-basic}"
            ;;
        "production")
            run_production_tests "${test_type:-pre-deploy}"
            ;;
        "reports")
            generate_reports
            ;;
        "status")
            show_test_status
            ;;
        "comprehensive")
            run_comprehensive_tests
            ;;
        "setup")
            setup_environment
            ;;
        "cleanup")
            cleanup_environment
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo -e "${PURPLE}LUStores Test Automation Script${NC}"
    echo "==============================="
    echo ""
    echo "Usage: $0 [command] [test_type]"
    echo ""
    echo "Commands:"
    echo "  local [test_type]       Run local tests"
    echo "  docker [test_type]      Run Docker tests"
    echo "  production [test_type]  Run production tests"
    echo "  reports                 Generate test reports"
    echo "  status                  Show test status"
    echo "  comprehensive           Run comprehensive test suite"
    echo "  setup                   Setup test environment"
    echo "  cleanup                 Clean up test environment"
    echo "  help                    Show this help message"
    echo ""
    echo "Local Test Types:"
    echo "  basic, watch, coverage, sales, integration, ci, all"
    echo ""
    echo "Docker Test Types:"
    echo "  basic, sales, coverage, watch, integration, clean"
    echo ""
    echo "Production Test Types:"
    echo "  pre-deploy, e2e, reports, full-pipeline"
    echo ""
    echo "Examples:"
    echo "  $0                          # Interactive mode"
    echo "  $0 local basic             # Run basic local tests"
    echo "  $0 docker coverage         # Run Docker tests with coverage"
    echo "  $0 production pre-deploy   # Run pre-deployment tests"
    echo "  $0 comprehensive           # Run full test suite"
    echo ""
}

# Main script execution
main() {
    log "Starting LUStores test automation script"
    
    # Check prerequisites
    check_prerequisites
    
    # Handle arguments or show interactive menu
    if [[ $# -eq 0 ]]; then
        # No arguments, show interactive menu
        interactive_mode
    else
        # Arguments provided, handle them
        handle_arguments "$@"
    fi
}

# Trap to ensure cleanup on exit
trap cleanup_environment EXIT

# Run main function with all arguments
main "$@"
