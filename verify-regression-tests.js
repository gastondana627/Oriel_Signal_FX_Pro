/**
 * Regression Tests Verification Script
 * Task 11.3: Write regression tests
 * 
 * This script validates the implementation of regression tests
 * to ensure they meet the requirements and cover all necessary scenarios.
 * 
 * Requirements: 8.3, 9.1
 */

class RegressionTestsValidator {
    constructor() {
        this.validationResults = [];
        this.requiredComponents = [
            'RegressionTestSuite',
            'regression-test-suite.js',
            'regression-test-runner.html'
        ];
        
        this.expectedFixedIssues = [
            'auth_token_refresh',
            'login_session_persistence',
            'modal_interception_timing',
            'file_generation_timeout',
            'health_check_reliability',
            'error_message_clarity',
            'error_cascade_loop_fix',
            'anonymous_download_auth_fix',
            'storage_quota_management_fix',
            'registration_validation_fix',
            'modal_display_timing_fix',
            'network_error_handling_fix'
        ];
        
        this.expectedEdgeCases = [
            'concurrent_authentication',
            'modal_rapid_toggling',
            'network_interruption_recovery',
            'browser_tab_switching',
            'memory_pressure_handling',
            'error_cascade_prevention',
            'anonymous_download_tracking',
            'storage_quota_exceeded',
            'form_validation_race_condition',
            'api_endpoint_unavailable',
            'modal_z_index_conflict',
            'file_generation_timeout_recovery',
            'session_expiry_during_operation'
        ];
    }

    /**
     * Run complete validation of regression tests implementation
     */
    async validateRegressionTests() {
        console.log('🔍 Starting regression tests validation...');
        console.log('📋 Task 11.3: Write regression tests');
        console.log('📋 Requirements: 8.3, 9.1');
        
        const startTime = Date.now();
        
        try {
            // Validate components exist
            await this.validateComponents();
            
            // Validate RegressionTestSuite class
            await this.validateRegressionTestSuite();
            
            // Validate fixed issues coverage
            await this.validateFixedIssues();
            
            // Validate edge cases coverage
            await this.validateEdgeCases();
            
            // Validate test implementations
            await this.validateTestImplementations();
            
            // Validate requirements coverage
            await this.validateRequirementsCoverage();
            
            // Generate validation report
            const report = this.generateValidationReport();
            
            const duration = Date.now() - startTime;
            console.log(`\n✅ Regression tests validation completed in ${duration}ms`);
            console.log(`📊 Overall Score: ${report.overallScore.toFixed(1)}%`);
            
            return report;
            
        } catch (error) {
            console.error('❌ Regression tests validation failed:', error);
            throw error;
        }
    }

    /**
     * Validate required components exist
     */
    async validateComponents() {
        console.log('\n🔧 Validating regression test components...');
        
        const componentChecks = [
            {
                name: 'RegressionTestSuite Class',
                check: () => typeof window.RegressionTestSuite === 'function',
                required: true
            },
            {
                name: 'Regression Test Runner HTML',
                check: () => document.title.includes('Regression Test Suite'),
                required: true
            },
            {
                name: 'Test Results Container',
                check: () => !!document.getElementById('test-results-list'),
                required: true
            },
            {
                name: 'Control Buttons',
                check: () => !!document.getElementById('run-all-btn'),
                required: true
            }
        ];
        
        let componentsValid = true;
        
        for (const check of componentChecks) {
            try {
                const isValid = check.check();
                
                this.addValidationResult(
                    'Components',
                    check.name,
                    isValid ? 'PASS' : 'FAIL',
                    isValid ? null : 'Component not found or not functional'
                );
                
                if (check.required && !isValid) {
                    componentsValid = false;
                }
                
                console.log(`${isValid ? '✅' : '❌'} ${check.name}`);
                
            } catch (error) {
                this.addValidationResult(
                    'Components',
                    check.name,
                    'ERROR',
                    error.message
                );
                
                if (check.required) {
                    componentsValid = false;
                }
                
                console.log(`❌ ${check.name}: ${error.message}`);
            }
        }
        
        if (!componentsValid) {
            throw new Error('Required regression test components are missing');
        }
    }

