/**
 * Verification Script for Analytics and Monitoring Tests
 * This script verifies that all test dependencies are available and tests can run properly
 */

class TestVerifier {
    constructor() {
        this.results = {
            dependencies: [],
            testFiles: [],
            mockSetup: [],
            testStructure: [],
            overall: 'unknown'
        };
    }

    /**
     * Run all verification checks
     */
    async runVerification() {
        console.log('🔍 Starting Analytics and Monitoring Tests Verification...\n');
        
        try {
            await this.checkDependencies();
            await this.checkTestFiles();
            await this.checkMockSetup();
            await this.checkTestStructure();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            this.results.overall = 'failed';
        }
    }

    /**
     * Check if all required dependencies are available
     */
    async checkDependencies() {
        console.log('📦 Checking Dependencies...');
        
        const requiredFiles = [
            'analytics-manager.js',
            'error-monitor.js',
            'performance-monitor.js',
            'monitoring-integration.js'
        ];

        for (const file of requiredFiles) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    this.results.dependencies.push({
                        file: file,
                        status: 'found',
                        message: 'File exists and is accessible'
                    });
                    console.log(`  ✅ ${file} - Found`);
                } else {
                    this.results.dependencies.push({
                        file: file,
                        status: 'missing',
                        message: `HTTP ${response.status}: ${response.statusText}`
                    });
                    console.log(`  ❌ ${file} - Missing (${response.status})`);
                }
            } catch (error) {
                this.results.dependencies.push({
                    file: file,
                    status: 'error',
                    message: error.message
                });
                console.log(`  ❌ ${file} - Error: ${error.message}`);
            }
        }
        
        console.log('');
    }

    /**
     * Check if test files are properly structured
     */
    async checkTestFiles() {
        console.log('📝 Checking Test Files...');
        
        const testFiles = [
            'analytics-monitoring-tests.js',
            'analytics-monitoring-test-runner.html',
            'analytics-monitoring-tests-documentation.md'
        ];

        for (const file of testFiles) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const content = await response.text();
                    const size = content.length;
                    
                    this.results.testFiles.push({
                        file: file,
                        status: 'found',
                        size: size,
                        message: `File found (${size} bytes)`
                    });
                    console.log(`  ✅ ${file} - Found (${size} bytes)`);
                } else {
                    this.results.testFiles.push({
                        file: file,
                        status: 'missing',
                        message: `HTTP ${response.status}: ${response.statusText}`
                    });
                    console.log(`  ❌ ${file} - Missing`);
                }
            } catch (error) {
                this.results.testFiles.push({
                    file: file,
                    status: 'error',
                    message: error.message
                });
                console.log(`  ❌ ${file} - Error: ${error.message}`);
            }
        }
        
        console.log('');
    }

    /**
     * Check if mock setup is correct
     */
    async checkMockSetup() {
        console.log('🎭 Checking Mock Setup...');
        
        const mockChecks = [
            {
                name: 'Global Objects',
                check: () => {
                    return typeof window !== 'undefined' && 
                           typeof document !== 'undefined' && 
                           typeof navigator !== 'undefined';
                }
            },
            {
                name: 'Performance API',
                check: () => {
                    return typeof performance !== 'undefined' && 
                           typeof performance.now === 'function';
                }
            },
            {
                name: 'Local Storage',
                check: () => {
                    return typeof localStorage !== 'undefined' && 
                           typeof localStorage.getItem === 'function';
                }
            },
            {
                name: 'Fetch API',
                check: () => {
                    return typeof fetch === 'function';
                }
            }
        ];

        for (const mockCheck of mockChecks) {
            try {
                const result = mockCheck.check();
                this.results.mockSetup.push({
                    name: mockCheck.name,
                    status: result ? 'available' : 'missing',
                    message: result ? 'API is available' : 'API is not available'
                });
                console.log(`  ${result ? '✅' : '❌'} ${mockCheck.name} - ${result ? 'Available' : 'Missing'}`);
            } catch (error) {
                this.results.mockSetup.push({
                    name: mockCheck.name,
                    status: 'error',
                    message: error.message
                });
                console.log(`  ❌ ${mockCheck.name} - Error: ${error.message}`);
            }
        }
        
        console.log('');
    }

    /**
     * Check test structure and content
     */
    async checkTestStructure() {
        console.log('🏗️ Checking Test Structure...');
        
        try {
            const response = await fetch('analytics-monitoring-tests.js');
            if (!response.ok) {
                throw new Error('Cannot load test file');
            }
            
            const content = await response.text();
            
            const structureChecks = [
                {
                    name: 'AnalyticsManager Tests',
                    pattern: /describe\s*\(\s*['"`]AnalyticsManager['"`]/,
                    required: true
                },
                {
                    name: 'ErrorMonitor Tests',
                    pattern: /describe\s*\(\s*['"`]ErrorMonitor['"`]/,
                    required: true
                },
                {
                    name: 'PerformanceMonitor Tests',
                    pattern: /describe\s*\(\s*['"`]PerformanceMonitor['"`]/,
                    required: true
                },
                {
                    name: 'MonitoringIntegration Tests',
                    pattern: /describe\s*\(\s*['"`]MonitoringIntegration['"`]/,
                    required: true
                },
                {
                    name: 'Integration Tests',
                    pattern: /describe\s*\(\s*['"`]Complete Monitoring System Integration['"`]/,
                    required: true
                },
                {
                    name: 'Mock Setup',
                    pattern: /mockApiClient|mockAppConfig/,
                    required: true
                },
                {
                    name: 'Test Cases',
                    pattern: /test\s*\(\s*['"`]/g,
                    required: true,
                    count: true
                },
                {
                    name: 'Expect Assertions',
                    pattern: /expect\s*\(/g,
                    required: true,
                    count: true
                }
            ];

            for (const check of structureChecks) {
                const matches = content.match(check.pattern);
                const found = matches !== null;
                const count = check.count && matches ? matches.length : null;
                
                this.results.testStructure.push({
                    name: check.name,
                    status: found ? 'found' : 'missing',
                    count: count,
                    message: found ? 
                        (count ? `Found ${count} instances` : 'Pattern found') : 
                        'Pattern not found'
                });
                
                console.log(`  ${found ? '✅' : '❌'} ${check.name} - ${found ? (count ? `Found (${count})` : 'Found') : 'Missing'}`);
            }
            
        } catch (error) {
            this.results.testStructure.push({
                name: 'Test File Analysis',
                status: 'error',
                message: error.message
            });
            console.log(`  ❌ Test File Analysis - Error: ${error.message}`);
        }
        
        console.log('');
    }

    /**
     * Generate verification report
     */
    generateReport() {
        console.log('📊 Verification Report');
        console.log('='.repeat(50));
        
        // Calculate overall status
        const allDepsFound = this.results.dependencies.every(d => d.status === 'found');
        const allTestFilesFound = this.results.testFiles.every(t => t.status === 'found');
        const allMocksAvailable = this.results.mockSetup.every(m => m.status === 'available');
        const allStructureFound = this.results.testStructure.every(s => s.status === 'found');
        
        if (allDepsFound && allTestFilesFound && allMocksAvailable && allStructureFound) {
            this.results.overall = 'passed';
            console.log('🎉 Overall Status: PASSED - All checks successful!');
        } else {
            this.results.overall = 'failed';
            console.log('❌ Overall Status: FAILED - Some checks failed');
        }
        
        console.log('');
        
        // Detailed breakdown
        console.log('📋 Detailed Results:');
        
        console.log('\n  Dependencies:');
        this.results.dependencies.forEach(dep => {
            console.log(`    ${dep.status === 'found' ? '✅' : '❌'} ${dep.file}: ${dep.message}`);
        });
        
        console.log('\n  Test Files:');
        this.results.testFiles.forEach(file => {
            console.log(`    ${file.status === 'found' ? '✅' : '❌'} ${file.file}: ${file.message}`);
        });
        
        console.log('\n  Mock Setup:');
        this.results.mockSetup.forEach(mock => {
            console.log(`    ${mock.status === 'available' ? '✅' : '❌'} ${mock.name}: ${mock.message}`);
        });
        
        console.log('\n  Test Structure:');
        this.results.testStructure.forEach(struct => {
            console.log(`    ${struct.status === 'found' ? '✅' : '❌'} ${struct.name}: ${struct.message}`);
        });
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (!allDepsFound) {
            console.log('  • Ensure all monitoring component files are in the same directory');
            console.log('  • Check file paths and names match exactly');
        }
        
        if (!allTestFilesFound) {
            console.log('  • Verify test files are properly created and accessible');
            console.log('  • Check file permissions and web server configuration');
        }
        
        if (!allMocksAvailable) {
            console.log('  • Run tests in a modern browser with full API support');
            console.log('  • Consider using polyfills for missing APIs');
        }
        
        if (!allStructureFound) {
            console.log('  • Review test file structure and ensure all test suites are present');
            console.log('  • Verify test syntax and mock setup');
        }
        
        if (this.results.overall === 'passed') {
            console.log('  • All checks passed! You can run the tests with confidence');
            console.log('  • Open analytics-monitoring-test-runner.html to execute tests');
        }
        
        console.log('\n' + '='.repeat(50));
    }

    /**
     * Get verification results
     */
    getResults() {
        return this.results;
    }
}

// Auto-run verification if in browser
if (typeof window !== 'undefined') {
    const verifier = new TestVerifier();
    verifier.runVerification();
    
    // Make verifier available globally
    window.testVerifier = verifier;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestVerifier;
}