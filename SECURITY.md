# 🔒 Security Documentation

## Overview

The Kids Check-In dashboard handles **sensitive children's information** including names, medical notes, and check-in data. This document outlines the comprehensive security measures implemented to protect this data.

---

## 🛡️ Security Measures Implemented

### 1. **No Data Caching of Sensitive Information**

#### ❌ What We DON'T Store:
- **No localStorage** - No personal data stored in browser
- **No sessionStorage** - No temporary client-side storage
- **No IndexedDB** - No local database storage
- **No cookies** - No persistent user tracking
- **No service workers** - No offline caching of sensitive data
- **No browser cache** - HTTP headers prevent caching

#### ✅ What Happens:
- All data is fetched fresh from the server on every request
- Data exists only in memory during page session
- Closing the browser/tab immediately clears all data
- No trace of children's information remains on the device

---

### 2. **API Security**

#### Server-Side Only API Calls
```typescript
// ✅ SECURE: API credentials never exposed to browser
// All Planning Center API calls happen on the server
export async function getLiveCheckIns() {
  const authHeader = Buffer.from(
    `${process.env.PCO_CLIENT_ID}:${process.env.PCO_CLIENT_SECRET}`
  ).toString('base64');
  // ... server-side fetch
}
```

#### API Route Protection
- **Method restriction**: Only GET requests allowed
- **No caching headers**: `Cache-Control: no-store, no-cache, must-revalidate`
- **Error sanitization**: Generic errors in production (no internal details exposed)
- **Request validation**: Invalid requests are rejected immediately

---

### 3. **HTTP Security Headers**

All implemented via `next.config.security.js`:

