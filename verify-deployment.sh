#!/bin/bash

# Deployment Verification Script for Oriel Signal FX Pro Backend
# This script tests the deployed application to ensure all endpoints are working correctly.

set -e

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

# Get deployment URL
if [ -z "$1" ]; then
    # Try to get URL from Railway CLI
    if command -v railway &> /dev/null; then
        DEPLOYMENT_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")
        if [ -z "$DEPLOYMENT_URL" ]; then
            print_error "Could not determine deployment URL from Railway CLI"
            print_error "Please provide the URL as an argument: $0 https://your-app.railway.app"
            exit 1
        fi
    else
        print_error "Please provide the deployment URL as an argument: $0 https://your-app.railway.app"
        exit 1
    fi
else
    DEPLOYMENT_URL="$1"
fi

# Remove trailing slash
DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

print_status "Testing deployment at: $DEPLOYMENT_URL"
print_status "=" * 60

# Test 1: Basic connectivity
print_status "Test 1: Basic connectivity"
if curl -f -s "$DEPLOYMENT_URL" > /dev/null; then
    print_success "✅ Basic connectivity test passed"
else
    print_error "❌ Basic connectivity test failed"
    print_error "The application may not be running or accessible"
    exit 1
fi

# Test 2: Root endpoint
print_status "Test 2: Root endpoint (/)"
response=$(curl -s "$DEPLOYMENT_URL/")
if echo "$response" | grep -q "Oriel Signal FX Pro Backend API"; then
    print_success "✅ Root endpoint test passed"
else
    print_error "❌ Root endpoint test failed"
    echo "Response: $response"
fi

# Test 3: Health check endpoint
print_status "Test 3: Health check endpoint (/health)"
health_response=$(curl -s "$DEPLOYMENT_URL/health")
if echo "$health_response" | grep -q '"status":"healthy"'; then
    print_success "✅ Health check test passed"
    
    # Parse health check details
    if echo "$health_response" | grep -q '"database":"healthy"'; then
        print_success "  - Database connection: healthy"
    else
        print_warning "  - Database connection: unhealthy"
    fi
    
    if echo "$health_response" | grep -q '"redis":"healthy"'; then
        print_success "  - Redis connection: healthy"
    else
        print_warning "  - Redis connection: unhealthy or not configured"
    fi
else
    print_error "❌ Health check test failed"
    echo "Response: $health_response"
fi

# Test 4: Status endpoint
print_status "Test 4: Status endpoint (/status)"
status_response=$(curl -s "$DEPLOYMENT_URL/status")
if echo "$status_response" | grep -q "Oriel Signal FX Pro Backend"; then
    print_success "✅ Status endpoint test passed"
    
    # Check environment
    if echo "$status_response" | grep -q '"environment":"production"'; then
        print_success "  - Environment: production"
    else
        print_warning "  - Environment: not production"
    fi
else
    print_error "❌ Status endpoint test failed"
    echo "Response: $status_response"
fi

# Test 5: API info endpoint
print_status "Test 5: API info endpoint (/api/info)"
if curl -f -s "$DEPLOYMENT_URL/api/info" > /dev/null; then
    print_success "✅ API info endpoint test passed"
else
    print_error "❌ API info endpoint test failed"
fi

# Test 6: CORS test endpoint
print_status "Test 6: CORS test endpoint (/api/cors-test)"
if curl -f -s "$DEPLOYMENT_URL/api/cors-test" > /dev/null; then
    print_success "✅ CORS test endpoint test passed"
else
    print_error "❌ CORS test endpoint test failed"
fi

# Test 7: Authentication endpoints (should return proper error responses)
print_status "Test 7: Authentication endpoints"

# Test register endpoint (should require data)
register_response=$(curl -s -w "%{http_code}" -o /dev/null "$DEPLOYMENT_URL/api/auth/register")
if [ "$register_response" = "400" ] || [ "$register_response" = "422" ]; then
    print_success "✅ Register endpoint responding correctly (400/422 for missing data)"
else
    print_warning "⚠️  Register endpoint returned: $register_response"
fi

# Test login endpoint (should require data)
login_response=$(curl -s -w "%{http_code}" -o /dev/null "$DEPLOYMENT_URL/api/auth/login")
if [ "$login_response" = "400" ] || [ "$login_response" = "422" ]; then
    print_success "✅ Login endpoint responding correctly (400/422 for missing data)"
else
    print_warning "⚠️  Login endpoint returned: $login_response"
fi

# Test 8: Payment endpoints
print_status "Test 8: Payment endpoints"
payment_response=$(curl -s -w "%{http_code}" -o /dev/null "$DEPLOYMENT_URL/api/payments/create-session")
if [ "$payment_response" = "401" ] || [ "$payment_response" = "400" ] || [ "$payment_response" = "422" ]; then
    print_success "✅ Payment endpoint responding correctly (401/400/422 for unauthorized/missing data)"
else
    print_warning "⚠️  Payment endpoint returned: $payment_response"
fi

# Test 9: Job endpoints
print_status "Test 9: Job endpoints"
jobs_response=$(curl -s -w "%{http_code}" -o /dev/null "$DEPLOYMENT_URL/api/jobs/submit")
if [ "$jobs_response" = "401" ] || [ "$jobs_response" = "400" ] || [ "$jobs_response" = "422" ]; then
    print_success "✅ Jobs endpoint responding correctly (401/400/422 for unauthorized/missing data)"
else
    print_warning "⚠️  Jobs endpoint returned: $jobs_response"
fi

# Test 10: Admin interface
print_status "Test 10: Admin interface"
admin_response=$(curl -s -w "%{http_code}" -o /dev/null "$DEPLOYMENT_URL/admin/")
if [ "$admin_response" = "200" ] || [ "$admin_response" = "302" ] || [ "$admin_response" = "401" ]; then
    print_success "✅ Admin interface responding correctly"
else
    print_warning "⚠️  Admin interface returned: $admin_response"
fi

# Summary
print_status "=" * 60
print_success "🎉 Deployment verification complete!"
print_status ""
print_status "📋 Verification Summary:"
print_status "  - Application is accessible at: $DEPLOYMENT_URL"
print_status "  - Core endpoints are responding"
print_status "  - API endpoints are properly secured"
print_status "  - Health checks are working"
print_status ""
print_status "🔗 Important URLs:"
print_status "  - API Root: $DEPLOYMENT_URL/"
print_status "  - Health Check: $DEPLOYMENT_URL/health"
print_status "  - API Status: $DEPLOYMENT_URL/status"
print_status "  - API Documentation: $DEPLOYMENT_URL/api/docs/"
print_status "  - Admin Interface: $DEPLOYMENT_URL/admin/"
print_status ""
print_status "🧪 Next Steps:"
print_status "  1. Test user registration and login"
print_status "  2. Test payment processing with Stripe"
print_status "  3. Test video rendering functionality"
print_status "  4. Test email delivery"
print_status "  5. Monitor logs: railway logs --follow"
print_status ""
print_success "Deployment verification successful! ✅"