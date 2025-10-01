/**
 * Premium Recording Manager
 * Handles extended recording times, higher quality exports, and premium formats
 */
class PremiumRecording {
    constructor(featureManager, notificationManager) {
        this.featureManager = featureManager;
        this.notificationManager = notificationManager;
        
        // Recording state
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.currentCapturer = null;
        
        // Recording settings
        this.defaultSettings = {
            free: {
                maxDuration: 30, // seconds
                quality: 'standard',
                formats: ['gif', 'mp3'],
                resolution: { width: 1280, height: 720 },
                framerate: 30,
                bitrate: 'standard'
            },
            starter: {
                maxDuration: 60, // seconds
                quality: 'high',
                formats: ['gif', 'mp4', 'mp3', 'wav'],
                resolution: { width: 1920, height: 1080 },
                framerate: 60,
                bitrate: 'high'
            },
            pro: {
                maxDuration: 300, // 5 minutes
                quality: 'ultra',
                formats: ['gif', 'mp4', 'webm', 'mp3', 'wav', 'flac'],
                resolution: { width: 1920, height: 1080 },
                framerate: 60,
                bitrate: 'ultra'
            }
        };
        
        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.updateRecordingProgress = this.updateRecordingProgress.bind(this);
        
        // Initialize recording UI
        this.initializeRecordingUI();
    }

    /**
     * Initialize recording UI elements
     */
    initializeRecordingUI() {
        // Create recording time indicator
        this.createRecordingTimeIndicator();
        
        // Update export format options
        this.updateExportFormatOptions();
        
        // Add quality selector for premium users
        this.addQualitySelector();
    }

