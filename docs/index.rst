University Inventory Management System Documentation (Gerards Version)
====================================================

Welcome to the comprehensive documentation for the University Inventory Management System - a modern, secure, and scalable solution for managing university assets, equipment, and supplies.

.. image:: https://img.shields.io/badge/Version-1.0.0-blue.svg
   :alt: Version 1.0.0

.. image:: https://img.shields.io/badge/Node.js-20+-green.svg
   :alt: Node.js 20+

.. image:: https://img.shields.io/badge/React-18+-blue.svg
   :alt: React 18+

.. image:: https://img.shields.io/badge/PostgreSQL-15+-blue.svg
   :alt: PostgreSQL 15+

Overview
--------

The University Inventory Management System is a full-stack web application designed specifically for educational institutions to efficiently track, manage, and report on their inventory assets. Built with modern technologies and security best practices, it provides a robust foundation for institutional asset management.

Key Features
~~~~~~~~~~~~

🔐 **Secure Authentication & Permissions**
   - OAuth integration with university systems
   - Three-tier role-based access control (User, Manager, System Admin)
   - Fine-grained permission system (45 permissions)
   - Charge code authorization and assignment
   - Session management with automatic token refresh

📦 **Comprehensive Inventory Management**
   - Item tracking with categories, SKUs, **location, and units**
   - Real-time stock level monitoring
   - Automated low-stock alerts
   - Physical location tracking for warehouse operations
   - Measurement unit support (pieces, kg, meters, liters, etc.)
   - **Bulk QR code label printing** with filters
   - **Mobile camera barcode scanning** for quick lookup
   - **Notes system** for contextual annotations
   - Bulk import/export capabilities

💰 **Advanced Sales & Procurement**
   - **Three-tier quote system** (draft/saved/completed)
   - **Charge code validation** with 6-rule enforcement
   - **Payment reconciliation** (completed vs paid sales)
   - Purchase order management with supplier tracking
   - Invoice PDF uploads and automated parsing
   - Stock movement audit trails

📊 **Advanced Reporting & Analytics**
   - **Reports & Analytics page** with visual dashboards
   - Real-time dashboard with key metrics
   - **Mark sales as paid/unpaid** (individual and bulk operations)
   - **Revenue trend charts** and category breakdowns
   - Category-based analytics with top sellers
   - Stock movement history and full audit trails
   - Charge code financial reports
   - Payment reconciliation tracking
   - Customizable reports and Excel export

🤖 **MCP-Ready API Architecture**
   - RESTful API endpoints for chatbot integration
   - Structured JSON responses
   - Comprehensive error handling
   - API documentation with examples

🎨 **Modern User Interface**
   - Responsive design for all devices
   - **Dark mode and light mode** (system preference support)
   - **Comprehensive settings** (9 tabs for full configuration)
   - **Notification system** (low stock, deployment alerts)
   - University branding and theming
   - Accessible and intuitive navigation
   - Interactive database ERD viewer
   - Advanced filtering and column customization

🐳 **Production-Ready Deployment**
   - Docker containerization with multi-stage builds
   - SSL/HTTPS with Let's Encrypt certificates
   - Nginx reverse proxy with security headers
   - Automated container updates with Watchtower
   - Database migrations and health checks
   - Scalable architecture with Kubernetes support
   - Comprehensive monitoring and alerting

Quick Navigation
~~~~~~~~~~~~~~~~

.. toctree::
   :maxdepth: 2
   :caption: Getting Started

   installation
   quickstart
   configuration

.. toctree::
   :maxdepth: 2
   :caption: Tutorials

   tutorials/getting-started
   tutorials/placing-orders
   tutorials/taking-sales
   tutorials/managing-inventory

.. toctree::
   :maxdepth: 2
   :caption: Explanations

   explanations/concepts

.. toctree::
   :maxdepth: 2
   :caption: User Guide

   user-guide/dashboard
   user-guide/inventory
   user-guide/sales-quotes
   user-guide/notification-badges
   user-guide/orders-management
   user-guide/settings-guide
   user-guide/bulk-label-printing
   user-guide/reports-analytics
   user-guide/notes-system
   user-guide/vendor-management

.. toctree::
   :maxdepth: 2
   :caption: API Documentation

   api/overview
   api/authentication
   api/endpoints
   api/sales-quotes
   api/mcp-integration

.. toctree::
   :maxdepth: 2
   :caption: Administration

   admin/authentication-setup
   admin/user-management
   admin/roles-permissions
   admin/system-configuration
   admin/system-management
   admin/backup-restore
   admin/development-setup
   admin/first-admin-setup
   admin/quick-reference

.. toctree::
   :maxdepth: 2
   :caption: Architecture

   architecture/index

.. toctree::
   :maxdepth: 2
   :caption: Development

   development/architecture
   development/database-organization
   development/deployment-architecture
   development/testing
   development/performance-testing
   development/migration-and-testing
   development/file-reference
   developer/code-structure

.. toctree::
   :maxdepth: 2
   :caption: Testing & QA

   testing-guide
   testing-quick-reference
   testing-commands-cheat-sheet
   testing-workflow-diagram
   testing-implementation-summary
   development/migration-and-testing
   ci-cd-pipeline
   ci-cd-status

.. toctree::
   :maxdepth: 2
   :caption: Operations

   operations/qrh
   operations/system-recovery
   operations/docker-architecture
   operations/backup-restore
   operations/dockerhub-migration

.. toctree::
   :maxdepth: 2
   :caption: Deployment

   deployment/docker
   deployment/production
   deployment/ssl-https
   deployment/university-sso
   deployment/monitoring
   deployment/security
   deployment/legacy-migration
   deployment/migration-script-guide
   deployment/migration-tools
   deployment/migrating-to-physics-stores

.. toctree::
   :maxdepth: 1
   :caption: Reference

   reference/database-schema
   reference/faq
   reference/troubleshooting
   reference/changelog
   reference/contributing

.. toctree::
   :maxdepth: 1
   :caption: Future Development

   roadmap

.. toctree::
   :maxdepth: 1
   :caption: API Documentation

   TypeScript API Reference <https://st7ma784.github.io/LUStores/api/index.html>

System Requirements
-------------------

**Minimum Requirements:**
- Node.js 20.0.0 or higher
- PostgreSQL 15.0 or higher
- 2GB RAM
- 10GB storage space
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)

**Recommended for Production:**
- 4GB RAM or higher
- 50GB storage space
- Load balancer for high availability
- SSL certificate for HTTPS

Getting Help
------------

If you need assistance or have questions about the University Inventory Management System:

📧 **Email Support**
   Contact our support team at inventory-support@university.edu

📚 **Documentation**
   This comprehensive documentation covers all aspects of the system

🐛 **Bug Reports**
   Report issues through our internal ticketing system

📝 **Feature Requests**
   Submit enhancement requests to help improve the system

🔧 **Technical Support**
   Contact the IT department for technical assistance

License
-------

This software is proprietary to the University and is intended for internal use only. All rights reserved.

© 2025 University IT Department. All rights reserved.

Indices and Tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
