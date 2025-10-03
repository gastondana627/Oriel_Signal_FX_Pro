#!/usr/bin/env python3
"""
Comprehensive test runner for the purchase system.
Executes all unit, integration, and end-to-end tests for the purchase system.
"""
import os
import sys
import unittest
import pytest
from datetime import datetime
import logging

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_purchase_system_tests():
    """
    Run comprehensive tests for the purchase system.
    
    Test Categories:
    1. Unit Tests - PurchaseManager and LicensingService
    2. Integration Tests - Stripe webhooks and download security
    3. End-to-End Tests - Complete purchase flow
    """
    
    print("🧪 Running Comprehensive Purchase System Tests")
    print("=" * 60)
    print(f"Test execution started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test configuration
    test_modules = [
        # Unit Tests
        'tests.unit.test_purchase_manager',
        'tests.unit.test_licensing_service',
        
        # Integration Tests  
        'tests.integration.test_stripe_webhooks',
        'tests.integration.test_download_security',
        
        # End-to-End Tests
        'tests.e2e.test_purchase_flow'
    ]
    
    # Test execution summary
    test_results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'error_tests': 0,
        'skipped_tests': 0,
        'execution_time': 0
    }
    
    start_time = datetime.now()
    
    try:
        # Run tests using pytest for better output and fixtures
        pytest_args = [
            '-v',  # Verbose output
            '--tb=short',  # Short traceback format
            '--strict-markers',  # Strict marker checking
            '--disable-warnings',  # Disable warnings for cleaner output
            '-x',  # Stop on first failure (remove for full test run)
        ]
        
        # Add test modules to pytest args
        for module in test_modules:
            module_path = module.replace('.', '/')
            if os.path.exists(f"{module_path}.py"):
                pytest_args.append(f"{module_path}.py")
        
        print("📋 Test Execution Plan:")
        print("----------------------")
        for i, module in enumerate(test_modules, 1):
            print(f"{i}. {module}")
        print()
        
        # Execute tests
        print("🚀 Executing Tests...")
        print("=" * 40)
        
        # Run pytest
        exit_code = pytest.main(pytest_args)
        
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        
        print()
        print("=" * 60)
        print("📊 Test Execution Summary")
        print("=" * 60)
        
        if exit_code == 0:
            print("✅ All tests passed successfully!")
            print(f"⏱️  Total execution time: {execution_time:.2f} seconds")
            return True
        else:
            print("❌ Some tests failed or encountered errors")
            print(f"⏱️  Total execution time: {execution_time:.2f} seconds")
            print(f"🔍 Exit code: {exit_code}")
            return False
            
    except Exception as e:
        print(f"💥 Test execution failed with exception: {e}")
        logger.exception("Test execution failed")
        return False


def run_specific_test_category(category):
    """
    Run tests for a specific category.
    
    Args:
        category: 'unit', 'integration', or 'e2e'
    """
    category_modules = {
        'unit': [
            'tests.unit.test_purchase_manager',
            'tests.unit.test_licensing_service'
        ],
        'integration': [
            'tests.integration.test_stripe_webhooks',
            'tests.integration.test_download_security'
        ],
        'e2e': [
            'tests.e2e.test_purchase_flow'
        ]
    }
    
    if category not in category_modules:
        print(f"❌ Invalid category: {category}")
        print(f"Available categories: {list(category_modules.keys())}")
        return False
    
    print(f"🧪 Running {category.upper()} Tests for Purchase System")
    print("=" * 50)
    
    modules = category_modules[category]
    pytest_args = ['-v', '--tb=short'] + [m.replace('.', '/') + '.py' for m in modules]
    
    exit_code = pytest.main(pytest_args)
    return exit_code == 0


def validate_test_environment():
    """Validate that the test environment is properly set up"""
    print("🔍 Validating Test Environment...")
    
    required_modules = [
        'app',
        'app.models',
        'app.purchases.manager',
        'app.purchases.licensing',
        'app.downloads.manager'
    ]
    
    missing_modules = []
    for module in required_modules:
        try:
            __import__(module)
        except ImportError as e:
            missing_modules.append(f"{module}: {e}")
    
    if missing_modules:
        print("❌ Missing required modules:")
        for module in missing_modules:
            print(f"   - {module}")
        return False
    
    # Check test database configuration
    try:
        from app import create_app
        app = create_app('testing')
        if not app.config.get('TESTING'):
            print("❌ Application not configured for testing")
            return False
    except Exception as e:
        print(f"❌ Failed to create test app: {e}")
        return False
    
    print("✅ Test environment validation passed")
    return True


def generate_test_report():
    """Generate a detailed test report"""
    print("\n📋 Generating Test Report...")
    
    # Run tests with coverage and detailed output
    pytest_args = [
        '--tb=long',
        '--verbose',
        '--durations=10',  # Show 10 slowest tests
        '--strict-markers',
        'tests/'
    ]
    
    # Try to add coverage if available
    try:
        import pytest_cov
        pytest_args.extend(['--cov=app.purchases', '--cov=app.downloads', '--cov-report=term-missing'])
    except ImportError:
        print("ℹ️  pytest-cov not available, skipping coverage report")
    
    exit_code = pytest.main(pytest_args)
    return exit_code == 0


def main():
    """Main test execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Purchase System Test Runner')
    parser.add_argument(
        '--category', 
        choices=['unit', 'integration', 'e2e', 'all'],
        default='all',
        help='Test category to run (default: all)'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Generate detailed test report with coverage'
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate test environment'
    )
    
    args = parser.parse_args()
    
    # Validate environment first
    if not validate_test_environment():
        print("❌ Test environment validation failed")
        return 1
    
    if args.validate_only:
        print("✅ Test environment validation completed")
        return 0
    
    # Generate detailed report if requested
    if args.report:
        success = generate_test_report()
        return 0 if success else 1
    
    # Run specific category or all tests
    if args.category == 'all':
        success = run_purchase_system_tests()
    else:
        success = run_specific_test_category(args.category)
    
    return 0 if success else 1


if __name__ == '__main__':
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️  Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.exception("Unexpected error in test runner")
        sys.exit(1)