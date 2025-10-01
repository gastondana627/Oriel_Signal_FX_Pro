#!/usr/bin/env python3
"""
Test runner script for the backend test suite.
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {description} failed")
        print(f"Return code: {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description='Run backend tests')
    parser.add_argument('--unit', action='store_true', help='Run unit tests only')
    parser.add_argument('--integration', action='store_true', help='Run integration tests only')
    parser.add_argument('--e2e', action='store_true', help='Run end-to-end tests only')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage reporting')
    parser.add_argument('--html', action='store_true', help='Generate HTML coverage report')
    parser.add_argument('--parallel', action='store_true', help='Run tests in parallel')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fast', action='store_true', help='Skip slow tests')
    parser.add_argument('--pattern', help='Run tests matching pattern')
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Base pytest command
    pytest_cmd = ['python', '-m', 'pytest']
    
    # Add test selection
    if args.unit:
        pytest_cmd.extend(['-m', 'unit', 'tests/unit/'])
    elif args.integration:
        pytest_cmd.extend(['-m', 'integration', 'tests/integration/'])
    elif args.e2e:
        pytest_cmd.extend(['-m', 'e2e', 'tests/e2e/'])
    else:
        pytest_cmd.append('tests/')
    
    # Add coverage options
    if args.coverage:
        pytest_cmd.extend([
            '--cov=app',
            '--cov-report=term-missing',
            '--cov-report=xml',
            '--cov-fail-under=80'
        ])
        
        if args.html:
            pytest_cmd.append('--cov-report=html')
    
    # Add parallel execution
    if args.parallel:
        pytest_cmd.extend(['-n', 'auto'])
    
    # Add verbosity
    if args.verbose:
        pytest_cmd.append('-v')
    
    # Skip slow tests
    if args.fast:
        pytest_cmd.extend(['-m', 'not slow'])
    
    # Pattern matching
    if args.pattern:
        pytest_cmd.extend(['-k', args.pattern])
    
    # Set environment variables
    env = os.environ.copy()
    env['FLASK_ENV'] = 'testing'
    env['TESTING'] = 'true'
    
    # Run tests
    print("Starting backend test suite...")
    print(f"Working directory: {os.getcwd()}")
    print(f"Python path: {sys.executable}")
    
    success = True
    
    # Check if pytest is available
    try:
        subprocess.run(['python', '-m', 'pytest', '--version'], 
                      check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("ERROR: pytest not found. Please install test dependencies:")
        print("pip install -r requirements-test.txt")
        return 1
    
    # Run the tests
    print(f"\nRunning command: {' '.join(pytest_cmd)}")
    try:
        result = subprocess.run(pytest_cmd, env=env)
        success = result.returncode == 0
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        return 1
    
    # Generate reports
    if args.coverage and success:
        print("\n" + "="*60)
        print("COVERAGE SUMMARY")
        print("="*60)
        
        # Show coverage report
        subprocess.run(['python', '-m', 'coverage', 'report'], env=env)
        
        if args.html:
            print("\nHTML coverage report generated in htmlcov/")
    
    # Summary
    print("\n" + "="*60)
    if success:
        print("✅ ALL TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED!")
    print("="*60)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())