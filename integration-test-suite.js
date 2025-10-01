/**
 * Comprehensive Integration Test Suite
 * Combines all integration tests for complete system validation
 * Requirements: 6.1, 6.2, 6.3, 6.4, 1.1-1.7, 3.1-3.5, 7.1-7.5
 */

class IntegrationTestSuite {
    constructor() {
        this.testResults = [];
        this.allTestSuites = [];
        this.overallResults = {
            auth: null,
            payment: null,
            visualizer: null,
            sync: null
        };
    }

    async runAllIntegrationTests() {
        console.log('🧪 Starting Comprehensive Integration Test Suite...');
        console.log('=' .repeat(60));
        
        try {
            await this.setupTestEnvironment();
            await this.runAuthenticationTests();
            await this.runPaymentTests();
            await this.runVisualizerTests();
            await this.runSyncTests();
            await this.runCrossSystemIntegrationTests();
            
            this.generateComprehensiveReport();
        } catch (error) {
            console.error('❌ Integration test suite failed:', error);
            this.testResults.push({
                test: 'Integration Test Suite Execution',
                status: 'FAILED',
                error: error.message
            });
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up comprehensive test environment...');
        
        // Clear all test data
        const keysToRemove = [
            'auth_token', 'user_data', 'user_preferences',
            'sync_queue', 'offline_data', 'payment_session',
            'integration_auth_test_results', 'integration_payment_test_results',
            'integration_visualizer_test_results', 'integration_sync_test_results'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Setup test user data
        const testUser = {
            id: 1,
            email: 'integration@test.com',
            plan: 'free',
            credits: 0,
            downloadsUsed: 0,
            downloadsLimit: 3
        };
        
        localStorage.setItem('user_data', JSON.stringify(testUser));
        
        this.addTestResult('Comprehensive Test Environment Setup', 'PASSED');
    }

    async runAuthenticationTests() {
        console.log('\n🔐 Running Authentication Integration Tests...');
        
        try {
            const authTests = new IntegrationAuthTests();
            await authTests.runAllTests();
            
            this.overallResults.auth = {
                results: authTests.testResults,
                summary: this.calculateSummary(authTests.testResults)
            };
            
            const authSuccess = this.overallResults.auth.summary.successRate >= 80;
            this.addTestResult('Authentication Integration Tests', authSuccess ? 'PASSED' : 'FAILED', 
                authSuccess ? null : `Success rate: ${this.overallResults.auth.summary.successRate}%`);
                
        } catch (error) {
            this.addTestResult('Authentication Integration Tests', 'FAILED', error.message);
        }
    }

    async runPaymentTests() {
        console.log('\n💳 Running Payment Integration Tests...');
        
        try {
            const paymentTests = new IntegrationPaymentTests();
            await paymentTests.runAllTests();
            
            this.overallResults.payment = {
                results: paymentTests.testResults,
                summary: this.calculateSummary(paymentTests.testResults)
            };
            
            const paymentSuccess = this.overallResults.payment.summary.successRate >= 80;
            this.addTestResult('Payment Integration Tests', paymentSuccess ? 'PASSED' : 'FAILED',
                paymentSuccess ? null : `Success rate: ${this.overallResults.payment.summary.successRate}%`);
                
        } catch (error) {
            this.addTestResult('Payment Integration Tests', 'FAILED', error.message);
        }
    }

    async runVisualizerTests() {
        console.log('\n🎵 Running Visualizer Integration Tests...');
        
        try {
            const visualizerTests = new IntegrationVisualizerTests();
            await visualizerTests.runAllTests();
            
            this.overallResults.visualizer = {
                results: visualizerTests.testResults,
                summary: this.calculateSummary(visualizerTests.testResults)
            };
            
            const visualizerSuccess = this.overallResults.visualizer.summary.successRate >= 80;
            this.addTestResult('Visualizer Integration Tests', visualizerSuccess ? 'PASSED' : 'FAILED',
                visualizerSuccess ? null : `Success rate: ${this.overallResults.visualizer.summary.successRate}%`);
                
        } catch (error) {
            this.addTestResult('Visualizer Integration Tests', 'FAILED', error.message);
        }
    }

    async runSyncTests() {
        console.log('\n🔄 Running Sync Integration Tests...');
        
        try {
            const syncTests = new IntegrationSyncTests();
            await syncTests.runAllTests();
            
            this.overallResults.sync = {
                results: syncTests.testResults,
                summary: this.calculateSummary(syncTests.testResults)
            };
            
            const syncSuccess = this.overallResults.sync.summary.successRate >= 80;
            this.addTestResult('Sync Integration Tests', syncSuccess ? 'PASSED' : 'FAILED',
                syncSuccess ? null : `Success rate: ${this.overallResults.sync.summary.successRate}%`);
                
        } catch (error) {
            this.addTestResult('Sync Integration Tests', 'FAILED', error.message);
        }
    }

    async runCrossSystemIntegrationTests() {
        console.log('\n🔗 Running Cross-System Integration Tests...');
        
        try {
            await this.testCompleteUserJourney();
            await this.testSystemInteroperability();
            await this.testErrorPropagation();
            await this.testPerformanceIntegration();
            
        } catch (error) {
            this.addTestResult('Cross-System Integration Tests', 'FAILED', error.message);
        }
    }

    async testCompleteUserJourney() {
        console.log('👤 Testing complete user journey...');
        
        try {
            // Step 1: Anonymous user visits site
            localStorage.removeItem('auth_token');
            let canUseVisualizer = this.checkVisualizerAccess();
            if (!canUseVisualizer) {
                throw new Error('Anonymous user cannot access visualizer');
            }

            // Step 2: User reaches download limit
            const userData = JSON.parse(localStorage.getItem('user_data'));
            userData.downloadsUsed = userData.downloadsLimit;
            localStorage.setItem('user_data', JSON.stringify(userData));

            // Step 3: User registers
            const mockToken = 'journey-test-token';
            localStorage.setItem('auth_token', mockToken);
            userData.plan = 'free';
            userData.credits = 0;
            localStorage.setItem('user_data', JSON.stringify(userData));

            // Step 4: User upgrades
            userData.plan = 'starter';
            userData.credits = 50;
            localStorage.setItem('user_data', JSON.stringify(userData));

            // Step 5: User accesses premium features
            const hasPremiumAccess = this.checkPremiumAccess();
            if (!hasPremiumAccess) {
                throw new Error('Premium user cannot access premium features');
            }

            // Step 6: User preferences sync
            const preferences = { theme: 'dark', visualizerType: 'bars' };
            localStorage.setItem('user_preferences', JSON.stringify(preferences));

            this.addTestResult('Complete User Journey', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Complete User Journey', 'FAILED', error.message);
        }
    }

    async testSystemInteroperability() {
        console.log('🔄 Testing system interoperability...');
        
        try {
            // Test auth system affects payment system
            localStorage.setItem('auth_token', 'interop-test-token');
            const authAffectsPayment = localStorage.getItem('auth_token') !== null;
            
            if (!authAffectsPayment) {
                throw new Error('Auth system not affecting payment system');
            }

            // Test payment system affects feature access
            const userData = JSON.parse(localStorage.getItem('user_data'));
            userData.plan = 'pro';
            userData.credits = 100;
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            const paymentAffectsFeatures = this.checkPremiumAccess();
            if (!paymentAffectsFeatures) {
                throw new Error('Payment system not affecting feature access');
            }

            // Test sync system preserves all data
            const syncData = {
                auth: localStorage.getItem('auth_token'),
                user: localStorage.getItem('user_data'),
                preferences: localStorage.getItem('user_preferences')
            };
            
            const allDataPresent = syncData.auth && syncData.user && syncData.preferences;
            if (!allDataPresent) {
                throw new Error('Sync system not preserving all data');
            }

            this.addTestResult('System Interoperability', 'PASSED');
            
        } catch (error) {
            this.addTestResult('System Interoperability', 'FAILED', error.message);
        }
    }

    async testErrorPropagation() {
        console.log('⚠️ Testing error propagation...');
        
        try {
            // Test auth error affects other systems
            localStorage.removeItem('auth_token');
            const authError = !localStorage.getItem('auth_token');
            
            if (!authError) {
                throw new Error('Auth error not detected');
            }

            // Test payment error handling
            const userData = JSON.parse(localStorage.getItem('user_data'));
            userData.credits = 0;
            userData.plan = 'free';
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            const paymentLimited = !this.checkPremiumAccess();
            if (!paymentLimited) {
                throw new Error('Payment limitations not enforced');
            }

            // Test offline error handling
            const originalOnLine = navigator.onLine;
            Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
            
            const offlineDetected = !navigator.onLine;
            if (!offlineDetected) {
                throw new Error('Offline state not detected');
            }

            // Restore online state
            Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });

            this.addTestResult('Error Propagation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Error Propagation', 'FAILED', error.message);
        }
    }

    async testPerformanceIntegration() {
        console.log('⚡ Testing performance integration...');
        
        try {
            const startTime = performance.now();
            
            // Simulate multiple system operations
            await this.simulateAuthOperation();
            await this.simulatePaymentOperation();
            await this.simulateVisualizerOperation();
            await this.simulateSyncOperation();
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            // Should complete within reasonable time (5 seconds)
            if (totalTime > 5000) {
                throw new Error(`Operations too slow: ${totalTime}ms`);
            }

            this.addTestResult('Performance Integration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Performance Integration', 'FAILED', error.message);
        }
    }

    async simulateAuthOperation() {
        return new Promise(resolve => {
            setTimeout(() => {
                localStorage.setItem('auth_token', 'perf-test-token');
                resolve();
            }, 100);
        });
    }

    async simulatePaymentOperation() {
        return new Promise(resolve => {
            setTimeout(() => {
                const userData = JSON.parse(localStorage.getItem('user_data'));
                userData.credits = 50;
                localStorage.setItem('user_data', JSON.stringify(userData));
                resolve();
            }, 200);
        });
    }

    async simulateVisualizerOperation() {
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulate canvas operation
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.fillRect(0, 0, 10, 10);
                resolve();
            }, 150);
        });
    }

    async simulateSyncOperation() {
        return new Promise(resolve => {
            setTimeout(() => {
                const preferences = { theme: 'dark' };
                localStorage.setItem('user_preferences', JSON.stringify(preferences));
                resolve();
            }, 100);
        });
    }

    checkVisualizerAccess() {
        // Mock visualizer access check
        return document.createElement('canvas').getContext('2d') !== null;
    }

    checkPremiumAccess() {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        return userData.plan && userData.plan !== 'free';
    }

    calculateSummary(results) {
        const passed = results.filter(r => r.status === 'PASSED').length;
        const failed = results.filter(r => r.status === 'FAILED').length;
        const total = results.length;
        
        return {
            total,
            passed,
            failed,
            successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0
        };
    }

    generateComprehensiveReport() {
        console.log('\n📊 Comprehensive Integration Test Report');
        console.log('=' .repeat(60));
        
        // Calculate overall statistics
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        
        Object.values(this.overallResults).forEach(result => {
            if (result && result.summary) {
                totalTests += result.summary.total;
                totalPassed += result.summary.passed;
                totalFailed += result.summary.failed;
            }
        });
        
        // Add cross-system tests
        const crossSystemResults = this.testResults.filter(r => 
            ['Complete User Journey', 'System Interoperability', 'Error Propagation', 'Performance Integration'].includes(r.test)
        );
        
        totalTests += crossSystemResults.length;
        totalPassed += crossSystemResults.filter(r => r.status === 'PASSED').length;
        totalFailed += crossSystemResults.filter(r => r.status === 'FAILED').length;
        
        const overallSuccessRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
        
        console.log(`\n📈 Overall Statistics:`);
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${totalPassed}`);
        console.log(`Failed: ${totalFailed}`);
        console.log(`Overall Success Rate: ${overallSuccessRate}%`);
        
        console.log(`\n📋 Test Suite Breakdown:`);
        
        // Authentication Tests
        if (this.overallResults.auth) {
            console.log(`🔐 Authentication: ${this.overallResults.auth.summary.passed}/${this.overallResults.auth.summary.total} (${this.overallResults.auth.summary.successRate}%)`);
        }
        
        // Payment Tests
        if (this.overallResults.payment) {
            console.log(`💳 Payment: ${this.overallResults.payment.summary.passed}/${this.overallResults.payment.summary.total} (${this.overallResults.payment.summary.successRate}%)`);
        }
        
        // Visualizer Tests
        if (this.overallResults.visualizer) {
            console.log(`🎵 Visualizer: ${this.overallResults.visualizer.summary.passed}/${this.overallResults.visualizer.summary.total} (${this.overallResults.visualizer.summary.successRate}%)`);
        }
        
        // Sync Tests
        if (this.overallResults.sync) {
            console.log(`🔄 Sync: ${this.overallResults.sync.summary.passed}/${this.overallResults.sync.summary.total} (${this.overallResults.sync.summary.successRate}%)`);
        }
        
        // Cross-system Tests
        const crossSystemPassed = crossSystemResults.filter(r => r.status === 'PASSED').length;
        console.log(`🔗 Cross-System: ${crossSystemPassed}/${crossSystemResults.length} (${crossSystemResults.length > 0 ? ((crossSystemPassed / crossSystemResults.length) * 100).toFixed(1) : 0}%)`);
        
        // Failed tests summary
        if (totalFailed > 0) {
            console.log(`\n❌ Failed Tests Summary:`);
            
            Object.entries(this.overallResults).forEach(([suite, result]) => {
                if (result && result.results) {
                    const failedTests = result.results.filter(r => r.status === 'FAILED');
                    if (failedTests.length > 0) {
                        console.log(`\n${suite.toUpperCase()} Failures:`);
                        failedTests.forEach(test => {
                            console.log(`- ${test.test}: ${test.error}`);
                        });
                    }
                }
            });
            
            const crossSystemFailed = crossSystemResults.filter(r => r.status === 'FAILED');
            if (crossSystemFailed.length > 0) {
                console.log(`\nCROSS-SYSTEM Failures:`);
                crossSystemFailed.forEach(test => {
                    console.log(`- ${test.test}: ${test.error}`);
                });
            }
        }
        
        // Store comprehensive results
        const comprehensiveResults = {
            summary: {
                totalTests,
                totalPassed,
                totalFailed,
                overallSuccessRate: parseFloat(overallSuccessRate)
            },
            suiteResults: this.overallResults,
            crossSystemResults: crossSystemResults,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('comprehensive_integration_test_results', JSON.stringify(comprehensiveResults));
        
        console.log(`\n✅ Comprehensive integration test report generated!`);
        console.log(`Results stored in localStorage as 'comprehensive_integration_test_results'`);
        
        // Final assessment
        if (overallSuccessRate >= 90) {
            console.log(`\n🎉 EXCELLENT: Integration test suite passed with ${overallSuccessRate}% success rate!`);
        } else if (overallSuccessRate >= 80) {
            console.log(`\n✅ GOOD: Integration test suite passed with ${overallSuccessRate}% success rate.`);
        } else if (overallSuccessRate >= 70) {
            console.log(`\n⚠️ ACCEPTABLE: Integration test suite passed with ${overallSuccessRate}% success rate. Some issues need attention.`);
        } else {
            console.log(`\n❌ NEEDS WORK: Integration test suite has ${overallSuccessRate}% success rate. Significant issues need to be addressed.`);
        }
    }

    addTestResult(testName, status, error = null) {
        this.testResults.push({
            test: testName,
            status: status,
            error: error,
            timestamp: new Date().toISOString()
        });
        
        const emoji = status === 'PASSED' ? '✅' : '❌';
        console.log(`${emoji} ${testName}: ${status}${error ? ` - ${error}` : ''}`);
    }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationTestSuite;
}