    /**
     * Validate RegressionTestSuite class implementation
     */
    async validateRegressionTestSuite() {
        console.log('\n🧪 Validating RegressionTestSuite class...');
        
        if (typeof window.RegressionTestSuite !== 'function') {
            throw new Error('RegressionTestSuite class not found');
        }
        
        // Create test instance
        const testSuite = new window.RegressionTestSuite();
        
        const methodChecks = [
            {
                name: 'runAllRegressionTests',
                check: () => typeof testSuite.runAllRegressionTests === 'function'
            },
            {
                name: 'runFixedIssueTests',
                check: () => typeof testSuite.runFixedIssueTests === 'function'
            },
            {
                name: 'runEdgeCaseTests',
                check: () => typeof testSuite.runEdgeCaseTests === 'function'
            },
            {
                name: 'generateRegressionReport',
                check: () => typeof testSuite.generateRegressionReport === 'function'
            },
            {
                name: 'initializeKnownIssues',
                check: () => typeof testSuite.initializeKnownIssues === 'function'
            },
            {
                name: 'initializeEdgeCases',
                check: () => typeof testSuite.initializeEdgeCases === 'function'
            }
        ];
        
        let methodsValid = true;
        
        for (const check of methodChecks) {
            const isValid = check.check();
            
            this.addValidationResult(
                'RegressionTestSuite',
                check.name,
                isValid ? 'PASS' : 'FAIL',
                isValid ? null : 'Method not implemented'
            );
            
            if (!isValid) {
                methodsValid = false;
            }
            
            console.log(`${isValid ? '✅' : '❌'} Method: ${check.name}`);
        }
        
        // Validate properties
        const propertyChecks = [
            {
                name: 'fixedIssues Map',
                check: () => testSuite.fixedIssues instanceof Map
            },
            {
                name: 'edgeCases Map',
                check: () => testSuite.edgeCases instanceof Map
            },
            {
                name: 'testResults Array',
                check: () => Array.isArray(testSuite.testResults)
            },
            {
                name: 'config Object',
                check: () => typeof testSuite.config === 'object'
            }
        ];
        
        for (const check of propertyChecks) {
            const isValid = check.check();
            
            this.addValidationResult(
                'RegressionTestSuite',
                check.name,
                isValid ? 'PASS' : 'FAIL',
                isValid ? null : 'Property not properly initialized'
            );
            
            if (!isValid) {
                methodsValid = false;
            }
            
            console.log(`${isValid ? '✅' : '❌'} Property: ${check.name}`);
        }
        
        if (!methodsValid) {
            throw new Error('RegressionTestSuite class implementation is incomplete');
        }
    }

    /**
     * Validate fixed issues coverage
     */
    async validateFixedIssues() {
        console.log('\n🐛 Validating fixed issues coverage...');
        
        if (typeof window.RegressionTestSuite !== 'function') {
            throw new Error('RegressionTestSuite class not available for validation');
        }
        
        const testSuite = new window.RegressionTestSuite();
        
        // Check that fixed issues are properly registered
        const registeredIssues = Array.from(testSuite.fixedIssues.keys());
        
        console.log(`📊 Found ${registeredIssues.length} registered fixed issues`);
        
        let coverageValid = true;
        
        for (const expectedIssue of this.expectedFixedIssues) {
            const isRegistered = registeredIssues.includes(expectedIssue);
            
            this.addValidationResult(
                'Fixed Issues',
                expectedIssue,
                isRegistered ? 'PASS' : 'FAIL',
                isRegistered ? null : 'Fixed issue not registered'
            );
            
            if (!isRegistered) {
                coverageValid = false;
                console.log(`❌ Missing fixed issue: ${expectedIssue}`);
            } else {
                console.log(`✅ Fixed issue registered: ${expectedIssue}`);
                
                // Validate issue structure
                const issue = testSuite.fixedIssues.get(expectedIssue);
                const requiredFields = ['description', 'originalIssue', 'fixDescription', 'regressionTest', 'category', 'severity'];
                
                for (const field of requiredFields) {
                    if (!issue[field]) {
                        this.addValidationResult(
                            'Fixed Issues',
                            `${expectedIssue}.${field}`,
                            'FAIL',
                            `Missing required field: ${field}`
                        );
                        coverageValid = false;
                    }
                }
            }
        }
        
        // Check for extra issues (not necessarily bad, but worth noting)
        const extraIssues = registeredIssues.filter(issue => !this.expectedFixedIssues.includes(issue));
        if (extraIssues.length > 0) {
            console.log(`📝 Additional fixed issues found: ${extraIssues.join(', ')}`);
        }
        
        const coveragePercentage = (this.expectedFixedIssues.filter(issue => 
            registeredIssues.includes(issue)
        ).length / this.expectedFixedIssues.length) * 100;
        
        console.log(`📈 Fixed issues coverage: ${coveragePercentage.toFixed(1)}%`);
        
        if (coveragePercentage < 90) {
            throw new Error(`Fixed issues coverage too low: ${coveragePercentage.toFixed(1)}%`);
        }
    }

