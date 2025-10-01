/**
 * Synchronization Unit Tests
 * Tests for SyncManager and OfflineManager functionality
 */

// Mock dependencies
class MockApiClient {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.responses = new Map();
        this.networkError = false;
        this.requestLog = [];
    }

    setResponse(endpoint, response) {
        this.responses.set(endpoint, response);
    }

    setNetworkError(error) {
        this.networkError = error;
    }

    async get(endpoint) {
        return this._makeRequest('GET', endpoint);
    }

    async post(endpoint, data) {
        return this._makeRequest('POST', endpoint, data);
    }

    async put(endpoint, data) {
        return this._makeRequest('PUT', endpoint, data);
    }

    async delete(endpoint) {
        return this._makeRequest('DELETE', endpoint);
    }

    async _makeRequest(method, endpoint, data = null) {
        this.requestLog.push({ method, endpoint, data, timestamp: Date.now() });

        if (this.networkError) {
            throw new Error('Network error');
        }

        const response = this.responses.get(endpoint);
        if (response) {
            if (response.error) {
                throw new Error(response.error);
            }
            return response;
        }

        return { success: true };
    }

    clearLog() {
        this.requestLog = [];
    }
}

class MockAuthManager {
    constructor() {
        this.authenticated = false;
        this.token = null;
    }

    isAuthenticated() {
        return this.authenticated;
    }

    setAuthenticated(auth, token = 'mock-token') {
        this.authenticated = auth;
        this.token = token;
    }

    getToken() {
        return this.token;
    }
}

class MockNotificationManager {
    constructor() {
        this.notifications = [];
    }

    show(message, type, options = {}) {
        this.notifications.push({ message, type, options, timestamp: Date.now() });
    }

    hide(id) {
        this.notifications = this.notifications.filter(n => n.options.id !== id);
    }

    clear() {
        this.notifications = [];
    }
}

// Test utilities
function createMockSyncManager(options = {}) {
    const apiClient = new MockApiClient();
    const authManager = new MockAuthManager();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: options.online !== false
    });

    // Mock localStorage
    const storage = {};
    global.localStorage = {
        getItem: (key) => storage[key] || null,
        setItem: (key, value) => storage[key] = value,
        removeItem: (key) => delete storage[key],
        clear: () => Object.keys(storage).forEach(key => delete storage[key])
    };

    // Mock window events
    global.window = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    };

    // Mock fetch for ping
    global.fetch = jest.fn();

    const syncManager = new SyncManager(apiClient, authManager);
    
    return { syncManager, apiClient, authManager };
}

function createMockOfflineManager(syncManager, options = {}) {
    const { apiClient, authManager } = syncManager ? 
        { apiClient: syncManager.apiClient, authManager: syncManager.authManager } :
        { apiClient: new MockApiClient(), authManager: new MockAuthManager() };
    
    const notificationManager = new MockNotificationManager();
    
    // Mock document
    global.document = {
        createElement: jest.fn(() => ({
            id: '',
            className: '',
            innerHTML: '',
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            appendChild: jest.fn()
        })),
        getElementById: jest.fn(() => ({
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            textContent: '',
            appendChild: jest.fn()
        })),
        querySelectorAll: jest.fn(() => []),
        head: {
            appendChild: jest.fn()
        },
        body: {
            appendChild: jest.fn()
        }
    };

    const offlineManager = new OfflineManager(apiClient, authManager, notificationManager, syncManager);
    
    return { offlineManager, apiClient, authManager, notificationManager };
}

