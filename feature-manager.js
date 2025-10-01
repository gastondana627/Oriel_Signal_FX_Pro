/**
 * Feature Manager for Premium Feature Gating
 * Handles plan-based access control, feature detection, and upgrade prompts
 */
class FeatureManager {
    constructor(authManager, appConfig, notificationManager) {
        this.authManager = authManager;
        this.appConfig = appConfig;
        this.notificationManager = notificationManager;
        
        // Feature categories
        this.featureCategories = {
            recording: 'recording',
            export: 'export',
            customization: 'customization',
            storage: 'storage',
            support: 'support'
        };
        
        // Premium features mapping
        this.premiumFeatures = this.initializePremiumFeatures();
        
        // Upgrade prompt tracking
        this.upgradePromptShown = new Set();
        this.upgradePromptCooldown = 5 * 60 * 1000; // 5 minutes
        
        // Bind methods
        this.hasFeatureAccess = this.hasFeatureAccess.bind(this);
        this.checkFeatureAccess = this.checkFeatureAccess.bind(this);
        this.showUpgradePrompt = this.showUpgradePrompt.bind(this);
        
        // Listen for auth state changes
        this.authManager.onStateChange(this.handleAuthStateChange.bind(this));
    }

    /**
     * Initialize premium features configuration
     */
    initializePremiumFeatures() {
        return {
            // Recording features
            extended_recording: {
                category: this.featureCategories.recording,
                name: 'Extended Recording Time',
                description: 'Record visualizations up to 5 minutes',
                requiredPlans: ['starter', 'pro'],
                freeLimit: 30, // seconds
                premiumLimit: {
                    starter: 60, // seconds
                    pro: 300 // seconds
                }
            },
            
            // Export features
            premium_exports: {
                category: this.featureCategories.export,
                name: 'Premium Export Formats',
                description: 'Export in MP4, WebM, WAV, and FLAC formats',
                requiredPlans: ['starter', 'pro'],
                freeFormats: ['gif', 'mp3'],
                premiumFormats: {
                    starter: ['gif', 'mp4', 'mp3', 'wav'],
                    pro: ['gif', 'mp4', 'webm', 'mp3', 'wav', 'flac']
                }
            },
            
            high_quality_export: {
                category: this.featureCategories.export,
                name: 'High Quality Exports',
                description: 'Export at higher resolutions and bitrates',
                requiredPlans: ['pro'],
                freeQuality: { resolution: '720p', bitrate: 'standard' },
                premiumQuality: { resolution: '1080p', bitrate: 'high' }
            },
            
            // Customization features
            custom_presets: {
                category: this.featureCategories.customization,
                name: 'Custom Presets',
                description: 'Save and load your custom visualizer settings',
                requiredPlans: ['starter', 'pro'],
                freeLimit: 0,
                premiumLimit: {
                    starter: 5,
                    pro: 'unlimited'
                }
            },
            
            advanced_customization: {
                category: this.featureCategories.customization,
                name: 'Advanced Customization',
                description: 'Access premium shapes, effects, and color schemes',
                requiredPlans: ['pro'],
                premiumOptions: {
                    shapes: ['spiral', 'wave3d', 'particle_system'],
                    effects: ['glow', 'blur', 'chromatic_aberration'],
                    colorSchemes: ['gradient_advanced', 'rainbow_spectrum', 'neon_glow']
                }
            },
            
            // Storage features
            cloud_sync: {
                category: this.featureCategories.storage,
                name: 'Cloud Synchronization',
                description: 'Sync your settings and presets across devices',
                requiredPlans: ['starter', 'pro']
            },
            
            // Support features
            priority_support: {
                category: this.featureCategories.support,
                name: 'Priority Support',
                description: 'Get faster response times for support requests',
                requiredPlans: ['pro']
            }
        };
    }

