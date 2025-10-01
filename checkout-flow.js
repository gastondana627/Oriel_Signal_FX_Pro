/**
 * Checkout Flow Manager
 * Handles the complete checkout process from feature trigger to payment completion
 */
class CheckoutFlow {
    constructor(featureManager, paymentManager, paymentUI, authManager, notificationManager) {
        this.featureManager = featureManager;
        this.paymentManager = paymentManager;
        this.paymentUI = paymentUI;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        // Checkout state
        this.currentCheckout = null;
        this.checkoutHistory = [];
        
        // Checkout steps
        this.checkoutSteps = {
            FEATURE_TRIGGER: 'feature_trigger',
            AUTH_CHECK: 'auth_check',
            PLAN_SELECTION: 'plan_selection',
            PAYMENT_PROCESSING: 'payment_processing',
            PAYMENT_SUCCESS: 'payment_success',
            PAYMENT_FAILED: 'payment_failed',
            FEATURE_UNLOCKED: 'feature_unlocked'
        };
        
        // Initialize checkout flow
        this.initializeCheckoutFlow();
    }

    /**
     * Initialize checkout flow
     */
    initializeCheckoutFlow() {
        // Listen for feature upgrade attempts
        window.addEventListener('oriel_feature_upgrade_attempt', (event) => {
            this.handleFeatureUpgradeAttempt(event.detail);
        });
        
        // Listen for payment events
        window.addEventListener('oriel_payment_success', (event) => {
            this.handlePaymentSuccess(event.detail);
        });
        
        window.addEventListener('oriel_payment_cancel', (event) => {
            this.handlePaymentCancel(event.detail);
        });
        
        // Set up upgrade button handlers
        this.setupUpgradeButtons();
    }

