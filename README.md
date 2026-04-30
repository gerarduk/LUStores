# LUStores

[![Comprehensive CI/CD Pipeline](https://github.com/st7ma784/LUStores/actions/workflows/main.yml/badge.svg)](https://github.com/st7ma784/LUStores/actions/workflows/main.yml)

University Inventory Management System with authentication, real-time updates, and production-ready deployment.

## 🚀 Quick Production Deployment

Deploy to production in 3 simple steps:

### 1. Configure Environment
```bash
# Copy template and edit with your settings
cp .env.prod.template .env.prod
nano .env.prod  # Set your DOMAIN, EMAIL, and passwords
```

### 2. Deploy with One Command
```bash
# Linux/Mac
chmod +x deploy-simple.sh
./deploy-simple.sh

# Windows PowerShell
.\deploy-simple.ps1
```

### 3. Access Your Application
- HTTP: `http://your-domain.com`
- HTTPS: `https://your-domain.com` (auto-generated SSL)

**SSL Certificate Support:**
- 🌐 **Public domains**: Automatic Let's Encrypt certificates (trusted by all browsers)
- 🏢 **Internal domains**: Automatic self-signed certificates (perfect for VPN/intranet)

**That's it!** The deployment includes:
- ✅ Smart SSL certificates (Let's Encrypt or self-signed)
- ✅ Automatic container updates
- ✅ Database with backups
- ✅ Reverse proxy (nginx)
- ✅ Health monitoring
- ✅ CI/CD integration

## 📚 Documentation

**📖 [Full Documentation](https://st7ma784.github.io/LUStores/)** - Comprehensive guides hosted on GitHub Pages

### Quick Start Guides
| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/quickstart.rst) | Quick start guide for new users |
| [Installation](./docs/installation.rst) | System installation and setup |
| [Configuration](./docs/configuration.rst) | System configuration guide |

### User Tutorials
| Tutorial | Description |
|----------|-------------|
| [Placing Orders](./docs/tutorials/placing-orders.rst) | Complete procurement workflow guide |
| [Taking Sales](./docs/tutorials/taking-sales.rst) | Sales and charge code validation |
| [Managing Inventory](./docs/tutorials/managing-inventory.rst) | Inventory management with location/unit tracking |
| [Sales & Quotes](./docs/user-guide/sales-quotes.rst) | Advanced sales and quotes features |
| **[Settings Guide](./docs/user-guide/settings-guide.rst)** | **Comprehensive guide to all 9 settings tabs** |
| **[Bulk Label Printing](./docs/user-guide/bulk-label-printing.rst)** | **Generate and print QR code labels for multiple items** |
| **[Reports & Analytics](./docs/user-guide/reports-analytics.rst)** | **Sales reports, payment tracking, and analytics dashboards** |
| **[Notes System](./docs/user-guide/notes-system.rst)** | **Add contextual notes to items, sales, orders, and more** |
| **[Vendor Management](./docs/user-guide/vendor-management.rst)** | **Manage suppliers and track vendor relationships** |

### Developer Documentation
| Guide | Description |
|-------|-------------|
| [Code Structure](./docs/developer/code-structure.rst) | Architecture and recent features (2025) |
| [Database Organization](./docs/development/database-organization.rst) | Schema, migrations, and database architecture |
| [Deployment Architecture](./docs/development/deployment-architecture.rst) | Docker, GitHub Actions, SSL, Watchtower |
| [Testing Guide](./docs/development/testing.rst) | Testing strategies and frameworks |

### Operations & Support
| Guide | Description |
|-------|-------------|
| [FAQ](./docs/reference/faq.rst) | Frequently asked questions (30+ Q&A) |
| [Troubleshooting](./docs/reference/troubleshooting.rst) | Common issues and solutions |
| [System Recovery](./docs/operations/system-recovery.rst) | Emergency procedures and restart guide |
| [Backup & Restore](./docs/operations/backup-restore.rst) | Database backup procedures |

### Future Development
| Document | Description |
|----------|-------------|
| [Roadmap](./docs/roadmap.rst) | Future features (SSO, multi-tenant, ML forecasting) |

### Recent Updates (January 2025)
- 🏷️ **Bulk QR code label printing** with category, location, and status filters
- 📝 **Notes system** for contextual annotations on items, sales, orders, and charge codes
- 📊 **Reports & Analytics** with payment reconciliation and visual dashboards
- 🎨 **Dark mode** and theme customization (light/dark/system)
- 🔔 **Deployment notifications** and low stock alerts
- ⚙️ **Comprehensive Settings guide** covering all 9 settings tabs
- ✅ Three-tier permission system (User/Manager/System Admin)
- ✅ Location and unit tracking for physical inventory
- ✅ Draft/saved/completed sales lifecycle
- ✅ Charge code validation with 6-rule enforcement
- ✅ Payment reconciliation (completed vs paid sales)
- ✅ Interactive database ERD viewer
- ✅ **Massive documentation update** (20+ new guides, API docs, 26,000+ words)

**Build Documentation Locally:**
```bash
cd docs
make html          # Build HTML docs
open _build/html/index.html  # View in browser
```

**View Online:** https://st7ma784.github.io/LUStores/

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose

### Local Development
```bash
# Install dependencies
npm install

# Setup database
docker-compose up -d db

# Run development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:e2e-local
npm run test:playwright
```

## 🏗️ Architecture

**Frontend:**
- Vite + TypeScript
- Modern responsive UI
- Real-time updates

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL database
- JWT authentication

**Production:**
- Docker containerized
- Nginx reverse proxy with smart SSL
- Auto-scaling ready
- Internal domain support

## 🔧 Management Commands

```bash
# Check status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Update application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Backup database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec db pg_dump -U postgres university_inventory > backup.sql
```

## 🚦 Features

### Inventory Management
- ✅ Product catalog with categories, SKUs, and barcodes
- ✅ **Location tracking** (Room, Shelf, Bin) for warehouse operations
- ✅ **Unit support** (pieces, kg, meters, liters, etc.)
- ✅ Stock tracking with audit trails
- ✅ Automated low-stock alerts
- ✅ Supplier management with notes
- ✅ Purchase order system with invoice uploads
- 🏷️ **Bulk QR code label printing** (filter by category, location, status)
- 📱 **Mobile camera barcode scanning** for quick item lookup

### Sales & Procurement
- ✅ **Three-tier quote system** (draft/saved/completed)
- ✅ **Charge code validation** (6-rule enforcement)
- ✅ **Payment reconciliation** (mark as paid/unpaid, bulk operations)
- 📊 **Reports & Analytics** (sales trends, charge code usage, category breakdowns)
- 💰 **Mark sales as paid** (individual and bulk workflows)
- 📈 **Visual dashboards** (revenue trends, top sellers, category performance)
- ✅ Sales reporting with charge code breakdowns
- ✅ Invoice generation and PDF export
- ✅ Real-time stock availability checking
- 📝 **Notes system** (add contextual notes to sales, orders, items)

### Authentication & Permissions
- ✅ JWT-based authentication
- ✅ **Three-tier role system** (User/Manager/System Admin)
- ✅ **Fine-grained permissions** (45+ permissions)
- ✅ **Charge code assignments** for budget control
- ✅ Secure password hashing (bcrypt)
- ✅ Session management with Redis
- ✅ HTTPS enforcement

### User Experience
- 🎨 **Dark mode** and light mode (system preference support)
- 📱 **Responsive design** (mobile, tablet, desktop)
- 🔔 **Notifications system** (low stock, deployment alerts)
- ⚙️ **Comprehensive settings** (9 tabs: Appearance, General, VAT, Security, Permissions, Notifications, Schema, Migration, Label Printing)
- 📝 **In-app documentation** with API reference
- 🔍 **Advanced filtering** (quick filters, column customization)
- 📊 **Interactive dashboards** and charts
- 🏷️ **Visual note indicators** showing note counts

### Production Ready
- ✅ Docker containerization (multi-stage builds)
- ✅ SSL certificates (Let's Encrypt + self-signed)
- ✅ **Automatic updates (Watchtower)** - 15-minute intervals
- ✅ Kubernetes support (kube.yml)
- ✅ Health monitoring and auto-restart
- ✅ Database backups with retention
- ✅ **CI/CD pipeline** (GitHub Actions)
- ✅ Nginx reverse proxy with rate limiting

## 🔒 Security

- SSL/TLS encryption with auto-renewal
- JWT tokens with secure expiration
- Password hashing with bcrypt
- Rate limiting and CORS protection
- Security headers and CSP
- Database connection pooling
- Environment-based configuration

## 📊 Monitoring

- Health check endpoints
- Service status monitoring
- Automatic container restarts
- Log aggregation
- Performance metrics
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

**Quick Help:**
- 📖 [FAQ](./docs/reference/faq.rst) - 30+ common questions answered
- 🔧 [Troubleshooting Guide](./docs/reference/troubleshooting.rst) - Common issues and solutions
- 🚨 [System Recovery](./docs/operations/system-recovery.rst) - Emergency procedures
- 📊 [Full Documentation](https://st7ma784.github.io/LUStores/) - Comprehensive guides

**Common Issues:**
- **SSL certificate problems**: See [Deployment Architecture](./docs/development/deployment-architecture.rst#ssl-https-configuration)
- **Database connection**: See [System Recovery](./docs/operations/system-recovery.rst#database-running-out-of-connections)
- **Permission errors**: See [FAQ - Admin Questions](./docs/reference/faq.rst#admin-questions)
- **Charge code validation**: See [Taking Sales Tutorial](./docs/tutorials/taking-sales.rst#understanding-charge-codes)

**Get Logs:**
```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific time range (last hour)
docker-compose -f docker-compose.prod.yml logs --since 1h
```

For detailed troubleshooting and emergency procedures, see the [System Recovery Guide](./docs/operations/system-recovery.rst).
