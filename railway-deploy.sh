#!/bin/bash

# Railway Deployment Script for Oriel Signal FX Pro Backend

echo "🚀 Starting Railway deployment preparation..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"

# Set production environment variables
echo "🔧 Setting up environment variables..."

# Core Flask settings
railway variables set FLASK_ENV=production
railway variables set PYTHONPATH=/app/backend

# Security (you'll need to set these manually with your actual values)
echo "⚠️  Please set these environment variables manually in Railway dashboard:"
echo "   - SECRET_KEY (generate a secure random key)"
echo "   - JWT_SECRET_KEY (generate a secure random key)"
echo "   - STRIPE_PUBLISHABLE_KEY"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - GCS_BUCKET_NAME"
echo "   - GOOGLE_APPLICATION_CREDENTIALS (or upload service account JSON)"
echo "   - SENDGRID_API_KEY"
echo "   - SENDGRID_FROM_EMAIL"
echo "   - CORS_ORIGINS (your frontend domain)"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment initiated!"
echo "📊 Check deployment status: railway status"
echo "📝 View logs: railway logs"
echo "🌐 Open app: railway open"

echo ""
echo "🔗 Next steps:"
echo "1. Set up your custom domain in Railway dashboard"
echo "2. Configure environment variables listed above"
echo "3. Set up PostgreSQL and Redis add-ons if not already done"
echo "4. Test your API endpoints"
echo ""
echo "📚 Useful Railway commands:"
echo "   railway logs --follow    # Follow logs in real-time"
echo "   railway shell           # Access container shell"
echo "   railway status          # Check deployment status"
echo "   railway open            # Open deployed app"