    /**
     * Validate edge cases coverage
     */
    async validateEdgeCases() {
        console.log('\n⚡ Validating edge cases coverage...');
        
        if (typeof window.RegressionTestSuite !== 'function') {
            throw new Error('RegressionTestSuite class not available for validation');
        }
        
        const testSuite = new window.RegressionTestSuite();
        
        // Check that edge cases are properly registered
        const registeredCases = Array.from(testSuite.edgeCases.keys());
        
        console.log(`📊 Found ${registeredCases.length} registered edge cases`);
        
        let coverageValid = true;
        
        for (const expectedCase of this.expectedEdgeCases) {
            const isRegistered = registeredCases.includes(expectedCase);
            
            this.addValidationResult(
                'Edge Cases',
                expectedCase,
                isRegistered ? 'PASS' : 'FAIL',
                isRegistered ? null : 'Edge case not registered'
            );
            
            if (!isRegistered) {
                coverageValid = false;
                console.log(`❌ Missing edge case: ${expectedCase}`);
            } else {
                console.log(`✅ Edge case registered: ${expectedCase}`);
                
                // Validate case structure
                const edgeCase = testSuite.edgeCases.get(expectedCase);
                const requiredFields = ['description', 'scenario', 'expectedBehavior', 'test', 'category'];
                
                for (const field of requiredFields) {
                    if (!edgeCase[field]) {
                        this.addValidationResult(
                            'Edge Cases',
                            `${expectedCase}.${field}`,
                            'FAIL',
                            `Missing required field: ${field}`
                        );
                        coverageValid = false;
                    }
                }
            }
        }
        
        // Check for extra cases
        const extraCases = registeredCases.filter(caseId => !this.expectedEdgeCases.includes(caseId));
        if (extraCases.length > 0) {
            console.log(`📝 Additional edge cases found: ${extraCases.join(', ')}`);
        }
        
        const coveragePercentage = (this.expectedEdgeCases.filter(caseId => 
            registeredCases.includes(caseId)
        ).length / this.expectedEdgeCases.length) * 100;
        
        console.log(`📈 Edge cases coverage: ${coveragePercentage.toFixed(1)}%`);
        
        if (coveragePercentage < 90) {
            throw new Error(`Edge cases coverage too low: ${coveragePercentage.toFixed(1)}%`);
        }
    }

    /**
     * Validate test implementations
     */
    async validateTestImplementations() {
        console.log('\n🧪 Validating test implementations...');
        
        if (typeof window.RegressionTestSuite !== 'function') {
            throw new Error('RegressionTestSuite class not available for validation');
        }
        
        const testSuite = new window.RegressionTestSuite();
        
        // Test a few key implementations
        const testValidations = [
            {
                name: 'Error Cascade Prevention Test',
                test: () => typeof testSuite.testErrorCascadePreventionEdgeCase === 'function'
            },
            {
                name: 'Anonymous Download Test',
                test: () => typeof testSuite.testAnonymousDownloadTrackingEdgeCase === 'function'
            },
            {
                name: 'Storage Quota Test',
                test: () => typeof testSuite.testStorageQuotaExceededEdgeCase === 'function'
            },
            {
                name: 'Modal Z-Index Test',
                test: () => typeof testSuite.testModalZIndexConflictEdgeCase === 'function'
            },
            {
                name: 'Token Refresh Regression Test',
                test: () => typeof testSuite.testTokenRefreshRegression === 'function'
            },
            {
                name: 'Session Persistence Regression Test',
                test: () => typeof testSuite.testSessionPersistenceRegression === 'function'
            }
        ];
        
        let implementationsValid = true;
        
        for (const validation of testValidations) {
            const isValid = validation.test();
            
            this.addValidationResult(
                'Test Implementations',
                validation.name,
                isValid ? 'PASS' : 'FAIL',
                isValid ? null : 'Test method not implemented'
            );
            
            if (!isValid) {
                implementationsValid = false;
            }
            
            console.log(`${isValid ? '✅' : '❌'} ${validation.name}`);
        }
        
        if (!implementationsValid) {
            throw new Error('Some test implementations are missing');
        }
    }

