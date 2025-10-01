# Railway Deployment Checklist

## Pre-Deployment Setup

### 1. Railway Project Setup
- [ ] Railway account created
- [ ] New project created in Railway dashboard
- [ ] Railway CLI installed (`npm install -g @railway/cli`)
- [ ] Logged into Railway CLI (`railway login`)
- [ ] Project linked (`railway link`)

### 2. Required Services
- [ ] PostgreSQL database added to Railway project
- [ ] Redis instance added to Railway project
- [ ] Services are running and healthy

### 3. Environment Variables
Set these in Railway dashboard under "Variables":

#### Security (CRITICAL - Generate secure keys!)
- [ ] `SECRET_KEY` - Strong random key for Flask sessions
- [ ] `JWT_SECRET_KEY` - Strong random key for JWT tokens

#### Payment Processing
- [ ] `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key  
- [ ] `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

#### Cloud Storage
- [ ] `GCS_BUCKET_NAME` - Your Google Cloud Storage bucket name
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON
- [ ] GCP service account JSON uploaded to Railway

#### Email Service
- [ ] `SENDGRID_API_KEY` - Your SendGrid API key
- [ ] `SENDGRID_FROM_EMAIL` - Your verified sender email

#### CORS & Security
- [ ] `CORS_ORIGINS` - Your frontend domain(s)
- [ ] `HTTPS_ONLY=true` - Force HTTPS in production

## Deployment Process

### 1. Code Preparation
- [ ] All code committed to git
- [ ] Production configurations tested locally
- [ ] Database migrations created (`flask db migrate`)

### 2. Deploy to Railway
```bash
# Option 1: Use deployment script
./railway-deploy.sh

# Option 2: Manual deployment
railway up
```

### 3. Post-Deployment Verification
- [ ] Deployment completed successfully
- [ ] Health check endpoint responding (`/health`)
- [ ] Database migrations applied
- [ ] All services connected (DB, Redis, GCS, etc.)

## Testing Checklist

### 1. Health Checks
```bash
# Replace with your actual Railway URL
export API_URL="https://your-app.railway.app"

# Test health endpoint
curl $API_URL/health
# Should return: {"status": "healthy", ...}

# Test detailed status
curl $API_URL/status
```

### 2. Authentication Endpoints
```bash
# Test user registration
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Test user login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

### 3. User Dashboard Endpoints
```bash
# Get auth token first (from login response)
export TOKEN="your-jwt-token-here"

# Test user profile
curl -X GET $API_URL/api/user/profile \
  -H "Authorization: Bearer $TOKEN"

# Test user history
curl -X GET $API_URL/api/user/history \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Other Core Endpoints
- [ ] Payment endpoints (`/api/payments/*`)
- [ ] Job endpoints (`/api/jobs/*`)
- [ ] File upload endpoints

## Production Monitoring

### 1. Logging
```bash
# View real-time logs
railway logs --follow

# View specific timeframe
railway logs --since 1h
```

### 2. Performance Monitoring
- [ ] Response times acceptable (< 2s for most endpoints)
- [ ] Memory usage stable
- [ ] Database connections healthy
- [ ] Redis connections working

### 3. Error Monitoring
- [ ] No 500 errors in logs
- [ ] Database queries executing successfully
- [ ] External service integrations working (Stripe, SendGrid, GCS)

## Security Verification

### 1. HTTPS & Headers
```bash
# Check security headers
curl -I $API_URL/health
# Should include security headers (X-Frame-Options, etc.)
```

### 2. CORS Configuration
```bash
# Test CORS from your frontend domain
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS $API_URL/api/auth/login
```

### 3. Authentication Security
- [ ] JWT tokens have proper expiration
- [ ] Password hashing working correctly
- [ ] Rate limiting active on auth endpoints

## Custom Domain Setup (Optional)

### 1. Domain Configuration
- [ ] Custom domain added in Railway dashboard
- [ ] DNS records configured (CNAME or A record)
- [ ] SSL certificate provisioned automatically

### 2. Update Environment Variables
- [ ] `CORS_ORIGINS` updated with custom domain
- [ ] Frontend updated to use custom domain

## Troubleshooting Common Issues

### Database Issues
```bash
# Check database connection
railway run python -c "from app import db; db.session.execute('SELECT 1'); print('DB OK')"

# Run migrations manually
railway run python -m flask db upgrade
```

### Redis Issues
```bash
# Check Redis connection
railway run python -c "import redis; r=redis.from_url('redis://localhost:6379'); r.ping(); print('Redis OK')"
```

### Environment Variable Issues
```bash
# List all environment variables
railway variables

# Check specific variable
railway run echo $SECRET_KEY
```

## Final Verification

- [ ] All API endpoints responding correctly
- [ ] Frontend can communicate with backend
- [ ] Payment processing working (test mode first!)
- [ ] File uploads working
- [ ] Email notifications sending
- [ ] User dashboard fully functional
- [ ] Error handling working properly
- [ ] Logs are clean and informative

## Go Live Checklist

- [ ] Switch Stripe to live mode (update keys)
- [ ] Update frontend to production API URL
- [ ] Set up monitoring alerts
- [ ] Document API endpoints for frontend team
- [ ] Create backup and recovery procedures
- [ ] Set up CI/CD pipeline for future deployments

## Support & Maintenance

### Regular Monitoring
- Check logs daily for errors
- Monitor response times and performance
- Review security logs
- Update dependencies regularly

### Backup Strategy
- Database backups (Railway handles this automatically)
- Environment variable backup
- Code repository backup

### Update Process
1. Test changes locally
2. Deploy to staging (if available)
3. Deploy to production
4. Monitor for issues
5. Rollback if necessary

---

**🎉 Congratulations!** Your Oriel Signal FX Pro backend is now running in production on Railway!