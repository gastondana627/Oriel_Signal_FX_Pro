/**
 * Network Issues Diagnostic Script
 * Helps identify and resolve common network connectivity problems
 */

(function() {
    'use strict';
    
    console.log('🔍 Starting network diagnostics...');
    
    class NetworkDiagnostics {
        constructor() {
            this.results = [];
            this.startTime = Date.now();
        }
        
        async runDiagnostics() {
            console.log('🧪 Running comprehensive network diagnostics...');
            
            // Test 1: Check if we're online
            await this.testOnlineStatus();
            
            // Test 2: Test backend connectivity
            await this.testBackendConnectivity();
            
            // Test 3: Test specific endpoints
            await this.testEndpoints();
            
            // Test 4: Check for CORS issues
            await this.testCORSConfiguration();
            
            // Test 5: Test DNS resolution
            await this.testDNSResolution();
            
            // Generate report
            this.generateReport();
        }
        
        async testOnlineStatus() {
            console.log('📡 Testing online status...');
            
            const isOnline = navigator.onLine;
            this.addResult('Online Status', isOnline ? 'PASS' : 'FAIL', 
                isOnline ? 'Browser reports online' : 'Browser reports offline');
            
            // Test actual connectivity
            try {
                const response = await fetch('https://www.google.com/favicon.ico', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                this.addResult('Internet Connectivity', 'PASS', 'Can reach external sites');
            } catch (error) {
                this.addResult('Internet Connectivity', 'FAIL', `Cannot reach external sites: ${error.message}`);
            }
        }
        
        async testBackendConnectivity() {
            console.log('🖥️ Testing backend connectivity...');
            
            const backendUrls = [
                'http://localhost:8000',
                'http://127.0.0.1:8000',
                window.appConfig?.getApiUrl?.() || 'http://localhost:8000'
            ];
            
            for (const url of backendUrls) {
                try {
                    const response = await fetch(`${url}/api/health`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        this.addResult(`Backend (${url})`, 'PASS', `Health check successful (${response.status})`);
                    } else {
                        this.addResult(`Backend (${url})`, 'WARN', `Health check returned ${response.status}`);
                    }
                } catch (error) {
                    this.addResult(`Backend (${url})`, 'FAIL', `Cannot connect: ${error.message}`);
                }
            }
        }
        
        async testEndpoints() {
            console.log('🔗 Testing specific endpoints...');
            
            const endpoints = [
                '/api/health',
                '/api/auth/status',
                '/api/usage/current',
                '/api/logs'
            ];
            
            const baseUrl = window.appConfig?.getApiUrl?.() || 'http://localhost:8000';
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    
                    const status = response.ok ? 'PASS' : 'WARN';
                    const message = `${response.status} ${response.statusText}`;
                    this.addResult(`Endpoint ${endpoint}`, status, message);
                    
                } catch (error) {
                    this.addResult(`Endpoint ${endpoint}`, 'FAIL', error.message);
                }
            }
        }
        
        async testCORSConfiguration() {
            console.log('🌐 Testing CORS configuration...');
            
            try {
                const baseUrl = window.appConfig?.getApiUrl?.() || 'http://localhost:8000';
                const response = await fetch(`${baseUrl}/api/health`, {
                    method: 'OPTIONS'
                });
                
                const corsHeaders = {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
                };
                
                const hasCORS = corsHeaders['Access-Control-Allow-Origin'] !== null;
                this.addResult('CORS Configuration', hasCORS ? 'PASS' : 'WARN', 
                    hasCORS ? 'CORS headers present' : 'CORS headers missing');
                
                if (hasCORS) {
                    console.log('CORS Headers:', corsHeaders);
                }
                
            } catch (error) {
                this.addResult('CORS Configuration', 'FAIL', `CORS test failed: ${error.message}`);
            }
        }
        
        async testDNSResolution() {
            console.log('🌍 Testing DNS resolution...');
            
            const hosts = ['localhost', '127.0.0.1'];
            
            for (const host of hosts) {
                try {
                    const startTime = performance.now();
                    const response = await fetch(`http://${host}:8000/api/health`, {
                        method: 'HEAD'
                    });
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    
                    this.addResult(`DNS Resolution (${host})`, 'PASS', `Resolved in ${duration}ms`);
                } catch (error) {
                    this.addResult(`DNS Resolution (${host})`, 'FAIL', error.message);
                }
            }
        }
        
        addResult(test, status, message) {
            const result = {
                test,
                status,
                message,
                timestamp: new Date().toISOString()
            };
            
            this.results.push(result);
            
            const emoji = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
            console.log(`${emoji} ${test}: ${message}`);
        }
        
        generateReport() {
            const duration = Date.now() - this.startTime;
            const passed = this.results.filter(r => r.status === 'PASS').length;
            const warned = this.results.filter(r => r.status === 'WARN').length;
            const failed = this.results.filter(r => r.status === 'FAIL').length;
            
            console.log('\n' + '='.repeat(60));
            console.log('📊 NETWORK DIAGNOSTICS REPORT');
            console.log('='.repeat(60));
            console.log(`Duration: ${duration}ms`);
            console.log(`✅ Passed: ${passed}`);
            console.log(`⚠️ Warnings: ${warned}`);
            console.log(`❌ Failed: ${failed}`);
            console.log('='.repeat(60));
            
            // Show recommendations
            this.showRecommendations();
            
            // Store results for debugging
            window.networkDiagnosticsResults = this.results;
            
            return this.results;
        }
        
        showRecommendations() {
            console.log('\n💡 RECOMMENDATIONS:');
            
            const hasBackendIssues = this.results.some(r => 
                r.test.includes('Backend') && r.status === 'FAIL'
            );
            
            const hasEndpointIssues = this.results.some(r => 
                r.test.includes('Endpoint') && r.status === 'FAIL'
            );
            
            if (hasBackendIssues) {
                console.log('🔧 Backend Server Issues Detected:');
                console.log('   1. Check if the backend server is running');
                console.log('   2. Verify the server is listening on port 8000');
                console.log('   3. Check server logs for errors');
                console.log('   4. Try restarting the backend server');
            }
            
            if (hasEndpointIssues) {
                console.log('🔧 API Endpoint Issues Detected:');
                console.log('   1. Verify API routes are properly configured');
                console.log('   2. Check for authentication requirements');
                console.log('   3. Ensure CORS is properly configured');
            }
            
            const hasConnectivityIssues = this.results.some(r => 
                r.test.includes('Connectivity') && r.status === 'FAIL'
            );
            
            if (hasConnectivityIssues) {
                console.log('🔧 Connectivity Issues Detected:');
                console.log('   1. Check your internet connection');
                console.log('   2. Verify firewall settings');
                console.log('   3. Check for proxy or VPN interference');
            }
            
            console.log('\n📋 Quick Fixes:');
            console.log('   • Refresh the page (Cmd+R / Ctrl+R)');
            console.log('   • Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)');
            console.log('   • Check browser console for additional errors');
            console.log('   • Try opening in an incognito/private window');
        }
    }
    
    // Auto-run diagnostics when page loads
    function runAutoDiagnostics() {
        // Only run if there are network errors
        const hasNetworkErrors = window.enhancedLogger && 
            window.enhancedLogger.getStats().bufferSize > 0;
        
        if (hasNetworkErrors || window.location.search.includes('diagnose')) {
            console.log('🚨 Network issues detected, running diagnostics...');
            const diagnostics = new NetworkDiagnostics();
            diagnostics.runDiagnostics();
        }
    }
    
    // Make diagnostics available globally
    window.NetworkDiagnostics = NetworkDiagnostics;
    window.runNetworkDiagnostics = () => {
        const diagnostics = new NetworkDiagnostics();
        return diagnostics.runDiagnostics();
    };
    
    // Run auto-diagnostics after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runAutoDiagnostics, 2000);
        });
    } else {
        setTimeout(runAutoDiagnostics, 2000);
    }
    
    console.log('✅ Network diagnostics system loaded');
    console.log('💡 Run window.runNetworkDiagnostics() to test connectivity');
    
})();