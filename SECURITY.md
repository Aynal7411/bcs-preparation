# Security Implementation Guide

## Overview
This guide documents the critical security improvements implemented for the BCS-NTRC platform. These changes address vulnerabilities in authentication, validation, error handling, and API protection.

## 1. JWT Secret Handling

### What Changed
- **Removed dangerous defaults** from production environment
- **Created validation layer** (`validateEnv.js`) that enforces strong secrets
- **Added secret strength check** (minimum 32 characters)
- **Separated dev and production** secret handling

### How to Use

#### In Development
```bash
# Default secrets are provided for local development
NODE_ENV=development npm run dev
```

#### In Production (REQUIRED)
```bash
# Generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in environment variables
JWT_SECRET=your-generated-secret-here
REFRESH_JWT_SECRET=your-generated-refresh-secret-here
ADMIN_EMAIL=your-admin-email@company.com
ADMIN_PASSWORD=your-strong-admin-password
```

### Migration Steps
1. Update `.env` file with strong secrets
2. Test locally with `npm run dev`
3. Deploy to production with validated environment variables
4. Verify no warnings in logs

## 2. Security Headers (Helmet.js)

### What Changed
- **Added helmet.js** for HTTP security headers
- **Configured CSP** (Content Security Policy)
- **Added HSTS** (HTTP Strict Transport Security)
- **Added X-Frame-Options** to prevent clickjacking
- **Added X-Content-Type-Options** to prevent MIME sniffing

### Headers Added
- `Strict-Transport-Security`: Forces HTTPS
- `X-Content-Type-Options: nosniff`: Prevents MIME type sniffing
- `X-Frame-Options: DENY`: Prevents clickjacking
- `X-XSS-Protection`: XSS filter protection
- `Referrer-Policy`: Controls referrer information

### No Action Required
Helmet is automatically applied in `app.js`.

## 3. CORS Improvements

### What Changed
- **Created dedicated CORS config** (`config/cors.js`)
- **Implemented allowlist pattern** instead of open CORS
- **Added origin validation** with helpful logging
- **Set appropriate maxAge** for preflight caching

### CORS Allowlist
```javascript
// In .env
CLIENT_URL=https://your-frontend.com
CLIENT_URLS=https://your-frontend.com,https://www.your-frontend.com
```

### CORS Behavior
- **Development**: All origins allowed with console warnings
- **Production**: Only listed origins allowed
- **Preflight caching**: 24 hours to reduce overhead

### To Add a New Frontend Domain
1. Update `CLIENT_URLS` in `.env`
2. Restart server
3. Verify in logs

## 4. Rate Limiting

### What Changed
- **Added express-rate-limit** for protection
- **Created 3 limiter levels**:
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 login attempts per 15 minutes
  - Password reset: 3 attempts per hour

### Behavior
- **Development**: Limits disabled (skip mode)
- **Production**: All limits active
- **IP detection**: Uses X-Forwarded-For header for proxy support

### Limits Applied
- `POST /api/auth/login` - 5 attempts/15 min
- `POST /api/auth/admin-login` - 5 attempts/15 min
- `POST /api/auth/forgot-password` - 3 attempts/hour
- All other endpoints - 100 requests/15 min

## 5. Comprehensive Error Handling

### What Changed
- **Created custom error classes** (`utils/customErrors.js`)
- **Centralized error handler** with proper logging
- **Request ID tracking** for debugging
- **Sensitive data stripping** in production

### Error Classes Available
```javascript
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError
} from '../utils/customErrors.js';
```

### Usage in Controllers
```javascript
// Instead of returning errors
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User', 'ID123');
throw new ConflictError('Email already exists');
```

### Error Response Format
```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "requestId": "1234567890-abc123def",
  "errors": [
    { "field": "email", "message": "Must be valid email" }
  ]
}
```

### Development vs Production
- **Development**: Full stack traces included
- **Production**: Stack traces removed, generic messages used

## 6. Request Validation Schemas

### What Changed
- **Created `schemas/` directory** for validation rules
- **Centralized validation** logic away from routes
- **Used express-validator** for consistency
- **Added validation middleware** for error handling

### Schema Files
- `schemas/authSchemas.js` - Auth endpoint validation
- `schemas/examSchemas.js` - Exam endpoint validation
- Add more as needed for other features

### Using Validation
```javascript
// In routes/authRoutes.js
import { registerValidation } from '../schemas/authSchemas.js';
import { validateRequest } from '../middleware/validateRequest.js';

router.post('/register', registerValidation, validateRequest, registerController);
```

