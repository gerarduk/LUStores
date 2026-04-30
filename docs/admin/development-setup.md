# Development Environment Setup

This guide helps you set up the University Inventory Management System for development, including the admin override feature for testing without authentication.

## Quick Development Start

### Environment Variables

Create a `.env` file in your project root with these essential variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/university_inventory

# Session Security
SESSION_SECRET=your-super-secure-session-secret-here

# Development Settings
NODE_ENV=development

# Admin Override (Optional - for development only)
DEV_ADMIN_OVERRIDE=true
```

### Development Admin Override

**What it does:** Bypasses authentication entirely and creates a mock admin user for all requests.

**When to use:**
- Initial development when you don't have any users set up yet
- Testing admin features without setting up authentication
- Rapid prototyping and development
- When SSO is not configured

**How to enable:**
```bash
# Add to your .env file
DEV_ADMIN_OVERRIDE=true
NODE_ENV=development
```

**Security Note:** ⚠️ **NEVER use this in production!** This completely bypasses all authentication.

### Development Admin Account Details

When the admin override is active, you are automatically logged in as:

**Development Admin User:**
- **Email:** `dev@admin.local`
- **Name:** Development Admin
- **Role:** Admin (full system access)
- **Password:** Not required - automatic login
- **User ID:** `dev_admin_001`

**Full Admin Privileges Include:**
- ✅ Dashboard and analytics access
- ✅ Inventory management (create, edit, delete items)
- ✅ Category management
- ✅ User account management
- ✅ Database backup and restore functions
- ✅ System configuration
- ✅ All administrative features

## Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE university_inventory;
CREATE USER inventory_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE university_inventory TO inventory_user;
\q
```

### 3. Set Database URL

```bash
# Add to .env
DATABASE_URL=postgresql://inventory_user:secure_password@localhost:5432/university_inventory
```

### 4. Initialize Schema

```bash
# Push database schema
npm run db:push
```

## Application Startup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5000` with:
- ✅ Frontend and backend running together
- ✅ Hot reload for development
- ✅ Admin override active (if enabled)
- ✅ University branding and styling

## Development Workflow

### With Admin Override Enabled

1. **Start the app:** `npm run dev`
2. **Open browser:** Navigate to `http://localhost:5000`
3. **Full access:** You're automatically logged in as admin
4. **Test features:** Create categories, add items, manage users
5. **No login needed:** Skip all authentication steps

### Without Admin Override (Normal Mode)

1. **Create first admin:** Follow the [First Admin Setup Guide](first-admin-setup.md)
2. **Start the app:** `npm run dev`
3. **Login:** Use the login page with your credentials
4. **Development:** Test with real authentication flow

## Testing Different User Roles

### Option 1: Switch Override User Role

Modify the override in `server/localAuth.ts`:

```typescript
// Change role to test different permissions
(req as any).user = {
  // ... other fields
  role: 'user'        // or 'superuser' or 'admin'
};
```

### Option 2: Create Real Users

1. Disable override: `DEV_ADMIN_OVERRIDE=false`
2. Login as admin
3. Create test users with different roles
4. Test switching between accounts

## Environment Configuration

### Complete .env Template

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/university_inventory

# Session & Security
SESSION_SECRET=generate-a-long-random-string-here
NODE_ENV=development

# Development Features
DEV_ADMIN_OVERRIDE=true

# University SSO (Optional)
SAML_ENTRY_POINT=https://sso.university.edu/saml2/sso
SAML_ISSUER=university-inventory-system
SAML_CALLBACK_URL=http://localhost:5000/auth/sso/callback
SAML_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

# Email Configuration (Optional)
SMTP_HOST=smtp.university.edu
SMTP_PORT=587
SMTP_USER=inventory@university.edu
SMTP_PASS=email_password

# Backup Storage (Optional)
BACKUP_RETENTION_DAYS=30
```

## Development Tools

### Database Management

```bash
# View database with GUI
npm run db:studio

# Reset database (careful!)
npm run db:reset

# Create migration
npm run db:generate
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Common Development Scenarios

### Scenario 1: Fresh Start Development

```bash
# 1. Clone and setup
git clone <repository>
cd university-inventory
npm install

# 2. Setup environment
echo "DATABASE_URL=postgresql://..." > .env
echo "SESSION_SECRET=dev-secret-key" >> .env
echo "NODE_ENV=development" >> .env
echo "DEV_ADMIN_OVERRIDE=true" >> .env

# 3. Setup database
npm run db:push

# 4. Start developing
npm run dev
```

### Scenario 2: Testing Authentication

```bash
# 1. Disable override
echo "DEV_ADMIN_OVERRIDE=false" > .env

# 2. Create admin account (see first-admin-setup.md)
psql $DATABASE_URL
# Run SQL to create admin...

# 3. Test login flow
npm run dev
# Navigate to /login
```

### Scenario 3: SSO Development

```bash
# 1. Get SSO details from university IT
# 2. Add SAML variables to .env
# 3. Test with real university accounts
```

## Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running: `brew services list` (macOS)
- Verify DATABASE_URL is correct
- Check database exists: `psql $DATABASE_URL`

### "Unauthorized" errors with override enabled
- Check `NODE_ENV=development` is set
- Check `DEV_ADMIN_OVERRIDE=true` is set
- Restart the development server

### "Session secret required"
- Add SESSION_SECRET to .env
- Use a long random string
- Restart the server

### Port conflicts
- Default port is 5000
- Change with: `PORT=3000 npm run dev`

## Security Notes

### Development vs Production

**Development Features (NEVER in production):**
- ❌ DEV_ADMIN_OVERRIDE=true
- ❌ Weak SESSION_SECRET
- ❌ HTTP instead of HTTPS
- ❌ Exposed database credentials

**Production Requirements:**
- ✅ Strong SESSION_SECRET (32+ characters)
- ✅ HTTPS enabled
- ✅ Database credentials in secure storage
- ✅ DEV_ADMIN_OVERRIDE=false (or removed)
- ✅ University SSO properly configured

This development setup gets you up and running quickly while maintaining security best practices for production deployment.