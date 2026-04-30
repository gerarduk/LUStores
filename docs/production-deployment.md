# Production Deployment Guide

This guide covers deploying LUStores in a production environment with Redis caching and automatic updates via Watchtower.

## Features

- **Redis Caching**: Improved performance with Redis for session storage and caching
- **Automatic Updates**: Watchtower monitors and updates containers when new versions are available
- **Environment-based Configuration**: Secure configuration using environment variables
- **Health Monitoring**: Built-in health checks for all services
- **Graceful Restarts**: Zero-downtime deployments with proper service dependencies

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.prod.example .env.prod
   ```

2. **Configure your production settings** in `.env.prod`:
   ```bash
   # Update these with your actual values
   DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/university_inventory
   SESSION_SECRET=your_very_secure_session_secret_at_least_32_characters_long
   REDIS_URL=redis://:your_redis_password@redis:6379
   REPLIT_DOMAINS=your-domain.com
   ```

3. **Deploy using the provided script:**
   
   **Linux/macOS:**
   ```bash
   chmod +x deploy-production.sh
   ./deploy-production.sh
   ```
   
   **Windows (PowerShell):**
   ```powershell
   .\deploy-production.ps1
   ```

## Manual Deployment

If you prefer to deploy manually:

```bash
# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## Services

### Application Stack

- **app**: Main LUStores application
- **db**: PostgreSQL database with persistent storage
- **redis**: Redis cache with persistence and optional password protection
- **replit-auth**: Authentication service

### Monitoring & Updates

- **watchtower**: Automatic container updates with configurable polling interval

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@db:5432/university_inventory` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `SESSION_SECRET` | Session encryption key | `your-secret-key-here` |
| `REPLIT_DOMAINS` | Allowed domains for the application | `localhost:5000` |
| `WATCHTOWER_POLL_INTERVAL` | Update check interval (seconds) | `300` |

### Watchtower Configuration

Watchtower automatically updates containers based on labels:

- **Enabled for updates**: `app`, `redis`, `replit-auth`
- **Disabled for updates**: `db` (database safety), `watchtower` (self-update prevention)

#### Notification Setup

Configure Slack notifications by setting these environment variables:

```env
WATCHTOWER_NOTIFICATIONS=slack
WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=watchtower-lustores
```

## Security Considerations

1. **Change default passwords**: Update all default passwords in `.env.prod`
2. **Use strong secrets**: Generate cryptographically secure values for session secrets
3. **Network security**: Consider using Docker networks and firewalls
4. **SSL/TLS**: Use a reverse proxy (nginx, Traefik) for HTTPS termination
5. **Database access**: Restrict database access to application containers only

## Monitoring

### Health Checks

All services include health checks that can be monitored:

```bash
# Check service health
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View detailed health status
docker inspect lustores-app-1 | grep Health -A 10
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs

# Follow specific service logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# View Watchtower update logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs watchtower
```

## Backup and Recovery

### Database Backup

```bash
# Create database backup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_dump -U postgres university_inventory > backup.sql

# Restore from backup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db psql -U postgres university_inventory < backup.sql
```

### Redis Backup

Redis persistence is enabled with AOF (Append Only File), providing automatic persistence.

## Troubleshooting

### Common Issues

1. **Services won't start**: Check environment variables and Docker daemon
2. **Database connection issues**: Verify DATABASE_URL and database service health
3. **Redis connection issues**: Check REDIS_URL and Redis service status
4. **Watchtower not updating**: Verify Docker socket mount and service labels

### Useful Commands

```bash
# Restart specific service
docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart app

# Rebuild and restart application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build app

# View resource usage
docker stats

# Clean up unused resources
docker system prune -f
```

## Performance Tuning

### Redis Configuration

For high-traffic deployments, consider tuning Redis:

```bash
# In docker-compose.prod.yml, modify Redis command:
command: >
  redis-server --appendonly yes
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
  --tcp-keepalive 60
```

### Database Optimization

- Monitor connection pooling in the application
- Consider PostgreSQL tuning for your hardware
- Set up read replicas for high-read workloads

### Watchtower Optimization

- Adjust `WATCHTOWER_POLL_INTERVAL` based on your update frequency needs
- Use `WATCHTOWER_MONITOR_ONLY=true` to disable automatic updates during critical periods
