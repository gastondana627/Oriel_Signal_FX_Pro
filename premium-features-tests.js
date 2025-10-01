/**
 * Premium Features Unit Tests
 * Tests feature gating logic, premium recording, and customization options
 */

// Mock dependencies
const mockAuthManager = {
    isAuthenticated: false,
    currentUser: null,
    getCurrentUser: function() { return this.currentUser; },
    onStateChange: function(callback) { this.stateChangeCallback = callback; }
};

const mockAppConfig = {
    plans: {
        free: { id: 'free', name: 'Free', price: 0, features: { downloads: 3 } },
        starter: { id: 'starter', name: 'Starter', price: 9.99, features: { downloads: 50 } },
        pro: { id: 'pro', name: 'Pro', price: 19.99, features: { downloads: 500 } }
    },
    getPlan: function(planId) { return this.plans[planId]; },
    getAllPlans: function() { return Object.values(this.plans); }
};

const mockNotificationManager = {
    messages: [],
    show: function(message, type) { 
        this.messages.push({ message, type, timestamp: Date.now() }); 
    },
    clear: function() { this.messages = []; }
};

// Test Suite for FeatureManager
describe('FeatureManager Tests', () => {
    let featureManager;

    beforeEach(() => {
        // Reset mocks
        mockAuthManager.isAuthenticated = false;
        mockAuthManager.currentUser = null;
        mockNotificationManager.clear();
        
        // Clear localStorage
        localStorage.clear();
        
        // Create fresh instance
        featureManager = new FeatureManager(mockAuthManager, mockAppConfig, mockNotificationManager);
    });

    describe('Feature Access Control', () => {
        test('should deny premium features for free users', () => {
            mockAuthManager.currentUser = { plan: 'free' };
            
            expect(featureManager.hasFeatureAccess('extended_recording')).toBe(false);
            expect(featureManager.hasFeatureAccess('premium_exports')).toBe(false);
            expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(false);
            expect(featureManager.hasFeatureAccess('custom_presets')).toBe(false);
        });

        test('should allow starter features for starter users', () => {
            mockAuthManager.currentUser = { plan: 'starter' };
            
            expect(featureManager.hasFeatureAccess('extended_recording')).toBe(true);
            expect(featureManager.hasFeatureAccess('premium_exports')).toBe(true);
            expect(featureManager.hasFeatureAccess('custom_presets')).toBe(true);
            expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(false); // Pro only
        });

        test('should allow all features for pro users', () => {
            mockAuthManager.currentUser = { plan: 'pro' };
            
            expect(featureManager.hasFeatureAccess('extended_recording')).toBe(true);
            expect(featureManager.hasFeatureAccess('premium_exports')).toBe(true);
            expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(true);
            expect(featureManager.hasFeatureAccess('custom_presets')).toBe(true);
            expect(featureManager.hasFeatureAccess('high_quality_export')).toBe(true);
        });

        test('should handle unknown features gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(featureManager.hasFeatureAccess('unknown_feature')).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Unknown feature: unknown_feature');
            
            consoleSpy.mockRestore();
        });

        test('should default to free plan for unauthenticated users', () => {
            mockAuthManager.isAuthenticated = false;
            
            expect(featureManager.getCurrentUserPlan()).toBe('free');
            expect(featureManager.hasFeatureAccess('extended_recording')).toBe(false);
        });
    });

    describe('Feature Limits', () => {
        test('should return correct recording time limits', () => {
            // Free user
            mockAuthManager.currentUser = { plan: 'free' };
            expect(featureManager.getMaxRecordingTime()).toBe(30);
            
            // Starter user
            mockAuthManager.currentUser = { plan: 'starter' };
            expect(featureManager.getMaxRecordingTime()).toBe(60);
            
            // Pro user
            mockAuthManager.currentUser = { plan: 'pro' };
            expect(featureManager.getMaxRecordingTime()).toBe(300);
        });

        test('should return correct custom preset limits', () => {
            // Free user
            mockAuthManager.currentUser = { plan: 'free' };
            expect(featureManager.getMaxCustomPresets()).toBe(0);
            
            // Starter user
            mockAuthManager.currentUser = { plan: 'starter' };
            expect(featureManager.getMaxCustomPresets()).toBe(5);
            
            // Pro user
            mockAuthManager.currentUser = { plan: 'pro' };
            expect(featureManager.getMaxCustomPresets()).toBe(Infinity);
        });

        test('should return correct export formats', () => {
            // Free user
            mockAuthManager.currentUser = { plan: 'free' };
            const freeFormats = featureManager.getAvailableExportFormats();
            expect(freeFormats).toEqual(['gif', 'mp3']);
            
            // Starter user
            mockAuthManager.currentUser = { plan: 'starter' };
            const starterFormats = featureManager.getAvailableExportFormats();
            expect(starterFormats).toEqual(['gif', 'mp4', 'mp3', 'wav']);
            
            // Pro user
            mockAuthManager.currentUser = { plan: 'pro' };
            const proFormats = featureManager.getAvailableExportFormats();
            expect(proFormats).toEqual(['gif', 'mp4', 'webm', 'mp3', 'wav', 'flac']);
        });
    });

    describe('Upgrade Prompts', () => {
        test('should show upgrade prompt when accessing locked features', () => {
            mockAuthManager.currentUser = { plan: 'free' };
            
            // Mock DOM elements
            document.body.innerHTML = '<div></div>';
            
            const result = featureManager.checkFeatureAccess('extended_recording', true);
            
            expect(result).toBe(false);
            expect(document.getElementById('upgrade-prompt-modal')).toBeTruthy();
        });

        test('should respect cooldown period for upgrade prompts', () => {
            mockAuthManager.currentUser = { plan: 'free' };
            
            // Set recent prompt time
            localStorage.setItem('upgrade_prompt_extended_recording', Date.now().toString());
            
            document.body.innerHTML = '<div></div>';
            
            featureManager.checkFeatureAccess('extended_recording', true);
            
            // Should not create modal due to cooldown
            expect(document.getElementById('upgrade-prompt-modal')).toBeFalsy();
        });

        test('should track upgrade attempts', () => {
            mockAuthManager.currentUser = { plan: 'free' };
            
            featureManager.trackFeatureUpgradeAttempt('extended_recording', 'starter');
            
            const attempts = JSON.parse(localStorage.getItem('oriel_upgrade_attempts') || '[]');
            expect(attempts).toHaveLength(1);
            expect(attempts[0].feature).toBe('extended_recording');
            expect(attempts[0].plan).toBe('starter');
        });
    });

    describe('Premium Customization Options', () => {
        test('should return empty options for free users', () => {
            mockAuthManager.currentUser = { plan: 'free' };
            
            const options = featureManager.getPremiumCustomizationOptions();
            expect(options.shapes).toEqual([]);
            expect(options.effects).toEqual([]);
            expect(options.colorSchemes).toEqual([]);
        });

        test('should return premium options for pro users', () => {
            mockAuthManager.currentUser = { plan: 'pro' };
            
            const options = featureManager.getPremiumCustomizationOptions();
            expect(options.shapes).toContain('spiral');
            expect(options.effects).toContain('glow');
            expect(options.colorSchemes).toContain('gradient_advanced');
        });
    });
});

