#!/bin/bash
# SSL Certificate Setup and Troubleshooting Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 SSL Certificate Setup for LUStores${NC}"
echo "========================================"

# Load environment
if [[ ! -f ".env.prod" ]]; then
    echo -e "${RED}❌ .env.prod file not found!${NC}"
    exit 1
fi

source .env.prod

echo -e "${BLUE}Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}Email: ${EMAIL}${NC}"

# Check if domain is valid
if [[ "${DOMAIN}" == "localhost" || "${DOMAIN}" == "your-domain.com" || -z "${DOMAIN}" ]]; then
    echo -e "${YELLOW}⚠️  Domain is set to '${DOMAIN}' - SSL certificates cannot be generated for localhost/example domains${NC}"
    echo -e "${YELLOW}Please set a real domain name in .env.prod${NC}"
    exit 1
fi

# Check DNS resolution
echo -e "${BLUE}🌐 Checking DNS resolution for ${DOMAIN}...${NC}"
if nslookup "${DOMAIN}" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ DNS resolution successful${NC}"
else
    echo -e "${RED}❌ DNS resolution failed for ${DOMAIN}${NC}"
    echo -e "${YELLOW}Please ensure your domain is pointing to this server's IP address${NC}"
    exit 1
fi

# Create directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p certbot/conf certbot/www logs/nginx logs/certbot

# Check if certificates already exist
if [[ -d "certbot/conf/live/${DOMAIN}" ]]; then
    echo -e "${GREEN}✅ SSL certificates already exist for ${DOMAIN}${NC}"
    echo -e "${BLUE}Certificate details:${NC}"
    if command -v openssl >/dev/null 2>&1; then
        openssl x509 -in "certbot/conf/live/${DOMAIN}/cert.pem" -text -noout | grep -A 1 "Validity"
    fi
    echo -e "${YELLOW}To renew certificates: docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml exec certbot certbot renew${NC}"
    exit 0
fi

echo -e "${BLUE}🚀 Starting SSL certificate generation process...${NC}"

# Step 1: Start nginx in HTTP-only mode
echo -e "${BLUE}1️⃣  Starting nginx in HTTP-only mode...${NC}"
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
echo -e "${BLUE}⏳ Waiting for nginx to start...${NC}"
sleep 10

# Check if nginx is responding
echo -e "${BLUE}🩺 Testing HTTP endpoint...${NC}"
if curl -f "http://${DOMAIN}/.well-known/acme-challenge/test" >/dev/null 2>&1 || curl -f "http://localhost/.well-known/acme-challenge/test" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx may not be fully ready yet, continuing...${NC}"
fi

# Step 2: Generate SSL certificates
echo -e "${BLUE}2️⃣  Generating SSL certificates for ${DOMAIN}...${NC}"

# Check if we should use staging
if [[ "${CERTBOT_STAGING}" == "--staging" ]]; then
    echo -e "${YELLOW}🧪 Using Let's Encrypt staging environment (test certificates)${NC}"
else
    echo -e "${GREEN}🔐 Using Let's Encrypt production environment${NC}"
fi

# Run certbot
echo -e "${BLUE}Running certbot certificate generation...${NC}"
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init

# Check if certificate was generated
if [[ -d "certbot/conf/live/${DOMAIN}" ]]; then
    echo -e "${GREEN}✅ SSL certificate generated successfully!${NC}"
    
    # Step 3: Restart nginx with SSL
    echo -e "${BLUE}3️⃣  Restarting nginx with SSL configuration...${NC}"
    docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml restart nginx
    
    # Wait for nginx to restart
    sleep 10
    
    # Test HTTPS
    echo -e "${BLUE}🔍 Testing HTTPS endpoint...${NC}"
    if curl -k -f "https://${DOMAIN}/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ HTTPS is working!${NC}"
        echo -e "${GREEN}🎉 SSL setup completed successfully${NC}"
        echo ""
        echo -e "${BLUE}Your site is now accessible at:${NC}"
        echo -e "${GREEN}  HTTPS: https://${DOMAIN}${NC}"
        echo -e "${BLUE}  HTTP:  http://${DOMAIN} (redirects to HTTPS)${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS endpoint not responding yet${NC}"
        echo -e "${YELLOW}This may be normal - nginx might still be starting up${NC}"
        
        # Show nginx logs for debugging
        echo -e "${BLUE}📋 Recent nginx logs:${NC}"
        docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs --tail=10 nginx
    fi
else
    echo -e "${RED}❌ SSL certificate generation failed${NC}"
    echo -e "${BLUE}📋 Certbot logs:${NC}"
    docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml logs certbot-init
    
    echo -e "${YELLOW}💡 Troubleshooting suggestions:${NC}"
    echo "1. Ensure your domain ${DOMAIN} points to this server's IP"
    echo "2. Check that ports 80 and 443 are open and accessible"
    echo "3. Verify your email address is valid: ${EMAIL}"
    echo "4. Try using staging certificates first: set CERTBOT_STAGING=--staging in .env.prod"
fi

echo ""
echo -e "${BLUE}📊 Current service status:${NC}"
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps
