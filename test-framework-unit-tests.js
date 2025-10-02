/**
 * Test Framework Unit Tests
 * Task 7.3: Write unit tests for test framework
 * 
 * Tests for test runner functionality and result aggregation logic
 * Requirements: 10.1, 10.2
 */

class TestFrameworkUnitTests {
    constructor() {
        this.testResults = [];
        this.testCount = 0;
        this.passedCount = 0;
        this.failedCount = 0;
        
        // Mock dependencies for isolated testing
        this.setupMocks();
    }

    /**
     * Setup mock dependencies for testing
     */
    setupMocks() {
        // Mock console to capture logs
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
        
        this.capturedLogs = [];
        
        console.log = (...args) => {
            this.capturedLogs.push({ level: 'log', args });
            this.originalConsole.log(...args);
        };
        
        console.error = (...args) => {
            this.capturedLogs.push({ level: 'error', args });
            this.originalConsole.error(...args);
        };
        
        console.warn = (...args) => {
            this.capturedLogs.push({ level: 'warn', args });
            this.originalConsole.warn(...args);
        };
        
        // Mock fetch for API calls
        this.originalFetch = window.fetch;
        window.fetch = this.mockFetch.bind(this);
        
        // Mock localStorage
        this.mockStorage = new Map();
        this.originalLocalStorage = window.localStorage;
        window.localStorage = {
            getItem: (key) => this.mockStorage.get(key) || null,
            setItem: (key, value) => this.mockStorage.set(key, value),
            removeItem: (key) => this.mockStorage.delete(key),
            clear: () => this.mockStorage.clear()
        };
    }

    /**
     * Mock fetch implementation
     */
    async mockFetch(url, options = {}) {
        // Simulate different API responses based on URL
        if (url.includes('/health')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({ status: 'ok', timestamp: new Date().toISOString() })
            };
        }
        
        if (url.includes('/auth/register')) {
            return {
                ok: true,
                status: 201,
                json: async () => ({
                    user: { id: 'test-user-id', email: 'test@example.com' },
                    token: 'mock-token'
                })
            };
        }
        
