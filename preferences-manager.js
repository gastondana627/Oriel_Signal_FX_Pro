/**
 * Preferences Manager
 * Handles user preferences synchronization and management
 */
class PreferencesManager {
    constructor(apiClient, authManager, notificationManager) {
        this.apiClient = apiClient;
        this.authManager = authManager;
        this.notificationManager = notificationManager;
        
        // Default preferences
        this.defaultPreferences = {
            glowColor: '#8309D5',
            pulse: 1.5,
            shape: 'circle',
            autoSync: true,
            theme: 'dark',
            autoPlay: false,
            volume: 0.5,
            quality: 'high'
        };
        
        // Current preferences
        this.preferences = { ...this.defaultPreferences };
        
        // Sync state
        this.isSyncing = false;
        this.syncQueue = [];
        this.lastSyncTime = null;
        
        // Event listeners
        this.changeListeners = [];
        
        this.initialize();
    }

    /**
     * Initialize preferences manager
     */
    initialize() {
        this.setupAuthStateListener();
        this.loadPreferences();
        this.setupPeriodicSync();
    }

    /**
     * Set up authentication state listener
     */
    setupAuthStateListener() {
        this.authManager.onStateChange(async (authState) => {
            if (authState.isAuthenticated) {
                // User logged in - sync preferences from server
                await this.syncFromServer();
            } else {
                // User logged out - reset to local preferences
                this.loadLocalPreferences();
            }
        });
    }

    /**
     * Load preferences from appropriate source
     */
    async loadPreferences() {
        if (this.authManager.isAuthenticated()) {
            await this.syncFromServer();
        } else {
            this.loadLocalPreferences();
        }
    }

