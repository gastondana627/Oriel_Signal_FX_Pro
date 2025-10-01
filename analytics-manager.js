/**
 * Analytics Manager
 * Handles user interaction tracking, conversion funnels, and analytics data collection
 */
class AnalyticsManager {
    constructor(apiClient, appConfig) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.isEnabled = appConfig.isFeatureEnabled('userTracking');
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.userPlan = 'free';
        this.eventQueue = [];
        this.isOnline = navigator.onLine;
        this.batchSize = 10;
        this.flushInterval = 30000; // 30 seconds
        
        this.init();
    }

    /**
     * Initialize analytics manager
     */
    init() {
        if (!this.isEnabled) {
            console.log('Analytics tracking is disabled');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Start batch processing
        this.startBatchProcessing();
        
        // Track page load
        this.trackEvent('page_load', {
            url: window.location.href,
            referrer: document.referrer,
            timestamp: Date.now()
        });

        console.log('Analytics Manager initialized');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set user information
     */
    setUser(userId, userPlan = 'free') {
        this.userId = userId;
        this.userPlan = userPlan;
        
        // Track user identification
        this.trackEvent('user_identified', {
            userId: userId,
            plan: userPlan,
            timestamp: Date.now()
        });
    }

    /**
     * Clear user information (on logout)
     */
    clearUser() {
        this.trackEvent('user_logout', {
            userId: this.userId,
            sessionDuration: Date.now() - this.sessionStartTime,
            timestamp: Date.now()
        });
        
        this.userId = null;
        this.userPlan = 'free';
    }

    /**
     * Track generic event
     */
    trackEvent(eventName, properties = {}) {
        if (!this.isEnabled) return;

        const event = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            userId: this.userId,
            userPlan: this.userPlan,
            eventName: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                screenResolution: `${screen.width}x${screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`
            }
        };

        this.eventQueue.push(event);
        
        // Log in development
        if (this.appConfig.isDevelopment()) {
            console.log('Analytics Event:', eventName, properties);
        }

        // Flush if queue is full
        if (this.eventQueue.length >= this.batchSize) {
            this.flushEvents();
        }
    }

    /**
     * Track user interactions with the visualizer
     */
    trackVisualizerInteraction(action, details = {}) {
        this.trackEvent('visualizer_interaction', {
            action: action,
            ...details
        });
    }

    /**
     * Track audio upload and processing
     */
    trackAudioUpload(audioFile) {
        this.trackEvent('audio_upload', {
            fileSize: audioFile.size,
            fileType: audioFile.type,
            fileName: audioFile.name,
            duration: audioFile.duration || null
        });
    }

    /**
     * Track visualization generation
     */
    trackVisualizationGenerated(settings) {
        this.trackEvent('visualization_generated', {
            visualizerType: settings.type || 'default',
            duration: settings.duration || null,
            customSettings: Object.keys(settings).length > 0
        });
    }

    /**
     * Track download attempts and completions
     */
    trackDownload(type, success = true, details = {}) {
        this.trackEvent('download_attempt', {
            downloadType: type,
            success: success,
            userPlan: this.userPlan,
            ...details
        });

        // Track conversion funnel step
        if (success) {
            this.trackConversionStep('download_completed', {
                downloadType: type,
                userPlan: this.userPlan
            });
        }
    }

    /**
     * Track authentication events
     */
    trackAuth(action, success = true, details = {}) {
        this.trackEvent('auth_event', {
            action: action, // 'login', 'register', 'logout'
            success: success,
            ...details
        });

        // Track conversion funnel for registration
        if (action === 'register' && success) {
            this.trackConversionStep('user_registered');
        }
    }

    /**
     * Track payment and subscription events
     */
    trackPayment(action, details = {}) {
        this.trackEvent('payment_event', {
            action: action, // 'initiated', 'completed', 'failed', 'cancelled'
            ...details
        });

        // Track conversion funnel steps
        switch (action) {
            case 'initiated':
                this.trackConversionStep('payment_initiated', details);
                break;
            case 'completed':
                this.trackConversionStep('payment_completed', details);
                break;
        }
    }

    /**
     * Track conversion funnel steps
     */
    trackConversionStep(step, properties = {}) {
        this.trackEvent('conversion_funnel', {
            step: step,
            funnelType: this.determineFunnelType(step),
            ...properties
        });
    }

    /**
     * Determine funnel type based on step
     */
    determineFunnelType(step) {
        if (step.includes('register') || step.includes('login')) {
            return 'registration';
        } else if (step.includes('payment') || step.includes('upgrade')) {
            return 'payment';
        } else if (step.includes('download')) {
            return 'usage';
        } else {
            return 'engagement';
        }
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(featureName, details = {}) {
        this.trackEvent('feature_usage', {
            feature: featureName,
            userPlan: this.userPlan,
            isPremiumFeature: this.isPremiumFeature(featureName),
            ...details
        });
    }

    /**
     * Check if feature is premium
     */
    isPremiumFeature(featureName) {
        const premiumFeatures = [
            'extended_recording',
            'custom_presets',
            'advanced_exports',
            'premium_effects'
        ];
        return premiumFeatures.includes(featureName);
    }

    /**
     * Track errors for analytics
     */
    trackError(error, context = {}) {
        this.trackEvent('error_occurred', {
            errorMessage: error.message,
            errorStack: error.stack,
            errorType: error.constructor.name,
            context: context
        });
    }

    /**
     * Track performance metrics
     */
    trackPerformance(metric, value, details = {}) {
        this.trackEvent('performance_metric', {
            metric: metric,
            value: value,
            ...details
        });
    }

    /**
     * Track page views and navigation
     */
    trackPageView(page, details = {}) {
        this.trackEvent('page_view', {
            page: page,
            ...details
        });
    }

    /**
     * Track modal interactions
     */
    trackModal(action, modalType, details = {}) {
        this.trackEvent('modal_interaction', {
            action: action, // 'opened', 'closed', 'submitted'
            modalType: modalType, // 'login', 'register', 'dashboard', 'payment'
            ...details
        });
    }

    /**
     * Set up event listeners for automatic tracking
     */
    setupEventListeners() {
        // Track online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.trackEvent('connection_restored');
            this.flushEvents(); // Flush queued events
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.trackEvent('connection_lost');
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden');
            } else {
                this.trackEvent('page_visible');
            }
        });

        // Track before page unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('page_unload', {
                sessionDuration: Date.now() - this.sessionStartTime
            });
            this.flushEvents(true); // Force immediate flush
        });

        // Track clicks on important elements
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Track button clicks
            if (target.tagName === 'BUTTON' || target.classList.contains('btn')) {
                this.trackEvent('button_click', {
                    buttonText: target.textContent.trim(),
                    buttonId: target.id,
                    buttonClass: target.className
                });
            }

            // Track link clicks
            if (target.tagName === 'A') {
                this.trackEvent('link_click', {
                    linkText: target.textContent.trim(),
                    linkHref: target.href,
                    linkId: target.id
                });
            }
        });
    }

    /**
     * Start batch processing of events
     */
    startBatchProcessing() {
        this.sessionStartTime = Date.now();
        
        // Flush events periodically
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.flushEvents();
            }
        }, this.flushInterval);
    }

    /**
     * Flush events to backend
     */
    async flushEvents(force = false) {
        if (!this.isEnabled || this.eventQueue.length === 0) return;
        
        // Don't flush if offline unless forced
        if (!this.isOnline && !force) return;

        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];

        try {
            if (this.isOnline) {
                await this.apiClient.post('/api/analytics/track', {
                    events: eventsToSend,
                    sessionId: this.sessionId,
                    timestamp: Date.now()
                });

                if (this.appConfig.isDevelopment()) {
                    console.log(`Flushed ${eventsToSend.length} analytics events`);
                }
            } else {
                // Store in local storage for later
                this.storeEventsLocally(eventsToSend);
            }
        } catch (error) {
            console.error('Failed to send analytics events:', error);
            
            // Re-queue events if they failed to send
            this.eventQueue.unshift(...eventsToSend);
            
            // Store in local storage as backup
            this.storeEventsLocally(eventsToSend);
        }
    }

    /**
     * Store events locally when offline
     */
    storeEventsLocally(events) {
        try {
            const stored = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
            stored.push(...events);
            
            // Keep only last 1000 events to prevent storage overflow
            const trimmed = stored.slice(-1000);
            localStorage.setItem('analytics_queue', JSON.stringify(trimmed));
        } catch (error) {
            console.error('Failed to store analytics events locally:', error);
        }
    }

    /**
     * Load and send stored events
     */
    async loadStoredEvents() {
        try {
            const stored = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
            if (stored.length > 0) {
                await this.apiClient.post('/api/analytics/track', {
                    events: stored,
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    isBacklog: true
                });
                
                localStorage.removeItem('analytics_queue');
                console.log(`Sent ${stored.length} stored analytics events`);
            }
        } catch (error) {
            console.error('Failed to send stored analytics events:', error);
        }
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get analytics summary for user dashboard
     */
    getAnalyticsSummary() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            userPlan: this.userPlan,
            eventsQueued: this.eventQueue.length,
            isOnline: this.isOnline,
            isEnabled: this.isEnabled
        };
    }

    /**
     * Enable/disable analytics
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (enabled) {
            this.trackEvent('analytics_enabled');
        } else {
            this.trackEvent('analytics_disabled');
            this.flushEvents(true); // Flush remaining events
        }
    }

    /**
     * Get conversion funnel data
     */
    getConversionFunnelData() {
        // This would typically be retrieved from the backend
        // For now, return structure for frontend display
        return {
            registration: {
                steps: ['page_load', 'register_modal_opened', 'user_registered'],
                counts: [0, 0, 0] // Would be populated from backend
            },
            payment: {
                steps: ['limit_reached', 'upgrade_clicked', 'payment_initiated', 'payment_completed'],
                counts: [0, 0, 0, 0] // Would be populated from backend
            },
            usage: {
                steps: ['audio_upload', 'visualization_generated', 'download_completed'],
                counts: [0, 0, 0] // Would be populated from backend
            }
        };
    }
}

// Export for use in other modules
window.AnalyticsManager = AnalyticsManager;