#!/bin/bash

# SSL setup script for LUStores with Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 LUStores SSL Setup with Let's Encrypt${NC}"
echo "=================================================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Domain name is required${NC}"
    echo -e "${YELLOW}Usage: $0 <your-domain.com> [email@example.com]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 lustores.yourdomain.com admin@yourdomain.com"
    echo "  $0 localhost.dev  # For local development with self-signed certs"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@${DOMAIN}"}

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Domain: $DOMAIN"
echo "   Email:  $EMAIL"
echo ""

# Create necessary directories
echo -e "${GREEN}📁 Creating directories...${NC}"
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx/conf.d

# Replace domain placeholder in nginx config
echo -e "${GREEN}⚙️  Configuring Nginx...${NC}"
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/nginx.conf > nginx/nginx.conf.tmp && mv nginx/nginx.conf.tmp nginx/nginx.conf

# Check if this is for local development
if [[ "$DOMAIN" == *"localhost"* ]] || [[ "$DOMAIN" == *".local"* ]] || [[ "$DOMAIN" == *".dev"* ]]; then
    echo -e "${YELLOW}🏠 Local development detected - setting up self-signed certificates${NC}"
    
    # Create self-signed certificates for local development
    mkdir -p certbot/conf/live/$DOMAIN
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout certbot/conf/live/$DOMAIN/privkey.pem \
        -out certbot/conf/live/$DOMAIN/fullchain.pem \
        -subj "/C=US/ST=Local/L=Local/O=LUStores Dev/CN=$DOMAIN"
    
    cp certbot/conf/live/$DOMAIN/fullchain.pem certbot/conf/live/$DOMAIN/chain.pem
    
    echo -e "${GREEN}✅ Self-signed certificates created${NC}"
    
else
    echo -e "${GREEN}🌐 Production domain detected - setting up Let's Encrypt${NC}"
    
    # Check if we already have certificates
    if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
        echo -e "${YELLOW}📜 Obtaining initial certificates...${NC}"
        
        # Start nginx with HTTP-only config first
        docker-compose up -d nginx
        sleep 5
        
        # Get the certificate
        docker-compose run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN
            
        echo -e "${GREEN}✅ Certificates obtained${NC}"
    else
        echo -e "${GREEN}✅ Certificates already exist${NC}"
    fi
fi

# Update environment file
echo -e "${GREEN}📝 Updating environment configuration...${NC}"
if [ ! -f ".env.ssl" ]; then
    cat > .env.ssl << EOF
# SSL Configuration
DOMAIN=$DOMAIN
EMAIL=$EMAIL
HTTPS=true
FORCE_HTTPS=true

# Let's Encrypt settings
CERTBOT_EMAIL=$EMAIL
EOF
    echo -e "${GREEN}✅ Created .env.ssl file${NC}"
else
    echo -e "${YELLOW}⚠️  .env.ssl already exists - please update manually if needed${NC}"
fi

echo ""
echo -e "${GREEN}🚀 SSL setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Source the SSL environment: ${GREEN}source .env.ssl${NC}"
echo "2. Start the services: ${GREEN}docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d${NC}"
echo "3. Access your app at: ${GREEN}https://$DOMAIN${NC}"
echo ""

if [[ "$DOMAIN" != *"localhost"* ]] && [[ "$DOMAIN" != *".local"* ]] && [[ "$DOMAIN" != *".dev"* ]]; then
    echo -e "${YELLOW}📋 For production:${NC}"
    echo "- Make sure port 80 and 443 are open"
    echo "- Point your domain's DNS A record to this server's IP"
    echo "- The certificate will auto-renew via cron job"
    echo ""
fi

echo -e "${GREEN}🎉 Happy secure coding!${NC}"
