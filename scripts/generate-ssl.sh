#!/bin/sh

# SSL Certificate Generation Script for Certbot Container
echo "Starting SSL certificate generation..."
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "Staging: ${CERTBOT_STAGING}"
echo "Use Self-Signed: ${USE_SELF_SIGNED}"

# Check if domain is internal/private (common patterns)
if echo "${DOMAIN}" | grep -qE "\.(local|internal|lan|corp|university|ac\.uk)$|^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)"; then
    echo "Detected internal/private domain: ${DOMAIN}"
    echo "Using self-signed certificate instead of Let's Encrypt"
    USE_SELF_SIGNED="true"
fi

if [ "${USE_SELF_SIGNED}" = "true" ]; then
    echo "Generating self-signed certificate..."
    /bin/sh /generate-self-signed-ssl.sh
    exit $?
fi

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "Obtaining Let's Encrypt certificate for ${DOMAIN}..."
    
    # Build certbot command
    CERTBOT_CMD="certbot certonly --webroot --webroot-path=/var/www/certbot --email ${EMAIL} --agree-tos --no-eff-email"
    
    # Add staging flag if set
    if [ -n "${CERTBOT_STAGING}" ]; then
        CERTBOT_CMD="${CERTBOT_CMD} ${CERTBOT_STAGING}"
    fi
    
    # Add domain
    CERTBOT_CMD="${CERTBOT_CMD} -d ${DOMAIN}"
    
    echo "Running: ${CERTBOT_CMD}"
    eval ${CERTBOT_CMD}
    
    if [ $? -eq 0 ]; then
        echo "Certificate obtained successfully for ${DOMAIN}"
    else
        echo "Failed to obtain Let's Encrypt certificate for ${DOMAIN}"
        echo "Falling back to self-signed certificate..."
        /bin/sh /generate-self-signed-ssl.sh
        exit $?
    fi
else
    echo "Certificate for ${DOMAIN} already exists"
    ls -la "/etc/letsencrypt/live/${DOMAIN}/"
fi
