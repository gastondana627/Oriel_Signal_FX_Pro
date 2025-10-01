#!/usr/bin/env node

/**
 * Node.js test runner for Usage Tracker tests
 * This allows running the tests from command line without a browser
 */

// Mock browser globals for Node.js environment
global.window = global;
global.document = {
    getElementById: () => null,
    addEventListener: () => {},
    body: { innerHTML: '' }
};

global.localStorage = {
    storage: {},
    getItem: function(key) { return this.storage[key] || null; },
    setItem: function(key, value) { this.storage[key] = value; },
    removeItem: function(key) { delete this.storage[key]; },
    clear: function() { this.storage = {}; }
};

// Load the required modules
try {
    // Load dependencies in order
    require('./app-config.js');
    require('./notification-manager.js');
    require('./api-client.js');
    require('./auth-manager.js');
    require('./usage-tracker.js');
    require('./usage-tracker-tests.js');
    
    console.log('✅ All dependencies loaded successfully');
    
    // Run the tests
    async function runTests() {
        console.log('\n🚀 Starting Usage Tracker Unit Tests...\n');
        
        const testSuite = new global.UsageTrackerTests();
        await testSuite.runAllTests();
        
        // Print detailed results
        const results = testSuite.results;
        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        const errors = results.filter(r => r.status === 'ERROR').length;
        const total = results.length;
        
        console.log('\n' + '='.repeat(50));
        console.log('DETAILED TEST RESULTS');
        console.log('='.repeat(50));
        
        // Group results by status
        const passedTests = results.filter(r => r.status === 'PASS');
        const failedTests = results.filter(r => r.status === 'FAIL');
        const errorTests = results.filter(r => r.status === 'ERROR');
        
        if (passedTests.length > 0) {
            console.log(`\n✅ PASSED TESTS (${passedTests.length}):`);
            passedTests.forEach(test => {
                console.log(`   ✓ ${test.test}`);
            });
        }
        
        if (failedTests.length > 0) {
            console.log(`\n❌ FAILED TESTS (${failedTests.length}):`);
            failedTests.forEach(test => {
                console.log(`   ✗ ${test.test}`);
            });
        }
        
        if (errorTests.length > 0) {
            console.log(`\n🔥 ERROR TESTS (${errorTests.length}):`);
            errorTests.forEach(test => {
                console.log(`   💥 ${test.test}: ${test.error || 'Unknown error'}`);
            });
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
        console.log(`Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
        console.log(`Errors: ${errors} (${((errors/total)*100).toFixed(1)}%)`);
        
        const successRate = ((passed / total) * 100).toFixed(1);
        console.log(`\nSuccess Rate: ${successRate}%`);
        
        if (successRate >= 90) {
            console.log('🎉 Excellent! All tests are passing well.');
        } else if (successRate >= 70) {
            console.log('⚠️  Good, but some tests need attention.');
        } else {
            console.log('🚨 Many tests are failing. Review implementation.');
        }
        
        // Exit with appropriate code
        process.exit(failed + errors > 0 ? 1 : 0);
    }
    
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Failed to load dependencies:', error.message);
    console.log('\n💡 Make sure all required files exist:');
    console.log('   - app-config.js');
    console.log('   - notification-manager.js');
    console.log('   - api-client.js');
    console.log('   - auth-manager.js');
    console.log('   - usage-tracker.js');
    console.log('   - usage-tracker-tests.js');
    process.exit(1);
}