/**
 * Error Handling Unit Tests
 * Tests for error message formatting and error logging utilities
 * Requirements: 8.1, 9.1
 */

class ErrorHandlingUnitTests {
    constructor() {
        this.results = [];
        this.testCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        
        // Mock dependencies
        this.mockApiClient = this.createMockApiClient();
        this.mockAppConfig = this.createMockAppConfig();
        this.mockAnalyticsManager = this.createMockAnalyticsManager();
        
        // Test instances
        this.errorMonitor = null;
        this.logFormatter = null;
        this.enhancedLogger = null;
    }

    /**
     * Create mock API client
     */
    createMockApiClient() {
        return {
            post: jest ? jest.fn() : function() { return Promise.resolve({}); },
            get: jest ? jest.fn() : function() { return Promise.resolve({}); },
            put: jest ? jest.fn() : function() { return Promise.resolve({}); },
            delete: jest ? jest.fn() : function() { return Promise.resolve({}); }
        };
    }

    /**
     * Create mock app config
     */
    createMockAppConfig() {
        return {
            isDevelopment: () => true,
            getApiUrl: () => 'http://localhost:8000',
            getEnvironment: () => 'test'
        };
    }

    /**
     * Create mock analytics manager
     */
    createMockAnalyticsManager() {
        return {
            trackError: jest ? jest.fn() : function() {},
            trackEvent: jest ? jest.fn() : function() {}
        };
    }

    /**
     * Set up test instances
     */
    setUp() {
        // Create fresh instances for each test
        this.errorMonitor = new ErrorMonitor(
            this.mockApiClient, 
            this.mockAppConfig, 
            this.mockAnalyticsManager
        );
        
        this.logFormatter = new LogFormatter({
            colorize: false, // Disable colors for testing
            showTimestamp: true,
            showLevel: true,
            showRequestId: true
        });
        
        this.enhancedLogger = new EnhancedLogger({
            level: 'DEBUG',
            environment: 'test',
            enableConsole: false,
            enableServer: false
        });
    }

    /**
     * Clean up after tests
     */
    tearDown() {
        // Reset mocks if using Jest
        if (jest) {
            jest.clearAllMocks();
        }
        
        // Clear any global state
        if (window.currentRequestId) {
            window.currentRequestId = null;
        }
    }

    /**
     * Assert helper
     */
    assert(condition, message) {
        this.testCount++;
        if (condition) {
            this.passCount++;
            this.results.push({ test: message, status: 'PASS' });
            console.log(`✅ ${message}`);
        } else {
            this.failCount++;
            this.results.push({ test: message, status: 'FAIL' });
            console.error(`❌ ${message}`);
        }
    }

    /**
     * Assert equality helper
     */
    assertEqual(actual, expected, message) {
        const condition = actual === expected;
        if (!condition) {
            console.error(`Expected: ${expected}, Actual: ${actual}`);
        }
        this.assert(condition, message);
    }

    /**
     * Assert contains helper
     */
    assertContains(text, substring, message) {
        const condition = text && text.includes(substring);
        if (!condition) {
            console.error(`Text "${text}" does not contain "${substring}"`);
        }
        this.assert(condition, message);
    }

    /**
     * Assert type helper
     */
    assertType(value, expectedType, message) {
        const condition = typeof value === expectedType;
        if (!condition) {
            console.error(`Expected type: ${expectedType}, Actual type: ${typeof value}`);
        }
        this.assert(condition, message);
    }

