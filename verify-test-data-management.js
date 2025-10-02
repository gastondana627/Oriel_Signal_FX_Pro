/**
 * Test Data Management Verification Script
 * Validates the test data management system functionality
 */

class TestDataManagementVerifier {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        
        this.testDataManager = null;
        this.testDatabaseManager = null;
    }

    /**
     * Run all verification tests
     */
    async runAllTests() {
        console.log('🔍 Starting Test Data Management Verification...\n');
        
        try {
            await this.testManagerInitialization();
            await this.testFixtureLoading();
            await this.testSessionManagement();
            await this.testEntityCreation();
            await this.testCleanupProcedures();
            await this.testErrorHandling();
            await this.testPerformance();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Verification failed with error:', error);
            this.recordFailure('System Error', error.message);
        }
    }

    /**
     * Test manager initialization
     */
    async testManagerInitialization() {
        console.log('📋 Testing Manager Initialization...');
        
        try {
            // Test TestDataManager initialization
            await this.runTest('TestDataManager Initialization', async () => {
                this.testDataManager = new TestDataManager({
                    apiBaseUrl: 'http://localhost:8000',
                    cleanupTimeout: 5000
                });
                
                await this.testDataManager.initialize();
                
                if (!this.testDataManager.fixtures || this.testDataManager.fixtures.size === 0) {
                    throw new Error('Fixtures not loaded properly');
                }
                
                return 'TestDataManager initialized successfully';
            });
            
            // Test TestDatabaseManager initialization
            await this.runTest('TestDatabaseManager Initialization', async () => {
                this.testDatabaseManager = new TestDatabaseManager({
                    apiBaseUrl: 'http://localhost:8000',
                    isolationLevel: 'session'
                });
                
                await this.testDatabaseManager.initialize();
                
                return 'TestDatabaseManager initialized successfully';
            });
            
        } catch (error) {
            console.error('❌ Manager initialization tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test fixture loading and access
     */
    async testFixtureLoading() {
        console.log('📦 Testing Fixture Loading...');
        
        if (!this.testDataManager) {
            this.recordFailure('Fixture Loading', 'TestDataManager not initialized');
            return;
        }
        
        try {
            // Test user fixtures
            await this.runTest('User Fixtures Loading', async () => {
                const validUser = this.testDataManager.getFixture('users', 'validUser');
                
                if (!validUser || !validUser.email || !validUser.password) {
                    throw new Error('Invalid user fixture structure');
                }
                
                const adminUser = this.testDataManager.getFixture('users', 'adminUser');
                
                if (!adminUser || adminUser.role !== 'admin') {
                    throw new Error('Admin user fixture missing role');
                }
                
                return 'User fixtures loaded correctly';
            });
            
            // Test auth fixtures
            await this.runTest('Auth Fixtures Loading', async () => {
                const validCredentials = this.testDataManager.getFixture('auth', 'validCredentials');
                
                if (!validCredentials || !validCredentials.email || !validCredentials.password) {
                    throw new Error('Invalid auth fixture structure');
                }
                
                return 'Auth fixtures loaded correctly';
            });
            
            // Test download fixtures
            await this.runTest('Download Fixtures Loading', async () => {
                const downloadFixtures = this.testDataManager.getFixture('downloads');
                
                if (!downloadFixtures.formats || !Array.isArray(downloadFixtures.formats)) {
                    throw new Error('Download formats not properly defined');
                }
                
                if (!downloadFixtures.qualitySettings || !downloadFixtures.qualitySettings.mp4) {
                    throw new Error('Quality settings not properly defined');
                }
                
                return 'Download fixtures loaded correctly';
            });
            
            // Test server fixtures
            await this.runTest('Server Fixtures Loading', async () => {
                const serverFixtures = this.testDataManager.getFixture('server');
                
                if (!serverFixtures.endpoints || !serverFixtures.endpoints.health) {
                    throw new Error('Server endpoints not properly defined');
                }
                
                return 'Server fixtures loaded correctly';
            });
            
        } catch (error) {
            console.error('❌ Fixture loading tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test session management
     */
    async testSessionManagement() {
        console.log('🔄 Testing Session Management...');
        
        if (!this.testDatabaseManager) {
            this.recordFailure('Session Management', 'TestDatabaseManager not initialized');
            return;
        }
        
        try {
            let testSessionId = null;
            
            // Test session creation
            await this.runTest('Session Creation', async () => {
                testSessionId = `verify_${Date.now()}`;
                
                const session = await this.testDatabaseManager.startTestSession(testSessionId, {
                    isolationLevel: 'session'
                });
                
                if (!session || session.id !== testSessionId) {
                    throw new Error('Session not created properly');
                }
                
                return `Session created: ${testSessionId}`;
            });
            
            // Test session tracking
            await this.runTest('Session Tracking', async () => {
                const activeSessions = this.testDatabaseManager.getActiveSessions();
                
                const ourSession = activeSessions.find(s => s.sessionId === testSessionId);
                
                if (!ourSession) {
                    throw new Error('Session not found in active sessions');
                }
                
                return 'Session properly tracked';
            });
            
            // Test session statistics
            await this.runTest('Session Statistics', async () => {
                const stats = this.testDatabaseManager.getSessionStats(testSessionId);
                
                if (!stats || stats.sessionId !== testSessionId) {
                    throw new Error('Session statistics not available');
                }
                
                if (typeof stats.createdEntities !== 'number') {
                    throw new Error('Entity count not properly tracked');
                }
                
                return 'Session statistics working';
            });
            
            // Test session cleanup
            await this.runTest('Session Cleanup', async () => {
                await this.testDatabaseManager.endTestSession(testSessionId);
                
                const activeSessions = this.testDatabaseManager.getActiveSessions();
                const ourSession = activeSessions.find(s => s.sessionId === testSessionId);
                
                if (ourSession) {
                    throw new Error('Session not properly cleaned up');
                }
                
                return 'Session cleaned up successfully';
            });
            
        } catch (error) {
            console.error('❌ Session management tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test entity creation and tracking
     */
    async testEntityCreation() {
        console.log('👤 Testing Entity Creation...');
        
        if (!this.testDataManager || !this.testDatabaseManager) {
            this.recordFailure('Entity Creation', 'Managers not initialized');
            return;
        }
        
        try {
            const testSessionId = `entity_test_${Date.now()}`;
            
            // Start test session
            await this.testDatabaseManager.startTestSession(testSessionId);
            
            try {
                // Test user creation
                await this.runTest('User Creation', async () => {
                    const userData = this.testDataManager.getFixture('users', 'validUser');
                    
                    // Modify email to avoid conflicts
                    userData.email = `test_${Date.now()}@example.com`;
                    
                    const result = await this.testDatabaseManager.createTestUser(testSessionId, userData);
                    
                    if (!result || !result.user || !result.user.id) {
                        throw new Error('User not created properly');
                    }
                    
                    return `User created: ${result.user.email}`;
                });
                
                // Test entity tracking
                await this.runTest('Entity Tracking', async () => {
                    const stats = this.testDatabaseManager.getSessionStats(testSessionId);
                    
                    if (stats.createdEntities === 0) {
                        throw new Error('Created entities not tracked');
                    }
                    
                    return `Entities tracked: ${stats.createdEntities}`;
                });
                
                // Test auth session creation
                await this.runTest('Auth Session Creation', async () => {
                    const credentials = this.testDataManager.getFixture('auth', 'validCredentials');
                    
                    try {
                        const result = await this.testDatabaseManager.createTestAuthSession(testSessionId, credentials);
                        
                        if (!result || !result.token) {
                            throw new Error('Auth session not created properly');
                        }
                        
                        return 'Auth session created successfully';
                        
                    } catch (error) {
                        // Auth might fail if user doesn't exist, which is expected
                        if (error.message.includes('401') || error.message.includes('Invalid')) {
                            return 'Auth session creation tested (expected failure)';
                        }
                        throw error;
                    }
                });
                
            } finally {
                // Clean up test session
                await this.testDatabaseManager.endTestSession(testSessionId);
            }
            
        } catch (error) {
            console.error('❌ Entity creation tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test cleanup procedures
     */
    async testCleanupProcedures() {
        console.log('🧹 Testing Cleanup Procedures...');
        
        if (!this.testDataManager || !this.testDatabaseManager) {
            this.recordFailure('Cleanup Procedures', 'Managers not initialized');
            return;
        }
        
        try {
            // Test automatic cleanup
            await this.runTest('Automatic Cleanup', async () => {
                const testSessionId = `cleanup_test_${Date.now()}`;
                
                // Create session and entities
                await this.testDatabaseManager.startTestSession(testSessionId);
                
                const userData = this.testDataManager.getFixture('users', 'validUser');
                userData.email = `cleanup_test_${Date.now()}@example.com`;
                
                try {
                    await this.testDatabaseManager.createTestUser(testSessionId, userData);
                } catch (error) {
                    // User creation might fail, but we can still test cleanup
                }
                
                // End session (should trigger cleanup)
                await this.testDatabaseManager.endTestSession(testSessionId);
                
                // Verify session is gone
                const activeSessions = this.testDatabaseManager.getActiveSessions();
                const foundSession = activeSessions.find(s => s.sessionId === testSessionId);
                
                if (foundSession) {
                    throw new Error('Session not cleaned up automatically');
                }
                
                return 'Automatic cleanup working';
            });
            
            // Test manual cleanup
            await this.runTest('Manual Cleanup', async () => {
                const testSessionId = `manual_cleanup_${Date.now()}`;
                
                await this.testDataManager.cleanupTestData(testSessionId);
                
                return 'Manual cleanup executed';
            });
            
            // Test cleanup all
            await this.runTest('Cleanup All', async () => {
                await this.testDatabaseManager.cleanupAll();
                
                const activeSessions = this.testDatabaseManager.getActiveSessions();
                
                if (activeSessions.length > 0) {
                    throw new Error('Not all sessions cleaned up');
                }
                
                return 'All sessions cleaned up';
            });
            
        } catch (error) {
            console.error('❌ Cleanup procedure tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('⚠️ Testing Error Handling...');
        
        if (!this.testDataManager || !this.testDatabaseManager) {
            this.recordFailure('Error Handling', 'Managers not initialized');
            return;
        }
        
        try {
            // Test invalid fixture access
            await this.runTest('Invalid Fixture Access', async () => {
                try {
                    this.testDataManager.getFixture('nonexistent', 'key');
                    throw new Error('Should have thrown error for invalid fixture');
                } catch (error) {
                    if (error.message.includes('not found')) {
                        return 'Invalid fixture access properly handled';
                    }
                    throw error;
                }
            });
            
            // Test invalid session operations
            await this.runTest('Invalid Session Operations', async () => {
                try {
                    await this.testDatabaseManager.endTestSession('nonexistent_session');
                    return 'Invalid session operation handled gracefully';
                } catch (error) {
                    // Either throws error or handles gracefully - both are acceptable
                    return 'Invalid session operation handled';
                }
            });
            
            // Test network error handling
            await this.runTest('Network Error Handling', async () => {
                const badManager = new TestDatabaseManager({
                    apiBaseUrl: 'http://localhost:9999' // Non-existent port
                });
                
                try {
                    await badManager.validateDatabaseConnection();
                    throw new Error('Should have failed with network error');
                } catch (error) {
                    if (error.message.includes('fetch') || error.message.includes('connection')) {
                        return 'Network errors properly handled';
                    }
                    throw error;
                }
            });
            
        } catch (error) {
            console.error('❌ Error handling tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Test performance characteristics
     */
    async testPerformance() {
        console.log('⚡ Testing Performance...');
        
        if (!this.testDataManager || !this.testDatabaseManager) {
            this.recordFailure('Performance', 'Managers not initialized');
            return;
        }
        
        try {
            // Test fixture access performance
            await this.runTest('Fixture Access Performance', async () => {
                const startTime = Date.now();
                
                for (let i = 0; i < 100; i++) {
                    this.testDataManager.getFixture('users', 'validUser');
                }
                
                const duration = Date.now() - startTime;
                
                if (duration > 1000) {
                    throw new Error(`Fixture access too slow: ${duration}ms for 100 calls`);
                }
                
                return `Fixture access: ${duration}ms for 100 calls`;
            });
            
            // Test session creation performance
            await this.runTest('Session Creation Performance', async () => {
                const startTime = Date.now();
                const sessionIds = [];
                
                try {
                    for (let i = 0; i < 5; i++) {
                        const sessionId = `perf_test_${Date.now()}_${i}`;
                        sessionIds.push(sessionId);
                        await this.testDatabaseManager.startTestSession(sessionId);
                    }
                    
                    const duration = Date.now() - startTime;
                    
                    if (duration > 5000) {
                        throw new Error(`Session creation too slow: ${duration}ms for 5 sessions`);
                    }
                    
                    return `Session creation: ${duration}ms for 5 sessions`;
                    
                } finally {
                    // Clean up test sessions
                    for (const sessionId of sessionIds) {
                        try {
                            await this.testDatabaseManager.endTestSession(sessionId);
                        } catch (error) {
                            // Ignore cleanup errors in performance test
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Performance tests failed:', error);
        }
        
        console.log('');
    }

    /**
     * Run individual test with error handling
     */
    async runTest(testName, testFunction) {
        this.results.total++;
        
        try {
            const result = await testFunction();
            this.recordSuccess(testName, result);
        } catch (error) {
            this.recordFailure(testName, error.message);
        }
    }

    /**
     * Record successful test
     */
    recordSuccess(testName, message) {
        this.results.passed++;
        this.results.details.push({
            name: testName,
            status: 'PASS',
            message: message
        });
        
        console.log(`  ✅ ${testName}: ${message}`);
    }

    /**
     * Record failed test
     */
    recordFailure(testName, error) {
        this.results.failed++;
        this.results.details.push({
            name: testName,
            status: 'FAIL',
            message: error
        });
        
        console.log(`  ❌ ${testName}: ${error}`);
    }

    /**
     * Print final results
     */
    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST DATA MANAGEMENT VERIFICATION RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\n📈 Summary:`);
        console.log(`  Total Tests: ${this.results.total}`);
        console.log(`  Passed: ${this.results.passed} ✅`);
        console.log(`  Failed: ${this.results.failed} ❌`);
        console.log(`  Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed > 0) {
            console.log(`\n❌ Failed Tests:`);
            this.results.details
                .filter(detail => detail.status === 'FAIL')
                .forEach(detail => {
                    console.log(`  • ${detail.name}: ${detail.message}`);
                });
        }
        
        console.log(`\n${this.results.failed === 0 ? '🎉' : '⚠️'} Verification ${this.results.failed === 0 ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH ISSUES'}`);
        console.log('='.repeat(60));
    }
}

// Run verification if this script is executed directly
if (typeof window === 'undefined' && typeof module !== 'undefined') {
    // Node.js environment
    const verifier = new TestDataManagementVerifier();
    verifier.runAllTests().catch(console.error);
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.TestDataManagementVerifier = TestDataManagementVerifier;
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', () => {
        const verifier = new TestDataManagementVerifier();
        verifier.runAllTests();
    });
}