# Simple Production Deployment

This guide provides the easiest way to deploy LUStores to production using Docker Compose.

> **📝 Important Note:** All Docker Compose commands in this guide include `--env-file .env.prod` to ensure your environment variables are properly loaded. Docker Compose only reads `.env` by default, so we explicitly specify our production environment file.

## SSL Certificate Strategy

LUStores supports two SSL certificate approaches depending on your deployment environment:

### 🌐 **Public Domains** (Internet-accessible)
For public domains like `your-company.com`, the system automatically uses **Let's Encrypt** for free, valid SSL certificates that are trusted by all browsers.

### 🏢 **Internal/Private Domains** (VPN/Intranet only)
For internal domains like `app.company.local` or university domains like `py-stores.lancaster.ac.uk`, the system automatically generates **self-signed certificates** because:

- **Let's Encrypt requires public internet access** for domain validation
- **Internal domains can't be validated** from the public internet
- **Self-signed certificates provide the same encryption** but require browser security exception
- **Perfect for internal corporate/university environments**

The deployment system automatically detects your domain type and chooses the appropriate method.

## Quick Start (3 Steps)

### 1. Setup Environment

Create your production environment file:

```bash
# Copy example and edit
cp .env.prod.example .env.prod
```

**Required settings in `.env.prod`:**
```bash
# Domain & SSL Configuration
DOMAIN=your-domain.com                    # Your domain name
EMAIL=your-email@domain.com               # Email for SSL certificates

# SSL Certificate Type (automatically detected)
# For public domains: Uses Let's Encrypt automatically
# For internal domains: Uses self-signed certificates automatically
# Optional: Force self-signed with USE_SELF_SIGNED=true

# Database
DB_PASSWORD=your_secure_password_here

# Application Security
JWT_SECRET=your_jwt_secret_32_chars_minimum
SESSION_SECRET=your_session_secret_here

# Optional: GitHub Runner (for CI/CD)
RUNNER_TOKEN=your_github_runner_token
```

### 2. Deploy with Docker Compose

#### Option A: Full Production Deployment (Recommended)
```bash
# Deploy everything with automatic SSL detection
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The system will automatically:
- 🌐 **Public domains**: Generate Let's Encrypt certificates
- 🏢 **Internal domains**: Generate self-signed certificates
- 🔄 **Configure nginx** appropriately for your certificate type

#### Option B: HTTP-Only Deployment (for testing)
```bash
# Deploy without SSL certificates (HTTP only)
HTTP_ONLY=true docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Option C: Manual SSL Certificate Generation
```bash
# 1. Start nginx in HTTP mode
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# 2. Generate SSL certificates (auto-detects public vs internal)
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init

# 3. Restart nginx with SSL
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml restart nginx

# 4. Start remaining services
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps

# Test the application
curl -f http://your-domain.com/health
curl -f https://your-domain.com/health  # If SSL enabled
```

## Service Overview

Your deployment includes:

| Service | Purpose | Port | Auto-Update |
|---------|---------|------|-------------|
| **nginx** | Reverse proxy + SSL | 80, 443 | ❌ |
| **app** | Main application | Internal | ✅ |
| **replit-auth** | Authentication service | 3001 | ✅ |
| **db** | PostgreSQL database | 5432 | ❌ |
| **redis** | Cache & sessions | 6379 | ❌ |
| **certbot** | SSL certificate renewal | - | ❌ |
| **watchtower** | Container auto-updater | - | ❌ |
| **github-runner** | CI/CD runner | - | ❌ |

## Management Commands

### Daily Operations
```bash
# View all services status
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs (all services)
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs -f

# View logs (specific service)
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# Restart a service
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml restart app

# Stop everything
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml down

# Update and restart (manual)
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL Certificate Management

LUStores automatically detects your domain type and generates appropriate certificates:

#### 🌐 **Public Domain SSL (Let's Encrypt)**
For public domains (e.g., `mycompany.com`):
```bash
# Manual certificate renewal (automatic via cron)
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot renew

# Check certificate status
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot certificates

# Force new certificate generation
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
```

#### 🏢 **Internal Domain SSL (Self-Signed)**
For internal domains (e.g., `app.company.local`, `*.university.edu`):
```bash
# Generate new self-signed certificate
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init

# View certificate details
openssl x509 -in certbot/conf/selfsigned.crt -text -noout

