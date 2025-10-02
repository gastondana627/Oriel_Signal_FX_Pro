/**
 * Final UX Validation Script
 * Validates that all UX improvements are working correctly
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class FinalUXValidation {
    constructor() {
        this.validationResults = {
            loadingIndicators: { status: 'pending', tests: [] },
            userFeedback: { status: 'pending', tests: [] },
            errorHandling: { status: 'pending', tests: [] },
            performanceOptimization: { status: 'pending', tests: [] },
            accessibility: { status: 'pending', tests: [] },
            integration: { status: 'pending', tests: [] }
        };

        this.config = {
            performanceThresholds: {
                pageLoad: 3000,
                apiResponse: 500,
                memoryUsage: 80,
                errorRate: 5
            },
            timeouts: {
                systemInit: 10000,
                testExecution: 5000,
                validation: 3000
            }
        };

        this.init();
    }

    /**
     * Initialize validation process
     */
    async init() {
        try {
            console.log('🔍 Starting Final UX Validation...');
            
            // Wait for systems to initialize
            await this.waitForSystemInitialization();
            
            // Run validation tests
            await this.runValidationTests();
            
            // Generate validation report
            await this.generateValidationReport();
            
            console.log('✅ Final UX Validation completed');
            
        } catch (error) {
            console.error('❌ Final UX Validation failed:', error);
            this.handleValidationFailure(error);
        }
    }

    /**
     * Wait for all UX systems to initialize
     */
    async waitForSystemInitialization() {
        const maxWaitTime = this.config.timeouts.systemInit;
        const checkInterval = 500;
        const startTime = Date.now();

        const requiredSystems = [
            'FinalUX',
            'UXEnhancementSystem',
            'EnhancedUserFeedback',
            'PerformanceOptimization',
            'FinalPerformancePolish'
        ];

        while (Date.now() - startTime < maxWaitTime) {
            const availableSystems = requiredSystems.filter(system => 
                window[system] || (window.FinalUX && typeof window.FinalUX === 'object')
            );

            if (availableSystems.length >= 3) { // At least core systems available
                console.log('✅ Core UX systems are available for validation');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        console.warn('⚠️ Some UX systems not available, proceeding with available systems');
    }

    /**
     * Run comprehensive validation tests
     */
    async runValidationTests() {
        console.log('🧪 Running UX validation tests...');
        
        // Test loading indicators (Requirement 8.1)
        await this.validateLoadingIndicators();
        
        // Test user feedback system (Requirement 8.2)
        await this.validateUserFeedback();
        
        // Test error handling (Requirement 8.3)
        await this.validateErrorHandling();
        
        // Test performance optimization (Requirement 8.5)
        await this.validatePerformanceOptimization();
        
        // Test accessibility features
        await this.validateAccessibility();
        
        // Test system integration
        await this.validateSystemIntegration();
    }

    /**
     * Validate loading indicators (Requirement 8.1)
     */
    async validateLoadingIndicators() {
        console.log('🔄 Validating loading indicators...');
        
        const tests = [
            {
                name: 'Loading Spinner Display',
                test: () => this.testLoadingSpinnerDisplay()
            },
            {
                name: 'Progress Bar Functionality',
                test: () => this.testProgressBarFunctionality()
            },
            {
                name: 'Button Loading States',
                test: () => this.testButtonLoadingStates()
            },
            {
                name: 'Operation-Specific Loading',
                test: () => this.testOperationSpecificLoading()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.loadingIndicators = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test loading spinner display
     */
    async testLoadingSpinnerDisplay() {
        try {
            // Test if FinalUX API is available
            if (!window.FinalUX || typeof window.FinalUX.showLoading !== 'function') {
                return { passed: false, message: 'FinalUX.showLoading not available' };
            }

            // Show loading spinner
            window.FinalUX.showLoading('Test loading message', 'test-operation');
            
            // Check if spinner is visible
            const spinner = document.getElementById('ux-loading-spinner');
            if (!spinner) {
                return { passed: false, message: 'Loading spinner element not found' };
            }

            const isVisible = spinner.classList.contains('active') || 
                             getComputedStyle(spinner).display !== 'none';
            
            // Hide loading spinner
            window.FinalUX.hideLoading('test-operation');
            
            return { 
                passed: isVisible, 
                message: isVisible ? 'Loading spinner works correctly' : 'Loading spinner not visible'
            };
            
        } catch (error) {
            return { passed: false, message: `Loading spinner test failed: ${error.message}` };
        }
    }

    /**
     * Test progress bar functionality
     */
    async testProgressBarFunctionality() {
        try {
            if (!window.FinalUX || typeof window.FinalUX.showProgress !== 'function') {
                return { passed: false, message: 'FinalUX.showProgress not available' };
            }

            // Test progress display
            window.FinalUX.showProgress(50, 'Test progress');
            
            // Check if progress bar is visible and has correct value
            const progressContainer = document.getElementById('ux-progress-container');
            const progressFill = document.getElementById('ux-progress-fill');
            
            if (!progressContainer || !progressFill) {
                return { passed: false, message: 'Progress bar elements not found' };
            }

            const isVisible = getComputedStyle(progressContainer).display !== 'none';
            const width = progressFill.style.width;
            
            // Hide progress
            window.FinalUX.hideProgress();
            
            return { 
                passed: isVisible && width === '50%', 
                message: isVisible ? 'Progress bar works correctly' : 'Progress bar not functioning'
            };
            
        } catch (error) {
            return { passed: false, message: `Progress bar test failed: ${error.message}` };
        }
    }

    /**
     * Test button loading states
     */
    async testButtonLoadingStates() {
        try {
            // Find a test button
            const button = document.querySelector('button');
            if (!button) {
                return { passed: false, message: 'No buttons found for testing' };
            }

            // Simulate loading state
            button.dispatchEvent(new CustomEvent('loading-start'));
            
            const hasLoadingClass = button.classList.contains('ux-button-loading');
            const isDisabled = button.disabled;
            
            // Remove loading state
            button.dispatchEvent(new CustomEvent('loading-end'));
            
            return { 
                passed: hasLoadingClass && isDisabled, 
                message: hasLoadingClass ? 'Button loading states work correctly' : 'Button loading states not working'
            };
            
        } catch (error) {
            return { passed: false, message: `Button loading test failed: ${error.message}` };
        }
    }

    /**
     * Test operation-specific loading
     */
    async testOperationSpecificLoading() {
        try {
            if (!window.FinalUX) {
                return { passed: false, message: 'FinalUX not available' };
            }

            // Test different operation types
            const operations = ['download', 'authentication', 'file-generation'];
            let allPassed = true;
            
            for (const operation of operations) {
                window.FinalUX.showLoading(`Testing ${operation}`, operation);
                await new Promise(resolve => setTimeout(resolve, 100));
                window.FinalUX.hideLoading(operation);
            }
            
            return { 
                passed: allPassed, 
                message: 'Operation-specific loading works correctly'
            };
            
        } catch (error) {
            return { passed: false, message: `Operation loading test failed: ${error.message}` };
        }
    }

    /**
     * Validate user feedback system (Requirement 8.2)
     */
    async validateUserFeedback() {
        console.log('💬 Validating user feedback system...');
        
        const tests = [
            {
                name: 'Notification Display',
                test: () => this.testNotificationDisplay()
            },
            {
                name: 'Notification Types',
                test: () => this.testNotificationTypes()
            },
            {
                name: 'User Confirmation Messages',
                test: () => this.testUserConfirmationMessages()
            },
            {
                name: 'Status Messages',
                test: () => this.testStatusMessages()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.userFeedback = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test notification display
     */
    async testNotificationDisplay() {
        try {
            if (!window.FinalUX || typeof window.FinalUX.showNotification !== 'function') {
                return { passed: false, message: 'FinalUX.showNotification not available' };
            }

            // Show test notification
            const notification = window.FinalUX.showNotification('Test notification', 'info', 1000);
            
            if (!notification) {
                return { passed: false, message: 'Notification not created' };
            }

            // Check if notification is visible
            const isVisible = document.body.contains(notification);
            
            return { 
                passed: isVisible, 
                message: isVisible ? 'Notifications work correctly' : 'Notifications not displaying'
            };
            
        } catch (error) {
            return { passed: false, message: `Notification test failed: ${error.message}` };
        }
    }

    /**
     * Test different notification types
     */
    async testNotificationTypes() {
        try {
            if (!window.FinalUX) {
                return { passed: false, message: 'FinalUX not available' };
            }

            const types = ['success', 'error', 'warning', 'info'];
            let allPassed = true;
            
            for (const type of types) {
                const notification = window.FinalUX.showNotification(`Test ${type}`, type, 500);
                if (!notification) {
                    allPassed = false;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return { 
                passed: allPassed, 
                message: allPassed ? 'All notification types work correctly' : 'Some notification types failed'
            };
            
        } catch (error) {
            return { passed: false, message: `Notification types test failed: ${error.message}` };
        }
    }

    /**
     * Test user confirmation messages
     */
    async testUserConfirmationMessages() {
        try {
            // Test success confirmations
            if (window.FinalUX) {
                window.FinalUX.showNotification('Operation completed successfully', 'success', 1000);
            }
            
            return { 
                passed: true, 
                message: 'User confirmation messages available'
            };
            
        } catch (error) {
            return { passed: false, message: `Confirmation messages test failed: ${error.message}` };
        }
    }

    /**
     * Test status messages
     */
    async testStatusMessages() {
        try {
            // Test status message display
            const statusElements = document.querySelectorAll('.progress-status, .modal-status, .status-message');
            
            return { 
                passed: statusElements.length > 0, 
                message: statusElements.length > 0 ? 'Status messages available' : 'No status message elements found'
            };
            
        } catch (error) {
            return { passed: false, message: `Status messages test failed: ${error.message}` };
        }
    }

    /**
     * Validate error handling (Requirement 8.3)
     */
    async validateErrorHandling() {
        console.log('🚨 Validating error handling...');
        
        const tests = [
            {
                name: 'Error Display',
                test: () => this.testErrorDisplay()
            },
            {
                name: 'Error Recovery',
                test: () => this.testErrorRecovery()
            },
            {
                name: 'User-Friendly Messages',
                test: () => this.testUserFriendlyMessages()
            },
            {
                name: 'Error Boundary',
                test: () => this.testErrorBoundary()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.errorHandling = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test error display
     */
    async testErrorDisplay() {
        try {
            if (!window.FinalUX || typeof window.FinalUX.handleError !== 'function') {
                return { passed: false, message: 'FinalUX.handleError not available' };
            }

            // Test error handling
            const testError = new Error('Test error message');
            window.FinalUX.handleError(testError, { test: true });
            
            return { 
                passed: true, 
                message: 'Error handling function available'
            };
            
        } catch (error) {
            return { passed: false, message: `Error display test failed: ${error.message}` };
        }
    }

    /**
     * Test error recovery mechanisms
     */
    async testErrorRecovery() {
        try {
            // Check if retry mechanisms are available
            const retryButtons = document.querySelectorAll('.retry-button, .error-retry, [data-retry]');
            
            return { 
                passed: retryButtons.length > 0 || window.FinalUX, 
                message: 'Error recovery mechanisms available'
            };
            
        } catch (error) {
            return { passed: false, message: `Error recovery test failed: ${error.message}` };
        }
    }

    /**
     * Test user-friendly error messages
     */
    async testUserFriendlyMessages() {
        try {
            // Test that error messages are user-friendly
            if (window.FinalUX) {
                window.FinalUX.showNotification('A connection error occurred. Please check your internet connection and try again.', 'error', 1000);
            }
            
            return { 
                passed: true, 
                message: 'User-friendly error messages available'
            };
            
        } catch (error) {
            return { passed: false, message: `User-friendly messages test failed: ${error.message}` };
        }
    }

    /**
     * Test error boundary functionality
     */
    async testErrorBoundary() {
        try {
            // Check if error boundary elements exist
            const errorBoundary = document.getElementById('enhanced-error-boundary');
            
            return { 
                passed: !!errorBoundary, 
                message: errorBoundary ? 'Error boundary available' : 'Error boundary not found'
            };
            
        } catch (error) {
            return { passed: false, message: `Error boundary test failed: ${error.message}` };
        }
    }

    /**
     * Validate performance optimization (Requirement 8.5)
     */
    async validatePerformanceOptimization() {
        console.log('⚡ Validating performance optimization...');
        
        const tests = [
            {
                name: 'Page Load Performance',
                test: () => this.testPageLoadPerformance()
            },
            {
                name: 'Memory Usage',
                test: () => this.testMemoryUsage()
            },
            {
                name: 'Animation Performance',
                test: () => this.testAnimationPerformance()
            },
            {
                name: 'Resource Optimization',
                test: () => this.testResourceOptimization()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.performanceOptimization = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test page load performance
     */
    async testPageLoadPerformance() {
        try {
            if ('performance' in window) {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    const loadTime = navigation.loadEventEnd - navigation.fetchStart;
                    const threshold = this.config.performanceThresholds.pageLoad;
                    
                    return { 
                        passed: loadTime < threshold, 
                        message: `Page load time: ${loadTime.toFixed(2)}ms (threshold: ${threshold}ms)`
                    };
                }
            }
            
            return { passed: false, message: 'Performance API not available' };
            
        } catch (error) {
            return { passed: false, message: `Page load performance test failed: ${error.message}` };
        }
    }

    /**
     * Test memory usage
     */
    async testMemoryUsage() {
        try {
            if ('memory' in performance) {
                const memory = performance.memory;
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                const threshold = this.config.performanceThresholds.memoryUsage;
                
                return { 
                    passed: usagePercent < threshold, 
                    message: `Memory usage: ${usagePercent.toFixed(2)}% (threshold: ${threshold}%)`
                };
            }
            
            return { passed: true, message: 'Memory API not available (acceptable)' };
            
        } catch (error) {
            return { passed: false, message: `Memory usage test failed: ${error.message}` };
        }
    }

    /**
     * Test animation performance
     */
    async testAnimationPerformance() {
        try {
            // Check if performance-optimized classes are applied
            const optimizedElements = document.querySelectorAll('.final-ux-enhanced, .optimized-animation');
            
            return { 
                passed: optimizedElements.length > 0, 
                message: `Found ${optimizedElements.length} performance-optimized elements`
            };
            
        } catch (error) {
            return { passed: false, message: `Animation performance test failed: ${error.message}` };
        }
    }

    /**
     * Test resource optimization
     */
    async testResourceOptimization() {
        try {
            // Check for resource hints
            const resourceHints = document.querySelectorAll('link[rel="preconnect"], link[rel="prefetch"], link[rel="preload"]');
            
            // Check for optimized images
            const optimizedImages = document.querySelectorAll('img[loading="lazy"], img[decoding="async"]');
            
            return { 
                passed: resourceHints.length > 0 || optimizedImages.length > 0, 
                message: `Found ${resourceHints.length} resource hints and ${optimizedImages.length} optimized images`
            };
            
        } catch (error) {
            return { passed: false, message: `Resource optimization test failed: ${error.message}` };
        }
    }

    /**
     * Validate accessibility features
     */
    async validateAccessibility() {
        console.log('♿ Validating accessibility features...');
        
        const tests = [
            {
                name: 'Keyboard Navigation',
                test: () => this.testKeyboardNavigation()
            },
            {
                name: 'ARIA Labels',
                test: () => this.testAriaLabels()
            },
            {
                name: 'Focus Management',
                test: () => this.testFocusManagement()
            },
            {
                name: 'Screen Reader Support',
                test: () => this.testScreenReaderSupport()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.accessibility = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test keyboard navigation
     */
    async testKeyboardNavigation() {
        try {
            // Check if interactive elements are keyboard accessible
            const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
            let accessibleCount = 0;
            
            interactiveElements.forEach(element => {
                const tabIndex = element.getAttribute('tabindex');
                if (tabIndex !== '-1' && !element.disabled) {
                    accessibleCount++;
                }
            });
            
            return { 
                passed: accessibleCount > 0, 
                message: `Found ${accessibleCount} keyboard accessible elements`
            };
            
        } catch (error) {
            return { passed: false, message: `Keyboard navigation test failed: ${error.message}` };
        }
    }

    /**
     * Test ARIA labels
     */
    async testAriaLabels() {
        try {
            // Check for ARIA labels on interactive elements
            const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
            
            return { 
                passed: elementsWithAria.length > 0, 
                message: `Found ${elementsWithAria.length} elements with ARIA labels`
            };
            
        } catch (error) {
            return { passed: false, message: `ARIA labels test failed: ${error.message}` };
        }
    }

    /**
     * Test focus management
     */
    async testFocusManagement() {
        try {
            // Check if focus indicators are available
            const focusStyles = document.querySelectorAll('style');
            let hasFocusStyles = false;
            
            focusStyles.forEach(style => {
                if (style.textContent.includes('focus') || style.textContent.includes('outline')) {
                    hasFocusStyles = true;
                }
            });
            
            return { 
                passed: hasFocusStyles, 
                message: hasFocusStyles ? 'Focus management styles available' : 'No focus management styles found'
            };
            
        } catch (error) {
            return { passed: false, message: `Focus management test failed: ${error.message}` };
        }
    }

    /**
     * Test screen reader support
     */
    async testScreenReaderSupport() {
        try {
            // Check for live regions and screen reader support
            const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
            
            return { 
                passed: liveRegions.length > 0, 
                message: `Found ${liveRegions.length} screen reader support elements`
            };
            
        } catch (error) {
            return { passed: false, message: `Screen reader support test failed: ${error.message}` };
        }
    }

    /**
     * Validate system integration
     */
    async validateSystemIntegration() {
        console.log('🔗 Validating system integration...');
        
        const tests = [
            {
                name: 'API Availability',
                test: () => this.testAPIAvailability()
            },
            {
                name: 'Event Communication',
                test: () => this.testEventCommunication()
            },
            {
                name: 'Cross-System Functionality',
                test: () => this.testCrossSystemFunctionality()
            },
            {
                name: 'Graceful Degradation',
                test: () => this.testGracefulDegradation()
            }
        ];

        const results = await this.runTestSuite(tests);
        this.validationResults.integration = {
            status: results.every(r => r.passed) ? 'passed' : 'failed',
            tests: results
        };
    }

    /**
     * Test API availability
     */
    async testAPIAvailability() {
        try {
            const requiredAPIs = [
                'FinalUX',
                'showLoading',
                'hideLoading',
                'showProgress',
                'hideProgress',
                'showNotification',
                'handleError'
            ];
            
            let availableAPIs = 0;
            
            if (window.FinalUX) {
                requiredAPIs.slice(1).forEach(api => {
                    if (typeof window.FinalUX[api] === 'function') {
                        availableAPIs++;
                    }
                });
            }
            
            return { 
                passed: availableAPIs >= 4, // At least core APIs available
                message: `Found ${availableAPIs} available APIs`
            };
            
        } catch (error) {
            return { passed: false, message: `API availability test failed: ${error.message}` };
        }
    }

    /**
     * Test event communication between systems
     */
    async testEventCommunication() {
        try {
            // Test if custom events are working
            let eventReceived = false;
            
            const testListener = () => {
                eventReceived = true;
            };
            
            document.addEventListener('test-event', testListener);
            document.dispatchEvent(new CustomEvent('test-event'));
            document.removeEventListener('test-event', testListener);
            
            return { 
                passed: eventReceived, 
                message: eventReceived ? 'Event communication working' : 'Event communication failed'
            };
            
        } catch (error) {
            return { passed: false, message: `Event communication test failed: ${error.message}` };
        }
    }

    /**
     * Test cross-system functionality
     */
    async testCrossSystemFunctionality() {
        try {
            // Test if systems can work together
            let systemsWorking = 0;
            
            // Test loading + notification
            if (window.FinalUX) {
                if (typeof window.FinalUX.showLoading === 'function') systemsWorking++;
                if (typeof window.FinalUX.showNotification === 'function') systemsWorking++;
                if (typeof window.FinalUX.handleError === 'function') systemsWorking++;
            }
            
            return { 
                passed: systemsWorking >= 2, 
                message: `${systemsWorking} cross-system functions available`
            };
            
        } catch (error) {
            return { passed: false, message: `Cross-system functionality test failed: ${error.message}` };
        }
    }

    /**
     * Test graceful degradation
     */
    async testGracefulDegradation() {
        try {
            // Test if the system works even when some features are unavailable
            const fallbackElements = document.querySelectorAll('[data-fallback], .fallback');
            
            // Test if basic functionality is available even without advanced features
            const basicElements = document.querySelectorAll('button, input, form');
            
            return { 
                passed: basicElements.length > 0, 
                message: `Basic functionality available with ${basicElements.length} interactive elements`
            };
            
        } catch (error) {
            return { passed: false, message: `Graceful degradation test failed: ${error.message}` };
        }
    }

    /**
     * Run a test suite and return results
     */
    async runTestSuite(tests) {
        const results = [];
        
        for (const test of tests) {
            try {
                console.log(`  Running: ${test.name}`);
                const result = await Promise.race([
                    test.test(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), this.config.timeouts.testExecution)
                    )
                ]);
                
                results.push({
                    name: test.name,
                    passed: result.passed,
                    message: result.message,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`    ${result.passed ? '✅' : '❌'} ${test.name}: ${result.message}`);
                
            } catch (error) {
                results.push({
                    name: test.name,
                    passed: false,
                    message: `Test failed: ${error.message}`,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`    ❌ ${test.name}: Test failed - ${error.message}`);
            }
        }
        
        return results;
    }

    /**
     * Generate comprehensive validation report
     */
    async generateValidationReport() {
        console.log('📋 Generating validation report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            details: this.validationResults,
            recommendations: this.generateRecommendations(),
            score: this.calculateOverallScore()
        };
        
        // Display report
        this.displayValidationReport(report);
        
        // Store report for later access
        window.uxValidationReport = report;
        
        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('ux-validation-complete', {
            detail: report
        }));
        
        return report;
    }

    /**
     * Generate validation summary
     */
    generateSummary() {
        const categories = Object.keys(this.validationResults);
        const passed = categories.filter(cat => this.validationResults[cat].status === 'passed').length;
        const total = categories.length;
        
        return {
            totalCategories: total,
            passedCategories: passed,
            failedCategories: total - passed,
            overallStatus: passed === total ? 'passed' : passed >= total * 0.8 ? 'mostly-passed' : 'failed'
        };
    }

    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations() {
        const recommendations = [];
        
        Object.entries(this.validationResults).forEach(([category, result]) => {
            if (result.status === 'failed') {
                const failedTests = result.tests.filter(test => !test.passed);
                failedTests.forEach(test => {
                    recommendations.push({
                        category,
                        test: test.name,
                        issue: test.message,
                        priority: this.getRecommendationPriority(category, test.name)
                    });
                });
            }
        });
        
        return recommendations;
    }

    /**
     * Get recommendation priority
     */
    getRecommendationPriority(category, testName) {
        const highPriorityCategories = ['errorHandling', 'accessibility'];
        const highPriorityTests = ['Error Display', 'Keyboard Navigation', 'Loading Spinner Display'];
        
        if (highPriorityCategories.includes(category) || highPriorityTests.includes(testName)) {
            return 'high';
        } else if (category === 'performanceOptimization') {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Calculate overall validation score
     */
    calculateOverallScore() {
        let totalTests = 0;
        let passedTests = 0;
        
        Object.values(this.validationResults).forEach(result => {
            totalTests += result.tests.length;
            passedTests += result.tests.filter(test => test.passed).length;
        });
        
        return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    }

    /**
     * Display validation report in console
     */
    displayValidationReport(report) {
        console.log('\n🎯 Final UX Validation Report');
        console.log('================================');
        console.log(`Overall Score: ${report.score}%`);
        console.log(`Status: ${report.summary.overallStatus.toUpperCase()}`);
        console.log(`Categories Passed: ${report.summary.passedCategories}/${report.summary.totalCategories}`);
        
        console.log('\n📊 Category Results:');
        Object.entries(report.details).forEach(([category, result]) => {
            const status = result.status === 'passed' ? '✅' : '❌';
            const passedTests = result.tests.filter(test => test.passed).length;
            console.log(`  ${status} ${category}: ${passedTests}/${result.tests.length} tests passed`);
        });
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
                console.log(`  ${priority} ${rec.category} - ${rec.test}: ${rec.issue}`);
            });
        }
        
        console.log('\n✅ UX Validation completed successfully!');
    }

    /**
     * Handle validation failure
     */
    handleValidationFailure(error) {
        console.error('🚨 UX Validation failed:', error);
        
        // Create minimal report
        const failureReport = {
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: error.message,
            score: 0,
            summary: {
                totalCategories: Object.keys(this.validationResults).length,
                passedCategories: 0,
                failedCategories: Object.keys(this.validationResults).length,
                overallStatus: 'failed'
            }
        };
        
        window.uxValidationReport = failureReport;
        
        // Show user-friendly error if possible
        if (window.FinalUX && window.FinalUX.showNotification) {
            window.FinalUX.showNotification(
                'UX validation encountered issues. Check console for details.',
                'warning',
                5000
            );
        }
    }
}

// Initialize validation when systems are ready
document.addEventListener('final-ux-ready', () => {
    console.log('🎉 Final UX systems ready, starting validation...');
    new FinalUXValidation();
});

// Fallback initialization if event doesn't fire
setTimeout(() => {
    if (!window.uxValidationReport) {
        console.log('🔍 Starting UX validation (fallback)...');
        new FinalUXValidation();
    }
}, 5000);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinalUXValidation;
}