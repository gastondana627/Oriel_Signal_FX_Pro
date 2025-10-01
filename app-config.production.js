/**
 * Production Configuration for Oriel FX SaaS
 * This file contains production-specific settings
 */

class ProductionAppConfig {
    constructor() {
        this.config = {
            // API Configuration
            api: {
                baseUrl: 'https://your-backend-domain.railway.app', // Replace with actual Railway URL
                timeout: 10000,
                retryAttempts: 3,
                endpoints: {
                    auth: {
                        login: '/api/auth/login',
                        register: '/api/auth/register',
                        logout: '/api/auth/logout',
                        refresh: '/api/auth/refresh',
                        status: '/api/auth/status',
                        resetPassword: '/api/auth/reset-password',
                        verifyEmail: '/api/auth/verify-email'
                    },
                    user: {
                        profile: '/api/user/profile',
                        usage: '/api/user/usage',
                        history: '/api/user/download-history',
                        preferences: '/api/user/preferences',
                        exportData: '/api/user/export-data'
                    },
                    payments: {
                        createSession: '/api/payments/create-session',
                        status: '/api/payments/status',
                        history: '/api/payments/history'
                    }
                }
            },

            // Stripe Configuration (Production)
            stripe: {
                publishableKey: 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY', // Replace with actual key
                apiVersion: '2023-10-16'
            },

            // Plan Configuration
            plans: {
                free: {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'USD',
                    downloads: 3,
                    features: {
                        maxRecordingTime: 30,
                        exportFormats: ['gif', 'mp3'],
                        customPresets: 0,
                        priority: 'low',
                        support: 'community'
                    }
                },
                starter: {
                    id: 'starter',
                    name: 'Starter',
                    price: 9.99,
                    currency: 'USD',
                    downloads: 50,
                    features: {
                        maxRecordingTime: 60,
                        exportFormats: ['gif', 'mp3', 'mp4'],
                        customPresets: 5,
                        priority: 'normal',
                        support: 'email'
                    }
                },
                pro: {
                    id: 'pro',
                    name: 'Pro',
                    price: 29.99,
                    currency: 'USD',
                    downloads: 500,
                    features: {
                        maxRecordingTime: 300,
                        exportFormats: ['gif', 'mp3', 'mp4', 'webm', 'mov'],
                        customPresets: -1, // unlimited
                        priority: 'high',
                        support: 'priority',
                        apiAccess: true
                    }
                }
            },

            // Feature Flags
            features: {
                enableAnalytics: true,
                enableErrorReporting: true,
                enablePerformanceMonitoring: true,
                enableOfflineMode: true,
                enablePushNotifications: false,
                enableBetaFeatures: false
            },

            // Analytics Configuration
            analytics: {
                enabled: true,
                trackingId: 'GA_TRACKING_ID', // Replace with actual Google Analytics ID
                events: {
                    trackDownloads: true,
                    trackAuthentication: true,
                    trackPayments: true,
                    trackErrors: true
                }
            },

            // Error Reporting
            errorReporting: {
                enabled: true,
                dsn: 'SENTRY_DSN', // Replace with actual Sentry DSN
                environment: 'production',
                sampleRate: 1.0
            },

            // Performance Monitoring
            performance: {
                enabled: true,
                sampleRate: 0.1, // 10% sampling in production
                thresholds: {
                    pageLoad: 3000, // 3 seconds
                    apiResponse: 1000, // 1 second
                    renderTime: 100 // 100ms
                }
            },

            // Cache Configuration
            cache: {
                enabled: true,
                ttl: {
                    userProfile: 300000, // 5 minutes
                    usageStats: 60000, // 1 minute
                    paymentHistory: 600000, // 10 minutes
                    preferences: 1800000 // 30 minutes
                }
            },

            // Security Configuration
            security: {
                enforceHttps: true,
                csrfProtection: true,
                xssProtection: true,
                contentSecurityPolicy: true,
                tokenRefreshThreshold: 300000 // 5 minutes before expiry
            },

            // UI Configuration
            ui: {
                theme: 'dark',
                animations: true,
                notifications: {
                    position: 'top-right',
                    duration: 5000,
                    maxVisible: 3
                },
                modals: {
                    closeOnBackdrop: true,
                    closeOnEscape: true,
                    animation: 'fade'
                }
            },

            // Development/Debug Settings (disabled in production)
            debug: {
                enabled: false,
                logLevel: 'error',
                showPerformanceMetrics: false,
                mockPayments: false,
                bypassRateLimit: false
            }
        };
    }

