/**
 * UX Enhancement System
 * Implements final polish and improvements based on test results and user feedback
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class UXEnhancementSystem {
    constructor() {
        this.config = {
            animationDuration: 300,
            feedbackDelay: 150,
            progressUpdateInterval: 100,
            errorRetryDelay: 2000,
            maxRetryAttempts: 3,
            performanceThresholds: {
                pageLoad: 3000,
                apiResponse: 500,
                fileGeneration: 30000
            }
        };

        this.state = {
            isInitialized: false,
            activeOperations: new Map(),
            performanceMetrics: new Map(),
            userInteractions: []
        };

        this.components = {
            loadingIndicators: new Map(),
            progressBars: new Map(),
            notifications: null,
            errorHandler: null
        };

        this.init();
    }

    /**
     * Initialize UX enhancement system
     */
    async init() {
        try {
            console.log('🎨 Initializing UX Enhancement System...');
            
            await this.setupLoadingIndicators();
            await this.setupProgressIndicators();
            await this.setupUserFeedback();
            await this.setupErrorHandling();
            await this.setupPerformanceOptimizations();
            await this.setupAccessibilityEnhancements();
            
            this.state.isInitialized = true;
            console.log('✅ UX Enhancement System initialized successfully');
            
            // Apply immediate improvements
            this.applyImmediateImprovements();
            
        } catch (error) {
            console.error('❌ Failed to initialize UX Enhancement System:', error);
            throw error;
        }
    }

    /**
     * Setup enhanced loading indicators
     * Requirement 8.1: Loading and progress indicators
     */
    async setupLoadingIndicators() {
        // Create enhanced loading spinner component
        this.createLoadingSpinner();
        
        // Setup operation-specific loading states
        this.setupOperationLoading();
        
        // Create skeleton loading for content
        this.createSkeletonLoaders();
        
        console.log('✅ Loading indicators configured');
    }

    /**
     * Create enhanced loading spinner
     */
    createLoadingSpinner() {
        const spinnerHTML = `
            <div class="ux-loading-spinner" id="ux-loading-spinner">
                <div class="spinner-container">
                    <div class="spinner-ring"></div>
                    <div class="spinner-text">Loading...</div>
                </div>
            </div>
        `;

        // Add to document if not exists
        if (!document.getElementById('ux-loading-spinner')) {
            document.body.insertAdjacentHTML('beforeend', spinnerHTML);
        }

        // Add CSS styles
        this.addLoadingStyles();
    }

    /**
     * Add loading indicator styles
     */
    addLoadingStyles() {
        const styles = `
            <style id="ux-loading-styles">
                .ux-loading-spinner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }

                .ux-loading-spinner.active {
                    opacity: 1;
                    visibility: visible;
                }

                .spinner-container {
                    text-align: center;
                    color: white;
                }

                .spinner-ring {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid #8309D5;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }

                .spinner-text {
                    font-size: 16px;
                    font-weight: 500;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .ux-button-loading {
                    position: relative;
                    pointer-events: none;
                }

                .ux-button-loading::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    margin: -10px 0 0 -10px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .ux-skeleton {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .ux-progress-bar {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 10px 0;
                }

                .ux-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8309D5, #a855f7);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                    width: 0%;
                }

                .ux-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    z-index: 9999;
                }

                .ux-notification.show {
                    transform: translateX(0);
                }

                .ux-notification.success {
                    background: linear-gradient(135deg, #10b981, #059669);
                }

                .ux-notification.error {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                }

                .ux-notification.warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                }

                .ux-notification.info {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                }

                .ux-error-boundary {
                    padding: 20px;
                    text-align: center;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px;
                    margin: 20px;
                }

                .ux-retry-button {
                    background: #8309D5;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: background 0.2s ease;
                }

                .ux-retry-button:hover {
                    background: #6d28d9;
                }

                .ux-accessibility-focus {
                    outline: 2px solid #8309D5 !important;
                    outline-offset: 2px !important;
                }

                .ux-high-contrast {
                    filter: contrast(150%) brightness(110%);
                }

                .ux-reduced-motion * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            </style>
        `;

        if (!document.getElementById('ux-loading-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    /**
     * Setup operation-specific loading states
     */
    setupOperationLoading() {
        // Track common operations
        const operations = [
            'authentication',
            'download',
            'file-generation',
            'api-request',
            'page-load'
        ];

        operations.forEach(operation => {
            this.components.loadingIndicators.set(operation, {
                isActive: false,
                startTime: null,
                element: null
            });
        });
    }

    /**
     * Create skeleton loaders for content
     */
    createSkeletonLoaders() {
        // Add skeleton loading for dashboard content
        const skeletonHTML = `
            <div class="ux-skeleton-container" id="ux-skeleton-container" style="display: none;">
                <div class="ux-skeleton" style="height: 20px; margin: 10px 0;"></div>
                <div class="ux-skeleton" style="height: 20px; width: 80%; margin: 10px 0;"></div>
                <div class="ux-skeleton" style="height: 20px; width: 60%; margin: 10px 0;"></div>
            </div>
        `;

        if (!document.getElementById('ux-skeleton-container')) {
            document.body.insertAdjacentHTML('beforeend', skeletonHTML);
        }
    }

    /**
     * Setup enhanced progress indicators
     * Requirement 8.1: Progress percentage display
     */
    async setupProgressIndicators() {
        // Create progress bar component
        this.createProgressBar();
        
        // Setup file generation progress tracking
        this.setupFileGenerationProgress();
        
        // Setup download progress tracking
        this.setupDownloadProgress();
        
        console.log('✅ Progress indicators configured');
    }

    /**
     * Create enhanced progress bar
     */
    createProgressBar() {
        const progressHTML = `
            <div class="ux-progress-container" id="ux-progress-container" style="display: none;">
                <div class="ux-progress-bar">
                    <div class="ux-progress-fill" id="ux-progress-fill"></div>
                </div>
                <div class="ux-progress-text" id="ux-progress-text">0%</div>
            </div>
        `;

        if (!document.getElementById('ux-progress-container')) {
            document.body.insertAdjacentHTML('beforeend', progressHTML);
        }
    }

    /**
     * Setup file generation progress tracking
     */
    setupFileGenerationProgress() {
        // Monitor file generation operations
        this.monitorFileGeneration();
    }

    /**
     * Setup download progress tracking
     */
    setupDownloadProgress() {
        // Monitor download operations
        this.monitorDownloads();
    }

    /**
     * Setup enhanced user feedback system
     * Requirements 8.2, 8.3, 8.4: User notifications and feedback
     */
    async setupUserFeedback() {
        // Initialize notification system
        this.initializeNotifications();
        
        // Setup success confirmations
        this.setupSuccessConfirmations();
        
        // Setup error messaging
        this.setupErrorMessaging();
        
        // Setup operation status messages
        this.setupStatusMessages();
        
        console.log('✅ User feedback system configured');
    }

    /**
     * Initialize enhanced notification system
     */
    initializeNotifications() {
        this.components.notifications = {
            queue: [],
            active: new Set(),
            maxActive: 3
        };
    }

    /**
     * Setup success confirmations
     */
    setupSuccessConfirmations() {
        // Track successful operations for confirmation
        this.trackSuccessfulOperations();
    }

    /**
     * Track successful operations for user feedback
     */
    trackSuccessfulOperations() {
        // Track form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.tagName === 'FORM') {
                setTimeout(() => {
                    if (window.notifications) {
                        window.notifications.show('Operation completed successfully', 'success');
                    }
                }, 100);
            }
        });

        // Track successful API calls
        if (window.ApiClient) {
            const originalRequest = window.ApiClient.prototype.request;
            if (originalRequest) {
                window.ApiClient.prototype.request = function(...args) {
                    return originalRequest.apply(this, args).then(response => {
                        if (response.ok && window.notifications) {
                            // Only show for certain operations
                            const url = args[1] || args[0];
                            if (url && (url.includes('register') || url.includes('login') || url.includes('download'))) {
                                window.notifications.show('Operation completed successfully', 'success');
                            }
                        }
                        return response;
                    });
                };
            }
        }
    }

    /**
     * Setup error messaging system
     */
    setupErrorMessaging() {
        // Create user-friendly error messages
        this.createErrorMessageSystem();
    }

    /**
     * Create error message system
     */
    createErrorMessageSystem() {
        // Simple, non-intrusive error message system
        const errorContainer = document.createElement('div');
        errorContainer.id = 'ux-error-messages';
        errorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            pointer-events: none;
        `;
        document.body.appendChild(errorContainer);
        
        this.showErrorMessage = (message, type = 'error') => {
            const messageEl = document.createElement('div');
            messageEl.style.cssText = `
                background: ${type === 'error' ? '#f8d7da' : '#d4edda'};
                color: ${type === 'error' ? '#721c24' : '#155724'};
                padding: 12px;
                border-radius: 4px;
                margin-bottom: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                pointer-events: auto;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            messageEl.textContent = message;
            
            errorContainer.appendChild(messageEl);
            
            // Fade in
            setTimeout(() => messageEl.style.opacity = '1', 10);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                messageEl.style.opacity = '0';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }, 5000);
        };
    }

    /**
     * Setup operation status messages
     */
    setupStatusMessages() {
        // Create status message system
        this.createStatusMessageSystem();
    }

    /**
     * Setup comprehensive error handling
     * Requirement 8.3: Error handling improvements
     */
    async setupErrorHandling() {
        // Initialize error boundary
        this.initializeErrorBoundary();
        
        // Setup retry mechanisms
        this.setupRetryMechanisms();
        
        // Setup error recovery
        this.setupErrorRecovery();
        
        // Setup network error handling
        this.setupNetworkErrorHandling();
        
        console.log('✅ Error handling system configured');
    }

    /**
     * Initialize error boundary
     */
    initializeErrorBoundary() {
        this.components.errorHandler = {
            boundaries: new Map(),
            recoveryStrategies: new Map(),
            errorHistory: []
        };

        // Setup global error handlers
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, event);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledRejection(event.reason, event);
        });
    }

    /**
     * Setup retry mechanisms
     */
    setupRetryMechanisms() {
        // Configure retry strategies for different operations
        this.retryStrategies = new Map([
            ['api-request', { maxAttempts: 3, delay: 1000, backoff: 2 }],
            ['file-generation', { maxAttempts: 2, delay: 2000, backoff: 1.5 }],
            ['download', { maxAttempts: 3, delay: 1500, backoff: 2 }],
            ['authentication', { maxAttempts: 2, delay: 1000, backoff: 1 }]
        ]);
    }

    /**
     * Setup error recovery mechanisms
     */
    setupErrorRecovery() {
        // Configure recovery strategies
        this.recoveryStrategies = new Map([
            ['network-error', () => this.recoverFromNetworkError()],
            ['authentication-error', () => this.recoverFromAuthError()],
            ['file-generation-error', () => this.recoverFromFileError()],
            ['storage-error', () => this.recoverFromStorageError()]
        ]);
    }

    /**
     * Setup network error handling
     */
    setupNetworkErrorHandling() {
        // Monitor network connectivity
        this.monitorNetworkConnectivity();
    }

    /**
     * Setup performance optimizations
     * Requirement 8.5: Performance optimization
     */
    async setupPerformanceOptimizations() {
        // Initialize performance monitoring
        this.initializePerformanceMonitoring();
        
        // Setup lazy loading
        this.setupLazyLoading();
        
        // Setup resource optimization
        this.setupResourceOptimization();
        
        // Setup memory management
        this.setupMemoryManagement();
        
        console.log('✅ Performance optimizations configured');
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        // Track key performance metrics
        this.performanceMetrics = new Map([
            ['page-load-time', null],
            ['first-contentful-paint', null],
            ['largest-contentful-paint', null],
            ['cumulative-layout-shift', null],
            ['first-input-delay', null]
        ]);

        // Setup performance observers
        this.setupPerformanceObservers();
    }

    /**
     * Setup performance observers
     */
    setupPerformanceObservers() {
        if ('PerformanceObserver' in window) {
            // Observe paint metrics
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.performanceMetrics.set(entry.name, entry.startTime);
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });

            // Observe layout shift
            const layoutObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        const currentCLS = this.performanceMetrics.get('cumulative-layout-shift') || 0;
                        this.performanceMetrics.set('cumulative-layout-shift', currentCLS + entry.value);
                    }
                }
            });
            layoutObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    /**
     * Setup lazy loading
     */
    setupLazyLoading() {
        // Implement intersection observer for lazy loading
        if ('IntersectionObserver' in window) {
            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                        lazyObserver.unobserve(entry.target);
                    }
                });
            });

            // Observe lazy elements
            document.querySelectorAll('[data-lazy]').forEach(el => {
                lazyObserver.observe(el);
            });
        }
    }

    /**
     * Setup resource optimization
     */
    setupResourceOptimization() {
        // Preload critical resources
        this.preloadCriticalResources();
        
        // Optimize images
        this.optimizeImages();
        
        // Minimize reflows and repaints
        this.minimizeLayoutThrashing();
    }

    /**
     * Setup memory management
     */
    setupMemoryManagement() {
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Cleanup unused resources
        this.setupResourceCleanup();
    }

    /**
     * Setup accessibility enhancements
     */
    async setupAccessibilityEnhancements() {
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup screen reader support
        this.setupScreenReaderSupport();
        
        // Setup high contrast mode
        this.setupHighContrastMode();
        
        // Setup reduced motion support
        this.setupReducedMotionSupport();
        
        console.log('✅ Accessibility enhancements configured');
    }

    /**
     * Apply immediate UX improvements
     */
    applyImmediateImprovements() {
        // Enhance existing buttons
        this.enhanceButtons();
        
        // Improve form interactions
        this.improveFormInteractions();
        
        // Enhance modal interactions
        this.enhanceModalInteractions();
        
        // Improve loading states
        this.improveLoadingStates();
        
        console.log('✅ Immediate UX improvements applied');
    }

    // Public API methods for showing loading, progress, notifications, etc.

    /**
     * Show loading indicator for operation
     */
    showLoading(operation = 'default', message = 'Loading...') {
        const spinner = document.getElementById('ux-loading-spinner');
        if (spinner) {
            const textElement = spinner.querySelector('.spinner-text');
            if (textElement) {
                textElement.textContent = message;
            }
            spinner.classList.add('active');
        }

        // Track operation
        this.components.loadingIndicators.set(operation, {
            isActive: true,
            startTime: Date.now(),
            element: spinner
        });
    }

    /**
     * Hide loading indicator
     */
    hideLoading(operation = 'default') {
        const spinner = document.getElementById('ux-loading-spinner');
        if (spinner) {
            spinner.classList.remove('active');
        }

        // Update operation tracking
        const operationData = this.components.loadingIndicators.get(operation);
        if (operationData) {
            operationData.isActive = false;
            operationData.endTime = Date.now();
        }
    }

    /**
     * Show progress indicator
     */
    showProgress(percentage, message = '') {
        const container = document.getElementById('ux-progress-container');
        const fill = document.getElementById('ux-progress-fill');
        const text = document.getElementById('ux-progress-text');

        if (container && fill && text) {
            container.style.display = 'block';
            fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            text.textContent = message || `${Math.round(percentage)}%`;
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const container = document.getElementById('ux-progress-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `ux-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);

        return notification;
    }

    /**
     * Handle errors with user-friendly messages and retry options
     */
    handleError(error, context = {}) {
        console.error('UX Error Handler:', error, context);

        // Determine error type and appropriate response
        const errorType = this.categorizeError(error);
        const userMessage = this.getUserFriendlyMessage(error, errorType);
        
        // Show error notification
        this.showNotification(userMessage, 'error', 8000);

        // Offer retry if applicable
        if (this.canRetry(errorType, context)) {
            this.offerRetry(error, context);
        }

        // Log error for debugging
        this.logError(error, context, errorType);
    }

    /**
     * Categorize error for appropriate handling
     */
    categorizeError(error) {
        if (!error) return 'unknown';
        
        const message = error.message || error.toString();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        } else if (message.includes('auth') || message.includes('401')) {
            return 'authentication';
        } else if (message.includes('storage') || message.includes('quota')) {
            return 'storage';
        } else if (message.includes('timeout')) {
            return 'timeout';
        } else {
            return 'application';
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error, errorType) {
        const messages = {
            network: 'Connection issue detected. Please check your internet connection and try again.',
            authentication: 'Authentication required. Please log in to continue.',
            storage: 'Storage limit reached. Please clear some space and try again.',
            timeout: 'Operation timed out. Please try again.',
            application: 'Something went wrong. Please try again or contact support if the issue persists.'
        };

        return messages[errorType] || messages.application;
    }

    /**
     * Check if operation can be retried
     */
    canRetry(errorType, context) {
        const retryableTypes = ['network', 'timeout', 'application'];
        return retryableTypes.includes(errorType) && !context.noRetry;
    }

    /**
     * Offer retry option to user
     */
    offerRetry(error, context) {
        // Implementation for retry UI would go here
        console.log('Retry option available for:', error);
    }

    /**
     * Log error for debugging
     */
    logError(error, context, errorType) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.toString(),
            stack: error.stack,
            context,
            errorType,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Store in components error handler
        if (this.components.errorHandler) {
            this.components.errorHandler.errorHistory.push(errorLog);
            
            // Keep only last 50 errors
            if (this.components.errorHandler.errorHistory.length > 50) {
                this.components.errorHandler.errorHistory.shift();
            }
        }
    }

    // Additional helper methods for specific UX improvements...

    /**
     * Enhance existing buttons with better feedback
     */
    enhanceButtons() {
        document.querySelectorAll('button').forEach(button => {
            if (!button.classList.contains('ux-enhanced')) {
                button.classList.add('ux-enhanced');
                
                // Add click feedback
                button.addEventListener('click', (e) => {
                    this.addClickFeedback(button);
                });

                // Add loading state capability
                button.addEventListener('loading-start', () => {
                    button.classList.add('ux-button-loading');
                    button.disabled = true;
                });

                button.addEventListener('loading-end', () => {
                    button.classList.remove('ux-button-loading');
                    button.disabled = false;
                });
            }
        });
    }

    /**
     * Add visual click feedback
     */
    addClickFeedback(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, this.config.feedbackDelay);
    }

    /**
     * Improve form interactions
     */
    improveFormInteractions() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('ux-enhanced')) {
                input.classList.add('ux-enhanced');
                
                // Add focus enhancement
                input.addEventListener('focus', () => {
                    input.classList.add('ux-accessibility-focus');
                });

                input.addEventListener('blur', () => {
                    input.classList.remove('ux-accessibility-focus');
                });

                // Add validation feedback
                input.addEventListener('invalid', () => {
                    this.showValidationError(input);
                });
            }
        });
    }

    /**
     * Show validation error for form field
     */
    showValidationError(input) {
        const message = input.validationMessage || 'Please check this field';
        
        // Create or update error message
        let errorElement = input.parentNode.querySelector('.ux-field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'ux-field-error';
            input.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '4px';
    }

    /**
     * Enhance modal interactions
     */
    enhanceModalInteractions() {
        document.querySelectorAll('.modal, .auth-modal').forEach(modal => {
            if (!modal.classList.contains('ux-enhanced')) {
                modal.classList.add('ux-enhanced');
                
                // Add escape key handling
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && !modal.classList.contains('modal-hidden')) {
                        this.closeModal(modal);
                    }
                });

                // Add click outside to close
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
            }
        });
    }

    /**
     * Close modal with animation
     */
    closeModal(modal) {
        modal.classList.add('modal-hidden');
        
        // Focus management
        const lastFocusedElement = document.querySelector('[data-last-focused]');
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement.removeAttribute('data-last-focused');
        }
    }

    /**
     * Improve loading states across the application
     */
    improveLoadingStates() {
        // Enhance download button loading
        const downloadButton = document.getElementById('download-button');
        if (downloadButton && !downloadButton.classList.contains('ux-enhanced')) {
            downloadButton.classList.add('ux-enhanced');
            
            const originalClick = downloadButton.onclick;
            downloadButton.onclick = async (e) => {
                this.showLoading('download', 'Preparing download...');
                
                try {
                    if (originalClick) {
                        await originalClick.call(downloadButton, e);
                    }
                } finally {
                    this.hideLoading('download');
                }
            };
        }

        // Enhance auth form loading
        document.querySelectorAll('form').forEach(form => {
            if (!form.classList.contains('ux-enhanced')) {
                form.classList.add('ux-enhanced');
                
                form.addEventListener('submit', (e) => {
                    const submitButton = form.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.dispatchEvent(new Event('loading-start'));
                        
                        // Auto-remove loading after timeout
                        setTimeout(() => {
                            submitButton.dispatchEvent(new Event('loading-end'));
                        }, 10000);
                    }
                });
            }
        });
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Ensure all interactive elements are keyboard accessible
        document.querySelectorAll('button, a, input, select, textarea').forEach(element => {
            if (!element.hasAttribute('tabindex') && !element.disabled) {
                element.setAttribute('tabindex', '0');
            }
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + D for download
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const downloadButton = document.getElementById('download-button');
                if (downloadButton && !downloadButton.disabled) {
                    downloadButton.click();
                }
            }
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Add ARIA labels where missing
        document.querySelectorAll('button, input, select').forEach(element => {
            if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
                const label = element.textContent || element.placeholder || element.title;
                if (label) {
                    element.setAttribute('aria-label', label.trim());
                }
            }
        });

        // Add live regions for dynamic content
        if (!document.getElementById('ux-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'ux-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
    }

    /**
     * Setup high contrast mode
     */
    setupHighContrastMode() {
        // Detect high contrast preference
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('ux-high-contrast');
        }

        // Listen for changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
                if (e.matches) {
                    document.body.classList.add('ux-high-contrast');
                } else {
                    document.body.classList.remove('ux-high-contrast');
                }
            });
        }
    }

    /**
     * Setup reduced motion support
     */
    setupReducedMotionSupport() {
        // Detect reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('ux-reduced-motion');
        }

        // Listen for changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
                if (e.matches) {
                    document.body.classList.add('ux-reduced-motion');
                } else {
                    document.body.classList.remove('ux-reduced-motion');
                }
            });
        }
    }

    // Additional monitoring and optimization methods...

    /**
     * Monitor file generation operations
     */
    monitorFileGeneration() {
        // This would integrate with existing file generation systems
        // to provide progress updates
    }

    /**
     * Monitor download operations
     */
    monitorDownloads() {
        // This would integrate with existing download systems
        // to provide progress updates
    }

    /**
     * Monitor network connectivity
     */
    monitorNetworkConnectivity() {
        window.addEventListener('online', () => {
            this.showNotification('Connection restored', 'success', 3000);
        });

        window.addEventListener('offline', () => {
            this.showNotification('Connection lost. Some features may not work.', 'warning', 8000);
        });
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                
                if (usagePercent > 80) {
                    console.warn('High memory usage detected:', usagePercent.toFixed(2) + '%');
                    this.performMemoryCleanup();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        // Clear old error logs
        if (this.components.errorHandler && this.components.errorHandler.errorHistory.length > 20) {
            this.components.errorHandler.errorHistory = this.components.errorHandler.errorHistory.slice(-20);
        }

        // Clear old performance metrics
        if (this.state.userInteractions.length > 100) {
            this.state.userInteractions = this.state.userInteractions.slice(-50);
        }

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Get system status for debugging
     */
    getSystemStatus() {
        return {
            initialized: this.state.isInitialized,
            activeOperations: Array.from(this.state.activeOperations.keys()),
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            errorCount: this.components.errorHandler?.errorHistory.length || 0,
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }
}

// Initialize UX Enhancement System
window.uxEnhancementSystem = new UXEnhancementSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UXEnhancementSystem;
}