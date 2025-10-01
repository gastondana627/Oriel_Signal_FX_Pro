/**
 * Payment Integration
 * Handles integration between payment system and usage tracking
 */
class PaymentIntegration {
    constructor(paymentManager, usageTracker, authManager, notificationManager) {
        this.paymentManager = paymentManager;
        this.usageTracker = usageTracker;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        this.isInitialized = false;
        
        // Initialize integration
        this.initialize();
    }

    /**
     * Initialize payment integration
     */
    initialize() {
        if (this.isInitialized) return;
        
        // Listen for payment events
        window.addEventListener('oriel_payment_success', (event) => {
            this.handlePaymentSuccess(event.detail);
        });
        
        // Listen for usage limit events
        this.usageTracker.onUsageChange((usageStats) => {
            this.handleUsageChange(usageStats);
        });
        
        // Listen for download attempts when at limit
        window.addEventListener('oriel_download_limit_reached', (event) => {
            this.handleDownloadLimitReached(event.detail);
        });
        
        this.isInitialized = true;
        console.log('Payment integration initialized');
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(paymentDetails) {
        try {
            console.log('Processing payment success:', paymentDetails);
            
            // Wait a moment for backend webhook to process
            await this.delay(2000);
            
            // Refresh user profile to get updated plan/credits
            if (this.authManager) {
                await this.authManager.refreshUserProfile();
            }
            
            // Refresh usage data to reflect new limits
            await this.usageTracker.refreshUsage();
            
            // Update UI to reflect changes
            this.updateUIAfterPayment(paymentDetails);
            
            // Show success notification with updated limits
            this.showPaymentSuccessNotification(paymentDetails);
            
        } catch (error) {
            console.error('Error processing payment success:', error);
            this.notificationManager.show(
                'Payment successful, but there was an issue updating your account. Please refresh the page.',
                'warning'
            );
        }
    }

    /**
     * Handle usage changes to show upgrade prompts
     */
    handleUsageChange(usageStats) {
        // Show upgrade prompts when user is near or at limits
        if (usageStats.isAtLimit) {
            this.showUpgradePromptForLimitReached(usageStats);
        } else if (usageStats.isNearLimit) {
            this.showUpgradePromptForNearLimit(usageStats);
        }
        
        // Update download button state
        this.updateDownloadButtonState(usageStats);
    }

    /**
     * Handle download limit reached event
     */
    handleDownloadLimitReached(limitDetails) {
        const usageStats = this.usageTracker.getUsageStats();
        
        if (limitDetails.reason === 'free_limit') {
            // Anonymous user hit free limit
            this.showSignUpPrompt();
        } else if (limitDetails.reason === 'no_credits') {
            // Authenticated user out of credits
            this.showUpgradeOrCreditPrompt(usageStats);
        } else if (limitDetails.reason === 'daily_limit') {
            // Daily limit reached
            this.showDailyLimitMessage();
        } else if (limitDetails.reason === 'monthly_limit') {
            // Monthly limit reached
            this.showMonthlyLimitMessage(usageStats);
        }
    }

    /**
     * Show upgrade prompt when limit is reached
     */
    showUpgradePromptForLimitReached(usageStats) {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return; // Handled by download limit reached event
        }
        
        const plan = usageStats.planId;
        
        if (plan === 'free') {
            this.notificationManager.show(
                'You\'ve used all your free downloads! Upgrade to continue creating amazing visualizations.',
                'warning',
                {
                    action: {
                        text: 'Upgrade Now',
                        callback: () => this.showUpgradeModal()
                    },
                    duration: 10000
                }
            );
        } else {
            this.notificationManager.show(
                'You\'ve reached your download limit. Upgrade your plan or buy more credits.',
                'warning',
                {
                    action: {
                        text: 'View Options',
                        callback: () => this.showUpgradeOrCreditOptions()
                    },
                    duration: 8000
                }
            );
        }
    }

    /**
     * Show upgrade prompt when near limit
     */
    showUpgradePromptForNearLimit(usageStats) {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return;
        }
        
