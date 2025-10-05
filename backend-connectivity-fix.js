/**
 * Backend Connectivity Fix - Comprehensive backend status detection and fixes
 * Ensures proper communication between frontend and backend
 */

(function() {
    'use strict';
    
    console.log('🔗 Initializing backend connectivity diagnostics...');
    
    class BackendConnectivityManager {
        constructor() {
            this.isBackendOnline = false;
            this.lastSuccessfulCheck = null;
            this.checkInterval = 30000; // 30 seconds
            this.retryAttempts = 0;
            this.maxRetries = 5;
            this.baseUrls = this.detectPossibleUrls();
            this.currentBaseUrl = null;
            
            this.init();
        }
        
        detectPossibleUrls() {
            const hostname = window.location.hostname;
            const protocol = window.location.protocol;
            
            // Possible backend URLs to try
            const urls = [];
            
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Local development - try common ports
                urls.push('http://localhost:9999');
                urls.push('http://localhost:5000');
                urls.push('http://localhost:8000');
                urls.push('http://127.0.0.1:9999');
            } else {
                // Production - try relative and absolute URLs
                urls.push(''); // Relative URL (same domain)
                urls.push(`${protocol}//${hostname}`);
                
                // If on Railway or similar platform
                if (hostname.includes('railway') || hostname.includes('herokuapp')) {
                    urls.push(`${protocol}//${hostname}`);
                }
            }
            
            return urls;
        }
        
        async init() {
            console.log('🔍 Testing backend connectivity...');
            
            // Try to find working backend URL
            await this.findWorkingBackend();
            
            // Start periodic health checks
            this.startHealthChecks();
            
            // Update system status display
            this.updateSystemStatus();
        }
        
        async findWorkingBackend() {
            for (const baseUrl of this.baseUrls) {
                console.log(`🧪 Testing backend at: ${baseUrl || 'relative URL'}`);
                
                try {
                    const testUrl = baseUrl ? `${baseUrl}/api/health` : '/api/health';
                    const response = await fetch(testUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 5000
                    });
                    
                    if (response.ok) {
                        this.currentBaseUrl = baseUrl;
                        this.isBackendOnline = true;
                        this.lastSuccessfulCheck = new Date();
                        this.retryAttempts = 0;
                        
                        console.log(`✅ Backend found at: ${baseUrl || 'relative URL'}`);
                        
                        // Update global API client
                        if (window.apiClient) {
                            window.apiClient.baseUrl = baseUrl;
                        }
                        
                        return true;
                    }
                } catch (error) {
                    console.log(`⚠️ Backend not available at: ${baseUrl || 'relative URL'}`);
                }
            }
            
            console.log('❌ No working backend found');
            this.isBackendOnline = false;
            return false;
        }
        
        async checkBackendHealth() {
            if (!this.currentBaseUrl && this.currentBaseUrl !== '') {
                // Try to find backend again
                return await this.findWorkingBackend();
            }
            
            try {
                const healthUrl = this.currentBaseUrl ? 
                    `${this.currentBaseUrl}/api/health` : 
                    '/api/health';
                
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000
                });
                
                if (response.ok) {
                    this.isBackendOnline = true;
                    this.lastSuccessfulCheck = new Date();
                    this.retryAttempts = 0;
                    return true;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                this.retryAttempts++;
                
                if (this.retryAttempts >= this.maxRetries) {
                    this.isBackendOnline = false;
                    console.log('❌ Backend appears to be offline after multiple attempts');
                    
                    // Try to find alternative backend
                    setTimeout(() => {
                        this.findWorkingBackend();
                    }, 10000);
                }
                
                return false;
            }
        }
        
        startHealthChecks() {
            // Initial check
            this.checkBackendHealth();
            
            // Periodic checks
            setInterval(async () => {
                await this.checkBackendHealth();
                this.updateSystemStatus();
            }, this.checkInterval);
        }
        
        updateSystemStatus() {
            // Update system test page if it exists
            const backendStatusElements = document.querySelectorAll('[data-status="backend"]');
            backendStatusElements.forEach(element => {
                element.textContent = this.isBackendOnline ? 'Online' : 'Offline';
                element.style.color = this.isBackendOnline ? '#22c55e' : '#ef4444';
            });
            
            // Update any backend status indicators
            const statusIndicators = document.querySelectorAll('.backend-status');
            statusIndicators.forEach(indicator => {
                indicator.classList.toggle('online', this.isBackendOnline);
                indicator.classList.toggle('offline', !this.isBackendOnline);
            });
            
            // Show notification if backend goes offline
            if (!this.isBackendOnline && this.lastSuccessfulCheck) {
                const timeSinceLastSuccess = Date.now() - this.lastSuccessfulCheck.getTime();
                if (timeSinceLastSuccess > 60000) { // 1 minute
                    if (window.notificationManager) {
                        window.notificationManager.show(
                            'Backend connection lost. Some features may not work.', 
                            'warning'
                        );
                    }
                }
            }
        }
        
        getStatus() {
            return {
                isOnline: this.isBackendOnline,
                baseUrl: this.currentBaseUrl,
                lastCheck: this.lastSuccessfulCheck,
                retryAttempts: this.retryAttempts
            };
        }
        
        async forceReconnect() {
            console.log('🔄 Forcing backend reconnection...');
            this.retryAttempts = 0;
            const success = await this.findWorkingBackend();
            this.updateSystemStatus();
            
            if (success && window.notificationManager) {
                window.notificationManager.show('Backend connection restored!', 'success');
            }
            
            return success;
        }
    }
    
    // Initialize backend connectivity manager
    const backendConnectivity = new BackendConnectivityManager();
    window.backendConnectivity = backendConnectivity;
    
    // Fix system test page if it exists
    if (document.querySelector('#system-status')) {
        setTimeout(() => {
            const systemStatus = document.querySelector('#system-status');
            if (systemStatus) {
                // Add backend status indicator
                const backendStatus = document.createElement('div');
                backendStatus.innerHTML = `
                    <div class="status-item">
                        <span class="status-label">Backend:</span>
                        <span class="status-value" data-status="backend">Checking...</span>
                        <button onclick="window.backendConnectivity.forceReconnect()" class="geometric-button" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">
                            Reconnect
                        </button>
                    </div>
                `;
                systemStatus.appendChild(backendStatus);
            }
        }, 1000);
    }
    
    // Override fetch to use correct base URL
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // If it's an API call and we have a working backend URL
        if (typeof url === 'string' && url.startsWith('/api/') && 
            backendConnectivity.currentBaseUrl) {
            url = `${backendConnectivity.currentBaseUrl}${url}`;
        }
        
        return originalFetch.call(this, url, options);
    };
    
    console.log('✅ Backend connectivity diagnostics initialized');
    
})();