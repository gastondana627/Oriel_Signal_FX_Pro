# Oriel FX SaaS - Production Deployment Guide

This guide walks you through deploying the Oriel FX SaaS application to production.

## Prerequisites

- [x] Backend development and testing completed
- [x] Frontend integration completed
- [x] All integration tests passing
- [x] Production environment variables prepared
- [x] Domain names registered (frontend and backend)
- [x] SSL certificates ready (or using service-provided SSL)

## Deployment Architecture

```
┌─────────────────┐    HTTPS    ┌─────────────────┐
│   Frontend      │◄──────────►│   Backend       │
│   (Static Host) │             │   (Railway)     │
│                 │             │                 │
│ • Netlify       │             │ • Python Flask │
│ • Vercel        │             │ • PostgreSQL   │
│ • GitHub Pages  │             │ • Redis Cache  │
└─────────────────┘             └─────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│   CDN/Edge      │             │   Stripe API    │
│   (Optional)    │             │   (Payments)    │
└─────────────────┘             └─────────────────┘
```

## Step 1: Backend Deployment (Railway)

### 1.1 Prepare Railway Project

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub account
   - Create new project

2. **Connect Repository**
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

3. **Deploy to Railway**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose the `backend` folder as root directory

### 1.2 Configure Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Database (Railway will provide DATABASE_URL automatically)
# Just add PostgreSQL addon to your project

# JWT Configuration
JWT_SECRET_KEY=your-super-secure-random-jwt-secret-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# CORS Configuration
CORS_ORIGINS=https://your-frontend-domain.com

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False

# Security
SECRET_KEY=your-flask-secret-key-here
```

### 1.3 Add Database

1. **Add PostgreSQL**
   - In Railway dashboard, click "Add Service"
   - Select "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

2. **Run Migrations**
   - Railway will automatically run migrations on deployment
   - Monitor deployment logs to ensure success

### 1.4 Configure Custom Domain (Optional)

1. **Add Custom Domain**
   - In Railway service settings, go to "Domains"
   - Add your backend domain (e.g., `api.yourdomain.com`)
   - Update DNS records as instructed

2. **SSL Certificate**
   - Railway provides automatic SSL certificates
   - Verify HTTPS is working

## Step 2: Frontend Deployment

### 2.1 Prepare Frontend Files

1. **Run Deployment Script**
   ```bash
   ./deploy-production.sh
   ```

2. **Update Production Configuration**
   - Edit `app-config.production.js`
   - Replace placeholder values with actual production values:
     ```javascript
     api: {
         baseUrl: 'https://your-backend-domain.railway.app'
     },
     stripe: {
         publishableKey: 'pk_live_your_stripe_publishable_key'
     }
     ```

3. **Re-run Deployment Script**
   ```bash
   ./deploy-production.sh
   ```

### 2.2 Deploy to Static Hosting

#### Option A: Netlify

1. **Deploy via Drag & Drop**
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder to deploy
   - Or connect GitHub repository

2. **Configure Custom Domain**
   - In site settings, add custom domain
   - Update DNS records
   - SSL is automatic

#### Option B: Vercel

1. **Deploy via CLI**
   ```bash
   npm install -g vercel
   cd dist
   vercel --prod
   ```

2. **Configure Domain**
   - Add custom domain in Vercel dashboard
   - Update DNS records

#### Option C: GitHub Pages

1. **Create gh-pages Branch**
   ```bash
   git checkout -b gh-pages
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

2. **Enable GitHub Pages**
   - Go to repository settings
   - Enable Pages from gh-pages branch

### 2.3 Update Backend CORS

After frontend deployment, update backend CORS settings:

```bash
# In Railway environment variables
CORS_ORIGINS=https://your-actual-frontend-domain.com
```

## Step 3: Configure Third-Party Services

### 3.1 Stripe Configuration

1. **Switch to Live Mode**
   - In Stripe dashboard, toggle to "Live mode"
   - Get live API keys