// Test Suite for PremiumRecording
describe('PremiumRecording Tests', () => {
    let premiumRecording;
    let mockFeatureManager;

    beforeEach(() => {
        mockFeatureManager = {
            getCurrentUserPlan: jest.fn(() => 'free'),
            hasFeatureAccess: jest.fn(() => false),
            getMaxRecordingTime: jest.fn(() => 30),
            getAvailableExportFormats: jest.fn(() => ['gif', 'mp3']),
            showUpgradePrompt: jest.fn()
        };

        mockNotificationManager.clear();
        document.body.innerHTML = '<div></div>';
        
        premiumRecording = new PremiumRecording(mockFeatureManager, mockNotificationManager);
    });

    describe('Recording Time Limits', () => {
        test('should enforce free tier recording limits', () => {
            mockFeatureManager.getCurrentUserPlan.mockReturnValue('free');
            mockFeatureManager.getMaxRecordingTime.mockReturnValue(30);
            
            expect(premiumRecording.getMaxRecordingTime()).toBe(30);
            expect(premiumRecording.canRecordDuration(45)).toBe(false);
            expect(premiumRecording.canRecordDuration(25)).toBe(true);
        });

        test('should allow extended recording for premium users', () => {
            mockFeatureManager.getCurrentUserPlan.mockReturnValue('pro');
            mockFeatureManager.getMaxRecordingTime.mockReturnValue(300);
            
            expect(premiumRecording.getMaxRecordingTime()).toBe(300);
            expect(premiumRecording.canRecordDuration(180)).toBe(true);
        });

        test('should get correct recording settings for different plans', () => {
            // Free user settings
            mockFeatureManager.getCurrentUserPlan.mockReturnValue('free');
            const freeSettings = premiumRecording.getRecordingSettings('free', 'gif');
            expect(freeSettings.maxDuration).toBe(30);
            expect(freeSettings.quality).toBe('standard');
            
            // Pro user settings
            const proSettings = premiumRecording.getRecordingSettings('pro', 'mp4');
            expect(proSettings.maxDuration).toBe(300);
            expect(proSettings.quality).toBe('ultra');
            expect(proSettings.framerate).toBe(60);
        });
    });

    describe('Export Format Access', () => {
        test('should restrict formats for free users', async () => {
            mockFeatureManager.getAvailableExportFormats.mockReturnValue(['gif', 'mp3']);
            
            const result = await premiumRecording.startRecording('mp4');
            
            expect(result).toBe(false);
            expect(mockFeatureManager.showUpgradePrompt).toHaveBeenCalledWith('premium_exports');
        });

        test('should allow premium formats for premium users', async () => {
            mockFeatureManager.getAvailableExportFormats.mockReturnValue(['gif', 'mp4', 'webm', 'mp3', 'wav']);
            
            // Mock CCapture
            global.CCapture = jest.fn().mockImplementation(() => ({
                start: jest.fn(),
                stop: jest.fn(),
                save: jest.fn()
            }));
            
            const result = await premiumRecording.startRecording('mp4');
            
            expect(result).toBe(true);
            expect(mockFeatureManager.showUpgradePrompt).not.toHaveBeenCalled();
        });

        test('should return correct available formats', () => {
            mockFeatureManager.getAvailableExportFormats.mockReturnValue(['gif', 'mp4', 'mp3']);
            
            const formats = premiumRecording.getAvailableFormats();
            expect(formats).toEqual(['gif', 'mp4', 'mp3']);
        });
    });

    describe('Recording Quality Settings', () => {
        test('should return correct quality values', () => {
            expect(premiumRecording.getQualityValue('standard')).toBe(63);
            expect(premiumRecording.getQualityValue('high')).toBe(80);
            expect(premiumRecording.getQualityValue('ultra')).toBe(95);
        });

        test('should return correct video bitrates', () => {
            expect(premiumRecording.getVideoBitrate('standard')).toBe(2500000);
            expect(premiumRecording.getVideoBitrate('high')).toBe(5000000);
            expect(premiumRecording.getVideoBitrate('ultra')).toBe(10000000);
        });

        test('should return correct GIF quality settings', () => {
            expect(premiumRecording.getGifQuality('standard')).toBe(10);
            expect(premiumRecording.getGifQuality('high')).toBe(5);
            expect(premiumRecording.getGifQuality('ultra')).toBe(1);
        });
    });

    describe('Recording State Management', () => {
        test('should track recording state correctly', () => {
            expect(premiumRecording.isRecording).toBe(false);
            
            const status = premiumRecording.getRecordingStatus();
            expect(status.isRecording).toBe(false);
            expect(status.elapsed).toBe(0);
        });

        test('should prevent multiple simultaneous recordings', async () => {
            premiumRecording.isRecording = true;
            
            const result = await premiumRecording.startRecording('gif');
            
            expect(result).toBe(false);
            expect(mockNotificationManager.messages).toContainEqual(
                expect.objectContaining({
                    message: 'Recording already in progress',
                    type: 'warning'
                })
            );
        });

        test('should get recording capabilities for current user', () => {
            mockFeatureManager.getCurrentUserPlan.mockReturnValue('starter');
            mockFeatureManager.hasFeatureAccess.mockImplementation((feature) => {
                return feature === 'extended_recording' || feature === 'premium_exports';
            });
            
            const capabilities = premiumRecording.getRecordingCapabilities();
            
            expect(capabilities.maxDuration).toBe(60);
            expect(capabilities.hasExtendedRecording).toBe(true);
            expect(capabilities.hasPremiumFormats).toBe(true);
            expect(capabilities.hasHighQuality).toBe(false);
        });
    });
});