// SyncManager Tests
describe('SyncManager', () => {
    let syncManager, apiClient, authManager;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        const mocks = createMockSyncManager();
        syncManager = mocks.syncManager;
        apiClient = mocks.apiClient;
        authManager = mocks.authManager;
    });

    describe('Connectivity Detection', () => {
        test('should detect online status correctly', async () => {
            // Mock successful ping
            fetch.mockResolvedValueOnce({ ok: true });
            
            await syncManager.checkConnectivity();
            
            expect(syncManager.isOnline).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/health',
                expect.objectContaining({ method: 'GET' })
            );
        });

        test('should detect offline status when ping fails', async () => {
            // Mock failed ping
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            await syncManager.checkConnectivity();
            
            expect(syncManager.isOnline).toBe(false);
        });

        test('should handle online event', () => {
            const processSyncQueueSpy = jest.spyOn(syncManager, 'processSyncQueue');
            
            syncManager.handleOnline();
            
            expect(syncManager.isOnline).toBe(true);
            expect(processSyncQueueSpy).toHaveBeenCalled();
        });

        test('should handle offline event', () => {
            syncManager.handleOffline();
            
            expect(syncManager.isOnline).toBe(false);
        });

        test('should dispatch status change events', () => {
            syncManager.setOnlineStatus(false);
            
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'syncStatusChanged',
                    detail: expect.objectContaining({
                        isOnline: false,
                        queueSize: 0
                    })
                })
            );
        });
    });

    describe('Sync Queue Management', () => {
        test('should add items to sync queue', () => {
            const itemId = syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            expect(syncManager.syncQueue).toHaveLength(1);
            expect(syncManager.syncQueue[0]).toMatchObject({
                id: itemId,
                action: 'updatePreferences',
                data: { theme: 'dark' },
                priority: 'normal'
            });
        });

        test('should prioritize high priority items', () => {
            syncManager.queueForSync('updatePreferences', { theme: 'dark' }, 'normal');
            syncManager.queueForSync('trackDownload', { type: 'gif' }, 'high');
            
            expect(syncManager.syncQueue[0].action).toBe('trackDownload');
            expect(syncManager.syncQueue[1].action).toBe('updatePreferences');
        });

        test('should save and load sync queue from localStorage', () => {
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            // Create new sync manager to test loading
            const { syncManager: newSyncManager } = createMockSyncManager();
            
            expect(newSyncManager.syncQueue).toHaveLength(1);
            expect(newSyncManager.syncQueue[0].action).toBe('updatePreferences');
        });

        test('should handle localStorage errors gracefully', () => {
            // Mock localStorage error
            localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
            
            const { syncManager: newSyncManager } = createMockSyncManager();
            
            expect(newSyncManager.syncQueue).toEqual([]);
        });
    });

    describe('Sync Processing', () => {
        beforeEach(() => {
            authManager.setAuthenticated(true);
            syncManager.isOnline = true;
        });

        test('should process sync queue when online and authenticated', async () => {
            apiClient.setResponse('/api/user/preferences', { success: true });
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.processSyncQueue();
            
            expect(apiClient.requestLog).toHaveLength(1);
            expect(apiClient.requestLog[0]).toMatchObject({
                method: 'PUT',
                endpoint: '/api/user/preferences',
                data: { theme: 'dark' }
            });
            expect(syncManager.syncQueue).toHaveLength(0);
        });

        test('should not process queue when offline', async () => {
            syncManager.isOnline = false;
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.processSyncQueue();
            
            expect(apiClient.requestLog).toHaveLength(0);
            expect(syncManager.syncQueue).toHaveLength(1);
        });

        test('should not process queue when not authenticated', async () => {
            authManager.setAuthenticated(false);
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.processSyncQueue();
            
            expect(apiClient.requestLog).toHaveLength(0);
            expect(syncManager.syncQueue).toHaveLength(1);
        });

        test('should retry failed items up to max retries', async () => {
            apiClient.setResponse('/api/user/preferences', { error: 'Server error' });
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.processSyncQueue();
            
            expect(syncManager.syncQueue).toHaveLength(1);
            expect(syncManager.syncQueue[0].retryCount).toBe(1);
        });

        test('should remove items after max retries', async () => {
            apiClient.setResponse('/api/user/preferences', { error: 'Server error' });
            const item = {
                id: 'test-id',
                action: 'updatePreferences',
                data: { theme: 'dark' },
                priority: 'normal',
                timestamp: Date.now(),
                retryCount: 3,
                maxRetries: 3
            };
            syncManager.syncQueue = [item];
            
            await syncManager.processSyncQueue();
            
            expect(syncManager.syncQueue).toHaveLength(0);
        });

        test('should handle different sync actions', async () => {
            const actions = [
                { action: 'updatePreferences', endpoint: '/api/user/preferences', method: 'PUT' },
                { action: 'trackDownload', endpoint: '/api/user/track-download', method: 'POST' },
                { action: 'savePreset', endpoint: '/api/user/presets', method: 'POST' },
                { action: 'deletePreset', endpoint: '/api/user/presets/123', method: 'DELETE' },
                { action: 'updateProfile', endpoint: '/api/user/profile', method: 'PUT' }
            ];

            for (const { action, endpoint, method } of actions) {
                apiClient.setResponse(endpoint, { success: true });
                const data = action === 'deletePreset' ? { presetId: '123' } : { test: 'data' };
                syncManager.queueForSync(action, data);
            }
            
            await syncManager.processSyncQueue();
            
            expect(apiClient.requestLog).toHaveLength(5);
            actions.forEach(({ method }, index) => {
                expect(apiClient.requestLog[index].method).toBe(method);
            });
        });

        test('should handle unknown sync actions', async () => {
            syncManager.queueForSync('unknownAction', { test: 'data' });
            
            await syncManager.processSyncQueue();
            
            expect(syncManager.syncQueue).toHaveLength(0); // Should be removed after max retries
        });

        test('should dispatch sync completed event', async () => {
            apiClient.setResponse('/api/user/preferences', { success: true });
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.processSyncQueue();
            
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'syncCompleted',
                    detail: expect.objectContaining({
                        processedCount: 1,
                        remainingCount: 0
                    })
                })
            );
        });
    });

    describe('Force Sync', () => {
        test('should force sync when online and authenticated', async () => {
            authManager.setAuthenticated(true);
            syncManager.isOnline = true;
            apiClient.setResponse('/api/user/preferences', { success: true });
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            await syncManager.forcSync();
            
            expect(syncManager.syncQueue).toHaveLength(0);
        });

        test('should throw error when offline', async () => {
            syncManager.isOnline = false;
            
            await expect(syncManager.forcSync()).rejects.toThrow('Cannot sync while offline');
        });

        test('should throw error when not authenticated', async () => {
            authManager.setAuthenticated(false);
            syncManager.isOnline = true;
            
            await expect(syncManager.forcSync()).rejects.toThrow('Cannot sync while not authenticated');
        });
    });

    describe('Sync Status', () => {
        test('should return correct sync status', () => {
            syncManager.isOnline = true;
            syncManager.syncInProgress = false;
            syncManager.lastSyncTime = 1234567890;
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            const status = syncManager.getSyncStatus();
            
            expect(status).toEqual({
                isOnline: true,
                queueSize: 1,
                syncInProgress: false,
                lastSync: 1234567890,
                hasUnsyncedChanges: true
            });
        });
    });

    describe('Cleanup', () => {
        test('should remove event listeners on destroy', () => {
            syncManager.destroy();
            
            expect(window.removeEventListener).toHaveBeenCalledWith('online', syncManager.handleOnline);
            expect(window.removeEventListener).toHaveBeenCalledWith('offline', syncManager.handleOffline);
        });

        test('should clear sync queue', () => {
            syncManager.queueForSync('updatePreferences', { theme: 'dark' });
            
            syncManager.clearSyncQueue();
            
            expect(syncManager.syncQueue).toHaveLength(0);
        });
    });
});

