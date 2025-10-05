/**
 * Centralized Error Management System
 * Provides unified error handling, intelligent retry logic, and spam prevention
 * Integrates with existing error recovery and logging systems
 */

class CentralizedErrorManager {
    constructor(config = {}) {
        this.config = {
            maxRetries: config.maxRetries || 3,
            baseRetryDelay: config.baseRetryDelay || 1000,
            maxRetryDelay: config.maxRetryDelay || 30000,
            spamThreshold: config.spamThreshold || 5,
            spamWindow: config.spamWindow || 60000, // 1 minute
            enableCircuitBreaker: config.enableCircuitBreaker !== false,
            circuitBreakerThreshold: config.circuitBreakerThreshold || 10,
            circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
            enableGracefulDegradation: config.enableGracefulDegradation !== false,
            ...config
        };

        // Error tracking and spam prevention
        this.errorCounts = new Map();
        this.retryAttempts = new Map();
        this.circuitBreakers = new Map();
        this.spamFilter = new Map();
        
        // Error categories and handlers
        this.errorHandlers = new Map();
        this.recoveryStrategies = new Map();
        this.degradationHandlers = new Map();
        
        // Integration with existing systems
        this.errorRecoverySystem = null;
        this.enhancedLogger = null;
        this.errorMonitor = null;
        
        this.init();
    }

    /**
     * Initialize the error management system
     */
    init() {
        this.setupIntegrations();
        this.registerDefaultHandlers();
        this.setupGlobalErrorHandling();
        
        console.log('Centralized Error Manager initialized');
    }

    /**
     * Setup integrations with existing error systems
     */
    setupIntegrations() {
        // Integrate with existing error recovery system
        if (window.errorRecoverySystem) {
            this.errorRecoverySystem = window.errorRecoverySystem;
        }
        
        // Integrate with enhanced logger
        if (window.enhancedLogger) {
            this.enhancedLogger = window.enhancedLogger;
        }
        
        // Integrate with error monitor
        if (window.errorMonitor) {
            this.errorMonitor = window.errorMonitor;
        }
    }

    /**
     * Register default error handlers for common scenarios
     */
    registerDefaultHandlers() {
        // API Error Handlers
        this.registerErrorHandler('api_timeout', this.handleApiTimeout.bind(this));
        this.registerErrorHandler('api_rate_limit', this.handleRateLimit.bind(this));
        this.registerErrorHandler('api_server_error', this.handleServerError.bind(this));
        this.registerErrorHandler('api_network_error', this.handleNetworkError.bind(this));
        
        // Authentication Error Handlers
        this.registerErrorHandler('auth_token_expired', this.handleTokenExpired.bind(this));
        this.registerErrorHandler('auth_invalid_credentials', this.handleInvalidCredentials.bind(this));
        this.registerErrorHandler('auth_session_expired', this.handleSessionExpired.bind(this));
        
        // UI Error Handlers
        this.registerErrorHandler('ui_modal_not_found', this.handleModalNotFound.bind(this));
        this.registerErrorHandler('ui_element_not_found', this.handleElementNotFound.bind(this));
        this.registerErrorHandler('ui_render_error', this.handleRenderError.bind(this));
        
        // File Processing Error Handlers
        this.registerErrorHandler('file_upload_failed', this.handleFileUploadFailed.bind(this));
        this.registerErrorHandler('file_processing_error', this.handleFileProcessingError.bind(this));
        
        // Recovery Strategies
        this.registerRecoveryStrategy('retry_with_backoff', this.retryWithExponentialBackoff.bind(this));
        this.registerRecoveryStrategy('refresh_token', this.refreshAuthToken.bind(this));
        this.registerRecoveryStrategy('fallback_endpoint', this.tryFallbackEndpoint.bind(this));
        this.registerRecoveryStrategy('graceful_degradation', this.enableGracefulDegradation.bind(this));
    }

    /**
     * Setup global error handling to catch unhandled errors
     */
    setupGlobalErrorHandling() {
        // Override console.error to filter spam
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (!this.isSpamMessage(message)) {
                originalConsoleError.apply(console, args);
            }
        };

