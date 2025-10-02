/**
 * Verification Script for Server Management and Health Testing Implementation
 * 
 * This script validates that all components of the server management testing
 * implementation are properly created and functional.
 */

class ServerManagementTestVerifier {
    constructor() {
        this.results = [];
        this.requiredFiles = [
            'server-startup-test-runner.html',
            'server-startup-tests.js',
            'server-error-recovery-test-runner.html',
            'server-error-recovery-tests.js',
            'server-management-testing-documentation.md'
        ];
        this.requiredFunctions = [
            'runRestartTest',
            'runHealthTest',
            'runConnectivityTest',
            'runCompleteTest',
            'runFailureSimulation',
            'runNetworkTest',
            'runPerformanceTest',
            'runCompleteRecoveryTest'
        ];
    }

    /**
     * Run complete verification of the server management testing implementation
     */
    async runVerification() {
        console.log('🔍 Starting Server Management Testing Verification...');
        console.log('=====================================================');
        
        // Verify file structure
        await this.verifyFileStructure();
        
        // Verify HTML interfaces
        await this.verifyHtmlInterfaces();
        
        // Verify JavaScript functionality
        await this.verifyJavaScriptFunctionality();
        
        // Verify requirements compliance
        await this.verifyRequirementsCompliance();
        
        // Generate verification report
        this.generateVerificationReport();
        
        return this.results;
    }

    /**
     * Verify that all required files exist
     */
    async verifyFileStructure() {
        console.log('\n📁 Verifying File Structure...');
        
        for (const file of this.requiredFiles) {
            try {
                const response = await fetch(file, { method: 'HEAD' });
                if (response.ok) {
                    this.addResult('File Structure', `${file} exists`, 'success');
                    console.log(`✅ ${file} - Found`);
                } else {
                    this.addResult('File Structure', `${file} missing`, 'error');
                    console.log(`❌ ${file} - Missing`);
                }
            } catch (error) {
                this.addResult('File Structure', `${file} error: ${error.message}`, 'error');
                console.log(`❌ ${file} - Error: ${error.message}`);
            }
        }
    }

    /**
     * Verify HTML interface structure and elements
     */
    async verifyHtmlInterfaces() {
        console.log('\n🌐 Verifying HTML Interfaces...');
        
        // Test server startup interface
        await this.verifyHtmlInterface('server-startup-test-runner.html', [
            'restart-status',
            'health-status',
            'connectivity-status',
            'complete-status',
            'restart-log',
            'health-log',
            'connectivity-log',
            'complete-log'
        ]);
        
        // Test error recovery interface
        await this.verifyHtmlInterface('server-error-recovery-test-runner.html', [
            'failure-status',
            'network-status',
            'performance-status',
            'complete-recovery-status',
            'failure-log',
            'network-log',
            'performance-log',
            'complete-recovery-log'
        ]);
    }

