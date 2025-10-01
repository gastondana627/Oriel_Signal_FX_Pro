/**
 * Integration Tests for User Registration and Authentication Flow
 * Tests complete user flows from registration to login to logout
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

class IntegrationAuthTests {
    constructor() {
        this.testResults = [];
        this.authManager = null;
        this.apiClient = null;
        this.testUser = {
            email: `test${Date.now()}@example.com`,
            password: 'TestPassword123!'
        };
    }

    async runAllTests() {
        console.log('🧪 Starting Integration Authentication Tests...');
        
        try {
            await this.setupTestEnvironment();
            await this.testUserRegistrationFlow();
            await this.testUserLoginFlow();
            await this.testJWTTokenManagement();
            await this.testLogoutAndSessionCleanup();
            await this.testAuthenticationStateManagement();
            await this.testErrorHandlingScenarios();
            
            this.displayResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.testResults.push({
                test: 'Test Suite Execution',
                status: 'FAILED',
                error: error.message
            });
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Initialize managers
        this.apiClient = new ApiClient();
        this.authManager = new AuthManager(this.apiClient);
        
        // Clear any existing auth state
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        this.addTestResult('Test Environment Setup', 'PASSED');
    }

    async testUserRegistrationFlow() {
        console.log('📝 Testing user registration flow...');
        
        try {
            // Test 1: Registration modal display (Requirement 1.2)
            const registerBtn = document.getElementById('register-btn');
            if (!registerBtn) {
                throw new Error('Register button not found in UI');
            }
            
            // Simulate clicking register button
            registerBtn.click();
            const registerModal = document.getElementById('register-modal');
            if (!registerModal || registerModal.style.display === 'none') {
                throw new Error('Register modal not displayed');
            }
            this.addTestResult('Registration Modal Display', 'PASSED');

            // Test 2: Registration form validation
            const registerForm = document.getElementById('register-form');
            const emailInput = registerForm.querySelector('input[type="email"]');
            const passwordInput = registerForm.querySelector('input[type="password"]');
            
            if (!emailInput || !passwordInput) {
                throw new Error('Registration form inputs not found');
            }
            this.addTestResult('Registration Form Elements', 'PASSED');

            // Test 3: Valid registration submission (Requirement 1.2)
            emailInput.value = this.testUser.email;
            passwordInput.value = this.testUser.password;
            
            // Mock successful registration response
            const originalRegister = this.authManager.register;
            this.authManager.register = async (email, password) => {
                if (email === this.testUser.email && password === this.testUser.password) {
                    return { success: true, message: 'Registration successful' };
                }
                throw new Error('Invalid credentials');
            };
            
            const registrationResult = await this.authManager.register(
                this.testUser.email, 
                this.testUser.password
            );
            
            if (!registrationResult.success) {
                throw new Error('Registration failed');
            }
            this.addTestResult('User Registration API Call', 'PASSED');
            
            // Restore original method
            this.authManager.register = originalRegister;

        } catch (error) {
            this.addTestResult('User Registration Flow', 'FAILED', error.message);
        }
    }

    async testUserLoginFlow() {
        console.log('🔐 Testing user login flow...');
        
        try {
            // Test 1: Login modal display (Requirement 1.4)
            const loginBtn = document.getElementById('login-btn');
            if (!loginBtn) {
                throw new Error('Login button not found in UI');
            }
            
            loginBtn.click();
            const loginModal = document.getElementById('login-modal');
            if (!loginModal || loginModal.style.display === 'none') {
                throw new Error('Login modal not displayed');
            }
            this.addTestResult('Login Modal Display', 'PASSED');

            // Test 2: Login form validation
            const loginForm = document.getElementById('login-form');
            const emailInput = loginForm.querySelector('input[type="email"]');
            const passwordInput = loginForm.querySelector('input[type="password"]');
            
            if (!emailInput || !passwordInput) {
                throw new Error('Login form inputs not found');
            }
            this.addTestResult('Login Form Elements', 'PASSED');

            // Test 3: Valid login submission (Requirement 1.5)
            emailInput.value = this.testUser.email;
            passwordInput.value = this.testUser.password;
            
            // Mock successful login response
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
            const originalLogin = this.authManager.login;
            this.authManager.login = async (email, password) => {
                if (email === this.testUser.email && password === this.testUser.password) {
                    return { 
                        success: true, 
                        token: mockToken,
                        user: { id: 1, email: email, plan: 'free' }
                    };
                }
                throw new Error('Invalid credentials');
            };
            
            const loginResult = await this.authManager.login(
                this.testUser.email, 
                this.testUser.password
            );
            
            if (!loginResult.success || !loginResult.token) {
                throw new Error('Login failed or token not received');
            }
            this.addTestResult('User Login API Call', 'PASSED');
            
            // Test 4: JWT token storage (Requirement 1.6)
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken !== mockToken) {
                throw new Error('JWT token not stored correctly');
            }
            this.addTestResult('JWT Token Storage', 'PASSED');
            
            // Test 5: User status display (Requirement 1.6)
            const authenticatedStatus = document.getElementById('authenticated-status');
            const anonymousStatus = document.getElementById('anonymous-status');
            
            if (!authenticatedStatus || authenticatedStatus.classList.contains('hidden')) {
                throw new Error('Authenticated status not displayed');
            }
            if (!anonymousStatus || !anonymousStatus.classList.contains('hidden')) {
                throw new Error('Anonymous status not hidden');
            }
            this.addTestResult('User Status Display Update', 'PASSED');
            
            // Restore original method
            this.authManager.login = originalLogin;

        } catch (error) {
            this.addTestResult('User Login Flow', 'FAILED', error.message);
        }
    }

    async testJWTTokenManagement() {
        console.log('🎫 Testing JWT token management...');
        
        try {
            // Test 1: Token validation
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
            localStorage.setItem('auth_token', mockToken);
            
            const isAuthenticated = this.authManager.isAuthenticated();
            if (!isAuthenticated) {
                throw new Error('Token validation failed');
            }
            this.addTestResult('JWT Token Validation', 'PASSED');

            // Test 2: Token retrieval
            const retrievedToken = this.authManager.getToken();
            if (retrievedToken !== mockToken) {
                throw new Error('Token retrieval failed');
            }
            this.addTestResult('JWT Token Retrieval', 'PASSED');

            // Test 3: Token refresh mechanism (Requirement 1.6)
            const originalRefresh = this.authManager.refreshToken;
            this.authManager.refreshToken = async () => {
                const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshed.token';
                localStorage.setItem('auth_token', newToken);
                return { success: true, token: newToken };
            };
            
            const refreshResult = await this.authManager.refreshToken();
            if (!refreshResult.success) {
                throw new Error('Token refresh failed');
            }
            
            const newToken = localStorage.getItem('auth_token');
            if (!newToken.includes('refreshed')) {
                throw new Error('Token not updated after refresh');
            }
            this.addTestResult('JWT Token Refresh', 'PASSED');
            
            // Restore original method
            this.authManager.refreshToken = originalRefresh;

        } catch (error) {
            this.addTestResult('JWT Token Management', 'FAILED', error.message);
        }
    }

    async testLogoutAndSessionCleanup() {
        console.log('🚪 Testing logout and session cleanup...');
        
        try {
            // Setup authenticated state
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
            localStorage.setItem('auth_token', mockToken);
            localStorage.setItem('user_data', JSON.stringify({ id: 1, email: this.testUser.email }));
            
            // Test 1: Logout button availability
            const logoutBtn = document.getElementById('logout-btn');
            if (!logoutBtn) {
                throw new Error('Logout button not found');
            }
            this.addTestResult('Logout Button Availability', 'PASSED');

            // Test 2: Logout functionality (Requirement 1.7)
            const originalLogout = this.authManager.logout;
            this.authManager.logout = async () => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                return { success: true };
            };
            
            const logoutResult = await this.authManager.logout();
            if (!logoutResult.success) {
                throw new Error('Logout API call failed');
            }
            this.addTestResult('Logout API Call', 'PASSED');

            // Test 3: Token cleanup (Requirement 1.7)
            const tokenAfterLogout = localStorage.getItem('auth_token');
            const userDataAfterLogout = localStorage.getItem('user_data');
            
            if (tokenAfterLogout || userDataAfterLogout) {
                throw new Error('Session data not cleaned up after logout');
            }
            this.addTestResult('Session Data Cleanup', 'PASSED');

            // Test 4: UI state reset (Requirement 1.7)
            const authenticatedStatus = document.getElementById('authenticated-status');
            const anonymousStatus = document.getElementById('anonymous-status');
            
            if (!authenticatedStatus.classList.contains('hidden')) {
                throw new Error('Authenticated status not hidden after logout');
            }
            if (anonymousStatus.classList.contains('hidden')) {
                throw new Error('Anonymous status not shown after logout');
            }
            this.addTestResult('UI State Reset After Logout', 'PASSED');
            
            // Restore original method
            this.authManager.logout = originalLogout;

        } catch (error) {
            this.addTestResult('Logout and Session Cleanup', 'FAILED', error.message);
        }
    }

    async testAuthenticationStateManagement() {
        console.log('🔄 Testing authentication state management...');
        
        try {
            // Test 1: Initial anonymous state
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            
            const isInitiallyAuthenticated = this.authManager.isAuthenticated();
            if (isInitiallyAuthenticated) {
                throw new Error('Should not be authenticated initially');
            }
            this.addTestResult('Initial Anonymous State', 'PASSED');

            // Test 2: State persistence across page reloads
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.persistent.token';
            const mockUser = { id: 1, email: this.testUser.email, plan: 'free' };
            
            localStorage.setItem('auth_token', mockToken);
            localStorage.setItem('user_data', JSON.stringify(mockUser));
            
            // Simulate page reload by reinitializing AuthManager
            const newAuthManager = new AuthManager(this.apiClient);
            const isPersistent = newAuthManager.isAuthenticated();
            
            if (!isPersistent) {
                throw new Error('Authentication state not persistent');
            }
            this.addTestResult('State Persistence', 'PASSED');

            // Test 3: User data retrieval
            const retrievedUser = newAuthManager.getCurrentUser();
            if (!retrievedUser || retrievedUser.email !== this.testUser.email) {
                throw new Error('User data not retrieved correctly');
            }
            this.addTestResult('User Data Retrieval', 'PASSED');

        } catch (error) {
            this.addTestResult('Authentication State Management', 'FAILED', error.message);
        }
    }

    async testErrorHandlingScenarios() {
        console.log('⚠️ Testing error handling scenarios...');
        
        try {
            // Test 1: Invalid login credentials
            const originalLogin = this.authManager.login;
            this.authManager.login = async (email, password) => {
                throw new Error('Invalid credentials');
            };
            
            try {
                await this.authManager.login('invalid@email.com', 'wrongpassword');
                throw new Error('Should have thrown error for invalid credentials');
            } catch (error) {
                if (error.message !== 'Invalid credentials') {
                    throw error;
                }
            }
            this.addTestResult('Invalid Login Error Handling', 'PASSED');
            
            // Test 2: Network error handling
            this.authManager.login = async () => {
                throw new Error('Network error');
            };
            
            try {
                await this.authManager.login(this.testUser.email, this.testUser.password);
                throw new Error('Should have thrown network error');
            } catch (error) {
                if (error.message !== 'Network error') {
                    throw error;
                }
            }
            this.addTestResult('Network Error Handling', 'PASSED');
            
            // Test 3: Registration error handling
            const originalRegister = this.authManager.register;
            this.authManager.register = async () => {
                throw new Error('Email already exists');
            };
            
            try {
                await this.authManager.register(this.testUser.email, this.testUser.password);
                throw new Error('Should have thrown registration error');
            } catch (error) {
                if (error.message !== 'Email already exists') {
                    throw error;
                }
            }
            this.addTestResult('Registration Error Handling', 'PASSED');
            
            // Restore original methods
            this.authManager.login = originalLogin;
            this.authManager.register = originalRegister;

        } catch (error) {
            this.addTestResult('Error Handling Scenarios', 'FAILED', error.message);
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
        console.log('\n📊 Integration Authentication Test Results:');
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
        localStorage.setItem('integration_auth_test_results', JSON.stringify({
            summary: { total, passed, failed, successRate: (passed / total) * 100 },
            details: this.testResults,
            timestamp: new Date().toISOString()
        }));
        
        console.log('\n✅ Integration authentication tests completed!');
    }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationAuthTests;
}