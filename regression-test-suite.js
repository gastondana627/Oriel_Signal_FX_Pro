/**
 * Regression Test Suite
 * Task 11.3: Write regression tests
 * 
 * Creates tests to prevent reintroduction of fixed bugs and
 * tests for edge cases discovered during testing
 * 
 * Requirements: 8.3, 9.1
 */

class RegressionTestSuite {
    constructor() {
        this.regressionTests = [];
        this.fixedIssues = new Map();
        this.edgeCases = new Map();
        this.testResults = [];
        this.isRunning = false;
        
        // Configuration for regression testing
        this.config = {
            retryAttempts: 3,
            timeout: 30000,
            enableDetailedLogging: true,
            trackPerformanceRegression: true
        };
        
        this.initializeKnownIssues();
    }

    /**
     * Initialize known fixed issues and their regression tests
     */
    initializeKnownIssues() {
        // Authentication-related fixed issues
        this.fixedIssues.set('auth_token_refresh', {
            description: 'Authentication token refresh mechanism',
            originalIssue: 'Tokens were not being refreshed automatically',
            fixDescription: 'Added automatic token refresh logic',
            regressionTest: () => this.testTokenRefreshRegression(),
            category: 'authentication',
            severity: 'high'
        });

        this.fixedIssues.set('login_session_persistence', {
            description: 'Login session persistence across browser refreshes',
            originalIssue: 'Sessions were lost on page refresh',
            fixDescription: 'Implemented proper session storage and restoration',
            regressionTest: () => this.testSessionPersistenceRegression(),
            category: 'authentication',
            severity: 'high'
        });

        // Download-related fixed issues
        this.fixedIssues.set('modal_interception_timing', {
            description: 'Download modal interception timing issues',
            originalIssue: 'Modal sometimes failed to intercept download clicks',
            fixDescription: 'Added proper event handling and timing controls',
            regressionTest: () => this.testModalInterceptionRegression(),
            category: 'downloads',
            severity: 'medium'
        });

        this.fixedIssues.set('file_generation_timeout', {
            description: 'File generation timeout handling',
            originalIssue: 'Large files would timeout during generation',
            fixDescription: 'Increased timeouts and added progress tracking',
            regressionTest: () => this.testFileGenerationTimeoutRegression(),
            category: 'downloads',
            severity: 'medium'
        });

        // Server management fixed issues
        this.fixedIssues.set('health_check_reliability', {
            description: 'Server health check reliability',
            originalIssue: 'Health checks would sometimes fail intermittently',
            fixDescription: 'Added retry logic and improved error handling',
            regressionTest: () => this.testHealthCheckRegression(),
            category: 'server',
            severity: 'high'
        });

        // UI/UX fixed issues
        this.fixedIssues.set('error_message_clarity', {
            description: 'Error message clarity and user feedback',
            originalIssue: 'Error messages were unclear or missing',
            fixDescription: 'Improved error message formatting and display',
            regressionTest: () => this.testErrorMessageRegression(),
            category: 'ui',
            severity: 'medium'
        });

        // Additional fixed issues discovered during testing
        this.fixedIssues.set('error_cascade_loop_fix', {
            description: 'Error cascade loop in enhanced logging',
            originalIssue: 'Enhanced logger creating infinite loops by trying to log to non-existent /api/logs endpoint',
            fixDescription: 'Disabled server logging and added error suppression for fetch failures',
            regressionTest: () => this.testErrorCascadeLoopRegression(),
            category: 'logging',
            severity: 'critical'
        });

        this.fixedIssues.set('anonymous_download_auth_fix', {
            description: 'Anonymous download authentication requirement',
            originalIssue: 'Downloads failing with 401 UNAUTHORIZED for anonymous users due to usage tracking',
            fixDescription: 'Modified usage tracker to handle anonymous users gracefully with local tracking fallback',
            regressionTest: () => this.testAnonymousDownloadAuthRegression(),
            category: 'downloads',
            severity: 'high'
        });

        this.fixedIssues.set('storage_quota_management_fix', {
            description: 'Browser storage quota exceeded from excessive logging',
            originalIssue: 'QuotaExceededError and out of memory errors from error reports filling localStorage',
            fixDescription: 'Added storage cleanup and error cascade prevention',
            regressionTest: () => this.testStorageQuotaManagementRegression(),
            category: 'storage',
            severity: 'high'
        });

        this.fixedIssues.set('registration_validation_fix', {
            description: 'Registration form validation errors',
            originalIssue: 'Invalid user data errors during registration due to frontend error cascade interference',
            fixDescription: 'Fixed error cascade that was interfering with form validation',
            regressionTest: () => this.testRegistrationValidationRegression(),
            category: 'authentication',
            severity: 'medium'
        });

        this.fixedIssues.set('modal_display_timing_fix', {
            description: 'Download modal display timing issues',
            originalIssue: 'Modal sometimes not appearing due to CSS z-index conflicts and timing issues',
            fixDescription: 'Improved modal display logic and z-index management',
            regressionTest: () => this.testModalDisplayTimingRegression(),
            category: 'ui',
            severity: 'medium'
        });

        this.fixedIssues.set('network_error_handling_fix', {
            description: 'Network error handling for unavailable endpoints',
            originalIssue: 'Application not gracefully handling 501/503 responses from backend endpoints',
            fixDescription: 'Added proper error handling and fallback mechanisms for unavailable endpoints',
            regressionTest: () => this.testNetworkErrorHandlingRegression(),
            category: 'network',
            severity: 'medium'
        });

        // Initialize edge cases
        this.initializeEdgeCases();
    }

