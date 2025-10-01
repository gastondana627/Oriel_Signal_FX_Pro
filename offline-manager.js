/**
 * OfflineManager - Handles offline mode functionality and local storage fallback
 * Provides seamless experience when backend is unavailable
 */
class OfflineManager {
    constructor(apiClient, authManager, notificationManager, syncManager) {
        this.apiClient = apiClient;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        this.syncManager = syncManager;
        
        this.isOfflineMode = false;
        this.offlineData = this.loadOfflineData();
        this.offlineQueue = [];
        
        this.init();
    }

    /**
     * Initialize offline manager
     */
    init() {
        // Listen for sync status changes
        window.addEventListener('syncStatusChanged', (event) => {
            this.handleSyncStatusChange(event.detail);
        });
        
        // Set up offline UI indicators
        this.setupOfflineUI();
        
        // Check initial state
        this.checkOfflineMode();
    }

    /**
     * Handle sync status changes
     */
    handleSyncStatusChange(status) {
        const wasOffline = this.isOfflineMode;
        this.isOfflineMode = !status.isOnline;
        
        if (wasOffline !== this.isOfflineMode) {
            this.updateOfflineUI();
            
            if (this.isOfflineMode) {
                this.enableOfflineMode();
            } else {
                this.disableOfflineMode();
            }
        }
    }

    /**
     * Check if we should be in offline mode
     */
    checkOfflineMode() {
        if (this.syncManager) {
            const syncStatus = this.syncManager.getSyncStatus();
            this.isOfflineMode = !syncStatus.isOnline;
        } else {
            this.isOfflineMode = !navigator.onLine;
        }
        
        this.updateOfflineUI();
    }

    /**
     * Enable offline mode
     */
    enableOfflineMode() {
        console.log('OfflineManager: Enabling offline mode');
        
        // Show offline notification
        this.notificationManager.show(
            'Working offline - some features may be limited',
            'info',
            { persistent: true, id: 'offline-mode' }
        );
        
        // Update UI to show offline status
        this.updateOfflineUI();
    }

    /**
     * Disable offline mode
     */
    disableOfflineMode() {
        console.log('OfflineManager: Disabling offline mode');
        
        // Hide offline notification
        this.notificationManager.hide('offline-mode');
        
        // Update UI to show online status
        this.updateOfflineUI();
        
        // Process any queued offline actions
        this.processOfflineQueue();
    }

    /**
     * Set up offline UI indicators
     */
    setupOfflineUI() {
        // Create offline status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'offline-status';
        statusIndicator.className = 'offline-status hidden';
        statusIndicator.innerHTML = `
            <div class="offline-indicator">
                <span class="offline-icon">📡</span>
                <span class="offline-text">Offline Mode</span>
                <span class="offline-queue" id="offline-queue-count"></span>
            </div>
        `;
        
        // Add to user status area
        const userStatus = document.getElementById('user-status');
        if (userStatus) {
            userStatus.appendChild(statusIndicator);
        } else {
            // Add to body if user status not found
            document.body.appendChild(statusIndicator);
        }
        
        // Add CSS for offline indicator
        this.addOfflineCSS();
    }

    /**
     * Update offline UI indicators
     */
    updateOfflineUI() {
        const offlineStatus = document.getElementById('offline-status');
        const queueCount = document.getElementById('offline-queue-count');
        
        if (offlineStatus) {
            if (this.isOfflineMode) {
                offlineStatus.classList.remove('hidden');
                
                // Update queue count
                if (queueCount && this.syncManager) {
                    const syncStatus = this.syncManager.getSyncStatus();
                    const count = syncStatus.queueSize + this.offlineQueue.length;
                    queueCount.textContent = count > 0 ? `(${count})` : '';
                }
            } else {
                offlineStatus.classList.add('hidden');
            }
        }
        
        // Update other UI elements to show offline state
        this.updateFeatureAvailability();
    }

    /**
     * Update feature availability based on offline mode
     */
    updateFeatureAvailability() {
        const offlineDisabledElements = document.querySelectorAll('[data-requires-online]');
        
        offlineDisabledElements.forEach(element => {
            if (this.isOfflineMode) {
                element.disabled = true;
                element.title = 'This feature requires an internet connection';
                element.classList.add('offline-disabled');
            } else {
                element.disabled = false;
                element.title = '';
                element.classList.remove('offline-disabled');
            }
        });
    }

