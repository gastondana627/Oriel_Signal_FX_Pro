/**
 * Usage Tracker Unit Tests
 * Tests for UsageTracker functionality including limit checking, download tracking, and backend synchronization
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
        
        // Default success response
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
                user: {
                    usage: '/api/user/usage',
                    trackDownload: '/api/user/track-download'
                }
            }
        };
        
        this.plans = {
            free: {
                id: 'free',
                name: 'Free',
                features: { downloads: 3 },
                limits: { dailyDownloads: 3, monthlyDownloads: 3 }
            },
            starter: {
                id: 'starter',
                name: 'Starter',
                features: { downloads: 50 },
                limits: { dailyDownloads: 10, monthlyDownloads: 50 }
            },
            pro: {
                id: 'pro',
                name: 'Pro',
                features: { downloads: 500 },
                limits: { dailyDownloads: 50, monthlyDownloads: 500 }
            }
        };
    }

    getPlan(planName) {
        return this.plans[planName] || this.plans.free;
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
        this.stateChangeListeners = [];
    }

    getUserPlan() {
        if (!this.isAuthenticated) {
            return { id: 'free', name: 'Free', features: { downloads: 3 }, limits: { dailyDownloads: 3, monthlyDownloads: 3 } };
        }
        
        const plans = {
            free: { id: 'free', name: 'Free', features: { downloads: 3 }, limits: { dailyDownloads: 3, monthlyDownloads: 3 } },
            starter: { id: 'starter', name: 'Starter', features: { downloads: 50 }, limits: { dailyDownloads: 10, monthlyDownloads: 50 } },
            pro: { id: 'pro', name: 'Pro', features: { downloads: 500 }, limits: { dailyDownloads: 50, monthlyDownloads: 500 } }
        };
        
        return plans[this.user.plan] || plans.free;
    }

    onStateChange(callback) {
        this.stateChangeListeners.push(callback);
        return () => {
            const index = this.stateChangeListeners.indexOf(callback);
            if (index > -1) {
                this.stateChangeListeners.splice(index, 1);
            }
        };
    }

    triggerStateChange() {
        this.stateChangeListeners.forEach(callback => {
            callback({ isAuthenticated: this.isAuthenticated, user: this.user });
        });
    }

    setAuthState(isAuthenticated, userPlan = 'free') {
        this.isAuthenticated = isAuthenticated;
        this.user = isAuthenticated ? { 
            id: 1, 
            email: 'test@example.com', 
            plan: userPlan 
        } : null;
        this.triggerStateChange();
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

    static createUsageData(overrides = {}) {
        return {
            downloadsUsed: 0,
            downloadsLimit: 3,
            lastReset: new Date(),
            dailyDownloads: 0,
            monthlyDownloads: 0,
            ...overrides
        };
    }

    static createBackendUsageResponse(overrides = {}) {
        return {
            ok: true,
            data: {
                downloadsUsed: 0,
                downloadsLimit: 3,
                lastReset: new Date().toISOString(),
                dailyDownloads: 0,
                monthlyDownloads: 0,
                ...overrides
            }
        };
    }
}

// Test Suite
class UsageTrackerTests {
    constructor() {
        this.results = [];
        this.mockApiClient = null;
        this.mockNotificationManager = null;
        this.mockAppConfig = null;
        this.mockAuthManager = null;
        this.usageTracker = null;
        this.originalLocalStorage = null;
    }

    setUp() {
        // Mock localStorage
        this.originalLocalStorage = window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            value: TestUtils.mockLocalStorage(),
            writable: true
        });

        // Create mock dependencies
        this.mockApiClient = new MockApiClient();
        this.mockNotificationManager = new MockNotificationManager();
        this.mockAppConfig = new MockAppConfig();
        this.mockAuthManager = new MockAuthManager();
    }

    tearDown() {
        // Restore localStorage
        if (this.originalLocalStorage) {
            Object.defineProperty(window, 'localStorage', {
                value: this.originalLocalStorage,
                writable: true
            });
        }

        // Clear any timers or listeners
        if (this.usageTracker) {
            this.usageTracker.usageChangeListeners = [];
        }
    }

    createUsageTracker() {
        return new UsageTracker(
            this.mockApiClient,
            this.mockAppConfig,
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

    // Test: UsageTracker Initialization
    async testUsageTrackerInitialization() {
        this.usageTracker = this.createUsageTracker();
        
        this.assertNotEquals(this.usageTracker.apiClient, null, 'Should have API client');
        this.assertNotEquals(this.usageTracker.appConfig, null, 'Should have app config');
        this.assertNotEquals(this.usageTracker.authManager, null, 'Should have auth manager');
        this.assertNotEquals(this.usageTracker.notificationManager, null, 'Should have notification manager');
        this.assertEquals(this.usageTracker.usageChangeListeners.length, 0, 'Should start with no listeners');
    }

    // Test: Anonymous User Limit Checking
    async testAnonymousUserLimitChecking() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        // Test within limits
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 1, 
            downloadsLimit: 3,
            dailyDownloads: 1 
        });
        
        let canDownload = this.usageTracker.canUserDownload();
        this.assertTrue(canDownload.allowed, 'Anonymous user should be able to download within limits');
        
        // Test at daily limit
        this.usageTracker.usage.dailyDownloads = 3;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Anonymous user should not be able to download at daily limit');
        this.assertEquals(canDownload.reason, 'daily_limit', 'Should indicate daily limit reached');
        
        // Test at free limit
        this.usageTracker.usage.dailyDownloads = 1;
        this.usageTracker.usage.downloadsUsed = 3;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Anonymous user should not be able to download at free limit');
        this.assertEquals(canDownload.reason, 'free_limit', 'Should indicate free limit reached');
    }

    // Test: Authenticated User Limit Checking
    async testAuthenticatedUserLimitChecking() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        // Test within limits
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 5, 
            downloadsLimit: 50,
            dailyDownloads: 3,
            monthlyDownloads: 10 
        });
        
        let canDownload = this.usageTracker.canUserDownload();
        this.assertTrue(canDownload.allowed, 'Authenticated user should be able to download within limits');
        
        // Test at daily limit
        this.usageTracker.usage.dailyDownloads = 10;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Authenticated user should not be able to download at daily limit');
        this.assertEquals(canDownload.reason, 'daily_limit', 'Should indicate daily limit reached');
        
        // Test at monthly limit
        this.usageTracker.usage.dailyDownloads = 5;
        this.usageTracker.usage.monthlyDownloads = 50;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Authenticated user should not be able to download at monthly limit');
        this.assertEquals(canDownload.reason, 'monthly_limit', 'Should indicate monthly limit reached');
        
        // Test no credits remaining
        this.usageTracker.usage.monthlyDownloads = 20;
        this.usageTracker.usage.downloadsUsed = 50;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Authenticated user should not be able to download with no credits');
        this.assertEquals(canDownload.reason, 'no_credits', 'Should indicate no credits remaining');
    }

    // Test: Premium User Limit Checking
    async testPremiumUserLimitChecking() {
        this.mockAuthManager.setAuthState(true, 'pro');
        this.usageTracker = this.createUsageTracker();
        
        // Test higher limits for pro user
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 100, 
            downloadsLimit: 500,
            dailyDownloads: 25,
            monthlyDownloads: 200 
        });
        
        let canDownload = this.usageTracker.canUserDownload();
        this.assertTrue(canDownload.allowed, 'Pro user should be able to download within higher limits');
        
        // Test at pro daily limit
        this.usageTracker.usage.dailyDownloads = 50;
        canDownload = this.usageTracker.canUserDownload();
        this.assertFalse(canDownload.allowed, 'Pro user should not be able to download at daily limit');
        this.assertEquals(canDownload.reason, 'daily_limit', 'Should indicate daily limit reached');
    }

    // Test: Local Storage Usage Loading
    async testLocalStorageUsageLoading() {
        this.mockAuthManager.setAuthState(false);
        
        // Set up local storage data
        const usageData = { downloadsUsed: 2, dailyDownloads: 2, monthlyDownloads: 2 };
        const usageDate = new Date().toISOString();
        localStorage.setItem('oriel_usage_data', JSON.stringify(usageData));
        localStorage.setItem('oriel_usage_date', usageDate);
        
        this.usageTracker = this.createUsageTracker();
        await this.usageTracker.initializeUsage();
        
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 2, 'Should load downloads used from local storage');
        this.assertEquals(this.usageTracker.usage.dailyDownloads, 2, 'Should load daily downloads from local storage');
        this.assertEquals(this.usageTracker.usage.monthlyDownloads, 2, 'Should load monthly downloads from local storage');
    }

    // Test: Backend Usage Loading
    async testBackendUsageLoading() {
        this.mockAuthManager.setAuthState(true, 'starter');
        
        const backendResponse = TestUtils.createBackendUsageResponse({
            downloadsUsed: 15,
            downloadsLimit: 50,
            dailyDownloads: 5,
            monthlyDownloads: 15
        });
        
        this.mockApiClient.setMockResponse('/api/user/usage', backendResponse);
        
        this.usageTracker = this.createUsageTracker();
        await this.usageTracker.initializeUsage();
        
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 15, 'Should load downloads used from backend');
        this.assertEquals(this.usageTracker.usage.downloadsLimit, 50, 'Should load downloads limit from backend');
        this.assertEquals(this.usageTracker.usage.dailyDownloads, 5, 'Should load daily downloads from backend');
        this.assertEquals(this.usageTracker.usage.monthlyDownloads, 15, 'Should load monthly downloads from backend');
    }

    // Test: Backend Usage Loading Failure
    async testBackendUsageLoadingFailure() {
        this.mockAuthManager.setAuthState(true, 'starter');
        
        this.mockApiClient.setMockResponse('/api/user/usage', {
            shouldThrow: true,
            status: 500,
            error: 'Server error'
        });
        
        this.usageTracker = this.createUsageTracker();
        await this.usageTracker.initializeUsage();
        
        // Should fall back to plan defaults
        const plan = this.mockAuthManager.getUserPlan();
        this.assertEquals(this.usageTracker.usage.downloadsLimit, plan.features.downloads, 'Should fall back to plan limit on backend failure');
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 0, 'Should reset usage on backend failure');
    }

    // Test: Download Tracking for Anonymous Users
    async testDownloadTrackingAnonymousUser() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        // Set up initial usage
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 1, 
            dailyDownloads: 1,
            monthlyDownloads: 1 
        });
        
        const result = await this.usageTracker.trackDownload('gif', { duration: 30, format: 'gif' });
        
        this.assertTrue(result.success, 'Download tracking should succeed for anonymous user');
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 2, 'Should increment downloads used');
        this.assertEquals(this.usageTracker.usage.dailyDownloads, 2, 'Should increment daily downloads');
        this.assertEquals(this.usageTracker.usage.monthlyDownloads, 2, 'Should increment monthly downloads');
        
        // Check local storage persistence
        const storedUsage = JSON.parse(localStorage.getItem('oriel_usage_data'));
        this.assertEquals(storedUsage.downloadsUsed, 2, 'Should persist usage to local storage');
    }

    // Test: Download Tracking for Authenticated Users
    async testDownloadTrackingAuthenticatedUser() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        // Set up initial usage
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 5, 
            downloadsLimit: 50,
            dailyDownloads: 2,
            monthlyDownloads: 5 
        });
        
        // Mock backend response
        this.mockApiClient.setMockResponse('/api/user/track-download', {
            ok: true,
            data: {
                success: true,
                usage: {
                    downloadsUsed: 6,
                    dailyDownloads: 3,
                    monthlyDownloads: 6
                }
            }
        });
        
        const result = await this.usageTracker.trackDownload('gif', { duration: 45, format: 'gif', quality: 'high' });
        
        this.assertTrue(result.success, 'Download tracking should succeed for authenticated user');
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 6, 'Should update downloads used from backend response');
        
        // Check API call was made
        const requests = this.mockApiClient.getRequestHistory();
        const trackRequest = requests.find(r => r.endpoint === '/api/user/track-download');
        this.assertNotEquals(trackRequest, undefined, 'Should make API call to track download');
        this.assertEquals(trackRequest.data.type, 'gif', 'Should send download type');
        this.assertEquals(trackRequest.data.metadata.duration, 45, 'Should send metadata');
    }

    // Test: Download Tracking Backend Failure
    async testDownloadTrackingBackendFailure() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        // Set up initial usage
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 5, 
            dailyDownloads: 2 
        });
        
        // Mock backend failure
        this.mockApiClient.setMockResponse('/api/user/track-download', {
            shouldThrow: true,
            status: 500,
            error: 'Server error'
        });
        
        try {
            await this.usageTracker.trackDownload('gif');
            this.assert(false, 'Should throw error on backend failure');
        } catch (error) {
            this.assertTrue(error.message.includes('Server error'), 'Should propagate backend error');
        }
    }

    // Test: Download Tracking at Limit
    async testDownloadTrackingAtLimit() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        // Set usage at limit
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 3, 
            downloadsLimit: 3,
            dailyDownloads: 3 
        });
        
        try {
            await this.usageTracker.trackDownload('gif');
            this.assert(false, 'Should throw error when at limit');
        } catch (error) {
            this.assertTrue(error.message.includes('limit reached'), 'Should indicate limit reached');
        }
    }

    // Test: Usage Statistics Calculation
    async testUsageStatisticsCalculation() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 15, 
            downloadsLimit: 50,
            dailyDownloads: 3,
            monthlyDownloads: 15 
        });
        
        const stats = this.usageTracker.getUsageStats();
        
        this.assertEquals(stats.downloadsUsed, 15, 'Should return correct downloads used');
        this.assertEquals(stats.downloadsLimit, 50, 'Should return correct downloads limit');
        this.assertEquals(stats.remainingDownloads, 35, 'Should calculate remaining downloads correctly');
        this.assertEquals(stats.dailyDownloads, 3, 'Should return correct daily downloads');
        this.assertEquals(stats.dailyRemaining, 7, 'Should calculate daily remaining correctly');
        this.assertEquals(stats.monthlyDownloads, 15, 'Should return correct monthly downloads');
        this.assertEquals(stats.monthlyRemaining, 35, 'Should calculate monthly remaining correctly');
        this.assertEquals(stats.planName, 'Starter', 'Should return correct plan name');
        this.assertFalse(stats.isNearLimit, 'Should not be near limit');
        this.assertFalse(stats.isAtLimit, 'Should not be at limit');
        this.assertFalse(stats.needsUpgrade, 'Should not need upgrade');
    }

    // Test: Usage Statistics Near Limit
    async testUsageStatisticsNearLimit() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 49, 
            downloadsLimit: 50 
        });
        
        const stats = this.usageTracker.getUsageStats();
        
        this.assertEquals(stats.remainingDownloads, 1, 'Should have 1 download remaining');
        this.assertTrue(stats.isNearLimit, 'Should be near limit');
        this.assertFalse(stats.isAtLimit, 'Should not be at limit yet');
    }

    // Test: Usage Statistics At Limit
    async testUsageStatisticsAtLimit() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 3, 
            downloadsLimit: 3 
        });
        
        const stats = this.usageTracker.getUsageStats();
        
        this.assertEquals(stats.remainingDownloads, 0, 'Should have 0 downloads remaining');
        this.assertTrue(stats.isAtLimit, 'Should be at limit');
        this.assertTrue(stats.needsUpgrade, 'Free user at limit should need upgrade');
    }

    // Test: Auth State Change Handling
    async testAuthStateChangeHandling() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        // Set up local storage usage
        this.usageTracker.usage = TestUtils.createUsageData({ downloadsUsed: 2 });
        
        // Mock backend response for when user logs in
        this.mockApiClient.setMockResponse('/api/user/usage', TestUtils.createBackendUsageResponse({
            downloadsUsed: 10,
            downloadsLimit: 50
        }));
        
        // Simulate user login
        this.mockAuthManager.setAuthState(true, 'starter');
        
        // Wait for async handling
        await new Promise(resolve => setTimeout(resolve, 10));
        
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 10, 'Should load backend usage on login');
        this.assertEquals(this.usageTracker.usage.downloadsLimit, 50, 'Should update limit on login');
    }

    // Test: Usage Change Listeners
    async testUsageChangeListeners() {
        this.usageTracker = this.createUsageTracker();
        
        let listenerCallCount = 0;
        let lastUsageStats = null;
        
        const unsubscribe = this.usageTracker.onUsageChange((stats) => {
            listenerCallCount++;
            lastUsageStats = stats;
        });
        
        // Trigger usage change
        this.usageTracker.notifyUsageChange();
        
        this.assertTrue(listenerCallCount > 0, 'Should call usage change listener');
        this.assertNotEquals(lastUsageStats, null, 'Should pass usage stats to listener');
        
        // Test unsubscribe
        unsubscribe();
        const previousCount = listenerCallCount;
        this.usageTracker.notifyUsageChange();
        
        this.assertEquals(listenerCallCount, previousCount, 'Should not call listener after unsubscribe');
    }

    // Test: Daily Usage Reset
    async testDailyUsageReset() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        // Set up usage data
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 2,
            dailyDownloads: 2,
            monthlyDownloads: 5 
        });
        
        this.usageTracker.resetDailyUsage();
        
        this.assertEquals(this.usageTracker.usage.downloadsUsed, 0, 'Should reset daily downloads used');
        this.assertEquals(this.usageTracker.usage.dailyDownloads, 0, 'Should reset daily downloads counter');
        this.assertEquals(this.usageTracker.usage.monthlyDownloads, 5, 'Should preserve monthly downloads');
        this.assertNotEquals(this.usageTracker.usage.lastReset, null, 'Should update last reset time');
    }

    // Test: Monthly Usage Reset
    async testMonthlyUsageReset() {
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            monthlyDownloads: 25 
        });
        
        this.usageTracker.resetMonthlyUsage();
        
        this.assertEquals(this.usageTracker.usage.monthlyDownloads, 0, 'Should reset monthly downloads');
    }

    // Test: Upgrade Prompt for Anonymous Users
    async testUpgradePromptAnonymousUser() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.showUpgradePrompt('limit_reached');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.length > 0, 'Should show notification');
        
        const notification = notifications[0];
        this.assertTrue(notification.message.includes('Sign up'), 'Should prompt anonymous user to sign up');
        this.assertEquals(notification.options.actionText, 'Sign Up', 'Should have sign up action');
    }

    // Test: Upgrade Prompt for Free Users
    async testUpgradePromptFreeUser() {
        this.mockAuthManager.setAuthState(true, 'free');
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.showUpgradePrompt('limit_reached');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.length > 0, 'Should show notification');
        
        const notification = notifications[0];
        this.assertTrue(notification.message.includes('Upgrade'), 'Should prompt free user to upgrade');
        this.assertEquals(notification.options.actionText, 'Upgrade Now', 'Should have upgrade action');
    }

    // Test: Usage Summary for Anonymous Users
    async testUsageSummaryAnonymousUser() {
        this.mockAuthManager.setAuthState(false);
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 1, 
            downloadsLimit: 3 
        });
        
        const summary = this.usageTracker.getUsageSummary();
        
        this.assertTrue(summary.primary.includes('2'), 'Should show remaining downloads');
        this.assertTrue(summary.primary.includes('free'), 'Should indicate free downloads');
        this.assertTrue(summary.secondary.includes('Sign up'), 'Should prompt to sign up');
        this.assertEquals(summary.plan, 'Free', 'Should show free plan');
    }

    // Test: Usage Summary for Authenticated Users
    async testUsageSummaryAuthenticatedUser() {
        this.mockAuthManager.setAuthState(true, 'starter');
        this.usageTracker = this.createUsageTracker();
        
        this.usageTracker.usage = TestUtils.createUsageData({ 
            downloadsUsed: 10, 
            downloadsLimit: 50,
            dailyDownloads: 3 
        });
        
        const summary = this.usageTracker.getUsageSummary();
        
        this.assertTrue(summary.primary.includes('40'), 'Should show remaining downloads');
        this.assertFalse(summary.primary.includes('free'), 'Should not mention free for paid user');
        this.assertEquals(summary.plan, 'Starter', 'Should show correct plan');
    }

    // Test: Different Day Detection
    async testDifferentDayDetection() {
        this.usageTracker = this.createUsageTracker();
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const sameDay = new Date(today);
        sameDay.setHours(sameDay.getHours() - 1);
        
        this.assertTrue(this.usageTracker.isDifferentDay(yesterday, today), 'Should detect different days');
        this.assertFalse(this.usageTracker.isDifferentDay(sameDay, today), 'Should not detect same day as different');
    }

    // Test: Next Reset Date Calculation
    async testNextResetDateCalculation() {
        this.usageTracker = this.createUsageTracker();
        
        const nextReset = this.usageTracker.getNextResetDate();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        this.assertEquals(nextReset.getTime(), tomorrow.getTime(), 'Should calculate next reset as tomorrow at midnight');
    }

    // Run all tests
    async runAllTests() {
        const tests = [
            'testUsageTrackerInitialization',
            'testAnonymousUserLimitChecking',
            'testAuthenticatedUserLimitChecking',
            'testPremiumUserLimitChecking',
            'testLocalStorageUsageLoading',
            'testBackendUsageLoading',
            'testBackendUsageLoadingFailure',
            'testDownloadTrackingAnonymousUser',
            'testDownloadTrackingAuthenticatedUser',
            'testDownloadTrackingBackendFailure',
            'testDownloadTrackingAtLimit',
            'testUsageStatisticsCalculation',
            'testUsageStatisticsNearLimit',
            'testUsageStatisticsAtLimit',
            'testAuthStateChangeHandling',
            'testUsageChangeListeners',
            'testDailyUsageReset',
            'testMonthlyUsageReset',
            'testUpgradePromptAnonymousUser',
            'testUpgradePromptFreeUser',
            'testUsageSummaryAnonymousUser',
            'testUsageSummaryAuthenticatedUser',
            'testDifferentDayDetection',
            'testNextResetDateCalculation'
        ];

        for (const testName of tests) {
            await this.runTest(testName, this[testName]);
        }

        // Print summary
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;
        const total = this.results.length;

        console.log(`\n=== Usage Tracker Test Results ===`);
        console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}, Errors: ${errors}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        if (failed > 0 || errors > 0) {
            console.log('\nFailed/Error Tests:');
            this.results.filter(r => r.status !== 'PASS').forEach(result => {
                console.log(`- ${result.test}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
            });
        }
    }
}

// Export for use in other modules
window.UsageTrackerTests = UsageTrackerTests;