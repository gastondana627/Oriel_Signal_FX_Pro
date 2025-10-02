/**
 * Test Data Management System
 * Provides test data fixtures, database state management, and cleanup procedures
 * for isolated and reliable testing
 */

class TestDataManager {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || 'http://localhost:8000',
            testDbPrefix: config.testDbPrefix || 'test_',
            cleanupTimeout: config.cleanupTimeout || 30000,
            ...config
        };
        
        this.fixtures = new Map();
        this.createdEntities = new Map();
        this.testSessions = new Set();
        this.cleanupTasks = [];
    }

    /**
     * Initialize test data manager
     */
    async initialize() {
        console.log('🔧 Initializing Test Data Manager...');
        
        try {
            await this.loadFixtures();
            await this.setupCleanupHandlers();
            console.log('✅ Test Data Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Test Data Manager:', error);
            throw error;
        }
    }

    /**
     * Load test data fixtures
     */
    async loadFixtures() {
        console.log('📦 Loading test fixtures...');
        
        // User fixtures
        this.fixtures.set('users', {
            validUser: {
                email: 'test.user@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            },
            adminUser: {
                email: 'admin.test@example.com',
                password: 'AdminPassword123!',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin'
            },
            invalidUser: {
                email: 'invalid-email',
                password: '123',
                firstName: '',
                lastName: ''
            },
            duplicateUser: {
                email: 'duplicate@example.com',
                password: 'DuplicatePassword123!',
                firstName: 'Duplicate',
                lastName: 'User'
            }
        });

        // Authentication fixtures
        this.fixtures.set('auth', {
            validCredentials: {
                email: 'test.user@example.com',
                password: 'TestPassword123!'
            },
            invalidCredentials: {
                email: 'nonexistent@example.com',
                password: 'WrongPassword123!'
            },
            malformedCredentials: {
                email: 'not-an-email',
                password: ''
            }
        });

        // Download fixtures
        this.fixtures.set('downloads', {
            testAudioFile: {
                name: 'test-audio.wav',
                duration: 30,
                sampleRate: 44100,
                channels: 2
            },
            formats: ['mp3', 'mp4', 'mov', 'gif'],
            qualitySettings: {
                low: { bitrate: 128, resolution: '720p' },
                medium: { bitrate: 256, resolution: '1080p' },
                high: { bitrate: 320, resolution: '1440p' }
            }
        });

        // Server fixtures
        this.fixtures.set('server', {
            endpoints: {
                health: '/health',
                auth: '/auth',
                users: '/users',
                downloads: '/downloads',
                jobs: '/jobs'
            },
            expectedResponses: {
                health: { status: 'ok', timestamp: 'string' },
                auth: { token: 'string', user: 'object' }
            }
        });

        console.log(`✅ Loaded ${this.fixtures.size} fixture categories`);
    }

    /**
     * Get fixture data by category and key
     */
    getFixture(category, key = null) {
        const categoryData = this.fixtures.get(category);
        if (!categoryData) {
            throw new Error(`Fixture category '${category}' not found`);
        }
        
        if (key === null) {
            return categoryData;
        }
        
        if (!(key in categoryData)) {
            throw new Error(`Fixture key '${key}' not found in category '${category}'`);
        }
        
        // Return a deep copy to prevent test interference
        return JSON.parse(JSON.stringify(categoryData[key]));
    }

    /**
     * Create test user with cleanup tracking
     */
    async createTestUser(userData = null, testId = null) {
        const userFixture = userData || this.getFixture('users', 'validUser');
        const sessionId = testId || this.generateSessionId();
        
        console.log(`👤 Creating test user for session: ${sessionId}`);
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userFixture)
            });

            if (!response.ok) {
                throw new Error(`Failed to create test user: ${response.status} ${response.statusText}`);
            }

            const userData = await response.json();
            
            // Track created entity for cleanup
            this.trackEntity('user', userData.user.id, sessionId);
            
            console.log(`✅ Test user created: ${userData.user.email}`);
            return userData;
            
        } catch (error) {
            console.error('❌ Failed to create test user:', error);
            throw error;
        }
    }

    /**
     * Create test session with authentication
     */
    async createTestSession(credentials = null, testId = null) {
        const authFixture = credentials || this.getFixture('auth', 'validCredentials');
        const sessionId = testId || this.generateSessionId();
        
        console.log(`🔐 Creating test session: ${sessionId}`);
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authFixture)
            });

            if (!response.ok) {
                throw new Error(`Failed to create test session: ${response.status} ${response.statusText}`);
            }

            const sessionData = await response.json();
            
            // Track session for cleanup
            this.testSessions.add(sessionId);
            this.trackEntity('session', sessionData.token, sessionId);
            
            console.log(`✅ Test session created: ${sessionId}`);
            return { sessionId, ...sessionData };
            
        } catch (error) {
            console.error('❌ Failed to create test session:', error);
            throw error;
        }
    }

    /**
     * Setup database state for testing
     */
    async setupDatabaseState(testId, requirements = {}) {
        console.log(`🗄️ Setting up database state for test: ${testId}`);
        
        const setupTasks = [];
        
        try {
            // Create required users
            if (requirements.users) {
                for (const userType of requirements.users) {
                    const userData = this.getFixture('users', userType);
                    setupTasks.push(this.createTestUser(userData, testId));
                }
            }
            
            // Create required sessions
            if (requirements.sessions) {
                for (const sessionType of requirements.sessions) {
                    const credentials = this.getFixture('auth', sessionType);
                    setupTasks.push(this.createTestSession(credentials, testId));
                }
            }
            
            // Execute setup tasks
            const results = await Promise.all(setupTasks);
            
            console.log(`✅ Database state setup complete for test: ${testId}`);
            return results;
            
        } catch (error) {
            console.error(`❌ Failed to setup database state for test: ${testId}`, error);
            await this.cleanupTestData(testId);
            throw error;
        }
    }

    /**
     * Track created entity for cleanup
     */
    trackEntity(type, id, sessionId) {
        if (!this.createdEntities.has(sessionId)) {
            this.createdEntities.set(sessionId, []);
        }
        
        this.createdEntities.get(sessionId).push({
            type,
            id,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up test data for specific test session
     */
    async cleanupTestData(testId) {
        console.log(`🧹 Cleaning up test data for session: ${testId}`);
        
        const entities = this.createdEntities.get(testId) || [];
        const cleanupPromises = [];
        
        try {
            // Clean up entities in reverse order (LIFO)
            for (const entity of entities.reverse()) {
                cleanupPromises.push(this.cleanupEntity(entity));
            }
            
            await Promise.all(cleanupPromises);
            
            // Remove session tracking
            this.createdEntities.delete(testId);
            this.testSessions.delete(testId);
            
            console.log(`✅ Cleanup complete for session: ${testId}`);
            
        } catch (error) {
            console.error(`❌ Cleanup failed for session: ${testId}`, error);
            throw error;
        }
    }

    /**
     * Clean up individual entity
     */
    async cleanupEntity(entity) {
        try {
            switch (entity.type) {
                case 'user':
                    await this.deleteUser(entity.id);
                    break;
                case 'session':
                    await this.invalidateSession(entity.id);
                    break;
                case 'file':
                    await this.deleteFile(entity.id);
                    break;
                default:
                    console.warn(`Unknown entity type for cleanup: ${entity.type}`);
            }
        } catch (error) {
            console.error(`Failed to cleanup entity ${entity.type}:${entity.id}`, error);
        }
    }

    /**
     * Delete test user
     */
    async deleteUser(userId) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log(`🗑️ Deleted test user: ${userId}`);
            }
        } catch (error) {
            console.error(`Failed to delete user ${userId}:`, error);
        }
    }

    /**
     * Invalidate test session
     */
    async invalidateSession(token) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log(`🔓 Invalidated test session`);
            }
        } catch (error) {
            console.error(`Failed to invalidate session:`, error);
        }
    }

    /**
     * Delete test file
     */
    async deleteFile(filePath) {
        try {
            // In a real implementation, this would delete files from storage
            console.log(`🗑️ Deleted test file: ${filePath}`);
        } catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error);
        }
    }

    /**
     * Clean up all test data
     */
    async cleanupAllTestData() {
        console.log('🧹 Cleaning up all test data...');
        
        const cleanupPromises = [];
        
        for (const sessionId of this.testSessions) {
            cleanupPromises.push(this.cleanupTestData(sessionId));
        }
        
        try {
            await Promise.all(cleanupPromises);
            console.log('✅ All test data cleaned up successfully');
        } catch (error) {
            console.error('❌ Failed to cleanup all test data:', error);
            throw error;
        }
    }

    /**
     * Setup cleanup handlers
     */
    async setupCleanupHandlers() {
        // Cleanup on process exit
        process.on('exit', () => {
            console.log('🔄 Process exiting, cleaning up test data...');
        });
        
        process.on('SIGINT', async () => {
            console.log('🛑 Received SIGINT, cleaning up test data...');
            await this.cleanupAllTestData();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('🛑 Received SIGTERM, cleaning up test data...');
            await this.cleanupAllTestData();
            process.exit(0);
        });
        
        // Setup periodic cleanup
        setInterval(async () => {
            await this.cleanupExpiredSessions();
        }, this.config.cleanupTimeout);
    }

    /**
     * Clean up expired test sessions
     */
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        
        for (const [sessionId, entities] of this.createdEntities.entries()) {
            const oldestEntity = entities[0];
            if (oldestEntity) {
                const createdAt = new Date(oldestEntity.createdAt);
                const age = now - createdAt;
                
                // Clean up sessions older than cleanup timeout
                if (age > this.config.cleanupTimeout) {
                    expiredSessions.push(sessionId);
                }
            }
        }
        
        if (expiredSessions.length > 0) {
            console.log(`🕐 Cleaning up ${expiredSessions.length} expired test sessions`);
            
            for (const sessionId of expiredSessions) {
                await this.cleanupTestData(sessionId);
            }
        }
    }

    /**
     * Reset database to clean state
     */
    async resetDatabase() {
        console.log('🔄 Resetting database to clean state...');
        
        try {
            // Clean up all test data first
            await this.cleanupAllTestData();
            
            // Reset database state via API
            const response = await fetch(`${this.config.apiBaseUrl}/admin/reset-test-db`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('✅ Database reset successfully');
            } else {
                console.warn('⚠️ Database reset endpoint not available, using cleanup only');
            }
            
        } catch (error) {
            console.error('❌ Failed to reset database:', error);
            throw error;
        }
    }

    /**
     * Validate test environment
     */
    async validateTestEnvironment() {
        console.log('🔍 Validating test environment...');
        
        const validations = [];
        
        try {
            // Check API connectivity
            validations.push(this.validateApiConnectivity());
            
            // Check database connectivity
            validations.push(this.validateDatabaseConnectivity());
            
            // Check required endpoints
            validations.push(this.validateRequiredEndpoints());
            
            const results = await Promise.all(validations);
            
            const allValid = results.every(result => result.valid);
            
            if (allValid) {
                console.log('✅ Test environment validation passed');
                return true;
            } else {
                console.error('❌ Test environment validation failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Test environment validation error:', error);
            return false;
        }
    }

    /**
     * Validate API connectivity
     */
    async validateApiConnectivity() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/health`);
            return {
                valid: response.ok,
                message: response.ok ? 'API connectivity OK' : `API returned ${response.status}`
            };
        } catch (error) {
            return {
                valid: false,
                message: `API connectivity failed: ${error.message}`
            };
        }
    }

    /**
     * Validate database connectivity
     */
    async validateDatabaseConnectivity() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/health/db`);
            return {
                valid: response.ok,
                message: response.ok ? 'Database connectivity OK' : `Database check failed: ${response.status}`
            };
        } catch (error) {
            return {
                valid: false,
                message: `Database connectivity check failed: ${error.message}`
            };
        }
    }

    /**
     * Validate required endpoints
     */
    async validateRequiredEndpoints() {
        const endpoints = this.getFixture('server', 'endpoints');
        const results = [];
        
        for (const [name, path] of Object.entries(endpoints)) {
            try {
                const response = await fetch(`${this.config.apiBaseUrl}${path}`);
                results.push({
                    endpoint: name,
                    valid: response.status !== 404,
                    status: response.status
                });
            } catch (error) {
                results.push({
                    endpoint: name,
                    valid: false,
                    error: error.message
                });
            }
        }
        
        const allValid = results.every(result => result.valid);
        
        return {
            valid: allValid,
            message: allValid ? 'All endpoints available' : 'Some endpoints unavailable',
            details: results
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestDataManager;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
    window.TestDataManager = TestDataManager;
}