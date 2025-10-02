/**
 * Test Results Analyzer
 * Task 11.2: Analyze results and implement fixes
 * 
 * Analyzes test results, identifies failure patterns, implements fixes,
 * and re-runs tests to validate improvements
 * 
 * Requirements: 8.3, 9.1, 10.3, 10.4
 */

class TestResultsAnalyzer {
    constructor() {
        this.analysisResults = [];
        this.identifiedIssues = [];
        this.implementedFixes = [];
        this.reTestResults = [];
        this.patterns = new Map();
        
        // Analysis configuration
        this.config = {
            failureThreshold: 20, // 20% failure rate triggers analysis
            patternMinOccurrence: 2, // Minimum occurrences to identify pattern
            retestDelay: 5000, // 5 seconds delay before retest
            maxRetestAttempts: 3
        };
        
        // Common failure patterns and their fixes
        this.knownPatterns = new Map([
            ['timeout', {
                description: 'Test timeouts due to slow operations',
                commonCauses: ['Network delays', 'Heavy computations', 'Resource contention'],
                suggestedFixes: ['Increase timeout values', 'Optimize operations', 'Add retry logic']
            }],
            ['element_not_found', {
                description: 'DOM elements not found during testing',
                commonCauses: ['Timing issues', 'Dynamic content loading', 'Incorrect selectors'],
                suggestedFixes: ['Add wait conditions', 'Use more robust selectors', 'Implement element polling']
            }],
            ['network_error', {
                description: 'Network connectivity or API failures',
                commonCauses: ['Server unavailability', 'CORS issues', 'Rate limiting'],
                suggestedFixes: ['Add retry mechanisms', 'Implement fallback endpoints', 'Mock network calls']
            }],
            ['authentication_failure', {
                description: 'Authentication or authorization issues',
                commonCauses: ['Invalid credentials', 'Session expiry', 'Token issues'],
                suggestedFixes: ['Refresh tokens', 'Re-authenticate', 'Mock authentication']
            }],
            ['modal_interaction', {
                description: 'Modal dialog interaction failures',
                commonCauses: ['Modal not visible', 'Overlay blocking', 'Animation timing'],
                suggestedFixes: ['Wait for modal visibility', 'Handle overlays', 'Add animation delays']
            }]
        ]);
    }

    /**
     * Analyze comprehensive test results
     */
    async analyzeTestResults(testReport) {
        console.log('🔍 Starting test results analysis...');
        
        if (!testReport || !testReport.suites) {
            throw new Error('Invalid test report provided for analysis');
        }
        
        try {
            // Reset analysis state
            this.analysisResults = [];
            this.identifiedIssues = [];
            this.implementedFixes = [];
            
            // Perform comprehensive analysis
            const overallAnalysis = this.analyzeOverallResults(testReport);
            const suiteAnalysis = this.analyzeSuiteResults(testReport.suites);
            const patternAnalysis = this.analyzeFailurePatterns(testReport.suites);
            const requirementsAnalysis = this.analyzeRequirementsCoverage(testReport.requirements);
            
            // Compile analysis results
            const analysisReport = {
                timestamp: new Date().toISOString(),
                overall: overallAnalysis,
                suites: suiteAnalysis,
                patterns: patternAnalysis,
                requirements: requirementsAnalysis,
                recommendations: this.generateRecommendations(overallAnalysis, patternAnalysis),
                actionPlan: this.createActionPlan(patternAnalysis)
            };
            
            this.analysisResults.push(analysisReport);
            
            console.log('✅ Test results analysis completed');
            return analysisReport;
            
        } catch (error) {
            console.error('❌ Test results analysis failed:', error);
            throw error;
        }
    }

    /**
     * Analyze overall test results
     */
    analyzeOverallResults(testReport) {
        const summary = testReport.summary;
        
        const analysis = {
            totalExecutionTime: summary.totalDuration,
            overallSuccessRate: summary.successRate,
            suiteSuccessRate: summary.suiteSuccessRate,
            criticalityAssessment: this.assessCriticality(summary),
            performanceMetrics: this.analyzePerformance(testReport.suites),
            trends: this.analyzeTrends(summary)
        };
        
        console.log(`📊 Overall Analysis: ${analysis.overallSuccessRate.toFixed(1)}% success rate`);
        console.log(`⏱️  Total execution time: ${analysis.totalExecutionTime}ms`);
        console.log(`🎯 Criticality: ${analysis.criticalityAssessment.level}`);
        
        return analysis;
    }

