#!/bin/sh

# Self-Signed SSL Certificate Generation Script
echo "Generating self-signed SSL certificate for internal domain..."
echo "Domain: ${DOMAIN}"

# Create certificates directory
mkdir -p /etc/letsencrypt/live/${DOMAIN}

# Generate private key
openssl genrsa -out /etc/letsencrypt/live/${DOMAIN}/privkey.pem 2048

# Generate certificate signing request
openssl req -new -key /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/cert.csr \
    -subj "/C=UK/ST=Lancashire/L=Lancaster/O=Lancaster University/OU=IT Department/CN=${DOMAIN}"

# Generate self-signed certificate (valid for 1 year)
openssl x509 -req -in /etc/letsencrypt/live/${DOMAIN}/cert.csr \
    -signkey /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/cert.pem \
    -days 365 \
    -extensions v3_req \
    -extfile <(echo "[v3_req]
subjectAltName = DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1")

# Create fullchain (for nginx)
cp /etc/letsencrypt/live/${DOMAIN}/cert.pem /etc/letsencrypt/live/${DOMAIN}/fullchain.pem

# Create chain file (empty for self-signed)
touch /etc/letsencrypt/live/${DOMAIN}/chain.pem

# Set proper permissions
chmod 600 /etc/letsencrypt/live/${DOMAIN}/privkey.pem
chmod 644 /etc/letsencrypt/live/${DOMAIN}/*.pem

echo "Self-signed certificate generated successfully!"
echo "Certificate location: /etc/letsencrypt/live/${DOMAIN}/"
echo ""
echo "⚠️  Note: This is a self-signed certificate."
echo "   Browsers will show a security warning that you need to accept."
echo "   For production use, consider getting a proper certificate from your IT department."

# Show certificate details
openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/cert.pem -text -noout | grep -A2 "Subject:"
openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/cert.pem -text -noout | grep -A1 "Not Before"
