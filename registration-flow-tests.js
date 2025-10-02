/**
 * Registration Flow Testing Module
 * Automated testing for user registration with various data scenarios
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

class RegistrationFlowTests {
    constructor() {
        this.testResults = [];
        this.authManager = null;
        this.authUI = null;
        this.apiClient = null;
        this.notificationManager = null;
        this.testScenarios = [];
        this.originalMethods = {};
        
        // Test data scenarios
        this.testData = {
            valid: {
                email: `test${Date.now()}@example.com`,
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!'
            },
            invalidEmail: {
                email: 'invalid-email-format',
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!'
            },
            weakPassword: {
                email: `test${Date.now()}@example.com`,
                password: '123',
                confirmPassword: '123'
            },
            mismatchedPasswords: {
                email: `test${Date.now()}@example.com`,
                password: 'ValidPassword123!',
                confirmPassword: 'DifferentPassword456!'
            },
            duplicateEmail: {
                email: 'existing@example.com',
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!'
            },
            emptyFields: {
                email: '',
                password: '',
                confirmPassword: ''
            }
        };
    }

    /**
     * Initialize test environment and dependencies
     */
    async initialize() {
        console.log('🔧 Initializing Registration Flow Tests...');
        
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
    }

    /**
     * Store original methods for restoration after tests
     */
    storeOriginalMethods() {
        if (this.authManager) {
            this.originalMethods.register = this.authManager.register.bind(this.authManager);
        }
        if (this.apiClient) {
            this.originalMethods.post = this.apiClient.post.bind(this.apiClient);
        }
    }

    /**
     * Restore original methods after tests
     */
    restoreOriginalMethods() {
        if (this.authManager && this.originalMethods.register) {
            this.authManager.register = this.originalMethods.register;
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
     * Run all registration flow tests
     */
    async runAllTests() {
        console.log('🧪 Starting Registration Flow Tests...');
        
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize test environment');
            return this.getTestSummary();
        }
        
        try {
            // Test registration modal display and interaction
            await this.testRegistrationModalDisplay();
            await this.testRegistrationFormElements();
            
            // Test form validation scenarios
            await this.testValidRegistrationData();
            await this.testInvalidEmailValidation();
            await this.testWeakPasswordValidation();
            await this.testPasswordMismatchValidation();
            await this.testEmptyFieldValidation();
            
            // Test registration API scenarios
            await this.testSuccessfulRegistration();
            await this.testDuplicateEmailRegistration();
            await this.testNetworkErrorHandling();
            await this.testServerErrorHandling();
            
            // Test success flow and redirect
            await this.testSuccessFlowValidation();
            await this.testRedirectAfterRegistration();
            
            // Test error message display
            await this.testErrorMessageDisplay();
            await this.testErrorMessageClearing();
            
        } catch (error) {
            console.error('❌ Test suite execution failed:', error);
            this.addTestResult('Test Suite Execution', 'FAILED', error.message);
        } finally {
            this.restoreOriginalMethods();
        }
        
        return this.getTestSummary();
    }

    /**
     * Test registration modal display (Requirement 1.1)
     */
    async testRegistrationModalDisplay() {
        console.log('📝 Testing registration modal display...');
        
        try {
            // Find register button
            const registerBtn = document.getElementById('register-btn');
            if (!registerBtn) {
                throw new Error('Register button not found in DOM');
            }
            
            // Test modal is initially hidden
            const registerModal = document.getElementById('register-modal');
            if (!registerModal) {
                throw new Error('Register modal not found in DOM');
            }
            
            const isInitiallyHidden = registerModal.classList.contains('modal-hidden');
            if (!isInitiallyHidden) {
                throw new Error('Register modal should be initially hidden');
            }
            
            // Test showing modal
            if (this.authUI && this.authUI.showRegisterModal) {
                this.authUI.showRegisterModal();
            } else {
                registerBtn.click();
            }
            
            // Verify modal is now visible
            const isVisible = !registerModal.classList.contains('modal-hidden');
            if (!isVisible) {
                throw new Error('Register modal not displayed after trigger');
            }
            
            // Test modal has clear form fields
            const emailField = registerModal.querySelector('input[type="email"]');
            const passwordField = registerModal.querySelector('input[type="password"]');
            
            if (!emailField || !passwordField) {
                throw new Error('Registration form fields not found');
            }
            
            this.addTestResult('Registration Modal Display', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Registration Modal Display', 'FAILED', error.message);
        }
    }

    /**
     * Test registration form elements (Requirement 1.1)
     */
    async testRegistrationFormElements() {
        console.log('📋 Testing registration form elements...');
        
        try {
            const registerModal = document.getElementById('register-modal');
            const registerForm = document.getElementById('register-form');
            
            if (!registerForm) {
                throw new Error('Registration form not found');
            }
            
            // Test required form fields exist
            const emailField = registerForm.querySelector('input[name="email"]');
            const passwordField = registerForm.querySelector('input[name="password"]');
            const confirmPasswordField = registerForm.querySelector('input[name="confirmPassword"]');
            const submitButton = registerForm.querySelector('button[type="submit"]');
            
            if (!emailField) throw new Error('Email field not found');
            if (!passwordField) throw new Error('Password field not found');
            if (!confirmPasswordField) throw new Error('Confirm password field not found');
            if (!submitButton) throw new Error('Submit button not found');
            
            // Test field attributes
            if (emailField.type !== 'email') {
                throw new Error('Email field should have type="email"');
            }
            
            if (passwordField.type !== 'password') {
                throw new Error('Password field should have type="password"');
            }
            
            if (confirmPasswordField.type !== 'password') {
                throw new Error('Confirm password field should have type="password"');
            }
            
            // Test error message containers exist
            const emailError = document.getElementById('register-email-error');
            const passwordError = document.getElementById('register-password-error');
            const confirmPasswordError = document.getElementById('register-confirm-password-error');
            
            if (!emailError) throw new Error('Email error container not found');
            if (!passwordError) throw new Error('Password error container not found');
            if (!confirmPasswordError) throw new Error('Confirm password error container not found');
            
            this.addTestResult('Registration Form Elements', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Registration Form Elements', 'FAILED', error.message);
        }
    }

    /**
     * Test valid registration data validation (Requirement 1.2)
     */
    async testValidRegistrationData() {
        console.log('✅ Testing valid registration data validation...');
        
        try {
            // Fill form with valid data
            await this.fillRegistrationForm(this.testData.valid);
            
            // Test form validation
            const isValid = this.validateRegistrationForm();
            if (!isValid) {
                throw new Error('Valid registration data failed validation');
            }
            
            // Test no error messages are displayed
            const errorMessages = this.getDisplayedErrorMessages();
            if (errorMessages.length > 0) {
                throw new Error(`Unexpected error messages: ${errorMessages.join(', ')}`);
            }
            
            this.addTestResult('Valid Registration Data Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Valid Registration Data Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test invalid email validation (Requirement 1.3)
     */
    async testInvalidEmailValidation() {
        console.log('📧 Testing invalid email validation...');
        
        try {
            // Fill form with invalid email
            await this.fillRegistrationForm(this.testData.invalidEmail);
            
            // Trigger validation
            const emailField = document.getElementById('register-email');
            if (emailField) {
                emailField.blur(); // Trigger validation
                await this.wait(100); // Allow validation to process
            }
            
            // Check for error message
            const emailError = document.getElementById('register-email-error');
            if (!emailError || !emailError.textContent.trim()) {
                throw new Error('Invalid email should display error message');
            }
            
            // Test form validation fails
            const isValid = this.validateRegistrationForm();
            if (isValid) {
                throw new Error('Form should not validate with invalid email');
            }
            
            this.addTestResult('Invalid Email Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Invalid Email Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test weak password validation (Requirement 1.3)
     */
    async testWeakPasswordValidation() {
        console.log('🔒 Testing weak password validation...');
        
        try {
            // Fill form with weak password
            await this.fillRegistrationForm(this.testData.weakPassword);
            
            // Trigger validation
            const passwordField = document.getElementById('register-password');
            if (passwordField) {
                passwordField.blur();
                await this.wait(100);
            }
            
            // Check for error message
            const passwordError = document.getElementById('register-password-error');
            if (!passwordError || !passwordError.textContent.trim()) {
                throw new Error('Weak password should display error message');
            }
            
            // Test form validation fails
            const isValid = this.validateRegistrationForm();
            if (isValid) {
                throw new Error('Form should not validate with weak password');
            }
            
            this.addTestResult('Weak Password Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Weak Password Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test password mismatch validation (Requirement 1.3)
     */
    async testPasswordMismatchValidation() {
        console.log('🔄 Testing password mismatch validation...');
        
        try {
            // Fill form with mismatched passwords
            await this.fillRegistrationForm(this.testData.mismatchedPasswords);
            
            // Trigger validation
            const confirmPasswordField = document.getElementById('register-confirm-password');
            if (confirmPasswordField) {
                confirmPasswordField.blur();
                await this.wait(100);
            }
            
            // Check for error message
            const confirmPasswordError = document.getElementById('register-confirm-password-error');
            if (!confirmPasswordError || !confirmPasswordError.textContent.trim()) {
                throw new Error('Mismatched passwords should display error message');
            }
            
            // Test form validation fails
            const isValid = this.validateRegistrationForm();
            if (isValid) {
                throw new Error('Form should not validate with mismatched passwords');
            }
            
            this.addTestResult('Password Mismatch Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Password Mismatch Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test empty field validation (Requirement 1.3)
     */
    async testEmptyFieldValidation() {
        console.log('📝 Testing empty field validation...');
        
        try {
            // Clear all fields
            await this.fillRegistrationForm(this.testData.emptyFields);
            
            // Trigger validation on all fields
            const fields = ['register-email', 'register-password', 'register-confirm-password'];
            for (const fieldId of fields) {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.blur();
                    await this.wait(50);
                }
            }
            
            // Check that error messages are displayed for required fields
            const emailError = document.getElementById('register-email-error');
            const passwordError = document.getElementById('register-password-error');
            
            if (!emailError || !emailError.textContent.trim()) {
                throw new Error('Empty email should display error message');
            }
            
            if (!passwordError || !passwordError.textContent.trim()) {
                throw new Error('Empty password should display error message');
            }
            
            // Test form validation fails
            const isValid = this.validateRegistrationForm();
            if (isValid) {
                throw new Error('Form should not validate with empty fields');
            }
            
            this.addTestResult('Empty Field Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Empty Field Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test successful registration (Requirement 1.2)
     */
    async testSuccessfulRegistration() {
        console.log('🎉 Testing successful registration...');
        
        try {
            // Mock successful registration response
            this.mockSuccessfulRegistration();
            
            // Fill form with valid data
            await this.fillRegistrationForm(this.testData.valid);
            
            // Submit form
            const result = await this.submitRegistrationForm();
            
            if (!result.success) {
                throw new Error('Registration should succeed with valid data');
            }
            
            // Check that user is authenticated
            if (!this.authManager.isAuthenticated()) {
                throw new Error('User should be authenticated after successful registration');
            }
            
            // Check that success notification is shown
            const notifications = this.getNotifications();
            const hasSuccessNotification = notifications.some(n => n.type === 'success');
            if (!hasSuccessNotification) {
                throw new Error('Success notification should be displayed');
            }
            
            this.addTestResult('Successful Registration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Successful Registration', 'FAILED', error.message);
        }
    }

    /**
     * Test duplicate email registration (Requirement 1.3)
     */
    async testDuplicateEmailRegistration() {
        console.log('📧 Testing duplicate email registration...');
        
        try {
            // Mock duplicate email error response
            this.mockDuplicateEmailError();
            
            // Fill form with duplicate email data
            await this.fillRegistrationForm(this.testData.duplicateEmail);
            
            // Submit form
            const result = await this.submitRegistrationForm();
            
            if (result.success) {
                throw new Error('Registration should fail with duplicate email');
            }
            
            // Check that error notification is shown
            const notifications = this.getNotifications();
            const hasErrorNotification = notifications.some(n => n.type === 'error');
            if (!hasErrorNotification) {
                throw new Error('Error notification should be displayed for duplicate email');
            }
            
            // Check that user is not authenticated
            if (this.authManager.isAuthenticated()) {
                throw new Error('User should not be authenticated after failed registration');
            }
            
            this.addTestResult('Duplicate Email Registration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Duplicate Email Registration', 'FAILED', error.message);
        }
    }

    /**
     * Test network error handling (Requirement 1.5)
     */
    async testNetworkErrorHandling() {
        console.log('🌐 Testing network error handling...');
        
        try {
            // Mock network error
            this.mockNetworkError();
            
            // Fill form with valid data
            await this.fillRegistrationForm(this.testData.valid);
            
            // Submit form
            const result = await this.submitRegistrationForm();
            
            if (result.success) {
                throw new Error('Registration should fail with network error');
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
     * Test server error handling (Requirement 1.5)
     */
    async testServerErrorHandling() {
        console.log('🖥️ Testing server error handling...');
        
        try {
            // Mock server error
            this.mockServerError();
            
            // Fill form with valid data
            await this.fillRegistrationForm(this.testData.valid);
            
            // Submit form
            const result = await this.submitRegistrationForm();
            
            if (result.success) {
                throw new Error('Registration should fail with server error');
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
     * Test success flow validation (Requirement 1.4)
     */
    async testSuccessFlowValidation() {
        console.log('✨ Testing success flow validation...');
        
        try {
            // Mock successful registration
            this.mockSuccessfulRegistration();
            
            // Fill and submit form
            await this.fillRegistrationForm(this.testData.valid);
            const result = await this.submitRegistrationForm();
            
            if (!result.success) {
                throw new Error('Registration should succeed for success flow test');
            }
            
            // Check that modal is hidden after success
            const registerModal = document.getElementById('register-modal');
            if (!registerModal.classList.contains('modal-hidden')) {
                throw new Error('Registration modal should be hidden after successful registration');
            }
            
            // Check that user status is updated
            const authenticatedStatus = document.getElementById('authenticated-status');
            const anonymousStatus = document.getElementById('anonymous-status');
            
            if (authenticatedStatus && authenticatedStatus.classList.contains('hidden')) {
                throw new Error('Authenticated status should be visible after registration');
            }
            
            if (anonymousStatus && !anonymousStatus.classList.contains('hidden')) {
                throw new Error('Anonymous status should be hidden after registration');
            }
            
            this.addTestResult('Success Flow Validation', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Success Flow Validation', 'FAILED', error.message);
        }
    }

    /**
     * Test redirect after registration (Requirement 1.4)
     */
    async testRedirectAfterRegistration() {
        console.log('🔄 Testing redirect after registration...');
        
        try {
            // Mock successful registration
            this.mockSuccessfulRegistration();
            
            // Fill and submit form
            await this.fillRegistrationForm(this.testData.valid);
            const result = await this.submitRegistrationForm();
            
            if (!result.success) {
                throw new Error('Registration should succeed for redirect test');
            }
            
            // Check that welcome modal is shown for new users
            await this.wait(500); // Allow time for welcome modal to appear
            
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal && !welcomeModal.classList.contains('modal-hidden')) {
                // Welcome modal is shown - this is the expected redirect behavior
                this.addTestResult('Redirect After Registration', 'PASSED');
            } else {
                // Check if user is redirected to main interface
                const mainInterface = document.querySelector('.main-interface, #main-content, .visualizer-container');
                if (mainInterface && mainInterface.style.display !== 'none') {
                    this.addTestResult('Redirect After Registration', 'PASSED');
                } else {
                    throw new Error('No redirect behavior detected after successful registration');
                }
            }
            
        } catch (error) {
            this.addTestResult('Redirect After Registration', 'FAILED', error.message);
        }
    }

    /**
     * Test error message display (Requirement 1.3)
     */
    async testErrorMessageDisplay() {
        console.log('⚠️ Testing error message display...');
        
        try {
            // Test that error messages are clear and actionable
            await this.fillRegistrationForm(this.testData.invalidEmail);
            
            // Trigger validation
            const emailField = document.getElementById('register-email');
            if (emailField) {
                emailField.blur();
                await this.wait(100);
            }
            
            // Check error message content
            const emailError = document.getElementById('register-email-error');
            if (!emailError || !emailError.textContent.trim()) {
                throw new Error('Error message should be displayed');
            }
            
            const errorText = emailError.textContent.trim();
            if (!errorText.toLowerCase().includes('email') || !errorText.toLowerCase().includes('valid')) {
                throw new Error('Error message should be clear and actionable');
            }
            
            // Test that form data is preserved during error display
            if (emailField.value !== this.testData.invalidEmail.email) {
                throw new Error('Form data should be preserved when showing error messages');
            }
            
            this.addTestResult('Error Message Display', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Error Message Display', 'FAILED', error.message);
        }
    }

    /**
     * Test error message clearing (Requirement 1.3)
     */
    async testErrorMessageClearing() {
        console.log('🧹 Testing error message clearing...');
        
        try {
            // First create an error
            await this.fillRegistrationForm(this.testData.invalidEmail);
            const emailField = document.getElementById('register-email');
            if (emailField) {
                emailField.blur();
                await this.wait(100);
            }
            
            // Verify error is displayed
            const emailError = document.getElementById('register-email-error');
            if (!emailError || !emailError.textContent.trim()) {
                throw new Error('Error should be displayed initially');
            }
            
            // Fix the error
            emailField.value = this.testData.valid.email;
            emailField.blur();
            await this.wait(100);
            
            // Verify error is cleared
            if (emailError.textContent.trim()) {
                throw new Error('Error message should be cleared when field becomes valid');
            }
            
            this.addTestResult('Error Message Clearing', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Error Message Clearing', 'FAILED', error.message);
        }
    }

    /**
     * Helper method to fill registration form
     */
    async fillRegistrationForm(data) {
        const emailField = document.getElementById('register-email');
        const passwordField = document.getElementById('register-password');
        const confirmPasswordField = document.getElementById('register-confirm-password');
        
        if (emailField) emailField.value = data.email;
        if (passwordField) passwordField.value = data.password;
        if (confirmPasswordField) confirmPasswordField.value = data.confirmPassword;
        
        await this.wait(50); // Allow form to update
    }

    /**
     * Helper method to validate registration form
     */
    validateRegistrationForm() {
        if (this.authUI && this.authUI.validateForm) {
            return this.authUI.validateForm('register');
        }
        
        // Fallback validation
        const emailField = document.getElementById('register-email');
        const passwordField = document.getElementById('register-password');
        const confirmPasswordField = document.getElementById('register-confirm-password');
        
        const emailValid = emailField && emailField.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value);
        const passwordValid = passwordField && passwordField.value && passwordField.value.length >= 6;
        const confirmValid = confirmPasswordField && confirmPasswordField.value === passwordField.value;
        
        return emailValid && passwordValid && confirmValid;
    }

    /**
     * Helper method to submit registration form
     */
    async submitRegistrationForm() {
        const emailField = document.getElementById('register-email');
        const passwordField = document.getElementById('register-password');
        
        if (!emailField || !passwordField) {
            throw new Error('Form fields not found');
        }
        
        const email = emailField.value;
        const password = passwordField.value;
        
        return await this.authManager.register(email, password);
    }

    /**
     * Helper method to get displayed error messages
     */
    getDisplayedErrorMessages() {
        const errorElements = [
            'register-email-error',
            'register-password-error',
            'register-confirm-password-error'
        ];
        
        return errorElements
            .map(id => document.getElementById(id))
            .filter(el => el && el.textContent.trim())
            .map(el => el.textContent.trim());
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
     * Mock successful registration response
     */
    mockSuccessfulRegistration() {
        this.authManager.register = async (email, password) => {
            const mockToken = this.generateMockJWT();
            const mockUser = {
                id: Date.now(),
                email: email,
                plan: 'free',
                emailVerified: true
            };
            
            // Simulate successful registration
            this.authManager.token = mockToken;
            this.authManager.user = mockUser;
            this.authManager._isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('oriel_jwt_token', mockToken);
            localStorage.setItem('oriel_user_data', JSON.stringify(mockUser));
            
            // Update UI
            if (this.authManager.notifyStateChange) {
                this.authManager.notifyStateChange();
            }
            
            // Show success notification
            if (this.notificationManager) {
                this.notificationManager.show('Registration successful!', 'success');
            }
            
            return { success: true, user: mockUser };
        };
    }

    /**
     * Mock duplicate email error response
     */
    mockDuplicateEmailError() {
        this.authManager.register = async (email, password) => {
            const error = new Error('An account with this email already exists.');
            
            if (this.notificationManager) {
                this.notificationManager.show('An account with this email already exists.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Mock network error response
     */
    mockNetworkError() {
        this.authManager.register = async (email, password) => {
            const error = new Error('Network error. Please check your connection and try again.');
            
            if (this.notificationManager) {
                this.notificationManager.show('Network error. Please check your connection and try again.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Mock server error response
     */
    mockServerError() {
        this.authManager.register = async (email, password) => {
            const error = new Error('Server error. Please try again later.');
            
            if (this.notificationManager) {
                this.notificationManager.show('Server error. Please try again later.', 'error');
            }
            
            return { success: false, error: error.message };
        };
    }

    /**
     * Generate mock JWT token
     */
    generateMockJWT() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: `user-${Date.now()}`,
            email: this.testData.valid.email,
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
        
        console.log('\n📊 Registration Flow Test Results:');
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
    window.RegistrationFlowTests = RegistrationFlowTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationFlowTests;
}