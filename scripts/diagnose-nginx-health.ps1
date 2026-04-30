# Nginx Health Diagnostic Script - PowerShell Version
# Comprehensive diagnostic tool for nginx Docker container health issues

Write-Host "🏥 NGINX HEALTH DIAGNOSTIC SCRIPT" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "$(Get-Date)"
Write-Host ""

# Function to check if nginx container is running
function Test-NginxContainer {
    Write-Host "📦 CONTAINER STATUS CHECK" -ForegroundColor Blue
    Write-Host "----------------------------"
    
    # Get nginx container info
    $nginxContainer = docker ps --filter "name=nginx" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
    
    if ([string]::IsNullOrWhiteSpace($nginxContainer)) {
        Write-Host "❌ No nginx container found running" -ForegroundColor Red
        
        # Check if container exists but is stopped
        $stoppedNginx = docker ps -a --filter "name=nginx" --format "table {{.Names}}`t{{.Status}}"
        if (![string]::IsNullOrWhiteSpace($stoppedNginx)) {
            Write-Host "⚠️  Found stopped nginx container:" -ForegroundColor Yellow
            Write-Host $stoppedNginx
        }
        return $false
    } else {
        Write-Host "✅ Nginx container found:" -ForegroundColor Green
        Write-Host $nginxContainer
    }
    
    # Get container ID
    $script:containerId = docker ps --filter "name=nginx" --format "{{.ID}}"
    Write-Host "Container ID: $script:containerId"
    Write-Host ""
    return $true
}

