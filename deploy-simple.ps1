# Simple one-command deployment script for Windows

param(
    [switch]$SSL = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "LUStores Quick Deploy for Windows" -ForegroundColor Cyan
    Write-Host "Usage: .\deploy-simple.ps1 [-SSL] [-Help]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -SSL    Force SSL certificate generation"
    Write-Host "  -Help   Show this help message"
    exit 0
}

$ComposeCmd = "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"

Write-Host "🚀 LUStores Quick Deploy" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

# Check if .env.prod exists
if (-not (Test-Path ".env.prod")) {
    Write-Host "❌ .env.prod file not found!" -ForegroundColor Red
    Write-Host "📝 Please copy .env.prod.template to .env.prod and configure it:" -ForegroundColor Yellow
    Write-Host "   copy .env.prod.template .env.prod" -ForegroundColor White
    Write-Host "   notepad .env.prod  # Edit with your settings" -ForegroundColor White
    exit 1
}

# Read environment file
$envVars = @{}
Get-Content ".env.prod" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

$Domain = $envVars['DOMAIN']
$Email = $envVars['EMAIL']

Write-Host "🔧 Domain: $Domain" -ForegroundColor Blue
Write-Host "📧 Email: $Email" -ForegroundColor Blue

# Quick validation
if ($Domain -eq "your-domain.com" -or [string]::IsNullOrEmpty($Domain)) {
    Write-Host "❌ Please set your actual DOMAIN in .env.prod" -ForegroundColor Red
    exit 1
}

if ($Email -eq "your-email@your-domain.com" -or [string]::IsNullOrEmpty($Email)) {
    Write-Host "❌ Please set your actual EMAIL in .env.prod" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment validated" -ForegroundColor Green

# Deploy
Write-Host "🐳 Starting deployment..." -ForegroundColor Blue
Invoke-Expression "$ComposeCmd up -d"

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check health
Write-Host "🏥 Checking service health..." -ForegroundColor Blue
Invoke-Expression "$ComposeCmd ps"

# Test endpoints
Write-Host "🌐 Testing HTTP endpoint..." -ForegroundColor Blue
try {
    $httpUrl = if ($Domain -eq "localhost") { "http://localhost/health" } else { "http://$Domain/health" }
    $response = Invoke-WebRequest -Uri $httpUrl -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ HTTP endpoint is working" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  HTTP endpoint not yet ready (this may be normal during startup)" -ForegroundColor Yellow
}

# Check for SSL
if (Test-Path "certbot\conf\live\$Domain\fullchain.pem") {
    Write-Host "🔒 SSL certificate found - testing HTTPS..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "https://$Domain/health" -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ HTTPS endpoint is working" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  HTTPS endpoint not ready yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "📋 SSL certificate will be generated automatically" -ForegroundColor Yellow
    if ($SSL) {
        Write-Host "🔄 Generating SSL certificate..." -ForegroundColor Blue
        Invoke-Expression "$ComposeCmd --profile init up certbot-init"
    } else {
        Write-Host "🔄 To manually generate SSL certificate:" -ForegroundColor Yellow
        Write-Host "   $ComposeCmd --profile init up certbot-init" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "📊 Management commands:" -ForegroundColor Cyan
Write-Host "   Status:  $ComposeCmd ps" -ForegroundColor White
Write-Host "   Logs:    $ComposeCmd logs -f" -ForegroundColor White
Write-Host "   Stop:    $ComposeCmd down" -ForegroundColor White
Write-Host "   Update:  $ComposeCmd pull; $ComposeCmd up -d" -ForegroundColor White
Write-Host ""
Write-Host "🌍 Your application should be available at:" -ForegroundColor Cyan
Write-Host "   HTTP:  http://$Domain" -ForegroundColor White
if (Test-Path "certbot\conf\live\$Domain\fullchain.pem") {
    Write-Host "   HTTPS: https://$Domain" -ForegroundColor White
}