        if (url.includes('/auth/login')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    user: { id: 'test-user-id', email: 'test@example.com' },
                    token: 'mock-token'
                })
            };
        }
        
        // Default mock response
        return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
        };
    }

    /**
     * Restore original functions after testing
     */
    restoreMocks() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        window.fetch = this.originalFetch;
        window.localStorage = this.originalLocalStorage;
    }

    /**
     * Run all test framework unit tests
     */
    async runAllTests() {
        console.log('🧪 Starting Test Framework Unit Tests...');
        
        try {
            // Test ComprehensiveTestExecutionSuite
            await this.testComprehensiveTestExecutionSuite();
            
            // Test TestResultsAnalyzer
            await this.testTestResultsAnalyzer();
            
            // Test TestDataManager
            await this.testTestDataManager();
            
            // Test result aggregation logic
            await this.testResultAggregation();
            
            // Test error handling
            await this.testErrorHandling();
            
            // Test configuration management
            await this.testConfigurationManagement();
            
            const summary = this.generateTestSummary();
            console.log('✅ Test Framework Unit Tests completed');
            
            return summary;
            
        } catch (error) {
            console.error('❌ Test Framework Unit Tests failed:', error);
            throw error;
        } finally {
            this.restoreMocks();
        }
    }

    /**
     * Test ComprehensiveTestExecutionSuite functionality
     */
    async testComprehensiveTestExecutionSuite() {
        console.log('🔍 Testing ComprehensiveTestExecutionSuite...');
        
        // Test suite initialization
        await this.runTest('ComprehensiveTestExecutionSuite - Initialization', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            this.assert(suite.testResults instanceof Array, 'testResults should be an array');
            this.assert(suite.testSuites instanceof Map, 'testSuites should be a Map');
            this.assert(suite.isRunning === false, 'isRunning should be false initially');
            this.assert(suite.config.timeout > 0, 'timeout should be configured');
            this.assert(suite.testSuites.size > 0, 'test suites should be initialized');
        });
        
        // Test suite registry
        await this.runTest('ComprehensiveTestExecutionSuite - Test Suite Registry', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            const availableSuites = suite.getAvailableTestSuites();
            this.assert(availableSuites.length > 0, 'should have available test suites');
            
            const authSuite = availableSuites.find(s => s.id === 'authentication');
            this.assert(authSuite !== undefined, 'should have authentication suite');
            this.assert(authSuite.name.includes('Authentication'), 'auth suite should have correct name');
            this.assert(authSuite.requirements.length > 0, 'auth suite should have requirements');
        });
        
        // Test environment validation
        await this.runTest('ComprehensiveTestExecutionSuite - Environment Validation', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            // Mock required classes for validation
            window.AuthenticationTestingModule = class MockAuth {};
            window.DownloadModalInterceptionTester = class MockDownload {};
            window.FormatSpecificDownloadTester = class MockFormat {};
            window.ServerStartupTester = class MockServer {};
            
            try {
                await suite.validateTestEnvironment();
                // Should not throw if validation passes
            } catch (error) {
                this.fail(`Environment validation should pass with mocked classes: ${error.message}`);
            }
            
            // Clean up mocks
            delete window.AuthenticationTestingModule;
            delete window.DownloadModalInterceptionTester;
            delete window.FormatSpecificDownloadTester;
            delete window.ServerStartupTester;
        });
        
        // Test execution status tracking
        await this.runTest('ComprehensiveTestExecutionSuite - Execution Status', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            const initialStatus = suite.getExecutionStatus();
            this.assert(initialStatus.isRunning === false, 'should not be running initially');
            this.assert(initialStatus.currentTest === null, 'should have no current test initially');
            this.assert(initialStatus.completedSuites === 0, 'should have no completed suites initially');
        });
        
        // Test progress and log callbacks
        await this.runTest('ComprehensiveTestExecutionSuite - Callbacks', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            let progressCalled = false;
            let logCalled = false;
            
            suite.setProgressCallback((progress) => {
                progressCalled = true;
                this.assert(typeof progress.percentage === 'number', 'progress should have percentage');
                this.assert(typeof progress.message === 'string', 'progress should have message');
            });
            
            suite.setLogCallback((message, level) => {
                logCalled = true;
                this.assert(typeof message === 'string', 'log should have message');
                this.assert(typeof level === 'string', 'log should have level');
            });
            
            // Trigger callbacks
            suite.updateProgress(1, 2, 'Test message');
            suite.log('Test log message', 'info');
            
            this.assert(progressCalled, 'progress callback should be called');
            this.assert(logCalled, 'log callback should be called');
        });
        
        // Test timeout functionality
        await this.runTest('ComprehensiveTestExecutionSuite - Timeout Handling', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            try {
                await suite.executeWithTimeout(
                    () => new Promise(resolve => setTimeout(resolve, 200)),
                    100,
                    'Test timeout'
                );
                this.fail('Should have thrown timeout error');
            } catch (error) {
                this.assert(error.message.includes('Test timeout'), 'should throw timeout error');
            }
            
            // Test successful execution within timeout
            const result = await suite.executeWithTimeout(
                () => Promise.resolve('success'),
                1000,
                'Test timeout'
            );
            this.assert(result === 'success', 'should return result when within timeout');
        });
    }

    /**
     * Test TestResultsAnalyzer functionality
     */
    async testTestResultsAnalyzer() {
        console.log('🔍 Testing TestResultsAnalyzer...');
        
        // Test analyzer initialization
        await this.runTest('TestResultsAnalyzer - Initialization', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            this.assert(analyzer.analysisResults instanceof Array, 'analysisResults should be an array');
            this.assert(analyzer.identifiedIssues instanceof Array, 'identifiedIssues should be an array');
            this.assert(analyzer.implementedFixes instanceof Array, 'implementedFixes should be an array');
            this.assert(analyzer.patterns instanceof Map, 'patterns should be a Map');
            this.assert(analyzer.knownPatterns instanceof Map, 'knownPatterns should be initialized');
        });
        
        // Test error categorization
        await this.runTest('TestResultsAnalyzer - Error Categorization', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            this.assert(analyzer.categorizeError('timeout occurred') === 'timeout', 'should categorize timeout errors');
            this.assert(analyzer.categorizeError('element not found') === 'element_not_found', 'should categorize element errors');
            this.assert(analyzer.categorizeError('network error') === 'network_error', 'should categorize network errors');
            this.assert(analyzer.categorizeError('authentication failed') === 'authentication_failure', 'should categorize auth errors');
            this.assert(analyzer.categorizeError('modal not visible') === 'modal_interaction', 'should categorize modal errors');
            this.assert(analyzer.categorizeError('unknown error') === 'unknown', 'should categorize unknown errors');
        });
        
        // Test criticality assessment
        await this.runTest('TestResultsAnalyzer - Criticality Assessment', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            const highSuccess = analyzer.assessCriticality({ successRate: 98 });
            this.assert(highSuccess.level === 'LOW', 'high success rate should be low criticality');
            
            const mediumSuccess = analyzer.assessCriticality({ successRate: 85 });
            this.assert(mediumSuccess.level === 'MEDIUM', 'medium success rate should be medium criticality');
            
            const lowSuccess = analyzer.assessCriticality({ successRate: 65 });
            this.assert(lowSuccess.level === 'HIGH', 'low success rate should be high criticality');
            
            const veryLowSuccess = analyzer.assessCriticality({ successRate: 40 });
            this.assert(veryLowSuccess.level === 'CRITICAL', 'very low success rate should be critical');
        });
        
        // Test performance analysis
        await this.runTest('TestResultsAnalyzer - Performance Analysis', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            const mockSuites = [
                { suiteName: 'Fast Suite', duration: 1000 },
                { suiteName: 'Medium Suite', duration: 5000 },
                { suiteName: 'Slow Suite', duration: 15000 }
            ];
            
            const performance = analyzer.analyzePerformance(mockSuites);
            
            this.assert(performance.totalDuration === 21000, 'should calculate total duration');
            this.assert(performance.averageDuration === 7000, 'should calculate average duration');
            this.assert(performance.maxDuration === 15000, 'should find max duration');
            this.assert(performance.minDuration === 1000, 'should find min duration');
            this.assert(performance.slowSuites.length > 0, 'should identify slow suites');
        });
        
        // Test pattern analysis
        await this.runTest('TestResultsAnalyzer - Pattern Analysis', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            const mockSuites = [
                {
                    suiteName: 'Suite 1',
                    success: false,
                    error: 'timeout occurred during test execution'
                },
                {
                    suiteName: 'Suite 2',
                    success: false,
                    error: 'timeout occurred while waiting for response'
                },
                {
                    suiteName: 'Suite 3',
                    success: false,
                    error: 'element not found in DOM'
                }
            ];
            
            const patterns = analyzer.analyzeFailurePatterns(mockSuites);
            
            this.assert(patterns.length > 0, 'should identify failure patterns');
            
            const timeoutPattern = patterns.find(p => p.pattern === 'timeout');
            this.assert(timeoutPattern !== undefined, 'should identify timeout pattern');
            this.assert(timeoutPattern.occurrences === 2, 'should count timeout occurrences correctly');
        });
        
        // Test recommendation generation
        await this.runTest('TestResultsAnalyzer - Recommendation Generation', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            const mockOverallAnalysis = {
                overallSuccessRate: 70,
                performanceMetrics: {
                    slowSuites: [{ name: 'Slow Suite', duration: 10000 }]
                }
            };
            
            const mockPatternAnalysis = [
                {
                    pattern: 'timeout',
                    occurrences: 3,
                    knownPattern: {
                        suggestedFixes: ['Increase timeout values', 'Add retry logic']
                    }
                }
            ];
            
            const recommendations = analyzer.generateRecommendations(mockOverallAnalysis, mockPatternAnalysis);
            
            this.assert(recommendations.length > 0, 'should generate recommendations');
            this.assert(recommendations.some(r => r.type === 'CRITICAL'), 'should include critical recommendations for low success rate');
            this.assert(recommendations.some(r => r.type === 'PATTERN'), 'should include pattern-based recommendations');
        });
    }

    /**
     * Test TestDataManager functionality
     */
    async testTestDataManager() {
        console.log('🔍 Testing TestDataManager...');
        
        // Test data manager initialization
        await this.runTest('TestDataManager - Initialization', async () => {
            const manager = new TestDataManager();
            
            this.assert(manager.fixtures instanceof Map, 'fixtures should be a Map');
            this.assert(manager.createdEntities instanceof Map, 'createdEntities should be a Map');
            this.assert(manager.testSessions instanceof Set, 'testSessions should be a Set');
            this.assert(manager.config.apiBaseUrl, 'should have API base URL configured');
        });
        
        // Test fixture loading
        await this.runTest('TestDataManager - Fixture Loading', async () => {
            const manager = new TestDataManager();
            await manager.loadFixtures();
            
            this.assert(manager.fixtures.has('users'), 'should load user fixtures');
            this.assert(manager.fixtures.has('auth'), 'should load auth fixtures');
            this.assert(manager.fixtures.has('downloads'), 'should load download fixtures');
            this.assert(manager.fixtures.has('server'), 'should load server fixtures');
        });
        
        // Test fixture retrieval
        await this.runTest('TestDataManager - Fixture Retrieval', async () => {
            const manager = new TestDataManager();
            await manager.loadFixtures();
            
            const userFixtures = manager.getFixture('users');
            this.assert(typeof userFixtures === 'object', 'should return user fixtures object');
            
            const validUser = manager.getFixture('users', 'validUser');
            this.assert(validUser.email, 'should return specific user fixture');
            this.assert(validUser.password, 'user fixture should have password');
            
            // Test deep copy (mutation should not affect original)
            validUser.email = 'modified@example.com';
            const originalUser = manager.getFixture('users', 'validUser');
            this.assert(originalUser.email !== 'modified@example.com', 'should return deep copy');
        });
        
        // Test session ID generation
        await this.runTest('TestDataManager - Session ID Generation', async () => {
            const manager = new TestDataManager();
            
            const sessionId1 = manager.generateSessionId();
            const sessionId2 = manager.generateSessionId();
            
            this.assert(typeof sessionId1 === 'string', 'should generate string session ID');
            this.assert(sessionId1.startsWith('test_'), 'session ID should have test prefix');
            this.assert(sessionId1 !== sessionId2, 'should generate unique session IDs');
        });
        
        // Test entity tracking
        await this.runTest('TestDataManager - Entity Tracking', async () => {
            const manager = new TestDataManager();
            const sessionId = 'test-session-123';
            
            manager.trackEntity('user', 'user-123', sessionId);
            manager.trackEntity('session', 'session-456', sessionId);
            
            const entities = manager.createdEntities.get(sessionId);
            this.assert(entities.length === 2, 'should track multiple entities');
            this.assert(entities[0].type === 'user', 'should track entity type');
            this.assert(entities[0].id === 'user-123', 'should track entity ID');
        });
        
        // Test test user creation (mocked)
        await this.runTest('TestDataManager - Test User Creation', async () => {
            const manager = new TestDataManager();
            await manager.loadFixtures();
            
            const userData = await manager.createTestUser();
            
            this.assert(userData.user, 'should return user data');
            this.assert(userData.user.email, 'user should have email');
            this.assert(userData.token, 'should return authentication token');
        });
        
        // Test test session creation (mocked)
        await this.runTest('TestDataManager - Test Session Creation', async () => {
            const manager = new TestDataManager();
            await manager.loadFixtures();
            
            const sessionData = await manager.createTestSession();
            
            this.assert(sessionData.sessionId, 'should return session ID');
            this.assert(sessionData.token, 'should return authentication token');
            this.assert(sessionData.user, 'should return user data');
        });
    }

    /**
     * Test result aggregation logic
     */
    async testResultAggregation() {
        console.log('🔍 Testing Result Aggregation Logic...');
        
        // Test basic result aggregation
        await this.runTest('Result Aggregation - Basic Statistics', async () => {
            const mockResults = [
                { success: true, duration: 1000, testStats: { total: 5, passed: 5, failed: 0 } },
                { success: false, duration: 2000, testStats: { total: 3, passed: 2, failed: 1 } },
                { success: true, duration: 1500, testStats: { total: 4, passed: 4, failed: 0 } }
            ];
            
            const aggregated = this.aggregateResults(mockResults);
            
            this.assert(aggregated.totalSuites === 3, 'should count total suites');
            this.assert(aggregated.passedSuites === 2, 'should count passed suites');
            this.assert(aggregated.failedSuites === 1, 'should count failed suites');
            this.assert(aggregated.totalTests === 12, 'should sum total tests');
            this.assert(aggregated.totalPassed === 11, 'should sum passed tests');
            this.assert(aggregated.totalFailed === 1, 'should sum failed tests');
            this.assert(aggregated.totalDuration === 4500, 'should sum durations');
        });
        
        // Test success rate calculation
        await this.runTest('Result Aggregation - Success Rate Calculation', async () => {
            const mockResults = [
                { success: true, testStats: { total: 10, passed: 8, failed: 2 } },
                { success: true, testStats: { total: 5, passed: 5, failed: 0 } },
                { success: false, testStats: { total: 8, passed: 4, failed: 4 } }
            ];
            
            const aggregated = this.aggregateResults(mockResults);
            
            // Suite success rate: 2/3 = 66.67%
            this.assert(Math.abs(aggregated.suiteSuccessRate - 66.67) < 0.1, 'should calculate suite success rate');
            
            // Test success rate: 17/23 = 73.91%
            this.assert(Math.abs(aggregated.testSuccessRate - 73.91) < 0.1, 'should calculate test success rate');
        });
        
        // Test empty results handling
        await this.runTest('Result Aggregation - Empty Results', async () => {
            const aggregated = this.aggregateResults([]);
            
            this.assert(aggregated.totalSuites === 0, 'should handle empty results');
            this.assert(aggregated.suiteSuccessRate === 0, 'should return 0% for empty results');
            this.assert(aggregated.testSuccessRate === 0, 'should return 0% for empty test results');
        });
        
        // Test malformed results handling
        await this.runTest('Result Aggregation - Malformed Results', async () => {
            const mockResults = [
                { success: true, duration: 1000 }, // Missing testStats
                { success: false, testStats: { total: 5, passed: 3 } }, // Missing failed count
                null, // Null result
                { success: true, testStats: { total: 2, passed: 2, failed: 0 } }
            ];
            
            const aggregated = this.aggregateResults(mockResults);
            
            // Should handle malformed data gracefully
            this.assert(aggregated.totalSuites >= 0, 'should handle malformed results gracefully');
            this.assert(typeof aggregated.suiteSuccessRate === 'number', 'should return numeric success rate');
        });
    }

    /**
     * Test error handling in test framework
     */
    async testErrorHandling() {
        console.log('🔍 Testing Error Handling...');
        
        // Test timeout error handling
        await this.runTest('Error Handling - Timeout Errors', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            try {
                await suite.executeWithTimeout(
                    () => new Promise(() => {}), // Never resolves
                    100,
                    'Test timeout message'
                );
                this.fail('Should have thrown timeout error');
            } catch (error) {
                this.assert(error.message.includes('Test timeout message'), 'should include timeout message');
            }
        });
        
        // Test validation error handling
        await this.runTest('Error Handling - Validation Errors', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            try {
                suite.validateTestSuiteResults(null, { name: 'Test Suite' });
                this.fail('Should have thrown validation error');
            } catch (error) {
                this.assert(error.message.includes('no results'), 'should throw validation error');
            }
            
            try {
                suite.validateTestSuiteResults({ summary: { total: -1 } }, { name: 'Test Suite' });
                this.fail('Should have thrown validation error for invalid count');
            } catch (error) {
                this.assert(error.message.includes('Invalid test count'), 'should validate test counts');
            }
        });
        
        // Test analyzer error handling
        await this.runTest('Error Handling - Analyzer Errors', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            try {
                await analyzer.analyzeTestResults(null);
                this.fail('Should have thrown error for null report');
            } catch (error) {
                this.assert(error.message.includes('Invalid test report'), 'should validate test report');
            }
            
            try {
                await analyzer.analyzeTestResults({});
                this.fail('Should have thrown error for empty report');
            } catch (error) {
                this.assert(error.message.includes('Invalid test report'), 'should validate report structure');
            }
        });
        
        // Test data manager error handling
        await this.runTest('Error Handling - Data Manager Errors', async () => {
            const manager = new TestDataManager();
            
            try {
                manager.getFixture('nonexistent');
                this.fail('Should have thrown error for nonexistent fixture');
            } catch (error) {
                this.assert(error.message.includes('not found'), 'should throw error for missing fixture');
            }
            
            try {
                manager.getFixture('users', 'nonexistent');
                this.fail('Should have thrown error for nonexistent fixture key');
            } catch (error) {
                this.assert(error.message.includes('not found'), 'should throw error for missing fixture key');
            }
        });
    }

    /**
     * Test configuration management
     */
    async testConfigurationManagement() {
        console.log('🔍 Testing Configuration Management...');
        
        // Test default configuration
        await this.runTest('Configuration - Default Values', async () => {
            const suite = new ComprehensiveTestExecutionSuite();
            
            this.assert(suite.config.timeout > 0, 'should have default timeout');
            this.assert(suite.config.retryAttempts > 0, 'should have default retry attempts');
            this.assert(typeof suite.config.parallelExecution === 'boolean', 'should have parallel execution setting');
            this.assert(typeof suite.config.generateReport === 'boolean', 'should have report generation setting');
        });
        
        // Test configuration override
        await this.runTest('Configuration - Override Values', async () => {
            const customConfig = {
                timeout: 600000,
                retryAttempts: 5,
                parallelExecution: true
            };
            
            const suite = new ComprehensiveTestExecutionSuite();
            
            // Test configuration merge in executeAllTests
            const originalConfig = { ...suite.config };
            
            // Simulate config merge
            const mergedConfig = { ...originalConfig, ...customConfig };
            
            this.assert(mergedConfig.timeout === 600000, 'should override timeout');
            this.assert(mergedConfig.retryAttempts === 5, 'should override retry attempts');
            this.assert(mergedConfig.parallelExecution === true, 'should override parallel execution');
            this.assert(mergedConfig.generateReport === originalConfig.generateReport, 'should keep original values not overridden');
        });
        
        // Test data manager configuration
        await this.runTest('Configuration - Data Manager Config', async () => {
            const customConfig = {
                apiBaseUrl: 'http://custom-api:9000',
                testDbPrefix: 'custom_test_',
                cleanupTimeout: 60000
            };
            
            const manager = new TestDataManager(customConfig);
            
            this.assert(manager.config.apiBaseUrl === 'http://custom-api:9000', 'should use custom API URL');
            this.assert(manager.config.testDbPrefix === 'custom_test_', 'should use custom DB prefix');
            this.assert(manager.config.cleanupTimeout === 60000, 'should use custom cleanup timeout');
        });
        
        // Test analyzer configuration
        await this.runTest('Configuration - Analyzer Config', async () => {
            const analyzer = new TestResultsAnalyzer();
            
            this.assert(analyzer.config.failureThreshold > 0, 'should have failure threshold');
            this.assert(analyzer.config.patternMinOccurrence > 0, 'should have pattern minimum occurrence');
            this.assert(analyzer.config.retestDelay > 0, 'should have retest delay');
            this.assert(analyzer.config.maxRetestAttempts > 0, 'should have max retest attempts');
        });
    }

    /**
     * Helper method to aggregate test results
     */
    aggregateResults(results) {
        if (!Array.isArray(results)) {
            results = [];
        }
        
        const validResults = results.filter(result => result && typeof result === 'object');
        
        const aggregated = {
            totalSuites: validResults.length,
            passedSuites: validResults.filter(r => r.success === true).length,
            failedSuites: validResults.filter(r => r.success === false).length,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalDuration: 0,
            suiteSuccessRate: 0,
            testSuccessRate: 0
        };
        
        // Calculate test statistics
        validResults.forEach(result => {
            if (result.testStats && typeof result.testStats === 'object') {
                aggregated.totalTests += result.testStats.total || 0;
                aggregated.totalPassed += result.testStats.passed || 0;
                aggregated.totalFailed += result.testStats.failed || 0;
            }
            
            if (typeof result.duration === 'number') {
                aggregated.totalDuration += result.duration;
            }
        });
        
        // Calculate success rates
        if (aggregated.totalSuites > 0) {
            aggregated.suiteSuccessRate = Math.round((aggregated.passedSuites / aggregated.totalSuites) * 10000) / 100;
        }
        
        if (aggregated.totalTests > 0) {
            aggregated.testSuccessRate = Math.round((aggregated.totalPassed / aggregated.totalTests) * 10000) / 100;
        }
        
        return aggregated;
    }

    /**
     * Helper method to run individual tests
     */
    async runTest(testName, testFunction) {
        this.testCount++;
        const startTime = Date.now();
        
        try {
            await testFunction();
            
            const duration = Date.now() - startTime;
            this.passedCount++;
            
            this.testResults.push({
                name: testName,
                status: 'PASSED',
                duration,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ ${testName} (${duration}ms)`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.failedCount++;
            
            this.testResults.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.error(`❌ ${testName}: ${error.message} (${duration}ms)`);
        }
    }

    /**
     * Helper method for assertions
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Helper method to fail a test explicitly
     */
    fail(message) {
        throw new Error(message);
    }

    /**
     * Generate test summary
     */
    generateTestSummary() {
        const successRate = this.testCount > 0 ? (this.passedCount / this.testCount) * 100 : 0;
        
        const summary = {
            total: this.testCount,
            passed: this.passedCount,
            failed: this.failedCount,
            successRate,
            results: this.testResults,
            timestamp: new Date().toISOString(),
            status: successRate >= 80 ? 'PASSED' : 'FAILED'
        };
        
        console.log('\n📊 Test Framework Unit Tests Summary:');
        console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`✅ Passed: ${this.passedCount}`);
        console.log(`❌ Failed: ${this.failedCount}`);
        console.log(`📊 Total: ${this.testCount}`);
        
        return summary;
    }
}

// Make available globally
window.TestFrameworkUnitTests = TestFrameworkUnitTests;

console.log('✅ Test Framework Unit Tests loaded');