# Nginx Configuration for LUStores

This directory contains nginx configuration files for the LUStores application.

## Files

- `nginx-http.conf` - HTTP-only configuration (development/testing)
- `nginx.conf` - HTTPS configuration with HTTP to HTTPS redirect (production)

## Current Setup

The AWS docker-compose configuration uses `nginx-http.conf` which:
- Listens on port 80
- Proxies all traffic to the app container on port 5000
- Includes health check endpoint at `/health`
- Supports WebSocket connections
- Sets proper proxy headers

## SSL/HTTPS Setup

To enable HTTPS:

1. Create SSL certificates and place them in `nginx/ssl/`:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Update docker-compose.aws.yml to use `nginx.conf` instead of `nginx-http.conf`:
   ```yaml
   volumes:
     - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     - ./nginx/ssl:/etc/nginx/ssl:ro
   ```

3. Update the nginx.conf file to uncomment the SSL certificate lines:
   ```nginx
   ssl_certificate /etc/nginx/ssl/cert.pem;
   ssl_certificate_key /etc/nginx/ssl/key.pem;
   ```

## Health Checks

- Nginx health check: `http://localhost/health`
- App health check: `http://localhost:5000/health` (internal)

## Port Mapping

- External: Port 80 (HTTP) and 443 (HTTPS)
- Internal: nginx → app:5000