    /**
     * Create recording time indicator
     */
    createRecordingTimeIndicator() {
        // Remove existing indicator if present
        const existingIndicator = document.getElementById('recording-time-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = document.createElement('div');
        indicator.id = 'recording-time-indicator';
        indicator.className = 'recording-time-indicator hidden';
        
        const userPlan = this.featureManager.getCurrentUserPlan();
        const isPremium = userPlan !== 'free';
        
        if (isPremium) {
            indicator.classList.add('premium');
        }

        indicator.innerHTML = `
            <div class="recording-status">
                <span class="recording-dot">●</span>
                <span id="recording-time-text">00:00</span>
                <span id="recording-max-time">/ ${this.getMaxRecordingTime()}s</span>
            </div>
            <div class="recording-progress">
                <div id="recording-progress-bar" class="recording-progress-bar"></div>
            </div>
        `;

        document.body.appendChild(indicator);
    }

    /**
     * Update export format options based on user plan
     */
    updateExportFormatOptions() {
        const availableFormats = this.featureManager.getAvailableExportFormats();
        const allFormats = ['gif', 'mp4', 'webm', 'mp3', 'wav', 'flac'];
        
        // Find or create export format selector
        let formatSelector = document.getElementById('export-format-selector');
        if (!formatSelector) {
            formatSelector = this.createExportFormatSelector();
        }

        // Update format options
        const formatGrid = formatSelector.querySelector('.export-format-grid');
        if (formatGrid) {
            formatGrid.innerHTML = '';
            
            allFormats.forEach(format => {
                const isAvailable = availableFormats.includes(format);
                const formatOption = this.createFormatOption(format, isAvailable);
                formatGrid.appendChild(formatOption);
            });
        }
    }

    /**
     * Create export format selector
     */
    createExportFormatSelector() {
        const selector = document.createElement('div');
        selector.id = 'export-format-selector';
        selector.className = 'export-format-selector hidden';
        selector.innerHTML = `
            <div class="format-selector-header">
                <h3>Choose Export Format</h3>
                <button class="modal-close" id="format-selector-close">&times;</button>
            </div>
            <div class="export-format-grid"></div>
            <div class="format-selector-footer">
                <button class="btn btn-secondary" id="format-cancel">Cancel</button>
                <button class="btn btn-primary" id="format-confirm">Start Recording</button>
            </div>
        `;

        // Add to modal container or body
        const modalContainer = document.getElementById('progress-modal') || document.body;
        modalContainer.appendChild(selector);

        // Add event listeners
        this.setupFormatSelectorEvents(selector);

        return selector;
    }

    /**
     * Create format option element
     */
    createFormatOption(format, isAvailable) {
        const option = document.createElement('div');
        option.className = `export-format-option ${!isAvailable ? 'premium-locked' : ''}`;
        option.dataset.format = format;

        const formatInfo = this.getFormatInfo(format);
        
        option.innerHTML = `
            <div class="export-format-name">${formatInfo.name}</div>
            <div class="export-format-description">${formatInfo.description}</div>
            ${!isAvailable ? '<div class="premium-badge">Premium</div>' : ''}
        `;

        // Add click handler
        if (isAvailable) {
            option.addEventListener('click', () => {
                // Remove selected class from other options
                option.parentElement.querySelectorAll('.export-format-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to this option
                option.classList.add('selected');
            });
        } else {
            option.addEventListener('click', () => {
                this.featureManager.showUpgradePrompt('premium_exports');
            });
        }

        return option;
    }

    /**
     * Get format information
     */
    getFormatInfo(format) {
        const formatInfo = {
            gif: { name: 'GIF', description: 'Animated image, universal support' },
            mp4: { name: 'MP4', description: 'High quality video, widely supported' },
            webm: { name: 'WebM', description: 'Modern web video format' },
            mp3: { name: 'MP3', description: 'Audio only, universal support' },
            wav: { name: 'WAV', description: 'Uncompressed audio, high quality' },
            flac: { name: 'FLAC', description: 'Lossless audio compression' }
        };

        return formatInfo[format] || { name: format.toUpperCase(), description: 'Export format' };
    }

    /**
     * Add quality selector for premium users
     */
    addQualitySelector() {
        if (!this.featureManager.hasFeatureAccess('high_quality_export')) {
            return;
        }

        // Find or create quality selector in control panel
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;

        let qualitySelector = document.getElementById('quality-selector');
        if (!qualitySelector) {
            qualitySelector = document.createElement('div');
            qualitySelector.id = 'quality-selector';
            qualitySelector.className = 'control premium-feature';
            qualitySelector.innerHTML = `
                <label for="recording-quality">Recording Quality</label>
                <select id="recording-quality">
                    <option value="standard">Standard (720p)</option>
                    <option value="high">High (1080p)</option>
                    <option value="ultra">Ultra (1080p 60fps)</option>
                </select>
                <div class="premium-badge">Pro</div>
            `;

            controlPanel.appendChild(qualitySelector);
        }
    }

    /**
     * Start recording with premium features
     */
    async startRecording(format, options = {}) {
        if (this.isRecording) {
            this.notificationManager.show('Recording already in progress', 'warning');
            return false;
        }

        try {
            // Check if user can access this format
            const availableFormats = this.featureManager.getAvailableExportFormats();
            if (!availableFormats.includes(format)) {
                this.featureManager.showUpgradePrompt('premium_exports');
                return false;
            }

            // Get recording settings for user's plan
            const userPlan = this.featureManager.getCurrentUserPlan();
            const settings = this.getRecordingSettings(userPlan, format, options);

            // Initialize capturer with premium settings
            this.currentCapturer = this.createCapturer(format, settings);
            
            // Set up recording state
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // Show recording indicator
            this.showRecordingIndicator();
            
            // Start the capture
            this.currentCapturer.start();
            
            // Start recording timer
            this.startRecordingTimer(settings.maxDuration);
            
            // Start audio if not playing
            const audioElement = document.getElementById('background-music');
            if (audioElement && audioElement.paused) {
                audioElement.play();
            }

            this.notificationManager.show(
                `Recording started (${settings.maxDuration}s max)`, 
                'success'
            );

            return true;

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.notificationManager.show('Failed to start recording', 'error');
            this.resetRecordingState();
            return false;
        }
    }

    /**
     * Stop recording
     */
    async stopRecording() {
        if (!this.isRecording || !this.currentCapturer) {
            return false;
        }

        try {
            // Clear recording timer
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }

            // Stop the capturer
            this.currentCapturer.stop();
            this.currentCapturer.save();

            // Hide recording indicator
            this.hideRecordingIndicator();

            // Reset state
            this.resetRecordingState();

            this.notificationManager.show('Recording completed!', 'success');
            return true;

        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.notificationManager.show('Failed to complete recording', 'error');
            this.resetRecordingState();
            return false;
        }
    }

    /**
     * Get recording settings for user plan
     */
    getRecordingSettings(userPlan, format, options = {}) {
        const planSettings = this.defaultSettings[userPlan] || this.defaultSettings.free;
        
        return {
            maxDuration: options.duration || planSettings.maxDuration,
            quality: options.quality || planSettings.quality,
            resolution: options.resolution || planSettings.resolution,
            framerate: options.framerate || planSettings.framerate,
            bitrate: options.bitrate || planSettings.bitrate,
            format: format
        };
    }

    /**
     * Create capturer with premium settings
     */
    createCapturer(format, settings) {
        const capturerOptions = {
            format: format,
            workersPath: 'assets/',
            verbose: false,
            display: true,
            framerate: settings.framerate,
            quality: this.getQualityValue(settings.quality)
        };

        // Add format-specific options
        if (format === 'gif') {
            capturerOptions.quality = this.getGifQuality(settings.quality);
        } else if (format === 'mp4' || format === 'webm') {
            capturerOptions.videoBitsPerSecond = this.getVideoBitrate(settings.bitrate);
        }

        return new CCapture(capturerOptions);
    }

    /**
     * Get quality value for capturer
     */
    getQualityValue(qualityLevel) {
        const qualityMap = {
            standard: 63,
            high: 80,
            ultra: 95
        };
        return qualityMap[qualityLevel] || qualityMap.standard;
    }

    /**
     * Get GIF quality setting
     */
    getGifQuality(qualityLevel) {
        const qualityMap = {
            standard: 10,
            high: 5,
            ultra: 1
        };
        return qualityMap[qualityLevel] || qualityMap.standard;
    }

    /**
     * Get video bitrate
     */
    getVideoBitrate(bitrateLevel) {
        const bitrateMap = {
            standard: 2500000, // 2.5 Mbps
            high: 5000000,     // 5 Mbps
            ultra: 10000000    // 10 Mbps
        };
        return bitrateMap[bitrateLevel] || bitrateMap.standard;
    }

    /**
     * Start recording timer
     */
    startRecordingTimer(maxDuration) {
        this.recordingTimer = setInterval(() => {
            const elapsed = (Date.now() - this.recordingStartTime) / 1000;
            const remaining = Math.max(0, maxDuration - elapsed);
            
            this.updateRecordingProgress(elapsed, maxDuration);
            
            if (remaining <= 0) {
                this.stopRecording();
            }
        }, 100); // Update every 100ms for smooth progress
    }

    /**
     * Update recording progress display
     */
    updateRecordingProgress(elapsed, maxDuration) {
        const indicator = document.getElementById('recording-time-indicator');
        if (!indicator) return;

        const timeText = indicator.querySelector('#recording-time-text');
        const progressBar = indicator.querySelector('#recording-progress-bar');
        
        if (timeText) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = Math.floor(elapsed % 60);
            timeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (progressBar) {
            const progress = (elapsed / maxDuration) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }

        // Add warning class when approaching limit
        if (elapsed / maxDuration > 0.9) {
            indicator.classList.add('warning');
        }
    }

    /**
     * Show recording indicator
     */
    showRecordingIndicator() {
        const indicator = document.getElementById('recording-time-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    /**
     * Hide recording indicator
     */
    hideRecordingIndicator() {
        const indicator = document.getElementById('recording-time-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
            indicator.classList.remove('warning');
        }
    }

    /**
     * Reset recording state
     */
    resetRecordingState() {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.currentCapturer = null;
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    /**
     * Get maximum recording time for current user
     */
    getMaxRecordingTime() {
        return this.featureManager.getMaxRecordingTime();
    }

    /**
     * Check if user can record for specified duration
     */
    canRecordDuration(duration) {
        const maxDuration = this.getMaxRecordingTime();
        return duration <= maxDuration;
    }

    /**
     * Setup format selector event listeners
     */
    setupFormatSelectorEvents(selector) {
        const closeBtn = selector.querySelector('#format-selector-close');
        const cancelBtn = selector.querySelector('#format-cancel');
        const confirmBtn = selector.querySelector('#format-confirm');

        const closeSelector = () => {
            selector.classList.add('hidden');
        };

        closeBtn?.addEventListener('click', closeSelector);
        cancelBtn?.addEventListener('click', closeSelector);

        confirmBtn?.addEventListener('click', () => {
            const selectedOption = selector.querySelector('.export-format-option.selected');
            if (selectedOption) {
                const format = selectedOption.dataset.format;
                closeSelector();
                this.startRecording(format);
            } else {
                this.notificationManager.show('Please select an export format', 'warning');
            }
        });
    }

    /**
     * Show format selector
     */
    showFormatSelector() {
        this.updateExportFormatOptions();
        const selector = document.getElementById('export-format-selector');
        if (selector) {
            selector.classList.remove('hidden');
        }
    }

    /**
     * Get current recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            startTime: this.recordingStartTime,
            elapsed: this.recordingStartTime ? (Date.now() - this.recordingStartTime) / 1000 : 0,
            maxDuration: this.getMaxRecordingTime()
        };
    }

    /**
     * Get available recording formats for current user
     */
    getAvailableFormats() {
        return this.featureManager.getAvailableExportFormats();
    }

    /**
     * Get recording capabilities for current user
     */
    getRecordingCapabilities() {
        const userPlan = this.featureManager.getCurrentUserPlan();
        const settings = this.defaultSettings[userPlan] || this.defaultSettings.free;
        
        return {
            maxDuration: settings.maxDuration,
            quality: settings.quality,
            formats: settings.formats,
            resolution: settings.resolution,
            framerate: settings.framerate,
            hasExtendedRecording: this.featureManager.hasFeatureAccess('extended_recording'),
            hasHighQuality: this.featureManager.hasFeatureAccess('high_quality_export'),
            hasPremiumFormats: this.featureManager.hasFeatureAccess('premium_exports')
        };
    }
}

// Export for use in other modules
window.PremiumRecording = PremiumRecording;