Future Development Roadmap
==========================

This roadmap outlines planned features and enhancements for the LUStores inventory management system. It provides visibility into upcoming development priorities and helps users understand the system's evolution.

.. note::
   **Timeline Disclaimer**: Timelines are estimates and subject to change based on resource availability, user feedback, and technical discoveries. Features are listed in priority order within each phase.

.. contents:: Table of Contents
   :local:
   :depth: 2

Vision and Priorities
---------------------

Strategic Goals
~~~~~~~~~~~~~~~

The LUStores roadmap focuses on three strategic pillars:

1. **User Empowerment**: Enable departments to manage their own inventories with minimal IT overhead
2. **Workflow Automation**: Reduce manual data entry and streamline procurement processes
3. **Data-Driven Insights**: Provide analytics to optimize inventory levels and reduce costs

Development Principles
~~~~~~~~~~~~~~~~~~~~~~

- **Backward Compatibility**: Existing data and workflows remain supported
- **Incremental Delivery**: Features rolled out in usable increments, not big-bang releases
- **User Feedback**: Regular user testing and feedback collection guides priorities
- **Security First**: All features undergo security review before deployment

Near-Term Features (3-6 Months)
--------------------------------

SSO Integration
~~~~~~~~~~~~~~~

**Status**: Planning

**Overview**:

Integrate with university single sign-on (SSO) systems for seamless authentication without separate passwords.

**Key Features**:

- **Shibboleth Integration**: Support for Shibboleth-based university SSO
- **SAML 2.0 Support**: Standard SAML authentication flow
- **OAuth2/OIDC**: Modern OAuth2 and OpenID Connect support
- **Automatic User Provisioning**: Create user accounts on first login
- **Attribute Mapping**: Map university roles to LUStores permissions
- **Fallback Authentication**: Keep local accounts for non-SSO users

**Benefits**:

- No separate password to remember
- Centralized access management
- Automatic deprovisioning when users leave
- Compliance with university security policies
- Reduced help desk burden

**Technical Approach**:

- passport-saml library for SAML integration
- Environment-specific SSO configuration
- Graceful fallback to local auth for development
- Session management remains PostgreSQL-based

**User Impact**:

- Users click "Login with University SSO" button
- Redirected to university login page
- Authenticated and returned to LUStores
- First-time users automatically provisioned with default role

**Timeline**: Q2 2025

User Self-Service Stores
~~~~~~~~~~~~~~~~~~~~~~~~~

**Status**: Design Phase

**Overview**:

Allow departments to manage their own isolated inventory stores without central IT involvement.

**Key Features**:

- **Multi-Tenant Architecture**: Complete data isolation between stores
- **Store Creation Wizard**: Guided setup for new departmental stores
- **Delegated Administration**: Department admins manage their own users
- **Cross-Store Transfers**: Transfer items between stores with audit trail
- **Consolidated Reporting**: University-wide analytics across all stores
- **Isolated Charge Codes**: Each store manages its own charge codes
- **Custom Branding**: Store-specific logos and naming

**Benefits**:

- Departments control their own inventory
- No central IT bottleneck for adding items
- Better visibility into departmental assets
- Scalable to 100+ departments
- Reduced training burden (each dept trains own users)

**Technical Approach**:

- ``store_id`` foreign key added to all major tables
- Row-level security policies for data isolation
- Separate database schemas per store (optional)
- Store context in user session
- API endpoints scoped to current store

**User Workflows**:

1. **Creating a Store**:
   - System admin approves store request
   - Store wizard guides setup (name, admin, charge codes)
   - Initial admin user created automatically
   - Store appears in global store directory

2. **Switching Stores** (for multi-store users):
   - Dropdown in top navigation bar
   - Select desired store
   - UI refreshes with store-specific data
   - Session maintains current store context

3. **Managing Store Users**:
   - Store admin adds/removes users
   - Assign charge codes specific to this store
   - Set store-level permissions

**Timeline**: Q3 2025

Medium-Term Features (6-12 Months)
-----------------------------------

Automated Invoice Generation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Status**: Requirements Gathering

**Overview**:

Automatically generate PDF invoices from purchase orders and sales transactions for accounting and record-keeping.

**Key Features**:

