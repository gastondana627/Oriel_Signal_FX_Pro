/**
 * Authentication Unit Tests
 * Tests for AuthManager, AuthUI, and API client authentication functionality
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
        
        // Default success response
        return { ok: true, data: { success: true } };
    }

    async put(endpoint, data) {
        this.requestHistory.push({ method: 'PUT', endpoint, data });
        
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

    show(message, type) {
        this.notifications.push({ message, type });
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
                auth: {
                    login: '/api/auth/login',
                    register: '/api/auth/register',
                    logout: '/api/auth/logout',
                    refresh: '/api/auth/refresh',
                    resetPassword: '/api/auth/reset-password',
                    verifyEmail: '/api/auth/verify-email'
                },
                user: {
                    profile: '/api/user/profile'
                }
            }
        };
        
        this.plans = {
            free: { downloads: 3, features: ['basic'] },
            starter: { downloads: 50, features: ['basic', 'extended'] },
            pro: { downloads: 500, features: ['basic', 'extended', 'premium'] }
        };
    }

    hasPermission(plan, permission) {
        const planConfig = this.plans[plan];
        return planConfig && planConfig.features.includes(permission);
    }

    getPlan(planName) {
        return this.plans[planName] || this.plans.free;
    }
}

// Test utilities
class TestUtils {
    static createValidJWT(expiresIn = 3600) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'test-user-id',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + expiresIn
        }));
        const signature = 'mock-signature';
        return `${header}.${payload}.${signature}`;
    }

    static createExpiredJWT() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'test-user-id',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        }));
        const signature = 'mock-signature';
        return `${header}.${payload}.${signature}`;
    }

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
        // Create minimal DOM structure for testing
        document.body.innerHTML = `
            <div id="anonymous-status"></div>
            <div id="authenticated-status" class="hidden"></div>
            <div id="user-email"></div>
            <div id="user-credits"></div>
            <div id="downloads-remaining"></div>
            
            <div id="login-modal" class="modal-hidden">
                <form id="login-form">
                    <input id="login-email" type="email" name="email">
                    <input id="login-password" type="password" name="password">
                    <button id="login-submit-btn" type="submit">
                        <span class="btn-text">Login</span>
                        <span class="btn-spinner hidden">Loading...</span>
                    </button>
                </form>
                <div id="login-email-error" class="form-error"></div>
                <div id="login-password-error" class="form-error"></div>
            </div>
            
            <div id="register-modal" class="modal-hidden">
                <form id="register-form">
                    <input id="register-email" type="email" name="email">
                    <input id="register-password" type="password" name="password">
                    <input id="register-confirm-password" type="password" name="confirmPassword">
                    <button id="register-submit-btn" type="submit">
                        <span class="btn-text">Register</span>
                        <span class="btn-spinner hidden">Loading...</span>
                    </button>
                </form>
                <div id="register-email-error" class="form-error"></div>
                <div id="register-password-error" class="form-error"></div>
                <div id="register-confirm-password-error" class="form-error"></div>
            </div>
            
            <button id="login-btn">Login</button>
            <button id="register-btn">Register</button>
            <button id="logout-btn">Logout</button>
            <button id="dashboard-btn">Dashboard</button>
        `;
    }
}

// Test Suite
class AuthenticationTests {
    constructor() {
        this.results = [];
        this.mockApiClient = null;
        this.mockNotificationManager = null;
        this.mockAppConfig = null;
        this.authManager = null;
        this.authUI = null;
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

        // Setup DOM
        TestUtils.setupDOM();

        // Clear any existing timers
        if (this.authManager && this.authManager.refreshTimer) {
            clearTimeout(this.authManager.refreshTimer);
        }
    }

    tearDown() {
        // Restore localStorage
        if (this.originalLocalStorage) {
            Object.defineProperty(window, 'localStorage', {
                value: this.originalLocalStorage,
                writable: true
            });
        }

        // Clear timers
        if (this.authManager && this.authManager.refreshTimer) {
            clearTimeout(this.authManager.refreshTimer);
        }

        // Clear DOM
        document.body.innerHTML = '';
    }

    createAuthManager() {
        const AuthManagerClass = window.AuthManager || global.window.AuthManager;
        return new AuthManagerClass(this.mockApiClient, this.mockAppConfig, this.mockNotificationManager);
    }

    createAuthUI() {
        const AuthUIClass = window.AuthUI || global.window.AuthUI;
        return new AuthUIClass(this.authManager, this.mockNotificationManager);
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

    // AuthManager Tests
    async testAuthManagerInitialization() {
        this.authManager = this.createAuthManager();
        
        this.assertFalse(this.authManager.isAuthenticated, 'Should not be authenticated initially');
        this.assertEquals(this.authManager.user, null, 'User should be null initially');
        this.assertEquals(this.authManager.token, null, 'Token should be null initially');
    }

    async testAuthManagerInitializationWithStoredToken() {
        const validToken = TestUtils.createValidJWT();
        const userData = { id: 1, email: 'test@example.com', plan: 'free' };
        
        localStorage.setItem('oriel_jwt_token', validToken);
        localStorage.setItem('oriel_user_data', JSON.stringify(userData));
        
        this.authManager = this.createAuthManager();
        
        this.assertTrue(this.authManager.isAuthenticated, 'Should be authenticated with valid stored token');
        this.assertEquals(this.authManager.token, validToken, 'Should load token from storage');
        this.assertEquals(this.authManager.user.email, userData.email, 'Should load user data from storage');
    }

    async testAuthManagerInitializationWithExpiredToken() {
        const expiredToken = TestUtils.createExpiredJWT();
        const userData = { id: 1, email: 'test@example.com', plan: 'free' };
        
        localStorage.setItem('oriel_jwt_token', expiredToken);
        localStorage.setItem('oriel_user_data', JSON.stringify(userData));
        
        this.authManager = this.createAuthManager();
        
        this.assertFalse(this.authManager.isAuthenticated, 'Should not be authenticated with expired token');
        this.assertEquals(this.authManager.token, null, 'Should clear expired token');
        this.assertEquals(localStorage.getItem('oriel_jwt_token'), null, 'Should remove expired token from storage');
    }

    async testSuccessfulLogin() {
        this.authManager = this.createAuthManager();
        
        const mockResponse = {
            ok: true,
            data: {
                token: TestUtils.createValidJWT(),
                user: { id: 1, email: 'test@example.com', plan: 'free' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/login', mockResponse);
        
        const result = await this.authManager.login('test@example.com', 'password123');
        
        this.assertTrue(result.success, 'Login should succeed');
        this.assertTrue(this.authManager.isAuthenticated, 'Should be authenticated after login');
        this.assertEquals(this.authManager.user.email, 'test@example.com', 'Should set user data');
        this.assertNotEquals(this.authManager.token, null, 'Should set JWT token');
        
        // Check localStorage persistence
        this.assertNotEquals(localStorage.getItem('oriel_jwt_token'), null, 'Should persist token to localStorage');
        this.assertNotEquals(localStorage.getItem('oriel_user_data'), null, 'Should persist user data to localStorage');
        
        // Check API client token
        this.assertEquals(this.mockApiClient.token, this.authManager.token, 'Should set token in API client');
        
        // Check notification
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'success'), 'Should show success notification');
    }

    async testFailedLogin() {
        this.authManager = this.createAuthManager();
        
        const mockResponse = {
            shouldThrow: true,
            status: 401,
            error: 'Invalid credentials',
            data: { message: 'Invalid email or password' }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/login', mockResponse);
        
        const result = await this.authManager.login('test@example.com', 'wrongpassword');
        
        this.assertFalse(result.success, 'Login should fail');
        this.assertFalse(this.authManager.isAuthenticated, 'Should not be authenticated after failed login');
        this.assertEquals(this.authManager.user, null, 'User should remain null');
        this.assertEquals(this.authManager.token, null, 'Token should remain null');
        
        // Check notification
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'error'), 'Should show error notification');
    }

    async testSuccessfulRegistration() {
        this.authManager = this.createAuthManager();
        
        const mockResponse = {
            ok: true,
            data: {
                token: TestUtils.createValidJWT(),
                user: { id: 1, email: 'newuser@example.com', plan: 'free' },
                message: 'Registration successful!'
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/register', mockResponse);
        
        const result = await this.authManager.register('newuser@example.com', 'password123');
        
        this.assertTrue(result.success, 'Registration should succeed');
        this.assertTrue(this.authManager.isAuthenticated, 'Should be authenticated after registration');
        this.assertEquals(this.authManager.user.email, 'newuser@example.com', 'Should set user data');
        
        // Check notification
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'success'), 'Should show success notification');
    }

    async testRegistrationWithEmailVerification() {
        this.authManager = this.createAuthManager();
        
        const mockResponse = {
            ok: true,
            data: {
                message: 'Please check your email to verify your account',
                // No token - requires verification
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/register', mockResponse);
        
        const result = await this.authManager.register('newuser@example.com', 'password123');
        
        this.assertTrue(result.success, 'Registration should succeed');
        this.assertTrue(result.requiresVerification, 'Should indicate verification required');
        this.assertFalse(this.authManager.isAuthenticated, 'Should not be authenticated without verification');
    }

    async testLogout() {
        this.authManager = this.createAuthManager();
        
        // Set up authenticated state
        this.authManager.token = TestUtils.createValidJWT();
        this.authManager.user = { id: 1, email: 'test@example.com' };
        this.authManager.isAuthenticated = true;
        localStorage.setItem('oriel_jwt_token', this.authManager.token);
        localStorage.setItem('oriel_user_data', JSON.stringify(this.authManager.user));
        
        const result = await this.authManager.logout();
        
        this.assertTrue(result.success, 'Logout should succeed');
        this.assertFalse(this.authManager.isAuthenticated, 'Should not be authenticated after logout');
        this.assertEquals(this.authManager.user, null, 'User should be null after logout');
        this.assertEquals(this.authManager.token, null, 'Token should be null after logout');
        
        // Check localStorage cleared
        this.assertEquals(localStorage.getItem('oriel_jwt_token'), null, 'Should clear token from localStorage');
        this.assertEquals(localStorage.getItem('oriel_user_data'), null, 'Should clear user data from localStorage');
        
        // Check API client token cleared
        this.assertEquals(this.mockApiClient.token, null, 'Should clear token from API client');
    }

    async testTokenRefresh() {
        this.authManager = this.createAuthManager();
        
        const oldToken = TestUtils.createValidJWT();
        const newToken = TestUtils.createValidJWT(7200); // 2 hours
        
        this.authManager.token = oldToken;
        this.authManager.isAuthenticated = true;
        
        const mockResponse = {
            ok: true,
            data: {
                token: newToken,
                user: { id: 1, email: 'test@example.com', plan: 'free' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/refresh', mockResponse);
        
        const result = await this.authManager.refreshToken();
        
        this.assertTrue(result.success, 'Token refresh should succeed');
        this.assertEquals(this.authManager.token, newToken, 'Should update to new token');
        this.assertEquals(localStorage.getItem('oriel_jwt_token'), newToken, 'Should persist new token');
    }

    async testTokenRefreshFailure() {
        this.authManager = this.createAuthManager();
        
        this.authManager.token = TestUtils.createValidJWT();
        this.authManager.isAuthenticated = true;
        this.authManager.user = { id: 1, email: 'test@example.com' };
        
        const mockResponse = {
            shouldThrow: true,
            status: 401,
            error: 'Token refresh failed'
        };
        
        this.mockApiClient.setMockResponse('/api/auth/refresh', mockResponse);
        
        const result = await this.authManager.refreshToken();
        
        this.assertFalse(result.success, 'Token refresh should fail');
        this.assertFalse(this.authManager.isAuthenticated, 'Should logout user on refresh failure');
        this.assertEquals(this.authManager.token, null, 'Should clear token on refresh failure');
    }

    async testTokenValidation() {
        this.authManager = this.createAuthManager();
        
        const validToken = TestUtils.createValidJWT();
        const expiredToken = TestUtils.createExpiredJWT();
        const invalidToken = 'invalid.token.format';
        
        this.assertTrue(this.authManager.isTokenValid(validToken), 'Should validate valid token');
        this.assertFalse(this.authManager.isTokenValid(expiredToken), 'Should reject expired token');
        this.assertFalse(this.authManager.isTokenValid(invalidToken), 'Should reject invalid token format');
        this.assertFalse(this.authManager.isTokenValid(null), 'Should reject null token');
        this.assertFalse(this.authManager.isTokenValid(''), 'Should reject empty token');
    }

    async testStateChangeListeners() {
        this.authManager = this.createAuthManager();
        
        let stateChangeCount = 0;
        let lastState = null;
        
        const unsubscribe = this.authManager.onStateChange((state) => {
            stateChangeCount++;
            lastState = state;
        });
        
        // Trigger state change by logging in
        const mockResponse = {
            ok: true,
            data: {
                token: TestUtils.createValidJWT(),
                user: { id: 1, email: 'test@example.com', plan: 'free' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/login', mockResponse);
        await this.authManager.login('test@example.com', 'password123');
        
        this.assertTrue(stateChangeCount > 0, 'Should trigger state change listener');
        this.assertTrue(lastState.isAuthenticated, 'Should pass authenticated state to listener');
        this.assertEquals(lastState.user.email, 'test@example.com', 'Should pass user data to listener');
        
        // Test unsubscribe
        unsubscribe();
        const previousCount = stateChangeCount;
        
        await this.authManager.logout();
        this.assertEquals(stateChangeCount, previousCount, 'Should not trigger listener after unsubscribe');
    }

    async testUserPermissions() {
        this.authManager = this.createAuthManager();
        
        // Test unauthenticated user
        this.assertFalse(this.authManager.hasPermission('basic'), 'Unauthenticated user should have no permissions');
        
        // Set up authenticated user with free plan
        this.authManager.user = { id: 1, email: 'test@example.com', plan: 'free' };
        this.authManager.isAuthenticated = true;
        
        this.assertTrue(this.authManager.hasPermission('basic'), 'Free user should have basic permission');
        this.assertFalse(this.authManager.hasPermission('premium'), 'Free user should not have premium permission');
        
        // Test pro user
        this.authManager.user.plan = 'pro';
        this.assertTrue(this.authManager.hasPermission('premium'), 'Pro user should have premium permission');
    }

    async testPasswordReset() {
        this.authManager = this.createAuthManager();
        
        const mockResponse = {
            ok: true,
            data: { message: 'Password reset email sent' }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/reset-password', mockResponse);
        
        const result = await this.authManager.requestPasswordReset('test@example.com');
        
        this.assertTrue(result.success, 'Password reset request should succeed');
        
        const notifications = this.mockNotificationManager.getNotifications();
        this.assertTrue(notifications.some(n => n.type === 'success'), 'Should show success notification');
    }

    async testEmailVerification() {
        this.authManager = this.createAuthManager();
        
        this.authManager.user = { id: 1, email: 'test@example.com', emailVerified: false };
        this.authManager.isAuthenticated = true;
        
        const mockResponse = {
            ok: true,
            data: {
                user: { id: 1, email: 'test@example.com', emailVerified: true }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/verify-email', mockResponse);
        
        const result = await this.authManager.verifyEmail('verification-token');
        
        this.assertTrue(result.success, 'Email verification should succeed');
        this.assertTrue(this.authManager.user.emailVerified, 'Should update user verification status');
    }

    async testProfileUpdate() {
        this.authManager = this.createAuthManager();
        
        this.authManager.user = { id: 1, email: 'test@example.com', name: 'Old Name' };
        this.authManager.isAuthenticated = true;
        
        const mockResponse = {
            ok: true,
            data: {
                user: { id: 1, email: 'test@example.com', name: 'New Name' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/user/profile', mockResponse);
        
        const result = await this.authManager.updateProfile({ name: 'New Name' });
        
        this.assertTrue(result.success, 'Profile update should succeed');
        this.assertEquals(this.authManager.user.name, 'New Name', 'Should update user data');
        
        const storedUser = JSON.parse(localStorage.getItem('oriel_user_data'));
        this.assertEquals(storedUser.name, 'New Name', 'Should persist updated user data');
    }

    // AuthUI Tests
    async testAuthUIInitialization() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Check that UI elements are found
        this.assertNotEquals(this.authUI.loginModal, null, 'Should find login modal');
        this.assertNotEquals(this.authUI.registerModal, null, 'Should find register modal');
        this.assertNotEquals(this.authUI.loginForm, null, 'Should find login form');
        this.assertNotEquals(this.authUI.registerForm, null, 'Should find register form');
    }

    async testShowHideLoginModal() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Test show modal
        this.authUI.showLoginModal();
        this.assertFalse(this.authUI.loginModal.classList.contains('modal-hidden'), 'Login modal should be visible');
        
        // Test hide modal
        this.authUI.hideLoginModal();
        this.assertTrue(this.authUI.loginModal.classList.contains('modal-hidden'), 'Login modal should be hidden');
    }

    async testShowHideRegisterModal() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Test show modal
        this.authUI.showRegisterModal();
        this.assertFalse(this.authUI.registerModal.classList.contains('modal-hidden'), 'Register modal should be visible');
        
        // Test hide modal
        this.authUI.hideRegisterModal();
        this.assertTrue(this.authUI.registerModal.classList.contains('modal-hidden'), 'Register modal should be hidden');
    }

    async testFormValidation() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Test email validation
        document.getElementById('login-email').value = 'invalid-email';
        this.assertFalse(this.authUI.validateField('login', 'email'), 'Should reject invalid email');
        
        document.getElementById('login-email').value = 'valid@example.com';
        this.assertTrue(this.authUI.validateField('login', 'email'), 'Should accept valid email');
        
        // Test password validation
        document.getElementById('login-password').value = '123';
        this.assertFalse(this.authUI.validateField('login', 'password'), 'Should reject short password');
        
        document.getElementById('login-password').value = 'validpassword';
        this.assertTrue(this.authUI.validateField('login', 'password'), 'Should accept valid password');
        
        // Test password confirmation
        document.getElementById('register-password').value = 'password123';
        document.getElementById('register-confirm-password').value = 'different';
        this.assertFalse(this.authUI.validateField('register', 'confirmPassword'), 'Should reject mismatched passwords');
        
        document.getElementById('register-confirm-password').value = 'password123';
        this.assertTrue(this.authUI.validateField('register', 'confirmPassword'), 'Should accept matching passwords');
    }

    async testLoginFormSubmission() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        const mockResponse = {
            ok: true,
            data: {
                token: TestUtils.createValidJWT(),
                user: { id: 1, email: 'test@example.com', plan: 'free' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/login', mockResponse);
        
        // Fill form
        document.getElementById('login-email').value = 'test@example.com';
        document.getElementById('login-password').value = 'password123';
        
        // Create and dispatch form submit event
        const form = document.getElementById('login-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        
        // Handle form submission
        await this.authUI.handleLoginSubmit(submitEvent);
        
        this.assertTrue(this.authManager.isAuthenticated, 'Should be authenticated after successful login');
        this.assertTrue(this.authUI.loginModal.classList.contains('modal-hidden'), 'Should hide login modal after success');
    }

    async testRegisterFormSubmission() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        const mockResponse = {
            ok: true,
            data: {
                token: TestUtils.createValidJWT(),
                user: { id: 1, email: 'newuser@example.com', plan: 'free' }
            }
        };
        
        this.mockApiClient.setMockResponse('/api/auth/register', mockResponse);
        
        // Fill form
        document.getElementById('register-email').value = 'newuser@example.com';
        document.getElementById('register-password').value = 'password123';
        document.getElementById('register-confirm-password').value = 'password123';
        
        // Create and dispatch form submit event
        const form = document.getElementById('register-form');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        
        // Handle form submission
        await this.authUI.handleRegisterSubmit(submitEvent);
        
        this.assertTrue(this.authManager.isAuthenticated, 'Should be authenticated after successful registration');
        this.assertTrue(this.authUI.registerModal.classList.contains('modal-hidden'), 'Should hide register modal after success');
    }

    async testUIStateUpdates() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Test anonymous state
        this.authUI.updateUI({ isAuthenticated: false, user: null });
        
        this.assertFalse(document.getElementById('anonymous-status').classList.contains('hidden'), 'Should show anonymous status');
        this.assertTrue(document.getElementById('authenticated-status').classList.contains('hidden'), 'Should hide authenticated status');
        
        // Test authenticated state
        const authState = {
            isAuthenticated: true,
            user: { email: 'test@example.com', credits: 25 }
        };
        
        this.authUI.updateUI(authState);
        
        this.assertTrue(document.getElementById('anonymous-status').classList.contains('hidden'), 'Should hide anonymous status');
        this.assertFalse(document.getElementById('authenticated-status').classList.contains('hidden'), 'Should show authenticated status');
        this.assertEquals(document.getElementById('user-email').textContent, 'test@example.com', 'Should display user email');
    }

    async testFormLoadingStates() {
        this.authManager = this.createAuthManager();
        this.authUI = this.createAuthUI();
        
        // Test login form loading
        this.authUI.setFormLoading('login', true);
        
        const loginBtn = document.getElementById('login-submit-btn');
        this.assertTrue(loginBtn.disabled, 'Submit button should be disabled during loading');
        
        this.authUI.setFormLoading('login', false);
        this.assertFalse(loginBtn.disabled, 'Submit button should be enabled after loading');
    }

    // API Client Tests
    async testApiClientTokenHandling() {
        const apiClient = new MockApiClient();
        const token = TestUtils.createValidJWT();
        
        apiClient.saveToken(token);
        this.assertEquals(apiClient.token, token, 'Should save token');
        this.assertEquals(localStorage.getItem('oriel_jwt_token'), token, 'Should persist token to localStorage');
        
        apiClient.saveToken(null);
        this.assertEquals(apiClient.token, null, 'Should clear token');
        this.assertEquals(localStorage.getItem('oriel_jwt_token'), null, 'Should remove token from localStorage');
    }

    async testApiClientRequestHistory() {
        const apiClient = new MockApiClient();
        
        await apiClient.post('/api/test', { data: 'test' });
        
        const history = apiClient.getRequestHistory();
        this.assertEquals(history.length, 1, 'Should record request in history');
        this.assertEquals(history[0].method, 'POST', 'Should record correct method');
        this.assertEquals(history[0].endpoint, '/api/test', 'Should record correct endpoint');
        this.assertEquals(history[0].data.data, 'test', 'Should record correct data');
    }

    // Run all tests
    async runAllTests() {
        console.log('Starting Authentication Unit Tests...\n');
        
        const tests = [
            // AuthManager Tests
            ['AuthManager Initialization', this.testAuthManagerInitialization],
            ['AuthManager Initialization with Stored Token', this.testAuthManagerInitializationWithStoredToken],
            ['AuthManager Initialization with Expired Token', this.testAuthManagerInitializationWithExpiredToken],
            ['Successful Login', this.testSuccessfulLogin],
            ['Failed Login', this.testFailedLogin],
            ['Successful Registration', this.testSuccessfulRegistration],
            ['Registration with Email Verification', this.testRegistrationWithEmailVerification],
            ['Logout', this.testLogout],
            ['Token Refresh', this.testTokenRefresh],
            ['Token Refresh Failure', this.testTokenRefreshFailure],
            ['Token Validation', this.testTokenValidation],
            ['State Change Listeners', this.testStateChangeListeners],
            ['User Permissions', this.testUserPermissions],
            ['Password Reset', this.testPasswordReset],
            ['Email Verification', this.testEmailVerification],
            ['Profile Update', this.testProfileUpdate],
            
            // AuthUI Tests
            ['AuthUI Initialization', this.testAuthUIInitialization],
            ['Show/Hide Login Modal', this.testShowHideLoginModal],
            ['Show/Hide Register Modal', this.testShowHideRegisterModal],
            ['Form Validation', this.testFormValidation],
            ['Login Form Submission', this.testLoginFormSubmission],
            ['Register Form Submission', this.testRegisterFormSubmission],
            ['UI State Updates', this.testUIStateUpdates],
            ['Form Loading States', this.testFormLoadingStates],
            
            // API Client Tests
            ['API Client Token Handling', this.testApiClientTokenHandling],
            ['API Client Request History', this.testApiClientRequestHistory]
        ];
        
        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }
        
        this.printResults();
    }

    printResults() {
        console.log('\n=== Authentication Unit Test Results ===\n');
        
        let passed = 0;
        let failed = 0;
        let errors = 0;
        
        this.results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : 
                          result.status === 'FAIL' ? '❌' : '💥';
            console.log(`${status} ${result.test}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            if (result.status === 'PASS') passed++;
            else if (result.status === 'FAIL') failed++;
            else errors++;
        });
        
        console.log(`\n=== Summary ===`);
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Errors: ${errors}`);
        console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        
        return { passed, failed, errors, total: this.results.length };
    }
}

// Export for use
window.AuthenticationTests = AuthenticationTests;

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
    // Only run automatically if we're in a browser environment
    document.addEventListener('DOMContentLoaded', async () => {
        if (window.AuthManager && window.AuthUI) {
            const testSuite = new AuthenticationTests();
            await testSuite.runAllTests();
        }
    });
}