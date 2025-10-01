/**
 * Payment Integration Unit Tests
 * Tests for PaymentManager, PaymentUI, and PaymentIntegration functionality
 * Covers payment flow with mock Stripe responses, credit updates, limit changes, and error handling
 */

// Mock dependencies
class MockApiClient {
    constructor() {
        this.token = null;
        this.responses = new Map();
        this.requestHistory = [];
    }

    setMockResponse(endpoint, response) {
        this.responses.set(endpoint, response);
    }

    saveToken(token) {
        this.token = token;
    }

    async get(endpoint) {
        this.requestHistory.push({ method: 'GET', endpoint });
        
        const mockResponse = this.responses.get(endpoint);
        if (mockResponse) {
            if (mockResponse.shouldThrow) {
                const error = new Error(mockResponse.error || 'Mock error');
                error.status = mockResponse.status || 500;
                error.response = { data: mockResponse.data };
                throw error;
            }
            return mockResponse;
        }
        
        return { ok: true, data: { success: true } };
    }

    async post(endpoint, data) {
        this.requestHistory.push({ method: 'POST', endpoint, data });
        
        const mockResponse = this.responses.get(endpoint);
        if (mockResponse) {
            if (mockResponse.shouldThrow) {
                const error = new Error(mockResponse.error || 'Mock error');
                error.status = mockResponse.status || 500;
                error.response = { data: mockResponse.data };
                throw error;
            }
            return mockResponse;
        }
        
        return { ok: true, data: { success: true } };
    }

    getRequestHistory() {
        return this.requestHistory;
    }

    clearHistory() {
        this.requestHistory = [];
    }
}

class MockNotificationManager {
    constructor() {
        this.notifications = [];
    }

    show(message, type, options = {}) {
        this.notifications.push({ message, type, options });
    }

    getNotifications() {
        return this.notifications;
    }

    clearNotifications() {
        this.notifications = [];
    }
}

class MockAppConfig {
    constructor() {
        this.config = {
            endpoints: {
                payments: {
                    createSession: '/api/payments/create-session',
                    status: '/api/payments/status',
                    history: '/api/payments/history'
                }
            },
            stripe: {
                publishableKey: 'pk_test_mock_key'
            }
        };
        
        this.plans = {
            free: {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'usd',
                features: { downloads: 3, maxRecordingTime: 30 }
            },
            starter: {
                id: 'starter',
                name: 'Starter',
                price: 9.99,
                currency: 'usd',
                features: { downloads: 50, maxRecordingTime: 60 }
            },
            pro: {
                id: 'pro',
                name: 'Pro',
                price: 29.99,
                currency: 'usd',
                features: { downloads: 500, maxRecordingTime: 120 }
            }
        };
    }

    getPlan(planName) {
        return this.plans[planName] || this.plans.free;
    }

    getAllPlans() {
        return Object.values(this.plans);
    }

    getApiUrl(service, endpoint) {
        return this.config.endpoints[service][endpoint];
    }

    getStripeConfig() {
        return this.config.stripe;
    }
}

class MockAuthManager {
    constructor(isAuthenticated = false, userPlan = 'free') {
        this.isAuthenticated = isAuthenticated;
        this.user = isAuthenticated ? { 
            id: 1, 
            email: 'test@example.com', 
            plan: userPlan 
        } : null;
    }

    getCurrentUser() {
        return this.user;
    }

    async refreshUserProfile() {
        // Mock profile refresh
        return { success: true };
    }

    setAuthState(isAuthenticated, userPlan = 'free') {
        this.isAuthenticated = isAuthenticated;
        this.user = isAuthenticated ? { 
            id: 1, 
            email: 'test@example.com', 
            plan: userPlan 
        } : null;
    }
}

class MockUsageTracker {
    constructor() {
        this.usage = {
            downloadsUsed: 0,
            downloadsLimit: 3,
            remainingDownloads: 3,
            isAtLimit: false,
            isNearLimit: false,
            planId: 'free'
        };
        this.usageChangeListeners = [];
    }

