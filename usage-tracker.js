/**
 * Usage Tracker
 * Handles download tracking, limit checking, and usage statistics
 */
class UsageTracker {
    constructor(apiClient, appConfig, authManager, notificationManager) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        // Usage state
        this.usage = {
            downloadsUsed: 0,
            downloadsLimit: 3,
            lastReset: null,
            dailyDownloads: 0,
            monthlyDownloads: 0
        };
        
        // Event listeners for usage changes
        this.usageChangeListeners = [];
        
        // Initialize usage data
        this.initializeUsage();
        
        // Listen for auth state changes
        if (this.authManager) {
            this.authManager.onStateChange((authState) => {
                this.handleAuthStateChange(authState);
            });
        }
    }

    /**
     * Initialize usage data from storage or backend
     */
    async initializeUsage() {
        if (this.authManager && this.authManager.isAuthenticated) {
            // Load usage from backend for authenticated users
            await this.loadUsageFromBackend();
        } else {
            // Load usage from local storage for anonymous users
            this.loadUsageFromLocalStorage();
        }
        
        this.notifyUsageChange();
    }

    /**
     * Load usage data from backend
     */
    async loadUsageFromBackend() {
        try {
            const response = await this.apiClient.get(
                this.appConfig.config.endpoints.user.usage
            );

            if (response.ok && response.data) {
                this.usage = {
                    downloadsUsed: response.data.downloadsUsed || 0,
                    downloadsLimit: response.data.downloadsLimit || this.getUserPlanLimit(),
                    lastReset: response.data.lastReset ? new Date(response.data.lastReset) : null,
                    dailyDownloads: response.data.dailyDownloads || 0,
                    monthlyDownloads: response.data.monthlyDownloads || 0
                };
            } else {
                // Fallback to plan defaults if backend data unavailable
                this.setUsageFromPlan();
            }
        } catch (error) {
            console.error('Failed to load usage from backend:', error);
            // Fallback to plan defaults
            this.setUsageFromPlan();
        }
    }

    /**
     * Load usage data from local storage (anonymous users)
     */
    loadUsageFromLocalStorage() {
        try {
            const storedUsage = localStorage.getItem('oriel_usage_data');
            const storedDate = localStorage.getItem('oriel_usage_date');
            
            if (storedUsage && storedDate) {
                const usageData = JSON.parse(storedUsage);
                const lastDate = new Date(storedDate);
                const today = new Date();
                
                // Check if we need to reset daily limits
                if (this.isDifferentDay(lastDate, today)) {
                    this.resetDailyUsage();
                } else {
                    this.usage = {
                        downloadsUsed: usageData.downloadsUsed || 0,
                        downloadsLimit: 3, // Free tier default
                        lastReset: lastDate,
                        dailyDownloads: usageData.dailyDownloads || 0,
                        monthlyDownloads: usageData.monthlyDownloads || 0
                    };
                }
            } else {
                // First time user
                this.resetDailyUsage();
            }
        } catch (error) {
            console.error('Error loading usage from local storage:', error);
            this.resetDailyUsage();
        }
    }

    /**
     * Set usage based on user's plan
     */
    setUsageFromPlan() {
        const plan = this.getUserPlan();
        this.usage = {
            downloadsUsed: 0,
            downloadsLimit: plan.features.downloads,
            lastReset: new Date(),
            dailyDownloads: 0,
            monthlyDownloads: 0
        };
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(authState) {
        if (authState.isAuthenticated) {
            // User logged in - load backend data
            await this.loadUsageFromBackend();
        } else {
            // User logged out - switch to local storage
            this.loadUsageFromLocalStorage();
        }
        
        this.notifyUsageChange();
    }

    /**
     * Check if user can download
     */
    canUserDownload() {
        const plan = this.getUserPlan();
        
        // Check daily limits
        if (this.usage.dailyDownloads >= plan.limits.dailyDownloads) {
            return {
                allowed: false,
                reason: 'daily_limit',
                message: 'Daily download limit reached. Try again tomorrow!'
            };
        }
        
        // Check monthly limits for authenticated users
        if (this.authManager && this.authManager.isAuthenticated) {
            if (this.usage.monthlyDownloads >= plan.limits.monthlyDownloads) {
                return {
                    allowed: false,
                    reason: 'monthly_limit',
                    message: 'Monthly download limit reached. Upgrade your plan for more downloads!'
                };
            }
            
            // Check credits/downloads remaining
            if (this.usage.downloadsUsed >= this.usage.downloadsLimit) {
                return {
                    allowed: false,
                    reason: 'no_credits',
                    message: 'No downloads remaining. Upgrade your plan or purchase more credits!'
                };
            }
        } else {
            // Anonymous user - check simple limit
            if (this.usage.downloadsUsed >= this.usage.downloadsLimit) {
                return {
                    allowed: false,
                    reason: 'free_limit',
                    message: 'Free download limit reached. Sign up for more downloads!'
                };
            }
        }
        
        return { allowed: true };
    }

    /**
     * Track a download
     */
    async trackDownload(downloadType, metadata = {}) {
        const canDownload = this.canUserDownload();
        if (!canDownload.allowed) {
            throw new Error(canDownload.message);
        }
        
        // Prepare download data
        const downloadData = {
            type: downloadType,
            timestamp: new Date().toISOString(),
            metadata: {
                duration: metadata.duration || 30,
                format: metadata.format || 'gif',
                quality: metadata.quality || 'standard',
                ...metadata
            }
        };
        
        if (this.authManager && this.authManager.isAuthenticated) {
            // Track download on backend for authenticated users
            await this.trackDownloadOnBackend(downloadData);
        } else {
            // Track download locally for anonymous users
            this.trackDownloadLocally(downloadData);
        }
        
        // Update local usage counters
        this.usage.downloadsUsed += 1;
        this.usage.dailyDownloads += 1;
        this.usage.monthlyDownloads += 1;
        
        // Save to appropriate storage
        if (this.authManager && this.authManager.isAuthenticated) {
            // Backend will handle persistence
        } else {
            this.saveUsageToLocalStorage();
        }
        
        // Notify listeners
        this.notifyUsageChange();
        
        return {
            success: true,
            remainingDownloads: this.getRemainingDownloads(),
            usage: this.getUsageStats()
        };
    }

    /**
     * Track download on backend
     */
    async trackDownloadOnBackend(downloadData) {
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.user.trackDownload,
                downloadData
            );

            if (!response.ok) {
                throw new Error(response.data?.message || 'Failed to track download');
            }
            
            // Update usage data from backend response
            if (response.data && response.data.usage) {
                this.usage = {
                    ...this.usage,
                    ...response.data.usage
                };
            }
        } catch (error) {
            console.error('Failed to track download on backend:', error);
            // Continue with local tracking as fallback
            throw error;
        }
    }

    /**
     * Track download locally
     */
    trackDownloadLocally(downloadData) {
        try {
            // Get existing download history
            const history = this.getDownloadHistory();
            
            // Add new download
            history.push(downloadData);
            
            // Keep only last 100 downloads to prevent storage bloat
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
            
            // Save to local storage
            localStorage.setItem('oriel_download_history', JSON.stringify(history));
        } catch (error) {
            console.error('Failed to track download locally:', error);
        }
    }

    /**
     * Get remaining downloads
     */
    getRemainingDownloads() {
        if (this.authManager && this.authManager.isAuthenticated) {
            return Math.max(0, this.usage.downloadsLimit - this.usage.downloadsUsed);
        } else {
            return Math.max(0, this.usage.downloadsLimit - this.usage.downloadsUsed);
        }
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        const plan = this.getUserPlan();
        const remainingDownloads = this.getRemainingDownloads();
        const dailyRemaining = Math.max(0, plan.limits.dailyDownloads - this.usage.dailyDownloads);
        const monthlyRemaining = Math.max(0, plan.limits.monthlyDownloads - this.usage.monthlyDownloads);
        
        return {
            // Current usage
            downloadsUsed: this.usage.downloadsUsed,
            downloadsLimit: this.usage.downloadsLimit,
            remainingDownloads,
            
            // Daily stats
            dailyDownloads: this.usage.dailyDownloads,
            dailyLimit: plan.limits.dailyDownloads,
            dailyRemaining,
            
            // Monthly stats (for authenticated users)
            monthlyDownloads: this.usage.monthlyDownloads,
            monthlyLimit: plan.limits.monthlyDownloads,
            monthlyRemaining,
            
            // Plan info
            planName: plan.name,
            planId: plan.id,
            
            // Status indicators
            isNearLimit: remainingDownloads <= 1,
            isAtLimit: remainingDownloads === 0,
            needsUpgrade: remainingDownloads === 0 && plan.id === 'free',
            
            // Reset info
            lastReset: this.usage.lastReset,
            nextReset: this.getNextResetDate()
        };
    }

    /**
     * Get download history
     */
    getDownloadHistory() {
        try {
            if (this.authManager && this.authManager.isAuthenticated) {
                // For authenticated users, this would typically come from backend
                // For now, return empty array as backend integration is not in this task
                return [];
            } else {
                const history = localStorage.getItem('oriel_download_history');
                return history ? JSON.parse(history) : [];
            }
        } catch (error) {
            console.error('Error getting download history:', error);
            return [];
        }
    }

    /**
     * Reset daily usage counters
     */
    resetDailyUsage() {
        const plan = this.getUserPlan();
        
        this.usage = {
            downloadsUsed: 0,
            downloadsLimit: plan.features.downloads,
            lastReset: new Date(),
            dailyDownloads: 0,
            monthlyDownloads: this.usage.monthlyDownloads || 0 // Keep monthly count
        };
        
        if (!this.authManager || !this.authManager.isAuthenticated) {
            this.saveUsageToLocalStorage();
        }
        
        this.notifyUsageChange();
    }

    /**
     * Reset monthly usage counters
     */
    resetMonthlyUsage() {
        this.usage.monthlyDownloads = 0;
        
        if (!this.authManager || !this.authManager.isAuthenticated) {
            this.saveUsageToLocalStorage();
        }
        
        this.notifyUsageChange();
    }

    /**
     * Save usage to local storage
     */
    saveUsageToLocalStorage() {
        try {
            localStorage.setItem('oriel_usage_data', JSON.stringify({
                downloadsUsed: this.usage.downloadsUsed,
                dailyDownloads: this.usage.dailyDownloads,
                monthlyDownloads: this.usage.monthlyDownloads
            }));
            localStorage.setItem('oriel_usage_date', new Date().toISOString());
        } catch (error) {
            console.error('Error saving usage to local storage:', error);
        }
    }

    /**
     * Get user's current plan
     */
    getUserPlan() {
        if (this.authManager && this.authManager.isAuthenticated) {
            return this.authManager.getUserPlan();
        } else {
            return this.appConfig.getPlan('free');
        }
    }

    /**
     * Get user's plan download limit
     */
    getUserPlanLimit() {
        const plan = this.getUserPlan();
        return plan.features.downloads;
    }

    /**
     * Check if two dates are different days
     */
    isDifferentDay(date1, date2) {
        return date1.toDateString() !== date2.toDateString();
    }

    /**
     * Get next reset date
     */
    getNextResetDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    /**
     * Show upgrade prompt
     */
    showUpgradePrompt(reason = 'limit_reached') {
        const plan = this.getUserPlan();
        
        if (plan.id === 'free') {
            if (this.authManager && this.authManager.isAuthenticated) {
                this.notificationManager.show(
                    'Upgrade to get more downloads and premium features!', 
                    'info',
                    {
                        action: 'upgrade',
                        actionText: 'Upgrade Now',
                        duration: 8000
                    }
                );
            } else {
                this.notificationManager.show(
                    'Sign up for more downloads and premium features!', 
                    'info',
                    {
                        action: 'signup',
                        actionText: 'Sign Up',
                        duration: 8000
                    }
                );
            }
        } else {
            this.notificationManager.show(
                'Consider upgrading your plan for more downloads!', 
                'info',
                {
                    action: 'upgrade',
                    actionText: 'View Plans',
                    duration: 6000
                }
            );
        }
    }

    /**
     * Add usage change listener
     */
    onUsageChange(callback) {
        this.usageChangeListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.usageChangeListeners.indexOf(callback);
            if (index > -1) {
                this.usageChangeListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all usage change listeners
     */
    notifyUsageChange() {
        const usageStats = this.getUsageStats();
        this.usageChangeListeners.forEach(callback => {
            try {
                callback(usageStats);
            } catch (error) {
                console.error('Error in usage change listener:', error);
            }
        });
    }

    /**
     * Force refresh usage data
     */
    async refreshUsage() {
        await this.initializeUsage();
        return this.getUsageStats();
    }

    /**
     * Get usage summary for display
     */
    getUsageSummary() {
        const stats = this.getUsageStats();
        const plan = this.getUserPlan();
        
        if (this.authManager && this.authManager.isAuthenticated) {
            return {
                primary: `${stats.remainingDownloads} downloads remaining`,
                secondary: `${stats.dailyRemaining} left today`,
                plan: plan.name,
                showUpgrade: stats.needsUpgrade || stats.isNearLimit
            };
        } else {
            return {
                primary: `${stats.remainingDownloads} free downloads remaining`,
                secondary: 'Sign up for more downloads',
                plan: 'Free',
                showUpgrade: stats.isNearLimit || stats.isAtLimit
            };
        }
    }

    /**
     * Initialize usage tracker
     */
    static async initialize() {
        // Wait for dependencies to be available
        if (!window.ApiClient || !window.appConfig) {
            throw new Error('UsageTracker dependencies not available');
        }
        
        const apiClient = new window.ApiClient(window.appConfig.getApiBaseUrl());
        const authManager = window.authManager || null;
        const notificationManager = window.notificationManager || null;
        
        const usageTracker = new UsageTracker(apiClient, window.appConfig, authManager, notificationManager);
        
        // Initialize usage data
        await usageTracker.initializeUsage();
        
        return usageTracker;
    }
}

// Export for use in other modules
window.UsageTracker = UsageTracker;