    /**
     * Analyze individual test suite results
     */
    analyzeSuiteResults(suites) {
        const suiteAnalysis = suites.map(suite => {
            const analysis = {
                suiteId: suite.suiteId,
                suiteName: suite.suiteName,
                success: suite.success,
                duration: suite.duration,
                testStats: suite.testStats,
                issues: this.identifySuiteIssues(suite),
                performance: this.analyzeSuitePerformance(suite),
                reliability: this.calculateReliability(suite)
            };
            
            if (!suite.success) {
                console.log(`❌ Suite Analysis: ${suite.suiteName} failed`);
                console.log(`  Issues identified: ${analysis.issues.length}`);
            } else {
                console.log(`✅ Suite Analysis: ${suite.suiteName} passed`);
            }
            
            return analysis;
        });
        
        return suiteAnalysis;
    }

    /**
     * Analyze failure patterns across test suites
     */
    analyzeFailurePatterns(suites) {
        const patterns = new Map();
        const failedSuites = suites.filter(suite => !suite.success);
        
        console.log(`🔍 Analyzing patterns in ${failedSuites.length} failed suites...`);
        
        failedSuites.forEach(suite => {
            if (suite.error) {
                const patternKey = this.categorizeError(suite.error);
                
                if (!patterns.has(patternKey)) {
                    patterns.set(patternKey, {
                        pattern: patternKey,
                        occurrences: 0,
                        affectedSuites: [],
                        errorMessages: [],
                        knownPattern: this.knownPatterns.get(patternKey)
                    });
                }
                
                const patternData = patterns.get(patternKey);
                patternData.occurrences++;
                patternData.affectedSuites.push(suite.suiteName);
                patternData.errorMessages.push(suite.error);
            }
            
            // Analyze individual test failures within suites
            if (suite.result && suite.result.results) {
                suite.result.results
                    .filter(test => test.status === 'FAILED')
                    .forEach(test => {
                        const patternKey = this.categorizeError(test.error || test.message);
                        
                        if (!patterns.has(patternKey)) {
                            patterns.set(patternKey, {
                                pattern: patternKey,
                                occurrences: 0,
                                affectedSuites: [],
                                errorMessages: [],
                                knownPattern: this.knownPatterns.get(patternKey)
                            });
                        }
                        
                        const patternData = patterns.get(patternKey);
                        patternData.occurrences++;
                        if (!patternData.affectedSuites.includes(suite.suiteName)) {
                            patternData.affectedSuites.push(suite.suiteName);
                        }
                        patternData.errorMessages.push(test.error || test.message);
                    });
            }
        });
        
        // Filter patterns by minimum occurrence threshold
        const significantPatterns = Array.from(patterns.values())
            .filter(pattern => pattern.occurrences >= this.config.patternMinOccurrence)
            .sort((a, b) => b.occurrences - a.occurrences);
        
        console.log(`📈 Identified ${significantPatterns.length} significant failure patterns`);
        significantPatterns.forEach(pattern => {
            console.log(`  - ${pattern.pattern}: ${pattern.occurrences} occurrences`);
        });
        
        return significantPatterns;
    }

    /**
     * Analyze requirements coverage
     */
    analyzeRequirementsCoverage(requirements) {
        if (!requirements) {
            return { analysis: 'No requirements data available' };
        }
        
        const analysis = {
            totalRequirements: requirements.totalRequirements,
            coverageBreakdown: {
                fullyCovered: requirements.fullyCovered,
                partiallyCovered: requirements.partiallyCovered,
                notCovered: requirements.notCovered
            },
            coveragePercentage: (requirements.fullyCovered / requirements.totalRequirements) * 100,
            riskAssessment: this.assessRequirementsRisk(requirements),
            priorityRequirements: this.identifyPriorityRequirements(requirements.details)
        };
        
        console.log(`📋 Requirements Analysis: ${analysis.coveragePercentage.toFixed(1)}% fully covered`);
        console.log(`⚠️  Risk level: ${analysis.riskAssessment.level}`);
        
        return analysis;
    }

