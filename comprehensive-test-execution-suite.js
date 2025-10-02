/**
 * Comprehensive Test Execution Suite
 * Task 11.1: Run complete test suite execution
 * 
 * Executes all authentication flow tests, download functionality tests, 
 * server management tests, and logging tests with comprehensive validation
 * 
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1
 */

class ComprehensiveTestExecutionSuite {
    constructor() {
        this.testResults = [];
        this.testSuites = new Map();
        this.isRunning = false;
        this.startTime = null;
        this.currentTest = null;
        this.progressCallback = null;
        this.logCallback = null;
        
        // Test execution configuration
        this.config = {
            timeout: 300000, // 5 minutes per test suite
            retryAttempts: 2,
            parallelExecution: false, // Sequential for better debugging
            generateReport: true,
            saveResults: true
        };
        
        // Initialize test suites registry
        this.initializeTestSuites();
    }

    /**
     * Initialize all available test suites
     */
    initializeTestSuites() {
        this.testSuites.set('authentication', {
            name: 'Authentication Flow Tests',
            description: 'Registration, login, and session management validation',
            requirements: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5'],
            testerClass: 'AuthenticationTestingModule',
            priority: 1,
            estimatedDuration: 60000 // 1 minute
        });

        this.testSuites.set('download-modal', {
            name: 'Download Modal Interception Tests',
            description: 'Download button interception and modal functionality',
            requirements: ['5.1', '5.2', '5.3', '5.4', '5.5'],
            testerClass: 'DownloadModalInterceptionTester',
            priority: 2,
            estimatedDuration: 45000 // 45 seconds
        });

        this.testSuites.set('format-downloads', {
            name: 'Format-Specific Download Tests',
            description: 'MP4, MOV, MP3, GIF download validation with quality checks',
            requirements: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '7.1', '7.2', '7.3', '7.4', '7.5'],
            testerClass: 'FormatSpecificDownloadTester',
            priority: 3,
            estimatedDuration: 90000 // 1.5 minutes
        });

        this.testSuites.set('server-management', {
            name: 'Server Management Tests',
            description: 'Server startup, health checks, and connectivity validation',
            requirements: ['6.1', '6.2', '6.3', '6.4', '6.5'],
            testerClass: 'ServerStartupTester',
            priority: 4,
            estimatedDuration: 75000 // 1.25 minutes
        });