    /**
     * Add CSS for offline indicators
     */
    addOfflineCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .offline-status {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: rgba(255, 165, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: opacity 0.3s ease;
            }
            
            .offline-status.hidden {
                display: none;
            }
            
            .offline-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .offline-icon {
                font-size: 14px;
            }
            
            .offline-queue {
                font-weight: bold;
                color: #ffeb3b;
            }
            
            .offline-disabled {
                opacity: 0.5;
                cursor: not-allowed !important;
            }
            
            .offline-disabled:hover {
                background-color: #ccc !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Store data locally for offline access
     */
    storeOfflineData(key, data) {
        this.offlineData[key] = {
            data: data,
            timestamp: Date.now(),
            version: 1
        };
        this.saveOfflineData();
    }

    /**
     * Get data from offline storage
     */
    getOfflineData(key) {
        const stored = this.offlineData[key];
        if (stored) {
            return stored.data;
        }
        return null;
    }

    /**
     * Queue action for when connection returns
     */
    queueOfflineAction(action, data, priority = 'normal') {
        const queueItem = {
            id: this.generateId(),
            action,
            data,
            priority,
            timestamp: Date.now()
        };
        
        if (priority === 'high') {
            this.offlineQueue.unshift(queueItem);
        } else {
            this.offlineQueue.push(queueItem);
        }
        
        this.saveOfflineQueue();
        this.updateOfflineUI();
        
        return queueItem.id;
    }

    /**
     * Process offline queue when connection returns
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) {
            return;
        }
        
        console.log(`OfflineManager: Processing ${this.offlineQueue.length} offline actions`);
        
        const processedItems = [];
        
        while (this.offlineQueue.length > 0) {
            const item = this.offlineQueue[0];
            
            try {
                await this.processOfflineAction(item);
                processedItems.push(this.offlineQueue.shift());
                console.log(`OfflineManager: Successfully processed ${item.action}`);
            } catch (error) {
                console.error(`OfflineManager: Failed to process ${item.action}:`, error);
                // Move failed item to end for retry later
                this.offlineQueue.push(this.offlineQueue.shift());
                break;
            }
        }
        
        this.saveOfflineQueue();
        this.updateOfflineUI();
        
        if (processedItems.length > 0) {
            this.notificationManager.show(
                `Synced ${processedItems.length} offline changes`,
                'success'
            );
        }
    }

    /**
     * Process individual offline action
     */
    async processOfflineAction(item) {
        // Use SyncManager if available, otherwise direct API calls
        if (this.syncManager) {
            return this.syncManager.queueForSync(item.action, item.data, 'high');
        }
        
        // Fallback to direct processing
        switch (item.action) {
            case 'trackDownload':
                return await this.apiClient.post('/api/user/track-download', item.data);
            
            case 'updatePreferences':
                return await this.apiClient.put('/api/user/preferences', item.data);
            
            case 'savePreset':
                return await this.apiClient.post('/api/user/presets', item.data);
            
            default:
                console.warn(`OfflineManager: Unknown action ${item.action}`);
        }
    }

    /**
     * Provide offline fallback for user data
     */
    getOfflineUserData() {
        return {
            preferences: this.getOfflineData('preferences') || {},
            presets: this.getOfflineData('presets') || [],
            usage: this.getOfflineData('usage') || { downloadsUsed: 0, downloadsLimit: 3 },
            profile: this.getOfflineData('profile') || null
        };
    }

    /**
     * Update offline user data
     */
    updateOfflineUserData(key, data) {
        this.storeOfflineData(key, data);
        
        // Queue for sync when online
        if (this.isOfflineMode) {
            this.queueOfflineAction(`update${key.charAt(0).toUpperCase() + key.slice(1)}`, data);
        }
    }

    /**
     * Handle download tracking in offline mode
     */
    trackOfflineDownload(downloadData) {
        // Update local usage data
        const usage = this.getOfflineData('usage') || { downloadsUsed: 0, downloadsLimit: 3 };
        usage.downloadsUsed = Math.min(usage.downloadsUsed + 1, usage.downloadsLimit);
        this.storeOfflineData('usage', usage);
        
        // Queue for sync
        this.queueOfflineAction('trackDownload', downloadData, 'high');
        
        return usage;
    }

    /**
     * Check if user can download in offline mode
     */
    canDownloadOffline() {
        const usage = this.getOfflineData('usage') || { downloadsUsed: 0, downloadsLimit: 3 };
        return usage.downloadsUsed < usage.downloadsLimit;
    }

    /**
     * Load offline data from localStorage
     */
    loadOfflineData() {
        try {
            const stored = localStorage.getItem('oriel_offline_data');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('OfflineManager: Failed to load offline data:', error);
            return {};
        }
    }

    /**
     * Save offline data to localStorage
     */
    saveOfflineData() {
        try {
            localStorage.setItem('oriel_offline_data', JSON.stringify(this.offlineData));
        } catch (error) {
            console.error('OfflineManager: Failed to save offline data:', error);
        }
    }

    /**
     * Load offline queue from localStorage
     */
    loadOfflineQueue() {
        try {
            const stored = localStorage.getItem('oriel_offline_queue');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('OfflineManager: Failed to load offline queue:', error);
            return [];
        }
    }

    /**
     * Save offline queue to localStorage
     */
    saveOfflineQueue() {
        try {
            localStorage.setItem('oriel_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('OfflineManager: Failed to save offline queue:', error);
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Clear offline data (use with caution)
     */
    clearOfflineData() {
        this.offlineData = {};
        this.offlineQueue = [];
        this.saveOfflineData();
        this.saveOfflineQueue();
        this.updateOfflineUI();
    }

    /**
     * Get offline status
     */
    getOfflineStatus() {
        return {
            isOfflineMode: this.isOfflineMode,
            queueSize: this.offlineQueue.length,
            dataKeys: Object.keys(this.offlineData),
            lastUpdate: Math.max(
                ...Object.values(this.offlineData).map(item => item.timestamp || 0)
            )
        };
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy() {
        window.removeEventListener('syncStatusChanged', this.handleSyncStatusChange);
        
        const offlineStatus = document.getElementById('offline-status');
        if (offlineStatus) {
            offlineStatus.remove();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineManager;
}

// Make available globally
window.OfflineManager = OfflineManager;