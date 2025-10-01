/**
 * Error Monitor
 * Handles comprehensive error logging, monitoring, and user-friendly error recovery
 */
class ErrorMonitor {
    constructor(apiClient, appConfig, analyticsManager = null) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.analyticsManager = analyticsManager;
        this.isEnabled = appConfig.isFeatureEnabled('errorReporting');
        this.errorQueue = [];
        this.maxQueueSize = 50;
        this.flushInterval = 60000; // 1 minute
        this.userId = null;
        this.sessionId = this.generateSessionId();
        
        this.init();
    }

    /**
     * Initialize error monitoring
     */
    init() {
        if (!this.isEnabled) {
            console.log('Error monitoring is disabled');
            return;
        }

        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
        this.startErrorProcessing();
        
        console.log('Error Monitor initialized');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'error_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set user information
     */
    setUser(userId) {
        this.userId = userId;
    }

    /**
     * Clear user information
     */
    clearUser() {
        this.userId = null;
    }

    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error ? event.error.stack : null
            });
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: 'resource_error',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    source: event.target.src || event.target.href
                });
            }
        }, true);
    }

    /**
     * Set up unhandled promise rejection handler
     */
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'unhandled_promise_rejection',
                message: event.reason ? event.reason.message || event.reason : 'Unhandled promise rejection',
                reason: event.reason,
                stack: event.reason && event.reason.stack ? event.reason.stack : null
            });
        });
    }

    /**
     * Handle and log errors
     */
    handleError(errorData, context = {}) {
        if (!this.isEnabled) return;

        const errorEntry = {
            id: this.generateErrorId(),
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...errorData,
            context: {
                ...context,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                screen: `${screen.width}x${screen.height}`,
                online: navigator.onLine,
                language: navigator.language
            }
        };

        // Add to queue
        this.errorQueue.push(errorEntry);
        
        // Trim queue if too large
        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
        }

        // Log to console in development
        if (this.appConfig.isDevelopment()) {
            console.error('Error captured:', errorEntry);
        }

        // Track in analytics if available
        if (this.analyticsManager) {
            this.analyticsManager.trackError(errorData, context);
        }

        // Show user-friendly message for critical errors
        this.handleUserFeedback(errorEntry);

        // Flush immediately for critical errors
        if (this.isCriticalError(errorEntry)) {
            this.flushErrors(true);
        }
    }

    /**
     * Log API errors
     */
    logApiError(endpoint, method, status, response, requestData = null) {
        this.handleError({
            type: 'api_error',
            message: `API Error: ${method} ${endpoint} - ${status}`,
            endpoint: endpoint,
            method: method,
            status: status,
            response: response,
            requestData: requestData
        });
    }

    /**
     * Log authentication errors
     */
    logAuthError(action, error, details = {}) {
        this.handleError({
            type: 'auth_error',
            message: `Authentication error during ${action}: ${error.message}`,
            action: action,
            error: error.message,
            stack: error.stack
        }, details);
    }

    /**
     * Log payment errors
     */
    logPaymentError(action, error, paymentData = {}) {
        this.handleError({
            type: 'payment_error',
            message: `Payment error during ${action}: ${error.message}`,
            action: action,
            error: error.message,
            paymentData: this.sanitizePaymentData(paymentData)
        });
    }

    /**
     * Log visualizer errors
     */
    logVisualizerError(component, error, settings = {}) {
        this.handleError({
            type: 'visualizer_error',
            message: `Visualizer error in ${component}: ${error.message}`,
            component: component,
            error: error.message,
            stack: error.stack,
            settings: settings
        });
    }

    /**
     * Log file processing errors
     */
    logFileError(operation, error, fileInfo = {}) {
        this.handleError({
            type: 'file_error',
            message: `File error during ${operation}: ${error.message}`,
            operation: operation,
            error: error.message,
            fileInfo: {
                name: fileInfo.name,
                size: fileInfo.size,
                type: fileInfo.type
                // Don't include file content for privacy
            }
        });
    }

    /**
     * Log user interaction errors
     */
    logUserInteractionError(interaction, error, element = null) {
        this.handleError({
            type: 'interaction_error',
            message: `User interaction error: ${interaction} - ${error.message}`,
            interaction: interaction,
            error: error.message,
            element: element ? {
                tagName: element.tagName,
                id: element.id,
                className: element.className
            } : null
        });
    }

    /**
     * Sanitize payment data to remove sensitive information
     */
    sanitizePaymentData(paymentData) {
        const sanitized = { ...paymentData };
        
        // Remove sensitive fields
        delete sanitized.cardNumber;
        delete sanitized.cvv;
        delete sanitized.expiryDate;
        delete sanitized.billingAddress;
        
        return sanitized;
    }

    /**
     * Determine if error is critical
     */
    isCriticalError(errorEntry) {
        const criticalTypes = [
            'payment_error',
            'auth_error',
            'api_error'
        ];
        
        const criticalMessages = [
            'network error',
            'server error',
            'payment failed',
            'authentication failed'
        ];

        return criticalTypes.includes(errorEntry.type) ||
               criticalMessages.some(msg => 
                   errorEntry.message.toLowerCase().includes(msg)
               );
    }

    /**
     * Handle user feedback for errors
     */
    handleUserFeedback(errorEntry) {
        const userMessage = this.getUserFriendlyMessage(errorEntry);
        const recoveryOptions = this.getRecoveryOptions(errorEntry);

        // Show notification if notification manager is available
        if (window.notificationManager) {
            window.notificationManager.showError(userMessage, {
                actions: recoveryOptions,
                persistent: this.isCriticalError(errorEntry)
            });
        } else {
            // Fallback to console or alert
            if (this.isCriticalError(errorEntry)) {
                console.error(userMessage);
            }
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(errorEntry) {
        switch (errorEntry.type) {
            case 'api_error':
                if (errorEntry.status >= 500) {
                    return 'Server error occurred. Please try again in a moment.';
                } else if (errorEntry.status === 401) {
                    return 'Please log in again to continue.';
                } else if (errorEntry.status === 403) {
                    return 'You don\'t have permission to perform this action.';
                } else if (errorEntry.status === 429) {
                    return 'Too many requests. Please wait a moment before trying again.';
                } else {
                    return 'Network error occurred. Please check your connection.';
                }
                
            case 'auth_error':
                return 'Authentication failed. Please try logging in again.';
                
            case 'payment_error':
                return 'Payment processing failed. Please try again or use a different payment method.';
                
            case 'file_error':
                return 'File processing failed. Please try with a different file or check the file format.';
                
            case 'visualizer_error':
                return 'Visualizer error occurred. Please refresh the page and try again.';
                
            case 'resource_error':
                return 'Failed to load required resources. Please refresh the page.';
                
            default:
                return 'An unexpected error occurred. Please refresh the page and try again.';
        }
    }

    /**
     * Get recovery options for errors
     */
    getRecoveryOptions(errorEntry) {
        const options = [];

        switch (errorEntry.type) {
            case 'api_error':
                options.push({
                    text: 'Retry',
                    action: () => this.retryLastAction()
                });
                if (errorEntry.status === 401) {
                    options.push({
                        text: 'Login',
                        action: () => this.showLoginModal()
                    });
                }
                break;
                
            case 'auth_error':
                options.push({
                    text: 'Login Again',
                    action: () => this.showLoginModal()
                });
                break;
                
            case 'payment_error':
                options.push({
                    text: 'Try Again',
                    action: () => this.retryPayment()
                });
                break;
                
            case 'file_error':
                options.push({
                    text: 'Choose Different File',
                    action: () => this.showFileSelector()
                });
                break;
                
            case 'visualizer_error':
            case 'resource_error':
                options.push({
                    text: 'Refresh Page',
                    action: () => window.location.reload()
                });
                break;
        }

        // Always add dismiss option
        options.push({
            text: 'Dismiss',
            action: () => {} // No action needed
        });

        return options;
    }

    /**
     * Recovery action methods
     */
    retryLastAction() {
        // This would be implemented based on the specific application logic
        console.log('Retrying last action...');
    }

    showLoginModal() {
        if (window.authManager) {
            window.authManager.showLoginModal();
        }
    }

    retryPayment() {
        if (window.paymentManager) {
            window.paymentManager.retryLastPayment();
        }
    }

    showFileSelector() {
        // Trigger file input click
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Start error processing
     */
    startErrorProcessing() {
        // Flush errors periodically
        setInterval(() => {
            if (this.errorQueue.length > 0) {
                this.flushErrors();
            }
        }, this.flushInterval);

        // Flush errors before page unload
        window.addEventListener('beforeunload', () => {
            this.flushErrors(true);
        });
    }

    /**
     * Flush errors to backend
     */
    async flushErrors(force = false) {
        if (!this.isEnabled || this.errorQueue.length === 0) return;
        
        // Don't flush if offline unless forced
        if (!navigator.onLine && !force) return;

        const errorsToSend = [...this.errorQueue];
        this.errorQueue = [];

        try {
            await this.apiClient.post('/api/monitoring/errors', {
                errors: errorsToSend,
                sessionId: this.sessionId,
                timestamp: Date.now()
            });

            if (this.appConfig.isDevelopment()) {
                console.log(`Flushed ${errorsToSend.length} error reports`);
            }
        } catch (error) {
            console.error('Failed to send error reports:', error);
            
            // Re-queue errors if they failed to send
            this.errorQueue.unshift(...errorsToSend);
            
            // Store in local storage as backup
            this.storeErrorsLocally(errorsToSend);
        }
    }

    /**
     * Store errors locally when offline
     */
    storeErrorsLocally(errors) {
        try {
            const stored = JSON.parse(localStorage.getItem('error_queue') || '[]');
            stored.push(...errors);
            
            // Keep only last 100 errors to prevent storage overflow
            const trimmed = stored.slice(-100);
            localStorage.setItem('error_queue', JSON.stringify(trimmed));
        } catch (error) {
            console.error('Failed to store errors locally:', error);
        }
    }

    /**
     * Load and send stored errors
     */
    async loadStoredErrors() {
        try {
            const stored = JSON.parse(localStorage.getItem('error_queue') || '[]');
            if (stored.length > 0) {
                await this.apiClient.post('/api/monitoring/errors', {
                    errors: stored,
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    isBacklog: true
                });
                
                localStorage.removeItem('error_queue');
                console.log(`Sent ${stored.length} stored error reports`);
            }
        } catch (error) {
            console.error('Failed to send stored error reports:', error);
        }
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            errorsQueued: this.errorQueue.length,
            isEnabled: this.isEnabled,
            lastError: this.errorQueue.length > 0 ? this.errorQueue[this.errorQueue.length - 1] : null
        };
    }

    /**
     * Enable/disable error monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.flushErrors(true); // Flush remaining errors
        }
    }

    /**
     * Manually report error
     */
    reportError(error, context = {}) {
        this.handleError({
            type: 'manual_error',
            message: error.message || error,
            error: error.message || error,
            stack: error.stack || null
        }, context);
    }

    /**
     * Create error boundary for React-like error handling
     */
    createErrorBoundary(element, fallbackContent = 'An error occurred') {
        const originalContent = element.innerHTML;
        
        try {
            // Wrap element content in try-catch
            return {
                execute: (fn) => {
                    try {
                        return fn();
                    } catch (error) {
                        this.handleError({
                            type: 'boundary_error',
                            message: error.message,
                            error: error.message,
                            stack: error.stack,
                            element: element.tagName
                        });
                        
                        element.innerHTML = fallbackContent;
                        return null;
                    }
                },
                restore: () => {
                    element.innerHTML = originalContent;
                }
            };
        } catch (error) {
            console.error('Failed to create error boundary:', error);
            return null;
        }
    }
}

// Export for use in other modules
window.ErrorMonitor = ErrorMonitor;