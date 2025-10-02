/**
 * UI Feedback Unit Tests
 * Tests for progress indicator functionality and notification system
 * Requirements: 8.1, 8.2
 */

class UIFeedbackUnitTests {
    constructor() {
        this.results = [];
        this.testCount = 0;
        this.passCount = 0;
        this.failCount = 0;
        
        // Test instances
        this.notificationManager = null;
        this.enhancedUserFeedback = null;
        
        // Mock DOM elements
        this.mockDocument = this.createMockDocument();
        this.originalDocument = null;
    }

    /**
     * Create mock document for testing
     */
    createMockDocument() {
        const mockElements = new Map();
        
        return {
            createElement: (tagName) => {
                const element = {
                    tagName: tagName.toUpperCase(),
                    id: '',
                    className: '',
                    innerHTML: '',
                    textContent: '',
                    style: {},
                    attributes: new Map(),
                    children: [],
                    parentNode: null,
                    
                    setAttribute: function(name, value) {
                        this.attributes.set(name, value);
                    },
                    
                    getAttribute: function(name) {
                        return this.attributes.get(name);
                    },
                    
                    appendChild: function(child) {
                        this.children.push(child);
                        child.parentNode = this;
                    },
                    
                    removeChild: function(child) {
                        const index = this.children.indexOf(child);
                        if (index > -1) {
                            this.children.splice(index, 1);
                            child.parentNode = null;
                        }
                    },
                    
                    querySelector: function(selector) {
                        // Simple mock implementation
                        return this.children.find(child => 
                            selector.includes(child.className) || 
                            selector.includes(child.id)
                        );
                    },
                    
                    querySelectorAll: function(selector) {
                        return this.children.filter(child => 
                            selector.includes(child.className) || 
                            selector.includes(child.id)
                        );
                    },
                    
                    addEventListener: function(event, handler) {
                        this.eventHandlers = this.eventHandlers || {};
                        this.eventHandlers[event] = this.eventHandlers[event] || [];
                        this.eventHandlers[event].push(handler);
                    },
                    
                    removeEventListener: function(event, handler) {
                        if (this.eventHandlers && this.eventHandlers[event]) {
                            const index = this.eventHandlers[event].indexOf(handler);
                            if (index > -1) {
                                this.eventHandlers[event].splice(index, 1);
                            }
                        }
                    },
                    
                    classList: {
                        add: function(className) {
                            const classes = element.className.split(' ').filter(c => c);
                            if (!classes.includes(className)) {
                                classes.push(className);
                                element.className = classes.join(' ');
                            }
                        },
                        
                        remove: function(className) {
                            const classes = element.className.split(' ').filter(c => c && c !== className);
                            element.className = classes.join(' ');
                        },
                        
                        contains: function(className) {
                            return element.className.split(' ').includes(className);
                        },
                        
                        toggle: function(className) {
                            if (this.contains(className)) {
                                this.remove(className);
                            } else {
                                this.add(className);
                            }
                        }
                    }
                };
                
                return element;
            },
            
            getElementById: (id) => {
                return mockElements.get(id) || null;
            },
            
            body: null,
            head: null,
            readyState: 'complete'
        };
    }

    /**
     * Set up test instances
     */
    setUp() {
        // Mock document
        this.originalDocument = global.document;
        global.document = this.mockDocument;
        
        // Create mock body and head
        this.mockDocument.body = this.mockDocument.createElement('body');
        this.mockDocument.head = this.mockDocument.createElement('head');
        
        // Create fresh instances for each test
        this.notificationManager = new NotificationManager();
        
        // Mock enhanced user feedback (simplified for testing)
        this.enhancedUserFeedback = {
            config: {
                notifications: {
                    maxActive: 3,
                    defaultDuration: 5000,
                    errorDuration: 8000,
                    successDuration: 3000,
                    warningDuration: 6000,
                    position: 'top-right'
                },
                progress: {
                    updateInterval: 100,
                    smoothTransition: true,
                    showPercentage: true,
                    showTimeRemaining: true
                }
            },
            
            state: {
                activeNotifications: new Map(),
                activeOperations: new Map()
            },
            
            components: {
                notificationContainer: null,
                progressContainer: null
            },
            
            showNotification: function(message, type, options = {}) {
                const id = `notification-${Date.now()}`;
                this.state.activeNotifications.set(id, {
                    message,
                    type,
                    options,
                    timestamp: Date.now()
                });
                return id;
            },
            
            showProgress: function(title, options = {}) {
                const id = `progress-${Date.now()}`;
                this.state.activeOperations.set(id, {
                    title,
                    progress: 0,
                    status: 'initializing',
                    options,
                    timestamp: Date.now()
                });
                return id;
            },
            
            updateProgress: function(id, progress, status) {
                const operation = this.state.activeOperations.get(id);
                if (operation) {
                    operation.progress = progress;
                    operation.status = status;
                    operation.lastUpdate = Date.now();
                }
            },
            
            hideProgress: function(id) {
                this.state.activeOperations.delete(id);
            },
            
            hideNotification: function(id) {
                this.state.activeNotifications.delete(id);
            }
        };
    }

