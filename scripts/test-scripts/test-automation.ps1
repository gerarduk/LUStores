#!/usr/bin/env pwsh
# Test Automation Script for LUStores
# This script provides easy commands for running various test scenarios

param(
    [Parameter(Position=0)]
    [ValidateSet('unit', 'sales', 'coverage', 'watch', 'integration', 'all', 'clean', 'status', 'logs', 'help')]
    [string]$Command = 'help',
    
    [switch]$Local,
    [switch]$Docker,
    [switch]$Verbose
)

function Write-Header {
    param([string]$Message)
    Write-Host "`n===================================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Show-Help {
    Write-Header "LUStores Test Automation"
    Write-Host @"
Usage: .\test-automation.ps1 [COMMAND] [OPTIONS]

Commands:
  unit         Run unit tests
  sales        Run sales-specific tests
  coverage     Run tests with coverage report
  watch        Run tests in watch mode (interactive)
  integration  Run integration tests
  all          Run all tests (unit + integration)
  clean        Clean up test containers and volumes
  status       Show test container status
  logs         Show test container logs
  help         Show this help message

Options:
  -Local       Run tests locally (default)
  -Docker      Run tests in Docker containers
  -Verbose     Show verbose output

Examples:
  .\test-automation.ps1 unit              # Run unit tests locally
  .\test-automation.ps1 sales -Docker     # Run sales tests in Docker
  .\test-automation.ps1 coverage -Docker  # Run coverage in Docker
  .\test-automation.ps1 watch -Local      # Run watch mode locally
  .\test-automation.ps1 clean             # Clean up Docker test environment
  .\test-automation.ps1 status            # Check test container status

Test Environment:
  - Local: Uses local Node.js and PostgreSQL
  - Docker: Uses containerized environment with isolated test database
  - Test database runs on port 5433 (Docker) to avoid conflicts
"@
}

function Test-Prerequisites {
    # Check if Docker is available when using Docker mode
    if ($Docker) {
        try {
            docker --version | Out-Null
            docker-compose --version | Out-Null
        }
        catch {
            Write-Error "Docker or Docker Compose not found. Please install Docker Desktop."
            exit 1
        }
    }
    
    # Check if npm is available for local tests
    if ($Local -or -not $Docker) {
        try {
            npm --version | Out-Null
        }
        catch {
            Write-Error "npm not found. Please install Node.js."
            exit 1
        }
    }
}

function Run-LocalTest {
    param([string]$TestType)
    
    Write-Header "Running $TestType tests locally"
    
    switch ($TestType) {
        'unit' { npm run test:ci }
        'sales' { npm run test:sales }
        'coverage' { npm run test:coverage }
        'watch' { npm run test:watch }
        'integration' { npm run test:integration }
        'all' { npm run test:all }
    }
}

function Run-DockerTest {
    param([string]$TestType)
    
    Write-Header "Running $TestType tests in Docker"
    
    # Ensure test database is up first
    Write-Info "Starting test database..."
    docker-compose --profile testing up -d test-db
    
    # Wait for database to be ready
    Write-Info "Waiting for test database to be ready..."
    Start-Sleep -Seconds 10
    
    switch ($TestType) {
        'unit' { 
            docker-compose --profile testing up test --abort-on-container-exit
        }
        'sales' { 
            docker-compose --profile testing up test-sales --abort-on-container-exit
        }
        'coverage' { 
            docker-compose --profile testing up test-coverage --abort-on-container-exit
        }
        'watch' { 
            Write-Info "Starting test watch mode (Press Ctrl+C to exit)"
            docker-compose --profile testing up test-watch
        }
        'integration' { 
            # Start main app for integration tests
            Write-Info "Starting application for integration tests..."
            docker-compose up -d app
            Start-Sleep -Seconds 20
            docker-compose --profile integration up test-integration --abort-on-container-exit
        }
        'all' {
            docker-compose --profile testing up test --abort-on-container-exit
            if ($LASTEXITCODE -eq 0) {
                docker-compose --profile integration up test-integration --abort-on-container-exit
            }
        }
    }
}

function Show-Status {
    Write-Header "Test Container Status"
    docker-compose --profile testing --profile integration ps
}

function Show-Logs {
    Write-Header "Test Container Logs"
    Write-Info "Available test containers:"
    docker-compose --profile testing --profile integration ps --format "table {{.Service}}\t{{.Status}}"
    
    $service = Read-Host "`nEnter service name for logs (or press Enter for all test services)"
    
    if ([string]::IsNullOrWhiteSpace($service)) {
        docker-compose --profile testing --profile integration logs --tail=50 -f
    } else {
        docker-compose --profile testing --profile integration logs --tail=50 -f $service
    }
}

function Clean-TestEnvironment {
    Write-Header "Cleaning Test Environment"
    
    Write-Info "Stopping and removing test containers..."
    docker-compose --profile testing down -v
    docker-compose --profile integration down -v
    
    Write-Info "Removing test volumes..."
    docker volume rm luStores-1_test_postgres_data -f 2>$null
    
    Write-Info "Cleaning coverage reports..."
    if (Test-Path "coverage") {
        Remove-Item -Recurse -Force "coverage"
    }
    
    Write-Success "Test environment cleaned"
}

# Main execution
Write-Header "LUStores Test Automation"

if ($Command -eq 'help') {
    Show-Help
    exit 0
}

# Set default mode if not specified
if (-not $Local -and -not $Docker) {
    $Local = $true
}

Test-Prerequisites

switch ($Command) {
    'status' { Show-Status }
    'logs' { Show-Logs }
    'clean' { Clean-TestEnvironment }
    default {
        if ($Docker) {
            Run-DockerTest $Command
        } else {
            Run-LocalTest $Command
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Tests completed successfully"
        } else {
            Write-Error "Tests failed"
            exit 1
        }
    }
}
