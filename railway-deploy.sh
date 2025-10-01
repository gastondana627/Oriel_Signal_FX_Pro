#!/bin/bash

# Railway Deployment Script for Oriel Signal FX Pro Backend
# This script handles the complete deployment process including pre-checks,
# environment setup, and post-deployment verification.

set -e  # Exit on any error

echo "🚀 Starting Railway deployment for Oriel Signal FX Pro Backend..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    print_error "Please login to Railway first:"
    echo "railway login"
    exit 1
fi

print_success "Railway CLI is ready"

# Check if we're in the right directory
if [ ! -f "Procfile" ] || [ ! -f "Dockerfile" ] || [ ! -d "backend" ]; then
    print_error "This doesn't appear to be the Oriel Signal FX Pro project root"
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_success "Project structure verified"

# Check if critical files exist
critical_files=("backend/oriel_backend.py" "backend/config.py" "backend/worker.py" "requirements.txt")
for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Critical file missing: $file"
        exit 1
    fi
done

print_success "Critical files verified"

# Set core environment variables
print_status "Setting core environment variables..."

railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app/backend
railway variables set HTTPS_ONLY=true
railway variables set LOG_LEVEL=INFO

print_success "Core environment variables set"

# Check if add-ons are configured
print_status "Checking Railway add-ons..."

# This is informational - Railway CLI doesn't have a direct way to check add-ons
print_warning "Please ensure PostgreSQL and Redis add-ons are configured:"
print_warning "  - PostgreSQL: Provides DATABASE_URL automatically"
print_warning "  - Redis: Provides REDIS_URL automatically"
print_warning "  - Run './railway-addons-setup.sh' if not already done"

# Environment variables checklist
print_status "Environment variables checklist..."
print_warning "Please ensure these are set in Railway dashboard:"

required_vars=(
    "SECRET_KEY"
    "JWT_SECRET_KEY"
    "ADMIN_EMAIL"
    "ADMIN_PASSWORD"
    "STRIPE_PUBLISHABLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "GCS_BUCKET_NAME"
    "GOOGLE_APPLICATION_CREDENTIALS_JSON"
    "SENDGRID_API_KEY"
    "SENDGRID_FROM_EMAIL"
    "CORS_ORIGINS"
    "FRONTEND_URL"
)

for var in "${required_vars[@]}"; do
    echo "  - $var"
done

echo ""
read -p "Have you set all required environment variables? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please set environment variables first. See railway-env-setup.md for details."
    print_warning "You can also set them after deployment and redeploy."
fi

# Deploy to Railway
print_status "Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    print_success "Deployment initiated successfully!"
else
    print_error "Deployment failed!"
    exit 1
fi

# Post-deployment verification
print_status "Running post-deployment verification..."

# Wait a moment for deployment to start
sleep 5

# Get the deployment URL
RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$RAILWAY_URL" ]; then
    print_success "Deployment URL: $RAILWAY_URL"
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    sleep 10  # Wait for app to start
    
    if curl -f -s "$RAILWAY_URL/health" > /dev/null; then
        print_success "Health check passed!"
    else
        print_warning "Health check failed - app may still be starting"
        print_warning "Check logs: railway logs --follow"
    fi
else
    print_warning "Could not determine deployment URL"
fi

# Final instructions
echo ""
print_success "Deployment complete!"
echo ""
print_status "Next steps:"
echo "1. 🌐 Open your app: railway open"
echo "2. 📊 Check deployment status: railway status"
echo "3. 📝 View logs: railway logs --follow"
echo "4. 🔧 Set up custom domain in Railway dashboard"
echo "5. 🧪 Test API endpoints"
echo "6. 📧 Test email functionality"
echo "7. 💳 Test payment processing"
echo ""
print_status "Useful Railway commands:"
echo "   railway logs --follow    # Follow logs in real-time"
echo "   railway shell           # Access container shell"
echo "   railway status          # Check deployment status"
echo "   railway open            # Open deployed app"
echo "   railway variables       # List environment variables"
echo "   railway restart         # Restart the service"
echo ""
print_status "Monitoring endpoints:"
echo "   /health                 # Health check"
echo "   /status                 # Detailed status"
echo "   /api/info              # API information"
echo ""
print_success "Happy deploying! 🎉"