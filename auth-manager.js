/**
 * Authentication Manager
 * Handles user authentication, JWT token management, and user state
 */
class AuthManager {
    constructor(apiClient, appConfig, notificationManager) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.notificationManager = notificationManager;
        
        // User state
        this.user = null;
        this.isAuthenticated = false;
        this.token = null;
        this.refreshTimer = null;
        
        // Event listeners for state changes
        this.stateChangeListeners = [];
        
        // Initialize from stored data
        this.initializeFromStorage();
        
        // Set up automatic token refresh
        this.setupTokenRefresh();
    }

    /**
     * Initialize authentication state from localStorage
     */
    initializeFromStorage() {
        try {
            const storedToken = localStorage.getItem('oriel_jwt_token');
            const storedUser = localStorage.getItem('oriel_user_data');
            
            if (storedToken && storedUser) {
                this.token = storedToken;
                this.user = JSON.parse(storedUser);
                
                // Validate token before setting authenticated state
                if (this.isTokenValid(storedToken)) {
                    this.isAuthenticated = true;
                    this.apiClient.saveToken(storedToken);
                    this.notifyStateChange();
                } else {
                    // Token is expired, clear stored data
                    this.clearStoredData();
                }
            }
        } catch (error) {
            console.error('Error initializing auth from storage:', error);
            this.clearStoredData();
        }
    }

    /**
     * Validate JWT token (basic client-side validation)
     */
    isTokenValid(token) {
        if (!token) return false;
        
        try {
            // Decode JWT payload (basic validation)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Check if token is expired
            return payload.exp && payload.exp > currentTime;
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    /**
     * Set up automatic token refresh
     */
    setupTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.isAuthenticated && this.token) {
            try {
                const payload = JSON.parse(atob(this.token.split('.')[1]));
                const expirationTime = payload.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                const timeUntilExpiry = expirationTime - currentTime;
                
                // Refresh token 5 minutes before expiry
                const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60000); // At least 1 minute
                
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, refreshTime);
            } catch (error) {
                console.error('Error setting up token refresh:', error);
            }
        }
    }

    /**
     * User login
     */
    async login(email, password) {
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.auth.login,
                { email, password }
            );

            if (response.ok && response.data) {
                const { token, user } = response.data;
                
                // Store authentication data
                this.token = token;
                this.user = user;
                this.isAuthenticated = true;
                
                // Persist to localStorage
                localStorage.setItem('oriel_jwt_token', token);
                localStorage.setItem('oriel_user_data', JSON.stringify(user));
                
                // Update API client with token
                this.apiClient.saveToken(token);
                
                // Set up token refresh
                this.setupTokenRefresh();
                
                // Notify state change
                this.notifyStateChange();
                
                // Show success notification
                this.notificationManager.show('Login successful!', 'success');
                
                return { success: true, user };
            } else {
                throw new Error(response.data?.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            if (error.status === 401) {
                errorMessage = 'Invalid email or password.';
            } else if (error.status === 429) {
                errorMessage = 'Too many login attempts. Please try again later.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            this.notificationManager.show(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    /**
     * User registration
     */
    async register(email, password, additionalData = {}) {
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.auth.register,
                { 
                    email, 
                    password,
                    ...additionalData
                }
            );

            if (response.ok && response.data) {
                const { token, user, message } = response.data;
                
                // If registration includes automatic login
                if (token && user) {
                    this.token = token;
                    this.user = user;
                    this.isAuthenticated = true;
                    
                    // Persist to localStorage
                    localStorage.setItem('oriel_jwt_token', token);
                    localStorage.setItem('oriel_user_data', JSON.stringify(user));
                    
                    // Update API client with token
                    this.apiClient.saveToken(token);
                    
                    // Set up token refresh
                    this.setupTokenRefresh();
                    
                    // Notify state change
                    this.notifyStateChange();
                }
                
                // Show success notification
                const successMessage = message || 'Registration successful!';
                this.notificationManager.show(successMessage, 'success');
                
                return { success: true, user, requiresVerification: !token };
            } else {
                throw new Error(response.data?.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            if (error.status === 409) {
                errorMessage = 'An account with this email already exists.';
            } else if (error.status === 400) {
                errorMessage = error.response?.data?.message || 'Invalid registration data.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            this.notificationManager.show(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    /**
     * User logout
     */
    async logout() {
        try {
            // Call backend logout endpoint if authenticated
            if (this.isAuthenticated && this.token) {
                await this.apiClient.post(this.appConfig.config.endpoints.auth.logout);
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with local logout even if API call fails
        }
        
        // Clear local state
        this.clearAuthState();
        
        // Show success notification
        this.notificationManager.show('Logged out successfully', 'info');
        
        return { success: true };
    }

    /**
     * Refresh JWT token
     */
    async refreshToken() {
        if (!this.token) {
            return { success: false, error: 'No token to refresh' };
        }
        
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.auth.refresh,
                { token: this.token }
            );

            if (response.ok && response.data) {
                const { token, user } = response.data;
                
                // Update stored data
                this.token = token;
                if (user) {
                    this.user = user;
                }
                
                // Persist to localStorage
                localStorage.setItem('oriel_jwt_token', token);
                if (user) {
                    localStorage.setItem('oriel_user_data', JSON.stringify(user));
                }
                
                // Update API client with new token
                this.apiClient.saveToken(token);
                
                // Set up next refresh
                this.setupTokenRefresh();
                
                // Notify state change
                this.notifyStateChange();
                
                return { success: true, token };
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            
            // If refresh fails, logout user
            this.clearAuthState();
            this.notificationManager.show('Session expired. Please log in again.', 'warning');
            
            return { success: false, error: 'Token refresh failed' };
        }
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        // Clear timers
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear state
        this.user = null;
        this.isAuthenticated = false;
        this.token = null;
        
        // Clear stored data
        this.clearStoredData();
        
        // Clear API client token
        this.apiClient.saveToken(null);
        
        // Notify state change
        this.notifyStateChange();
    }

    /**
     * Clear stored authentication data
     */
    clearStoredData() {
        localStorage.removeItem('oriel_jwt_token');
        localStorage.removeItem('oriel_user_data');
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            token: this.token
        };
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.user) {
            return false;
        }
        
        const userPlan = this.user.plan || 'free';
        return this.appConfig.hasPermission(userPlan, permission);
    }

    /**
     * Get user's plan information
     */
    getUserPlan() {
        if (!this.isAuthenticated || !this.user) {
            return this.appConfig.getPlan('free');
        }
        
        return this.appConfig.getPlan(this.user.plan || 'free');
    }

    /**
     * Add state change listener
     */
    onStateChange(callback) {
        this.stateChangeListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.stateChangeListeners.indexOf(callback);
            if (index > -1) {
                this.stateChangeListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all state change listeners
     */
    notifyStateChange() {
        const authState = this.getAuthStatus();
        this.stateChangeListeners.forEach(callback => {
            try {
                callback(authState);
            } catch (error) {
                console.error('Error in auth state change listener:', error);
            }
        });
    }

    /**
     * Password reset request
     */
    async requestPasswordReset(email) {
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.auth.resetPassword,
                { email }
            );

            if (response.ok) {
                this.notificationManager.show(
                    'Password reset instructions sent to your email', 
                    'success'
                );
                return { success: true };
            } else {
                throw new Error(response.data?.message || 'Password reset request failed');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            
            const errorMessage = error.response?.data?.message || 
                'Failed to send password reset email. Please try again.';
            
            this.notificationManager.show(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Verify email address
     */
    async verifyEmail(token) {
        try {
            const response = await this.apiClient.post(
                this.appConfig.config.endpoints.auth.verifyEmail,
                { token }
            );

            if (response.ok) {
                // Update user data if verification affects user state
                if (response.data.user) {
                    this.user = { ...this.user, ...response.data.user };
                    localStorage.setItem('oriel_user_data', JSON.stringify(this.user));
                    this.notifyStateChange();
                }
                
                this.notificationManager.show('Email verified successfully!', 'success');
                return { success: true };
            } else {
                throw new Error(response.data?.message || 'Email verification failed');
            }
        } catch (error) {
            console.error('Email verification error:', error);
            
            const errorMessage = error.response?.data?.message || 
                'Email verification failed. Please try again.';
            
            this.notificationManager.show(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        if (!this.isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }
        
        try {
            const response = await this.apiClient.put(
                this.appConfig.config.endpoints.user.profile,
                profileData
            );

            if (response.ok && response.data.user) {
                // Update local user data
                this.user = { ...this.user, ...response.data.user };
                localStorage.setItem('oriel_user_data', JSON.stringify(this.user));
                
                // Notify state change
                this.notifyStateChange();
                
                this.notificationManager.show('Profile updated successfully!', 'success');
                return { success: true, user: this.user };
            } else {
                throw new Error(response.data?.message || 'Profile update failed');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            
            const errorMessage = error.response?.data?.message || 
                'Failed to update profile. Please try again.';
            
            this.notificationManager.show(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Initialize authentication manager
     */
    static async initialize() {
        // Wait for dependencies to be available
        if (!window.ApiClient || !window.appConfig || !window.notificationManager) {
            throw new Error('AuthManager dependencies not available');
        }
        
        const apiClient = new window.ApiClient(window.appConfig.getApiBaseUrl());
        const authManager = new AuthManager(apiClient, window.appConfig, window.notificationManager);
        
        return authManager;
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;