    /**
     * Load preferences from local storage
     */
    loadLocalPreferences() {
        try {
            const stored = localStorage.getItem('oriel_fx_preferences');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.preferences = { ...this.defaultPreferences, ...parsed };
            } else {
                this.preferences = { ...this.defaultPreferences };
            }
            
            this.notifyListeners();
        } catch (error) {
            console.error('Error loading local preferences:', error);
            this.preferences = { ...this.defaultPreferences };
        }
    }

    /**
     * Save preferences to local storage
     */
    saveLocalPreferences() {
        try {
            localStorage.setItem('oriel_fx_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving local preferences:', error);
        }
    }

    /**
     * Sync preferences from server
     */
    async syncFromServer() {
        if (!this.authManager.isAuthenticated()) {
            return;
        }
        
        try {
            const response = await this.apiClient.get('/api/user/preferences');
            
            if (response.success && response.data) {
                // Merge server preferences with defaults
                const serverPreferences = response.data;
                this.preferences = { ...this.defaultPreferences, ...serverPreferences };
                
                // Save to local storage as backup
                this.saveLocalPreferences();
                
                this.lastSyncTime = new Date();
                this.notifyListeners();
                
                console.log('Preferences synced from server');
            }
        } catch (error) {
            console.error('Error syncing preferences from server:', error);
            // Fall back to local preferences
            this.loadLocalPreferences();
        }
    }

    /**
     * Sync preferences to server
     */
    async syncToServer(preferences = null) {
        if (!this.authManager.isAuthenticated()) {
            return false;
        }
        
        if (this.isSyncing) {
            // Add to sync queue if already syncing
            if (preferences) {
                this.syncQueue.push(preferences);
            }
            return false;
        }
        
        this.isSyncing = true;
        
        try {
            const prefsToSync = preferences || this.preferences;
            const response = await this.apiClient.put('/api/user/preferences', prefsToSync);
            
            if (response.success) {
                this.lastSyncTime = new Date();
                console.log('Preferences synced to server');
                
                // Process sync queue
                if (this.syncQueue.length > 0) {
                    const nextPrefs = this.syncQueue.pop();
                    this.syncQueue = []; // Clear queue
                    setTimeout(() => this.syncToServer(nextPrefs), 100);
                }
                
                return true;
            } else {
                console.error('Failed to sync preferences to server:', response.error);
                return false;
            }
        } catch (error) {
            console.error('Error syncing preferences to server:', error);
            return false;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get current preferences
     */
    getPreferences() {
        return { ...this.preferences };
    }

    /**
     * Get a specific preference
     */
    getPreference(key) {
        return this.preferences[key];
    }

    /**
     * Set a single preference
     */
    async setPreference(key, value) {
        if (this.preferences[key] === value) {
            return; // No change
        }
        
        this.preferences[key] = value;
        
        // Save locally immediately
        this.saveLocalPreferences();
        
        // Sync to server if authenticated and auto-sync is enabled
        if (this.authManager.isAuthenticated() && this.preferences.autoSync) {
            await this.syncToServer();
        }
        
        this.notifyListeners();
    }

    /**
     * Set multiple preferences
     */
    async setPreferences(newPreferences) {
        let hasChanges = false;
        
        for (const [key, value] of Object.entries(newPreferences)) {
            if (this.preferences[key] !== value) {
                this.preferences[key] = value;
                hasChanges = true;
            }
        }
        
        if (!hasChanges) {
            return;
        }
        
        // Save locally immediately
        this.saveLocalPreferences();
        
        // Sync to server if authenticated and auto-sync is enabled
        if (this.authManager.isAuthenticated() && this.preferences.autoSync) {
            await this.syncToServer();
        }
        
        this.notifyListeners();
    }

    /**
     * Reset preferences to defaults
     */
    async resetToDefaults() {
        this.preferences = { ...this.defaultPreferences };
        
        // Save locally
        this.saveLocalPreferences();
        
        // Sync to server if authenticated
        if (this.authManager.isAuthenticated()) {
            await this.syncToServer();
        }
        
        this.notifyListeners();
    }

    /**
     * Apply preferences to visualizer controls
     */
    applyToVisualizer() {
        try {
            // Update glow color
            const glowColorInput = document.getElementById('glowColor');
            if (glowColorInput && this.preferences.glowColor) {
                glowColorInput.value = this.preferences.glowColor;
                glowColorInput.dispatchEvent(new Event('change'));
            }
            
            // Update pulse intensity
            const pulseInput = document.getElementById('pulse');
            if (pulseInput && this.preferences.pulse !== undefined) {
                pulseInput.value = this.preferences.pulse;
                pulseInput.dispatchEvent(new Event('input'));
            }
            
            // Update shape if shape selector exists
            if (this.preferences.shape && window.setCurrentShape) {
                window.setCurrentShape(this.preferences.shape);
            }
            
            // Update volume if audio element exists
            const audioElement = document.getElementById('background-music');
            if (audioElement && this.preferences.volume !== undefined) {
                audioElement.volume = this.preferences.volume;
            }
            
            console.log('Preferences applied to visualizer');
        } catch (error) {
            console.error('Error applying preferences to visualizer:', error);
        }
    }

    /**
     * Capture current visualizer settings as preferences
     */
    captureFromVisualizer() {
        try {
            const updates = {};
            
            // Capture glow color
            const glowColorInput = document.getElementById('glowColor');
            if (glowColorInput) {
                updates.glowColor = glowColorInput.value;
            }
            
            // Capture pulse intensity
            const pulseInput = document.getElementById('pulse');
            if (pulseInput) {
                updates.pulse = parseFloat(pulseInput.value);
            }
            
            // Capture current shape if available
            if (window.getCurrentShape) {
                updates.shape = window.getCurrentShape();
            }
            
            // Capture volume
            const audioElement = document.getElementById('background-music');
            if (audioElement) {
                updates.volume = audioElement.volume;
            }
            
            // Update preferences if there are changes
            if (Object.keys(updates).length > 0) {
                this.setPreferences(updates);
                console.log('Captured preferences from visualizer');
            }
        } catch (error) {
            console.error('Error capturing preferences from visualizer:', error);
        }
    }

    /**
     * Set up periodic sync for authenticated users
     */
    setupPeriodicSync() {
        // Sync every 5 minutes if authenticated and auto-sync is enabled
        setInterval(async () => {
            if (this.authManager.isAuthenticated() && 
                this.preferences.autoSync && 
                !this.isSyncing) {
                
                const timeSinceLastSync = this.lastSyncTime ? 
                    Date.now() - this.lastSyncTime.getTime() : 
                    Infinity;
                
                // Only sync if it's been more than 4 minutes since last sync
                if (timeSinceLastSync > 4 * 60 * 1000) {
                    await this.syncFromServer();
                }
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Force sync preferences (useful for manual sync)
     */
    async forceSync() {
        if (!this.authManager.isAuthenticated()) {
            this.notificationManager.show('Please log in to sync preferences', 'warning');
            return false;
        }
        
        try {
            // First sync from server to get latest
            await this.syncFromServer();
            
            // Then sync current preferences to server
            const success = await this.syncToServer();
            
            if (success) {
                this.notificationManager.show('Preferences synced successfully', 'success');
            } else {
                this.notificationManager.show('Failed to sync preferences', 'error');
            }
            
            return success;
        } catch (error) {
            console.error('Error during force sync:', error);
            this.notificationManager.show('Failed to sync preferences', 'error');
            return false;
        }
    }

    /**
     * Add change listener
     */
    onChange(callback) {
        this.changeListeners.push(callback);
    }

    /**
     * Remove change listener
     */
    removeChangeListener(callback) {
        const index = this.changeListeners.indexOf(callback);
        if (index > -1) {
            this.changeListeners.splice(index, 1);
        }
    }

    /**
     * Notify all change listeners
     */
    notifyListeners() {
        this.changeListeners.forEach(callback => {
            try {
                callback(this.preferences);
            } catch (error) {
                console.error('Error in preferences change listener:', error);
            }
        });
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            queueLength: this.syncQueue.length,
            isAuthenticated: this.authManager.isAuthenticated(),
            autoSyncEnabled: this.preferences.autoSync
        };
    }

    /**
     * Export preferences for backup
     */
    exportPreferences() {
        return {
            preferences: this.preferences,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import preferences from backup
     */
    async importPreferences(exportData) {
        try {
            if (!exportData.preferences) {
                throw new Error('Invalid export data');
            }
            
            // Validate preferences against defaults
            const validPreferences = {};
            for (const [key, value] of Object.entries(exportData.preferences)) {
                if (key in this.defaultPreferences) {
                    validPreferences[key] = value;
                }
            }
            
            await this.setPreferences(validPreferences);
            this.notificationManager.show('Preferences imported successfully', 'success');
            
            return true;
        } catch (error) {
            console.error('Error importing preferences:', error);
            this.notificationManager.show('Failed to import preferences', 'error');
            return false;
        }
    }

    /**
     * Initialize preferences manager
     */
    static async initialize() {
        // Wait for dependencies to be available
        if (!window.apiClient || !window.authManager || !window.notificationManager) {
            throw new Error('PreferencesManager dependencies not available');
        }
        
        const preferencesManager = new PreferencesManager(
            window.apiClient,
            window.authManager,
            window.notificationManager
        );
        
        return preferencesManager;
    }
}

// Export for use in other modules
window.PreferencesManager = PreferencesManager;