/**
 * User Testing Dashboard Controller
 * Handles test execution, monitoring, and results visualization
 */

class UserTestingDashboard {
    constructor() {
        this.selectedSuite = null;
        this.isRunning = false;
        this.isPaused = false;
        this.currentTest = null;
        this.testResults = [];
        this.testQueue = [];
        this.executionStartTime = null;
        
        // Test suite definitions
        this.testSuites = {
            authentication: {
                name: 'Authentication Tests',
                tests: [
                    'registration_form_validation',
                    'successful_registration_flow',
                    'duplicate_email_handling',
                    'invalid_email_format_handling',
                    'weak_password_validation',
                    'successful_login_flow',
                    'invalid_credentials_handling',
                    'session_persistence_test',
                    'logout_flow_validation'
                ]
            },
            downloads: {
                name: 'Download Tests',
                tests: [
                    'download_modal_interception',
                    'modal_display_validation',
                    'format_selection_testing',
                    'mp4_download_generation',
                    'mov_download_generation',
                    'gif_download_generation',
                    'download_progress_tracking',
                    'file_integrity_verification',
                    'download_error_handling'
                ]
            },
            server: {
                name: 'Server Management Tests',
                tests: [
                    'server_startup_validation',
                    'frontend_connectivity_test',
                    'backend_connectivity_test',
                    'health_endpoint_validation',
                    'error_recovery_testing',
                    'performance_monitoring',
                    'resource_usage_tracking'
                ]
            },
            logging: {
                name: 'Logging Tests',
                tests: [
                    'request_logging_accuracy',
                    'error_logging_completeness',
                    'user_action_logging',
                    'log_formatting_consistency',
                    'performance_metric_capture',
                    'log_level_management',
                    'error_correlation_testing'
                ]
            },
            'ui-feedback': {
                name: 'UI Feedback Tests',
                tests: [
                    'loading_indicator_display',
                    'progress_bar_functionality',
                    'success_notification_display',
                    'error_message_clarity',
                    'notification_queuing',
                    'notification_dismissal',
                    'progress_percentage_accuracy'
                ]
            },
            all: {
                name: 'Complete Test Suite',
                tests: [] // Will be populated with all tests
            }
        };
        
        // Populate 'all' suite with all tests
        this.testSuites.all.tests = Object.values(this.testSuites)
            .filter(suite => suite.name !== 'Complete Test Suite')
            .flatMap(suite => suite.tests);
        
        this.initializeEventListeners();
        this.logMessage('Dashboard initialized successfully', 'info');
    }
    
