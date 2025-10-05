/**
 * API Client utility for backend communication
 * Handles HTTP requests with JWT token attachment and error handling
 * Integrates with API Error Handler for comprehensive error management
 */
class ApiClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.token = null;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Error handling integration
        this.errorHandler = null;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        // Load token from localStorage on initialization
        this.loadToken();
        
        // Initialize error handling integration
        this.initializeErrorHandling();
    }

    /**
     * Initialize error handling integration
     */
    initializeErrorHandling() {
        // Wait for API error handler to be available
        if (window.apiErrorHandler) {
            this.errorHandler = window.apiErrorHandler;
        } else {
            // Retry initialization after a short delay
            setTimeout(() => this.initializeErrorHandling(), 100);
        }
    }

    /**
     * Load JWT token from localStorage
     */
    loadToken() {
        this.token = localStorage.getItem('oriel_jwt_token');
    }

    /**
     * Save JWT token to localStorage
     */
    saveToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('oriel_jwt_token', token);
        } else {
            localStorage.removeItem('oriel_jwt_token');
        }
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(config) {
        let modifiedConfig = { ...config };
        for (const interceptor of this.requestInterceptors) {
            modifiedConfig = await interceptor(modifiedConfig);
        }
        return modifiedConfig;
    }

    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response, error = null) {
        let modifiedResponse = response;
        let modifiedError = error;
        
        for (const interceptor of this.responseInterceptors) {
            const result = await interceptor(modifiedResponse, modifiedError);
            if (result.response !== undefined) modifiedResponse = result.response;
            if (result.error !== undefined) modifiedError = result.error;
        }
        
        return { response: modifiedResponse, error: modifiedError };
    }

    /**
     * Create request headers with JWT token if available
     */
    createHeaders(additionalHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make HTTP request with error handling and interceptors
     */
    async makeRequest(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestKey = `${method}:${endpoint}`;
        
        let config = {
            method: method.toUpperCase(),
            headers: this.createHeaders(options.headers),
            ...options
        };

        // Add body for POST, PUT, PATCH requests
        if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            config.body = JSON.stringify(data);
        }

        // Apply request interceptors
        config = await this.applyRequestInterceptors(config);

        try {
            // Use API error handler if available, otherwise use native fetch
            let response;
            if (this.errorHandler) {
                // The API error handler overrides fetch, so we can use it directly
                response = await fetch(url, config);
            } else {
                response = await this.makeRequestWithFallback(url, config, requestKey);
            }
            
            // Handle different response types
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            const result = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                ok: response.ok
            };

            // Reset retry count on success
            this.retryAttempts.delete(requestKey);

            // Apply response interceptors
            const { response: interceptedResponse, error: interceptedError } = 
                await this.applyResponseInterceptors(result, null);

            if (interceptedError) {
                throw interceptedError;
            }

            if (!response.ok) {
                const error = this.createApiError(response, result, endpoint);
                throw error;
            }

            return interceptedResponse || result;

        } catch (error) {
            // Handle errors with fallback error handling if API error handler not available
            if (!this.errorHandler) {
                return this.handleErrorFallback(error, requestKey, url, config, endpoint);
            }
            
            // Apply response interceptors for errors
            const { error: interceptedError } = 
                await this.applyResponseInterceptors(null, error);
            
            throw interceptedError || error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.makeRequest('GET', endpoint, null, options);
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.makeRequest('POST', endpoint, data, options);
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.makeRequest('PUT', endpoint, data, options);
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.makeRequest('DELETE', endpoint, null, options);
    }

    /**
     * PATCH request
     */
    async patch(endpoint, data, options = {}) {
        return this.makeRequest('PATCH', endpoint, data, options);
    }

    /**
     * Upload file with multipart/form-data
     */
    async uploadFile(endpoint, file, additionalData = {}, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional form data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const config = {
            method: 'POST',
            headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
            body: formData,
            ...options
        };

        // Don't set Content-Type for FormData, let browser set it with boundary
        delete config.headers['Content-Type'];

        return this.makeRequest('POST', endpoint, null, {
            ...config,
            body: formData
        });
    }

    /**
     * Make request with fallback error handling when API error handler is not available
     */
    async makeRequestWithFallback(url, config, requestKey) {
        try {
            return await fetch(url, config);
        } catch (error) {
            // Handle network errors with basic retry logic
            if (this.shouldRetryError(error)) {
                return this.retryRequestWithBackoff(url, config, requestKey);
            }
            throw error;
        }
    }

    /**
     * Handle errors with fallback logic when API error handler is not available
     */
    async handleErrorFallback(error, requestKey, url, config, endpoint) {
        // Handle specific error types
        if (error.status === 401 && !endpoint.includes('/auth/')) {
            return this.handleUnauthorizedFallback(error, url, config);
        }

        if (error.status === 429) {
            return this.handleRateLimitFallback(error, url, config, requestKey);
        }

        if (this.shouldRetryError(error)) {
            return this.retryRequestWithBackoff(url, config, requestKey);
        }

        // Show user-friendly error message
        this.showUserFriendlyError(error);

        // Apply response interceptors for errors
        const { error: interceptedError } = 
            await this.applyResponseInterceptors(null, error);
        
        throw interceptedError || error;
    }

    /**
     * Handle 401 unauthorized errors with token refresh
     */
    async handleUnauthorizedFallback(error, url, config) {
        try {
            // Attempt token refresh if auth manager is available
            if (window.authManager && typeof window.authManager.refreshToken === 'function') {
                const refreshResult = await window.authManager.refreshToken();
                
                if (refreshResult.success) {
                    // Update token and retry request
                    this.loadToken();
                    config.headers = this.createHeaders(config.headers);
                    return fetch(url, config);
                }
            }
            
            // Token refresh failed, redirect to login
            this.handleAuthenticationFailure();
            throw error;
            
        } catch (refreshError) {
            this.handleAuthenticationFailure();
            throw error;
        }
    }

    /**
     * Handle rate limit errors with delay
     */
    async handleRateLimitFallback(error, url, config, requestKey) {
        const retryAfter = error.response?.headers?.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
        
        // Show user-friendly message
        if (window.notifications) {
            window.notifications.show(`Rate limit reached. Retrying in ${Math.ceil(delay/1000)} seconds...`, 'warning');
        }
        
        await this.delay(delay);
        return fetch(url, config);
    }

    /**
     * Retry request with exponential backoff
     */
    async retryRequestWithBackoff(url, config, requestKey) {
        const attempts = this.retryAttempts.get(requestKey) || 0;
        
        if (attempts >= this.maxRetries) {
            this.retryAttempts.delete(requestKey);
            throw new Error('Maximum retry attempts exceeded');
        }

        const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds
        this.retryAttempts.set(requestKey, attempts + 1);

        if (window.enhancedLogger) {
            window.enhancedLogger.info('Retrying request', {
                url: url,
                attempt: attempts + 1,
                delay: delay
            });
        }

        await this.delay(delay);
        return fetch(url, config);
    }

    /**
     * Check if error should be retried
     */
    shouldRetryError(error) {
        // Retry on network errors or 5xx server errors
        if (error.message && (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_NETWORK')
        )) {
            return true;
        }

        if (error.status >= 500 && error.status <= 504) {
            return true;
        }

        return false;
    }

    /**
     * Create API error with enhanced information
     */
    createApiError(response, result, endpoint) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.name = 'ApiError';
        error.response = result;
        error.status = response.status;
        error.endpoint = endpoint;
        error.timestamp = Date.now();

        // Add user-friendly message
        error.userMessage = this.getUserFriendlyErrorMessage(response.status);

        return error;
    }

    /**
     * Get user-friendly error message based on status code
     */
    getUserFriendlyErrorMessage(status) {
        switch (status) {
            case 400:
                return 'Invalid request. Please check your input and try again.';
            case 401:
                return 'Authentication required. Please log in and try again.';
            case 403:
                return 'Access denied. You don\'t have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
                return 'Server error occurred. Please try again later.';
            case 502:
                return 'Service temporarily unavailable. Please try again later.';
            case 503:
                return 'Service maintenance in progress. Please try again later.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Show user-friendly error message
     */
    showUserFriendlyError(error) {
        const message = error.userMessage || error.message || 'An unexpected error occurred';
        
        if (window.notifications) {
            window.notifications.show(message, 'error');
        } else if (window.enhancedLogger) {
            window.enhancedLogger.error('API Error', { message: message });
        }
    }

    /**
     * Handle authentication failure
     */
    handleAuthenticationFailure() {
        // Clear stored tokens
        this.token = null;
        localStorage.removeItem('oriel_jwt_token');
        
        // Notify auth manager if available
        if (window.authManager && typeof window.authManager.handleAuthenticationFailure === 'function') {
            window.authManager.handleAuthenticationFailure();
        }
        
        // Show login modal if available
        if (window.authUI && typeof window.authUI.showLoginModal === 'function') {
            window.authUI.showLoginModal('Your session has expired. Please log in again.');
        }
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API error statistics
     */
    getErrorStats() {
        return {
            retryAttempts: Object.fromEntries(this.retryAttempts),
            errorHandlerAvailable: !!this.errorHandler,
            maxRetries: this.maxRetries
        };
    }

    /**
     * Reset error tracking
     */
    resetErrorTracking() {
        this.retryAttempts.clear();
    }
}

// Export for use in other modules (prevent duplicates)
if (!window.ApiClient) {
    window.ApiClient = ApiClient;
}