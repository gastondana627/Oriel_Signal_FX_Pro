/**
 * API Error Handler with Circuit Breaker and Token Refresh
 * Handles network failures, token refresh, and circuit breaker pattern
 */

class ApiErrorHandler {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || '',
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
            tokenRefreshEndpoint: config.tokenRefreshEndpoint || '/api/auth/refresh',
            ...config
        };

        // Circuit breaker state
        this.circuitBreakers = new Map();
        
        // Request tracking
        this.pendingRequests = new Map();
        this.requestQueue = [];
        
        // Token management
        this.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        
        // Error tracking
        this.errorHistory = [];
        this.maxErrorHistory = 100;
        
        this.init();
    }

    /**
     * Initialize API error handler
     */
    init() {
        this.setupRequestInterceptors();
        this.setupResponseInterceptors();
        
        console.log('API Error Handler initialized');
    }

    /**
     * Setup request interceptors
     */
    setupRequestInterceptors() {
        // Override fetch to add error handling
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            const requestId = this.generateRequestId();
            const fullUrl = this.resolveUrl(url);
            const endpoint = this.getEndpointKey(fullUrl);
            
            try {
                // Check circuit breaker
                if (this.isCircuitBreakerOpen(endpoint)) {
                    throw new Error(`Circuit breaker open for ${endpoint}`);
                }
                
                // Add timeout
                const timeoutController = new AbortController();
                const timeoutId = setTimeout(() => timeoutController.abort(), this.config.timeout);
                
                const requestOptions = {
                    ...options,
                    signal: options.signal || timeoutController.signal
                };
                
                // Add authentication if available
                requestOptions.headers = await this.addAuthHeaders(requestOptions.headers || {});
                
                // Track request
                this.trackRequest(requestId, endpoint, requestOptions);
                
                // Make request
                const response = await originalFetch(fullUrl, requestOptions);
                
                clearTimeout(timeoutId);
                
                // Handle response
                return this.handleResponse(response, requestId, endpoint, fullUrl, requestOptions);
                
            } catch (error) {
                return this.handleRequestError(error, requestId, endpoint, fullUrl, options);
            }
        };
    }

    /**
     * Setup response interceptors
     */
    setupResponseInterceptors() {
        // This is handled in handleResponse method
    }

    /**
     * Handle successful response
     */
    async handleResponse(response, requestId, endpoint, url, options) {
        this.untrackRequest(requestId);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(endpoint);
        
        // Handle specific status codes
        if (response.status === 401) {
            return this.handleUnauthorized(response, endpoint, url, options);
        }
        
        if (response.status === 429) {
            return this.handleRateLimit(response, endpoint, url, options);
        }
        
        if (response.status >= 500) {
            return this.handleServerError(response, endpoint, url, options);
        }
        
        if (!response.ok) {
            return this.handleClientError(response, endpoint, url, options);
        }
        
        return response;
    }

    /**
     * Handle request errors (network, timeout, etc.)
     */
    async handleRequestError(error, requestId, endpoint, url, options) {
        this.untrackRequest(requestId);
        this.recordError(endpoint, error);
        
        // Handle specific error types
        if (error.name === 'AbortError') {
            return this.handleTimeout(error, endpoint, url, options);
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return this.handleNetworkError(error, endpoint, url, options);
        }
        
        if (error.message.includes('Circuit breaker open')) {
            return this.handleCircuitBreakerError(error, endpoint);
        }
        
        // Generic error handling
        throw this.createApiError(error.message, 0, endpoint, error);
    }

    /**
     * Handle 401 Unauthorized responses
     */
    async handleUnauthorized(response, endpoint, url, options) {
        // Don't try to refresh token for auth endpoints
        if (url.includes('/auth/') || url.includes('/login')) {
            throw this.createApiError('Authentication failed', 401, endpoint);
        }
        
        try {
            // Attempt token refresh
            await this.refreshToken();
            
            // Retry original request with new token
            const newHeaders = await this.addAuthHeaders(options.headers || {});
            const retryOptions = { ...options, headers: newHeaders };
            
            return window.fetch(url, retryOptions);
            
        } catch (refreshError) {
            // Token refresh failed, redirect to login
            this.handleAuthenticationFailure();
            throw this.createApiError('Authentication required', 401, endpoint, refreshError);
        }
    }

    /**
     * Handle 429 Rate Limited responses
     */
    async handleRateLimit(response, endpoint, url, options) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay * 2;
        
        // Log rate limit
        if (window.enhancedLogger) {
            window.enhancedLogger.warn('Rate limit hit', {
                endpoint: endpoint,
                retryAfter: delay
            });
        }
        
        // Wait and retry
        await this.delay(delay);
        return window.fetch(url, options);
    }

    /**
     * Handle 5xx Server Error responses
     */
    async handleServerError(response, endpoint, url, options) {
        this.recordError(endpoint, { status: response.status, message: 'Server error' });
        
        // Try to get error details
        let errorMessage = 'Server error occurred';
        try {
            const errorData = await response.clone().json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Ignore JSON parsing errors
        }
        
        // Check if we should retry
        if (this.shouldRetryServerError(response.status)) {
            return this.retryWithBackoff(url, options, endpoint);
        }
        
        throw this.createApiError(errorMessage, response.status, endpoint);
    }

    /**
     * Handle 4xx Client Error responses
     */
    async handleClientError(response, endpoint, url, options) {
        let errorMessage = 'Request failed';
        let errorDetails = null;
        
        try {
            const errorData = await response.clone().json();
            errorMessage = errorData.message || errorMessage;
            errorDetails = errorData;
        } catch (e) {
            // Ignore JSON parsing errors
        }
        
        throw this.createApiError(errorMessage, response.status, endpoint, null, errorDetails);
    }

    /**
     * Handle timeout errors
     */
    async handleTimeout(error, endpoint, url, options) {
        this.recordError(endpoint, { message: 'Request timeout' });
        
        // Retry with exponential backoff
        return this.retryWithBackoff(url, options, endpoint);
    }

    /**
     * Handle network errors
     */
    async handleNetworkError(error, endpoint, url, options) {
        this.recordError(endpoint, { message: 'Network error' });
        
        // Check if online
        if (!navigator.onLine) {
            throw this.createApiError('No internet connection', 0, endpoint, error);
        }
        
        // Retry with exponential backoff
        return this.retryWithBackoff(url, options, endpoint);
    }

    /**
     * Handle circuit breaker errors
     */
    handleCircuitBreakerError(error, endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        const retryAfter = breaker ? this.config.circuitBreakerTimeout - (Date.now() - breaker.openedAt) : 0;
        
        throw this.createApiError(
            'Service temporarily unavailable',
            503,
            endpoint,
            error,
            { retryAfter: Math.max(0, retryAfter) }
        );
    }

    /**
     * Retry request with exponential backoff
     */
    async retryWithBackoff(url, options, endpoint, attempt = 1) {
        if (attempt > this.config.maxRetries) {
            throw this.createApiError('Max retries exceeded', 0, endpoint);
        }
        
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        
        if (window.enhancedLogger) {
            window.enhancedLogger.info('Retrying request', {
                endpoint: endpoint,
                attempt: attempt,
                delay: delay
            });
        }
        
        await this.delay(delay);
        
        try {
            return await window.fetch(url, options);
        } catch (error) {
            return this.retryWithBackoff(url, options, endpoint, attempt + 1);
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        // Prevent multiple simultaneous refresh attempts
        if (this.isRefreshingToken) {
            return this.tokenRefreshPromise;
        }
        
        this.isRefreshingToken = true;
        
        this.tokenRefreshPromise = this.performTokenRefresh();
        
        try {
            const result = await this.tokenRefreshPromise;
            this.isRefreshingToken = false;
            return result;
        } catch (error) {
            this.isRefreshingToken = false;
            throw error;
        }
    }

    /**
     * Perform actual token refresh
     */
    async performTokenRefresh() {
        try {
            const refreshToken = this.getStoredRefreshToken();
            
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }
            
            const response = await fetch(this.config.tokenRefreshEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            // Store new tokens
            this.storeTokens(data.accessToken, data.refreshToken);
            
            if (window.enhancedLogger) {
                window.enhancedLogger.info('Token refreshed successfully');
            }
            
            return data;
            
        } catch (error) {
            if (window.enhancedLogger) {
                window.enhancedLogger.error('Token refresh failed', {}, error);
            }
            
            // Clear invalid tokens
            this.clearStoredTokens();
            throw error;
        }
    }

    /**
     * Handle authentication failure
     */
    handleAuthenticationFailure() {
        // Clear stored tokens
        this.clearStoredTokens();
        
        // Notify auth manager if available
        if (window.authManager) {
            window.authManager.handleAuthenticationFailure();
        }
        
        // Show login modal if available
        if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
            window.authManager.showLoginModal('Your session has expired. Please log in again.');
        }
    }

    /**
     * Circuit breaker methods
     */
    isCircuitBreakerOpen(endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        
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

    recordError(endpoint, error) {
        // Record in error history
        this.errorHistory.push({
            endpoint: endpoint,
            error: error,
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
        }
        
        // Update circuit breaker
        const breaker = this.circuitBreakers.get(endpoint) || {
            failures: 0,
            state: 'closed',
            openedAt: null
        };
        
        breaker.failures++;
        
        // Open circuit breaker if threshold exceeded
        if (breaker.failures >= this.config.circuitBreakerThreshold && breaker.state === 'closed') {
            breaker.state = 'open';
            breaker.openedAt = Date.now();
            
            if (window.enhancedLogger) {
                window.enhancedLogger.warn('Circuit breaker opened', {
                    endpoint: endpoint,
                    failures: breaker.failures
                });
            }
        }
        
        this.circuitBreakers.set(endpoint, breaker);
    }

    resetCircuitBreaker(endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
            breaker.openedAt = null;
        }
    }

    /**
     * Token management
     */
    async addAuthHeaders(headers) {
        const token = this.getStoredAccessToken();
        
        if (token) {
            return {
                ...headers,
                'Authorization': `Bearer ${token}`
            };
        }
        
        return headers;
    }

    getStoredAccessToken() {
        try {
            return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        } catch (e) {
            return null;
        }
    }

    getStoredRefreshToken() {
        try {
            return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        } catch (e) {
            return null;
        }
    }

    storeTokens(accessToken, refreshToken) {
        try {
            // Store in localStorage for persistence, fallback to sessionStorage
            if (localStorage) {
                localStorage.setItem('accessToken', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }
            } else if (sessionStorage) {
                sessionStorage.setItem('accessToken', accessToken);
                if (refreshToken) {
                    sessionStorage.setItem('refreshToken', refreshToken);
                }
            }
        } catch (e) {
            console.warn('Failed to store tokens:', e);
        }
    }

    clearStoredTokens() {
        try {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
        } catch (e) {
            console.warn('Failed to clear tokens:', e);
        }
    }

    /**
     * Request tracking
     */
    trackRequest(requestId, endpoint, options) {
        this.pendingRequests.set(requestId, {
            endpoint: endpoint,
            startTime: Date.now(),
            options: options
        });
    }

    untrackRequest(requestId) {
        this.pendingRequests.delete(requestId);
    }

    /**
     * Utility methods
     */
    resolveUrl(url) {
        if (url.startsWith('http')) {
            return url;
        }
        return this.config.baseUrl + url;
    }

    getEndpointKey(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch (e) {
            return url;
        }
    }

    shouldRetryServerError(status) {
        // Retry on 500, 502, 503, 504
        return status >= 500 && status <= 504;
    }

    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createApiError(message, status, endpoint, originalError = null, details = null) {
        const error = new Error(message);
        error.name = 'ApiError';
        error.status = status;
        error.endpoint = endpoint;
        error.originalError = originalError;
        error.details = details;
        error.timestamp = Date.now();
        
        return error;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Public API methods
     */
    
    /**
     * Get API statistics
     */
    getStats() {
        return {
            pendingRequests: this.pendingRequests.size,
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            errorHistory: this.errorHistory.slice(-10), // Last 10 errors
            isRefreshingToken: this.isRefreshingToken
        };
    }

    /**
     * Reset circuit breakers
     */
    resetAllCircuitBreakers() {
        this.circuitBreakers.clear();
        
        if (window.enhancedLogger) {
            window.enhancedLogger.info('All circuit breakers reset');
        }
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
    }

    /**
     * Force token refresh
     */
    async forceTokenRefresh() {
        this.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        
        return this.refreshToken();
    }

    /**
     * Check if endpoint is healthy
     */
    isEndpointHealthy(endpoint) {
        const breaker = this.circuitBreakers.get(endpoint);
        return !breaker || breaker.state === 'closed';
    }

    /**
     * Get endpoint health status
     */
    getEndpointHealth() {
        const health = {};
        
        for (const [endpoint, breaker] of this.circuitBreakers.entries()) {
            health[endpoint] = {
                state: breaker.state,
                failures: breaker.failures,
                healthy: breaker.state === 'closed'
            };
        }
        
        return health;
    }
}

// Initialize global API error handler
window.apiErrorHandler = new ApiErrorHandler({
    baseUrl: window.appConfig?.getApiUrl() || '',
    timeout: 30000,
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiErrorHandler;
}