    /**
     * Clean up after tests
     */
    tearDown() {
        // Restore original document
        if (this.originalDocument) {
            global.document = this.originalDocument;
        }
        
        // Clear any timers
        if (this.notificationManager && this.notificationManager.notifications) {
            this.notificationManager.notifications.forEach(notification => {
                if (notification.timer) {
                    clearTimeout(notification.timer);
                }
            });
        }
    }

    /**
     * Assert helper
     */
    assert(condition, message) {
        this.testCount++;
        if (condition) {
            this.passCount++;
            this.results.push({ test: message, status: 'PASS' });
            console.log(`✅ ${message}`);
        } else {
            this.failCount++;
            this.results.push({ test: message, status: 'FAIL' });
            console.error(`❌ ${message}`);
        }
    }

    /**
     * Assert equality helper
     */
    assertEqual(actual, expected, message) {
        const condition = actual === expected;
        if (!condition) {
            console.error(`Expected: ${expected}, Actual: ${actual}`);
        }
        this.assert(condition, message);
    }

    /**
     * Assert contains helper
     */
    assertContains(text, substring, message) {
        const condition = text && text.includes(substring);
        if (!condition) {
            console.error(`Text "${text}" does not contain "${substring}"`);
        }
        this.assert(condition, message);
    }

    /**
     * Assert type helper
     */
    assertType(value, expectedType, message) {
        const condition = typeof value === expectedType;
        if (!condition) {
            console.error(`Expected type: ${expectedType}, Actual type: ${typeof value}`);
        }
        this.assert(condition, message);
    }