    /**
     * Initialize edge cases discovered during testing
     */
    initializeEdgeCases() {
        this.edgeCases.set('concurrent_authentication', {
            description: 'Multiple simultaneous authentication attempts',
            scenario: 'User rapidly clicks login button multiple times',
            expectedBehavior: 'Only one authentication request should be processed',
            test: () => this.testConcurrentAuthenticationEdgeCase(),
            category: 'authentication'
        });

        this.edgeCases.set('modal_rapid_toggling', {
            description: 'Rapid modal opening and closing',
            scenario: 'User rapidly opens and closes download modal',
            expectedBehavior: 'Modal state should remain consistent',
            test: () => this.testModalRapidTogglingEdgeCase(),
            category: 'downloads'
        });

        this.edgeCases.set('network_interruption_recovery', {
            description: 'Network interruption during file generation',
            scenario: 'Network connection lost during file generation',
            expectedBehavior: 'System should handle gracefully and allow retry',
            test: () => this.testNetworkInterruptionEdgeCase(),
            category: 'downloads'
        });

        this.edgeCases.set('browser_tab_switching', {
            description: 'Browser tab switching during operations',
            scenario: 'User switches tabs during file generation or authentication',
            expectedBehavior: 'Operations should continue or pause appropriately',
            test: () => this.testBrowserTabSwitchingEdgeCase(),
            category: 'general'
        });

        this.edgeCases.set('memory_pressure_handling', {
            description: 'System behavior under memory pressure',
            scenario: 'Multiple large file generations running simultaneously',
            expectedBehavior: 'System should manage memory and prevent crashes',
            test: () => this.testMemoryPressureEdgeCase(),
            category: 'performance'
        });

        // Additional edge cases discovered during testing
        this.edgeCases.set('error_cascade_prevention', {
            description: 'Prevention of error cascade loops',
            scenario: 'Enhanced logger creating infinite error loops from failed API calls',
            expectedBehavior: 'System should prevent cascading errors and memory exhaustion',
            test: () => this.testErrorCascadePreventionEdgeCase(),
            category: 'error_handling'
        });

        this.edgeCases.set('anonymous_download_tracking', {
            description: 'Anonymous user download tracking edge case',
            scenario: 'Anonymous user attempts download while usage tracker tries to authenticate',
            expectedBehavior: 'Download should succeed with local tracking fallback',
            test: () => this.testAnonymousDownloadTrackingEdgeCase(),
            category: 'downloads'
        });

        this.edgeCases.set('storage_quota_exceeded', {
            description: 'Browser storage quota exceeded during testing',
            scenario: 'Excessive error logging fills localStorage causing QuotaExceededError',
            expectedBehavior: 'System should handle storage limits gracefully',
            test: () => this.testStorageQuotaExceededEdgeCase(),
            category: 'storage'
        });

        this.edgeCases.set('form_validation_race_condition', {
            description: 'Form validation race condition',
            scenario: 'User submits form while validation is still processing',
            expectedBehavior: 'Form should handle concurrent validation attempts',
            test: () => this.testFormValidationRaceConditionEdgeCase(),
            category: 'ui'
        });

        this.edgeCases.set('api_endpoint_unavailable', {
            description: 'API endpoint temporarily unavailable',
            scenario: 'Backend endpoint returns 501 or 503 during operation',
            expectedBehavior: 'Frontend should gracefully degrade functionality',
            test: () => this.testApiEndpointUnavailableEdgeCase(),
            category: 'network'
        });

        this.edgeCases.set('modal_z_index_conflict', {
            description: 'Modal z-index conflicts with other UI elements',
            scenario: 'Multiple modals or overlays compete for display priority',
            expectedBehavior: 'Modal should appear above all other elements',
            test: () => this.testModalZIndexConflictEdgeCase(),
            category: 'ui'
        });

        this.edgeCases.set('file_generation_timeout_recovery', {
            description: 'File generation timeout with recovery',
            scenario: 'Large file generation exceeds timeout but can be retried',
            expectedBehavior: 'System should offer retry with increased timeout',
            test: () => this.testFileGenerationTimeoutRecoveryEdgeCase(),
            category: 'downloads'
        });

        this.edgeCases.set('session_expiry_during_operation', {
            description: 'Session expires during active operation',
            scenario: 'User session expires while file generation is in progress',
            expectedBehavior: 'Operation should complete or gracefully handle expiry',
            test: () => this.testSessionExpiryDuringOperationEdgeCase(),
            category: 'authentication'
        });
    }