    getUsageStats() {
        return this.usage;
    }

    async refreshUsage() {
        // Mock usage refresh
        return { success: true };
    }

    onUsageChange(callback) {
        this.usageChangeListeners.push(callback);
        return () => {
            const index = this.usageChangeListeners.indexOf(callback);
            if (index > -1) {
                this.usageChangeListeners.splice(index, 1);
            }
        };
    }

    canUserDownload() {
        return {
            allowed: !this.usage.isAtLimit,
            reason: this.usage.isAtLimit ? 'limit_reached' : null
        };
    }

    setUsage(usage) {
        this.usage = { ...this.usage, ...usage };
    }

    triggerUsageChange() {
        this.usageChangeListeners.forEach(callback => callback(this.usage));
    }
}

// Mock Stripe
class MockStripe {
    constructor() {
        this.redirectToCheckoutCalled = false;
        this.lastSessionId = null;
        this.shouldFailRedirect = false;
    }

    async redirectToCheckout({ sessionId }) {
        this.redirectToCheckoutCalled = true;
        this.lastSessionId = sessionId;
        
        if (this.shouldFailRedirect) {
            return { error: { message: 'Stripe redirect failed' } };
        }
        
        return { error: null };
    }

    setFailRedirect(shouldFail) {
        this.shouldFailRedirect = shouldFail;
    }
}

// Test utilities
class TestUtils {
    static mockLocalStorage() {
        const storage = {};
        return {
            getItem: (key) => storage[key] || null,
            setItem: (key, value) => { storage[key] = value; },
            removeItem: (key) => { delete storage[key]; },
            clear: () => { Object.keys(storage).forEach(key => delete storage[key]); }
        };
    }

    static setupDOM() {
        document.body.innerHTML = `
            <div id="plan-selection-modal" class="modal-hidden"></div>
            <div id="credit-purchase-modal" class="modal-hidden"></div>
            <div id="payment-success-modal" class="modal-hidden"></div>
            <div id="payment-error-modal" class="modal-hidden"></div>
            <button id="upgrade-button" class="hidden">Upgrade</button>
            <button id="buy-credits-button" class="hidden">Buy Credits</button>
            <button id="bmac-button">Buy Me a Coffee</button>
            <div id="user-credits">0 credits</div>
            <div id="downloads-remaining">3 free downloads remaining</div>
            <button id="download-button">Download</button>
        `;
    }

    static createPaymentSession(overrides = {}) {
        return {
            sessionId: 'cs_test_session_id',
            paymentId: 'pi_test_payment_id',
            planType: 'starter',
            amount: 999,
            createdAt: new Date(),
            ...overrides
        };
    }

    static createStripeResponse(overrides = {}) {
        return {
            ok: true,
            data: {
                session_id: 'cs_test_session_id',
                payment_id: 'pi_test_payment_id',
                session_url: 'https://checkout.stripe.com/pay/cs_test_session_id',
                ...overrides
            }
        };
    }
}

// Test Suite
class PaymentIntegrationTests {
    constructor() {
        this.results = [];
        this.mockApiClient = null;
        this.mockNotificationManager = null;
        this.mockAppConfig = null;
        this.mockAuthManager = null;
        this.mockUsageTracker = null;
        this.mockStripe = null;
        this.paymentManager = null;
        this.paymentUI = null;
        this.paymentIntegration = null;
        this.originalLocalStorage = null;
        this.originalStripe = null;
    }

