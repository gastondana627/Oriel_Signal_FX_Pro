/**
 * Dashboard UI Controller
 * Handles user dashboard modal interactions and data display
 */
class DashboardUI {
    constructor(authManager, apiClient, notificationManager, usageTracker = null, preferencesManager = null) {
        this.authManager = authManager;
        this.apiClient = apiClient;
        this.notificationManager = notificationManager;
        this.usageTracker = usageTracker;
        this.preferencesManager = preferencesManager;
        
        // Modal elements
        this.dashboardModal = document.getElementById('user-dashboard-modal');
        this.dashboardCloseBtn = document.getElementById('dashboard-close-btn');
        this.changePasswordModal = document.getElementById('change-password-modal');
        this.deleteAccountModal = document.getElementById('delete-account-modal');
        
        // Tab elements
        this.tabButtons = document.querySelectorAll('.dashboard-tab-btn');
        this.tabContents = document.querySelectorAll('.dashboard-tab-content');
        
        // Overview tab elements
        this.dashboardEmail = document.getElementById('dashboard-email');
        this.dashboardJoinDate = document.getElementById('dashboard-join-date');
        this.dashboardPlan = document.getElementById('dashboard-plan');
        this.dashboardStatus = document.getElementById('dashboard-status');
        this.overviewDownloadsUsed = document.getElementById('overview-downloads-used');
        this.overviewCreditsRemaining = document.getElementById('overview-credits-remaining');
        this.overviewTotalDownloads = document.getElementById('overview-total-downloads');
        this.overviewRecordingTime = document.getElementById('overview-recording-time');
        
        // Usage tab elements
        this.usageProgressCircle = document.getElementById('usage-progress-circle');
        this.usagePercentage = document.getElementById('usage-percentage');
        this.usageDownloadsUsed = document.getElementById('usage-downloads-used');
        this.usageDownloadsLimit = document.getElementById('usage-downloads-limit');
        this.usageResetDate = document.getElementById('usage-reset-date');
        this.downloadHistoryList = document.getElementById('download-history-list');
        
        // Billing tab elements
        this.billingPlanName = document.getElementById('billing-plan-name');
        this.billingPlanPrice = document.getElementById('billing-plan-price');
        this.billingPlanFeatures = document.getElementById('billing-plan-features');
        this.upgradePlanBtn = document.getElementById('upgrade-plan-btn');
        this.buyMoreCreditsBtn = document.getElementById('buy-more-credits-btn');
        this.paymentHistoryList = document.getElementById('payment-history-list');
        
        // Settings tab elements
        this.profileForm = document.getElementById('profile-form');
        this.profileEmail = document.getElementById('profile-email');
        this.profileName = document.getElementById('profile-name');
        this.preferencesForm = document.getElementById('preferences-form');
        this.defaultGlowColor = document.getElementById('default-glow-color');
        this.defaultPulse = document.getElementById('default-pulse');
        this.pulseValue = document.getElementById('pulse-value');
        this.defaultShape = document.getElementById('default-shape');
        this.autoSync = document.getElementById('auto-sync');
        this.resetPreferencesBtn = document.getElementById('reset-preferences-btn');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.exportDataBtn = document.getElementById('export-data-btn');
        this.deleteAccountBtn = document.getElementById('delete-account-btn');
        
        // Current active tab
        this.activeTab = 'overview';
        
        // User data cache
        this.userData = null;
        this.usageData = null;
        this.downloadHistory = [];
        this.paymentHistory = [];
        this.userPreferences = {};
        
        this.initialize();
    }

