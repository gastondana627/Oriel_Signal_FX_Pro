/**
 * Monitoring Integration
 * Integrates analytics, error monitoring, and performance monitoring with the existing application
 */
class MonitoringIntegration {
    constructor() {
        this.analyticsManager = null;
        this.errorMonitor = null;
        this.performanceMonitor = null;
        this.apiClient = null;
        this.appConfig = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize monitoring integration
     */
    async init() {
        try {
            // Wait for dependencies to be available
            await this.waitForDependencies();
            
            // Initialize monitoring components
            this.initializeComponents();
            
            // Set up integrations
            this.setupIntegrations();
            
            // Set up API monitoring
            this.setupApiMonitoring();
            
            // Set up visualizer monitoring
            this.setupVisualizerMonitoring();
            
            this.isInitialized = true;
            console.log('Monitoring Integration initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize monitoring integration:', error);
        }
    }

    /**
     * Wait for required dependencies
     */
    async waitForDependencies() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.apiClient && window.appConfig) {
                this.apiClient = window.apiClient;
                this.appConfig = window.appConfig;
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        throw new Error('Required dependencies not available');
    }

    /**
     * Initialize monitoring components
     */
    initializeComponents() {
        // Initialize analytics manager
        this.analyticsManager = new AnalyticsManager(this.apiClient, this.appConfig);
        
        // Initialize error monitor with analytics reference
        this.errorMonitor = new ErrorMonitor(this.apiClient, this.appConfig, this.analyticsManager);
        
        // Initialize performance monitor with analytics reference
        this.performanceMonitor = new PerformanceMonitor(this.apiClient, this.appConfig, this.analyticsManager);
        
        // Make available globally
        window.analyticsManager = this.analyticsManager;
        window.errorMonitor = this.errorMonitor;
        window.performanceMonitor = this.performanceMonitor;
    }

    /**
     * Set up integrations between components
     */
    setupIntegrations() {
        // Set up auth manager integration
        if (window.authManager) {
            this.setupAuthIntegration();
        } else {
            // Wait for auth manager to be available
            const checkAuth = setInterval(() => {
                if (window.authManager) {
                    this.setupAuthIntegration();
                    clearInterval(checkAuth);
                }
            }, 100);
        }

        // Set up payment manager integration
        if (window.paymentManager) {
            this.setupPaymentIntegration();
        } else {
            // Wait for payment manager to be available
            const checkPayment = setInterval(() => {
                if (window.paymentManager) {
                    this.setupPaymentIntegration();
                    clearInterval(checkPayment);
                }
            }, 100);
        }

        // Set up usage tracker integration
        if (window.usageTracker) {
            this.setupUsageIntegration();
        } else {
            // Wait for usage tracker to be available
            const checkUsage = setInterval(() => {
                if (window.usageTracker) {
                    this.setupUsageIntegration();
                    clearInterval(checkUsage);
                }
            }, 100);
        }
    }

    /**
     * Set up authentication monitoring
     */
    setupAuthIntegration() {
        const originalLogin = window.authManager.login.bind(window.authManager);
        const originalRegister = window.authManager.register.bind(window.authManager);
        const originalLogout = window.authManager.logout.bind(window.authManager);

        // Override login method
        window.authManager.login = async (email, password) => {
            const startTime = performance.now();
            this.analyticsManager.trackAuth('login_attempt');
            
            try {
                const result = await originalLogin(email, password);
                const endTime = performance.now();
                
                this.analyticsManager.trackAuth('login', true, { duration: endTime - startTime });
                this.performanceMonitor.trackInteractionPerformance('login', startTime, endTime);
                
                // Set user in monitoring components
                if (result && result.user) {
                    this.setUser(result.user.id, result.user.plan);
                }
                
                return result;
            } catch (error) {
                const endTime = performance.now();
                
                this.analyticsManager.trackAuth('login', false, { 
                    error: error.message,
                    duration: endTime - startTime 
                });
                this.errorMonitor.logAuthError('login', error);
                
                throw error;
            }
        };

        // Override register method
        window.authManager.register = async (email, password) => {
            const startTime = performance.now();
            this.analyticsManager.trackAuth('register_attempt');
            
            try {
                const result = await originalRegister(email, password);
                const endTime = performance.now();
                
                this.analyticsManager.trackAuth('register', true, { duration: endTime - startTime });
                this.performanceMonitor.trackInteractionPerformance('register', startTime, endTime);
                
                return result;
            } catch (error) {
                const endTime = performance.now();
                
                this.analyticsManager.trackAuth('register', false, { 
                    error: error.message,
                    duration: endTime - startTime 
                });
                this.errorMonitor.logAuthError('register', error);
                
                throw error;
            }
        };

        // Override logout method
        window.authManager.logout = async () => {
            this.analyticsManager.trackAuth('logout');
            
            try {
                const result = await originalLogout();
                
                // Clear user from monitoring components
                this.clearUser();
                
                return result;
            } catch (error) {
                this.errorMonitor.logAuthError('logout', error);
                throw error;
            }
        };
    }