        // Override console.warn to filter spam
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
            const message = args.join(' ');
            if (!this.isSpamMessage(message)) {
                originalConsoleWarn.apply(console, args);
            }
        };
    }

    /**
     * Main error handling entry point
     */
    async handleError(error, context = {}) {
        try {
            // Normalize error object
            const normalizedError = this.normalizeError(error, context);
            
            // Check for spam
            if (this.isSpamError(normalizedError)) {
                this.logSpamPrevention(normalizedError);
                return { success: false, error: 'Spam filtered', spamFiltered: true };
            }
            
            // Check circuit breaker
            if (this.isCircuitBreakerOpen(normalizedError.category)) {
                return this.handleCircuitBreakerOpen(normalizedError);
            }
            
            // Log the error
            this.logError(normalizedError);
            
            // Increment error count for circuit breaker
            this.incrementErrorCount(normalizedError.category);
            
            // Find appropriate handler
            const handler = this.findErrorHandler(normalizedError);
            
            if (handler) {
                const result = await handler(normalizedError, context);
                
                // Reset error count on success
                if (result.success) {
                    this.resetErrorCount(normalizedError.category);
                }
                
                return result;
            }
            
            // Fallback to default handling
            return this.handleDefaultError(normalizedError, context);
            
        } catch (handlingError) {
            console.error('Error in error handling:', handlingError);
            return { success: false, error: 'Error handling failed' };
        }
    }

    /**
     * Normalize error into standard format
     */
    normalizeError(error, context = {}) {
        const normalized = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            message: '',
            type: 'unknown',
            category: 'general',
            severity: 'medium',
            retryable: false,
            context: context,
            originalError: error
        };

        // Handle different error types
        if (error instanceof Error) {
            normalized.message = error.message;
            normalized.stack = error.stack;
            normalized.name = error.name;
        } else if (typeof error === 'string') {
            normalized.message = error;
        } else if (error && typeof error === 'object') {
            normalized.message = error.message || error.error || 'Unknown error';
            normalized.status = error.status;
            normalized.code = error.code;
            
            // Handle HTTP errors
            if (error.status) {
                normalized.category = 'api';
                normalized.type = this.categorizeHttpError(error.status);
                normalized.retryable = this.isRetryableHttpError(error.status);
                normalized.severity = this.getHttpErrorSeverity(error.status);
            }
        }

        // Categorize based on message content
        if (normalized.category === 'general') {
            normalized.category = this.categorizeErrorByMessage(normalized.message);
            normalized.type = this.getErrorTypeByMessage(normalized.message);
        }

        // Add context information
        normalized.url = window.location.href;
        normalized.userAgent = navigator.userAgent;
        normalized.online = navigator.onLine;

        return normalized;
    }

    /**
     * Check if error should be filtered as spam
     */
    isSpamError(error) {
        const key = `${error.category}:${error.type}:${error.message}`;
        const now = Date.now();
        
        if (!this.spamFilter.has(key)) {
            this.spamFilter.set(key, { count: 1, firstSeen: now, lastSeen: now });
            return false;
        }
        
        const spam = this.spamFilter.get(key);
        spam.count++;
        spam.lastSeen = now;
        
        // Check if within spam window and above threshold
        if (now - spam.firstSeen < this.config.spamWindow && spam.count > this.config.spamThreshold) {
            return true;
        }
        
        // Reset if outside window
        if (now - spam.firstSeen > this.config.spamWindow) {
            spam.count = 1;
            spam.firstSeen = now;
        }
        
        return false;
    }

    /**
     * Check if message is spam (for console filtering)
     */
    isSpamMessage(message) {
        const spamPatterns = [
            /Failed to fetch/i,
            /NetworkError/i,
            /ERR_NETWORK/i,
            /ERR_INTERNET_DISCONNECTED/i,
            /Download modal not found/i,
            /Health check failed/i,
            /Preferences sync failed/i,
            /401.*unauthorized/i
        ];
        
        return spamPatterns.some(pattern => pattern.test(message));
    }

    /**
     * Log spam prevention action
     */
    logSpamPrevention(error) {
        if (this.enhancedLogger) {
            this.enhancedLogger.debug('Spam filtered error', {
                category: error.category,
                type: error.type,
                message: error.message.substring(0, 100)
            });
        }
    }

    /**
     * Check if circuit breaker is open for category
     */
    isCircuitBreakerOpen(category) {
        if (!this.config.enableCircuitBreaker) return false;
        
        const breaker = this.circuitBreakers.get(category);
        if (!breaker) return false;
        
        if (breaker.state === 'open') {
            // Check if timeout has passed
            if (Date.now() - breaker.openedAt > this.config.circuitBreakerTimeout) {
                breaker.state = 'half-open';
                return false;
            }
            return true;
        }
        
        return false;
    }

    /**
     * Handle circuit breaker open state
     */
    handleCircuitBreakerOpen(error) {
        if (this.enhancedLogger) {
            this.enhancedLogger.warn('Circuit breaker open', {
                category: error.category,
                message: 'Service temporarily disabled due to repeated failures'
            });
        }
        
        return {
            success: false,
            error: 'Service temporarily unavailable',
            circuitBreakerOpen: true,
            retryAfter: this.config.circuitBreakerTimeout
        };
    }

    /**
     * Increment error count for circuit breaker
     */
    incrementErrorCount(category) {
        if (!this.config.enableCircuitBreaker) return;
        
        const count = this.errorCounts.get(category) || 0;
        this.errorCounts.set(category, count + 1);
        
        // Check if threshold exceeded
        if (count + 1 >= this.config.circuitBreakerThreshold) {
            this.circuitBreakers.set(category, {
                state: 'open',
                openedAt: Date.now()
            });
            
            if (this.enhancedLogger) {
                this.enhancedLogger.warn('Circuit breaker opened', {
                    category: category,
                    errorCount: count + 1
                });
            }
        }
    }

    /**
     * Reset error count for category
     */
    resetErrorCount(category) {
        this.errorCounts.delete(category);
        
        // Close circuit breaker if it was open
        const breaker = this.circuitBreakers.get(category);
        if (breaker && breaker.state !== 'closed') {
            breaker.state = 'closed';
            
            if (this.enhancedLogger) {
                this.enhancedLogger.info('Circuit breaker closed', { category: category });
            }
        }
    }

    /**
     * Find appropriate error handler
     */
    findErrorHandler(error) {
        // Try specific handler first
        const specificKey = `${error.category}_${error.type}`;
        if (this.errorHandlers.has(specificKey)) {
            return this.errorHandlers.get(specificKey);
        }
        
        // Try category handler
        if (this.errorHandlers.has(error.category)) {
            return this.errorHandlers.get(error.category);
        }
        
        return null;
    }

    /**
     * Register error handler for specific error type
     */
    registerErrorHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
    }

    /**
     * Register recovery strategy
     */
    registerRecoveryStrategy(strategyName, strategy) {
        this.recoveryStrategies.set(strategyName, strategy);
    }

    /**
     * Register degradation handler
     */
    registerDegradationHandler(feature, handler) {
        this.degradationHandlers.set(feature, handler);
    }

    /**
     * Default error handlers
     */
    async handleApiTimeout(error, context) {
        if (this.enhancedLogger) {
            this.enhancedLogger.warn('API timeout detected', { endpoint: context.endpoint });
        }
        
        return this.retryWithExponentialBackoff(error, context);
    }

    async handleRateLimit(error, context) {
        const retryAfter = error.retryAfter || 60000; // Default 1 minute
        
        if (this.enhancedLogger) {
            this.enhancedLogger.warn('Rate limit hit', { 
                endpoint: context.endpoint,
                retryAfter: retryAfter
            });
        }
        
        // Wait for retry-after period
        await this.delay(retryAfter);
        
        return this.retryWithExponentialBackoff(error, context);
    }

    async handleServerError(error, context) {
        if (this.enhancedLogger) {
            this.enhancedLogger.error('Server error detected', {
                endpoint: context.endpoint,
                status: error.status
            });
        }
        
        // Try fallback endpoint if available
        if (context.fallbackEndpoint) {
            return this.tryFallbackEndpoint(error, context);
        }
        
        return this.retryWithExponentialBackoff(error, context);
    }

    async handleNetworkError(error, context) {
        if (!navigator.onLine) {
            return {
                success: false,
                error: 'No internet connection',
                retryWhenOnline: true
            };
        }
        
        return this.retryWithExponentialBackoff(error, context);
    }

    async handleTokenExpired(error, context) {
        if (this.enhancedLogger) {
            this.enhancedLogger.info('Token expired, attempting refresh');
        }
        
        return this.refreshAuthToken(error, context);
    }

    async handleInvalidCredentials(error, context) {
        // Clear stored credentials and redirect to login
        if (window.authManager) {
            window.authManager.clearCredentials();
            window.authManager.showLoginModal();
        }
        
        return {
            success: false,
            error: 'Invalid credentials',
            requiresLogin: true
        };
    }

    async handleSessionExpired(error, context) {
        // Similar to invalid credentials but with different message
        if (window.authManager) {
            window.authManager.clearSession();
            window.authManager.showLoginModal('Your session has expired. Please log in again.');
        }
        
        return {
            success: false,
            error: 'Session expired',
            requiresLogin: true
        };
    }

    async handleModalNotFound(error, context) {
        // Create modal dynamically if possible
        if (context.modalType && window.modalManager) {
            try {
                await window.modalManager.createModal(context.modalType);
                return { success: true, recovered: true };
            } catch (createError) {
                // Fall back to graceful degradation
                return this.enableGracefulDegradation(error, context);
            }
        }
        
        return this.enableGracefulDegradation(error, context);
    }

    async handleElementNotFound(error, context) {
        // Try to recreate element or use alternative
        if (context.elementId && context.fallbackAction) {
            try {
                await context.fallbackAction();
                return { success: true, recovered: true };
            } catch (fallbackError) {
                return this.enableGracefulDegradation(error, context);
            }
        }
        
        return this.enableGracefulDegradation(error, context);
    }

    async handleRenderError(error, context) {
        // Try to re-render component or use fallback
        if (context.component && context.fallbackRenderer) {
            try {
                await context.fallbackRenderer();
                return { success: true, recovered: true };
            } catch (renderError) {
                return this.enableGracefulDegradation(error, context);
            }
        }
        
        return this.enableGracefulDegradation(error, context);
    }

    async handleFileUploadFailed(error, context) {
        // Try alternative upload method or smaller chunks
        if (context.file && context.alternativeUpload) {
            try {
                const result = await context.alternativeUpload(context.file);
                return { success: true, data: result, recovered: true };
            } catch (altError) {
                return this.retryWithExponentialBackoff(error, context);
            }
        }
        
        return this.retryWithExponentialBackoff(error, context);
    }

    async handleFileProcessingError(error, context) {
        // Try different processing parameters or fallback processor
        if (context.fallbackProcessor) {
            try {
                const result = await context.fallbackProcessor(context.file);
                return { success: true, data: result, recovered: true };
            } catch (procError) {
                return {
                    success: false,
                    error: 'File processing failed',
                    suggestion: 'Try a different file format or smaller file size'
                };
            }
        }
        
        return {
            success: false,
            error: 'File processing failed',
            suggestion: 'Please try again with a different file'
        };
    }

    /**
     * Recovery strategies
     */
    async retryWithExponentialBackoff(error, context) {
        const key = context.endpoint || context.operation || 'default';
        const attempts = this.retryAttempts.get(key) || 0;
        
        if (attempts >= this.config.maxRetries) {
            this.retryAttempts.delete(key);
            return {
                success: false,
                error: 'Max retries exceeded',
                maxRetriesExceeded: true
            };
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.config.baseRetryDelay * Math.pow(2, attempts),
            this.config.maxRetryDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;
        
        if (this.enhancedLogger) {
            this.enhancedLogger.info('Retrying operation', {
                key: key,
                attempt: attempts + 1,
                delay: totalDelay
            });
        }
        
        this.retryAttempts.set(key, attempts + 1);
        
        await this.delay(totalDelay);
        
        // Execute retry function if provided
        if (context.retryFunction) {
            try {
                const result = await context.retryFunction();
                this.retryAttempts.delete(key);
                return { success: true, data: result, recovered: true };
            } catch (retryError) {
                return this.handleError(retryError, context);
            }
        }
        
        return {
            success: false,
            error: 'Retry function not provided',
            canRetry: true,
            retryDelay: totalDelay
        };
    }

    async refreshAuthToken(error, context) {
        if (window.authManager && typeof window.authManager.refreshToken === 'function') {
            try {
                await window.authManager.refreshToken();
                
                // Retry original operation if provided
                if (context.retryFunction) {
                    const result = await context.retryFunction();
                    return { success: true, data: result, recovered: true };
                }
                
                return { success: true, tokenRefreshed: true };
            } catch (refreshError) {
                return this.handleInvalidCredentials(refreshError, context);
            }
        }
        
        return this.handleInvalidCredentials(error, context);
    }

    async tryFallbackEndpoint(error, context) {
        if (!context.fallbackEndpoint) {
            return { success: false, error: 'No fallback endpoint available' };
        }
        
        if (this.enhancedLogger) {
            this.enhancedLogger.info('Trying fallback endpoint', {
                original: context.endpoint,
                fallback: context.fallbackEndpoint
            });
        }
        
        // Update context with fallback endpoint
        const fallbackContext = { ...context, endpoint: context.fallbackEndpoint };
        
        if (context.retryFunction) {
            try {
                const result = await context.retryFunction(fallbackContext);
                return { success: true, data: result, usedFallback: true };
            } catch (fallbackError) {
                return this.retryWithExponentialBackoff(fallbackError, fallbackContext);
            }
        }
        
        return { success: false, error: 'Fallback retry function not provided' };
    }

    async enableGracefulDegradation(error, context) {
        if (!this.config.enableGracefulDegradation) {
            return { success: false, error: error.message };
        }
        
        const feature = context.feature || 'unknown';
        const handler = this.degradationHandlers.get(feature);
        
        if (handler) {
            try {
                const result = await handler(error, context);
                return { success: true, degraded: true, ...result };
            } catch (degradationError) {
                if (this.enhancedLogger) {
                    this.enhancedLogger.error('Degradation handler failed', {
                        feature: feature,
                        error: degradationError.message
                    });
                }
            }
        }
        
        // Default degradation - show user-friendly message
        return {
            success: false,
            error: 'Feature temporarily unavailable',
            degraded: true,
            userMessage: 'This feature is temporarily unavailable. Please try again later.'
        };
    }

    /**
     * Handle default error when no specific handler found
     */
    async handleDefaultError(error, context) {
        // Delegate to existing error recovery system if available
        if (this.errorRecoverySystem) {
            return this.errorRecoverySystem.handleApiError(error.originalError, context);
        }
        
        // Basic fallback handling
        return {
            success: false,
            error: error.message,
            suggestion: 'Please try again or contact support if the problem persists'
        };
    }

    /**
     * Log error using available logging systems
     */
    logError(error) {
        // Use enhanced logger if available
        if (this.enhancedLogger) {
            this.enhancedLogger.error(error.message, {
                errorId: error.id,
                category: error.category,
                type: error.type,
                severity: error.severity,
                context: error.context
            }, error.originalError);
        }
        
        // Use error monitor if available
        if (this.errorMonitor) {
            this.errorMonitor.handleError(error.originalError, error.context);
        }
    }

    /**
     * Utility methods
     */
    categorizeHttpError(status) {
        if (status >= 500) return 'server_error';
        if (status === 429) return 'rate_limit';
        if (status === 408) return 'timeout';
        if (status === 401) return 'unauthorized';
        if (status === 403) return 'forbidden';
        if (status === 404) return 'not_found';
        if (status >= 400) return 'client_error';
        return 'unknown';
    }

    isRetryableHttpError(status) {
        return status >= 500 || status === 429 || status === 408;
    }

    getHttpErrorSeverity(status) {
        if (status >= 500) return 'high';
        if (status === 429 || status === 408) return 'medium';
        if (status >= 400) return 'low';
        return 'medium';
    }

    categorizeErrorByMessage(message) {
        const msg = message.toLowerCase();
        
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
            return 'network';
        }
        if (msg.includes('auth') || msg.includes('login') || msg.includes('token')) {
            return 'auth';
        }
        if (msg.includes('modal') || msg.includes('element') || msg.includes('render')) {
            return 'ui';
        }
        if (msg.includes('file') || msg.includes('upload') || msg.includes('download')) {
            return 'file';
        }
        
        return 'general';
    }

    getErrorTypeByMessage(message) {
        const msg = message.toLowerCase();
        
        if (msg.includes('timeout')) return 'timeout';
        if (msg.includes('not found')) return 'not_found';
        if (msg.includes('expired')) return 'expired';
        if (msg.includes('invalid')) return 'invalid';
        if (msg.includes('failed')) return 'failed';
        
        return 'unknown';
    }

    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Public API methods
     */
    
    /**
     * Get error statistics
     */
    getStats() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            spamFiltered: this.spamFilter.size,
            retryAttempts: Object.fromEntries(this.retryAttempts)
        };
    }

    /**
     * Reset all error tracking
     */
    reset() {
        this.errorCounts.clear();
        this.retryAttempts.clear();
        this.circuitBreakers.clear();
        this.spamFilter.clear();
        
        if (this.enhancedLogger) {
            this.enhancedLogger.info('Error manager reset');
        }
    }

    /**
     * Enable/disable specific features
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.enhancedLogger) {
            this.enhancedLogger.info('Error manager config updated', { config: newConfig });
        }
    }
}

// Initialize global centralized error manager
window.centralizedErrorManager = new CentralizedErrorManager({
    maxRetries: 3,
    baseRetryDelay: 1000,
    spamThreshold: 3,
    enableCircuitBreaker: true,
    enableGracefulDegradation: true
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CentralizedErrorManager;
}