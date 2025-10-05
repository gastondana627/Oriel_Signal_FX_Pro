/**
 * Dashboard Fix System - Complete authentication and dashboard functionality
 * Ensures email displays properly and all dashboard features work
 */

(function() {
    'use strict';
    
    console.log('📊 Initializing dashboard fix system...');
    
    class DashboardManager {
        constructor() {
            this.isInitialized = false;
            this.currentUser = null;
            this.dashboardData = null;
            
            this.init();
        }
        
        async init() {
            // Wait for auth manager to be available
            if (!window.authManager) {
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Set up authentication state listener
            window.authManager.onStateChange((authState) => {
                this.handleAuthStateChange(authState);
            });
            
            // Set up dashboard modal handlers
            this.setupDashboardHandlers();
            
            // Fix existing UI elements
            this.fixExistingUI();
            
            this.isInitialized = true;
            console.log('✅ Dashboard manager initialized');
        }
        
        handleAuthStateChange(authState) {
            console.log('🔐 Auth state changed:', authState);
            
            if (authState.isAuthenticated && authState.user) {
                this.currentUser = authState.user;
                this.updateUserDisplay();
                this.loadDashboardData();
            } else {
                this.currentUser = null;
                this.clearUserDisplay();
            }
        }
        
        updateUserDisplay() {
            if (!this.currentUser) return;
            
            console.log('👤 Updating user display for:', this.currentUser.email);
            
            // Update user email in status bar
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = this.currentUser.email;
                console.log('✅ Updated user email in status bar');
            }
            
            // Update dashboard email
            const dashboardEmailElement = document.getElementById('dashboard-email');
            if (dashboardEmailElement) {
                dashboardEmailElement.textContent = this.currentUser.email;
                console.log('✅ Updated dashboard email');
            }
            
            // Update user credits
            const userCreditsElement = document.getElementById('user-credits');
            if (userCreditsElement) {
                const credits = this.currentUser.credits || this.currentUser.remaining_downloads || 3;
                userCreditsElement.textContent = `${credits} credits remaining`;
                console.log('✅ Updated user credits');
            }
            
            // Update dashboard stats
            this.updateDashboardStats();
            
            // Update profile form
            this.updateProfileForm();
        }
        
        clearUserDisplay() {
            // Clear user email
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = '';
            }
            
            // Clear dashboard email
            const dashboardEmailElement = document.getElementById('dashboard-email');
            if (dashboardEmailElement) {
                dashboardEmailElement.textContent = '';
            }
            
            // Clear user credits
            const userCreditsElement = document.getElementById('user-credits');
            if (userCreditsElement) {
                userCreditsElement.textContent = '';
            }
        }
        
        async loadDashboardData() {
            if (!window.apiClient || !this.currentUser) return;
            
            try {
                // Load user profile data
                const profileResponse = await window.apiClient.get('/api/user/profile');
                if (profileResponse.success) {
                    this.currentUser = { ...this.currentUser, ...profileResponse.data };
                    this.updateUserDisplay();
                }
                
                // Load dashboard statistics
                const statsResponse = await window.apiClient.get('/api/user/stats');
                if (statsResponse.success) {
                    this.dashboardData = statsResponse.data;
                    this.updateDashboardStats();
                }
                
                // Load download history
                const historyResponse = await window.apiClient.get('/api/user/downloads');
                if (historyResponse.success) {
                    this.updateDownloadHistory(historyResponse.data);
                }
                
                console.log('✅ Dashboard data loaded successfully');
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        updateDashboardStats() {
            if (!this.currentUser) return;
            
            // Update overview stats
            const overviewDownloads = document.getElementById('overview-downloads-used');
            if (overviewDownloads) {
                overviewDownloads.textContent = this.currentUser.downloads_used || 0;
            }
            
            const overviewCredits = document.getElementById('overview-credits-remaining');
            if (overviewCredits) {
                overviewCredits.textContent = this.currentUser.credits || this.currentUser.remaining_downloads || 3;
            }
            
            const overviewTotal = document.getElementById('overview-total-downloads');
            if (overviewTotal) {
                overviewTotal.textContent = this.currentUser.total_downloads || 0;
            }
            
            const overviewRecordingTime = document.getElementById('overview-recording-time');
            if (overviewRecordingTime) {
                const maxTime = this.currentUser.max_recording_time || 30;
                overviewRecordingTime.textContent = `${maxTime}s`;
            }
            
            // Update usage tab
            const usageDownloadsUsed = document.getElementById('usage-downloads-used');
            if (usageDownloadsUsed) {
                usageDownloadsUsed.textContent = this.currentUser.downloads_used || 0;
            }
            
            const usageDownloadsLimit = document.getElementById('usage-downloads-limit');
            if (usageDownloadsLimit) {
                usageDownloadsLimit.textContent = this.currentUser.download_limit || 3;
            }
            
            // Update usage progress
            this.updateUsageProgress();
            
            // Update billing info
            this.updateBillingInfo();
        }
        
        updateUsageProgress() {
            if (!this.currentUser) return;
            
            const used = this.currentUser.downloads_used || 0;
            const limit = this.currentUser.download_limit || 3;
            const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
            
            // Update percentage display
            const usagePercentage = document.getElementById('usage-percentage');
            if (usagePercentage) {
                usagePercentage.textContent = `${percentage}%`;
            }
            
            // Update progress circle
            const progressCircle = document.getElementById('usage-progress-circle');
            if (progressCircle) {
                const circumference = 2 * Math.PI * 50; // radius = 50
                const offset = circumference - (percentage / 100) * circumference;
                progressCircle.style.strokeDasharray = circumference;
                progressCircle.style.strokeDashoffset = offset;
                
                // Change color based on usage
                if (percentage >= 90) {
                    progressCircle.style.stroke = '#ef4444';
                } else if (percentage >= 70) {
                    progressCircle.style.stroke = '#f59e0b';
                } else {
                    progressCircle.style.stroke = '#8309D5';
                }
            }
        }
        
        updateBillingInfo() {
            if (!this.currentUser) return;
            
            const planName = document.getElementById('billing-plan-name');
            if (planName) {
                planName.textContent = this.currentUser.plan || 'Free Plan';
            }
            
            const planPrice = document.getElementById('billing-plan-price');
            if (planPrice) {
                const price = this.currentUser.plan === 'free' ? '$0' : 
                             this.currentUser.plan === 'starter' ? '$9.99' :
                             this.currentUser.plan === 'pro' ? '$29.99' : '$0';
                planPrice.textContent = `${price}/month`;
            }
            
            // Update dashboard plan badge
            const dashboardPlan = document.getElementById('dashboard-plan');
            if (dashboardPlan) {
                dashboardPlan.textContent = this.currentUser.plan || 'Free';
                dashboardPlan.className = 'info-value plan-badge';
            }
            
            // Update join date
            const joinDate = document.getElementById('dashboard-join-date');
            if (joinDate && this.currentUser.created_at) {
                const date = new Date(this.currentUser.created_at);
                joinDate.textContent = date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                });
            }
        }
        
        updateDownloadHistory(downloads) {
            const historyList = document.getElementById('download-history-list');
            if (!historyList) return;
            
            if (!downloads || downloads.length === 0) {
                historyList.innerHTML = `
                    <div class="history-empty">
                        <div class="empty-icon">📁</div>
                        <p>No downloads yet</p>
                        <p class="empty-subtitle">Start creating visualizations to see your history here</p>
                    </div>
                `;
                return;
            }
            
            historyList.innerHTML = downloads.map(download => `
                <div class="history-item">
                    <span>${new Date(download.created_at).toLocaleDateString()}</span>
                    <span>${download.format || 'MP3'}</span>
                    <span>${download.duration || '30s'}</span>
                    <span class="status-success">Complete</span>
                </div>
            `).join('');
        }
        
        updateProfileForm() {
            if (!this.currentUser) return;
            
            const profileEmail = document.getElementById('profile-email');
            if (profileEmail) {
                profileEmail.value = this.currentUser.email || '';
            }
            
            const profileName = document.getElementById('profile-name');
            if (profileName) {
                profileName.value = this.currentUser.name || '';
            }
        }
        
        setupDashboardHandlers() {
            // Dashboard button click handler
            const dashboardBtn = document.getElementById('dashboard-btn');
            if (dashboardBtn) {
                dashboardBtn.addEventListener('click', () => {
                    this.openDashboard();
                });
            }
            
            // Dashboard tab switching
            const tabButtons = document.querySelectorAll('.dashboard-tab-btn');
            tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    this.switchDashboardTab(e.target.dataset.tab);
                });
            });
            
            // Profile form submission
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveProfile();
                });
            }
            
            // Preferences form submission
            const preferencesForm = document.getElementById('preferences-form');
            if (preferencesForm) {
                preferencesForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.savePreferences();
                });
            }
        }
        
        openDashboard() {
            const dashboardModal = document.getElementById('user-dashboard-modal');
            if (dashboardModal) {
                dashboardModal.classList.remove('modal-hidden');
                
                // Load fresh data when opening
                this.loadDashboardData();
            }
        }
        
        switchDashboardTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.dashboard-tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tab buttons
            const tabButtons = document.querySelectorAll('.dashboard-tab-btn');
            tabButtons.forEach(button => {
                button.classList.remove('active');
            });
            
            // Show selected tab content
            const selectedContent = document.getElementById(`${tabName}-tab`);
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
            
            // Add active class to selected tab button
            const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
            if (selectedButton) {
                selectedButton.classList.add('active');
            }
        }
        
        async saveProfile() {
            if (!window.apiClient) return;
            
            const profileEmail = document.getElementById('profile-email');
            const profileName = document.getElementById('profile-name');
            
            const profileData = {
                name: profileName ? profileName.value : ''
            };
            
            try {
                const response = await window.apiClient.put('/api/user/profile', profileData);
                if (response.success) {
                    this.currentUser = { ...this.currentUser, ...profileData };
                    if (window.notificationManager) {
                        window.notificationManager.show('Profile updated successfully', 'success');
                    }
                } else {
                    throw new Error(response.error);
                }
            } catch (error) {
                console.error('Error saving profile:', error);
                if (window.notificationManager) {
                    window.notificationManager.show('Failed to update profile', 'error');
                }
            }
        }
        
        async savePreferences() {
            if (!window.preferencesManager) return;
            
            const glowColor = document.getElementById('default-glow-color');
            const pulse = document.getElementById('default-pulse');
            const shape = document.getElementById('default-shape');
            const autoSync = document.getElementById('auto-sync');
            
            const preferences = {};
            if (glowColor) preferences.glowColor = glowColor.value;
            if (pulse) preferences.pulse = parseFloat(pulse.value);
            if (shape) preferences.shape = shape.value;
            if (autoSync) preferences.autoSync = autoSync.checked;
            
            try {
                await window.preferencesManager.setPreferences(preferences);
                if (window.notificationManager) {
                    window.notificationManager.show('Preferences saved successfully', 'success');
                }
            } catch (error) {
                console.error('Error saving preferences:', error);
                if (window.notificationManager) {
                    window.notificationManager.show('Failed to save preferences', 'error');
                }
            }
        }
        
        fixExistingUI() {
            // Fix any existing UI rendering issues
            setTimeout(() => {
                // Ensure user status bar is properly styled
                const userStatusBar = document.querySelector('.user-status-bar');
                if (userStatusBar) {
                    userStatusBar.style.display = 'block';
                    userStatusBar.style.visibility = 'visible';
                }
                
                // Ensure dashboard modal exists and is properly structured
                this.ensureDashboardModal();
                
                // Update any existing user data
                if (this.currentUser) {
                    this.updateUserDisplay();
                }
            }, 1000);
        }
        
        ensureDashboardModal() {
            const dashboardModal = document.getElementById('user-dashboard-modal');
            if (!dashboardModal) {
                console.log('⚠️ Dashboard modal not found - this may cause issues');
                return;
            }
            
            // Ensure modal has proper geometric styling
            const modalContent = dashboardModal.querySelector('.dashboard-modal-content');
            if (modalContent) {
                modalContent.classList.add('geometric-card');
            }
        }
    }
    
    // Initialize dashboard manager
    const dashboardManager = new DashboardManager();
    window.dashboardManager = dashboardManager;
    
    console.log('✅ Dashboard fix system initialized');
    
})();