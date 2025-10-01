/**
 * Payment UI Management
 * Handles payment modal interactions and UI updates
 */
class PaymentUI {
    constructor(paymentManager, authManager, notificationManager) {
        this.paymentManager = paymentManager;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        this.selectedCreditAmount = null;
        this.isInitialized = false;
        
        // Initialize UI when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize payment UI components
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.bindEventListeners();
        this.updatePaymentButtons();
        this.isInitialized = true;
        
        console.log('Payment UI initialized');
    }

    /**
     * Bind event listeners to payment UI elements
     */
    bindEventListeners() {
        // Upgrade button in control panel
        const upgradeButton = document.getElementById('upgrade-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => this.showPlanSelectionModal());
        }

        // Buy credits button in control panel
        const buyCreditsButton = document.getElementById('buy-credits-button');
        if (buyCreditsButton) {
            buyCreditsButton.addEventListener('click', () => this.showCreditPurchaseModal());
        }

        // Plan selection modal
        this.bindPlanSelectionEvents();
        
        // Credit purchase modal
        this.bindCreditPurchaseEvents();
        
        // Success/Error modals
        this.bindResultModalEvents();
        
        // Listen for authentication state changes
        window.addEventListener('oriel_auth_state_changed', (event) => {
            this.updatePaymentButtons();
        });
        
        // Listen for payment events
        window.addEventListener('oriel_payment_success', (event) => {
            this.handlePaymentSuccess(event.detail);
        });
        
        window.addEventListener('oriel_payment_cancel', (event) => {
            this.handlePaymentCancel(event.detail);
        });
    }

