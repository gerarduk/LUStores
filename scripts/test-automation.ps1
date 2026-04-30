# LUStores Test Automation Script (PowerShell)
# Comprehensive testing automation with interactive menu for Windows

param(
    [string]$Command = "",
    [string]$TestType = ""
)

# Configuration
$ProjectDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectDir "logs"
$ReportsDir = Join-Path $ProjectDir "reports"

# Ensure directories exist
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
if (!(Test-Path $ReportsDir)) { New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null }

# Logging functions
function Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message" -ForegroundColor Cyan
    "[$timestamp] $message" | Out-File -FilePath (Join-Path $LogDir "test-automation.log") -Append
}

function Error($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[ERROR] $message" -ForegroundColor Red
    "[ERROR] [$timestamp] $message" | Out-File -FilePath (Join-Path $LogDir "test-automation.log") -Append
}

function Success($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
    "[SUCCESS] [$timestamp] $message" | Out-File -FilePath (Join-Path $LogDir "test-automation.log") -Append
}

function Warning($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
    "[WARNING] [$timestamp] $message" | Out-File -FilePath (Join-Path $LogDir "test-automation.log") -Append
}

# Check prerequisites
function Check-Prerequisites {
    Log "Checking prerequisites..."
    
    $script:NodeAvailable = $false
    $script:NpmAvailable = $false
    $script:DockerAvailable = $false
    $script:DockerComposeAvailable = $false
    
    # Check Node.js
    try {
        $null = node --version
        $script:NodeAvailable = $true
    } catch {
        Error "Node.js is not installed or not in PATH"
        return $false
    }
    
    # Check npm
    try {
        $null = npm --version
        $script:NpmAvailable = $true
    } catch {
        Error "npm is not installed or not in PATH"
        return $false
    }
    
    # Check Docker
    try {
        $null = docker --version
        $script:DockerAvailable = $true
    } catch {
        Warning "Docker is not installed or not in PATH. Docker tests will be unavailable."
    }
    
    # Check docker-compose
    try {
        $null = docker-compose --version
        $script:DockerComposeAvailable = $true
    } catch {
        Warning "docker-compose is not installed or not in PATH. Docker tests will be unavailable."
    }
    
    # Check if in correct directory
    if (!(Test-Path (Join-Path $ProjectDir "package.json"))) {
        Error "package.json not found. Please run this script from the project root."
        return $false
    }
    
    Success "Prerequisites check completed."
    return $true
}

# Setup test environment
function Setup-Environment {
    Log "Setting up test environment..."
    
    Set-Location $ProjectDir
    
    # Install dependencies if node_modules doesn't exist
    if (!(Test-Path "node_modules")) {
        Log "Installing npm dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Error "Failed to install npm dependencies"
            return $false
        }
    }
    
    # Set environment variables
    $env:NODE_ENV = "test"
    if (!$env:DATABASE_URL) { $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/test_inventory" }
    if (!$env:SESSION_SECRET) { $env:SESSION_SECRET = "test-secret-key" }
    if (!$env:CI) { $env:CI = "false" }
    
    Log "Environment variables set:"
    Log "  NODE_ENV=$($env:NODE_ENV)"
    Log "  DATABASE_URL=$($env:DATABASE_URL)"
    Log "  SESSION_SECRET=***"
    Log "  CI=$($env:CI)"
    
    Success "Test environment setup completed."
    return $true
}

