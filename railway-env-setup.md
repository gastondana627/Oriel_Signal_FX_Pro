# Railway Environment Variables Setup

This document outlines all the environment variables that need to be configured in Railway for the Oriel Signal FX Pro backend deployment.

## Required Environment Variables

### Core Flask Configuration
```bash
FLASK_ENV=production
PYTHONPATH=/app/backend
PORT=8000  # Railway will set this automatically
```

### Security Configuration (CRITICAL - Generate secure values)
```bash
SECRET_KEY=your-super-secret-key-minimum-32-characters-long
JWT_SECRET_KEY=your-jwt-secret-key-minimum-32-characters-long
HTTPS_ONLY=true
```

### Database Configuration (Automatic with Railway PostgreSQL addon)
```bash
# Railway will automatically provide DATABASE_URL when PostgreSQL addon is added
# DATABASE_URL=postgresql://user:password@host:port/database
```

### Redis Configuration (Automatic with Railway Redis addon)
```bash
# Railway will automatically provide REDIS_URL when Redis addon is added
# REDIS_URL=redis://user:password@host:port/database
```

### Stripe Payment Configuration
```bash
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_endpoint_secret
```

### Google Cloud Storage Configuration
```bash
GCS_BUCKET_NAME=your-production-bucket-name
# For service account JSON, either:
# Option 1: Upload JSON file and set path
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
# Option 2: Set JSON content directly (preferred for Railway)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### SendGrid Email Configuration
```bash
SENDGRID_API_KEY=SG.your_production_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### CORS and Frontend Configuration
```bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Admin Configuration
```bash
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password-change-this
```

### Logging Configuration
```bash
LOG_LEVEL=INFO
```

## Railway CLI Commands to Set Variables

```bash
# Core configuration
railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app/backend
railway variables set HTTPS_ONLY=true
railway variables set LOG_LEVEL=INFO

# Security (replace with actual secure values)
railway variables set SECRET_KEY="your-super-secret-key-minimum-32-characters-long"
railway variables set JWT_SECRET_KEY="your-jwt-secret-key-minimum-32-characters-long"

# Admin access (replace with actual values)
railway variables set ADMIN_EMAIL="admin@yourdomain.com"
railway variables set ADMIN_PASSWORD="secure-admin-password"

# Stripe (replace with actual production keys)
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_..."
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."

# Google Cloud Storage (replace with actual values)
railway variables set GCS_BUCKET_NAME="your-production-bucket"
railway variables set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# SendGrid (replace with actual values)
railway variables set SENDGRID_API_KEY="SG...."
railway variables set SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# CORS (replace with actual domain)
railway variables set CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
railway variables set FRONTEND_URL="https://yourdomain.com"
```

## Security Notes

1. **Never commit actual secrets to version control**
2. **Use Railway's environment variable management**
3. **Generate strong, unique keys for SECRET_KEY and JWT_SECRET_KEY**
4. **Use production Stripe keys, not test keys**
5. **Ensure HTTPS_ONLY is set to true in production**
6. **Use strong admin passwords**

## Verification

After setting variables, verify with:
```bash
railway variables
```

Check health endpoint after deployment:
```bash
curl https://your-app.railway.app/health
```