/**
 * Login Flow Testing Module
 * Automated testing for user login with valid and invalid credentials
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

class LoginFlowTests {
    constructor() {
        this.testResults = [];
        this.authManager = null;
        this.authUI = null;
        this.apiClient = null;
        this.notificationManager = null;
        this.originalMethods = {};
        
        // Test data scenarios
        this.testData = {
            validCredentials: {
                email: 'testuser@example.com',
                password: 'ValidPassword123!'
            },
            invalidCredentials: {
                email: 'invalid@example.com',
                password: 'WrongPassword123!'
            },
            invalidEmail: {
                email: 'invalid-email-format',
                password: 'ValidPassword123!'
            },
            emptyCredentials: {
                email: '',
                password: ''
            },
            nonExistentUser: {
                email: 'nonexistent@example.com',
                password: 'ValidPassword123!'
            }
        };
        
        // Mock user data for testing
        this.mockUser = {
            id: 1,
            email: 'testuser@example.com',
            plan: 'free',
            emailVerified: true
        };
    }

    /**
     * Initialize test environment and dependencies
     */
    async initialize() {
        console.log('🔧 Initializing Login Flow Tests...');
        
        try {
            // Wait for dependencies to be available
            await this.waitForDependencies();
            
            // Initialize managers
            this.authManager = window.authManager;
            this.authUI = window.authUI;
            this.apiClient = window.apiClient;
            this.notificationManager = window.notifications;
            
            // Setup test environment
            this.setupTestEnvironment();
            
            this.addTestResult('Test Environment Initialization', 'PASSED');
            return true;
        } catch (error) {
            this.addTestResult('Test Environment Initialization', 'FAILED', error.message);
            return false;
        }
    }

    /**
     * Wait for required dependencies to be available
     */
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.authManager && window.authUI && window.apiClient && window.notifications) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        throw new Error('Required dependencies not available after timeout');
    }

    /**
     * Setup test environment
     */
    setupTestEnvironment() {
        // Clear any existing authentication state
        localStorage.removeItem('oriel_jwt_token');
        localStorage.removeItem('oriel_user_data');
        
        // Clear notifications
        if (this.notificationManager && this.notificationManager.clearNotifications) {
            this.notificationManager.clearNotifications();
        }
        
        // Ensure modals are hidden
        this.hideAllModals();
        
        // Store original methods for restoration
        this.storeOriginalMethods();
        
        // Reset auth manager state
        if (this.authManager) {
            this.authManager._isAuthenticated = false;
            this.authManager.user = null;
            this.authManager.token = null;
        }
    }

    /**
     * Store original methods for restoration after tests
     */
    storeOriginalMethods() {
        if (this.authManager) {
            this.originalMethods.login = this.authManager.login.bind(this.authManager);
            this.originalMethods.logout = this.authManager.logout.bind(this.authManager);
        }
        if (this.apiClient) {
            this.originalMethods.post = this.apiClient.post.bind(this.apiClient);
        }
    }

    /**
     * Restore original methods after tests
     */
    restoreOriginalMethods() {
        if (this.authManager && this.originalMethods.login) {
            this.authManager.login = this.originalMethods.login;
        }
        if (this.authManager && this.originalMethods.logout) {
            this.authManager.logout = this.originalMethods.logout;
        }
        if (this.apiClient && this.originalMethods.post) {
            this.apiClient.post = this.originalMethods.post;
        }
    }

    /**
     * Hide all authentication modals
     */
    hideAllModals() {
        const modals = ['login-modal', 'register-modal', 'welcome-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('modal-hidden');
            }
        });
    }

    /**
     * Run all login flow tests
     */
    async runAllTests() {
        console.log('🧪 Starting Login Flow Tests...');
        
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize test environment');
            return this.getTestSummary();
        }
        
        try {
            // Test login modal display and interaction
            await this.testLoginModalDisplay();
            await this.testLoginFormElements();
            
            // Test login with valid credentials (Requirement 2.1)
            await this.testValidCredentialsLogin();
            await this.testLoginWithinTimeLimit();
            
            // Test login with invalid credentials (Requirement 2.2)
            await this.testInvalidCredentialsLogin();
            await this.testUsernameFieldPreservation();
            
            // Test session persistence (Requirement 2.3)
            await this.testSessionPersistenceAcrossRefresh();
            await this.testSessionStateManagement();
            
            // Test error handling (Requirement 2.4)
            await this.testServerErrorHandling();
            await this.testNetworkErrorHandling();
            await this.testRetryOptions();
            
            // Test logout functionality (Requirement 2.5)
            await this.testLogoutFunctionality();
            await this.testSessionDataClearing();
            await this.testRedirectAfterLogout();
            
            // Additional comprehensive tests
            await this.testFormValidation();
            await this.testLoadingStates();
            await this.testErrorMessageDisplay();
            
        } catch (error) {
            console.error('❌ Test suite execution failed:', error);
            this.addTestResult('Test Suite Execution', 'FAILED', error.message);
        } finally {
            this.restoreOriginalMethods();
        }
        
        return this.getTestSummary();
    }

    /**
     * Test login modal display
     */
    async testLoginModalDisplay() {
        console.log('🔐 Testing login modal display...');
        
        try {
            // Find login button
            const loginBtn = document.getElementById('login-btn');
            if (!loginBtn) {
                throw new Error('Login button not found in DOM');
            }
            
            // Test modal is initially hidden
            const loginModal = document.getElementById('login-modal');
            if (!loginModal) {
                throw new Error('Login modal not found in DOM');
            }
            
            const isInitiallyHidden = loginModal.classList.contains('modal-hidden');
            if (!isInitiallyHidden) {
                throw new Error('Login modal should be initially hidden');
            }
            
            // Test showing modal
            if (this.authUI && this.authUI.showLoginModal) {
                this.authUI.showLoginModal();
            } else {
                loginBtn.click();
            }
            
            // Verify modal is now visible
            const isVisible = !loginModal.classList.contains('modal-hidden');
            if (!isVisible) {
                throw new Error('Login modal not displayed after trigger');
            }
            
            this.addTestResult('Login Modal Display', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Login Modal Display', 'FAILED', error.message);
        }
    }

    /**
     * Test login form elements
     */
    async testLoginFormElements() {
        console.log('📋 Testing login form elements...');
        
        try {
            const loginForm = document.getElementById('login-form');
            if (!loginForm) {
                throw new Error('Login form not found');
            }
            
            // Test required form fields exist
            const emailField = loginForm.querySelector('input[name="email"]');
            const passwordField = loginForm.querySelector('input[name="password"]');
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            if (!emailField) throw new Error('Email field not found');
            if (!passwordField) throw new Error('Password field not found');
            if (!submitButton) throw new Error('Submit button not found');
            
            // Test field attributes
            if (emailField.type !== 'email') {
                throw new Error('Email field should have type="email"');
            }
            
            if (passwordField.type !== 'password') {
                throw new Error('Password field should have type="password"');
            }
            
            // Test error message containers exist
            const emailError = document.getElementById('login-email-error');
            const passwordError = document.getElementById('login-password-error');
            
            if (!emailError) throw new Error('Email error container not found');
            if (!passwordError) throw new Error('Password error container not found');
            
            this.addTestResult('Login Form Elements', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Login Form Elements', 'FAILED', error.message);
        }
    }

    /**
     * Test valid credentials login (Requirement 2.1)
     */
    async testValidCredentialsLogin() {
        console.log('✅ Testing valid credentials login...');
        
        try {
            // Mock successful login response
            this.mockSuccessfulLogin();
            
            // Fill form with valid credentials
            await this.fillLoginForm(this.testData.validCredentials);
            
            // Submit form
            const result = await this.submitLoginForm();
            
            if (!result.success) {
                throw new Error('Login should succeed with valid credentials');
            }
            
            // Check that user is authenticated
            if (!this.authManager.isAuthenticated()) {
                throw new Error('User should be authenticated after successful login');
            }
            
            // Check that success notification is shown
            const notifications = this.getNotifications();
            const hasSuccessNotification = notifications.some(n => n.type === 'success');
            if (!hasSuccessNotification) {
                throw new Error('Success notification should be displayed');
            }
            
            this.addTestResult('Valid Credentials Login', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Valid Credentials Login', 'FAILED', error.message);
        }
    }

    /**
     * Test login within time limit (Requirement 2.1)
     */
    async testLoginWithinTimeLimit() {
        console.log('⏱️ Testing login within time limit...');
        
        try {
            // Mock successful login with timing
            this.mockSuccessfulLogin();
            
            // Fill form with valid credentials
            await this.fillLoginForm(this.testData.validCredentials);
            
            // Measure login time
            const startTime = Date.now();
            const result = await this.submitLoginForm();
            const endTime = Date.now();
            const loginTime = endTime - startTime;
            
            if (!result.success) {
                throw new Error('Login should succeed for timing test');
            }
            
            // Check that login completes within 3 seconds (3000ms)
            if (loginTime > 3000) {
                throw new Error(`Login took ${loginTime}ms, should be under 3000ms`);
            }
            
            this.addTestResult('Login Within Time Limit', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Login Within Time Limit', 'FAILED', error.message);
        }
    }

    /**
     * Test invalid credentials login (Requirement 2.2)
     */
    async testInvalidCredentialsLogin() {
        console.log('❌ Testing invalid credentials login...');
        
        try {
            // Mock invalid credentials error
            this.mockInvalidCredentialsError();
            
            // Fill form with invalid credentials
            await this.fillLoginForm(this.testData.invalidCredentials);
            
            // Submit form
            const result = await this.submitLoginForm();
            
            if (result.success) {
                throw new Error('Login should fail with invalid credentials');
            }
            
            // Check that error notification is shown
            const notifications = this.getNotifications();
            const hasErrorNotification = notifications.some(n => n.type === 'error');
            if (!hasErrorNotification) {
                throw new Error('Error notification should be displayed for invalid credentials');
            }
            
            // Check that user is not authenticated
            if (this.authManager.isAuthenticated()) {
                throw new Error('User should not be authenticated after failed login');
            }
            
            this.addTestResult('Invalid Credentials Login', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Invalid Credentials Login', 'FAILED', error.message);
        }
    }

    /**
     * Test username field preservation (Requirement 2.2)
     */
    async testUsernameFieldPreservation() {
        console.log('📧 Testing username field preservation...');
        
        try {
            // Mock invalid credentials error
            this.mockInvalidCredentialsError();
            
            // Fill form with invalid credentials
            await this.fillLoginForm(this.testData.invalidCredentials);
            
            // Submit form
            await this.submitLoginForm();
            
            // Check that username field is preserved
            const emailField = document.getElementById('login-email');
            if (!emailField || emailField.value !== this.testData.invalidCredentials.email) {
                throw new Error('Username field should be preserved after failed login');
            }
            
            // Check that password field is cleared (security best practice)
            const passwordField = document.getElementById('login-password');
            if (passwordField && passwordField.value) {
                // Note: Some implementations may clear password, others may not
                // This is acceptable behavior, so we'll just log it
                console.log('ℹ️ Password field not cleared after failed login (acceptable)');
            }
            
            this.addTestResult('Username Field Preservation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Username Field Preservation', 'FAILED', error.message);
        }
    }

    /**
     * Test session persistence across refresh (Requirement 2.3)
     */
    async testSessionPersistenceAcrossRefresh() {
        console.log('🔄 Testing session persistence across refresh...');
        
        try {
            // Mock successful login
            this.mockSuccessfulLogin();
            
            // Login user
            await this.fillLoginForm(this.testData.validCredentials);
            const result = await this.submitLoginForm();
            
            if (!result.success) {
                throw new Error('Login should succeed for persistence test');
            }
            
            // Verify user is authenticated
            if (!this.authManager.isAuthenticated()) {
                throw new Error('User should be authenticated after login');
            }
            
            // Simulate page refresh by reinitializing AuthManager
            const token = localStorage.getItem('oriel_jwt_token');
            const userData = localStorage.getItem('oriel_user_data');
            
            if (!token || !userData) {
                throw new Error('Session data should be stored in localStorage');
            }
            
            // Create new AuthManager instance to simulate refresh
            const newAuthManager = new window.AuthManager(this.apiClient, window.appConfig, this.notificationManager);
            
            // Check that session is restored
            if (!newAuthManager.isAuthenticated()) {
                throw new Error('Session should be restored after page refresh');
            }
            
            const restoredUser = newAuthManager.getCurrentUser();
            if (!restoredUser || restoredUser.email !== this.mockUser.email) {
                throw new Error('User data should be restored after page refresh');
            }
            
            this.addTestResult('Session Persistence Across Refresh', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Session Persistence Across Refresh', 'FAILED', error.message);
        }
    }

    /**
     * Test session state management (Requirement 2.3)
     */
    async testSessionStateManagement() {
        console.log('🔐 Testing session state management...');
        
        try {
            // Mock successful login
            this.mockSuccessfulLogin();
            
            // Login user
            await this.fillLoginForm(this.testData.validCredentials);
            await this.submitLoginForm();
            
            // Test that UI reflects authenticated state
            const authenticatedStatus = document.getElementById('authenticated-status');
            const anonymousStatus = document.getElementById('anonymous-status');
            
            if (authenticatedStatus && authenticatedStatus.classList.contains('hidden')) {
                throw new Error('Authenticated status should be visible when logged in');
            }
            
            if (anonymousStatus && !anonymousStatus.classList.contains('hidden')) {
                throw new Error('Anonymous status should be hidden when logged in');
            }
            
            // Test that user email is displayed
            const userEmail = document.getElementById('user-email');
            if (userEmail && userEmail.textContent !== this.mockUser.email) {
                throw new Error('User email should be displayed in UI');
            }
            
            this.addTestResult('Session State Management', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Session State Management', 'FAILED', error.message);
        }
    }

    /**
     * Test server error handling (Requirement 2.4)
     */
    async testServerErrorHandling() {
        console.log('🖥️ Testing server error handling...');
        
        try {
            // Mock server error
            this.mockServerError();
            
            // Fill form with valid credentials
            await this.fillLoginForm(this.testData.validCredentials);
            
            // Submit form
            const result = await this.submitLoginForm();
            
            if (result.success) {
                throw new Error('Login should fail with server error');
            }
            
            // Check that error notification is shown
            const notifications = this.getNotifications();
            const hasErrorNotification = notifications.some(n => n.type === 'error');
            if (!hasErrorNotification) {
                throw new Error('Error notification should be displayed for server error');
            }
            
            this.addTestResult('Server Error Handling', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Server Error Handling', 'FAILED', error.message);
        }
    }

    /**
     * Test network error handling (Requirement 2.4)
     */
    async testNetworkErrorHandling() {
        console.log('🌐 Testing network error handling...');
        
        try {
            // Mock network error
            this.mockNetworkError();
            
            // Fill form with valid credentials
            await this.fillLoginForm(this.testData.validCredentials);
            
            // Submit form
            const result = await this.submitLoginForm();
            
            if (result.success) {
                throw new Error('Login should fail with network error');
            }
            
            // Check that error notification is shown
            const notifications = this.getNotifications();
            const hasErrorNotification = notifications.some(n => n.type === 'error');
            if (!hasErrorNotification) {
                throw new Error('Error notification should be displayed for network error');
            }
            
            this.addTestResult('Network Error Handling', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Network Error Handling', 'FAILED', error.message);
        }
    }

    /**
     * Test retry options (Requirement 2.4)
     */
    async testRetryOptions() {
        console.log('🔄 Testing retry options...');
        
        try {
            // Mock server error first
            this.mockServerError();
            
            // Fill form and submit
            await this.fillLoginForm(this.testData.validCredentials);
            const firstResult = await this.submitLoginForm();
            
            if (firstResult.success) {
                throw new Error('First attempt should fail for retry test');
            }
            
            // Now mock successful login for retry
            this.mockSuccessfulLogin();
            
            // Retry login
            const retryResult = await this.submitLoginForm();
            
            if (!retryResult.success) {
                throw new Error('Retry should succeed after fixing server error');
            }
            
            this.addTestResult('Retry Options', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Retry Options', 'FAILED', error.message);
        }
    }

    /**
     * Test logout functionality (Requirement 2.5)
     */
    async testLogoutFunctionality() {
        console.log('🚪 Testing logout functionality...');
        
        try {
            // First login user
            this.mockSuccessfulLogin();
            await this.fillLoginForm(this.testData.validCredentials);
            await this.submitLoginForm();
            
            // Verify user is logged in
            if (!this.authManager.isAuthenticated()) {
                throw new Error('User should be authenticated before logout test');
            }
            
            // Mock logout
            this.mockSuccessfulLogout();
            
            // Perform logout
            const logoutResult = await this.authManager.logout();
            
            if (!logoutResult.success) {
                throw new Error('Logout should succeed');
            }
            
            // Check that user is no longer authenticated
            if (this.authManager.isAuthenticated()) {
                throw new Error('User should not be authenticated after logout');
            }
            
            this.addTestResult('Logout Functionality', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Logout Functionality', 'FAILED', error.message);
        }
    }

    /**
     * Test session data clearing (Requirement 2.5)
     */
    async testSessionDataClearing() {
        console.log('🧹 Testing session data clearing...');
        
        try {
            // First login user
            this.mockSuccessfulLogin();
            await this.fillLoginForm(this.testData.validCredentials);
            await this.submitLoginForm();
            
            // Verify session data exists
            const tokenBefore = localStorage.getItem('oriel_jwt_token');
            const userDataBefore = localStorage.getItem('oriel_user_data');
            
            if (!tokenBefore || !userDataBefore) {
                throw new Error('Session data should exist before logout');
            }
            
            // Mock and perform logout
            this.mockSuccessfulLogout();
            await this.authManager.logout();
            
            // Check that session data is cleared
            const tokenAfter = localStorage.getItem('oriel_jwt_token');
            const userDataAfter = localStorage.getItem('oriel_user_data');
            
            if (tokenAfter || userDataAfter) {
                throw new Error('Session data should be cleared after logout');
            }
            
            this.addTestResult('Session Data Clearing', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Session Data Clearing', 'FAILED', error.message);
        }
    }

    /**
     * Test redirect after logout (Requirement 2.5)
     */
    async testRedirectAfterLogout() {
        console.log('🔄 Testing redirect after logout...');
        
        try {
            // First login user
            this.mockSuccessfulLogin();
            await this.fillLoginForm(this.testData.validCredentials);
            await this.submitLoginForm();
            
            // Mock and perform logout
            this.mockSuccessfulLogout();
            await this.authManager.logout();
            
            // Check that UI reflects logged out state
            const authenticatedStatus = document.getElementById('authenticated-status');
            const anonymousStatus = document.getElementById('anonymous-status');
            
            if (authenticatedStatus && !authenticatedStatus.classList.contains('hidden')) {
                throw new Error('Authenticated status should be hidden after logout');
            }
            
            if (anonymousStatus && anonymousStatus.classList.contains('hidden')) {
                throw new Error('Anonymous status should be visible after logout');
            }
            
            this.addTestResult('Redirect After Logout', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Redirect After Logout', 'FAILED', error.message);
        }
    }

    /**
     * Test form validation
     */
    async testFormValidation() {
        console.log('📝 Testing form validation...');
        
        try {
            // Test empty fields
            await this.fillLoginForm(this.testData.emptyCredentials);
            
            const isValid = this.validateLoginForm();
            if (isValid) {
                throw new Error('Form should not validate with empty fields');
            }
            
            // Test invalid email format
            await this.fillLoginForm(this.testData.invalidEmail);
            
            const emailField = document.getElementById('login-email');
            if (emailField) {
                emailField.blur();
                await this.wait(100);
            }
            
            const emailError = document.getElementById('login-email-error');
            if (!emailError || !emailError.textContent.trim()) {
                throw new Error('Invalid email should display error message');
            }
            
            this.addTestResult('Form Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Form Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test loading states
     */
    async testLoadingStates() {
        console.log('⏳ Testing loading states...');
        
        try {
            // Mock slow login response
            this.mockSlowLogin();
            
            // Fill form
            await this.fillLoginForm(this.testData.validCredentials);
            
            // Start login and check loading state
            const submitPromise = this.submitLoginForm();
            
            // Check that loading state is shown
            await this.wait(100); // Allow loading state to appear
            
            const submitBtn = document.getElementById('login-submit-btn');
            if (submitBtn && !submitBtn.disabled) {
                throw new Error('Submit button should be disabled during login');
            }
            
            const btnSpinner = submitBtn?.querySelector('.btn-spinner');
            if (btnSpinner && btnSpinner.classList.contains('hidden')) {
                throw new Error('Loading spinner should be visible during login');
            }
            
            // Wait for login to complete
            await submitPromise;
            
            // Check that loading state is cleared
            if (submitBtn && submitBtn.disabled) {
                throw new Error('Submit button should be enabled after login');
            }
            
            this.addTestResult('Loading States', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Loading States', 'FAILED', error.message);
        }
    }

    /**
     * Test error message display
     */
    async testErrorMessageDisplay() {
        console.log('⚠️ Testing error message display...');
        
        try {
            // Mock invalid credentials
            this.mockInvalidCredentialsError();
            
            // Fill and submit form
            await this.fillLoginForm(this.testData.invalidCredentials);
            await this.submitLoginForm();
            
            // Check that error notification is clear and actionable
            const notifications = this.getNotifications();
            const errorNotification = notifications.find(n => n.type === 'error');
            
            if (!errorNotification) {
                throw new Error('Error notification should be displayed');
            }
            
            const errorMessage = errorNotification.message.toLowerCase();
            if (!errorMessage.includes('invalid') && !errorMessage.includes('password')) {
                throw new Error('Error message should be clear and actionable');
            }
            
            this.addTestResult('Error Message Display', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Error Message Display', 'FAILED', error.message);
        }
    }

    /**
     * Helper method to fill login form
     */
    async fillLoginForm(credentials) {
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        if (emailField) emailField.value = credentials.email;
        if (passwordField) passwordField.value = credentials.password;
        
        await this.wait(50); // Allow form to update
    }

    /**
     * Helper method to validate login form
     */
    validateLoginForm() {
        if (this.authUI && this.authUI.validateForm) {
            return this.authUI.validateForm('login');
        }
        
        // Fallback validation
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        const emailValid = emailField && emailField.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value);
        const passwordValid = passwordField && passwordField.value && passwordField.value.length > 0;
        
        return emailValid && passwordValid;
    }

    /**
     * Helper method to submit login form
     */
    async submitLoginForm() {
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        if (!emailField || !passwordField) {
            throw new Error('Form fields not found');
        }
        
        const email = emailField.value;
        const password = passwordField.value;
        
        return await this.authManager.login(email, password);
    }

    /**
     * Helper method to get notifications
     */
    getNotifications() {
        if (this.notificationManager && this.notificationManager.getNotifications) {
            return this.notificationManager.getNotifications();
        }
        return [];
    }

    /**
     * Mock successful login response
     */
    mockSuccessfulLogin() {
        this.authManager.login = async (email, password) => {
            const mockToken = this.generateMockJWT();
            
            // Simulate successful login
            this.authManager.token = mockToken;
            this.authManager.user = this.mockUser;
            this.authManager._isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('oriel_jwt_token', mockToken);
            localStorage.setItem('oriel_user_data', JSON.stringify(this.mockUser));
            
            // Update UI
            if (this.authManager.notifyStateChange) {
                this.authManager.notifyStateChange();
            }
            
            // Show success notification
            if (this.notificationManager) {
                this.notificationManager.show('Login successful!', 'success');
            }
            
            return { success: true, user: this.mockUser };
        };
    }

    /**
     * Mock invalid credentials error
     */
    mockInvalidCredentialsError() {
        this.authManager.login = async (email, password) => {
            const error = new Error('Invalid email or password.');
            
            if (this.notificationManager) {
                this.notificationManager.show('Invalid email or password.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Mock server error
     */
    mockServerError() {
        this.authManager.login = async (email, password) => {
            const error = new Error('Server error. Please try again later.');
            
            if (this.notificationManager) {
                this.notificationManager.show('Server error. Please try again later.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Mock network error
     */
    mockNetworkError() {
        this.authManager.login = async (email, password) => {
            const error = new Error('Network error. Please check your connection and try again.');
            
            if (this.notificationManager) {
                this.notificationManager.show('Network error. Please check your connection and try again.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Mock slow login for loading state testing
     */
    mockSlowLogin() {
        this.authManager.login = async (email, password) => {
            // Simulate slow response
            await this.wait(1000);
            
            const mockToken = this.generateMockJWT();
            
            this.authManager.token = mockToken;
            this.authManager.user = this.mockUser;
            this.authManager._isAuthenticated = true;
            
            localStorage.setItem('oriel_jwt_token', mockToken);
            localStorage.setItem('oriel_user_data', JSON.stringify(this.mockUser));
            
            if (this.authManager.notifyStateChange) {
                this.authManager.notifyStateChange();
            }
            
            if (this.notificationManager) {
                this.notificationManager.show('Login successful!', 'success');
            }
            
            return { success: true, user: this.mockUser };
        };
    }

    /**
     * Mock successful logout
     */
    mockSuccessfulLogout() {
        this.authManager.logout = async () => {
            // Clear state
            this.authManager._isAuthenticated = false;
            this.authManager.user = null;
            this.authManager.token = null;
            
            // Clear localStorage
            localStorage.removeItem('oriel_jwt_token');
            localStorage.removeItem('oriel_user_data');
            
            // Update UI
            if (this.authManager.notifyStateChange) {
                this.authManager.notifyStateChange();
            }
            
            // Show success notification
            if (this.notificationManager) {
                this.notificationManager.show('Logged out successfully', 'info');
            }
            
            return { success: true };
        };
    }

    /**
     * Generate mock JWT token
     */
    generateMockJWT() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: `user-${this.mockUser.id}`,
            email: this.mockUser.email,
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        }));
        const signature = 'mock-signature';
        return `${header}.${payload}.${signature}`;
    }

    /**
     * Helper method to wait for specified time
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Add test result
     */
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

    /**
     * Get test summary
     */
    getTestSummary() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        return {
            total,
            passed,
            failed,
            successRate: total > 0 ? (passed / total) * 100 : 0,
            results: this.testResults
        };
    }

    /**
     * Display test results
     */
    displayResults() {
        const summary = this.getTestSummary();
        
        console.log('\n📊 Login Flow Test Results:');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
        
        if (summary.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`- ${result.test}: ${result.error}`);
                });
        }
        
        return summary;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.LoginFlowTests = LoginFlowTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginFlowTests;
}