        // Only show once when user has 1 download left
        if (usageStats.remainingDownloads === 1) {
            this.notificationManager.show(
                `Only ${usageStats.remainingDownloads} download remaining! Consider upgrading for unlimited creativity.`,
                'info',
                {
                    action: {
                        text: 'Upgrade',
                        callback: () => this.showUpgradeModal()
                    },
                    duration: 6000
                }
            );
        }
    }

    /**
     * Show sign up prompt for anonymous users
     */
    showSignUpPrompt() {
        this.notificationManager.show(
            'You\'ve used all your free downloads! Sign up to get more downloads and save your creations.',
            'info',
            {
                action: {
                    text: 'Sign Up Free',
                    callback: () => this.showSignUpModal()
                },
                duration: 10000
            }
        );
    }

    /**
     * Show upgrade or credit purchase options
     */
    showUpgradeOrCreditPrompt(usageStats) {
        const plan = usageStats.planId;
        
        if (plan === 'free') {
            this.showUpgradeModal();
        } else {
            // Show both upgrade and credit options
            this.showUpgradeOrCreditOptions();
        }
    }

    /**
     * Show daily limit message
     */
    showDailyLimitMessage() {
        this.notificationManager.show(
            'You\'ve reached your daily download limit. Try again tomorrow or upgrade for higher limits!',
            'info',
            {
                action: {
                    text: 'Upgrade',
                    callback: () => this.showUpgradeModal()
                },
                duration: 8000
            }
        );
    }

    /**
     * Show monthly limit message
     */
    showMonthlyLimitMessage(usageStats) {
        this.notificationManager.show(
            'You\'ve reached your monthly download limit. Upgrade your plan for more downloads!',
            'warning',
            {
                action: {
                    text: 'Upgrade Plan',
                    callback: () => this.showUpgradeModal()
                },
                duration: 8000
            }
        );
    }

    /**
     * Update UI after successful payment
     */
    updateUIAfterPayment(paymentDetails) {
        // Update user status display
        this.updateUserStatusDisplay();
        
        // Update download button if it was disabled
        const downloadButton = document.getElementById('download-button');
        if (downloadButton && downloadButton.disabled) {
            downloadButton.disabled = false;
            downloadButton.textContent = 'Download';
        }
        
        // Update usage display
        this.updateUsageDisplay();
    }

    /**
     * Update user status display
     */
    updateUserStatusDisplay() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return;
        }
        
        const user = this.authManager.getCurrentUser();
        const usageStats = this.usageTracker.getUsageStats();
        
        // Update credits display
        const creditsElement = document.getElementById('user-credits');
        if (creditsElement) {
            creditsElement.textContent = `${usageStats.remainingDownloads} downloads`;
        }
        
        // Update plan display if there's a plan indicator
        const planElement = document.getElementById('user-plan');
        if (planElement && user.plan) {
            planElement.textContent = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);
        }
    }

    /**
     * Update usage display
     */
    updateUsageDisplay() {
        const usageStats = this.usageTracker.getUsageStats();
        const usageSummary = this.usageTracker.getUsageSummary();
        
        // Update downloads remaining counter
        const downloadsRemainingElement = document.getElementById('downloads-remaining');
        if (downloadsRemainingElement) {
            downloadsRemainingElement.textContent = usageSummary.primary;
        }
    }

    /**
     * Update download button state based on usage
     */
    updateDownloadButtonState(usageStats) {
        const downloadButton = document.getElementById('download-button');
        if (!downloadButton) return;
        
        if (usageStats.isAtLimit) {
            downloadButton.disabled = true;
            downloadButton.textContent = 'Limit Reached';
            downloadButton.title = 'Upgrade to download more';
        } else {
            downloadButton.disabled = false;
            downloadButton.textContent = 'Download';
            downloadButton.title = '';
        }
    }

    /**
     * Show payment success notification with details
     */
    showPaymentSuccessNotification(paymentDetails) {
        const usageStats = this.usageTracker.getUsageStats();
        
        if (paymentDetails.planType) {
            // Plan upgrade
            const plan = window.appConfig.getPlan(paymentDetails.planType);
            this.notificationManager.show(
                `Welcome to ${plan.name}! You now have ${usageStats.remainingDownloads} downloads available.`,
                'success',
                { duration: 8000 }
            );
        } else if (paymentDetails.creditAmount) {
            // Credit purchase
            this.notificationManager.show(
                `${paymentDetails.creditAmount} credits added! You now have ${usageStats.remainingDownloads} downloads available.`,
                'success',
                { duration: 6000 }
            );
        } else {
            // Generic success
            this.notificationManager.show(
                `Payment successful! You now have ${usageStats.remainingDownloads} downloads available.`,
                'success',
                { duration: 6000 }
            );
        }
    }

    /**
     * Show upgrade modal
     */
    showUpgradeModal() {
        if (window.paymentUI) {
            window.paymentUI.showPlanSelectionModal();
        }
    }

    /**
     * Show sign up modal
     */
    showSignUpModal() {
        if (window.authUI) {
            window.authUI.showRegisterModal();
        }
    }

    /**
     * Show upgrade or credit options
     */
    showUpgradeOrCreditOptions() {
        // Create a choice modal or show both options
        this.notificationManager.show(
            'Choose how to get more downloads:',
            'info',
            {
                actions: [
                    {
                        text: 'Upgrade Plan',
                        callback: () => this.showUpgradeModal()
                    },
                    {
                        text: 'Buy Credits',
                        callback: () => this.showCreditPurchaseModal()
                    }
                ],
                duration: 10000
            }
        );
    }

    /**
     * Show credit purchase modal
     */
    showCreditPurchaseModal() {
        if (window.paymentUI) {
            window.paymentUI.showCreditPurchaseModal();
        }
    }

    /**
     * Check if user can download and handle limits
     */
    async checkDownloadPermission() {
        const canDownload = this.usageTracker.canUserDownload();
        
        if (!canDownload.allowed) {
            // Emit download limit reached event
            const event = new CustomEvent('oriel_download_limit_reached', {
                detail: {
                    reason: canDownload.reason,
                    message: canDownload.message
                }
            });
            window.dispatchEvent(event);
            
            return false;
        }
        
        return true;
    }

    /**
     * Track download with payment integration
     */
    async trackDownloadWithPaymentCheck(downloadType, metadata = {}) {
        try {
            // Check if user can download
            const canDownload = await this.checkDownloadPermission();
            if (!canDownload) {
                return { success: false, reason: 'limit_reached' };
            }
            
            // Track the download
            const result = await this.usageTracker.trackDownload(downloadType, metadata);
            
            // Check if user is now near limit after this download
            const usageStats = this.usageTracker.getUsageStats();
            if (usageStats.isNearLimit && !usageStats.isAtLimit) {
                // Show gentle upgrade prompt
                setTimeout(() => {
                    this.showUpgradePromptForNearLimit(usageStats);
                }, 2000); // Show after download completes
            }
            
            return result;
            
        } catch (error) {
            console.error('Download tracking failed:', error);
            
            // Handle specific error cases
            if (error.message.includes('limit')) {
                const event = new CustomEvent('oriel_download_limit_reached', {
                    detail: {
                        reason: 'limit_error',
                        message: error.message
                    }
                });
                window.dispatchEvent(event);
            }
            
            throw error;
        }
    }

    /**
     * Get payment history with usage context
     */
    async getPaymentHistoryWithUsage() {
        try {
            const paymentHistory = await this.paymentManager.getPaymentHistory();
            const usageStats = this.usageTracker.getUsageStats();
            
            return {
                payments: paymentHistory,
                currentUsage: usageStats,
                recommendations: this.getUpgradeRecommendations(usageStats)
            };
            
        } catch (error) {
            console.error('Failed to get payment history with usage:', error);
            return {
                payments: [],
                currentUsage: this.usageTracker.getUsageStats(),
                recommendations: []
            };
        }
    }

    /**
     * Get upgrade recommendations based on usage patterns
     */
    getUpgradeRecommendations(usageStats) {
        const recommendations = [];
        const plan = window.appConfig.getPlan(usageStats.planId);
        
        if (usageStats.planId === 'free') {
            if (usageStats.dailyDownloads >= 2) {
                recommendations.push({
                    type: 'plan_upgrade',
                    plan: 'starter',
                    reason: 'You\'re an active user! Starter plan gives you 50 downloads/month.',
                    savings: 'Save money compared to buying credits individually.'
                });
            }
        } else if (usageStats.planId === 'starter') {
            if (usageStats.monthlyDownloads >= 40) {
                recommendations.push({
                    type: 'plan_upgrade',
                    plan: 'pro',
                    reason: 'You\'re using most of your Starter downloads. Pro gives you 500/month.',
                    savings: 'Better value for heavy users.'
                });
            }
        }
        
        // Credit recommendations
        if (usageStats.remainingDownloads <= 5 && usageStats.planId !== 'free') {
            recommendations.push({
                type: 'credit_purchase',
                amount: 50,
                reason: 'Running low on downloads? Buy credits to keep creating.',
                flexibility: 'Credits never expire and work with any plan.'
            });
        }
        
        return recommendations;
    }

    /**
     * Utility function to add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            paymentManagerReady: !!this.paymentManager,
            usageTrackerReady: !!this.usageTracker,
            authManagerReady: !!this.authManager
        };
    }
}

// Export for use in other modules
window.PaymentIntegration = PaymentIntegration;