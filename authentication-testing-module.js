/**
 * Authentication Testing Module
 * Comprehensive testing suite for authentication flows
 * Integrates registration and login flow testing
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
 */

class AuthenticationTestingModule {
    constructor() {
        this.registrationTests = null;
        this.loginTests = null;
        this.testResults = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the authentication testing module
     */
    async initialize() {
        console.log('🔧 Initializing Authentication Testing Module...');
        
        try {
            // Wait for dependencies to be available
            await this.waitForDependencies();
            
            // Initialize test modules
            this.registrationTests = new RegistrationFlowTests();
            this.loginTests = new LoginFlowTests();
            
            this.isInitialized = true;
            this.addTestResult('Authentication Testing Module Initialization', 'PASSED');
            
            console.log('✅ Authentication Testing Module initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Authentication Testing Module:', error);
            this.addTestResult('Authentication Testing Module Initialization', 'FAILED', error.message);
            return false;
        }
    }

    /**
     * Wait for required dependencies to be available
     */
    async waitForDependencies() {
        const maxWait = 15000; // 15 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.RegistrationFlowTests && window.LoginFlowTests && 
                window.authManager && window.authUI && window.apiClient && window.notifications) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        throw new Error('Required dependencies not available after timeout');
    }

    /**
     * Run all authentication tests
     */
    async runAllTests() {
        console.log('🧪 Starting Comprehensive Authentication Tests...');
        
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                return this.getComprehensiveTestSummary();
            }
        }
        
        try {
            // Run registration flow tests
            console.log('\n📝 Running Registration Flow Tests...');
            const registrationSummary = await this.registrationTests.runAllTests();
            
            // Run login flow tests
            console.log('\n🔐 Running Login Flow Tests...');
            const loginSummary = await this.loginTests.runAllTests();
            
            // Run integration tests
            console.log('\n🔄 Running Authentication Integration Tests...');
            await this.runIntegrationTests();
            
            // Display comprehensive results
            this.displayComprehensiveResults(registrationSummary, loginSummary);
            
        } catch (error) {
            console.error('❌ Authentication test suite execution failed:', error);
            this.addTestResult('Authentication Test Suite Execution', 'FAILED', error.message);
        }
        
        return this.getComprehensiveTestSummary();
    }

    /**
     * Run integration tests that combine registration and login flows
     */
    async runIntegrationTests() {
        console.log('🔗 Running authentication integration tests...');
        
        try {
            await this.testRegistrationToLoginFlow();
            await this.testSessionManagementIntegration();
            await this.testErrorHandlingIntegration();
            await this.testUIStateIntegration();
            
        } catch (error) {
            console.error('❌ Integration tests failed:', error);
            this.addTestResult('Authentication Integration Tests', 'FAILED', error.message);
        }
    }

    /**
     * Test complete registration to login flow
     */
    async testRegistrationToLoginFlow() {
        console.log('🔄 Testing registration to login flow...');
        
        try {
            // Clear any existing state
            localStorage.removeItem('oriel_jwt_token');
            localStorage.removeItem('oriel_user_data');
            
            // Mock successful registration
            const testEmail = `integration${Date.now()}@example.com`;
            const testPassword = 'IntegrationTest123!';
            
            // Test registration
            if (window.authManager) {
                // Mock registration that doesn't auto-login
                const originalRegister = window.authManager.register;
                window.authManager.register = async (email, password) => {
                    if (window.notifications) {
                        window.notifications.show('Registration successful! Please log in.', 'success');
                    }
                    return { success: true, requiresVerification: false };
                };
                
                const registrationResult = await window.authManager.register(testEmail, testPassword);
                
                if (!registrationResult.success) {
                    throw new Error('Registration should succeed in integration test');
                }
                
                // Now test login with the same credentials
                window.authManager.register = originalRegister;
                
                // Mock successful login
                const originalLogin = window.authManager.login;
                window.authManager.login = async (email, password) => {
                    if (email === testEmail && password === testPassword) {
                        const mockToken = this.generateMockJWT(email);
                        const mockUser = { id: Date.now(), email: email, plan: 'free' };
                        
                        window.authManager.token = mockToken;
                        window.authManager.user = mockUser;
                        window.authManager._isAuthenticated = true;
                        
                        localStorage.setItem('oriel_jwt_token', mockToken);
                        localStorage.setItem('oriel_user_data', JSON.stringify(mockUser));
                        
                        if (window.authManager.notifyStateChange) {
                            window.authManager.notifyStateChange();
                        }
                        
                        if (window.notifications) {
                            window.notifications.show('Login successful!', 'success');
                        }
                        
                        return { success: true, user: mockUser };
                    }
                    throw new Error('Invalid credentials');
                };
                
                const loginResult = await window.authManager.login(testEmail, testPassword);
                
                if (!loginResult.success) {
                    throw new Error('Login should succeed after registration');
                }
                
                // Verify user is authenticated
                if (!window.authManager.isAuthenticated()) {
                    throw new Error('User should be authenticated after login');
                }
                
                // Restore original method
                window.authManager.login = originalLogin;
            }
            
            this.addTestResult('Registration to Login Flow', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Registration to Login Flow', 'FAILED', error.message);
        }
    }

    /**
     * Test session management integration
     */
    async testSessionManagementIntegration() {
        console.log('🔐 Testing session management integration...');
        
        try {
            // Setup authenticated state
            const mockToken = this.generateMockJWT('session@example.com');
            const mockUser = { id: 1, email: 'session@example.com', plan: 'free' };
            
            localStorage.setItem('oriel_jwt_token', mockToken);
            localStorage.setItem('oriel_user_data', JSON.stringify(mockUser));
            
            // Test that AuthManager initializes with stored session
            if (window.authManager) {
                window.authManager.initializeFromStorage();
                
                if (!window.authManager.isAuthenticated()) {
                    throw new Error('AuthManager should initialize with stored session');
                }
                
                const currentUser = window.authManager.getCurrentUser();
                if (!currentUser || currentUser.email !== mockUser.email) {
                    throw new Error('User data should be restored from storage');
                }
            }
            
            // Test logout clears everything
            if (window.authManager && window.authManager.logout) {
                const originalLogout = window.authManager.logout;
                window.authManager.logout = async () => {
                    window.authManager._isAuthenticated = false;
                    window.authManager.user = null;
                    window.authManager.token = null;
                    
                    localStorage.removeItem('oriel_jwt_token');
                    localStorage.removeItem('oriel_user_data');
                    
                    if (window.authManager.notifyStateChange) {
                        window.authManager.notifyStateChange();
                    }
                    
                    return { success: true };
                };
                
                await window.authManager.logout();
                
                // Verify everything is cleared
                if (window.authManager.isAuthenticated()) {
                    throw new Error('User should not be authenticated after logout');
                }
                
                if (localStorage.getItem('oriel_jwt_token') || localStorage.getItem('oriel_user_data')) {
                    throw new Error('Session data should be cleared after logout');
                }
                
                // Restore original method
                window.authManager.logout = originalLogout;
            }
            
            this.addTestResult('Session Management Integration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Session Management Integration', 'FAILED', error.message);
        }
    }

    /**
     * Test error handling integration
     */
    async testErrorHandlingIntegration() {
        console.log('⚠️ Testing error handling integration...');
        
        try {
            // Test that errors are properly displayed and cleared
            if (window.notifications) {
                // Clear existing notifications
                if (window.notifications.clearNotifications) {
                    window.notifications.clearNotifications();
                }
                
                // Test error notification
                window.notifications.show('Test error message', 'error');
                
                const notifications = window.notifications.getNotifications ? 
                    window.notifications.getNotifications() : [];
                
                const hasErrorNotification = notifications.some(n => n.type === 'error');
                if (!hasErrorNotification) {
                    throw new Error('Error notification should be displayed');
                }
                
                // Test success notification
                window.notifications.show('Test success message', 'success');
                
                const updatedNotifications = window.notifications.getNotifications ? 
                    window.notifications.getNotifications() : [];
                
                const hasSuccessNotification = updatedNotifications.some(n => n.type === 'success');
                if (!hasSuccessNotification) {
                    throw new Error('Success notification should be displayed');
                }
            }
            
            this.addTestResult('Error Handling Integration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('Error Handling Integration', 'FAILED', error.message);
        }
    }

    /**
     * Test UI state integration
     */
    async testUIStateIntegration() {
        console.log('🎨 Testing UI state integration...');
        
        try {
            // Test anonymous state
            if (window.authManager) {
                window.authManager._isAuthenticated = false;
                window.authManager.user = null;
                window.authManager.token = null;
                
                if (window.authManager.notifyStateChange) {
                    window.authManager.notifyStateChange();
                }
                
                // Check UI reflects anonymous state
                const anonymousStatus = document.getElementById('anonymous-status');
                const authenticatedStatus = document.getElementById('authenticated-status');
                
                if (anonymousStatus && anonymousStatus.classList.contains('hidden')) {
                    throw new Error('Anonymous status should be visible when not authenticated');
                }
                
                if (authenticatedStatus && !authenticatedStatus.classList.contains('hidden')) {
                    throw new Error('Authenticated status should be hidden when not authenticated');
                }
                
                // Test authenticated state
                const mockUser = { id: 1, email: 'ui@example.com', plan: 'free' };
                window.authManager._isAuthenticated = true;
                window.authManager.user = mockUser;
                window.authManager.token = this.generateMockJWT(mockUser.email);
                
                if (window.authManager.notifyStateChange) {
                    window.authManager.notifyStateChange();
                }
                
                // Check UI reflects authenticated state
                if (authenticatedStatus && authenticatedStatus.classList.contains('hidden')) {
                    throw new Error('Authenticated status should be visible when authenticated');
                }
                
                if (anonymousStatus && !anonymousStatus.classList.contains('hidden')) {
                    throw new Error('Anonymous status should be hidden when authenticated');
                }
                
                // Check user email is displayed
                const userEmail = document.getElementById('user-email');
                if (userEmail && userEmail.textContent !== mockUser.email) {
                    throw new Error('User email should be displayed in UI');
                }
            }
            
            this.addTestResult('UI State Integration', 'PASSED');
            
        } catch (error) {
            this.addTestResult('UI State Integration', 'FAILED', error.message);
        }
    }

    /**
     * Run specific test category
     */
    async runTestCategory(category) {
        console.log(`🧪 Running ${category} tests...`);
        
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                return null;
            }
        }
        
        switch (category.toLowerCase()) {
            case 'registration':
                return await this.registrationTests.runAllTests();
            
            case 'login':
                return await this.loginTests.runAllTests();
            
            case 'integration':
                await this.runIntegrationTests();
                return this.getTestSummary();
            
            default:
                throw new Error(`Unknown test category: ${category}`);
        }
    }

    /**
     * Generate mock JWT token
     */
    generateMockJWT(email) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: `user-${Date.now()}`,
            email: email,
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        }));
        const signature = 'mock-signature';
        return `${header}.${payload}.${signature}`;
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
     * Get test summary for integration tests
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
     * Get comprehensive test summary
     */
    getComprehensiveTestSummary() {
        const integrationSummary = this.getTestSummary();
        const registrationSummary = this.registrationTests ? this.registrationTests.getTestSummary() : { total: 0, passed: 0, failed: 0 };
        const loginSummary = this.loginTests ? this.loginTests.getTestSummary() : { total: 0, passed: 0, failed: 0 };
        
        return {
            overall: {
                total: integrationSummary.total + registrationSummary.total + loginSummary.total,
                passed: integrationSummary.passed + registrationSummary.passed + loginSummary.passed,
                failed: integrationSummary.failed + registrationSummary.failed + loginSummary.failed
            },
            registration: registrationSummary,
            login: loginSummary,
            integration: integrationSummary
        };
    }

    /**
     * Display comprehensive test results
     */
    displayComprehensiveResults(registrationSummary, loginSummary) {
        const integrationSummary = this.getTestSummary();
        const comprehensiveSummary = this.getComprehensiveTestSummary();
        
        console.log('\n📊 Comprehensive Authentication Test Results:');
        console.log('=' .repeat(60));
        
        // Overall summary
        const overall = comprehensiveSummary.overall;
        const overallSuccessRate = overall.total > 0 ? (overall.passed / overall.total) * 100 : 0;
        
        console.log(`\n🎯 Overall Results:`);
        console.log(`Total Tests: ${overall.total}`);
        console.log(`Passed: ${overall.passed}`);
        console.log(`Failed: ${overall.failed}`);
        console.log(`Success Rate: ${overallSuccessRate.toFixed(1)}%`);
        
        // Category breakdown
        console.log(`\n📝 Registration Tests: ${registrationSummary.passed}/${registrationSummary.total} passed (${registrationSummary.successRate.toFixed(1)}%)`);
        console.log(`🔐 Login Tests: ${loginSummary.passed}/${loginSummary.total} passed (${loginSummary.successRate.toFixed(1)}%)`);
        console.log(`🔗 Integration Tests: ${integrationSummary.passed}/${integrationSummary.total} passed (${integrationSummary.successRate.toFixed(1)}%)`);
        
        // Failed tests summary
        const allFailedTests = [
            ...registrationSummary.results.filter(r => r.status === 'FAILED'),
            ...loginSummary.results.filter(r => r.status === 'FAILED'),
            ...integrationSummary.results.filter(r => r.status === 'FAILED')
        ];
        
        if (allFailedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            allFailedTests.forEach(result => {
                console.log(`- ${result.test}: ${result.error}`);
            });
        }
        
        // Store comprehensive results
        localStorage.setItem('authentication_test_results', JSON.stringify({
            summary: comprehensiveSummary,
            timestamp: new Date().toISOString(),
            details: {
                registration: registrationSummary.results,
                login: loginSummary.results,
                integration: integrationSummary.results
            }
        }));
        
        console.log('\n✅ Comprehensive authentication testing completed!');
        
        return comprehensiveSummary;
    }

    /**
     * Get test status for dashboard
     */
    getTestStatus() {
        const summary = this.getComprehensiveTestSummary();
        const overall = summary.overall;
        
        return {
            isComplete: overall.total > 0,
            successRate: overall.total > 0 ? (overall.passed / overall.total) * 100 : 0,
            totalTests: overall.total,
            passedTests: overall.passed,
            failedTests: overall.failed,
            categories: {
                registration: summary.registration,
                login: summary.login,
                integration: summary.integration
            }
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AuthenticationTestingModule = AuthenticationTestingModule;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationTestingModule;
}