# Simple Production Deployment

This guide provides the easiest way to deploy LUStores to production using Docker Compose.

## Quick Start (3 Steps)

### 1. Setup Environment

Create your production environment file:

```bash
# Copy example and edit
cp .env.prod.example .env.prod
```

**Required settings in `.env.prod`:**
```bash
# Domain & SSL
DOMAIN=your-domain.com
EMAIL=your-email@domain.com

# Database
DB_PASSWORD=your_secure_password_here

# Application Security
JWT_SECRET=your_jwt_secret_32_chars_minimum
SESSION_SECRET=your_session_secret_here

# Optional: GitHub Runner (for CI/CD)
RUNNER_TOKEN=your_github_runner_token
```

### 2. Deploy with Docker Compose

#### Option A: Full Production Deployment
```bash
# Deploy everything with SSL
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Option B: HTTP-Only Deployment (for testing)
```bash
# Deploy without SSL certificates
CERTBOT_STAGING=--staging docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Option C: Generate SSL Certificates First
```bash
# 1. Start nginx in HTTP mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# 2. Generate SSL certificates
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init

# 3. Restart nginx with SSL
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx

# 4. Start remaining services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

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
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs (all services)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# Restart a service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart app

# Stop everything
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Update and restart (manual)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL Certificate Management
```bash
# Manual certificate renewal
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot renew

# Check certificate status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot certificates

# Generate new certificate for different domain
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
```

### Database Operations
```bash
# Access database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db psql -U postgres -d university_inventory

# Database backup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_dump -U postgres university_inventory > backup_$(date +%Y%m%d).sql

# Database restore
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U postgres university_inventory < backup.sql
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
- **Automatic generation** via Let's Encrypt when domain is set
- **Auto-renewal** every 12 hours via certbot service
- **Graceful fallback** to HTTP if certificates fail

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