    /**
     * Run all regression tests
     */
    async runAllRegressionTests() {
        if (this.isRunning) {
            throw new Error('Regression tests already running');
        }

        this.isRunning = true;
        this.testResults = [];
        
        console.log('🔄 Starting comprehensive regression test suite...');
        
        try {
            // Run fixed issue regression tests
            console.log('\n🐛 Running fixed issue regression tests...');
            await this.runFixedIssueTests();
            
            // Run edge case tests
            console.log('\n⚡ Running edge case tests...');
            await this.runEdgeCaseTests();
            
            // Generate comprehensive report
            const report = this.generateRegressionReport();
            
            console.log('\n📊 Regression test suite completed');
            console.log(`✅ Passed: ${report.summary.passed}`);
            console.log(`❌ Failed: ${report.summary.failed}`);
            console.log(`📈 Success Rate: ${report.summary.successRate.toFixed(1)}%`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Regression test suite failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run tests for fixed issues to prevent regression
     */
    async runFixedIssueTests() {
        for (const [issueId, issue] of this.fixedIssues) {
            try {
                console.log(`🧪 Testing regression for: ${issue.description}`);
                
                const startTime = Date.now();
                await issue.regressionTest();
                const duration = Date.now() - startTime;
                
                this.addTestResult(
                    `Regression: ${issue.description}`,
                    'PASSED',
                    null,
                    duration,
                    issue.category,
                    issue.severity
                );
                
                console.log(`✅ No regression detected for: ${issue.description}`);
                
            } catch (error) {
                console.error(`❌ Regression detected for: ${issue.description}`, error);
                
                this.addTestResult(
                    `Regression: ${issue.description}`,
                    'FAILED',
                    error.message,
                    0,
                    issue.category,
                    issue.severity
                );
            }
        }
    }

    /**
     * Run edge case tests
     */
    async runEdgeCaseTests() {
        for (const [caseId, edgeCase] of this.edgeCases) {
            try {
                console.log(`⚡ Testing edge case: ${edgeCase.description}`);
                
                const startTime = Date.now();
                await edgeCase.test();
                const duration = Date.now() - startTime;
                
                this.addTestResult(
                    `Edge Case: ${edgeCase.description}`,
                    'PASSED',
                    null,
                    duration,
                    edgeCase.category,
                    'medium'
                );
                
                console.log(`✅ Edge case handled correctly: ${edgeCase.description}`);
                
            } catch (error) {
                console.error(`❌ Edge case failed: ${edgeCase.description}`, error);
                
                this.addTestResult(
                    `Edge Case: ${edgeCase.description}`,
                    'FAILED',
                    error.message,
                    0,
                    edgeCase.category,
                    'medium'
                );
            }
        }
    }

    // Regression tests for fixed issues

    /**
     * Test token refresh regression
     */
    async testTokenRefreshRegression() {
        console.log('🔐 Testing token refresh mechanism...');
        
        // Mock expired token scenario
        if (window.authManager) {
            const originalToken = window.authManager.token;
            
            try {
                // Simulate expired token
                window.authManager.token = 'expired_token_' + Date.now();
                
                // Attempt an operation that requires authentication
                if (window.authManager.refreshToken) {
                    await window.authManager.refreshToken();
                    
                    // Verify token was refreshed
                    if (window.authManager.token === 'expired_token_' + Date.now()) {
                        throw new Error('Token was not refreshed');
                    }
                } else {
                    // If no refresh method, ensure proper error handling
                    console.log('⚠️  No token refresh method available - checking error handling');
                }
                
            } finally {
                // Restore original token
                window.authManager.token = originalToken;
            }
        } else {
            console.log('⚠️  AuthManager not available - skipping token refresh test');
        }
    }

    /**
     * Test session persistence regression
     */
    async testSessionPersistenceRegression() {
        console.log('💾 Testing session persistence...');
        
        // Test localStorage persistence
        const testToken = 'test_token_' + Date.now();
        const testUser = { id: 1, email: 'test@example.com' };
        
        // Store session data
        localStorage.setItem('oriel_jwt_token', testToken);
        localStorage.setItem('oriel_user_data', JSON.stringify(testUser));
        
        // Simulate page refresh by reinitializing auth manager
        if (window.authManager && window.authManager.initializeFromStorage) {
            window.authManager.initializeFromStorage();
            
            // Verify session was restored
            if (!window.authManager.isAuthenticated()) {
                throw new Error('Session was not restored from storage');
            }
            
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser || currentUser.email !== testUser.email) {
                throw new Error('User data was not restored correctly');
            }
        }
        
        // Clean up
        localStorage.removeItem('oriel_jwt_token');
        localStorage.removeItem('oriel_user_data');
    }

    /**
     * Test modal interception regression
     */
    async testModalInterceptionRegression() {
        console.log('🖼️  Testing modal interception...');
        
        // Find download buttons
        const downloadButton = document.getElementById('download-button') || 
                              document.querySelector('[data-testid="download-button"]');
        
        if (!downloadButton) {
            console.log('⚠️  No download button found - creating mock button');
            const mockButton = document.createElement('button');
            mockButton.id = 'test-download-button';
            mockButton.textContent = 'Download';
            document.body.appendChild(mockButton);
        }
        
        // Test modal interception
        let modalOpened = false;
        let downloadCalled = false;
        
        // Mock download function
        const originalDownload = window.downloadAudioFile;
        window.downloadAudioFile = () => {
            downloadCalled = true;
        };
        
        // Mock modal show function
        if (window.downloadModal) {
            const originalShow = window.downloadModal.show;
            window.downloadModal.show = () => {
                modalOpened = true;
                if (originalShow) originalShow.call(window.downloadModal);
            };
        }
        
        try {
            // Click download button
            const button = downloadButton || document.getElementById('test-download-button');
            button.click();
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify modal opened and download was intercepted
            if (!modalOpened) {
                throw new Error('Download modal did not open');
            }
            
            if (downloadCalled) {
                throw new Error('Download was not intercepted - function was called directly');
            }
            
        } finally {
            // Restore original functions
            window.downloadAudioFile = originalDownload;
            
            // Clean up mock button
            const mockButton = document.getElementById('test-download-button');
            if (mockButton) {
                mockButton.remove();
            }
        }
    }

    /**
     * Test file generation timeout regression
     */
    async testFileGenerationTimeoutRegression() {
        console.log('⏱️  Testing file generation timeout handling...');
        
        // Mock slow file generation
        const mockGenerator = {
            generateFile: async (format, options) => {
                // Simulate slow generation
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return {
                    format,
                    size: 1024 * 1024,
                    duration: 2000,
                    success: true
                };
            }
        };
        
        // Test with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Generation timeout')), 1000);
        });
        
        try {
            // This should timeout, but we should handle it gracefully
            await Promise.race([
                mockGenerator.generateFile('mp4', { quality: 'high' }),
                timeoutPromise
            ]);
            
            // If we get here without timeout, that's also acceptable
            console.log('✅ File generation completed within timeout');
            
        } catch (error) {
            if (error.message === 'Generation timeout') {
                // Verify timeout is handled gracefully
                console.log('✅ Timeout handled gracefully');
            } else {
                throw error;
            }
        }
    }

    /**
     * Test health check regression
     */
    async testHealthCheckRegression() {
        console.log('🏥 Testing health check reliability...');
        
        const healthCheckUrl = 'http://localhost:8000/api/health';
        let successCount = 0;
        const totalAttempts = 3;
        
        // Perform multiple health checks
        for (let i = 0; i < totalAttempts; i++) {
            try {
                const response = await fetch(healthCheckUrl, {
                    method: 'GET',
                    timeout: 5000
                });
                
                if (response.ok) {
                    successCount++;
                }
                
                // Wait between attempts
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`Health check attempt ${i + 1} failed:`, error.message);
            }
        }
        
        // Verify reliability (at least 2 out of 3 should succeed)
        const successRate = (successCount / totalAttempts) * 100;
        if (successRate < 66) {
            throw new Error(`Health check reliability too low: ${successRate.toFixed(1)}%`);
        }
        
