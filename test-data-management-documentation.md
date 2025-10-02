# Test Data Management System Documentation

## Overview

The Test Data Management System provides comprehensive database state management, test data fixtures, and cleanup procedures for isolated and reliable testing. This system ensures that tests run in clean, predictable environments and automatically clean up after themselves.

## Components

### 1. TestDataManager (`test-data-manager.js`)

The main test data management class that handles:
- Test data fixtures and templates
- Entity creation and tracking
- Session management
- Cleanup coordination

#### Key Features:
- **Fixture Management**: Pre-defined test data for users, authentication, downloads, and server configurations
- **Entity Tracking**: Automatic tracking of created entities for cleanup
- **Session Isolation**: Each test session maintains its own data scope
- **Automatic Cleanup**: Configurable cleanup on test completion or failure

#### Usage Example:
```javascript
const testDataManager = new TestDataManager({
    apiBaseUrl: 'http://localhost:8000',
    cleanupTimeout: 30000
});

await testDataManager.initialize();

// Create test user
const userData = testDataManager.getFixture('users', 'validUser');
const user = await testDataManager.createTestUser(userData, 'test_session_1');

// Cleanup when done
await testDataManager.cleanupTestData('test_session_1');
```

### 2. TestDatabaseManager (`test-database-manager.js`)

Handles database-specific operations including:
- Database state snapshots
- Transaction management
- Entity cleanup
- State restoration

#### Key Features:
- **State Snapshots**: Capture and restore database states
- **Transaction Support**: Optional transaction-based isolation
- **Entity Cleanup**: Automatic cleanup of created database entities
- **Baseline Reset**: Reset database to clean baseline state

#### Usage Example:
```javascript
const dbManager = new TestDatabaseManager({
    apiBaseUrl: 'http://localhost:8000',
    isolationLevel: 'session'
});

await dbManager.initialize();

// Start isolated test session
const session = await dbManager.startTestSession('test_1');

// Create test data
const user = await dbManager.createTestUser('test_1', userData);

// End session with cleanup
await dbManager.endTestSession('test_1');
```

### 3. TestFixtures (`test-fixtures.js`)

Comprehensive test data definitions including:
- User data for various scenarios
- Authentication credentials
- Download configurations
- Server endpoints and responses
- Error scenarios
- UI selectors

#### Fixture Categories:

**Users:**
- `validUser`: Standard valid user data
- `adminUser`: Administrative user
- `premiumUser`: Premium subscription user
- `invalidEmailUser`: User with invalid email format
- `weakPasswordUser`: User with weak password
- `duplicateEmailUser`: For testing duplicate email scenarios

**Authentication:**
- `validCredentials`: Working login credentials
- `invalidCredentials`: Non-existent user credentials
- `malformedCredentials`: Improperly formatted credentials

**Downloads:**
- Format specifications (MP3, MP4, MOV, GIF)
- Quality settings for each format
- Expected file sizes and generation times
- Progress milestones

**Server:**
- API endpoint definitions
- Expected response structures
- Timeout configurations
- Health check parameters

### 4. Test Runner Interface (`test-data-management-runner.html`)

Interactive web interface for:
- Manager initialization
- Test session management
- Entity creation and cleanup
- Real-time status monitoring
- Fixture viewing

## Test Data Isolation Levels

### Session Level (Default)
- Each test session gets its own isolated data scope
- Entities created in one session don't affect others
- Automatic cleanup when session ends
- Suitable for most integration tests

### Test Level
- Each individual test gets complete isolation
- Higher overhead but maximum isolation
- Suitable for tests that modify global state

### Suite Level
- All tests in a suite share the same data scope
- Faster execution but requires careful test design
- Suitable for read-only tests or coordinated test sequences

## Cleanup Strategies

### Automatic Cleanup
- Enabled by default
- Tracks all created entities during test execution
- Cleans up in reverse order (LIFO) to handle dependencies
- Runs on test completion, failure, or timeout

### Manual Cleanup
- Explicit cleanup calls in test code
- Useful for custom cleanup logic
- Can be combined with automatic cleanup

### Transaction-Based Cleanup
- Uses database transactions when supported
- Fastest cleanup method (simple rollback)
- May not be available in all environments

## Usage Patterns

### Basic Test Setup
```javascript
// Initialize managers
const testDataManager = new TestDataManager();
const dbManager = new TestDatabaseManager();

await testDataManager.initialize();
await dbManager.initialize();

// Start test session
const sessionId = 'my_test_session';
await dbManager.startTestSession(sessionId);

// Create test data
const userData = testDataManager.getFixture('users', 'validUser');
const user = await dbManager.createTestUser(sessionId, userData);

// Run tests...

// Cleanup
await dbManager.endTestSession(sessionId);
```

### Integration Test Pattern
```javascript
async function runIntegrationTest() {
    const sessionId = `integration_${Date.now()}`;
    
    try {
        // Setup
        await dbManager.startTestSession(sessionId);
        
        // Create required test data
        const user = await dbManager.createTestUser(sessionId, validUserData);
        const authSession = await dbManager.createTestAuthSession(sessionId, credentials);
        
        // Execute test scenarios
        await testUserRegistration();
        await testUserLogin();
        await testDownloadFlow();
        
        // Verify results
        assert(testResults.allPassed);
        
    } finally {
        // Cleanup always runs
        await dbManager.endTestSession(sessionId);
    }
}
```

