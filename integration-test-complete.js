/**
 * Complete Integration Test Suite
 * Tests the full SaaS integration with both frontend and backend
 */

class CompleteIntegrationTest {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        this.backendUrl = 'http://localhost:8000';
        this.frontendUrl = 'http://localhost:3000';
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        if (this.isRunning) {
            console.log('Tests already running...');
            return;
        }

        this.isRunning = true;
        this.testResults = [];
        
        console.log('🚀 Starting Complete Integration Tests...');
        console.log('=' .repeat(60));

        try {
            // Test 1: Backend Connectivity
            await this.testBackendConnectivity();
            
            // Test 2: SaaS System Initialization
            await this.testSaaSInitialization();
            
            // Test 3: Authentication Flow
            await this.testAuthenticationFlow();
            
            // Test 4: Usage Tracking
            await this.testUsageTracking();
            
            // Test 5: Payment Integration
            await this.testPaymentIntegration();
            
            // Test 6: Dashboard Functionality
            await this.testDashboardFunctionality();
            
            // Test 7: Download Flow
            await this.testDownloadFlow();
            
            // Test 8: Premium Features
            await this.testPremiumFeatures();
            
            // Test 9: Offline Mode
            await this.testOfflineMode();
            
            // Test 10: Error Handling
            await this.testErrorHandling();
            
            // Generate final report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.addTestResult('Test Suite', false, `Suite failed: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Test backend connectivity
     */
    async testBackendConnectivity() {
        console.log('🔗 Testing Backend Connectivity...');
        
        try {
            // Test health endpoint
            const response = await fetch(`${this.backendUrl}/api/health`);
            const isHealthy = response.ok;
            
            this.addTestResult('Backend Health Check', isHealthy, 
                isHealthy ? 'Backend is responding' : `Backend returned ${response.status}`);
            
            // Test CORS configuration
            try {
                const corsResponse = await fetch(`${this.backendUrl}/api/auth/status`, {
                    method: 'GET',
                    headers: {
                        'Origin': this.frontendUrl,
                        'Content-Type': 'application/json'
                    }
                });
                
                const corsWorking = corsResponse.status !== 0; // 0 indicates CORS failure
                this.addTestResult('CORS Configuration', corsWorking, 
                    corsWorking ? 'CORS is properly configured' : 'CORS configuration issue');
                    
            } catch (corsError) {
                this.addTestResult('CORS Configuration', false, `CORS test failed: ${corsError.message}`);
            }
            
        } catch (error) {
            this.addTestResult('Backend Connectivity', false, `Connection failed: ${error.message}`);
        }
    }

    /**
     * Test SaaS system initialization
     */
    async testSaaSInitialization() {
        console.log('⚙️ Testing SaaS System Initialization...');
        
        try {
            // Check if SaaS initializer exists
            const initializerExists = typeof window.saasInitializer !== 'undefined';
            this.addTestResult('SaaS Initializer Exists', initializerExists, 
                initializerExists ? 'SaaS initializer is available' : 'SaaS initializer not found');
            
            if (!initializerExists) return;
            
            // Wait for initialization
            const components = await window.saasInitializer.waitForInitialization();
            const isInitialized = window.saasInitializer.isInitialized;
            
            this.addTestResult('SaaS System Initialization', isInitialized, 
                isInitialized ? 'SaaS system initialized successfully' : 'SaaS system failed to initialize');
            
            // Check individual components
            const expectedComponents = [
                'apiClient', 'authManager', 'usageTracker', 'paymentManager', 
                'dashboardUI', 'notificationManager'
            ];
            
            for (const component of expectedComponents) {
                const exists = components[component] !== undefined;
                this.addTestResult(`Component: ${component}`, exists, 
                    exists ? `${component} initialized` : `${component} missing`);
            }
            
        } catch (error) {
            this.addTestResult('SaaS System Initialization', false, `Initialization failed: ${error.message}`);
        }
    }

    /**
     * Test authentication flow
     */
    async testAuthenticationFlow() {
        console.log('🔐 Testing Authentication Flow...');
        
        try {
            // Check if auth manager exists
            const authManager = window.authManager;
            const authManagerExists = authManager !== undefined;
            
            this.addTestResult('Auth Manager Exists', authManagerExists, 
                authManagerExists ? 'Auth manager is available' : 'Auth manager not found');
            
            if (!authManagerExists) return;
            
            // Test initial auth state
            const initialState = authManager.getAuthStatus();
            this.addTestResult('Initial Auth State', true, 
                `Initial state: ${initialState.isAuthenticated ? 'authenticated' : 'anonymous'}`);
            
            // Test auth UI elements
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            const loginModal = document.getElementById('login-modal');
            const registerModal = document.getElementById('register-modal');
            
            this.addTestResult('Login Button Exists', !!loginBtn, 
                loginBtn ? 'Login button found' : 'Login button missing');
            this.addTestResult('Register Button Exists', !!registerBtn, 
                registerBtn ? 'Register button found' : 'Register button missing');
            this.addTestResult('Login Modal Exists', !!loginModal, 
                loginModal ? 'Login modal found' : 'Login modal missing');
            this.addTestResult('Register Modal Exists', !!registerModal, 
                registerModal ? 'Register modal found' : 'Register modal missing');
            
            // Test modal functionality (without actually submitting)
            if (loginBtn && loginModal) {
                loginBtn.click();
                const modalVisible = !loginModal.classList.contains('modal-hidden');
                this.addTestResult('Login Modal Opens', modalVisible, 
                    modalVisible ? 'Login modal opens correctly' : 'Login modal failed to open');
                
                // Close modal
                const closeBtn = document.getElementById('login-close-btn');
                if (closeBtn) closeBtn.click();
            }
            
        } catch (error) {
            this.addTestResult('Authentication Flow', false, `Auth test failed: ${error.message}`);
        }
    }

    /**
     * Test usage tracking
     */
    async testUsageTracking() {
        console.log('📊 Testing Usage Tracking...');
        
        try {
            const usageTracker = window.usageTracker;
            const trackerExists = usageTracker !== undefined;
            
            this.addTestResult('Usage Tracker Exists', trackerExists, 
                trackerExists ? 'Usage tracker is available' : 'Usage tracker not found');
            
            if (!trackerExists) return;
            
            // Test usage stats retrieval
            const usageStats = usageTracker.getUsageStats();
            this.addTestResult('Usage Stats Available', !!usageStats, 
                usageStats ? 'Usage stats retrieved successfully' : 'Failed to get usage stats');
            
            if (usageStats) {
                const hasRequiredFields = 'remainingDownloads' in usageStats && 'downloadLimit' in usageStats;
                this.addTestResult('Usage Stats Structure', hasRequiredFields, 
                    hasRequiredFields ? 'Usage stats have required fields' : 'Usage stats missing required fields');
            }
            
            // Test download permission check
            const canDownload = await usageTracker.canUserDownload();
            this.addTestResult('Download Permission Check', typeof canDownload === 'boolean', 
                `Download permission check returned: ${canDownload}`);
            
            // Test usage display elements
            const downloadsRemaining = document.getElementById('downloads-remaining');
            this.addTestResult('Downloads Remaining Display', !!downloadsRemaining, 
                downloadsRemaining ? 'Downloads remaining display found' : 'Downloads remaining display missing');
            
        } catch (error) {
            this.addTestResult('Usage Tracking', false, `Usage tracking test failed: ${error.message}`);
        }
    }

    /**
     * Test payment integration
     */
    async testPaymentIntegration() {
        console.log('💳 Testing Payment Integration...');
        
        try {
            const paymentManager = window.paymentManager;
            const paymentUI = window.paymentUI;
            
            this.addTestResult('Payment Manager Exists', !!paymentManager, 
                paymentManager ? 'Payment manager is available' : 'Payment manager not found');
            this.addTestResult('Payment UI Exists', !!paymentUI, 
                paymentUI ? 'Payment UI is available' : 'Payment UI not found');
            
            // Test payment modals
            const planModal = document.getElementById('plan-selection-modal');
            const creditModal = document.getElementById('credit-purchase-modal');
            const successModal = document.getElementById('payment-success-modal');
            const errorModal = document.getElementById('payment-error-modal');
            
            this.addTestResult('Plan Selection Modal', !!planModal, 
                planModal ? 'Plan selection modal found' : 'Plan selection modal missing');
            this.addTestResult('Credit Purchase Modal', !!creditModal, 
                creditModal ? 'Credit purchase modal found' : 'Credit purchase modal missing');
            this.addTestResult('Payment Success Modal', !!successModal, 
                successModal ? 'Payment success modal found' : 'Payment success modal missing');
            this.addTestResult('Payment Error Modal', !!errorModal, 
                errorModal ? 'Payment error modal found' : 'Payment error modal missing');
            
            // Test upgrade buttons
            const upgradeBtn = document.getElementById('upgrade-button');
            const buyCreditsBtn = document.getElementById('buy-credits-button');
            
            this.addTestResult('Upgrade Button Exists', !!upgradeBtn, 
                upgradeBtn ? 'Upgrade button found' : 'Upgrade button missing');
            this.addTestResult('Buy Credits Button Exists', !!buyCreditsBtn, 
                buyCreditsBtn ? 'Buy credits button found' : 'Buy credits button missing');
            
            // Test Stripe initialization (if available)
            if (paymentManager) {
                const canMakePayments = paymentManager.canMakePayments();
                this.addTestResult('Payment System Ready', canMakePayments, 
                    canMakePayments ? 'Payment system is ready' : 'Payment system not ready');
            }
            
        } catch (error) {
            this.addTestResult('Payment Integration', false, `Payment test failed: ${error.message}`);
        }
    }

    /**
     * Test dashboard functionality
     */
    async testDashboardFunctionality() {
        console.log('📋 Testing Dashboard Functionality...');
        
        try {
            const dashboardUI = window.dashboardUI;
            const dashboardExists = dashboardUI !== undefined;
            
            this.addTestResult('Dashboard UI Exists', dashboardExists, 
                dashboardExists ? 'Dashboard UI is available' : 'Dashboard UI not found');
            
            // Test dashboard elements
            const dashboardModal = document.getElementById('user-dashboard-modal');
            const dashboardBtn = document.getElementById('dashboard-btn');
            
            this.addTestResult('Dashboard Modal Exists', !!dashboardModal, 
                dashboardModal ? 'Dashboard modal found' : 'Dashboard modal missing');
            this.addTestResult('Dashboard Button Exists', !!dashboardBtn, 
                dashboardBtn ? 'Dashboard button found' : 'Dashboard button missing');
            
            // Test dashboard tabs
            const tabButtons = document.querySelectorAll('.dashboard-tab-btn');
            const tabContents = document.querySelectorAll('.dashboard-tab-content');
            
            this.addTestResult('Dashboard Tabs Exist', tabButtons.length > 0, 
                `Found ${tabButtons.length} dashboard tabs`);
            this.addTestResult('Dashboard Tab Contents Exist', tabContents.length > 0, 
                `Found ${tabContents.length} tab content areas`);
            
            // Test specific dashboard sections
            const overviewTab = document.getElementById('overview-tab');
            const usageTab = document.getElementById('usage-tab');
            const billingTab = document.getElementById('billing-tab');
            const settingsTab = document.getElementById('settings-tab');
            
            this.addTestResult('Overview Tab Exists', !!overviewTab, 
                overviewTab ? 'Overview tab found' : 'Overview tab missing');
            this.addTestResult('Usage Tab Exists', !!usageTab, 
                usageTab ? 'Usage tab found' : 'Usage tab missing');
            this.addTestResult('Billing Tab Exists', !!billingTab, 
                billingTab ? 'Billing tab found' : 'Billing tab missing');
            this.addTestResult('Settings Tab Exists', !!settingsTab, 
                settingsTab ? 'Settings tab found' : 'Settings tab missing');
            
        } catch (error) {
            this.addTestResult('Dashboard Functionality', false, `Dashboard test failed: ${error.message}`);
        }
    }

    /**
     * Test download flow
     */
    async testDownloadFlow() {
        console.log('⬇️ Testing Download Flow...');
        
        try {
            // Test download button and modal
            const downloadBtn = document.getElementById('download-button');
            const progressModal = document.getElementById('progress-modal');
            const gifBtn = document.getElementById('download-gif-button');
            const mp3Btn = document.getElementById('download-mp3-button');
            
            this.addTestResult('Download Button Exists', !!downloadBtn, 
                downloadBtn ? 'Download button found' : 'Download button missing');
            this.addTestResult('Progress Modal Exists', !!progressModal, 
                progressModal ? 'Progress modal found' : 'Progress modal missing');
            this.addTestResult('GIF Download Button Exists', !!gifBtn, 
                gifBtn ? 'GIF download button found' : 'GIF download button missing');
            this.addTestResult('MP3 Download Button Exists', !!mp3Btn, 
                mp3Btn ? 'MP3 download button found' : 'MP3 download button missing');
            
            // Test modal functionality (without actually downloading)
            if (downloadBtn && progressModal) {
                // Simulate click to test modal opening
                const initiallyHidden = progressModal.classList.contains('modal-hidden');
                this.addTestResult('Progress Modal Initially Hidden', initiallyHidden, 
                    initiallyHidden ? 'Progress modal starts hidden' : 'Progress modal visible initially');
            }
            
            // Test download permission check function
            if (typeof window.checkDownloadPermission === 'function') {
                this.addTestResult('Download Permission Function Exists', true, 
                    'Download permission check function is available');
            } else {
                this.addTestResult('Download Permission Function Exists', false, 
                    'Download permission check function missing');
            }
            
        } catch (error) {
            this.addTestResult('Download Flow', false, `Download flow test failed: ${error.message}`);
        }
    }

    /**
     * Test premium features
     */
    async testPremiumFeatures() {
        console.log('⭐ Testing Premium Features...');
        
        try {
            const featureManager = window.featureManager;
            const premiumRecording = window.premiumRecording;
            const premiumCustomization = window.premiumCustomization;
            
            this.addTestResult('Feature Manager Exists', !!featureManager, 
                featureManager ? 'Feature manager is available' : 'Feature manager not found');
            this.addTestResult('Premium Recording Exists', !!premiumRecording, 
                premiumRecording ? 'Premium recording is available' : 'Premium recording not found');
            this.addTestResult('Premium Customization Exists', !!premiumCustomization, 
                premiumCustomization ? 'Premium customization is available' : 'Premium customization not found');
            
            if (featureManager) {
                // Test feature detection
                const maxRecordingTime = featureManager.getMaxRecordingTime();
                this.addTestResult('Max Recording Time Available', typeof maxRecordingTime === 'number', 
                    `Max recording time: ${maxRecordingTime}s`);
                
                const currentPlan = featureManager.getCurrentUserPlan();
                this.addTestResult('Current Plan Detection', typeof currentPlan === 'string', 
                    `Current plan: ${currentPlan}`);
            }
            
        } catch (error) {
            this.addTestResult('Premium Features', false, `Premium features test failed: ${error.message}`);
        }
    }

    /**
     * Test offline mode
     */
    async testOfflineMode() {
        console.log('📴 Testing Offline Mode...');
        
        try {
            const offlineManager = window.offlineManager;
            const syncManager = window.syncManager;
            
            this.addTestResult('Offline Manager Exists', !!offlineManager, 
                offlineManager ? 'Offline manager is available' : 'Offline manager not found');
            this.addTestResult('Sync Manager Exists', !!syncManager, 
                syncManager ? 'Sync manager is available' : 'Sync manager not found');
            
            // Test offline detection
            const isOnline = navigator.onLine;
            this.addTestResult('Online Status Detection', typeof isOnline === 'boolean', 
                `Current online status: ${isOnline}`);
            
            // Test local storage fallback
            const localStorageWorks = typeof Storage !== 'undefined';
            this.addTestResult('Local Storage Available', localStorageWorks, 
                localStorageWorks ? 'Local storage is available' : 'Local storage not supported');
            
        } catch (error) {
            this.addTestResult('Offline Mode', false, `Offline mode test failed: ${error.message}`);
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('🚨 Testing Error Handling...');
        
        try {
            const notificationManager = window.notifications || window.notificationManager;
            const errorMonitor = window.errorMonitor;
            
            this.addTestResult('Notification Manager Exists', !!notificationManager, 
                notificationManager ? 'Notification manager is available' : 'Notification manager not found');
            this.addTestResult('Error Monitor Exists', !!errorMonitor, 
                errorMonitor ? 'Error monitor is available' : 'Error monitor not found');
            
            // Test notification container
            const notificationContainer = document.getElementById('notification-container');
            this.addTestResult('Notification Container Exists', !!notificationContainer, 
                notificationContainer ? 'Notification container found' : 'Notification container missing');
            
            // Test error handling with a safe test
            if (notificationManager && typeof notificationManager.show === 'function') {
                try {
                    notificationManager.show('Integration test notification', 'info');
                    this.addTestResult('Notification System Works', true, 
                        'Test notification sent successfully');
                } catch (notifError) {
                    this.addTestResult('Notification System Works', false, 
                        `Notification failed: ${notifError.message}`);
                }
            }
            
        } catch (error) {
            this.addTestResult('Error Handling', false, `Error handling test failed: ${error.message}`);
        }
    }

    /**
     * Add a test result
     */
    addTestResult(testName, passed, details) {
        const result = {
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPLETE INTEGRATION TEST REPORT');
        console.log('='.repeat(60));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
        
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Success Rate: ${successRate}%`);
        
        // Group results by category
        const categories = {};
        this.testResults.forEach(result => {
            const category = result.name.split(' ')[0] || 'General';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(result);
        });
        
        console.log(`\n📋 DETAILED RESULTS:`);
        Object.keys(categories).forEach(category => {
            const categoryResults = categories[category];
            const categoryPassed = categoryResults.filter(r => r.passed).length;
            const categoryTotal = categoryResults.length;
            
            console.log(`\n  ${category} (${categoryPassed}/${categoryTotal}):`);
            categoryResults.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`    ${status} ${result.name}: ${result.details}`);
            });
        });
        
        // Recommendations
        console.log(`\n💡 RECOMMENDATIONS:`);
        if (failedTests === 0) {
            console.log('   🎉 All tests passed! The integration is working correctly.');
            console.log('   ✨ Ready for production deployment.');
        } else {
            console.log(`   ⚠️  ${failedTests} test(s) failed. Review the failed tests above.`);
            console.log('   🔧 Fix the issues before deploying to production.');
            
            // Specific recommendations based on failures
            const failedResults = this.testResults.filter(r => !r.passed);
            if (failedResults.some(r => r.name.includes('Backend'))) {
                console.log('   🔗 Backend connectivity issues detected. Ensure backend is running on port 8000.');
            }
            if (failedResults.some(r => r.name.includes('SaaS'))) {
                console.log('   ⚙️  SaaS system initialization issues. Check console for JavaScript errors.');
            }
            if (failedResults.some(r => r.name.includes('Auth'))) {
                console.log('   🔐 Authentication system issues. Verify auth components are loaded.');
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Test completed at:', new Date().toLocaleString());
        console.log('='.repeat(60));
        
        // Store results for potential export
        window.integrationTestResults = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: successRate
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Export test results to JSON
     */
    exportResults() {
        if (!window.integrationTestResults) {
            console.log('No test results available. Run tests first.');
            return;
        }
        
        const dataStr = JSON.stringify(window.integrationTestResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `integration-test-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Test results exported successfully');
    }
}

// Create global test instance
window.completeIntegrationTest = new CompleteIntegrationTest();

// Auto-run tests when page loads (with delay to ensure everything is initialized)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.completeIntegrationTest.runAllTests();
        }, 3000); // Wait 3 seconds for full initialization
    });
} else {
    setTimeout(() => {
        window.completeIntegrationTest.runAllTests();
    }, 3000);
}

// Console helpers
console.log('🧪 Complete Integration Test Suite loaded');
console.log('📝 Available commands:');
console.log('   - window.completeIntegrationTest.runAllTests() - Run all tests');
console.log('   - window.completeIntegrationTest.exportResults() - Export test results');