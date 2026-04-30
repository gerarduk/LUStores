# SSL Certificate Setup and Troubleshooting Script for Windows

param(
    [switch]$Staging = $false,
    [switch]$Force = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "SSL Certificate Setup for LUStores" -ForegroundColor Cyan
    Write-Host "Usage: .\setup-ssl.ps1 [-Staging] [-Force] [-Help]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Staging   Use Let's Encrypt staging environment (test certificates)"
    Write-Host "  -Force     Force regeneration of existing certificates"
    Write-Host "  -Help      Show this help message"
    exit 0
}

Write-Host "🔒 SSL Certificate Setup for LUStores" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Load environment
if (-not (Test-Path ".env.prod")) {
    Write-Host "❌ .env.prod file not found!" -ForegroundColor Red
    exit 1
}

# Read environment file
$envVars = @{}
Get-Content ".env.prod" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $envVars[$matches[1]] = $matches[2]
    }
}

$Domain = $envVars['DOMAIN']
$Email = $envVars['EMAIL']

Write-Host "Domain: $Domain" -ForegroundColor Blue
Write-Host "Email: $Email" -ForegroundColor Blue

# Check if domain is valid
if ($Domain -eq "localhost" -or $Domain -eq "your-domain.com" -or [string]::IsNullOrEmpty($Domain)) {
    Write-Host "⚠️  Domain is set to '$Domain' - SSL certificates cannot be generated for localhost/example domains" -ForegroundColor Yellow
    Write-Host "Please set a real domain name in .env.prod" -ForegroundColor Yellow
    exit 1
}

# Check DNS resolution
Write-Host "🌐 Checking DNS resolution for $Domain..." -ForegroundColor Blue
try {
    $null = Resolve-DnsName $Domain -ErrorAction Stop
    Write-Host "✅ DNS resolution successful" -ForegroundColor Green
} catch {
    Write-Host "❌ DNS resolution failed for $Domain" -ForegroundColor Red
    Write-Host "Please ensure your domain is pointing to this server IP address" -ForegroundColor Yellow
    exit 1
}

# Create directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Blue
@("certbot\conf", "certbot\www", "logs\nginx", "logs\certbot") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -Path $_ -ItemType Directory -Force | Out-Null
    }
}

# Check if certificates already exist
if ((Test-Path "certbot\conf\live\$Domain") -and (-not $Force)) {
    Write-Host "✅ SSL certificates already exist for $Domain" -ForegroundColor Green
    Write-Host "Certificate details:" -ForegroundColor Blue
    
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        try {
            openssl x509 -in "certbot\conf\live\$Domain\cert.pem" -text -noout | Select-String -Pattern "Not Before|Not After"
        } catch {
            Write-Host "Could not read certificate details" -ForegroundColor Yellow
        }
    }
    
    Write-Host "To renew certificates run: docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot renew" -ForegroundColor Yellow
    Write-Host "To force regeneration run: .\setup-ssl.ps1 -Force" -ForegroundColor Yellow
    exit 0
}

if ($Force -and (Test-Path "certbot\conf\live\$Domain")) {
    Write-Host "🗑️  Removing existing certificates..." -ForegroundColor Yellow
    Remove-Item "certbot\conf\live\$Domain" -Recurse -Force
}

Write-Host "🚀 Starting SSL certificate generation process..." -ForegroundColor Blue

# Set staging flag if requested
if ($Staging) {
    $env:CERTBOT_STAGING = "--staging"
    Write-Host "🧪 Using Let's Encrypt staging environment (test certificates)" -ForegroundColor Yellow
} else {
    Write-Host "🔐 Using Let's Encrypt production environment" -ForegroundColor Green
}

# Step 1: Start nginx in HTTP-only mode
Write-Host "1️⃣  Starting nginx in HTTP-only mode..." -ForegroundColor Blue
Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d nginx"

# Wait for nginx to be ready
Write-Host "⏳ Waiting for nginx to start..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Check if nginx is responding
Write-Host "🩺 Testing HTTP endpoint..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://$Domain/" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Nginx is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Nginx may not be fully ready yet, continuing..." -ForegroundColor Yellow
}

# Step 2: Generate SSL certificates
Write-Host "2️⃣  Generating SSL certificates for $Domain..." -ForegroundColor Blue

# Run certbot
Write-Host "Running certbot certificate generation..." -ForegroundColor Blue
Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init"

# Check if certificate was generated
if (Test-Path "certbot\conf\live\$Domain") {
    Write-Host "✅ SSL certificate generated successfully!" -ForegroundColor Green
    
    # Step 3: Restart nginx with SSL
    Write-Host "3️⃣  Restarting nginx with SSL configuration..." -ForegroundColor Blue
    Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml restart nginx"
    
    # Wait for nginx to restart
    Start-Sleep -Seconds 10
    
    # Test HTTPS
    Write-Host "🔍 Testing HTTPS endpoint..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "https://$Domain/health" -SkipCertificateCheck -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ HTTPS is working!" -ForegroundColor Green
            Write-Host "🎉 SSL setup completed successfully" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your site is now accessible at:" -ForegroundColor Blue
            Write-Host "  HTTPS: https://$Domain" -ForegroundColor Green
            Write-Host "  HTTP:  http://$Domain (redirects to HTTPS)" -ForegroundColor Blue
        }
    } catch {
        Write-Host "⚠️  HTTPS endpoint not responding yet" -ForegroundColor Yellow
        Write-Host "This may be normal - nginx might still be starting up" -ForegroundColor Yellow
        
        # Show nginx logs for debugging
        Write-Host "📋 Recent nginx logs:" -ForegroundColor Blue
        Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs --tail=10 nginx"
    }
} else {
    Write-Host "❌ SSL certificate generation failed" -ForegroundColor Red
    Write-Host "📋 Certbot logs:" -ForegroundColor Blue
    Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs certbot-init"
    
    Write-Host "💡 Troubleshooting suggestions:" -ForegroundColor Yellow
    Write-Host "1. Ensure your domain $Domain points to this server IP address"
    Write-Host "2. Check that ports 80 and 443 are open and accessible"  
    Write-Host "3. Verify your email address is valid: $Email"
    Write-Host "4. Try using staging certificates first: .\setup-ssl.ps1 -Staging"
}

Write-Host ""
Write-Host "📊 Current service status:" -ForegroundColor Blue
Invoke-Expression "docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps"
