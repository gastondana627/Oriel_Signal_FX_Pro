/**
 * Verification Script for Error Handling Unit Tests
 * Validates that the error handling unit tests are working correctly
 */

// Mock browser environment for Node.js testing
if (typeof window === 'undefined') {
    global.window = {
        location: { href: 'http://localhost:3000' },
        performance: { now: () => Date.now() },
        navigator: { userAgent: 'test-agent', onLine: true, language: 'en' },
        screen: { width: 1920, height: 1080 },
        innerWidth: 1920,
        innerHeight: 1080,
        addEventListener: () => {},
        fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    };
    global.console = console;
    global.document = {
        referrer: '',
        querySelector: () => null
    };
}

// Load required modules
const fs = require('fs');
const path = require('path');

// Read and evaluate the required JavaScript files
function loadScript(filename) {
    const filepath = path.join(__dirname, filename);
    if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        eval(content);
        console.log(`✅ Loaded ${filename}`);
    } else {
        console.log(`❌ File not found: ${filename}`);
    }
}

async function verifyErrorHandlingTests() {
    console.log('🧪 Verifying Error Handling Unit Tests...\n');

    try {
        // Load dependencies
        console.log('📦 Loading dependencies...');
        loadScript('enhanced-logger.js');
        loadScript('error-monitor.js');
        loadScript('log-formatter.js');
        loadScript('error-handling-unit-tests.js');

        // Check if classes are available
        console.log('\n🔍 Checking class availability...');
        
        if (typeof EnhancedLogger !== 'undefined') {
            console.log('✅ EnhancedLogger class available');
        } else {
            console.log('❌ EnhancedLogger class not available');
        }

        if (typeof ErrorMonitor !== 'undefined') {
            console.log('✅ ErrorMonitor class available');
        } else {
            console.log('❌ ErrorMonitor class not available');
        }

        if (typeof LogFormatter !== 'undefined') {
            console.log('✅ LogFormatter class available');
        } else {
            console.log('❌ LogFormatter class not available');
        }

        if (typeof ErrorHandlingUnitTests !== 'undefined') {
            console.log('✅ ErrorHandlingUnitTests class available');
        } else {
            console.log('❌ ErrorHandlingUnitTests class not available');
            return;
        }

        // Run a subset of tests to verify functionality
        console.log('\n🧪 Running verification tests...');
        
        const tester = new ErrorHandlingUnitTests();
        
        // Test error message formatting
        console.log('\n📝 Testing error message formatting...');
        await tester.runTest('API Error Message Formatting', tester.testApiErrorMessageFormatting);
        await tester.runTest('Auth Error Message Formatting', tester.testAuthErrorMessageFormatting);
        await tester.runTest('Payment Error Message Formatting', tester.testPaymentErrorMessageFormatting);

        // Test log formatting
        console.log('\n📋 Testing log formatting...');
        await tester.runTest('Log Entry Formatting', tester.testLogEntryFormatting);
        await tester.runTest('Error Formatting', tester.testErrorFormatting);
        await tester.runTest('Context Formatting', tester.testContextFormatting);

        // Test error logging
        console.log('\n📊 Testing error logging...');
        await tester.runTest('Error Monitor Handling', tester.testErrorMonitorHandling);
        await tester.runTest('Critical Error Detection', tester.testCriticalErrorDetection);
        await tester.runTest('Error Statistics', tester.testErrorStatistics);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 VERIFICATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests Run: ${tester.testCount}`);
        console.log(`✅ Passed: ${tester.passCount}`);
        console.log(`❌ Failed: ${tester.failCount}`);
        console.log(`Success Rate: ${((tester.passCount / tester.testCount) * 100).toFixed(1)}%`);

        if (tester.failCount > 0) {
            console.log('\n❌ Failed Tests:');
            tester.results
                .filter(result => result.status === 'FAIL' || result.status === 'ERROR')
                .forEach(result => {
                    console.log(`  - ${result.test}${result.error ? ': ' + result.error : ''}`);
                });
        }

        console.log('='.repeat(60));

        // Verify test files exist
        console.log('\n📁 Verifying test files...');
        const testFiles = [
            'error-handling-unit-tests.js',
            'error-handling-unit-test-runner.html',
            'error-handling-unit-tests-documentation.md'
        ];

        testFiles.forEach(file => {
            if (fs.existsSync(file)) {
                console.log(`✅ ${file} exists`);
            } else {
                console.log(`❌ ${file} missing`);
            }
        });

        // Check test runner HTML structure
        console.log('\n🌐 Verifying test runner HTML...');
        const htmlFile = 'error-handling-unit-test-runner.html';
        if (fs.existsSync(htmlFile)) {
            const htmlContent = fs.readFileSync(htmlFile, 'utf8');
            
            const checks = [
                { name: 'Title', pattern: /<title>.*Error Handling Unit Tests.*<\/title>/ },
                { name: 'Run Tests Button', pattern: /id="runTests"/ },
                { name: 'Test Results Container', pattern: /id="testResults"/ },
                { name: 'Console Output', pattern: /id="consoleOutput"/ },
                { name: 'ErrorHandlingUnitTests Class', pattern: /ErrorHandlingUnitTests/ },
                { name: 'Test Runner Class', pattern: /ErrorHandlingTestRunner/ }
            ];

            checks.forEach(check => {
                if (check.pattern.test(htmlContent)) {
                    console.log(`✅ ${check.name} found in HTML`);
                } else {
                    console.log(`❌ ${check.name} missing in HTML`);
                }
            });
        }

        // Check documentation
        console.log('\n📚 Verifying documentation...');
        const docFile = 'error-handling-unit-tests-documentation.md';
        if (fs.existsSync(docFile)) {
            const docContent = fs.readFileSync(docFile, 'utf8');
            
            const docChecks = [
                { name: 'Requirements Coverage', pattern: /Requirements Coverage/ },
                { name: 'Test Categories', pattern: /Test Categories/ },
                { name: 'Error Message Formatting', pattern: /Error Message Formatting Tests/ },
                { name: 'Log Formatter Tests', pattern: /Log Formatter Tests/ },
                { name: 'Error Logging Tests', pattern: /Error Logging Tests/ },
                { name: 'Test Execution', pattern: /Test Execution/ }
            ];

            docChecks.forEach(check => {
                if (check.pattern.test(docContent)) {
                    console.log(`✅ ${check.name} documented`);
                } else {
                    console.log(`❌ ${check.name} missing from documentation`);
                }
            });
        }

        console.log('\n✅ Error handling unit tests verification completed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Open error-handling-unit-test-runner.html in a web browser');
        console.log('2. Click "Run All Tests" to execute the complete test suite');
        console.log('3. Verify all tests pass and review any failures');
        console.log('4. Use the export feature to save test results if needed');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run verification if this script is executed directly
if (require.main === module) {
    verifyErrorHandlingTests();
}

module.exports = { verifyErrorHandlingTests };