/**
 * Purchase Modal for One-Time Download Licensing
 * Handles tier selection, pricing display, and Stripe checkout integration
 */

class PurchaseModal {
    constructor() {
        this.modal = null;
        this.tiers = {};
        this.selectedTier = null;
        this.fileId = null;
        this.onPurchaseComplete = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.isLoading = false;
        this.supportEmail = 'support@orielfx.com';
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.loadPricingTiers();
    }
    
    createModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div id="purchase-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content purchase-modal">
                    <div class="modal-header">
                        <h2>Choose Your License</h2>
                        <button class="modal-close" onclick="purchaseModal.close()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="purchase-intro">
                            <p>Select the license that best fits your needs. All purchases include instant download and licensing documentation via email.</p>
                        </div>
                        
                        <div id="pricing-tiers" class="pricing-tiers">
                            <div class="loading-spinner">
                                <div class="spinner-icon"></div>
                                <p>Loading pricing options...</p>
                            </div>
                        </div>
                        
                        <div class="purchase-form" id="purchase-form" style="display: none;">
                            <div class="form-group">
                                <label for="user-email">Email Address</label>
                                <input type="email" id="user-email" placeholder="Enter your email for receipt and licensing">
                                <small>Required for licensing documentation and download link</small>
                            </div>
                            
                            <div class="purchase-summary">
                                <div class="selected-tier-info">
                                    <h4 id="selected-tier-name"></h4>
                                    <p id="selected-tier-description"></p>
                                    <ul id="selected-tier-features"></ul>
                                </div>
                                <div class="price-display">
                                    <span class="price" id="selected-tier-price"></span>
                                </div>
                            </div>
                            
                            <div class="purchase-actions">
                                <button id="proceed-to-checkout" class="btn btn-primary" onclick="purchaseModal.proceedToCheckout()">
                                    Proceed to Secure Checkout
                                </button>
                                <button class="btn btn-secondary" onclick="purchaseModal.close()">Cancel</button>
                            </div>
                        </div>
                        
                        <div class="purchase-security">
                            <p><i class="icon-lock"></i> Secure payment powered by Stripe</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('purchase-modal');
        
