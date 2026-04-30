# University Inventory Management System - Docker Setup

This guide explains how to run the University Inventory Management System using Docker containers.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of available RAM
- Port 5000 and 5432 available

### Production Deployment

1. **Clone and configure environment:**
```bash
# Copy the environment template
cp docker-compose.yml docker-compose.production.yml

# Edit the environment variables in docker-compose.production.yml
# Set your actual values for:
# - SESSION_SECRET (generate a secure random string)
# - REPL_ID (your Replit application ID)
# - REPLIT_DOMAINS (your domain name)
```

2. **Start the services:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

3. **Initialize the database:**
```bash
# Run database migrations
docker-compose exec app npm run db:push
```

4. **Access the application:**
- Main application: http://localhost:5000
- API documentation: http://localhost:5000/api/docs

### Development Mode

For development with hot reloading:

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | Auto-configured |
| `SESSION_SECRET` | Secret key for sessions | Yes | Must be set |
| `REPL_ID` | Replit application ID | Yes | Must be set |
| `REPLIT_DOMAINS` | Comma-separated domains | Yes | Must be set |
| `NODE_ENV` | Environment mode | No | production |
| `ISSUER_URL` | OAuth issuer URL | No | https://replit.com/oidc |

### Database Setup

The PostgreSQL database is automatically configured with:
- Database: `university_inventory`
- User: `postgres`
- Password: `password` (change in production!)
- Port: `5432`

### Volumes

- `postgres_data`: Database files
- `redis_data`: Redis cache (optional)
- `./logs`: Application logs

## Management Commands

### Database Operations
```bash
# Push schema changes
docker-compose exec app npm run db:push

# View database logs
docker-compose logs db

# Connect to database
docker-compose exec db psql -U postgres -d university_inventory
```

### Application Management
```bash
# View application logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Scale application (multiple instances)
docker-compose up -d --scale app=3
```

### Backup and Restore
```bash
# Backup database
docker-compose exec db pg_dump -U postgres university_inventory > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres university_inventory < backup.sql
```

## Security Considerations

### Production Security
1. **Change default passwords:**
   - Update PostgreSQL password
   - Set strong SESSION_SECRET

2. **Use HTTPS:**
   - Configure reverse proxy (nginx/traefik)
   - Obtain SSL certificates

3. **Network security:**
   - Use custom Docker networks
   - Restrict port exposure

4. **Regular updates:**
   - Update base images
   - Monitor for security patches

### Example Production Configuration

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    ports:
      - "127.0.0.1:5000:5000"  # Bind to localhost only
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://inventory_user:secure_password@db:5432/university_inventory
      - SESSION_SECRET=your-very-secure-random-string-here
      - REPL_ID=your-actual-repl-id
      - REPLIT_DOMAINS=yourdomain.com,www.yourdomain.com
    restart: unless-stopped
    depends_on:
      - db
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=university_inventory
      - POSTGRES_USER=inventory_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using port 5000
   sudo lsof -i :5000
   
   # Use different port
   docker-compose up -d -p 3000:5000
   ```

2. **Database connection issues:**
   ```bash
   # Check database status
   docker-compose ps db
   
   # View database logs
   docker-compose logs db
   ```

3. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

4. **Memory issues:**
   ```bash
   # Check Docker resources
   docker system df
   
   # Clean up unused containers
   docker system prune
   ```

### Health Checks

The application includes built-in health checks:

```bash
# Check application health
curl http://localhost:5000/api/docs

# View health status
docker-compose ps
```

## Performance Optimization

### Production Optimizations

1. **Multi-stage builds:** Already implemented for smaller images
2. **Resource limits:**
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             memory: 512M
             cpus: '0.5'
   ```

3. **Redis caching:** Uncomment Redis service for session caching
4. **Load balancing:** Use multiple app instances with a load balancer

### Monitoring

Add monitoring with:
- Prometheus + Grafana
- Application logs aggregation
- Database performance monitoring

## Support

For issues and questions:
1. Check the application logs: `docker-compose logs app`
2. Verify database connectivity: `docker-compose exec app npm run db:check`
3. Review the API documentation: http://localhost:5000/api/docs