```javascript
// Prevent clickjacking
X-Frame-Options: DENY

// Prevent MIME sniffing attacks
X-Content-Type-Options: nosniff

// Enable XSS protection
X-XSS-Protection: 1; mode=block

// Control referrer information
Referrer-Policy: strict-origin-when-cross-origin

// Enforce HTTPS (production)
Strict-Transport-Security: max-age=31536000; includeSubDomains

// Disable unnecessary features
Permissions-Policy: camera=(), microphone=(), geolocation=()

// Content Security Policy
Content-Security-Policy: default-src 'self'; ...

// Prevent caching
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

---

### 4. **Content Security Policy (CSP)**

Restricts what resources the browser can load:

```
✅ Scripts: Only from same origin (self)
✅ Styles: Only from same origin
✅ Images: Self + data URLs + HTTPS
✅ API Calls: Self + Planning Center API only
❌ Frames: Completely blocked (prevents clickjacking)
❌ Camera/Microphone: Blocked
❌ Geolocation: Blocked
```

---

### 5. **Environment Variable Security**

#### Secure Configuration
```bash
# .env.local (NEVER commit to git)
USE_MOCK_DATA=false
PCO_CLIENT_ID=your_client_id_here       # Server-side only
PCO_CLIENT_SECRET=your_secret_here     # Server-side only
```

#### Validation (via `lib/envValidation.ts`)
- ✅ Validates all required variables are set
- ✅ Checks credential format and length
- ✅ Prevents production deployment with insecure config
- ✅ Sanitizes error messages to prevent information leakage

#### .gitignore Protection
```
.env*.local       # Never committed
.env.local        # Never committed
.env.production   # Never committed
```

---

### 6. **Error Handling & Logging**

#### Production Error Handling
```typescript
// ✅ SECURE: Generic error in production
catch (error) {
  console.error('❌ Error fetching check-ins'); // No sensitive details logged
  
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Failed to fetch check-in data. Please try again later.' // Generic
    : error.message; // Detailed only in development
}
```

#### What We DON'T Log:
- ❌ Children's names
- ❌ Medical information
- ❌ Security codes
- ❌ API credentials
- ❌ Internal error stack traces (production)
- ❌ Personal identifiable information (PII)

---

### 7. **Data Transmission Security**

#### HTTPS Enforcement
```javascript
// Strict-Transport-Security header
// Forces all connections to use HTTPS
// Prevents man-in-the-middle attacks
max-age=31536000; includeSubDomains
```

#### No Data in URL Parameters
- ✅ All sensitive data in request/response bodies
- ❌ Never pass medical info or names in URLs
- ❌ No sensitive data in query strings (prevents logging/referrer leaks)

---

### 8. **Cross-Origin Protection**

#### CORS Configuration
```javascript
// Only allow requests from same origin
// No cross-origin API calls allowed
frame-ancestors 'none'  // Prevent embedding in iframes
```

#### Referrer Policy
```javascript
// Limit referrer information sent to external sites
Referrer-Policy: strict-origin-when-cross-origin
```

---

### 9. **Attack Prevention**

#### XSS (Cross-Site Scripting) Protection
- ✅ Content Security Policy blocks inline scripts
- ✅ React automatically escapes output (prevents injection)
- ✅ X-XSS-Protection header enabled
- ✅ No `dangerouslySetInnerHTML` used

#### CSRF (Cross-Site Request Forgery) Protection
- ✅ Same-origin policy enforced
- ✅ GET-only API (no state-changing operations via API)
- ✅ CSP prevents unauthorized requests

#### Clickjacking Protection
- ✅ X-Frame-Options: DENY
- ✅ frame-ancestors 'none' in CSP
- ❌ Cannot be embedded in iframes

#### Information Disclosure Prevention
- ✅ X-Powered-By header disabled
- ✅ No source maps in production
- ✅ Generic error messages in production
- ✅ No version numbers exposed

---

### 10. **Secure Deployment (Vercel)**

#### Automatic Security Features
- ✅ **Automatic HTTPS**: All traffic encrypted
- ✅ **DDoS protection**: Built-in mitigation
- ✅ **Edge caching**: But disabled for sensitive routes
- ✅ **Geolocation blocking**: Optional feature available
- ✅ **Rate limiting**: Configurable per route

#### Vercel Environment Variables
```
✅ Encrypted at rest
✅ Only accessible during build/runtime
✅ Never exposed to client
✅ Can be scoped to production/preview/development
```

---

## 🔍 Security Checklist

### Before Deployment

- [ ] **Environment Variables Set**
  - [ ] `USE_MOCK_DATA=false` for production
  - [ ] `PCO_CLIENT_ID` configured
  - [ ] `PCO_CLIENT_SECRET` configured
  - [ ] No credentials in code

- [ ] **Security Headers Enabled**
  - [ ] `next.config.security.js` in place
  - [ ] Headers applied to all routes
  - [ ] CSP configured correctly

- [ ] **HTTPS Enforced**
  - [ ] Strict-Transport-Security header enabled
  - [ ] All external resources use HTTPS

- [ ] **No Sensitive Data Cached**
  - [ ] No localStorage usage
  - [ ] No sessionStorage usage
  - [ ] Cache-Control headers set to no-store

- [ ] **Error Handling Secure**
  - [ ] Generic errors in production
  - [ ] No PII in logs
  - [ ] No stack traces exposed

- [ ] **.env.local Not Committed**
  - [ ] In .gitignore
  - [ ] Not in repository
  - [ ] Secure on deployment platform

---

## 🚨 Incident Response

### If Credentials Are Compromised:

1. **Immediately** revoke Planning Center API credentials
2. Generate new credentials in Planning Center
3. Update environment variables in deployment
4. Review access logs for unauthorized activity
5. Notify relevant stakeholders

### If Data Breach Suspected:

1. **Immediately** take dashboard offline
2. Review server logs for suspicious activity
3. Contact Planning Center support
4. Follow your organization's incident response plan
5. Document timeline of events

---

## 🛠️ Security Testing

### Manual Security Checks

#### 1. Check No Data in Browser Storage
```javascript
// Open browser DevTools (F12) → Application/Storage
// Verify: localStorage, sessionStorage, IndexedDB all empty
```

#### 2. Verify HTTPS Enforcement
```bash
# Should redirect to HTTPS
curl -I http://your-domain.com
```

#### 3. Test Security Headers
```bash
# Check all security headers are present
curl -I https://your-domain.com
```

#### 4. Verify API Credentials Not Exposed
```bash
# Check client-side source - should find NO credentials
View Page Source → Search for "PCO_CLIENT" (should find nothing)
```

#### 5. Test Error Messages
```bash
# Trigger an error - should see generic message in production
# (Disable PCO API temporarily to test)
```

---

## 📋 Security Best Practices

### For Administrators

1. **Rotate API credentials regularly** (every 90 days)
2. **Use strong, unique passwords** for Planning Center account
3. **Enable 2FA** on Planning Center account
4. **Limit API permissions** to minimum required (read-only if possible)
5. **Monitor access logs** regularly
6. **Use separate credentials** for each deployment/environment
7. **Keep software updated** (Next.js, React, dependencies)

### For Deployment

1. **Always use HTTPS** (never HTTP)
2. **Set environment variables** in deployment platform (never in code)
3. **Use production environment** (`NODE_ENV=production`)
4. **Enable rate limiting** if available
5. **Configure firewall rules** to restrict access if needed
6. **Regular security audits** of dependencies (`npm audit`)

### For Development

1. **Use mock data** during development
2. **Never commit `.env.local`** to version control
3. **Never log sensitive data** in console
4. **Use different credentials** for dev/prod environments
5. **Keep dependencies updated** (`npm update`)
6. **Run security linters** (`npm audit fix`)

---

## 📝 Compliance Considerations

### COPPA (Children's Online Privacy Protection Act)

✅ **No personal information collected** from children under 13  
✅ **Data not stored** on client devices  
✅ **Parental consent** handled via Planning Center (separate system)  
✅ **Minimal data retention** (only while page is open)

### GDPR (General Data Protection Regulation)

✅ **Right to be forgotten**: Data not permanently stored by dashboard  
✅ **Data minimization**: Only display necessary check-in information  
✅ **Data protection**: Encrypted in transit (HTTPS), secure at rest (Planning Center)  
✅ **Consent**: Handled by Planning Center system

### HIPAA Considerations

⚠️ **Note**: This dashboard is **NOT HIPAA compliant** by default
- Medical notes are displayed but not stored locally
- For HIPAA compliance, additional measures needed:
  - Business Associate Agreement (BAA) with Planning Center
  - Access logs and audit trails
  - User authentication and authorization
  - Physical security measures for display devices

---

## 🔐 Additional Security Recommendations

### For Enhanced Security (Optional)

1. **User Authentication**
   - Add login system for staff accessing dashboard
   - Use OAuth or SAML for SSO
   - Implement role-based access control (RBAC)

2. **IP Whitelisting**
   - Restrict dashboard access to church network only
   - Use Vercel firewall rules or Cloudflare

3. **Audit Logging**
   - Log who accesses the dashboard and when
   - Track API calls and data access
   - Set up monitoring and alerts

4. **Data Encryption**
   - Consider end-to-end encryption for medical notes
   - Encrypt data at rest if extending functionality

5. **Device Security**
   - Use dedicated tablets for check-in display
   - Enable device encryption
   - Auto-lock screens when not in use
   - Disable USB ports and external connections

6. **Network Security**
   - Use isolated VLAN for check-in tablets
   - Enable WPA3 WiFi encryption
   - Use VPN for remote access

---

## 📞 Security Questions?

For security concerns or questions:

1. Review this documentation thoroughly
2. Check Planning Center security documentation
3. Consult with your organization's IT/security team
4. Consider hiring a security auditor for sensitive deployments

---

## 🎯 Summary

### What Makes This Secure:

✅ **No sensitive data cached** - Zero storage of children's information  
✅ **Server-side API calls** - Credentials never exposed to browser  
✅ **Comprehensive HTTP headers** - 10+ security headers configured  
✅ **HTTPS enforced** - All traffic encrypted  
✅ **Error sanitization** - No internal details leaked  
✅ **Attack prevention** - XSS, CSRF, clickjacking protection  
✅ **Environment validation** - Prevents insecure deployments  
✅ **Secure defaults** - Security-first configuration  

### Your Data is Protected:

🔒 **In Transit**: HTTPS encryption  
🔒 **At Rest**: Stored securely by Planning Center (not by dashboard)  
🔒 **In Browser**: Exists only in memory, cleared on close  
🔒 **In Logs**: Sanitized to prevent information leakage  

---

**Last Updated**: October 2025  
**Security Review**: Recommended quarterly

