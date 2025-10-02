/**
 * Enhanced User Feedback System
 * Implements comprehensive user feedback and error handling improvements
 * Requirements: 8.2, 8.3, 8.4 - User notifications, error handling, network connectivity
 */

class EnhancedUserFeedback {
    constructor() {
        this.config = {
            // Notification settings
            notifications: {
                maxActive: 3,
                defaultDuration: 5000,
                errorDuration: 8000,
                successDuration: 3000,
                warningDuration: 6000,
                position: 'top-right'
            },
            
            // Error handling settings
            errorHandling: {
                maxRetryAttempts: 3,
                retryDelay: 2000,
                retryBackoff: 1.5,
                enableAutoRetry: true,
                enableUserRetry: true
            },
            
            // Progress settings
            progress: {
                updateInterval: 100,
                smoothTransition: true,
                showPercentage: true,
                showTimeRemaining: true
            },
            
            // Accessibility settings
            accessibility: {
                enableScreenReader: true,
                enableHighContrast: false,
                enableReducedMotion: false,
                enableKeyboardNavigation: true
            }
        };

        this.state = {
            activeNotifications: new Map(),
            activeOperations: new Map(),
            errorHistory: [],
            userPreferences: {},
            networkStatus: navigator.onLine
        };

        this.components = {
            notificationContainer: null,
            progressContainer: null,
            errorBoundary: null,
            loadingOverlay: null
        };

        this.init();
    }

    /**
     * Initialize enhanced user feedback system
     */
    async init() {
        try {
            console.log('💬 Initializing Enhanced User Feedback System...');
            
            await this.createUIComponents();
            await this.setupNotificationSystem();
            await this.setupProgressSystem();
            await this.setupErrorHandling();
            await this.setupNetworkMonitoring();
            await this.setupAccessibilityFeatures();
            await this.loadUserPreferences();
            
            console.log('✅ Enhanced User Feedback System initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced User Feedback System:', error);
            throw error;
        }
    }

    /**
     * Create UI components
     */
    async createUIComponents() {
        // Create notification container
        this.createNotificationContainer();
        
        // Create progress container
        this.createProgressContainer();
        
        // Create loading overlay
        this.createLoadingOverlay();
        
        // Create error boundary
        this.createErrorBoundary();
        
        // Add CSS styles
        this.addStyles();
        
        console.log('✅ UI components created');
    }