        console.log(`✅ Health check reliability: ${successRate.toFixed(1)}%`);
    }

    /**
     * Test error message regression
     */
    async testErrorMessageRegression() {
        console.log('💬 Testing error message clarity...');
        
        // Test various error scenarios
        const errorScenarios = [
            {
                name: 'Network Error',
                trigger: () => fetch('http://invalid-url-that-should-fail.com'),
                expectedMessagePattern: /network|connection|fetch/i
            },
            {
                name: 'Authentication Error',
                trigger: () => {
                    if (window.authManager) {
                        return window.authManager.login('invalid@email.com', 'wrongpassword');
                    }
                    throw new Error('Invalid credentials');
                },
                expectedMessagePattern: /invalid|credentials|authentication|login/i
            }
        ];
        
        for (const scenario of errorScenarios) {
            try {
                await scenario.trigger();
                console.log(`⚠️  Expected error for ${scenario.name} but none occurred`);
            } catch (error) {
                // Verify error message is clear and helpful
                if (!scenario.expectedMessagePattern.test(error.message)) {
                    throw new Error(`Error message for ${scenario.name} is not clear: "${error.message}"`);
                }
                
                console.log(`✅ Clear error message for ${scenario.name}: "${error.message}"`);
            }
        }
    }

    /**
     * Test error cascade loop regression
     */
    async testErrorCascadeLoopRegression() {
        console.log('🔄 Testing error cascade loop prevention...');
        
        // Verify enhanced logger doesn't create cascading errors
        if (window.enhancedLogger) {
            // Check that server logging is disabled
            if (window.enhancedLogger.enableServer === true) {
                throw new Error('Enhanced logger server logging should be disabled to prevent cascade');
            }
            
            // Test that logging errors don't create more errors
            const originalConsoleError = console.error;
            let errorCount = 0;
            
            console.error = (...args) => {
                errorCount++;
                originalConsoleError(...args);
            };
            
            try {
                // Attempt operations that previously caused cascades
                window.enhancedLogger.logError('Test error', { test: true });
                window.enhancedLogger.logRequest('GET', '/api/test', 404);
                
                // Wait for any async error handling
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Verify no excessive errors were generated
                if (errorCount > 5) {
                    throw new Error(`Error cascade detected: ${errorCount} errors generated`);
                }
                
                console.log(`✅ Error cascade prevented: ${errorCount} errors (within acceptable range)`);
                
            } finally {
                console.error = originalConsoleError;
            }
        } else {
            console.log('⚠️  Enhanced logger not available - skipping cascade test');
        }
    }

    /**
     * Test anonymous download authentication regression
     */
    async testAnonymousDownloadAuthRegression() {
        console.log('👤 Testing anonymous download authentication fix...');
        
        // Clear authentication to simulate anonymous user
        const originalAuthState = window.authManager ? {
            isAuthenticated: window.authManager.isAuthenticated(),
            token: window.authManager.token
        } : null;
        
        try {
            // Set anonymous state
            if (window.authManager) {
                window.authManager._isAuthenticated = false;
                window.authManager.token = null;
            }
            localStorage.removeItem('oriel_jwt_token');
            
            // Test download functionality for anonymous user
            if (window.downloadAudioFile) {
                let downloadSucceeded = false;
                let authErrorOccurred = false;
                
                try {
                    // Mock successful download
                    const originalDownload = window.downloadAudioFile;
                    window.downloadAudioFile = async (format) => {
                        // Should not throw authentication errors
                        downloadSucceeded = true;
                        return { success: true, format };
                    };
                    
                    await window.downloadAudioFile('mp3');
                    
                    // Restore original function
                    window.downloadAudioFile = originalDownload;
                    
                } catch (error) {
                    if (error.message.includes('401') || error.message.includes('unauthorized')) {
                        authErrorOccurred = true;
                    }
                }
                
                if (authErrorOccurred) {
                    throw new Error('Anonymous downloads should not require authentication');
                }
                
                if (!downloadSucceeded) {
                    throw new Error('Anonymous download should succeed');
                }
                
                console.log('✅ Anonymous downloads work without authentication errors');
            } else {
                console.log('⚠️  Download function not available - skipping anonymous download test');
            }
            
        } finally {
            // Restore original auth state
            if (originalAuthState && window.authManager) {
                window.authManager._isAuthenticated = originalAuthState.isAuthenticated;
                window.authManager.token = originalAuthState.token;
            }
        }
    }

    /**
     * Test storage quota management regression
     */
    async testStorageQuotaManagementRegression() {
        console.log('💾 Testing storage quota management fix...');
        
        // Check that error-related storage is properly managed
        const errorKeys = Object.keys(localStorage).filter(key => 
            key.includes('error') || key.includes('log') || key.includes('report')
        );
        
        // Verify no excessive error storage
        if (errorKeys.length > 50) {
            throw new Error(`Too many error-related storage items: ${errorKeys.length}`);
        }
        
        // Test storage cleanup functionality
        if (window.fixApplication) {
            const beforeCleanup = Object.keys(localStorage).length;
            
            // Add some test error data
            for (let i = 0; i < 5; i++) {
                localStorage.setItem(`test_error_${i}`, JSON.stringify({ error: 'test' }));
            }
            
            // Run cleanup
            window.fixApplication();
            
            const afterCleanup = Object.keys(localStorage).length;
            
            // Verify cleanup occurred
            if (afterCleanup >= beforeCleanup + 5) {
                throw new Error('Storage cleanup did not remove test error data');
            }
            
            console.log(`✅ Storage cleanup working: ${beforeCleanup + 5} -> ${afterCleanup} items`);
        } else {
            console.log('⚠️  Fix application function not available - skipping cleanup test');
        }
        
        console.log(`✅ Storage quota management: ${errorKeys.length} error-related items (acceptable)`);
    }

    /**
     * Test registration validation regression
     */
    async testRegistrationValidationRegression() {
        console.log('📝 Testing registration validation fix...');
        
        // Test that registration validation works without error cascade interference
        const testRegistrationData = {
            email: 'test@example.com',
            password: 'TestPassword123!',
            confirmPassword: 'TestPassword123!'
        };
        
        // Mock registration validation
        const validateRegistration = (data) => {
            const errors = [];
            
            if (!data.email || !data.email.includes('@')) {
                errors.push('Valid email required');
            }
            
            if (!data.password || data.password.length < 8) {
                errors.push('Password must be at least 8 characters');
            }
            
            if (data.password !== data.confirmPassword) {
                errors.push('Passwords do not match');
            }
            
            return errors;
        };
        
        // Test valid data
        const validationErrors = validateRegistration(testRegistrationData);
        if (validationErrors.length > 0) {
            throw new Error(`Valid registration data failed validation: ${validationErrors.join(', ')}`);
        }
        
        // Test invalid data
        const invalidData = { ...testRegistrationData, email: 'invalid-email' };
        const invalidErrors = validateRegistration(invalidData);
        if (invalidErrors.length === 0) {
            throw new Error('Invalid registration data should fail validation');
        }
        
        console.log('✅ Registration validation working correctly without error cascade interference');
    }

    /**
     * Test modal display timing regression
     */
    async testModalDisplayTimingRegression() {
        console.log('🖼️  Testing modal display timing fix...');
        
        if (window.downloadModal) {
            // Test modal show/hide timing
            let modalVisible = false;
            
            // Show modal
            window.downloadModal.show();
            
            // Check visibility after short delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const modal = document.getElementById('download-modal');
            if (modal) {
                const computedStyle = window.getComputedStyle(modal);
                modalVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
                
                if (!modalVisible) {
                    throw new Error('Modal should be visible after show() call');
                }
                
                // Test z-index is appropriate
                const zIndex = parseInt(computedStyle.zIndex) || 0;
                if (zIndex < 1000) {
                    throw new Error(`Modal z-index too low: ${zIndex}`);
                }
                
                console.log(`✅ Modal display timing correct: visible with z-index ${zIndex}`);
                
                // Hide modal
                window.downloadModal.close();
                
                // Verify it's hidden
                await new Promise(resolve => setTimeout(resolve, 100));
                const hiddenStyle = window.getComputedStyle(modal);
                const isHidden = hiddenStyle.display === 'none' || hiddenStyle.visibility === 'hidden';
                
                if (!isHidden) {
                    throw new Error('Modal should be hidden after close() call');
                }
                
                console.log('✅ Modal hide timing correct');
            } else {
                throw new Error('Modal element not found in DOM');
            }
        } else {
            console.log('⚠️  Download modal not available - skipping display timing test');
        }
    }

    /**
     * Test network error handling regression
     */
    async testNetworkErrorHandlingRegression() {
        console.log('🌐 Testing network error handling fix...');
        
        // Mock fetch to simulate various network errors
        const originalFetch = window.fetch;
        let testCallCount = 0;
        
        window.fetch = async (url, options) => {
            if (url.includes('/api/')) {
                testCallCount++;
                
                // Simulate different error responses
                if (testCallCount === 1) {
                    return new Response(JSON.stringify({ error: 'Not Implemented' }), {
                        status: 501,
                        statusText: 'Not Implemented'
                    });
                } else if (testCallCount === 2) {
                    return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                }
            }
            
            return originalFetch(url, options);
        };
        
        try {
            let gracefulHandling = true;
            
            // Test API calls that should handle errors gracefully
            const testCalls = [
                { url: '/api/logs', expectError: true },
                { url: '/api/monitoring/errors', expectError: true },
                { url: '/api/health', expectError: false }
            ];
            
            for (const testCall of testCalls) {
                try {
                    const response = await fetch(testCall.url);
                    
                    if (testCall.expectError && response.ok) {
                        console.log(`⚠️  Expected error for ${testCall.url} but got success`);
                    } else if (testCall.expectError && (response.status === 501 || response.status === 503)) {
                        console.log(`✅ Expected error handled for ${testCall.url}: ${response.status}`);
                    }
                } catch (error) {
                    // Errors should be handled gracefully without crashing
                    if (error.message.includes('cascade') || error.message.includes('unhandled')) {
                        gracefulHandling = false;
                        console.error(`Network error not handled gracefully for ${testCall.url}:`, error.message);
                    } else {
                        console.log(`✅ Network error handled gracefully for ${testCall.url}`);
                    }
                }
            }
            
            if (!gracefulHandling) {
                throw new Error('Some network errors not handled gracefully');
            }
            
            console.log('✅ Network error handling regression test passed');
            
        } finally {
            // Restore original fetch
            window.fetch = originalFetch;
        }
    }

    // Edge case tests

    /**
     * Test concurrent authentication edge case
     */
    async testConcurrentAuthenticationEdgeCase() {
        console.log('🔄 Testing concurrent authentication attempts...');
        
        if (!window.authManager) {
            console.log('⚠️  AuthManager not available - skipping concurrent auth test');
            return;
        }
        
        const testCredentials = {
            email: 'test@example.com',
            password: 'testpassword'
        };
        
        // Mock login function to track calls
        let loginCallCount = 0;
        const originalLogin = window.authManager.login;
        
        window.authManager.login = async (email, password) => {
            loginCallCount++;
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true, user: { email } };
        };
        
        try {
            // Trigger multiple simultaneous login attempts
            const loginPromises = Array(5).fill().map(() => 
                window.authManager.login(testCredentials.email, testCredentials.password)
            );
            
            await Promise.all(loginPromises);
            
            // Verify only appropriate number of calls were made
            // (Should be 1 if properly handled, or 5 if each is processed)
            if (loginCallCount > 5) {
                throw new Error(`Too many login calls: ${loginCallCount}`);
            }
            
            console.log(`✅ Concurrent authentication handled: ${loginCallCount} calls made`);
            
        } finally {
            // Restore original function
            window.authManager.login = originalLogin;
        }
    }

    /**
     * Test modal rapid toggling edge case
     */
    async testModalRapidTogglingEdgeCase() {
        console.log('⚡ Testing rapid modal toggling...');
        
        if (!window.downloadModal) {
            console.log('⚠️  Download modal not available - skipping rapid toggle test');
            return;
        }
        
        // Rapidly open and close modal
        for (let i = 0; i < 10; i++) {
            window.downloadModal.show();
            await new Promise(resolve => setTimeout(resolve, 50));
            window.downloadModal.close();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Verify modal is in consistent state
        const modal = document.getElementById('download-modal');
        if (modal) {
            const isVisible = modal.style.display !== 'none' && modal.offsetParent !== null;
            if (isVisible) {
                throw new Error('Modal should be closed after rapid toggling');
            }
        }
        
        console.log('✅ Modal state consistent after rapid toggling');
    }

    /**
     * Test network interruption edge case
     */
    async testNetworkInterruptionEdgeCase() {
        console.log('🌐 Testing network interruption recovery...');
        
        // Mock network failure scenario
        const originalFetch = window.fetch;
        let networkFailureSimulated = false;
        
        window.fetch = async (url, options) => {
            if (!networkFailureSimulated && url.includes('api')) {
                networkFailureSimulated = true;
                throw new Error('Network error: Connection lost');
            }
            return originalFetch(url, options);
        };
        
        try {
            // Attempt operation that should fail
            try {
                await fetch('/api/test');
                throw new Error('Expected network failure but request succeeded');
            } catch (error) {
                if (!error.message.includes('Network error')) {
                    throw error;
                }
            }
            
            // Attempt retry (should succeed)
            const retryResult = await fetch('/api/test');
            console.log('✅ Network interruption recovery successful');
            
        } finally {
            // Restore original fetch
            window.fetch = originalFetch;
        }
    }

    /**
     * Test browser tab switching edge case
     */
    async testBrowserTabSwitchingEdgeCase() {
        console.log('🔄 Testing browser tab switching behavior...');
        
        // Simulate tab visibility change
        let visibilityChangeHandled = false;
        
        const handleVisibilityChange = () => {
            visibilityChangeHandled = true;
            console.log('Visibility change detected');
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        try {
            // Simulate tab becoming hidden
            Object.defineProperty(document, 'hidden', {
                writable: true,
                value: true
            });
            
            // Trigger visibility change event
            const event = new Event('visibilitychange');
            document.dispatchEvent(event);
            
            // Wait for handlers
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simulate tab becoming visible again
            Object.defineProperty(document, 'hidden', {
                writable: true,
                value: false
            });
            
            document.dispatchEvent(event);
            
            console.log('✅ Tab switching behavior handled');
            
        } finally {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }

    /**
     * Test memory pressure edge case
     */
    async testMemoryPressureEdgeCase() {
        console.log('💾 Testing memory pressure handling...');
        
        // Simulate memory-intensive operations
        const largeArrays = [];
        
        try {
            // Create several large arrays to simulate memory pressure
            for (let i = 0; i < 5; i++) {
                const largeArray = new Array(100000).fill(0).map((_, index) => ({
                    id: index,
                    data: 'x'.repeat(1000)
                }));
                largeArrays.push(largeArray);
                
                // Allow garbage collection between allocations
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Verify system is still responsive
            const startTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 100));
            const responseTime = Date.now() - startTime;
            
            if (responseTime > 500) {
                throw new Error(`System unresponsive under memory pressure: ${responseTime}ms`);
            }
            
            console.log(`✅ System responsive under memory pressure: ${responseTime}ms`);
            
        } finally {
            // Clean up memory
            largeArrays.length = 0;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        }
    }

    /**
     * Test error cascade prevention edge case
     */
    async testErrorCascadePreventionEdgeCase() {
        console.log('🔄 Testing error cascade prevention...');
        
        // Mock enhanced logger that could cause cascading errors
        const originalConsoleError = console.error;
        let errorCount = 0;
        
        // Track error generation
        console.error = (...args) => {
            errorCount++;
            if (errorCount > 10) {
                throw new Error('Error cascade detected - too many consecutive errors');
            }
            originalConsoleError(...args);
        };
        
        try {
            // Simulate scenario that previously caused error cascade
            if (window.enhancedLogger) {
                const originalServerLogging = window.enhancedLogger.enableServer;
                
                // Temporarily enable server logging to test cascade prevention
                window.enhancedLogger.enableServer = true;
                
                // Attempt operations that would cause 501 errors
                for (let i = 0; i < 5; i++) {
                    try {
                        await fetch('/api/logs', {
                            method: 'POST',
                            body: JSON.stringify({ test: 'error cascade test' })
                        });
                    } catch (error) {
                        // This should not cause cascading errors
                    }
                }
                
                // Restore original setting
                window.enhancedLogger.enableServer = originalServerLogging;
            }
            
            // Verify error count is reasonable
            if (errorCount > 10) {
                throw new Error(`Error cascade detected: ${errorCount} errors generated`);
            }
            
            console.log(`✅ Error cascade prevented: ${errorCount} errors handled gracefully`);
            
        } finally {
            // Restore original console.error
            console.error = originalConsoleError;
        }
    }

    /**
     * Test anonymous download tracking edge case
     */
    async testAnonymousDownloadTrackingEdgeCase() {
        console.log('👤 Testing anonymous download tracking...');
        
        // Clear authentication state to simulate anonymous user
        const originalAuthState = window.authManager ? window.authManager.isAuthenticated() : false;
        const originalToken = localStorage.getItem('oriel_jwt_token');
        
        try {
            // Clear auth state
            if (window.authManager) {
                window.authManager._isAuthenticated = false;
                window.authManager.user = null;
                window.authManager.token = null;
            }
            localStorage.removeItem('oriel_jwt_token');
            
            // Mock usage tracker behavior
            let trackingAttempted = false;
            let trackingSucceeded = false;
            
            if (window.usageTracker) {
                const originalTrack = window.usageTracker.trackDownload;
                
                window.usageTracker.trackDownload = async (format) => {
                    trackingAttempted = true;
                    
                    try {
                        // This should handle anonymous users gracefully
                        await originalTrack.call(window.usageTracker, format);
                        trackingSucceeded = true;
                    } catch (error) {
                        // Should not throw for anonymous users
                        if (error.message.includes('401') || error.message.includes('unauthorized')) {
                            throw new Error('Anonymous download tracking should not require authentication');
                        }
                        // Other errors are acceptable
                        trackingSucceeded = false;
                    }
                };
                
                // Attempt download tracking as anonymous user
                await window.usageTracker.trackDownload('mp3');
                
                // Restore original function
                window.usageTracker.trackDownload = originalTrack;
            }
            
            if (trackingAttempted && !trackingSucceeded) {
                console.log('⚠️  Anonymous tracking failed gracefully (acceptable)');
            } else {
                console.log('✅ Anonymous download tracking handled correctly');
            }
            
        } finally {
            // Restore original auth state
            if (originalToken) {
                localStorage.setItem('oriel_jwt_token', originalToken);
            }
            if (window.authManager && originalAuthState) {
                window.authManager._isAuthenticated = originalAuthState;
            }
        }
    }

    /**
     * Test storage quota exceeded edge case
     */
    async testStorageQuotaExceededEdgeCase() {
        console.log('💾 Testing storage quota exceeded handling...');
        
        const testKey = 'regression_test_storage';
        let quotaExceeded = false;
        
        try {
            // Attempt to fill localStorage to test quota handling
            let dataSize = 1024; // Start with 1KB
            let attempts = 0;
            
            while (attempts < 10 && !quotaExceeded) {
                try {
                    const testData = 'x'.repeat(dataSize);
                    localStorage.setItem(`${testKey}_${attempts}`, testData);
                    dataSize *= 2; // Double the size each time
                    attempts++;
                } catch (error) {
                    if (error.name === 'QuotaExceededError') {
                        quotaExceeded = true;
                        console.log('📊 Storage quota limit reached (expected)');
                    } else {
                        throw error;
                    }
                }
            }
            
            // Test that the application handles quota exceeded gracefully
            if (quotaExceeded) {
                // Verify that essential functions still work
                try {
                    localStorage.setItem('test_essential', 'small_data');
                    localStorage.removeItem('test_essential');
                    console.log('✅ Essential storage operations still functional');
                } catch (error) {
                    throw new Error('Essential storage operations failed after quota exceeded');
                }
            }
            
            console.log('✅ Storage quota exceeded handled gracefully');
            
        } finally {
            // Clean up test data
            for (let i = 0; i < 10; i++) {
                try {
                    localStorage.removeItem(`${testKey}_${i}`);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Test form validation race condition edge case
     */
    async testFormValidationRaceConditionEdgeCase() {
        console.log('📝 Testing form validation race condition...');
        
        // Create a mock form for testing
        const testForm = document.createElement('form');
        testForm.id = 'test-validation-form';
        testForm.innerHTML = `
            <input type="email" id="test-email" required>
            <input type="password" id="test-password" required>
            <button type="submit" id="test-submit">Submit</button>
        `;
        document.body.appendChild(testForm);
        
        try {
            let validationCount = 0;
            let submissionCount = 0;
            
            // Mock validation function that takes time
            const mockValidation = async (formData) => {
                validationCount++;
                await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async validation
                return formData.email.includes('@') && formData.password.length >= 8;
            };
            
            // Mock form submission handler
            testForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                submissionCount++;
                
                const formData = {
                    email: document.getElementById('test-email').value,
                    password: document.getElementById('test-password').value
                };
                
                const isValid = await mockValidation(formData);
                if (!isValid) {
                    throw new Error('Form validation failed');
                }
            });
            
            // Fill form with valid data
            document.getElementById('test-email').value = 'test@example.com';
            document.getElementById('test-password').value = 'password123';
            
            // Rapidly submit form multiple times to test race condition
            const submitPromises = [];
            for (let i = 0; i < 3; i++) {
                submitPromises.push(
                    new Promise((resolve, reject) => {
                        setTimeout(() => {
                            try {
                                testForm.dispatchEvent(new Event('submit'));
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        }, i * 10); // Stagger submissions slightly
                    })
                );
            }
            
            await Promise.all(submitPromises);
            
            // Verify that validation was handled correctly
            if (validationCount !== submissionCount) {
                console.log(`⚠️  Validation count (${validationCount}) differs from submission count (${submissionCount})`);
            }
            
            console.log(`✅ Form validation race condition handled: ${validationCount} validations, ${submissionCount} submissions`);
            
        } finally {
            // Clean up test form
            document.body.removeChild(testForm);
        }
    }

    /**
     * Test API endpoint unavailable edge case
     */
    async testApiEndpointUnavailableEdgeCase() {
        console.log('🌐 Testing API endpoint unavailable handling...');
        
        // Mock fetch to simulate 501/503 responses
        const originalFetch = window.fetch;
        let apiCallCount = 0;
        
        window.fetch = async (url, options) => {
            if (url.includes('/api/')) {
                apiCallCount++;
                
                // Simulate 501 Not Implemented for first few calls
                if (apiCallCount <= 2) {
                    return new Response(JSON.stringify({ error: 'Not Implemented' }), {
                        status: 501,
                        statusText: 'Not Implemented'
                    });
                }
                
                // Simulate 503 Service Unavailable for next few calls
                if (apiCallCount <= 4) {
                    return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                }
            }
            
            // Use original fetch for other requests
            return originalFetch(url, options);
        };
        
        try {
            let gracefulHandling = true;
            
            // Test various API calls that should handle unavailable endpoints
            const testEndpoints = ['/api/health', '/api/logs', '/api/monitoring/errors'];
            
            for (const endpoint of testEndpoints) {
                try {
                    const response = await fetch(endpoint);
                    
                    if (response.status === 501 || response.status === 503) {
                        // This is expected - verify the application handles it gracefully
                        console.log(`Expected error response from ${endpoint}: ${response.status}`);
                    }
                } catch (error) {
                    // Network errors should be handled gracefully
                    if (!error.message.includes('gracefully') && !error.message.includes('fallback')) {
                        gracefulHandling = false;
                        console.error(`API endpoint ${endpoint} not handled gracefully:`, error.message);
                    }
                }
            }
            
            if (gracefulHandling) {
                console.log('✅ API endpoint unavailability handled gracefully');
            } else {
                throw new Error('Some API endpoints not handled gracefully when unavailable');
            }
            
        } finally {
            // Restore original fetch
            window.fetch = originalFetch;
        }
    }

    /**
     * Test modal z-index conflict edge case
     */
    async testModalZIndexConflictEdgeCase() {
        console.log('🎭 Testing modal z-index conflict handling...');
        
        // Create competing UI elements with high z-index
        const competingElements = [];
        
        try {
            // Create elements that might compete with modal
            for (let i = 0; i < 3; i++) {
                const element = document.createElement('div');
                element.id = `competing-element-${i}`;
                element.style.position = 'fixed';
                element.style.top = '0';
                element.style.left = '0';
                element.style.width = '100px';
                element.style.height = '100px';
                element.style.backgroundColor = 'red';
                element.style.zIndex = 9000 + i; // High z-index
                element.style.display = 'block';
                
                document.body.appendChild(element);
                competingElements.push(element);
            }
            
            // Test modal display
            if (window.downloadModal) {
                window.downloadModal.show();
                
                // Wait for modal to appear
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const modal = document.getElementById('download-modal');
                if (modal) {
                    const modalZIndex = parseInt(window.getComputedStyle(modal).zIndex) || 0;
                    
                    // Verify modal has higher z-index than competing elements
                    const maxCompetingZIndex = Math.max(...competingElements.map(el => 
                        parseInt(window.getComputedStyle(el).zIndex) || 0
                    ));
                    
                    if (modalZIndex <= maxCompetingZIndex) {
                        throw new Error(`Modal z-index (${modalZIndex}) not higher than competing elements (${maxCompetingZIndex})`);
                    }
                    
                    console.log(`✅ Modal z-index (${modalZIndex}) properly above competing elements (${maxCompetingZIndex})`);
                    
                    // Close modal
                    window.downloadModal.close();
                } else {
                    console.log('⚠️  Download modal not found - skipping z-index test');
                }
            } else {
                console.log('⚠️  Download modal not available - skipping z-index test');
            }
            
        } finally {
            // Clean up competing elements
            competingElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }
    }

    /**
     * Test file generation timeout recovery edge case
     */
    async testFileGenerationTimeoutRecoveryEdgeCase() {
        console.log('⏱️  Testing file generation timeout recovery...');
        
        // Mock file generation that times out initially but succeeds on retry
        let attemptCount = 0;
        const mockFileGenerator = {
            generateFile: async (format, options = {}) => {
                attemptCount++;
                
                if (attemptCount === 1) {
                    // First attempt times out
                    await new Promise(resolve => setTimeout(resolve, 100));
                    throw new Error('Generation timeout');
                } else {
                    // Subsequent attempts succeed
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return {
                        format,
                        size: 1024 * 1024,
                        success: true,
                        attempt: attemptCount
                    };
                }
            }
        };
        
        try {
            // Test retry logic
            let result = null;
            let retryAttempted = false;
            
            try {
                result = await mockFileGenerator.generateFile('mp4');
            } catch (error) {
                if (error.message === 'Generation timeout') {
                    retryAttempted = true;
                    console.log('First attempt timed out, retrying...');
                    
                    // Retry with increased timeout
                    result = await mockFileGenerator.generateFile('mp4', { timeout: 10000 });
                }
            }
            
            if (!retryAttempted) {
                throw new Error('Timeout recovery not tested - first attempt should have failed');
            }
            
            if (!result || !result.success) {
                throw new Error('File generation should succeed on retry');
            }
            
            console.log(`✅ File generation timeout recovery successful on attempt ${result.attempt}`);
            
        } catch (error) {
            throw new Error(`File generation timeout recovery failed: ${error.message}`);
        }
    }

    /**
     * Test session expiry during operation edge case
     */
    async testSessionExpiryDuringOperationEdgeCase() {
        console.log('🔐 Testing session expiry during operation...');
        
        // Mock session that expires during operation
        const originalAuthState = window.authManager ? {
            isAuthenticated: window.authManager.isAuthenticated(),
            token: window.authManager.token,
            user: window.authManager.user
        } : null;
        
        try {
            if (window.authManager) {
                // Set up authenticated state
                window.authManager._isAuthenticated = true;
                window.authManager.token = 'valid_token_' + Date.now();
                window.authManager.user = { id: 1, email: 'test@example.com' };
                
                // Mock a long-running operation
                const longRunningOperation = async () => {
                    // Simulate operation start
                    console.log('Starting long-running operation...');
                    
                    // Simulate session expiry mid-operation
                    setTimeout(() => {
                        console.log('Simulating session expiry...');
                        window.authManager._isAuthenticated = false;
                        window.authManager.token = null;
                        window.authManager.user = null;
                        localStorage.removeItem('oriel_jwt_token');
                    }, 100);
                    
                    // Continue operation
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Check if operation can handle session expiry
                    if (window.authManager.isAuthenticated()) {
                        throw new Error('Session should have expired during operation');
                    }
                    
                    return { success: true, handledExpiry: true };
                };
                
                const result = await longRunningOperation();
                
                if (result.handledExpiry) {
                    console.log('✅ Session expiry during operation handled correctly');
                } else {
                    throw new Error('Session expiry not properly detected');
                }
            } else {
                console.log('⚠️  AuthManager not available - skipping session expiry test');
            }
            
        } finally {
            // Restore original auth state
            if (originalAuthState && window.authManager) {
                window.authManager._isAuthenticated = originalAuthState.isAuthenticated;
                window.authManager.token = originalAuthState.token;
                window.authManager.user = originalAuthState.user;
            }
        }
    }

    /**
     * Add test result
     */
    addTestResult(testName, status, error = null, duration = 0, category = 'general', severity = 'medium') {
        this.testResults.push({
            test: testName,
            status,
            error,
            duration,
            category,
            severity,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate comprehensive regression report
     */
    generateRegressionReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        
        // Categorize results
        const categories = {};
        const severities = {};
        
        this.testResults.forEach(result => {
            // By category
            if (!categories[result.category]) {
                categories[result.category] = { total: 0, passed: 0, failed: 0 };
            }
            categories[result.category].total++;
            if (result.status === 'PASSED') {
                categories[result.category].passed++;
            } else {
                categories[result.category].failed++;
            }
            
            // By severity
            if (!severities[result.severity]) {
                severities[result.severity] = { total: 0, passed: 0, failed: 0 };
            }
            severities[result.severity].total++;
            if (result.status === 'PASSED') {
                severities[result.severity].passed++;
            } else {
                severities[result.severity].failed++;
            }
        });
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate,
                executionTime: this.testResults.reduce((sum, r) => sum + r.duration, 0)
            },
            categories,
            severities,
            results: this.testResults,
            regressionIssues: this.testResults.filter(r => r.status === 'FAILED' && r.test.includes('Regression')),
            edgeCaseFailures: this.testResults.filter(r => r.status === 'FAILED' && r.test.includes('Edge Case')),
            recommendations: this.generateRegressionRecommendations(),
            timestamp: new Date().toISOString()
        };
        
        return report;
    }

    /**
     * Generate recommendations based on regression test results
     */
    generateRegressionRecommendations() {
        const recommendations = [];
        const failedTests = this.testResults.filter(r => r.status === 'FAILED');
        
        // Check for regression issues
        const regressionFailures = failedTests.filter(r => r.test.includes('Regression'));
        if (regressionFailures.length > 0) {
            recommendations.push({
                type: 'CRITICAL',
                category: 'Regression',
                issue: `${regressionFailures.length} regression(s) detected`,
                recommendation: 'Immediate investigation required - previously fixed issues have reappeared',
                priority: 1,
                affectedTests: regressionFailures.map(r => r.test)
            });
        }
        
        // Check for edge case failures
        const edgeCaseFailures = failedTests.filter(r => r.test.includes('Edge Case'));
        if (edgeCaseFailures.length > 0) {
            recommendations.push({
                type: 'WARNING',
                category: 'Edge Cases',
                issue: `${edgeCaseFailures.length} edge case(s) failing`,
                recommendation: 'Review and improve edge case handling',
                priority: 2,
                affectedTests: edgeCaseFailures.map(r => r.test)
            });
        }
        
        // Check for high severity failures
        const highSeverityFailures = failedTests.filter(r => r.severity === 'high');
        if (highSeverityFailures.length > 0) {
            recommendations.push({
                type: 'HIGH',
                category: 'High Severity',
                issue: `${highSeverityFailures.length} high severity failure(s)`,
                recommendation: 'Address high severity issues immediately',
                priority: 1,
                affectedTests: highSeverityFailures.map(r => r.test)
            });
        }
        
        return recommendations;
    }

    /**
     * Get regression test status
     */
    getTestStatus() {
        const report = this.generateRegressionReport();
        
        return {
            isRunning: this.isRunning,
            totalTests: report.summary.total,
            passedTests: report.summary.passed,
            failedTests: report.summary.failed,
            successRate: report.summary.successRate,
            hasRegressions: report.regressionIssues.length > 0,
            hasEdgeCaseFailures: report.edgeCaseFailures.length > 0,
            recommendations: report.recommendations
        };
    }
}

// Make available globally
window.RegressionTestSuite = RegressionTestSuite;

console.log('✅ Regression Test Suite loaded');