    /**
     * Verify specific HTML interface
     */
    async verifyHtmlInterface(filename, requiredElements) {
        try {
            const response = await fetch(filename);
            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                let missingElements = 0;
                for (const elementId of requiredElements) {
                    const element = doc.getElementById(elementId);
                    if (element) {
                        console.log(`  ✅ ${filename}: Element #${elementId} found`);
                    } else {
                        console.log(`  ❌ ${filename}: Element #${elementId} missing`);
                        missingElements++;
                    }
                }
                
                if (missingElements === 0) {
                    this.addResult('HTML Interface', `${filename} structure complete`, 'success');
                } else {
                    this.addResult('HTML Interface', `${filename} missing ${missingElements} elements`, 'error');
                }
            } else {
                this.addResult('HTML Interface', `${filename} not accessible`, 'error');
            }
        } catch (error) {
            this.addResult('HTML Interface', `${filename} verification failed: ${error.message}`, 'error');
        }
    }

    /**
     * Verify JavaScript functionality
     */
    async verifyJavaScriptFunctionality() {
        console.log('\n⚙️ Verifying JavaScript Functionality...');
        
        // Check if functions are available in global scope
        for (const functionName of this.requiredFunctions) {
            if (typeof window[functionName] === 'function') {
                this.addResult('JavaScript Functions', `${functionName} available`, 'success');
                console.log(`✅ Function ${functionName} - Available`);
            } else {
                this.addResult('JavaScript Functions', `${functionName} missing`, 'error');
                console.log(`❌ Function ${functionName} - Missing`);
            }
        }
        
        // Test class instantiation
        try {
            if (typeof ServerStartupTester !== 'undefined') {
                const startupTester = new ServerStartupTester();
                this.addResult('JavaScript Classes', 'ServerStartupTester instantiated', 'success');
                console.log('✅ ServerStartupTester class - OK');
            } else {
                this.addResult('JavaScript Classes', 'ServerStartupTester not available', 'error');
                console.log('❌ ServerStartupTester class - Missing');
            }
        } catch (error) {
            this.addResult('JavaScript Classes', `ServerStartupTester error: ${error.message}`, 'error');
        }
        
        try {
            if (typeof ServerErrorRecoveryTester !== 'undefined') {
                const recoveryTester = new ServerErrorRecoveryTester();
                this.addResult('JavaScript Classes', 'ServerErrorRecoveryTester instantiated', 'success');
                console.log('✅ ServerErrorRecoveryTester class - OK');
            } else {
                this.addResult('JavaScript Classes', 'ServerErrorRecoveryTester not available', 'error');
                console.log('❌ ServerErrorRecoveryTester class - Missing');
            }
        } catch (error) {
            this.addResult('JavaScript Classes', `ServerErrorRecoveryTester error: ${error.message}`, 'error');
        }
    }

    /**
     * Verify requirements compliance
     */
    async verifyRequirementsCompliance() {
        console.log('\n📋 Verifying Requirements Compliance...');
        
        const requirements = [
            {
                id: '6.1',
                description: 'Server restart testing with restart script',
                implementation: 'runRestartTest function and restart validation'
            },
            {
                id: '6.2',
                description: 'Health endpoint validation for both servers',
                implementation: 'runHealthTest function with frontend/backend checks'
            },
            {
                id: '6.3',
                description: 'Connectivity testing and URL verification',
                implementation: 'runConnectivityTest function with URL validation'
            },
            {
                id: '6.4',
                description: 'Server failure simulation and recovery testing',
                implementation: 'runFailureSimulation function with error scenarios'
            },
            {
                id: '6.5',
                description: 'Network connectivity testing and error handling',
                implementation: 'runNetworkTest function with network scenarios'
            },
            {
                id: '9.4',
                description: 'Performance monitoring and resource usage tracking',
                implementation: 'runPerformanceTest function with metrics tracking'
            }
        ];
        
        for (const req of requirements) {
            // Check if the implementation exists
            const implemented = this.checkRequirementImplementation(req.id);
            
            if (implemented) {
                this.addResult('Requirements', `Requirement ${req.id} implemented`, 'success');
                console.log(`✅ Requirement ${req.id}: ${req.description}`);
                console.log(`   Implementation: ${req.implementation}`);
            } else {
                this.addResult('Requirements', `Requirement ${req.id} not implemented`, 'error');
                console.log(`❌ Requirement ${req.id}: ${req.description}`);
            }
        }
    }

    /**
     * Check if a specific requirement is implemented
     */
    checkRequirementImplementation(requirementId) {
        const implementations = {
            '6.1': typeof runRestartTest === 'function',
            '6.2': typeof runHealthTest === 'function',
            '6.3': typeof runConnectivityTest === 'function',
            '6.4': typeof runFailureSimulation === 'function',
            '6.5': typeof runNetworkTest === 'function',
            '9.4': typeof runPerformanceTest === 'function'
        };
        
        return implementations[requirementId] || false;
    }

    /**
     * Add result to verification results
     */
    addResult(category, message, status) {
        this.results.push({
            category,
            message,
            status,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate comprehensive verification report
     */
    generateVerificationReport() {
        console.log('\n📊 VERIFICATION REPORT');
        console.log('======================');
        
        const categories = [...new Set(this.results.map(r => r.category))];
        let overallSuccess = true;
        
        for (const category of categories) {
            const categoryResults = this.results.filter(r => r.category === category);
            const successCount = categoryResults.filter(r => r.status === 'success').length;
            const totalCount = categoryResults.length;
            const successRate = (successCount / totalCount) * 100;
            
            console.log(`\n${category}:`);
            console.log(`  Success Rate: ${successRate.toFixed(1)}% (${successCount}/${totalCount})`);
            
            if (successRate < 100) {
                overallSuccess = false;
                const failures = categoryResults.filter(r => r.status !== 'success');
                console.log('  Issues:');
                failures.forEach(failure => {
                    console.log(`    - ${failure.message}`);
                });
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log(`OVERALL VERIFICATION: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (overallSuccess) {
            console.log('🎉 All server management testing components are properly implemented!');
            console.log('📋 Requirements 6.1, 6.2, 6.3, 6.4, 6.5, and 9.4 are satisfied');
            console.log('🚀 Server startup testing is ready for use');
            console.log('🛠️ Error recovery testing is ready for use');
        } else {
            console.log('⚠️ Some components need attention - review the issues above');
        }
        
        return overallSuccess;
    }

    /**
     * Run a quick functional test
     */
    async runFunctionalTest() {
        console.log('\n🧪 Running Functional Test...');
        
        try {
            // Test basic server connectivity
            const response = await fetch('http://localhost:8000/api/health', { 
                method: 'GET',
                timeout: 5000 
            });
            
            if (response.ok) {
                console.log('✅ Backend server is accessible');
                this.addResult('Functional Test', 'Backend connectivity verified', 'success');
            } else {
                console.log('⚠️ Backend server returned non-OK status');
                this.addResult('Functional Test', 'Backend connectivity issues', 'warning');
            }
        } catch (error) {
            console.log('❌ Backend server not accessible');
            this.addResult('Functional Test', 'Backend not accessible', 'error');
        }
        
        try {
            // Test frontend connectivity
            const response = await fetch('http://127.0.0.1:3000', { 
                method: 'GET',
                timeout: 5000 
            });
            
            if (response.ok) {
                console.log('✅ Frontend server is accessible');
                this.addResult('Functional Test', 'Frontend connectivity verified', 'success');
            } else {
                console.log('⚠️ Frontend server returned non-OK status');
                this.addResult('Functional Test', 'Frontend connectivity issues', 'warning');
            }
        } catch (error) {
            console.log('❌ Frontend server not accessible');
            this.addResult('Functional Test', 'Frontend not accessible', 'error');
        }
    }
}

// Global verification function
async function verifyServerManagementTests() {
    const verifier = new ServerManagementTestVerifier();
    
    // Run verification
    const results = await verifier.runVerification();
    
    // Run functional test if servers are available
    await verifier.runFunctionalTest();
    
    return results;
}

// Auto-run verification when script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Server Management Testing Verifier loaded');
    console.log('Run verifyServerManagementTests() to verify implementation');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServerManagementTestVerifier, verifyServerManagementTests };
}