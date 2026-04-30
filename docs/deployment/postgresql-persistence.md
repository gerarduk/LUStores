# PostgreSQL Data Persistence Guide

This guide explains how to handle PostgreSQL data persistence when deploying with existing database directories.

## Current Configuration

The production setup is configured to mount PostgreSQL data to `/db` on the host:

```yaml
volumes:
  - /db:/var/lib/postgresql/data
```

## Key Features for Data Persistence

### 1. Safe Initialization
- Uses `CREATE TABLE IF NOT EXISTS` in init.sql
- Only initializes database if it doesn't exist
- Preserves existing data during container restarts

### 2. Version Compatibility
- Uses `PGDATA=/var/lib/postgresql/data/pgdata` for cleaner data organization
- Includes compatibility checking script

### 3. Permission Handling
- PostgreSQL container runs as user 999:999
- Data directory must be owned by this user

## Deployment Scenarios

### Scenario 1: Fresh Deployment
```bash
# Create and set permissions for data directory
sudo mkdir -p /db
sudo chown -R 999:999 /db
sudo chmod 750 /db

# Deploy normally
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Scenario 2: Existing Data (Same PostgreSQL Version)
```bash
# Check compatibility first
./scripts/check-postgres-compatibility.sh

# If compatible, deploy normally
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Scenario 3: Existing Data (Different PostgreSQL Version)
```bash
# 1. Backup existing data
docker run --rm -v /db:/var/lib/postgresql/data \
  -v $(pwd):/backup postgres:15-alpine \
  pg_dump -h localhost -U postgres university_inventory > /backup/database_backup_$(date +%Y%m%d).sql

# 2. Move old data
sudo mv /db /db.backup.$(date +%Y%m%d)

# 3. Create fresh directory
sudo mkdir -p /db
sudo chown -R 999:999 /db

# 4. Deploy with fresh database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Wait for database to be ready
sleep 30

# 6. Restore data
docker exec -i $(docker-compose ps -q db) \
  psql -U postgres university_inventory < database_backup_$(date +%Y%m%d).sql
```

### Scenario 4: Migration from Another System
```bash
# Use the migration script instead of init.sql
python scripts/migrate_mariadb_api.py web

# The migration script will:
# - Connect to existing MariaDB/MySQL
# - Migrate data to the new PostgreSQL instance
# - Handle data transformation and validation
```

## Best Practices

### 1. Always Backup Before Major Changes
```bash
# Create backup
docker exec $(docker-compose ps -q db) \
  pg_dump -U postgres university_inventory > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
head -20 backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Monitor Database Health
```bash
# Check database status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps db

# Check logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs db

# Test connection
docker exec $(docker-compose ps -q db) \
  pg_isready -U postgres -d university_inventory
```

### 3. Handle Permissions Correctly
```bash
# Fix permissions if needed
sudo chown -R 999:999 /db
sudo chmod 750 /db

# Check current permissions
ls -la /db
```

## Troubleshooting

### Database Won't Start
1. Check permissions: `ls -la /db`
2. Check PostgreSQL version compatibility
3. Check disk space: `df -h /db`
4. Check logs: `docker-compose logs db`

### Permission Denied Errors
```bash
# Fix PostgreSQL data permissions
sudo chown -R 999:999 /db
sudo chmod 750 /db
```

### Version Mismatch
```bash
# Check existing version
cat /db/PG_VERSION

# Expected version (from docker-compose.prod.yml)
echo "15"
```

### Data Corruption
```bash
# Stop database
docker-compose stop db

# Run PostgreSQL recovery
docker run --rm -v /db:/var/lib/postgresql/data postgres:15-alpine \
  postgres --single -D /var/lib/postgresql/data/pgdata university_inventory < /dev/null
```

## Environment Variables

The following environment variables affect PostgreSQL behavior:

- `POSTGRES_DB=university_inventory` - Database name
- `POSTGRES_USER=postgres` - Database user
- `POSTGRES_PASSWORD=${DB_PASSWORD}` - Database password (from .env.prod)
- `PGDATA=/var/lib/postgresql/data/pgdata` - Data directory location

## Security Considerations

1. **Data Directory Permissions**: Ensure `/db` is not world-readable
2. **Database Password**: Use strong passwords in `.env.prod`
3. **Network Access**: PostgreSQL port 5432 is exposed for migration tools
4. **Backup Security**: Encrypt backups if they contain sensitive data

## Monitoring

The database includes health checks:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d university_inventory"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Check health status:
```bash
docker inspect $(docker-compose ps -q db) | grep Health -A 10
```
