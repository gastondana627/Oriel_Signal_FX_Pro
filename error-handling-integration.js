/**
 * Error Handling Integration
 * Integrates all error handling systems and provides unified interface
 */

class ErrorHandlingIntegration {
    constructor() {
        this.systems = {
            centralizedErrorManager: null,
            apiErrorHandler: null,
            cleanLoggingSystem: null,
            errorRecoverySystem: null,
            enhancedLogger: null,
            errorMonitor: null
        };
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        this.init();
    }

    /**
     * Initialize error handling integration
     */
    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform actual initialization
     */
    async performInitialization() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize systems in order
            await this.initializeSystems();
            
            // Setup integrations
            this.setupIntegrations();
            
            // Setup global error handling
            this.setupGlobalErrorHandling();
            
            // Setup application-specific handlers
            this.setupApplicationHandlers();
            
            this.isInitialized = true;
            
            console.log('Error handling integration initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize error handling integration:', error);
            throw error;
        }
    }

    /**
     * Initialize all error handling systems
     */
    async initializeSystems() {
        // Initialize clean logging system first
        if (window.cleanLoggingSystem) {
            this.systems.cleanLoggingSystem = window.cleanLoggingSystem;
        }
        
        // Initialize enhanced logger
        if (window.enhancedLogger) {
            this.systems.enhancedLogger = window.enhancedLogger;
        }
        
        // Initialize API error handler
        if (window.apiErrorHandler) {
            this.systems.apiErrorHandler = window.apiErrorHandler;
        }
        
        // Initialize centralized error manager
        if (window.centralizedErrorManager) {
            this.systems.centralizedErrorManager = window.centralizedErrorManager;
        }
        
        // Initialize existing error recovery system
        if (window.errorRecoverySystem) {
            this.systems.errorRecoverySystem = window.errorRecoverySystem;
        }
        
        // Initialize error monitor (but keep it disabled to prevent cascade)
        if (window.ErrorMonitor && window.apiClient) {
            this.systems.errorMonitor = new window.ErrorMonitor(
                window.apiClient,
                window.appConfig,
                window.analyticsManager
            );
            // Keep error monitor disabled initially
            this.systems.errorMonitor.setEnabled(false);
        }
    }

    /**
     * Setup integrations between systems
     */
    setupIntegrations() {
        // Integrate centralized error manager with other systems
        if (this.systems.centralizedErrorManager) {
            // Register application-specific error handlers
            this.registerApplicationErrorHandlers();
            
            // Register recovery strategies
            this.registerRecoveryStrategies();
            
            // Register degradation handlers
            this.registerDegradationHandlers();
        }
        
        // Setup API client integration
        this.setupApiClientIntegration();
        
        // Setup authentication integration
        this.setupAuthenticationIntegration();
        
        // Setup UI integration
        this.setupUIIntegration();
    }

    /**
     * Register application-specific error handlers
     */
    registerApplicationErrorHandlers() {
        const manager = this.systems.centralizedErrorManager;
        
        // Download modal errors
        manager.registerErrorHandler('download_modal_not_found', async (error, context) => {
            if (window.downloadModal && typeof window.downloadModal.createModal === 'function') {
                try {
                    await window.downloadModal.createModal();
                    return { success: true, recovered: true };
                } catch (createError) {
                    return { success: false, error: 'Failed to create download modal' };
                }
            }
            return { success: false, error: 'Download modal system not available' };
        });
        
        // Health check errors
        manager.registerErrorHandler('health_check_failed', async (error, context) => {
            // Implement exponential backoff for health checks
            const backoffDelay = Math.min(1000 * Math.pow(2, context.attempt || 0), 30000);
            await this.delay(backoffDelay);
            return { success: true, retryAfter: backoffDelay };
        });
        
        // Preferences sync errors
        manager.registerErrorHandler('preferences_sync_failed', async (error, context) => {
            if (window.preferencesManager) {
                try {
                    // Try to sync with fallback method
                    await window.preferencesManager.syncWithFallback();
                    return { success: true, recovered: true };
                } catch (syncError) {
                    // Store preferences locally as fallback
                    window.preferencesManager.storeLocally(context.preferences);
                    return { success: true, degraded: true };
                }
            }
            return { success: false, error: 'Preferences manager not available' };
        });
        
        // Authentication token errors
        manager.registerErrorHandler('auth_token_invalid', async (error, context) => {
            if (window.authManager) {
                try {
                    await window.authManager.refreshToken();
                    return { success: true, recovered: true };
                } catch (refreshError) {
                    window.authManager.redirectToLogin();
                    return { success: false, requiresLogin: true };
                }
            }
            return { success: false, error: 'Auth manager not available' };
        });
    }

    /**
     * Register recovery strategies
     */
    registerRecoveryStrategies() {
        const manager = this.systems.centralizedErrorManager;
        
        // Retry with user notification
        manager.registerRecoveryStrategy('retry_with_notification', async (error, context) => {
            if (window.notificationManager) {
                window.notificationManager.showInfo('Retrying operation...', { timeout: 3000 });
            }
            
            return manager.retryWithExponentialBackoff(error, context);
        });
        
        // Fallback to cached data
        manager.registerRecoveryStrategy('use_cached_data', async (error, context) => {
            if (window.cacheManager && context.cacheKey) {
                const cachedData = await window.cacheManager.get(context.cacheKey);
                if (cachedData) {
                    if (window.notificationManager) {
                        window.notificationManager.showWarning('Using cached data due to network issues');
                    }
                    return { success: true, data: cachedData, cached: true };
                }
            }
            return { success: false, error: 'No cached data available' };
        });
        
        // Offline mode
        manager.registerRecoveryStrategy('enable_offline_mode', async (error, context) => {
            if (window.offlineManager) {
                await window.offlineManager.enable();
                if (window.notificationManager) {
                    window.notificationManager.showInfo('Switched to offline mode');
                }
                return { success: true, offline: true };
            }
            return { success: false, error: 'Offline mode not available' };
        });
    }

    /**
     * Register degradation handlers
     */
    registerDegradationHandlers() {
        const manager = this.systems.centralizedErrorManager;
        
        // Visualizer degradation
        manager.registerDegradationHandler('visualizer', async (error, context) => {
            // Disable advanced visualizer features
            if (window.visualizerManager) {
                window.visualizerManager.enableBasicMode();
                return { message: 'Visualizer running in basic mode' };
            }
            return { message: 'Visualizer temporarily unavailable' };
        });
        
        // Payment degradation
        manager.registerDegradationHandler('payment', async (error, context) => {
            // Show alternative payment methods
            if (window.paymentManager) {
                window.paymentManager.showAlternativePaymentMethods();
                return { message: 'Alternative payment methods available' };
            }
            return { message: 'Payment system temporarily unavailable' };
        });
        
        // File upload degradation
        manager.registerDegradationHandler('file_upload', async (error, context) => {
            // Enable chunked upload or alternative method
            if (window.fileUploadManager) {
                window.fileUploadManager.enableChunkedUpload();
                return { message: 'Using alternative upload method' };
            }
            return { message: 'File upload temporarily limited' };
        });
    }

    /**
     * Setup API client integration
     */
    setupApiClientIntegration() {
        if (window.apiClient && this.systems.centralizedErrorManager) {
            // Override API client error handling
            const originalRequest = window.apiClient.request;
            
            window.apiClient.request = async (method, endpoint, data, options = {}) => {
                try {
                    return await originalRequest.call(window.apiClient, method, endpoint, data, options);
                } catch (error) {
                    // Use centralized error manager
                    const result = await this.systems.centralizedErrorManager.handleError(error, {
                        endpoint: endpoint,
                        method: method,
                        data: data,
                        retryFunction: () => originalRequest.call(window.apiClient, method, endpoint, data, options)
                    });
                    
                    if (result.success) {
                        return result.data;
                    } else {
                        throw new Error(result.error);
                    }
                }
            };
        }
    }

    /**
     * Setup authentication integration
     */
    setupAuthenticationIntegration() {
        if (window.authManager && this.systems.centralizedErrorManager) {
            // Handle authentication errors
            const originalLogin = window.authManager.login;
            
            window.authManager.login = async (credentials) => {
                try {
                    return await originalLogin.call(window.authManager, credentials);
                } catch (error) {
                    const result = await this.systems.centralizedErrorManager.handleError(error, {
                        operation: 'login',
                        retryFunction: () => originalLogin.call(window.authManager, credentials)
                    });
                    
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    
                    return result.data;
                }
            };
        }
    }

    /**
     * Setup UI integration
     */
    setupUIIntegration() {
        // Handle modal errors
        this.setupModalErrorHandling();
        
        // Handle form errors
        this.setupFormErrorHandling();
        
        // Handle navigation errors
        this.setupNavigationErrorHandling();
    }

    /**
     * Setup modal error handling
     */
    setupModalErrorHandling() {
        // Override modal creation to handle errors
        if (window.modalManager) {
            const originalShowModal = window.modalManager.showModal;
            
            window.modalManager.showModal = async (modalType, options = {}) => {
                try {
                    return await originalShowModal.call(window.modalManager, modalType, options);
                } catch (error) {
                    if (this.systems.centralizedErrorManager) {
                        const result = await this.systems.centralizedErrorManager.handleError(error, {
                            modalType: modalType,
                            operation: 'show_modal',
                            fallbackAction: () => this.createFallbackModal(modalType, options)
                        });
                        
                        if (result.success) {
                            return result.data;
                        }
                    }
                    
                    // Fallback to simple alert
                    alert('Modal could not be displayed. Please refresh the page.');
                    throw error;
                }
            };
        }
    }

    /**
     * Setup form error handling
     */
    setupFormErrorHandling() {
        // Add global form error handling
        document.addEventListener('submit', async (event) => {
            const form = event.target;
            
            if (form.tagName === 'FORM') {
                try {
                    // Let the form submit normally, but catch any errors
                } catch (error) {
                    event.preventDefault();
                    
                    if (this.systems.centralizedErrorManager) {
                        await this.systems.centralizedErrorManager.handleError(error, {
                            form: form.id || form.className,
                            operation: 'form_submit'
                        });
                    }
                }
            }
        });
    }

    /**
     * Setup navigation error handling
     */
    setupNavigationErrorHandling() {
        // Handle navigation errors
        window.addEventListener('error', (event) => {
            if (event.target && event.target.tagName === 'A') {
                if (this.systems.centralizedErrorManager) {
                    this.systems.centralizedErrorManager.handleError(event.error, {
                        operation: 'navigation',
                        url: event.target.href
                    });
                }
            }
        });
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', async (event) => {
            if (this.systems.centralizedErrorManager) {
                const result = await this.systems.centralizedErrorManager.handleError(event.reason, {
                    type: 'unhandled_promise_rejection'
                });
                
                if (result.success) {
                    event.preventDefault();
                }
            }
        });
        
        // Handle JavaScript errors
        window.addEventListener('error', async (event) => {
            if (this.systems.centralizedErrorManager) {
                await this.systems.centralizedErrorManager.handleError(event.error, {
                    type: 'javascript_error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }
        });
    }

    /**
     * Create fallback modal
     */
    createFallbackModal(modalType, options) {
        const modal = document.createElement('div');
        modal.className = 'fallback-modal';
        modal.innerHTML = `
            <div class="fallback-modal-content">
                <h3>System Notice</h3>
                <p>The requested feature is temporarily unavailable.</p>
                <button onclick="this.closest('.fallback-modal').remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Utility method for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Public API methods
     */
    
    /**
     * Handle error through integrated system
     */
    async handleError(error, context = {}) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.systems.centralizedErrorManager) {
            return this.systems.centralizedErrorManager.handleError(error, context);
        }
        
        // Fallback to basic error handling
        console.error('Error (fallback handling):', error);
        return { success: false, error: error.message || 'Unknown error' };
    }

    /**
     * Log message through integrated system
     */
    log(level, message, context = {}) {
        if (this.systems.cleanLoggingSystem) {
            this.systems.cleanLoggingSystem.log(level, message, context);
        } else if (this.systems.enhancedLogger) {
            this.systems.enhancedLogger[level.toLowerCase()](message, context);
        } else {
            console[level.toLowerCase()](message, context);
        }
    }

    /**
     * Get system statistics
     */
    getStats() {
        const stats = {
            initialized: this.isInitialized,
            systems: {}
        };
        
        for (const [name, system] of Object.entries(this.systems)) {
            if (system && typeof system.getStats === 'function') {
                stats.systems[name] = system.getStats();
            } else {
                stats.systems[name] = { available: !!system };
            }
        }
        
        return stats;
    }

    /**
     * Reset all systems
     */
    reset() {
        for (const system of Object.values(this.systems)) {
            if (system && typeof system.reset === 'function') {
                system.reset();
            }
        }
        
        this.log('INFO', 'All error handling systems reset');
    }

    /**
     * Enable/disable error monitoring
     */
    setErrorMonitoring(enabled) {
        if (this.systems.errorMonitor) {
            this.systems.errorMonitor.setEnabled(enabled);
            this.log('INFO', `Error monitoring ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get error report
     */
    getErrorReport() {
        const report = {
            timestamp: new Date().toISOString(),
            systems: this.getStats(),
            errors: [],
            spam: []
        };
        
        // Get spam report from clean logging system
        if (this.systems.cleanLoggingSystem) {
            report.spam = this.systems.cleanLoggingSystem.getSpamReport();
        }
        
        // Get error history from centralized error manager
        if (this.systems.centralizedErrorManager) {
            const stats = this.systems.centralizedErrorManager.getStats();
            report.errors = stats.errorCounts || {};
        }
        
        return report;
    }
}

// Initialize global error handling integration
window.errorHandlingIntegration = new ErrorHandlingIntegration();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandlingIntegration;
}