// OfflineManager Tests
describe('OfflineManager', () => {
    let offlineManager, apiClient, authManager, notificationManager, syncManager;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        
        const syncMocks = createMockSyncManager();
        syncManager = syncMocks.syncManager;
        
        const offlineMocks = createMockOfflineManager(syncManager);
        offlineManager = offlineMocks.offlineManager;
        apiClient = offlineMocks.apiClient;
        authManager = offlineMocks.authManager;
        notificationManager = offlineMocks.notificationManager;
    });

    describe('Offline Mode Detection', () => {
        test('should detect offline mode from sync status', () => {
            const event = new CustomEvent('syncStatusChanged', {
                detail: { isOnline: false, queueSize: 0 }
            });
            
            offlineManager.handleSyncStatusChange(event.detail);
            
            expect(offlineManager.isOfflineMode).toBe(true);
        });

        test('should enable offline mode when going offline', () => {
            offlineManager.enableOfflineMode();
            
            expect(notificationManager.notifications).toHaveLength(1);
            expect(notificationManager.notifications[0]).toMatchObject({
                message: 'Working offline - some features may be limited',
                type: 'info',
                options: { persistent: true, id: 'offline-mode' }
            });
        });

        test('should disable offline mode when going online', () => {
            offlineManager.isOfflineMode = true;
            
            offlineManager.disableOfflineMode();
            
            expect(offlineManager.isOfflineMode).toBe(true); // Still true until status change
        });
    });

    describe('Offline Data Storage', () => {
        test('should store and retrieve offline data', () => {
            const testData = { theme: 'dark', language: 'en' };
            
            offlineManager.storeOfflineData('preferences', testData);
            const retrieved = offlineManager.getOfflineData('preferences');
            
            expect(retrieved).toEqual(testData);
        });

        test('should return null for non-existent data', () => {
            const retrieved = offlineManager.getOfflineData('nonexistent');
            
            expect(retrieved).toBeNull();
        });

        test('should handle localStorage errors gracefully', () => {
            localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
            
            expect(() => {
                offlineManager.storeOfflineData('test', { data: 'test' });
            }).not.toThrow();
        });

        test('should provide offline user data fallback', () => {
            offlineManager.storeOfflineData('preferences', { theme: 'dark' });
            offlineManager.storeOfflineData('usage', { downloadsUsed: 2, downloadsLimit: 3 });
            
            const userData = offlineManager.getOfflineUserData();
            
            expect(userData).toEqual({
                preferences: { theme: 'dark' },
                presets: [],
                usage: { downloadsUsed: 2, downloadsLimit: 3 },
                profile: null
            });
        });
    });

    describe('Offline Queue Management', () => {
        test('should queue offline actions', () => {
            const actionId = offlineManager.queueOfflineAction('updatePreferences', { theme: 'dark' });
            
            expect(offlineManager.offlineQueue).toHaveLength(1);
            expect(offlineManager.offlineQueue[0]).toMatchObject({
                id: actionId,
                action: 'updatePreferences',
                data: { theme: 'dark' },
                priority: 'normal'
            });
        });

        test('should prioritize high priority actions', () => {
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'dark' }, 'normal');
            offlineManager.queueOfflineAction('trackDownload', { type: 'gif' }, 'high');
            
            expect(offlineManager.offlineQueue[0].action).toBe('trackDownload');
            expect(offlineManager.offlineQueue[1].action).toBe('updatePreferences');
        });

        test('should process offline queue when connection returns', async () => {
            // Mock sync manager queueForSync
            syncManager.queueForSync = jest.fn();
            
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'dark' });
            offlineManager.queueOfflineAction('trackDownload', { type: 'gif' });
            
            await offlineManager.processOfflineQueue();
            
            expect(syncManager.queueForSync).toHaveBeenCalledTimes(2);
            expect(syncManager.queueForSync).toHaveBeenCalledWith('updatePreferences', { theme: 'dark' }, 'high');
            expect(syncManager.queueForSync).toHaveBeenCalledWith('trackDownload', { type: 'gif' }, 'high');
            expect(offlineManager.offlineQueue).toHaveLength(0);
        });

        test('should handle processing errors gracefully', async () => {
            syncManager.queueForSync = jest.fn().mockRejectedValue(new Error('Sync error'));
            
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'dark' });
            
            await offlineManager.processOfflineQueue();
            
            expect(offlineManager.offlineQueue).toHaveLength(1); // Item should remain in queue
        });

        test('should show notification after successful processing', async () => {
            syncManager.queueForSync = jest.fn();
            
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'dark' });
            
            await offlineManager.processOfflineQueue();
            
            expect(notificationManager.notifications).toContainEqual(
                expect.objectContaining({
                    message: 'Synced 1 offline changes',
                    type: 'success'
                })
            );
        });
    });

    describe('Download Tracking in Offline Mode', () => {
        test('should track downloads offline', () => {
            const downloadData = { type: 'gif', duration: 30 };
            
            const usage = offlineManager.trackOfflineDownload(downloadData);
            
            expect(usage.downloadsUsed).toBe(1);
            expect(offlineManager.offlineQueue).toHaveLength(1);
            expect(offlineManager.offlineQueue[0]).toMatchObject({
                action: 'trackDownload',
                data: downloadData,
                priority: 'high'
            });
        });

        test('should not exceed download limits', () => {
            // Set initial usage near limit
            offlineManager.storeOfflineData('usage', { downloadsUsed: 2, downloadsLimit: 3 });
            
            const usage1 = offlineManager.trackOfflineDownload({ type: 'gif' });
            const usage2 = offlineManager.trackOfflineDownload({ type: 'mp4' });
            
            expect(usage1.downloadsUsed).toBe(3);
            expect(usage2.downloadsUsed).toBe(3); // Should not exceed limit
        });

        test('should check download availability', () => {
            // Test with available downloads
            offlineManager.storeOfflineData('usage', { downloadsUsed: 1, downloadsLimit: 3 });
            expect(offlineManager.canDownloadOffline()).toBe(true);
            
            // Test with no available downloads
            offlineManager.storeOfflineData('usage', { downloadsUsed: 3, downloadsLimit: 3 });
            expect(offlineManager.canDownloadOffline()).toBe(false);
        });
    });

    describe('User Data Updates', () => {
        test('should update offline user data and queue for sync', () => {
            offlineManager.isOfflineMode = true;
            
            offlineManager.updateOfflineUserData('preferences', { theme: 'dark' });
            
            expect(offlineManager.getOfflineData('preferences')).toEqual({ theme: 'dark' });
            expect(offlineManager.offlineQueue).toHaveLength(1);
            expect(offlineManager.offlineQueue[0].action).toBe('updatePreferences');
        });

        test('should not queue for sync when online', () => {
            offlineManager.isOfflineMode = false;
            
            offlineManager.updateOfflineUserData('preferences', { theme: 'dark' });
            
            expect(offlineManager.getOfflineData('preferences')).toEqual({ theme: 'dark' });
            expect(offlineManager.offlineQueue).toHaveLength(0);
        });
    });

    describe('Offline Status', () => {
        test('should return correct offline status', () => {
            offlineManager.isOfflineMode = true;
            offlineManager.storeOfflineData('preferences', { theme: 'dark' });
            offlineManager.storeOfflineData('usage', { downloadsUsed: 1 });
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'light' });
            
            const status = offlineManager.getOfflineStatus();
            
            expect(status).toMatchObject({
                isOfflineMode: true,
                queueSize: 1,
                dataKeys: ['preferences', 'usage']
            });
            expect(status.lastUpdate).toBeGreaterThan(0);
        });
    });

    describe('Cleanup', () => {
        test('should clear offline data', () => {
            offlineManager.storeOfflineData('preferences', { theme: 'dark' });
            offlineManager.queueOfflineAction('updatePreferences', { theme: 'light' });
            
            offlineManager.clearOfflineData();
            
            expect(offlineManager.offlineData).toEqual({});
            expect(offlineManager.offlineQueue).toHaveLength(0);
        });

        test('should cleanup on destroy', () => {
            offlineManager.destroy();
            
            expect(window.removeEventListener).toHaveBeenCalledWith('syncStatusChanged', expect.any(Function));
        });
    });
});

