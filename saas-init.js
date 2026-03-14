/**
 * SaaS Integration Initialization
 * Initializes all SaaS components in the correct order
 */

class SaaSInitializer {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize all SaaS components
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    /**
     * Perform the actual initialization
     */
    async _doInitialize() {
        try {
            console.log('🚀 Initializing SaaS components...');

            // 1. Initialize API Client
            console.log('🔍 Debug - window.appConfig:', window.appConfig);
            console.log('🔍 Debug - getApiBaseUrl():', window.appConfig ? window.appConfig.getApiBaseUrl() : 'undefined');
            
            const apiBaseUrl = window.appConfig ? window.appConfig.getApiBaseUrl() : 'http://localhost:8000';
            console.log('🔍 Debug - Using API base URL:', apiBaseUrl);
            
            this.components.apiClient = new window.ApiClient(apiBaseUrl);
            window.apiClient = this.components.apiClient; // Make available globally for monitoring
            console.log('✅ API Client initialized');

            // 2. Initialize Notification Manager (should already be initialized)
            this.components.notificationManager = window.notificationManager || window.notifications;
            console.log('✅ Notification Manager ready');

            // 3. Initialize Auth Manager
            this.components.authManager = await window.AuthManager.initialize();
            window.authManager = this.components.authManager;
            console.log('✅ Auth Manager initialized');

            // 4. Initialize Sync Manager
            this.components.syncManager = new window.SyncManager(
                this.components.apiClient,
                this.components.authManager
            );
            window.syncManager = this.components.syncManager;
            console.log('✅ Sync Manager initialized');

            // 5. Initialize Offline Manager
            this.components.offlineManager = new window.OfflineManager(
                this.components.apiClient,
                this.components.authManager,
                this.components.notificationManager,
                this.components.syncManager
            );
            window.offlineManager = this.components.offlineManager;
            console.log('✅ Offline Manager initialized');

            // 6. Initialize Usage Tracker
            this.components.usageTracker = new window.UsageTracker(
                this.components.apiClient,
                window.appConfig,
                this.components.authManager,
                this.components.notificationManager,
                this.components.offlineManager
            );
            await this.components.usageTracker.initializeUsage();
            window.usageTracker = this.components.usageTracker;
            console.log('✅ Usage Tracker initialized');

            // 7. Initialize Payment Manager
            this.components.paymentManager = new window.PaymentManager(
                this.components.apiClient,
                window.appConfig,
                this.components.notificationManager
            );
            await this.components.paymentManager.initializeStripe();
            this.components.paymentManager.initializePaymentRecovery();
            window.paymentManager = this.components.paymentManager;
            console.log('✅ Payment Manager initialized');

            // 8. Initialize Payment UI
            this.components.paymentUI = new window.PaymentUI(
                this.components.paymentManager,
                this.components.authManager,
                this.components.notificationManager
            );
            window.paymentUI = this.components.paymentUI;
            console.log('✅ Payment UI initialized');

            // 9. Initialize Auth UI (should already be initialized)
            if (window.AuthUI && !window.authUI) {
                this.components.authUI = new window.AuthUI(
                    this.components.authManager,
                    this.components.notificationManager
                );
                window.authUI = this.components.authUI;
                console.log('✅ Auth UI initialized');
            }

            // 10. Initialize Preferences Manager
            this.components.preferencesManager = new window.PreferencesManager(
                this.components.apiClient,
                this.components.authManager,
                this.components.notificationManager,
                this.components.syncManager
            );
            window.preferencesManager = this.components.preferencesManager;
            console.log('✅ Preferences Manager initialized');

            // 11. Initialize Dashboard UI
            this.components.dashboardUI = new window.DashboardUI(
                this.components.authManager,
                this.components.apiClient,
                this.components.notificationManager,
                this.components.usageTracker,
                this.components.preferencesManager
            );
            window.dashboardUI = this.components.dashboardUI;
            console.log('✅ Dashboard UI initialized');

            // 12. Initialize Payment Integration
            this.components.paymentIntegration = new window.PaymentIntegration(
                this.components.paymentManager,
                this.components.usageTracker,
                this.components.authManager,
                this.components.notificationManager
            );
            window.paymentIntegration = this.components.paymentIntegration;
            console.log('✅ Payment Integration initialized');

            // 13. Set up global event handlers
            this.setupGlobalEventHandlers();
            console.log('✅ Global event handlers set up');

            // 12. Update UI based on initial state
            this.updateInitialUI();
            console.log('✅ Initial UI updated');

            // 14. Initialize Monitoring Integration (after all dependencies are ready)
            if (window.MonitoringIntegration) {
                try {
                    window.monitoringIntegration = new window.MonitoringIntegration();
                    console.log('✅ Monitoring Integration initialized');
                } catch (error) {
                    console.warn('⚠️ Monitoring Integration failed to initialize:', error.message);
                }
            }

            this.isInitialized = true;
            console.log('🎉 SaaS initialization completed successfully!');

            // Emit initialization complete event
            window.dispatchEvent(new CustomEvent('oriel_saas_initialized', {
                detail: { components: this.components }
            }));

            return this.components;

        } catch (error) {
            console.error('❌ SaaS initialization failed:', error);
            
            // Show user-friendly error message
            if (this.components.notificationManager) {
                this.components.notificationManager.show(
                    'Some features may not work properly. Please refresh the page.',
                    'error'
                );
            }
            
            throw error;
        }
    }

