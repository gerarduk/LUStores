# SSL/HTTPS Setup for LUStores

This guide explains how to enable HTTPS with Let's Encrypt certificates for the LUStores application using Nginx reverse proxy.

## Architecture

```
Internet → Nginx (SSL Termination) → Express App (HTTP)
```

- **Nginx**: Handles SSL certificates, HTTPS termination, security headers, rate limiting
- **Express App**: Continues to run on HTTP internally (port 5000)
- **Let's Encrypt**: Provides free SSL certificates with auto-renewal

## Quick Start

### 1. For Production (Real Domain)

```bash
# Set your domain and email
export DOMAIN="lustores.yourdomain.com"
export EMAIL="admin@yourdomain.com"

# Run the setup script
./scripts/setup-ssl.sh $DOMAIN $EMAIL

# Start with SSL
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2. For Local Development

```bash
# Setup with self-signed certificates
./scripts/setup-ssl.sh localhost.dev

# Start with SSL
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

### 3. For Staging/Testing

```bash
# Use Let's Encrypt staging for testing
export CERTBOT_STAGING=--staging
./scripts/setup-ssl.sh staging.yourdomain.com admin@yourdomain.com

# Start services
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

## Manual Setup

### Step 1: Configure Domain

1. Point your domain's DNS A record to your server's IP
2. Ensure ports 80 and 443 are open in your firewall

### Step 2: Initial HTTP Setup

```bash
# Copy HTTP-only nginx config for initial setup
cp nginx/nginx-http-only.conf nginx/nginx.conf

# Start services without SSL first
docker-compose up -d app db nginx

# Test that the app is accessible via HTTP
curl http://yourdomain.com/health
```

### Step 3: Obtain SSL Certificates

```bash
# Create directories
mkdir -p certbot/conf certbot/www

# Get Let's Encrypt certificates
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@domain.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com
```

### Step 4: Configure HTTPS

```bash
# Replace domain placeholder in nginx config
sed "s/DOMAIN_PLACEHOLDER/yourdomain.com/g" nginx/nginx.conf > nginx/nginx.conf.tmp
mv nginx/nginx.conf.tmp nginx/nginx.conf

# Restart nginx with HTTPS config
docker-compose restart nginx
```

### Step 5: Enable Auto-Renewal

```bash
# Start certbot service for auto-renewal
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

## Configuration Files

### Nginx Configuration Features

- **SSL/TLS**: TLS 1.2+ with secure cipher suites
- **Security Headers**: HSTS, XSS protection, content security policy
- **Rate Limiting**: API (10 req/s), Login (5 req/min)
- **Compression**: Gzip for static assets
- **Caching**: 1-year cache for static files
- **WebSocket Support**: For Vite HMR in development
- **Health Checks**: Nginx health monitoring

### Environment Variables

The setup adds these environment variables:

```bash
HTTPS=true                    # Enable HTTPS mode in Express
FORCE_HTTPS=true             # Force HTTPS redirects
DOMAIN=yourdomain.com        # Your domain name
EMAIL=admin@yourdomain.com   # Let's Encrypt contact email
```

## File Structure

```
LUStores/
├── nginx/
│   ├── nginx.conf              # Main HTTPS nginx config
│   └── nginx-http-only.conf    # Initial HTTP-only config
├── certbot/
│   ├── conf/                   # SSL certificates
│   └── www/                    # ACME challenge files
├── scripts/
│   └── setup-ssl.sh           # Automated SSL setup script
├── docker-compose.ssl.yml     # SSL-enabled services
├── docker-compose.prod.yml    # Production with SSL
└── .env.ssl                   # SSL environment variables
```

## Docker Compose Services

### nginx
- **Image**: nginx:alpine
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Purpose**: SSL termination, reverse proxy, security

### certbot
- **Image**: certbot/certbot
- **Purpose**: SSL certificate management and auto-renewal
- **Schedule**: Checks for renewal every 12 hours

### app (updated)
- **Ports**: Internal 5000 only (no external exposure)
- **Environment**: HTTPS=true, FORCE_HTTPS=true

## Security Features

### SSL/TLS Configuration
- TLS 1.2 and 1.3 only
- Perfect Forward Secrecy
- OCSP Stapling
- Strong cipher suites

### Security Headers
- **HSTS**: Force HTTPS with preload
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **CSP**: Content Security Policy
- **X-XSS-Protection**: XSS filter

### Rate Limiting
- API endpoints: 10 requests/second with 20 burst
- Auth endpoints: 5 requests/minute with 5 burst

## Monitoring and Logs

### Log Files
- Nginx access logs: `logs/nginx/access.log`
- Nginx error logs: `logs/nginx/error.log`
- Certbot logs: `logs/certbot/`

### Health Checks
- Nginx health check: `GET /health`
- SSL certificate expiry monitoring via certbot

## Troubleshooting

### Common Issues

1. **Certificate not found**
   ```bash
   # Check certificate files
   ls -la certbot/conf/live/yourdomain.com/
   
   # Verify nginx config
   docker-compose exec nginx nginx -t
   ```

2. **Domain validation failed**
   ```bash
   # Ensure domain points to your server
   nslookup yourdomain.com
   
   # Check port 80 is accessible
   curl http://yourdomain.com/.well-known/acme-challenge/test
   ```

3. **SSL handshake errors**
   ```bash
   # Test SSL configuration
   docker-compose exec nginx openssl s_client -connect localhost:443
   
   # Check certificate chain
   openssl verify -CApath /etc/ssl/certs/ certbot/conf/live/yourdomain.com/fullchain.pem
   ```

### Certificate Renewal

Certificates auto-renew, but you can manually renew:

```bash
# Manual renewal
docker-compose exec certbot certbot renew

# Test renewal (dry run)
docker-compose exec certbot certbot renew --dry-run
```

## Production Deployment

### Complete Production Setup

```bash
# 1. Clone repository
git clone https://github.com/st7ma784/LUStores.git
cd LUStores

# 2. Set environment variables
export DOMAIN="lustores.yourcompany.com"
export EMAIL="admin@yourcompany.com"
export SESSION_SECRET="your-super-secret-session-key"

# 3. Setup SSL
./scripts/setup-ssl.sh $DOMAIN $EMAIL

# 4. Start production services
source .env.ssl
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Verify deployment
curl -I https://$DOMAIN/health
```

### Load Balancer Integration

If using a load balancer (AWS ALB, Google Cloud Load Balancer):

1. Configure SSL at the load balancer level
2. Use the HTTP-only nginx config
3. Set `FORCE_HTTPS=false` to avoid double-redirects

## Performance

### Expected Performance Improvements

- **SSL/TLS**: Modern TLS 1.3 for faster handshakes
- **HTTP/2**: Multiplexing and server push
- **Gzip**: Compression reduces bandwidth by ~70%
- **Caching**: Static assets cached for 1 year
- **Keep-Alive**: Persistent connections

### Monitoring

Monitor SSL performance:

```bash
# SSL Labs test (external)
# Visit: https://www.ssllabs.com/ssltest/

# Local SSL test
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Migration from HTTP

To migrate existing HTTP deployment:

1. **Backup**: Ensure database and files are backed up
2. **DNS**: Update DNS to point to new server if needed
3. **Test**: Run setup on staging first
4. **Deploy**: Follow production setup steps
5. **Verify**: Test all functionality over HTTPS
6. **Monitor**: Watch logs for any issues

The migration is designed to be zero-downtime when done properly.
