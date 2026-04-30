# First Admin Account Setup

This guide will help you create your first admin account to get started with the University Inventory Management System.

## Development Access (Instant Setup)

**For Development/Testing Only:**

If you're in development mode, you can use the automatic admin override:

**Development Admin Credentials:**
- **Email:** `dev@admin.local`
- **Password:** Not required (automatic login)
- **Access Level:** Full Admin
- **Status:** Active when `DEV_ADMIN_OVERRIDE=true`

**To Enable:**
```bash
# Add to your .env file
DEV_ADMIN_OVERRIDE=true
NODE_ENV=development
```

This gives you immediate access to all features without any setup!

## Production Setup (Database Required)

### Step 1: Access Your Database

Connect to your PostgreSQL database using one of these methods:

**Using psql command line:**
```bash
psql $DATABASE_URL
```

**Using database GUI tools:**
- pgAdmin, DBeaver, or TablePlus
- Connect using your DATABASE_URL credentials

### Step 2: Create the Admin Account

Copy and paste this SQL command, replacing the email with your desired admin email:

```sql
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
  'admin@your-university.edu',  -- Change this to your email
  '$2b$12$LQv3c1yqBwEHxv5hSyHKdOCOFUTp9.7bAD0EzHkzUl9r7XZ8Kcqoe',
  'System',
  'Administrator',
  'admin',
  true,
  true
);
```

**Default Login Credentials:**
- Email: `admin@your-university.edu` (or whatever you set)
- Password: `AdminPass123!`

### Step 3: First Login

1. Navigate to your application URL
2. Go to the login page
3. Choose "Sign in with email" (not university SSO)
4. Enter your credentials
5. You'll be prompted to change the password immediately

## Security Notes

- **Change the password immediately** after first login
- Use a strong password with uppercase, lowercase, numbers, and special characters
- Consider enabling university SSO for additional security
- Create backup admin accounts once logged in

## What's Next?

After logging in as admin, you can:

1. **Create User Accounts**: Add other staff members with appropriate roles
2. **Set Up Categories**: Create inventory categories for your items
3. **Configure SSO**: Set up university single sign-on if available
4. **Import Data**: Add your existing inventory items
5. **Schedule Backups**: Set up automatic database backups

## Troubleshooting

**"Table doesn't exist" error:**
```bash
# Run database migrations
npm run db:push
```

**"Invalid credentials" error:**
- Double-check the email address
- Ensure you're using the local login, not SSO
- Verify the account was created: `SELECT * FROM users WHERE role = 'admin';`

**"Must change password" error:**
- This is normal for the first login
- Follow the password change prompts
- Use a strong password meeting the requirements

## Password Requirements

Your new password must include:
- At least 8 characters
- One uppercase letter (A-Z)
- One lowercase letter (a-z)  
- One number (0-9)
- One special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

## Need Help?

Check the full authentication documentation in `docs/admin/authentication-setup.rst` for comprehensive setup instructions and troubleshooting.