    /**
     * Initialize the dashboard UI
     */
    initialize() {
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    /**
     * Set up event listeners for dashboard UI
     */
    setupEventListeners() {
        // Modal close handlers
        this.dashboardCloseBtn?.addEventListener('click', () => this.hideDashboard());
        
        // Change password modal handlers
        const changePasswordCloseBtn = document.getElementById('change-password-close-btn');
        changePasswordCloseBtn?.addEventListener('click', () => this.hideChangePasswordModal());
        
        const changePasswordForm = document.getElementById('change-password-form');
        changePasswordForm?.addEventListener('submit', (e) => this.handleChangePasswordSubmit(e));
        
        // Delete account modal handlers
        const deleteAccountCloseBtn = document.getElementById('delete-account-close-btn');
        deleteAccountCloseBtn?.addEventListener('click', () => this.hideDeleteAccountModal());
        
        const deleteAccountCancelBtn = document.getElementById('delete-account-cancel-btn');
        deleteAccountCancelBtn?.addEventListener('click', () => this.hideDeleteAccountModal());
        
        const deleteAccountForm = document.getElementById('delete-account-form');
        deleteAccountForm?.addEventListener('submit', (e) => this.handleDeleteAccountSubmit(e));
        
        // Modal backdrop click handlers
        this.dashboardModal?.addEventListener('click', (e) => {
            if (e.target === this.dashboardModal) {
                this.hideDashboard();
            }
        });
        
        this.changePasswordModal?.addEventListener('click', (e) => {
            if (e.target === this.changePasswordModal) {
                this.hideChangePasswordModal();
            }
        });
        
        this.deleteAccountModal?.addEventListener('click', (e) => {
            if (e.target === this.deleteAccountModal) {
                this.hideDeleteAccountModal();
            }
        });
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.changePasswordModal?.classList.contains('modal-hidden')) {
                    this.hideChangePasswordModal();
                } else if (!this.deleteAccountModal?.classList.contains('modal-hidden')) {
                    this.hideDeleteAccountModal();
                } else if (!this.dashboardModal?.classList.contains('modal-hidden')) {
                    this.hideDashboard();
                }
            }
        });
        
        // Tab switching handlers
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Billing action handlers
        this.upgradePlanBtn?.addEventListener('click', () => this.handleUpgradePlan());
        this.buyMoreCreditsBtn?.addEventListener('click', () => this.handleBuyCredits());
        
        // Settings form handlers
        this.profileForm?.addEventListener('submit', (e) => this.handleProfileSubmit(e));
        this.preferencesForm?.addEventListener('submit', (e) => this.handlePreferencesSubmit(e));
        this.resetPreferencesBtn?.addEventListener('click', () => this.handleResetPreferences());
        
        // Account action handlers
        this.changePasswordBtn?.addEventListener('click', () => this.handleChangePassword());
        this.exportDataBtn?.addEventListener('click', () => this.handleExportData());
        this.deleteAccountBtn?.addEventListener('click', () => this.handleDeleteAccount());
        
        // Preferences sync handlers
        const syncPreferencesBtn = document.getElementById('sync-preferences-btn');
        syncPreferencesBtn?.addEventListener('click', () => this.handleSyncPreferences());
        
        const exportPreferencesBtn = document.getElementById('export-preferences-btn');
        exportPreferencesBtn?.addEventListener('click', () => this.handleExportPreferences());
        
        const importPreferencesBtn = document.getElementById('import-preferences-btn');
        importPreferencesBtn?.addEventListener('click', () => this.handleImportPreferences());
        
        // Pulse range input handler
        this.defaultPulse?.addEventListener('input', (e) => {
            if (this.pulseValue) {
                this.pulseValue.textContent = e.target.value;
            }
        });
    }

    /**
     * Set up authentication state listener
     */
    setupAuthStateListener() {
        this.authManager.onStateChange((authState) => {
            if (authState.isAuthenticated) {
                this.loadUserData();
            }
        });
    }

    /**
     * Show dashboard modal
     */
    async showDashboard() {
        if (!this.authManager.isAuthenticated()) {
            this.notificationManager.show('Please log in to access your dashboard', 'warning');
            return;
        }
        
        // Load fresh data
        await this.loadUserData();
        
        // Show modal
        this.dashboardModal?.classList.remove('modal-hidden');
        this.pauseVisualizerIfNeeded();
        
        // Switch to overview tab by default
        this.switchTab('overview');
    }

    /**
     * Hide dashboard modal
     */
    hideDashboard() {
        this.dashboardModal?.classList.add('modal-hidden');
        this.resumeVisualizerIfNeeded();
    }

    /**
     * Switch between dashboard tabs
     */
    switchTab(tabName) {
        // Update active tab
        this.activeTab = tabName;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab contents
        this.tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load user data from backend
     */
    async loadUserData() {
        try {
            // Load user profile
            const profileResponse = await this.apiClient.get('/api/user/profile');
            if (profileResponse.success) {
                this.userData = profileResponse.data;
                this.updateOverviewTab();
                this.updateSettingsTab();
            }
            
            // Load usage data
            if (this.usageTracker) {
                await this.usageTracker.refreshUsage();
                this.usageData = this.usageTracker.getUsageStats();
                this.updateUsageTab();
            }
            
            // Load preferences
            const preferencesResponse = await this.apiClient.get('/api/user/preferences');
            if (preferencesResponse.success) {
                this.userPreferences = preferencesResponse.data;
                this.updatePreferencesForm();
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.notificationManager.show('Failed to load user data', 'error');
        }
    }

    /**
     * Load tab-specific data
     */
    async loadTabData(tabName) {
        switch (tabName) {
            case 'usage':
                await this.loadDownloadHistory();
                break;
            case 'billing':
                await this.loadPaymentHistory();
                break;
        }
    }

    /**
     * Load download history
     */
    async loadDownloadHistory() {
        try {
            const response = await this.apiClient.get('/api/user/download-history');
            if (response.success) {
                this.downloadHistory = response.data;
                this.updateDownloadHistoryDisplay();
            }
        } catch (error) {
            console.error('Error loading download history:', error);
        }
    }

    /**
     * Load payment history
     */
    async loadPaymentHistory() {
        try {
            const response = await this.apiClient.get('/api/payments/history');
            if (response.success) {
                this.paymentHistory = response.data;
                this.updatePaymentHistoryDisplay();
            }
        } catch (error) {
            console.error('Error loading payment history:', error);
        }
    }

    /**
     * Update overview tab with user data
     */
    updateOverviewTab() {
        if (!this.userData) return;
        
        // Update account information
        if (this.dashboardEmail) {
            this.dashboardEmail.textContent = this.userData.email;
        }
        
        if (this.dashboardJoinDate) {
            const joinDate = new Date(this.userData.created_at);
            this.dashboardJoinDate.textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        }
        
        if (this.dashboardPlan) {
            this.dashboardPlan.textContent = this.userData.plan || 'Free';
        }
        
        if (this.dashboardStatus) {
            this.dashboardStatus.textContent = this.userData.is_active ? 'Active' : 'Inactive';
            this.dashboardStatus.className = this.userData.is_active ? 'info-value status-active' : 'info-value status-inactive';
        }
        
        // Update quick stats
        if (this.usageData) {
            if (this.overviewDownloadsUsed) {
                this.overviewDownloadsUsed.textContent = this.usageData.downloadsUsed || 0;
            }
            
            if (this.overviewCreditsRemaining) {
                this.overviewCreditsRemaining.textContent = this.usageData.remainingDownloads || 0;
            }
            
            if (this.overviewTotalDownloads) {
                this.overviewTotalDownloads.textContent = this.userData.total_downloads || 0;
            }
            
            if (this.overviewRecordingTime) {
                const plan = this.authManager.getUserPlan();
                const maxTime = plan.features.maxRecordingTime || 30;
                this.overviewRecordingTime.textContent = `${maxTime}s`;
            }
        }
    }

    /**
     * Update usage tab with usage data
     */
    updateUsageTab() {
        if (!this.usageData) return;
        
        // Update usage progress ring
        const percentage = this.usageData.usagePercentage || 0;
        const circumference = 2 * Math.PI * 50; // radius = 50
        const offset = circumference - (percentage / 100) * circumference;
        
        if (this.usageProgressCircle) {
            this.usageProgressCircle.style.strokeDashoffset = offset;
        }
        
        if (this.usagePercentage) {
            this.usagePercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        // Update usage details
        if (this.usageDownloadsUsed) {
            this.usageDownloadsUsed.textContent = this.usageData.downloadsUsed || 0;
        }
        
        if (this.usageDownloadsLimit) {
            this.usageDownloadsLimit.textContent = this.usageData.downloadLimit || 0;
        }
        
        if (this.usageResetDate) {
            if (this.usageData.resetDate) {
                const resetDate = new Date(this.usageData.resetDate);
                this.usageResetDate.textContent = resetDate.toLocaleDateString();
            } else {
                this.usageResetDate.textContent = 'Next month';
            }
        }
    }

    /**
     * Update download history display
     */
    updateDownloadHistoryDisplay() {
        if (!this.downloadHistoryList) return;
        
        if (this.downloadHistory.length === 0) {
            this.downloadHistoryList.innerHTML = `
                <div class="history-empty">
                    <div class="empty-icon">📁</div>
                    <p>No downloads yet</p>
                    <p class="empty-subtitle">Start creating visualizations to see your history here</p>
                </div>
            `;
            return;
        }
        
        const historyHTML = this.downloadHistory.map(download => `
            <div class="history-item">
                <span>${new Date(download.created_at).toLocaleDateString()}</span>
                <span>${download.type}</span>
                <span>${download.duration}s</span>
                <span class="status-${download.status}">${download.status}</span>
            </div>
        `).join('');
        
        this.downloadHistoryList.innerHTML = historyHTML;
    }

    /**
     * Update payment history display
     */
    updatePaymentHistoryDisplay() {
        if (!this.paymentHistoryList) return;
        
        if (this.paymentHistory.length === 0) {
            this.paymentHistoryList.innerHTML = `
                <div class="history-empty">
                    <div class="empty-icon">💳</div>
                    <p>No payments yet</p>
                    <p class="empty-subtitle">Your payment history will appear here</p>
                </div>
            `;
            return;
        }
        
        const historyHTML = this.paymentHistory.map(payment => `
            <div class="history-item">
                <span>${new Date(payment.created_at).toLocaleDateString()}</span>
                <span>${payment.description}</span>
                <span>$${payment.amount}</span>
                <span class="status-${payment.status}">${payment.status}</span>
            </div>
        `).join('');
        
        this.paymentHistoryList.innerHTML = historyHTML;
    }

    /**
     * Update settings tab with user data
     */
    updateSettingsTab() {
        if (!this.userData) return;
        
        // Update profile form
        if (this.profileEmail) {
            this.profileEmail.value = this.userData.email;
        }
        
        if (this.profileName) {
            this.profileName.value = this.userData.name || '';
        }
    }

    /**
     * Update preferences form with user preferences
     */
    updatePreferencesForm() {
        let preferences = this.userPreferences;
        
        // Use preferences manager if available
        if (this.preferencesManager) {
            preferences = this.preferencesManager.getPreferences();
        }
        
        if (!preferences) return;
        
        if (this.defaultGlowColor) {
            this.defaultGlowColor.value = preferences.glowColor || '#8309D5';
        }
        
        if (this.defaultPulse) {
            this.defaultPulse.value = preferences.pulse || 1.5;
            if (this.pulseValue) {
                this.pulseValue.textContent = this.defaultPulse.value;
            }
        }
        
        if (this.defaultShape) {
            this.defaultShape.value = preferences.shape || 'circle';
        }
        
        if (this.autoSync) {
            this.autoSync.checked = preferences.autoSync !== false;
        }
    }

    /**
     * Handle upgrade plan button click
     */
    handleUpgradePlan() {
        this.hideDashboard();
        // Trigger plan selection modal
        if (window.paymentUI) {
            window.paymentUI.showPlanSelection();
        }
    }

    /**
     * Handle buy credits button click
     */
    handleBuyCredits() {
        this.hideDashboard();
        // Trigger credit purchase modal
        if (window.paymentUI) {
            window.paymentUI.showCreditPurchase();
        }
    }

    /**
     * Handle profile form submission
     */
    async handleProfileSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const profileData = {
            name: formData.get('name')
        };
        
        // Show loading state
        this.setFormLoading('profile', true);
        
        try {
            const response = await this.apiClient.put('/api/user/profile', profileData);
            
            if (response.success) {
                this.userData = { ...this.userData, ...profileData };
                this.notificationManager.show('Profile updated successfully', 'success');
            } else {
                this.notificationManager.show(response.error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.notificationManager.show('Failed to update profile', 'error');
        } finally {
            this.setFormLoading('profile', false);
        }
    }

    /**
     * Handle preferences form submission
     */
    async handlePreferencesSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const preferences = {
            glowColor: formData.get('glowColor'),
            pulse: parseFloat(formData.get('pulse')),
            shape: formData.get('shape'),
            autoSync: formData.has('autoSync')
        };
        
        // Show loading state
        this.setFormLoading('preferences', true);
        
        try {
            if (this.preferencesManager) {
                // Use preferences manager for better sync handling
                await this.preferencesManager.setPreferences(preferences);
                this.notificationManager.show('Preferences saved successfully', 'success');
                
                // Apply preferences to current visualizer if enabled
                if (preferences.autoSync) {
                    this.preferencesManager.applyToVisualizer();
                }
            } else {
                // Fallback to direct API call
                const response = await this.apiClient.put('/api/user/preferences', preferences);
                
                if (response.success) {
                    this.userPreferences = { ...this.userPreferences, ...preferences };
                    this.notificationManager.show('Preferences saved successfully', 'success');
                    
                    // Apply preferences to current visualizer if enabled
                    if (preferences.autoSync) {
                        this.applyPreferencesToVisualizer(preferences);
                    }
                } else {
                    this.notificationManager.show(response.error || 'Failed to save preferences', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.notificationManager.show('Failed to save preferences', 'error');
        } finally {
            this.setFormLoading('preferences', false);
        }
    }

    /**
     * Handle reset preferences
     */
    async handleResetPreferences() {
        if (!confirm('Are you sure you want to reset all preferences to defaults?')) {
            return;
        }
        
        try {
            if (this.preferencesManager) {
                // Use preferences manager for better handling
                await this.preferencesManager.resetToDefaults();
                this.updatePreferencesForm();
                this.notificationManager.show('Preferences reset to defaults', 'success');
                
                // Apply defaults to current visualizer
                this.preferencesManager.applyToVisualizer();
            } else {
                // Fallback to direct API call
                const defaultPreferences = {
                    glowColor: '#8309D5',
                    pulse: 1.5,
                    shape: 'circle',
                    autoSync: true
                };
                
                const response = await this.apiClient.put('/api/user/preferences', defaultPreferences);
                
                if (response.success) {
                    this.userPreferences = defaultPreferences;
                    this.updatePreferencesForm();
                    this.notificationManager.show('Preferences reset to defaults', 'success');
                    
                    // Apply defaults to current visualizer
                    this.applyPreferencesToVisualizer(defaultPreferences);
                } else {
                    this.notificationManager.show(response.error || 'Failed to reset preferences', 'error');
                }
            }
        } catch (error) {
            console.error('Error resetting preferences:', error);
            this.notificationManager.show('Failed to reset preferences', 'error');
        }
    }

    /**
     * Apply preferences to current visualizer
     */
    applyPreferencesToVisualizer(preferences) {
        // Update visualizer controls if they exist
        const glowColorInput = document.getElementById('glowColor');
        const pulseInput = document.getElementById('pulse');
        
        if (glowColorInput && preferences.glowColor) {
            glowColorInput.value = preferences.glowColor;
            glowColorInput.dispatchEvent(new Event('change'));
        }
        
        if (pulseInput && preferences.pulse) {
            pulseInput.value = preferences.pulse;
            pulseInput.dispatchEvent(new Event('input'));
        }
        
        // Apply shape if shape selector exists
        if (preferences.shape && window.setCurrentShape) {
            window.setCurrentShape(preferences.shape);
        }
    }

    /**
     * Handle change password
     */
    handleChangePassword() {
        this.showChangePasswordModal();
    }

    /**
     * Handle export data
     */
    async handleExportData() {
        try {
            const response = await this.apiClient.get('/api/user/export-data');
            
            if (response.success) {
                // Create and download file
                const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `oriel-fx-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.notificationManager.show('Data exported successfully', 'success');
            } else {
                this.notificationManager.show(response.error || 'Failed to export data', 'error');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.notificationManager.show('Failed to export data', 'error');
        }
    }

    /**
     * Handle delete account
     */
    handleDeleteAccount() {
        this.showDeleteAccountModal();
    }

    /**
     * Set form loading state
     */
    setFormLoading(formType, isLoading) {
        const form = document.getElementById(`${formType}-form`);
        const submitBtn = form?.querySelector('button[type="submit"]');
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
     * Show change password modal
     */
    showChangePasswordModal() {
        this.changePasswordModal?.classList.remove('modal-hidden');
        this.clearChangePasswordForm();
        this.pauseVisualizerIfNeeded();
        
        // Focus on current password field
        const currentPasswordField = document.getElementById('current-password');
        setTimeout(() => currentPasswordField?.focus(), 100);
    }

    /**
     * Hide change password modal
     */
    hideChangePasswordModal() {
        this.changePasswordModal?.classList.add('modal-hidden');
        this.clearChangePasswordForm();
        this.resumeVisualizerIfNeeded();
    }

    /**
     * Handle change password form submission
     */
    async handleChangePasswordSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmNewPassword = formData.get('confirmNewPassword');
        
        // Validate form
        if (!this.validateChangePasswordForm(currentPassword, newPassword, confirmNewPassword)) {
            return;
        }
        
        // Show loading state
        this.setChangePasswordLoading(true);
        
        try {
            const response = await this.apiClient.put('/api/user/change-password', {
                currentPassword,
                newPassword
            });
            
            if (response.success) {
                this.hideChangePasswordModal();
                this.notificationManager.show('Password changed successfully', 'success');
            } else {
                this.showChangePasswordError('general', response.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showChangePasswordError('general', 'Failed to change password');
        } finally {
            this.setChangePasswordLoading(false);
        }
    }

    /**
     * Validate change password form
     */
    validateChangePasswordForm(currentPassword, newPassword, confirmNewPassword) {
        let isValid = true;
        
        // Clear previous errors
        this.clearChangePasswordErrors();
        
        if (!currentPassword) {
            this.showChangePasswordError('currentPassword', 'Current password is required');
            isValid = false;
        }
        
        if (!newPassword) {
            this.showChangePasswordError('newPassword', 'New password is required');
            isValid = false;
        } else if (newPassword.length < 6) {
            this.showChangePasswordError('newPassword', 'Password must be at least 6 characters long');
            isValid = false;
        }
        
        if (!confirmNewPassword) {
            this.showChangePasswordError('confirmNewPassword', 'Please confirm your new password');
            isValid = false;
        } else if (newPassword !== confirmNewPassword) {
            this.showChangePasswordError('confirmNewPassword', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Show change password modal
     */
    showDeleteAccountModal() {
        this.deleteAccountModal?.classList.remove('modal-hidden');
        this.clearDeleteAccountForm();
        this.pauseVisualizerIfNeeded();
        
        // Focus on confirmation field
        const confirmationField = document.getElementById('delete-confirmation');
        setTimeout(() => confirmationField?.focus(), 100);
    }

    /**
     * Hide delete account modal
     */
    hideDeleteAccountModal() {
        this.deleteAccountModal?.classList.add('modal-hidden');
        this.clearDeleteAccountForm();
        this.resumeVisualizerIfNeeded();
    }

    /**
     * Handle delete account form submission
     */
    async handleDeleteAccountSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const confirmation = formData.get('confirmation');
        const password = formData.get('password');
        
        // Validate form
        if (!this.validateDeleteAccountForm(confirmation, password)) {
            return;
        }
        
        // Show loading state
        this.setDeleteAccountLoading(true);
        
        try {
            const response = await this.apiClient.delete('/api/user/account', {
                password
            });
            
            if (response.success) {
                this.hideDeleteAccountModal();
                this.hideDashboard();
                this.notificationManager.show('Account deleted successfully', 'success');
                
                // Log out the user
                setTimeout(() => {
                    this.authManager.logout();
                }, 1000);
            } else {
                this.showDeleteAccountError('general', response.error || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showDeleteAccountError('general', 'Failed to delete account');
        } finally {
            this.setDeleteAccountLoading(false);
        }
    }

    /**
     * Validate delete account form
     */
    validateDeleteAccountForm(confirmation, password) {
        let isValid = true;
        
        // Clear previous errors
        this.clearDeleteAccountErrors();
        
        if (confirmation !== 'DELETE') {
            this.showDeleteAccountError('confirmation', 'You must type "DELETE" to confirm');
            isValid = false;
        }
        
        if (!password) {
            this.showDeleteAccountError('password', 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Clear change password form
     */
    clearChangePasswordForm() {
        const form = document.getElementById('change-password-form');
        if (form) {
            form.reset();
            this.clearChangePasswordErrors();
        }
    }

    /**
     * Clear change password errors
     */
    clearChangePasswordErrors() {
        const errorElements = [
            'current-password-error',
            'new-password-error',
            'confirm-new-password-error'
        ];
        
        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '';
            }
        });
        
        // Remove error classes from inputs
        const inputs = [
            'current-password',
            'new-password',
            'confirm-new-password'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('error');
            }
        });
    }

    /**
     * Show change password error
     */
    showChangePasswordError(fieldName, message) {
        if (fieldName === 'general') {
            this.notificationManager.show(message, 'error');
        } else {
            const errorElement = document.getElementById(`${fieldName === 'currentPassword' ? 'current-password' : fieldName === 'newPassword' ? 'new-password' : 'confirm-new-password'}-error`);
            const inputElement = document.getElementById(fieldName === 'currentPassword' ? 'current-password' : fieldName === 'newPassword' ? 'new-password' : 'confirm-new-password');
            
            if (errorElement) {
                errorElement.textContent = message;
            }
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }

    /**
     * Set change password loading state
     */
    setChangePasswordLoading(isLoading) {
        const submitBtn = document.getElementById('change-password-submit-btn');
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
     * Clear delete account form
     */
    clearDeleteAccountForm() {
        const form = document.getElementById('delete-account-form');
        if (form) {
            form.reset();
            this.clearDeleteAccountErrors();
        }
    }

    /**
     * Clear delete account errors
     */
    clearDeleteAccountErrors() {
        const errorElements = [
            'delete-confirmation-error',
            'delete-password-error'
        ];
        
        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '';
            }
        });
        
        // Remove error classes from inputs
        const inputs = [
            'delete-confirmation',
            'delete-password'
        ];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('error');
            }
        });
    }

    /**
     * Show delete account error
     */
    showDeleteAccountError(fieldName, message) {
        if (fieldName === 'general') {
            this.notificationManager.show(message, 'error');
        } else {
            const errorElement = document.getElementById(`delete-${fieldName}-error`);
            const inputElement = document.getElementById(`delete-${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = message;
            }
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }

    /**
     * Set delete account loading state
     */
    setDeleteAccountLoading(isLoading) {
        const submitBtn = document.getElementById('delete-account-submit-btn');
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
     * Handle sync preferences
     */
    async handleSyncPreferences() {
        if (!this.preferencesManager) {
            this.notificationManager.show('Preferences sync not available', 'error');
            return;
        }
        
        await this.preferencesManager.forceSync();
        this.updatePreferencesForm();
    }

    /**
     * Handle export preferences
     */
    handleExportPreferences() {
        if (!this.preferencesManager) {
            this.notificationManager.show('Preferences export not available', 'error');
            return;
        }
        
        try {
            const exportData = this.preferencesManager.exportPreferences();
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `oriel-fx-preferences-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notificationManager.show('Preferences exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting preferences:', error);
            this.notificationManager.show('Failed to export preferences', 'error');
        }
    }

    /**
     * Handle import preferences
     */
    handleImportPreferences() {
        if (!this.preferencesManager) {
            this.notificationManager.show('Preferences import not available', 'error');
            return;
        }
        
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                const success = await this.preferencesManager.importPreferences(importData);
                if (success) {
                    this.updatePreferencesForm();
                }
            } catch (error) {
                console.error('Error importing preferences:', error);
                this.notificationManager.show('Invalid preferences file', 'error');
            }
        };
        
        input.click();
    }

    /**
     * Set preferences manager reference
     */
    setPreferencesManager(preferencesManager) {
        this.preferencesManager = preferencesManager;
        
        // Set up preferences change listener
        if (this.preferencesManager) {
            this.preferencesManager.onChange((preferences) => {
                // Update form if settings tab is active
                if (this.activeTab === 'settings') {
                    this.updatePreferencesForm();
                }
            });
        }
    }

    /**
     * Set usage tracker reference
     */
    setUsageTracker(usageTracker) {
        this.usageTracker = usageTracker;
        
        // Set up usage change listener
        if (this.usageTracker) {
            this.usageTracker.onUsageChange((usageStats) => {
                this.usageData = usageStats;
                if (this.activeTab === 'overview' || this.activeTab === 'usage') {
                    this.updateOverviewTab();
                    this.updateUsageTab();
                }
            });
        }
    }

    /**
     * Initialize dashboard UI
     */
    static async initialize() {
        // Wait for dependencies to be available
        if (!window.authManager || !window.apiClient || !window.notificationManager) {
            throw new Error('DashboardUI dependencies not available');
        }
        
        // UsageTracker and PreferencesManager are optional at initialization time
        const usageTracker = window.usageTracker || null;
        const preferencesManager = window.preferencesManager || null;
        
        const dashboardUI = new DashboardUI(
            window.authManager,
            window.apiClient,
            window.notificationManager,
            usageTracker,
            preferencesManager
        );
        
        return dashboardUI;
    }
}

// Export for use in other modules
window.DashboardUI = DashboardUI;