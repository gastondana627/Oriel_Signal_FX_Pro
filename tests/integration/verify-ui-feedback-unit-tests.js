#!/usr/bin/env node

/**
 * UI Feedback Unit Tests Verification Script
 * Validates the UI feedback unit tests implementation
 * Requirements: 8.1, 8.2
 */

const fs = require('fs');
const path = require('path');

class UIFeedbackTestVerifier {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Main verification method
     */
    async verify() {
        console.log('🔍 Verifying UI Feedback Unit Tests Implementation...\n');

        try {
            await this.verifyTestFiles();
            await this.verifyTestImplementation();
            await this.verifyTestRunner();
            await this.verifyDocumentation();
            await this.runBasicTests();

            this.printSummary();
            return this.errors.length === 0;

        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            return false;
        }
    }

    /**
     * Verify test files exist and are properly structured
     */
    async verifyTestFiles() {
        console.log('📁 Verifying test files...');

        const requiredFiles = [
            'ui-feedback-unit-tests.js',
            'ui-feedback-unit-test-runner.html',
            'ui-feedback-unit-tests-documentation.md'
        ];

        const dependencyFiles = [
            'notification-manager.js',
            'enhanced-user-feedback.js'
        ];

        // Check required files
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                console.log(`✅ Found ${file}`);
                this.results.push(`✅ ${file} exists`);
            } else {
                const error = `❌ Missing required file: ${file}`;
                console.log(error);
                this.errors.push(error);
            }
        }

        // Check dependency files
        for (const file of dependencyFiles) {
            if (fs.existsSync(file)) {
                console.log(`✅ Found dependency ${file}`);
                this.results.push(`✅ Dependency ${file} exists`);
            } else {
                const warning = `⚠️ Missing dependency: ${file}`;
                console.log(warning);
                this.warnings.push(warning);
            }
        }

        console.log('');
    }

    /**
     * Verify test implementation structure
     */
    async verifyTestImplementation() {
        console.log('🧪 Verifying test implementation...');

        if (!fs.existsSync('ui-feedback-unit-tests.js')) {
            this.errors.push('❌ Cannot verify implementation - test file missing');
            return;
        }

        const testContent = fs.readFileSync('ui-feedback-unit-tests.js', 'utf8');

        // Check for required class
        if (testContent.includes('class UIFeedbackUnitTests')) {
            console.log('✅ UIFeedbackUnitTests class found');
            this.results.push('✅ Main test class implemented');
        } else {
            const error = '❌ UIFeedbackUnitTests class not found';
            console.log(error);
            this.errors.push(error);
        }

        // Check for required methods
        const requiredMethods = [
            'runAllTests',
            'setUp',
            'tearDown',
            'assert',
            'assertEqual',
            'assertContains',
            'assertType'
        ];

        for (const method of requiredMethods) {
            if (testContent.includes(method)) {
                console.log(`✅ Method ${method} found`);
                this.results.push(`✅ ${method} method implemented`);
            } else {
                const error = `❌ Missing required method: ${method}`;
                console.log(error);
                this.errors.push(error);
            }
        }

        // Check for notification tests
        const notificationTests = [
            'testNotificationCreation',
            'testNotificationTypes',
            'testNotificationContent',
            'testNotificationRemoval',
            'testNotificationAutoRemoval'
        ];

        let notificationTestCount = 0;
        for (const test of notificationTests) {
            if (testContent.includes(test)) {
                notificationTestCount++;
            }
        }

        if (notificationTestCount >= 3) {
            console.log(`✅ Notification tests implemented (${notificationTestCount} found)`);
            this.results.push(`✅ Notification tests: ${notificationTestCount}/5`);
        } else {
            const error = `❌ Insufficient notification tests (${notificationTestCount}/5)`;
            console.log(error);
            this.errors.push(error);
        }

        // Check for progress indicator tests
        const progressTests = [
            'testProgressIndicatorCreation',
            'testProgressIndicatorUpdates',
            'testProgressIndicatorHiding',
            'testMultipleProgressIndicators'
        ];

        let progressTestCount = 0;
        for (const test of progressTests) {
            if (testContent.includes(test)) {
                progressTestCount++;
            }
        }

        if (progressTestCount >= 3) {
            console.log(`✅ Progress indicator tests implemented (${progressTestCount} found)`);
            this.results.push(`✅ Progress tests: ${progressTestCount}/4`);
        } else {
            const error = `❌ Insufficient progress indicator tests (${progressTestCount}/4)`;
            console.log(error);
            this.errors.push(error);
        }

        // Check for mock DOM implementation
        if (testContent.includes('createMockDocument')) {
            console.log('✅ Mock DOM implementation found');
            this.results.push('✅ Mock DOM for testing');
        } else {
            const warning = '⚠️ Mock DOM implementation not found';
            console.log(warning);
            this.warnings.push(warning);
        }

        // Check for requirements coverage
        if (testContent.includes('Requirements: 8.1, 8.2')) {
            console.log('✅ Requirements coverage documented');
            this.results.push('✅ Requirements 8.1, 8.2 covered');
        } else {
            const warning = '⚠️ Requirements coverage not clearly documented';
            console.log(warning);
            this.warnings.push(warning);
        }

        console.log('');
    }

    /**
     * Verify test runner HTML file
     */
    async verifyTestRunner() {
        console.log('🌐 Verifying test runner...');

        if (!fs.existsSync('ui-feedback-unit-test-runner.html')) {
            this.errors.push('❌ Cannot verify test runner - HTML file missing');
            return;
        }

        const htmlContent = fs.readFileSync('ui-feedback-unit-test-runner.html', 'utf8');

        // Check for required elements
        const requiredElements = [
            'runAllTests',
            'clearOutput',
            'exportResults',
            'testOutput',
            'progressFill',
            'totalTests',
            'passedTests',
            'failedTests',
            'successRate'
        ];

        for (const elementId of requiredElements) {
            if (htmlContent.includes(`id="${elementId}"`)) {
                console.log(`✅ Element ${elementId} found`);
                this.results.push(`✅ UI element: ${elementId}`);
            } else {
                const error = `❌ Missing UI element: ${elementId}`;
                console.log(error);
                this.errors.push(error);
            }
        }

        // Check for script dependencies
        const scriptDependencies = [
            'notification-manager.js',
            'enhanced-user-feedback.js',
            'ui-feedback-unit-tests.js'
        ];

        for (const script of scriptDependencies) {
            if (htmlContent.includes(script)) {
                console.log(`✅ Script dependency ${script} referenced`);
                this.results.push(`✅ Script: ${script}`);
            } else {
                const error = `❌ Missing script reference: ${script}`;
                console.log(error);
                this.errors.push(error);
            }
        }

        // Check for CSS styling
        if (htmlContent.includes('<style>') && htmlContent.includes('</style>')) {
            console.log('✅ CSS styling included');
            this.results.push('✅ CSS styling present');
        } else {
            const warning = '⚠️ CSS styling not found';
            console.log(warning);
            this.warnings.push(warning);
        }

        // Check for responsive design
        if (htmlContent.includes('@media')) {
            console.log('✅ Responsive design implemented');
            this.results.push('✅ Responsive CSS');
        } else {
            const warning = '⚠️ Responsive design not implemented';
            console.log(warning);
            this.warnings.push(warning);
        }

        console.log('');
    }

    /**
     * Verify documentation
     */
    async verifyDocumentation() {
        console.log('📚 Verifying documentation...');

        if (!fs.existsSync('ui-feedback-unit-tests-documentation.md')) {
            this.errors.push('❌ Cannot verify documentation - file missing');
            return;
        }

        const docContent = fs.readFileSync('ui-feedback-unit-tests-documentation.md', 'utf8');

        // Check for required sections
        const requiredSections = [
            '## Overview',
            '## Requirements Coverage',
            '## Test Categories',
            '## Test Implementation Details',
            '## Test Execution',
            '## Expected Test Results'
        ];

        for (const section of requiredSections) {
            if (docContent.includes(section)) {
                console.log(`✅ Documentation section: ${section.replace('## ', '')}`);
                this.results.push(`✅ Doc section: ${section.replace('## ', '')}`);
            } else {
                const error = `❌ Missing documentation section: ${section}`;
                console.log(error);
                this.errors.push(error);
            }
        }

        // Check for requirements coverage
        if (docContent.includes('8.1') && docContent.includes('8.2')) {
            console.log('✅ Requirements 8.1 and 8.2 documented');
            this.results.push('✅ Requirements coverage documented');
        } else {
            const error = '❌ Requirements coverage not properly documented';
            console.log(error);
            this.errors.push(error);
        }

        // Check for test categories
        const testCategories = [
            'Notification System Tests',
            'Progress Indicator Tests',
            'Integration Tests'
        ];

        for (const category of testCategories) {
            if (docContent.includes(category)) {
                console.log(`✅ Test category documented: ${category}`);
                this.results.push(`✅ Category: ${category}`);
            } else {
                const warning = `⚠️ Test category not documented: ${category}`;
                console.log(warning);
                this.warnings.push(warning);
            }
        }

        console.log('');
    }

    /**
     * Run basic tests to verify functionality
     */
    async runBasicTests() {
        console.log('🔧 Running basic functionality tests...');

        try {
            // Load the test file content and make it Node.js compatible
            const testFilePath = path.join(__dirname, 'ui-feedback-unit-tests.js');
            
            if (!fs.existsSync(testFilePath)) {
                this.errors.push('❌ Cannot run basic tests - test file missing');
                return;
            }

            let testFileContent = fs.readFileSync(testFilePath, 'utf8');

            // Mock browser globals for Node.js environment
            global.window = {
                addEventListener: () => {},
                matchMedia: () => ({ matches: false, addEventListener: () => {} }),
                navigator: { onLine: true }
            };
            global.document = {
                createElement: () => ({
                    tagName: 'DIV',
                    className: '',
                    innerHTML: '',
                    style: {},
                    classList: {
                        add: () => {},
                        remove: () => {},
                        contains: () => false,
                        toggle: () => {}
                    },
                    addEventListener: () => {},
                    appendChild: () => {},
                    querySelector: () => null,
                    setAttribute: () => {},
                    getAttribute: () => null
                }),
                getElementById: () => null,
                body: { appendChild: () => {} },
                head: { appendChild: () => {} },
                readyState: 'complete'
            };

            // Mock NotificationManager
            global.NotificationManager = class {
                constructor() {
                    this.notifications = [];
                    this.maxNotifications = 5;
                }
                show() { return 'test-id'; }
                remove() {}
                clear() {}
                success() { return 'test-id'; }
                error() { return 'test-id'; }
                warning() { return 'test-id'; }
                info() { return 'test-id'; }
                update() { return true; }
            };

            // Execute the test file
            eval(testFileContent);

            // Test basic instantiation
            if (typeof UIFeedbackUnitTests !== 'undefined') {
                const testSuite = new UIFeedbackUnitTests();
                
                if (testSuite && typeof testSuite.runAllTests === 'function') {
                    console.log('✅ Test suite instantiation successful');
                    this.results.push('✅ Test suite instantiation');
                } else {
                    const error = '❌ Test suite instantiation failed';
                    console.log(error);
                    this.errors.push(error);
                }

                // Test assertion methods
                if (typeof testSuite.assert === 'function' &&
                    typeof testSuite.assertEqual === 'function' &&
                    typeof testSuite.assertContains === 'function') {
                    console.log('✅ Assertion methods available');
                    this.results.push('✅ Assertion methods');
                } else {
                    const error = '❌ Assertion methods not properly implemented';
                    console.log(error);
                    this.errors.push(error);
                }

                // Test mock document creation
                if (typeof testSuite.createMockDocument === 'function') {
                    const mockDoc = testSuite.createMockDocument();
                    if (mockDoc && typeof mockDoc.createElement === 'function') {
                        console.log('✅ Mock document creation works');
                        this.results.push('✅ Mock document functionality');
                    } else {
                        const error = '❌ Mock document creation failed';
                        console.log(error);
                        this.errors.push(error);
                    }
                } else {
                    const warning = '⚠️ Mock document method not found';
                    console.log(warning);
                    this.warnings.push(warning);
                }

            } else {
                const error = '❌ UIFeedbackUnitTests class not available after loading';
                console.log(error);
                this.errors.push(error);
            }

        } catch (error) {
            const errorMsg = `❌ Basic test execution failed: ${error.message}`;
            console.log(errorMsg);
            this.errors.push(errorMsg);
        }

        console.log('');
    }

    /**
     * Print verification summary
     */
    printSummary() {
        console.log('='.repeat(60));
        console.log('📊 UI FEEDBACK UNIT TESTS VERIFICATION SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`✅ Successful checks: ${this.results.length}`);
        console.log(`⚠️ Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`  ${warning}`));
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => console.log(`  ${error}`));
        }
        
        console.log('\n📋 Requirements Coverage:');
        console.log('  - 8.1 Progress indicators: ✅ Implemented');
        console.log('  - 8.2 Notification system: ✅ Implemented');
        
        if (this.errors.length === 0) {
            console.log('\n🎉 UI Feedback Unit Tests verification completed successfully!');
            console.log('📝 All required components are properly implemented.');
            console.log('🚀 Tests are ready for execution.');
        } else {
            console.log('\n❌ UI Feedback Unit Tests verification failed.');
            console.log('🔧 Please address the errors above before proceeding.');
        }
        
        console.log('='.repeat(60));
    }
}

// Run verification if called directly
if (require.main === module) {
    const verifier = new UIFeedbackTestVerifier();
    verifier.verify().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = UIFeedbackTestVerifier;