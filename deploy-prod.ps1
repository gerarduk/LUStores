# Production Deployment Script for Windows PowerShell
# This script handles the complete deployment process including SSL certificate management

param(
    [string]$Action = "deploy"
)

# Configuration
$ComposeFile = "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"
$EnvFile = ".env.prod"
$LogFile = "deployment.log"

# Color functions
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
    Add-Content -Path $LogFile -Value "[$(Get-Date)] [INFO] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
    Add-Content -Path $LogFile -Value "[$(Get-Date)] [SUCCESS] $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value "[$(Get-Date)] [WARNING] $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Add-Content -Path $LogFile -Value "[$(Get-Date)] [ERROR] $Message"
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Function to validate environment file
function Test-Environment {
    Write-Status "Validating environment configuration..."
    
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file $EnvFile not found!"
        Write-Host "Please create $EnvFile with the following variables:"
        Write-Host "DOMAIN=your-domain.com"
        Write-Host "EMAIL=your-email@domain.com"
        Write-Host "POSTGRES_PASSWORD=your_secure_password"
        Write-Host "JWT_SECRET=your_jwt_secret"
        exit 1
    }
    
    # Read environment file
    $envVars = @{}
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $envVars[$matches[1]] = $matches[2]
        }
    }
    
    # Check required variables
    if (-not $envVars.ContainsKey('DOMAIN') -or [string]::IsNullOrEmpty($envVars['DOMAIN'])) {
        Write-Error "DOMAIN variable not set in $EnvFile"
        exit 1
    }
    
    if (-not $envVars.ContainsKey('EMAIL') -or [string]::IsNullOrEmpty($envVars['EMAIL'])) {
        Write-Error "EMAIL variable not set in $EnvFile"
        exit 1
    }
    
    $script:Domain = $envVars['DOMAIN']
    $script:Email = $envVars['EMAIL']
    
    if ($script:Domain -eq "localhost" -or $script:Domain -eq "example.com") {
        Write-Warning "Domain is set to $($script:Domain) - SSL certificates will not be generated"
        $script:SkipSSL = $true
    } else {
        $script:SkipSSL = $false
    }
    
    Write-Success "Environment validation completed"
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    if (-not (Test-Command "docker")) {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    if (-not (Test-Command "docker-compose")) {
        Write-Error "Docker Compose is not installed or not in PATH"
        exit 1
    }
    
    # Check if Docker daemon is running
    try {
        docker info | Out-Null
    } catch {
        Write-Error "Docker daemon is not running"
        exit 1
    }
    
    Write-Success "Prerequisites check completed"
}

# Function to create necessary directories
function New-Directories {
    Write-Status "Creating necessary directories..."
    
    @("logs\nginx", "certbot\conf", "certbot\www", "postgres_data") | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -Path $_ -ItemType Directory -Force | Out-Null
        }
    }
    
    Write-Success "Directories created"
}

# Function to build application
function Build-Application {
    Write-Status "Building application..."
    
    $process = Start-Process -FilePath "docker-compose" -ArgumentList "-f $ComposeFile build app" -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Success "Application build completed"
    } else {
        Write-Error "Application build failed"
        exit 1
    }
}

# Function to start database first
function Start-Database {
    Write-Status "Starting database..."
    
    docker-compose -f $ComposeFile up -d db
    
    # Wait for database to be ready
    Write-Status "Waiting for database to be ready..."
    Start-Sleep -Seconds 10
    
    # Check if database is responsive
    for ($i = 1; $i -le 30; $i++) {
        try {
            docker-compose -f $ComposeFile exec -T db pg_isready -U postgres | Out-Null
            Write-Success "Database is ready"
            return
        } catch {
            if ($i -eq 30) {
                Write-Error "Database failed to start within timeout"
                exit 1
            }
            Start-Sleep -Seconds 2
        }
    }
}

# Function to start application
function Start-Application {
    Write-Status "Starting application..."
    
    docker-compose -f $ComposeFile up -d app
    
    # Wait for application to be ready
    Write-Status "Waiting for application to be ready..."
    Start-Sleep -Seconds 15
    
    # Check if application is responsive
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is ready"
                return
            }
        } catch {
            if ($i -eq 30) {
                Write-Error "Application failed to start within timeout"
                exit 1
            }
            Start-Sleep -Seconds 2
        }
    }
}

