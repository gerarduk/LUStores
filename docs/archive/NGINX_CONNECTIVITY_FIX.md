# Nginx Connectivity Fix Summary

## Problem Analysis
The nginx service was experiencing upstream connection failures with errors like:
- `connect() failed (113: Host is unreachable)` 
- `connect() failed (111: Connection refused)`
- Trying to connect to hardcoded IPs like `172.19.0.7:5000` and `172.18.0.7:5000`

## Root Causes Identified

1. **Network Isolation**: Services were on the default Docker bridge network without proper network configuration
2. **Inconsistent Upstream Names**: Main nginx config used `app_backend` while HTTP config used `app`
3. **Missing Health Check Dependencies**: nginx was starting before app service was ready
4. **DNS Resolution Issues**: No explicit DNS resolver configuration for Docker's internal DNS

## Changes Made

### 1. Docker Compose Network Configuration (`docker-compose.prod.yml`)
- **Added custom network**: `lustores_network` with dedicated subnet `172.20.0.0/16`
- **Connected all services** to the custom network for better isolation and DNS resolution
- **Updated nginx dependency**: Changed from `service_started` to `service_healthy` to wait for app to be ready

### 2. Nginx Configuration Consistency
- **Fixed upstream naming**: Changed `app_backend` to `app` in `nginx.conf.template` to match `nginx-http.conf`
- **Added DNS resolver**: Added `resolver 127.0.0.11` (Docker's internal DNS) to both config files
- **Improved error handling**: Better fallback mechanisms for upstream failures

### 3. Enhanced Startup Script (`nginx-startup.sh`)
- **Added service availability check**: Wait for app service to be reachable before starting nginx
- **Better error handling**: Continue startup even if app service check times out
- **Improved logging**: More detailed status messages

### 4. Service Network Assignments
All services now explicitly use the `lustores_network`:
- `nginx`
- `app` 
- `db`
- `redis`
- `replit-auth`
- `watchtower`
- `githubrunner`
- `certbot`
- `certbot-init`

## Expected Outcomes

1. **Stable Service Discovery**: Services will use Docker's internal DNS to resolve `app:5000` consistently
2. **No More Hardcoded IPs**: Dynamic resolution prevents connection to stale IP addresses
3. **Better Startup Order**: nginx waits for app to be healthy before trying to proxy requests
4. **Network Isolation**: Custom network provides better security and predictable IP ranges
5. **Improved Reliability**: Better error handling and fallback mechanisms

## Deployment Instructions

1. **Stop existing services**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Remove old network** (if needed):
   ```bash
   docker network prune
   ```

3. **Start services**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify nginx health**:
   ```bash
   curl http://py-stores.lancaster.ac.uk/nginx-health
   ```

5. **Check logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

## Monitoring

After deployment, monitor the nginx logs to confirm:
- No more "Host unreachable" errors
- Successful connections to `app:5000`
- Proper health check responses
- SSL certificate detection working correctly

The changes ensure that nginx can reliably connect to the app service using Docker's internal service discovery, eliminating the hardcoded IP address issues that were causing the connectivity failures.
