/**
 * Premium Customization Manager
 * Handles advanced visualizer settings, custom presets, and premium-only features
 */
class PremiumCustomization {
    constructor(featureManager, notificationManager) {
        this.featureManager = featureManager;
        this.notificationManager = notificationManager;
        
        // Premium shapes and effects
        this.premiumShapes = [
            { id: 'spiral', name: 'Spiral', premium: true },
            { id: 'wave3d', name: '3D Wave', premium: true },
            { id: 'particleSystem', name: 'Particles', premium: true },
            { id: 'fractal', name: 'Fractal', premium: true },
            { id: 'dna', name: 'DNA Helix', premium: true },
            { id: 'galaxy', name: 'Galaxy', premium: true }
        ];
        
        this.premiumEffects = [
            { id: 'glow', name: 'Enhanced Glow', premium: true },
            { id: 'blur', name: 'Motion Blur', premium: true },
            { id: 'chromatic', name: 'Chromatic Aberration', premium: true },
            { id: 'distortion', name: 'Space Distortion', premium: true },
            { id: 'trails', name: 'Light Trails', premium: true }
        ];
        
        this.premiumColorSchemes = [
            { id: 'gradient_advanced', name: 'Advanced Gradient', colors: ['#ff006e', '#8338ec', '#3a86ff'], premium: true },
            { id: 'rainbow_spectrum', name: 'Rainbow Spectrum', colors: ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'], premium: true },
            { id: 'neon_glow', name: 'Neon Glow', colors: ['#39ff14', '#ff073a', '#bf00ff'], premium: true },
            { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#00ffff', '#ff00ff', '#ffff00'], premium: true },
            { id: 'sunset', name: 'Sunset Vibes', colors: ['#ff6b35', '#f7931e', '#ffcd3c'], premium: true },
            { id: 'ocean', name: 'Ocean Depths', colors: ['#006994', '#0099cc', '#66ccff'], premium: true }
        ];
        
        // Custom presets storage
        this.customPresets = [];
        this.maxPresets = this.featureManager.getMaxCustomPresets();
        
        // Current settings
        this.currentSettings = {
            shape: 'cube',
            effects: [],
            colorScheme: 'default',
            customColors: [],
            advanced: {}
        };
        
        // Initialize customization UI
        this.initializeCustomizationUI();
        
        // Load saved presets
        this.loadCustomPresets();
    }

    /**
     * Initialize premium customization UI
     */
    initializeCustomizationUI() {
        this.addPremiumShapeSelector();
        this.addEffectsPanel();
        this.addColorSchemeSelector();
        this.addAdvancedControls();
        this.addPresetManager();
    }

    /**
     * Add premium shape selector
     */
    addPremiumShapeSelector() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        // Find existing shape selector
        const existingShapeSelector = controlPanel.querySelector('.shape-selector');
        if (!existingShapeSelector) return;

        // Add premium shapes section
        const premiumShapesContainer = document.createElement('div');
        premiumShapesContainer.className = 'premium-shapes-container';
        premiumShapesContainer.innerHTML = `
            <div class="control-group-header">
                <label>Premium Shapes</label>
                <div class="premium-badge">Pro</div>
            </div>
            <div class="premium-shapes-grid" id="premium-shapes-grid"></div>
        `;

        // Insert after existing shape selector
        existingShapeSelector.parentNode.insertBefore(premiumShapesContainer, existingShapeSelector.nextSibling);

        // Populate premium shapes
        this.updatePremiumShapes();
    }

    /**
     * Update premium shapes display
     */
    updatePremiumShapes() {
        const grid = document.getElementById('premium-shapes-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.premiumShapes.forEach(shape => {
            const shapeButton = document.createElement('button');
            shapeButton.className = 'shape-btn premium-shape-btn';
            shapeButton.textContent = shape.name;
            shapeButton.dataset.shape = shape.id;

            const hasAccess = this.featureManager.hasFeatureAccess('advanced_customization');
            
            if (!hasAccess) {
                shapeButton.classList.add('feature-locked');
                shapeButton.addEventListener('click', () => {
                    this.featureManager.showUpgradePrompt('advanced_customization');
                });
            } else {
                shapeButton.addEventListener('click', () => {
                    this.selectPremiumShape(shape.id);
                });
            }

            grid.appendChild(shapeButton);
        });
    }