    /**
     * Setup upgrade button handlers
     */
    setupUpgradeButtons() {
        // Main upgrade button
        const upgradeButton = document.getElementById('upgrade-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => {
                this.startCheckoutFlow('manual_upgrade');
            });
        }

        // Feature-specific upgrade buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('feature-upgrade-btn')) {
                const featureName = e.target.dataset.feature;
                this.startCheckoutFlow('feature_upgrade', { featureName });
            }
        });
    }

    /**
     * Start checkout flow
     */
    async startCheckoutFlow(trigger, context = {}) {
        try {
            // Create checkout session
            this.currentCheckout = {
                id: this.generateCheckoutId(),
                trigger: trigger,
                context: context,
                startTime: new Date(),
                currentStep: this.checkoutSteps.FEATURE_TRIGGER,
                steps: []
            };

            this.logCheckoutStep(this.checkoutSteps.FEATURE_TRIGGER, { trigger, context });

            // Step 1: Check authentication
            const authResult = await this.checkAuthentication();
            if (!authResult.success) {
                return this.handleCheckoutFailure('authentication_required', authResult.message);
            }

            // Step 2: Show plan selection
            const planResult = await this.showPlanSelection(context);
            if (!planResult.success) {
                return this.handleCheckoutFailure('plan_selection_cancelled', planResult.message);
            }

            // Step 3: Process payment
            const paymentResult = await this.processPayment(planResult.selectedPlan);
            if (!paymentResult.success) {
                return this.handleCheckoutFailure('payment_failed', paymentResult.message);
            }

            // Checkout initiated successfully
            this.notificationManager.show('Redirecting to payment...', 'info');
            return { success: true, checkoutId: this.currentCheckout.id };

        } catch (error) {
            console.error('Checkout flow failed:', error);
            return this.handleCheckoutFailure('checkout_error', error.message);
        }
    }

    /**
     * Check authentication step
     */
    async checkAuthentication() {
        this.logCheckoutStep(this.checkoutSteps.AUTH_CHECK);

        if (!this.authManager.isAuthenticated) {
            // Show login prompt
            this.showAuthenticationPrompt();
            return { success: false, message: 'Authentication required' };
        }

        return { success: true };
    }

    /**
     * Show authentication prompt
     */
    showAuthenticationPrompt() {
        const modal = this.createCheckoutModal('authentication', {
            title: '🔐 Login Required',
            content: `
                <div class="checkout-auth-prompt">
                    <p>Please log in to upgrade your plan and unlock premium features.</p>
                    <div class="auth-benefits">
                        <h4>With an account you get:</h4>
                        <ul>
                            <li>✨ Premium visualizer shapes and effects</li>
                            <li>⏱️ Extended recording times</li>
                            <li>🎨 Custom presets and settings</li>
                            <li>💾 Cloud sync across devices</li>
                            <li>🎯 Priority customer support</li>
                        </ul>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Login',
                    class: 'btn-primary',
                    action: () => {
                        this.closeCheckoutModal();
                        if (window.authUI) {
                            window.authUI.showLoginModal();
                        }
                    }
                },
                {
                    text: 'Sign Up',
                    class: 'btn-secondary',
                    action: () => {
                        this.closeCheckoutModal();
                        if (window.authUI) {
                            window.authUI.showRegisterModal();
                        }
                    }
                },
                {
                    text: 'Cancel',
                    class: 'btn-tertiary',
                    action: () => this.closeCheckoutModal()
                }
            ]
        });

        this.showCheckoutModal(modal);
    }

    /**
     * Show plan selection step
     */
    async showPlanSelection(context = {}) {
        this.logCheckoutStep(this.checkoutSteps.PLAN_SELECTION);

        return new Promise((resolve) => {
            const currentPlan = this.authManager.getCurrentUser()?.plan || 'free';
            const availablePlans = this.getAvailablePlans(currentPlan, context);

            const modal = this.createCheckoutModal('plan-selection', {
                title: '✨ Choose Your Plan',
                content: this.generatePlanSelectionHTML(availablePlans, context),
                actions: [
                    {
                        text: 'Cancel',
                        class: 'btn-tertiary',
                        action: () => {
                            this.closeCheckoutModal();
                            resolve({ success: false, message: 'Plan selection cancelled' });
                        }
                    }
                ]
            });

            // Add plan selection handlers
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('plan-select-btn')) {
                    const planId = e.target.dataset.plan;
                    this.closeCheckoutModal();
                    resolve({ success: true, selectedPlan: planId });
                }
            });

            this.showCheckoutModal(modal);
        });
    }

    /**
     * Generate plan selection HTML
     */
    generatePlanSelectionHTML(plans, context) {
        const featureName = context.featureName;
        const featureInfo = featureName ? this.featureManager.getFeatureInfo(featureName) : null;

        let html = '';

        if (featureInfo) {
            html += `
                <div class="feature-highlight">
                    <h4>🎯 You're upgrading for: ${featureInfo.name}</h4>
                    <p>${featureInfo.description}</p>
                </div>
            `;
        }

        html += '<div class="plans-grid">';

        plans.forEach(plan => {
            const isRecommended = plan.id === 'starter';
            const features = this.getPlanFeatures(plan.id, featureName);

            html += `
                <div class="plan-card ${isRecommended ? 'recommended' : ''}">
                    ${isRecommended ? '<div class="plan-badge">Recommended</div>' : ''}
                    <div class="plan-header">
                        <h3>${plan.name}</h3>
                        <div class="plan-price">
                            <span class="price">$${plan.price}</span>
                            <span class="period">/${plan.interval}</span>
                        </div>
                    </div>
                    <div class="plan-features">
                        ${features.map(feature => `<div class="feature-item">✓ ${feature}</div>`).join('')}
                    </div>
                    <button class="btn btn-primary plan-select-btn" data-plan="${plan.id}">
                        Choose ${plan.name}
                    </button>
                </div>
            `;
        });

        html += '</div>';

        return html;
    }

    /**
     * Get available plans for upgrade
     */
    getAvailablePlans(currentPlan, context) {
        const allPlans = this.featureManager.appConfig.getAllPlans();
        const currentPlanConfig = this.featureManager.appConfig.getPlan(currentPlan);
        const currentPrice = currentPlanConfig?.price || 0;

        // Filter to upgrade plans only
        return allPlans.filter(plan => plan.price > currentPrice);
    }

    /**
     * Get plan features for display
     */
    getPlanFeatures(planId, highlightFeature = null) {
        const plan = this.featureManager.appConfig.getPlan(planId);
        if (!plan) return [];

        const features = [
            `${plan.features.downloads} downloads/month`,
            `${plan.features.maxRecordingTime}s recording time`,
            `${plan.features.exportFormats.join(', ')} formats`
        ];

        if (plan.features.customPresets > 0) {
            features.push(`${plan.features.customPresets} custom presets`);
        }

        if (plan.features.support !== 'community') {
            features.push(`${plan.features.support} support`);
        }

        // Highlight specific feature if provided
        if (highlightFeature) {
            const featureInfo = this.featureManager.getFeatureInfo(highlightFeature);
            if (featureInfo && featureInfo.requiredPlans.includes(planId)) {
                features.unshift(`🎯 ${featureInfo.name}`);
            }
        }

        return features;
    }

    /**
     * Process payment step
     */
    async processPayment(planId) {
        this.logCheckoutStep(this.checkoutSteps.PAYMENT_PROCESSING, { planId });

        try {
            // Add checkout context to payment metadata
            const paymentOptions = {
                metadata: {
                    checkout_id: this.currentCheckout.id,
                    checkout_trigger: this.currentCheckout.trigger,
                    feature_context: JSON.stringify(this.currentCheckout.context)
                }
            };

            // Create checkout session
            const session = await this.paymentManager.createCheckoutSession(planId, paymentOptions);

            if (!session) {
                return { success: false, message: 'Failed to create payment session' };
            }

            // Payment processing started successfully
            return { success: true, session };

        } catch (error) {
            console.error('Payment processing failed:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Handle feature upgrade attempt
     */
    handleFeatureUpgradeAttempt(detail) {
        this.startCheckoutFlow('feature_upgrade', {
            featureName: detail.feature,
            planId: detail.plan
        });
    }

    /**
     * Handle payment success
     */
    handlePaymentSuccess(detail) {
        if (this.currentCheckout) {
            this.logCheckoutStep(this.checkoutSteps.PAYMENT_SUCCESS, detail);
            this.completeCheckout('success', detail);
        }
    }

    /**
     * Handle payment cancel
     */
    handlePaymentCancel(detail) {
        if (this.currentCheckout) {
            this.logCheckoutStep(this.checkoutSteps.PAYMENT_FAILED, detail);
            this.completeCheckout('cancelled', detail);
        }
    }

    /**
     * Complete checkout process
     */
    completeCheckout(status, detail = {}) {
        if (!this.currentCheckout) return;

        this.currentCheckout.endTime = new Date();
        this.currentCheckout.status = status;
        this.currentCheckout.result = detail;

        // Add to history
        this.checkoutHistory.push({ ...this.currentCheckout });

        // Show completion message
        if (status === 'success') {
            this.logCheckoutStep(this.checkoutSteps.FEATURE_UNLOCKED);
            this.showSuccessMessage();
        } else if (status === 'cancelled') {
            this.showCancelMessage();
        }

        // Clear current checkout
        this.currentCheckout = null;
    }

    /**
     * Show success message
     */
    showSuccessMessage() {
        const modal = this.createCheckoutModal('success', {
            title: '🎉 Welcome to Premium!',
            content: `
                <div class="checkout-success">
                    <div class="success-icon">✨</div>
                    <h3>Your upgrade is complete!</h3>
                    <p>You now have access to all premium features. Enjoy creating amazing visualizations!</p>
                    <div class="next-steps">
                        <h4>What's new:</h4>
                        <ul>
                            <li>🎨 Premium shapes and effects</li>
                            <li>⏱️ Extended recording times</li>
                            <li>💾 Custom presets</li>
                            <li>🎯 Priority support</li>
                        </ul>
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Start Creating!',
                    class: 'btn-primary',
                    action: () => {
                        this.closeCheckoutModal();
                        // Refresh the page to update all UI elements
                        window.location.reload();
                    }
                }
            ]
        });

        this.showCheckoutModal(modal);
    }

    /**
     * Show cancel message
     */
    showCancelMessage() {
        this.notificationManager.show(
            'Payment cancelled. You can upgrade anytime to unlock premium features!',
            'info'
        );
    }

    /**
     * Handle checkout failure
     */
    handleCheckoutFailure(reason, message) {
        if (this.currentCheckout) {
            this.currentCheckout.status = 'failed';
            this.currentCheckout.failureReason = reason;
            this.currentCheckout.endTime = new Date();
        }

        console.error('Checkout failed:', reason, message);
        return { success: false, reason, message };
    }

    /**
     * Create checkout modal
     */
    createCheckoutModal(type, config) {
        const modal = document.createElement('div');
        modal.className = `modal checkout-modal checkout-${type}`;
        modal.innerHTML = `
            <div class="modal-content checkout-content">
                <div class="modal-header">
                    <h2>${config.title}</h2>
                    <button class="modal-close" id="checkout-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${config.content}
                </div>
                <div class="modal-footer">
                    ${config.actions.map(action => 
                        `<button class="btn ${action.class}" data-action="${action.text.toLowerCase().replace(/\s+/g, '-')}">${action.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('#checkout-modal-close');
        closeBtn?.addEventListener('click', () => this.closeCheckoutModal());

        config.actions.forEach(action => {
            const btn = modal.querySelector(`[data-action="${action.text.toLowerCase().replace(/\s+/g, '-')}"]`);
            btn?.addEventListener('click', action.action);
        });

        return modal;
    }

    /**
     * Show checkout modal
     */
    showCheckoutModal(modal) {
        // Remove existing checkout modal
        this.closeCheckoutModal();
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Store reference
        this.currentModal = modal;
    }

    /**
     * Close checkout modal
     */
    closeCheckoutModal() {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    /**
     * Log checkout step
     */
    logCheckoutStep(step, data = {}) {
        if (!this.currentCheckout) return;

        const stepLog = {
            step,
            timestamp: new Date(),
            data
        };

        this.currentCheckout.steps.push(stepLog);
        this.currentCheckout.currentStep = step;

        console.log(`Checkout Step [${this.currentCheckout.id}]:`, step, data);
    }

    /**
     * Generate checkout ID
     */
    generateCheckoutId() {
        return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get checkout analytics
     */
    getCheckoutAnalytics() {
        return {
            currentCheckout: this.currentCheckout,
            checkoutHistory: this.checkoutHistory,
            conversionRate: this.calculateConversionRate(),
            commonFailureReasons: this.getCommonFailureReasons()
        };
    }

    /**
     * Calculate conversion rate
     */
    calculateConversionRate() {
        if (this.checkoutHistory.length === 0) return 0;
        
        const successful = this.checkoutHistory.filter(c => c.status === 'success').length;
        return (successful / this.checkoutHistory.length) * 100;
    }

    /**
     * Get common failure reasons
     */
    getCommonFailureReasons() {
        const failures = this.checkoutHistory.filter(c => c.status === 'failed');
        const reasons = {};
        
        failures.forEach(failure => {
            const reason = failure.failureReason || 'unknown';
            reasons[reason] = (reasons[reason] || 0) + 1;
        });
        
        return Object.entries(reasons)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
}

// Export for use in other modules
window.CheckoutFlow = CheckoutFlow;