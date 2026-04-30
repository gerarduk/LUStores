#!/bin/bash
# Simple one-command deployment script

set -e

COMPOSE_CMD="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"

echo "🚀 LUStores Quick Deploy"
echo "======================="

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "❌ .env.prod file not found!"
    echo "📝 Please copy .env.prod.template to .env.prod and configure it:"
    echo "   cp .env.prod.template .env.prod"
    echo "   nano .env.prod  # Edit with your settings"
    exit 1
fi

# Source environment to check domain
source .env.prod

echo "🔍 Checking PostgreSQL data compatibility..."
if [ -f "./scripts/check-postgres-compatibility.sh" ]; then
    chmod +x ./scripts/check-postgres-compatibility.sh
    ./scripts/check-postgres-compatibility.sh
else
    echo "⚠️  PostgreSQL compatibility check script not found - proceeding anyway"
    # Basic permission check
    if [ -d "/db" ]; then
        echo "📁 Existing PostgreSQL data directory found"
        sudo chown -R 999:999 /db 2>/dev/null || echo "⚠️  Could not fix permissions - may need manual intervention"
    fi
fi

echo "🔧 Domain: ${DOMAIN}"
echo "📧 Email: ${EMAIL}"

# Quick validation
if [ "${DOMAIN}" = "your-domain.com" ] || [ -z "${DOMAIN}" ]; then
    echo "❌ Please set your actual DOMAIN in .env.prod"
    exit 1
fi

if [ "${EMAIL}" = "your-email@your-domain.com" ] || [ -z "${EMAIL}" ]; then
    echo "❌ Please set your actual EMAIL in .env.prod"
    exit 1
fi

echo "✅ Environment validated"

# Clean up any existing containers to avoid naming conflicts
echo "🧹 Cleaning up existing containers..."
$COMPOSE_CMD down --remove-orphans --volumes 2>/dev/null || true
docker container prune -f 2>/dev/null || true

# --- GitHub Actions Runner Registration (using GitHub App credentials) ---
# Requires: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env.prod
# This will generate a RUNNER_TOKEN for the Docker-based runner in docker-compose.prod.yml

REPO_URL="https://github.com/st7ma784/LUStores"
REPO_OWNER="st7ma784"
REPO_NAME="LUStores"

# # Generate a fresh registration token using your GitHub App credentials
# if [ -n "$GITHUB_APP_ID" ] && [ -n "$GITHUB_APP_PRIVATE_KEY" ]; then
#     echo "🔑 Generating GitHub Actions runner registration token for Docker runner..."
    
#     # Generate JWT token for GitHub App authentication
#     generate_jwt() {
#         local app_id="$1"
#         local private_key="$2"
        
#         # Create header and payload
#         local header='{"alg":"RS256","typ":"JWT"}'
#         local now=$(date +%s)
#         local iat=$((now - 60))
#         local exp=$((now + 600))
#         local payload="{\"iat\":$iat,\"exp\":$exp,\"iss\":\"$app_id\"}"
        
#         # Base64url encode header and payload
#         local header_b64=$(echo -n "$header" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
#         local payload_b64=$(echo -n "$payload" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
        
#         # Create signature
#         local signature_input="$header_b64.$payload_b64"
#         echo -n "$private_key" > /tmp/github_app_key.pem
#         local signature=$(echo -n "$signature_input" | openssl dgst -sha256 -sign /tmp/github_app_key.pem | openssl base64 -A | tr '+/' '-_' | tr -d '=')
#         rm -f /tmp/github_app_key.pem
        
#         echo "$header_b64.$payload_b64.$signature"
#     }
    
#     # Generate JWT
#     JWT=$(generate_jwt "$GITHUB_APP_ID" "$GITHUB_APP_PRIVATE_KEY")
    
#     # Get installation ID
#     echo "🔍 Getting installation ID..."
#     INSTALLATION_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT" \
#         -H "Accept: application/vnd.github.v3+json" \
#         -H "User-Agent: LUStores-Runner-Registration/1.0" \
#         "https://api.github.com/app/installations")
    
#     INSTALLATION_ID=$(echo "$INSTALLATION_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    
#     if [ -z "$INSTALLATION_ID" ]; then
#         echo "❌ Failed to get installation ID. Response: $INSTALLATION_RESPONSE"
#         exit 1
#     fi
    
