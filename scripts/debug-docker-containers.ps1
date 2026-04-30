# Docker Container Debugging Script for Production (PowerShell)
# This script helps diagnose why containers are being killed quickly

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$ContainerName = "",
    
    [Parameter(Position=2)]
    [int]$Lines = 100
)

$ProjectName = "lustores"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Logging functions
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARNING: $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] INFO: $Message" -ForegroundColor Blue
}

# Function to check system resources
function Check-SystemResources {
    Write-Log "=== SYSTEM RESOURCES ==="
    
    Write-Host "Memory Usage:"
    Get-WmiObject -Class Win32_OperatingSystem | Select-Object @{
        Name="Total Memory (GB)"; Expression={[math]::Round($_.TotalVisibleMemorySize/1MB, 2)}
    }, @{
        Name="Free Memory (GB)"; Expression={[math]::Round($_.FreePhysicalMemory/1MB, 2)}
    }, @{
        Name="Used Memory (GB)"; Expression={[math]::Round(($_.TotalVisibleMemorySize - $_.FreePhysicalMemory)/1MB, 2)}
    }
    Write-Host ""
    
    Write-Host "Disk Usage:"
    Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.Size -gt 0} | Select-Object DeviceID, @{
        Name="Size (GB)"; Expression={[math]::Round($_.Size/1GB, 2)}
    }, @{
        Name="Free Space (GB)"; Expression={[math]::Round($_.FreeSpace/1GB, 2)}
    }, @{
        Name="Used %"; Expression={[math]::Round((($_.Size - $_.FreeSpace)/$_.Size) * 100, 2)}
    }
    Write-Host ""
    
    Write-Host "CPU Usage:"
    Get-WmiObject -Class Win32_Processor | Select-Object Name, LoadPercentage
    Write-Host ""
}

# Function to check Docker daemon status
function Check-DockerDaemon {
    Write-Log "=== DOCKER DAEMON STATUS ==="
    
    try {
        Write-Host "Docker Version:"
        docker version --format "Client: {{.Client.Version}}, Server: {{.Server.Version}}"
        Write-Host ""
        
        Write-Host "Docker System Info:"
        docker system df
        Write-Host ""
        
        Write-Host "Docker Events (last 50):"
        docker events --since 1h --until now | Select-Object -Last 50
        Write-Host ""
    }
    catch {
        Write-Error-Custom "Docker daemon appears to be not running or accessible: $_"
    }
}

# Function to analyze container logs
function Analyze-ContainerLogs {
    param(
        [string]$ContainerName,
        [int]$LogLines = 100
    )
    
    Write-Log "=== ANALYZING LOGS FOR: $ContainerName ==="
    
    try {
        # Check if container exists
        $containerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
        if (-not $containerExists) {
            Write-Error-Custom "Container $ContainerName not found"
            return
        }
        
        Write-Host "Container Status:"
        docker ps -a --filter "name=$ContainerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        Write-Host ""
        
        Write-Host "Container Details:"
        $inspect = docker inspect $ContainerName | ConvertFrom-Json
        $container = $inspect[0]
        
        Write-Host "Container: $($container.Name)"
        Write-Host "State: $($container.State.Status)"
        Write-Host "Exit Code: $($container.State.ExitCode)"
        Write-Host "Started At: $($container.State.StartedAt)"
        Write-Host "Finished At: $($container.State.FinishedAt)"
        Write-Host "Restart Count: $($container.RestartCount)"
        Write-Host "OOMKilled: $($container.State.OOMKilled)"
        if ($container.State.Error) {
            Write-Host "Error: $($container.State.Error)"
        }
        Write-Host ""
        
        Write-Host "Resource Limits:"
        Write-Host "Memory Limit: $($container.HostConfig.Memory)"
        Write-Host "CPU Shares: $($container.HostConfig.CpuShares)"
        Write-Host "CPU Quota: $($container.HostConfig.CpuQuota)"
        Write-Host "CPU Period: $($container.HostConfig.CpuPeriod)"
        Write-Host ""
        
        Write-Host "Recent Logs (last $LogLines lines):"
        docker logs --tail $LogLines --timestamps $ContainerName
        Write-Host ""
        
        # If container is running, show real-time stats
        $runningContainer = docker ps --filter "name=$ContainerName" --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
        if ($runningContainer) {
            Write-Host "Current Resource Usage:"
            docker stats $ContainerName --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
            Write-Host ""
        }
    }
    catch {
        Write-Error-Custom "Error analyzing container logs: $_"
    }
}

# Function to check container health
function Check-ContainerHealth {
    param([string]$ContainerName)
    
    Write-Log "=== HEALTH CHECK FOR: $ContainerName ==="
    
    try {
        $healthStatus = docker inspect $ContainerName --format "{{.State.Health.Status}}" 2>$null
        if (-not $healthStatus) {
            $healthStatus = "no-health-check"
        }
        
        Write-Host "Health Status: $healthStatus"
        
        if ($healthStatus -ne "no-health-check" -and $healthStatus -ne "") {
            Write-Host "Health Check Logs:"
            docker inspect $ContainerName --format "{{range .State.Health.Log}}{{.Start}}: {{.Output}}{{end}}" | Select-Object -Last 5
        }
        Write-Host ""
    }
    catch {
        Write-Error-Custom "Error checking container health: $_"
    }
}

# Function to check Docker Compose status
function Check-ComposeStatus {
    Write-Log "=== DOCKER COMPOSE STATUS ==="
    
    $composeFile = Join-Path (Split-Path $ScriptDir -Parent) "docker-compose.prod.yml"
    if (Test-Path $composeFile) {
        Push-Location (Split-Path $ScriptDir -Parent)
        try {
            Write-Host "Compose Services Status:"
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
            Write-Host ""
            
            Write-Host "Compose Configuration Test:"
            $configResult = docker-compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Configuration is valid" -ForegroundColor Green
            } else {
                Write-Host "✗ Configuration has errors" -ForegroundColor Red
            }
            Write-Host ""
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Warn "docker-compose.prod.yml not found"
    }
}

