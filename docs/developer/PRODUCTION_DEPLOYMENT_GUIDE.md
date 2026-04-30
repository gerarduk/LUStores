# Production Deployment Guide

This guide walks you through deploying LUStores to production with SSL certificates and automatic updates.

## Prerequisites

1. **Domain & DNS**: You need a domain name pointing to your server's IP address
2. **Docker & Docker Compose**: Installed on your production server
3. **Ports**: 80 and 443 should be open and available
4. **Email**: Valid email address for SSL certificate registration

## Quick Start

### 1. Configure Environment

Copy the example environment file and configure it:

```bash
# Copy example environment file
cp .env.prod.example .env.prod

# Edit with your actual values
nano .env.prod  # or use your preferred editor
```

**Required settings in `.env.prod`:**
- `DOMAIN=your-domain.com` - Your actual domain name
- `EMAIL=your-email@domain.com` - Email for SSL certificate registration
- `POSTGRES_PASSWORD=secure_password` - Strong database password
- `JWT_SECRET=long_random_string` - Secure JWT secret (32+ characters)

### 2. Deploy (Linux/Mac)

```bash
# Make deployment script executable
chmod +x deploy-prod.sh

# Run deployment
./deploy-prod.sh deploy
```

### 3. Deploy (Windows PowerShell)

```powershell
# Run deployment
.\deploy-prod.ps1 deploy
```

## Deployment Process

The deployment script automatically:

1. **Validates configuration** - Checks environment variables and prerequisites
2. **Creates directories** - Sets up log and certificate directories
3. **Builds application** - Compiles the application Docker image
4. **Starts database** - Launches PostgreSQL and waits for readiness
5. **Starts application** - Launches the Node.js application
6. **Generates SSL certificates** - Uses Let's Encrypt for HTTPS (if domain is not localhost)
7. **Configures nginx** - Sets up reverse proxy with SSL termination
8. **Starts Watchtower** - Enables automatic container updates
9. **Verifies deployment** - Tests HTTP/HTTPS endpoints

## SSL Certificate Management

### Automatic Certificate Generation

For real domains (not localhost), the script automatically:
- Starts nginx in HTTP-only mode
- Requests SSL certificates from Let's Encrypt using certbot
- Restarts nginx with SSL configuration
- Sets up automatic certificate renewal

### Manual Certificate Operations

```bash
# Generate certificates only
./deploy-prod.sh ssl-only

# Renew certificates (handled automatically by certbot)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec certbot renew
```

## Service Management

### View Status
```bash
./deploy-prod.sh status
```

### View Logs
```bash
# All services
./deploy-prod.sh logs

# Specific service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs db
```

### Stop Services
```bash
./deploy-prod.sh stop
```

### Health Check
```bash
./deploy-prod.sh verify
```

## Automatic Updates with Watchtower

Watchtower monitors and automatically updates containers with the label:
`com.centurylinklabs.watchtower.enable=true`

Currently monitored services:
- Application container
- Database container
- Nginx container

Watchtower runs every 5 minutes and:
- Checks for updated images
- Pulls new versions
- Recreates containers with new images
- Cleans up old images

## Nginx Configuration

The nginx service automatically detects SSL certificates:

- **SSL certificates present**: Uses HTTPS configuration with SSL termination
- **No SSL certificates**: Uses HTTP-only configuration

Configuration files:
- `nginx/nginx.conf.template` - HTTPS configuration template
- `nginx/nginx-http.conf` - HTTP-only configuration

## Directory Structure

```
./
├── docker-compose.yml           # Base Docker Compose configuration
├── docker-compose.prod.yml      # Production overrides
├── .env.prod                   # Production environment variables
├── deploy-prod.sh              # Linux/Mac deployment script
├── deploy-prod.ps1             # Windows PowerShell deployment script
├── nginx/
│   ├── nginx.conf.template     # HTTPS nginx configuration
│   └── nginx-http.conf         # HTTP-only nginx configuration
├── certbot/
│   ├── conf/                   # SSL certificate storage
│   └── www/                    # Let's Encrypt challenge files
├── logs/
│   └── nginx/                  # Nginx access and error logs
└── postgres_data/              # Database persistent storage
```

## Troubleshooting

### Common Issues

1. **SSL certificate generation fails**
   - Ensure domain DNS is pointing to your server
   - Check that ports 80 and 443 are open
   - Verify domain is not localhost/example.com

2. **nginx fails to start**
   - Check if other services are using ports 80/443
   - Verify SSL certificate paths in configuration
   - Check nginx logs: `docker-compose logs nginx`

3. **Database connection issues**
   - Verify PostgreSQL is running: `docker-compose ps db`
   - Check database logs: `docker-compose logs db`
   - Ensure POSTGRES_PASSWORD is set correctly

4. **Application not accessible**
   - Check application logs: `docker-compose logs app`
   - Verify nginx is forwarding requests correctly
   - Test direct application access: `curl http://localhost:3000/health`

### Log Locations

- Application logs: `docker-compose logs app`
- Nginx access logs: `./logs/nginx/access.log`
- Nginx error logs: `./logs/nginx/error.log`
- Database logs: `docker-compose logs db`
- Deployment logs: `./deployment.log`

### Manual Commands

```bash
# Restart specific service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx

# Rebuild application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build app

# Execute commands in containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec app npm run health-check
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_isready -U postgres

# Update single container
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d app
```

## Security Considerations

1. **Environment Variables**: Keep `.env.prod` secure and never commit to version control
2. **SSL Certificates**: Automatically managed and renewed by Let's Encrypt
3. **Database**: PostgreSQL is not directly exposed (internal Docker network only)
4. **Updates**: Watchtower ensures containers stay updated with security patches
5. **Logs**: Monitor logs regularly for suspicious activity

## Backup Strategy

Consider implementing:
- Database backups using `pg_dump`
- SSL certificate backups from `./certbot/conf/`
- Application data backups
- Configuration file backups

Example database backup:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_dump -U postgres university_inventory > backup_$(date +%Y%m%d).sql
```

## Support

For issues or questions:
1. Check the deployment logs: `./deployment.log`
2. Review service logs using the commands above
3. Verify configuration in `.env.prod`
4. Test individual components separately