    initializeEventListeners() {
        // Test suite selection
        document.querySelectorAll('.test-suite-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectTestSuite(e.currentTarget.dataset.suite);
            });
        });
        
        // Control buttons
        document.getElementById('runTestsBtn').addEventListener('click', () => {
            this.runTests();
        });
        
        document.getElementById('pauseTestsBtn').addEventListener('click', () => {
            this.pauseTests();
        });
        
        document.getElementById('stopTestsBtn').addEventListener('click', () => {
            this.stopTests();
        });
    }
    
    selectTestSuite(suiteId) {
        // Remove previous selection
        document.querySelectorAll('.test-suite-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        document.querySelector(`[data-suite="${suiteId}"]`).classList.add('selected');
        
        this.selectedSuite = suiteId;
        this.logMessage(`Selected test suite: ${this.testSuites[suiteId].name}`, 'info');
        
        // Update UI to show selected suite info
        this.updateSuiteInfo(suiteId);
    }
    
    updateSuiteInfo(suiteId) {
        const suite = this.testSuites[suiteId];
        const testCount = suite.tests.length;
        
        document.getElementById('totalTests').textContent = testCount;
        this.logMessage(`Test suite contains ${testCount} tests`, 'info');
    }
    
    async runTests() {
        if (!this.selectedSuite) {
            this.logMessage('Please select a test suite first', 'error');
            return;
        }
        
        if (this.isRunning) {
            this.logMessage('Tests are already running', 'error');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.executionStartTime = Date.now();
        
        // Update UI state
        this.updateControlButtons();
        this.resetResults();
        
        // Prepare test queue
        const suite = this.testSuites[this.selectedSuite];
        this.testQueue = [...suite.tests];
        
        this.logMessage(`Starting execution of ${suite.name} (${this.testQueue.length} tests)`, 'success');
        
        // Execute tests sequentially
        await this.executeTestQueue();
    }
    
    async executeTestQueue() {
        const totalTests = this.testQueue.length;
        let completedTests = 0;
        
        for (const testName of this.testQueue) {
            if (!this.isRunning) {
                this.logMessage('Test execution stopped by user', 'info');
                break;
            }
            
            while (this.isPaused) {
                await this.sleep(100);
            }
            
            this.currentTest = testName;
            this.updateCurrentTestDisplay(testName);
            
            // Execute individual test
            const result = await this.executeTest(testName);
            this.testResults.push(result);
            
            // Update progress
            completedTests++;
            const progress = (completedTests / totalTests) * 100;
            this.updateProgress(progress, completedTests, totalTests);
            
            // Update results display
            this.updateResultsDisplay();
            
            // Small delay between tests for better UX
            await this.sleep(500);
        }
        
        // Execution complete
        this.completeExecution();
    }
    
    async executeTest(testName) {
        const startTime = Date.now();
        this.logMessage(`Executing test: ${testName}`, 'info');
        
        // Add test to results list as running
        this.addTestToResultsList(testName, 'running');
        
        try {
            // Simulate test execution with realistic timing
            const executionTime = Math.random() * 3000 + 1000; // 1-4 seconds
            await this.sleep(executionTime);
            
            // Simulate test results (80% pass rate for demo)
            const passed = Math.random() > 0.2;
            const duration = Date.now() - startTime;
            
            const result = {
                name: testName,
                status: passed ? 'passed' : 'failed',
                duration: duration,
                timestamp: new Date().toISOString(),
                error: passed ? null : this.generateMockError(testName)
            };
            
            this.logMessage(
                `Test ${testName} ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`,
                passed ? 'success' : 'error'
            );
            
            // Update test in results list
            this.updateTestInResultsList(testName, result.status, duration);
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logMessage(`Test ${testName} ERROR: ${error.message}`, 'error');
            
            return {
                name: testName,
                status: 'failed',
                duration: duration,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
    
    generateMockError(testName) {
        const errors = [
            'Element not found: #login-button',
            'Timeout waiting for modal to appear',
            'Network request failed: 500 Internal Server Error',
            'Assertion failed: Expected "Success" but got "Error"',
            'File download did not complete within timeout',
            'Session validation failed'
        ];
        return errors[Math.floor(Math.random() * errors.length)];
    }
    
    pauseTests() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseTestsBtn');
        
        if (this.isPaused) {
            pauseBtn.textContent = '▶️ Resume';
            this.logMessage('Test execution paused', 'info');
        } else {
            pauseBtn.textContent = '⏸️ Pause';
            this.logMessage('Test execution resumed', 'info');
        }
    }
    
    stopTests() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = false;
        this.currentTest = null;
        
        this.updateControlButtons();
        this.logMessage('Test execution stopped by user', 'info');
        
        // Update current test display
        document.getElementById('currentTestName').textContent = 'Execution stopped';
    }
    
    completeExecution() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTest = null;
        
        const executionTime = Date.now() - this.executionStartTime;
        const minutes = Math.floor(executionTime / 60000);
        const seconds = Math.floor((executionTime % 60000) / 1000);
        
        this.updateControlButtons();
        this.logMessage(
            `Test execution completed in ${minutes}m ${seconds}s`,
            'success'
        );
        
        document.getElementById('currentTestName').textContent = 'Execution completed';
        document.getElementById('progressLabel').textContent = 'Execution completed';
        
        // Generate summary report
        this.generateSummaryReport();
    }
    
    generateSummaryReport() {
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const total = this.testResults.length;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
        
        this.logMessage(`=== EXECUTION SUMMARY ===`, 'info');
        this.logMessage(`Total Tests: ${total}`, 'info');
        this.logMessage(`Passed: ${passed}`, 'success');
        this.logMessage(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
        this.logMessage(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'error');
        this.logMessage(`========================`, 'info');
    }
    
    updateControlButtons() {
        const runBtn = document.getElementById('runTestsBtn');
        const pauseBtn = document.getElementById('pauseTestsBtn');
        const stopBtn = document.getElementById('stopTestsBtn');
        
        if (this.isRunning) {
            runBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
        } else {
            runBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            pauseBtn.textContent = '⏸️ Pause';
        }
    }
    
    updateCurrentTestDisplay(testName) {
        const displayName = testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        document.getElementById('currentTestName').textContent = displayName;
    }
    
    updateProgress(percentage, completed, total) {
        document.getElementById('overallProgress').style.width = `${percentage}%`;
        document.getElementById('progressPercentage').textContent = `${Math.round(percentage)}%`;
        document.getElementById('progressLabel').textContent = `${completed} of ${total} tests completed`;
    }
    
    resetResults() {
        this.testResults = [];
        document.getElementById('passedTests').textContent = '0';
        document.getElementById('failedTests').textContent = '0';
        document.getElementById('skippedTests').textContent = '0';
        document.getElementById('overallProgress').style.width = '0%';
        document.getElementById('progressPercentage').textContent = '0%';
        document.getElementById('progressLabel').textContent = 'Starting tests...';
        
        // Clear results list
        const resultsList = document.getElementById('testResultsList');
        resultsList.innerHTML = '';
    }
    
    updateResultsDisplay() {
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const skipped = this.testResults.filter(r => r.status === 'skipped').length;
        
        document.getElementById('passedTests').textContent = passed;
        document.getElementById('failedTests').textContent = failed;
        document.getElementById('skippedTests').textContent = skipped;
    }
    
    addTestToResultsList(testName, status) {
        const resultsList = document.getElementById('testResultsList');
        const displayName = testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const testItem = document.createElement('div');
        testItem.className = 'test-result-item';
        testItem.id = `test-${testName}`;
        
        testItem.innerHTML = `
            <div class="status-icon ${status}">
                ${status === 'running' ? '⏳' : status === 'passed' ? '✓' : status === 'failed' ? '✗' : '?'}
            </div>
            <div class="test-info">
                <div class="test-name">${displayName}</div>
                <div class="test-duration">${status === 'running' ? 'Running...' : ''}</div>
            </div>
            <div class="test-actions">
                ${status === 'failed' ? '<button class="btn btn-small btn-secondary">View Error</button>' : ''}
            </div>
        `;
        
        resultsList.appendChild(testItem);
        resultsList.scrollTop = resultsList.scrollHeight;
    }
    
    updateTestInResultsList(testName, status, duration) {
        const testItem = document.getElementById(`test-${testName}`);
        if (!testItem) return;
        
        const statusIcon = testItem.querySelector('.status-icon');
        const durationElement = testItem.querySelector('.test-duration');
        const actionsElement = testItem.querySelector('.test-actions');
        
        // Update status icon
        statusIcon.className = `status-icon ${status}`;
        statusIcon.textContent = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '?';
        
        // Update duration
        durationElement.textContent = `${duration}ms`;
        
        // Add error button if failed
        if (status === 'failed') {
            actionsElement.innerHTML = '<button class="btn btn-small btn-secondary" onclick="dashboard.showTestError(\'' + testName + '\')">View Error</button>';
        }
    }
    
    showTestError(testName) {
        const result = this.testResults.find(r => r.name === testName);
        if (result && result.error) {
            alert(`Test Error: ${testName}\n\n${result.error}`);
        }
    }
    
    logMessage(message, level = 'info') {
        const logsContainer = document.getElementById('logsContainer');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level-${level}">[${level.toUpperCase()}]</span>
            ${message}
        `;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Keep only last 100 log entries
        while (logsContainer.children.length > 100) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new UserTestingDashboard();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserTestingDashboard;
}