    /**
     * Set up global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle download button clicks with payment integration
        const downloadButton = document.getElementById('download-button');
        if (downloadButton) {
            // Remove existing listeners and add new one with payment integration
            const newDownloadButton = downloadButton.cloneNode(true);
            downloadButton.parentNode.replaceChild(newDownloadButton, downloadButton);
            
            newDownloadButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleDownloadClick();
            });
        }

        // Handle upgrade button clicks
        const upgradeButton = document.getElementById('upgrade-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => {
                if (this.components.paymentUI) {
                    this.components.paymentUI.showPlanSelectionModal();
                }
            });
        }

        // Handle buy credits button clicks
        const buyCreditsButton = document.getElementById('buy-credits-button');
        if (buyCreditsButton) {
            buyCreditsButton.addEventListener('click', () => {
                if (this.components.paymentUI) {
                    this.components.paymentUI.showCreditPurchaseModal();
                }
            });
        }

        // Listen for auth state changes to update payment buttons
        window.addEventListener('oriel_auth_state_changed', () => {
            if (this.components.paymentUI) {
                this.components.paymentUI.updatePaymentButtons();
            }
        });
    }

    /**
     * Handle download button click with payment integration
     */
    async handleDownloadClick() {
        try {
            // Check if user can download
            const canDownload = await this.components.paymentIntegration.checkDownloadPermission();
            
            if (!canDownload) {
                // Payment integration will handle showing appropriate prompts
                return;
            }

            // Proceed with existing download logic
            // Prefer the modal opening function if available, otherwise fallback to direct download
            if (window.openDownloadModal) {
                await window.openDownloadModal();
            } else if (window.downloadAudioFile) {
                await window.downloadAudioFile();
            } else {
                console.warn('Download handler not found - neither openDownloadModal nor downloadAudioFile functions found');
            }

        } catch (error) {
            console.error('Download failed:', error);
            this.components.notificationManager.show(
                'Download failed. Please try again.',
                'error'
            );
        }
    }

    /**
     * Update initial UI state
     */
    updateInitialUI() {
        // Update payment buttons based on auth state
        if (this.components.paymentUI) {
            this.components.paymentUI.updatePaymentButtons();
        }

        // Update usage display
        if (this.components.usageTracker) {
            const usageSummary = this.components.usageTracker.getUsageSummary();
            const downloadsRemainingElement = document.getElementById('downloads-remaining');
            if (downloadsRemainingElement) {
                downloadsRemainingElement.textContent = usageSummary.primary;
            }
        }

        // Update auth UI
        if (this.components.authManager && this.components.authManager.isAuthenticated()) {
            const user = this.components.authManager.getCurrentUser();
            
            // Update user email display
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement && user.email) {
                userEmailElement.textContent = user.email;
            }

            // Update user credits display
            const userCreditsElement = document.getElementById('user-credits');
            if (userCreditsElement && this.components.usageTracker) {
                const usageStats = this.components.usageTracker.getUsageStats();
                userCreditsElement.textContent = `${usageStats.remainingDownloads} downloads`;
            }
        }
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            components: Object.keys(this.components),
            componentStatus: Object.keys(this.components).reduce((status, key) => {
                status[key] = !!this.components[key];
                return status;
            }, {})
        };
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components[name];
    }

    /**
     * Wait for initialization to complete
     */
    async waitForInitialization() {
        if (this.isInitialized) {
            return this.components;
        }
        
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        return this.initialize();
    }
}

// Create global initializer instance
window.saasInitializer = new SaaSInitializer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.saasInitializer.initialize().catch(console.error);
    });
} else {
    // DOM is already ready
    setTimeout(() => {
        window.saasInitializer.initialize().catch(console.error);
    }, 100);
}

// Export for manual initialization
window.SaaSInitializer = SaaSInitializer;