2. **Configure Webhooks**
   - Add webhook endpoint: `https://your-backend-domain.railway.app/api/payments/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Test Payments**
   - Use Stripe test cards in live mode
   - Verify webhook delivery

### 3.2 Analytics Setup (Optional)

1. **Google Analytics**
   - Create GA4 property
   - Get Measurement ID
   - Update frontend configuration

2. **Error Monitoring (Sentry)**
   - Create Sentry project
   - Get DSN
   - Update configuration

## Step 4: DNS Configuration

### 4.1 Frontend Domain

```bash
# A Record or CNAME (depending on hosting service)
your-domain.com → hosting-service-ip-or-cname
www.your-domain.com → hosting-service-ip-or-cname
```

### 4.2 Backend Domain (if using custom domain)

```bash
# CNAME Record
api.your-domain.com → your-app.railway.app
```

## Step 5: Testing and Verification

### 5.1 Automated Testing

1. **Run Integration Tests**
   ```bash
   # Open in browser
   https://your-frontend-domain.com/integration-test-runner.html
   ```

2. **Verify All Tests Pass**
   - Backend connectivity ✅
   - Authentication flow ✅
   - Payment integration ✅
   - Dashboard functionality ✅

### 5.2 Manual Testing

1. **User Registration Flow**
   - [ ] Register new user
   - [ ] Verify email (if enabled)
   - [ ] Login with new account

2. **Payment Flow**
   - [ ] Reach download limit
   - [ ] Upgrade to paid plan
   - [ ] Verify payment processing
   - [ ] Confirm feature unlock

3. **Core Functionality**
   - [ ] Audio visualization works
   - [ ] Download GIF works
   - [ ] Download MP3 works
   - [ ] Usage tracking works

### 5.3 Performance Testing

1. **Page Load Speed**
   - Use Google PageSpeed Insights
   - Target: >90 score

2. **API Response Times**
   - Monitor Railway metrics
   - Target: <500ms average

## Step 6: Monitoring and Maintenance

### 6.1 Set Up Monitoring

1. **Railway Monitoring**
   - Monitor deployment logs
   - Set up alerts for errors
   - Monitor resource usage

2. **Frontend Monitoring**
   - Set up uptime monitoring
   - Monitor JavaScript errors
   - Track user analytics

### 6.2 Backup Strategy

1. **Database Backups**
   - Railway provides automatic backups
   - Consider additional backup strategy

2. **Code Backups**
   - Ensure code is in version control
   - Tag production releases

## Step 7: Go-Live Checklist

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Environment variables set
- [ ] Database migrations complete
- [ ] Stripe webhooks configured
- [ ] Integration tests passing
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Backup strategy in place
- [ ] Team notified of go-live

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS_ORIGINS includes frontend domain
   - Check for trailing slashes
   - Ensure HTTPS is used

2. **Payment Failures**
   - Verify Stripe keys are for live mode
   - Check webhook endpoint is accessible
   - Verify webhook secret matches

3. **Database Connection Issues**
   - Check DATABASE_URL is set correctly
   - Verify database is accessible
   - Check connection pool settings

4. **Frontend Not Loading**
   - Verify all files uploaded correctly
   - Check browser console for errors
   - Verify API URL is correct

### Getting Help

1. **Railway Support**
   - Check Railway documentation
   - Use Railway Discord community
   - Contact Railway support

2. **Stripe Support**
   - Check Stripe documentation
   - Use Stripe support chat
   - Check webhook logs

3. **General Issues**
   - Check application logs
   - Review error monitoring
   - Contact development team

## Rollback Plan

If issues occur after deployment:

1. **Frontend Rollback**
   - Revert to previous deployment
   - Or serve from backup files

2. **Backend Rollback**
   - Use Railway's deployment history
   - Rollback to previous version
   - Verify database compatibility

3. **Database Rollback**
   - Use Railway database backups
   - Or restore from external backup
   - Test data integrity

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to version control
   - Use Railway's secure variable storage
   - Regularly rotate API keys

2. **HTTPS Enforcement**
   - Ensure all traffic uses HTTPS
   - Set security headers
   - Use HSTS

3. **API Security**
   - Enable rate limiting
   - Validate all inputs
   - Monitor for suspicious activity

## Performance Optimization

1. **Frontend Optimization**
   - Enable gzip compression
   - Use CDN for static assets
   - Optimize images and assets

2. **Backend Optimization**
   - Enable database connection pooling
   - Use Redis for caching
   - Monitor and optimize queries

3. **Monitoring**
   - Set up performance alerts
   - Monitor user experience
   - Track key metrics

---

**Congratulations!** 🎉 Your Oriel FX SaaS application is now live in production!

Remember to monitor the application closely in the first few days and be prepared to address any issues quickly.