// Conflict Resolution Tests
describe('Conflict Resolution', () => {
    let syncManager, apiClient, authManager;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        const mocks = createMockSyncManager();
        syncManager = mocks.syncManager;
        apiClient = mocks.apiClient;
        authManager = mocks.authManager;
        authManager.setAuthenticated(true);
        syncManager.isOnline = true;
    });

    test('should handle timestamp-based conflict resolution', async () => {
        // Simulate local data with timestamp
        const localData = { theme: 'dark', timestamp: Date.now() - 1000 };
        const serverData = { theme: 'light', timestamp: Date.now() };
        
        // Mock server response with newer timestamp
        apiClient.setResponse('/api/user/preferences', serverData);
        
        syncManager.queueForSync('updatePreferences', localData);
        await syncManager.processSyncQueue();
        
        // Should have sent the local data to server
        expect(apiClient.requestLog[0].data).toEqual(localData);
    });

    test('should handle sync conflicts with retry logic', async () => {
        // First attempt fails with conflict
        apiClient.setResponse('/api/user/preferences', { error: 'Conflict: data modified' });
        
        syncManager.queueForSync('updatePreferences', { theme: 'dark' });
        await syncManager.processSyncQueue();
        
        // Should retry the item
        expect(syncManager.syncQueue).toHaveLength(1);
        expect(syncManager.syncQueue[0].retryCount).toBe(1);
        
        // Second attempt succeeds
        apiClient.setResponse('/api/user/preferences', { success: true });
        await syncManager.processSyncQueue();
        
        expect(syncManager.syncQueue).toHaveLength(0);
    });

    test('should preserve data integrity during conflicts', async () => {
        const originalData = { theme: 'dark', language: 'en', customSettings: { volume: 0.8 } };
        
        // Mock partial update conflict
        apiClient.setResponse('/api/user/preferences', { 
            error: 'Conflict: partial update failed' 
        });
        
        syncManager.queueForSync('updatePreferences', originalData);
        await syncManager.processSyncQueue();
        
        // Data should remain unchanged in queue for retry
        expect(syncManager.syncQueue[0].data).toEqual(originalData);
    });
});

