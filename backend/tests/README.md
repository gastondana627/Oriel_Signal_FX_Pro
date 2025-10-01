# Backend Test Suite

This directory contains a comprehensive test suite for the Oriel_Signal_FX_Pro backend infrastructure.

## Test Structure

```
tests/
├── conftest.py              # Test configuration and fixtures
├── unit/                    # Unit tests
│   ├── test_auth.py        # Authentication logic tests
│   ├── test_payments.py    # Payment processing tests
│   └── test_jobs.py        # Job processing tests
├── integration/             # Integration tests
│   ├── test_api_endpoints.py  # API endpoint tests
│   └── test_database.py    # Database operation tests
└── e2e/                     # End-to-end tests
    └── test_user_workflows.py # Complete user workflow tests
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install -r requirements-test.txt
```

### Quick Start

Run all tests:
```bash
python run_tests.py
```

Run specific test categories:
```bash
python run_tests.py --unit          # Unit tests only
python run_tests.py --integration   # Integration tests only
python run_tests.py --e2e           # End-to-end tests only
```

Run with coverage:
```bash
python run_tests.py --coverage --html
```

### Using Make

```bash
make test                    # Run all tests
make test-unit              # Run unit tests
make test-integration       # Run integration tests
make test-e2e               # Run end-to-end tests
make test-coverage          # Run with coverage report
make test-fast              # Skip slow tests
```

### Using pytest directly

```bash
pytest tests/                           # All tests
pytest tests/unit/                      # Unit tests
pytest tests/integration/               # Integration tests
pytest tests/e2e/                       # End-to-end tests
pytest -k "test_auth"                   # Tests matching pattern
pytest --cov=app --cov-report=html     # With coverage
```

## Test Categories

### Unit Tests

Test individual functions and classes in isolation:

- **Authentication**: Password validation, JWT tokens, user management
- **Payments**: Stripe integration, payment calculations, webhook processing
- **Jobs**: Video rendering logic, job queue operations, file validation

### Integration Tests

Test interactions between components:

- **API Endpoints**: Complete request/response cycles
- **Database Operations**: CRUD operations, relationships, constraints
- **External Services**: Mocked integrations with Stripe, GCS, SendGrid

### End-to-End Tests

Test complete user workflows:

- **User Registration**: Account creation and verification
- **Payment to Rendering**: Complete payment and video generation flow
- **Password Reset**: Full password reset workflow
- **Profile Management**: User profile updates and session management

## Test Fixtures

The test suite uses pytest fixtures for consistent test data:

- `app`: Flask application instance
- `client`: Test client for API requests
- `test_user`: Sample user account
- `test_payment`: Sample payment record
- `test_render_job`: Sample render job
- `auth_headers`: Authentication headers for API requests

## Mocking

External services are mocked to ensure tests are:
- Fast and reliable
- Independent of external service availability
- Deterministic in their results

Mocked services include:
- Stripe payment processing
- Google Cloud Storage
- SendGrid email service
- Redis job queue
- Playwright browser automation

## Coverage Requirements

The test suite aims for:
- **80%+ overall coverage**
- **90%+ coverage for critical paths** (authentication, payments, job processing)
- **100% coverage for security-related functions**

## Continuous Integration

Tests run automatically on:
- Pull requests to main/develop branches
- Pushes to main/develop branches
- Multiple Python versions (3.9, 3.10, 3.11)

See `.github/workflows/backend-tests.yml` for CI configuration.

## Writing New Tests

### Unit Test Example

```python
def test_password_validation():
    """Test password strength validation."""
    assert validate_password_strength('Password123!') is True
    assert validate_password_strength('weak') is False
```

### Integration Test Example

```python
def test_user_registration(client, app_context):
    """Test user registration endpoint."""
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'SecurePassword123!'
    })
    
    assert response.status_code == 201
    assert 'user_id' in response.get_json()
```

### End-to-End Test Example

```python
def test_complete_payment_workflow(client, app_context, mock_stripe):
    """Test complete payment to video rendering workflow."""
    # 1. User login
    # 2. Create payment session
    # 3. Process webhook
    # 4. Submit render job
    # 5. Check job status
    # 6. Get download link
```

## Debugging Tests

### Running with verbose output:
```bash
pytest -v --tb=long
```

### Running specific test:
```bash
pytest tests/unit/test_auth.py::TestPasswordValidation::test_valid_password -v
```

### Using debugger:
```python
import pytest; pytest.set_trace()  # Add to test code
```

## Performance Testing

Load testing can be performed using:
```bash
make load-test
```

This uses Locust to simulate concurrent users and measure API performance.

## Security Testing

Security scans are included in the CI pipeline:
- **Safety**: Checks for known security vulnerabilities in dependencies
- **Bandit**: Static analysis for common security issues in Python code

Run locally:
```bash
make security
```

## Test Data Management

- Tests use in-memory SQLite database for speed
- Database is recreated for each test to ensure isolation
- Test data is created using factories and fixtures
- No persistent test data between test runs

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure you're running tests from the backend directory
2. **Database errors**: Check that test database is properly configured
3. **Mock failures**: Verify that external service mocks are properly set up
4. **Timeout errors**: Some tests may need longer timeouts for CI environments

### Getting Help

- Check test logs for detailed error messages
- Review fixture definitions in `conftest.py`
- Ensure all test dependencies are installed
- Verify environment variables are set correctly for testing

## Contributing

When adding new features:

1. Write unit tests for individual functions
2. Add integration tests for API endpoints
3. Include end-to-end tests for user-facing workflows
4. Ensure tests pass in CI environment
5. Maintain or improve overall test coverage