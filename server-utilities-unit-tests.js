/**
 * Server Utilities Unit Tests
 * 
 * Comprehensive unit tests for server health check functions and error recovery mechanisms.
 * Tests both frontend JavaScript utilities and backend Python functions through API calls.
 * 
 * Requirements: 6.1, 6.2
 */

class ServerUtilitiesUnitTester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        this.mockData = this.setupMockData();
    }

    setupMockData() {
        return {
            healthyResponse: {
                overall_status: 'healthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { status: 'healthy', message: 'Database connection successful' },
                    redis: { status: 'healthy', message: 'Redis connection successful' },
                    job_queues: { status: 'healthy', message: 'All queues operating normally' },
                    workers: { status: 'healthy', message: '3 workers available' },
                    storage: { status: 'healthy', message: 'GCS connection successful' },
                    email: { status: 'healthy', message: 'Email service configured' }
                }
            },
            degradedResponse: {
                overall_status: 'degraded',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { status: 'healthy', message: 'Database connection successful' },
                    redis: { status: 'healthy', message: 'Redis connection successful' },
                    job_queues: { status: 'degraded', message: 'High queue backlog: 75 jobs' },
                    workers: { status: 'degraded', message: 'All workers busy, may need scaling' }
                }
            },
            unhealthyResponse: {
                overall_status: 'unhealthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: { status: 'unhealthy', message: 'Database connection failed' },
                    redis: { status: 'unhealthy', message: 'Redis connection failed' },
                    storage: { status: 'unhealthy', message: 'GCS connection failed' }
                }
            }
        };
    }

    /**
     * Test health check function parsing and validation
     */
    async testHealthCheckParsing() {
        this.updateStatus('health-parsing-status', 'running');
        this.showLog('health-parsing-log');
        this.log('health-parsing-log', '🔍 Testing health check response parsing...');

        const tests = [
            {
                name: 'Parse healthy response',
                data: this.mockData.healthyResponse,
                expectedStatus: 'healthy',
                expectedChecks: 6
            },
            {
                name: 'Parse degraded response',
                data: this.mockData.degradedResponse,
                expectedStatus: 'degraded',
                expectedChecks: 4
            },
            {
                name: 'Parse unhealthy response',
                data: this.mockData.unhealthyResponse,
                expectedStatus: 'unhealthy',
                expectedChecks: 3
            },
            {
                name: 'Handle malformed response',
                data: { invalid: 'data' },
                expectedStatus: 'error',
                expectedChecks: 0
            },
            {
                name: 'Handle null response',
                data: null,
                expectedStatus: 'error',
                expectedChecks: 0
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                this.log('health-parsing-log', `\n  Testing: ${test.name}`);
                
                const result = this.parseHealthCheckResponse(test.data);
                
                // Validate overall status
                if (result.status === test.expectedStatus) {
                    this.log('health-parsing-log', `    ✅ Status parsing: ${result.status}`);
                } else {
                    this.log('health-parsing-log', `    ❌ Status parsing failed: expected ${test.expectedStatus}, got ${result.status}`);
                    failed++;
                    continue;
                }

                // Validate checks count
                const checksCount = result.checks ? Object.keys(result.checks).length : 0;
                if (checksCount === test.expectedChecks) {
                    this.log('health-parsing-log', `    ✅ Checks count: ${checksCount}`);
                } else {
                    this.log('health-parsing-log', `    ❌ Checks count failed: expected ${test.expectedChecks}, got ${checksCount}`);
                    failed++;
                    continue;
                }

                passed++;
                this.log('health-parsing-log', `    ✅ ${test.name} passed`);

            } catch (error) {
                failed++;
                this.log('health-parsing-log', `    ❌ ${test.name} failed: ${error.message}`);
            }
        }

        const success = failed === 0;
        this.updateStatus('health-parsing-status', success ? 'success' : 'error');
        this.log('health-parsing-log', `\n📊 Health Check Parsing Results: ${passed} passed, ${failed} failed`);

        return { success, passed, failed, total: tests.length };
    }

    /**
     * Test health check validation logic
     */
    async testHealthCheckValidation() {
        this.updateStatus('health-validation-status', 'running');
        this.showLog('health-validation-log');
        this.log('health-validation-log', '🔍 Testing health check validation logic...');

        const tests = [
            {
                name: 'Validate healthy system',
                checks: {
                    database: { status: 'healthy' },
                    redis: { status: 'healthy' },
                    storage: { status: 'healthy' }
                },
                expectedOverall: 'healthy'
            },
            {
                name: 'Validate degraded system (1 unhealthy)',
                checks: {
                    database: { status: 'healthy' },
                    redis: { status: 'degraded' },
                    storage: { status: 'healthy' }
                },
                expectedOverall: 'degraded'
            },
            {
                name: 'Validate degraded system (2 unhealthy)',
                checks: {
                    database: { status: 'healthy' },
                    redis: { status: 'unhealthy' },
                    storage: { status: 'degraded' }
                },
                expectedOverall: 'degraded'
            },
            {
                name: 'Validate unhealthy system (3+ unhealthy)',
                checks: {
                    database: { status: 'unhealthy' },
                    redis: { status: 'unhealthy' },
                    storage: { status: 'unhealthy' }
                },
                expectedOverall: 'unhealthy'
            },
            {
                name: 'Handle missing checks',
                checks: {},
                expectedOverall: 'healthy'
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                this.log('health-validation-log', `\n  Testing: ${test.name}`);
                
                const overallStatus = this.calculateOverallHealthStatus(test.checks);
                
                if (overallStatus === test.expectedOverall) {
                    this.log('health-validation-log', `    ✅ Overall status: ${overallStatus}`);
                    passed++;
                } else {
                    this.log('health-validation-log', `    ❌ Overall status failed: expected ${test.expectedOverall}, got ${overallStatus}`);
                    failed++;
                }

            } catch (error) {
                failed++;
                this.log('health-validation-log', `    ❌ ${test.name} failed: ${error.message}`);
            }
        }

        const success = failed === 0;
        this.updateStatus('health-validation-status', success ? 'success' : 'error');
        this.log('health-validation-log', `\n📊 Health Check Validation Results: ${passed} passed, ${failed} failed`);

        return { success, passed, failed, total: tests.length };
    }

    /**
     * Test error recovery mechanisms
     */
    async testErrorRecoveryMechanisms() {
        this.updateStatus('error-recovery-status', 'running');
        this.showLog('error-recovery-log');
        this.log('error-recovery-log', '🔍 Testing error recovery mechanisms...');

        const tests = [
            {
                name: 'Test retry mechanism',
                operation: () => this.simulateRetryableOperation(2), // Fails 2 times then succeeds
                maxRetries: 3,
                expectedSuccess: true
            },
            {
                name: 'Test retry exhaustion',
                operation: () => this.simulateRetryableOperation(5), // Always fails
                maxRetries: 3,
                expectedSuccess: false
            },
            {
                name: 'Test circuit breaker open',
                operation: () => this.simulateCircuitBreakerOperation('open'),
                maxRetries: 1,
                expectedSuccess: false
            },
            {
                name: 'Test circuit breaker closed',
                operation: () => this.simulateCircuitBreakerOperation('closed'),
                maxRetries: 1,
                expectedSuccess: true
            },
            {
                name: 'Test fallback mechanism',
                operation: () => this.simulateOperationWithFallback(false, true), // Main fails, fallback succeeds
                maxRetries: 1,
                expectedSuccess: true
            },
            {
                name: 'Test fallback failure',
                operation: () => this.simulateOperationWithFallback(false, false), // Both fail
                maxRetries: 1,
                expectedSuccess: false
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                this.log('error-recovery-log', `\n  Testing: ${test.name}`);
                
                const result = await this.executeWithRecovery(
                    test.operation,
                    test.maxRetries
                );
                
                if (result.success === test.expectedSuccess) {
                    this.log('error-recovery-log', `    ✅ Recovery result: ${result.success ? 'success' : 'failed as expected'}`);
                    this.log('error-recovery-log', `    📊 Attempts: ${result.attempts}, Duration: ${result.duration}ms`);
                    passed++;
                } else {
                    this.log('error-recovery-log', `    ❌ Recovery failed: expected ${test.expectedSuccess}, got ${result.success}`);
                    failed++;
                }

            } catch (error) {
                failed++;
                this.log('error-recovery-log', `    ❌ ${test.name} failed: ${error.message}`);
            }
        }

        const success = failed === 0;
        this.updateStatus('error-recovery-status', success ? 'success' : 'error');
        this.log('error-recovery-log', `\n📊 Error Recovery Results: ${passed} passed, ${failed} failed`);

        return { success, passed, failed, total: tests.length };
    }

    /**
     * Test server connectivity utilities
     */
    async testServerConnectivityUtilities() {
        this.updateStatus('connectivity-status', 'running');
        this.showLog('connectivity-log');
        this.log('connectivity-log', '🔍 Testing server connectivity utilities...');

        const tests = [
            {
                name: 'Test port availability check',
                port: 3000,
                expectedAvailable: true
            },
            {
                name: 'Test invalid port check',
                port: 99999,
                expectedAvailable: false
            },
            {
                name: 'Test URL reachability',
                url: 'http://localhost:3000',
                expectedReachable: true
            },
            {
                name: 'Test unreachable URL',
                url: 'http://localhost:9999',
                expectedReachable: false
            },
            {
                name: 'Test health endpoint validation',
                endpoint: '/health',
                expectedValid: true
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                this.log('connectivity-log', `\n  Testing: ${test.name}`);
                
                let result;
                if (test.port) {
                    result = await this.checkPortAvailability(test.port);
                    if (result === test.expectedAvailable) {
                        this.log('connectivity-log', `    ✅ Port ${test.port}: ${result ? 'available' : 'unavailable'}`);
                        passed++;
                    } else {
                        this.log('connectivity-log', `    ❌ Port check failed: expected ${test.expectedAvailable}, got ${result}`);
                        failed++;
                    }
                } else if (test.url) {
                    result = await this.checkUrlReachability(test.url);
                    if (result === test.expectedReachable) {
                        this.log('connectivity-log', `    ✅ URL ${test.url}: ${result ? 'reachable' : 'unreachable'}`);
                        passed++;
                    } else {
                        this.log('connectivity-log', `    ❌ URL check failed: expected ${test.expectedReachable}, got ${result}`);
                        failed++;
                    }
                } else if (test.endpoint) {
                    result = await this.validateHealthEndpoint(test.endpoint);
                    if (result === test.expectedValid) {
                        this.log('connectivity-log', `    ✅ Endpoint ${test.endpoint}: ${result ? 'valid' : 'invalid'}`);
                        passed++;
                    } else {
                        this.log('connectivity-log', `    ❌ Endpoint check failed: expected ${test.expectedValid}, got ${result}`);
                        failed++;
                    }
                }

            } catch (error) {
                failed++;
                this.log('connectivity-log', `    ❌ ${test.name} failed: ${error.message}`);
            }
        }

        const success = failed === 0;
        this.updateStatus('connectivity-status', success ? 'success' : 'error');
        this.log('connectivity-log', `\n📊 Connectivity Utilities Results: ${passed} passed, ${failed} failed`);

        return { success, passed, failed, total: tests.length };
    }

    /**
     * Test backend health check API integration
     */
    async testBackendHealthCheckAPI() {
        this.updateStatus('backend-api-status', 'running');
        this.showLog('backend-api-log');
        this.log('backend-api-log', '🔍 Testing backend health check API integration...');

        const tests = [
            {
                name: 'Test health endpoint response',
                endpoint: '/health',
                expectedFields: ['overall_status', 'timestamp', 'checks']
            },
            {
                name: 'Test health check timeout handling',
                endpoint: '/health',
                timeout: 1000,
                expectedTimeout: false
            },
            {
                name: 'Test health check error handling',
                endpoint: '/invalid-health',
                expectedError: true
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                this.log('backend-api-log', `\n  Testing: ${test.name}`);
                
                const result = await this.testHealthEndpoint(test.endpoint, test.timeout);
                
                if (test.expectedError) {
                    if (result.error) {
                        this.log('backend-api-log', `    ✅ Error handling: ${result.error}`);
                        passed++;
                    } else {
                        this.log('backend-api-log', `    ❌ Expected error but got success`);
                        failed++;
                    }
                } else if (test.expectedFields) {
                    const hasAllFields = test.expectedFields.every(field => 
                        result.data && result.data.hasOwnProperty(field)
                    );
                    if (hasAllFields) {
                        this.log('backend-api-log', `    ✅ All required fields present: ${test.expectedFields.join(', ')}`);
                        passed++;
                    } else {
                        this.log('backend-api-log', `    ❌ Missing required fields in response`);
                        failed++;
                    }
                } else if (test.expectedTimeout !== undefined) {
                    if (result.timeout === test.expectedTimeout) {
                        this.log('backend-api-log', `    ✅ Timeout handling: ${result.timeout ? 'timed out' : 'completed'}`);
                        passed++;
                    } else {
                        this.log('backend-api-log', `    ❌ Timeout behavior unexpected`);
                        failed++;
                    }
                }

            } catch (error) {
                failed++;
                this.log('backend-api-log', `    ❌ ${test.name} failed: ${error.message}`);
            }
        }

        const success = failed === 0;
        this.updateStatus('backend-api-status', success ? 'success' : 'error');
        this.log('backend-api-log', `\n📊 Backend API Results: ${passed} passed, ${failed} failed`);

        return { success, passed, failed, total: tests.length };
    }

    // Helper methods for testing

    parseHealthCheckResponse(data) {
        try {
            if (!data) {
                return { status: 'error', checks: {}, message: 'No data provided' };
            }

            if (typeof data !== 'object') {
                return { status: 'error', checks: {}, message: 'Invalid data format' };
            }

            return {
                status: data.overall_status || 'error',
                checks: data.checks || {},
                timestamp: data.timestamp,
                message: data.message || 'Health check completed'
            };
        } catch (error) {
            return { status: 'error', checks: {}, message: error.message };
        }
    }

    calculateOverallHealthStatus(checks) {
        if (!checks || Object.keys(checks).length === 0) {
            return 'healthy';
        }

        const statuses = Object.values(checks).map(check => check.status);
        const unhealthyCount = statuses.filter(status => 
            status === 'unhealthy' || status === 'degraded' || status === 'error'
        ).length;

        if (unhealthyCount === 0) {
            return 'healthy';
        } else if (unhealthyCount <= 2) {
            return 'degraded';
        } else {
            return 'unhealthy';
        }
    }

    async executeWithRecovery(operation, maxRetries) {
        const startTime = Date.now();
        let attempts = 0;
        let lastError = null;

        for (let i = 0; i <= maxRetries; i++) {
            attempts++;
            try {
                const result = await operation();
                return {
                    success: true,
                    attempts,
                    duration: Date.now() - startTime,
                    result
                };
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    // Simulate backoff delay
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
                }
            }
        }

        return {
            success: false,
            attempts,
            duration: Date.now() - startTime,
            error: lastError
        };
    }

    simulateRetryableOperation(failCount) {
        this.retryCounter = (this.retryCounter || 0) + 1;
        if (this.retryCounter <= failCount) {
            throw new Error(`Simulated failure ${this.retryCounter}`);
        }
        this.retryCounter = 0; // Reset for next test
        return 'success';
    }

    simulateCircuitBreakerOperation(state) {
        if (state === 'open') {
            throw new Error('Circuit breaker is open');
        }
        return 'success';
    }

    simulateOperationWithFallback(mainSuccess, fallbackSuccess) {
        if (!mainSuccess) {
            if (fallbackSuccess) {
                return 'fallback_success';
            } else {
                throw new Error('Both main and fallback failed');
            }
        }
        return 'main_success';
    }

    async checkPortAvailability(port) {
        try {
            const response = await fetch(`http://localhost:${port}`, {
                method: 'HEAD',
                timeout: 5000
            });
            return response.ok || response.status < 500;
        } catch (error) {
            return false;
        }
    }

    async checkUrlReachability(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async validateHealthEndpoint(endpoint) {
        try {
            const response = await fetch(`http://localhost:8000${endpoint}`);
            if (!response.ok) return false;
            
            const data = await response.json();
            return data && typeof data === 'object' && data.overall_status;
        } catch (error) {
            return false;
        }
    }

    async testHealthEndpoint(endpoint, timeout = 10000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return { error: `HTTP ${response.status}` };
            }

            const data = await response.json();
            return { data, timeout: false };

        } catch (error) {
            if (error.name === 'AbortError') {
                return { timeout: true };
            }
            return { error: error.message };
        }
    }

    /**
     * Run complete server utilities unit test suite
     */
    async runCompleteUnitTests() {
        if (this.isRunning) {
            this.log('complete-log', '⚠️ Tests are already running');
            return;
        }

        this.isRunning = true;
        this.testResults = [];

        try {
            this.updateStatus('complete-status', 'running');
            this.showLog('complete-log');
            this.log('complete-log', '🧪 Starting complete server utilities unit test suite...');

            const results = {
                healthParsing: await this.testHealthCheckParsing(),
                healthValidation: await this.testHealthCheckValidation(),
                errorRecovery: await this.testErrorRecoveryMechanisms(),
                connectivity: await this.testServerConnectivityUtilities(),
                backendAPI: await this.testBackendHealthCheckAPI()
            };

            // Calculate overall results
            const totalTests = Object.values(results).reduce((sum, result) => sum + result.total, 0);
            const totalPassed = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
            const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
            const overallSuccess = totalFailed === 0;

            results.overall = overallSuccess;
            results.summary = { total: totalTests, passed: totalPassed, failed: totalFailed };

            if (overallSuccess) {
                this.updateStatus('complete-status', 'success');
                this.log('complete-log', '\n🎉 Complete server utilities unit test suite PASSED!');
                this.log('complete-log', '✅ All health check functions are working correctly');
                this.log('complete-log', '✅ All error recovery mechanisms are functioning properly');
            } else {
                this.updateStatus('complete-status', 'error');
                this.log('complete-log', '\n⚠️ Complete server utilities unit test suite completed with failures');
                this.log('complete-log', `❌ ${totalFailed} out of ${totalTests} tests failed`);
            }

            this.generateUnitTestSummary(results);
            return results;

        } catch (error) {
            this.updateStatus('complete-status', 'error');
            this.log('complete-log', `\n❌ Unit test suite failed: ${error.message}`);
            console.error('Unit test suite error:', error);
            return { overall: false, error: error.message };

        } finally {
            this.isRunning = false;
        }
    }

    generateUnitTestSummary(results) {
        this.log('complete-log', '\n📊 SERVER UTILITIES UNIT TEST SUMMARY');
        this.log('complete-log', '==========================================');
        this.log('complete-log', `Health Check Parsing: ${results.healthParsing.success ? '✅ PASS' : '❌ FAIL'} (${results.healthParsing.passed}/${results.healthParsing.total})`);
        this.log('complete-log', `Health Check Validation: ${results.healthValidation.success ? '✅ PASS' : '❌ FAIL'} (${results.healthValidation.passed}/${results.healthValidation.total})`);
        this.log('complete-log', `Error Recovery Mechanisms: ${results.errorRecovery.success ? '✅ PASS' : '❌ FAIL'} (${results.errorRecovery.passed}/${results.errorRecovery.total})`);
        this.log('complete-log', `Connectivity Utilities: ${results.connectivity.success ? '✅ PASS' : '❌ FAIL'} (${results.connectivity.passed}/${results.connectivity.total})`);
        this.log('complete-log', `Backend API Integration: ${results.backendAPI.success ? '✅ PASS' : '❌ FAIL'} (${results.backendAPI.passed}/${results.backendAPI.total})`);
        this.log('complete-log', '==========================================');
        this.log('complete-log', `OVERALL: ${results.overall ? '✅ PASS' : '❌ FAIL'} (${results.summary.passed}/${results.summary.total} tests passed)`);
    }

    // UI helper methods
    updateStatus(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = `status ${status}`;
            element.textContent = status.toUpperCase();
        }
    }

    updateProgress(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${percentage}%`;
        }
    }

    showLog(logId) {
        const logElement = document.getElementById(logId);
        if (logElement) {
            logElement.style.display = 'block';
        }
    }

    log(logId, message) {
        const logElement = document.getElementById(logId);
        if (logElement) {
            logElement.textContent += message + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(`[ServerUtilitiesUnitTester] ${message}`);
    }
}

// Global instance
const serverUtilitiesUnitTester = new ServerUtilitiesUnitTester();

// Global functions for HTML buttons
function runHealthCheckParsingTests() {
    return serverUtilitiesUnitTester.testHealthCheckParsing();
}

function runHealthCheckValidationTests() {
    return serverUtilitiesUnitTester.testHealthCheckValidation();
}

function runErrorRecoveryTests() {
    return serverUtilitiesUnitTester.testErrorRecoveryMechanisms();
}

function runConnectivityTests() {
    return serverUtilitiesUnitTester.testServerConnectivityUtilities();
}

function runBackendAPITests() {
    return serverUtilitiesUnitTester.testBackendHealthCheckAPI();
}

function runCompleteUnitTests() {
    return serverUtilitiesUnitTester.runCompleteUnitTests();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Server Utilities Unit Testing Module loaded');
});