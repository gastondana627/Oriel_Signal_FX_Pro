#!/usr/bin/env python3
"""
Test summary script to show test coverage and results.
"""
import os
import sys
import subprocess
import json
from pathlib import Path


def run_command(command, capture_output=True):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=capture_output, 
            text=True,
            cwd=Path(__file__).parent
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)


def count_tests():
    """Count the number of tests in each category."""
    test_counts = {
        'unit': 0,
        'integration': 0,
        'e2e': 0,
        'total': 0
    }
    
    test_dirs = {
        'unit': 'tests/unit',
        'integration': 'tests/integration', 
        'e2e': 'tests/e2e'
    }
    
    for category, test_dir in test_dirs.items():
        if os.path.exists(test_dir):
            for file in Path(test_dir).glob('test_*.py'):
                # Count test functions in file
                try:
                    with open(file, 'r') as f:
                        content = f.read()
                        # Simple count of test functions
                        count = content.count('def test_')
                        test_counts[category] += count
                        test_counts['total'] += count
                except Exception:
                    pass
    
    return test_counts


def get_coverage_info():
    """Get test coverage information."""
    success, stdout, stderr = run_command("python -m coverage report --format=json")
    
    if success and stdout:
        try:
            coverage_data = json.loads(stdout)
            return {
                'total_coverage': coverage_data.get('totals', {}).get('percent_covered', 0),
                'files_covered': len(coverage_data.get('files', {})),
                'lines_covered': coverage_data.get('totals', {}).get('covered_lines', 0),
                'total_lines': coverage_data.get('totals', {}).get('num_statements', 0)
            }
        except json.JSONDecodeError:
            pass
    
    return None


def check_test_dependencies():
    """Check if test dependencies are installed."""
    dependencies = [
        'pytest',
        'pytest-flask',
        'pytest-cov',
        'pytest-mock'
    ]
    
    missing = []
    for dep in dependencies:
        module_name = dep.replace('-', '_')
        success, _, _ = run_command(f"python -c 'import {module_name}'")
        if not success:
            missing.append(dep)
    
    return missing


def main():
    """Generate test summary report."""
    print("=" * 60)
    print("BACKEND TEST SUITE SUMMARY")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not os.path.exists('tests'):
        print("❌ Error: tests directory not found")
        print("Please run this script from the backend directory")
        return 1
    
    # Check test dependencies
    missing_deps = check_test_dependencies()
    if missing_deps:
        print("⚠️  Missing test dependencies:")
        for dep in missing_deps:
            print(f"   - {dep}")
        print("\nInstall with: pip install -r requirements-test.txt")
        print()
    
    # Count tests
    test_counts = count_tests()
    
    print("📊 TEST STATISTICS")
    print("-" * 30)
    print(f"Unit Tests:        {test_counts['unit']:3d}")
    print(f"Integration Tests: {test_counts['integration']:3d}")
    print(f"End-to-End Tests:  {test_counts['e2e']:3d}")
    print(f"Total Tests:       {test_counts['total']:3d}")
    print()
    
    # Test structure
    print("📁 TEST STRUCTURE")
    print("-" * 30)
    
    test_files = []
    for test_dir in ['tests/unit', 'tests/integration', 'tests/e2e']:
        if os.path.exists(test_dir):
            for file in sorted(Path(test_dir).glob('test_*.py')):
                rel_path = file.relative_to(Path('.'))
                test_files.append(str(rel_path))
    
    for file in test_files:
        print(f"  {file}")
    
    if not test_files:
        print("  No test files found")
    
    print()
    
    # Coverage information
    coverage_info = get_coverage_info()
    if coverage_info:
        print("📈 COVERAGE INFORMATION")
        print("-" * 30)
        print(f"Overall Coverage:  {coverage_info['total_coverage']:.1f}%")
        print(f"Files Covered:     {coverage_info['files_covered']}")
        print(f"Lines Covered:     {coverage_info['lines_covered']}/{coverage_info['total_lines']}")
        print()
    
    # Quick test run
    print("🧪 QUICK TEST RUN")
    print("-" * 30)
    print("Running a sample of tests...")
    
    # Run a few quick tests
    quick_tests = [
        "tests/unit/test_auth.py::TestPasswordValidation::test_valid_password",
        "tests/unit/test_payments.py::TestPaymentCalculation::test_basic_video_price"
    ]
    
    passed = 0
    total = 0
    
    for test in quick_tests:
        if os.path.exists(test.split('::')[0]):
            total += 1
            success, stdout, stderr = run_command(f"python -m pytest {test} -q")
            if success:
                passed += 1
                print(f"  ✅ {test.split('::')[-1]}")
            else:
                print(f"  ❌ {test.split('::')[-1]}")
    
    if total > 0:
        print(f"\nQuick test results: {passed}/{total} passed")
    else:
        print("No tests found to run")
    
    print()
    
    # Usage instructions
    print("🚀 USAGE INSTRUCTIONS")
    print("-" * 30)
    print("Run all tests:")
    print("  python run_tests.py")
    print()
    print("Run specific test categories:")
    print("  python run_tests.py --unit")
    print("  python run_tests.py --integration")
    print("  python run_tests.py --e2e")
    print()
    print("Run with coverage:")
    print("  python run_tests.py --coverage --html")
    print()
    print("Using Make:")
    print("  make test")
    print("  make test-coverage")
    print("  make test-fast")
    print()
    print("Using pytest directly:")
    print("  pytest tests/")
    print("  pytest --cov=app --cov-report=html")
    print()
    
    # CI/CD status
    if os.path.exists('.github/workflows/backend-tests.yml'):
        print("🔄 CI/CD CONFIGURATION")
        print("-" * 30)
        print("✅ GitHub Actions workflow configured")
        print("   - Runs on push/PR to main/develop")
        print("   - Tests multiple Python versions")
        print("   - Includes security scanning")
        print("   - Generates coverage reports")
        print()
    
    print("=" * 60)
    print("For detailed information, see tests/README.md")
    print("=" * 60)
    
    return 0


if __name__ == '__main__':
    sys.exit(main())