        this.testSuites.set('logging', {
            name: 'Enhanced Logging Tests',
            description: 'Request logging, error tracking, and log formatting validation',
            requirements: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '9.1', '9.2', '9.3', '9.4', '9.5'],
            testerClass: 'EnhancedLogger',
            priority: 5,
            estimatedDuration: 30000 // 30 seconds
        });
    }

    /**
     * Execute all test suites comprehensively
     */
    async executeAllTests(options = {}) {
        if (this.isRunning) {
            throw new Error('Test execution already in progress');
        }

        this.isRunning = true;
        this.startTime = Date.now();
        this.testResults = [];
        
        // Merge options with default config
        const config = { ...this.config, ...options };
        
        try {
            this.log('🚀 Starting Comprehensive Test Execution Suite', 'info');
            this.log(`📋 Executing ${this.testSuites.size} test suites`, 'info');
            
            // Pre-execution validation
            await this.validateTestEnvironment();
            
            // Execute test suites based on priority
            const sortedSuites = Array.from(this.testSuites.entries())
                .sort((a, b) => a[1].priority - b[1].priority);
            
            let completedTests = 0;
            const totalTests = sortedSuites.length;
            
            for (const [suiteId, suiteConfig] of sortedSuites) {
                try {
                    this.currentTest = suiteConfig.name;
                    this.updateProgress(completedTests, totalTests, `Executing: ${suiteConfig.name}`);
                    
                    this.log(`\n🧪 Executing: ${suiteConfig.name}`, 'info');
                    this.log(`📝 Description: ${suiteConfig.description}`, 'info');
                    this.log(`📋 Requirements: ${suiteConfig.requirements.join(', ')}`, 'info');
                    
                    const suiteResult = await this.executeSingleTestSuite(suiteId, suiteConfig, config);
                    this.testResults.push(suiteResult);
                    
                    completedTests++;
                    this.updateProgress(completedTests, totalTests, `Completed: ${suiteConfig.name}`);
                    
                    // Log suite completion
                    const status = suiteResult.success ? '✅ PASSED' : '❌ FAILED';
                    this.log(`${status} ${suiteConfig.name} (${suiteResult.duration}ms)`, 
                            suiteResult.success ? 'success' : 'error');
                    
                } catch (error) {
                    this.log(`❌ Suite execution failed: ${suiteConfig.name} - ${error.message}`, 'error');
                    this.testResults.push({
                        suiteId,
                        suiteName: suiteConfig.name,
                        success: false,
                        error: error.message,
                        duration: 0,
                        timestamp: new Date().toISOString()
                    });
                    completedTests++;
                }
            }
            
            // Generate comprehensive report
            const report = await this.generateComprehensiveReport();
            
            // Save results if configured
            if (config.saveResults) {
                await this.saveTestResults(report);
            }
            
            this.log('\n🎉 Comprehensive test execution completed!', 'success');
            this.log(`📊 Overall Success Rate: ${report.summary.successRate}%`, 'info');
            
            return report;
            
        } catch (error) {
            this.log(`❌ Comprehensive test execution failed: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }
    }

    /**
     * Execute a single test suite with retry logic
     */
    async executeSingleTestSuite(suiteId, suiteConfig, config) {
        const startTime = Date.now();
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                if (attempt > 1) {
                    this.log(`🔄 Retry attempt ${attempt}/${config.retryAttempts} for ${suiteConfig.name}`, 'warning');
                }
                
                // Initialize the test suite
                const tester = await this.initializeTestSuite(suiteConfig.testerClass);
                
                // Execute the test suite with timeout
                const result = await this.executeWithTimeout(
                    () => this.runTestSuite(tester, suiteId),
                    config.timeout,
                    `${suiteConfig.name} execution timeout`
                );
                
                // Validate test results
                this.validateTestSuiteResults(result, suiteConfig);
                
                return {
                    suiteId,
                    suiteName: suiteConfig.name,
                    success: true,
                    result,
                    duration: Date.now() - startTime,
                    attempt,
                    timestamp: new Date().toISOString(),
                    requirements: suiteConfig.requirements
                };
                
            } catch (error) {
                lastError = error;
                this.log(`❌ Attempt ${attempt} failed: ${error.message}`, 'error');
                
                if (attempt < config.retryAttempts) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // All attempts failed
        throw new Error(`All ${config.retryAttempts} attempts failed. Last error: ${lastError.message}`);
    }

    /**
     * Initialize a test suite instance
     */
    async initializeTestSuite(testerClassName) {
        // Check if the tester class is available
        if (!window[testerClassName]) {
            throw new Error(`Test suite class ${testerClassName} not found. Ensure the module is loaded.`);
        }
        
        const TesterClass = window[testerClassName];
        const tester = new TesterClass();
        
        // Initialize if the method exists
        if (typeof tester.initialize === 'function') {
            await tester.initialize();
        } else if (typeof tester.init === 'function') {
            await tester.init();
        }
        
        return tester;
    }

    /**
     * Run a specific test suite
     */
    async runTestSuite(tester, suiteId) {
        switch (suiteId) {
            case 'authentication':
                return await tester.runAllTests();
                
            case 'download-modal':
                return await tester.runAllTests();
                
            case 'format-downloads':
                return await tester.runAllTests();
                
            case 'server-management':
                return await tester.runCompleteTest();
                
            case 'logging':
                return await this.runLoggingTests(tester);
                
            default:
                throw new Error(`Unknown test suite: ${suiteId}`);
        }
    }

    /**
     * Run logging tests (custom implementation)
     */
    async runLoggingTests(logger) {
        const results = [];
        
        try {
            // Test request logging
            this.log('Testing request logging functionality...', 'info');
            logger.logRequest('GET', '/api/test', 200);
            logger.logRequest('POST', '/api/auth/login', 201);
            results.push({ test: 'Request Logging', status: 'PASSED' });
            
            // Test error logging
            this.log('Testing error logging functionality...', 'info');
            const testError = new Error('Test error for logging validation');
            logger.logError(testError, { context: 'test', userId: 'test-user' });
            results.push({ test: 'Error Logging', status: 'PASSED' });
            
            // Test user action logging
            this.log('Testing user action logging...', 'info');
            logger.logUserAction('login', 'test-user', { ip: '127.0.0.1' });
            logger.logUserAction('download', 'test-user', { format: 'mp4' });
            results.push({ test: 'User Action Logging', status: 'PASSED' });
            
            // Test log formatting
            this.log('Testing log formatting...', 'info');
            const formattedLog = logger.formatLogEntry({
                level: 'info',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                context: { test: true }
            });
            
            if (!formattedLog || typeof formattedLog !== 'string') {
                throw new Error('Log formatting failed');
            }
            results.push({ test: 'Log Formatting', status: 'PASSED' });
            
        } catch (error) {
            results.push({ 
                test: 'Logging Tests', 
                status: 'FAILED', 
                error: error.message 
            });
        }
        
        const passed = results.filter(r => r.status === 'PASSED').length;
        const total = results.length;
        
        return {
            summary: {
                total,
                passed,
                failed: total - passed,
                successRate: total > 0 ? (passed / total) * 100 : 0
            },
            results
        };
    }

    /**
     * Validate test environment before execution
     */
    async validateTestEnvironment() {
        this.log('🔍 Validating test environment...', 'info');
        
        const validations = [
            {
                name: 'DOM Ready',
                check: () => document.readyState === 'complete',
                required: true
            },
            {
                name: 'Required Test Classes',
                check: () => {
                    const requiredClasses = [
                        'AuthenticationTestingModule',
                        'DownloadModalInterceptionTester',
                        'FormatSpecificDownloadTester',
                        'ServerStartupTester'
                    ];
                    return requiredClasses.every(className => window[className]);
                },
                required: true
            },
            {
                name: 'App Configuration',
                check: () => window.appConfig || window.AppConfig,
                required: false
            },
            {
                name: 'API Client',
                check: () => window.apiClient || window.ApiClient,
                required: false
            },
            {
                name: 'Notification System',
                check: () => window.notifications || window.NotificationManager,
                required: false
            }
        ];
        
        const failures = [];
        
        for (const validation of validations) {
            try {
                const passed = validation.check();
                const status = passed ? '✅' : '❌';
                this.log(`  ${status} ${validation.name}`, passed ? 'success' : 'warning');
                
                if (!passed && validation.required) {
                    failures.push(validation.name);
                }
            } catch (error) {
                this.log(`  ❌ ${validation.name}: ${error.message}`, 'error');
                if (validation.required) {
                    failures.push(validation.name);
                }
            }
        }
        
        if (failures.length > 0) {
            throw new Error(`Environment validation failed: ${failures.join(', ')}`);
        }
        
        this.log('✅ Test environment validation passed', 'success');
    }

    /**
     * Validate test suite results
     */
    validateTestSuiteResults(result, suiteConfig) {
        if (!result) {
            throw new Error('Test suite returned no results');
        }
        
        // Check for required result structure
        if (typeof result === 'object' && result.summary) {
            const { summary } = result;
            
            if (typeof summary.total !== 'number' || summary.total <= 0) {
                throw new Error('Invalid test count in results');
            }
            
            if (typeof summary.passed !== 'number' || summary.passed < 0) {
                throw new Error('Invalid passed test count in results');
            }
            
            if (typeof summary.failed !== 'number' || summary.failed < 0) {
                throw new Error('Invalid failed test count in results');
            }
            
            if (summary.total !== summary.passed + summary.failed) {
                throw new Error('Test count mismatch in results');
            }
        }
        
        this.log(`✅ Results validation passed for ${suiteConfig.name}`, 'success');
    }

    /**
     * Execute function with timeout
     */
    async executeWithTimeout(fn, timeout, timeoutMessage) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeout);
            
            Promise.resolve(fn())
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Generate comprehensive test report
     */
    async generateComprehensiveReport() {
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        // Calculate overall statistics
        const totalSuites = this.testResults.length;
        const passedSuites = this.testResults.filter(r => r.success).length;
        const failedSuites = totalSuites - passedSuites;
        
        // Calculate detailed test statistics
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        
        const suiteDetails = this.testResults.map(suiteResult => {
            let suiteTests = 0;
            let suitePassed = 0;
            let suiteFailed = 0;
            
            if (suiteResult.result && suiteResult.result.summary) {
                suiteTests = suiteResult.result.summary.total || 0;
                suitePassed = suiteResult.result.summary.passed || 0;
                suiteFailed = suiteResult.result.summary.failed || 0;
            } else if (suiteResult.result && suiteResult.result.overall) {
                // Handle different result formats
                suiteTests = suiteResult.result.overall.total || 0;
                suitePassed = suiteResult.result.overall.passed || 0;
                suiteFailed = suiteResult.result.overall.failed || 0;
            }
            
            totalTests += suiteTests;
            totalPassed += suitePassed;
            totalFailed += suiteFailed;
            
            return {
                ...suiteResult,
                testStats: {
                    total: suiteTests,
                    passed: suitePassed,
                    failed: suiteFailed,
                    successRate: suiteTests > 0 ? (suitePassed / suiteTests) * 100 : 0
                }
            };
        });
        
        const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
        
        const report = {
            summary: {
                executionTime: new Date().toISOString(),
                totalDuration,
                totalSuites,
                passedSuites,
                failedSuites,
                suiteSuccessRate: totalSuites > 0 ? (passedSuites / totalSuites) * 100 : 0,
                totalTests,
                totalPassed,
                totalFailed,
                successRate: overallSuccessRate,
                status: overallSuccessRate >= 80 ? 'PASSED' : 'FAILED'
            },
            suites: suiteDetails,
            requirements: this.generateRequirementsReport(),
            environment: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href
            }
        };
        
        this.log('\n📊 Comprehensive Test Report Generated', 'info');
        this.log(`📈 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`, 'info');
        this.log(`⏱️  Total Duration: ${totalDuration}ms`, 'info');
        this.log(`🧪 Total Tests: ${totalTests} (${totalPassed} passed, ${totalFailed} failed)`, 'info');
        
        return report;
    }

    /**
     * Generate requirements coverage report
     */
    generateRequirementsReport() {
        const requirementsCoverage = new Map();
        
        // Collect all requirements from test suites
        for (const [suiteId, suiteConfig] of this.testSuites) {
            const suiteResult = this.testResults.find(r => r.suiteId === suiteId);
            const status = suiteResult ? (suiteResult.success ? 'PASSED' : 'FAILED') : 'NOT_RUN';
            
            for (const requirement of suiteConfig.requirements) {
                if (!requirementsCoverage.has(requirement)) {
                    requirementsCoverage.set(requirement, []);
                }
                
                requirementsCoverage.get(requirement).push({
                    suite: suiteConfig.name,
                    status
                });
            }
        }
        
        // Generate coverage summary
        const coverage = Array.from(requirementsCoverage.entries()).map(([requirement, tests]) => {
            const passedTests = tests.filter(t => t.status === 'PASSED').length;
            const totalTests = tests.length;
            const coverage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
            
            return {
                requirement,
                tests,
                coverage,
                status: coverage >= 100 ? 'FULLY_COVERED' : coverage > 0 ? 'PARTIALLY_COVERED' : 'NOT_COVERED'
            };
        });
        
        return {
            totalRequirements: coverage.length,
            fullyCovered: coverage.filter(r => r.status === 'FULLY_COVERED').length,
            partiallyCovered: coverage.filter(r => r.status === 'PARTIALLY_COVERED').length,
            notCovered: coverage.filter(r => r.status === 'NOT_COVERED').length,
            details: coverage
        };
    }

    /**
     * Save test results to localStorage
     */
    async saveTestResults(report) {
        try {
            const storageKey = `comprehensive_test_results_${Date.now()}`;
            localStorage.setItem(storageKey, JSON.stringify(report));
            
            // Also save as latest results
            localStorage.setItem('latest_comprehensive_test_results', JSON.stringify(report));
            
            this.log(`💾 Test results saved to localStorage: ${storageKey}`, 'success');
        } catch (error) {
            this.log(`⚠️  Failed to save test results: ${error.message}`, 'warning');
        }
    }

    /**
     * Update progress callback
     */
    updateProgress(completed, total, message) {
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        if (this.progressCallback) {
            this.progressCallback({
                percentage,
                completed,
                total,
                message,
                currentTest: this.currentTest
            });
        }
        
        this.log(`📊 Progress: ${percentage.toFixed(1)}% (${completed}/${total}) - ${message}`, 'info');
    }

    /**
     * Log message with level
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        // Console logging with appropriate method
        switch (level) {
            case 'error':
                console.error(logEntry);
                break;
            case 'warning':
                console.warn(logEntry);
                break;
            case 'success':
                console.log(`✅ ${logEntry}`);
                break;
            default:
                console.log(logEntry);
        }
        
        // Custom log callback
        if (this.logCallback) {
            this.logCallback(logEntry, level);
        }
    }

    /**
     * Set progress callback
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * Set log callback
     */
    setLogCallback(callback) {
        this.logCallback = callback;
    }

    /**
     * Get test execution status
     */
    getExecutionStatus() {
        return {
            isRunning: this.isRunning,
            currentTest: this.currentTest,
            startTime: this.startTime,
            completedSuites: this.testResults.length,
            totalSuites: this.testSuites.size
        };
    }

    /**
     * Get available test suites
     */
    getAvailableTestSuites() {
        return Array.from(this.testSuites.entries()).map(([id, config]) => ({
            id,
            ...config
        }));
    }
}

// Make available globally
window.ComprehensiveTestExecutionSuite = ComprehensiveTestExecutionSuite;

console.log('✅ Comprehensive Test Execution Suite loaded');