// Test Suite for PremiumCustomization
describe('PremiumCustomization Tests', () => {
    let premiumCustomization;
    let mockFeatureManager;

    beforeEach(() => {
        mockFeatureManager = {
            hasFeatureAccess: jest.fn(() => false),
            getMaxCustomPresets: jest.fn(() => 0),
            showUpgradePrompt: jest.fn()
        };

        mockNotificationManager.clear();
        localStorage.clear();
        document.body.innerHTML = '<div class="control-panel"></div>';
        
        premiumCustomization = new PremiumCustomization(mockFeatureManager, mockNotificationManager);
    });

    describe('Premium Shape Access', () => {
        test('should restrict premium shapes for free users', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(false);
            
            premiumCustomization.selectPremiumShape('spiral');
            
            expect(mockFeatureManager.showUpgradePrompt).toHaveBeenCalledWith('advanced_customization');
        });

        test('should allow premium shapes for premium users', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(true);
            
            // Mock global config
            global.window = { config: {}, recreateShape: jest.fn() };
            
            premiumCustomization.selectPremiumShape('spiral');
            
            expect(window.config.shape).toBe('spiral');
            expect(window.recreateShape).toHaveBeenCalled();
            expect(mockNotificationManager.messages).toContainEqual(
                expect.objectContaining({
                    message: 'Premium shape "spiral" selected',
                    type: 'success'
                })
            );
        });
    });

    describe('Effects Management', () => {
        test('should toggle effects correctly', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(true);
            global.window = { config: { effects: {} }, updateEffects: jest.fn() };
            
            premiumCustomization.toggleEffect('glow', true);
            
            expect(premiumCustomization.currentSettings.effects).toContain('glow');
            expect(window.config.effects.glow).toBe(true);
            
            premiumCustomization.toggleEffect('glow', false);
            
            expect(premiumCustomization.currentSettings.effects).not.toContain('glow');
            expect(window.config.effects.glow).toBe(false);
        });

        test('should apply effects to visualizer', () => {
            global.window = { config: { effects: {} }, updateEffects: jest.fn() };
            
            premiumCustomization.applyEffect('blur', true);
            
            expect(window.config.effects.blur).toBe(true);
            expect(window.updateEffects).toHaveBeenCalled();
        });
    });

    describe('Color Scheme Management', () => {
        test('should apply color schemes correctly', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(true);
            global.window = { config: {} };
            document.body.innerHTML = '<input id="glowColor" type="color">';
            
            const scheme = {
                id: 'neon_glow',
                name: 'Neon Glow',
                colors: ['#39ff14', '#ff073a', '#bf00ff']
            };
            
            premiumCustomization.applyColorScheme(scheme);
            
            expect(window.config.glowColor).toBe(0x39ff14);
            expect(window.config.colorScheme).toEqual(scheme);
            
            const colorInput = document.getElementById('glowColor');
            expect(colorInput.value).toBe('#39ff14');
        });

        test('should select color scheme and update UI', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(true);
            global.window = { config: {} };
            
            premiumCustomization.selectColorScheme('neon_glow');
            
            expect(premiumCustomization.currentSettings.colorScheme).toBe('neon_glow');
            expect(mockNotificationManager.messages).toContainEqual(
                expect.objectContaining({
                    message: 'Color scheme "Neon Glow" applied',
                    type: 'success'
                })
            );
        });
    });

    describe('Custom Presets', () => {
        test('should save presets correctly', () => {
            mockFeatureManager.hasFeatureAccess.mockReturnValue(true);
            mockFeatureManager.getMaxCustomPresets.mockReturnValue(5);
            
            premiumCustomization.savePreset('My Preset');
            
            expect(premiumCustomization.customPresets).toHaveLength(1);
            expect(premiumCustomization.customPresets[0].name).toBe('My Preset');
            
            const stored = localStorage.getItem('oriel_custom_presets');
            expect(JSON.parse(stored)).toHaveLength(1);
        });

        test('should enforce preset limits', () => {
            mockFeatureManager.getMaxCustomPresets.mockReturnValue(2);
            
            // Fill up to limit
            premiumCustomization.customPresets = [
                { id: '1', name: 'Preset 1' },
                { id: '2', name: 'Preset 2' }
            ];
            
            global.prompt = jest.fn(() => 'New Preset');
            
            premiumCustomization.showSavePresetModal();
            
            expect(mockNotificationManager.messages).toContainEqual(
                expect.objectContaining({
                    message: 'Maximum presets reached (2). Upgrade for unlimited presets!',
                    type: 'warning'
                })
            );
        });

        test('should load presets correctly', () => {
            const testPreset = {
                id: '123',
                name: 'Test Preset',
                settings: {
                    shape: 'spiral',
                    effects: ['glow'],
                    colorScheme: 'neon_glow',
                    advanced: { particleCount: 2000 }
                }
            };
            
            premiumCustomization.customPresets = [testPreset];
            global.window = { 
                config: {}, 
                recreateShape: jest.fn(),
                updateEffects: jest.fn(),
                updateAdvancedSettings: jest.fn()
            };
            
            premiumCustomization.loadPreset('123');
            
            expect(premiumCustomization.currentSettings.shape).toBe('spiral');
            expect(premiumCustomization.currentSettings.effects).toContain('glow');
            expect(window.recreateShape).toHaveBeenCalled();
        });

        test('should delete presets correctly', () => {
            premiumCustomization.customPresets = [
                { id: '1', name: 'Preset 1' },
                { id: '2', name: 'Preset 2' }
            ];
            
            premiumCustomization.deletePreset('1');
            
            expect(premiumCustomization.customPresets).toHaveLength(1);
            expect(premiumCustomization.customPresets[0].id).toBe('2');
        });
    });

    describe('Advanced Settings', () => {
        test('should update advanced settings correctly', () => {
            global.window = { config: {}, updateAdvancedSettings: jest.fn() };
            
            premiumCustomization.updateAdvancedSetting('particleCount', '2000');
            
            expect(premiumCustomization.currentSettings.advanced.particleCount).toBe('2000');
            expect(window.config.particleCount).toBe(2000);
            expect(window.updateAdvancedSettings).toHaveBeenCalled();
        });
    });

    describe('Customization Capabilities', () => {
        test('should return correct capabilities for different users', () => {
            mockFeatureManager.hasFeatureAccess.mockImplementation((feature) => {
                return feature === 'custom_presets';
            });
            mockFeatureManager.getMaxCustomPresets.mockReturnValue(5);
            
            const capabilities = premiumCustomization.getCustomizationCapabilities();
            
            expect(capabilities.hasAdvancedCustomization).toBe(false);
            expect(capabilities.hasCustomPresets).toBe(true);
            expect(capabilities.maxPresets).toBe(5);
            expect(capabilities.availableShapes).toBeGreaterThan(0);
            expect(capabilities.availableEffects).toBeGreaterThan(0);
        });
    });

    describe('Settings Import/Export', () => {
        test('should export settings correctly', () => {
            premiumCustomization.currentSettings = {
                shape: 'spiral',
                effects: ['glow', 'blur'],
                colorScheme: 'neon_glow'
            };
            
            const exported = premiumCustomization.exportSettings();
            
            expect(exported.shape).toBe('spiral');
            expect(exported.effects).toEqual(['glow', 'blur']);
            expect(exported.timestamp).toBeDefined();
            expect(exported.version).toBe('1.0');
        });

        test('should import settings correctly', () => {
            const settings = {
                shape: 'wave3d',
                effects: ['chromatic'],
                colorScheme: 'cyberpunk'
            };
            
            global.window = { 
                config: {}, 
                recreateShape: jest.fn(),
                updateEffects: jest.fn()
            };
            
            const result = premiumCustomization.importSettings(settings);
            
            expect(result).toBe(true);
            expect(premiumCustomization.currentSettings.shape).toBe('wave3d');
        });

        test('should handle invalid import data', () => {
            const result1 = premiumCustomization.importSettings(null);
            const result2 = premiumCustomization.importSettings('invalid');
            
            expect(result1).toBe(false);
            expect(result2).toBe(false);
        });
    });
});

