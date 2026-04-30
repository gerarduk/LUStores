Quick Start Guide
=================

This guide will help you get started with the University Inventory Management System in just a few minutes.

Overview
--------

The University Inventory Management System provides a complete solution for tracking and managing institutional assets. This quick start guide covers the essential steps to begin using the system effectively.

First Login
-----------

**Step 1: Access the System**

Navigate to the application URL in your web browser:
- Development: http://localhost:5000
- Production: https://yourdomain.com

.. note::
   For production deployments with SSL/HTTPS, see :doc:`deployment/ssl-https` for complete setup instructions.

**Step 2: Authentication**

1. Click the "Sign In to Continue" button on the landing page
2. You'll be redirected to the university authentication system
3. Enter your university credentials
4. Grant permission for the inventory system to access your profile
5. You'll be redirected back to the dashboard

**Step 3: Initial Setup**

Upon first login, the system will:
- Create your user profile automatically
- Assign you the default "user" role
- Initialize default categories if none exist

Dashboard Overview
------------------

The dashboard provides an at-a-glance view of your inventory system:

**Key Metrics Cards**
- **Total Items**: Current number of items in inventory
- **Low Stock Items**: Items requiring attention
- **Total Value**: Combined value of all inventory
- **Active Users**: Number of system users

**Recent Activity Table**
- Displays the most recently updated inventory items
- Shows item details, category, stock levels, and status

**Quick Actions Panel**
- Add new items to inventory
- Import data from spreadsheets
- Export reports
- Generate analytics

Basic Operations
----------------

Adding Your First Item
~~~~~~~~~~~~~~~~~~~~~~

1. **Navigate to Inventory**
   - Click "Inventory" in the sidebar menu

2. **Add New Item**
   - Click the "Add Item" button
   - Fill in the required information:
     - Item name (e.g., "Dell Laptop XPS 13")
     - SKU (e.g., "DELL-XPS13-001")
     - Category (select from dropdown)
     - Price (e.g., "1299.99")
     - Current stock (e.g., "15" or "15.5" for fractional quantities)
     - Minimum stock (e.g., "5")
     - Description (optional)

3. **Save the Item**
   - Click "Add Item" to save
   - The item will appear in your inventory list

.. note::
   The system now supports decimal quantities (e.g., 0.5, 1.25) for items measured
   in meters, liters, kilograms, or other continuous units.

Processing Your First Sale
~~~~~~~~~~~~~~~~~~~~~~~~~~

The sales system uses a draft-first workflow for safety and validation:

**Step 1: Build Your Quote**

1. Navigate to "Sales" from the sidebar
2. Search for items using the search bar at the top
3. For each item:
   
   - Enter the desired quantity (supports decimals like 0.5)
   - Click "Add to Quote"
   - The item appears in your quote section on the right

4. Enter a valid charge code (e.g., "PHYSICS-LAB")
   
   - The system validates charge codes in real-time
   - ✓ Valid codes show with expiration date
   - ✗ Invalid codes show error messages with alternatives

**Step 2: Review and Process**

1. Review your quote items and total amount
2. Add optional customer notes if needed
3. Click "Process Quote"
4. The system will:
   
   - Validate the charge code (not expired, category restrictions)
   - Check stock availability for all items
   - Create a permanent sale record
   - Reduce stock levels atomically
   - Clear the draft quote automatically

.. warning::
   **Common Error Messages:**
   
   * "Invalid charge code: 'DEPT999' does not exist" - The code you entered isn't in the system
   * "Charge code 'OLD-LAB' has expired" - Code is past its valid date
   * "Insufficient stock for item 'Laptop'" - Not enough units available

**Step 3: Mark as Paid (Optional)**

After processing, you can mark sales as paid:

1. Go to "Reports" tab
2. Find the sale in the list
3. Click "Mark as Paid" button
4. Status updates from "Unpaid" to "Paid"

.. tip::
   Draft quotes are automatically saved as you add items. If you need to start over,
   click the "Clear Quote" button to remove all items and reset.

Managing Categories
~~~~~~~~~~~~~~~~~~~

Categories help organize your inventory:

**Default Categories:**
- IT Equipment (computers, laptops, tech devices)
- Office Supplies (pens, paper, general materials)
- Textbooks (educational books and materials)
- Laboratory (scientific equipment and supplies)
- Furniture (desks, chairs, office furniture)

**Adding Custom Categories:**
(Requires Manager or Admin role)

1. Contact your system administrator to add new categories
2. Categories include name, description, icon, and color coding

Stock Management
~~~~~~~~~~~~~~~~

**Updating Stock Levels:**

