/**
 * SyncManager - Handles data synchronization between local storage and backend
 * Provides offline/online state detection and queues changes for sync
 */
class SyncManager {
    constructor(apiClient, authManager) {
        this.apiClient = apiClient;
        this.authManager = authManager;
        this.isOnline = navigator.onLine;
        this.syncQueue = this.loadSyncQueue();
        this.syncInProgress = false;
        this.lastSyncTime = this.getLastSyncTime();
        
        // Bind event handlers
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        
        this.init();
    }

    init() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
        
        // Check connectivity on startup
        this.checkConnectivity();
        
        // Auto-sync every 5 minutes when online
        this.startAutoSync();
    }

    /**
     * Check if we're currently online
     */
    checkConnectivity() {
        // Use a simple ping to backend to verify actual connectivity
        if (navigator.onLine) {
            this.pingBackend()
                .then(() => {
                    if (!this.isOnline) {
                        this.setOnlineStatus(true);
                    }
                })
                .catch(() => {
                    if (this.isOnline) {
                        this.setOnlineStatus(false);
                    }
                });
        } else {
            this.setOnlineStatus(false);
        }
    }

    /**
     * Ping backend to verify connectivity
     */
    async pingBackend() {
        try {
            const response = await fetch(`${this.apiClient.baseURL}/api/health`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            throw new Error('Backend unreachable');
        }
    }

    /**
     * Handle online event
     */
    handleOnline() {
        console.log('SyncManager: Connection restored');
        this.setOnlineStatus(true);
        this.processSyncQueue();
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('SyncManager: Connection lost');
        this.setOnlineStatus(false);
    }

    /**
     * Set online/offline status and notify UI
     */
    setOnlineStatus(online) {
        const wasOnline = this.isOnline;
        this.isOnline = online;
        
        if (wasOnline !== online) {
            // Dispatch custom event for UI updates
            window.dispatchEvent(new CustomEvent('syncStatusChanged', {
                detail: { 
                    isOnline: online,
                    queueSize: this.syncQueue.length,
                    lastSync: this.lastSyncTime
                }
            }));
        }
    }

    /**
     * Add item to sync queue
     */
    queueForSync(action, data, priority = 'normal') {
        const queueItem = {
            id: this.generateId(),
            action,
            data,
            priority,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3
        };

        // Add to queue based on priority
        if (priority === 'high') {
            this.syncQueue.unshift(queueItem);
        } else {
            this.syncQueue.push(queueItem);
        }

        this.saveSyncQueue();
        
        // Try to sync immediately if online
        if (this.isOnline && !this.syncInProgress) {
            this.processSyncQueue();
        }

        return queueItem.id;
    }

    /**
     * Process sync queue
     */
    async processSyncQueue() {
        if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
            return;
        }

        if (!this.authManager.isAuthenticated()) {
            console.log('SyncManager: Not authenticated, skipping sync');
            return;
        }

        this.syncInProgress = true;
        console.log(`SyncManager: Processing ${this.syncQueue.length} queued items`);

        const processedItems = [];
        
        while (this.syncQueue.length > 0 && this.isOnline) {
            const item = this.syncQueue[0];
            
            try {
                await this.processSyncItem(item);
                processedItems.push(this.syncQueue.shift());
                console.log(`SyncManager: Successfully synced ${item.action}`);
            } catch (error) {
                console.error(`SyncManager: Failed to sync ${item.action}:`, error);
                
                item.retryCount++;
                if (item.retryCount >= item.maxRetries) {
                    console.error(`SyncManager: Max retries reached for ${item.action}, removing from queue`);
                    processedItems.push(this.syncQueue.shift());
                } else {
                    // Move failed item to end of queue for retry
                    this.syncQueue.push(this.syncQueue.shift());
                    break; // Stop processing to avoid infinite loop
                }
            }
        }

        this.syncInProgress = false;
        this.saveSyncQueue();
        
        if (processedItems.length > 0) {
            this.lastSyncTime = Date.now();
            this.saveLastSyncTime();
            
            // Notify UI of sync completion
            window.dispatchEvent(new CustomEvent('syncCompleted', {
                detail: { 
                    processedCount: processedItems.length,
                    remainingCount: this.syncQueue.length,
                    lastSync: this.lastSyncTime
                }
            }));
        }
    }

    /**
     * Process individual sync item
     */
    async processSyncItem(item) {
        switch (item.action) {
            case 'updatePreferences':
                return await this.apiClient.put('/api/user/preferences', item.data);
            
            case 'trackDownload':
                return await this.apiClient.post('/api/user/track-download', item.data);
            
            case 'savePreset':
                return await this.apiClient.post('/api/user/presets', item.data);
            
            case 'deletePreset':
                return await this.apiClient.delete(`/api/user/presets/${item.data.presetId}`);
            
            case 'updateProfile':
                return await this.apiClient.put('/api/user/profile', item.data);
            
            default:
                throw new Error(`Unknown sync action: ${item.action}`);
        }
    }

    /**
     * Force sync now (if online and authenticated)
     */
    async forcSync() {
        if (!this.isOnline) {
            throw new Error('Cannot sync while offline');
        }
        
        if (!this.authManager.isAuthenticated()) {
            throw new Error('Cannot sync while not authenticated');
        }

        await this.processSyncQueue();
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            queueSize: this.syncQueue.length,
            syncInProgress: this.syncInProgress,
            lastSync: this.lastSyncTime,
            hasUnsyncedChanges: this.syncQueue.length > 0
        };
    }

    /**
     * Clear sync queue (use with caution)
     */
    clearSyncQueue() {
        this.syncQueue = [];
        this.saveSyncQueue();
    }

    /**
     * Start auto-sync timer
     */
    startAutoSync() {
        // Sync every 5 minutes when online
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Generate unique ID for queue items
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Load sync queue from localStorage
     */
    loadSyncQueue() {
        try {
            const stored = localStorage.getItem('oriel_sync_queue');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('SyncManager: Failed to load sync queue:', error);
            return [];
        }
    }

    /**
     * Save sync queue to localStorage
     */
    saveSyncQueue() {
        try {
            localStorage.setItem('oriel_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('SyncManager: Failed to save sync queue:', error);
        }
    }

    /**
     * Get last sync time from localStorage
     */
    getLastSyncTime() {
        try {
            const stored = localStorage.getItem('oriel_last_sync');
            return stored ? parseInt(stored) : null;
        } catch (error) {
            console.error('SyncManager: Failed to load last sync time:', error);
            return null;
        }
    }

    /**
     * Save last sync time to localStorage
     */
    saveLastSyncTime() {
        try {
            localStorage.setItem('oriel_last_sync', this.lastSyncTime.toString());
        } catch (error) {
            console.error('SyncManager: Failed to save last sync time:', error);
        }
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}

// Make available globally
window.SyncManager = SyncManager;