### Creating New Schemas
```javascript
export const newFeatureValidation = [
  body('field1')
    .isLength({ min: 3, max: 50 })
    .withMessage('Field1 must be between 3-50 characters'),
  body('field2')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
];
```

## 7. Request ID Tracking

### What Changed
- **Added requestIdMiddleware** to all requests
- **Unique ID per request** for correlation
- **ID sent in response headers** as `X-Request-ID`
- **ID included in all logs** for debugging

### Usage
```javascript
// In error logs
{
  "requestId": "1234567890-abc123",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 401,
  "message": "Invalid credentials"
}

// In client code (optional)
fetch('/api/endpoint')
  .then(res => {
    const requestId = res.headers.get('X-Request-ID');
    console.log('Request ID:', requestId);
  });
```

## 8. Socket.io Authentication

### What Changed
- **Added JWT verification** for socket connections
- **Prevented unauthorized room joins**
- **Added error handling** for socket events
- **Added logging** for socket events

### Socket Authentication
```javascript
// Client-side
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Server validates before allowing connection
```

### Socket Events
- `join-exam-room` - Join specific exam
- `exam-message` - Send message to exam room
- `leave-exam-room` - Leave exam
- `disconnect` - Handle disconnection

## Installation Steps

### 1. Install New Dependencies
```bash
cd server
npm install helmet express-rate-limit
```

### 2. Update Environment
```bash
# Copy the updated .env.example
cp .env.example .env

# Generate new secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env with generated secrets
```

### 3. Test Locally
```bash
npm run dev

# Check for validation warnings
# Should see no red error messages
```

### 4. Deploy
```bash
# Push to production
git add .
git commit -m "Security improvements: JWT, CORS, validation, error handling"
git push origin main

# Update production environment variables
# Ensure all required vars are set
```

## Testing Checklist

- [ ] Local development works without warnings
- [ ] Login returns proper error codes
- [ ] Rate limiting blocks after limit exceeded
- [ ] Invalid tokens are rejected
- [ ] CORS rejects unknown origins (production)
- [ ] 404 routes return proper error response
- [ ] Socket.io requires authentication
- [ ] Error logs include request IDs
- [ ] No sensitive data in error responses

## Security Best Practices

### For Developers
1. Always use custom error classes for consistency
2. Never log sensitive data (passwords, tokens)
3. Validate all user input using schemas
4. Use asyncHandler wrapper for all async routes
5. Test with production secrets locally

### For DevOps
1. Rotate JWT secrets every 90 days
2. Monitor rate limit hits for abuse patterns
3. Keep helmet.js and dependencies updated
4. Log all authentication failures
5. Set up alerts for unusual error patterns

### For System Admins
1. Use strong admin credentials (32+ chars)
2. Change admin password after initial setup
3. Monitor request logs for failed auth attempts
4. Keep MongoDB connection secure
5. Use HTTPS in production (enforced by helmet)

## Troubleshooting

### Environment validation fails on start
```
✅ Solution: Check all required env vars are set
NODE_ENV=production node src/server.js
```

### CORS blocking requests
```
✅ Solution: Add frontend URL to CLIENT_URLS
CLIENT_URLS=https://frontend.com,https://www.frontend.com
```

### Rate limiting too strict
```
✅ Solution: Adjust limits in config/rateLimiter.js
windowMs: 30 * 60 * 1000, // 30 minutes instead of 15
max: 10, // 10 attempts instead of 5
```

### Socket.io connection failing
```
✅ Solution: Ensure token is valid JWT
socket = io('url', { auth: { token: validJWT } })
```

## Related Files
- `/server/src/config/validateEnv.js` - Environment validation
- `/server/src/config/cors.js` - CORS configuration
- `/server/src/config/rateLimiter.js` - Rate limiting
- `/server/src/middleware/errorHandler.js` - Error handling
- `/server/src/middleware/validateRequest.js` - Request validation
- `/server/src/middleware/requestId.js` - Request ID tracking
- `/server/src/utils/customErrors.js` - Custom error classes
- `/server/src/schemas/*` - Validation schemas

## Next Steps
1. Implement error handling in all controllers
2. Add validation schemas for remaining endpoints
3. Set up structured logging (pino/winston)
4. Create API documentation with OpenAPI/Swagger
5. Add database backup strategy
6. Implement caching layer with Redis
