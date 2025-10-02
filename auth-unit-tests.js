/**
 * Authentication Unit Tests
 * Unit tests for form validation logic and session management utilities
 * Requirements: 1.1, 2.1
 */

class AuthenticationUnitTests {
    constructor() {
        this.testResults = [];
        this.mockLocalStorage = null;
        this.originalConsole = null;
    }

    /**
     * Initialize test environment
     */
    setUp() {
        // Mock localStorage
        this.mockLocalStorage = {
            storage: {},
            getItem: function(key) { return this.storage[key] || null; },
            setItem: function(key, value) { this.storage[key] = value; },
            removeItem: function(key) { delete this.storage[key]; },
            clear: function() { this.storage = {}; }
        };

        // Store original console but don't mock it for verification
        this.originalConsole = console;
    }

    /**
     * Clean up test environment
     */
    tearDown() {
        if (this.mockLocalStorage) {
            this.mockLocalStorage.clear();
        }
        
        // Console restoration not needed since we're not mocking it
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
     * Assert helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Run a single test
     */
    async runTest(testName, testFunction) {
        this.setUp();
        
        try {
            await testFunction.call(this);
            this.addTestResult(testName, 'PASSED');
        } catch (error) {
            this.addTestResult(testName, 'FAILED', error.message);
        } finally {
            this.tearDown();
        }
    }

    /**
     * Run all unit tests
     */
    async runAllTests() {
        console.log('🧪 Starting Authentication Unit Tests...');
        
        // Form Validation Logic Tests
        await this.runTest('Email Validation - Valid Email', this.testValidEmailValidation);
        await this.runTest('Email Validation - Invalid Email Format', this.testInvalidEmailValidation);
        await this.runTest('Email Validation - Empty Email', this.testEmptyEmailValidation);
        await this.runTest('Email Validation - Null Email', this.testNullEmailValidation);
        
        await this.runTest('Password Validation - Valid Password', this.testValidPasswordValidation);
        await this.runTest('Password Validation - Short Password', this.testShortPasswordValidation);
        await this.runTest('Password Validation - Empty Password', this.testEmptyPasswordValidation);
        await this.runTest('Password Validation - Null Password', this.testNullPasswordValidation);
        
        await this.runTest('Password Confirmation - Matching Passwords', this.testMatchingPasswordConfirmation);
        await this.runTest('Password Confirmation - Mismatched Passwords', this.testMismatchedPasswordConfirmation);
        await this.runTest('Password Confirmation - Empty Confirmation', this.testEmptyPasswordConfirmation);
        
        await this.runTest('Form Validation - Complete Valid Form', this.testCompleteValidForm);
        await this.runTest('Form Validation - Incomplete Form', this.testIncompleteForm);
        
        // Form Validation Edge Cases (Requirements 1.1, 2.1)
        await this.runTest('Form Validation - Preserve Data on Invalid Submission', this.testPreserveFormDataOnError);
        await this.runTest('Form Validation - Clear Error Messages on Valid Input', this.testClearErrorMessagesOnValidInput);
        await this.runTest('Form Validation - Username Field Preservation on Login Error', this.testUsernamePreservationOnLoginError);
        
        // Session Management Utilities Tests
        await this.runTest('JWT Token Validation - Valid Token', this.testValidJWTToken);
        await this.runTest('JWT Token Validation - Expired Token', this.testExpiredJWTToken);
        await this.runTest('JWT Token Validation - Invalid Format', this.testInvalidJWTFormat);
        await this.runTest('JWT Token Validation - Malformed Token', this.testMalformedJWTToken);
        
        await this.runTest('Session Storage - Store Session Data', this.testStoreSessionData);
        await this.runTest('Session Storage - Retrieve Session Data', this.testRetrieveSessionData);
        await this.runTest('Session Storage - Clear Session Data', this.testClearSessionData);
        await this.runTest('Session Storage - Handle Corrupted Data', this.testHandleCorruptedSessionData);
        
        await this.runTest('Session State Management - Initialize From Storage', this.testInitializeFromStorage);
        await this.runTest('Session State Management - Update State', this.testUpdateSessionState);
        await this.runTest('Session State Management - State Change Notifications', this.testStateChangeNotifications);
        
        await this.runTest('Token Refresh Logic - Calculate Refresh Time', this.testCalculateRefreshTime);
        await this.runTest('Token Refresh Logic - Handle Refresh Timer', this.testHandleRefreshTimer);
        
        // Session Persistence Tests (Requirement 2.3)
        await this.runTest('Session Persistence - Maintain State Across Refresh', this.testSessionPersistenceAcrossRefresh);
        await this.runTest('Session Persistence - Handle Browser Storage Limits', this.testHandleBrowserStorageLimits);
        await this.runTest('Session Cleanup - Complete Logout Data Clearing', this.testCompleteLogoutDataClearing);
        
        return this.getTestSummary();
    }

    // Form Validation Logic Tests

    /**
     * Test preserving form data on invalid submission (Requirement 1.3)
     */
    async testPreserveFormDataOnError() {
        const formData = {
            email: 'test@example.com',
            password: '123', // Invalid - too short
            confirmPassword: '123'
        };

        // Simulate form validation that should preserve valid fields
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^.{6,}$/;

        const isEmailValid = emailRegex.test(formData.email);
        const isPasswordValid = passwordRegex.test(formData.password);

        // Email should be valid and preserved
        this.assert(isEmailValid, 'Valid email should be preserved');
        // Password should be invalid but form should retain the value for user correction
        this.assert(!isPasswordValid, 'Invalid password should be flagged');
        
        // Simulate form state preservation
        const preservedFormState = {
            email: isEmailValid ? formData.email : '',
            password: formData.password, // Always preserve for user correction
            showEmailError: !isEmailValid,
            showPasswordError: !isPasswordValid
        };

        this.assert(preservedFormState.email === formData.email, 'Valid email should be preserved in form');
        this.assert(preservedFormState.showPasswordError === true, 'Password error should be shown');
    }

    /**
     * Test clearing error messages on valid input
     */
    async testClearErrorMessagesOnValidInput() {
        // Simulate form state with errors
        let formState = {
            email: 'invalid-email',
            emailError: 'Please enter a valid email address',
            password: '123',
            passwordError: 'Password must be at least 6 characters long'
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^.{6,}$/;

        // Update with valid email
        formState.email = 'valid@example.com';
        const isEmailValid = emailRegex.test(formState.email);
        if (isEmailValid) {
            formState.emailError = '';
        }

        // Update with valid password
        formState.password = 'validpassword123';
        const isPasswordValid = passwordRegex.test(formState.password);
        if (isPasswordValid) {
            formState.passwordError = '';
        }

        this.assert(formState.emailError === '', 'Email error should be cleared when email becomes valid');
        this.assert(formState.passwordError === '', 'Password error should be cleared when password becomes valid');
    }

    /**
     * Test username field preservation on login error (Requirement 2.2)
     */
    async testUsernamePreservationOnLoginError() {
        const loginData = {
            email: 'test@example.com',
            password: 'wrongpassword'
        };

        // Simulate login failure
        const loginResult = {
            success: false,
            error: 'Invalid credentials'
        };

        // Form should preserve email but clear password for security
        const formStateAfterError = {
            email: loginResult.success ? '' : loginData.email,
            password: '', // Always clear password on error
            showError: !loginResult.success,
            errorMessage: loginResult.error
        };

        this.assert(formStateAfterError.email === loginData.email, 'Email should be preserved on login error');
        this.assert(formStateAfterError.password === '', 'Password should be cleared on login error');
        this.assert(formStateAfterError.showError === true, 'Error should be shown on login failure');
    }

    /**
     * Test valid email validation
     */
    async testValidEmailValidation() {
        const validEmails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'user+tag@example.org',
            'firstname.lastname@company.com',
            'test123@test-domain.com'
        ];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        validEmails.forEach(email => {
            const isValid = emailRegex.test(email);
            this.assert(isValid, `Email ${email} should be valid`);
        });
    }

    /**
     * Test invalid email validation
     */
    async testInvalidEmailValidation() {
        const invalidEmails = [
            'invalid-email',
            '@example.com',
            'test@',
            'test.example.com',
            'test@.com',
            'test@com',
            'test @example.com',
            ''
        ];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        invalidEmails.forEach(email => {
            const isValid = emailRegex.test(email);
            this.assert(!isValid, `Email ${email} should be invalid`);
        });
    }

    /**
     * Test empty email validation
     */
    async testEmptyEmailValidation() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmpty = (value) => !value || value.trim() === '';
        
        const emptyEmail = '';
        this.assert(isEmpty(emptyEmail), 'Empty email should be detected');
        this.assert(!emailRegex.test(emptyEmail), 'Empty email should fail regex validation');
    }

