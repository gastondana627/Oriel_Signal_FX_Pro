#!/bin/bash

# Railway Add-ons Setup Script for Oriel Signal FX Pro Backend

echo "🔧 Setting up Railway add-ons for Oriel Signal FX Pro..."

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

# Link to existing project or create new one
echo "🔗 Linking to Railway project..."
echo "If this is a new deployment, create a project first:"
echo "railway init"
echo ""
read -p "Press Enter to continue once your project is ready..."

# Add PostgreSQL database
echo "🐘 Adding PostgreSQL database..."
railway add postgresql

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL database added successfully"
    echo "📝 DATABASE_URL environment variable will be automatically set"
else
    echo "❌ Failed to add PostgreSQL database"
    echo "💡 You can also add it manually from the Railway dashboard"
fi

# Add Redis for job queue
echo "🔴 Adding Redis for job queue..."
railway add redis

if [ $? -eq 0 ]; then
    echo "✅ Redis added successfully"
    echo "📝 REDIS_URL environment variable will be automatically set"
else
    echo "❌ Failed to add Redis"
    echo "💡 You can also add it manually from the Railway dashboard"
fi

echo ""
echo "🎉 Add-ons setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify add-ons in Railway dashboard: railway open"
echo "2. Check environment variables: railway variables"
echo "3. Deploy your application: railway up"
echo ""
echo "🔍 Verify add-ons are working:"
echo "   railway logs --follow"
echo "   curl https://your-app.railway.app/health"
echo ""
echo "📚 Useful commands:"
echo "   railway status          # Check deployment status"
echo "   railway logs           # View application logs"
echo "   railway shell          # Access container shell"
echo "   railway variables      # List environment variables"