    /**
     * Create notification container
     */
    createNotificationContainer() {
        if (document.getElementById('enhanced-notification-container')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'enhanced-notification-container';
        container.className = 'enhanced-notification-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        
        document.body.appendChild(container);
        this.components.notificationContainer = container;
    }

    /**
     * Create progress container
     */
    createProgressContainer() {
        if (document.getElementById('enhanced-progress-container')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'enhanced-progress-container';
        container.className = 'enhanced-progress-container hidden';
        container.innerHTML = `
            <div class="progress-backdrop"></div>
            <div class="progress-modal">
                <div class="progress-header">
                    <h3 class="progress-title">Processing...</h3>
                    <button type="button" class="progress-cancel" aria-label="Cancel operation">×</button>
                </div>
                <div class="progress-body">
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                    <div class="progress-details">
                        <div class="progress-status">Initializing...</div>
                        <div class="progress-time">Estimating time...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.components.progressContainer = container;
        
        // Setup cancel button
        const cancelButton = container.querySelector('.progress-cancel');
        cancelButton.addEventListener('click', () => {
            this.cancelCurrentOperation();
        });
    }

    /**
     * Create loading overlay
     */
    createLoadingOverlay() {
        if (document.getElementById('enhanced-loading-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'enhanced-loading-overlay';
        overlay.className = 'enhanced-loading-overlay hidden';
        overlay.innerHTML = `
            <div class="loading-backdrop"></div>
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-text">Loading...</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.components.loadingOverlay = overlay;
    }

    /**
     * Create error boundary
     */
    createErrorBoundary() {
        if (document.getElementById('enhanced-error-boundary')) {
            return;
        }

        const boundary = document.createElement('div');
        boundary.id = 'enhanced-error-boundary';
        boundary.className = 'enhanced-error-boundary hidden';
        boundary.innerHTML = `
            <div class="error-backdrop"></div>
            <div class="error-modal">
                <div class="error-header">
                    <h3 class="error-title">Something went wrong</h3>
                    <button type="button" class="error-close" aria-label="Close error dialog">×</button>
                </div>
                <div class="error-body">
                    <div class="error-message">An unexpected error occurred.</div>
                    <div class="error-details hidden">
                        <summary>Technical Details</summary>
                        <pre class="error-stack"></pre>
                    </div>
                </div>
                <div class="error-actions">
                    <button type="button" class="error-retry">Try Again</button>
                    <button type="button" class="error-report">Report Issue</button>
                    <button type="button" class="error-dismiss">Dismiss</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(boundary);
        this.components.errorBoundary = boundary;
        
        // Setup event listeners
        this.setupErrorBoundaryEvents();
    }

    /**
     * Setup error boundary events
     */
    setupErrorBoundaryEvents() {
        const boundary = this.components.errorBoundary;
        
        // Close button
        boundary.querySelector('.error-close').addEventListener('click', () => {
            this.hideErrorBoundary();
        });
        
        // Dismiss button
        boundary.querySelector('.error-dismiss').addEventListener('click', () => {
            this.hideErrorBoundary();
        });
        
        // Retry button
        boundary.querySelector('.error-retry').addEventListener('click', () => {
            this.retryLastOperation();
        });
        
        // Report button
        boundary.querySelector('.error-report').addEventListener('click', () => {
            this.reportError();
        });
        
        // Toggle details
        boundary.querySelector('.error-details summary').addEventListener('click', (e) => {
            e.preventDefault();
            boundary.querySelector('.error-details').classList.toggle('expanded');
        });
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('enhanced-feedback-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'enhanced-feedback-styles';
        styles.textContent = `
            /* Notification Styles */
            .enhanced-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .enhanced-notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                padding: 16px 20px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid #e5e7eb;
                position: relative;
                overflow: hidden;
            }

            .enhanced-notification.show {
                transform: translateX(0);
            }

            .enhanced-notification.success {
                border-left-color: #10b981;
                background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
            }

            .enhanced-notification.error {
                border-left-color: #ef4444;
                background: linear-gradient(135deg, #fef2f2, #fef7f7);
            }

            .enhanced-notification.warning {
                border-left-color: #f59e0b;
                background: linear-gradient(135deg, #fffbeb, #fefce8);
            }

            .enhanced-notification.info {
                border-left-color: #3b82f6;
                background: linear-gradient(135deg, #eff6ff, #f0f9ff);
            }

            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .notification-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                margin-top: 2px;
            }

            .notification-body {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                margin: 0 0 4px 0;
                color: #1f2937;
            }

            .notification-message {
                font-size: 14px;
                color: #6b7280;
                margin: 0;
                line-height: 1.4;
            }

            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }

            .notification-action {
                background: none;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .notification-action:hover {
                background: #f9fafb;
            }

            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #9ca3af;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .notification-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #6b7280;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                transition: width 0.1s linear;
            }

            /* Progress Modal Styles */
            .enhanced-progress-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .enhanced-progress-container.hidden {
                display: none;
            }

            .progress-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }

            .progress-modal {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                width: 90%;
                max-width: 400px;
                position: relative;
                z-index: 1;
            }

            .progress-header {
                padding: 20px 20px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .progress-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
            }

            .progress-cancel {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #9ca3af;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .progress-cancel:hover {
                background: #f3f4f6;
                color: #6b7280;
            }

            .progress-body {
                padding: 20px;
            }

            .progress-bar-container {
                margin-bottom: 16px;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: #f3f4f6;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #8309D5, #a855f7);
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-text {
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
            }

            .progress-details {
                text-align: center;
            }

            .progress-status {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 4px;
            }

            .progress-time {
                font-size: 12px;
                color: #9ca3af;
            }

            /* Loading Overlay Styles */
            .enhanced-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .enhanced-loading-overlay.hidden {
                display: none;
            }

            .loading-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(1px);
            }

            .loading-content {
                background: white;
                border-radius: 12px;
                padding: 32px;
                text-align: center;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                position: relative;
                z-index: 1;
            }

            .loading-spinner {
                margin-bottom: 16px;
            }

            .spinner-ring {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f4f6;
                border-top: 4px solid #8309D5;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                font-size: 16px;
                color: #1f2937;
                font-weight: 500;
            }

            /* Error Boundary Styles */
            .enhanced-error-boundary {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .enhanced-error-boundary.hidden {
                display: none;
            }

            .error-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(3px);
            }

            .error-modal {
                background: white;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                width: 90%;
                max-width: 500px;
                position: relative;
                z-index: 1;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .error-header {
                padding: 20px 20px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #f3f4f6;
                padding-bottom: 16px;
            }

            .error-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #dc2626;
            }

            .error-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #9ca3af;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .error-close:hover {
                background: #f3f4f6;
                color: #6b7280;
            }

            .error-body {
                padding: 20px;
                flex: 1;
                overflow-y: auto;
            }

            .error-message {
                font-size: 14px;
                color: #374151;
                line-height: 1.5;
                margin-bottom: 16px;
            }

            .error-details {
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                overflow: hidden;
            }

            .error-details summary {
                padding: 12px;
                background: #f9fafb;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
            }

            .error-details.expanded summary {
                border-bottom: 1px solid #e5e7eb;
            }

            .error-stack {
                padding: 12px;
                margin: 0;
                font-size: 12px;
                color: #6b7280;
                background: #f9fafb;
                overflow-x: auto;
                white-space: pre-wrap;
                word-break: break-all;
            }

            .error-actions {
                padding: 16px 20px 20px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                border-top: 1px solid #f3f4f6;
            }

            .error-actions button {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
            }

            .error-actions button:hover {
                background: #f9fafb;
            }

            .error-retry {
                background: #8309D5 !important;
                color: white !important;
                border-color: #8309D5 !important;
            }

            .error-retry:hover {
                background: #6d28d9 !important;
            }

            .error-report {
                background: #dc2626 !important;
                color: white !important;
                border-color: #dc2626 !important;
            }

            .error-report:hover {
                background: #b91c1c !important;
            }

            /* Accessibility Styles */
            .enhanced-feedback-high-contrast {
                filter: contrast(150%) brightness(110%);
            }

            .enhanced-feedback-reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }

