/**
 * Dashboard Tests Verification Script
 * Verifies that dashboard unit tests are comprehensive and working correctly
 */

class DashboardTestsVerification {
    constructor() {
        this.results = [];
        this.testSuite = null;
    }

    async runVerification() {
        console.log('🔍 Starting Dashboard Tests Verification...\n');

        try {
            // Load test suite
            if (typeof DashboardTests === 'undefined') {
                throw new Error('DashboardTests class not found. Make sure dashboard-tests.js is loaded.');
            }

            this.testSuite = new DashboardTests();
            
            // Run verification checks
            await this.verifyTestStructure();
            await this.verifyMockDependencies();
            await this.verifyTestCoverage();
            await this.runSampleTests();
            
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            return false;
        }

        return this.results.every(result => result.passed);
    }

    async verifyTestStructure() {
        console.log('📋 Verifying test structure...');

        // Check test suite has required methods
        const requiredMethods = [
            'setUp', 'tearDown', 'createDashboardUI', 'runTest', 'runAllTests',
            'assert', 'assertEquals', 'assertTrue', 'assertFalse'
        ];

        for (const method of requiredMethods) {
            if (typeof this.testSuite[method] !== 'function') {
                this.addResult(false, `Missing required method: ${method}`);
                return;
            }
        }

        // Check test categories exist
        const testCategories = [
            'testDashboardUIInitialization',
            'testShowDashboardAuthenticated', 
            'testProfileFormSubmissionSuccess',
            'testPreferencesFormSubmissionSuccess',
            'testTabSwitching',
            'testOverviewTabUpdate'
        ];

        for (const testMethod of testCategories) {
            if (typeof this.testSuite[testMethod] !== 'function') {
                this.addResult(false, `Missing test method: ${testMethod}`);
                return;
            }
        }

        this.addResult(true, 'Test structure verification passed');
    }

    async verifyMockDependencies() {
        console.log('🎭 Verifying mock dependencies...');

        this.testSuite.setUp();

        try {
            // Check mock classes exist and have required methods
            const mockChecks = [
                { name: 'MockApiClient', methods: ['get', 'put', 'setMockResponse', 'getRequestHistory'] },
                { name: 'MockNotificationManager', methods: ['show', 'getNotifications'] },
                { name: 'MockAuthManager', methods: ['isAuthenticated', 'getUserPlan', 'onStateChange'] },
                { name: 'MockUsageTracker', methods: ['getUsageStats', 'refreshUsage'] },
                { name: 'MockPreferencesManager', methods: ['getPreferences', 'setPreferences', 'resetToDefaults'] }
            ];

            for (const check of mockChecks) {
                const mockInstance = this.testSuite[`mock${check.name.replace('Mock', '')}`];
                if (!mockInstance) {
                    this.addResult(false, `Missing mock instance: ${check.name}`);
                    continue;
                }

                for (const method of check.methods) {
                    if (typeof mockInstance[method] !== 'function') {
                        this.addResult(false, `Mock ${check.name} missing method: ${method}`);
                        continue;
                    }
                }
            }

            // Test mock functionality
            this.testSuite.mockApiClient.setMockResponse('/test', { success: true, data: 'test' });
            const response = await this.testSuite.mockApiClient.get('/test');
            
            if (response.success !== true || response.data !== 'test') {
                this.addResult(false, 'Mock API client not working correctly');
                return;
            }

            this.addResult(true, 'Mock dependencies verification passed');

        } finally {
            this.testSuite.tearDown();
        }
    }

    async verifyTestCoverage() {
        console.log('📊 Verifying test coverage...');

        // Check that tests cover all major dashboard functionality
        const requiredTestAreas = [
            // Component rendering
            { area: 'Dashboard initialization', tests: ['testDashboardUIInitialization'] },
            { area: 'Modal show/hide', tests: ['testShowDashboardAuthenticated', 'testHideDashboard'] },
            { area: 'Tab switching', tests: ['testTabSwitching'] },
            { area: 'Data display', tests: ['testOverviewTabUpdate', 'testUsageTabUpdate'] },
            
            // Profile management
            { area: 'Profile updates', tests: ['testProfileFormSubmissionSuccess', 'testProfileFormSubmissionFailure'] },
            { area: 'Form loading states', tests: ['testFormLoadingState'] },
            
            // Preferences synchronization
            { area: 'Preferences display', tests: ['testPreferencesFormUpdate'] },
            { area: 'Preferences saving', tests: ['testPreferencesFormSubmissionSuccess'] },
            { area: 'Preferences reset', tests: ['testResetPreferencesToDefaults'] },
            { area: 'Visualizer integration', tests: ['testApplyPreferencesToVisualizer'] },
            
            // User interactions
            { area: 'Modal interactions', tests: ['testChangePasswordModal', 'testEscapeKeyHandling'] },
            { area: 'Payment integration', tests: ['testUpgradePlanButtonClick', 'testBuyCreditsButtonClick'] },
            
            // Data management
            { area: 'History display', tests: ['testDownloadHistoryDisplay', 'testPaymentHistoryDisplay'] },
            { area: 'Data export', tests: ['testDataExport'] }
        ];

        let missingTests = [];

        for (const area of requiredTestAreas) {
            const hasTests = area.tests.every(testName => 
                typeof this.testSuite[testName] === 'function'
            );

            if (!hasTests) {
                missingTests.push(area.area);
            }
        }

        if (missingTests.length > 0) {
            this.addResult(false, `Missing test coverage for: ${missingTests.join(', ')}`);
        } else {
            this.addResult(true, 'Test coverage verification passed');
        }
    }

    async runSampleTests() {
        console.log('🧪 Running sample tests...');

        try {
            // Run a few key tests to ensure they work
            const sampleTests = [
                'testDashboardUIInitialization',
                'testTabSwitching',
                'testFormLoadingState'
            ];

            for (const testName of sampleTests) {
                try {
                    await this.testSuite.runTest(testName, this.testSuite[testName]);
                    
                    // Check if test produced results
                    const testResults = this.testSuite.results.filter(r => r.test.includes(testName.replace('test', '')));
                    
                    if (testResults.length === 0) {
                        this.addResult(false, `Sample test ${testName} produced no results`);
                        continue;
                    }

                    // Check if test passed
                    const hasFailures = testResults.some(r => r.status === 'FAIL' || r.status === 'ERROR');
                    if (hasFailures) {
                        this.addResult(false, `Sample test ${testName} has failures`);
                        continue;
                    }

                } catch (error) {
                    this.addResult(false, `Sample test ${testName} threw error: ${error.message}`);
                    continue;
                }
            }

            this.addResult(true, 'Sample tests verification passed');

        } catch (error) {
            this.addResult(false, `Sample tests failed: ${error.message}`);
        }
    }

    addResult(passed, message) {
        this.results.push({ passed, message });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${message}`);
    }

    displayResults() {
        console.log('\n📋 Verification Summary:');
        console.log('========================');

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;

        console.log(`Total checks: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);

        if (passed === total) {
            console.log('\n🎉 All verification checks passed!');
            console.log('Dashboard tests are comprehensive and working correctly.');
        } else {
            console.log('\n⚠️  Some verification checks failed.');
            console.log('Please review the failed checks above.');
        }

        return passed === total;
    }
}

// Test runner function
async function verifyDashboardTests() {
    const verification = new DashboardTestsVerification();
    return await verification.runVerification();
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    window.verifyDashboardTests = verifyDashboardTests;
    window.DashboardTestsVerification = DashboardTestsVerification;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { verifyDashboardTests, DashboardTestsVerification };
}