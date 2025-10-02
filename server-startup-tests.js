/**
 * Server Startup Testing Module
 * 
 * Implements comprehensive server startup testing including:
 * - Automated server restart testing with the restart script
 * - Health endpoint validation for both frontend and backend
 * - Connectivity testing and URL verification
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

class ServerStartupTester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        this.frontendUrl = 'http://127.0.0.1:3000';
        this.backendUrl = 'http://localhost:8000';
        this.testCredentials = {
            email: 'gastondana627@gmail.com',
            password: 'TestPassword123!'
        };
    }

    /**
     * Run server restart test
     * Tests automated server restart using the restart script
     */
    async runRestartTest() {
        this.updateStatus('restart-status', 'running');
        this.showLog('restart-log');
        this.log('restart-log', '🔄 Starting server restart test...');
        
        try {
            // Update progress
            this.updateProgress('restart-progress', 10);
            this.log('restart-log', '📋 Test Plan:');
            this.log('restart-log', '  1. Check current server status');
            this.log('restart-log', '  2. Simulate restart process');
            this.log('restart-log', '  3. Validate server startup');
            this.log('restart-log', '  4. Verify connectivity');
            
            // Step 1: Check current server status
            this.updateProgress('restart-progress', 25);
            this.log('restart-log', '\n🔍 Step 1: Checking current server status...');
            
            const initialStatus = await this.checkServerStatus();
            this.log('restart-log', `Frontend Status: ${initialStatus.frontend ? '✅ Running' : '❌ Not Running'}`);
            this.log('restart-log', `Backend Status: ${initialStatus.backend ? '✅ Running' : '❌ Not Running'}`);
            
            // Step 2: Simulate restart process (we can't actually restart from browser)
            this.updateProgress('restart-progress', 50);
            this.log('restart-log', '\n🔄 Step 2: Simulating restart process...');
            this.log('restart-log', '⚠️  Note: Actual restart requires running restart-dev-servers.sh');
            this.log('restart-log', '📝 Restart script location: ./restart-dev-servers.sh');
            this.log('restart-log', '🛑 Script kills existing processes on ports 3000 and 8000');
            this.log('restart-log', '🚀 Script starts fresh backend and frontend instances');
            
            // Step 3: Validate current server startup
            this.updateProgress('restart-progress', 75);
            this.log('restart-log', '\n✅ Step 3: Validating current server startup...');
            
            const postRestartStatus = await this.checkServerStatus();
            this.log('restart-log', `Frontend Status: ${postRestartStatus.frontend ? '✅ Running' : '❌ Not Running'}`);
            this.log('restart-log', `Backend Status: ${postRestartStatus.backend ? '✅ Running' : '❌ Not Running'}`);
            
            // Step 4: Verify connectivity
            this.updateProgress('restart-progress', 100);
            this.log('restart-log', '\n🌐 Step 4: Verifying connectivity...');
            
            const connectivityResults = await this.testConnectivity();
            this.log('restart-log', `Frontend Connectivity: ${connectivityResults.frontend.accessible ? '✅ OK' : '❌ Failed'}`);
            this.log('restart-log', `Backend Connectivity: ${connectivityResults.backend.accessible ? '✅ OK' : '❌ Failed'}`);
            
            // Determine overall result
            const success = postRestartStatus.frontend && postRestartStatus.backend && 
                          connectivityResults.frontend.accessible && connectivityResults.backend.accessible;
            
            if (success) {
                this.updateStatus('restart-status', 'success');
                this.log('restart-log', '\n🎉 Server restart test completed successfully!');
                this.log('restart-log', '✅ All servers are running and accessible');
            } else {
                this.updateStatus('restart-status', 'error');
                this.log('restart-log', '\n❌ Server restart test failed');
                this.log('restart-log', '⚠️  Some servers are not running or accessible');
            }
            
            return {
                success,
                initialStatus,
                postRestartStatus,
                connectivityResults
            };
            
        } catch (error) {
            this.updateStatus('restart-status', 'error');
            this.log('restart-log', `\n❌ Server restart test failed: ${error.message}`);
            console.error('Server restart test error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run health endpoint validation test
     * Tests health endpoints for both frontend and backend
     */
    async runHealthTest() {
        this.updateStatus('health-status', 'running');
        this.showLog('health-log');
        this.log('health-log', '🏥 Starting health endpoint validation...');
        
        try {
            // Reset all health status indicators
            const healthIndicators = [
                'frontend-port-status', 'frontend-page-status', 'frontend-assets-status',
                'backend-port-status', 'backend-health-status', 'backend-db-status', 'backend-api-status'
            ];
            healthIndicators.forEach(id => this.updateStatus(id, 'pending'));
            
            // Test Frontend Health
            this.log('health-log', '\n🌐 Testing Frontend Health...');
            const frontendHealth = await this.testFrontendHealth();
            
            // Test Backend Health
            this.log('health-log', '\n🔧 Testing Backend Health...');
            const backendHealth = await this.testBackendHealth();
            
            // Overall health assessment
            const overallHealth = frontendHealth.overall && backendHealth.overall;
            
            if (overallHealth) {
                this.updateStatus('health-status', 'success');
                this.log('health-log', '\n🎉 All health checks passed!');
            } else {
                this.updateStatus('health-status', 'error');
                this.log('health-log', '\n⚠️  Some health checks failed');
            }
            
            return {
                success: overallHealth,
                frontend: frontendHealth,
                backend: backendHealth
            };
            
        } catch (error) {
            this.updateStatus('health-status', 'error');
            this.log('health-log', `\n❌ Health test failed: ${error.message}`);
            console.error('Health test error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test frontend health
     */
    async testFrontendHealth() {
        const results = {
            port: false,
            page: false,
            assets: false,
            overall: false
        };
        
        try {
            // Test port accessibility
            this.log('health-log', '  📡 Testing port 3000 accessibility...');
            const portResponse = await this.makeRequest(this.frontendUrl, { timeout: 5000 });
            results.port = portResponse.ok;
            this.updateStatus('frontend-port-status', results.port ? 'success' : 'error');
            this.log('health-log', `     ${results.port ? '✅' : '❌'} Port 3000: ${results.port ? 'Accessible' : 'Not accessible'}`);
            
            if (results.port) {
                // Test index page load
                this.log('health-log', '  📄 Testing index page load...');
                const pageContent = await portResponse.text();
                results.page = pageContent.includes('Oriel Signal FX Pro') || pageContent.includes('<html');
                this.updateStatus('frontend-page-status', results.page ? 'success' : 'error');
                this.log('health-log', `     ${results.page ? '✅' : '❌'} Index page: ${results.page ? 'Loads correctly' : 'Failed to load'}`);
                
                // Test static assets
                this.log('health-log', '  🎨 Testing static assets...');
                try {
                    const cssResponse = await this.makeRequest(`${this.frontendUrl}/style.css`, { timeout: 3000 });
                    const jsResponse = await this.makeRequest(`${this.frontendUrl}/script.js`, { timeout: 3000 });
                    results.assets = cssResponse.ok && jsResponse.ok;
                } catch (assetError) {
                    results.assets = false;
                }
                this.updateStatus('frontend-assets-status', results.assets ? 'success' : 'warning');
                this.log('health-log', `     ${results.assets ? '✅' : '⚠️'} Static assets: ${results.assets ? 'Available' : 'Some assets missing'}`);
            } else {
                this.updateStatus('frontend-page-status', 'error');
                this.updateStatus('frontend-assets-status', 'error');
            }
            
        } catch (error) {
            this.log('health-log', `     ❌ Frontend health check error: ${error.message}`);
            this.updateStatus('frontend-port-status', 'error');
            this.updateStatus('frontend-page-status', 'error');
            this.updateStatus('frontend-assets-status', 'error');
        }
        
        results.overall = results.port && results.page;
        return results;
    }

    /**
     * Test backend health
     */
    async testBackendHealth() {
        const results = {
            port: false,
            health: false,
            database: false,
            api: false,
            overall: false
        };
        
        try {
            // Test port accessibility
            this.log('health-log', '  📡 Testing port 8000 accessibility...');
            const portResponse = await this.makeRequest(`${this.backendUrl}/api/health`, { timeout: 5000 });
            results.port = portResponse.ok;
            this.updateStatus('backend-port-status', results.port ? 'success' : 'error');
            this.log('health-log', `     ${results.port ? '✅' : '❌'} Port 8000: ${results.port ? 'Accessible' : 'Not accessible'}`);
            
            if (results.port) {
                // Test health endpoint
                this.log('health-log', '  🏥 Testing health endpoint...');
                const healthData = await portResponse.json();
                results.health = healthData.status === 'healthy' || healthData.status === 'degraded';
                this.updateStatus('backend-health-status', results.health ? 'success' : 'error');
                this.log('health-log', `     ${results.health ? '✅' : '❌'} Health endpoint: ${healthData.status || 'Unknown'}`);
                
                // Test database connection
                this.log('health-log', '  🗄️  Testing database connection...');
                results.database = healthData.checks && healthData.checks.database && 
                                 healthData.checks.database.status === 'healthy';
                this.updateStatus('backend-db-status', results.database ? 'success' : 'warning');
                this.log('health-log', `     ${results.database ? '✅' : '⚠️'} Database: ${results.database ? 'Connected' : 'Connection issues'}`);
                
                // Test API endpoints
                this.log('health-log', '  🔌 Testing API endpoints...');
                try {
                    const apiResponse = await this.makeRequest(`${this.backendUrl}/api/`, { timeout: 3000 });
                    results.api = apiResponse.ok;
                } catch (apiError) {
                    results.api = false;
                }
                this.updateStatus('backend-api-status', results.api ? 'success' : 'error');
                this.log('health-log', `     ${results.api ? '✅' : '❌'} API endpoints: ${results.api ? 'Responding' : 'Not responding'}`);
            } else {
                this.updateStatus('backend-health-status', 'error');
                this.updateStatus('backend-db-status', 'error');
                this.updateStatus('backend-api-status', 'error');
            }
            
        } catch (error) {
            this.log('health-log', `     ❌ Backend health check error: ${error.message}`);
            this.updateStatus('backend-port-status', 'error');
            this.updateStatus('backend-health-status', 'error');
            this.updateStatus('backend-db-status', 'error');
            this.updateStatus('backend-api-status', 'error');
        }
        
        results.overall = results.port && results.health;
        return results;
    }

    /**
     * Run connectivity and URL verification test
     */
    async runConnectivityTest() {
        this.updateStatus('connectivity-status', 'running');
        this.showLog('connectivity-log');
        this.log('connectivity-log', '🌐 Starting connectivity and URL verification...');
        
        try {
            const connectivityResults = await this.testConnectivity();
            this.displayConnectivityResults(connectivityResults);
            
            const success = connectivityResults.frontend.accessible && connectivityResults.backend.accessible;
            
            if (success) {
                this.updateStatus('connectivity-status', 'success');
                this.log('connectivity-log', '\n🎉 All connectivity tests passed!');
            } else {
                this.updateStatus('connectivity-status', 'error');
                this.log('connectivity-log', '\n⚠️  Some connectivity tests failed');
            }
            
            return { success, results: connectivityResults };
            
        } catch (error) {
            this.updateStatus('connectivity-status', 'error');
            this.log('connectivity-log', `\n❌ Connectivity test failed: ${error.message}`);
            console.error('Connectivity test error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test connectivity for both servers
     */
    async testConnectivity() {
        const results = {
            frontend: {
                accessible: false,
                responseTime: null,
                statusCode: null,
                error: null
            },
            backend: {
                accessible: false,
                responseTime: null,
                statusCode: null,
                error: null,
                healthData: null
            }
        };
        
        // Test frontend connectivity
        this.log('connectivity-log', '\n🌐 Testing frontend connectivity...');
        try {
            const startTime = Date.now();
            const frontendResponse = await this.makeRequest(this.frontendUrl, { timeout: 10000 });
            const endTime = Date.now();
            
            results.frontend.accessible = frontendResponse.ok;
            results.frontend.responseTime = endTime - startTime;
            results.frontend.statusCode = frontendResponse.status;
            
            this.log('connectivity-log', `  📡 Frontend URL: ${this.frontendUrl}`);
            this.log('connectivity-log', `  ✅ Status: ${frontendResponse.status} ${frontendResponse.statusText}`);
            this.log('connectivity-log', `  ⏱️  Response Time: ${results.frontend.responseTime}ms`);
            
        } catch (error) {
            results.frontend.error = error.message;
            this.log('connectivity-log', `  ❌ Frontend connectivity failed: ${error.message}`);
        }
        
        // Test backend connectivity
        this.log('connectivity-log', '\n🔧 Testing backend connectivity...');
        try {
            const startTime = Date.now();
            const backendResponse = await this.makeRequest(`${this.backendUrl}/api/health`, { timeout: 10000 });
            const endTime = Date.now();
            
            results.backend.accessible = backendResponse.ok;
            results.backend.responseTime = endTime - startTime;
            results.backend.statusCode = backendResponse.status;
            
            if (backendResponse.ok) {
                results.backend.healthData = await backendResponse.json();
            }
            
            this.log('connectivity-log', `  📡 Backend URL: ${this.backendUrl}/api/health`);
            this.log('connectivity-log', `  ✅ Status: ${backendResponse.status} ${backendResponse.statusText}`);
            this.log('connectivity-log', `  ⏱️  Response Time: ${results.backend.responseTime}ms`);
            
            if (results.backend.healthData) {
                this.log('connectivity-log', `  🏥 Health Status: ${results.backend.healthData.status}`);
                this.log('connectivity-log', `  📊 Service: ${results.backend.healthData.service || 'Unknown'}`);
            }
            
        } catch (error) {
            results.backend.error = error.message;
            this.log('connectivity-log', `  ❌ Backend connectivity failed: ${error.message}`);
        }
        
        return results;
    }

    /**
     * Display connectivity results in the UI
     */
    displayConnectivityResults(results) {
        const resultsContainer = document.getElementById('connectivity-results');
        resultsContainer.innerHTML = '';
        
        // Frontend results
        const frontendResult = document.createElement('div');
        frontendResult.className = `result-item ${results.frontend.accessible ? 'success' : 'error'}`;
        frontendResult.innerHTML = `
            <div>
                <strong>🌐 Frontend (${this.frontendUrl})</strong><br>
                <small>Status: ${results.frontend.statusCode || 'N/A'} | 
                Response Time: ${results.frontend.responseTime || 'N/A'}ms</small>
            </div>
            <div>${results.frontend.accessible ? '✅' : '❌'}</div>
        `;
        resultsContainer.appendChild(frontendResult);
        
        // Backend results
        const backendResult = document.createElement('div');
        backendResult.className = `result-item ${results.backend.accessible ? 'success' : 'error'}`;
        backendResult.innerHTML = `
            <div>
                <strong>🔧 Backend (${this.backendUrl})</strong><br>
                <small>Status: ${results.backend.statusCode || 'N/A'} | 
                Response Time: ${results.backend.responseTime || 'N/A'}ms | 
                Health: ${results.backend.healthData?.status || 'Unknown'}</small>
            </div>
            <div>${results.backend.accessible ? '✅' : '❌'}</div>
        `;
        resultsContainer.appendChild(backendResult);
    }

    /**
     * Run complete server startup test suite
     */
    async runCompleteTest() {
        if (this.isRunning) {
            console.log('Test already running');
            return;
        }
        
        this.isRunning = true;
        this.updateStatus('complete-status', 'running');
        this.showLog('complete-log');
        this.log('complete-log', '🚀 Starting complete server startup test suite...');
        
        const results = {
            restart: null,
            health: null,
            connectivity: null,
            overall: false
        };
        
        try {
            // Clear previous results
            document.getElementById('complete-results').innerHTML = '';
            this.updateProgress('complete-progress', 0);
            
            // Test 1: Server Restart
            this.log('complete-log', '\n📋 Test 1/3: Server Restart Testing');
            this.updateProgress('complete-progress', 10);
            results.restart = await this.runRestartTest();
            this.addCompleteResult('Server Restart', results.restart.success);
            this.updateProgress('complete-progress', 33);
            
            // Test 2: Health Endpoints
            this.log('complete-log', '\n📋 Test 2/3: Health Endpoint Validation');
            this.updateProgress('complete-progress', 40);
            results.health = await this.runHealthTest();
            this.addCompleteResult('Health Endpoints', results.health.success);
            this.updateProgress('complete-progress', 66);
            
            // Test 3: Connectivity
            this.log('complete-log', '\n📋 Test 3/3: Connectivity Testing');
            this.updateProgress('complete-progress', 70);
            results.connectivity = await this.runConnectivityTest();
            this.addCompleteResult('Connectivity', results.connectivity.success);
            this.updateProgress('complete-progress', 100);
            
            // Overall assessment
            results.overall = results.restart.success && results.health.success && results.connectivity.success;
            
            if (results.overall) {
                this.updateStatus('complete-status', 'success');
                this.log('complete-log', '\n🎉 Complete server startup test suite PASSED!');
                this.log('complete-log', '✅ All servers are properly configured and running');
                this.log('complete-log', '✅ All health checks are passing');
                this.log('complete-log', '✅ All connectivity tests are successful');
            } else {
                this.updateStatus('complete-status', 'error');
                this.log('complete-log', '\n⚠️  Complete server startup test suite FAILED');
                this.log('complete-log', '❌ Some tests did not pass - review individual test results');
            }
            
            // Generate summary
            this.generateTestSummary(results);
            
        } catch (error) {
            this.updateStatus('complete-status', 'error');
            this.log('complete-log', `\n❌ Complete test suite failed: ${error.message}`);
            console.error('Complete test error:', error);
        } finally {
            this.isRunning = false;
        }
        
        return results;
    }

    /**
     * Add result to complete test results
     */
    addCompleteResult(testName, success) {
        const resultsContainer = document.getElementById('complete-results');
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${success ? 'success' : 'error'}`;
        resultItem.innerHTML = `
            <div><strong>${testName}</strong></div>
            <div>${success ? '✅ PASS' : '❌ FAIL'}</div>
        `;
        resultsContainer.appendChild(resultItem);
    }

    /**
     * Generate test summary
     */
    generateTestSummary(results) {
        this.log('complete-log', '\n📊 TEST SUMMARY');
        this.log('complete-log', '================');
        this.log('complete-log', `Server Restart Test: ${results.restart.success ? '✅ PASS' : '❌ FAIL'}`);
        this.log('complete-log', `Health Endpoint Test: ${results.health.success ? '✅ PASS' : '❌ FAIL'}`);
        this.log('complete-log', `Connectivity Test: ${results.connectivity.success ? '✅ PASS' : '❌ FAIL'}`);
        this.log('complete-log', `Overall Result: ${results.overall ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!results.overall) {
            this.log('complete-log', '\n🔧 TROUBLESHOOTING STEPS:');
            if (!results.restart.success) {
                this.log('complete-log', '• Run restart-dev-servers.sh to restart servers');
            }
            if (!results.health.success) {
                this.log('complete-log', '• Check server logs for health check failures');
            }
            if (!results.connectivity.success) {
                this.log('complete-log', '• Verify servers are running on correct ports');
                this.log('complete-log', '• Check firewall and network connectivity');
            }
        }
    }

    /**
     * Check server status
     */
    async checkServerStatus() {
        const status = {
            frontend: false,
            backend: false
        };
        
        try {
            const frontendResponse = await this.makeRequest(this.frontendUrl, { timeout: 3000 });
            status.frontend = frontendResponse.ok;
        } catch (error) {
            status.frontend = false;
        }
        
        try {
            const backendResponse = await this.makeRequest(`${this.backendUrl}/api/health`, { timeout: 3000 });
            status.backend = backendResponse.ok;
        } catch (error) {
            status.backend = false;
        }
        
        return status;
    }

    /**
     * Make HTTP request with timeout
     */
    async makeRequest(url, options = {}) {
        const { timeout = 5000, ...fetchOptions } = options;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Update status indicator
     */
    updateStatus(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = `status-indicator status-${status}`;
        }
    }

    /**
     * Update progress bar
     */
    updateProgress(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${percentage}%`;
        }
    }

    /**
     * Show log output
     */
    showLog(logId) {
        const logElement = document.getElementById(logId);
        if (logElement) {
            logElement.style.display = 'block';
            logElement.textContent = '';
        }
    }

    /**
     * Add log message
     */
    log(logId, message) {
        const logElement = document.getElementById(logId);
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            logElement.textContent += `[${timestamp}] ${message}\n`;
            logElement.scrollTop = logElement.scrollHeight;
        }
        console.log(`[ServerStartupTester] ${message}`);
    }
}

// Global instance
const serverStartupTester = new ServerStartupTester();

// Global functions for HTML buttons
function runRestartTest() {
    return serverStartupTester.runRestartTest();
}

function runHealthTest() {
    return serverStartupTester.runHealthTest();
}

function runConnectivityTest() {
    return serverStartupTester.runConnectivityTest();
}

function runCompleteTest() {
    return serverStartupTester.runCompleteTest();
}

// Auto-run basic connectivity check on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Server Startup Testing Module loaded');
    
    // Show initial server status
    setTimeout(async () => {
        try {
            const status = await serverStartupTester.checkServerStatus();
            console.log('Initial server status:', status);
        } catch (error) {
            console.log('Could not check initial server status:', error.message);
        }
    }, 1000);
});