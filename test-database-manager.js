/**
 * Test Database Manager
 * Handles database state management, isolation, and cleanup for testing
 */

class TestDatabaseManager {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || 'http://localhost:8000',
            testDbPrefix: config.testDbPrefix || 'test_',
            isolationLevel: config.isolationLevel || 'session', // 'session', 'test', 'suite'
            autoCleanup: config.autoCleanup !== false,
            ...config
        };
        
        this.activeSessions = new Map();
        this.transactionStack = [];
        this.snapshotStates = new Map();
    }

    /**
     * Initialize database manager
     */
    async initialize() {
        console.log('🗄️ Initializing Test Database Manager...');
        
        try {
            await this.validateDatabaseConnection();
            await this.setupTestSchema();
            await this.createBaselineSnapshot();
            
            console.log('✅ Test Database Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Test Database Manager:', error);
            throw error;
        }
    }

    /**
     * Validate database connection
     */
    async validateDatabaseConnection() {
        console.log('🔍 Validating database connection...');
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/health/db`);
            
            if (!response.ok) {
                throw new Error(`Database health check failed: ${response.status}`);
            }
            
            const healthData = await response.json();
            console.log('✅ Database connection validated:', healthData);
            
            return healthData;
        } catch (error) {
            console.error('❌ Database connection validation failed:', error);
            throw error;
        }
    }

    /**
     * Setup test schema and tables
     */
    async setupTestSchema() {
        console.log('📋 Setting up test schema...');
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/setup-test-schema`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prefix: this.config.testDbPrefix,
                    isolationLevel: this.config.isolationLevel
                })
            });
            
            if (response.ok) {
                console.log('✅ Test schema setup completed');
            } else {
                console.warn('⚠️ Test schema setup endpoint not available, using existing schema');
            }
        } catch (error) {
            console.warn('⚠️ Test schema setup failed, continuing with existing schema:', error.message);
        }
    }

    /**
     * Create baseline database snapshot
     */
    async createBaselineSnapshot() {
        console.log('📸 Creating baseline database snapshot...');
        
        try {
            const snapshot = await this.captureCurrentState();
            this.snapshotStates.set('baseline', snapshot);
            
            console.log('✅ Baseline snapshot created');
            return snapshot;
        } catch (error) {
            console.error('❌ Failed to create baseline snapshot:', error);
            throw error;
        }
    }

    /**
     * Capture current database state
     */
    async captureCurrentState() {
        const state = {
            timestamp: new Date().toISOString(),
            tables: {},
            sequences: {},
            metadata: {}
        };
        
        try {
            // Capture table states
            const tables = ['users', 'sessions', 'jobs', 'files'];
            
            for (const table of tables) {
                state.tables[table] = await this.captureTableState(table);
            }
            
            // Capture sequence states (for auto-increment IDs)
            state.sequences = await this.captureSequenceStates();
            
            // Capture metadata
            state.metadata = await this.captureMetadata();
            
            return state;
        } catch (error) {
            console.error('Failed to capture database state:', error);
            throw error;
        }
    }

    /**
     * Capture state of a specific table
     */
    async captureTableState(tableName) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/table-state/${tableName}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                // Fallback: return empty state
                return { rowCount: 0, lastId: 0, data: [] };
            }
        } catch (error) {
            console.warn(`Failed to capture state for table ${tableName}:`, error.message);
            return { rowCount: 0, lastId: 0, data: [] };
        }
    }

    /**
     * Capture sequence states
     */
    async captureSequenceStates() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/sequence-states`);
            
            if (response.ok) {
                return await response.json();
            } else {
                return {};
            }
        } catch (error) {
            console.warn('Failed to capture sequence states:', error.message);
            return {};
        }
    }

    /**
     * Capture database metadata
     */
    async captureMetadata() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/db-metadata`);
            
            if (response.ok) {
                return await response.json();
            } else {
                return { version: 'unknown', schema: 'unknown' };
            }
        } catch (error) {
            console.warn('Failed to capture database metadata:', error.message);
            return { version: 'unknown', schema: 'unknown' };
        }
    }

    /**
     * Start a new test session with database isolation
     */
    async startTestSession(sessionId, options = {}) {
        console.log(`🚀 Starting test session: ${sessionId}`);
        
        const session = {
            id: sessionId,
            startTime: new Date().toISOString(),
            isolationLevel: options.isolationLevel || this.config.isolationLevel,
            initialState: null,
            transactions: [],
            createdEntities: [],
            modifiedEntities: [],
            options
        };
        
        try {
            // Capture initial state for this session
            if (session.isolationLevel === 'session') {
                session.initialState = await this.captureCurrentState();
            }
            
            // Start database transaction if needed
            if (options.useTransaction) {
                await this.beginTransaction(sessionId);
            }
            
            this.activeSessions.set(sessionId, session);
            
            console.log(`✅ Test session started: ${sessionId}`);
            return session;
            
        } catch (error) {
            console.error(`❌ Failed to start test session: ${sessionId}`, error);
            throw error;
        }
    }

    /**
     * Begin database transaction
     */
    async beginTransaction(sessionId) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/begin-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId })
            });
            
            if (response.ok) {
                const transactionData = await response.json();
                this.transactionStack.push({
                    sessionId,
                    transactionId: transactionData.transactionId,
                    startTime: new Date().toISOString()
                });
                
                console.log(`🔄 Transaction started for session: ${sessionId}`);
                return transactionData.transactionId;
            } else {
                console.warn('⚠️ Transaction support not available, using cleanup-based isolation');
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Failed to begin transaction, using cleanup-based isolation:', error.message);
            return null;
        }
    }

    /**
     * Track entity creation for cleanup
     */
    trackEntityCreation(sessionId, entityType, entityId, entityData = {}) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found for entity tracking`);
            return;
        }
        
        session.createdEntities.push({
            type: entityType,
            id: entityId,
            data: entityData,
            createdAt: new Date().toISOString()
        });
        
        console.log(`📝 Tracked entity creation: ${entityType}:${entityId} in session ${sessionId}`);
    }

    /**
     * Track entity modification for rollback
     */
    trackEntityModification(sessionId, entityType, entityId, originalData, newData) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found for entity tracking`);
            return;
        }
        
        session.modifiedEntities.push({
            type: entityType,
            id: entityId,
            originalData,
            newData,
            modifiedAt: new Date().toISOString()
        });
        
        console.log(`📝 Tracked entity modification: ${entityType}:${entityId} in session ${sessionId}`);
    }

    /**
     * Create test user with tracking
     */
    async createTestUser(sessionId, userData) {
        console.log(`👤 Creating test user for session: ${sessionId}`);
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Test-Session': sessionId
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create test user: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Track the created user for cleanup
            this.trackEntityCreation(sessionId, 'user', result.user.id, result.user);
            
            console.log(`✅ Test user created: ${result.user.email}`);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to create test user:', error);
            throw error;
        }
    }

    /**
     * Create test session with tracking
     */
    async createTestAuthSession(sessionId, credentials) {
        console.log(`🔐 Creating auth session for test session: ${sessionId}`);
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Test-Session': sessionId
                },
                body: JSON.stringify(credentials)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create auth session: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Track the created session for cleanup
            this.trackEntityCreation(sessionId, 'auth_session', result.token, result);
            
            console.log(`✅ Auth session created for test session: ${sessionId}`);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to create auth session:', error);
            throw error;
        }
    }

    /**
     * End test session and cleanup
     */
    async endTestSession(sessionId, options = {}) {
        console.log(`🏁 Ending test session: ${sessionId}`);
        
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`Session ${sessionId} not found`);
            return;
        }
        
        try {
            // Rollback transaction if active
            if (options.rollback !== false) {
                await this.rollbackTransaction(sessionId);
            }
            
            // Clean up created entities
            if (this.config.autoCleanup && options.cleanup !== false) {
                await this.cleanupSessionEntities(sessionId);
            }
            
            // Restore database state if needed
            if (session.isolationLevel === 'session' && options.restoreState) {
                await this.restoreState(session.initialState);
            }
            
            // Remove session tracking
            this.activeSessions.delete(sessionId);
            
            console.log(`✅ Test session ended: ${sessionId}`);
            
        } catch (error) {
            console.error(`❌ Failed to end test session: ${sessionId}`, error);
            throw error;
        }
    }

    /**
     * Rollback database transaction
     */
    async rollbackTransaction(sessionId) {
        const transactionIndex = this.transactionStack.findIndex(t => t.sessionId === sessionId);
        
        if (transactionIndex === -1) {
            console.log(`No active transaction for session: ${sessionId}`);
            return;
        }
        
        const transaction = this.transactionStack[transactionIndex];
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/rollback-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId,
                    transactionId: transaction.transactionId
                })
            });
            
            if (response.ok) {
                console.log(`🔄 Transaction rolled back for session: ${sessionId}`);
            } else {
                console.warn('⚠️ Transaction rollback failed, using entity cleanup');
            }
            
            // Remove transaction from stack
            this.transactionStack.splice(transactionIndex, 1);
            
        } catch (error) {
            console.warn('⚠️ Transaction rollback failed, using entity cleanup:', error.message);
        }
    }

    /**
     * Clean up entities created during session
     */
    async cleanupSessionEntities(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return;
        }
        
        console.log(`🧹 Cleaning up entities for session: ${sessionId}`);
        
        // Clean up in reverse order (LIFO)
        const entities = [...session.createdEntities].reverse();
        
        for (const entity of entities) {
            try {
                await this.cleanupEntity(entity);
            } catch (error) {
                console.error(`Failed to cleanup entity ${entity.type}:${entity.id}:`, error);
            }
        }
        
        console.log(`✅ Entity cleanup completed for session: ${sessionId}`);
    }

    /**
     * Clean up individual entity
     */
    async cleanupEntity(entity) {
        try {
            let endpoint;
            let method = 'DELETE';
            
            switch (entity.type) {
                case 'user':
                    endpoint = `/admin/users/${entity.id}`;
                    break;
                case 'auth_session':
                    endpoint = `/auth/logout`;
                    method = 'POST';
                    break;
                case 'job':
                    endpoint = `/admin/jobs/${entity.id}`;
                    break;
                case 'file':
                    endpoint = `/admin/files/${entity.id}`;
                    break;
                default:
                    console.warn(`Unknown entity type for cleanup: ${entity.type}`);
                    return;
            }
            
            const headers = { 'Content-Type': 'application/json' };
            
            // Add authorization for session cleanup
            if (entity.type === 'auth_session') {
                headers['Authorization'] = `Bearer ${entity.id}`;
            }
            
            const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
                method,
                headers
            });
            
            if (response.ok) {
                console.log(`🗑️ Cleaned up entity: ${entity.type}:${entity.id}`);
            } else {
                console.warn(`Failed to cleanup entity ${entity.type}:${entity.id}: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`Error cleaning up entity ${entity.type}:${entity.id}:`, error);
        }
    }

    /**
     * Restore database to a previous state
     */
    async restoreState(targetState) {
        console.log('🔄 Restoring database state...');
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/admin/restore-state`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(targetState)
            });
            
            if (response.ok) {
                console.log('✅ Database state restored successfully');
            } else {
                console.warn('⚠️ State restoration not supported, using cleanup only');
            }
            
        } catch (error) {
            console.warn('⚠️ State restoration failed, using cleanup only:', error.message);
        }
    }

    /**
     * Reset database to baseline state
     */
    async resetToBaseline() {
        console.log('🔄 Resetting database to baseline state...');
        
        try {
            // End all active sessions
            for (const sessionId of this.activeSessions.keys()) {
                await this.endTestSession(sessionId);
            }
            
            // Restore to baseline snapshot
            const baselineState = this.snapshotStates.get('baseline');
            if (baselineState) {
                await this.restoreState(baselineState);
            }
            
            console.log('✅ Database reset to baseline completed');
            
        } catch (error) {
            console.error('❌ Failed to reset database to baseline:', error);
            throw error;
        }
    }

    /**
     * Get session statistics
     */
    getSessionStats(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return null;
        }
        
        return {
            sessionId: session.id,
            startTime: session.startTime,
            duration: Date.now() - new Date(session.startTime).getTime(),
            createdEntities: session.createdEntities.length,
            modifiedEntities: session.modifiedEntities.length,
            isolationLevel: session.isolationLevel
        };
    }

    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.keys()).map(sessionId => 
            this.getSessionStats(sessionId)
        );
    }

    /**
     * Cleanup all test data
     */
    async cleanupAll() {
        console.log('🧹 Cleaning up all test data...');
        
        try {
            // End all active sessions
            const sessionIds = Array.from(this.activeSessions.keys());
            
            for (const sessionId of sessionIds) {
                await this.endTestSession(sessionId);
            }
            
            // Reset to baseline
            await this.resetToBaseline();
            
            console.log('✅ All test data cleaned up successfully');
            
        } catch (error) {
            console.error('❌ Failed to cleanup all test data:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestDatabaseManager;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
    window.TestDatabaseManager = TestDatabaseManager;
}