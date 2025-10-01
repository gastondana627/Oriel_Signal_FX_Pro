/**
 * Payment Manager for Stripe Integration
 * Handles payment processing, subscription management, and credit updates
 */
class PaymentManager {
    constructor(apiClient, appConfig, notificationManager) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.notificationManager = notificationManager;
        this.stripe = null;
        this.currentSession = null;
        this.paymentInProgress = false;
        
        // Initialize Stripe
        this.initializeStripe();
        
        // Bind methods
        this.createCheckoutSession = this.createCheckoutSession.bind(this);
        this.checkPaymentStatus = this.checkPaymentStatus.bind(this);
        this.handlePaymentSuccess = this.handlePaymentSuccess.bind(this);
        this.handlePaymentCancel = this.handlePaymentCancel.bind(this);
    }

    /**
     * Initialize Stripe with publishable key
     */
    async initializeStripe() {
        try {
            const stripeConfig = this.appConfig.getStripeConfig();
            if (!stripeConfig || !stripeConfig.publishableKey) {
                console.error('Stripe configuration not found');
                return;
            }

            // Load Stripe.js if not already loaded
            if (!window.Stripe) {
                await this.loadStripeScript();
            }

            this.stripe = window.Stripe(stripeConfig.publishableKey);
            console.log('Stripe initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Stripe:', error);
            this.notificationManager.show('Payment system unavailable', 'error');
        }
    }

    /**
     * Load Stripe.js script dynamically
     */
    loadStripeScript() {
        return new Promise((resolve, reject) => {
            if (window.Stripe) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Create Stripe checkout session for plan upgrade
     */
    async createCheckoutSession(planType, options = {}) {
        if (this.paymentInProgress) {
            this.notificationManager.show('Payment already in progress', 'warning');
            return null;
        }

        try {
            this.paymentInProgress = true;
            
            // Get plan configuration
            const plan = this.appConfig.getPlan(planType);
            if (!plan) {
                throw new Error(`Invalid plan type: ${planType}`);
            }

            // Prepare payment data
            const paymentData = {
                plan_type: planType,
                amount: Math.round(plan.price * 100), // Convert to cents
                currency: plan.currency.toLowerCase(),
                success_url: options.successUrl || `${window.location.origin}/payment-success`,
                cancel_url: options.cancelUrl || `${window.location.origin}/payment-cancel`,
                metadata: {
                    plan_id: plan.id,
                    plan_name: plan.name,
                    user_action: 'upgrade'
                }
            };

            // Create checkout session via backend
            const response = await this.apiClient.post(
                this.appConfig.getApiUrl('payments', 'createSession'),
                paymentData
            );

            if (!response.ok || !response.data.session_url) {
                throw new Error('Failed to create payment session');
            }

            this.currentSession = {
                sessionId: response.data.session_id,
                paymentId: response.data.payment_id,
                planType: planType,
                amount: paymentData.amount,
                createdAt: new Date()
            };

            // Store session info for recovery
            this.saveSessionToStorage(this.currentSession);

            // Redirect to Stripe Checkout
            if (this.stripe) {
                const { error } = await this.stripe.redirectToCheckout({
                    sessionId: response.data.session_id
                });

                if (error) {
                    throw new Error(error.message);
                }
            } else {
                // Fallback: direct redirect
                window.location.href = response.data.session_url;
            }

            return this.currentSession;

        } catch (error) {
            console.error('Payment session creation failed:', error);
            this.paymentInProgress = false;
            
            // Show user-friendly error message
            const errorMessage = this.getPaymentErrorMessage(error);
            this.notificationManager.show(errorMessage, 'error');
            
            return null;
        }
    }

    /**
     * Create one-time credit purchase session
     */
    async createCreditPurchaseSession(creditAmount, options = {}) {
        if (this.paymentInProgress) {
            this.notificationManager.show('Payment already in progress', 'warning');
            return null;
        }

        try {
            this.paymentInProgress = true;

            // Calculate price based on credit amount (e.g., $0.10 per credit)
            const pricePerCredit = 0.10;
            const totalPrice = creditAmount * pricePerCredit;

            const paymentData = {
                type: 'credits',
                credit_amount: creditAmount,
                amount: Math.round(totalPrice * 100), // Convert to cents
                currency: 'usd',
                success_url: options.successUrl || `${window.location.origin}/payment-success`,
                cancel_url: options.cancelUrl || `${window.location.origin}/payment-cancel`,
                metadata: {
                    purchase_type: 'credits',
                    credit_amount: creditAmount,
                    user_action: 'buy_credits'
                }
            };

            const response = await this.apiClient.post(
                this.appConfig.getApiUrl('payments', 'createSession'),
                paymentData
            );

            if (!response.ok || !response.data.session_url) {
                throw new Error('Failed to create credit purchase session');
            }

            this.currentSession = {
                sessionId: response.data.session_id,
                paymentId: response.data.payment_id,
                type: 'credits',
                creditAmount: creditAmount,
                amount: paymentData.amount,
                createdAt: new Date()
            };

            this.saveSessionToStorage(this.currentSession);

            // Redirect to Stripe Checkout
            if (this.stripe) {
                const { error } = await this.stripe.redirectToCheckout({
                    sessionId: response.data.session_id
                });

                if (error) {
                    throw new Error(error.message);
                }
            } else {
                window.location.href = response.data.session_url;
            }

            return this.currentSession;

        } catch (error) {
            console.error('Credit purchase session creation failed:', error);
            this.paymentInProgress = false;
            
            const errorMessage = this.getPaymentErrorMessage(error);
            this.notificationManager.show(errorMessage, 'error');
            
            return null;
        }
    }

    /**
     * Check payment status for a session
     */
    async checkPaymentStatus(sessionId) {
        try {
            const response = await this.apiClient.get(
                `${this.appConfig.getApiUrl('payments', 'status')}/${sessionId}`
            );

            if (!response.ok) {
                throw new Error('Failed to check payment status');
            }

            const paymentData = response.data;
            
            // Update current session if it matches
            if (this.currentSession && this.currentSession.sessionId === sessionId) {
                this.currentSession.status = paymentData.status;
                this.currentSession.stripeStatus = paymentData.stripe_status;
                this.saveSessionToStorage(this.currentSession);
            }

            return {
                sessionId: paymentData.session_id,
                paymentId: paymentData.payment_id,
                status: paymentData.status,
                stripeStatus: paymentData.stripe_status,
                amount: paymentData.amount,
                createdAt: new Date(paymentData.created_at)
            };

        } catch (error) {
            console.error('Payment status check failed:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(sessionId) {
        try {
            // Check payment status to confirm success
            const paymentStatus = await this.checkPaymentStatus(sessionId);
            
            if (paymentStatus.stripeStatus === 'paid' && paymentStatus.status === 'completed') {
                // Clear payment in progress flag
                this.paymentInProgress = false;
                
                // Clear stored session
                this.clearSessionFromStorage();
                
                // Show success notification
                this.notificationManager.show('Payment successful! Your account has been upgraded.', 'success');
                
                // Trigger credit/subscription update
                await this.updateUserCreditsAndPlan();
                
                // Emit payment success event
                this.emitPaymentEvent('payment_success', {
                    sessionId: sessionId,
                    paymentId: paymentStatus.paymentId,
                    amount: paymentStatus.amount
                });
                
                return true;
            } else {
                throw new Error('Payment not confirmed as successful');
            }

        } catch (error) {
            console.error('Payment success handling failed:', error);
            this.notificationManager.show('Payment verification failed. Please contact support.', 'error');
            return false;
        }
    }

    /**
     * Handle cancelled payment
     */
    handlePaymentCancel(sessionId) {
        try {
            // Clear payment in progress flag
            this.paymentInProgress = false;
            
            // Clear stored session
            this.clearSessionFromStorage();
            
            // Show cancellation message
            this.notificationManager.show('Payment cancelled. You can try again anytime.', 'info');
            
            // Emit payment cancel event
            this.emitPaymentEvent('payment_cancel', {
                sessionId: sessionId
            });
            
            return true;

        } catch (error) {
            console.error('Payment cancel handling failed:', error);
            return false;
        }
    }

    /**
     * Get user's payment history
     */
    async getPaymentHistory() {
        try {
            const response = await this.apiClient.get(
                this.appConfig.getApiUrl('payments', 'history')
            );

            if (!response.ok) {
                throw new Error('Failed to fetch payment history');
            }

            return response.data.payments || [];

        } catch (error) {
            console.error('Failed to fetch payment history:', error);
            return [];
        }
    }

    /**
     * Update user credits and plan after successful payment
     */
    async updateUserCreditsAndPlan() {
        try {
            // This will be handled by the backend webhook
            // But we can also trigger a user profile refresh here
            if (window.authManager) {
                await window.authManager.refreshUserProfile();
            }
            
            // Update usage tracker
            if (window.usageTracker) {
                await window.usageTracker.refreshUsage();
            }

        } catch (error) {
            console.error('Failed to update user credits and plan:', error);
        }
    }

    /**
     * Check if user can make payments
     */
    canMakePayments() {
        return this.stripe !== null && !this.paymentInProgress;
    }

    /**
     * Get available upgrade options for current user
     */
    getUpgradeOptions(currentPlan = 'free') {
        const allPlans = this.appConfig.getAllPlans();
        const currentPlanConfig = this.appConfig.getPlan(currentPlan);
        
        if (!currentPlanConfig) {
            return allPlans.filter(plan => plan.id !== 'free');
        }

        // Return plans that are upgrades from current plan
        const currentPrice = currentPlanConfig.price;
        return allPlans.filter(plan => 
            plan.price > currentPrice && plan.id !== currentPlan
        );
    }

    /**
     * Save session to localStorage for recovery
     */
    saveSessionToStorage(session) {
        try {
            localStorage.setItem('oriel_payment_session', JSON.stringify(session));
        } catch (error) {
            console.error('Failed to save payment session:', error);
        }
    }

    /**
     * Load session from localStorage
     */
    loadSessionFromStorage() {
        try {
            const sessionData = localStorage.getItem('oriel_payment_session');
            if (sessionData) {
                return JSON.parse(sessionData);
            }
        } catch (error) {
            console.error('Failed to load payment session:', error);
        }
        return null;
    }

    /**
     * Clear session from localStorage
     */
    clearSessionFromStorage() {
        try {
            localStorage.removeItem('oriel_payment_session');
        } catch (error) {
            console.error('Failed to clear payment session:', error);
        }
    }

    /**
     * Get user-friendly error message
     */
    getPaymentErrorMessage(error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('card')) {
            return 'Card error. Please check your payment details.';
        } else if (error.message.includes('insufficient')) {
            return 'Insufficient funds. Please try a different payment method.';
        } else if (error.message.includes('expired')) {
            return 'Payment session expired. Please try again.';
        } else {
            return 'Payment failed. Please try again or contact support.';
        }
    }

    /**
     * Emit payment events for other components to listen to
     */
    emitPaymentEvent(eventType, data) {
        const event = new CustomEvent(`oriel_${eventType}`, {
            detail: data
        });
        window.dispatchEvent(event);
    }

    /**
     * Initialize payment recovery on page load
     */
    initializePaymentRecovery() {
        // Check URL parameters for payment result
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const success = urlParams.get('success');
        const cancelled = urlParams.get('cancelled');

        if (sessionId) {
            if (success === 'true') {
                this.handlePaymentSuccess(sessionId);
            } else if (cancelled === 'true') {
                this.handlePaymentCancel(sessionId);
            }
            
            // Clean up URL parameters
            this.cleanUpUrlParameters();
        }

        // Check for stored session that might need recovery
        const storedSession = this.loadSessionFromStorage();
        if (storedSession) {
            // Check if session is recent (within 1 hour)
            const sessionAge = Date.now() - new Date(storedSession.createdAt).getTime();
            if (sessionAge < 3600000) { // 1 hour
                this.currentSession = storedSession;
                this.paymentInProgress = true;
            } else {
                // Clear old session
                this.clearSessionFromStorage();
            }
        }
    }

    /**
     * Clean up URL parameters after payment processing
     */
    cleanUpUrlParameters() {
        const url = new URL(window.location);
        url.searchParams.delete('session_id');
        url.searchParams.delete('success');
        url.searchParams.delete('cancelled');
        window.history.replaceState({}, document.title, url.toString());
    }

    /**
     * Get current payment session
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Check if payment is in progress
     */
    isPaymentInProgress() {
        return this.paymentInProgress;
    }

    /**
     * Cancel current payment session (if possible)
     */
    cancelCurrentPayment() {
        if (this.currentSession) {
            this.handlePaymentCancel(this.currentSession.sessionId);
        }
    }
}

// Export for use in other modules
window.PaymentManager = PaymentManager;