1. Find the item in the inventory list
2. Click the edit button (pencil icon)
3. Update the current stock value
4. Save changes

**Stock Movements:**
All stock changes are automatically tracked with:
- Timestamp of change
- User who made the change
- Previous and new stock levels
- Reason for adjustment

User Roles and Permissions
--------------------------

Understanding Your Role
~~~~~~~~~~~~~~~~~~~~~~~

**User Role (Default)**
- View inventory items and details
- Search and filter inventory
- Access basic reports and dashboards
- Read-only access to system data

**Manager Role**
- All User permissions, plus:
- Add, edit, and delete inventory items
- Manage categories and stock levels
- Access advanced reports
- Import/export data

**Admin Role**
- All Manager permissions, plus:
- User management and role assignment
- System configuration
- Access to all administrative functions
- API access for integrations

Requesting Role Changes
~~~~~~~~~~~~~~~~~~~~~~~

To request elevated permissions:

1. Contact your system administrator
2. Explain your role requirements
3. Administrator can update your role in the User Management section

Common Tasks
------------

Searching for Items
~~~~~~~~~~~~~~~~~~~

**Quick Search:**
1. Use the search bar at the top of the inventory page
2. Enter item name, SKU, or description keywords
3. Results filter automatically as you type

**Advanced Filtering:**
1. Use the category dropdown to filter by category
2. Combine search terms with category filters
3. Use the pagination controls for large result sets

Viewing Reports
~~~~~~~~~~~~~~~

**Dashboard Reports:**
- Real-time statistics on the main dashboard
- Category breakdown with item counts and values
- Low stock alerts and recent activity

**Detailed Reports:**
1. Navigate to the "Reports" section
2. View comprehensive analytics:
   - Inventory summary with total values
   - Category-wise breakdown
   - Stock movement history
   - Low stock alerts

**Exporting Data:**
- Click "Export Inventory" for item data
- Click "Export Movements" for stock history
- Data exports in CSV format for Excel compatibility

Getting Help
------------

Built-in Documentation
~~~~~~~~~~~~~~~~~~~~~~

**In-System Help:**
- Visit the "Documentation" tab for comprehensive guides
- Access API documentation at /api/docs
- Review user roles and permissions information

**Quick Reference:**
- Hover over interface elements for tooltips
- Check the breadcrumb navigation for current location
- Use the sidebar for quick navigation between sections

Support Resources
~~~~~~~~~~~~~~~~~

**Technical Support:**
- Contact IT department for technical issues
- Report bugs through the internal ticketing system
- Request new features via the enhancement process

**Training Resources:**
- User training sessions available upon request
- Video tutorials for common tasks
- Department-specific training materials

Next Steps
----------

Now that you're familiar with the basics:

**For Regular Users:**
1. Explore the inventory to familiarize yourself with current items
2. Practice searching and filtering
3. Review reports relevant to your department

**For Managers:**
1. Review current inventory accuracy
2. Set up proper minimum stock levels
3. Establish regular stock auditing procedures
4. Train team members on system usage

**For Administrators:**
1. Configure user roles and permissions
2. Set up data backup procedures
3. Review security settings
4. Plan integration with other systems

Advanced Features
-----------------

API Integration
~~~~~~~~~~~~~~~

For chatbot and automation integration:
- RESTful API endpoints available at /api/*
- Authentication required for all API access
- Comprehensive API documentation at /api/docs
- MCP-ready for Model Context Protocol integration

Bulk Operations
~~~~~~~~~~~~~~~

**Bulk Import:**
- Prepare CSV files with item data
- Use the bulk import feature (Manager+ role required)
- Validate data before importing
- Review import results and error logs

**Bulk Export:**
- Export entire inventory or filtered subsets
- Include stock movement history
- Generate reports for external analysis

Troubleshooting
---------------

Common Issues
~~~~~~~~~~~~~

**Cannot Access Certain Features:**
- Check your user role and permissions
- Contact administrator for role upgrade if needed

**Items Not Appearing:**
- Verify you're looking in the correct category
- Check if items are marked as inactive
- Use search function to locate specific items

**Stock Discrepancies:**
- Review stock movement history
- Verify manual adjustments are recorded
- Contact administrator for data integrity checks

Getting Additional Help
~~~~~~~~~~~~~~~~~~~~~~~

If you need further assistance:

1. **Check Documentation**: Review relevant sections of this documentation
2. **Contact Support**: Reach out to the IT department
3. **User Community**: Connect with other system users in your organization
4. **Training Sessions**: Request additional training if needed

Continue to the detailed user guides for comprehensive information on each system component.