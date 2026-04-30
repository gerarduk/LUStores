Authentication System Setup Guide
=================================

This guide provides comprehensive instructions for setting up and managing the University Inventory Management System's authentication system, including creating the first admin account and managing user roles.

Authentication Overview
-----------------------

The system supports two authentication methods:

**University Single Sign-On (SSO)**
   - SAML 2.0 integration with university identity providers
   - Automatic role assignment based on university affiliations
   - Seamless integration with existing university accounts

**Local Email/Password Accounts**
   - Secure bcrypt password hashing
   - Strong password requirements
   - Perfect for external users or when SSO isn't available

**Development Admin Override**
   - Bypass authentication for development and testing
   - Automatic admin access without login requirements
   - Only available in development environment

Code Architecture
-----------------

Authentication System Structure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The authentication system is built with a modular architecture:

.. code-block:: text

   Authentication Layer
   ├── server/localAuth.ts       # Local email/password authentication
   ├── server/universitySso.ts   # SAML SSO integration
   ├── server/storage.ts         # User data management
   └── shared/schema.ts          # User database schema

**Key Components:**

**Local Authentication (server/localAuth.ts)**
   - Password validation and hashing
   - User account creation and management
   - Session management with PostgreSQL
   - Role-based access control middleware

**SSO Integration (server/universitySso.ts)**
   - SAML 2.0 strategy implementation
   - Attribute mapping from university directories
   - Automatic role assignment based on affiliations

**Database Schema (shared/schema.ts)**
   - User table with both local and SSO support
   - Role-based permission system
   - Session storage for secure authentication

User Database Schema
~~~~~~~~~~~~~~~~~~~~~

The users table supports both authentication methods:

.. code-block:: typescript

   export const users = pgTable("users", {
     id: varchar("id").primaryKey().notNull(),
     email: varchar("email").unique().notNull(),
     passwordHash: varchar("password_hash"), // null for SSO users
     firstName: varchar("first_name"),
     lastName: varchar("last_name"),
     role: varchar("role").notNull().default("user"), // user, superuser, admin
     isActive: boolean("is_active").notNull().default(true),
     mustChangePassword: boolean("must_change_password").notNull().default(false),
     lastLogin: timestamp("last_login"),
     profileImageUrl: varchar("profile_image_url"),
     createdAt: timestamp("created_at").defaultNow(),
     updatedAt: timestamp("updated_at").defaultNow(),
   });

Role System
-----------

Three-Tier Permission Model
~~~~~~~~~~~~~~~~~~~~~~~~~~~

**User Role (Basic Access)**
   - View inventory items and stock levels
   - Search and filter inventory data
   - Generate basic reports
   - Submit requisition requests

**Superuser Role (Operational Management)**
   - All User permissions, plus:
   - Add, edit, and manage inventory items
   - Update stock levels and track movements
   - Create and modify categories
   - Generate detailed operational reports
   - Approve requisitions

**Admin Role (System Administration)**
   - All Superuser permissions, plus:
   - Manage user accounts and roles
   - Create new user accounts
   - Reset user passwords
   - Access backup and system functions
   - View audit logs and security features
   - Configure system-wide settings

Initial Setup: Creating Your First Admin Account
------------------------------------------------

Method 1: Database Direct Setup (Recommended)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Since you need an admin account to create other accounts, the first admin must be created directly in the database:

**Step 1: Access Your Database**

.. code-block:: bash

   # Using psql
   psql $DATABASE_URL
   
   # Or using Docker
   docker exec -it inventory-db psql -U postgres -d university_inventory

**Step 2: Create the First Admin Account**

.. code-block:: sql

   -- Insert the first admin user
   INSERT INTO users (
     id, 
     email, 
     password_hash,
     first_name,
     last_name,
     role,
     is_active,
     must_change_password
   ) VALUES (
     'admin_' || extract(epoch from now())::text,
     'admin@your-university.edu',
     '$2b$12$LQv3c1yqBwEHxv5hSyHKdOCOFUTp9.7bAD0EzHkzUl9r7XZ8Kcqoe', -- password: AdminPass123!
     'System',
     'Administrator',
     'admin',
     true,
     true  -- User must change password on first login
   );

**Step 3: Verify the Account**

.. code-block:: sql

   SELECT id, email, role, is_active FROM users WHERE role = 'admin';