    /**
     * Check if user has access to a specific feature
     */
    hasFeatureAccess(featureName) {
        const feature = this.premiumFeatures[featureName];
        if (!feature) {
            console.warn(`Unknown feature: ${featureName}`);
            return false;
        }

        // Get user's current plan
        const userPlan = this.getCurrentUserPlan();
        
        // Check if feature requires premium plan
        if (!feature.requiredPlans || feature.requiredPlans.length === 0) {
            return true; // Feature is available to all users
        }

        // Check if user's plan includes this feature
        return feature.requiredPlans.includes(userPlan);
    }

    /**
     * Check feature access and show upgrade prompt if needed
     */
    checkFeatureAccess(featureName, showPrompt = true) {
        const hasAccess = this.hasFeatureAccess(featureName);
        
        if (!hasAccess && showPrompt) {
            this.showUpgradePrompt(featureName);
        }
        
        return hasAccess;
    }

    /**
     * Get feature limits for current user
     */
    getFeatureLimit(featureName, limitType = 'default') {
        const feature = this.premiumFeatures[featureName];
        if (!feature) {
            return null;
        }

        const userPlan = this.getCurrentUserPlan();
        
        // Check for plan-specific limits
        if (feature.premiumLimit && typeof feature.premiumLimit === 'object') {
            if (feature.premiumLimit[userPlan] !== undefined) {
                return feature.premiumLimit[userPlan];
            }
        }
        
        // Check for free tier limits
        if (userPlan === 'free' && feature.freeLimit !== undefined) {
            return feature.freeLimit;
        }
        
        // Return default limit if available
        return feature.premiumLimit || feature.freeLimit || null;
    }

    /**
     * Get available export formats for current user
     */
    getAvailableExportFormats() {
        const userPlan = this.getCurrentUserPlan();
        const exportFeature = this.premiumFeatures.premium_exports;
        
        if (userPlan === 'free') {
            return exportFeature.freeFormats || ['gif', 'mp3'];
        }
        
        return exportFeature.premiumFormats[userPlan] || exportFeature.freeFormats || ['gif', 'mp3'];
    }

    /**
     * Get maximum recording time for current user
     */
    getMaxRecordingTime() {
        return this.getFeatureLimit('extended_recording') || 30; // Default 30 seconds
    }

    /**
     * Get maximum custom presets for current user
     */
    getMaxCustomPresets() {
        const limit = this.getFeatureLimit('custom_presets');
        return limit === 'unlimited' ? Infinity : (limit || 0);
    }

    /**
     * Get available premium customization options
     */
    getPremiumCustomizationOptions() {
        if (!this.hasFeatureAccess('advanced_customization')) {
            return {
                shapes: [],
                effects: [],
                colorSchemes: []
            };
        }
        
        const feature = this.premiumFeatures.advanced_customization;
        return feature.premiumOptions || {
            shapes: [],
            effects: [],
            colorSchemes: []
        };
    }

    /**
     * Show upgrade prompt for a specific feature
     */
    showUpgradePrompt(featureName, options = {}) {
        const feature = this.premiumFeatures[featureName];
        if (!feature) {
            return;
        }

        // Check cooldown to avoid spam
        const promptKey = `${featureName}_${Date.now()}`;
        const lastPromptTime = localStorage.getItem(`upgrade_prompt_${featureName}`);
        
        if (lastPromptTime) {
            const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime);
            if (timeSinceLastPrompt < this.upgradePromptCooldown) {
                return; // Still in cooldown period
            }
        }

        // Store prompt time
        localStorage.setItem(`upgrade_prompt_${featureName}`, Date.now().toString());