    /**
     * Set up payment monitoring
     */
    setupPaymentIntegration() {
        const originalCreateSession = window.paymentManager.createCheckoutSession.bind(window.paymentManager);
        const originalCheckStatus = window.paymentManager.checkPaymentStatus.bind(window.paymentManager);

        // Override payment session creation
        window.paymentManager.createCheckoutSession = async (planType) => {
            const startTime = performance.now();
            this.analyticsManager.trackPayment('initiated', { planType });
            
            try {
                const result = await originalCreateSession(planType);
                const endTime = performance.now();
                
                this.performanceMonitor.trackInteractionPerformance('payment_session_creation', startTime, endTime);
                
                return result;
            } catch (error) {
                this.analyticsManager.trackPayment('failed', { 
                    planType, 
                    error: error.message 
                });
                this.errorMonitor.logPaymentError('create_session', error, { planType });
                
                throw error;
            }
        };

        // Override payment status check
        window.paymentManager.checkPaymentStatus = async (sessionId) => {
            try {
                const result = await originalCheckStatus(sessionId);
                
                if (result.status === 'completed') {
                    this.analyticsManager.trackPayment('completed', { 
                        sessionId,
                        planType: result.planType 
                    });
                } else if (result.status === 'cancelled') {
                    this.analyticsManager.trackPayment('cancelled', { sessionId });
                }
                
                return result;
            } catch (error) {
                this.errorMonitor.logPaymentError('check_status', error, { sessionId });
                throw error;
            }
        };
    }

    /**
     * Set up usage tracking monitoring
     */
    setupUsageIntegration() {
        const originalTrackDownload = window.usageTracker.trackDownload.bind(window.usageTracker);

        // Override download tracking
        window.usageTracker.trackDownload = async (type, duration) => {
            const startTime = performance.now();
            
            try {
                const result = await originalTrackDownload(type, duration);
                const endTime = performance.now();
                
                this.analyticsManager.trackDownload(type, true, { duration });
                this.performanceMonitor.trackInteractionPerformance('download_tracking', startTime, endTime);
                
                return result;
            } catch (error) {
                this.analyticsManager.trackDownload(type, false, { 
                    error: error.message,
                    duration 
                });
                this.errorMonitor.handleError({
                    type: 'usage_error',
                    message: `Download tracking failed: ${error.message}`,
                    downloadType: type,
                    duration: duration
                });
                
                throw error;
            }
        };
    }

    /**
     * Set up API monitoring
     */
    setupApiMonitoring() {
        const originalMakeRequest = this.apiClient.makeRequest.bind(this.apiClient);

        // Override API makeRequest method
        this.apiClient.makeRequest = async (method, endpoint, data = null, options = {}) => {
            const startTime = performance.now();
            
            try {
                const result = await originalMakeRequest(method, endpoint, data, options);
                const endTime = performance.now();
                
                // Track API performance
                this.performanceMonitor.trackApiCall(
                    endpoint, 
                    method, 
                    startTime, 
                    endTime, 
                    result.status || 200,
                    JSON.stringify(result.data || {}).length
                );
                
                return result;
            } catch (error) {
                const endTime = performance.now();
                
                // Track API error
                this.performanceMonitor.trackApiCall(
                    endpoint, 
                    method, 
                    startTime, 
                    endTime, 
                    error.status || 500
                );
                
                this.errorMonitor.logApiError(
                    endpoint, 
                    method, 
                    error.status || 500, 
                    error.message,
                    data
                );
                
                throw error;
            }
        };
    }

