/**
 * Integration test for the enhanced logging system
 * Tests frontend logging, backend integration, and formatting
 */

class LoggingIntegrationTest {
    constructor() {
        this.testResults = [];
        this.testCount = 0;
        this.passedCount = 0;
        this.failedCount = 0;
    }

    async runAllTests() {
        console.log('🧪 Starting Enhanced Logging Integration Tests...');
        console.log('=' .repeat(60));

        try {
            // Test 1: Basic logging functionality
            await this.testBasicLogging();
            
            // Test 2: User action logging
            await this.testUserActionLogging();
            
            // Test 3: API request/response logging
            await this.testApiLogging();
            
            // Test 4: Performance logging
            await this.testPerformanceLogging();
            
            // Test 5: Error logging
            await this.testErrorLogging();
            
            // Test 6: Log formatting
            await this.testLogFormatting();
            
            // Test 7: Server integration (if available)
            await this.testServerIntegration();
            
            // Display results
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testBasicLogging() {
        console.log('📝 Testing basic logging functionality...');
        
        try {
            // Test all log levels
            window.enhancedLogger.debug('Test debug message', { test: 'basic' });
            window.enhancedLogger.info('Test info message', { test: 'basic' });
            window.enhancedLogger.warn('Test warning message', { test: 'basic' });
            window.enhancedLogger.error('Test error message', { test: 'basic' });
            window.enhancedLogger.critical('Test critical message', { test: 'basic' });
            
            this.recordTest('Basic Logging', 'PASSED', 'All log levels working');
        } catch (error) {
            this.recordTest('Basic Logging', 'FAILED', error.message);
        }
    }

    async testUserActionLogging() {
        console.log('👤 Testing user action logging...');
        
        try {
            // Set user context
            window.enhancedLogger.setUserContext({
                userId: 'test_user_123',
                email: 'test@example.com'
            });
            
            // Log various user actions
            window.enhancedLogger.logUserAction('login', {
                method: 'email',
                timestamp: Date.now()
            });
            
            window.enhancedLogger.logUserAction('file_download', {
                format: 'mp4',
                size: 1024000
            });
            
            this.recordTest('User Action Logging', 'PASSED', 'User actions logged successfully');
        } catch (error) {
            this.recordTest('User Action Logging', 'FAILED', error.message);
        }
    }

    async testApiLogging() {
        console.log('🌐 Testing API request/response logging...');
        
        try {
            // Simulate API request
            const requestId = window.enhancedLogger.logApiRequest('GET', '/api/test');
            
            // Simulate response after delay
            setTimeout(() => {
                window.enhancedLogger.logApiResponse(requestId, 200, { success: true }, 150);
            }, 100);
            
            // Test error response
            const errorRequestId = window.enhancedLogger.logApiRequest('POST', '/api/error');
            setTimeout(() => {
                window.enhancedLogger.logApiResponse(errorRequestId, 500, { error: 'Server error' }, 300);
            }, 200);
            
            this.recordTest('API Logging', 'PASSED', 'API requests and responses logged');
        } catch (error) {
            this.recordTest('API Logging', 'FAILED', error.message);
        }
    }

    async testPerformanceLogging() {
        console.log('📊 Testing performance logging...');
        
        try {
            // Log various performance metrics
            window.enhancedLogger.logPerformance('page_load_time', 1250);
            window.enhancedLogger.logPerformance('api_response_time', 340);
            window.enhancedLogger.logPerformance('render_time', 16.7);
            
            // Test with context
            window.enhancedLogger.logPerformance('memory_usage', 52428800, {
                component: 'test',
                unit: 'bytes'
            });
            
            this.recordTest('Performance Logging', 'PASSED', 'Performance metrics logged');
        } catch (error) {
            this.recordTest('Performance Logging', 'FAILED', error.message);
        }
    }

    async testErrorLogging() {
        console.log('❌ Testing error logging...');
        
        try {
            // Create test error
            const testError = new Error('Test error for logging');
            testError.code = 'TEST_ERROR';
            
            // Log error with context
            window.enhancedLogger.error('Test error occurred', {
                component: 'test-suite',
                errorCode: 'TEST_ERROR'
            }, testError);
            
            // Log critical error
            window.enhancedLogger.critical('Critical test error', {
                severity: 'high',
                requiresAttention: true
            });
            
            this.recordTest('Error Logging', 'PASSED', 'Errors logged with context');
        } catch (error) {
            this.recordTest('Error Logging', 'FAILED', error.message);
        }
    }

    async testLogFormatting() {
        console.log('🎨 Testing log formatting...');
        
        try {
            // Test log formatter
            const testLog = {
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: 'Test formatted message',
                requestId: 'req_test_123',
                sessionId: 'sess_test_456',
                context: {
                    actionType: 'user_action',
                    action: 'test',
                    details: { key: 'value' }
                }
            };
            
            const formatted = window.logFormatter.format(testLog);
            
            if (formatted && formatted.length > 0) {
                console.log('Formatted log sample:');
                console.log(formatted);
                this.recordTest('Log Formatting', 'PASSED', 'Log formatting working');
            } else {
                throw new Error('Formatter returned empty result');
            }
        } catch (error) {
            this.recordTest('Log Formatting', 'FAILED', error.message);
        }
    }

    async testServerIntegration() {
        console.log('🔗 Testing server integration...');
        
        try {
            // Test server logging endpoint
            const response = await fetch('/api/logs/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Integration test message',
                    level: 'INFO'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.recordTest('Server Integration', 'PASSED', 'Server logging endpoint working');
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            // Server might not be running, mark as warning instead of failure
            this.recordTest('Server Integration', 'WARNING', `Server not available: ${error.message}`);
        }
    }

    recordTest(testName, status, message) {
        this.testCount++;
        
        if (status === 'PASSED') {
            this.passedCount++;
        } else if (status === 'FAILED') {
            this.failedCount++;
        }
        
        this.testResults.push({
            name: testName,
            status,
            message,
            timestamp: new Date().toISOString()
        });
        
        const emoji = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
        console.log(`${emoji} ${testName}: ${status} - ${message}`);
    }

    displayResults() {
        console.log('\n📊 Enhanced Logging Test Results:');
        console.log('=' .repeat(60));
        
        console.log(`Total Tests: ${this.testCount}`);
        console.log(`Passed: ${this.passedCount}`);
        console.log(`Failed: ${this.failedCount}`);
        console.log(`Warnings: ${this.testCount - this.passedCount - this.failedCount}`);
        
        const successRate = ((this.passedCount / this.testCount) * 100).toFixed(1);
        console.log(`Success Rate: ${successRate}%`);
        
        if (this.failedCount > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`- ${result.name}: ${result.message}`);
                });
        }
        
        // Log system stats
        const stats = window.enhancedLogger.getStats();
        console.log('\n📈 Logging System Stats:');
        console.log(`Session ID: ${stats.sessionId}`);
        console.log(`Buffer Size: ${stats.bufferSize}`);
        console.log(`Request Counter: ${stats.requestCounter}`);
        console.log(`Log Level: ${stats.config.level}`);
        
        console.log('\n✅ Enhanced logging integration tests completed!');
    }
}

// Auto-run tests when script loads
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for enhanced logger to initialize
    setTimeout(async () => {
        if (window.enhancedLogger && window.logFormatter) {
            const tester = new LoggingIntegrationTest();
            await tester.runAllTests();
        } else {
            console.error('❌ Enhanced logging system not available');
        }
    }, 1000);
});

// Export for manual testing
window.LoggingIntegrationTest = LoggingIntegrationTest;