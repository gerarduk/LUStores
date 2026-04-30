# SSL Certificate Guide for LUStores

This guide explains LUStores' smart SSL certificate system and why different certificate types are used for different deployment scenarios.

## Overview

LUStores automatically detects your domain type and generates the appropriate SSL certificate:

- 🌐 **Public domains** → Let's Encrypt certificates (trusted by all browsers)
- 🏢 **Internal domains** → Self-signed certificates (same encryption, browser warning)

## Certificate Types Explained

### 🌐 Let's Encrypt Certificates (Public Domains)

**When Used:**
- Public domains like `company.com`, `myapp.org`
- Domains accessible from the public internet
- Production websites for external users

**Advantages:**
- ✅ Trusted by all browsers and operating systems
- ✅ No security warnings for users
- ✅ Free and automatic renewal
- ✅ Industry standard for public websites

**Requirements:**
- Domain must be publicly accessible
- HTTP challenge validation (port 80 access)
- Valid email address for notifications

**Example Domains:**
- `lustores.company.com`
- `inventory.myorganization.org`
- `store.university.edu` (if publicly accessible)

### 🏢 Self-Signed Certificates (Internal Domains)

**When Used:**
- Internal corporate/university domains
- VPN-only accessible applications
- Private network deployments
- Development and testing environments

**Advantages:**
- ✅ Same encryption strength as commercial certificates
- ✅ No external validation required
- ✅ Works completely offline/internal
- ✅ Perfect for private networks
- ✅ No dependency on external services

**Disadvantages:**
- ⚠️ Browser security warning on first visit
- ⚠️ Users must manually accept certificate

**Example Domains:**
- `py-stores.lancaster.ac.uk` (Lancaster University internal)
- `inventory.company.local`
- `app.internal.corporate.com`
- `localhost`
- `192.168.1.100`

## Why Self-Signed for Internal Domains?

### Technical Limitations

**Let's Encrypt Requirements:**
1. **Public HTTP Access**: Must validate domain ownership via HTTP challenge
2. **DNS Resolution**: Domain must resolve from public internet
3. **Reachability**: Let's Encrypt servers must reach your server on port 80

**Internal Domain Reality:**
1. **VPN/Firewall Protected**: Not accessible from public internet
2. **Internal DNS**: Only resolves within organization network
3. **Security Policies**: Often blocked from external access by design

### University/Corporate Context

**Lancaster University Example:**
- `py-stores.lancaster.ac.uk` only resolves within university network
- Protected by firewall and VPN access controls
- Let's Encrypt validation servers cannot reach the domain
- Self-signed certificates provide identical security for internal users

**Corporate Network Example:**
- `app.company.local` internal domain
- Only accessible via corporate VPN
- External validation impossible by design
- Self-signed certificates appropriate for internal tools

## Security Comparison

| Aspect | Let's Encrypt | Self-Signed |
|--------|---------------|-------------|
| **Encryption Strength** | RSA 2048-bit | RSA 2048-bit |
| **Algorithm** | SHA-256 | SHA-256 |
| **Data Protection** | ✅ Full encryption | ✅ Full encryption |
| **Man-in-the-Middle Protection** | ✅ Yes | ✅ Yes |
| **Browser Trust** | ✅ Trusted | ⚠️ Manual acceptance |
| **User Experience** | ✅ Seamless | ⚠️ Initial warning |
| **External Dependencies** | ❌ Requires internet | ✅ None |

## Browser Security Warning Explained

### What Users See

When accessing a self-signed certificate site, browsers show:
```
⚠️ Your connection is not private
This site's security certificate is not trusted
```

### Why This Happens

1. **Certificate Authority Trust**: Browsers only trust certificates signed by known Certificate Authorities
2. **Self-Signed Nature**: Certificate is signed by itself, not a trusted CA
3. **Security Feature**: Browser protects users from potentially malicious certificates

### Is This Safe?

