/**
 * Authentication UI Controller
 * Handles authentication modal interactions and form validation
 */
class AuthUI {
    constructor(authManager, notificationManager) {
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        // Modal elements
        this.loginModal = document.getElementById('login-modal');
        this.registerModal = document.getElementById('register-modal');
        
        // Form elements
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        
        // Button elements
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.dashboardBtn = document.getElementById('dashboard-btn');
        
        // Status elements
        this.anonymousStatus = document.getElementById('anonymous-status');
        this.authenticatedStatus = document.getElementById('authenticated-status');
        this.userEmail = document.getElementById('user-email');
        this.userCredits = document.getElementById('user-credits');
        this.downloadsRemaining = document.getElementById('downloads-remaining');
        
        // Modal close buttons
        this.loginCloseBtn = document.getElementById('login-close-btn');
        this.registerCloseBtn = document.getElementById('register-close-btn');
        
        // Modal navigation links
        this.showRegisterLink = document.getElementById('show-register-link');
        this.showLoginLink = document.getElementById('show-login-link');
        this.forgotPasswordLink = document.getElementById('forgot-password-link');
        
        // Form validation state
        this.validationRules = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            password: /^.{6,}$/ // At least 6 characters
        };
        
        this.initialize();
    }

    /**
     * Initialize the authentication UI
     */
    initialize() {
        this.setupEventListeners();
        this.setupAuthStateListener();
        this.updateUI();
    }

    /**
     * Set up event listeners for authentication UI
     */
    setupEventListeners() {
        // Button click handlers
        this.loginBtn?.addEventListener('click', () => this.showLoginModal());
        this.registerBtn?.addEventListener('click', () => this.showRegisterModal());
        this.logoutBtn?.addEventListener('click', () => this.handleLogout());
        this.dashboardBtn?.addEventListener('click', () => this.showDashboard());
        
        // Modal close handlers
        this.loginCloseBtn?.addEventListener('click', () => this.hideLoginModal());
        this.registerCloseBtn?.addEventListener('click', () => this.hideRegisterModal());
        
        // Modal navigation handlers
        this.showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideLoginModal();
            this.showRegisterModal();
        });
        
        this.showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideRegisterModal();
            this.showLoginModal();
        });
        
        this.forgotPasswordLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
        
        // Form submission handlers
        this.loginForm?.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        this.registerForm?.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
        
        // Modal backdrop click handlers
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.hideLoginModal();
            }
        });
        
        this.registerModal?.addEventListener('click', (e) => {
            if (e.target === this.registerModal) {
                this.hideRegisterModal();
            }
        });
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        // Real-time form validation
        this.setupFormValidation();
    }

    /**
     * Set up real-time form validation
     */
    setupFormValidation() {
        // Login form validation
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        
        loginEmail?.addEventListener('blur', () => this.validateField('login', 'email'));
        loginPassword?.addEventListener('blur', () => this.validateField('login', 'password'));
        
        // Register form validation
        const registerEmail = document.getElementById('register-email');
        const registerPassword = document.getElementById('register-password');
        const registerConfirmPassword = document.getElementById('register-confirm-password');
        
        registerEmail?.addEventListener('blur', () => this.validateField('register', 'email'));
        registerPassword?.addEventListener('blur', () => this.validateField('register', 'password'));
        registerConfirmPassword?.addEventListener('blur', () => this.validateField('register', 'confirmPassword'));
    }

    /**
     * Set up authentication state listener
     */
    setupAuthStateListener() {
        this.authManager.onStateChange((authState) => {
            this.updateUI(authState);
        });
    }

    /**
     * Update UI based on authentication state
     */
    updateUI(authState = null) {
        const state = authState || this.authManager.getAuthStatus();
        
        if (state.isAuthenticated && state.user) {
            // Show authenticated UI
            this.anonymousStatus?.classList.add('hidden');
            this.authenticatedStatus?.classList.remove('hidden');
            
            // Update user information
            if (this.userEmail) {
                this.userEmail.textContent = state.user.email;
            }
            
            if (this.userCredits) {
                const plan = this.authManager.getUserPlan();
                const credits = state.user.credits || plan.features.downloads;
                this.userCredits.textContent = `${credits} credits`;
            }
        } else {
            // Show anonymous UI
            this.anonymousStatus?.classList.remove('hidden');
            this.authenticatedStatus?.classList.add('hidden');
            
            // Update downloads remaining for anonymous users
            this.updateAnonymousDownloads();
        }
    }

    /**
     * Update anonymous user downloads counter
     */
    updateAnonymousDownloads() {
        if (this.downloadsRemaining) {
            const count = localStorage.getItem('orielFxDownloads');
            const remaining = count === null ? 3 : parseInt(count);
            this.downloadsRemaining.textContent = `${remaining} free downloads remaining`;
        }
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        this.hideAllModals();
        this.loginModal?.classList.remove('modal-hidden');
        this.clearFormErrors('login');
        this.pauseVisualizerIfNeeded();
        
        // Focus on email field
        const emailField = document.getElementById('login-email');
        setTimeout(() => emailField?.focus(), 100);
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        this.loginModal?.classList.add('modal-hidden');
        this.clearForm('login');
        this.resumeVisualizerIfNeeded();
    }

    /**
     * Show register modal
     */
    showRegisterModal() {
        this.hideAllModals();
        this.registerModal?.classList.remove('modal-hidden');
        this.clearFormErrors('register');
        this.pauseVisualizerIfNeeded();
        
        // Focus on email field
        const emailField = document.getElementById('register-email');
        setTimeout(() => emailField?.focus(), 100);
    }

    /**
     * Hide register modal
     */
    hideRegisterModal() {
        this.registerModal?.classList.add('modal-hidden');
        this.clearForm('register');
        this.resumeVisualizerIfNeeded();
    }

    /**
     * Hide all authentication modals
     */
    hideAllModals() {
        this.hideLoginModal();
        this.hideRegisterModal();
    }

    /**
     * Pause visualizer when modal is shown
     */
    pauseVisualizerIfNeeded() {
        if (window.setAnimationPaused) {
            window.setAnimationPaused(true);
        }
    }

    /**
     * Resume visualizer when modal is hidden
     */
    resumeVisualizerIfNeeded() {
        if (window.setAnimationPaused) {
            window.setAnimationPaused(false);
        }
    }

    /**
     * Handle login form submission
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Validate form
        if (!this.validateForm('login')) {
            return;
        }
        
        // Show loading state
        this.setFormLoading('login', true);
        
        try {
            const result = await this.authManager.login(email, password);
            
            if (result.success) {
                this.hideLoginModal();
                // Success notification is handled by AuthManager
            } else {
                this.showFormError('login', 'general', result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showFormError('login', 'general', 'An unexpected error occurred. Please try again.');
        } finally {
            this.setFormLoading('login', false);
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegisterSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        // Validate form
        if (!this.validateForm('register')) {
            return;
        }
        
        // Check password confirmation
        if (password !== confirmPassword) {
            this.showFormError('register', 'confirmPassword', 'Passwords do not match');
            return;
        }
        
        // Show loading state
        this.setFormLoading('register', true);
        
        try {
            const result = await this.authManager.register(email, password);
            
            if (result.success) {
                this.hideRegisterModal();
                // Success notification is handled by AuthManager
            } else {
                this.showFormError('register', 'general', result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showFormError('register', 'general', 'An unexpected error occurred. Please try again.');
        } finally {
            this.setFormLoading('register', false);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await this.authManager.logout();
            // Success notification is handled by AuthManager
        } catch (error) {
            console.error('Logout error:', error);
            this.notificationManager.show('Logout failed. Please try again.', 'error');
        }
    }

    /**
     * Handle forgot password
     */
    async handleForgotPassword() {
        const email = document.getElementById('login-email')?.value;
        
        if (!email) {
            this.notificationManager.show('Please enter your email address first', 'warning');
            return;
        }
        
        if (!this.validationRules.email.test(email)) {
            this.notificationManager.show('Please enter a valid email address', 'error');
            return;
        }
        
        try {
            const result = await this.authManager.requestPasswordReset(email);
            if (result.success) {
                this.hideLoginModal();
            }
        } catch (error) {
            console.error('Password reset error:', error);
        }
    }

    /**
     * Show dashboard (placeholder for now)
     */
    showDashboard() {
        this.notificationManager.show('Dashboard coming soon!', 'info');
    }

    /**
     * Validate a specific form field
     */
    validateField(formType, fieldName) {
        const fieldId = `${formType}-${fieldName === 'confirmPassword' ? 'confirm-password' : fieldName}`;
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (!field || !errorElement) return true;
        
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldName) {
            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!this.validationRules.email.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
                
            case 'password':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Password is required';
                } else if (!this.validationRules.password.test(value)) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters long';
                }
                break;
                
            case 'confirmPassword':
                const passwordField = document.getElementById(`${formType}-password`);
                if (!value) {
                    isValid = false;
                    errorMessage = 'Please confirm your password';
                } else if (passwordField && value !== passwordField.value) {
                    isValid = false;
                    errorMessage = 'Passwords do not match';
                }
                break;
        }
        
        if (isValid) {
            errorElement.textContent = '';
            field.classList.remove('error');
        } else {
            errorElement.textContent = errorMessage;
            field.classList.add('error');
        }
        
        return isValid;
    }

    /**
     * Validate entire form
     */
    validateForm(formType) {
        let isValid = true;
        
        if (formType === 'login') {
            isValid = this.validateField('login', 'email') && isValid;
            isValid = this.validateField('login', 'password') && isValid;
        } else if (formType === 'register') {
            isValid = this.validateField('register', 'email') && isValid;
            isValid = this.validateField('register', 'password') && isValid;
            isValid = this.validateField('register', 'confirmPassword') && isValid;
        }
        
        return isValid;
    }

    /**
     * Show form error
     */
    showFormError(formType, fieldName, message) {
        if (fieldName === 'general') {
            this.notificationManager.show(message, 'error');
        } else {
            const fieldId = `${formType}-${fieldName === 'confirmPassword' ? 'confirm-password' : fieldName}`;
            const errorElement = document.getElementById(`${fieldId}-error`);
            if (errorElement) {
                errorElement.textContent = message;
            }
        }
    }

    /**
     * Clear form errors
     */
    clearFormErrors(formType) {
        const form = document.getElementById(`${formType}-form`);
        if (form) {
            const errorElements = form.querySelectorAll('.form-error');
            errorElements.forEach(element => {
                element.textContent = '';
            });
            
            const fields = form.querySelectorAll('input');
            fields.forEach(field => {
                field.classList.remove('error');
            });
        }
    }

    /**
     * Clear form data
     */
    clearForm(formType) {
        const form = document.getElementById(`${formType}-form`);
        if (form) {
            form.reset();
            this.clearFormErrors(formType);
        }
    }

    /**
     * Set form loading state
     */
    setFormLoading(formType, isLoading) {
        const submitBtn = document.getElementById(`${formType}-submit-btn`);
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnSpinner = submitBtn?.querySelector('.btn-spinner');
        
        if (submitBtn) {
            submitBtn.disabled = isLoading;
        }
        
        if (btnText && btnSpinner) {
            if (isLoading) {
                btnText.classList.add('hidden');
                btnSpinner.classList.remove('hidden');
            } else {
                btnText.classList.remove('hidden');
                btnSpinner.classList.add('hidden');
            }
        }
    }

    /**
     * Initialize authentication UI
     */
    static async initialize() {
        // Wait for dependencies to be available
        if (!window.authManager || !window.notificationManager) {
            throw new Error('AuthUI dependencies not available');
        }
        
        const authUI = new AuthUI(window.authManager, window.notificationManager);
        return authUI;
    }
}

// Export for use in other modules
window.AuthUI = AuthUI;