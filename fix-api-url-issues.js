/**
 * Fix API URL Issues
 * Ensures all API requests use the correct base URL and handles common URL issues
 */

(function() {
    'use strict';
    
    console.log('🔧 Fixing API URL issues...');
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    // Get the correct API base URL
    function getApiBaseUrl() {
        if (window.appConfig && typeof window.appConfig.getApiUrl === 'function') {
            return window.appConfig.getApiUrl();
        }
        
        // Fallback to localhost
        return 'http://localhost:8000';
    }
    
    // Fix relative URLs to use correct base URL
    function fixApiUrl(url) {
        // If it's already a full URL, return as-is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        const baseUrl = getApiBaseUrl();
        
        // Handle common problematic patterns
        if (url === 'health') {
            return `${baseUrl}/api/health`;
        }
        
        if (url.startsWith('/api/')) {
            return `${baseUrl}${url}`;
        }
        
        if (url.startsWith('api/')) {
            return `${baseUrl}/${url}`;
        }
        
        // If it starts with /, it's an absolute path
        if (url.startsWith('/')) {
            return `${baseUrl}${url}`;
        }
        
        // Otherwise, assume it's a relative API path
        return `${baseUrl}/api/${url}`;
    }
    
    // Override fetch to fix URLs
    window.fetch = function(url, options = {}) {
        const fixedUrl = fixApiUrl(url);
        
        // Log URL fixes for debugging
        if (url !== fixedUrl) {
            console.log(`🔧 Fixed API URL: "${url}" → "${fixedUrl}"`);
        }
        
        // Ensure proper headers for API requests
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        const mergedOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        
        return originalFetch(fixedUrl, mergedOptions);
    };
    
    // Also fix XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        const fixedUrl = fixApiUrl(url);
        
        if (url !== fixedUrl) {
            console.log(`🔧 Fixed XHR URL: "${url}" → "${fixedUrl}"`);
        }
        
        return originalXHROpen.call(this, method, fixedUrl, ...args);
    };
    
    // Add error handling for common network issues
    window.addEventListener('error', (event) => {
        if (event.target && event.target.tagName) {
            const tag = event.target.tagName.toLowerCase();
            const src = event.target.src || event.target.href;
            
            if (src && (src.includes('health') || src.includes('api'))) {
                console.error('🚨 Resource loading error:', {
                    tag,
                    src,
                    error: event.error || 'Unknown error'
                });
                
                // Try to provide helpful information
                if (src === 'health' || src.endsWith('/health')) {
                    console.log('💡 Tip: Health endpoint should be accessed at /api/health');
                }
            }
        }
    });
    
    // Monitor for unhandled promise rejections (fetch errors)
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message) {
            const message = event.reason.message.toLowerCase();
            
            if (message.includes('fetch') || message.includes('network') || message.includes('404')) {
                console.error('🚨 Network request failed:', event.reason);
                
                // Provide debugging information
                console.log('🔍 Debugging info:');
                console.log('  - API Base URL:', getApiBaseUrl());
                console.log('  - Current location:', window.location.href);
                console.log('  - App config available:', !!window.appConfig);
            }
        }
    });
    
    // Test the API connection
    function testApiConnection() {
        try {
            const baseUrl = getApiBaseUrl();
            console.log(`🧪 Testing API connection to: ${baseUrl}`);
            
            fetch(`${baseUrl}/api/health`)
                .then(response => {
                    if (response.ok) {
                        console.log('✅ API connection test successful');
                        return response.json();
                    } else {
                        console.warn(`⚠️ API connection test returned ${response.status}`);
                        throw new Error(`HTTP ${response.status}`);
                    }
                })
                .then(data => {
                    console.log('📊 API health data:', data);
                })
                .catch(error => {
                    console.warn('⚠️ API connection test failed:', error.message);
                });
        } catch (error) {
            console.warn('⚠️ API test setup failed:', error.message);
        }
    }
    
    // Run API test after a short delay
    setTimeout(testApiConnection, 2000);
    
    console.log('✅ API URL fixes applied');
    
})();

console.log('📦 API URL fix system loaded');