# Function to check nginx container health
function Test-ContainerHealth {
    Write-Host "💊 CONTAINER HEALTH STATUS" -ForegroundColor Blue
    Write-Host "----------------------------"
    
    $healthStatus = docker inspect --format='{{.State.Health.Status}}' $script:containerId 2>$null
    
    switch ($healthStatus) {
        "healthy" {
            Write-Host "✅ Container health status: $healthStatus" -ForegroundColor Green
        }
        "unhealthy" {
            Write-Host "❌ Container health status: $healthStatus" -ForegroundColor Red
            
            # Get last few health check results
            Write-Host ""
            Write-Host "Recent health check logs:"
            $healthLogs = docker inspect --format='{{range .State.Health.Log}}{{.Start}}: {{.Output}}{{end}}' $script:containerId
            $healthLogs | Select-Object -Last 5
        }
        default {
            Write-Host "⚠️  Container health status: $($healthStatus ?? 'unknown')" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Function to check nginx process inside container
function Test-NginxProcess {
    Write-Host "⚙️  NGINX PROCESS CHECK" -ForegroundColor Blue
    Write-Host "------------------------"
    
    # Check if nginx process is running
    $nginxProcesses = docker exec $script:containerId ps aux | Select-String "nginx" | Where-Object { $_ -notmatch "grep" }
    
    if ($nginxProcesses.Count -eq 0) {
        Write-Host "❌ No nginx processes found running in container" -ForegroundColor Red
        return $false
    } else {
        Write-Host "✅ Nginx processes found:" -ForegroundColor Green
        $nginxProcesses | ForEach-Object { Write-Host $_.Line }
    }
    Write-Host ""
    return $true
}

# Function to test nginx configuration
function Test-NginxConfig {
    Write-Host "📋 NGINX CONFIGURATION TEST" -ForegroundColor Blue
    Write-Host "-----------------------------"
    
    $configTest = docker exec $script:containerId nginx -t 2>&1
    $configExitCode = $LASTEXITCODE
    
    if ($configExitCode -eq 0) {
        Write-Host "✅ Nginx configuration is valid" -ForegroundColor Green
        Write-Host $configTest
    } else {
        Write-Host "❌ Nginx configuration test failed" -ForegroundColor Red
        Write-Host $configTest
        
        Write-Host ""
        Write-Host "Current nginx configuration:"
        docker exec $script:containerId cat /etc/nginx/nginx.conf
    }
    Write-Host ""
}

# Function to test health endpoint directly
function Test-HealthEndpoint {
    Write-Host "🔍 HEALTH ENDPOINT TESTING" -ForegroundColor Blue
    Write-Host "---------------------------"
    
    # Test health endpoint from inside container
    Write-Host "Testing health endpoint from inside container:"
    $internalHealth = docker exec $script:containerId wget --no-verbose --tries=1 --spider http://localhost/health 2>&1
    $internalExitCode = $LASTEXITCODE
    
    if ($internalExitCode -eq 0) {
        Write-Host "✅ Internal health check successful" -ForegroundColor Green
        Write-Host $internalHealth
    } else {
        Write-Host "❌ Internal health check failed" -ForegroundColor Red
        Write-Host $internalHealth
    }
    
    Write-Host ""
    
    # Test from host if port is exposed
    Write-Host "Testing health endpoint from host:"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 10 -UseBasicParsing
        Write-Host "✅ External health check successful" -ForegroundColor Green
        Write-Host "HTTP Status: $($response.StatusCode)"
    } catch {
        Write-Host "❌ External health check failed" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
    Write-Host ""
}

# Function to check nginx logs
function Show-NginxLogs {
    Write-Host "📝 NGINX LOGS ANALYSIS" -ForegroundColor Blue
    Write-Host "-----------------------"
    
    Write-Host "Recent nginx container logs (last 20 lines):"
    docker logs --tail 20 $script:containerId
    
    Write-Host ""
    Write-Host "Recent nginx error logs from inside container:"
    $errorLogs = docker exec $script:containerId tail -10 /var/log/nginx/error.log 2>$null
    if ($errorLogs) {
        Write-Host $errorLogs
    } else {
        Write-Host "Error log not accessible"
    }
    
    Write-Host ""
    Write-Host "Recent nginx access logs from inside container:"
    $accessLogs = docker exec $script:containerId tail -5 /var/log/nginx/access.log 2>$null
    if ($accessLogs) {
        Write-Host $accessLogs
    } else {
        Write-Host "Access log not accessible"
    }
    Write-Host ""
}

# Function to check backend connectivity
function Test-BackendConnectivity {
    Write-Host "🔗 BACKEND CONNECTIVITY CHECK" -ForegroundColor Blue
    Write-Host "-------------------------------"
    
    # Check if app container is running
    $appContainer = docker ps --filter "name=app" --format "{{.Names}}"
    
    if ([string]::IsNullOrWhiteSpace($appContainer)) {
        Write-Host "❌ No app container found running" -ForegroundColor Red
        Write-Host "Nginx health check may fail because backend is not available"
    } else {
        Write-Host "✅ App container found: $appContainer" -ForegroundColor Green
        
        # Test connectivity from nginx to app
        Write-Host "Testing connectivity from nginx to app container:"
        $backendTest = docker exec $script:containerId wget --no-verbose --tries=1 --spider http://app:5000/health 2>&1
        $backendExitCode = $LASTEXITCODE
        
        if ($backendExitCode -eq 0) {
            Write-Host "✅ Backend connectivity successful" -ForegroundColor Green
            Write-Host $backendTest
        } else {
            Write-Host "❌ Backend connectivity failed" -ForegroundColor Red
            Write-Host $backendTest
        }
    }
    Write-Host ""
}

# Function to check network connectivity
function Test-Network {
    Write-Host "🌐 NETWORK CONFIGURATION" -ForegroundColor Blue
    Write-Host "-------------------------"
    
    # Check which networks the nginx container is connected to
    $networks = docker inspect $script:containerId --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
    Write-Host "Container networks: $networks"
    
    # Check if nginx can resolve app hostname
    Write-Host ""
    Write-Host "DNS resolution test (app hostname):"
    $dnsTest = docker exec $script:containerId nslookup app 2>$null
    if ($dnsTest) {
        Write-Host $dnsTest
    } else {
        Write-Host "nslookup not available or failed"
    }
    
    Write-Host ""
    Write-Host "Network connectivity test:"
    $pingTest = docker exec $script:containerId ping -c 2 app 2>$null
    if ($pingTest) {
        Write-Host $pingTest
    } else {
        Write-Host "ping not available or failed"
    }
    Write-Host ""
}

# Function to provide recommendations
function Show-Recommendations {
    Write-Host "💡 TROUBLESHOOTING RECOMMENDATIONS" -ForegroundColor Blue
    Write-Host "====================================="
    
    Write-Host "Based on the diagnostic results above, here are common solutions:"
    Write-Host ""
    Write-Host "1. 🔄 Container restart:"
    Write-Host "   docker-compose restart nginx"
    Write-Host ""
    Write-Host "2. 🔍 Check environment variables:"
    Write-Host "   docker exec $script:containerId env | Select-String NGINX"
    Write-Host ""
    Write-Host "3. 🔧 Rebuild with no cache:"
    Write-Host "   docker-compose down nginx; docker-compose up --build nginx"
    Write-Host ""
    Write-Host "4. 📊 Monitor logs in real-time:"
    Write-Host "   docker logs -f $script:containerId"
    Write-Host ""
    Write-Host "5. 🏥 Manual health check:"
    Write-Host "   docker exec $script:containerId wget --no-verbose --tries=1 --spider http://localhost/health"
    Write-Host ""
    Write-Host "6. 📋 Validate nginx config manually:"
    Write-Host "   docker exec $script:containerId nginx -t"
    Write-Host ""
    Write-Host "7. 🔄 Force container recreation:"
    Write-Host "   docker-compose down; docker-compose up -d"
    Write-Host ""
}

# Main execution
function Main {
    if (Test-NginxContainer) {
        Test-ContainerHealth
        Test-NginxProcess
        Test-NginxConfig
        Test-HealthEndpoint
        Test-BackendConnectivity
        Test-Network
        Show-NginxLogs
    } else {
        Write-Host "Cannot proceed with detailed diagnostics - nginx container not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Try starting the nginx container:"
        Write-Host "docker-compose up -d nginx"
    }
    
    Show-Recommendations
}

# Run the diagnostic
Main
