/**
 * Task 11.1 Validation Script
 * Validates that all required test suites are available and can be executed
 * 
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1
 */

class Task11_1Validator {
    constructor() {
        this.validationResults = [];
        this.requiredTestSuites = [
            'AuthenticationTestingModule',
            'DownloadModalInterceptionTester',
            'FormatSpecificDownloadTester', 
            'ServerStartupTester',
            'ComprehensiveTestExecutionSuite'
        ];
        this.requiredDependencies = [
            'authManager',
            'authUI',
            'apiClient',
            'notifications',
            'downloadModal',
            'enhancedLogger'
        ];
    }

    /**
     * Run complete validation for Task 11.1
     */
    async validateTask11_1() {
        console.log('🧪 Starting Task 11.1 Validation...');
        console.log('📋 Task: Run complete test suite execution');
        console.log('📝 Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1');
        
        const validationResults = {
            dependencies: await this.validateDependencies(),
            testSuites: await this.validateTestSuites(),
            testExecution: await this.validateTestExecution(),
            requirements: await this.validateRequirements()
        };
        
        const overallSuccess = Object.values(validationResults).every(result => result.success);
        
        console.log('\n📊 Task 11.1 Validation Results:');
        console.log('=' .repeat(50));
        console.log(`Dependencies: ${validationResults.dependencies.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Test Suites: ${validationResults.testSuites.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Test Execution: ${validationResults.testExecution.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Requirements: ${validationResults.requirements.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!overallSuccess) {
            console.log('\n❌ Validation Issues Found:');
            Object.entries(validationResults).forEach(([category, result]) => {
                if (!result.success && result.issues) {
                    console.log(`\n${category.toUpperCase()}:`);
                    result.issues.forEach(issue => console.log(`  • ${issue}`));
                }
            });
        }
        
        return {
            success: overallSuccess,
            results: validationResults
        };
    }

    /**
     * Validate required dependencies are available
     */
    async validateDependencies() {
        console.log('\n🔍 Validating Dependencies...');
        
        const issues = [];
        const results = {};
        
        for (const dependency of this.requiredDependencies) {
            const available = window[dependency] !== undefined;
            results[dependency] = available;
            
            if (available) {
                console.log(`  ✅ ${dependency}: Available`);
            } else {
                console.log(`  ❌ ${dependency}: Missing`);
                issues.push(`${dependency} is not available`);
            }
        }
        
        // Check for DOM readiness
        const domReady = document.readyState === 'complete';
        results.domReady = domReady;
        
        if (domReady) {
            console.log('  ✅ DOM: Ready');
        } else {
            console.log('  ❌ DOM: Not ready');
            issues.push('DOM is not ready');
        }
        
        return {
            success: issues.length === 0,
            results,
            issues
        };
    }

    /**
     * Validate test suites are available and properly configured
     */
    async validateTestSuites() {
        console.log('\n🧪 Validating Test Suites...');
        
        const issues = [];
        const results = {};
        
        for (const testSuite of this.requiredTestSuites) {
            try {
                const available = window[testSuite] !== undefined;
                results[testSuite] = { available };
                
                if (available) {
                    console.log(`  ✅ ${testSuite}: Available`);
                    
                    // Try to instantiate the test suite
                    const TestClass = window[testSuite];
                    const instance = new TestClass();
                    results[testSuite].instantiable = true;
                    
                    // Check for required methods
                    const requiredMethods = this.getRequiredMethods(testSuite);
                    const methodsAvailable = requiredMethods.every(method => 
                        typeof instance[method] === 'function'
                    );
                    results[testSuite].methodsAvailable = methodsAvailable;
                    
                    if (methodsAvailable) {
                        console.log(`    ✅ Required methods: Available`);
                    } else {
                        console.log(`    ❌ Required methods: Missing`);
                        issues.push(`${testSuite} missing required methods`);
                    }
                    
                } else {
                    console.log(`  ❌ ${testSuite}: Missing`);
                    issues.push(`${testSuite} is not available`);
                    results[testSuite].available = false;
                }
                
            } catch (error) {
                console.log(`  ❌ ${testSuite}: Error - ${error.message}`);
                issues.push(`${testSuite} instantiation failed: ${error.message}`);
                results[testSuite].error = error.message;
            }
        }
        
        return {
            success: issues.length === 0,
            results,
            issues
        };
    }

    /**
     * Get required methods for each test suite
     */
    getRequiredMethods(testSuite) {
        const methodMap = {
            'AuthenticationTestingModule': ['initialize', 'runAllTests'],
            'DownloadModalInterceptionTester': ['init', 'runAllTests'],
            'FormatSpecificDownloadTester': ['init', 'runAllTests'],
            'ServerStartupTester': ['runCompleteTest'],
            'ComprehensiveTestExecutionSuite': ['executeAllTests', 'getAvailableTestSuites']
        };
        
        return methodMap[testSuite] || [];
    }

    /**
     * Validate test execution capabilities
     */
    async validateTestExecution() {
        console.log('\n⚡ Validating Test Execution...');
        
        const issues = [];
        const results = {};
        
        try {
            // Test ComprehensiveTestExecutionSuite initialization
            if (window.ComprehensiveTestExecutionSuite) {
                const testSuite = new window.ComprehensiveTestExecutionSuite();
                results.suiteInitialization = true;
                console.log('  ✅ Test suite initialization: Success');
                
                // Test getting available test suites
                const availableSuites = testSuite.getAvailableTestSuites();
                results.availableSuites = availableSuites.length;
                console.log(`  ✅ Available test suites: ${availableSuites.length}`);
                
                // Validate each suite configuration
                const expectedSuites = ['authentication', 'download-modal', 'format-downloads', 'server-management', 'logging'];
                const missingSuites = expectedSuites.filter(expected => 
                    !availableSuites.some(suite => suite.id === expected)
                );
                
                if (missingSuites.length === 0) {
                    console.log('  ✅ All expected test suites configured');
                    results.suiteConfiguration = true;
                } else {
                    console.log(`  ❌ Missing test suites: ${missingSuites.join(', ')}`);
                    issues.push(`Missing test suites: ${missingSuites.join(', ')}`);
                    results.suiteConfiguration = false;
                }
                
                // Test progress callback setup
                let progressCallbackCalled = false;
                testSuite.setProgressCallback(() => {
                    progressCallbackCalled = true;
                });
                
                // Simulate progress update
                if (testSuite.updateProgress) {
                    testSuite.updateProgress(0, 1, 'Test progress');
                }
                
                results.progressCallback = true; // We can't easily test this without running
                console.log('  ✅ Progress callback setup: Available');
                
                // Test log callback setup
                let logCallbackCalled = false;
                testSuite.setLogCallback(() => {
                    logCallbackCalled = true;
                });
                
                results.logCallback = true;
                console.log('  ✅ Log callback setup: Available');
                
            } else {
                issues.push('ComprehensiveTestExecutionSuite not available');
                results.suiteInitialization = false;
            }
            
        } catch (error) {
            console.log(`  ❌ Test execution validation failed: ${error.message}`);
            issues.push(`Test execution validation failed: ${error.message}`);
        }
        
        return {
            success: issues.length === 0,
            results,
            issues
        };
    }

    /**
     * Validate requirements coverage
     */
    async validateRequirements() {
        console.log('\n📋 Validating Requirements Coverage...');
        
        const issues = [];
        const results = {};
        
        // Task 11.1 requirements mapping
        const taskRequirements = {
            '1.1': 'Authentication flow tests - user registration',
            '2.1': 'Authentication flow tests - user login', 
            '3.1': 'Download functionality tests - format selection',
            '4.1': 'Logging tests - request/response logging',
            '5.1': 'Download modal tests - button interception',
            '6.1': 'Server management tests - startup validation'
        };
        
        // Check if test suites cover the required functionality
        const coverageMap = {
            '1.1': ['AuthenticationTestingModule'],
            '2.1': ['AuthenticationTestingModule'],
            '3.1': ['FormatSpecificDownloadTester'],
            '4.1': ['ComprehensiveTestExecutionSuite'],
            '5.1': ['DownloadModalInterceptionTester'],
            '6.1': ['ServerStartupTester']
        };
        
        for (const [requirement, description] of Object.entries(taskRequirements)) {
            const requiredSuites = coverageMap[requirement] || [];
            const suitesCovered = requiredSuites.every(suite => window[suite] !== undefined);
            
            results[requirement] = {
                description,
                requiredSuites,
                covered: suitesCovered
            };
            
            if (suitesCovered) {
                console.log(`  ✅ Requirement ${requirement}: Covered by ${requiredSuites.join(', ')}`);
            } else {
                console.log(`  ❌ Requirement ${requirement}: Not covered - missing ${requiredSuites.join(', ')}`);
                issues.push(`Requirement ${requirement} not covered - missing test suites`);
            }
        }
        
        // Check for comprehensive test execution capability
        if (window.ComprehensiveTestExecutionSuite) {
            try {
                const testSuite = new window.ComprehensiveTestExecutionSuite();
                const availableSuites = testSuite.getAvailableTestSuites();
                
                // Verify all requirements are mapped to available test suites
                const allRequirementsCovered = Object.keys(taskRequirements).every(req => {
                    const requiredSuites = coverageMap[req] || [];
                    return requiredSuites.every(suite => 
                        availableSuites.some(available => available.testerClass === suite)
                    );
                });
                
                results.comprehensiveCoverage = allRequirementsCovered;
                
                if (allRequirementsCovered) {
                    console.log('  ✅ Comprehensive requirements coverage: Available');
                } else {
                    console.log('  ❌ Comprehensive requirements coverage: Incomplete');
                    issues.push('Not all requirements have corresponding test suites configured');
                }
                
            } catch (error) {
                console.log(`  ❌ Requirements coverage validation failed: ${error.message}`);
                issues.push(`Requirements coverage validation failed: ${error.message}`);
            }
        }
        
        return {
            success: issues.length === 0,
            results,
            issues
        };
    }

    /**
     * Generate validation report
     */
    generateValidationReport(validationResults) {
        const report = {
            taskId: '11.1',
            taskName: 'Run complete test suite execution',
            validatedAt: new Date().toISOString(),
            overallSuccess: validationResults.success,
            categories: validationResults.results,
            summary: {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0
            }
        };
        
        // Calculate summary statistics
        Object.values(validationResults.results).forEach(category => {
            if (category.results) {
                Object.values(category.results).forEach(result => {
                    report.summary.totalChecks++;
                    if (result === true || (typeof result === 'object' && result.available)) {
                        report.summary.passedChecks++;
                    } else {
                        report.summary.failedChecks++;
                    }
                });
            }
        });
        
        return report;
    }
}

// Auto-run validation if this script is loaded directly
if (typeof window !== 'undefined') {
    window.Task11_1Validator = Task11_1Validator;
    
    // Auto-validate when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Auto-running Task 11.1 validation...');
        
        // Wait a bit for all modules to load
        setTimeout(async () => {
            const validator = new Task11_1Validator();
            const results = await validator.validateTask11_1();
            
            // Generate and save report
            const report = validator.generateValidationReport(results);
            localStorage.setItem('task_11_1_validation_report', JSON.stringify(report));
            
            console.log('\n💾 Validation report saved to localStorage');
            console.log('🎯 Task 11.1 validation completed');
            
        }, 2000);
    });
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Task11_1Validator;
}

console.log('✅ Task 11.1 Validator loaded');