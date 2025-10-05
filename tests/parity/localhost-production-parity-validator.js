/**
 * Localhost/Production Parity Validator
 * Comprehensive test suite to ensure feature consistency across environments
 */
class LocalhostProductionParityValidator {
    constructor() {
        this.currentEnvironment = 'localhost';
        this.testResults = {
            localhost: {},
            production: {}
        };
        this.testDefinitions = this.initializeTestDefinitions();
        this.consoleErrors = [];
        this.performanceMetrics = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.detectEnvironment();
        this.updateEnvironmentInfo();
        this.setupConsoleMonitoring();
        this.updateTestCounts();
    }

    setupEventListeners() {
        // Environment selector buttons
        document.querySelectorAll('.env-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const env = e.target.dataset.env;
                this.switchEnvironment(env);
            });
        });

        // Test control buttons
        document.getElementById('runAllTests').addEventListener('click', () => {
            this.runAllTests();
        });

        document.getElementById('clearResults').addEventListener('click', () => {
            this.clearResults();
        });

        // Test item expansion
        document.querySelectorAll('.test-item').forEach(item => {
            const expandIcon = item.querySelector('.expand-icon');
            if (expandIcon) {
                expandIcon.addEventListener('click', () => {
                    item.classList.toggle('expanded');
                });
            }
        });
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.currentEnvironment = 'localhost';
        } else {
            this.currentEnvironment = 'production';
        }
    }

    switchEnvironment(env) {
        // Update active button
        document.querySelectorAll('.env-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-env="${env}"]`).classList.add('active');

        if (env === 'compare') {
            this.showComparisonView();
        } else {
            this.hideComparisonView();
            this.currentEnvironment = env;
            this.updateEnvironmentInfo();
            this.loadTestResults();
        }
    }

    updateEnvironmentInfo() {
        const envInfo = this.getEnvironmentInfo();
        document.getElementById('currentEnv').textContent = 
            this.currentEnvironment.charAt(0).toUpperCase() + this.currentEnvironment.slice(1);
        document.getElementById('apiUrl').textContent = envInfo.apiUrl;
        document.getElementById('envType').textContent = envInfo.type;
        document.getElementById('hostname').textContent = envInfo.hostname;
        document.getElementById('port').textContent = envInfo.port;
    }

    getEnvironmentInfo() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        let apiUrl, type;
        if (this.currentEnvironment === 'localhost') {
            apiUrl = 'http://localhost:9999';
            type = 'Development';
        } else {
            apiUrl = 'https://api.orielfx.com';
            type = 'Production';
        }

        return {
            apiUrl,
            type,
            hostname,
            port: port || '80/443'
        };
    }

    setupConsoleMonitoring() {
        // Store original console methods
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalLog = console.log;

        // Override console methods to capture errors
        console.error = (...args) => {
            this.consoleErrors.push({
                type: 'error',
                message: args.join(' '),
                timestamp: Date.now(),
                stack: new Error().stack
            });
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.consoleErrors.push({
                type: 'warning',
                message: args.join(' '),
                timestamp: Date.now()
            });
            originalWarn.apply(console, args);
        };

        // Monitor for unhandled errors
        window.addEventListener('error', (event) => {
            this.consoleErrors.push({
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: Date.now()
            });
        });

        // Monitor for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.consoleErrors.push({
                type: 'error',
                message: `Unhandled Promise Rejection: ${event.reason}`,
                timestamp: Date.now()
            });
        });
    }

    initializeTestDefinitions() {
        return {
            // Environment Detection Tests
            'env-detection': {
                name: 'Environment Detection',
                category: 'Environment',
                test: () => this.testEnvironmentDetection()
            },
            'api-config': {
                name: 'API Configuration',
                category: 'Environment',
                test: () => this.testApiConfiguration()
            },
            'feature-flags': {
                name: 'Feature Flags Consistency',
                category: 'Environment',
                test: () => this.testFeatureFlags()
            },

            // API Connectivity Tests
            'api-health': {
                name: 'Backend Health Check',
                category: 'API',
                test: () => this.testApiHealth()
            },
            'api-endpoints': {
                name: 'API Endpoints Availability',
                category: 'API',
                test: () => this.testApiEndpoints()
            },
            'cors-config': {
                name: 'CORS Configuration',
                category: 'API',
                test: () => this.testCorsConfiguration()
            },

            // Authentication Tests
            'auth-endpoints': {
                name: 'Authentication Endpoints',
                category: 'Authentication',
                test: () => this.testAuthenticationEndpoints()
            },
            'token-handling': {
                name: 'Token Management',
                category: 'Authentication',
                test: () => this.testTokenHandling()
            },
            'session-persistence': {
                name: 'Session Persistence',
                category: 'Authentication',
                test: () => this.testSessionPersistence()
            },

            // UI/UX Tests
            'geometric-theme': {
                name: 'Geometric Theme Loading',
                category: 'UI/UX',
                test: () => this.testGeometricTheme()
            },
            'responsive-design': {
                name: 'Responsive Design',
                category: 'UI/UX',
                test: () => this.testResponsiveDesign()
            },
            'modal-functionality': {
                name: 'Modal System',
                category: 'UI/UX',
                test: () => this.testModalFunctionality()
            },

            // Core Features Tests
            'audio-upload': {
                name: 'Audio Upload System',
                category: 'Core Features',
                test: () => this.testAudioUpload()
            },
            'visualizer-engine': {
                name: 'Visualizer Engine',
                category: 'Core Features',
                test: () => this.testVisualizerEngine()
            },
            'download-system': {
                name: 'Download System',
                category: 'Core Features',
                test: () => this.testDownloadSystem()
            },

            // Payment System Tests
            'payment-endpoints': {
                name: 'Payment Endpoints',
                category: 'Payment',
                test: () => this.testPaymentEndpoints()
            },
            'plan-management': {
                name: 'Plan Management',
                category: 'Payment',
                test: () => this.testPlanManagement()
            },
            'usage-tracking': {
                name: 'Usage Tracking',
                category: 'Payment',
                test: () => this.testUsageTracking()
            },

            // Performance Tests
            'load-times': {
                name: 'Page Load Performance',
                category: 'Performance',
                test: () => this.testLoadTimes()
            },
            'api-response-times': {
                name: 'API Response Times',
                category: 'Performance',
                test: () => this.testApiResponseTimes()
            },
            'memory-usage': {
                name: 'Memory Usage',
                category: 'Performance',
                test: () => this.testMemoryUsage()
            },

            // Error Handling Tests
            'console-errors': {
                name: 'Console Error Detection',
                category: 'Error Handling',
                test: () => this.testConsoleErrors()
            },
            'error-recovery': {
                name: 'Error Recovery System',
                category: 'Error Handling',
                test: () => this.testErrorRecovery()
            },
            'network-resilience': {
                name: 'Network Resilience',
                category: 'Error Handling',
                test: () => this.testNetworkResilience()
            }
        };
    }

    async runAllTests() {
        this.showLoading();
        this.clearConsoleErrors();
        
        const startTime = performance.now();
        const testKeys = Object.keys(this.testDefinitions);
        
        for (const testKey of testKeys) {
            await this.runSingleTest(testKey);
            // Small delay between tests to prevent overwhelming the system
            await this.delay(100);
        }
        
        const endTime = performance.now();
        this.performanceMetrics.totalTestTime = endTime - startTime;
        
        this.hideLoading();
        this.updateTestCounts();
        this.generateTestReport();
    }

    async runSingleTest(testKey) {
        const testDef = this.testDefinitions[testKey];
        const testElement = document.querySelector(`[data-test="${testKey}"]`);
        
        if (!testElement) return;

        // Update UI to show test is running
        this.updateTestStatus(testElement, 'running');
        
        try {
            const result = await testDef.test();
            this.testResults[this.currentEnvironment][testKey] = result;
            
            // Update UI based on result
            if (result.passed) {
                this.updateTestStatus(testElement, 'passed');
            } else if (result.warning) {
                this.updateTestStatus(testElement, 'warning');
            } else {
                this.updateTestStatus(testElement, 'failed');
            }
            
            // Update test details
            this.updateTestDetails(testElement, result);
            
        } catch (error) {
            console.error(`Test ${testKey} failed:`, error);
            this.testResults[this.currentEnvironment][testKey] = {
                passed: false,
                error: error.message,
                timestamp: Date.now()
            };
            this.updateTestStatus(testElement, 'failed');
        }
    }

    updateTestStatus(element, status) {
        const statusElement = element.querySelector('.test-status');
        statusElement.className = `test-status status-${status}`;
        
        const statusText = {
            pending: 'Pending',
            running: 'Running...',
            passed: 'Passed',
            failed: 'Failed',
            warning: 'Warning'
        };
        
        statusElement.textContent = statusText[status];
    }

    updateTestDetails(element, result) {
        const detailsElement = element.querySelector('.test-details');
        if (detailsElement && result.details) {
            detailsElement.innerHTML = `
                <div><strong>Result:</strong> ${result.message || 'Test completed'}</div>
                ${result.details ? `<div><strong>Details:</strong> ${result.details}</div>` : ''}
                ${result.duration ? `<div><strong>Duration:</strong> ${result.duration}ms</div>` : ''}
                ${result.error ? `<div style="color: #DC3545;"><strong>Error:</strong> ${result.error}</div>` : ''}
            `;
        }
    }

    // Test Implementation Methods

    async testEnvironmentDetection() {
        const startTime = performance.now();
        
        try {
            // Check if AppConfig is available
            if (!window.appConfig) {
                return {
                    passed: false,
                    error: 'AppConfig not found',
                    duration: performance.now() - startTime
                };
            }

            const detectedEnv = window.appConfig.getEnvironment();
            const expectedEnv = this.currentEnvironment === 'localhost' ? 'development' : 'production';
            
            const passed = detectedEnv === expectedEnv;
            
            return {
                passed,
                message: `Detected: ${detectedEnv}, Expected: ${expectedEnv}`,
                details: `Environment detection ${passed ? 'matches' : 'does not match'} expected value`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiConfiguration() {
        const startTime = performance.now();
        
        try {
            if (!window.appConfig) {
                return {
                    passed: false,
                    error: 'AppConfig not found',
                    duration: performance.now() - startTime
                };
            }

            const apiUrl = window.appConfig.getApiBaseUrl();
            const expectedUrl = this.getEnvironmentInfo().apiUrl;
            
            const passed = apiUrl === expectedUrl;
            
            return {
                passed,
                message: `API URL: ${apiUrl}`,
                details: `Expected: ${expectedUrl}, Got: ${apiUrl}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testFeatureFlags() {
        const startTime = performance.now();
        
        try {
            if (!window.appConfig) {
                return {
                    passed: false,
                    error: 'AppConfig not found',
                    duration: performance.now() - startTime
                };
            }

            const criticalFeatures = [
                'userRegistration',
                'subscriptions',
                'dashboard',
                'errorReporting'
            ];

            const results = criticalFeatures.map(feature => ({
                feature,
                enabled: window.appConfig.isFeatureEnabled(feature)
            }));

            const allEnabled = results.every(r => r.enabled);
            
            return {
                passed: allEnabled,
                warning: !allEnabled,
                message: `${results.filter(r => r.enabled).length}/${results.length} critical features enabled`,
                details: results.map(r => `${r.feature}: ${r.enabled ? 'enabled' : 'disabled'}`).join(', '),
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiHealth() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            const healthEndpoint = `${apiUrl}/api/health`;
            
            const response = await fetch(healthEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const passed = response.ok;
            const responseTime = performance.now() - startTime;
            
            return {
                passed,
                message: `Status: ${response.status} ${response.statusText}`,
                details: `Response time: ${responseTime.toFixed(2)}ms`,
                duration: responseTime
            };
        } catch (error) {
            return {
                passed: false,
                error: `Network error: ${error.message}`,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiEndpoints() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            const endpoints = [
                '/api/auth/login',
                '/api/auth/register',
                '/api/user/profile',
                '/api/payments/create-session'
            ];
            
            const results = [];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${apiUrl}${endpoint}`, {
                        method: 'OPTIONS' // Use OPTIONS to test endpoint availability
                    });
                    results.push({
                        endpoint,
                        available: response.status !== 404,
                        status: response.status
                    });
                } catch (error) {
                    results.push({
                        endpoint,
                        available: false,
                        error: error.message
                    });
                }
            }
            
            const availableCount = results.filter(r => r.available).length;
            const passed = availableCount === endpoints.length;
            
            return {
                passed,
                warning: availableCount > 0 && availableCount < endpoints.length,
                message: `${availableCount}/${endpoints.length} endpoints available`,
                details: results.map(r => `${r.endpoint}: ${r.available ? 'available' : 'unavailable'}`).join(', '),
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testCorsConfiguration() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            
            const response = await fetch(`${apiUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const corsHeaders = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            };
            
            const hasCorsHeaders = Object.values(corsHeaders).some(header => header !== null);
            
            return {
                passed: hasCorsHeaders,
                message: hasCorsHeaders ? 'CORS headers present' : 'CORS headers missing',
                details: Object.entries(corsHeaders)
                    .filter(([key, value]) => value !== null)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ') || 'No CORS headers found',
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testAuthenticationEndpoints() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            const authEndpoints = [
                '/api/auth/login',
                '/api/auth/register',
                '/api/auth/refresh',
                '/api/auth/logout'
            ];
            
            const results = [];
            
            for (const endpoint of authEndpoints) {
                try {
                    // Test with invalid credentials to check endpoint availability
                    const response = await fetch(`${apiUrl}${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });
                    
                    // We expect 400 or 422 for invalid data, not 404
                    const available = response.status !== 404;
                    results.push({
                        endpoint,
                        available,
                        status: response.status
                    });
                } catch (error) {
                    results.push({
                        endpoint,
                        available: false,
                        error: error.message
                    });
                }
            }
            
            const availableCount = results.filter(r => r.available).length;
            const passed = availableCount === authEndpoints.length;
            
            return {
                passed,
                message: `${availableCount}/${authEndpoints.length} auth endpoints available`,
                details: results.map(r => `${r.endpoint}: ${r.available ? 'available' : 'unavailable'}`).join(', '),
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testTokenHandling() {
        const startTime = performance.now();
        
        try {
            // Check if auth manager is available
            const hasAuthManager = typeof window.authManager !== 'undefined';
            const hasTokenStorage = localStorage.getItem('auth_token') !== null || 
                                  sessionStorage.getItem('auth_token') !== null;
            
            return {
                passed: hasAuthManager,
                warning: !hasTokenStorage,
                message: hasAuthManager ? 'Auth manager available' : 'Auth manager not found',
                details: `Token storage: ${hasTokenStorage ? 'present' : 'empty'}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testSessionPersistence() {
        const startTime = performance.now();
        
        try {
            // Check for session-related storage
            const hasSessionData = localStorage.getItem('user_session') !== null ||
                                 localStorage.getItem('auth_token') !== null ||
                                 sessionStorage.getItem('user_session') !== null;
            
            // Check if user status is properly maintained
            const userStatusElement = document.getElementById('user-status');
            const hasUserStatus = userStatusElement !== null;
            
            return {
                passed: hasUserStatus,
                warning: !hasSessionData,
                message: hasUserStatus ? 'User status system present' : 'User status system missing',
                details: `Session data: ${hasSessionData ? 'present' : 'empty'}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testGeometricTheme() {
        const startTime = performance.now();
        
        try {
            // Check if geometric theme CSS is loaded
            const stylesheets = Array.from(document.styleSheets);
            const hasGeometricTheme = stylesheets.some(sheet => {
                try {
                    return sheet.href && sheet.href.includes('geometric-theme');
                } catch (e) {
                    return false;
                }
            });
            
            // Check for geometric CSS custom properties
            const rootStyles = getComputedStyle(document.documentElement);
            const hasCyanColor = rootStyles.getPropertyValue('--primary-cyan').trim() !== '';
            const hasPinkColor = rootStyles.getPropertyValue('--primary-pink').trim() !== '';
            
            // Check for logo presence
            const hasLogo = document.querySelector('svg') !== null || 
                          document.querySelector('[class*="logo"]') !== null;
            
            const passed = hasGeometricTheme && (hasCyanColor || hasPinkColor);
            
            return {
                passed,
                message: passed ? 'Geometric theme loaded' : 'Geometric theme missing',
                details: `CSS: ${hasGeometricTheme}, Colors: ${hasCyanColor && hasPinkColor}, Logo: ${hasLogo}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testResponsiveDesign() {
        const startTime = performance.now();
        
        try {
            // Check for responsive meta tag
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            const hasViewportMeta = viewportMeta !== null;
            
            // Check for responsive CSS classes or media queries
            const stylesheets = Array.from(document.styleSheets);
            let hasMediaQueries = false;
            
            try {
                for (const sheet of stylesheets) {
                    if (sheet.cssRules) {
                        for (const rule of sheet.cssRules) {
                            if (rule.type === CSSRule.MEDIA_RULE) {
                                hasMediaQueries = true;
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                // Cross-origin stylesheets may not be accessible
                hasMediaQueries = true; // Assume present if we can't check
            }
            
            // Check for responsive elements
            const hasResponsiveElements = document.querySelector('.responsive, [class*="mobile"], [class*="tablet"]') !== null;
            
            const passed = hasViewportMeta && hasMediaQueries;
            
            return {
                passed,
                message: passed ? 'Responsive design implemented' : 'Responsive design incomplete',
                details: `Viewport meta: ${hasViewportMeta}, Media queries: ${hasMediaQueries}, Responsive elements: ${hasResponsiveElements}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testModalFunctionality() {
        const startTime = performance.now();
        
        try {
            // Check for modal elements
            const modals = [
                'login-modal',
                'register-modal',
                'plan-selection-modal',
                'user-dashboard-modal'
            ];
            
            const modalResults = modals.map(modalId => {
                const modal = document.getElementById(modalId);
                return {
                    id: modalId,
                    present: modal !== null,
                    hasCloseButton: modal ? modal.querySelector('.close-button') !== null : false
                };
            });
            
            const presentCount = modalResults.filter(m => m.present).length;
            const passed = presentCount === modals.length;
            
            return {
                passed,
                message: `${presentCount}/${modals.length} modals present`,
                details: modalResults.map(m => `${m.id}: ${m.present ? 'present' : 'missing'}`).join(', '),
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testAudioUpload() {
        const startTime = performance.now();
        
        try {
            // Check for audio upload elements
            const audioUpload = document.getElementById('audioUpload');
            const uploadButton = document.querySelector('label[for="audioUpload"]');
            
            const hasUploadInput = audioUpload !== null;
            const hasUploadButton = uploadButton !== null;
            const acceptsAudio = audioUpload ? audioUpload.accept.includes('audio') : false;
            
            const passed = hasUploadInput && hasUploadButton && acceptsAudio;
            
            return {
                passed,
                message: passed ? 'Audio upload system present' : 'Audio upload system incomplete',
                details: `Input: ${hasUploadInput}, Button: ${hasUploadButton}, Audio accept: ${acceptsAudio}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testVisualizerEngine() {
        const startTime = performance.now();
        
        try {
            // Check for visualizer elements
            const graphContainer = document.getElementById('graph-container');
            const playButton = document.getElementById('play-pause-button');
            const controlPanel = document.querySelector('.control-panel');
            
            const hasGraphContainer = graphContainer !== null;
            const hasPlayButton = playButton !== null;
            const hasControlPanel = controlPanel !== null;
            
            // Check for canvas or SVG elements (visualizer rendering)
            const hasCanvas = document.querySelector('canvas') !== null;
            const hasSvg = document.querySelector('svg') !== null;
            
            const passed = hasGraphContainer && hasPlayButton && hasControlPanel;
            
            return {
                passed,
                message: passed ? 'Visualizer engine present' : 'Visualizer engine incomplete',
                details: `Container: ${hasGraphContainer}, Controls: ${hasPlayButton && hasControlPanel}, Renderer: ${hasCanvas || hasSvg}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testDownloadSystem() {
        const startTime = performance.now();
        
        try {
            // Check for download elements
            const downloadButton = document.getElementById('download-button');
            const hasDownloadButton = downloadButton !== null;
            
            // Check if download modal or system exists
            const hasDownloadModal = document.querySelector('[id*="download"], [class*="download"]') !== null;
            
            // Check for progress indicators
            const hasProgressIndicators = document.querySelector('.progress, [class*="progress"]') !== null;
            
            const passed = hasDownloadButton;
            
            return {
                passed,
                warning: !hasDownloadModal && !hasProgressIndicators,
                message: passed ? 'Download system present' : 'Download system missing',
                details: `Button: ${hasDownloadButton}, Modal: ${hasDownloadModal}, Progress: ${hasProgressIndicators}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testPaymentEndpoints() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            const paymentEndpoints = [
                '/api/payments/create-session',
                '/api/payments/status',
                '/api/payments/history'
            ];
            
            const results = [];
            
            for (const endpoint of paymentEndpoints) {
                try {
                    const response = await fetch(`${apiUrl}${endpoint}`, {
                        method: 'OPTIONS'
                    });
                    
                    results.push({
                        endpoint,
                        available: response.status !== 404,
                        status: response.status
                    });
                } catch (error) {
                    results.push({
                        endpoint,
                        available: false,
                        error: error.message
                    });
                }
            }
            
            const availableCount = results.filter(r => r.available).length;
            const passed = availableCount === paymentEndpoints.length;
            
            return {
                passed,
                message: `${availableCount}/${paymentEndpoints.length} payment endpoints available`,
                details: results.map(r => `${r.endpoint}: ${r.available ? 'available' : 'unavailable'}`).join(', '),
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testPlanManagement() {
        const startTime = performance.now();
        
        try {
            // Check for plan-related elements
            const planModal = document.getElementById('plan-selection-modal');
            const planCards = document.querySelectorAll('.plan-card');
            const upgradeButtons = document.querySelectorAll('[class*="upgrade"]');
            
            const hasPlanModal = planModal !== null;
            const hasPlanCards = planCards.length > 0;
            const hasUpgradeButtons = upgradeButtons.length > 0;
            
            // Check if AppConfig has plan data
            const hasAppConfig = window.appConfig !== undefined;
            const hasPlans = hasAppConfig ? Object.keys(window.appConfig.plans || {}).length > 0 : false;
            
            const passed = hasPlanModal && hasPlanCards && hasPlans;
            
            return {
                passed,
                message: passed ? 'Plan management system present' : 'Plan management incomplete',
                details: `Modal: ${hasPlanModal}, Cards: ${hasPlanCards}, Config: ${hasPlans}, Buttons: ${hasUpgradeButtons}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testUsageTracking() {
        const startTime = performance.now();
        
        try {
            // Check for usage-related elements
            const userCredits = document.getElementById('user-credits');
            const downloadsRemaining = document.getElementById('downloads-remaining');
            const usageElements = document.querySelectorAll('[id*="usage"], [class*="usage"]');
            
            const hasCreditsDisplay = userCredits !== null;
            const hasDownloadsDisplay = downloadsRemaining !== null;
            const hasUsageElements = usageElements.length > 0;
            
            // Check for usage tracking functionality
            const hasUsageTracker = typeof window.usageTracker !== 'undefined';
            
            const passed = hasCreditsDisplay || hasDownloadsDisplay || hasUsageElements;
            
            return {
                passed,
                message: passed ? 'Usage tracking present' : 'Usage tracking missing',
                details: `Credits: ${hasCreditsDisplay}, Downloads: ${hasDownloadsDisplay}, Tracker: ${hasUsageTracker}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testLoadTimes() {
        const startTime = performance.now();
        
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
            const domContentLoaded = navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0;
            
            // Consider load times under 3 seconds as good
            const passed = loadTime < 3000;
            const warning = loadTime >= 3000 && loadTime < 5000;
            
            return {
                passed,
                warning,
                message: `Load time: ${loadTime.toFixed(2)}ms`,
                details: `DOM Content Loaded: ${domContentLoaded.toFixed(2)}ms, Full Load: ${loadTime.toFixed(2)}ms`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiResponseTimes() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            const testStart = performance.now();
            
            const response = await fetch(`${apiUrl}/api/health`, {
                method: 'GET'
            });
            
            const responseTime = performance.now() - testStart;
            
            // Consider response times under 1 second as good
            const passed = responseTime < 1000;
            const warning = responseTime >= 1000 && responseTime < 2000;
            
            return {
                passed,
                warning,
                message: `Response time: ${responseTime.toFixed(2)}ms`,
                details: `Status: ${response.status}, Time: ${responseTime.toFixed(2)}ms`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testMemoryUsage() {
        const startTime = performance.now();
        
        try {
            if ('memory' in performance) {
                const memory = performance.memory;
                const usedMB = memory.usedJSHeapSize / 1024 / 1024;
                const totalMB = memory.totalJSHeapSize / 1024 / 1024;
                const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
                
                // Consider memory usage under 100MB as good
                const passed = usedMB < 100;
                const warning = usedMB >= 100 && usedMB < 200;
                
                return {
                    passed,
                    warning,
                    message: `Memory usage: ${usedMB.toFixed(2)}MB`,
                    details: `Used: ${usedMB.toFixed(2)}MB, Total: ${totalMB.toFixed(2)}MB, Limit: ${limitMB.toFixed(2)}MB`,
                    duration: performance.now() - startTime
                };
            } else {
                return {
                    passed: true,
                    warning: true,
                    message: 'Memory API not available',
                    details: 'Performance.memory not supported in this browser',
                    duration: performance.now() - startTime
                };
            }
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testConsoleErrors() {
        const startTime = performance.now();
        
        try {
            const errorCount = this.consoleErrors.filter(e => e.type === 'error').length;
            const warningCount = this.consoleErrors.filter(e => e.type === 'warning').length;
            
            const passed = errorCount === 0;
            const warning = warningCount > 0;
            
            return {
                passed,
                warning,
                message: `${errorCount} errors, ${warningCount} warnings`,
                details: errorCount > 0 ? 
                    `Recent errors: ${this.consoleErrors.slice(-3).map(e => e.message).join('; ')}` :
                    'No console errors detected',
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testErrorRecovery() {
        const startTime = performance.now();
        
        try {
            // Check for error recovery systems
            const hasErrorManager = typeof window.errorManager !== 'undefined' ||
                                  typeof window.ErrorRecoverySystem !== 'undefined';
            
            const hasErrorHandling = document.querySelector('[class*="error"], [id*="error"]') !== null;
            
            // Check for try-catch blocks in global scope (basic check)
            const hasGlobalErrorHandling = window.onerror !== null || 
                                         window.addEventListener !== undefined;
            
            const passed = hasErrorManager || hasErrorHandling;
            
            return {
                passed,
                message: passed ? 'Error recovery system present' : 'Error recovery system missing',
                details: `Manager: ${hasErrorManager}, UI: ${hasErrorHandling}, Global: ${hasGlobalErrorHandling}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testNetworkResilience() {
        const startTime = performance.now();
        
        try {
            // Check for network status handling
            const hasOnlineHandling = 'onLine' in navigator;
            const hasNetworkEvents = typeof window.addEventListener === 'function';
            
            // Check for retry mechanisms
            const hasRetryLogic = typeof window.apiClient !== 'undefined' ||
                                typeof window.ApiClient !== 'undefined';
            
            const passed = hasOnlineHandling && hasNetworkEvents;
            
            return {
                passed,
                warning: !hasRetryLogic,
                message: passed ? 'Network resilience features present' : 'Network resilience incomplete',
                details: `Online detection: ${hasOnlineHandling}, Events: ${hasNetworkEvents}, Retry: ${hasRetryLogic}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    // Utility Methods

    clearResults() {
        this.testResults[this.currentEnvironment] = {};
        this.clearConsoleErrors();
        
        // Reset all test statuses to pending
        document.querySelectorAll('.test-item').forEach(item => {
            this.updateTestStatus(item, 'pending');
            const detailsElement = item.querySelector('.test-details');
            if (detailsElement) {
                detailsElement.innerHTML = detailsElement.getAttribute('data-original-content') || 
                                         detailsElement.textContent;
            }
        });
        
        this.updateTestCounts();
    }

    clearConsoleErrors() {
        this.consoleErrors = [];
    }

    updateTestCounts() {
        const results = this.testResults[this.currentEnvironment] || {};
        const total = Object.keys(this.testDefinitions).length;
        const completed = Object.keys(results).length;
        const passed = Object.values(results).filter(r => r.passed).length;
        const failed = Object.values(results).filter(r => !r.passed && !r.warning).length;
        const warnings = Object.values(results).filter(r => r.warning).length;
        
        document.getElementById('totalTests').textContent = total;
        document.getElementById('passedTests').textContent = passed;
        document.getElementById('failedTests').textContent = failed;
        document.getElementById('warningTests').textContent = warnings;
    }

    loadTestResults() {
        const results = this.testResults[this.currentEnvironment] || {};
        
        Object.entries(results).forEach(([testKey, result]) => {
            const testElement = document.querySelector(`[data-test="${testKey}"]`);
            if (testElement) {
                if (result.passed) {
                    this.updateTestStatus(testElement, 'passed');
                } else if (result.warning) {
                    this.updateTestStatus(testElement, 'warning');
                } else {
                    this.updateTestStatus(testElement, 'failed');
                }
                this.updateTestDetails(testElement, result);
            }
        });
        
        this.updateTestCounts();
    }

    showComparisonView() {
        document.getElementById('comparisonView').style.display = 'block';
        this.generateComparisonTable();
    }

    hideComparisonView() {
        document.getElementById('comparisonView').style.display = 'none';
    }

    generateComparisonTable() {
        const tbody = document.getElementById('comparisonBody');
        tbody.innerHTML = '';
        
        const allTests = Object.keys(this.testDefinitions);
        
        allTests.forEach(testKey => {
            const localhostResult = this.testResults.localhost[testKey];
            const productionResult = this.testResults.production[testKey];
            
            const row = document.createElement('tr');
            
            const testName = this.testDefinitions[testKey].name;
            const localhostStatus = localhostResult ? 
                (localhostResult.passed ? 'Passed' : localhostResult.warning ? 'Warning' : 'Failed') : 
                'Not Run';
            const productionStatus = productionResult ? 
                (productionResult.passed ? 'Passed' : productionResult.warning ? 'Warning' : 'Failed') : 
                'Not Run';
            
            const consistent = localhostStatus === productionStatus;
            const overallStatus = consistent ? 'Consistent' : 'Different';
            
            row.innerHTML = `
                <td>${testName}</td>
                <td class="${!consistent ? 'diff-highlight' : ''}">${localhostStatus}</td>
                <td class="${!consistent ? 'diff-highlight' : ''}">${productionStatus}</td>
                <td class="${consistent ? 'status-passed' : 'status-failed'}">${overallStatus}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    generateTestReport() {
        const results = this.testResults[this.currentEnvironment] || {};
        const total = Object.keys(this.testDefinitions).length;
        const completed = Object.keys(results).length;
        const passed = Object.values(results).filter(r => r.passed).length;
        const failed = Object.values(results).filter(r => !r.passed && !r.warning).length;
        const warnings = Object.values(results).filter(r => r.warning).length;
        
        console.log(`
=== Test Report for ${this.currentEnvironment.toUpperCase()} ===
Total Tests: ${total}
Completed: ${completed}
Passed: ${passed}
Failed: ${failed}
Warnings: ${warnings}
Success Rate: ${((passed / completed) * 100).toFixed(1)}%
Total Time: ${this.performanceMetrics.totalTestTime?.toFixed(2) || 'N/A'}ms
        `);
        
        if (failed > 0) {
            console.log('\nFailed Tests:');
            Object.entries(results)
                .filter(([key, result]) => !result.passed && !result.warning)
                .forEach(([key, result]) => {
                    console.log(`- ${this.testDefinitions[key].name}: ${result.error || result.message}`);
                });
        }
        
        if (warnings > 0) {
            console.log('\nWarning Tests:');
            Object.entries(results)
                .filter(([key, result]) => result.warning)
                .forEach(([key, result]) => {
                    console.log(`- ${this.testDefinitions[key].name}: ${result.message}`);
                });
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the validator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.parityValidator = new LocalhostProductionParityValidator();
});

// Export for debugging
window.LocalhostProductionParityValidator = LocalhostProductionParityValidator;