    /**
     * Set up visualizer monitoring
     */
    setupVisualizerMonitoring() {
        // Monitor audio file uploads
        document.addEventListener('change', (event) => {
            if (event.target.type === 'file' && event.target.accept && event.target.accept.includes('audio')) {
                const file = event.target.files[0];
                if (file) {
                    this.analyticsManager.trackAudioUpload(file);
                }
            }
        });

        // Monitor download button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('download-btn') || 
                event.target.id.includes('download')) {
                
                const downloadType = this.getDownloadType(event.target);
                this.analyticsManager.trackVisualizerInteraction('download_initiated', {
                    downloadType: downloadType
                });
            }
        });

        // Monitor visualizer settings changes
        document.addEventListener('input', (event) => {
            if (event.target.type === 'range' || 
                event.target.classList.contains('visualizer-control')) {
                
                this.analyticsManager.trackVisualizerInteraction('setting_changed', {
                    control: event.target.id || event.target.name,
                    value: event.target.value
                });
            }
        });

        // Monitor modal interactions
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-trigger')) {
                const modalType = this.getModalType(event.target);
                this.analyticsManager.trackModal('opened', modalType);
            }
            
            if (event.target.classList.contains('modal-close')) {
                const modalType = this.getModalType(event.target);
                this.analyticsManager.trackModal('closed', modalType);
            }
        });
    }

    /**
     * Get download type from element
     */
    getDownloadType(element) {
        if (element.id.includes('gif')) return 'gif';
        if (element.id.includes('mp4')) return 'mp4';
        if (element.id.includes('audio')) return 'audio';
        return 'unknown';
    }

    /**
     * Get modal type from element
     */
    getModalType(element) {
        if (element.id.includes('login')) return 'login';
        if (element.id.includes('register')) return 'register';
        if (element.id.includes('dashboard')) return 'dashboard';
        if (element.id.includes('payment')) return 'payment';
        return 'unknown';
    }

    /**
     * Set user information across all monitoring components
     */
    setUser(userId, userPlan = 'free') {
        if (this.analyticsManager) {
            this.analyticsManager.setUser(userId, userPlan);
        }
        if (this.errorMonitor) {
            this.errorMonitor.setUser(userId);
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.setUser(userId);
        }
    }

    /**
     * Clear user information from all monitoring components
     */
    clearUser() {
        if (this.analyticsManager) {
            this.analyticsManager.clearUser();
        }
        if (this.errorMonitor) {
            this.errorMonitor.clearUser();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.clearUser();
        }
    }

    /**
     * Get monitoring status
     */
    getMonitoringStatus() {
        return {
            isInitialized: this.isInitialized,
            analytics: this.analyticsManager ? this.analyticsManager.getAnalyticsSummary() : null,
            errors: this.errorMonitor ? this.errorMonitor.getErrorStats() : null,
            performance: this.performanceMonitor ? this.performanceMonitor.getPerformanceSummary() : null
        };
    }

    /**
     * Enable/disable all monitoring
     */
    setMonitoringEnabled(enabled) {
        if (this.analyticsManager) {
            this.analyticsManager.setEnabled(enabled);
        }
        if (this.errorMonitor) {
            this.errorMonitor.setEnabled(enabled);
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.setEnabled(enabled);
        }
    }

    /**
     * Flush all monitoring data
     */
    async flushAllData() {
        const promises = [];
        
        if (this.analyticsManager) {
            promises.push(this.analyticsManager.flushEvents(true));
        }
        if (this.errorMonitor) {
            promises.push(this.errorMonitor.flushErrors(true));
        }
        if (this.performanceMonitor) {
            promises.push(this.performanceMonitor.flushMetrics(true));
        }
        
        await Promise.all(promises);
    }

    /**
     * Get comprehensive monitoring report
     */
    getMonitoringReport() {
        return {
            status: this.getMonitoringStatus(),
            insights: this.performanceMonitor ? this.performanceMonitor.getPerformanceInsights() : [],
            conversionFunnels: this.analyticsManager ? this.analyticsManager.getConversionFunnelData() : null,
            coreWebVitals: this.performanceMonitor ? this.performanceMonitor.getCoreWebVitals() : null
        };
    }
}

// Export class for manual initialization
// Auto-initialization is disabled to prevent dependency issues
// The monitoring integration will be initialized by saas-init.js after all dependencies are ready

// Export for use in other modules
window.MonitoringIntegration = MonitoringIntegration;