# Function to check for common issues
function Check-CommonIssues {
    Write-Log "=== CHECKING COMMON ISSUES ==="
    
    Write-Host "Port Usage Check:"
    $ports = @(80, 443, 5000, 5432, 6379, 3001)
    foreach ($port in $ports) {
        $portUsage = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portUsage) {
            Write-Host "Port $port is in use" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    
    Write-Host "Environment File Check:"
    $envFile = Join-Path (Split-Path $ScriptDir -Parent) ".env.prod"
    if (Test-Path $envFile) {
        Write-Host "✓ .env.prod exists" -ForegroundColor Green
        $criticalVars = Get-Content $envFile | Where-Object { $_ -match "^(DATABASE_URL|DOMAIN|EMAIL)" }
        if ($criticalVars) {
            Write-Host "Critical environment variables found (values hidden for security)"
        } else {
            Write-Error-Custom "Some critical env vars may be missing"
        }
    } else {
        Write-Error-Custom ".env.prod file not found"
    }
    Write-Host ""
    
    Write-Host "Docker System Space:"
    docker system df
    Write-Host ""
}

# Function to generate debugging report
function Generate-DebugReport {
    $reportFile = "docker-debug-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    Write-Log "=== GENERATING COMPREHENSIVE DEBUG REPORT ==="
    
    $report = @()
    $report += "Docker Debug Report - $(Get-Date)"
    $report += "================================"
    $report += ""
    
    # Capture all diagnostic information
    $report += "=== SYSTEM RESOURCES ==="
    $report += (Check-SystemResources | Out-String)
    
    $report += "=== DOCKER DAEMON STATUS ==="
    $report += (Check-DockerDaemon | Out-String)
    
    $report += "=== COMPOSE STATUS ==="
    $report += (Check-ComposeStatus | Out-String)
    
    # Analyze each service
    $services = @("app", "replit-auth", "db", "redis", "nginx", "certbot", "watchtower", "githubrunner")
    foreach ($service in $services) {
        $containerName = "$ProjectName-$service-1"
        $containerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $containerName }
        if ($containerExists) {
            $report += "=== CONTAINER: $containerName ==="
            $report += (Analyze-ContainerLogs $containerName 200 | Out-String)
            $report += (Check-ContainerHealth $containerName | Out-String)
        } else {
            $report += "Container $containerName not found"
            $report += ""
        }
    }
    
    $report += "=== COMMON ISSUES ==="
    $report += (Check-CommonIssues | Out-String)
    
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Log "Debug report saved to: $reportFile"
}

# Function to monitor containers in real-time
function Monitor-Containers {
    Write-Log "=== REAL-TIME CONTAINER MONITORING ==="
    Write-Info "Press Ctrl+C to stop monitoring"
    
    try {
        while ($true) {
            Clear-Host
            Write-Host "=== Container Status - $(Get-Date) ==="
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            Write-Host ""
            
            Write-Host "=== Resource Usage ==="
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
            Write-Host ""
            
            Write-Host "=== Recent Events ==="
            docker events --since 30s --until now | Select-Object -Last 10
            Write-Host ""
            
            Start-Sleep -Seconds 10
        }
    }
    catch [System.Management.Automation.PipelineStoppedException] {
        Write-Info "Monitoring stopped by user"
    }
}

# Main switch
switch ($Command.ToLower()) {
    "resources" { Check-SystemResources }
    "daemon" { Check-DockerDaemon }
    "logs" { 
        if ([string]::IsNullOrEmpty($ContainerName)) {
            Write-Error-Custom "Please specify container name. Usage: .\debug-docker-containers.ps1 logs <container_name>"
            exit 1
        }
        Analyze-ContainerLogs $ContainerName $Lines
    }
    "health" {
        if ([string]::IsNullOrEmpty($ContainerName)) {
            Write-Error-Custom "Please specify container name. Usage: .\debug-docker-containers.ps1 health <container_name>"
            exit 1
        }
        Check-ContainerHealth $ContainerName
    }
    "compose" { Check-ComposeStatus }
    "issues" { Check-CommonIssues }
    "report" { Generate-DebugReport }
    "monitor" { Monitor-Containers }
    "all" {
        Check-SystemResources
        Check-DockerDaemon
        Check-ComposeStatus
        Check-CommonIssues
    }
    default {
        Write-Host "Docker Container Debugging Script (PowerShell)"
        Write-Host "Usage: .\debug-docker-containers.ps1 [command] [options]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  resources         - Check system resources (memory, disk, CPU)"
        Write-Host "  daemon            - Check Docker daemon status"
        Write-Host "  logs <name>       - Analyze specific container logs"
        Write-Host "  health <name>     - Check specific container health"
        Write-Host "  compose           - Check Docker Compose status"
        Write-Host "  issues            - Check for common issues"
        Write-Host "  report            - Generate comprehensive debug report"
        Write-Host "  monitor           - Real-time container monitoring"
        Write-Host "  all               - Run all checks except monitoring"
        Write-Host "  help              - Show this help"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\debug-docker-containers.ps1 all                     # Run all diagnostic checks"
        Write-Host "  .\debug-docker-containers.ps1 logs lustores-app-1     # Analyze app container logs"
        Write-Host "  .\debug-docker-containers.ps1 monitor                 # Real-time monitoring"
        Write-Host "  .\debug-docker-containers.ps1 report                  # Generate full debug report"
    }
}