        // Add event listeners
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }
    
    async loadPricingTiers() {
        try {
            this.showLoadingState('pricing-tiers', 'Loading pricing options...');
            
            const response = await fetch('/api/purchases/tiers', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.tiers = data.tiers;
                this.renderPricingTiers();
            } else {
                throw new Error(data.error || 'Failed to load pricing tiers');
            }
        } catch (error) {
            console.error('Error loading pricing tiers:', error);
            this.handleLoadingError('pricing-tiers', error, () => this.loadPricingTiers());
        }
    }
    
    renderPricingTiers() {
        const container = document.getElementById('pricing-tiers');
        
        const tiersHTML = Object.entries(this.tiers).map(([tierKey, tier]) => `
            <div class="pricing-tier ${tierKey === 'commercial' ? 'recommended' : ''}" 
                 data-tier="${tierKey}" 
                 onclick="purchaseModal.selectTier('${tierKey}')">
                ${tierKey === 'commercial' ? '<div class="recommended-badge">Most Popular</div>' : ''}
                
                <div class="tier-header">
                    <h3>${tier.name}</h3>
                    <div class="tier-price">${tier.formatted_price}</div>
                </div>
                
                <div class="tier-description">
                    <p>${tier.description}</p>
                </div>
                
                <div class="tier-features">
                    <ul>
                        ${tier.features.map(feature => `<li><i class="icon-check"></i> ${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="tier-specs">
                    <span class="spec">Resolution: ${tier.resolution}</span>
                    <span class="spec">Format: ${tier.format}</span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = tiersHTML;
    }
    
    selectTier(tierKey) {
        // Remove previous selection
        document.querySelectorAll('.pricing-tier').forEach(tier => {
            tier.classList.remove('selected');
        });
        
        // Add selection to clicked tier
        document.querySelector(`[data-tier="${tierKey}"]`).classList.add('selected');
        
        this.selectedTier = tierKey;
        this.updatePurchaseForm();
    }
    
    updatePurchaseForm() {
        if (!this.selectedTier) return;
        
        const tier = this.tiers[this.selectedTier];
        const form = document.getElementById('purchase-form');
        
        // Update form display
        document.getElementById('selected-tier-name').textContent = tier.name;
        document.getElementById('selected-tier-description').textContent = tier.description;
        document.getElementById('selected-tier-price').textContent = tier.formatted_price;
        
        // Update features list
        const featuresList = document.getElementById('selected-tier-features');
        featuresList.innerHTML = tier.features.map(feature => `<li>${feature}</li>`).join('');
        
        // Show form
        form.style.display = 'block';
        
        // Pre-fill email if user is logged in
        this.prefillUserEmail();
    }
    
    async prefillUserEmail() {
        try {
            // Check if user is authenticated and get their email
            const response = await fetch('/api/user/profile');
            if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.user.email) {
                    document.getElementById('user-email').value = userData.user.email;
                }
            }
        } catch (error) {
            // User not authenticated, email field remains empty
            console.log('User not authenticated, email field will be required');
        }
    }
    
    async proceedToCheckout() {
        if (this.isLoading) return;
        
        // Validate form
        const validation = this.validateCheckoutForm();
        if (!validation.valid) {
            this.showError(validation.message, validation.field);
            return;
        }
        
        const email = document.getElementById('user-email').value.trim();
        
        try {
            this.setCheckoutLoading(true);
            
            // Create purchase session with retry logic
            const result = await this.createPurchaseSessionWithRetry({
                tier: this.selectedTier,
                file_id: this.fileId,
                email: email
            });
            
            if (result.success) {
                // Show success state before redirect
                this.showCheckoutSuccess();
                
                // Small delay to show success state
                setTimeout(() => {
                    window.location.href = result.checkout_url;
                }, 1000);
            } else {
                throw new Error(result.error || 'Failed to create checkout session');
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            this.handleCheckoutError(error);
        }
    }
    
    validateCheckoutForm() {
        if (!this.selectedTier || !this.fileId) {
            return { valid: false, message: 'Please select a license tier', field: 'tier' };
        }
        
        const email = document.getElementById('user-email').value.trim();
        if (!email) {
            return { valid: false, message: 'Email address is required', field: 'email' };
        }
        
        if (!this.isValidEmail(email)) {
            return { valid: false, message: 'Please enter a valid email address', field: 'email' };
        }
        
        return { valid: true };
    }
    
    async createPurchaseSessionWithRetry(data, attempt = 1) {
        try {
            const response = await fetch('/api/purchases/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            if (attempt < this.maxRetries && this.isRetryableError(error)) {
                console.warn(`Checkout attempt ${attempt} failed, retrying...`, error);
                await this.delay(1000 * attempt); // Exponential backoff
                return this.createPurchaseSessionWithRetry(data, attempt + 1);
            }
            throw error;
        }
    }
    
    isRetryableError(error) {
        const retryableMessages = [
            'network error',
            'timeout',
            'connection',
            'temporarily unavailable',
            'service unavailable'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }
    
    setCheckoutLoading(loading) {
        this.isLoading = loading;
        const checkoutBtn = document.getElementById('proceed-to-checkout');
        
        if (loading) {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = `
                <span class="btn-spinner"></span>
                Creating secure checkout...
            `;
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = 'Proceed to Secure Checkout';
        }
    }
    
    showCheckoutSuccess() {
        const checkoutBtn = document.getElementById('proceed-to-checkout');
        checkoutBtn.innerHTML = `
            <span class="btn-success-icon">✓</span>
            Redirecting to checkout...
        `;
        checkoutBtn.style.background = '#28a745';
    }
    
    handleCheckoutError(error) {
        this.setCheckoutLoading(false);
        
        let errorMessage = 'Failed to start checkout process.';
        let showRetry = false;
        let showSupport = false;
        
        if (error.message.includes('network') || error.message.includes('timeout')) {
            errorMessage = 'Network connection issue. Please check your internet connection and try again.';
            showRetry = true;
        } else if (error.message.includes('validation')) {
            errorMessage = 'Please check your information and try again.';
        } else if (error.message.includes('temporarily unavailable')) {
            errorMessage = 'Payment system is temporarily unavailable. Please try again in a few minutes.';
            showRetry = true;
        } else {
            errorMessage = 'An unexpected error occurred during checkout.';
            showSupport = true;
        }
        
        this.showError(errorMessage, null, { showRetry, showSupport });
    }
    
    show(fileId, onComplete = null) {
        this.fileId = fileId;
        this.onPurchaseComplete = onComplete;
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset form
        this.selectedTier = null;
        document.getElementById('purchase-form').style.display = 'none';
        document.querySelectorAll('.pricing-tier').forEach(tier => {
            tier.classList.remove('selected');
        });
    }
    
    close() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    showError(message, field = null, options = {}) {
        // Clear any existing errors
        this.clearErrors();
        
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'purchase-error alert alert-error';
        
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        const errorIcon = document.createElement('span');
        errorIcon.className = 'error-icon';
        errorIcon.innerHTML = '⚠️';
        
        const errorText = document.createElement('span');
        errorText.className = 'error-text';
        errorText.textContent = message;
        
        errorContent.appendChild(errorIcon);
        errorContent.appendChild(errorText);
        errorDiv.appendChild(errorContent);
        
        // Add action buttons if specified
        if (options.showRetry || options.showSupport) {
            const errorActions = document.createElement('div');
            errorActions.className = 'error-actions';
            
            if (options.showRetry) {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'btn btn-sm btn-outline-primary';
                retryBtn.textContent = 'Try Again';
                retryBtn.onclick = () => {
                    this.clearErrors();
                    this.proceedToCheckout();
                };
                errorActions.appendChild(retryBtn);
            }
            
            if (options.showSupport) {
                const supportBtn = document.createElement('button');
                supportBtn.className = 'btn btn-sm btn-outline-secondary';
                supportBtn.textContent = 'Contact Support';
                supportBtn.onclick = () => this.showSupportModal();
                errorActions.appendChild(supportBtn);
            }
            
            errorDiv.appendChild(errorActions);
        }
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'error-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.clearErrors();
        errorDiv.appendChild(closeBtn);
        
        // Insert error before form or at top of modal body
        const insertBefore = document.querySelector('.purchase-form') || document.querySelector('.pricing-tiers');
        document.querySelector('.modal-body').insertBefore(errorDiv, insertBefore);
        
        // Highlight field if specified
        if (field) {
            this.highlightField(field);
        }
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide after 10 seconds (longer for errors with actions)
        const autoHideDelay = (options.showRetry || options.showSupport) ? 15000 : 8000;
        setTimeout(() => {
            if (errorDiv.parentElement) {
                this.clearErrors();
            }
        }, autoHideDelay);
    }
    
    clearErrors() {
        const errors = document.querySelectorAll('.purchase-error');
        errors.forEach(error => error.remove());
        
        // Clear field highlights
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
        });
    }
    
    highlightField(fieldName) {
        let fieldElement;
        
        if (fieldName === 'email') {
            fieldElement = document.getElementById('user-email');
        } else if (fieldName === 'tier') {
            // Highlight tier selection area
            const tiersContainer = document.getElementById('pricing-tiers');
            if (tiersContainer) {
                tiersContainer.classList.add('error-highlight');
                setTimeout(() => {
                    tiersContainer.classList.remove('error-highlight');
                }, 3000);
            }
            return;
        }
        
        if (fieldElement) {
            const formGroup = fieldElement.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('error');
                fieldElement.focus();
                
                // Remove highlight when user starts typing
                const removeHighlight = () => {
                    formGroup.classList.remove('error');
                    fieldElement.removeEventListener('input', removeHighlight);
                };
                fieldElement.addEventListener('input', removeHighlight);
            }
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Handle successful purchase completion
    handlePurchaseSuccess(downloadToken) {
        this.close();
        
        if (this.onPurchaseComplete) {
            this.onPurchaseComplete(downloadToken);
        }
        
        // Show success message
        this.showSuccessMessage('Purchase completed! Check your email for licensing information and download link.');
    }
    
    showSuccessMessage(message) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'purchase-success alert alert-success';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <div class="success-text">
                    <strong>Success!</strong>
                    <p>${message}</p>
                </div>
            </div>
            <button class="success-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(successDiv);
        
        // Animate in
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.classList.add('fade-out');
                setTimeout(() => successDiv.remove(), 300);
            }
        }, 10000);
    }
    
    showLoadingState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-icon"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    handleLoadingError(containerId, error, retryCallback) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-error">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to load content</p>
                    <p class="error-details">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="(${retryCallback.toString()})()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
    
    showSupportModal() {
        const supportModal = document.createElement('div');
        supportModal.className = 'modal-overlay support-modal-overlay';
        supportModal.innerHTML = `
            <div class="modal-content support-modal">
                <div class="modal-header">
                    <h3>Contact Support</h3>
                    <button class="modal-close" onclick="this.closest('.support-modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="support-info">
                        <p>We're here to help! If you're experiencing issues with your purchase, please contact our support team.</p>
                        
                        <div class="support-options">
                            <div class="support-option">
                                <h4>📧 Email Support</h4>
                                <p>Send us an email and we'll respond within 24 hours</p>
                                <a href="mailto:${this.supportEmail}?subject=Purchase Issue - File ID: ${this.fileId}" 
                                   class="btn btn-primary">
                                    Email ${this.supportEmail}
                                </a>
                            </div>
                            
                            <div class="support-option">
                                <h4>🔄 Common Solutions</h4>
                                <ul class="support-tips">
                                    <li>Try refreshing the page and attempting the purchase again</li>
                                    <li>Check that your internet connection is stable</li>
                                    <li>Ensure your browser allows pop-ups for payment processing</li>
                                    <li>Try using a different browser or device</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="support-details">
                            <h4>Include this information in your support request:</h4>
                            <div class="support-debug-info">
                                <p><strong>File ID:</strong> ${this.fileId || 'Not available'}</p>
                                <p><strong>Selected Tier:</strong> ${this.selectedTier || 'Not selected'}</p>
                                <p><strong>Browser:</strong> ${navigator.userAgent}</p>
                                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(supportModal);
        
        // Close on overlay click
        supportModal.addEventListener('click', (e) => {
            if (e.target === supportModal) {
                supportModal.remove();
            }
        });
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize purchase modal
const purchaseModal = new PurchaseModal();

// Handle URL parameters for purchase completion
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success') === 'payment_complete') {
        const downloadToken = urlParams.get('download_token');
        if (downloadToken) {
            purchaseModal.handlePurchaseSuccess(downloadToken);
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('error')) {
        const error = urlParams.get('error');
        const errorCode = urlParams.get('error_code');
        let message = 'An error occurred during purchase.';
        let showRetry = false;
        let showSupport = false;
        
        switch (error) {
            case 'payment_failed':
                message = 'Payment was declined. Please check your payment method and try again.';
                showRetry = true;
                break;
            case 'payment_error':
                message = 'An error occurred during payment processing. Please try again.';
                showRetry = true;
                showSupport = true;
                break;
            case 'missing_session':
                message = 'Invalid payment session. Please start a new purchase.';
                break;
            case 'network_error':
                message = 'Network connection issue. Please check your internet connection and try again.';
                showRetry = true;
                break;
            case 'service_unavailable':
                message = 'Payment service is temporarily unavailable. Please try again in a few minutes.';
                showRetry = true;
                break;
            default:
                message = 'An unexpected error occurred during purchase.';
                showSupport = true;
        }
        
        purchaseModal.showError(message, null, { showRetry, showSupport });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('info') === 'payment_cancelled') {
        const message = 'Payment was cancelled. You can try again when ready.';
        purchaseModal.showError(message, null, { showRetry: true });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle session timeout
    if (urlParams.get('info') === 'session_expired') {
        const message = 'Your session has expired. Please start a new purchase.';
        purchaseModal.showError(message);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});