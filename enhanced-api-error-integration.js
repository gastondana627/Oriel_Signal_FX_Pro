/**
 * Enhanced API Error Integration
 * Ensures proper integration between API client, error handlers, and auth manager
 * Implements user-friendly error messages and circuit breaker patterns
 */

class EnhancedApiErrorIntegration {
    constructor() {
        this.initialized = false;
        this.components = {
            apiClient: null,
            apiErrorHandler: null,
            authManager: null,
            centralizedErrorManager: null,
            notifications: null
        };
        
        this.init();
    }

    /**
     * Initialize the integration system
     */
    init() {
        // Wait for all components to be available
        this.waitForComponents().then(() => {
            this.setupIntegration();
            this.initialized = true;
            console.log('✅ Enhanced API Error Integration initialized');
        }).catch(error => {
            console.error('❌ Failed to initialize API error integration:', error);
        });
    }

    /**
     * Wait for all required components to be available
     */
    async waitForComponents() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let elapsed = 0;

        return new Promise((resolve, reject) => {
            const checkComponents = () => {
                // Check for required components
                this.components.apiClient = window.ApiClient ? new window.ApiClient() : null;
                this.components.apiErrorHandler = window.apiErrorHandler;
                this.components.authManager = window.authManager;
                this.components.centralizedErrorManager = window.centralizedErrorManager;
                this.components.notifications = window.notifications;

                // Check if core components are available
                const coreAvailable = this.components.apiErrorHandler && this.components.authManager;

                if (coreAvailable) {
                    resolve();
                } else {
                    elapsed += checkInterval;
                    if (elapsed >= maxWaitTime) {
                        reject(new Error('Timeout waiting for components'));
                    } else {
                        setTimeout(checkComponents, checkInterval);
                    }
                }
            };

            checkComponents();
        });
    }

    /**
     * Setup integration between components
     */
    setupIntegration() {
        this.setupApiClientIntegration();
        this.setupErrorHandlerIntegration();
        this.setupAuthManagerIntegration();
        this.setupGlobalErrorHandling();
        this.setupUserFriendlyMessages();
    }

    /**
     * Setup API client integration
     */
    setupApiClientIntegration() {
        if (!this.components.apiClient) return;

        // Add response interceptor for enhanced error handling
        this.components.apiClient.addResponseInterceptor(async (response, error) => {
            if (error) {
                // Handle API errors with user-friendly messages
                const handledError = await this.handleApiError(error);
                return { response, error: handledError };
            }

            // Handle successful responses
            if (response && !response.ok) {
                const apiError = this.createEnhancedApiError(response);
                const handledError = await this.handleApiError(apiError);
                return { response, error: handledError };
            }

            return { response, error };
        });

        console.log('✅ API Client integration setup complete');
    }

    /**
     * Setup error handler integration
     */
    setupErrorHandlerIntegration() {
        if (!this.components.apiErrorHandler) return;

        // Register custom error handlers for specific scenarios
        if (this.components.centralizedErrorManager) {
            // Register API-specific error handlers
            this.components.centralizedErrorManager.registerErrorHandler('api_auth_failure', 
                this.handleAuthenticationError.bind(this));
            this.components.centralizedErrorManager.registerErrorHandler('api_network_failure', 
                this.handleNetworkError.bind(this));
            this.components.centralizedErrorManager.registerErrorHandler('api_server_error', 
                this.handleServerError.bind(this));
        }

        console.log('✅ Error Handler integration setup complete');
    }

    /**
     * Setup auth manager integration
     */
    setupAuthManagerIntegration() {
        if (!this.components.authManager) return;

        // Listen for auth state changes
        window.addEventListener('oriel_auth_state_changed', (event) => {
            this.handleAuthStateChange(event.detail);
        });

        console.log('✅ Auth Manager integration setup complete');
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.name === 'ApiError') {
                this.handleApiError(event.reason);
                event.preventDefault(); // Prevent console spam
            }
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            if (event.error && event.error.name === 'ApiError') {
                this.handleApiError(event.error);
            }
        });

        console.log('✅ Global error handling setup complete');
    }

    /**
     * Setup user-friendly error messages
     */
    setupUserFriendlyMessages() {
        // Define user-friendly messages for common errors
        this.userMessages = {
            'NETWORK_ERROR': 'Connection problem detected. Please check your internet connection and try again.',
            'SERVER_ERROR': 'Our servers are experiencing issues. Please try again in a few moments.',
            'AUTH_ERROR': 'Your session has expired. Please log in again to continue.',
            'RATE_LIMIT': 'You\'re making requests too quickly. Please wait a moment and try again.',
            'NOT_FOUND': 'The requested resource could not be found.',
            'FORBIDDEN': 'You don\'t have permission to access this resource.',
            'BAD_REQUEST': 'There was an issue with your request. Please check your input and try again.',
            'TIMEOUT': 'The request took too long to complete. Please try again.',
            'CIRCUIT_BREAKER': 'This service is temporarily unavailable due to repeated failures. Please try again later.'
        };

        console.log('✅ User-friendly messages setup complete');
    }

    /**
     * Handle API errors with enhanced logic
     */
    async handleApiError(error) {
        try {
            // Determine error category
            const category = this.categorizeError(error);
            
            // Get user-friendly message
            const userMessage = this.getUserFriendlyMessage(error, category);
            
            // Show notification if available
            if (this.components.notifications) {
                this.components.notifications.show(userMessage, this.getNotificationType(category));
            }

            // Log error for debugging
            if (window.enhancedLogger) {
                window.enhancedLogger.error('API Error handled', {
                    category: category,
                    status: error.status,
                    endpoint: error.endpoint,
                    userMessage: userMessage
                }, error);
            }

            // Handle specific error types
            switch (category) {
                case 'AUTH_ERROR':
                    return this.handleAuthenticationError(error);
                case 'NETWORK_ERROR':
                    return this.handleNetworkError(error);
                case 'SERVER_ERROR':
                    return this.handleServerError(error);
                case 'RATE_LIMIT':
                    return this.handleRateLimitError(error);
                default:
                    return this.handleGenericError(error);
            }

        } catch (handlingError) {
            console.error('Error in error handling:', handlingError);
            return error; // Return original error if handling fails
        }
    }

    /**
     * Categorize error for appropriate handling
     */
    categorizeError(error) {
        if (!error) return 'UNKNOWN';

        // Check status code
        if (error.status === 401) return 'AUTH_ERROR';
        if (error.status === 403) return 'FORBIDDEN';
        if (error.status === 404) return 'NOT_FOUND';
        if (error.status === 429) return 'RATE_LIMIT';
        if (error.status >= 500) return 'SERVER_ERROR';
        if (error.status >= 400) return 'BAD_REQUEST';

        // Check error message
        const message = error.message?.toLowerCase() || '';
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('timeout')) return 'TIMEOUT';
        if (message.includes('circuit breaker')) return 'CIRCUIT_BREAKER';

        return 'UNKNOWN';
    }

    /**
     * Get user-friendly message for error
     */
    getUserFriendlyMessage(error, category) {
        // Check if error already has a user message
        if (error.userMessage) return error.userMessage;

        // Use predefined messages
        if (this.userMessages[category]) {
            return this.userMessages[category];
        }

        // Fallback message
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }

    /**
     * Get notification type for error category
     */
    getNotificationType(category) {
        switch (category) {
            case 'AUTH_ERROR':
                return 'warning';
            case 'NETWORK_ERROR':
            case 'SERVER_ERROR':
                return 'error';
            case 'RATE_LIMIT':
            case 'TIMEOUT':
                return 'warning';
            case 'CIRCUIT_BREAKER':
                return 'info';
            default:
                return 'error';
        }
    }

    /**
     * Handle authentication errors
     */
    async handleAuthenticationError(error, context = {}) {
        if (this.components.authManager) {
            this.components.authManager.handleAuthenticationFailure();
        }

        return {
            success: false,
            error: 'Authentication required',
            userMessage: 'Your session has expired. Please log in again.',
            requiresLogin: true
        };
    }

    /**
     * Handle network errors
     */
    async handleNetworkError(error, context = {}) {
        // Check if online
        if (!navigator.onLine) {
            return {
                success: false,
                error: 'No internet connection',
                userMessage: 'You appear to be offline. Please check your internet connection.',
                retryWhenOnline: true
            };
        }

        return {
            success: false,
            error: 'Network error',
            userMessage: 'Connection problem detected. Please try again.',
            retryable: true
        };
    }

    /**
     * Handle server errors
     */
    async handleServerError(error, context = {}) {
        return {
            success: false,
            error: 'Server error',
            userMessage: 'Our servers are experiencing issues. Please try again in a few moments.',
            retryable: true,
            retryDelay: 5000 // 5 seconds
        };
    }

    /**
     * Handle rate limit errors
     */
    async handleRateLimitError(error, context = {}) {
        const retryAfter = error.retryAfter || 60000; // Default 1 minute

        return {
            success: false,
            error: 'Rate limit exceeded',
            userMessage: `You're making requests too quickly. Please wait ${Math.ceil(retryAfter/1000)} seconds and try again.`,
            retryable: true,
            retryDelay: retryAfter
        };
    }

    /**
     * Handle generic errors
     */
    async handleGenericError(error, context = {}) {
        return {
            success: false,
            error: error.message || 'Unknown error',
            userMessage: this.getUserFriendlyMessage(error, 'UNKNOWN'),
            retryable: false
        };
    }

    /**
     * Handle auth state changes
     */
    handleAuthStateChange(authState) {
        if (window.enhancedLogger) {
            window.enhancedLogger.info('Auth state changed', {
                isAuthenticated: authState.isAuthenticated,
                hasUser: !!authState.user
            });
        }

        // Reset error tracking on auth state change
        if (this.components.apiClient && typeof this.components.apiClient.resetErrorTracking === 'function') {
            this.components.apiClient.resetErrorTracking();
        }

        if (this.components.apiErrorHandler && typeof this.components.apiErrorHandler.resetAllCircuitBreakers === 'function') {
            this.components.apiErrorHandler.resetAllCircuitBreakers();
        }
    }

    /**
     * Create enhanced API error
     */
    createEnhancedApiError(response) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.name = 'ApiError';
        error.status = response.status;
        error.response = response;
        error.timestamp = Date.now();
        error.userMessage = this.getUserFriendlyMessage(error, this.categorizeError(error));
        
        return error;
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            components: Object.keys(this.components).reduce((status, key) => {
                status[key] = !!this.components[key];
                return status;
            }, {}),
            errorHandling: {
                globalHandlers: true,
                userFriendlyMessages: true,
                circuitBreaker: !!this.components.apiErrorHandler,
                retryLogic: !!this.components.apiErrorHandler
            }
        };
    }
}

// Initialize enhanced API error integration
window.enhancedApiErrorIntegration = new EnhancedApiErrorIntegration();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedApiErrorIntegration;
}