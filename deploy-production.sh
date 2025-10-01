#!/bin/bash

# Oriel FX SaaS - Production Deployment Script
# This script prepares and deploys the application to production

set -e  # Exit on any error

echo "🚀 Oriel FX SaaS - Production Deployment"
echo "========================================"

# Configuration
FRONTEND_DIST_DIR="dist"
BACKEND_DIR="backend"
PRODUCTION_CONFIG="app-config.production.js"
DEVELOPMENT_CONFIG="app-config.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "index.html" ] || [ ! -d "$BACKEND_DIR" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Pre-deployment checks
log_info "Step 1: Running pre-deployment checks..."

# Check if production config exists
if [ ! -f "$PRODUCTION_CONFIG" ]; then
    log_error "Production configuration file not found: $PRODUCTION_CONFIG"
    log_info "Please create $PRODUCTION_CONFIG with your production settings"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    log_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if required files exist
required_files=(
    "index.html"
    "style.css"
    "script.js"
    "graph.js"
    "auth-manager.js"
    "payment-manager.js"
    "dashboard-ui.js"
    "saas-init.js"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Required file not found: $file"
        exit 1
    fi
done

log_success "Pre-deployment checks passed"

# Step 2: Create distribution directory
log_info "Step 2: Creating distribution directory..."

if [ -d "$FRONTEND_DIST_DIR" ]; then
    log_warning "Distribution directory exists, removing..."
    rm -rf "$FRONTEND_DIST_DIR"
fi

mkdir -p "$FRONTEND_DIST_DIR"
mkdir -p "$FRONTEND_DIST_DIR/assets"

log_success "Distribution directory created"

# Step 3: Copy and prepare frontend files
log_info "Step 3: Preparing frontend files for production..."

# Copy HTML files
cp index.html "$FRONTEND_DIST_DIR/"
cp integration-test-runner.html "$FRONTEND_DIST_DIR/" 2>/dev/null || true

# Copy CSS files
cp style.css "$FRONTEND_DIST_DIR/"

# Copy JavaScript files
js_files=(
    "script.js"
    "graph.js"
    "api-client.js"
    "notification-manager.js"
    "auth-manager.js"
    "auth-ui.js"
    "usage-tracker.js"
    "payment-manager.js"
    "payment-ui.js"
    "payment-integration.js"
    "dashboard-ui.js"
    "preferences-manager.js"
    "sync-manager.js"
    "offline-manager.js"
    "feature-manager.js"
    "premium-recording.js"
    "premium-customization.js"
    "checkout-flow.js"
    "analytics-manager.js"
    "performance-monitor.js"
    "error-monitor.js"
    "monitoring-integration.js"
    "saas-init.js"
)

for file in "${js_files[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$FRONTEND_DIST_DIR/"
    else
        log_warning "JavaScript file not found: $file"
    fi
done

# Use production configuration
cp "$PRODUCTION_CONFIG" "$FRONTEND_DIST_DIR/app-config.js"

# Copy assets
if [ -d "assets" ]; then
    cp -r assets/* "$FRONTEND_DIST_DIR/assets/"
fi

log_success "Frontend files prepared"

# Step 4: Update HTML file for production
log_info "Step 4: Updating HTML for production..."

# Update index.html to remove development-only scripts
sed -i.bak 's/<!-- Integration Test (development only) -->/<!-- Integration Test (removed in production) -->/' "$FRONTEND_DIST_DIR/index.html"
sed -i.bak '/integration-test\.js/d' "$FRONTEND_DIST_DIR/index.html"

# Remove backup file
rm "$FRONTEND_DIST_DIR/index.html.bak" 2>/dev/null || true

log_success "HTML updated for production"

# Step 5: Validate production configuration
log_info "Step 5: Validating production configuration..."

# Check if production config has placeholder values
if grep -q "your-backend-domain" "$FRONTEND_DIST_DIR/app-config.js"; then
    log_error "Production configuration contains placeholder values"
    log_info "Please update the following in $PRODUCTION_CONFIG:"
    log_info "  - Replace 'your-backend-domain.railway.app' with actual backend URL"
    log_info "  - Replace 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY' with actual Stripe key"
    log_info "  - Replace 'GA_TRACKING_ID' with actual Google Analytics ID"
    log_info "  - Replace 'SENTRY_DSN' with actual Sentry DSN"
    exit 1
fi

log_success "Production configuration validated"

# Step 6: Create deployment package
log_info "Step 6: Creating deployment package..."

# Create a tarball of the frontend
tar -czf "oriel-fx-frontend-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$FRONTEND_DIST_DIR" .

log_success "Deployment package created"

# Step 7: Backend deployment preparation
log_info "Step 7: Preparing backend for deployment..."

cd "$BACKEND_DIR"

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    log_error "Backend requirements.txt not found"
    exit 1
fi

# Check if main application file exists
if [ ! -f "oriel_backend.py" ]; then
    log_error "Backend main file (oriel_backend.py) not found"
    exit 1
fi

# Create production requirements if it doesn't exist
if [ ! -f "requirements-prod.txt" ]; then
    log_info "Creating production requirements file..."
    cp requirements.txt requirements-prod.txt
    
    # Add production-specific packages
    echo "" >> requirements-prod.txt
    echo "# Production-specific packages" >> requirements-prod.txt
    echo "gunicorn>=20.1.0" >> requirements-prod.txt
    echo "psycopg2-binary>=2.9.0" >> requirements-prod.txt
fi

cd ..

log_success "Backend prepared for deployment"

# Step 8: Generate deployment instructions
log_info "Step 8: Generating deployment instructions..."

cat > DEPLOYMENT_INSTRUCTIONS.md << EOF
# Oriel FX SaaS - Deployment Instructions

## Generated on: $(date)

### Frontend Deployment

1. **Upload Frontend Files**
   - Upload all files from the \`$FRONTEND_DIST_DIR\` directory to your static hosting service
   - Recommended services: Netlify, Vercel, GitHub Pages, or any CDN

2. **Configure Domain**
   - Point your domain to the static hosting service
   - Ensure HTTPS is enabled
   - Configure custom domain if needed

### Backend Deployment (Railway)

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Select the \`$BACKEND_DIR\` directory as the root

2. **Environment Variables**
   Set the following environment variables in Railway:
   \`\`\`
   DATABASE_URL=postgresql://...  # Railway will provide this
   STRIPE_SECRET_KEY=sk_live_...  # Your Stripe secret key
   STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret
   JWT_SECRET_KEY=your-secure-random-key
   CORS_ORIGINS=https://your-frontend-domain.com
   FLASK_ENV=production
   \`\`\`

3. **Deploy**
   - Railway will automatically deploy when you push to your main branch
   - Monitor the deployment logs for any issues

### Post-Deployment Steps

1. **Update Frontend Configuration**
   - Update the backend URL in your production config
   - Redeploy frontend with updated configuration

2. **Test the Integration**
   - Visit your frontend URL
   - Test user registration and login
   - Test payment flow (in test mode first)
   - Verify all functionality works

3. **Configure Stripe Webhooks**
   - Add webhook endpoint: https://your-backend-domain.railway.app/api/payments/webhook
   - Select events: payment_intent.succeeded, payment_intent.payment_failed

4. **Monitor and Verify**
   - Check application logs
   - Monitor error rates
   - Verify performance metrics

### Rollback Plan

If issues occur:
1. Revert to previous frontend deployment
2. Rollback backend deployment in Railway
3. Check database for any needed rollbacks

### Support

For deployment issues:
- Check the deployment logs
- Verify all environment variables are set
- Ensure database migrations have run
- Contact support if needed

EOF

log_success "Deployment instructions generated"

# Step 9: Final summary
echo ""
echo "🎉 Production Deployment Preparation Complete!"
echo "=============================================="
echo ""
log_success "Frontend files prepared in: $FRONTEND_DIST_DIR"
log_success "Deployment package created: oriel-fx-frontend-*.tar.gz"
log_success "Backend prepared for Railway deployment"
log_success "Deployment instructions: DEPLOYMENT_INSTRUCTIONS.md"
echo ""
log_info "Next steps:"
echo "  1. Review and update production configuration values"
echo "  2. Deploy backend to Railway with environment variables"
echo "  3. Deploy frontend to static hosting service"
echo "  4. Update frontend config with actual backend URL"
echo "  5. Test the complete integration"
echo ""
log_warning "Important: Test thoroughly before going live!"
echo ""

# Step 10: Optional - run integration tests
read -p "Would you like to run integration tests now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Opening integration test runner..."
    if command -v python3 &> /dev/null; then
        python3 -m http.server 3000 &
        SERVER_PID=$!
        sleep 2
        
        if command -v open &> /dev/null; then
            open http://localhost:3000/integration-test-runner.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000/integration-test-runner.html
        else
            log_info "Please open http://localhost:3000/integration-test-runner.html in your browser"
        fi
        
        read -p "Press Enter when done testing..."
        kill $SERVER_PID 2>/dev/null || true
    else
        log_warning "Python3 not found. Please serve the files manually and test."
    fi
fi

log_success "Deployment preparation completed successfully!"