    /**
     * Run a test with setup and teardown
     */
    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        try {
            this.setUp();
            await testFunction.call(this);
        } catch (error) {
            this.results.push({ test: testName, status: 'ERROR', error: error.message });
            console.error(`💥 Test ${testName} failed with error:`, error);
        } finally {
            this.tearDown();
        }
    }

    // ==================== ERROR MESSAGE FORMATTING TESTS ====================

    /**
     * Test getUserFriendlyMessage for API errors
     */
    async testApiErrorMessageFormatting() {
        // Test 500 server error
        const serverError = {
            type: 'api_error',
            status: 500,
            message: 'Internal server error'
        };
        const serverMessage = this.errorMonitor.getUserFriendlyMessage(serverError);
        this.assertContains(serverMessage, 'Server error occurred', 'Should format 500 error message');

        // Test 401 unauthorized error
        const authError = {
            type: 'api_error',
            status: 401,
            message: 'Unauthorized'
        };
        const authMessage = this.errorMonitor.getUserFriendlyMessage(authError);
        this.assertContains(authMessage, 'log in again', 'Should format 401 error message');

        // Test 403 forbidden error
        const forbiddenError = {
            type: 'api_error',
            status: 403,
            message: 'Forbidden'
        };
        const forbiddenMessage = this.errorMonitor.getUserFriendlyMessage(forbiddenError);
        this.assertContains(forbiddenMessage, 'permission', 'Should format 403 error message');

        // Test 429 rate limit error
        const rateLimitError = {
            type: 'api_error',
            status: 429,
            message: 'Too many requests'
        };
        const rateLimitMessage = this.errorMonitor.getUserFriendlyMessage(rateLimitError);
        this.assertContains(rateLimitMessage, 'Too many requests', 'Should format 429 error message');

        // Test generic client error
        const clientError = {
            type: 'api_error',
            status: 400,
            message: 'Bad request'
        };
        const clientMessage = this.errorMonitor.getUserFriendlyMessage(clientError);
        this.assertContains(clientMessage, 'Network error', 'Should format generic client error message');
    }

    /**
     * Test getUserFriendlyMessage for authentication errors
     */
    async testAuthErrorMessageFormatting() {
        const authError = {
            type: 'auth_error',
            message: 'Authentication failed'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(authError);
        this.assertContains(message, 'Authentication failed', 'Should format auth error message');
        this.assertContains(message, 'try logging in again', 'Should suggest login retry');
    }

    /**
     * Test getUserFriendlyMessage for payment errors
     */
    async testPaymentErrorMessageFormatting() {
        const paymentError = {
            type: 'payment_error',
            message: 'Payment processing failed'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(paymentError);
        this.assertContains(message, 'Payment processing failed', 'Should format payment error message');
        this.assertContains(message, 'try again', 'Should suggest retry');
        this.assertContains(message, 'different payment method', 'Should suggest alternative method');
    }

    /**
     * Test getUserFriendlyMessage for file errors
     */
    async testFileErrorMessageFormatting() {
        const fileError = {
            type: 'file_error',
            message: 'File processing failed'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(fileError);
        this.assertContains(message, 'File processing failed', 'Should format file error message');
        this.assertContains(message, 'different file', 'Should suggest different file');
        this.assertContains(message, 'file format', 'Should mention file format');
    }

    /**
     * Test getUserFriendlyMessage for visualizer errors
     */
    async testVisualizerErrorMessageFormatting() {
        const visualizerError = {
            type: 'visualizer_error',
            message: 'Visualizer rendering failed'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(visualizerError);
        this.assertContains(message, 'Visualizer error occurred', 'Should format visualizer error message');
        this.assertContains(message, 'refresh the page', 'Should suggest page refresh');
    }

    /**
     * Test getUserFriendlyMessage for resource errors
     */
    async testResourceErrorMessageFormatting() {
        const resourceError = {
            type: 'resource_error',
            message: 'Failed to load script'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(resourceError);
        this.assertContains(message, 'Failed to load required resources', 'Should format resource error message');
        this.assertContains(message, 'refresh the page', 'Should suggest page refresh');
    }

    /**
     * Test getUserFriendlyMessage for unknown error types
     */
    async testUnknownErrorMessageFormatting() {
        const unknownError = {
            type: 'unknown_error',
            message: 'Something went wrong'
        };
        const message = this.errorMonitor.getUserFriendlyMessage(unknownError);
        this.assertContains(message, 'unexpected error occurred', 'Should format unknown error message');
        this.assertContains(message, 'refresh the page', 'Should suggest page refresh');
    }

    // ==================== LOG FORMATTER TESTS ====================

    /**
     * Test log entry formatting
     */
    async testLogEntryFormatting() {
        const logEntry = {
            timestamp: '2024-01-01T12:00:00.000Z',
            level: 'ERROR',
            message: 'Test error message',
            requestId: 'req_123',
            sessionId: 'sess_456789',
            context: { test: true }
        };

        const formatted = this.logFormatter.formatLogEntry(logEntry);
        
        this.assertType(formatted, 'string', 'Should return formatted string');
        this.assertContains(formatted, 'ERROR', 'Should include log level');
        this.assertContains(formatted, 'Test error message', 'Should include message');
        this.assertContains(formatted, 'req_123', 'Should include request ID');
        this.assertContains(formatted, '456789', 'Should include abbreviated session ID');
    }

    /**
     * Test error formatting
     */
    async testErrorFormatting() {
        const error = {
            name: 'TypeError',
            message: 'Cannot read property of undefined',
            stack: 'TypeError: Cannot read property of undefined\n    at test.js:1:1\n    at main.js:2:2'
        };

        const formatted = this.logFormatter.formatError(error);
        
        this.assertType(formatted, 'string', 'Should return formatted string');
        this.assertContains(formatted, 'TypeError', 'Should include error name');
        this.assertContains(formatted, 'Cannot read property of undefined', 'Should include error message');
        this.assertContains(formatted, 'test.js:1:1', 'Should include stack trace');
    }

    /**
     * Test context formatting
     */
    async testContextFormatting() {
        const context = {
            userId: 'user123',
            action: 'login',
            details: {
                timestamp: 1234567890,
                success: false
            }
        };

        const formatted = this.logFormatter.formatContext(context);
        
        this.assertType(formatted, 'string', 'Should return formatted string');
        this.assertContains(formatted, 'userId:', 'Should include context keys');
        this.assertContains(formatted, 'user123', 'Should include context values');
        this.assertContains(formatted, 'details:', 'Should include nested objects');
        this.assertContains(formatted, 'timestamp:', 'Should include nested keys');
    }

    /**
     * Test API request formatting
     */
    async testApiRequestFormatting() {
        const logEntry = {
            timestamp: '2024-01-01T12:00:00.000Z',
            level: 'INFO',
            message: 'API Request',
            context: {
                actionType: 'api_request',
                method: 'POST',
                url: '/api/auth/login',
                requestData: '{"username":"test"}'
            }
        };

        const formatted = this.logFormatter.formatApiRequest(logEntry);
        
        this.assertType(formatted, 'string', 'Should return formatted string');
        this.assertContains(formatted, 'POST', 'Should include HTTP method');
        this.assertContains(formatted, '/api/auth/login', 'Should include URL');
        this.assertContains(formatted, 'Body:', 'Should include request body label');
        this.assertContains(formatted, '{"username":"test"}', 'Should include request data');
    }

    /**
     * Test API response formatting
     */
    async testApiResponseFormatting() {
        const logEntry = {
            timestamp: '2024-01-01T12:00:00.000Z',
            level: 'INFO',
            message: 'API Response',
            context: {
                actionType: 'api_response',
                status: 200,
                duration: 150
            }
        };

        const formatted = this.logFormatter.formatApiResponse(logEntry);
        
        this.assertType(formatted, 'string', 'Should return formatted string');
        this.assertContains(formatted, '200', 'Should include status code');
        this.assertContains(formatted, '150ms', 'Should include duration');
    }

    /**
     * Test message length truncation
     */
    async testMessageTruncation() {
        const longMessage = 'A'.repeat(200);
        const truncated = this.logFormatter.formatMessage(longMessage);
        
        this.assert(truncated.length <= 100, 'Should truncate long messages');
        this.assertContains(truncated, '...', 'Should add ellipsis for truncated messages');
    }

    // ==================== ERROR LOGGING TESTS ====================

    /**
     * Test enhanced logger error logging
     */
    async testEnhancedLoggerErrorLogging() {
        const testError = new Error('Test error for logging');
        testError.code = 'TEST_ERROR';
        
        // Capture console output
        const originalConsoleError = console.error;
        let consoleOutput = '';
        console.error = (...args) => {
            consoleOutput += args.join(' ');
        };
        
        try {
            this.enhancedLogger.error('Test error occurred', { test: true }, testError);
            
            // Restore console
            console.error = originalConsoleError;
            
            this.assertContains(consoleOutput, 'Test error occurred', 'Should log error message');
            this.assertContains(consoleOutput, 'ERROR', 'Should include error level');
        } finally {
            console.error = originalConsoleError;
        }
    }

    /**
     * Test log entry creation with error
     */
    async testLogEntryCreationWithError() {
        const testError = new Error('Test error');
        testError.stack = 'Error: Test error\n    at test.js:1:1';
        
        const logEntry = this.enhancedLogger.createLogEntry(
            'ERROR', 
            'Error occurred', 
            { component: 'test' }, 
            testError
        );
        
        this.assertType(logEntry, 'object', 'Should return log entry object');
        this.assertEqual(logEntry.level, 'ERROR', 'Should set correct log level');
        this.assertEqual(logEntry.message, 'Error occurred', 'Should set correct message');
        this.assertType(logEntry.error, 'object', 'Should include error object');
        this.assertEqual(logEntry.error.name, 'Error', 'Should include error name');
        this.assertEqual(logEntry.error.message, 'Test error', 'Should include error message');
        this.assertType(logEntry.error.stack, 'string', 'Should include error stack');
    }

    /**
     * Test error monitor error handling
     */
    async testErrorMonitorHandling() {
        // Enable error monitor for testing
        this.errorMonitor.setEnabled(true);
        
        const errorData = {
            type: 'test_error',
            message: 'Test error for monitoring'
        };
        
        const context = {
            component: 'test',
            userId: 'test-user'
        };
        
        // Clear error queue
        this.errorMonitor.errorQueue = [];
        
        this.errorMonitor.handleError(errorData, context);
        
        this.assertEqual(this.errorMonitor.errorQueue.length, 1, 'Should add error to queue');
        
        const queuedError = this.errorMonitor.errorQueue[0];
        this.assertEqual(queuedError.type, 'test_error', 'Should preserve error type');
        this.assertEqual(queuedError.message, 'Test error for monitoring', 'Should preserve error message');
        this.assertType(queuedError.id, 'string', 'Should generate error ID');
        this.assertType(queuedError.timestamp, 'number', 'Should add timestamp');
        this.assertEqual(queuedError.userId, null, 'Should include user ID from monitor');
        this.assertType(queuedError.context, 'object', 'Should include context');
        this.assertEqual(queuedError.context.component, 'test', 'Should preserve context data');
    }

    /**
     * Test error monitor API error logging
     */
    async testErrorMonitorApiErrorLogging() {
        this.errorMonitor.setEnabled(true);
        this.errorMonitor.errorQueue = [];
        
        this.errorMonitor.logApiError('/api/test', 'POST', 500, { error: 'Server error' }, { data: 'test' });
        
        this.assertEqual(this.errorMonitor.errorQueue.length, 1, 'Should add API error to queue');
        
        const apiError = this.errorMonitor.errorQueue[0];
        this.assertEqual(apiError.type, 'api_error', 'Should set correct error type');
        this.assertContains(apiError.message, 'POST', 'Should include HTTP method');
        this.assertContains(apiError.message, '/api/test', 'Should include endpoint');
        this.assertContains(apiError.message, '500', 'Should include status code');
        this.assertEqual(apiError.endpoint, '/api/test', 'Should include endpoint');
        this.assertEqual(apiError.method, 'POST', 'Should include method');
        this.assertEqual(apiError.status, 500, 'Should include status');
    }

    /**
     * Test error monitor authentication error logging
     */
    async testErrorMonitorAuthErrorLogging() {
        this.errorMonitor.setEnabled(true);
        this.errorMonitor.errorQueue = [];
        
        const authError = new Error('Invalid credentials');
        this.errorMonitor.logAuthError('login', authError, { username: 'test' });
        
        this.assertEqual(this.errorMonitor.errorQueue.length, 1, 'Should add auth error to queue');
        
        const loggedError = this.errorMonitor.errorQueue[0];
        this.assertEqual(loggedError.type, 'auth_error', 'Should set correct error type');
        this.assertContains(loggedError.message, 'login', 'Should include action');
        this.assertContains(loggedError.message, 'Invalid credentials', 'Should include error message');
        this.assertEqual(loggedError.action, 'login', 'Should include action');
    }

    /**
     * Test error monitor payment error logging
     */
    async testErrorMonitorPaymentErrorLogging() {
        this.errorMonitor.setEnabled(true);
        this.errorMonitor.errorQueue = [];
        
        const paymentError = new Error('Card declined');
        const paymentData = {
            amount: 100,
            cardNumber: '4111111111111111', // This should be sanitized
            cvv: '123' // This should be sanitized
        };
        
        this.errorMonitor.logPaymentError('charge', paymentError, paymentData);
        
        this.assertEqual(this.errorMonitor.errorQueue.length, 1, 'Should add payment error to queue');
        
        const loggedError = this.errorMonitor.errorQueue[0];
        this.assertEqual(loggedError.type, 'payment_error', 'Should set correct error type');
        this.assertContains(loggedError.message, 'charge', 'Should include action');
        this.assertContains(loggedError.message, 'Card declined', 'Should include error message');
        
        // Test data sanitization
        this.assertEqual(loggedError.paymentData.amount, 100, 'Should preserve non-sensitive data');
        this.assert(!loggedError.paymentData.cardNumber, 'Should remove card number');
        this.assert(!loggedError.paymentData.cvv, 'Should remove CVV');
    }

    /**
     * Test critical error detection
     */
    async testCriticalErrorDetection() {
        // Test critical error types
        const paymentError = { type: 'payment_error', message: 'Payment failed' };
        this.assert(this.errorMonitor.isCriticalError(paymentError), 'Should detect payment errors as critical');
        
        const authError = { type: 'auth_error', message: 'Authentication failed' };
        this.assert(this.errorMonitor.isCriticalError(authError), 'Should detect auth errors as critical');
        
        const apiError = { type: 'api_error', message: 'API error' };
        this.assert(this.errorMonitor.isCriticalError(apiError), 'Should detect API errors as critical');
        
        // Test critical error messages
        const networkError = { type: 'generic_error', message: 'Network error occurred' };
        this.assert(this.errorMonitor.isCriticalError(networkError), 'Should detect network errors as critical');
        
        const serverError = { type: 'generic_error', message: 'Server error occurred' };
        this.assert(this.errorMonitor.isCriticalError(serverError), 'Should detect server errors as critical');
        
        // Test non-critical errors
        const debugError = { type: 'debug_error', message: 'Debug information' };
        this.assert(!this.errorMonitor.isCriticalError(debugError), 'Should not detect debug errors as critical');
    }

    /**
     * Test error statistics
     */
    async testErrorStatistics() {
        this.errorMonitor.setEnabled(true);
        this.errorMonitor.setUser('test-user-123');
        this.errorMonitor.errorQueue = [];
        
        // Add some errors
        this.errorMonitor.handleError({ type: 'test1', message: 'Error 1' });
        this.errorMonitor.handleError({ type: 'test2', message: 'Error 2' });
        
        const stats = this.errorMonitor.getErrorStats();
        
        this.assertType(stats, 'object', 'Should return stats object');
        this.assertEqual(stats.userId, 'test-user-123', 'Should include user ID');
        this.assertEqual(stats.errorsQueued, 2, 'Should count queued errors');
        this.assertEqual(stats.isEnabled, true, 'Should include enabled status');
        this.assertType(stats.sessionId, 'string', 'Should include session ID');
        this.assertType(stats.lastError, 'object', 'Should include last error');
        this.assertEqual(stats.lastError.type, 'test2', 'Should include correct last error');
    }

    // ==================== MAIN TEST RUNNER ====================

    /**
     * Run all error handling tests
     */
    async runAllTests() {
        console.log('🧪 Starting Error Handling Unit Tests...\n');
        
        const tests = [
            // Error Message Formatting Tests
            ['API Error Message Formatting', this.testApiErrorMessageFormatting],
            ['Auth Error Message Formatting', this.testAuthErrorMessageFormatting],
            ['Payment Error Message Formatting', this.testPaymentErrorMessageFormatting],
            ['File Error Message Formatting', this.testFileErrorMessageFormatting],
            ['Visualizer Error Message Formatting', this.testVisualizerErrorMessageFormatting],
            ['Resource Error Message Formatting', this.testResourceErrorMessageFormatting],
            ['Unknown Error Message Formatting', this.testUnknownErrorMessageFormatting],
            
            // Log Formatter Tests
            ['Log Entry Formatting', this.testLogEntryFormatting],
            ['Error Formatting', this.testErrorFormatting],
            ['Context Formatting', this.testContextFormatting],
            ['API Request Formatting', this.testApiRequestFormatting],
            ['API Response Formatting', this.testApiResponseFormatting],
            ['Message Truncation', this.testMessageTruncation],
            
            // Error Logging Tests
            ['Enhanced Logger Error Logging', this.testEnhancedLoggerErrorLogging],
            ['Log Entry Creation with Error', this.testLogEntryCreationWithError],
            ['Error Monitor Handling', this.testErrorMonitorHandling],
            ['Error Monitor API Error Logging', this.testErrorMonitorApiErrorLogging],
            ['Error Monitor Auth Error Logging', this.testErrorMonitorAuthErrorLogging],
            ['Error Monitor Payment Error Logging', this.testErrorMonitorPaymentErrorLogging],
            ['Critical Error Detection', this.testCriticalErrorDetection],
            ['Error Statistics', this.testErrorStatistics]
        ];

        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }

        this.printSummary();
        return this.results;
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ERROR HANDLING UNIT TESTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testCount}`);
        console.log(`✅ Passed: ${this.passCount}`);
        console.log(`❌ Failed: ${this.failCount}`);
        console.log(`Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
        
        if (this.failCount > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(result => result.status === 'FAIL' || result.status === 'ERROR')
                .forEach(result => {
                    console.log(`  - ${result.test}${result.error ? ': ' + result.error : ''}`);
                });
        }
        
        console.log('='.repeat(60));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ErrorHandlingUnitTests = ErrorHandlingUnitTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandlingUnitTests;
}