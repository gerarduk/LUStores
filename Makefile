# LUStores SSL/HTTPS Management Makefile

.PHONY: help ssl-setup ssl-dev ssl-prod ssl-renew ssl-test ssl-clean logs

# Default target
help:
	@echo "🔒 LUStores SSL Management"
	@echo "========================="
	@echo ""
	@echo "Available commands:"
	@echo "  ssl-setup DOMAIN=<domain> EMAIL=<email>  - Setup SSL for domain"
	@echo "  ssl-dev                                   - Setup SSL for local development"
	@echo "  ssl-init                                  - Initialize SSL certificates for production"
	@echo "  ssl-prod                                  - Start production with SSL"
	@echo "  deploy-prod                               - Full production deployment"
	@echo "  ssl-renew                                 - Manually renew certificates"
	@echo "  ssl-test                                  - Test SSL configuration"
	@echo "  ssl-clean                                 - Clean SSL certificates"
	@echo "  logs                                      - Show nginx and certbot logs"
	@echo ""
	@echo "Examples:"
	@echo "  cp .env.prod.example .env.prod  # Copy and customize environment"
	@echo "  make deploy-prod                # Full production deployment"
	@echo "  make ssl-setup DOMAIN=lustores.example.com EMAIL=admin@example.com"
	@echo "  make ssl-dev"

# Setup SSL for a specific domain
ssl-setup:
	@if [ -z "$(DOMAIN)" ]; then \
		echo "❌ Error: DOMAIN is required"; \
		echo "Usage: make ssl-setup DOMAIN=yourdomain.com EMAIL=admin@yourdomain.com"; \
		exit 1; \
	fi
	@./scripts/setup-ssl.sh $(DOMAIN) $(EMAIL)

# Setup SSL for local development
ssl-dev:
	@echo "🏠 Setting up SSL for local development..."
	@./scripts/setup-ssl.sh localhost.dev
	@echo "🚀 Starting services with SSL..."
	@docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
	@echo "✅ Local HTTPS available at: https://localhost.dev"

# Start production services with SSL
ssl-prod:
	@echo "🚀 Starting production services with SSL..."
	@if [ ! -f ".env.prod" ]; then \
		echo "❌ Error: .env.prod not found. Copy .env.prod.example and customize it"; \
		exit 1; \
	fi
	@echo "📋 Loading production environment..."
	@set -a && source .env.prod && set +a && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production HTTPS services started"

# Initialize SSL certificates for production
ssl-init:
	@echo "🔐 Initializing SSL certificates..."
	@if [ ! -f ".env.prod" ]; then \
		echo "❌ Error: .env.prod not found. Copy .env.prod.example and customize it"; \
		exit 1; \
	fi
	@echo "📋 Starting nginx for certificate validation..."
	@set -a && source .env.prod && set +a && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
	@sleep 10
	@echo "🔐 Obtaining initial certificates..."
	@set -a && source .env.prod && set +a && docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile init run --rm certbot-init
	@echo "✅ SSL certificates initialized"

# Full production deployment
deploy-prod:
	@echo "🚀 Full production deployment..."
	@if [ ! -f ".env.prod" ]; then \
		echo "❌ Error: .env.prod not found. Copy .env.prod.example and customize it"; \
		exit 1; \
	fi
	@make ssl-init
	@make ssl-prod
	@echo "🎉 Production deployment complete!"

# Manually renew certificates
ssl-renew:
	@echo "🔄 Renewing SSL certificates..."
	@docker-compose exec certbot certbot renew
	@docker-compose reload nginx
	@echo "✅ Certificates renewed and nginx reloaded"

# Test SSL configuration
ssl-test:
	@echo "🧪 Testing SSL configuration..."
	@docker-compose exec nginx nginx -t
	@if [ -f ".env.ssl" ]; then \
		source .env.ssl && echo "Testing HTTPS connection to $$DOMAIN..." && \
		curl -I https://$$DOMAIN/health || echo "❌ HTTPS test failed"; \
	else \
		echo "⚠️  .env.ssl not found - testing local config"; \
		curl -I https://localhost.dev/health || echo "❌ Local HTTPS test failed"; \
	fi

# Clean SSL certificates and config
ssl-clean:
	@echo "🧹 Cleaning SSL certificates..."
	@read -p "Are you sure you want to delete all SSL certificates? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf certbot/conf/*; \
		rm -rf certbot/www/*; \
		rm -f .env.ssl; \
		echo "✅ SSL certificates cleaned"; \
	else \
		echo "❌ Aborted"; \
	fi

# Show logs
logs:
	@echo "📋 Recent nginx access logs:"
	@docker-compose logs nginx | tail -20
	@echo ""
	@echo "📋 Recent nginx error logs:"
	@docker-compose exec nginx cat /var/log/nginx/error.log | tail -10 2>/dev/null || echo "No error logs found"
	@echo ""
	@echo "📋 Recent certbot logs:"
	@docker-compose logs certbot | tail -10

# Development shortcuts
dev-up:
	@docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d

prod-up:
	@source .env.ssl 2>/dev/null && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health checks
health:
	@echo "🏥 Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Testing HTTP health endpoint..."
	@curl -I http://localhost/health 2>/dev/null || echo "❌ HTTP health check failed"
	@echo ""
	@echo "Testing HTTPS health endpoint..."
	@curl -I https://localhost.dev/health 2>/dev/null || echo "❌ HTTPS health check failed"