- **PDF Invoice Templates**: Professional, customizable templates
- **Automatic Generation**: Create invoices on order receipt or sale completion
- **Email Dispatch**: Send invoices directly to suppliers/customers
- **Invoice Numbering**: Sequential invoice numbers with prefixes
- **Multi-Currency Support**: Handle international suppliers
- **VAT Calculation**: Automatic VAT computation and display
- **Attachment to Records**: PDFs stored with orders/sales
- **Batch Export**: Export multiple invoices as ZIP archive

**Benefits**:

- Eliminate manual invoice creation
- Professional, consistent documentation
- Faster supplier payments (quicker invoice turnaround)
- Improved audit trail
- Reduced paperwork errors

**Technical Approach**:

- puppeteer or pdfkit for PDF generation
- Jinja2-style templates for customization
- S3-compatible storage for PDF files
- Email integration via SendGrid or university mail server
- Background jobs for batch generation

**Invoice Templates**:

- Purchase Order Invoice (to suppliers)
- Sales Invoice (to customers/departments)
- Credit Note (for returns)
- Packing Slip (for order fulfillment)

**Timeline**: Q3 2025

Order Scanning and Barcode Support
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Status**: Research Phase

**Overview**:

Use barcodes and QR codes for faster order receiving, stock taking, and item location.

**Key Features**:

- **Barcode Generation**: Generate barcodes for all inventory items
- **QR Code Support**: QR codes with embedded item URLs
- **Mobile Scanning**: Web-based camera scanning (no app required)
- **Batch Receiving**: Scan multiple items during order receipt
- **Stock Counting**: Barcode-assisted physical inventory counts
- **Location Labeling**: QR codes on shelves link to stored items
- **Supplier Barcode Mapping**: Map supplier barcodes to internal SKUs

**Benefits**:

- Faster order receiving (scan instead of type)
- Reduced data entry errors
- Improved stock count accuracy
- Mobile-friendly workflows
- Better location tracking

**Technical Approach**:

- ZXing barcode library (JavaScript)
- HTML5 camera API for scanning
- PWA (Progressive Web App) for offline scanning
- Barcode formats: EAN-13, UPC-A, Code 128, QR Code
- Print-friendly barcode sheets (Avery label templates)

**User Workflows**:

1. **Receiving an Order**:
   - Open order on mobile device
   - Scan each item's barcode
   - System marks item as received
   - Stock automatically updated

2. **Finding an Item**:
   - Scan item barcode or SKU
   - System shows location and current stock
   - Navigate to physical location

3. **Stock Count**:
   - Start stock count session
   - Scan items in location
   - System compares with expected quantities
   - Generate discrepancy report

**Timeline**: Q4 2025

Long-Term Features (12+ Months)
--------------------------------

Demand Forecasting and Pattern Prediction
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Status**: Concept Exploration

**Overview**:

Machine learning-powered demand forecasting to predict future inventory needs and optimize stock levels.

**Key Features**:

- **Seasonal Trend Analysis**: Detect seasonal patterns (e.g., academic calendar)
- **Auto-Reorder Suggestions**: Predict when to reorder based on consumption
- **Budget Forecasting**: Estimate future spend by category
- **Anomaly Detection**: Alert on unusual consumption patterns
- **Lead Time Optimization**: Factor in supplier lead times
- **What-If Scenarios**: Model impact of policy changes
- **Customizable Thresholds**: Set minimum/maximum stock levels per item

**Benefits**:

- Prevent stockouts of critical items
- Reduce excess inventory and waste
- Lower carrying costs
- Proactive budget planning
- Data-driven purchasing decisions
- Identify slow-moving items for discontinuation

**Technical Approach**:

- Time-series forecasting (Prophet or ARIMA models)
- Python scikit-learn for ML pipelines
- Historical data: 2+ years for accurate predictions
- Weekly batch jobs for model training
- Dashboard visualizations with Recharts/D3.js
- Configurable sensitivity thresholds

**Prediction Models**:

1. **Consumption Forecast**: Predict next 3 months usage by item
2. **Stock-Out Risk**: Probability of running out before reorder
3. **Budget Projection**: Estimated spend by department/category
4. **Seasonal Index**: Seasonal multipliers for each item

**Data Requirements**:

- Minimum 12 months of historical data
- At least 10 transactions per item
- External factors: academic calendar, special events

**User Interface**:

- Forecasting Dashboard page
- Visual graphs: historical vs predicted consumption
- Reorder recommendations with confidence scores
- Export forecasts to Excel/CSV
- Alert system for high stock-out risk items

**Privacy Considerations**:

- Aggregate data only (no individual user patterns)
- Department-level analysis (not user-level)
- Opt-out for sensitive categories

