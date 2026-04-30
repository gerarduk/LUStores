Production Deployment
=====================

This section covers production deployment strategies for LUStores, including SSL/HTTPS setup, monitoring, and best practices.

Overview
--------

Production deployment involves several key components:

- **SSL/HTTPS Configuration**: Secure transport with Let's Encrypt
- **Container Orchestration**: Docker Compose for multi-service deployment
- **Database Management**: PostgreSQL with backup and monitoring
- **Reverse Proxy**: Nginx for SSL termination and load balancing
- **Monitoring & Logging**: Comprehensive system monitoring

Quick Start
-----------

For a complete production deployment with SSL/HTTPS:

.. code-block:: bash

   # Clone and setup
   git clone https://github.com/st7ma784/LUStores.git
   cd LUStores

   # Configure SSL/HTTPS (see SSL/HTTPS guide for details)
   export DOMAIN="inventory.university.edu"
   export EMAIL="admin@university.edu" 
   make ssl-setup DOMAIN=$DOMAIN EMAIL=$EMAIL

   # Deploy production services
   make ssl-prod

   # Verify deployment
   curl -I https://$DOMAIN/health

SSL/HTTPS Setup
--------------

For comprehensive SSL/HTTPS configuration including:

- Let's Encrypt certificate management
- Nginx reverse proxy setup
- Security headers and rate limiting
- Certificate auto-renewal
- Troubleshooting and monitoring

**See the complete guide**: :doc:`ssl-https`

Container Deployment
-------------------

The system uses Docker Compose for orchestrating multiple services:

.. code-block:: yaml

   services:
     nginx:      # SSL termination, reverse proxy
     app:        # Node.js/Express application
     db:         # PostgreSQL database
     redis:      # Session storage and caching
     certbot:    # Let's Encrypt certificate management

Production services are configured in:
- ``docker-compose.yml`` - Base configuration
- ``docker-compose.prod.yml`` - Production overrides with SSL

Database Management
------------------

Production database considerations:

- **Persistent Volumes**: Data persistence across container restarts
- **Backup Strategy**: Automated backups with retention policies
- **Connection Pooling**: Optimized database connections
- **Monitoring**: Database performance and health checks

Environment Configuration
------------------------

Critical environment variables for production:

.. code-block:: bash

   # Core Application
   NODE_ENV=production
   DATABASE_URL=postgresql://user:pass@db:5432/university_inventory
   SESSION_SECRET=your-secure-session-secret

   # SSL/HTTPS
   HTTPS=true
   FORCE_HTTPS=true
   DOMAIN=inventory.university.edu

   # OAuth Integration
   ISSUER_URL=https://your-oauth-provider.edu/oidc
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret

Load Balancing
-------------

For high-availability deployments:

1. **Application Load Balancer**: Multiple app instances behind load balancer
2. **Database Clustering**: PostgreSQL primary/replica configuration
3. **Session Persistence**: Redis cluster for shared session storage
4. **Static Asset CDN**: Content delivery network for performance

Security Hardening
-----------------

Production security checklist:

- [ ] SSL/HTTPS enabled with strong ciphers
- [ ] Security headers configured (HSTS, CSP, etc.)
- [ ] Rate limiting active
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Regular security updates applied
- [ ] Database access restricted
- [ ] Secrets managed securely (not in environment files)

For detailed security configuration: :doc:`security`

Deployment Monitoring
---------------------

The System Management API provides comprehensive deployment status monitoring:

- **Health Checks**: Service availability and status
- **Performance Metrics**: Response times, throughput, errors
- **Certificate Monitoring**: SSL certificate expiration alerts
- **Database Monitoring**: Connection pool, query performance
- **Resource Usage**: CPU, memory, disk utilization

For monitoring setup: :doc:`monitoring`

Backup and Recovery
------------------

Production backup strategy:

**Database Backups**:
- Automated daily backups
- Point-in-time recovery capability
- Encrypted backup storage
- Regular restore testing

**Application Backups**:
- Configuration files
- SSL certificates
- Log files
- User uploads (if any)

**Recovery Procedures**:
- Documented rollback procedures
- Database restore processes
- Certificate recovery
- Service restart protocols

Testing Production Deployments
-----------------------------

Production deployment testing is covered in the comprehensive test suite:

- **End-to-End Tests**: Full user workflows
- **Integration Tests**: Service communication
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability scanning

See :doc:`../testing-guide` for complete testing procedures.

Maintenance and Updates
----------------------

Regular maintenance tasks:

**Security Updates**:
- Container base image updates
- Node.js security patches
- Database updates
- SSL certificate renewal (automated)

**Performance Optimization**:
- Database query optimization
- Cache tuning
- Resource scaling
- Log rotation

**Monitoring Review**:
- Performance metrics analysis
- Error rate monitoring
- Capacity planning
- Alert threshold tuning

Troubleshooting
--------------

Common production issues and solutions:

**Service Start Failures**:
- Check Docker container logs
- Verify environment variables
- Confirm database connectivity
- Check SSL certificate validity

**Performance Issues**:
- Monitor resource utilization
- Check database query performance
- Review nginx access logs
- Analyze application metrics

**SSL/HTTPS Problems**:
- Verify certificate validity
- Check nginx configuration
- Test Let's Encrypt renewal
- Review DNS configuration

For detailed troubleshooting: :doc:`../reference/troubleshooting`