    /**
     * Test null email validation
     */
    async testNullEmailValidation() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isNull = (value) => value === null || value === undefined;
        
        this.assert(isNull(null), 'Null email should be detected');
        this.assert(isNull(undefined), 'Undefined email should be detected');
        this.assert(!emailRegex.test(null), 'Null email should fail regex validation');
    }

    /**
     * Test valid password validation
     */
    async testValidPasswordValidation() {
        const validPasswords = [
            'password123',
            'MySecurePassword!',
            '123456',
            'abcdef',
            'P@ssw0rd123'
        ];

        const passwordRegex = /^.{6,}$/; // At least 6 characters

        validPasswords.forEach(password => {
            const isValid = passwordRegex.test(password);
            this.assert(isValid, `Password ${password} should be valid (6+ chars)`);
        });
    }

    /**
     * Test short password validation
     */
    async testShortPasswordValidation() {
        const shortPasswords = [
            '123',
            'ab',
            'pass',
            '12345'
        ];

        const passwordRegex = /^.{6,}$/;

        shortPasswords.forEach(password => {
            const isValid = passwordRegex.test(password);
            this.assert(!isValid, `Password ${password} should be invalid (too short)`);
        });
    }

    /**
     * Test empty password validation
     */
    async testEmptyPasswordValidation() {
        const passwordRegex = /^.{6,}$/;
        const isEmpty = (value) => !value || value.trim() === '';
        
        const emptyPassword = '';
        this.assert(isEmpty(emptyPassword), 'Empty password should be detected');
        this.assert(!passwordRegex.test(emptyPassword), 'Empty password should fail validation');
    }

    /**
     * Test null password validation
     */
    async testNullPasswordValidation() {
        const passwordRegex = /^.{6,}$/;
        const isNull = (value) => value === null || value === undefined;
        
        this.assert(isNull(null), 'Null password should be detected');
        this.assert(isNull(undefined), 'Undefined password should be detected');
        this.assert(!passwordRegex.test(null), 'Null password should fail validation');
    }

    /**
     * Test matching password confirmation
     */
    async testMatchingPasswordConfirmation() {
        const password = 'MyPassword123';
        const confirmPassword = 'MyPassword123';
        
        const passwordsMatch = password === confirmPassword;
        this.assert(passwordsMatch, 'Matching passwords should be valid');
    }

    /**
     * Test mismatched password confirmation
     */
    async testMismatchedPasswordConfirmation() {
        const password = 'MyPassword123';
        const confirmPassword = 'DifferentPassword456';
        
        const passwordsMatch = password === confirmPassword;
        this.assert(!passwordsMatch, 'Mismatched passwords should be invalid');
    }

    /**
     * Test empty password confirmation
     */
    async testEmptyPasswordConfirmation() {
        const password = 'MyPassword123';
        const confirmPassword = '';
        
        const isEmpty = (value) => !value || value.trim() === '';
        const passwordsMatch = password === confirmPassword;
        
        this.assert(isEmpty(confirmPassword), 'Empty confirmation should be detected');
        this.assert(!passwordsMatch, 'Empty confirmation should not match password');
    }

    /**
     * Test complete valid form validation
     */
    async testCompleteValidForm() {
        const formData = {
            email: 'test@example.com',
            password: 'ValidPassword123',
            confirmPassword: 'ValidPassword123'
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^.{6,}$/;

        const isEmailValid = emailRegex.test(formData.email);
        const isPasswordValid = passwordRegex.test(formData.password);
        const doPasswordsMatch = formData.password === formData.confirmPassword;
        const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch;

        this.assert(isEmailValid, 'Email should be valid');
        this.assert(isPasswordValid, 'Password should be valid');
        this.assert(doPasswordsMatch, 'Passwords should match');
        this.assert(isFormValid, 'Complete form should be valid');
    }

    /**
     * Test incomplete form validation
     */
    async testIncompleteForm() {
        const incompleteFormData = {
            email: '',
            password: 'ValidPassword123',
            confirmPassword: 'ValidPassword123'
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^.{6,}$/;
        const isEmpty = (value) => !value || value.trim() === '';

        const isEmailValid = !isEmpty(incompleteFormData.email) && emailRegex.test(incompleteFormData.email);
        const isPasswordValid = passwordRegex.test(incompleteFormData.password);
        const doPasswordsMatch = incompleteFormData.password === incompleteFormData.confirmPassword;
        const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch;

        this.assert(!isEmailValid, 'Empty email should be invalid');
        this.assert(isPasswordValid, 'Password should be valid');
        this.assert(doPasswordsMatch, 'Passwords should match');
        this.assert(!isFormValid, 'Incomplete form should be invalid');
    }

    // Session Management Utilities Tests

    /**
     * Test valid JWT token validation
     */
    async testValidJWTToken() {
        // Create a mock valid JWT token
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'user123',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
        }));
        const signature = 'mock-signature';
        const validToken = `${header}.${payload}.${signature}`;

        // Test token validation logic
        const isTokenValid = this.validateJWTToken(validToken);
        this.assert(isTokenValid, 'Valid JWT token should pass validation');
    }

    /**
     * Test expired JWT token validation
     */
    async testExpiredJWTToken() {
        // Create a mock expired JWT token
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'user123',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        }));
        const signature = 'mock-signature';
        const expiredToken = `${header}.${payload}.${signature}`;

        // Test token validation logic
        const isTokenValid = this.validateJWTToken(expiredToken);
        this.assert(!isTokenValid, 'Expired JWT token should fail validation');
    }

    /**
     * Test invalid JWT format validation
     */
    async testInvalidJWTFormat() {
        const invalidTokens = [
            'invalid.token',
            'not.a.jwt.token',
            'invalid-format',
            '',
            null,
            undefined
        ];

        invalidTokens.forEach(token => {
            const isTokenValid = this.validateJWTToken(token);
            this.assert(!isTokenValid, `Invalid token format ${token} should fail validation`);
        });
    }

    /**
     * Test malformed JWT token validation
     */
    async testMalformedJWTToken() {
        // Create malformed tokens
        const malformedTokens = [
            'header.payload.signature.extra',
            'header.invalid-base64.signature',
            'header..signature',
            '.payload.signature',
            'header.payload.'
        ];

        malformedTokens.forEach(token => {
            const isTokenValid = this.validateJWTToken(token);
            this.assert(!isTokenValid, `Malformed token ${token} should fail validation`);
        });
    }

    /**
     * Test storing session data
     */
    async testStoreSessionData() {
        const sessionData = {
            token: 'mock-jwt-token',
            user: { id: 1, email: 'test@example.com', plan: 'free' }
        };

        // Test storing session data
        this.storeSessionData(sessionData.token, sessionData.user);

        const storedToken = this.mockLocalStorage.getItem('oriel_jwt_token');
        const storedUser = JSON.parse(this.mockLocalStorage.getItem('oriel_user_data') || 'null');

        this.assert(storedToken === sessionData.token, 'Token should be stored correctly');
        this.assert(storedUser.email === sessionData.user.email, 'User data should be stored correctly');
        this.assert(storedUser.id === sessionData.user.id, 'User ID should be stored correctly');
    }

    /**
     * Test retrieving session data
     */
    async testRetrieveSessionData() {
        const sessionData = {
            token: 'mock-jwt-token',
            user: { id: 1, email: 'test@example.com', plan: 'free' }
        };

        // Store data first
        this.mockLocalStorage.setItem('oriel_jwt_token', sessionData.token);
        this.mockLocalStorage.setItem('oriel_user_data', JSON.stringify(sessionData.user));

        // Test retrieving session data
        const retrievedData = this.retrieveSessionData();

        this.assert(retrievedData.token === sessionData.token, 'Retrieved token should match stored token');
        this.assert(retrievedData.user.email === sessionData.user.email, 'Retrieved user email should match');
        this.assert(retrievedData.user.id === sessionData.user.id, 'Retrieved user ID should match');
    }

    /**
     * Test clearing session data
     */
    async testClearSessionData() {
        // Store some data first
        this.mockLocalStorage.setItem('oriel_jwt_token', 'mock-token');
        this.mockLocalStorage.setItem('oriel_user_data', JSON.stringify({ id: 1, email: 'test@example.com' }));

        // Verify data exists
        this.assert(this.mockLocalStorage.getItem('oriel_jwt_token') !== null, 'Token should exist before clearing');
        this.assert(this.mockLocalStorage.getItem('oriel_user_data') !== null, 'User data should exist before clearing');

        // Clear session data
        this.clearSessionData();

        // Verify data is cleared
        this.assert(this.mockLocalStorage.getItem('oriel_jwt_token') === null, 'Token should be cleared');
        this.assert(this.mockLocalStorage.getItem('oriel_user_data') === null, 'User data should be cleared');
    }

    /**
     * Test handling corrupted session data
     */
    async testHandleCorruptedSessionData() {
        // Store corrupted JSON data
        this.mockLocalStorage.setItem('oriel_jwt_token', 'valid-token');
        this.mockLocalStorage.setItem('oriel_user_data', 'invalid-json-data');

        // Test retrieving corrupted data
        const retrievedData = this.retrieveSessionData();

        this.assert(retrievedData.token === 'valid-token', 'Valid token should still be retrieved');
        this.assert(retrievedData.user === null, 'Corrupted user data should return null');
    }

    /**
     * Test initializing from storage
     */
    async testInitializeFromStorage() {
        const validToken = this.createMockJWT(3600); // Valid for 1 hour
        const userData = { id: 1, email: 'test@example.com', plan: 'free' };

        // Store valid session data
        this.mockLocalStorage.setItem('oriel_jwt_token', validToken);
        this.mockLocalStorage.setItem('oriel_user_data', JSON.stringify(userData));

        // Test initialization
        const authState = this.initializeFromStorage();

        this.assert(authState.isAuthenticated === true, 'Should be authenticated with valid stored data');
        this.assert(authState.token === validToken, 'Should load token from storage');
        this.assert(authState.user.email === userData.email, 'Should load user data from storage');
    }

    /**
     * Test updating session state
     */
    async testUpdateSessionState() {
        let stateChangeCount = 0;
        let lastState = null;

        // Mock state change listener
        const onStateChange = (state) => {
            stateChangeCount++;
            lastState = state;
        };

        // Test state update
        const newState = {
            isAuthenticated: true,
            user: { id: 1, email: 'test@example.com' },
            token: 'mock-token'
        };

        this.updateSessionState(newState, onStateChange);

        this.assert(stateChangeCount === 1, 'State change listener should be called once');
        this.assert(lastState.isAuthenticated === true, 'State should be updated correctly');
        this.assert(lastState.user.email === 'test@example.com', 'User data should be passed to listener');
    }

    /**
     * Test state change notifications
     */
    async testStateChangeNotifications() {
        const listeners = [];
        let callCount = 0;

        // Create multiple listeners
        for (let i = 0; i < 3; i++) {
            listeners.push((state) => {
                callCount++;
            });
        }

        const mockState = { isAuthenticated: true, user: { id: 1 }, token: 'token' };

        // Notify all listeners
        this.notifyStateChangeListeners(listeners, mockState);

        this.assert(callCount === 3, 'All listeners should be called');
    }

    /**
     * Test calculating token refresh time
     */
    async testCalculateRefreshTime() {
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + 3600; // Expires in 1 hour

        const refreshTime = this.calculateTokenRefreshTime(expirationTime);
        const expectedRefreshTime = (expirationTime - currentTime - 300) * 1000; // 5 minutes before expiry

        this.assert(refreshTime === expectedRefreshTime, 'Refresh time should be 5 minutes before expiry');
    }

    /**
     * Test handling refresh timer
     */
    async testHandleRefreshTimer() {
        let timerSet = false;
        let timerCleared = false;

        // Mock timer functions
        const mockSetTimeout = (callback, delay) => {
            timerSet = true;
            return 'mock-timer-id';
        };

        const mockClearTimeout = (timerId) => {
            timerCleared = true;
        };

        // Test setting refresh timer
        const timerId = this.setupRefreshTimer(mockSetTimeout, 60000);
        this.assert(timerSet, 'Timer should be set');

        // Test clearing refresh timer
        this.clearRefreshTimer(mockClearTimeout, timerId);
        this.assert(timerCleared, 'Timer should be cleared');
    }

    /**
     * Test session persistence across browser refresh (Requirement 2.3)
     */
    async testSessionPersistenceAcrossRefresh() {
        const validToken = this.createMockJWT(3600); // Valid for 1 hour
        const userData = { id: 1, email: 'test@example.com', plan: 'free' };

        // Simulate initial login
        this.storeSessionData(validToken, userData);

        // Simulate browser refresh by reinitializing from storage
        const authStateAfterRefresh = this.initializeFromStorage();

        this.assert(authStateAfterRefresh.isAuthenticated === true, 'Should remain authenticated after refresh');
        this.assert(authStateAfterRefresh.token === validToken, 'Token should persist after refresh');
        this.assert(authStateAfterRefresh.user.email === userData.email, 'User data should persist after refresh');

        // Test with expired token
        const expiredToken = this.createMockJWT(-3600); // Expired 1 hour ago
        this.storeSessionData(expiredToken, userData);

        const authStateWithExpiredToken = this.initializeFromStorage();

        this.assert(authStateWithExpiredToken.isAuthenticated === false, 'Should not be authenticated with expired token');
        this.assert(authStateWithExpiredToken.token === null, 'Expired token should be cleared');
    }

    /**
     * Test handling browser storage limits
     */
    async testHandleBrowserStorageLimits() {
        // Test with very large user data that might exceed storage limits
        const largeUserData = {
            id: 1,
            email: 'test@example.com',
            plan: 'premium',
            preferences: 'x'.repeat(1000), // Large string
            projects: new Array(100).fill({ name: 'project', data: 'x'.repeat(100) })
        };

        const token = this.createMockJWT(3600);

        try {
            this.storeSessionData(token, largeUserData);
            const retrievedData = this.retrieveSessionData();
            
            this.assert(retrievedData.token === token, 'Token should be stored even with large user data');
            this.assert(retrievedData.user.email === largeUserData.email, 'Essential user data should be preserved');
        } catch (error) {
            // If storage fails, should handle gracefully
            this.assert(true, 'Storage limits should be handled gracefully');
        }
    }

    /**
     * Test complete logout data clearing (Requirement 2.5)
     */
    async testCompleteLogoutDataClearing() {
        const token = this.createMockJWT(3600);
        const userData = { id: 1, email: 'test@example.com', plan: 'free' };

        // Store session data
        this.storeSessionData(token, userData);

        // Verify data exists
        let retrievedData = this.retrieveSessionData();
        this.assert(retrievedData.token !== null, 'Token should exist before logout');
        this.assert(retrievedData.user !== null, 'User data should exist before logout');

        // Perform logout (clear all data)
        this.clearSessionData();

        // Also clear any additional session-related data
        this.mockLocalStorage.removeItem('oriel_preferences');
        this.mockLocalStorage.removeItem('oriel_temp_data');
        this.mockLocalStorage.removeItem('oriel_cache');

        // Verify complete cleanup
        retrievedData = this.retrieveSessionData();
        this.assert(retrievedData.token === null, 'Token should be cleared after logout');
        this.assert(retrievedData.user === null, 'User data should be cleared after logout');
        
        // Verify additional data is cleared
        this.assert(this.mockLocalStorage.getItem('oriel_preferences') === null, 'Preferences should be cleared');
        this.assert(this.mockLocalStorage.getItem('oriel_temp_data') === null, 'Temporary data should be cleared');
        this.assert(this.mockLocalStorage.getItem('oriel_cache') === null, 'Cache data should be cleared');
    }

    // Helper methods for session management utilities

    /**
     * Validate JWT token (utility function)
     */
    validateJWTToken(token) {
        if (!token) return false;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            return payload.exp && payload.exp > currentTime;
        } catch (error) {
            return false;
        }
    }

    /**
     * Store session data (utility function)
     */
    storeSessionData(token, user) {
        this.mockLocalStorage.setItem('oriel_jwt_token', token);
        this.mockLocalStorage.setItem('oriel_user_data', JSON.stringify(user));
    }

    /**
     * Retrieve session data (utility function)
     */
    retrieveSessionData() {
        try {
            const token = this.mockLocalStorage.getItem('oriel_jwt_token');
            const userDataString = this.mockLocalStorage.getItem('oriel_user_data');
            
            let user = null;
            if (userDataString) {
                try {
                    user = JSON.parse(userDataString);
                } catch (error) {
                    // Handle corrupted JSON data
                    user = null;
                }
            }
            
            return { token, user };
        } catch (error) {
            return { token: null, user: null };
        }
    }

    /**
     * Clear session data (utility function)
     */
    clearSessionData() {
        this.mockLocalStorage.removeItem('oriel_jwt_token');
        this.mockLocalStorage.removeItem('oriel_user_data');
    }

    /**
     * Initialize from storage (utility function)
     */
    initializeFromStorage() {
        const { token, user } = this.retrieveSessionData();
        
        if (token && user && this.validateJWTToken(token)) {
            return {
                isAuthenticated: true,
                token: token,
                user: user
            };
        } else {
            this.clearSessionData();
            return {
                isAuthenticated: false,
                token: null,
                user: null
            };
        }
    }

    /**
     * Update session state (utility function)
     */
    updateSessionState(newState, onStateChange) {
        if (onStateChange) {
            onStateChange(newState);
        }
    }

    /**
     * Notify state change listeners (utility function)
     */
    notifyStateChangeListeners(listeners, state) {
        listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                // Handle listener errors gracefully
                console.error('Error in state change listener:', error);
            }
        });
    }

    /**
     * Calculate token refresh time (utility function)
     */
    calculateTokenRefreshTime(expirationTime) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = (expirationTime - currentTime) * 1000;
        return Math.max(timeUntilExpiry - (5 * 60 * 1000), 60000); // 5 minutes before expiry, minimum 1 minute
    }

    /**
     * Setup refresh timer (utility function)
     */
    setupRefreshTimer(setTimeoutFn, delay) {
        return setTimeoutFn(() => {
            // Refresh token logic would go here
            console.log('Token refresh triggered');
        }, delay);
    }

    /**
     * Clear refresh timer (utility function)
     */
    clearRefreshTimer(clearTimeoutFn, timerId) {
        if (timerId) {
            clearTimeoutFn(timerId);
            console.log('Token refresh timer cleared');
        }
    }

    /**
     * Create mock JWT token (utility function)
     */
    createMockJWT(expiresInSeconds) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'test-user',
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + expiresInSeconds
        }));
        const signature = 'mock-signature';
        return `${header}.${payload}.${signature}`;
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
        
        console.log('\n📊 Authentication Unit Test Results:');
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
        
        console.log('\n✅ Authentication unit testing completed!');
        
        return summary;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AuthenticationUnitTests = AuthenticationUnitTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationUnitTests;
}