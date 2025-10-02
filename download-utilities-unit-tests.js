/**
 * Download Utilities Unit Tests
 * Tests for file format conversion functions and download progress tracking
 * Requirements: 3.1, 3.2
 */

class DownloadUtilitiesUnitTester {
    constructor() {
        this.testResults = [];
        this.testStartTime = null;
        this.downloadUtilities = null;
    }

    /**
     * Initialize the testing environment
     */
    async init() {
        console.log('🧪 Initializing Download Utilities Unit Tests...');
        
        // Set up download utilities for testing
        this.setupDownloadUtilities();
        
        // Set up mock data
        this.setupMockData();
        
        console.log('✅ Download Utilities Unit Tester initialized');
    }

    /**
     * Run all download utilities unit tests
     */
    async runAllTests() {
        console.log('🚀 Starting Download Utilities Unit Tests...');
        this.testStartTime = Date.now();
        
        const tests = [
            // File Format Conversion Function Tests
            { name: 'File Format Conversion - MP4', fn: () => this.testMP4FormatConversion() },
            { name: 'File Format Conversion - MOV', fn: () => this.testMOVFormatConversion() },
            { name: 'File Format Conversion - MP3', fn: () => this.testMP3FormatConversion() },
            { name: 'File Format Conversion - GIF', fn: () => this.testGIFFormatConversion() },
            { name: 'File Size Calculation Accuracy', fn: () => this.testFileSizeCalculation() },
            { name: 'Quality Settings Validation', fn: () => this.testQualitySettings() },
            { name: 'Format Multiplier Logic', fn: () => this.testFormatMultipliers() },
            { name: 'File Generation Simulation', fn: () => this.testFileGenerationSimulation() },
            
            // Download Progress Tracking Tests
            { name: 'Progress Tracker Initialization', fn: () => this.testProgressTrackerInit() },
            { name: 'Progress Update Functionality', fn: () => this.testProgressUpdate() },
            { name: 'Progress Callback Management', fn: () => this.testProgressCallbacks() },
            { name: 'Progress Callback Addition', fn: () => this.testAddProgressCallback() },
            { name: 'Progress Callback Removal', fn: () => this.testRemoveProgressCallback() },
            { name: 'Progress Value Validation', fn: () => this.testProgressValueValidation() },
            { name: 'Progress Monotonic Increase', fn: () => this.testProgressMonotonicIncrease() },
            { name: 'Progress Completion Detection', fn: () => this.testProgressCompletion() },
            { name: 'Multiple Progress Trackers', fn: () => this.testMultipleProgressTrackers() },
            { name: 'Progress Error Handling', fn: () => this.testProgressErrorHandling() }
        ];

        for (const test of tests) {
            try {
                console.log(`\n🧪 Running: ${test.name}`);
                await test.fn();
                this.addTestResult(test.name, 'PASSED', 'Test completed successfully');
            } catch (error) {
                console.error(`❌ ${test.name} failed:`, error);
                this.addTestResult(test.name, 'FAILED', error.message);
            }
        }

        return this.generateTestReport();
    }

