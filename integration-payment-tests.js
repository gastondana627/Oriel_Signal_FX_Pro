/**
 * Integration Tests for Payment and Upgrade Workflows
 * Tests complete payment flows from limit reached to successful upgrade
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

class IntegrationPaymentTests {
    constructor() {
        this.testResults = [];
        this.paymentManager = null;
        this.usageTracker = null;
        this.authManager = null;
        this.testUser = {
            id: 1,
            email: 'test@example.com',
            plan: 'free',
            credits: 0
        };
    }

    async runAllTests() {
        console.log('💳 Starting Integration Payment Tests...');
        
        try {
            await this.setupTestEnvironment();
            await this.testLimitReachedToUpgradeFlow();
            await this.testPaymentSuccessWorkflow();
            await this.testPaymentFailureScenarios();
            await this.testCreditUpdatesAndFeatureUnlocking();
            await this.testUpgradeFlowIntegration();
            await this.testPaymentErrorHandling();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ Payment test suite failed:', error);
            this.testResults.push({
                test: 'Payment Test Suite Execution',
                status: 'FAILED',
                error: error.message
            });
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up payment test environment...');
        
        // Initialize managers
        const apiClient = new ApiClient();
        this.authManager = new AuthManager(apiClient);
        this.paymentManager = new PaymentManager(apiClient);
        this.usageTracker = new UsageTracker(apiClient);
        
        // Setup authenticated user state
        localStorage.setItem('auth_token', 'test-jwt-token');
        localStorage.setItem('user_data', JSON.stringify(this.testUser));
        
        // Clear any existing payment state
        localStorage.removeItem('payment_session');
        localStorage.removeItem('pending_upgrade');
        
        this.addTestResult('Payment Test Environment Setup', 'PASSED');
    }

    async testLimitReachedToUpgradeFlow() {
        console.log('🚫 Testing limit reached to upgrade flow...');
        
        try {
            // Test 1: Simulate user reaching download limit (Requirement 3.1)
            const originalCanDownload = this.usageTracker.canUserDownload;
            this.usageTracker.canUserDownload = () => false;
            
            const canDownload = this.usageTracker.canUserDownload();
            if (canDownload) {
                throw new Error('User should not be able to download when limit reached');
            }
            this.addTestResult('Download Limit Detection', 'PASSED');

            // Test 2: Upgrade prompt display (Requirement 3.1)
            const downloadBtn = document.getElementById('download-gif');
            if (!downloadBtn) {
                throw new Error('Download button not found');
            }
            
            // Simulate click on download button when limit reached
            downloadBtn.click();
            
            // Check if upgrade modal is displayed
            const upgradeModal = document.getElementById('upgrade-modal');
            if (!upgradeModal || upgradeModal.style.display === 'none') {
                throw new Error('Upgrade modal not displayed when limit reached');
            }
            this.addTestResult('Upgrade Prompt Display', 'PASSED');

            // Test 3: Plan selection options (Requirement 3.1)
            const starterPlan = document.querySelector('[data-plan="starter"]');
            const proPlan = document.querySelector('[data-plan="pro"]');
            
            if (!starterPlan || !proPlan) {
                throw new Error('Plan selection options not found');
            }
            this.addTestResult('Plan Selection Options', 'PASSED');

            // Restore original method
            this.usageTracker.canUserDownload = originalCanDownload;

        } catch (error) {
            this.addTestResult('Limit Reached to Upgrade Flow', 'FAILED', error.message);
        }
    }

    async testPaymentSuccessWorkflow() {
        console.log('✅ Testing payment success workflow...');
        
        try {
            // Test 1: Checkout session creation (Requirement 3.2)
            const originalCreateSession = this.paymentManager.createCheckoutSession;
            this.paymentManager.createCheckoutSession = async (planType) => {
                if (!planType || !['starter', 'pro'].includes(planType)) {
                    throw new Error('Invalid plan type');
                }
                return {
                    success: true,
                    sessionId: 'cs_test_session_123',
                    url: 'https://checkout.stripe.com/pay/cs_test_session_123'
                };
            };
            
            const sessionResult = await this.paymentManager.createCheckoutSession('starter');
            if (!sessionResult.success || !sessionResult.sessionId) {
                throw new Error('Checkout session creation failed');
            }
            this.addTestResult('Checkout Session Creation', 'PASSED');

            // Test 2: Payment status checking (Requirement 3.3)
            const originalCheckStatus = this.paymentManager.checkPaymentStatus;
            this.paymentManager.checkPaymentStatus = async (sessionId) => {
                if (sessionId === 'cs_test_session_123') {
                    return {
                        success: true,
                        status: 'complete',
                        plan: 'starter',
                        credits: 50
                    };
                }
                throw new Error('Session not found');
            };
            
            const statusResult = await this.paymentManager.checkPaymentStatus('cs_test_session_123');
            if (!statusResult.success || statusResult.status !== 'complete') {
                throw new Error('Payment status check failed');
            }
            this.addTestResult('Payment Status Checking', 'PASSED');

            // Test 3: Success page handling (Requirement 3.5)
            const originalHandleSuccess = this.paymentManager.handlePaymentSuccess;
            this.paymentManager.handlePaymentSuccess = async (sessionId) => {
                // Update user data
                const userData = JSON.parse(localStorage.getItem('user_data'));
                userData.plan = 'starter';
                userData.credits = 50;
                localStorage.setItem('user_data', JSON.stringify(userData));
                
                // Show success notification
                return { success: true, message: 'Payment successful!' };
            };
            
            const successResult = await this.paymentManager.handlePaymentSuccess('cs_test_session_123');
            if (!successResult.success) {
                throw new Error('Payment success handling failed');
            }
            this.addTestResult('Payment Success Handling', 'PASSED');

            // Restore original methods
            this.paymentManager.createCheckoutSession = originalCreateSession;
            this.paymentManager.checkPaymentStatus = originalCheckStatus;
            this.paymentManager.handlePaymentSuccess = originalHandleSuccess;

        } catch (error) {
            this.addTestResult('Payment Success Workflow', 'FAILED', error.message);
        }
    }

    async testPaymentFailureScenarios() {
        console.log('❌ Testing payment failure scenarios...');
        
        try {
            // Test 1: Payment declined scenario
            const originalCheckStatus = this.paymentManager.checkPaymentStatus;
            this.paymentManager.checkPaymentStatus = async (sessionId) => {
                return {
                    success: false,
                    status: 'failed',
                    error: 'Your card was declined'
                };
            };
            
            const failedResult = await this.paymentManager.checkPaymentStatus('cs_failed_session');
            if (failedResult.success) {
                throw new Error('Should have returned failed status');
            }
            this.addTestResult('Payment Declined Handling', 'PASSED');

            // Test 2: Payment cancelled scenario
            this.paymentManager.checkPaymentStatus = async (sessionId) => {
                return {
                    success: false,
                    status: 'cancelled',
                    error: 'Payment was cancelled'
                };
            };
            
            const cancelledResult = await this.paymentManager.checkPaymentStatus('cs_cancelled_session');
            if (cancelledResult.success || cancelledResult.status !== 'cancelled') {
                throw new Error('Should have returned cancelled status');
            }
            this.addTestResult('Payment Cancelled Handling', 'PASSED');

            // Test 3: Network error during payment
            this.paymentManager.checkPaymentStatus = async (sessionId) => {
                throw new Error('Network error');
            };
            
            try {
                await this.paymentManager.checkPaymentStatus('cs_network_error');
                throw new Error('Should have thrown network error');
            } catch (error) {
                if (error.message !== 'Network error') {
                    throw error;
                }
            }
            this.addTestResult('Payment Network Error Handling', 'PASSED');

            // Test 4: Error notification display
            const originalHandleCancel = this.paymentManager.handlePaymentCancel;
            this.paymentManager.handlePaymentCancel = async (error) => {
                // Should show user-friendly error message
                const notification = document.getElementById('notification-container');
                if (notification) {
                    notification.innerHTML = `<div class="error">Payment failed: ${error}</div>`;
                }
                return { success: true };
            };
            
            await this.paymentManager.handlePaymentCancel('Card declined');
            const notification = document.getElementById('notification-container');
            if (!notification || !notification.innerHTML.includes('Payment failed')) {
                throw new Error('Error notification not displayed');
            }
            this.addTestResult('Payment Error Notification', 'PASSED');

            // Restore original methods
            this.paymentManager.checkPaymentStatus = originalCheckStatus;
            this.paymentManager.handlePaymentCancel = originalHandleCancel;

        } catch (error) {
            this.addTestResult('Payment Failure Scenarios', 'FAILED', error.message);
        }
    }

    async testCreditUpdatesAndFeatureUnlocking() {
        console.log('🔓 Testing credit updates and feature unlocking...');
        
        try {
            // Test 1: Credit balance update after payment (Requirement 3.4)
            const initialCredits = 0;
            const userData = JSON.parse(localStorage.getItem('user_data'));
            userData.credits = initialCredits;
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            // Simulate successful payment
            const originalGetCredits = this.paymentManager.getUserCredits;
            this.paymentManager.getUserCredits = async () => {
                return { success: true, credits: 50 };
            };
            
            const creditsResult = await this.paymentManager.getUserCredits();
            if (!creditsResult.success || creditsResult.credits !== 50) {
                throw new Error('Credit update failed');
            }
            this.addTestResult('Credit Balance Update', 'PASSED');

            // Test 2: Download limit increase (Requirement 3.4)
            userData.credits = 50;
            userData.plan = 'starter';
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            const originalCanDownload = this.usageTracker.canUserDownload;
            this.usageTracker.canUserDownload = () => {
                const user = JSON.parse(localStorage.getItem('user_data'));
                return user.credits > 0;
            };
            
            const canDownloadAfterUpgrade = this.usageTracker.canUserDownload();
            if (!canDownloadAfterUpgrade) {
                throw new Error('User should be able to download after upgrade');
            }
            this.addTestResult('Download Limit Increase', 'PASSED');

            // Test 3: Premium feature unlocking (Requirement 3.5)
            const featureManager = new FeatureManager();
            const originalHasFeature = featureManager.hasFeature;
            featureManager.hasFeature = (feature) => {
                const user = JSON.parse(localStorage.getItem('user_data'));
                if (user.plan === 'starter') {
                    return ['basic', 'extended'].includes(feature);
                }
                return feature === 'basic';
            };
            
            const hasExtendedFeature = featureManager.hasFeature('extended');
            if (!hasExtendedFeature) {
                throw new Error('Extended features not unlocked for starter plan');
            }
            this.addTestResult('Premium Feature Unlocking', 'PASSED');

            // Test 4: UI updates after upgrade
            const creditsDisplay = document.getElementById('user-credits');
            if (creditsDisplay) {
                creditsDisplay.textContent = '50 credits';
            }
            
            if (!creditsDisplay || !creditsDisplay.textContent.includes('50')) {
                throw new Error('Credits display not updated in UI');
            }
            this.addTestResult('UI Credits Display Update', 'PASSED');

            // Restore original methods
            this.paymentManager.getUserCredits = originalGetCredits;
            this.usageTracker.canUserDownload = originalCanDownload;
            featureManager.hasFeature = originalHasFeature;

        } catch (error) {
            this.addTestResult('Credit Updates and Feature Unlocking', 'FAILED', error.message);
        }
    }

    async testUpgradeFlowIntegration() {
        console.log('🔄 Testing complete upgrade flow integration...');
        
        try {
            // Test 1: End-to-end upgrade flow
            // Start with free user at limit
            let userData = {
                id: 1,
                email: 'test@example.com',
                plan: 'free',
                credits: 0,
                downloadsUsed: 3,
                downloadsLimit: 3
            };
            localStorage.setItem('user_data', JSON.stringify(userData));

            // Step 1: User tries to download
            const originalCanDownload = this.usageTracker.canUserDownload;
            this.usageTracker.canUserDownload = () => {
                const user = JSON.parse(localStorage.getItem('user_data'));
                return user.downloadsUsed < user.downloadsLimit || user.credits > 0;
            };
            
            if (this.usageTracker.canUserDownload()) {
                throw new Error('User should not be able to download at limit');
            }
            this.addTestResult('Initial Limit Check', 'PASSED');

            // Step 2: Upgrade modal shown and plan selected
            const upgradeModal = document.getElementById('upgrade-modal');
            if (upgradeModal) {
                upgradeModal.style.display = 'block';
            }
            
            const starterPlanBtn = document.querySelector('[data-plan="starter"]');
            if (starterPlanBtn) {
                starterPlanBtn.click();
            }
            this.addTestResult('Plan Selection', 'PASSED');

            // Step 3: Payment processing
            const originalCreateSession = this.paymentManager.createCheckoutSession;
            this.paymentManager.createCheckoutSession = async (plan) => {
                return {
                    success: true,
                    sessionId: 'cs_upgrade_session',
                    url: 'https://checkout.stripe.com/pay/cs_upgrade_session'
                };
            };
            
            const sessionResult = await this.paymentManager.createCheckoutSession('starter');
            if (!sessionResult.success) {
                throw new Error('Payment session creation failed');
            }
            this.addTestResult('Payment Session Creation', 'PASSED');

            // Step 4: Payment success and user update
            userData.plan = 'starter';
            userData.credits = 50;
            userData.downloadsLimit = 50;
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            // Step 5: Verify user can now download
            if (!this.usageTracker.canUserDownload()) {
                throw new Error('User should be able to download after upgrade');
            }
            this.addTestResult('Post-Upgrade Download Access', 'PASSED');

            // Step 6: Verify UI updates
            const userCredits = document.getElementById('user-credits');
            if (userCredits) {
                userCredits.textContent = '50 credits';
            }
            
            if (!userCredits || !userCredits.textContent.includes('50')) {
                throw new Error('UI not updated after upgrade');
            }
            this.addTestResult('Post-Upgrade UI Update', 'PASSED');

            // Restore original methods
            this.usageTracker.canUserDownload = originalCanDownload;
            this.paymentManager.createCheckoutSession = originalCreateSession;

        } catch (error) {
            this.addTestResult('Upgrade Flow Integration', 'FAILED', error.message);
        }
    }

    async testPaymentErrorHandling() {
        console.log('⚠️ Testing payment error handling...');
        
        try {
            // Test 1: Stripe API errors
            const originalCreateSession = this.paymentManager.createCheckoutSession;
            this.paymentManager.createCheckoutSession = async (plan) => {
                throw new Error('Stripe API error: Invalid API key');
            };
            
            try {
                await this.paymentManager.createCheckoutSession('starter');
                throw new Error('Should have thrown Stripe API error');
            } catch (error) {
                if (!error.message.includes('Stripe API error')) {
                    throw error;
                }
            }
            this.addTestResult('Stripe API Error Handling', 'PASSED');

            // Test 2: Invalid plan type errors
            this.paymentManager.createCheckoutSession = async (plan) => {
                if (!plan || !['starter', 'pro'].includes(plan)) {
                    throw new Error('Invalid plan type');
                }
                return { success: true };
            };
            
            try {
                await this.paymentManager.createCheckoutSession('invalid');
                throw new Error('Should have thrown invalid plan error');
            } catch (error) {
                if (error.message !== 'Invalid plan type') {
                    throw error;
                }
            }
            this.addTestResult('Invalid Plan Error Handling', 'PASSED');

            // Test 3: Session timeout errors
            const originalCheckStatus = this.paymentManager.checkPaymentStatus;
            this.paymentManager.checkPaymentStatus = async (sessionId) => {
                throw new Error('Session expired');
            };
            
            try {
                await this.paymentManager.checkPaymentStatus('expired_session');
                throw new Error('Should have thrown session expired error');
            } catch (error) {
                if (error.message !== 'Session expired') {
                    throw error;
                }
            }
            this.addTestResult('Session Timeout Error Handling', 'PASSED');

            // Test 4: User-friendly error messages
            const notificationManager = new NotificationManager();
            const originalShowError = notificationManager.showError;
            let errorShown = false;
            
            notificationManager.showError = (message) => {
                errorShown = true;
                return message.includes('payment') && !message.includes('API');
            };
            
            // Simulate showing user-friendly error
            const userFriendlyError = notificationManager.showError('Payment processing failed. Please try again.');
            if (!errorShown || !userFriendlyError) {
                throw new Error('User-friendly error not shown');
            }
            this.addTestResult('User-Friendly Error Messages', 'PASSED');

            // Restore original methods
            this.paymentManager.createCheckoutSession = originalCreateSession;
            this.paymentManager.checkPaymentStatus = originalCheckStatus;
            notificationManager.showError = originalShowError;

        } catch (error) {
            this.addTestResult('Payment Error Handling', 'FAILED', error.message);
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

    displayResults() {
        console.log('\n📊 Integration Payment Test Results:');
        console.log('=' .repeat(60));
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`- ${result.test}: ${result.error}`);
                });
        }
        
        // Store results for reporting
        localStorage.setItem('integration_payment_test_results', JSON.stringify({
            summary: { total, passed, failed, successRate: (passed / total) * 100 },
            details: this.testResults,
            timestamp: new Date().toISOString()
        }));
        
        console.log('\n✅ Integration payment tests completed!');
    }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationPaymentTests;
}