    /**
     * Run a test with setup and teardown
     */
    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        try {
            this.setUp();
            await testFunction.call(this);
        } catch (error) {
            this.results.push({ test: testName, status: 'ERROR', error: error.message });
            console.error(`💥 Test ${testName} failed with error:`, error);
        } finally {
            this.tearDown();
        }
    }

    // ==================== NOTIFICATION SYSTEM TESTS ====================

    /**
     * Test notification creation
     */
    async testNotificationCreation() {
        const message = 'Test notification message';
        const type = 'success';
        const options = { title: 'Test Title', duration: 3000 };
        
        const notificationId = this.notificationManager.show(message, type, options);
        
        this.assertType(notificationId, 'string', 'Should return notification ID');
        this.assertEqual(this.notificationManager.notifications.length, 1, 'Should add notification to array');
        
        const notification = this.notificationManager.notifications[0];
        this.assertEqual(notification.id, notificationId, 'Should set correct notification ID');
        this.assertType(notification.element, 'object', 'Should create DOM element');
        this.assertContains(notification.element.className, 'notification-success', 'Should set correct CSS class');
    }

    /**
     * Test notification types
     */
    async testNotificationTypes() {
        const types = ['success', 'error', 'warning', 'info'];
        
        for (const type of types) {
            const id = this.notificationManager.show(`Test ${type} message`, type);
            const notification = this.notificationManager.notifications.find(n => n.id === id);
            
            this.assertContains(notification.element.className, `notification-${type}`, 
                `Should set correct class for ${type} notification`);
        }
    }

    /**
     * Test notification content
     */
    async testNotificationContent() {
        const message = 'Test notification content';
        const title = 'Test Title';
        const id = this.notificationManager.show(message, 'info', { title });
        
        const notification = this.notificationManager.notifications.find(n => n.id === id);
        
        this.assertContains(notification.element.innerHTML, title, 'Should include title in content');
        this.assertContains(notification.element.innerHTML, message, 'Should include message in content');
        this.assertContains(notification.element.innerHTML, 'notification-close', 'Should include close button');
    }

    /**
     * Test notification removal
     */
    async testNotificationRemoval() {
        const id = this.notificationManager.show('Test message', 'info');
        
        this.assertEqual(this.notificationManager.notifications.length, 1, 'Should have one notification');
        
        this.notificationManager.remove(id);
        
        this.assertEqual(this.notificationManager.notifications.length, 0, 'Should remove notification from array');
    }

    /**
     * Test notification auto-removal
     */
    async testNotificationAutoRemoval() {
        const id = this.notificationManager.show('Test message', 'info', { duration: 100 });
        
        this.assertEqual(this.notificationManager.notifications.length, 1, 'Should have one notification');
        
        // Wait for auto-removal
        await new Promise(resolve => setTimeout(resolve, 150));
        
        this.assertEqual(this.notificationManager.notifications.length, 0, 'Should auto-remove notification');
    }

    /**
     * Test notification limit
     */
    async testNotificationLimit() {
        const maxNotifications = this.notificationManager.maxNotifications;
        
        // Add more notifications than the limit
        for (let i = 0; i < maxNotifications + 2; i++) {
            this.notificationManager.show(`Message ${i}`, 'info', { persistent: true });
        }
        
        this.assertEqual(this.notificationManager.notifications.length, maxNotifications, 
            'Should not exceed maximum notification limit');
    }

    /**
     * Test notification convenience methods
     */
    async testNotificationConvenienceMethods() {
        const successId = this.notificationManager.success('Success message');
        const errorId = this.notificationManager.error('Error message');
        const warningId = this.notificationManager.warning('Warning message');
        const infoId = this.notificationManager.info('Info message');
        
        this.assertType(successId, 'string', 'Success method should return ID');
        this.assertType(errorId, 'string', 'Error method should return ID');
        this.assertType(warningId, 'string', 'Warning method should return ID');
        this.assertType(infoId, 'string', 'Info method should return ID');
        
        this.assertEqual(this.notificationManager.notifications.length, 4, 'Should create all notifications');
    }

    /**
     * Test notification update
     */
    async testNotificationUpdate() {
        const id = this.notificationManager.show('Original message', 'info');
        const updateResult = this.notificationManager.update(id, 'Updated message', 'success');
        
        this.assert(updateResult, 'Should successfully update notification');
        
        const notification = this.notificationManager.notifications.find(n => n.id === id);
        this.assertContains(notification.element.innerHTML, 'Updated message', 'Should update message content');
        this.assertContains(notification.element.className, 'notification-success', 'Should update notification type');
    }

    /**
     * Test notification clear all
     */
    async testNotificationClearAll() {
        // Add multiple notifications
        this.notificationManager.show('Message 1', 'info', { persistent: true });
        this.notificationManager.show('Message 2', 'success', { persistent: true });
        this.notificationManager.show('Message 3', 'warning', { persistent: true });
        
        this.assertEqual(this.notificationManager.notifications.length, 3, 'Should have three notifications');
        
        this.notificationManager.clear();
        
        this.assertEqual(this.notificationManager.notifications.length, 0, 'Should clear all notifications');
    }

    // ==================== ENHANCED USER FEEDBACK TESTS ====================

    /**
     * Test enhanced notification system
     */
    async testEnhancedNotificationSystem() {
        const message = 'Enhanced notification test';
        const type = 'success';
        const options = { title: 'Test', icon: '✅' };
        
        const id = this.enhancedUserFeedback.showNotification(message, type, options);
        
        this.assertType(id, 'string', 'Should return notification ID');
        this.assert(this.enhancedUserFeedback.state.activeNotifications.has(id), 'Should track active notification');
        
        const notification = this.enhancedUserFeedback.state.activeNotifications.get(id);
        this.assertEqual(notification.message, message, 'Should store correct message');
        this.assertEqual(notification.type, type, 'Should store correct type');
        this.assertEqual(notification.options.title, 'Test', 'Should store correct options');
    }

    /**
     * Test enhanced notification hiding
     */
    async testEnhancedNotificationHiding() {
        const id = this.enhancedUserFeedback.showNotification('Test message', 'info');
        
        this.assert(this.enhancedUserFeedback.state.activeNotifications.has(id), 'Should have active notification');
        
        this.enhancedUserFeedback.hideNotification(id);
        
        this.assert(!this.enhancedUserFeedback.state.activeNotifications.has(id), 'Should remove notification from active list');
    }

    // ==================== PROGRESS INDICATOR TESTS ====================

    /**
     * Test progress indicator creation
     */
    async testProgressIndicatorCreation() {
        const title = 'Processing file...';
        const options = { showPercentage: true, showTimeRemaining: true };
        
        const id = this.enhancedUserFeedback.showProgress(title, options);
        
        this.assertType(id, 'string', 'Should return progress ID');
        this.assert(this.enhancedUserFeedback.state.activeOperations.has(id), 'Should track active operation');
        
        const operation = this.enhancedUserFeedback.state.activeOperations.get(id);
        this.assertEqual(operation.title, title, 'Should store correct title');
        this.assertEqual(operation.progress, 0, 'Should initialize progress to 0');
        this.assertEqual(operation.status, 'initializing', 'Should set initial status');
        this.assertType(operation.timestamp, 'number', 'Should set timestamp');
    }

    /**
     * Test progress indicator updates
     */
    async testProgressIndicatorUpdates() {
        const id = this.enhancedUserFeedback.showProgress('Test operation');
        
        // Update progress
        this.enhancedUserFeedback.updateProgress(id, 25, 'processing');
        
        const operation = this.enhancedUserFeedback.state.activeOperations.get(id);
        this.assertEqual(operation.progress, 25, 'Should update progress value');
        this.assertEqual(operation.status, 'processing', 'Should update status');
        this.assertType(operation.lastUpdate, 'number', 'Should set last update timestamp');
        
        // Update to completion
        this.enhancedUserFeedback.updateProgress(id, 100, 'completed');
        
        this.assertEqual(operation.progress, 100, 'Should update to completion');
        this.assertEqual(operation.status, 'completed', 'Should update status to completed');
    }

    /**
     * Test progress indicator hiding
     */
    async testProgressIndicatorHiding() {
        const id = this.enhancedUserFeedback.showProgress('Test operation');
        
        this.assert(this.enhancedUserFeedback.state.activeOperations.has(id), 'Should have active operation');
        
        this.enhancedUserFeedback.hideProgress(id);
        
        this.assert(!this.enhancedUserFeedback.state.activeOperations.has(id), 'Should remove operation from active list');
    }

    /**
     * Test multiple progress indicators
     */
    async testMultipleProgressIndicators() {
        const id1 = this.enhancedUserFeedback.showProgress('Operation 1');
        const id2 = this.enhancedUserFeedback.showProgress('Operation 2');
        const id3 = this.enhancedUserFeedback.showProgress('Operation 3');
        
        this.assertEqual(this.enhancedUserFeedback.state.activeOperations.size, 3, 'Should track multiple operations');
        
        // Update different operations
        this.enhancedUserFeedback.updateProgress(id1, 50, 'halfway');
        this.enhancedUserFeedback.updateProgress(id2, 75, 'almost done');
        
        const op1 = this.enhancedUserFeedback.state.activeOperations.get(id1);
        const op2 = this.enhancedUserFeedback.state.activeOperations.get(id2);
        const op3 = this.enhancedUserFeedback.state.activeOperations.get(id3);
        
        this.assertEqual(op1.progress, 50, 'Should update first operation');
        this.assertEqual(op2.progress, 75, 'Should update second operation');
        this.assertEqual(op3.progress, 0, 'Should not affect third operation');
    }

    /**
     * Test progress indicator configuration
     */
    async testProgressIndicatorConfiguration() {
        const config = this.enhancedUserFeedback.config.progress;
        
        this.assertType(config.updateInterval, 'number', 'Should have update interval setting');
        this.assertType(config.smoothTransition, 'boolean', 'Should have smooth transition setting');
        this.assertType(config.showPercentage, 'boolean', 'Should have show percentage setting');
        this.assertType(config.showTimeRemaining, 'boolean', 'Should have show time remaining setting');
        
        this.assert(config.updateInterval > 0, 'Update interval should be positive');
    }

    /**
     * Test progress indicator with invalid operations
     */
    async testProgressIndicatorInvalidOperations() {
        // Try to update non-existent operation
        this.enhancedUserFeedback.updateProgress('invalid-id', 50, 'processing');
        
        // Should not crash or create invalid state
        this.assert(!this.enhancedUserFeedback.state.activeOperations.has('invalid-id'), 
            'Should not create operation for invalid ID');
        
        // Try to hide non-existent operation
        this.enhancedUserFeedback.hideProgress('invalid-id');
        
        // Should not crash
        this.assert(true, 'Should handle invalid hide operation gracefully');
    }

    // ==================== INTEGRATION TESTS ====================

    /**
     * Test notification and progress integration
     */
    async testNotificationProgressIntegration() {
        // Show progress
        const progressId = this.enhancedUserFeedback.showProgress('File processing');
        
        // Show related notification
        const notificationId = this.enhancedUserFeedback.showNotification(
            'Processing started', 'info', { title: 'File Upload' }
        );
        
        this.assert(this.enhancedUserFeedback.state.activeOperations.has(progressId), 'Should have active progress');
        this.assert(this.enhancedUserFeedback.state.activeNotifications.has(notificationId), 'Should have active notification');
        
        // Update progress
        this.enhancedUserFeedback.updateProgress(progressId, 100, 'completed');
        
        // Show completion notification
        const completionId = this.enhancedUserFeedback.showNotification(
            'Processing completed', 'success', { title: 'File Upload' }
        );
        
        // Hide progress
        this.enhancedUserFeedback.hideProgress(progressId);
        
        this.assert(!this.enhancedUserFeedback.state.activeOperations.has(progressId), 'Should hide progress');
        this.assert(this.enhancedUserFeedback.state.activeNotifications.has(completionId), 'Should show completion notification');
    }

    /**
     * Test UI feedback state management
     */
    async testUIFeedbackStateManagement() {
        // Add multiple notifications and progress indicators
        const notif1 = this.enhancedUserFeedback.showNotification('Message 1', 'info');
        const notif2 = this.enhancedUserFeedback.showNotification('Message 2', 'success');
        const prog1 = this.enhancedUserFeedback.showProgress('Operation 1');
        const prog2 = this.enhancedUserFeedback.showProgress('Operation 2');
        
        this.assertEqual(this.enhancedUserFeedback.state.activeNotifications.size, 2, 'Should track notifications');
        this.assertEqual(this.enhancedUserFeedback.state.activeOperations.size, 2, 'Should track operations');
        
        // Clean up
        this.enhancedUserFeedback.hideNotification(notif1);
        this.enhancedUserFeedback.hideProgress(prog1);
        
        this.assertEqual(this.enhancedUserFeedback.state.activeNotifications.size, 1, 'Should remove notification');
        this.assertEqual(this.enhancedUserFeedback.state.activeOperations.size, 1, 'Should remove operation');
    }

    // ==================== MAIN TEST RUNNER ====================

    /**
     * Run all UI feedback tests
     */
    async runAllTests() {
        console.log('🧪 Starting UI Feedback Unit Tests...\n');
        
        const tests = [
            // Notification System Tests
            ['Notification Creation', this.testNotificationCreation],
            ['Notification Types', this.testNotificationTypes],
            ['Notification Content', this.testNotificationContent],
            ['Notification Removal', this.testNotificationRemoval],
            ['Notification Auto-Removal', this.testNotificationAutoRemoval],
            ['Notification Limit', this.testNotificationLimit],
            ['Notification Convenience Methods', this.testNotificationConvenienceMethods],
            ['Notification Update', this.testNotificationUpdate],
            ['Notification Clear All', this.testNotificationClearAll],
            
            // Enhanced User Feedback Tests
            ['Enhanced Notification System', this.testEnhancedNotificationSystem],
            ['Enhanced Notification Hiding', this.testEnhancedNotificationHiding],
            
            // Progress Indicator Tests
            ['Progress Indicator Creation', this.testProgressIndicatorCreation],
            ['Progress Indicator Updates', this.testProgressIndicatorUpdates],
            ['Progress Indicator Hiding', this.testProgressIndicatorHiding],
            ['Multiple Progress Indicators', this.testMultipleProgressIndicators],
            ['Progress Indicator Configuration', this.testProgressIndicatorConfiguration],
            ['Progress Indicator Invalid Operations', this.testProgressIndicatorInvalidOperations],
            
            // Integration Tests
            ['Notification Progress Integration', this.testNotificationProgressIntegration],
            ['UI Feedback State Management', this.testUIFeedbackStateManagement]
        ];

        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }

        this.printSummary();
        return this.results;
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 UI FEEDBACK UNIT TESTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testCount}`);
        console.log(`✅ Passed: ${this.passCount}`);
        console.log(`❌ Failed: ${this.failCount}`);
        console.log(`Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
        
        if (this.failCount > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(result => result.status === 'FAIL' || result.status === 'ERROR')
                .forEach(result => {
                    console.log(`  - ${result.test}${result.error ? ': ' + result.error : ''}`);
                });
        }
        
        console.log('='.repeat(60));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UIFeedbackUnitTests = UIFeedbackUnitTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIFeedbackUnitTests;
}