    /**
     * Add effects panel
     */
    addEffectsPanel() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        const effectsPanel = document.createElement('div');
        effectsPanel.className = 'effects-panel premium-feature';
        effectsPanel.innerHTML = `
            <div class="control-group-header">
                <label>Visual Effects</label>
                <div class="premium-badge">Pro</div>
            </div>
            <div class="effects-grid" id="effects-grid"></div>
        `;

        controlPanel.appendChild(effectsPanel);

        // Populate effects
        this.updateEffectsPanel();
    }

    /**
     * Update effects panel
     */
    updateEffectsPanel() {
        const grid = document.getElementById('effects-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.premiumEffects.forEach(effect => {
            const effectToggle = document.createElement('div');
            effectToggle.className = 'effect-toggle';
            
            const hasAccess = this.featureManager.hasFeatureAccess('advanced_customization');
            
            effectToggle.innerHTML = `
                <input type="checkbox" id="effect-${effect.id}" ${!hasAccess ? 'disabled' : ''}>
                <label for="effect-${effect.id}" class="${!hasAccess ? 'feature-locked' : ''}">
                    ${effect.name}
                    ${!hasAccess ? '<span class="lock-icon">🔒</span>' : ''}
                </label>
            `;

            const checkbox = effectToggle.querySelector('input');
            const label = effectToggle.querySelector('label');

            if (!hasAccess) {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.featureManager.showUpgradePrompt('advanced_customization');
                });
            } else {
                checkbox.addEventListener('change', () => {
                    this.toggleEffect(effect.id, checkbox.checked);
                });
            }

            grid.appendChild(effectToggle);
        });
    }

    /**
     * Add color scheme selector
     */
    addColorSchemeSelector() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        const colorSchemePanel = document.createElement('div');
        colorSchemePanel.className = 'color-scheme-panel premium-feature';
        colorSchemePanel.innerHTML = `
            <div class="control-group-header">
                <label>Color Schemes</label>
                <div class="premium-badge">Pro</div>
            </div>
            <div class="color-schemes-grid" id="color-schemes-grid"></div>
        `;

        controlPanel.appendChild(colorSchemePanel);

        // Populate color schemes
        this.updateColorSchemes();
    }

    /**
     * Update color schemes display
     */
    updateColorSchemes() {
        const grid = document.getElementById('color-schemes-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.premiumColorSchemes.forEach(scheme => {
            const schemeButton = document.createElement('button');
            schemeButton.className = 'color-scheme-btn';
            schemeButton.dataset.scheme = scheme.id;

            // Create color preview
            const colorPreview = document.createElement('div');
            colorPreview.className = 'color-preview';
            
            scheme.colors.forEach(color => {
                const colorDot = document.createElement('div');
                colorDot.className = 'color-dot';
                colorDot.style.backgroundColor = color;
                colorPreview.appendChild(colorDot);
            });

            schemeButton.appendChild(colorPreview);
            schemeButton.appendChild(document.createTextNode(scheme.name));

            const hasAccess = this.featureManager.hasFeatureAccess('advanced_customization');
            
            if (!hasAccess) {
                schemeButton.classList.add('feature-locked');
                schemeButton.addEventListener('click', () => {
                    this.featureManager.showUpgradePrompt('advanced_customization');
                });
            } else {
                schemeButton.addEventListener('click', () => {
                    this.selectColorScheme(scheme.id);
                });
            }

            grid.appendChild(schemeButton);
        });
    }

    /**
     * Add advanced controls
     */
    addAdvancedControls() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        const advancedPanel = document.createElement('div');
        advancedPanel.className = 'advanced-controls premium-feature';
        advancedPanel.innerHTML = `
            <div class="control-group-header">
                <label>Advanced Settings</label>
                <div class="premium-badge">Pro</div>
            </div>
            <div class="advanced-controls-grid">
                <div class="control">
                    <label for="particle-count">Particle Count</label>
                    <input type="range" id="particle-count" min="100" max="5000" value="1000" step="100">
                    <span id="particle-count-value">1000</span>
                </div>
                <div class="control">
                    <label for="animation-speed">Animation Speed</label>
                    <input type="range" id="animation-speed" min="0.1" max="3" value="1" step="0.1">
                    <span id="animation-speed-value">1.0x</span>
                </div>
                <div class="control">
                    <label for="complexity">Complexity</label>
                    <input type="range" id="complexity" min="1" max="10" value="5" step="1">
                    <span id="complexity-value">5</span>
                </div>
            </div>
        `;

        controlPanel.appendChild(advancedPanel);

        // Add event listeners for advanced controls
        this.setupAdvancedControlsEvents();
    }

    /**
     * Setup advanced controls event listeners
     */
    setupAdvancedControlsEvents() {
        const hasAccess = this.featureManager.hasFeatureAccess('advanced_customization');
        
        const controls = [
            { id: 'particle-count', valueId: 'particle-count-value', suffix: '' },
            { id: 'animation-speed', valueId: 'animation-speed-value', suffix: 'x' },
            { id: 'complexity', valueId: 'complexity-value', suffix: '' }
        ];

        controls.forEach(control => {
            const input = document.getElementById(control.id);
            const valueDisplay = document.getElementById(control.valueId);

            if (!input || !valueDisplay) return;

            if (!hasAccess) {
                input.disabled = true;
                input.addEventListener('click', () => {
                    this.featureManager.showUpgradePrompt('advanced_customization');
                });
            } else {
                input.addEventListener('input', () => {
                    const value = input.value;
                    valueDisplay.textContent = value + control.suffix;
                    this.updateAdvancedSetting(control.id, value);
                });
            }
        });
    }

    /**
     * Add preset manager
     */
    addPresetManager() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        const presetPanel = document.createElement('div');
        presetPanel.className = 'preset-manager premium-feature';
        presetPanel.innerHTML = `
            <div class="control-group-header">
                <label>Custom Presets</label>
                <div class="premium-badge">Starter+</div>
            </div>
            <div class="preset-controls">
                <button id="save-preset-btn" class="btn btn-small">Save Preset</button>
                <button id="load-preset-btn" class="btn btn-small">Load Preset</button>
            </div>
            <div class="presets-list" id="presets-list"></div>
        `;

        controlPanel.appendChild(presetPanel);

        // Setup preset manager events
        this.setupPresetManagerEvents();
        
        // Update presets display
        this.updatePresetsDisplay();
    }

    /**
     * Setup preset manager events
     */
    setupPresetManagerEvents() {
        const saveBtn = document.getElementById('save-preset-btn');
        const loadBtn = document.getElementById('load-preset-btn');

        const hasAccess = this.featureManager.hasFeatureAccess('custom_presets');

        if (!hasAccess) {
            saveBtn.disabled = true;
            loadBtn.disabled = true;
            
            saveBtn.addEventListener('click', () => {
                this.featureManager.showUpgradePrompt('custom_presets');
            });
            
            loadBtn.addEventListener('click', () => {
                this.featureManager.showUpgradePrompt('custom_presets');
            });
        } else {
            saveBtn.addEventListener('click', () => {
                this.showSavePresetModal();
            });
            
            loadBtn.addEventListener('click', () => {
                this.showLoadPresetModal();
            });
        }
    }

    /**
     * Select premium shape
     */
    selectPremiumShape(shapeId) {
        this.currentSettings.shape = shapeId;
        
        // Update visualizer
        if (window.config && window.recreateShape) {
            window.config.shape = shapeId;
            window.recreateShape();
        }

        // Update UI
        document.querySelectorAll('.premium-shape-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`[data-shape="${shapeId}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        this.notificationManager.show(`Premium shape "${shapeId}" selected`, 'success');
    }

    /**
     * Toggle effect
     */
    toggleEffect(effectId, enabled) {
        if (enabled) {
            if (!this.currentSettings.effects.includes(effectId)) {
                this.currentSettings.effects.push(effectId);
            }
        } else {
            this.currentSettings.effects = this.currentSettings.effects.filter(id => id !== effectId);
        }

        // Apply effect to visualizer
        this.applyEffect(effectId, enabled);
        
        this.notificationManager.show(
            `Effect "${effectId}" ${enabled ? 'enabled' : 'disabled'}`, 
            'success'
        );
    }

    /**
     * Apply effect to visualizer
     */
    applyEffect(effectId, enabled) {
        // This would integrate with the Three.js visualizer
        // For now, we'll just store the setting
        if (!window.config.effects) {
            window.config.effects = {};
        }
        
        window.config.effects[effectId] = enabled;
        
        // Trigger visualizer update if available
        if (window.updateEffects) {
            window.updateEffects();
        }
    }

    /**
     * Select color scheme
     */
    selectColorScheme(schemeId) {
        const scheme = this.premiumColorSchemes.find(s => s.id === schemeId);
        if (!scheme) return;

        this.currentSettings.colorScheme = schemeId;
        this.currentSettings.customColors = scheme.colors;

        // Apply color scheme to visualizer
        this.applyColorScheme(scheme);

        // Update UI
        document.querySelectorAll('.color-scheme-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`[data-scheme="${schemeId}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        this.notificationManager.show(`Color scheme "${scheme.name}" applied`, 'success');
    }

    /**
     * Apply color scheme to visualizer
     */
    applyColorScheme(scheme) {
        if (!window.config) return;

        // Set primary color
        if (scheme.colors.length > 0) {
            const primaryColor = scheme.colors[0];
            window.config.glowColor = parseInt(primaryColor.replace('#', '0x'));
            
            // Update color input
            const colorInput = document.getElementById('glowColor');
            if (colorInput) {
                colorInput.value = primaryColor;
            }
        }

        // Store full color scheme for advanced effects
        window.config.colorScheme = scheme;
        
        // Update dynamic color elements
        document.querySelectorAll('.dynamic-color').forEach(elem => {
            elem.style.backgroundColor = scheme.colors[0];
        });
    }

    /**
     * Update advanced setting
     */
    updateAdvancedSetting(settingId, value) {
        this.currentSettings.advanced[settingId] = value;
        
        // Apply to visualizer
        if (window.config) {
            window.config[settingId] = parseFloat(value);
        }
        
        // Trigger visualizer update if available
        if (window.updateAdvancedSettings) {
            window.updateAdvancedSettings();
        }
    }

    /**
     * Show save preset modal
     */
    showSavePresetModal() {
        if (this.customPresets.length >= this.maxPresets && this.maxPresets !== Infinity) {
            this.notificationManager.show(
                `Maximum presets reached (${this.maxPresets}). Upgrade for unlimited presets!`, 
                'warning'
            );
            return;
        }

        const presetName = prompt('Enter preset name:');
        if (presetName && presetName.trim()) {
            this.savePreset(presetName.trim());
        }
    }

    /**
     * Save current settings as preset
     */
    savePreset(name) {
        const preset = {
            id: Date.now().toString(),
            name: name,
            settings: { ...this.currentSettings },
            created: new Date().toISOString()
        };

        this.customPresets.push(preset);
        this.savePresetsToStorage();
        this.updatePresetsDisplay();
        
        this.notificationManager.show(`Preset "${name}" saved!`, 'success');
    }

    /**
     * Show load preset modal
     */
    showLoadPresetModal() {
        if (this.customPresets.length === 0) {
            this.notificationManager.show('No saved presets found', 'info');
            return;
        }

        // Create preset selection modal
        this.createPresetSelectionModal();
    }

    /**
     * Create preset selection modal
     */
    createPresetSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal preset-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Load Preset</h3>
                    <button class="modal-close" id="preset-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="presets-grid" id="preset-selection-grid"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="preset-cancel">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Populate presets
        const grid = modal.querySelector('#preset-selection-grid');
        this.customPresets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.innerHTML = `
                <div class="preset-name">${preset.name}</div>
                <div class="preset-date">${new Date(preset.created).toLocaleDateString()}</div>
                <div class="preset-actions">
                    <button class="btn btn-small btn-primary" data-action="load" data-preset="${preset.id}">Load</button>
                    <button class="btn btn-small btn-danger" data-action="delete" data-preset="${preset.id}">Delete</button>
                </div>
            `;
            grid.appendChild(presetItem);
        });

        // Setup event listeners
        this.setupPresetModalEvents(modal);
        
        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Setup preset modal events
     */
    setupPresetModalEvents(modal) {
        const closeBtn = modal.querySelector('#preset-modal-close');
        const cancelBtn = modal.querySelector('#preset-cancel');
        
        const closeModal = () => {
            modal.style.display = 'none';
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Preset actions
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const presetId = e.target.dataset.preset;
            
            if (action === 'load') {
                this.loadPreset(presetId);
                closeModal();
            } else if (action === 'delete') {
                this.deletePreset(presetId);
                // Refresh modal content
                const grid = modal.querySelector('#preset-selection-grid');
                grid.innerHTML = '';
                this.customPresets.forEach(preset => {
                    // Re-populate grid (simplified)
                    const presetItem = document.createElement('div');
                    presetItem.textContent = preset.name;
                    grid.appendChild(presetItem);
                });
            }
        });
    }

    /**
     * Load preset
     */
    loadPreset(presetId) {
        const preset = this.customPresets.find(p => p.id === presetId);
        if (!preset) return;

        this.currentSettings = { ...preset.settings };
        this.applySettings(this.currentSettings);
        
        this.notificationManager.show(`Preset "${preset.name}" loaded!`, 'success');
    }

    /**
     * Delete preset
     */
    deletePreset(presetId) {
        this.customPresets = this.customPresets.filter(p => p.id !== presetId);
        this.savePresetsToStorage();
        this.updatePresetsDisplay();
        
        this.notificationManager.show('Preset deleted', 'info');
    }

    /**
     * Apply settings to visualizer
     */
    applySettings(settings) {
        // Apply shape
        if (settings.shape && window.config && window.recreateShape) {
            window.config.shape = settings.shape;
            window.recreateShape();
        }

        // Apply effects
        if (settings.effects) {
            settings.effects.forEach(effectId => {
                this.applyEffect(effectId, true);
            });
        }

        // Apply color scheme
        if (settings.colorScheme) {
            const scheme = this.premiumColorSchemes.find(s => s.id === settings.colorScheme);
            if (scheme) {
                this.applyColorScheme(scheme);
            }
        }

        // Apply advanced settings
        if (settings.advanced) {
            Object.entries(settings.advanced).forEach(([key, value]) => {
                this.updateAdvancedSetting(key, value);
            });
        }
    }

    /**
     * Update presets display
     */
    updatePresetsDisplay() {
        const presetsList = document.getElementById('presets-list');
        if (!presetsList) return;

        presetsList.innerHTML = '';

        if (this.customPresets.length === 0) {
            presetsList.innerHTML = '<p class="no-presets">No saved presets</p>';
            return;
        }

        this.customPresets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item-small';
            presetItem.innerHTML = `
                <span class="preset-name">${preset.name}</span>
                <button class="btn btn-tiny" onclick="window.premiumCustomization.loadPreset('${preset.id}')">Load</button>
            `;
            presetsList.appendChild(presetItem);
        });
    }

    /**
     * Save presets to storage
     */
    savePresetsToStorage() {
        try {
            localStorage.setItem('oriel_custom_presets', JSON.stringify(this.customPresets));
        } catch (error) {
            console.error('Failed to save presets:', error);
        }
    }

    /**
     * Load presets from storage
     */
    loadCustomPresets() {
        try {
            const stored = localStorage.getItem('oriel_custom_presets');
            if (stored) {
                this.customPresets = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load presets:', error);
            this.customPresets = [];
        }
    }

    /**
     * Get current customization capabilities
     */
    getCustomizationCapabilities() {
        return {
            hasAdvancedCustomization: this.featureManager.hasFeatureAccess('advanced_customization'),
            hasCustomPresets: this.featureManager.hasFeatureAccess('custom_presets'),
            maxPresets: this.maxPresets,
            currentPresets: this.customPresets.length,
            availableShapes: this.premiumShapes.length,
            availableEffects: this.premiumEffects.length,
            availableColorSchemes: this.premiumColorSchemes.length
        };
    }

    /**
     * Export current settings
     */
    exportSettings() {
        return {
            ...this.currentSettings,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Import settings
     */
    importSettings(settings) {
        if (settings && typeof settings === 'object') {
            this.currentSettings = { ...settings };
            this.applySettings(this.currentSettings);
            return true;
        }
        return false;
    }
}

// Export for use in other modules
window.PremiumCustomization = PremiumCustomization;