    setUp() {
        // Mock localStorage
        this.originalLocalStorage = window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            value: TestUtils.mockLocalStorage(),
            writable: true
        });

        // Mock Stripe
        this.mockStripe = new MockStripe();
        this.originalStripe = window.Stripe;
        window.Stripe = () => this.mockStripe;

        // Create mock dependencies
        this.mockApiClient = new MockApiClient();
        this.mockNotificationManager = new MockNotificationManager();
        this.mockAppConfig = new MockAppConfig();
        this.mockAuthManager = new MockAuthManager();
        this.mockUsageTracker = new MockUsageTracker();

        // Setup DOM
        TestUtils.setupDOM();
    }

    tearDown() {
        // Restore localStorage
        if (this.originalLocalStorage) {
            Object.defineProperty(window, 'localStorage', {
                value: this.originalLocalStorage,
                writable: true
            });
        }

        // Restore Stripe
        if (this.originalStripe) {
            window.Stripe = this.originalStripe;
        }

        // Clear DOM
        document.body.innerHTML = '';

        // Clear any timers
        if (this.paymentManager && this.paymentManager.refreshTimer) {
            clearTimeout(this.paymentManager.refreshTimer);
        }
    }

    createPaymentManager() {
        return new PaymentManager(
            this.mockApiClient,
            this.mockAppConfig,
            this.mockNotificationManager
        );
    }

    createPaymentUI() {
        return new PaymentUI(
            this.paymentManager,
            this.mockAuthManager,
            this.mockNotificationManager
        );
    }

    createPaymentIntegration() {
        return new PaymentIntegration(
            this.paymentManager,
            this.mockUsageTracker,
            this.mockAuthManager,
            this.mockNotificationManager
        );
    }

    assert(condition, message) {
        if (condition) {
            this.results.push({ test: message, status: 'PASS' });
        } else {
            this.results.push({ test: message, status: 'FAIL' });
            console.error(`ASSERTION FAILED: ${message}`);
        }
    }

    assertEquals(actual, expected, message) {
        this.assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
    }

    assertNotEquals(actual, expected, message) {
        this.assert(actual !== expected, `${message} (should not equal: ${expected})`);
    }

    assertTrue(condition, message) {
        this.assert(condition === true, message);
    }

    assertFalse(condition, message) {
        this.assert(condition === false, message);
    }

    async runTest(testName, testFunction) {
        console.log(`Running test: ${testName}`);
        this.setUp();
        
        try {
            await testFunction.call(this);
        } catch (error) {
            this.results.push({ test: testName, status: 'ERROR', error: error.message });
            console.error(`Test ${testName} failed with error:`, error);
        }
        
        this.tearDown();
    }

    // PaymentManager Tests

    async testPaymentManagerInitialization() {
        this.paymentManager = this.createPaymentManager();
        
        this.assertNotEquals(this.paymentManager.apiClient, null, 'Should have API client');
        this.assertNotEquals(this.paymentManager.appConfig, null, 'Should have app config');
        this.assertNotEquals(this.paymentManager.notificationManager, null, 'Should have notification manager');
        this.assertEquals(this.paymentManager.currentSession, null, 'Should start with no current session');
        this.assertFalse(this.paymentManager.paymentInProgress, 'Should not have payment in progress initially');
    }

    async testStripeInitialization() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        this.assertNotEquals(this.paymentManager.stripe, null, 'Should initialize Stripe');
    }

    async testCreateCheckoutSessionSuccess() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        const mockResponse = TestUtils.createStripeResponse();
        this.mockApiClient.setMockResponse('/api/payments/create-session', mockResponse);
        
        const session = await this.paymentManager.createCheckoutSession('starter');
        
        this.assertNotEquals(session, null, 'Should create checkout session');
        this.assertEquals(session.sessionId, 'cs_test_session_id', 'Should set session ID');
        this.assertEquals(session.planType, 'starter', 'Should set plan type');
        this.assertTrue(this.mockStripe.redirectToCheckoutCalled, 'Should call Stripe redirect');
        this.assertEquals(this.mockStripe.lastSessionId, 'cs_test_session_id', 'Should redirect with correct session ID');
        
        // Check API call
        const requests = this.mockApiClient.getRequestHistory();
        const createRequest = requests.find(r => r.endpoint === '/api/payments/create-session');
        this.assertNotEquals(createRequest, undefined, 'Should make API call to create session');
        this.assertEquals(createRequest.data.plan_type, 'starter', 'Should send plan type');
        this.assertEquals(createRequest.data.amount, 999, 'Should send amount in cents');
    }

    async testCreateCheckoutSessionFailure() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        this.mockApiClient.setMockResponse('/api/payments/create-session', {
            shouldThrow: true,
            status: 500,
            error: 'Payment session creation failed'
        });
        
        const session = await this.paymentManager.createCheckoutSession('starter');
        
        this.assertEquals(session, null, 'Should return null on failure');
        this.assertFalse(this.paymentManager.paymentInProgress, 'Should clear payment in progress flag');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'error'), 'Should show error notification');
    }

    async testCreateCreditPurchaseSession() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        const mockResponse = TestUtils.createStripeResponse();
        this.mockApiClient.setMockResponse('/api/payments/create-session', mockResponse);
        
        const session = await this.paymentManager.createCreditPurchaseSession(50);
        
        this.assertNotEquals(session, null, 'Should create credit purchase session');
        this.assertEquals(session.type, 'credits', 'Should set type to credits');
        this.assertEquals(session.creditAmount, 50, 'Should set credit amount');
        this.assertEquals(session.amount, 500, 'Should calculate correct price (50 * $0.10 * 100)');
        
        // Check API call
        const requests = this.mockApiClient.getRequestHistory();
        const createRequest = requests.find(r => r.endpoint === '/api/payments/create-session');
        this.assertEquals(createRequest.data.type, 'credits', 'Should send type as credits');
        this.assertEquals(createRequest.data.credit_amount, 50, 'Should send credit amount');
    }

    async testCheckPaymentStatusSuccess() {
        this.paymentManager = this.createPaymentManager();
        
        const mockResponse = {
            ok: true,
            data: {
                session_id: 'cs_test_session_id',
                payment_id: 'pi_test_payment_id',
                status: 'completed',
                stripe_status: 'paid',
                amount: 999,
                created_at: new Date().toISOString()
            }
        };
        
        this.mockApiClient.setMockResponse('/api/payments/status/cs_test_session_id', mockResponse);
        
        const status = await this.paymentManager.checkPaymentStatus('cs_test_session_id');
        
        this.assertEquals(status.sessionId, 'cs_test_session_id', 'Should return session ID');
        this.assertEquals(status.status, 'completed', 'Should return payment status');
        this.assertEquals(status.stripeStatus, 'paid', 'Should return Stripe status');
        this.assertEquals(status.amount, 999, 'Should return amount');
    }

    async testCheckPaymentStatusFailure() {
        this.paymentManager = this.createPaymentManager();
        
        this.mockApiClient.setMockResponse('/api/payments/status/cs_test_session_id', {
            shouldThrow: true,
            status: 404,
            error: 'Payment not found'
        });
        
        try {
            await this.paymentManager.checkPaymentStatus('cs_test_session_id');
            this.assert(false, 'Should throw error on payment status check failure');
        } catch (error) {
            this.assertTrue(error.message.includes('Payment not found'), 'Should propagate error message');
        }
    }

    async testHandlePaymentSuccess() {
        this.paymentManager = this.createPaymentManager();
        
        // Mock successful payment status
        const mockResponse = {
            ok: true,
            data: {
                session_id: 'cs_test_session_id',
                payment_id: 'pi_test_payment_id',
                status: 'completed',
                stripe_status: 'paid',
                amount: 999,
                created_at: new Date().toISOString()
            }
        };
        
        this.mockApiClient.setMockResponse('/api/payments/status/cs_test_session_id', mockResponse);
        
        // Set up current session
        this.paymentManager.currentSession = TestUtils.createPaymentSession();
        this.paymentManager.paymentInProgress = true;
        
        const result = await this.paymentManager.handlePaymentSuccess('cs_test_session_id');
        
        this.assertTrue(result, 'Should return true on successful payment handling');
        this.assertFalse(this.paymentManager.paymentInProgress, 'Should clear payment in progress flag');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'success'), 'Should show success notification');
    }

    async testHandlePaymentCancel() {
        this.paymentManager = this.createPaymentManager();
        
        this.paymentManager.currentSession = TestUtils.createPaymentSession();
        this.paymentManager.paymentInProgress = true;
        
        const result = this.paymentManager.handlePaymentCancel('cs_test_session_id');
        
        this.assertTrue(result, 'Should return true on payment cancel handling');
        this.assertFalse(this.paymentManager.paymentInProgress, 'Should clear payment in progress flag');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'info'), 'Should show info notification');
    }

    async testGetPaymentHistory() {
        this.paymentManager = this.createPaymentManager();
        
        const mockResponse = {
            ok: true,
            data: {
                payments: [
                    {
                        id: 'pi_1',
                        amount: 999,
                        status: 'completed',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'pi_2',
                        amount: 500,
                        status: 'completed',
                        created_at: new Date().toISOString()
                    }
                ]
            }
        };
        
        this.mockApiClient.setMockResponse('/api/payments/history', mockResponse);
        
        const history = await this.paymentManager.getPaymentHistory();
        
        this.assertEquals(history.length, 2, 'Should return payment history');
        this.assertEquals(history[0].id, 'pi_1', 'Should return correct payment data');
    }

    async testGetUpgradeOptions() {
        this.paymentManager = this.createPaymentManager();
        
        const options = this.paymentManager.getUpgradeOptions('free');
        
        this.assertTrue(options.length > 0, 'Should return upgrade options');
        this.assertTrue(options.some(plan => plan.id === 'starter'), 'Should include starter plan');
        this.assertTrue(options.some(plan => plan.id === 'pro'), 'Should include pro plan');
        this.assertFalse(options.some(plan => plan.id === 'free'), 'Should not include current plan');
    }

    async testSessionPersistence() {
        this.paymentManager = this.createPaymentManager();
        
        const session = TestUtils.createPaymentSession();
        this.paymentManager.saveSessionToStorage(session);
        
        const loadedSession = this.paymentManager.loadSessionFromStorage();
        
        this.assertEquals(loadedSession.sessionId, session.sessionId, 'Should persist and load session ID');
        this.assertEquals(loadedSession.planType, session.planType, 'Should persist and load plan type');
        
        this.paymentManager.clearSessionFromStorage();
        const clearedSession = this.paymentManager.loadSessionFromStorage();
        
        this.assertEquals(clearedSession, null, 'Should clear session from storage');
    }

    // PaymentUI Tests

    async testPaymentUIInitialization() {
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.assertTrue(this.paymentUI.isInitialized, 'Should be initialized');
        this.assertEquals(this.paymentUI.selectedCreditAmount, null, 'Should start with no credit selection');
    }

    async testUpdatePaymentButtonsAnonymous() {
        this.mockAuthManager.setAuthState(false);
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.paymentUI.updatePaymentButtons();
        
        const upgradeButton = document.getElementById('upgrade-button');
        const buyCreditsButton = document.getElementById('buy-credits-button');
        const bmacButton = document.getElementById('bmac-button');
        
        this.assertTrue(upgradeButton.classList.contains('hidden'), 'Should hide upgrade button for anonymous users');
        this.assertTrue(buyCreditsButton.classList.contains('hidden'), 'Should hide buy credits button for anonymous users');
        this.assertFalse(bmacButton.classList.contains('hidden'), 'Should show BMAC button for anonymous users');
    }

    async testUpdatePaymentButtonsAuthenticated() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.paymentUI.updatePaymentButtons();
        
        const upgradeButton = document.getElementById('upgrade-button');
        const buyCreditsButton = document.getElementById('buy-credits-button');
        const bmacButton = document.getElementById('bmac-button');
        
        this.assertFalse(upgradeButton.classList.contains('hidden'), 'Should show upgrade button for authenticated users');
        this.assertFalse(buyCreditsButton.classList.contains('hidden'), 'Should show buy credits button for authenticated users');
        this.assertTrue(bmacButton.classList.contains('hidden'), 'Should hide BMAC button for authenticated users');
    }

    async testShowPlanSelectionModal() {
        this.mockAuthManager.setAuthState(true, 'free');
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.paymentUI.showPlanSelectionModal();
        
        const modal = document.getElementById('plan-selection-modal');
        this.assertFalse(modal.classList.contains('modal-hidden'), 'Should show plan selection modal');
    }

    async testShowPlanSelectionModalUnauthenticated() {
        this.mockAuthManager.setAuthState(false);
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.paymentUI.showPlanSelectionModal();
        
        const modal = document.getElementById('plan-selection-modal');
        this.assertTrue(modal.classList.contains('modal-hidden'), 'Should not show modal for unauthenticated users');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'warning'), 'Should show warning notification');
    }

    async testCreditSelection() {
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        this.paymentUI.selectCreditOption(50);
        
        this.assertEquals(this.paymentUI.selectedCreditAmount, 50, 'Should set selected credit amount');
    }

    async testCalculateCreditPrice() {
        this.paymentManager = this.createPaymentManager();
        this.paymentUI = this.createPaymentUI();
        
        // Test different pricing tiers
        this.assertEquals(this.paymentUI.calculateCreditPrice(10), 1.00, 'Should calculate price for small amount');
        this.assertEquals(this.paymentUI.calculateCreditPrice(50), 4.00, 'Should calculate price with tier discount');
        this.assertEquals(this.paymentUI.calculateCreditPrice(100), 7.00, 'Should calculate price with higher tier discount');
    }

    // PaymentIntegration Tests

    async testPaymentIntegrationInitialization() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        this.assertTrue(this.paymentIntegration.isInitialized, 'Should be initialized');
    }

    async testHandlePaymentSuccessIntegration() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const paymentDetails = {
            sessionId: 'cs_test_session_id',
            paymentId: 'pi_test_payment_id',
            planType: 'starter',
            amount: 999
        };
        
        await this.paymentIntegration.handlePaymentSuccess(paymentDetails);
        
        // Should trigger user profile refresh and usage refresh
        // Check notifications
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.length > 0, 'Should show payment success notification');
    }

    async testHandleUsageChangeNearLimit() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const usageStats = {
            remainingDownloads: 1,
            isNearLimit: true,
            isAtLimit: false,
            planId: 'free'
        };
        
        this.paymentIntegration.handleUsageChange(usageStats);
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('1 download remaining')), 'Should show near limit notification');
    }

    async testHandleUsageChangeAtLimit() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const usageStats = {
            remainingDownloads: 0,
            isNearLimit: false,
            isAtLimit: true,
            planId: 'free'
        };
        
        this.paymentIntegration.handleUsageChange(usageStats);
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('used all your free downloads')), 'Should show at limit notification');
    }

    async testHandleDownloadLimitReachedFreeUser() {
        this.mockAuthManager.setAuthState(false);
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const limitDetails = {
            reason: 'free_limit',
            message: 'Free download limit reached'
        };
        
        this.paymentIntegration.handleDownloadLimitReached(limitDetails);
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('Sign up')), 'Should prompt anonymous user to sign up');
    }

    async testHandleDownloadLimitReachedAuthenticatedUser() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const limitDetails = {
            reason: 'no_credits',
            message: 'No credits remaining'
        };
        
        this.paymentIntegration.handleDownloadLimitReached(limitDetails);
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('Upgrade') || n.message.includes('credits')), 'Should show upgrade or credit options');
    }

    async testUpdateUIAfterPayment() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        // Set up download button as disabled
        const downloadButton = document.getElementById('download-button');
        downloadButton.disabled = true;
        downloadButton.textContent = 'Limit Reached';
        
        const paymentDetails = {
            planType: 'starter',
            amount: 999
        };
        
        this.paymentIntegration.updateUIAfterPayment(paymentDetails);
        
        this.assertFalse(downloadButton.disabled, 'Should enable download button after payment');
        this.assertEquals(downloadButton.textContent, 'Download', 'Should reset download button text');
    }

    async testCheckDownloadPermission() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        // Test when user can download
        this.mockUsageTracker.setUsage({ isAtLimit: false });
        
        const canDownload = await this.paymentIntegration.checkDownloadPermission();
        this.assertTrue(canDownload, 'Should allow download when not at limit');
        
        // Test when user cannot download
        this.mockUsageTracker.setUsage({ isAtLimit: true });
        
        const cannotDownload = await this.paymentIntegration.checkDownloadPermission();
        this.assertFalse(cannotDownload, 'Should not allow download when at limit');
    }

    async testGetUpgradeRecommendations() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        // Test recommendations for free user with high usage
        const usageStats = {
            planId: 'free',
            dailyDownloads: 2,
            monthlyDownloads: 3,
            remainingDownloads: 0
        };
        
        const recommendations = this.paymentIntegration.getUpgradeRecommendations(usageStats);
        
        this.assertTrue(recommendations.length > 0, 'Should provide recommendations');
        this.assertTrue(recommendations.some(r => r.type === 'plan_upgrade'), 'Should recommend plan upgrade');
    }

    // Error Handling Tests

    async testPaymentErrorHandling() {
        this.paymentManager = this.createPaymentManager();
        
        // Test network error
        const networkError = new Error('Network error occurred');
        const networkMessage = this.paymentManager.getPaymentErrorMessage(networkError);
        this.assertTrue(networkMessage.includes('Network error'), 'Should handle network errors');
        
        // Test card error
        const cardError = new Error('Your card was declined');
        const cardMessage = this.paymentManager.getPaymentErrorMessage(cardError);
        this.assertTrue(cardMessage.includes('Card error'), 'Should handle card errors');
        
        // Test generic error
        const genericError = new Error('Something went wrong');
        const genericMessage = this.paymentManager.getPaymentErrorMessage(genericError);
        this.assertTrue(genericMessage.includes('Payment failed'), 'Should handle generic errors');
    }

    async testStripeRedirectFailure() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        // Set Stripe to fail redirect
        this.mockStripe.setFailRedirect(true);
        
        const mockResponse = TestUtils.createStripeResponse();
        this.mockApiClient.setMockResponse('/api/payments/create-session', mockResponse);
        
        const session = await this.paymentManager.createCheckoutSession('starter');
        
        this.assertEquals(session, null, 'Should return null when Stripe redirect fails');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'error'), 'Should show error notification');
    }

    async testPaymentInProgressPrevention() {
        this.paymentManager = this.createPaymentManager();
        await this.paymentManager.initializeStripe();
        
        // Set payment in progress
        this.paymentManager.paymentInProgress = true;
        
        const session = await this.paymentManager.createCheckoutSession('starter');
        
        this.assertEquals(session, null, 'Should prevent multiple simultaneous payments');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'warning'), 'Should show warning notification');
    }

    // Credit Update and Limit Change Tests

    async testCreditUpdateAfterPayment() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        // Set initial usage
        this.mockUsageTracker.setUsage({
            downloadsUsed: 10,
            downloadsLimit: 50,
            remainingDownloads: 40
        });
        
        const paymentDetails = {
            creditAmount: 50,
            amount: 500
        };
        
        await this.paymentIntegration.handlePaymentSuccess(paymentDetails);
        
        // Should trigger usage refresh which would update credits
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('credits added')), 'Should show credit addition notification');
    }

    async testLimitChangeAfterPlanUpgrade() {
        this.mockAuthManager.setAuthState(true, 'free');
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        // Set initial free user usage
        this.mockUsageTracker.setUsage({
            downloadsUsed: 3,
            downloadsLimit: 3,
            remainingDownloads: 0,
            planId: 'free'
        });
        
        const paymentDetails = {
            planType: 'starter',
            amount: 999
        };
        
        await this.paymentIntegration.handlePaymentSuccess(paymentDetails);
        
        // Should trigger profile and usage refresh
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.message.includes('Welcome to Starter')), 'Should show plan upgrade notification');
    }

    async testDownloadButtonStateUpdate() {
        this.paymentManager = this.createPaymentManager();
        this.paymentIntegration = this.createPaymentIntegration();
        
        const downloadButton = document.getElementById('download-button');
        
        // Test at limit
        const atLimitUsage = { isAtLimit: true };
        this.paymentIntegration.updateDownloadButtonState(atLimitUsage);
        
        this.assertTrue(downloadButton.disabled, 'Should disable button when at limit');
        this.assertEquals(downloadButton.textContent, 'Limit Reached', 'Should update button text');
        
        // Test not at limit
        const normalUsage = { isAtLimit: false };
        this.paymentIntegration.updateDownloadButtonState(normalUsage);
        
        this.assertFalse(downloadButton.disabled, 'Should enable button when not at limit');
        this.assertEquals(downloadButton.textContent, 'Download', 'Should reset button text');
    }

    // Run all tests
    async runAllTests() {
        const tests = [
            // PaymentManager Tests
            ['PaymentManager Initialization', this.testPaymentManagerInitialization],
            ['Stripe Initialization', this.testStripeInitialization],
            ['Create Checkout Session Success', this.testCreateCheckoutSessionSuccess],
            ['Create Checkout Session Failure', this.testCreateCheckoutSessionFailure],
            ['Create Credit Purchase Session', this.testCreateCreditPurchaseSession],
            ['Check Payment Status Success', this.testCheckPaymentStatusSuccess],
            ['Check Payment Status Failure', this.testCheckPaymentStatusFailure],
            ['Handle Payment Success', this.testHandlePaymentSuccess],
            ['Handle Payment Cancel', this.testHandlePaymentCancel],
            ['Get Payment History', this.testGetPaymentHistory],
            ['Get Upgrade Options', this.testGetUpgradeOptions],
            ['Session Persistence', this.testSessionPersistence],
            
            // PaymentUI Tests
            ['PaymentUI Initialization', this.testPaymentUIInitialization],
            ['Update Payment Buttons Anonymous', this.testUpdatePaymentButtonsAnonymous],
            ['Update Payment Buttons Authenticated', this.testUpdatePaymentButtonsAuthenticated],
            ['Show Plan Selection Modal', this.testShowPlanSelectionModal],
            ['Show Plan Selection Modal Unauthenticated', this.testShowPlanSelectionModalUnauthenticated],
            ['Credit Selection', this.testCreditSelection],
            ['Calculate Credit Price', this.testCalculateCreditPrice],
            
            // PaymentIntegration Tests
            ['PaymentIntegration Initialization', this.testPaymentIntegrationInitialization],
            ['Handle Payment Success Integration', this.testHandlePaymentSuccessIntegration],
            ['Handle Usage Change Near Limit', this.testHandleUsageChangeNearLimit],
            ['Handle Usage Change At Limit', this.testHandleUsageChangeAtLimit],
            ['Handle Download Limit Reached Free User', this.testHandleDownloadLimitReachedFreeUser],
            ['Handle Download Limit Reached Authenticated User', this.testHandleDownloadLimitReachedAuthenticatedUser],
            ['Update UI After Payment', this.testUpdateUIAfterPayment],
            ['Check Download Permission', this.testCheckDownloadPermission],
            ['Get Upgrade Recommendations', this.testGetUpgradeRecommendations],
            
            // Error Handling Tests
            ['Payment Error Handling', this.testPaymentErrorHandling],
            ['Stripe Redirect Failure', this.testStripeRedirectFailure],
            ['Payment In Progress Prevention', this.testPaymentInProgressPrevention],
            
            // Credit Update and Limit Change Tests
            ['Credit Update After Payment', this.testCreditUpdateAfterPayment],
            ['Limit Change After Plan Upgrade', this.testLimitChangeAfterPlanUpgrade],
            ['Download Button State Update', this.testDownloadButtonStateUpdate]
        ];

        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }

        return this.results;
    }
}

// Export for use in other modules
window.PaymentIntegrationTests = PaymentIntegrationTests;