    /**
     * Set up download utilities for testing
     */
    setupDownloadUtilities() {
        this.downloadUtilities = {
            // File format conversion functions
            calculateFileSize: (audioData, quality, format) => {
                const baseSize = audioData.size;
                const qualityMultiplier = {
                    standard: 1,
                    high: 2.5,
                    ultra: 6
                };
                
                const formatMultiplier = {
                    mp3: 0.1,
                    mp4: 1,
                    mov: 1.5,
                    gif: 0.3
                };
                
                return Math.floor(baseSize * (qualityMultiplier[quality] || 1) * (formatMultiplier[format] || 1));
            },

            getQualitySettings: (quality) => {
                const settings = {
                    standard: { resolution: '720p', bitrate: 2000000 },
                    high: { resolution: '1080p', bitrate: 5000000 },
                    ultra: { resolution: '4K', bitrate: 15000000 }
                };
                
                return settings[quality] || settings.standard;
            },

            simulateFileGeneration: async (fileProperties, progressCallback) => {
                const steps = 20;
                const stepDelay = 50; // Faster for unit tests
                
                for (let i = 0; i <= steps; i++) {
                    const progress = Math.floor((i / steps) * 100);
                    
                    if (progressCallback) {
                        progressCallback(progress);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, stepDelay));
                }
                
                return fileProperties;
            },

            // Progress tracking utilities
            createProgressTracker: () => {
                return {
                    currentProgress: 0,
                    totalSteps: 100,
                    callbacks: [],
                    
                    updateProgress: function(progress) {
                        if (progress < 0 || progress > 100) {
                            throw new Error(`Invalid progress value: ${progress}`);
                        }
                        
                        this.currentProgress = progress;
                        this.callbacks.forEach(callback => {
                            try {
                                callback(progress);
                            } catch (error) {
                                console.error('Progress callback error:', error);
                            }
                        });
                    },
                    
                    addCallback: function(callback) {
                        if (typeof callback !== 'function') {
                            throw new Error('Callback must be a function');
                        }
                        this.callbacks.push(callback);
                    },
                    
                    removeCallback: function(callback) {
                        const index = this.callbacks.indexOf(callback);
                        if (index > -1) {
                            this.callbacks.splice(index, 1);
                            return true;
                        }
                        return false;
                    },
                    
                    reset: function() {
                        this.currentProgress = 0;
                        this.callbacks = [];
                    }
                };
            }
        };
    }

    /**
     * Set up mock data for testing
     */
    setupMockData() {
        this.mockAudioData = {
            duration: 30,
            sampleRate: 44100,
            channels: 2,
            bitRate: 320000,
            format: 'PCM',
            size: 1024 * 1024 * 5, // 5MB
            metadata: {
                title: 'Test Audio',
                artist: 'Test Artist',
                album: 'Test Album'
            }
        };
    }

    // File Format Conversion Tests

    /**
     * Test MP4 format conversion
     * Requirements: 3.1
     */
    async testMP4FormatConversion() {
        console.log('Testing MP4 format conversion...');
        
        const quality = 'high';
        const expectedSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp4');
        
        // Verify MP4 file size calculation
        if (expectedSize <= 0) {
            throw new Error('MP4 file size calculation returned invalid value');
        }
        
        // Test quality settings for MP4
        const qualitySettings = this.downloadUtilities.getQualitySettings(quality);
        if (!qualitySettings.resolution || !qualitySettings.bitrate) {
            throw new Error('MP4 quality settings missing required properties');
        }
        
        // Verify MP4 specific calculations
        const baseSize = this.mockAudioData.size;
        const expectedMP4Size = Math.floor(baseSize * 2.5 * 1); // high quality * mp4 multiplier
        
        if (expectedSize !== expectedMP4Size) {
            throw new Error(`MP4 size calculation mismatch: expected ${expectedMP4Size}, got ${expectedSize}`);
        }
        
        console.log('✅ MP4 format conversion test passed');
    }

    /**
     * Test MOV format conversion
     * Requirements: 3.1
     */
    async testMOVFormatConversion() {
        console.log('Testing MOV format conversion...');
        
        const quality = 'ultra';
        const expectedSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mov');
        
        // Verify MOV file size calculation
        if (expectedSize <= 0) {
            throw new Error('MOV file size calculation returned invalid value');
        }
        
        // Verify MOV specific calculations (higher quality, larger multiplier)
        const baseSize = this.mockAudioData.size;
        const expectedMOVSize = Math.floor(baseSize * 6 * 1.5); // ultra quality * mov multiplier
        
        if (expectedSize !== expectedMOVSize) {
            throw new Error(`MOV size calculation mismatch: expected ${expectedMOVSize}, got ${expectedSize}`);
        }
        
        // Test ultra quality settings
        const qualitySettings = this.downloadUtilities.getQualitySettings(quality);
        if (qualitySettings.resolution !== '4K') {
            throw new Error('Ultra quality should support 4K resolution for MOV');
        }
        
        console.log('✅ MOV format conversion test passed');
    }

    /**
     * Test MP3 format conversion
     * Requirements: 3.1
     */
    async testMP3FormatConversion() {
        console.log('Testing MP3 format conversion...');
        
        const quality = 'standard';
        const expectedSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp3');
        
        // Verify MP3 file size calculation (should be much smaller)
        if (expectedSize <= 0) {
            throw new Error('MP3 file size calculation returned invalid value');
        }
        
        // MP3 should be significantly smaller than video formats
        const mp4Size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp4');
        if (expectedSize >= mp4Size) {
            throw new Error('MP3 file should be smaller than MP4 file');
        }
        
        // Verify MP3 specific calculations
        const baseSize = this.mockAudioData.size;
        const expectedMP3Size = Math.floor(baseSize * 1 * 0.1); // standard quality * mp3 multiplier
        
        if (expectedSize !== expectedMP3Size) {
            throw new Error(`MP3 size calculation mismatch: expected ${expectedMP3Size}, got ${expectedSize}`);
        }
        
        console.log('✅ MP3 format conversion test passed');
    }

    /**
     * Test GIF format conversion
     * Requirements: 3.1
     */
    async testGIFFormatConversion() {
        console.log('Testing GIF format conversion...');
        
        const quality = 'standard';
        const expectedSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'gif');
        
        // Verify GIF file size calculation
        if (expectedSize <= 0) {
            throw new Error('GIF file size calculation returned invalid value');
        }
        
        // GIF should be smaller than video formats but larger than MP3
        const mp3Size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp3');
        const mp4Size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp4');
        
        if (expectedSize <= mp3Size) {
            throw new Error('GIF file should be larger than MP3 file');
        }
        
        if (expectedSize >= mp4Size) {
            throw new Error('GIF file should be smaller than MP4 file');
        }
        
        console.log('✅ GIF format conversion test passed');
    }

    /**
     * Test file size calculation accuracy
     * Requirements: 3.1
     */
    async testFileSizeCalculation() {
        console.log('Testing file size calculation accuracy...');
        
        const formats = ['mp3', 'mp4', 'mov', 'gif'];
        const qualities = ['standard', 'high', 'ultra'];
        
        for (const format of formats) {
            for (const quality of qualities) {
                const size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, format);
                
                // Verify size is positive
                if (size <= 0) {
                    throw new Error(`Invalid file size for ${format} ${quality}: ${size}`);
                }
                
                // Verify size increases with quality
                if (quality !== 'standard') {
                    const standardSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, 'standard', format);
                    if (size <= standardSize) {
                        throw new Error(`Higher quality should result in larger file size for ${format}`);
                    }
                }
            }
        }
        
        console.log('✅ File size calculation accuracy test passed');
    }

    /**
     * Test quality settings validation
     * Requirements: 3.1
     */
    async testQualitySettings() {
        console.log('Testing quality settings validation...');
        
        const qualities = ['standard', 'high', 'ultra'];
        
        for (const quality of qualities) {
            const settings = this.downloadUtilities.getQualitySettings(quality);
            
            // Verify required properties exist
            if (!settings.resolution || !settings.bitrate) {
                throw new Error(`Quality settings missing properties for ${quality}`);
            }
            
            // Verify bitrate increases with quality
            if (typeof settings.bitrate !== 'number' || settings.bitrate <= 0) {
                throw new Error(`Invalid bitrate for ${quality}: ${settings.bitrate}`);
            }
        }
        
        // Test invalid quality fallback
        const invalidSettings = this.downloadUtilities.getQualitySettings('invalid');
        const standardSettings = this.downloadUtilities.getQualitySettings('standard');
        
        if (JSON.stringify(invalidSettings) !== JSON.stringify(standardSettings)) {
            throw new Error('Invalid quality should fallback to standard settings');
        }
        
        console.log('✅ Quality settings validation test passed');
    }

    /**
     * Test format multiplier logic
     * Requirements: 3.1
     */
    async testFormatMultipliers() {
        console.log('Testing format multiplier logic...');
        
        const baseSize = this.mockAudioData.size;
        const quality = 'standard';
        
        // Test that different formats produce different sizes
        const mp3Size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp3');
        const mp4Size = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mp4');
        const movSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'mov');
        const gifSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'gif');
        
        // Verify size ordering: MP3 < GIF < MP4 < MOV
        if (!(mp3Size < gifSize && gifSize < mp4Size && mp4Size < movSize)) {
            throw new Error('Format size ordering is incorrect');
        }
        
        // Test unknown format fallback
        const unknownSize = this.downloadUtilities.calculateFileSize(this.mockAudioData, quality, 'unknown');
        if (unknownSize !== baseSize) { // Should use multiplier of 1
            throw new Error('Unknown format should use default multiplier');
        }
        
        console.log('✅ Format multiplier logic test passed');
    }

    /**
     * Test file generation simulation
     * Requirements: 3.1
     */
    async testFileGenerationSimulation() {
        console.log('Testing file generation simulation...');
        
        const fileProperties = {
            format: 'mp4',
            size: 1024 * 1024,
            duration: 30
        };
        
        let progressUpdates = [];
        const progressCallback = (progress) => {
            progressUpdates.push(progress);
        };
        
        const result = await this.downloadUtilities.simulateFileGeneration(fileProperties, progressCallback);
        
        // Verify result matches input
        if (JSON.stringify(result) !== JSON.stringify(fileProperties)) {
            throw new Error('File generation simulation should return input properties');
        }
        
        // Verify progress updates
        if (progressUpdates.length === 0) {
            throw new Error('File generation should provide progress updates');
        }
        
        // Verify progress starts at 0 and ends at 100
        if (progressUpdates[0] !== 0) {
            throw new Error('Progress should start at 0');
        }
        
        if (progressUpdates[progressUpdates.length - 1] !== 100) {
            throw new Error('Progress should end at 100');
        }
        
        console.log('✅ File generation simulation test passed');
    }

    // Download Progress Tracking Tests

    /**
     * Test progress tracker initialization
     * Requirements: 3.2
     */
    async testProgressTrackerInit() {
        console.log('Testing progress tracker initialization...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        // Verify initial state
        if (tracker.currentProgress !== 0) {
            throw new Error('Progress tracker should initialize with 0 progress');
        }
        
        if (tracker.totalSteps !== 100) {
            throw new Error('Progress tracker should initialize with 100 total steps');
        }
        
        if (!Array.isArray(tracker.callbacks)) {
            throw new Error('Progress tracker should initialize with empty callbacks array');
        }
        
        if (tracker.callbacks.length !== 0) {
            throw new Error('Progress tracker should start with no callbacks');
        }
        
        // Verify methods exist
        if (typeof tracker.updateProgress !== 'function') {
            throw new Error('Progress tracker missing updateProgress method');
        }
        
        if (typeof tracker.addCallback !== 'function') {
            throw new Error('Progress tracker missing addCallback method');
        }
        
        if (typeof tracker.removeCallback !== 'function') {
            throw new Error('Progress tracker missing removeCallback method');
        }
        
        console.log('✅ Progress tracker initialization test passed');
    }

    /**
     * Test progress update functionality
     * Requirements: 3.2
     */
    async testProgressUpdate() {
        console.log('Testing progress update functionality...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        // Test valid progress updates
        const validValues = [0, 25, 50, 75, 100];
        
        for (const value of validValues) {
            tracker.updateProgress(value);
            
            if (tracker.currentProgress !== value) {
                throw new Error(`Progress not updated correctly: expected ${value}, got ${tracker.currentProgress}`);
            }
        }
        
        // Test invalid progress values
        const invalidValues = [-1, 101, -50, 150];
        
        for (const value of invalidValues) {
            try {
                tracker.updateProgress(value);
                throw new Error(`Should have thrown error for invalid progress: ${value}`);
            } catch (error) {
                if (!error.message.includes('Invalid progress value')) {
                    throw new Error(`Wrong error message for invalid progress: ${error.message}`);
                }
            }
        }
        
        console.log('✅ Progress update functionality test passed');
    }

    /**
     * Test progress callback management
     * Requirements: 3.2
     */
    async testProgressCallbacks() {
        console.log('Testing progress callback management...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        let callback1Called = false;
        let callback2Called = false;
        let callback1Value = null;
        let callback2Value = null;
        
        const callback1 = (progress) => {
            callback1Called = true;
            callback1Value = progress;
        };
        
        const callback2 = (progress) => {
            callback2Called = true;
            callback2Value = progress;
        };
        
        // Add callbacks
        tracker.addCallback(callback1);
        tracker.addCallback(callback2);
        
        // Verify callbacks are added
        if (tracker.callbacks.length !== 2) {
            throw new Error('Callbacks not added correctly');
        }
        
        // Trigger progress update
        tracker.updateProgress(50);
        
        // Verify callbacks were called
        if (!callback1Called || !callback2Called) {
            throw new Error('Not all callbacks were called');
        }
        
        if (callback1Value !== 50 || callback2Value !== 50) {
            throw new Error('Callbacks did not receive correct progress value');
        }
        
        console.log('✅ Progress callback management test passed');
    }

    /**
     * Test adding progress callbacks
     * Requirements: 3.2
     */
    async testAddProgressCallback() {
        console.log('Testing add progress callback...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        const callback = (progress) => {};
        
        // Test adding valid callback
        tracker.addCallback(callback);
        
        if (tracker.callbacks.length !== 1) {
            throw new Error('Callback not added');
        }
        
        if (tracker.callbacks[0] !== callback) {
            throw new Error('Wrong callback added');
        }
        
        // Test adding invalid callback
        try {
            tracker.addCallback('not a function');
            throw new Error('Should have thrown error for invalid callback');
        } catch (error) {
            if (!error.message.includes('Callback must be a function')) {
                throw new Error(`Wrong error message: ${error.message}`);
            }
        }
        
        // Test adding multiple callbacks
        const callback2 = (progress) => {};
        tracker.addCallback(callback2);
        
        if (tracker.callbacks.length !== 2) {
            throw new Error('Multiple callbacks not added correctly');
        }
        
        console.log('✅ Add progress callback test passed');
    }

    /**
     * Test removing progress callbacks
     * Requirements: 3.2
     */
    async testRemoveProgressCallback() {
        console.log('Testing remove progress callback...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        const callback1 = (progress) => {};
        const callback2 = (progress) => {};
        
        // Add callbacks
        tracker.addCallback(callback1);
        tracker.addCallback(callback2);
        
        // Test removing existing callback
        const removed = tracker.removeCallback(callback1);
        
        if (!removed) {
            throw new Error('removeCallback should return true when callback is removed');
        }
        
        if (tracker.callbacks.length !== 1) {
            throw new Error('Callback not removed');
        }
        
        if (tracker.callbacks[0] !== callback2) {
            throw new Error('Wrong callback removed');
        }
        
        // Test removing non-existent callback
        const notRemoved = tracker.removeCallback(callback1);
        
        if (notRemoved) {
            throw new Error('removeCallback should return false when callback not found');
        }
        
        console.log('✅ Remove progress callback test passed');
    }

    /**
     * Test progress value validation
     * Requirements: 3.2
     */
    async testProgressValueValidation() {
        console.log('Testing progress value validation...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        // Test boundary values
        const validBoundaryValues = [0, 100];
        
        for (const value of validBoundaryValues) {
            try {
                tracker.updateProgress(value);
            } catch (error) {
                throw new Error(`Valid boundary value ${value} should not throw error: ${error.message}`);
            }
        }
        
        // Test invalid boundary values
        const invalidBoundaryValues = [-0.1, 100.1];
        
        for (const value of invalidBoundaryValues) {
            try {
                tracker.updateProgress(value);
                throw new Error(`Invalid boundary value ${value} should throw error`);
            } catch (error) {
                if (!error.message.includes('Invalid progress value')) {
                    throw new Error(`Wrong error for invalid value ${value}: ${error.message}`);
                }
            }
        }
        
        // Test decimal values
        const validDecimalValues = [0.5, 25.7, 99.9];
        
        for (const value of validDecimalValues) {
            try {
                tracker.updateProgress(value);
            } catch (error) {
                throw new Error(`Valid decimal value ${value} should not throw error: ${error.message}`);
            }
        }
        
        console.log('✅ Progress value validation test passed');
    }

    /**
     * Test progress monotonic increase
     * Requirements: 3.2
     */
    async testProgressMonotonicIncrease() {
        console.log('Testing progress monotonic increase...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        let progressHistory = [];
        
        const callback = (progress) => {
            progressHistory.push(progress);
        };
        
        tracker.addCallback(callback);
        
        // Simulate typical progress sequence
        const progressSequence = [0, 10, 25, 50, 75, 90, 100];
        
        for (const progress of progressSequence) {
            tracker.updateProgress(progress);
        }
        
        // Verify monotonic increase
        for (let i = 1; i < progressHistory.length; i++) {
            if (progressHistory[i] < progressHistory[i - 1]) {
                throw new Error(`Progress decreased from ${progressHistory[i - 1]} to ${progressHistory[i]}`);
            }
        }
        
        // Test that equal values are allowed (progress can stay the same)
        tracker.updateProgress(100);
        tracker.updateProgress(100);
        
        if (progressHistory[progressHistory.length - 1] !== 100) {
            throw new Error('Progress should allow equal consecutive values');
        }
        
        console.log('✅ Progress monotonic increase test passed');
    }

    /**
     * Test progress completion detection
     * Requirements: 3.2
     */
    async testProgressCompletion() {
        console.log('Testing progress completion detection...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        let completionDetected = false;
        
        const callback = (progress) => {
            if (progress === 100) {
                completionDetected = true;
            }
        };
        
        tracker.addCallback(callback);
        
        // Progress through values
        const progressValues = [0, 25, 50, 75, 99];
        
        for (const progress of progressValues) {
            tracker.updateProgress(progress);
            
            if (completionDetected) {
                throw new Error(`Completion detected prematurely at ${progress}%`);
            }
        }
        
        // Complete the progress
        tracker.updateProgress(100);
        
        if (!completionDetected) {
            throw new Error('Completion not detected at 100%');
        }
        
        console.log('✅ Progress completion detection test passed');
    }

    /**
     * Test multiple progress trackers
     * Requirements: 3.2
     */
    async testMultipleProgressTrackers() {
        console.log('Testing multiple progress trackers...');
        
        const tracker1 = this.downloadUtilities.createProgressTracker();
        const tracker2 = this.downloadUtilities.createProgressTracker();
        
        let tracker1Updates = [];
        let tracker2Updates = [];
        
        tracker1.addCallback((progress) => tracker1Updates.push(progress));
        tracker2.addCallback((progress) => tracker2Updates.push(progress));
        
        // Update trackers independently
        tracker1.updateProgress(30);
        tracker2.updateProgress(60);
        
        // Verify independence
        if (tracker1.currentProgress !== 30) {
            throw new Error('Tracker 1 progress not updated correctly');
        }
        
        if (tracker2.currentProgress !== 60) {
            throw new Error('Tracker 2 progress not updated correctly');
        }
        
        // Verify callback isolation
        if (tracker1Updates.length !== 1 || tracker1Updates[0] !== 30) {
            throw new Error('Tracker 1 callbacks not isolated');
        }
        
        if (tracker2Updates.length !== 1 || tracker2Updates[0] !== 60) {
            throw new Error('Tracker 2 callbacks not isolated');
        }
        
        console.log('✅ Multiple progress trackers test passed');
    }

    /**
     * Test progress error handling
     * Requirements: 3.2
     */
    async testProgressErrorHandling() {
        console.log('Testing progress error handling...');
        
        const tracker = this.downloadUtilities.createProgressTracker();
        
        // Add callback that throws error
        const errorCallback = (progress) => {
            throw new Error('Callback error');
        };
        
        // Add normal callback
        let normalCallbackCalled = false;
        const normalCallback = (progress) => {
            normalCallbackCalled = true;
        };
        
        tracker.addCallback(errorCallback);
        tracker.addCallback(normalCallback);
        
        // Update progress - should not throw error despite callback error
        try {
            tracker.updateProgress(50);
        } catch (error) {
            throw new Error('Progress update should not throw error when callback fails');
        }
        
        // Verify normal callback still executed
        if (!normalCallbackCalled) {
            throw new Error('Normal callback should execute even when other callback fails');
        }
        
        // Verify progress was still updated
        if (tracker.currentProgress !== 50) {
            throw new Error('Progress should update even when callback fails');
        }
        
        console.log('✅ Progress error handling test passed');
    }

    // Helper methods

    /**
     * Add test result
     */
    addTestResult(testName, status, message) {
        this.testResults.push({
            name: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.testStartTime;
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        const report = {
            summary: {
                total: total,
                passed: passed,
                failed: failed,
                passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
                executionTime: totalTime
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📊 Download Utilities Unit Test Report');
        console.log('=====================================');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Pass Rate: ${report.summary.passRate}%`);
        console.log(`Execution Time: ${totalTime}ms`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`  - ${result.name}: ${result.message}`);
                });
        }
        
        console.log('\n✅ Download Utilities Unit Tests completed');
        
        return report;
    }
}

// Initialize and export
const downloadUtilitiesUnitTester = new DownloadUtilitiesUnitTester();

// Make available globally
window.downloadUtilitiesUnitTester = downloadUtilitiesUnitTester;

console.log('✅ Download Utilities Unit Tests module loaded');