    /**
     * Get API base URL
     */
    getApiBaseUrl() {
        return this.config.api.baseUrl;
    }

    /**
     * Get API URL for specific endpoint
     */
    getApiUrl(category, endpoint) {
        const categoryEndpoints = this.config.api.endpoints[category];
        if (!categoryEndpoints || !categoryEndpoints[endpoint]) {
            throw new Error(`API endpoint not found: ${category}.${endpoint}`);
        }
        return `${this.config.api.baseUrl}${categoryEndpoints[endpoint]}`;
    }

    /**
     * Get Stripe configuration
     */
    getStripeConfig() {
        return this.config.stripe;
    }

    /**
     * Get plan configuration
     */
    getPlan(planId) {
        return this.config.plans[planId] || null;
    }

    /**
     * Get all available plans
     */
    getAllPlans() {
        return Object.values(this.config.plans);
    }

    /**
     * Check if user has permission for feature
     */
    hasPermission(userPlan, feature) {
        const plan = this.getPlan(userPlan);
        if (!plan) return false;

        switch (feature) {
            case 'extended_recording':
                return plan.features.maxRecordingTime > 30;
            case 'premium_formats':
                return plan.features.exportFormats.length > 2;
            case 'custom_presets':
                return plan.features.customPresets > 0;
            case 'priority_support':
                return plan.features.support !== 'community';
            case 'api_access':
                return plan.features.apiAccess === true;
            default:
                return false;
        }
    }

    /**
     * Get feature flag value
     */
    isFeatureEnabled(feature) {
        return this.config.features[feature] === true;
    }

    /**
     * Get analytics configuration
     */
    getAnalyticsConfig() {
        return this.config.analytics;
    }

    /**
     * Get error reporting configuration
     */
    getErrorReportingConfig() {
        return this.config.errorReporting;
    }

    /**
     * Get performance monitoring configuration
     */
    getPerformanceConfig() {
        return this.config.performance;
    }

    /**
     * Get cache configuration
     */
    getCacheConfig() {
        return this.config.cache;
    }

    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.config.security;
    }

    /**
     * Get UI configuration
     */
    getUIConfig() {
        return this.config.ui;
    }

    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled() {
        return this.config.debug.enabled;
    }

    /**
     * Get debug configuration
     */
    getDebugConfig() {
        return this.config.debug;
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];

        // Validate API URL
        if (!this.config.api.baseUrl || this.config.api.baseUrl.includes('localhost')) {
            errors.push('Production API URL not configured');
        }

        // Validate Stripe keys
        if (!this.config.stripe.publishableKey || this.config.stripe.publishableKey.includes('YOUR_')) {
            errors.push('Production Stripe publishable key not configured');
        }

        // Validate analytics
        if (this.config.analytics.enabled && this.config.analytics.trackingId === 'GA_TRACKING_ID') {
            errors.push('Google Analytics tracking ID not configured');
        }

        // Validate error reporting
        if (this.config.errorReporting.enabled && this.config.errorReporting.dsn === 'SENTRY_DSN') {
            errors.push('Sentry DSN not configured');
        }

        if (errors.length > 0) {
            console.warn('Production configuration issues:', errors);
            return false;
        }

        return true;
    }
}

// Create global instance
window.appConfig = new ProductionAppConfig();

// Validate configuration on load
if (!window.appConfig.validate()) {
    console.error('❌ Production configuration validation failed');
    console.error('Please update app-config.production.js with actual production values');
}

console.log('✅ Production configuration loaded');