// Integration Tests
describe('Premium Features Integration Tests', () => {
    let featureManager, premiumRecording, premiumCustomization;

    beforeEach(() => {
        mockAuthManager.isAuthenticated = true;
        mockAuthManager.currentUser = { plan: 'pro' };
        mockNotificationManager.clear();
        localStorage.clear();
        document.body.innerHTML = '<div class="control-panel"></div>';
        
        featureManager = new FeatureManager(mockAuthManager, mockAppConfig, mockNotificationManager);
        premiumRecording = new PremiumRecording(featureManager, mockNotificationManager);
        premiumCustomization = new PremiumCustomization(featureManager, mockNotificationManager);
    });

    test('should integrate feature gating across all premium components', () => {
        // Pro user should have access to all features
        expect(featureManager.hasFeatureAccess('extended_recording')).toBe(true);
        expect(featureManager.hasFeatureAccess('premium_exports')).toBe(true);
        expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(true);
        
        // Recording should allow extended times
        expect(premiumRecording.getMaxRecordingTime()).toBe(300);
        expect(premiumRecording.canRecordDuration(180)).toBe(true);
        
        // Customization should allow unlimited presets
        expect(premiumCustomization.getCustomizationCapabilities().maxPresets).toBe(Infinity);
    });

    test('should handle plan downgrades correctly', () => {
        // Start as pro user
        expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(true);
        
        // Downgrade to starter
        mockAuthManager.currentUser = { plan: 'starter' };
        
        expect(featureManager.hasFeatureAccess('extended_recording')).toBe(true);
        expect(featureManager.hasFeatureAccess('advanced_customization')).toBe(false);
        expect(featureManager.getMaxRecordingTime()).toBe(60);
    });

    test('should maintain consistent feature access across components', () => {
        mockAuthManager.currentUser = { plan: 'starter' };
        
        const recordingCapabilities = premiumRecording.getRecordingCapabilities();
        const customizationCapabilities = premiumCustomization.getCustomizationCapabilities();
        
        expect(recordingCapabilities.hasExtendedRecording).toBe(true);
        expect(recordingCapabilities.hasPremiumFormats).toBe(true);
        expect(customizationCapabilities.hasCustomPresets).toBe(true);
        expect(customizationCapabilities.hasAdvancedCustomization).toBe(false);
    });
});

// Test runner setup
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mockAuthManager,
        mockAppConfig,
        mockNotificationManager
    };
}

// Browser test runner
if (typeof window !== 'undefined') {
    window.premiumFeaturesTests = {
        runAllTests: function() {
            console.log('Running Premium Features Tests...');
            
            // This would integrate with a test runner like Jest or Mocha
            // For now, we'll just log that tests are available
            console.log('✓ Feature gating tests ready');
            console.log('✓ Premium recording tests ready');
            console.log('✓ Premium customization tests ready');
            console.log('✓ Integration tests ready');
            
            return true;
        }
    };
}