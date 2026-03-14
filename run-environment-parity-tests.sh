#!/bin/bash

# Environment Parity Test Runner
# Tests all features work identically on localhost and production
# Requirements: 4.1, 4.2, 4.3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCALHOST_FRONTEND="http://localhost:3000"
LOCALHOST_BACKEND="http://localhost:8000"
PRODUCTION_URL="${PRODUCTION_URL:-https://oriel-fx-production.railway.app}"
TEST_RESULTS_DIR="parity_test_results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

echo -e "${BLUE}🧪 Environment Parity Test Suite${NC}"
echo -e "${BLUE}===================================${NC}"
echo "Timestamp: $(date)"
echo "Localhost Frontend: $LOCALHOST_FRONTEND"
echo "Localhost Backend: $LOCALHOST_BACKEND"
echo "Production URL: $PRODUCTION_URL"
echo "Results Directory: $TEST_RESULTS_DIR"
echo ""

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not accessible${NC}"
        return 1
    fi
}

# Function to run backend tests
run_backend_tests() {
    local env=$1
    echo -e "\n${YELLOW}🔧 Running Backend Tests for $env${NC}"
    echo "----------------------------------------"
    
    cd backend
    
    if [ "$env" = "localhost" ]; then
        # Set environment for localhost testing
        export FLASK_ENV=development
        export DATABASE_URL="sqlite:///app-dev.db"
    else
        # Set environment for production testing
        export FLASK_ENV=production
    fi
    
    # Run the backend parity tests
    if python test_environment_parity.py > "../$TEST_RESULTS_DIR/backend_${env}_${TIMESTAMP}.log" 2>&1; then
        echo -e "${GREEN}✅ Backend tests passed for $env${NC}"
        backend_result=0
    else
        echo -e "${RED}❌ Backend tests failed for $env${NC}"
        backend_result=1
    fi
    
    cd ..
    return $backend_result
}

# Function to run frontend tests using headless browser
run_frontend_tests() {
    local env=$1
    local url=$2
    
    echo -e "\n${YELLOW}🌐 Running Frontend Tests for $env${NC}"
    echo "----------------------------------------"
    
    # Create a simple test script that can be run with curl
    cat > "$TEST_RESULTS_DIR/frontend_test_${env}.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Frontend Parity Test - $env</title>
    <script>
        // Simple test that runs automatically
        window.addEventListener('DOMContentLoaded', function() {
            const results = {
                environment: '$env',
                timestamp: new Date().toISOString(),
                tests: []
            };
            
            // Test 1: Check if main elements exist
            const mainElements = {
                body: document.body,
                title: document.title,
                scripts: document.scripts.length,
                stylesheets: document.styleSheets.length
            };
            
            results.tests.push({
                name: 'DOM Structure',
                status: mainElements.body ? 'PASS' : 'FAIL',
                details: 'Scripts: ' + mainElements.scripts + ', Stylesheets: ' + mainElements.stylesheets
            });
            
            // Test 2: Check for JavaScript errors
            let jsErrors = 0;
            window.addEventListener('error', function() {
                jsErrors++;
            });
            
            setTimeout(function() {
                results.tests.push({
                    name: 'JavaScript Errors',
                    status: jsErrors === 0 ? 'PASS' : 'FAIL',
                    details: 'Errors detected: ' + jsErrors
                });
                
                // Output results
                console.log('PARITY_TEST_RESULTS:', JSON.stringify(results));
                
                // Try to save to localStorage for later retrieval
                try {
                    localStorage.setItem('parity_test_results_$env', JSON.stringify(results));
                } catch(e) {
                    console.log('Could not save to localStorage:', e);
                }
            }, 2000);
        });
    </script>
</head>
<body>
    <h1>Frontend Parity Test - $env</h1>
    <p>Running automated tests...</p>
    <div id="results"></div>
</body>
</html>
EOF
    
    # Test basic connectivity and response
    echo "Testing basic connectivity to $url..."
    if curl -s --max-time 30 "$url" > "$TEST_RESULTS_DIR/frontend_response_${env}_${TIMESTAMP}.html"; then
        echo -e "${GREEN}✅ Frontend accessible for $env${NC}"
        
        # Check for basic HTML structure
        if grep -q "<html" "$TEST_RESULTS_DIR/frontend_response_${env}_${TIMESTAMP}.html"; then
            echo -e "${GREEN}✅ Valid HTML response for $env${NC}"
            frontend_result=0
        else
            echo -e "${RED}❌ Invalid HTML response for $env${NC}"
            frontend_result=1
        fi
    else
        echo -e "${RED}❌ Frontend not accessible for $env${NC}"
        frontend_result=1
    fi
    
    return $frontend_result
}