    /**
     * Bind plan selection modal events
     */
    bindPlanSelectionEvents() {
        // Close button
        const closeBtn = document.getElementById('plan-selection-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePlanSelectionModal());
        }

        // Plan upgrade buttons
        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const planType = e.target.dataset.plan;
                this.handlePlanUpgrade(planType, e.target);
            });
        });

        // Modal backdrop click
        const modal = document.getElementById('plan-selection-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePlanSelectionModal();
                }
            });
        }
    }

    /**
     * Bind credit purchase modal events
     */
    bindCreditPurchaseEvents() {
        // Close button
        const closeBtn = document.getElementById('credit-purchase-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideCreditPurchaseModal());
        }

        // Credit option selection
        const creditOptions = document.querySelectorAll('.credit-option');
        creditOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const creditAmount = parseInt(e.currentTarget.dataset.credits);
                this.selectCreditOption(creditAmount);
            });
        });

        // Buy credits button
        const buyBtn = document.getElementById('buy-credits-btn');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                if (this.selectedCreditAmount) {
                    this.handleCreditPurchase(this.selectedCreditAmount, buyBtn);
                }
            });
        }

        // Modal backdrop click
        const modal = document.getElementById('credit-purchase-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCreditPurchaseModal();
                }
            });
        }
    }

    /**
     * Bind result modal events
     */
    bindResultModalEvents() {
        // Success modal continue button
        const successContinueBtn = document.getElementById('success-continue-btn');
        if (successContinueBtn) {
            successContinueBtn.addEventListener('click', () => {
                this.hidePaymentSuccessModal();
            });
        }

        // Error modal buttons
        const errorRetryBtn = document.getElementById('error-retry-btn');
        if (errorRetryBtn) {
            errorRetryBtn.addEventListener('click', () => {
                this.hidePaymentErrorModal();
                this.showPlanSelectionModal();
            });
        }

        const errorCancelBtn = document.getElementById('error-cancel-btn');
        if (errorCancelBtn) {
            errorCancelBtn.addEventListener('click', () => {
                this.hidePaymentErrorModal();
            });
        }
    }

    /**
     * Update payment button visibility based on auth state
     */
    updatePaymentButtons() {
        const upgradeButton = document.getElementById('upgrade-button');
        const buyCreditsButton = document.getElementById('buy-credits-button');
        const bmacButton = document.getElementById('bmac-button');
        
        if (this.authManager && this.authManager.isAuthenticated()) {
            // Show upgrade/credit buttons for authenticated users
            if (upgradeButton) upgradeButton.classList.remove('hidden');
            if (buyCreditsButton) buyCreditsButton.classList.remove('hidden');
            if (bmacButton) bmacButton.classList.add('hidden');
        } else {
            // Show Buy Me a Coffee for anonymous users
            if (upgradeButton) upgradeButton.classList.add('hidden');
            if (buyCreditsButton) buyCreditsButton.classList.add('hidden');
            if (bmacButton) bmacButton.classList.remove('hidden');
        }
    }

    /**
     * Show plan selection modal
     */
    showPlanSelectionModal() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.notificationManager.show('Please log in to upgrade your plan', 'warning');
            return;
        }

        const modal = document.getElementById('plan-selection-modal');
        if (modal) {
            this.updatePlanCards();
            modal.classList.remove('modal-hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide plan selection modal
     */
    hidePlanSelectionModal() {
        const modal = document.getElementById('plan-selection-modal');
        if (modal) {
            modal.classList.add('modal-hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * Show credit purchase modal
     */
    showCreditPurchaseModal() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.notificationManager.show('Please log in to buy credits', 'warning');
            return;
        }

        const modal = document.getElementById('credit-purchase-modal');
        if (modal) {
            this.resetCreditSelection();
            modal.classList.remove('modal-hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide credit purchase modal
     */
    hideCreditPurchaseModal() {
        const modal = document.getElementById('credit-purchase-modal');
        if (modal) {
            modal.classList.add('modal-hidden');
            document.body.style.overflow = '';
            this.resetCreditSelection();
        }
    }

    /**
     * Update plan cards based on current user plan
     */
    updatePlanCards() {
        const userPlan = this.authManager.getCurrentUser()?.plan || 'free';
        const planCards = document.querySelectorAll('.plan-card');
        
        planCards.forEach(card => {
            const planType = card.dataset.plan;
            const button = card.querySelector('.plan-button');
            
            if (planType === userPlan) {
                card.classList.add('current-plan');
                button.textContent = 'Current Plan';
                button.disabled = true;
                button.classList.add('current');
                button.classList.remove('upgrade-btn');
            } else {
                card.classList.remove('current-plan');
                button.disabled = false;
                button.classList.remove('current');
                button.classList.add('upgrade-btn');
                
                const btnText = button.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = `Choose ${planType.charAt(0).toUpperCase() + planType.slice(1)}`;
                }
            }
        });
    }

    /**
     * Handle plan upgrade
     */
    async handlePlanUpgrade(planType, button) {
        if (!this.paymentManager.canMakePayments()) {
            this.notificationManager.show('Payment system is not available', 'error');
            return;
        }

        try {
            // Show loading state
            this.setButtonLoading(button, true);
            
            // Create checkout session
            const session = await this.paymentManager.createCheckoutSession(planType);
            
            if (!session) {
                throw new Error('Failed to create payment session');
            }

            // Hide modal as user will be redirected to Stripe
            this.hidePlanSelectionModal();

        } catch (error) {
            console.error('Plan upgrade failed:', error);
            this.setButtonLoading(button, false);
            this.showPaymentErrorModal('Failed to start payment process. Please try again.');
        }
    }

    /**
     * Select credit option
     */
    selectCreditOption(creditAmount) {
        // Remove previous selection
        document.querySelectorAll('.credit-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Select new option
        const selectedOption = document.querySelector(`[data-credits="${creditAmount}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            this.selectedCreditAmount = creditAmount;
            
            // Enable buy button
            const buyBtn = document.getElementById('buy-credits-btn');
            if (buyBtn) {
                buyBtn.disabled = false;
                const btnText = buyBtn.querySelector('.btn-text');
                if (btnText) {
                    const price = this.calculateCreditPrice(creditAmount);
                    btnText.textContent = `Buy ${creditAmount} Credits - $${price.toFixed(2)}`;
                }
            }
        }
    }

    /**
     * Reset credit selection
     */
    resetCreditSelection() {
        document.querySelectorAll('.credit-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        this.selectedCreditAmount = null;
        
        const buyBtn = document.getElementById('buy-credits-btn');
        if (buyBtn) {
            buyBtn.disabled = true;
            const btnText = buyBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = 'Buy Credits';
            }
        }
    }

    /**
     * Handle credit purchase
     */
    async handleCreditPurchase(creditAmount, button) {
        if (!this.paymentManager.canMakePayments()) {
            this.notificationManager.show('Payment system is not available', 'error');
            return;
        }

        try {
            // Show loading state
            this.setButtonLoading(button, true);
            
            // Create credit purchase session
            const session = await this.paymentManager.createCreditPurchaseSession(creditAmount);
            
            if (!session) {
                throw new Error('Failed to create credit purchase session');
            }

            // Hide modal as user will be redirected to Stripe
            this.hideCreditPurchaseModal();

        } catch (error) {
            console.error('Credit purchase failed:', error);
            this.setButtonLoading(button, false);
            this.showPaymentErrorModal('Failed to start credit purchase. Please try again.');
        }
    }

    /**
     * Calculate credit price based on amount
     */
    calculateCreditPrice(creditAmount) {
        // Pricing tiers with discounts
        if (creditAmount >= 100) {
            return creditAmount * 0.07; // $0.07 per credit
        } else if (creditAmount >= 50) {
            return creditAmount * 0.08; // $0.08 per credit
        } else {
            return creditAmount * 0.10; // $0.10 per credit
        }
    }

    /**
     * Show payment success modal
     */
    showPaymentSuccessModal(details = {}) {
        const modal = document.getElementById('payment-success-modal');
        if (!modal) return;

        // Update success details
        const planElement = document.getElementById('success-plan');
        const downloadsElement = document.getElementById('success-downloads');
        const recordingTimeElement = document.getElementById('success-recording-time');

        if (details.planType) {
            const plan = window.appConfig.getPlan(details.planType);
            if (plan && planElement) {
                planElement.textContent = plan.name;
            }
            if (plan && downloadsElement) {
                downloadsElement.textContent = `${plan.features.downloads} per month`;
            }
            if (plan && recordingTimeElement) {
                recordingTimeElement.textContent = `${plan.features.maxRecordingTime} seconds`;
            }
        } else if (details.creditAmount) {
            const messageElement = document.getElementById('success-message');
            if (messageElement) {
                messageElement.textContent = `You've successfully purchased ${details.creditAmount} credits!`;
            }
        }

        modal.classList.remove('modal-hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide payment success modal
     */
    hidePaymentSuccessModal() {
        const modal = document.getElementById('payment-success-modal');
        if (modal) {
            modal.classList.add('modal-hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * Show payment error modal
     */
    showPaymentErrorModal(message = 'Payment failed. Please try again.') {
        const modal = document.getElementById('payment-error-modal');
        if (!modal) return;

        const messageElement = document.getElementById('error-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        modal.classList.remove('modal-hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide payment error modal
     */
    hidePaymentErrorModal() {
        const modal = document.getElementById('payment-error-modal');
        if (modal) {
            modal.classList.add('modal-hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');

        if (loading) {
            button.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (btnSpinner) btnSpinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (btnSpinner) btnSpinner.classList.add('hidden');
        }
    }

    /**
     * Handle payment success event
     */
    handlePaymentSuccess(details) {
        this.showPaymentSuccessModal(details);
        this.updatePaymentButtons();
    }

    /**
     * Handle payment cancel event
     */
    handlePaymentCancel(details) {
        // Payment was cancelled, no special UI needed
        // The PaymentManager already shows a notification
    }

    /**
     * Show upgrade prompt when user hits limits
     */
    showUpgradePrompt(message = 'You\'ve reached your download limit. Upgrade to continue!') {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            // For anonymous users, show login prompt
            this.notificationManager.show('Please log in to get more downloads', 'warning');
            return;
        }

        // Show upgrade options
        this.notificationManager.show(message, 'warning', {
            action: {
                text: 'Upgrade Now',
                callback: () => this.showPlanSelectionModal()
            }
        });
    }

    /**
     * Get current payment UI state
     */
    getState() {
        return {
            selectedCreditAmount: this.selectedCreditAmount,
            isInitialized: this.isInitialized
        };
    }
}

// Export for use in other modules
window.PaymentUI = PaymentUI;