#     # Get installation access token
#     echo "🔐 Getting installation access token..."
#     INSTALL_TOKEN_RESPONSE=$(curl -s -X POST \
#         -H "Authorization: Bearer $JWT" \
#         -H "Accept: application/vnd.github.v3+json" \
#         -H "User-Agent: LUStores-Runner-Registration/1.0" \
#         "https://api.github.com/app/installations/$INSTALLATION_ID/access_tokens")
    
#     INSTALL_TOKEN=$(echo "$INSTALL_TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
#     if [ -z "$INSTALL_TOKEN" ]; then
#         echo "❌ Failed to get installation token. Response: $INSTALL_TOKEN_RESPONSE"
#         exit 1
#     fi
    
#     # Get runner registration token
#     echo "🎫 Getting runner registration token..."
#     REG_TOKEN_RESPONSE=$(curl -s -X POST \
#         -H "Authorization: token $INSTALL_TOKEN" \
#         -H "Accept: application/vnd.github.v3+json" \
#         -H "User-Agent: LUStores-Runner-Registration/1.0" \
#         "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runners/registration-token")
    
#     REG_TOKEN=$(echo "$REG_TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
#     if [ -z "$REG_TOKEN" ]; then
#         echo "❌ Failed to get runner registration token. Response: $REG_TOKEN_RESPONSE"
#         exit 1
#     fi
    
#     echo "✅ Registration token obtained: ${REG_TOKEN:0:10}..."
    
#     # Export the token for use by docker-compose
#     export RUNNER_TOKEN="$REG_TOKEN"
    
#     # Update .env.prod with the new token (temporary approach)
#     if grep -q "^RUNNER_TOKEN=" .env.prod; then
#         sed -i "s/^RUNNER_TOKEN=.*/RUNNER_TOKEN=$REG_TOKEN/" .env.prod
#     else
#         echo "RUNNER_TOKEN=$REG_TOKEN" >> .env.prod
#     fi
    
#     echo "✅ RUNNER_TOKEN updated in .env.prod for Docker runner"
# else
#     echo "⚠️  GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY not set. Skipping runner registration."
# fi

# Deploy
echo "🐳 Starting deployment..."
$COMPOSE_CMD up -d --remove-orphans

echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo "🏥 Checking service health..."
$COMPOSE_CMD ps

# Test endpoints
echo "🌐 Testing HTTP endpoint..."
if curl -f "http://${DOMAIN}/health" >/dev/null 2>&1 || curl -f "http://localhost/health" >/dev/null 2>&1; then
    echo "✅ HTTP endpoint is working"
else
    echo "⚠️  HTTP endpoint not yet ready (this may be normal during startup)"
fi

# Check for SSL and run initial cert generation if missing
if [ -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 SSL certificate found - testing HTTPS..."
    if curl -k -f "https://${DOMAIN}/health" >/dev/null 2>&1; then
        echo "✅ HTTPS endpoint is working"
    else
        echo "⚠️  HTTPS endpoint not ready yet"
    fi
else
    echo "📋 SSL certificate not found — attempting automatic generation"
    echo "🔄 Starting certbot-init (this may request certificates from Let's Encrypt)"

    # Start certbot-init to obtain certificates (runs once, may fallback to self-signed)
    $COMPOSE_CMD --profile init up --no-recreate certbot-init || true

    echo "⏳ Waiting up to 2 minutes for certificates to appear..."
    waited=0
    while [ $waited -lt 120 ]; do
        if [ -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
            echo "✅ SSL certificate generated"
            break
        fi
        sleep 5
        waited=$((waited + 5))
        printf "."
    done
    echo ""

    if [ -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
        echo "🔁 Reloading nginx to pick up new certificates"
        # If nginx is running as a container, reload the container; otherwise, run docker-compose restart nginx
        $COMPOSE_CMD restart nginx 2>/dev/null || true
    else
        echo "⚠️  Certificate generation did not complete within timeout. You can run:" 
        echo "   $COMPOSE_CMD --profile init up certbot-init"
    fi
fi

echo ""
echo "🎉 Deployment completed!"
echo "📊 Management commands:"
echo "   Status:  $COMPOSE_CMD ps"
echo "   Logs:    $COMPOSE_CMD logs -f"
echo "   Stop:    $COMPOSE_CMD down"
echo "   Update:  $COMPOSE_CMD pull && $COMPOSE_CMD up -d"
echo ""
echo "🌍 Your application should be available at:"
echo "   HTTP:  http://${DOMAIN}"
if [ -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
echo "   HTTPS: https://${DOMAIN}"
fi
