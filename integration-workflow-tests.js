/**
 * Integration Tests for Complete User Workflows
 * 
 * This module provides comprehensive integration testing for complete user workflows
 * including registration, login, and download processes as specified in requirements
 * 1.1, 2.1, and 3.1.
 */

class IntegrationWorkflowTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.testStartTime = null;
        this.baseUrl = 'http://localhost:3000';
        this.apiUrl = 'http://localhost:8000';
        this.testUser = {
            email: `test_${Date.now()}@example.com`,
            password: 'TestPassword123!',
            confirmPassword: 'TestPassword123!'
        };
    }

    /**
     * Initialize test environment and verify server connectivity
     */
    async initialize() {
        console.log('🔧 Initializing Integration Workflow Tests...');
        
        try {
            // Check frontend server
            const frontendResponse = await fetch(this.baseUrl);
            if (!frontendResponse.ok) {
                throw new Error(`Frontend server not accessible at ${this.baseUrl}`);
            }

            // Check backend server
            const backendResponse = await fetch(`${this.apiUrl}/health`);
            if (!backendResponse.ok) {
                throw new Error(`Backend server not accessible at ${this.apiUrl}`);
            }

            console.log('✅ Server connectivity verified');
            return true;
        } catch (error) {
            console.error('❌ Server connectivity failed:', error.message);
            return false;
        }
    }

    /**
     * Start a new test with timing and logging
     */
    startTest(testName) {
        this.currentTest = testName;
        this.testStartTime = Date.now();
        console.log(`\n🧪 Starting test: ${testName}`);
    }

    /**
     * End current test and record results
     */
    endTest(passed, error = null) {
        const duration = Date.now() - this.testStartTime;
        const result = {
            testName: this.currentTest,
            passed,
            duration,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };

        this.testResults.push(result);
        
        if (passed) {
            console.log(`✅ ${this.currentTest} - PASSED (${duration}ms)`);
        } else {
            console.log(`❌ ${this.currentTest} - FAILED (${duration}ms)`);
            if (error) console.log(`   Error: ${error.message}`);
        }
    }

    /**
     * Test complete user registration workflow
     * Requirement 1.1: Registration flow with validation and success handling
     */
    async testCompleteRegistrationWorkflow() {
        this.startTest('Complete User Registration Workflow');
        
        try {
            // Step 1: Navigate to registration
            console.log('  📝 Step 1: Opening registration modal...');
            
            // Simulate clicking create account button
            const createAccountBtn = document.querySelector('[data-testid="create-account-btn"]') || 
                                   document.querySelector('.create-account') ||
                                   document.querySelector('#createAccountBtn');
            
            if (!createAccountBtn) {
                throw new Error('Create account button not found');
            }

            // Step 2: Fill registration form
            console.log('  📝 Step 2: Filling registration form...');
            
            const emailField = document.querySelector('#email') || 
                             document.querySelector('[name="email"]') ||
                             document.querySelector('.email-input');
            
            const passwordField = document.querySelector('#password') || 
                                document.querySelector('[name="password"]') ||
                                document.querySelector('.password-input');
            
            const confirmPasswordField = document.querySelector('#confirmPassword') || 
                                       document.querySelector('[name="confirmPassword"]') ||
                                       document.querySelector('.confirm-password-input');

            if (!emailField || !passwordField) {
                throw new Error('Registration form fields not found');
            }

            // Fill form with test data
            emailField.value = this.testUser.email;
            passwordField.value = this.testUser.password;
            if (confirmPasswordField) {
                confirmPasswordField.value = this.testUser.confirmPassword;
            }

            // Trigger input events
            emailField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            if (confirmPasswordField) {
                confirmPasswordField.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Step 3: Submit registration
            console.log('  📝 Step 3: Submitting registration...');
            
            const submitBtn = document.querySelector('[type="submit"]') || 
                            document.querySelector('.submit-btn') ||
                            document.querySelector('#submitRegistration');

            if (!submitBtn) {
                throw new Error('Submit button not found');
            }

            // Monitor for success/error responses
            let registrationComplete = false;
            let registrationError = null;

            // Set up response monitoring
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const response = await originalFetch(...args);
                
                if (args[0].includes('/register') || args[0].includes('/signup')) {
                    if (response.ok) {
                        registrationComplete = true;
                        console.log('  ✅ Registration API call successful');
                    } else {
                        registrationError = new Error(`Registration failed with status ${response.status}`);
                    }
                }
                
                return response;
            };

            // Submit form
            submitBtn.click();

            // Wait for registration to complete
            await this.waitForCondition(() => registrationComplete || registrationError, 10000);

            // Restore original fetch
            window.fetch = originalFetch;

            if (registrationError) {
                throw registrationError;
            }

            if (!registrationComplete) {
                throw new Error('Registration did not complete within timeout');
            }

            // Step 4: Verify successful registration
            console.log('  📝 Step 4: Verifying successful registration...');
            
            // Check for success indicators
            const successMessage = document.querySelector('.success-message') ||
                                 document.querySelector('.alert-success') ||
                                 document.querySelector('[data-testid="success-message"]');

            // Check if redirected to main interface
            const isOnMainInterface = window.location.pathname === '/' || 
                                    window.location.pathname.includes('dashboard') ||
                                    document.querySelector('.main-interface') ||
                                    document.querySelector('#audioVisualizer');

            if (!successMessage && !isOnMainInterface) {
                throw new Error('No success indication found after registration');
            }

            console.log('  ✅ Registration workflow completed successfully');
            this.endTest(true);
            return true;

        } catch (error) {
            this.endTest(false, error);
            return false;
        }
    }

    /**
     * Test complete user login workflow
     * Requirement 2.1: Login flow with authentication and session management
     */
    async testCompleteLoginWorkflow() {
        this.startTest('Complete User Login Workflow');
        
        try {
            // Step 1: Navigate to login
            console.log('  🔐 Step 1: Opening login interface...');
            
            // Look for login button or form
            const loginBtn = document.querySelector('[data-testid="login-btn"]') || 
                           document.querySelector('.login-btn') ||
                           document.querySelector('#loginBtn');
            
            const loginForm = document.querySelector('#loginForm') ||
                            document.querySelector('.login-form') ||
                            document.querySelector('[data-testid="login-form"]');

            if (!loginBtn && !loginForm) {
                throw new Error('Login interface not found');
            }

            if (loginBtn) {
                loginBtn.click();
                await this.wait(500); // Wait for modal/form to appear
            }

            // Step 2: Fill login credentials
            console.log('  🔐 Step 2: Entering login credentials...');
            
            const emailField = document.querySelector('#loginEmail') || 
                             document.querySelector('[name="email"]') ||
                             document.querySelector('.login-email');
            
            const passwordField = document.querySelector('#loginPassword') || 
                                document.querySelector('[name="password"]') ||
                                document.querySelector('.login-password');

            if (!emailField || !passwordField) {
                throw new Error('Login form fields not found');
            }

            // Use the test user credentials
            emailField.value = this.testUser.email;
            passwordField.value = this.testUser.password;

            // Trigger input events
            emailField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));

            // Step 3: Submit login
            console.log('  🔐 Step 3: Submitting login...');
            
            const submitBtn = document.querySelector('#loginSubmit') || 
                            document.querySelector('.login-submit') ||
                            document.querySelector('[type="submit"]');

            if (!submitBtn) {
                throw new Error('Login submit button not found');
            }

            // Monitor for login response
            let loginComplete = false;
            let loginError = null;

            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const response = await originalFetch(...args);
                
                if (args[0].includes('/login') || args[0].includes('/auth')) {
                    if (response.ok) {
                        loginComplete = true;
                        console.log('  ✅ Login API call successful');
                    } else {
                        loginError = new Error(`Login failed with status ${response.status}`);
                    }
                }
                
                return response;
            };

            // Submit login
            submitBtn.click();

            // Wait for login to complete
            await this.waitForCondition(() => loginComplete || loginError, 10000);

            // Restore original fetch
            window.fetch = originalFetch;

            if (loginError) {
                throw loginError;
            }

            if (!loginComplete) {
                throw new Error('Login did not complete within timeout');
            }

            // Step 4: Verify successful authentication
            console.log('  🔐 Step 4: Verifying authentication...');
            
            // Check for authenticated state indicators
            const userMenu = document.querySelector('.user-menu') ||
                           document.querySelector('.profile-menu') ||
                           document.querySelector('[data-testid="user-menu"]');

            const logoutBtn = document.querySelector('.logout-btn') ||
                            document.querySelector('#logoutBtn') ||
                            document.querySelector('[data-testid="logout-btn"]');

            const mainInterface = document.querySelector('.main-interface') ||
                                document.querySelector('#audioVisualizer') ||
                                document.querySelector('.dashboard');

            if (!userMenu && !logoutBtn && !mainInterface) {
                throw new Error('No authenticated state indicators found');
            }

            // Step 5: Test session persistence
            console.log('  🔐 Step 5: Testing session persistence...');
            
            // Store current URL
            const currentUrl = window.location.href;
            
            // Refresh page
            window.location.reload();
            
            // Wait for page to reload
            await this.wait(2000);
            
            // Check if still authenticated after refresh
            const stillAuthenticated = document.querySelector('.user-menu') ||
                                     document.querySelector('.logout-btn') ||
                                     document.querySelector('.main-interface');

            if (!stillAuthenticated) {
                throw new Error('Session not persisted after page refresh');
            }

            console.log('  ✅ Login workflow completed successfully');
            this.endTest(true);
            return true;

        } catch (error) {
            this.endTest(false, error);
            return false;
        }
    }

    /**
     * Test complete download workflow
     * Requirement 3.1: Download flow with format selection and file generation
     */
    async testCompleteDownloadWorkflow() {
        this.startTest('Complete Download Workflow');
        
        try {
            // Step 1: Ensure user is authenticated and on main interface
            console.log('  📥 Step 1: Verifying authenticated state...');
            
            const mainInterface = document.querySelector('.main-interface') ||
                                document.querySelector('#audioVisualizer') ||
                                document.querySelector('.visualizer-container');

            if (!mainInterface) {
                throw new Error('Main interface not accessible - user may not be authenticated');
            }

            // Step 2: Locate download button
            console.log('  📥 Step 2: Locating download button...');
            
            const downloadBtn = document.querySelector('.download-btn') ||
                              document.querySelector('#downloadBtn') ||
                              document.querySelector('[data-testid="download-btn"]') ||
                              document.querySelector('.btn-download');

            if (!downloadBtn) {
                throw new Error('Download button not found');
            }

            // Step 3: Click download button and verify modal interception
            console.log('  📥 Step 3: Testing download modal interception...');
            
            let modalOpened = false;
            
            // Monitor for modal appearance
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && (
                                node.classList.contains('download-modal') ||
                                node.classList.contains('format-modal') ||
                                node.id === 'downloadModal'
                            )) {
                                modalOpened = true;
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Click download button
            downloadBtn.click();

            // Wait for modal to appear
            await this.waitForCondition(() => modalOpened, 5000);

            observer.disconnect();

            if (!modalOpened) {
                // Check if modal is already present
                const existingModal = document.querySelector('.download-modal') ||
                                    document.querySelector('.format-modal') ||
                                    document.querySelector('#downloadModal');
                
                if (!existingModal) {
                    throw new Error('Download modal did not appear after clicking download button');
                }
            }

            // Step 4: Test format selection
            console.log('  📥 Step 4: Testing format selection...');
            
            const modal = document.querySelector('.download-modal') ||
                         document.querySelector('.format-modal') ||
                         document.querySelector('#downloadModal');

            if (!modal) {
                throw new Error('Download modal not found');
            }

            // Look for format options
            const mp4Option = modal.querySelector('[data-format="mp4"]') ||
                            modal.querySelector('.format-mp4') ||
                            modal.querySelector('#mp4Option');

            const movOption = modal.querySelector('[data-format="mov"]') ||
                            modal.querySelector('.format-mov') ||
                            modal.querySelector('#movOption');

            if (!mp4Option && !movOption) {
                throw new Error('Format options not found in download modal');
            }

            // Step 5: Test MP4 download
            console.log('  📥 Step 5: Testing MP4 download...');
            
            let downloadStarted = false;
            let downloadError = null;

            // Monitor for download API calls
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const response = await originalFetch(...args);
                
                if (args[0].includes('/download') || args[0].includes('/render')) {
                    if (response.ok) {
                        downloadStarted = true;
                        console.log('  ✅ Download API call successful');
                    } else {
                        downloadError = new Error(`Download failed with status ${response.status}`);
                    }
                }
                
                return response;
            };

            // Select MP4 format
            if (mp4Option) {
                mp4Option.click();
            }

            // Look for download/generate button
            const generateBtn = modal.querySelector('.generate-btn') ||
                              modal.querySelector('.download-generate') ||
                              modal.querySelector('#generateBtn');

            if (generateBtn) {
                generateBtn.click();
            }

            // Wait for download to start
            await this.waitForCondition(() => downloadStarted || downloadError, 15000);

            // Restore original fetch
            window.fetch = originalFetch;

            if (downloadError) {
                throw downloadError;
            }

            if (!downloadStarted) {
                throw new Error('Download did not start within timeout');
            }

            // Step 6: Verify progress indication
            console.log('  📥 Step 6: Verifying progress indication...');
            
            const progressIndicator = document.querySelector('.progress-bar') ||
                                    document.querySelector('.loading-spinner') ||
                                    document.querySelector('.download-progress') ||
                                    document.querySelector('[data-testid="progress"]');

            if (!progressIndicator) {
                console.log('  ⚠️  Progress indicator not found (may be optional)');
            } else {
                console.log('  ✅ Progress indicator found');
            }

            // Step 7: Test modal cancellation
            console.log('  📥 Step 7: Testing modal cancellation...');
            
            const cancelBtn = modal.querySelector('.cancel-btn') ||
                            modal.querySelector('.close-btn') ||
                            modal.querySelector('#cancelBtn') ||
                            modal.querySelector('.btn-cancel');

            if (cancelBtn) {
                cancelBtn.click();
                
                // Wait for modal to close
                await this.wait(1000);
                
                const modalStillVisible = document.querySelector('.download-modal:not([style*="display: none"])') ||
                                        document.querySelector('.format-modal:not([style*="display: none"])');
                
                if (modalStillVisible && modalStillVisible.offsetParent !== null) {
                    throw new Error('Modal did not close after clicking cancel');
                }
                
                console.log('  ✅ Modal cancellation working correctly');
            } else {
                console.log('  ⚠️  Cancel button not found (may be optional)');
            }

            console.log('  ✅ Download workflow completed successfully');
            this.endTest(true);
            return true;

        } catch (error) {
            this.endTest(false, error);
            return false;
        }
    }

    /**
     * Run all integration workflow tests
     */
    async runAllWorkflowTests() {
        console.log('🚀 Starting Complete Integration Workflow Tests');
        console.log('=' .repeat(60));

        // Initialize test environment
        const initialized = await this.initialize();
        if (!initialized) {
            console.log('❌ Test initialization failed - aborting tests');
            return false;
        }

        const tests = [
            () => this.testCompleteRegistrationWorkflow(),
            () => this.testCompleteLoginWorkflow(),
            () => this.testCompleteDownloadWorkflow()
        ];

        let allPassed = true;

        for (const test of tests) {
            try {
                const result = await test();
                if (!result) {
                    allPassed = false;
                }
            } catch (error) {
                console.error('❌ Test execution error:', error);
                allPassed = false;
            }
            
            // Wait between tests
            await this.wait(1000);
        }

        // Generate final report
        this.generateTestReport();

        return allPassed;
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n📊 Integration Workflow Test Report');
        console.log('=' .repeat(60));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`Total Duration: ${totalDuration}ms`);

        console.log('\nDetailed Results:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status} ${result.testName} (${result.duration}ms)`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
        });

        if (failedTests > 0) {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
        } else {
            console.log('\n🎉 All integration workflow tests passed!');
        }
    }

    /**
     * Utility function to wait for a condition
     */
    async waitForCondition(condition, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (condition()) {
                return true;
            }
            await this.wait(100);
        }
        
        throw new Error(`Condition not met within ${timeout}ms timeout`);
    }

    /**
     * Utility function to wait for specified time
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegrationWorkflowTester;
}

// Auto-run if loaded directly in browser
if (typeof window !== 'undefined') {
    window.IntegrationWorkflowTester = IntegrationWorkflowTester;
    
    // Add convenience function to run tests
    window.runIntegrationWorkflowTests = async function() {
        const tester = new IntegrationWorkflowTester();
        return await tester.runAllWorkflowTests();
    };
}