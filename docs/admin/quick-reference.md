# Quick Reference - Admin Access

## Development Admin Account

**For instant access during development:**

```
Email: dev@admin.local
Password: Not required (automatic login)
Role: Admin (full access)
User ID: dev_admin_001
```

**Enable with:**
```bash
DEV_ADMIN_OVERRIDE=true
NODE_ENV=development
```

## Production Admin Account

**First-time setup via database:**

```sql
INSERT INTO users (
  id, email, password_hash, first_name, last_name, role, is_active, must_change_password
) VALUES (
  'admin_' || extract(epoch from now())::text,
  'admin@your-university.edu',
  '$2b$12$LQv3c1yqBwEHxv5hSyHKdOCOFUTp9.7bAD0EzHkzUl9r7XZ8Kcqoe',
  'System', 'Administrator', 'admin', true, true
);
```

**Default credentials:**
```
Email: admin@your-university.edu
Password: AdminPass123!
```

⚠️ **Must change password on first login**

## User Roles

- **admin** - Full system access, user management, backups
- **superuser** - Inventory management, reports, operational features  
- **user** - View inventory, basic reports, search functionality

## Quick Commands

```bash
# Start development with admin override
npm run dev

# Database setup
npm run db:push

# View database
npm run db:studio

# Docker with local auth
docker-compose up
```