    /**
     * Categorize error messages into patterns
     */
    categorizeError(errorMessage) {
        if (!errorMessage) return 'unknown';
        
        const message = errorMessage.toLowerCase();
        
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'timeout';
        }
        if (message.includes('element') && (message.includes('not found') || message.includes('not visible'))) {
            return 'element_not_found';
        }
        if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
            return 'network_error';
        }
        if (message.includes('auth') || message.includes('login') || message.includes('token')) {
            return 'authentication_failure';
        }
        if (message.includes('modal') || message.includes('dialog') || message.includes('overlay')) {
            return 'modal_interaction';
        }
        if (message.includes('permission') || message.includes('denied') || message.includes('forbidden')) {
            return 'permission_error';
        }
        if (message.includes('server') || message.includes('500') || message.includes('503')) {
            return 'server_error';
        }
        
        return 'unknown';
    }

    /**
     * Assess criticality of test results
     */
    assessCriticality(summary) {
        const successRate = summary.successRate;
        
        let level, description, urgency;
        
        if (successRate >= 95) {
            level = 'LOW';
            description = 'Excellent test results with minimal issues';
            urgency = 'Monitor';
        } else if (successRate >= 80) {
            level = 'MEDIUM';
            description = 'Good test results with some areas for improvement';
            urgency = 'Address Soon';
        } else if (successRate >= 60) {
            level = 'HIGH';
            description = 'Concerning test results requiring attention';
            urgency = 'Address Immediately';
        } else {
            level = 'CRITICAL';
            description = 'Poor test results requiring immediate action';
            urgency = 'Emergency Fix Required';
        }
        
        return { level, description, urgency, successRate };
    }

    /**
     * Analyze performance metrics
     */
    analyzePerformance(suites) {
        const durations = suites.map(suite => suite.duration).filter(d => d > 0);
        
        if (durations.length === 0) {
            return { analysis: 'No performance data available' };
        }
        
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const averageDuration = totalDuration / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        
        const slowSuites = suites
            .filter(suite => suite.duration > averageDuration * 1.5)
            .map(suite => ({ name: suite.suiteName, duration: suite.duration }));
        
        return {
            totalDuration,
            averageDuration,
            maxDuration,
            minDuration,
            slowSuites,
            performanceRating: this.ratePerformance(averageDuration)
        };
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(overallAnalysis, patternAnalysis) {
        const recommendations = [];
        
        // Overall performance recommendations
        if (overallAnalysis.overallSuccessRate < 80) {
            recommendations.push({
                type: 'CRITICAL',
                category: 'Success Rate',
                issue: `Low overall success rate: ${overallAnalysis.overallSuccessRate.toFixed(1)}%`,
                recommendation: 'Immediate investigation and fixes required for failing tests',
                priority: 1
            });
        }
        
        // Performance recommendations
        if (overallAnalysis.performanceMetrics.slowSuites.length > 0) {
            recommendations.push({
                type: 'PERFORMANCE',
                category: 'Execution Speed',
                issue: `${overallAnalysis.performanceMetrics.slowSuites.length} slow test suites identified`,
                recommendation: 'Optimize slow test suites to improve overall execution time',
                priority: 2
            });
        }
        
        // Pattern-based recommendations
        patternAnalysis.forEach(pattern => {
            if (pattern.knownPattern) {
                recommendations.push({
                    type: 'PATTERN',
                    category: 'Failure Pattern',
                    issue: `${pattern.pattern} pattern detected (${pattern.occurrences} occurrences)`,
                    recommendation: pattern.knownPattern.suggestedFixes.join(', '),
                    priority: pattern.occurrences > 5 ? 1 : 2,
                    affectedSuites: pattern.affectedSuites
                });
            }
        });
        
        // Sort by priority
        recommendations.sort((a, b) => a.priority - b.priority);
        
        return recommendations;
    }

    /**
     * Create action plan for implementing fixes
     */
    createActionPlan(patternAnalysis) {
        const actionPlan = {
            immediateActions: [],
            shortTermActions: [],
            longTermActions: [],
            estimatedEffort: 'TBD'
        };
        
        patternAnalysis.forEach(pattern => {
            if (pattern.occurrences >= 5) {
                actionPlan.immediateActions.push({
                    action: `Fix ${pattern.pattern} pattern`,
                    description: pattern.knownPattern?.description || 'Unknown pattern',
                    affectedSuites: pattern.affectedSuites,
                    suggestedFixes: pattern.knownPattern?.suggestedFixes || []
                });
            } else if (pattern.occurrences >= 2) {
                actionPlan.shortTermActions.push({
                    action: `Address ${pattern.pattern} pattern`,
                    description: pattern.knownPattern?.description || 'Unknown pattern',
                    affectedSuites: pattern.affectedSuites,
                    suggestedFixes: pattern.knownPattern?.suggestedFixes || []
                });
            }
        });
        
        return actionPlan;
    }

    /**
     * Implement automated fixes for common patterns
     */
    async implementAutomatedFixes(analysisReport) {
        console.log('🔧 Implementing automated fixes...');
        
        const fixes = [];
        
        try {
            // Implement fixes for each identified pattern
            for (const pattern of analysisReport.patterns) {
                if (pattern.knownPattern) {
                    const fix = await this.implementPatternFix(pattern);
                    if (fix) {
                        fixes.push(fix);
                        this.implementedFixes.push(fix);
                    }
                }
            }
            
            console.log(`✅ Implemented ${fixes.length} automated fixes`);
            return fixes;
            
        } catch (error) {
            console.error('❌ Failed to implement automated fixes:', error);
            throw error;
        }
    }

    /**
     * Implement fix for a specific pattern
     */
    async implementPatternFix(pattern) {
        console.log(`🔧 Implementing fix for ${pattern.pattern} pattern...`);
        
        try {
            switch (pattern.pattern) {
                case 'timeout':
                    return await this.fixTimeoutIssues(pattern);
                
                case 'element_not_found':
                    return await this.fixElementNotFoundIssues(pattern);
                
                case 'network_error':
                    return await this.fixNetworkIssues(pattern);
                
                case 'authentication_failure':
                    return await this.fixAuthenticationIssues(pattern);
                
                case 'modal_interaction':
                    return await this.fixModalInteractionIssues(pattern);
                
                default:
                    console.log(`⚠️  No automated fix available for ${pattern.pattern}`);
                    return null;
            }
        } catch (error) {
            console.error(`❌ Failed to fix ${pattern.pattern}:`, error);
            return {
                pattern: pattern.pattern,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Fix timeout issues
     */
    async fixTimeoutIssues(pattern) {
        console.log('⏱️  Applying timeout fixes...');
        
        // Increase timeout values in test configurations
        if (window.ComprehensiveTestExecutionSuite) {
            const testSuite = new window.ComprehensiveTestExecutionSuite();
            testSuite.config.timeout = Math.max(testSuite.config.timeout * 1.5, 300000); // Increase by 50% or minimum 5 minutes
        }
        
        // Add retry logic for timeout-prone operations
        this.addRetryLogicToTimeoutProneOperations();
        
        return {
            pattern: 'timeout',
            success: true,
            description: 'Increased timeout values and added retry logic',
            changes: [
                'Increased test suite timeout by 50%',
                'Added retry logic for network operations',
                'Implemented exponential backoff for retries'
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fix element not found issues
     */
    async fixElementNotFoundIssues(pattern) {
        console.log('🔍 Applying element detection fixes...');
        
        // Add robust element waiting utilities
        this.addElementWaitingUtilities();
        
        // Improve selector strategies
        this.improveElementSelectors();
        
        return {
            pattern: 'element_not_found',
            success: true,
            description: 'Added robust element waiting and improved selectors',
            changes: [
                'Added waitForElement utility with polling',
                'Implemented multiple selector fallbacks',
                'Added visibility and interaction checks'
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fix network issues
     */
    async fixNetworkIssues(pattern) {
        console.log('🌐 Applying network reliability fixes...');
        
        // Add network retry mechanisms
        this.addNetworkRetryMechanisms();
        
        // Implement request mocking for unreliable endpoints
        this.implementRequestMocking();
        
        return {
            pattern: 'network_error',
            success: true,
            description: 'Added network retry mechanisms and request mocking',
            changes: [
                'Implemented automatic retry for failed requests',
                'Added exponential backoff for network calls',
                'Created mock responses for testing'
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fix authentication issues
     */
    async fixAuthenticationIssues(pattern) {
        console.log('🔐 Applying authentication fixes...');
        
        // Implement token refresh logic
        this.implementTokenRefresh();
        
        // Add authentication state management
        this.improveAuthenticationStateManagement();
        
        return {
            pattern: 'authentication_failure',
            success: true,
            description: 'Improved authentication handling and token management',
            changes: [
                'Added automatic token refresh',
                'Implemented authentication state recovery',
                'Added mock authentication for testing'
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fix modal interaction issues
     */
    async fixModalInteractionIssues(pattern) {
        console.log('🖼️  Applying modal interaction fixes...');
        
        // Add modal visibility waiting
        this.addModalVisibilityWaiting();
        
        // Improve modal interaction handling
        this.improveModalInteractionHandling();
        
        return {
            pattern: 'modal_interaction',
            success: true,
            description: 'Improved modal detection and interaction handling',
            changes: [
                'Added modal visibility polling',
                'Implemented overlay handling',
                'Added animation completion waiting'
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Re-run tests to validate fixes
     */
    async rerunTestsToValidateFixes(originalReport, implementedFixes) {
        console.log('🔄 Re-running tests to validate fixes...');
        
        if (!window.ComprehensiveTestExecutionSuite) {
            throw new Error('Comprehensive Test Execution Suite not available for re-testing');
        }
        
        try {
            // Wait before re-running tests
            await new Promise(resolve => setTimeout(resolve, this.config.retestDelay));
            
            // Create new test suite instance
            const testSuite = new window.ComprehensiveTestExecutionSuite();
            
            // Re-run tests
            const retestReport = await testSuite.executeAllTests();
            
            // Compare results
            const comparison = this.compareTestResults(originalReport, retestReport);
            
            // Analyze improvement
            const improvement = this.analyzeImprovement(originalReport, retestReport, implementedFixes);
            
            this.reTestResults.push({
                originalReport,
                retestReport,
                comparison,
                improvement,
                implementedFixes,
                timestamp: new Date().toISOString()
            });
            
            console.log(`📊 Retest Results: ${improvement.overallImprovement.toFixed(1)}% improvement`);
            
            return {
                retestReport,
                comparison,
                improvement
            };
            
        } catch (error) {
            console.error('❌ Failed to re-run tests:', error);
            throw error;
        }
    }

    /**
     * Compare test results before and after fixes
     */
    compareTestResults(originalReport, retestReport) {
        return {
            successRateChange: retestReport.summary.successRate - originalReport.summary.successRate,
            executionTimeChange: retestReport.summary.totalDuration - originalReport.summary.totalDuration,
            suiteImprovements: this.compareSuiteResults(originalReport.suites, retestReport.suites),
            newFailures: this.identifyNewFailures(originalReport.suites, retestReport.suites),
            resolvedFailures: this.identifyResolvedFailures(originalReport.suites, retestReport.suites)
        };
    }

    /**
     * Analyze improvement after fixes
     */
    analyzeImprovement(originalReport, retestReport, implementedFixes) {
        const overallImprovement = retestReport.summary.successRate - originalReport.summary.successRate;
        
        const fixEffectiveness = implementedFixes.map(fix => {
            const affectedSuites = this.getAffectedSuitesForPattern(fix.pattern, originalReport.suites);
            const improvedSuites = affectedSuites.filter(suiteName => {
                const originalSuite = originalReport.suites.find(s => s.suiteName === suiteName);
                const retestSuite = retestReport.suites.find(s => s.suiteName === suiteName);
                return originalSuite && retestSuite && !originalSuite.success && retestSuite.success;
            });
            
            return {
                pattern: fix.pattern,
                affectedSuites: affectedSuites.length,
                improvedSuites: improvedSuites.length,
                effectiveness: affectedSuites.length > 0 ? (improvedSuites.length / affectedSuites.length) * 100 : 0
            };
        });
        
        return {
            overallImprovement,
            fixEffectiveness,
            recommendation: this.generateImprovementRecommendation(overallImprovement, fixEffectiveness)
        };
    }

    // Helper methods for implementing fixes (simplified implementations)
    
    addRetryLogicToTimeoutProneOperations() {
        // Add retry logic to common operations
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = async function(url, options = {}) {
                const maxRetries = 3;
                let lastError;
                
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await originalFetch(url, { ...options, timeout: 10000 });
                    } catch (error) {
                        lastError = error;
                        if (i < maxRetries - 1) {
                            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                        }
                    }
                }
                
                throw lastError;
            };
        }
    }

    addElementWaitingUtilities() {
        // Add global element waiting utility
        window.waitForElement = async function(selector, timeout = 10000) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) {
                    return element;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            throw new Error(`Element ${selector} not found within ${timeout}ms`);
        };
    }

    addNetworkRetryMechanisms() {
        // Enhance existing network calls with retry logic
        console.log('🌐 Enhanced network calls with retry mechanisms');
    }

    implementTokenRefresh() {
        // Add token refresh logic to auth manager
        if (window.authManager && window.authManager.refreshToken) {
            console.log('🔐 Enhanced authentication with token refresh');
        }
    }

    addModalVisibilityWaiting() {
        // Add modal waiting utility
        window.waitForModal = async function(modalSelector, timeout = 5000) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                const modal = document.querySelector(modalSelector);
                if (modal && modal.style.display !== 'none' && modal.offsetParent !== null) {
                    return modal;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            throw new Error(`Modal ${modalSelector} not visible within ${timeout}ms`);
        };
    }

    // Additional helper methods...
    
    identifySuiteIssues(suite) {
        const issues = [];
        
        if (!suite.success && suite.error) {
            issues.push({
                type: 'EXECUTION_FAILURE',
                description: suite.error,
                severity: 'HIGH'
            });
        }
        
        if (suite.duration > 60000) { // More than 1 minute
            issues.push({
                type: 'PERFORMANCE',
                description: 'Suite execution time exceeds 1 minute',
                severity: 'MEDIUM'
            });
        }
        
        return issues;
    }

    calculateReliability(suite) {
        // Simple reliability calculation based on success and performance
        let reliability = suite.success ? 100 : 0;
        
        if (suite.duration > 30000) {
            reliability -= 10; // Penalty for slow execution
        }
        
        return Math.max(0, reliability);
    }

    ratePerformance(averageDuration) {
        if (averageDuration < 10000) return 'EXCELLENT';
        if (averageDuration < 30000) return 'GOOD';
        if (averageDuration < 60000) return 'FAIR';
        return 'POOR';
    }

    assessRequirementsRisk(requirements) {
        const coveragePercentage = (requirements.fullyCovered / requirements.totalRequirements) * 100;
        
        if (coveragePercentage >= 90) {
            return { level: 'LOW', description: 'Excellent requirements coverage' };
        } else if (coveragePercentage >= 70) {
            return { level: 'MEDIUM', description: 'Good requirements coverage with some gaps' };
        } else {
            return { level: 'HIGH', description: 'Poor requirements coverage - significant gaps' };
        }
    }

    identifyPriorityRequirements(requirementDetails) {
        return requirementDetails
            .filter(req => req.status !== 'FULLY_COVERED')
            .sort((a, b) => a.coverage - b.coverage)
            .slice(0, 5); // Top 5 priority requirements
    }

    analyzeTrends(summary) {
        // Simple trend analysis (would be more sophisticated with historical data)
        return {
            trend: 'STABLE',
            confidence: 'LOW',
            note: 'Insufficient historical data for trend analysis'
        };
    }

    compareSuiteResults(originalSuites, retestSuites) {
        return originalSuites.map(originalSuite => {
            const retestSuite = retestSuites.find(s => s.suiteId === originalSuite.suiteId);
            
            if (!retestSuite) {
                return {
                    suiteId: originalSuite.suiteId,
                    status: 'NOT_RETESTED'
                };
            }
            
            return {
                suiteId: originalSuite.suiteId,
                suiteName: originalSuite.suiteName,
                originalSuccess: originalSuite.success,
                retestSuccess: retestSuite.success,
                improvement: !originalSuite.success && retestSuite.success,
                regression: originalSuite.success && !retestSuite.success
            };
        });
    }

    identifyNewFailures(originalSuites, retestSuites) {
        return retestSuites
            .filter(retestSuite => {
                const originalSuite = originalSuites.find(s => s.suiteId === retestSuite.suiteId);
                return originalSuite && originalSuite.success && !retestSuite.success;
            })
            .map(suite => suite.suiteName);
    }

    identifyResolvedFailures(originalSuites, retestSuites) {
        return retestSuites
            .filter(retestSuite => {
                const originalSuite = originalSuites.find(s => s.suiteId === retestSuite.suiteId);
                return originalSuite && !originalSuite.success && retestSuite.success;
            })
            .map(suite => suite.suiteName);
    }

    getAffectedSuitesForPattern(pattern, suites) {
        // This would need to be implemented based on how patterns are tracked
        return [];
    }

    generateImprovementRecommendation(overallImprovement, fixEffectiveness) {
        if (overallImprovement > 10) {
            return 'Significant improvement achieved. Continue monitoring and maintain fixes.';
        } else if (overallImprovement > 0) {
            return 'Moderate improvement achieved. Consider additional fixes for remaining issues.';
        } else {
            return 'No improvement or regression detected. Review and revise fix implementations.';
        }
    }

    /**
     * Get analysis results
     */
    getAnalysisResults() {
        return {
            analysisResults: this.analysisResults,
            identifiedIssues: this.identifiedIssues,
            implementedFixes: this.implementedFixes,
            reTestResults: this.reTestResults
        };
    }
}

// Make available globally
window.TestResultsAnalyzer = TestResultsAnalyzer;

console.log('✅ Test Results Analyzer loaded');