# Backend Test Makefile

.PHONY: help install test test-unit test-integration test-e2e test-coverage test-fast clean lint format security

# Default target
help:
	@echo "Available targets:"
	@echo "  install          Install test dependencies"
	@echo "  test             Run all tests"
	@echo "  test-unit        Run unit tests only"
	@echo "  test-integration Run integration tests only"
	@echo "  test-e2e         Run end-to-end tests only"
	@echo "  test-coverage    Run tests with coverage report"
	@echo "  test-fast        Run tests excluding slow ones"
	@echo "  test-parallel    Run tests in parallel"
	@echo "  lint             Run code linting"
	@echo "  format           Format code"
	@echo "  security         Run security scans"
	@echo "  clean            Clean test artifacts"

# Install dependencies
install:
	pip install -r requirements-test.txt
	playwright install chromium

# Run all tests
test:
	python run_tests.py

# Run unit tests only
test-unit:
	python run_tests.py --unit --verbose

# Run integration tests only
test-integration:
	python run_tests.py --integration --verbose

# Run end-to-end tests only
test-e2e:
	python run_tests.py --e2e --verbose

# Run tests with coverage
test-coverage:
	python run_tests.py --coverage --html

# Run fast tests (skip slow ones)
test-fast:
	python run_tests.py --fast

# Run tests in parallel
test-parallel:
	python run_tests.py --parallel

# Run specific test pattern
test-pattern:
	@read -p "Enter test pattern: " pattern; \
	python run_tests.py --pattern "$$pattern"

# Linting
lint:
	flake8 app/ tests/ --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 app/ tests/ --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
	pylint app/ --exit-zero

# Code formatting
format:
	black app/ tests/
	isort app/ tests/

# Security scanning
security:
	safety check
	bandit -r app/ -f json -o bandit-report.json
	@echo "Security reports generated: bandit-report.json"

# Clean test artifacts
clean:
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	rm -f coverage.xml
	rm -f pytest-report.html
	rm -f bandit-report.json
	rm -f safety-report.json
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Database setup for testing
setup-test-db:
	@echo "Setting up test database..."
	python -c "from app import create_app, db; app = create_app('testing'); app.app_context().push(); db.create_all(); print('Test database created')"

# Run tests with database setup
test-with-db: setup-test-db test

# Continuous testing (watch for changes)
test-watch:
	@echo "Starting continuous testing (Ctrl+C to stop)..."
	@while true; do \
		python run_tests.py --fast; \
		echo "Waiting for changes... (Ctrl+C to stop)"; \
		sleep 5; \
	done

# Generate test report
test-report:
	python run_tests.py --coverage --html --verbose
	@echo "Test report generated in htmlcov/index.html"

# Run tests for CI/CD
test-ci:
	python run_tests.py --coverage --parallel --verbose

# Benchmark tests
benchmark:
	python -m pytest tests/ --benchmark-only --benchmark-sort=mean

# Memory profiling
profile-memory:
	python -m pytest tests/ --profile --profile-svg

# Load testing
load-test:
	locust -f tests/load/locustfile.py --headless -u 10 -r 2 -t 30s --host=http://localhost:5000