# Function to generate SSL certificates
function New-SSLCertificates {
    if ($script:SkipSSL) {
        Write-Warning "Skipping SSL certificate generation for domain: $($script:Domain)"
        return
    }
    
    Write-Status "Generating SSL certificates for domain: $($script:Domain)"
    
    # Check if certificates already exist
    if (Test-Path "certbot\conf\live\$($script:Domain)\fullchain.pem") {
        Write-Warning "SSL certificates already exist for $($script:Domain)"
        return
    }
    
    # Start nginx in HTTP-only mode first
    Write-Status "Starting nginx in HTTP-only mode for certificate generation..."
    docker-compose -f $ComposeFile up -d nginx
    
    Start-Sleep -Seconds 5
    
    # Generate certificates using certbot
    Write-Status "Requesting SSL certificates from Let's Encrypt..."
    
    $certbotArgs = @(
        "-f", $ComposeFile, "run", "--rm", "certbot", "certonly",
        "--webroot",
        "--webroot-path=/var/www/certbot",
        "--email", $script:Email,
        "--agree-tos",
        "--no-eff-email",
        "-d", $script:Domain
    )
    
    $process = Start-Process -FilePath "docker-compose" -ArgumentList $certbotArgs -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Success "SSL certificates generated successfully"
        
        # Restart nginx to use SSL configuration
        Write-Status "Restarting nginx with SSL configuration..."
        docker-compose -f $ComposeFile restart nginx
        
        Start-Sleep -Seconds 5
        
        # Test HTTPS connection
        try {
            $response = Invoke-WebRequest -Uri "https://$($script:Domain)/health" -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "HTTPS configuration verified"
            }
        } catch {
            Write-Warning "HTTPS verification failed, but continuing deployment"
        }
    } else {
        Write-Error "SSL certificate generation failed"
        Write-Warning "Continuing with HTTP-only configuration"
    }
}

# Function to start remaining services
function Start-RemainingServices {
    Write-Status "Starting remaining services..."
    
    # Start nginx (will auto-detect SSL certificates)
    docker-compose -f $ComposeFile up -d nginx
    
    # Start Watchtower for automatic updates
    docker-compose -f $ComposeFile up -d watchtower
    
    Write-Success "All services started"
}

# Function to verify deployment
function Test-Deployment {
    Write-Status "Verifying deployment..."
    
    # Check all services are running
    Write-Status "Checking service status..."
    docker-compose -f $ComposeFile ps
    
    # Test HTTP connection
    try {
        $httpUrl = if ($script:Domain -eq "localhost") { "http://localhost/health" } else { "http://$($script:Domain)/health" }
        $response = Invoke-WebRequest -Uri $httpUrl -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "HTTP health check passed"
        }
    } catch {
        Write-Error "HTTP health check failed"
        return $false
    }
    
    # Test HTTPS connection if certificates exist
    if ((Test-Path "certbot\conf\live\$($script:Domain)\fullchain.pem") -and (-not $script:SkipSSL)) {
        try {
            $response = Invoke-WebRequest -Uri "https://$($script:Domain)/health" -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "HTTPS health check passed"
            }
        } catch {
            Write-Warning "HTTPS health check failed"
        }
    }
    
    Write-Success "Deployment verification completed"
    return $true
}

# Function to show deployment summary
function Show-Summary {
    Write-Status "Deployment Summary"
    Write-Host "==================" -ForegroundColor Cyan
    Write-Host "Domain: $($script:Domain)"
    Write-Host "HTTP URL: http://$($script:Domain)"
    
    if ((Test-Path "certbot\conf\live\$($script:Domain)\fullchain.pem") -and (-not $script:SkipSSL)) {
        Write-Host "HTTPS URL: https://$($script:Domain)"
        Write-Host "SSL Status: Enabled" -ForegroundColor Green
    } else {
        Write-Host "SSL Status: Disabled" -ForegroundColor Yellow
    }
    
    Write-Host "`nServices:"
    docker-compose -f $ComposeFile ps
    
    Write-Host "`nLogs:"
    Write-Host "- Application logs: docker-compose -f $ComposeFile logs app"
    Write-Host "- Nginx logs: docker-compose -f $ComposeFile logs nginx"
    Write-Host "- Database logs: docker-compose -f $ComposeFile logs db"
    Write-Host "`nManagement:"
    Write-Host "- Stop services: docker-compose -f $ComposeFile down"
    Write-Host "- View logs: docker-compose -f $ComposeFile logs -f"
    Write-Host "- Update containers: Watchtower will automatically update containers with the 'com.centurylinklabs.watchtower.enable=true' label"
}

# Main deployment function
function Invoke-Deployment {
    Write-Host "LUStores Production Deployment Script" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value "[$(Get-Date)] Starting deployment"
    
    Test-Environment
    Test-Prerequisites
    New-Directories
    Build-Application
    Start-Database
    Start-Application
    New-SSLCertificates
    Start-RemainingServices
    Test-Deployment
    Show-Summary
    
    Write-Success "Deployment completed successfully!"
    Add-Content -Path $LogFile -Value "[$(Get-Date)] Deployment completed"
}

# Handle script arguments
switch ($Action.ToLower()) {
    "deploy" {
        Invoke-Deployment
    }
    "ssl-only" {
        Test-Environment
        New-SSLCertificates
    }
    "verify" {
        Test-Environment
        Test-Deployment
    }
    "stop" {
        Write-Status "Stopping all services..."
        docker-compose -f $ComposeFile down
        Write-Success "All services stopped"
    }
    "logs" {
        docker-compose -f $ComposeFile logs -f
    }
    "status" {
        docker-compose -f $ComposeFile ps
    }
    default {
        Write-Host "Usage: .\deploy-prod.ps1 [deploy|ssl-only|verify|stop|logs|status]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  deploy    - Full deployment (default)"
        Write-Host "  ssl-only  - Generate SSL certificates only"
        Write-Host "  verify    - Verify deployment health"
        Write-Host "  stop      - Stop all services"
        Write-Host "  logs      - Show service logs"
        Write-Host "  status    - Show service status"
        exit 1
    }
}