**Step 4: First Login**

1. Navigate to your application URL
2. Click "Sign in with email" 
3. Use credentials:
   - Email: ``admin@your-university.edu``
   - Password: ``AdminPass123!``
4. You'll be prompted to change the password immediately

Method 2: Environment Variable Setup
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For automated deployments, you can set up the admin account via environment variables:

.. code-block:: bash

   # Add to your .env file or environment
   INITIAL_ADMIN_EMAIL=admin@your-university.edu
   INITIAL_ADMIN_PASSWORD=SecureAdminPassword123!
   INITIAL_ADMIN_FIRST_NAME=System
   INITIAL_ADMIN_LAST_NAME=Administrator

The system will automatically create this admin account on first startup if no admin users exist.

Password Security Requirements
------------------------------

Strong Password Policy
~~~~~~~~~~~~~~~~~~~~~~

All passwords must meet these requirements:

- **Minimum 8 characters** long
- **At least one uppercase** letter (A-Z)
- **At least one lowercase** letter (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Password Hashing:**
- Uses bcrypt with 12 salt rounds
- Automatically handles salt generation
- Resistant to rainbow table attacks

**Password Management:**
- Admins can reset user passwords to temporary passwords
- Users must change temporary passwords on next login
- Last login tracking for security monitoring

Managing User Accounts
----------------------

Creating New Users (Admin Only)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Via API (for integrations):**

.. code-block:: javascript

   // POST /api/users
   {
     "email": "john.doe@university.edu",
     "password": "SecurePassword123!",
     "firstName": "John",
     "lastName": "Doe",
     "role": "user"  // user, superuser, or admin
   }

**Via Admin Interface:**

1. Log in as an admin user
2. Navigate to "Users" in the admin menu
3. Click "Add User" button
4. Fill in user details:
   - Email address (must be unique)
   - Strong password
   - First and last name
   - Initial role assignment
5. Click "Create User"

The new user will receive their credentials and can log in immediately.

Changing User Roles
~~~~~~~~~~~~~~~~~~~

**Role Change Process:**

1. Navigate to Users management page
2. Find the target user in the list
3. Click "Edit" or the role dropdown
4. Select new role:
   - **user** → **superuser** (promote to manager)
   - **superuser** → **admin** (promote to admin)
   - **admin** → **superuser** (demote from admin)
5. Confirm the role change
6. User's permissions update immediately

**Role Change API:**

.. code-block:: javascript

   // PUT /api/users/:id/role
   {
     "role": "superuser"
   }

**Important Security Notes:**
- Only admins can change user roles
- Role changes are logged for audit purposes
- Users are notified of role changes via email (if configured)
- At least one admin account must remain active

Password Reset and Management
-----------------------------

Admin Password Reset
~~~~~~~~~~~~~~~~~~~~

**For Other Users:**

1. Go to Users management page
2. Find the user who needs a password reset
3. Click "Reset Password" button
4. System generates a secure temporary password
5. Share the temporary password with the user securely
6. User must change password on next login

**Reset Password API:**

.. code-block:: javascript

   // POST /api/users/:id/reset-password
   // Returns: { "temporaryPassword": "TempPass123!" }

User Self-Service Password Change
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Users can change their own passwords:**

1. Click profile menu in top-right corner
2. Select "Change Password"
3. Enter current password
4. Enter new password (must meet requirements)
5. Confirm new password
6. Click "Update Password"

**Password Change API:**

.. code-block:: javascript

   // POST /api/auth/change-password
   {
     "currentPassword": "OldPassword123!",
     "newPassword": "NewSecurePassword456!"
   }

Security Configuration
----------------------

Session Management
~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Session configuration
   SESSION_SECRET=your-super-secure-session-secret-here
   
   # Session duration (default: 1 week)
   SESSION_TTL=604800000

**Session Security Features:**
- HTTP-only cookies (prevent XSS)
- Secure flag for HTTPS
- SameSite protection against CSRF
- Automatic session cleanup
- PostgreSQL session storage for scalability

Account Security
~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Password security
   MIN_PASSWORD_LENGTH=8
   SALT_ROUNDS=12
   
   # Account lockout (optional)
   MAX_LOGIN_ATTEMPTS=5
   LOCKOUT_DURATION=900000  # 15 minutes

Authentication Flow
-------------------

Login Process
~~~~~~~~~~~~~

**Local Authentication Flow:**

1. User submits email and password
2. System looks up user by email
3. Validates password against stored hash
4. Checks account status (active, not locked)
5. Creates secure session
6. Updates last login timestamp
7. Redirects to intended destination

**SSO Authentication Flow:**

1. User clicks "Sign in with University Account"
2. Redirects to university SSO provider
3. User authenticates with university credentials
4. SSO provider returns SAML assertion
5. System validates assertion and extracts attributes
6. Creates or updates user account
7. Assigns role based on university affiliation
8. Creates secure session

Code Examples
-------------

Custom Authentication Middleware
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: typescript

   // Require authentication for routes
   app.get('/api/protected', requireAuth, (req, res) => {
     const user = req.user;
     res.json({ message: `Hello ${user.firstName}!` });
   });

   // Require specific roles
   app.post('/api/admin-only', requireRole(['admin']), (req, res) => {
     // Only admins can access this endpoint
   });

   // Multiple role access
   app.get('/api/managers', requireRole(['admin', 'superuser']), (req, res) => {
     // Admins and superusers can access
   });

Creating Users Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: typescript

   import { createUser } from './server/localAuth';

   // Create a new user account
   const newUser = await createUser({
     email: 'jane.smith@university.edu',
     password: 'SecurePassword123!',
     firstName: 'Jane',
     lastName: 'Smith',
     role: 'superuser'
   });

Troubleshooting Authentication Issues
-------------------------------------

Common Problems and Solutions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Login Fails with "Invalid Credentials"**

1. Verify email address is correct
2. Check if account exists: ``SELECT * FROM users WHERE email = 'user@email.com'``
3. Verify account is active: ``is_active = true``
4. For SSO users, ensure they use SSO login (no local password)

**"Account is Disabled" Error**

.. code-block:: sql

   -- Reactivate user account
   UPDATE users SET is_active = true WHERE email = 'user@email.com';

**Password Reset Issues**

1. Verify admin has reset permissions
2. Check if temporary password was generated correctly
3. Ensure user tries to log in (not password change)
4. Check ``must_change_password`` flag is set

**SSO Integration Problems**

1. Verify SAML configuration environment variables
2. Check university SSO metadata is accessible
3. Validate callback URLs are registered with university
4. Review SAML assertion attributes in logs

**Session/Cookie Issues**

1. Check ``SESSION_SECRET`` is set
2. Verify database connectivity for session storage
3. Clear browser cookies and try again
4. Check HTTPS configuration for secure cookies

Database Maintenance
~~~~~~~~~~~~~~~~~~~~

**Regular User Cleanup:**

.. code-block:: sql

   -- Find inactive users (no login in 90 days)
   SELECT id, email, last_login 
   FROM users 
   WHERE last_login < NOW() - INTERVAL '90 days' 
   OR last_login IS NULL;

   -- Cleanup old sessions (done automatically)
   DELETE FROM sessions WHERE expire < NOW();

**User Audit Queries:**

.. code-block:: sql

   -- Count users by role
   SELECT role, COUNT(*) FROM users GROUP BY role;

   -- Recent login activity
   SELECT email, last_login, role 
   FROM users 
   WHERE last_login > NOW() - INTERVAL '7 days'
   ORDER BY last_login DESC;

Best Practices
--------------

Security Recommendations
~~~~~~~~~~~~~~~~~~~~~~~~

1. **Regular Password Updates**: Encourage users to change passwords every 90 days
2. **Role Reviews**: Audit user roles quarterly
3. **Session Monitoring**: Monitor unusual login patterns
4. **Backup Admin**: Always maintain at least 2 admin accounts
5. **Secure Communications**: Use encrypted channels for sharing temporary passwords

Operational Guidelines
~~~~~~~~~~~~~~~~~~~~~~

1. **User Onboarding**: Create accounts with temporary passwords
2. **Role Assignment**: Start with minimal permissions, escalate as needed
3. **Account Deactivation**: Disable rather than delete departed users
4. **Documentation**: Keep records of role changes and reasons
5. **Training**: Ensure admins understand the permission model

This authentication system provides enterprise-grade security suitable for university environments while maintaining ease of use and administrative control.