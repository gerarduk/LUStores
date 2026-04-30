# Watchtower Management Script for LUStores Production (PowerShell)
# This script helps manage Watchtower operations for the production deployment

param(
    [Parameter(Position=0)]
    [ValidateSet("status", "start", "stop", "restart", "logs", "check-updates", "force-update", "help")]
    [string]$Command = "help"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ComposeFile = "docker-compose.prod.yml"
$EnvFile = ".env.prod"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Usage {
    Write-Host "Usage: .\manage-watchtower.ps1 {status|start|stop|restart|logs|check-updates|force-update}"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  status        - Check Watchtower container status"
    Write-Host "  start         - Start Watchtower service"
    Write-Host "  stop          - Stop Watchtower service"
    Write-Host "  restart       - Restart Watchtower service"
    Write-Host "  logs          - View Watchtower logs"
    Write-Host "  check-updates - Trigger manual update check"
    Write-Host "  force-update  - Force update of app container"
}

function Test-Requirements {
    $ComposeFilePath = Join-Path $ProjectRoot $ComposeFile
    if (-not (Test-Path $ComposeFilePath)) {
        Write-Error "Docker Compose file not found: $ComposeFile"
        exit 1
    }
    
    $EnvFilePath = Join-Path $ProjectRoot $EnvFile
    if (-not (Test-Path $EnvFilePath)) {
        Write-Warning ".env.prod file not found. Using default environment variables."
    }
}

function Get-WatchtowerStatus {
    Write-Status "Checking Watchtower status..."
    Set-Location $ProjectRoot
    docker-compose -f $ComposeFile ps watchtower
}

function Start-Watchtower {
    Write-Status "Starting Watchtower service..."
    Set-Location $ProjectRoot
    docker-compose -f $ComposeFile --env-file $EnvFile up -d watchtower
    Write-Success "Watchtower started successfully"
}

function Stop-Watchtower {
    Write-Status "Stopping Watchtower service..."
    Set-Location $ProjectRoot
    docker-compose -f $ComposeFile stop watchtower
    Write-Success "Watchtower stopped successfully"
}

function Restart-Watchtower {
    Write-Status "Restarting Watchtower service..."
    Set-Location $ProjectRoot
    docker-compose -f $ComposeFile --env-file $EnvFile restart watchtower
    Write-Success "Watchtower restarted successfully"
}

function Show-WatchtowerLogs {
    Write-Status "Showing Watchtower logs..."
    Set-Location $ProjectRoot
    docker-compose -f $ComposeFile logs -f watchtower
}

function Invoke-UpdateCheck {
    Write-Status "Triggering manual update check..."
    Set-Location $ProjectRoot
    
    # Get watchtower container ID
    $WatchtowerContainer = docker-compose -f $ComposeFile ps -q watchtower
    if ($WatchtowerContainer) {
        docker kill --signal=SIGUSR1 $WatchtowerContainer
        Write-Success "Update check triggered. Check logs for results."
    } else {
        Write-Error "Watchtower container not found or not running"
        exit 1
    }
}

function Invoke-ForceUpdate {
    Write-Warning "Force updating app container..."
    Set-Location $ProjectRoot
    
    # Pull latest image
    docker pull st7ma784/lustores:latest
    
    # Restart app service with new image
    docker-compose -f $ComposeFile --env-file $EnvFile up -d app
    
    Write-Success "App container updated and restarted"
}

# Main script logic
try {
    switch ($Command) {
        "status" {
            Test-Requirements
            Get-WatchtowerStatus
        }
        "start" {
            Test-Requirements
            Start-Watchtower
        }
        "stop" {
            Test-Requirements
            Stop-Watchtower
        }
        "restart" {
            Test-Requirements
            Restart-Watchtower
        }
        "logs" {
            Test-Requirements
            Show-WatchtowerLogs
        }
        "check-updates" {
            Test-Requirements
            Invoke-UpdateCheck
        }
        "force-update" {
            Test-Requirements
            Invoke-ForceUpdate
        }
        default {
            Show-Usage
        }
    }
} catch {
    Write-Error "An error occurred: $($_.Exception.Message)"
    exit 1
}
