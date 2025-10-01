# Railway Deployment Guide

## Required Environment Variables

Set these environment variables in your Railway project:

### Core Configuration
- `FLASK_ENV=production`
- `SECRET_KEY=your-secret-key-here`
- `JWT_SECRET_KEY=your-jwt-secret-key-here`

### Database (Railway will provide these automatically)
- `DATABASE_URL` (automatically provided by Railway PostgreSQL)

### Redis (Railway will provide these automatically)  
- `REDIS_URL` (automatically provided by Railway Redis)

### Optional Services (configure if needed)
- `STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here`
- `STRIPE_SECRET_KEY=sk_live_your_key_here`
- `STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here`
- `SENDGRID_API_KEY=SG.your_sendgrid_api_key_here`
- `SENDGRID_FROM_EMAIL=noreply@yourdomain.com`
- `GCS_BUCKET_NAME=your-gcs-bucket-name`
- `GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json`

### CORS Configuration
- `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

## Deployment Steps

1. **Connect your GitHub repository to Railway**
2. **Add PostgreSQL and Redis services** in Railway dashboard
3. **Set environment variables** as listed above
4. **Deploy** - Railway will automatically build using the Dockerfile

## Health Check

The app provides a health check endpoint at `/health` that Railway can use to verify the deployment.

## Troubleshooting

- Check Railway logs for any deployment issues
- Ensure all required environment variables are set
- Verify that PostgreSQL and Redis services are connected
- For video rendering, ensure sufficient memory allocation in Railway settings