    /**
     * Validate requirements coverage
     */
    async validateRequirementsCoverage() {
        console.log('\n📋 Validating requirements coverage...');
        
        const requirements = {
            '8.3': {
                description: 'User feedback and error handling improvements',
                coveredBy: [
                    'error_message_clarity',
                    'modal_display_timing_fix',
                    'form_validation_race_condition',
                    'error_cascade_prevention'
                ]
            },
            '9.1': {
                description: 'Error logging and correlation enhancements',
                coveredBy: [
                    'error_cascade_loop_fix',
                    'storage_quota_management_fix',
                    'network_error_handling_fix',
                    'api_endpoint_unavailable'
                ]
            }
        };
        
        if (typeof window.RegressionTestSuite !== 'function') {
            throw new Error('RegressionTestSuite class not available for validation');
        }
        
        const testSuite = new window.RegressionTestSuite();
        const allRegisteredTests = [
            ...Array.from(testSuite.fixedIssues.keys()),
            ...Array.from(testSuite.edgeCases.keys())
        ];
        
        let requirementsCovered = true;
        
        for (const [reqId, requirement] of Object.entries(requirements)) {
            console.log(`\n📋 Requirement ${reqId}: ${requirement.description}`);
            
            let reqCoverage = 0;
            
            for (const testId of requirement.coveredBy) {
                const isCovered = allRegisteredTests.includes(testId);
                
                this.addValidationResult(
                    'Requirements',
                    `${reqId} - ${testId}`,
                    isCovered ? 'PASS' : 'FAIL',
                    isCovered ? null : 'Test not found for requirement coverage'
                );
                
                if (isCovered) {
                    reqCoverage++;
                    console.log(`  ✅ ${testId}`);
                } else {
                    console.log(`  ❌ ${testId} (missing)`);
                }
            }
            
            const coveragePercentage = (reqCoverage / requirement.coveredBy.length) * 100;
            console.log(`  📈 Coverage: ${coveragePercentage.toFixed(1)}%`);
            
            if (coveragePercentage < 80) {
                requirementsCovered = false;
            }
        }
        
        if (!requirementsCovered) {
            throw new Error('Requirements coverage is insufficient');
        }
    }

    /**
     * Add validation result
     */
    addValidationResult(category, test, status, error = null) {
        this.validationResults.push({
            category,
            test,
            status,
            error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate validation report
     */
    generateValidationReport() {
        const totalTests = this.validationResults.length;
        const passedTests = this.validationResults.filter(r => r.status === 'PASS').length;
        const failedTests = this.validationResults.filter(r => r.status === 'FAIL').length;
        const errorTests = this.validationResults.filter(r => r.status === 'ERROR').length;
        
        const overallScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        
        // Group by category
        const categories = {};
        this.validationResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { total: 0, passed: 0, failed: 0, errors: 0 };
            }
            categories[result.category].total++;
            if (result.status === 'PASS') categories[result.category].passed++;
            else if (result.status === 'FAIL') categories[result.category].failed++;
            else if (result.status === 'ERROR') categories[result.category].errors++;
        });
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                errors: errorTests,
                overallScore
            },
            categories,
            results: this.validationResults,
            recommendations: this.generateRecommendations(),
            timestamp: new Date().toISOString()
        };
        
        return report;
    }

    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations() {
        const recommendations = [];
        const failedResults = this.validationResults.filter(r => r.status === 'FAIL');
        const errorResults = this.validationResults.filter(r => r.status === 'ERROR');
        
        if (failedResults.length > 0) {
            recommendations.push({
                type: 'CRITICAL',
                message: `${failedResults.length} validation failures detected`,
                action: 'Review and fix failed validations before proceeding',
                priority: 1
            });
        }
        
        if (errorResults.length > 0) {
            recommendations.push({
                type: 'ERROR',
                message: `${errorResults.length} validation errors occurred`,
                action: 'Investigate and resolve validation errors',
                priority: 2
            });
        }
        
        // Category-specific recommendations
        const categories = {};
        this.validationResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { total: 0, failed: 0 };
            }
            categories[result.category].total++;
            if (result.status === 'FAIL') categories[result.category].failed++;
        });
        
        for (const [category, stats] of Object.entries(categories)) {
            const failureRate = (stats.failed / stats.total) * 100;
            if (failureRate > 20) {
                recommendations.push({
                    type: 'WARNING',
                    message: `High failure rate in ${category}: ${failureRate.toFixed(1)}%`,
                    action: `Review ${category} implementation and tests`,
                    priority: 3
                });
            }
        }
        
        return recommendations;
    }
}

// Auto-execute validation when script loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Regression Tests Validation Script Loaded');
    
    // Make validator available globally
    window.regressionTestsValidator = new RegressionTestsValidator();
    
    // Auto-run validation if in test environment
    if (window.location.search.includes('auto-validate')) {
        try {
            const report = await window.regressionTestsValidator.validateRegressionTests();
            console.log('📊 Validation Report:', report);
        } catch (error) {
            console.error('❌ Auto-validation failed:', error);
        }
    }
});

// Export for manual execution
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegressionTestsValidator;
}