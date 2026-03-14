/**
 * Environment Parity Validator
 * Tests all features work identically on localhost and production
 * Requirements: 4.1, 4.2, 4.3
 */

class EnvironmentParityValidator {
    constructor() {
        this.testResults = [];
        this.environments = {
            localhost: 'http://localhost:3000',
            production: window.location.origin.includes('railway') ? window.location.origin : 'https://oriel-fx-production.railway.app'
        };
        this.currentEnvironment = this.detectEnvironment();
        this.testSuite = new Map();
        this.initializeTestSuite();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'localhost';
        }
        return 'production';
    }

    initializeTestSuite() {
        // Core API endpoint tests
        this.testSuite.set('api_health_check', {
            name: 'API Health Check',
            test: () => this.testApiHealthCheck(),
            critical: true
        });

        this.testSuite.set('authentication_flow', {
            name: 'Authentication Flow',
            test: () => this.testAuthenticationFlow(),
            critical: true
        });

        this.testSuite.set('user_registration', {
            name: 'User Registration',
            test: () => this.testUserRegistration(),
            critical: true
        });

        this.testSuite.set('user_login', {
            name: 'User Login',
            test: () => this.testUserLogin(),
            critical: true
        });

        this.testSuite.set('user_dashboard', {
            name: 'User Dashboard',
            test: () => this.testUserDashboard(),
            critical: true
        });

        this.testSuite.set('audio_upload', {
            name: 'Audio Upload',
            test: () => this.testAudioUpload(),
            critical: true
        });

        this.testSuite.set('download_functionality', {
            name: 'Download Functionality',
            test: () => this.testDownloadFunctionality(),
            critical: true
        });

        this.testSuite.set('payment_system', {
            name: 'Payment System',
            test: () => this.testPaymentSystem(),
            critical: false
        });

        this.testSuite.set('geometric_theme', {
            name: 'Geometric Theme',
            test: () => this.testGeometricTheme(),
            critical: false
        });

        this.testSuite.set('responsive_design', {
            name: 'Responsive Design',
            test: () => this.testResponsiveDesign(),
            critical: false
        });
    }

    async runAllTests() {
        console.log(`🧪 Starting Environment Parity Tests on ${this.currentEnvironment}`);
        
        const results = {
            environment: this.currentEnvironment,
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                critical_failures: 0
            }
        };

        for (const [key, testConfig] of this.testSuite) {
            try {
                console.log(`Running test: ${testConfig.name}`);
                const testResult = await testConfig.test();
                
                const result = {
                    name: testConfig.name,
                    key: key,
                    status: testResult.success ? 'PASS' : 'FAIL',
                    critical: testConfig.critical,
                    details: testResult.details || '',
                    error: testResult.error || null,
                    duration: testResult.duration || 0
                };

                results.tests.push(result);
                results.summary.total++;

                if (testResult.success) {
                    results.summary.passed++;
                    console.log(`✅ ${testConfig.name}: PASSED`);
                } else {
                    results.summary.failed++;
                    if (testConfig.critical) {
                        results.summary.critical_failures++;
                    }
                    console.log(`❌ ${testConfig.name}: FAILED - ${testResult.error}`);
                }

            } catch (error) {
                console.error(`💥 Test ${testConfig.name} threw exception:`, error);
                results.tests.push({
                    name: testConfig.name,
                    key: key,
                    status: 'ERROR',
                    critical: testConfig.critical,
                    error: error.message,
                    duration: 0
                });
                results.summary.total++;
                results.summary.failed++;
                if (testConfig.critical) {
                    results.summary.critical_failures++;
                }
            }
        }

        this.displayResults(results);
        return results;
    }

    async testApiHealthCheck() {
        const startTime = Date.now();
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const duration = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    details: `Health check responded in ${duration}ms`,
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: `Health check failed with status ${response.status}`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Health check network error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testAuthenticationFlow() {
        const startTime = Date.now();
        try {
            // Test if auth endpoints are accessible
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'invalid'
                })
            });

            const duration = Date.now() - startTime;

            // We expect this to fail with 401, but the endpoint should be reachable
            if (loginResponse.status === 401 || loginResponse.status === 400) {
                return {
                    success: true,
                    details: `Auth endpoint accessible, returned expected error status ${loginResponse.status}`,
                    duration: duration
                };
            } else if (loginResponse.status === 404) {
                return {
                    success: false,
                    error: 'Auth endpoint not found (404)',
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: `Unexpected auth response status: ${loginResponse.status}`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Auth endpoint network error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testUserRegistration() {
        const startTime = Date.now();
        try {
            // Test registration endpoint accessibility
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'short'
                })
            });

            const duration = Date.now() - startTime;

            // We expect validation errors, but endpoint should be reachable
            if (response.status === 400 || response.status === 422) {
                return {
                    success: true,
                    details: `Registration endpoint accessible, validation working (status ${response.status})`,
                    duration: duration
                };
            } else if (response.status === 404) {
                return {
                    success: false,
                    error: 'Registration endpoint not found (404)',
                    duration: duration
                };
            } else {
                return {
                    success: true,
                    details: `Registration endpoint accessible (status ${response.status})`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Registration endpoint network error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testUserLogin() {
        const startTime = Date.now();
        try {
            // Check if login form elements exist
            const loginElements = {
                emailInput: document.querySelector('input[type="email"]'),
                passwordInput: document.querySelector('input[type="password"]'),
                loginButton: document.querySelector('button[onclick*="login"]') || 
                           document.querySelector('.login-btn') ||
                           document.querySelector('#login-btn')
            };

            const duration = Date.now() - startTime;

            const missingElements = [];
            Object.entries(loginElements).forEach(([key, element]) => {
                if (!element) missingElements.push(key);
            });

            if (missingElements.length === 0) {
                return {
                    success: true,
                    details: 'All login UI elements present and accessible',
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: `Missing login elements: ${missingElements.join(', ')}`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Login UI test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testUserDashboard() {
        const startTime = Date.now();
        try {
            // Check if dashboard elements exist
            const dashboardElements = {
                userStatus: document.querySelector('.user-status') || 
                           document.querySelector('#user-status') ||
                           document.querySelector('.auth-status'),
                controlPanel: document.querySelector('.control-panel') ||
                             document.querySelector('#control-panel'),
                uploadArea: document.querySelector('.upload-area') ||
                           document.querySelector('#upload-area') ||
                           document.querySelector('input[type="file"]')
            };

            const duration = Date.now() - startTime;

            const presentElements = [];
            Object.entries(dashboardElements).forEach(([key, element]) => {
                if (element) presentElements.push(key);
            });

            if (presentElements.length >= 2) {
                return {
                    success: true,
                    details: `Dashboard elements present: ${presentElements.join(', ')}`,
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: `Insufficient dashboard elements found: ${presentElements.join(', ')}`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Dashboard test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testAudioUpload() {
        const startTime = Date.now();
        try {
            // Check if upload functionality is available
            const uploadInput = document.querySelector('input[type="file"]');
            const uploadButton = document.querySelector('button[onclick*="upload"]') ||
                               document.querySelector('.upload-btn') ||
                               document.querySelector('#upload-btn');

            const duration = Date.now() - startTime;

            if (uploadInput) {
                // Check if file input accepts audio files
                const acceptsAudio = uploadInput.accept && 
                                   (uploadInput.accept.includes('audio') || 
                                    uploadInput.accept.includes('.mp3') ||
                                    uploadInput.accept.includes('.wav'));

                return {
                    success: true,
                    details: `Upload input found, accepts audio: ${acceptsAudio}`,
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: 'No file upload input found',
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Audio upload test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testDownloadFunctionality() {
        const startTime = Date.now();
        try {
            // Check if download-related elements exist
            const downloadElements = {
                downloadModal: document.querySelector('.download-modal') ||
                              document.querySelector('#download-modal'),
                downloadButton: document.querySelector('button[onclick*="download"]') ||
                               document.querySelector('.download-btn'),
                formatSelector: document.querySelector('select[name*="format"]') ||
                               document.querySelector('.format-selector')
            };

            const duration = Date.now() - startTime;

            const presentElements = [];
            Object.entries(downloadElements).forEach(([key, element]) => {
                if (element) presentElements.push(key);
            });

            return {
                success: presentElements.length > 0,
                details: presentElements.length > 0 ? 
                        `Download elements found: ${presentElements.join(', ')}` :
                        'No download elements found',
                duration: duration
            };
        } catch (error) {
            return {
                success: false,
                error: `Download test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testPaymentSystem() {
        const startTime = Date.now();
        try {
            // Test payment endpoint accessibility
            const response = await fetch('/api/payments/plans', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const duration = Date.now() - startTime;

            if (response.ok || response.status === 401) {
                return {
                    success: true,
                    details: `Payment endpoint accessible (status ${response.status})`,
                    duration: duration
                };
            } else if (response.status === 404) {
                return {
                    success: false,
                    error: 'Payment endpoint not found',
                    duration: duration
                };
            } else {
                return {
                    success: false,
                    error: `Payment endpoint error: ${response.status}`,
                    duration: duration
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Payment system network error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testGeometricTheme() {
        const startTime = Date.now();
        try {
            // Check if geometric theme elements are present
            const themeElements = {
                geometricLogo: document.querySelector('.geometric-logo') ||
                              document.querySelector('#geometric-logo') ||
                              document.querySelector('svg[class*="icosahedron"]'),
                geometricButtons: document.querySelectorAll('.geometric-btn, .btn-geometric'),
                gradientElements: document.querySelectorAll('[class*="gradient"], [style*="gradient"]'),
                neonEffects: document.querySelectorAll('[class*="neon"], [class*="glow"]')
            };

            const duration = Date.now() - startTime;

            const themeScore = (themeElements.geometricLogo ? 1 : 0) +
                             (themeElements.geometricButtons.length > 0 ? 1 : 0) +
                             (themeElements.gradientElements.length > 0 ? 1 : 0) +
                             (themeElements.neonEffects.length > 0 ? 1 : 0);

            return {
                success: themeScore >= 2,
                details: `Geometric theme score: ${themeScore}/4 (logo: ${!!themeElements.geometricLogo}, buttons: ${themeElements.geometricButtons.length}, gradients: ${themeElements.gradientElements.length}, effects: ${themeElements.neonEffects.length})`,
                duration: duration
            };
        } catch (error) {
            return {
                success: false,
                error: `Geometric theme test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    async testResponsiveDesign() {
        const startTime = Date.now();
        try {
            // Test viewport meta tag
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            
            // Test CSS media queries
            const stylesheets = Array.from(document.styleSheets);
            let hasMediaQueries = false;

            try {
                stylesheets.forEach(sheet => {
                    if (sheet.cssRules) {
                        Array.from(sheet.cssRules).forEach(rule => {
                            if (rule.type === CSSRule.MEDIA_RULE) {
                                hasMediaQueries = true;
                            }
                        });
                    }
                });
            } catch (e) {
                // CORS issues with external stylesheets, check for responsive classes instead
                const responsiveElements = document.querySelectorAll('[class*="responsive"], [class*="mobile"], [class*="tablet"], [class*="desktop"]');
                hasMediaQueries = responsiveElements.length > 0;
            }

            const duration = Date.now() - startTime;

            const responsiveScore = (viewportMeta ? 1 : 0) + (hasMediaQueries ? 1 : 0);

            return {
                success: responsiveScore >= 1,
                details: `Responsive design score: ${responsiveScore}/2 (viewport: ${!!viewportMeta}, media queries: ${hasMediaQueries})`,
                duration: duration
            };
        } catch (error) {
            return {
                success: false,
                error: `Responsive design test error: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    displayResults(results) {
        console.log('\n🎯 Environment Parity Test Results');
        console.log('=====================================');
        console.log(`Environment: ${results.environment}`);
        console.log(`Timestamp: ${results.timestamp}`);
        console.log(`Total Tests: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Critical Failures: ${results.summary.critical_failures}`);
        console.log('=====================================\n');

        results.tests.forEach(test => {
            const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '💥';
            const critical = test.critical ? ' [CRITICAL]' : '';
            console.log(`${icon} ${test.name}${critical}: ${test.status}`);
            if (test.details) {
                console.log(`   Details: ${test.details}`);
            }
            if (test.error) {
                console.log(`   Error: ${test.error}`);
            }
            if (test.duration) {
                console.log(`   Duration: ${test.duration}ms`);
            }
            console.log('');
        });

        // Store results for comparison
        this.storeResults(results);
    }

    storeResults(results) {
        try {
            const storageKey = `parity_test_${results.environment}_${new Date().toISOString().split('T')[0]}`;
            localStorage.setItem(storageKey, JSON.stringify(results));
            console.log(`📊 Results stored as: ${storageKey}`);
        } catch (error) {
            console.warn('Could not store results in localStorage:', error);
        }
    }

    async compareEnvironments() {
        console.log('🔄 Comparing environment results...');
        
        const keys = Object.keys(localStorage).filter(key => key.startsWith('parity_test_'));
        const results = keys.map(key => JSON.parse(localStorage.getItem(key)));
        
        if (results.length < 2) {
            console.log('⚠️  Need results from both environments to compare');
            return;
        }

        const localhost = results.find(r => r.environment === 'localhost');
        const production = results.find(r => r.environment === 'production');

        if (!localhost || !production) {
            console.log('⚠️  Missing results from one or both environments');
            return;
        }

        console.log('\n🔍 Environment Comparison');
        console.log('=========================');

        const comparison = {
            identical: [],
            different: [],
            localhost_only: [],
            production_only: []
        };

        // Compare test results
        localhost.tests.forEach(localhostTest => {
            const productionTest = production.tests.find(t => t.key === localhostTest.key);
            
            if (!productionTest) {
                comparison.localhost_only.push(localhostTest.name);
            } else if (localhostTest.status === productionTest.status) {
                comparison.identical.push(localhostTest.name);
            } else {
                comparison.different.push({
                    test: localhostTest.name,
                    localhost: localhostTest.status,
                    production: productionTest.status
                });
            }
        });

        production.tests.forEach(productionTest => {
            const localhostTest = localhost.tests.find(t => t.key === productionTest.key);
            if (!localhostTest) {
                comparison.production_only.push(productionTest.name);
            }
        });

        console.log(`✅ Identical Results: ${comparison.identical.length}`);
        comparison.identical.forEach(test => console.log(`   - ${test}`));

        console.log(`\n⚠️  Different Results: ${comparison.different.length}`);
        comparison.different.forEach(diff => {
            console.log(`   - ${diff.test}: localhost=${diff.localhost}, production=${diff.production}`);
        });

        if (comparison.localhost_only.length > 0) {
            console.log(`\n🏠 Localhost Only: ${comparison.localhost_only.length}`);
            comparison.localhost_only.forEach(test => console.log(`   - ${test}`));
        }

        if (comparison.production_only.length > 0) {
            console.log(`\n🚀 Production Only: ${comparison.production_only.length}`);
            comparison.production_only.forEach(test => console.log(`   - ${test}`));
        }

        const parityScore = (comparison.identical.length / (comparison.identical.length + comparison.different.length)) * 100;
        console.log(`\n📊 Environment Parity Score: ${parityScore.toFixed(1)}%`);

        return comparison;
    }
}

// Global instance for easy access
window.EnvironmentParityValidator = EnvironmentParityValidator;

// Auto-run if in test mode
if (window.location.search.includes('run_parity_tests=true')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const validator = new EnvironmentParityValidator();
        await validator.runAllTests();
    });
}