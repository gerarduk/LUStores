# Nginx Docker Diagnostics Script (PowerShell)
# This script helps diagnose nginx health check issues in Docker environments

param(
    [switch]$Detailed = $false
)

Write-Host "=== Nginx Docker Health Diagnostics ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host "========================================"
Write-Host ""

function Test-DockerAvailable {
    try {
        docker version | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-DockerServicesStatus {
    Write-Host "🐳 Docker Services Status:" -ForegroundColor Blue
    
    if (Test-DockerAvailable) {
        Write-Host "  📊 Container Status:" -ForegroundColor Yellow
        try {
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            Write-Host ""
            
            Write-Host "  🏥 Health Check Status:" -ForegroundColor Yellow
            $healthyContainers = docker ps --format "table {{.Names}}\t{{.Status}}" --filter "health=healthy"
            $unhealthyContainers = docker ps --format "table {{.Names}}\t{{.Status}}" --filter "health=unhealthy"
            
            if ($healthyContainers) {
                Write-Host "  ✅ Healthy containers:" -ForegroundColor Green
                $healthyContainers | ForEach-Object { Write-Host "    $_" }
            }
            
            if ($unhealthyContainers) {
                Write-Host "  ❌ Unhealthy containers:" -ForegroundColor Red
                $unhealthyContainers | ForEach-Object { Write-Host "    $_" }
            }
            Write-Host ""
        } catch {
            Write-Host "  ❌ Cannot access Docker: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Docker not available or not running" -ForegroundColor Red
    }
}

function Test-NginxConnectivity {
    Write-Host "🌐 Network Connectivity Tests:" -ForegroundColor Blue
    
    # Test local nginx endpoints
    $endpoints = @(
        @{ Url = "http://localhost/health"; Name = "HTTP Health Check" },
        @{ Url = "http://localhost/nginx-health"; Name = "HTTP Nginx Health" },
        @{ Url = "https://localhost/health"; Name = "HTTPS Health Check" }
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 5 -UseBasicParsing -SkipCertificateCheck -ErrorAction Stop
            Write-Host "  ✅ $($endpoint.Name): $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ $($endpoint.Name): Failed - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Get-DockerLogs {
    param([string]$ContainerName)
    
    Write-Host "📝 Container Logs for $ContainerName:" -ForegroundColor Blue
    try {
        $logs = docker logs --tail 10 $ContainerName 2>&1
        if ($logs) {
            $logs | ForEach-Object { Write-Host "    $_" }
        } else {
            Write-Host "  ℹ️ No recent logs found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Cannot retrieve logs: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

function Test-BackendConnectivity {
    Write-Host "🔗 Backend Connectivity:" -ForegroundColor Blue
    
    $backends = @("localhost:5000", "127.0.0.1:5000")
    
    foreach ($backend in $backends) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.ConnectAsync($backend.Split(':')[0], $backend.Split(':')[1]).Wait(5000)
            if ($tcpClient.Connected) {
                Write-Host "  ✅ Can connect to $backend" -ForegroundColor Green
                $tcpClient.Close()
            } else {
                Write-Host "  ❌ Cannot connect to $backend (timeout)" -ForegroundColor Red
            }
        } catch {
            Write-Host "  ❌ Cannot connect to $backend`: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Get-SystemResources {
    Write-Host "💽 System Resources:" -ForegroundColor Blue
    
    # Memory usage
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $usedMemory = $totalMemory - $freeMemory
    
    Write-Host "  🧠 Memory: $usedMemory GB / $totalMemory GB used" -ForegroundColor Yellow
    
    # Disk space
    $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    foreach ($drive in $disk) {
        $freeGB = [math]::Round($drive.FreeSpace / 1GB, 2)
        $totalGB = [math]::Round($drive.Size / 1GB, 2)
        $usedGB = $totalGB - $freeGB
        Write-Host "  💾 Drive $($drive.DeviceID) $usedGB GB / $totalGB GB used" -ForegroundColor Yellow
    }
    Write-Host ""
}

function Show-SuggestedFixes {
    Write-Host "🔧 Suggested Fixes:" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  1. 📋 Health Check Issues:" -ForegroundColor Yellow
    Write-Host "     - Update nginx health check to use: http://localhost/nginx-health"
    Write-Host "     - Ensure /health endpoint doesn't redirect on HTTP"
    Write-Host "     - Check app container is responding on port 5000"
    Write-Host ""
    Write-Host "  2. 🔗 Backend Connection Issues:" -ForegroundColor Yellow
    Write-Host "     - Restart app container: docker-compose restart app"
    Write-Host "     - Check app container logs: docker logs app"
    Write-Host "     - Verify app health: docker exec app curl localhost:5000/health"
    Write-Host ""
    Write-Host "  3. 🌐 Network Issues:" -ForegroundColor Yellow
    Write-Host "     - Restart nginx: docker-compose restart nginx"
    Write-Host "     - Check nginx config: docker exec nginx nginx -t"
    Write-Host "     - Reload nginx: docker exec nginx nginx -s reload"
    Write-Host ""
    Write-Host "  4. 📝 Debugging Commands:" -ForegroundColor Yellow
    Write-Host "     - Check nginx status: docker exec nginx ps aux | grep nginx"
    Write-Host "     - Test internal connectivity: docker exec nginx wget http://app:5000/health"
    Write-Host "     - View nginx error logs: docker exec nginx tail -f /var/log/nginx/error.log"
    Write-Host ""
}

function Invoke-DetailedDiagnostics {
    Write-Host "🔍 Running Detailed Diagnostics..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check specific containers
    $containers = @("nginx", "app", "db")
    foreach ($container in $containers) {
        try {
            $containerInfo = docker inspect $container 2>$null | ConvertFrom-Json
            if ($containerInfo) {
                Write-Host "📦 Container: $container" -ForegroundColor Blue
                Write-Host "  Status: $($containerInfo.State.Status)" -ForegroundColor Yellow
                if ($containerInfo.State.Health) {
                    Write-Host "  Health: $($containerInfo.State.Health.Status)" -ForegroundColor Yellow
                }
                Write-Host ""
                
                if ($Detailed) {
                    Get-DockerLogs -ContainerName $container
                }
            }
        } catch {
            Write-Host "📦 Container: $container - Not found or not running" -ForegroundColor Red
        }
    }
}

# Main execution
try {
    Get-DockerServicesStatus
    Test-NginxConnectivity
    Test-BackendConnectivity
    Get-SystemResources
    Invoke-DetailedDiagnostics
    Show-SuggestedFixes
    
    Write-Host "✅ Diagnostics complete!" -ForegroundColor Green
    Write-Host "📋 Save this output and share with your team for troubleshooting." -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error during diagnostics: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure you have Docker installed and permissions to access it." -ForegroundColor Yellow
}
