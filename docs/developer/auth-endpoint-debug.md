# Authentication API Endpoint Fix

## 🚨 **Root Cause Identified**
The `/auth/login` endpoint is missing because:

1. **SSO Setup Returns False**: Missing SAML environment variables cause `setupUniversitySso()` to return `false`
2. **Local Auth Setup**: `setupLocalAuth()` is correctly called as fallback
3. **Route Registration**: `/auth/login` endpoint IS being registered in `localAuth.ts` line 191

## 🔍 **Investigation Results**

### Missing SAML Environment Variables:
- `SAML_ENTRY_POINT` - Not set
- `SAML_ISSUER` - Not set  
- `SAML_CALLBACK_URL` - Not set
- `SAML_CERT` - Not set

### Code Flow Analysis:
1. `routes.ts` line 127: `setupUniversitySso(app)` returns `false`
2. `routes.ts` line 130: `setupLocalAuth(app)` is called
3. `localAuth.ts` line 191: `app.post('/auth/login', ...)` is registered

## 🛠️ **The Real Issue**

The route IS being registered, but there may be:
1. **Route conflict** with another middleware
2. **Middleware ordering** issue
3. **Express app instance** problem
4. **Request parsing** issue

## 📋 **Action Plan**

### Immediate Fix (Option 1 - Debug Route Registration)
Add debugging to verify route registration and identify conflicts.

### Alternative Fix (Option 2 - Verify Environment)
Ensure all services are running and routes are accessible.

### Verification Steps:
1. Add route debugging logs
2. Test direct route access
3. Check middleware stack
4. Verify app instance consistency
