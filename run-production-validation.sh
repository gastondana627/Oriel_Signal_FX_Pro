#!/bin/bash

# Production Readiness Validation Runner
# Simple script to run comprehensive production validation
# Requirements: 6.1, 6.2, 6.3, 9.4

set -e

echo "🚀 Production Readiness Validation Runner"
echo "========================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js to continue"
    exit 1
fi

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    echo "Please install Python to continue"
    exit 1
fi

# Check if required files exist
REQUIRED_FILES=(
    "production-readiness-validator.js"
    "monitoring-alerting-system.js"
    "validate-production-readiness.js"
    "deployment-validation-procedures.md"
    "backend/oriel_backend.py"
)

echo "🔍 Checking required files..."
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
    echo "   ✅ Found: $file"
done

echo ""
echo "🎯 Starting production readiness validation..."
echo ""

# Make the validation script executable
chmod +x validate-production-readiness.js

# Run the validation orchestrator
node validate-production-readiness.js

echo ""
echo "🏁 Validation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the validation results above"
echo "   2. Check the generated report in logs/ directory"
echo "   3. Open production-readiness-test-runner.html for monitoring dashboard"
echo "   4. Follow deployment procedures in deployment-validation-procedures.md"
echo ""