            .enhanced-feedback-focus {
                outline: 2px solid #8309D5 !important;
                outline-offset: 2px !important;
            }

            /* Responsive Design */
            @media (max-width: 640px) {
                .enhanced-notification-container {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }

                .enhanced-notification {
                    transform: translateY(-100%);
                }

                .enhanced-notification.show {
                    transform: translateY(0);
                }

                .progress-modal,
                .error-modal {
                    width: 95%;
                    margin: 20px;
                }

                .error-actions {
                    flex-direction: column;
                }

                .error-actions button {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Setup notification system
     */
    async setupNotificationSystem() {
        // Initialize notification queue
        this.notificationQueue = [];
        this.activeNotifications = new Map();
        
        console.log('✅ Notification system configured');
    }

    /**
     * Setup progress system
     */
    async setupProgressSystem() {
        // Initialize progress tracking
        this.activeOperations = new Map();
        
        console.log('✅ Progress system configured');
    }

    /**
     * Setup error handling
     */
    async setupErrorHandling() {
        // Setup global error handlers
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, {
                type: 'javascript',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason, {
                type: 'promise',
                promise: event.promise
            });
        });

        // Setup fetch error handling
        this.setupFetchErrorHandling();
        
        console.log('✅ Error handling configured');
    }

    /**
     * Setup fetch error handling
     */
    setupFetchErrorHandling() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    error.response = response;
                    error.url = args[0];
                    