**Timeline**: 2026

Additional Features Under Consideration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

These features are being evaluated but not yet scheduled:

**Advanced Reporting**:

- Custom report builder (drag-and-drop interface)
- Scheduled email reports
- Power BI / Tableau integration
- Real-time dashboards with WebSocket updates

**Mobile App**:

- Native iOS/Android app (React Native)
- Offline mode for stock counts
- Push notifications for low stock alerts
- Camera scanning optimized for mobile

**Supplier Portal**:

- Self-service portal for suppliers
- View purchase order status
- Upload invoices directly
- Update product catalogs

**Asset Management**:

- Track high-value assets with serial numbers
- Loan/checkout system for equipment
- Maintenance scheduling
- Asset depreciation tracking

**Integration APIs**:

- REST API for third-party integrations
- Webhooks for event notifications
- ERP system connectors (SAP, Oracle)
- Accounting software export (QuickBooks, Xero)

Contributing to the Roadmap
----------------------------

How to Request Features
~~~~~~~~~~~~~~~~~~~~~~~~

We welcome feature requests from users! Here's how to contribute:

**1. Check Existing Requests**:

- Review this roadmap to see if your feature is already planned
- Check GitHub Issues for similar requests

**2. Submit a Feature Request**:

- Email: inventory-support@university.edu
- GitHub Issues: `LUStores Feature Requests <https://github.com/st7ma784/LUStores/issues>`_
- In-app feedback: Settings > Feedback

**3. Provide Details**:

- **Problem**: What problem does this solve?
- **Use Case**: How would you use this feature?
- **Frequency**: How often would you use it?
- **Workaround**: How do you currently handle this?
- **Priority**: How important is this to your workflow?

Beta Testing Program
~~~~~~~~~~~~~~~~~~~~

Want early access to new features? Join our beta testing program:

**Benefits**:

- Test new features before general release
- Influence feature design with feedback
- Direct communication with development team
- Recognition in release notes

**Commitment**:

- Test features within 1 week of release
- Provide structured feedback via surveys
- Report bugs and usability issues
- 2-3 hours per month testing time

**Sign Up**: Email inventory-support@university.edu with subject "Beta Tester"

Roadmap Updates
~~~~~~~~~~~~~~~

This roadmap is updated quarterly (January, April, July, October) based on:

- Development progress
- User feedback and feature requests
- Technical discoveries
- Resource availability
- Strategic university priorities

**Last Updated**: January 2025

**Next Review**: April 2025

Completed Features (Reference)
-------------------------------

Recently Delivered (2024-2025)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Three-Tier Permission System** (Completed: December 2024)

- Role-based access: User, Manager, System Admin
- Charge code assignments for fine-grained access
- 45 granular permissions for advanced control

**Location and Unit Tracking** (Completed: December 2024)

- Physical location field for warehouse management
- Measurement unit field (pieces, kg, meters, etc.)
- Location shown in picking lists and sale printouts

**Draft Quote System** (Completed: December 2024)

- Session-based draft quotes (4-hour expiration)
- Saved persistent quotes with names
- Quote → Sale conversion workflow

**Charge Code Validation** (Completed: January 2025)

- 6-rule validation system
- Validity date checking
- On-hold status support
- Category restrictions
- User authorization

**Payment Reconciliation** (Completed: January 2025)

- Separate "completed" and "paid" sale states
- Mark sales as paid for accounting
- Charge code financial reports

**Comprehensive Documentation** (Completed: January 2025)

- User tutorials for all workflows
- Developer guides (database, deployment, code structure)
- FAQ and troubleshooting guides
- System recovery procedures
- Public roadmap (this document)

Release History
~~~~~~~~~~~~~~~

**v2.0** (January 2025): Permission system and charge code validation

**v1.8** (December 2024): Location/unit tracking and draft quotes

**v1.5** (October 2024): Invoice PDF uploads and supplier management

**v1.2** (August 2024): Purchase order system

**v1.0** (June 2024): Initial release with inventory and sales

Contact and Support
-------------------

Questions about the roadmap? Get in touch:

- **Email**: inventory-support@university.edu
- **Documentation**: https://st7ma784.github.io/LUStores/
- **GitHub**: https://github.com/st7ma784/LUStores
- **Feature Requests**: Submit via GitHub Issues or email

We're committed to building a world-class inventory management system for higher education. Your feedback shapes our roadmap!