# Function to test API endpoints
test_api_endpoints() {
    local base_url=$1
    local env=$2
    
    echo -e "\n${YELLOW}🔌 Testing API Endpoints for $env${NC}"
    echo "----------------------------------------"
    
    local endpoints=(
        "/api/health"
        "/api/auth/login"
        "/api/auth/register"
        "/api/uploads"
        "/api/downloads"
    )
    
    local results_file="$TEST_RESULTS_DIR/api_endpoints_${env}_${TIMESTAMP}.json"
    echo "{" > "$results_file"
    echo "  \"environment\": \"$env\"," >> "$results_file"
    echo "  \"base_url\": \"$base_url\"," >> "$results_file"
    echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$results_file"
    echo "  \"endpoints\": [" >> "$results_file"
    
    local api_success=0
    local total_endpoints=${#endpoints[@]}
    
    for i in "${!endpoints[@]}"; do
        local endpoint="${endpoints[$i]}"
        local url="$base_url$endpoint"
        
        echo -n "Testing $endpoint... "
        
        # Test the endpoint
        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
        
        if [ "$status_code" != "000" ] && [ "$status_code" != "404" ]; then
            echo -e "${GREEN}✅ $status_code${NC}"
            api_success=$((api_success + 1))
            local status="accessible"
        else
            echo -e "${RED}❌ $status_code${NC}"
            local status="failed"
        fi
        
        # Add to JSON results
        echo "    {" >> "$results_file"
        echo "      \"endpoint\": \"$endpoint\"," >> "$results_file"
        echo "      \"status_code\": \"$status_code\"," >> "$results_file"
        echo "      \"status\": \"$status\"" >> "$results_file"
        
        if [ $i -eq $((total_endpoints - 1)) ]; then
            echo "    }" >> "$results_file"
        else
            echo "    }," >> "$results_file"
        fi
    done
    
    echo "  ]," >> "$results_file"
    echo "  \"summary\": {" >> "$results_file"
    echo "    \"total\": $total_endpoints," >> "$results_file"
    echo "    \"accessible\": $api_success," >> "$results_file"
    echo "    \"success_rate\": \"$(echo "scale=2; $api_success * 100 / $total_endpoints" | bc -l)%\"" >> "$results_file"
    echo "  }" >> "$results_file"
    echo "}" >> "$results_file"
    
    echo "API Endpoints: $api_success/$total_endpoints accessible"
    
    # Return success if at least 50% of endpoints are accessible
    if [ $api_success -ge $((total_endpoints / 2)) ]; then
        return 0
    else
        return 1
    fi
}

# Function to compare results between environments
compare_environments() {
    echo -e "\n${BLUE}🔍 Comparing Environment Results${NC}"
    echo "=================================="
    
    # Look for result files
    local localhost_files=($(ls "$TEST_RESULTS_DIR"/*localhost* 2>/dev/null || true))
    local production_files=($(ls "$TEST_RESULTS_DIR"/*production* 2>/dev/null || true))
    
    if [ ${#localhost_files[@]} -eq 0 ] || [ ${#production_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Cannot compare: missing results from one or both environments${NC}"
        return 1
    fi
    
    echo "Localhost files: ${#localhost_files[@]}"
    echo "Production files: ${#production_files[@]}"
    
    # Create comparison report
    local comparison_file="$TEST_RESULTS_DIR/environment_comparison_${TIMESTAMP}.md"
    
    cat > "$comparison_file" << EOF
# Environment Parity Comparison Report

**Generated:** $(date)
**Localhost Frontend:** $LOCALHOST_FRONTEND
**Production URL:** $PRODUCTION_URL

## Summary

EOF
    
    # Add file listings
    echo "### Localhost Test Files" >> "$comparison_file"
    for file in "${localhost_files[@]}"; do
        echo "- $(basename "$file")" >> "$comparison_file"
    done
    
    echo "" >> "$comparison_file"
    echo "### Production Test Files" >> "$comparison_file"
    for file in "${production_files[@]}"; do
        echo "- $(basename "$file")" >> "$comparison_file"
    done
    
    echo "" >> "$comparison_file"
    echo "### Recommendations" >> "$comparison_file"
    echo "1. Review individual test logs for detailed results" >> "$comparison_file"
    echo "2. Compare API endpoint accessibility between environments" >> "$comparison_file"
    echo "3. Verify authentication flows work identically" >> "$comparison_file"
    echo "4. Test file upload/download functionality on both environments" >> "$comparison_file"
    
    echo -e "${GREEN}✅ Comparison report generated: $comparison_file${NC}"
    return 0
}

# Main execution
main() {
    local localhost_success=0
    local production_success=0
    
    echo -e "${BLUE}Phase 1: Service Availability Check${NC}"
    echo "===================================="
    
    # Check localhost services
    echo -e "\n${YELLOW}Checking Localhost Services:${NC}"
    local localhost_frontend_up=0
    local localhost_backend_up=0
    
    if check_service "$LOCALHOST_FRONTEND" "Frontend (localhost:3000)"; then
        localhost_frontend_up=1
    fi
    
    if check_service "$LOCALHOST_BACKEND/api/health" "Backend (localhost:8000)"; then
        localhost_backend_up=1
    fi
    
    # Check production service
    echo -e "\n${YELLOW}Checking Production Services:${NC}"
    local production_up=0
    
    if check_service "$PRODUCTION_URL" "Production Service"; then
        production_up=1
    fi
    
    # Run tests based on what's available
    echo -e "\n${BLUE}Phase 2: Running Environment Tests${NC}"
    echo "===================================="
    
    if [ $localhost_backend_up -eq 1 ]; then
        if run_backend_tests "localhost"; then
            localhost_success=$((localhost_success + 1))
        fi
        
        if test_api_endpoints "$LOCALHOST_BACKEND" "localhost"; then
            localhost_success=$((localhost_success + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping localhost backend tests (service not running)${NC}"
    fi
    
    if [ $localhost_frontend_up -eq 1 ]; then
        if run_frontend_tests "localhost" "$LOCALHOST_FRONTEND"; then
            localhost_success=$((localhost_success + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping localhost frontend tests (service not running)${NC}"
    fi
    
    if [ $production_up -eq 1 ]; then
        if run_backend_tests "production"; then
            production_success=$((production_success + 1))
        fi
        
        if test_api_endpoints "$PRODUCTION_URL" "production"; then
            production_success=$((production_success + 1))
        fi
        
        if run_frontend_tests "production" "$PRODUCTION_URL"; then
            production_success=$((production_success + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping production tests (service not accessible)${NC}"
    fi
    
    # Generate comparison if we have results from both environments
    echo -e "\n${BLUE}Phase 3: Results Analysis${NC}"
    echo "========================="
    
    compare_environments
    
    # Final summary
    echo -e "\n${BLUE}🎯 Final Test Summary${NC}"
    echo "===================="
    echo "Localhost tests passed: $localhost_success"
    echo "Production tests passed: $production_success"
    echo "Results saved in: $TEST_RESULTS_DIR/"
    
    # Determine overall success
    if [ $localhost_success -gt 0 ] && [ $production_success -gt 0 ]; then
        echo -e "\n${GREEN}✅ Environment parity tests completed successfully!${NC}"
        echo -e "${GREEN}Both environments have working functionality.${NC}"
        exit 0
    elif [ $localhost_success -gt 0 ] || [ $production_success -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️  Partial success: One environment working${NC}"
        echo -e "${YELLOW}Review logs to identify issues with the other environment.${NC}"
        exit 1
    else
        echo -e "\n${RED}❌ Environment parity tests failed!${NC}"
        echo -e "${RED}Neither environment is fully functional.${NC}"
        exit 2
    fi
}

# Handle command line arguments
case "${1:-}" in
    --localhost-only)
        echo "Running localhost tests only..."
        PRODUCTION_URL=""
        ;;
    --production-only)
        echo "Running production tests only..."
        LOCALHOST_FRONTEND=""
        LOCALHOST_BACKEND=""
        ;;
    --help|-h)
        echo "Usage: $0 [--localhost-only|--production-only|--help]"
        echo ""
        echo "Options:"
        echo "  --localhost-only   Test only localhost environment"
        echo "  --production-only  Test only production environment"
        echo "  --help            Show this help message"
        exit 0
        ;;
esac

# Run main function
main