                    this.handleNetworkError(error, {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText
                    });
                }
                
                return response;
            } catch (error) {
                this.handleNetworkError(error, {
                    url: args[0],
                    type: 'network'
                });
                throw error;
            }
        };
    }

    /**
     * Setup network monitoring
     */
    async setupNetworkMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.state.networkStatus = true;
            this.showNotification('Connection restored', 'success', {
                title: 'Back Online',
                icon: '🌐'
            });
        });

        window.addEventListener('offline', () => {
            this.state.networkStatus = false;
            this.showNotification('You are currently offline. Some features may not work.', 'warning', {
                title: 'Connection Lost',
                icon: '📡',
                persistent: true
            });
        });

        // Initial network status
        this.state.networkStatus = navigator.onLine;
        
        console.log('✅ Network monitoring configured');
    }

    /**
     * Setup accessibility features
     */
    async setupAccessibilityFeatures() {
        // Detect user preferences
        this.detectAccessibilityPreferences();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup screen reader support
        this.setupScreenReaderSupport();
        
        console.log('✅ Accessibility features configured');
    }

    /**
     * Detect accessibility preferences
     */
    detectAccessibilityPreferences() {
        // High contrast
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            this.config.accessibility.enableHighContrast = true;
            document.body.classList.add('enhanced-feedback-high-contrast');
        }

        // Reduced motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.config.accessibility.enableReducedMotion = true;
            document.body.classList.add('enhanced-feedback-reduced-motion');
        }

        // Listen for changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
                this.config.accessibility.enableHighContrast = e.matches;
                document.body.classList.toggle('enhanced-feedback-high-contrast', e.matches);
            });

            window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
                this.config.accessibility.enableReducedMotion = e.matches;
                document.body.classList.toggle('enhanced-feedback-reduced-motion', e.matches);
            });
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
            
            // Enter key to activate focused elements
            if (e.key === 'Enter' && e.target.classList.contains('notification-action')) {
                e.target.click();
            }
        });

        // Add focus management
        document.addEventListener('focusin', (e) => {
            if (this.config.accessibility.enableKeyboardNavigation) {
                e.target.classList.add('enhanced-feedback-focus');
            }
        });

        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('enhanced-feedback-focus');
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Create live region for announcements
        if (!document.getElementById('enhanced-feedback-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'enhanced-feedback-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
    }

    /**
     * Load user preferences
     */
    async loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('enhanced-feedback-preferences');
            if (preferences) {
                this.state.userPreferences = JSON.parse(preferences);
                this.applyUserPreferences();
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    /**
     * Apply user preferences
     */
    applyUserPreferences() {
        const prefs = this.state.userPreferences;
        
        if (prefs.notificationPosition) {
            this.config.notifications.position = prefs.notificationPosition;
            this.updateNotificationPosition();
        }
        
        if (prefs.notificationDuration) {
            this.config.notifications.defaultDuration = prefs.notificationDuration;
        }
        
        if (prefs.enableSounds !== undefined) {
            this.config.notifications.enableSounds = prefs.enableSounds;
        }
    }

    // Public API methods

    /**
     * Show notification
     */
    showNotification(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.displayNotification(notification);
        return notification.id;
    }

    /**
     * Create notification object
     */
    createNotification(message, type, options) {
        const id = 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const notification = {
            id,
            message,
            type,
            title: options.title || this.getDefaultTitle(type),
            icon: options.icon || this.getDefaultIcon(type),
            duration: options.duration || this.getDefaultDuration(type),
            persistent: options.persistent || false,
            actions: options.actions || [],
            timestamp: Date.now(),
            element: null
        };
        
        return notification;
    }

    /**
     * Display notification
     */
    displayNotification(notification) {
        // Check if we have too many active notifications
        if (this.activeNotifications.size >= this.config.notifications.maxActive) {
            // Remove oldest notification
            const oldestId = Array.from(this.activeNotifications.keys())[0];
            this.hideNotification(oldestId);
        }
        
        // Create notification element
        const element = this.createNotificationElement(notification);
        notification.element = element;
        
        // Add to container
        this.components.notificationContainer.appendChild(element);
        
        // Track active notification
        this.activeNotifications.set(notification.id, notification);
        
        // Show with animation
        setTimeout(() => {
            element.classList.add('show');
        }, 100);
        
        // Auto-hide if not persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.hideNotification(notification.id);
            }, notification.duration);
        }
        
        // Announce to screen readers
        this.announceToScreenReader(notification.title + ': ' + notification.message);
    }

    /**
     * Create notification element
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `enhanced-notification ${notification.type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${notification.icon}</div>
                <div class="notification-body">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    ${notification.actions.length > 0 ? this.createNotificationActions(notification.actions) : ''}
                </div>
            </div>
            <button type="button" class="notification-close" aria-label="Close notification">×</button>
            ${!notification.persistent ? '<div class="notification-progress"></div>' : ''}
        `;
        
        // Setup close button
        const closeButton = element.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.hideNotification(notification.id);
        });
        
        // Setup action buttons
        notification.actions.forEach((action, index) => {
            const button = element.querySelector(`.notification-action[data-index="${index}"]`);
            if (button) {
                button.addEventListener('click', () => {
                    action.handler();
                    if (action.closeOnClick !== false) {
                        this.hideNotification(notification.id);
                    }
                });
            }
        });
        
        // Setup progress bar animation
        if (!notification.persistent) {
            const progressBar = element.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transition = `width ${notification.duration}ms linear`;
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 100);
            }
        }
        
        return element;
    }

    /**
     * Create notification actions HTML
     */
    createNotificationActions(actions) {
        const actionsHTML = actions.map((action, index) => 
            `<button type="button" class="notification-action" data-index="${index}">${action.label}</button>`
        ).join('');
        
        return `<div class="notification-actions">${actionsHTML}</div>`;
    }

    /**
     * Hide notification
     */
    hideNotification(id) {
        const notification = this.activeNotifications.get(id);
        if (!notification || !notification.element) {
            return;
        }
        
        // Remove show class for animation
        notification.element.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.activeNotifications.delete(id);
        }, 300);
    }

    /**
     * Show progress modal
     */
    showProgress(title = 'Processing...', options = {}) {
        const operationId = 'operation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const operation = {
            id: operationId,
            title,
            startTime: Date.now(),
            progress: 0,
            status: options.status || 'Initializing...',
            cancellable: options.cancellable !== false,
            onCancel: options.onCancel || null
        };
        
        this.activeOperations.set(operationId, operation);
        
        // Update UI
        this.updateProgressModal(operation);
        this.components.progressContainer.classList.remove('hidden');
        
        return operationId;
    }

    /**
     * Update progress
     */
    updateProgress(operationId, progress, status = null) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return;
        }
        
        operation.progress = Math.min(100, Math.max(0, progress));
        if (status) {
            operation.status = status;
        }
        
        // Calculate time remaining
        if (operation.progress > 0) {
            const elapsed = Date.now() - operation.startTime;
            const estimated = (elapsed / operation.progress) * 100;
            const remaining = estimated - elapsed;
            operation.timeRemaining = remaining > 0 ? remaining : 0;
        }
        
        this.updateProgressModal(operation);
    }

    /**
     * Update progress modal
     */
    updateProgressModal(operation) {
        const container = this.components.progressContainer;
        
        // Update title
        const title = container.querySelector('.progress-title');
        if (title) {
            title.textContent = operation.title;
        }
        
        // Update progress bar
        const fill = container.querySelector('.progress-fill');
        const text = container.querySelector('.progress-text');
        if (fill && text) {
            fill.style.width = `${operation.progress}%`;
            text.textContent = `${Math.round(operation.progress)}%`;
        }
        
        // Update status
        const status = container.querySelector('.progress-status');
        if (status) {
            status.textContent = operation.status;
        }
        
        // Update time remaining
        const time = container.querySelector('.progress-time');
        if (time && operation.timeRemaining !== undefined) {
            if (operation.timeRemaining > 0) {
                const seconds = Math.ceil(operation.timeRemaining / 1000);
                time.textContent = `About ${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
            } else {
                time.textContent = 'Almost done...';
            }
        }
        
        // Update cancel button
        const cancelButton = container.querySelector('.progress-cancel');
        if (cancelButton) {
            cancelButton.style.display = operation.cancellable ? 'flex' : 'none';
        }
    }

    /**
     * Hide progress modal
     */
    hideProgress(operationId) {
        if (operationId) {
            this.activeOperations.delete(operationId);
        }
        
        this.components.progressContainer.classList.add('hidden');
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = this.components.loadingOverlay;
        const text = overlay.querySelector('.loading-text');
        
        if (text) {
            text.textContent = message;
        }
        
        overlay.classList.remove('hidden');
        
        // Announce to screen readers
        this.announceToScreenReader(message);
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.components.loadingOverlay.classList.add('hidden');
    }

    /**
     * Handle global error
     */
    handleGlobalError(error, context = {}) {
        console.error('Global error caught:', error, context);
        
        // Add to error history
        this.state.errorHistory.push({
            error: error.toString(),
            stack: error.stack,
            context,
            timestamp: Date.now()
        });
        
        // Keep only last 50 errors
        if (this.state.errorHistory.length > 50) {
            this.state.errorHistory.shift();
        }
        
        // Show user-friendly error
        this.showErrorBoundary(error, context);
    }

    /**
     * Handle network error
     */
    handleNetworkError(error, context = {}) {
        console.error('Network error:', error, context);
        
        // Determine error type and show appropriate message
        let message = 'A network error occurred. Please check your connection and try again.';
        let type = 'error';
        
        if (context.status === 401) {
            message = 'Authentication required. Please log in to continue.';
        } else if (context.status === 403) {
            message = 'Access denied. You don\'t have permission to perform this action.';
        } else if (context.status === 404) {
            message = 'The requested resource was not found.';
        } else if (context.status >= 500) {
            message = 'Server error. Please try again later.';
        } else if (!navigator.onLine) {
            message = 'You appear to be offline. Please check your internet connection.';
            type = 'warning';
        }
        
        this.showNotification(message, type, {
            title: 'Network Error',
            actions: [
                {
                    label: 'Retry',
                    handler: () => {
                        // This would trigger a retry of the failed operation
                        console.log('Retrying operation...');
                    }
                }
            ]
        });
    }

    /**
     * Show error boundary
     */
    showErrorBoundary(error, context = {}) {
        const boundary = this.components.errorBoundary;
        
        // Update error message
        const message = boundary.querySelector('.error-message');
        if (message) {
            message.textContent = this.getUserFriendlyErrorMessage(error, context);
        }
        
        // Update error details
        const stack = boundary.querySelector('.error-stack');
        if (stack) {
            stack.textContent = error.stack || error.toString();
        }
        
        // Store error for retry
        this.lastError = { error, context };
        
        // Show boundary
        boundary.classList.remove('hidden');
        
        // Focus management
        const closeButton = boundary.querySelector('.error-close');
        if (closeButton) {
            closeButton.focus();
        }
    }

    /**
     * Hide error boundary
     */
    hideErrorBoundary() {
        this.components.errorBoundary.classList.add('hidden');
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyErrorMessage(error, context) {
        if (context.type === 'network') {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (context.type === 'javascript') {
            return 'An unexpected error occurred in the application. This has been logged for investigation.';
        } else if (context.type === 'promise') {
            return 'An operation failed to complete. Please try again.';
        } else {
            return 'Something went wrong. Please try again or contact support if the problem persists.';
        }
    }

    /**
     * Retry last operation
     */
    retryLastOperation() {
        if (this.lastError) {
            console.log('Retrying last operation:', this.lastError);
            // This would implement retry logic based on the error context
            this.hideErrorBoundary();
            this.showNotification('Retrying operation...', 'info');
        }
    }

    /**
     * Report error
     */
    reportError() {
        if (this.lastError) {
            // This would implement error reporting functionality
            console.log('Reporting error:', this.lastError);
            this.showNotification('Error report sent. Thank you for helping us improve!', 'success');
            this.hideErrorBoundary();
        }
    }

    /**
     * Cancel current operation
     */
    cancelCurrentOperation() {
        const operations = Array.from(this.activeOperations.values());
        const currentOperation = operations[operations.length - 1];
        
        if (currentOperation && currentOperation.cancellable) {
            if (currentOperation.onCancel) {
                currentOperation.onCancel();
            }
            
            this.hideProgress(currentOperation.id);
            this.showNotification('Operation cancelled', 'info');
        }
    }

    /**
     * Handle escape key
     */
    handleEscapeKey() {
        // Close error boundary
        if (!this.components.errorBoundary.classList.contains('hidden')) {
            this.hideErrorBoundary();
            return;
        }
        
        // Close progress modal if cancellable
        if (!this.components.progressContainer.classList.contains('hidden')) {
            this.cancelCurrentOperation();
            return;
        }
        
        // Close loading overlay
        if (!this.components.loadingOverlay.classList.contains('hidden')) {
            this.hideLoading();
            return;
        }
    }

    /**
     * Announce to screen reader
     */
    announceToScreenReader(message) {
        if (!this.config.accessibility.enableScreenReader) {
            return;
        }
        
        const liveRegion = document.getElementById('enhanced-feedback-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    /**
     * Get default title for notification type
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Get default icon for notification type
     */
    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Get default duration for notification type
     */
    getDefaultDuration(type) {
        const durations = {
            success: this.config.notifications.successDuration,
            error: this.config.notifications.errorDuration,
            warning: this.config.notifications.warningDuration,
            info: this.config.notifications.defaultDuration
        };
        return durations[type] || this.config.notifications.defaultDuration;
    }

    /**
     * Update notification position
     */
    updateNotificationPosition() {
        const container = this.components.notificationContainer;
        if (!container) return;
        
        // Remove existing position classes
        container.className = 'enhanced-notification-container';
        
        // Add new position class
        container.classList.add(`position-${this.config.notifications.position}`);
    }

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('enhanced-feedback-preferences', JSON.stringify(this.state.userPreferences));
        } catch (error) {
            console.warn('Failed to save user preferences:', error);
        }
    }

    /**
     * Get system status
     */
    getSystemStatus() {
        return {
            activeNotifications: this.activeNotifications.size,
            activeOperations: this.activeOperations.size,
            errorHistory: this.state.errorHistory.length,
            networkStatus: this.state.networkStatus,
            config: this.config,
            userPreferences: this.state.userPreferences
        };
    }
}

// Initialize Enhanced User Feedback System
window.enhancedUserFeedback = new EnhancedUserFeedback();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedUserFeedback;
}