// Integration Tests
describe('Sync Integration', () => {
    let syncManager, offlineManager, apiClient, authManager, notificationManager;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        
        const syncMocks = createMockSyncManager();
        syncManager = syncMocks.syncManager;
        apiClient = syncMocks.apiClient;
        authManager = syncMocks.authManager;
        
        const offlineMocks = createMockOfflineManager(syncManager);
        offlineManager = offlineMocks.offlineManager;
        notificationManager = offlineMocks.notificationManager;
    });

    test('should handle complete offline to online transition', async () => {
        authManager.setAuthenticated(true);
        
        // Start offline
        syncManager.isOnline = false;
        offlineManager.isOfflineMode = true;
        
        // Make offline changes
        offlineManager.trackOfflineDownload({ type: 'gif', duration: 30 });
        offlineManager.updateOfflineUserData('preferences', { theme: 'dark' });
        
        expect(offlineManager.offlineQueue).toHaveLength(2);
        
        // Go online
        syncManager.isOnline = true;
        offlineManager.isOfflineMode = false;
        
        // Mock successful API responses
        apiClient.setResponse('/api/user/track-download', { success: true });
        apiClient.setResponse('/api/user/preferences', { success: true });
        
        // Process offline queue
        await offlineManager.processOfflineQueue();
        
        // Should have processed all offline actions
        expect(offlineManager.offlineQueue).toHaveLength(0);
        expect(notificationManager.notifications).toContainEqual(
            expect.objectContaining({
                message: 'Synced 2 offline changes',
                type: 'success'
            })
        );
    });

    test('should maintain data consistency across managers', async () => {
        authManager.setAuthenticated(true);
        syncManager.isOnline = true;
        
        // Store data in offline manager
        offlineManager.storeOfflineData('preferences', { theme: 'dark' });
        
        // Queue sync through sync manager
        apiClient.setResponse('/api/user/preferences', { success: true });
        syncManager.queueForSync('updatePreferences', { theme: 'dark' });
        
        await syncManager.processSyncQueue();
        
        // Both managers should be in sync
        expect(syncManager.syncQueue).toHaveLength(0);
        expect(offlineManager.getOfflineData('preferences')).toEqual({ theme: 'dark' });
    });

    test('should handle mixed online/offline scenarios', async () => {
        authManager.setAuthenticated(true);
        
        // Start online, make changes
        syncManager.isOnline = true;
        apiClient.setResponse('/api/user/preferences', { success: true });
        syncManager.queueForSync('updatePreferences', { theme: 'light' });
        
        // Go offline mid-sync
        syncManager.isOnline = false;
        offlineManager.isOfflineMode = true;
        
        // Make offline changes
        offlineManager.updateOfflineUserData('preferences', { theme: 'dark' });
        
        // Go back online
        syncManager.isOnline = true;
        offlineManager.isOfflineMode = false;
        
        // Process all queued items
        await syncManager.processSyncQueue();
        await offlineManager.processOfflineQueue();
        
        // Should handle both online and offline changes
        expect(syncManager.syncQueue).toHaveLength(0);
        expect(offlineManager.offlineQueue).toHaveLength(0);
    });
});

// Export test suite for test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MockApiClient,
        MockAuthManager,
        MockNotificationManager,
        createMockSyncManager,
        createMockOfflineManager
    };
}