        // Create upgrade prompt modal
        this.createUpgradePromptModal(feature, options);
    }

    /**
     * Create upgrade prompt modal
     */
    createUpgradePromptModal(feature, options = {}) {
        // Remove existing upgrade modal if present
        const existingModal = document.getElementById('upgrade-prompt-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'upgrade-prompt-modal';
        modal.className = 'modal upgrade-modal';
        modal.innerHTML = `
            <div class="modal-content upgrade-content">
                <div class="modal-header">
                    <h3>🚀 Upgrade to Premium</h3>
                    <button class="modal-close" id="upgrade-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="feature-highlight">
                        <div class="feature-icon">✨</div>
                        <h4>${feature.name}</h4>
                        <p>${feature.description}</p>
                    </div>
                    
                    <div class="upgrade-benefits">
                        <h5>Unlock with Premium:</h5>
                        <ul id="upgrade-benefits-list">
                            ${this.generateBenefitsList(feature)}
                        </ul>
                    </div>
                    
                    <div class="upgrade-plans">
                        ${this.generateUpgradePlansHTML(feature)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="upgrade-maybe-later">Maybe Later</button>
                    <button class="btn btn-primary" id="upgrade-choose-plan">Choose Plan</button>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.appendChild(modal);

        // Add event listeners
        this.setupUpgradeModalEventListeners(modal, feature);

        // Show modal
        modal.style.display = 'flex';
        
        // Focus management for accessibility
        const closeButton = modal.querySelector('#upgrade-modal-close');
        if (closeButton) {
            closeButton.focus();
        }
    }

    /**
     * Generate benefits list HTML for upgrade prompt
     */
    generateBenefitsList(feature) {
        const benefits = [];
        
        switch (feature.category) {
            case this.featureCategories.recording:
                benefits.push('Record longer visualizations');
                benefits.push('Higher quality recordings');
                break;
            case this.featureCategories.export:
                benefits.push('More export formats');
                benefits.push('Higher quality exports');
                break;
            case this.featureCategories.customization:
                benefits.push('Save custom presets');
                benefits.push('Advanced visual effects');
                benefits.push('Premium color schemes');
                break;
            case this.featureCategories.storage:
                benefits.push('Cloud synchronization');
                benefits.push('Cross-device access');
                break;
            case this.featureCategories.support:
                benefits.push('Priority customer support');
                benefits.push('Faster response times');
                break;
        }

        return benefits.map(benefit => `<li>${benefit}</li>`).join('');
    }

    /**
     * Generate upgrade plans HTML
     */
    generateUpgradePlansHTML(feature) {
        const availablePlans = feature.requiredPlans.map(planId => 
            this.appConfig.getPlan(planId)
        ).filter(plan => plan);

        return availablePlans.map(plan => `
            <div class="upgrade-plan" data-plan="${plan.id}">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">$${plan.price}/${plan.interval}</div>
                <div class="plan-features">
                    <small>${plan.features.downloads} downloads/month</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup event listeners for upgrade modal
     */
    setupUpgradeModalEventListeners(modal, feature) {
        // Close modal handlers
        const closeButton = modal.querySelector('#upgrade-modal-close');
        const maybeLaterButton = modal.querySelector('#upgrade-maybe-later');
        
        const closeModal = () => {
            modal.style.display = 'none';
            modal.remove();
        };

        closeButton?.addEventListener('click', closeModal);
        maybeLaterButton?.addEventListener('click', closeModal);

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Escape key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Choose plan button
        const choosePlanButton = modal.querySelector('#upgrade-choose-plan');
        choosePlanButton?.addEventListener('click', () => {
            closeModal();
            this.showPlanSelectionModal(feature);
        });

        // Plan selection
        const planElements = modal.querySelectorAll('.upgrade-plan');
        planElements.forEach(planElement => {
            planElement.addEventListener('click', () => {
                const planId = planElement.dataset.plan;
                closeModal();
                this.initiateUpgrade(planId, feature);
            });
        });
    }

    /**
     * Show plan selection modal
     */
    showPlanSelectionModal(feature) {
        // Use existing payment UI if available
        if (window.paymentUI && typeof window.paymentUI.showPlanSelectionModal === 'function') {
            window.paymentUI.showPlanSelectionModal();
        } else {
            // Fallback: show simple plan selection
            this.showSimplePlanSelection(feature);
        }
    }

    /**
     * Show simple plan selection fallback
     */
    showSimplePlanSelection(feature) {
        const plans = feature.requiredPlans.map(planId => 
            this.appConfig.getPlan(planId)
        ).filter(plan => plan);

        const planOptions = plans.map(plan => 
            `${plan.name} - $${plan.price}/${plan.interval}`
        ).join('\n');

        const selectedPlan = prompt(`Choose your plan:\n${planOptions}\n\nEnter plan name:`);
        
        if (selectedPlan) {
            const plan = plans.find(p => 
                p.name.toLowerCase() === selectedPlan.toLowerCase()
            );
            
            if (plan) {
                this.initiateUpgrade(plan.id, feature);
            }
        }
    }

    /**
     * Initiate upgrade process
     */
    async initiateUpgrade(planId, feature) {
        try {
            // Check if payment manager is available
            if (!window.paymentManager) {
                this.notificationManager.show('Payment system not available', 'error');
                return;
            }

            // Track upgrade attempt
            this.trackFeatureUpgradeAttempt(feature.name, planId);

            // Create checkout session
            const session = await window.paymentManager.createCheckoutSession(planId, {
                metadata: {
                    triggered_by_feature: feature.name,
                    feature_category: feature.category
                }
            });

            if (session) {
                this.notificationManager.show('Redirecting to payment...', 'info');
            }

        } catch (error) {
            console.error('Upgrade initiation failed:', error);
            this.notificationManager.show('Failed to start upgrade process', 'error');
        }
    }

    /**
     * Get current user's plan
     */
    getCurrentUserPlan() {
        if (!this.authManager.isAuthenticated) {
            return 'free';
        }

        const user = this.authManager.getCurrentUser();
        return user?.plan || 'free';
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(authState) {
        // Clear upgrade prompt cooldowns when user logs out
        if (!authState.isAuthenticated) {
            this.clearUpgradePromptCooldowns();
        }
    }

    /**
     * Clear upgrade prompt cooldowns
     */
    clearUpgradePromptCooldowns() {
        Object.keys(this.premiumFeatures).forEach(featureName => {
            localStorage.removeItem(`upgrade_prompt_${featureName}`);
        });
    }

    /**
     * Track feature upgrade attempts for analytics
     */
    trackFeatureUpgradeAttempt(featureName, planId) {
        try {
            // Emit custom event for analytics
            const event = new CustomEvent('oriel_feature_upgrade_attempt', {
                detail: {
                    feature: featureName,
                    plan: planId,
                    timestamp: new Date().toISOString()
                }
            });
            window.dispatchEvent(event);

            // Store in localStorage for offline tracking
            const attempts = JSON.parse(localStorage.getItem('oriel_upgrade_attempts') || '[]');
            attempts.push({
                feature: featureName,
                plan: planId,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 10 attempts
            if (attempts.length > 10) {
                attempts.splice(0, attempts.length - 10);
            }
            
            localStorage.setItem('oriel_upgrade_attempts', JSON.stringify(attempts));

        } catch (error) {
            console.error('Failed to track upgrade attempt:', error);
        }
    }

    /**
     * Get feature information
     */
    getFeatureInfo(featureName) {
        return this.premiumFeatures[featureName] || null;
    }

    /**
     * Get all premium features
     */
    getAllPremiumFeatures() {
        return this.premiumFeatures;
    }

    /**
     * Get features by category
     */
    getFeaturesByCategory(category) {
        return Object.entries(this.premiumFeatures)
            .filter(([_, feature]) => feature.category === category)
            .reduce((acc, [name, feature]) => {
                acc[name] = feature;
                return acc;
            }, {});
    }

    /**
     * Check if user can access any premium features
     */
    hasPremiumAccess() {
        const userPlan = this.getCurrentUserPlan();
        return userPlan !== 'free';
    }

    /**
     * Get upgrade suggestions for current user
     */
    getUpgradeSuggestions() {
        const userPlan = this.getCurrentUserPlan();
        const allPlans = this.appConfig.getAllPlans();
        
        return allPlans.filter(plan => 
            plan.price > (this.appConfig.getPlan(userPlan)?.price || 0)
        );
    }
}

// Export for use in other modules
window.FeatureManager = FeatureManager;