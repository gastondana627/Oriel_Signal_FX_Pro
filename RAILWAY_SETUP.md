# Railway Production Deployment Guide

This guide will help you deploy your Oriel Signal FX Pro backend to Railway with proper production configuration.

## Prerequisites

1. **Railway CLI installed**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Railway account** and project created at [railway.app](https://railway.app)

3. **Required services** (add these in Railway dashboard):
   - PostgreSQL database
   - Redis instance

## Quick Deployment

1. **Login to Railway**:
   ```bash
   railway login
   ```

2. **Link to your Railway project**:
   ```bash
   railway link
   ```

3. **Run the deployment script**:
   ```bash
   ./railway-deploy.sh
   ```

## Manual Environment Variables Setup

Set these in your Railway dashboard under "Variables":

### Required Variables
```bash
# Security (GENERATE SECURE RANDOM KEYS!)
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Stripe Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google Cloud Storage
GCS_BUCKET_NAME=your-production-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-service-account.json

# SendGrid Email
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# CORS (your frontend domains)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Optional Variables
```bash
# Logging
LOG_LEVEL=INFO

# Security
HTTPS_ONLY=true
```

## Google Cloud Storage Setup

1. **Upload your service account JSON**:
   - In Railway dashboard, go to "Settings" → "Service"
   - Upload your GCP service account JSON file
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the uploaded file path

2. **Alternative**: Use Railway's built-in secrets management for the JSON content

## Database Migration

The deployment automatically runs database migrations, but you can also run them manually:

```bash
railway run python -m flask db upgrade
```

## Monitoring and Debugging

### View Logs
```bash
# Follow logs in real-time
railway logs --follow

# View specific service logs
railway logs --service backend
```

### Access Container Shell
```bash
railway shell
```

### Check Deployment Status
```bash
railway status
```

## Health Check

Your app includes a health check endpoint at `/health`. Railway will use this to monitor your application.

Test it after deployment:
```bash
curl https://your-app-url.railway.app/health
```

## API Testing

Once deployed, test your user dashboard APIs:

```bash
# Replace YOUR_DOMAIN with your actual Railway domain
export API_URL="https://your-app-url.railway.app"

# Test health
curl $API_URL/health

# Test user registration
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Test login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

## Custom Domain Setup

1. In Railway dashboard, go to "Settings" → "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update `CORS_ORIGINS` environment variable with your domain

## Security Checklist

- [ ] Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure proper `CORS_ORIGINS`
- [ ] Set `HTTPS_ONLY=true` for production
- [ ] Use production Stripe keys (not test keys)
- [ ] Secure your GCP service account JSON
- [ ] Set up proper SendGrid configuration
- [ ] Review and test all API endpoints

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Ensure PostgreSQL service is running
   - Check `DATABASE_URL` is automatically set by Railway

2. **Redis connection errors**:
   - Ensure Redis service is running
   - Check `REDIS_URL` is automatically set by Railway

3. **File upload issues**:
   - Verify GCS bucket permissions
   - Check service account JSON is properly uploaded

4. **CORS errors**:
   - Verify `CORS_ORIGINS` includes your frontend domain
   - Ensure protocol (https://) is included

### Getting Help

- Check Railway logs: `railway logs --follow`
- Review application logs in the Railway dashboard
- Test individual API endpoints
- Verify environment variables are set correctly

## Production Optimization

Your deployment includes:

- ✅ Gunicorn WSGI server with 2 workers
- ✅ Automatic database migrations
- ✅ Health checks and monitoring
- ✅ Proper logging configuration
- ✅ Security headers and HTTPS enforcement
- ✅ Connection pooling for database
- ✅ Rate limiting with Redis
- ✅ Error handling and recovery

## Next Steps

After successful deployment:

1. Test all API endpoints
2. Set up monitoring and alerts
3. Configure backup strategies
4. Set up CI/CD pipeline
5. Update frontend to use production API URL