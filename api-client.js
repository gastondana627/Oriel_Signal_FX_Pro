/**
 * API Client utility for backend communication
 * Handles HTTP requests with JWT token attachment and error handling
 */
class ApiClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.token = null;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Load token from localStorage on initialization
        this.loadToken();
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
            const response = await fetch(url, config);
            
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

            // Apply response interceptors
            const { response: interceptedResponse, error: interceptedError } = 
                await this.applyResponseInterceptors(result, null);

            if (interceptedError) {
                throw interceptedError;
            }

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.response = result;
                error.status = response.status;
                throw error;
            }

            return interceptedResponse || result;

        } catch (error) {
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
}

// Export for use in other modules (prevent duplicates)
if (!window.ApiClient) {
    window.ApiClient = ApiClient;
}