# Certificate files location:
# - Certificate: certbot/conf/selfsigned.crt
# - Private Key: certbot/conf/selfsigned.key
```

**Self-Signed Certificate Notes:**
- ✅ **Same encryption strength** as commercial certificates
- ✅ **Perfect for internal networks** (VPN, intranet, university networks)
- ⚠️ **Browser security warning** on first visit (this is normal)
- 💡 **Add security exception** in browser to permanently trust
- 🔄 **Valid for 365 days** (auto-renewable)

### Database Operations
```bash
# Access database
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec db psql -U postgres -d university_inventory

# Database backup
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec db pg_dump -U postgres university_inventory > backup_$(date +%Y%m%d).sql

# Database restore
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U postgres university_inventory < backup.sql
```

## Environment Variables Reference

### Required Variables
```bash
DOMAIN=your-domain.com              # Your domain name
EMAIL=admin@your-domain.com         # Email for SSL certificates
DB_PASSWORD=secure_db_password      # PostgreSQL password
JWT_SECRET=your_jwt_secret_here     # JWT signing secret (32+ chars)
SESSION_SECRET=session_secret_here  # Session encryption secret
```

### Optional Variables
```bash
# SSL Configuration
CERTBOT_STAGING=--staging          # Use Let's Encrypt staging (for testing)

# Database Configuration
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/university_inventory

# Application Configuration
HTTPS=true                         # Force HTTPS redirects
FORCE_HTTPS=true                   # Strict HTTPS enforcement
JWT_EXPIRES_IN=24h                 # JWT token expiration

# GitHub Runner (for CI/CD)
RUNNER_TOKEN=ghp_your_token_here   # GitHub runner registration token
RUNNER_NAME=lustores-prod-runner   # Runner name

# Notifications
WATCHTOWER_NOTIFICATION_WEBHOOK_URL=http://app:5000/api/webhook/watchtower
```

## Automatic Features

### SSL Certificates
- **🌐 Public domains**: Automatic Let's Encrypt certificates with auto-renewal
- **🏢 Internal domains**: Automatic self-signed certificate generation
- **🔄 Auto-detection**: System automatically chooses appropriate certificate type
- **🔒 Strong encryption**: Both certificate types provide equivalent security

### Container Updates
- **Watchtower** monitors containers with `com.centurylinklabs.watchtower.enable=true` label
- **Automatic updates** every 15 minutes for application containers
- **Rolling restarts** for minimal downtime
- **Cleanup** of old images after updates

### Health Monitoring
- **Health checks** built into all services
- **Automatic restarts** if services become unhealthy
- **Dependency management** ensures services start in correct order

## Troubleshooting

### SSL Certificate Issues

**🌐 Public Domain Certificate Problems:**
```bash
# Check Let's Encrypt logs
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs certbot-init

# Common fixes:
# 1. Ensure domain DNS points to your server
# 2. Check ports 80/443 are open
# 3. Verify email address is valid
# 4. Try staging first: CERTBOT_STAGING=--staging
```

**🏢 Internal Domain Certificate Problems:**
```bash
# Check self-signed certificate generation
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs certbot-init

# Verify certificate files exist
ls -la certbot/conf/selfsigned.*

# Common browser security warning solutions:
# 1. Click "Advanced" → "Proceed to [domain] (unsafe)"
# 2. Add permanent security exception
# 3. For company deployment: Import certificate to company CA store
```

**General SSL Issues:**
```bash
# Test HTTPS connectivity
curl -k https://your-domain.com/health

# Check nginx SSL configuration
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs nginx

# Regenerate certificates
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
```

### Common Issues

**Services won't start:**
```bash
# Check service status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View error logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs
```

**SSL certificate issues:**
```bash
# Check certificate status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs certbot

# Manual certificate generation
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
```

**Database connection issues:**
```bash
# Check database health
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_isready -U postgres

# Check database logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs db
```

**Application not accessible:**
```bash
# Check nginx status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs nginx

# Test direct application access
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec app curl http://localhost:5000/health
```

### Quick Fixes

**Reset everything:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Force container updates:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```

**Regenerate SSL certificates:**
```bash
sudo rm -rf certbot/conf/live/your-domain.com
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

## Security Notes

- Database is only accessible within Docker network
- SSL certificates are automatically managed and renewed
- Application containers are automatically updated with security patches
- All services run with restart policies for high availability
- Sensitive data should be stored in `.env.prod` (never commit this file)

## Backup Strategy

**Automated backup script:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db pg_dump -U postgres university_inventory > "$BACKUP_DIR/database.sql"

# SSL certificates backup
cp -r certbot/conf "$BACKUP_DIR/ssl_certificates"

# Environment backup
cp .env.prod "$BACKUP_DIR/environment"

echo "Backup completed: $BACKUP_DIR"
```

Run daily via cron:
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```
