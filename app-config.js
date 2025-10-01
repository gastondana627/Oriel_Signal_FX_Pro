/**
 * Application Configuration Management
 * Handles API endpoints, feature flags, and plan configurations
 */
class AppConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
        this.featureFlags = this.loadFeatureFlags();
        this.plans = this.loadPlanConfiguration();
    }

    /**
     * Detect current environment
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('dev')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    /**
     * Load environment-specific configuration
     */
    loadConfiguration() {
        const baseConfig = {
            development: {
                api: {
                    baseUrl: 'http://localhost:8000',
                    timeout: 10000,
                    retries: 3
                },
                stripe: {
                    publishableKey: 'pk_test_...' // Development Stripe key
                },
                analytics: {
                    enabled: false
                },
                logging: {
                    level: 'debug',
                    enabled: true
                }
            },
            staging: {
                api: {
                    baseUrl: 'https://staging-api.orielfx.com',
                    timeout: 15000,
                    retries: 3
                },
                stripe: {
                    publishableKey: 'pk_test_...' // Staging Stripe key
                },
                analytics: {
                    enabled: true
                },
                logging: {
                    level: 'info',
                    enabled: true
                }
            },
            production: {
                api: {
                    baseUrl: 'https://api.orielfx.com',
                    timeout: 15000,
                    retries: 2
                },
                stripe: {
                    publishableKey: 'pk_live_...' // Production Stripe key
                },
                analytics: {
                    enabled: true
                },
                logging: {
                    level: 'error',
                    enabled: false
                }
            }
        };

        return {
            ...baseConfig[this.environment],
            endpoints: {
                // Authentication endpoints
                auth: {
                    login: '/api/auth/login',
                    register: '/api/auth/register',
                    refresh: '/api/auth/refresh',
                    logout: '/api/auth/logout',
                    resetPassword: '/api/auth/reset-password',
                    verifyEmail: '/api/auth/verify-email'
                },
                // User management endpoints
                user: {
                    profile: '/api/user/profile',
                    usage: '/api/user/usage',
                    history: '/api/user/history',
                    preferences: '/api/user/preferences',
                    trackDownload: '/api/user/track-download',
                    deleteAccount: '/api/user/delete-account'
                },
                // Payment endpoints
                payments: {
                    createSession: '/api/payments/create-session',
                    status: '/api/payments/status',
                    history: '/api/payments/history',
                    cancel: '/api/payments/cancel-subscription',
                    webhook: '/api/payments/webhook'
                },
                // Analytics endpoints
                analytics: {
                    track: '/api/analytics/track',
                    conversion: '/api/analytics/conversion'
                }
            }
        };
    }

    /**
     * Load feature flags
     */
    loadFeatureFlags() {
        return {
            // Authentication features
            userRegistration: true,
            socialLogin: false,
            emailVerification: true,
            
            // Payment features
            subscriptions: true,
            oneTimePayments: true,
            creditSystem: true,
            
            // Premium features
            extendedRecording: true,
            customPresets: true,
            advancedExports: true,
            
            // UI features
            darkMode: true,
            notifications: true,
            dashboard: true,
            
            // Analytics
            userTracking: this.environment !== 'development',
            errorReporting: true,
            performanceMonitoring: this.environment === 'production',
            
            // Experimental features
            offlineMode: false,
            betaFeatures: this.environment === 'development'
        };
    }

    /**
     * Load plan configuration
     */
    loadPlanConfiguration() {
        return {
            free: {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'USD',
                interval: null,
                features: {
                    downloads: 3,
                    maxRecordingTime: 30, // seconds
                    exportFormats: ['gif', 'mp3'],
                    customPresets: 0,
                    priority: 'low',
                    support: 'community'
                },
                limits: {
                    dailyDownloads: 3,
                    monthlyDownloads: 10,
                    maxFileSize: 50 * 1024 * 1024, // 50MB
                    apiCallsPerMinute: 10
                },
                permissions: [
                    'basic_visualizer',
                    'standard_exports',
                    'community_support'
                ]
            },
            starter: {
                id: 'starter',
                name: 'Starter',
                price: 9.99,
                currency: 'USD',
                interval: 'month',
                stripeProductId: 'prod_starter_...',
                stripePriceId: 'price_starter_...',
                features: {
                    downloads: 50,
                    maxRecordingTime: 60, // seconds
                    exportFormats: ['gif', 'mp4', 'mp3', 'wav'],
                    customPresets: 5,
                    priority: 'normal',
                    support: 'email'
                },
                limits: {
                    dailyDownloads: 20,
                    monthlyDownloads: 100,
                    maxFileSize: 200 * 1024 * 1024, // 200MB
                    apiCallsPerMinute: 30
                },
                permissions: [
                    'basic_visualizer',
                    'extended_recording',
                    'premium_exports',
                    'custom_presets',
                    'email_support'
                ]
            },
            pro: {
                id: 'pro',
                name: 'Pro',
                price: 29.99,
                currency: 'USD',
                interval: 'month',
                stripeProductId: 'prod_pro_...',
                stripePriceId: 'price_pro_...',
                features: {
                    downloads: 500,
                    maxRecordingTime: 300, // 5 minutes
                    exportFormats: ['gif', 'mp4', 'webm', 'mp3', 'wav', 'flac'],
                    customPresets: 'unlimited',
                    priority: 'high',
                    support: 'priority'
                },
                limits: {
                    dailyDownloads: 100,
                    monthlyDownloads: 1000,
                    maxFileSize: 1024 * 1024 * 1024, // 1GB
                    apiCallsPerMinute: 100
                },
                permissions: [
                    'basic_visualizer',
                    'extended_recording',
                    'premium_exports',
                    'unlimited_presets',
                    'advanced_customization',
                    'priority_support',
                    'api_access'
                ]
            }
        };
    }

    /**
     * Get API endpoint URL
     */
    getApiUrl(category, endpoint) {
        const categoryEndpoints = this.config.endpoints[category];
        if (!categoryEndpoints || !categoryEndpoints[endpoint]) {
            throw new Error(`Unknown endpoint: ${category}.${endpoint}`);
        }
        return `${this.config.api.baseUrl}${categoryEndpoints[endpoint]}`;
    }

    /**
     * Get full API base URL
     */
    getApiBaseUrl() {
        return this.config.api.baseUrl;
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureName) {
        return this.featureFlags[featureName] === true;
    }

    /**
     * Get plan configuration
     */
    getPlan(planId) {
        return this.plans[planId] || null;
    }

    /**
     * Get all available plans
     */
    getAllPlans() {
        return Object.values(this.plans);
    }

    /**
     * Get plan by Stripe product ID
     */
    getPlanByStripeId(stripeProductId) {
        return Object.values(this.plans).find(plan => 
            plan.stripeProductId === stripeProductId
        ) || null;
    }

    /**
     * Check if user has permission
     */
    hasPermission(userPlan, permission) {
        const plan = this.getPlan(userPlan);
        return plan && plan.permissions.includes(permission);
    }

    /**
     * Get configuration value
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Update configuration at runtime
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
    }

    /**
     * Get environment-specific settings
     */
    getEnvironment() {
        return this.environment;
    }

    /**
     * Check if in development mode
     */
    isDevelopment() {
        return this.environment === 'development';
    }

    /**
     * Check if in production mode
     */
    isProduction() {
        return this.environment === 'production';
    }

    /**
     * Get Stripe configuration
     */
    getStripeConfig() {
        return this.config.stripe;
    }

    /**
     * Get analytics configuration
     */
    getAnalyticsConfig() {
        return this.config.analytics;
    }

    /**
     * Get logging configuration
     */
    getLoggingConfig() {
        return this.config.logging;
    }

    /**
     * Export configuration for debugging
     */
    exportConfig() {
        return {
            environment: this.environment,
            config: this.config,
            featureFlags: this.featureFlags,
            plans: this.plans
        };
    }
}

// Create global instance
window.AppConfig = AppConfig;
window.appConfig = new AppConfig();

// Export for debugging in development
if (window.appConfig.isDevelopment()) {
    window.debugConfig = () => {
        console.log('App Configuration:', window.appConfig.exportConfig());
    };
}