**Yes, for internal applications:**
- ✅ **Same encryption**: Data is fully encrypted in transit
- ✅ **Known environment**: You control the certificate and server
- ✅ **Internal network**: Reduced risk of man-in-the-middle attacks
- ✅ **Organizational control**: Within trusted network boundaries

## User Instructions

### For End Users (Internal Deployments)

**When you see the security warning:**

1. **Click "Advanced"** (or similar option)
2. **Click "Proceed to [domain] (unsafe)"**
3. **Certificate is permanently accepted** for future visits

**Chrome/Edge Steps:**
```
1. Click "Advanced"
2. Click "Proceed to py-stores.lancaster.ac.uk (unsafe)"
```

**Firefox Steps:**
```
1. Click "Advanced"
2. Click "Accept the Risk and Continue"
```

**Safari Steps:**
```
1. Click "Show Details"
2. Click "visit this website"
3. Click "Visit Website" to confirm
```

### For IT Administrators

**Enterprise Certificate Management:**

1. **Import to CA Store**: Add self-signed certificate to organization's trusted CA store
2. **Group Policy**: Deploy certificate via Active Directory
3. **Browser Management**: Use enterprise browser policies to trust certificate
4. **User Training**: Educate users about expected security warnings

## Certificate Files and Locations

### Let's Encrypt Certificates
```
certbot/conf/live/[domain]/
├── cert.pem          # Certificate
├── chain.pem         # Intermediate certificates
├── fullchain.pem     # Certificate + chain
└── privkey.pem       # Private key
```

### Self-Signed Certificates
```
certbot/conf/
├── selfsigned.crt    # Certificate
└── selfsigned.key    # Private key
```

## Configuration Options

### Force Self-Signed Certificates

To force self-signed certificates even for public domains:

```bash
# In .env.prod
USE_SELF_SIGNED=true
```

### HTTP-Only Deployment

To disable SSL entirely for testing:

```bash
# In .env.prod
HTTP_ONLY=true
```

### Staging Certificates

To use Let's Encrypt staging environment (for testing):

```bash
# In .env.prod
CERTBOT_STAGING=--staging
```

## Frequently Asked Questions

### Q: Can I use a commercial SSL certificate instead?

**A:** Yes, you can replace the generated certificates with commercial ones:

1. Obtain certificate from your preferred CA
2. Place certificate files in `certbot/conf/`
3. Update nginx configuration to point to your certificate files
4. Restart nginx

### Q: How do I renew self-signed certificates?

**A:** Self-signed certificates are valid for 365 days and can be renewed:

```bash
# Regenerate self-signed certificate
docker-compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml --profile init up certbot-init
```

### Q: Can I get rid of the browser warning for internal domains?

**A:** Several options:

1. **Import certificate**: Add to browser/OS trusted certificate store
2. **Enterprise CA**: Issue certificates from internal CA if available
3. **User acceptance**: Train users to accept the security exception
4. **Reverse proxy**: Use a public domain with Let's Encrypt if architecture permits

### Q: Is the encryption really the same as commercial certificates?

**A:** Yes, absolutely:
- Same RSA 2048-bit key strength
- Same SHA-256 hashing algorithm
- Same TLS protocol encryption
- Same protection against eavesdropping and tampering

The only difference is the trust chain - self-signed certificates are not signed by a publicly trusted Certificate Authority.

### Q: Should I use HTTP instead to avoid the warning?

**A:** No, strongly discouraged:
- ❌ **No encryption**: All data transmitted in plain text
- ❌ **Security risk**: Passwords, session tokens visible to network observers
- ❌ **Compliance issues**: Many security policies require encryption
- ✅ **Better approach**: Use self-signed HTTPS and educate users

## Conclusion

LUStores' smart SSL system provides:

- **🌐 Public domains**: Seamless, trusted certificates via Let's Encrypt
- **🏢 Internal domains**: Strong encryption via self-signed certificates
- **🔄 Automatic detection**: No manual configuration required
- **🔒 Full security**: Equivalent encryption for all deployment types

For internal deployments like university or corporate networks, self-signed certificates are the appropriate and secure choice, providing full encryption protection while working within network security constraints.
