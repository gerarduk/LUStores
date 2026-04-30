# Nginx Health Check and App Endpoint Fix

## Issues Identified

### 1. Nginx Health Check Failing
**Error**: `Connection refused` when trying to access `localhost:80`
**Root Cause**: IPv6/IPv4 resolution issues with `localhost`

### 2. App Endpoint `/api/notifications/deployments` Not Working
**Error**: Endpoint not responding
**Root Causes**: 
- App service not starting properly due to dependency issues
- Health checks failing because tools (wget/curl) not available
- Authentication service (replit-auth) not healthy before app starts

## Fixes Applied

### 1. **Nginx Health Check Fix**
- **Changed health check method**: From `wget` to `nc` (netcat) for port connectivity
- **Used specific IP**: `127.0.0.1:80` instead of `localhost`
- **Added netcat**: Ensured netcat-openbsd is installed for health checks

```yaml
healthcheck:
  test: ["CMD", "nc", "-z", "127.0.0.1", "80"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### 2. **App Service Health Check Fix**
- **Fixed health check command**: Used `wget` with proper shell execution
- **Improved IP specificity**: Used `127.0.0.1:5000` instead of `localhost:5000`
- **Added proper error handling**: Used CMD-SHELL with error checking

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

### 3. **Service Dependencies Fix**
- **Enhanced replit-auth dependency**: Changed from `service_started` to `service_healthy`
- **Added replit-auth health check**: Ensures auth service is working before app starts
- **Proper startup order**: nginx → app → replit-auth → db (all healthy)

```yaml
depends_on:
  db:
    condition: service_healthy
  replit-auth:
    condition: service_healthy
```

### 4. **Authentication Service Health Check**
- **Added health check for replit-auth**: Ensures auth service is responding
- **Proper endpoint testing**: Tests `/health` endpoint on port 3001

```yaml
replit-auth:
  healthcheck:
    test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
```

## Expected Results

### 1. **Nginx Health Check Success**
- Nginx container will report as healthy
- Port 80 connectivity confirmed via netcat
- No more "Connection refused" errors

### 2. **App Service Startup**
- App waits for database AND auth service to be healthy
- Proper health check ensures app is responding on port 5000
- `/health` endpoint accessible and responding

### 3. **API Endpoint Functionality**
- `/api/notifications/deployments` endpoint should work
- Authentication should be properly initialized
- Deployment notifications feature will be functional

### 4. **Service Dependencies**
- Proper startup order: db → replit-auth → app → nginx
- All services report as healthy before next service starts
- No race conditions or failed dependencies

## Testing Commands

After deployment, test the fixes:

```bash
# Test nginx health
docker-compose -f docker-compose.prod.yml exec nginx nc -z 127.0.0.1 80

# Test app health
docker-compose -f docker-compose.prod.yml exec app wget --spider http://127.0.0.1:5000/health

# Test auth service health
docker-compose -f docker-compose.prod.yml exec replit-auth wget --spider http://127.0.0.1:3001/health

# Test API endpoint (requires authentication)
curl -X GET https://py-stores.lancaster.ac.uk/api/notifications/deployments

# Check all service health
docker-compose -f docker-compose.prod.yml ps
```

## Troubleshooting

If issues persist:

1. **Check service logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   docker-compose -f docker-compose.prod.yml logs app
   docker-compose -f docker-compose.prod.yml logs replit-auth
   ```

2. **Verify network connectivity**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec nginx nc -z app 5000
   docker-compose -f docker-compose.prod.yml exec app nc -z replit-auth 3001
   ```

3. **Check health check status**:
   ```bash
   docker inspect $(docker-compose -f docker-compose.prod.yml ps -q nginx) | grep -A 10 Health
   ```

The fixes address both the networking issues (IPv6/localhost resolution) and the service dependency chain to ensure all components start in the correct order and report healthy status.