### Fixture-Based Testing
```javascript
// Get test scenarios from fixtures
const scenarios = testDataManager.getFixture('scenarios', 'registration');

for (const scenario of scenarios) {
    const sessionId = `scenario_${scenario.name}`;
    
    await dbManager.startTestSession(sessionId);
    
    try {
        const userData = testDataManager.getFixture('users', scenario.userData);
        const result = await testRegistration(userData);
        
        assert.equal(result.status, scenario.expectedResult);
        
    } finally {
        await dbManager.endTestSession(sessionId);
    }
}
```

## Configuration Options

### TestDataManager Configuration
```javascript
{
    apiBaseUrl: 'http://localhost:8000',     // Backend API URL
    testDbPrefix: 'test_',                   // Prefix for test entities
    cleanupTimeout: 30000,                   // Cleanup timeout in ms
    autoCleanup: true                        // Enable automatic cleanup
}
```

### TestDatabaseManager Configuration
```javascript
{
    apiBaseUrl: 'http://localhost:8000',     // Backend API URL
    isolationLevel: 'session',               // 'session', 'test', 'suite'
    autoCleanup: true,                       // Enable automatic cleanup
    useTransactions: false                   // Use database transactions
}
```

## Best Practices

### Test Design
1. **Use Appropriate Isolation**: Choose isolation level based on test requirements
2. **Minimize Test Data**: Create only the data needed for each test
3. **Use Fixtures**: Leverage pre-defined fixtures for consistency
4. **Handle Cleanup**: Always ensure cleanup runs, even on test failure

### Performance Optimization
1. **Reuse Sessions**: Share sessions across related tests when possible
2. **Batch Operations**: Create multiple entities in single session
3. **Avoid Deep Cleanup**: Don't create unnecessary entity relationships
4. **Use Transactions**: Enable transaction-based cleanup when available

### Error Handling
1. **Graceful Degradation**: Handle missing cleanup endpoints gracefully
2. **Retry Logic**: Implement retry for transient cleanup failures
3. **Logging**: Log all cleanup operations for debugging
4. **Validation**: Validate test environment before running tests

## Troubleshooting

### Common Issues

**Cleanup Failures**
- Check API endpoint availability
- Verify entity IDs are correct
- Ensure proper authentication for cleanup operations

**Session Conflicts**
- Use unique session IDs
- Avoid concurrent access to same entities
- Check for proper session isolation

**Performance Issues**
- Reduce cleanup timeout for faster tests
- Use transaction-based cleanup when possible
- Minimize entity creation in tests

**Database Connection Issues**
- Verify backend server is running
- Check database health endpoints
- Ensure proper network connectivity

### Debug Mode
Enable detailed logging by setting debug configuration:
```javascript
const testDataManager = new TestDataManager({
    debug: true,
    logLevel: 'verbose'
});
```

## API Reference

### TestDataManager Methods

#### `initialize()`
Initialize the test data manager and load fixtures.

#### `getFixture(category, key)`
Retrieve fixture data by category and key.

#### `createTestUser(userData, testId)`
Create a test user with cleanup tracking.

#### `createTestSession(credentials, testId)`
Create an authenticated session with cleanup tracking.

#### `cleanupTestData(testId)`
Clean up all data for a specific test session.

#### `validateTestEnvironment()`
Validate that the test environment is properly configured.

### TestDatabaseManager Methods

#### `initialize()`
Initialize the database manager and create baseline snapshot.

#### `startTestSession(sessionId, options)`
Start a new test session with database isolation.

#### `endTestSession(sessionId, options)`
End a test session and perform cleanup.

#### `createTestUser(sessionId, userData)`
Create a test user within a session context.

#### `createTestAuthSession(sessionId, credentials)`
Create an authenticated session within a test session.

#### `resetToBaseline()`
Reset the database to its baseline state.

#### `getActiveSessions()`
Get information about all active test sessions.

## Integration with Test Frameworks

### Jest Integration
```javascript
describe('User Registration', () => {
    let sessionId;
    
    beforeEach(async () => {
        sessionId = `jest_${Date.now()}`;
        await dbManager.startTestSession(sessionId);
    });
    
    afterEach(async () => {
        await dbManager.endTestSession(sessionId);
    });
    
    test('should register valid user', async () => {
        const userData = testDataManager.getFixture('users', 'validUser');
        const result = await dbManager.createTestUser(sessionId, userData);
        expect(result.user.email).toBe(userData.email);
    });
});
```

### Mocha Integration
```javascript
describe('Authentication Flow', function() {
    let sessionId;
    
    beforeEach(async function() {
        sessionId = `mocha_${Date.now()}`;
        await dbManager.startTestSession(sessionId);
    });
    
    afterEach(async function() {
        await dbManager.endTestSession(sessionId);
    });
    
    it('should authenticate valid user', async function() {
        const credentials = testDataManager.getFixture('auth', 'validCredentials');
        const result = await dbManager.createTestAuthSession(sessionId, credentials);
        expect(result.token).to.exist;
    });
});
```

This comprehensive test data management system ensures reliable, isolated, and maintainable testing for the Oriel Signal FX Pro application.