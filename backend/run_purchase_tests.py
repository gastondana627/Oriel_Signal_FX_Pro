#!/usr/bin/env python3
"""
Simple test runner for purchase system tests.
Runs tests using pytest without complex validation.
"""
import os
import sys
import subprocess
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run_purchase_tests():
    """Run purchase system tests using pytest"""
    
    print("🧪 Running Purchase System Tests")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test files to run
    test_files = [
        'tests/unit/test_purchase_manager.py',
        'tests/unit/test_licensing_service.py', 
        'tests/integration/test_stripe_webhooks.py',
        'tests/integration/test_download_security.py',
        'tests/e2e/test_purchase_flow.py'
    ]
    
    # Check which test files exist
    existing_files = []
    for test_file in test_files:
        if os.path.exists(test_file):
            existing_files.append(test_file)
            print(f"✅ Found: {test_file}")
        else:
            print(f"❌ Missing: {test_file}")
    
    if not existing_files:
        print("\n❌ No test files found!")
        return False
    
    print(f"\n🚀 Running {len(existing_files)} test files...")
    print("-" * 40)
    
    # Run pytest with the existing files
    pytest_cmd = [
        sys.executable, '-m', 'pytest',
        '-v',  # Verbose output
        '--tb=short',  # Short traceback
        '--disable-warnings',  # Disable warnings
        '--no-header',  # No pytest header
        '--no-summary',  # No summary
    ] + existing_files
    
    try:
        result = subprocess.run(pytest_cmd, capture_output=True, text=True)
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        print(f"\n📊 Test Results:")
        print(f"Exit code: {result.returncode}")
        
        if result.returncode == 0:
            print("✅ All tests passed!")
            return True
        else:
            print("❌ Some tests failed")
            return False
            
    except Exception as e:
        print(f"💥 Failed to run tests: {e}")
        return False


def main():
    """Main function"""
    success = run_purchase_tests()
    return 0 if success else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)