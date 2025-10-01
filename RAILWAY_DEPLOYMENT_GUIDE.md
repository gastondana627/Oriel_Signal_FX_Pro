# Railway Deployment Guide for Oriel Signal FX Pro Backend

This guide provides step-by-step instructions for deploying the Oriel Signal FX Pro backend to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install with `npm install -g @railway/cli`
3. **Project Setup**: Ensure you're in the project root directory
4. **External Services**: Have accounts ready for:
   - Stripe (payment processing)
   - Google Cloud Storage (file storage)
   - SendGrid (email service)

## Quick Deployment

For a quick deployment, run:

```bash
# Make scripts executable
chmod +x railway-deploy.sh railway-addons-setup.sh verify-deployment.sh

# Set up Railway add-ons (PostgreSQL and Redis)
./railway-addons-setup.sh

# Deploy the application
./railway-deploy.sh

# Verify deployment
./verify-deployment.sh
```

## Detailed Step-by-Step Deployment

### Step 1: Railway CLI Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (if new)
railway init

# Or link to existing project
railway link
```

### Step 2: Set Up Add-ons

```bash
# Add PostgreSQL database
railway add postgresql

# Add Redis for job queue
railway add redis

# Verify add-ons
railway variables
```

### Step 3: Configure Environment Variables

Set all required environment variables. You can use the Railway dashboard or CLI:

```bash
# Core configuration
railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app/backend
railway variables set HTTPS_ONLY=true
railway variables set LOG_LEVEL=INFO

# Security (generate secure values)
railway variables set SECRET_KEY="your-super-secret-key-minimum-32-characters-long"
railway variables set JWT_SECRET_KEY="your-jwt-secret-key-minimum-32-characters-long"

# Admin access
railway variables set ADMIN_EMAIL="admin@yourdomain.com"
railway variables set ADMIN_PASSWORD="secure-admin-password"

# Stripe configuration
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_..."
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."

# Google Cloud Storage
railway variables set GCS_BUCKET_NAME="your-production-bucket"
railway variables set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# SendGrid email
railway variables set SENDGRID_API_KEY="SG...."
railway variables set SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# CORS and frontend
railway variables set CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
railway variables set FRONTEND_URL="https://yourdomain.com"
```

### Step 4: Validate Configuration

Before deploying, validate your configuration:

```bash
python validate-production-config.py
```

### Step 5: Deploy

```bash
# Deploy to Railway
railway up

# Monitor deployment
railway logs --follow
```

### Step 6: Verify Deployment

```bash
# Test all endpoints
./verify-deployment.sh

# Or manually test health endpoint
curl https://your-app.railway.app/health
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `production` |
| `SECRET_KEY` | Flask secret key | `your-super-secret-key-32-chars-min` |
| `JWT_SECRET_KEY` | JWT signing key | `your-jwt-secret-key-32-chars-min` |
| `DATABASE_URL` | PostgreSQL URL | Auto-set by Railway |
| `REDIS_URL` | Redis URL | Auto-set by Railway |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `GCS_BUCKET_NAME` | GCS bucket name | `your-production-bucket` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | GCS service account JSON | `{"type":"service_account",...}` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.your_api_key` |
| `SENDGRID_FROM_EMAIL` | Sender email | `noreply@yourdomain.com` |
| `ADMIN_EMAIL` | Admin login email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin password | `secure-password` |
| `CORS_ORIGINS` | Allowed origins | `https://yourdomain.com` |
| `FRONTEND_URL` | Frontend URL | `https://yourdomain.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHONPATH` | Python path | `/app/backend` |
| `HTTPS_ONLY` | Force HTTPS | `true` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | Server port | Auto-set by Railway |

## Post-Deployment Setup

### 1. Custom Domain

1. Go to Railway dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain
5. Update DNS records as instructed

### 2. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 3. Google Cloud Storage Setup

1. Create a GCS bucket
2. Create a service account with Storage Admin role
3. Generate JSON key
4. Set `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the JSON content

### 4. SendGrid Setup

1. Create SendGrid account
2. Generate API key
3. Verify sender email address
4. Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`

## Monitoring and Maintenance

### Useful Commands

```bash
# View logs
railway logs --follow

# Check status
railway status

# Access shell
railway shell

# Restart service
railway restart

# View environment variables
railway variables

# Open deployed app
railway open
```

### Health Monitoring

Monitor these endpoints:

- **Health Check**: `/health` - Basic health status
- **Detailed Status**: `/status` - Comprehensive system status
- **API Info**: `/api/info` - API documentation

### Log Monitoring

Key log patterns to monitor:

- `ERROR` - Application errors
- `CRITICAL` - Critical system failures
- `Payment` - Payment processing events
- `Render` - Video rendering status
- `Email` - Email delivery status

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` is set correctly
   - Ensure PostgreSQL addon is added
   - Check database migrations: `railway run python -m flask db upgrade`

2. **Redis Connection Errors**
   - Check `REDIS_URL` is set correctly
   - Ensure Redis addon is added
   - Test connection: `railway run python -c "import redis; redis.from_url('$REDIS_URL').ping()"`

3. **Environment Variable Issues**
   - Run `python validate-production-config.py`
   - Check variables: `railway variables`
   - Ensure no typos in variable names

4. **Build Failures**
   - Check Dockerfile syntax
   - Ensure all dependencies in requirements.txt
   - Check build logs: `railway logs`

5. **Health Check Failures**
   - Check `/health` endpoint manually
   - Verify database and Redis connections
   - Check application logs for errors

### Getting Help

1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Railway Discord community
3. Check application logs: `railway logs --follow`
4. Use health endpoints for diagnostics

## Security Checklist

- [ ] Strong `SECRET_KEY` and `JWT_SECRET_KEY` (32+ characters)
- [ ] Production Stripe keys (not test keys)
- [ ] `HTTPS_ONLY=true` in production
- [ ] Strong admin password
- [ ] Proper CORS origins (no wildcards)
- [ ] GCS service account with minimal permissions
- [ ] SendGrid API key with minimal permissions
- [ ] Regular security updates

## Performance Optimization

- [ ] Enable Gunicorn preloading (`--preload`)
- [ ] Configure appropriate worker count
- [ ] Set up database connection pooling
- [ ] Monitor memory usage
- [ ] Set up Redis for caching
- [ ] Configure CDN for static assets

## Backup and Recovery

- [ ] Regular database backups (Railway handles this)
- [ ] Environment variable backup
- [ ] GCS bucket versioning enabled
- [ ] Disaster recovery plan documented

---

This deployment guide ensures a production-ready deployment of the Oriel Signal FX Pro backend on Railway with all necessary configurations and monitoring in place.