# Run local tests
function Run-LocalTests($testType) {
    Log "Running local tests: $testType"
    Set-Location $ProjectDir
    
    switch ($testType) {
        "basic" { npm test }
        "watch" { npm run test:watch }
        "coverage" { npm run test:coverage }
        "sales" { npm run test:sales }
        "integration" { npm run test:integration }
        "ci" { npm run test:ci }
        "all" { npm run test:all }
        default {
            Error "Unknown test type: $testType"
            return $false
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Success "Local tests completed: $testType"
        return $true
    } else {
        Error "Local tests failed: $testType"
        return $false
    }
}

# Run Docker tests
function Run-DockerTests($testType) {
    if (!$script:DockerAvailable -or !$script:DockerComposeAvailable) {
        Error "Docker or docker-compose is not available. Cannot run Docker tests."
        return $false
    }
    
    Log "Running Docker tests: $testType"
    Set-Location $ProjectDir
    
    switch ($testType) {
        "basic" { npm run test:docker }
        "sales" { npm run test:docker-sales }
        "coverage" { npm run test:docker-coverage }
        "watch" { npm run test:docker-watch }
        "integration" { npm run test:docker-integration }
        "clean" { npm run test:clean }
        default {
            Error "Unknown Docker test type: $testType"
            return $false
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Success "Docker tests completed: $testType"
        return $true
    } else {
        Error "Docker tests failed: $testType"
        return $false
    }
}

# Run production tests
function Run-ProductionTests($testType) {
    if (!$script:DockerComposeAvailable) {
        Error "docker-compose is not available. Cannot run production tests."
        return $false
    }
    
    Log "Running production tests: $testType"
    Set-Location $ProjectDir
    
    switch ($testType) {
        "pre-deploy" { npm run test:prod }
        "e2e" { npm run test:e2e }
        "reports" { npm run test:reports }
        "full-pipeline" { npm run test:full-pipeline }
        default {
            Error "Unknown production test type: $testType"
            return $false
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Success "Production tests completed: $testType"
        return $true
    } else {
        Error "Production tests failed: $testType"
        return $false
    }
}

# Clean up test environment
function Cleanup-Environment {
    Log "Cleaning up test environment..."
    Set-Location $ProjectDir
    
    # Clean Docker containers
    if ($script:DockerComposeAvailable) {
        try { npm run test:clean } catch { }
        try { npm run clean:test } catch { }
    }
    
    # Clean coverage and reports
    if (Test-Path "coverage") { Remove-Item -Recurse -Force "coverage" }
    if (Test-Path "reports") { Remove-Item -Recurse -Force "reports" }
    
    Success "Test environment cleanup completed."
}

# Generate test reports
function Generate-Reports {
    Log "Generating comprehensive test reports..."
    Set-Location $ProjectDir
    
    # Run tests with coverage
    npm run test:ci
    if ($LASTEXITCODE -ne 0) {
        Warning "Test execution had issues, but continuing with report generation"
    }
    
    # Generate custom reports
    if (Test-Path "scripts/generate-test-reports.js") {
        npm run test:reports
    }
    
    # Display report locations
    Write-Host ""
    Write-Host "Test Reports Generated:" -ForegroundColor Magenta
    Write-Host "  Coverage Report: coverage/index.html" -ForegroundColor Cyan
    Write-Host "  JUnit XML: reports/junit/js-test-results.xml" -ForegroundColor Cyan
    Write-Host "  Test Log: $LogDir/test-automation.log" -ForegroundColor Cyan
    Write-Host ""
    
    Success "Test reports generated successfully."
}

# Show test status
function Show-TestStatus {
    Write-Host "LUStores Test Status" -ForegroundColor Magenta
    Write-Host "===================" -ForegroundColor Magenta
    Write-Host ""
    
    # Check if tests exist
    $testFiles = Get-ChildItem -Path (Join-Path $ProjectDir "server/__tests__") -Filter "*.test.ts" -ErrorAction SilentlyContinue
    if ($testFiles) {
        Write-Host "✓ Test files found: $($testFiles.Count)" -ForegroundColor Green
    } else {
        Write-Host "✗ No test files found" -ForegroundColor Red
    }
    
    # Check Jest configuration
    if (Test-Path (Join-Path $ProjectDir "jest.config.js")) {
        Write-Host "✓ Jest configuration found" -ForegroundColor Green
    } else {
        Write-Host "✗ Jest configuration missing" -ForegroundColor Red
    }
    
    # Check Docker configuration
    if (Test-Path (Join-Path $ProjectDir "docker-compose.test-prod.yml")) {
        Write-Host "✓ Docker test configuration found" -ForegroundColor Green
    } else {
        Write-Host "⚠ Docker test configuration missing" -ForegroundColor Yellow
    }
    
    # Check last test run
    $coverageFile = Join-Path $ProjectDir "coverage/lcov.info"
    if (Test-Path $coverageFile) {
        $lastWrite = (Get-Item $coverageFile).LastWriteTime
        $timeDiff = (Get-Date) - $lastWrite
        if ($timeDiff.TotalHours -lt 1) {
            Write-Host "✓ Tests run recently ($([math]::Round($timeDiff.TotalMinutes)) minutes ago)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Tests not run recently ($([math]::Round($timeDiff.TotalHours)) hours ago)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠ No recent test coverage found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Environment Status:" -ForegroundColor Cyan
    
    try { $nodeVersion = node --version } catch { $nodeVersion = "Not installed" }
    try { $npmVersion = npm --version } catch { $npmVersion = "Not installed" }
    try { $dockerVersion = docker --version } catch { $dockerVersion = "Not installed" }
    try { $dockerComposeVersion = docker-compose --version } catch { $dockerComposeVersion = "Not installed" }
    
    Write-Host "  Node.js: $nodeVersion"
    Write-Host "  npm: $npmVersion"
    Write-Host "  Docker: $dockerVersion"
    Write-Host "  docker-compose: $dockerComposeVersion"
    Write-Host ""
}

# Run comprehensive test suite
function Run-ComprehensiveTests {
    Log "Running comprehensive test suite..."
    
    Write-Host "Starting Comprehensive Test Suite" -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    Write-Host ""
    
    # Step 1: Environment setup
    Write-Host "Step 1: Environment Setup" -ForegroundColor Blue
    if (!(Setup-Environment)) { return $false }
    Write-Host ""
    
    # Step 2: Code quality checks
    Write-Host "Step 2: Code Quality Checks" -ForegroundColor Blue
    try { npm run lint:check } catch { Warning "Linting issues found" }
    try { npm run check } catch { Error "TypeScript compilation failed"; return $false }
    Write-Host ""
    
    # Step 3: Unit tests
    Write-Host "Step 3: Unit Tests" -ForegroundColor Blue
    if (!(Run-LocalTests "ci")) { return $false }
    Write-Host ""
    
    # Step 4: Integration tests
    if ($script:DockerComposeAvailable) {
        Write-Host "Step 4: Integration Tests" -ForegroundColor Blue
        if (!(Run-DockerTests "integration")) { return $false }
        Write-Host ""
    }
    
    # Step 5: Production tests
    if ($script:DockerComposeAvailable) {
        Write-Host "Step 5: Production Tests" -ForegroundColor Blue
        if (!(Run-ProductionTests "pre-deploy")) { return $false }
        Write-Host ""
    }
    
    # Step 6: Generate reports
    Write-Host "Step 6: Report Generation" -ForegroundColor Blue
    Generate-Reports
    Write-Host ""
    
    Success "Comprehensive test suite completed successfully!"
    return $true
}

# Show interactive menu
function Show-Menu {
    Write-Host "LUStores Test Automation Menu" -ForegroundColor Magenta
    Write-Host "==============================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Local Testing:"
    Write-Host "  1) Run basic tests"
    Write-Host "  2) Run tests with coverage"
    Write-Host "  3) Run sales tests"
    Write-Host "  4) Run integration tests"
    Write-Host "  5) Run CI tests"
    Write-Host "  6) Run tests in watch mode"
    Write-Host ""
    Write-Host "Docker Testing:"
    Write-Host "  7) Run Docker tests"
    Write-Host "  8) Run Docker tests with coverage"
    Write-Host "  9) Run Docker integration tests"
    Write-Host " 10) Clean Docker test environment"
    Write-Host ""
    Write-Host "Production Testing:"
    Write-Host " 11) Run pre-deployment tests"
    Write-Host " 12) Run end-to-end tests"
    Write-Host " 13) Run full test pipeline"
    Write-Host ""
    Write-Host "Utilities:"
    Write-Host " 14) Generate test reports"
    Write-Host " 15) Show test status"
    Write-Host " 16) Run comprehensive test suite"
    Write-Host " 17) Setup test environment"
    Write-Host " 18) Clean up test environment"
    Write-Host ""
    Write-Host "  0) Exit"
    Write-Host ""
}

# Interactive menu loop
function Interactive-Mode {
    while ($true) {
        Show-Menu
        $choice = Read-Host "Enter your choice (0-18)"
        Write-Host ""
        
        switch ($choice) {
            "1" { Run-LocalTests "basic" }
            "2" { Run-LocalTests "coverage" }
            "3" { Run-LocalTests "sales" }
            "4" { Run-LocalTests "integration" }
            "5" { Run-LocalTests "ci" }
            "6" { Run-LocalTests "watch" }
            "7" { Run-DockerTests "basic" }
            "8" { Run-DockerTests "coverage" }
            "9" { Run-DockerTests "integration" }
            "10" { Run-DockerTests "clean" }
            "11" { Run-ProductionTests "pre-deploy" }
            "12" { Run-ProductionTests "e2e" }
            "13" { Run-ProductionTests "full-pipeline" }
            "14" { Generate-Reports }
            "15" { Show-TestStatus }
            "16" { Run-ComprehensiveTests }
            "17" { Setup-Environment }
            "18" { Cleanup-Environment }
            "0" {
                Log "Exiting test automation script"
                return
            }
            default {
                Error "Invalid choice: $choice"
            }
        }
        
        Write-Host ""
        Read-Host "Press Enter to continue"
        Write-Host ""
    }
}

# Show help
function Show-Help {
    Write-Host "LUStores Test Automation Script" -ForegroundColor Magenta
    Write-Host "===============================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Usage: .\test-automation.ps1 [Command] [TestType]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  local [test_type]       Run local tests"
    Write-Host "  docker [test_type]      Run Docker tests"
    Write-Host "  production [test_type]  Run production tests"
    Write-Host "  reports                 Generate test reports"
    Write-Host "  status                  Show test status"
    Write-Host "  comprehensive           Run comprehensive test suite"
    Write-Host "  setup                   Setup test environment"
    Write-Host "  cleanup                 Clean up test environment"
    Write-Host "  help                    Show this help message"
    Write-Host ""
    Write-Host "Local Test Types:"
    Write-Host "  basic, watch, coverage, sales, integration, ci, all"
    Write-Host ""
    Write-Host "Docker Test Types:"
    Write-Host "  basic, sales, coverage, watch, integration, clean"
    Write-Host ""
    Write-Host "Production Test Types:"
    Write-Host "  pre-deploy, e2e, reports, full-pipeline"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\test-automation.ps1                          # Interactive mode"
    Write-Host "  .\test-automation.ps1 local basic             # Run basic local tests"
    Write-Host "  .\test-automation.ps1 docker coverage         # Run Docker tests with coverage"
    Write-Host "  .\test-automation.ps1 production pre-deploy   # Run pre-deployment tests"
    Write-Host "  .\test-automation.ps1 comprehensive           # Run full test suite"
    Write-Host ""
}

# Main execution
function Main {
    Log "Starting LUStores test automation script (PowerShell)"
    
    # Check prerequisites
    if (!(Check-Prerequisites)) {
        Error "Prerequisites check failed. Exiting."
        exit 1
    }
    
    # Handle arguments or show interactive menu
    if ($Command -eq "") {
        # No arguments, show interactive menu
        Interactive-Mode
    } else {
        # Arguments provided, handle them
        switch ($Command.ToLower()) {
            "local" { Run-LocalTests ($TestType -eq "" ? "basic" : $TestType) }
            "docker" { Run-DockerTests ($TestType -eq "" ? "basic" : $TestType) }
            "production" { Run-ProductionTests ($TestType -eq "" ? "pre-deploy" : $TestType) }
            "reports" { Generate-Reports }
            "status" { Show-TestStatus }
            "comprehensive" { Run-ComprehensiveTests }
            "setup" { Setup-Environment }
            "cleanup" { Cleanup-Environment }
            "help" { Show-Help }
            default {
                Error "Unknown command: $Command"
                Show-Help
                exit 1
            }
        }
    }
}

# Cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup-Environment }

# Run main function
Main
