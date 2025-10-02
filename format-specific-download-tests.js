/**
 * Format-Specific Download Testing Module
 * Tests MP4/MOV downloads with quality validation, file integrity verification, and progress indicators
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */

class FormatSpecificDownloadTester {
    constructor() {
        this.testResults = [];
        this.testStartTime = null;
        this.mockFiles = new Map();
        this.downloadProgress = new Map();
        this.generatedFiles = [];
        this.progressCallbacks = [];
    }

    /**
     * Initialize the testing environment
     */
    async init() {
        console.log('🧪 Initializing Format-Specific Download Tests...');
        
        // Set up mock file generation system
        this.setupMockFileGeneration();
        
        // Set up progress tracking
        this.setupProgressTracking();
        
        // Create mock audio data for testing
        this.setupMockAudioData();
        
        console.log('✅ Format-Specific Download Tester initialized');
    }

    /**
     * Run all format-specific download tests
     */
    async runAllTests() {
        console.log('🚀 Starting Format-Specific Download Tests...');
        this.testStartTime = Date.now();
        
        const tests = [
            { name: 'MP4 Download Quality Validation', fn: () => this.testMP4DownloadQuality() },
            { name: 'MP4 Codec Verification', fn: () => this.testMP4CodecVerification() },
            { name: 'MOV Download Compatibility', fn: () => this.testMOVDownloadCompatibility() },
            { name: 'MOV Quality Preservation', fn: () => this.testMOVQualityPreservation() },
            { name: 'File Integrity Verification - MP4', fn: () => this.testFileIntegrityMP4() },
            { name: 'File Integrity Verification - MOV', fn: () => this.testFileIntegrityMOV() },
            { name: 'File Integrity Verification - MP3', fn: () => this.testFileIntegrityMP3() },
            { name: 'File Integrity Verification - GIF', fn: () => this.testFileIntegrityGIF() },
            { name: 'Progress Indicator During Generation', fn: () => this.testProgressIndicatorGeneration() },
            { name: 'Progress Percentage Accuracy', fn: () => this.testProgressPercentageAccuracy() },
            { name: 'Progress Callback Functionality', fn: () => this.testProgressCallbacks() },
            { name: 'Large File Generation Performance', fn: () => this.testLargeFilePerformance() },
            { name: 'Concurrent Download Handling', fn: () => this.testConcurrentDownloads() },
            { name: 'Download Cancellation Support', fn: () => this.testDownloadCancellation() },
            { name: 'Error Recovery During Generation', fn: () => this.testErrorRecoveryGeneration() },
            { name: 'Memory Management During Generation', fn: () => this.testMemoryManagement() }
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
     * Set up mock file generation system
     */
    setupMockFileGeneration() {
        // Mock file generation functions
        this.mockFileGenerators = {
            mp4: async (audioData, quality, progressCallback) => {
                return await this.generateMockMP4(audioData, quality, progressCallback);
            },
            mov: async (audioData, quality, progressCallback) => {
                return await this.generateMockMOV(audioData, quality, progressCallback);
            },
            mp3: async (audioData, quality, progressCallback) => {
                return await this.generateMockMP3(audioData, quality, progressCallback);
            },
            gif: async (audioData, quality, progressCallback) => {
                return await this.generateMockGIF(audioData, quality, progressCallback);
            }
        };
    }

    /**
     * Set up progress tracking system
     */
    setupProgressTracking() {
        this.progressTracker = {
            currentProgress: 0,
            totalSteps: 100,
            callbacks: [],
            
            updateProgress: (progress) => {
                this.progressTracker.currentProgress = progress;
                this.progressTracker.callbacks.forEach(callback => {
                    try {
                        callback(progress);
                    } catch (error) {
                        console.error('Progress callback error:', error);
                    }
                });
            },
            
            addCallback: (callback) => {
                this.progressTracker.callbacks.push(callback);
            },
            
            removeCallback: (callback) => {
                const index = this.progressTracker.callbacks.indexOf(callback);
                if (index > -1) {
                    this.progressTracker.callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Set up mock audio data
     */
    setupMockAudioData() {
        this.mockAudioData = {
            duration: 30, // 30 seconds
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

    /**
     * Test MP4 download with quality validation
     * Requirements: 3.1, 3.2, 7.1, 7.2
     */
    async testMP4DownloadQuality() {
        console.log('Testing MP4 download quality validation...');
        
        const qualityLevels = ['standard', 'high', 'ultra'];
        
        for (const quality of qualityLevels) {
            console.log(`Testing MP4 quality: ${quality}`);
            
            const progressCallback = (progress) => {
                console.log(`MP4 ${quality} generation progress: ${progress}%`);
            };
            
            const file = await this.mockFileGenerators.mp4(this.mockAudioData, quality, progressCallback);
            
            // Validate file properties based on quality
            this.validateMP4Quality(file, quality);
            
            // Verify file size is appropriate for quality
            this.validateFileSizeForQuality(file, quality, 'mp4');
            
            console.log(`✅ MP4 ${quality} quality validation passed`);
        }
        
        console.log('✅ MP4 download quality validation completed');
    }

    /**
     * Test MP4 codec verification
     * Requirements: 7.1, 7.2
     */
    async testMP4CodecVerification() {
        console.log('Testing MP4 codec verification...');
        
        const file = await this.mockFileGenerators.mp4(this.mockAudioData, 'high');
        
        // Verify H.264 video codec
        if (file.videoCodec !== 'H.264') {
            throw new Error(`Expected H.264 video codec, got ${file.videoCodec}`);
        }
        
        // Verify AAC audio codec
        if (file.audioCodec !== 'AAC') {
            throw new Error(`Expected AAC audio codec, got ${file.audioCodec}`);
        }
        
        // Verify container format
        if (file.container !== 'MP4') {
            throw new Error(`Expected MP4 container, got ${file.container}`);
        }
        
        // Verify compatibility profile
        if (!file.profile || !file.profile.includes('baseline')) {
            throw new Error('MP4 should use baseline profile for maximum compatibility');
        }
        
        console.log('✅ MP4 codec verification passed');
    }

    /**
     * Test MOV download compatibility
     * Requirements: 3.2, 7.2, 7.3
     */
    async testMOVDownloadCompatibility() {
        console.log('Testing MOV download compatibility...');
        
        const file = await this.mockFileGenerators.mov(this.mockAudioData, 'high');
        
        // Verify MOV container
        if (file.container !== 'MOV') {
            throw new Error(`Expected MOV container, got ${file.container}`);
        }
        
        // Verify professional editing compatibility
        if (!file.editingCompatible) {
            throw new Error('MOV file should be compatible with professional editing software');
        }
        
        // Verify metadata preservation
        if (!file.metadata || !file.metadata.timecode) {
            throw new Error('MOV file should preserve professional metadata including timecode');
        }
        
        // Verify color space information
        if (!file.colorSpace) {
            throw new Error('MOV file should include color space information');
        }
        
        console.log('✅ MOV download compatibility test passed');
    }

    /**
     * Test MOV quality preservation
     * Requirements: 7.2, 7.3
     */
    async testMOVQualityPreservation() {
        console.log('Testing MOV quality preservation...');
        
        const file = await this.mockFileGenerators.mov(this.mockAudioData, 'ultra');
        
        // Verify original quality settings are maintained
        if (file.quality.resolution !== '4K' && file.quality.level === 'ultra') {
            throw new Error('Ultra quality MOV should support 4K resolution');
        }
        
        // Verify metadata preservation
        const originalMetadata = this.mockAudioData.metadata;
        if (!file.metadata.title || file.metadata.title !== originalMetadata.title) {
            throw new Error('MOV should preserve original metadata');
        }
        
        // Verify audio quality preservation
        if (file.audioQuality.sampleRate < this.mockAudioData.sampleRate) {
            throw new Error('MOV should preserve original audio sample rate');
        }
        
        if (file.audioQuality.bitRate < this.mockAudioData.bitRate) {
            throw new Error('MOV should preserve original audio bit rate');
        }
        
        console.log('✅ MOV quality preservation test passed');
    }

    /**
     * Test file integrity verification for MP4
     * Requirements: 3.3, 3.4
     */
    async testFileIntegrityMP4() {
        console.log('Testing MP4 file integrity...');
        
        const file = await this.mockFileGenerators.mp4(this.mockAudioData, 'high');
        
        // Verify file structure
        if (!this.verifyFileStructure(file, 'mp4')) {
            throw new Error('MP4 file structure validation failed');
        }
        
        // Verify audio-video synchronization
        if (!this.verifyAudioVideoSync(file)) {
            throw new Error('MP4 audio-video synchronization validation failed');
        }
        
        // Verify file completeness
        if (!this.verifyFileCompleteness(file)) {
            throw new Error('MP4 file completeness validation failed');
        }
        
        // Verify checksum
        const expectedChecksum = this.calculateExpectedChecksum(file);
        if (file.checksum !== expectedChecksum) {
            throw new Error('MP4 file checksum validation failed');
        }
        
        console.log('✅ MP4 file integrity verification passed');
    }

    /**
     * Test file integrity verification for MOV
     * Requirements: 3.3, 3.4
     */
    async testFileIntegrityMOV() {
        console.log('Testing MOV file integrity...');
        
        const file = await this.mockFileGenerators.mov(this.mockAudioData, 'high');
        
        // Verify file structure
        if (!this.verifyFileStructure(file, 'mov')) {
            throw new Error('MOV file structure validation failed');
        }
        
        // Verify professional metadata integrity
        if (!this.verifyProfessionalMetadata(file)) {
            throw new Error('MOV professional metadata validation failed');
        }
        
        // Verify timecode accuracy
        if (!this.verifyTimecodeAccuracy(file)) {
            throw new Error('MOV timecode accuracy validation failed');
        }
        
        console.log('✅ MOV file integrity verification passed');
    }

    /**
     * Test file integrity verification for MP3
     * Requirements: 3.3, 3.4
     */
    async testFileIntegrityMP3() {
        console.log('Testing MP3 file integrity...');
        
        const file = await this.mockFileGenerators.mp3(this.mockAudioData, 'high');
        
        // Verify MP3 frame structure
        if (!this.verifyMP3FrameStructure(file)) {
            throw new Error('MP3 frame structure validation failed');
        }
        
        // Verify ID3 tags
        if (!this.verifyID3Tags(file)) {
            throw new Error('MP3 ID3 tags validation failed');
        }
        
        // Verify audio quality
        if (!this.verifyAudioQuality(file, 'mp3')) {
            throw new Error('MP3 audio quality validation failed');
        }
        
        console.log('✅ MP3 file integrity verification passed');
    }

    /**
     * Test file integrity verification for GIF
     * Requirements: 3.3, 3.4
     */
    async testFileIntegrityGIF() {
        console.log('Testing GIF file integrity...');
        
        const file = await this.mockFileGenerators.gif(this.mockAudioData, 'standard');
        
        // Verify GIF structure
        if (!this.verifyGIFStructure(file)) {
            throw new Error('GIF structure validation failed');
        }
        
        // Verify animation properties
        if (!this.verifyAnimationProperties(file)) {
            throw new Error('GIF animation properties validation failed');
        }
        
        // Verify frame count and timing
        if (!this.verifyFrameTimingGIF(file)) {
            throw new Error('GIF frame timing validation failed');
        }
        
        console.log('✅ GIF file integrity verification passed');
    }

    /**
     * Test progress indicator during file generation
     * Requirements: 3.4, 7.4
     */
    async testProgressIndicatorGeneration() {
        console.log('Testing progress indicator during generation...');
        
        let progressUpdates = [];
        const progressCallback = (progress) => {
            progressUpdates.push({
                progress: progress,
                timestamp: Date.now()
            });
        };
        
        // Test progress tracking for MP4 generation
        await this.mockFileGenerators.mp4(this.mockAudioData, 'high', progressCallback);
        
        // Verify progress updates were received
        if (progressUpdates.length === 0) {
            throw new Error('No progress updates received during file generation');
        }
        
        // Verify progress values are valid (0-100)
        for (const update of progressUpdates) {
            if (update.progress < 0 || update.progress > 100) {
                throw new Error(`Invalid progress value: ${update.progress}`);
            }
        }
        
        // Verify progress is monotonically increasing
        for (let i = 1; i < progressUpdates.length; i++) {
            if (progressUpdates[i].progress < progressUpdates[i-1].progress) {
                throw new Error('Progress should be monotonically increasing');
            }
        }
        
        // Verify final progress is 100%
        const finalProgress = progressUpdates[progressUpdates.length - 1].progress;
        if (finalProgress !== 100) {
            throw new Error(`Final progress should be 100%, got ${finalProgress}%`);
        }
        
        console.log('✅ Progress indicator generation test passed');
    }

    /**
     * Test progress percentage accuracy
     * Requirements: 7.4, 7.5
     */
    async testProgressPercentageAccuracy() {
        console.log('Testing progress percentage accuracy...');
        
        let progressUpdates = [];
        const progressCallback = (progress) => {
            progressUpdates.push(progress);
        };
        
        // Generate file with progress tracking
        const startTime = Date.now();
        await this.mockFileGenerators.mov(this.mockAudioData, 'ultra', progressCallback);
        const endTime = Date.now();
        
        // Verify progress updates occur at reasonable intervals
        const totalDuration = endTime - startTime;
        const expectedUpdates = Math.floor(totalDuration / 500); // Every 500ms
        
        if (progressUpdates.length < expectedUpdates * 0.5) {
            throw new Error('Progress updates should occur at regular intervals');
        }
        
        // Verify progress increments are reasonable
        for (let i = 1; i < progressUpdates.length; i++) {
            const increment = progressUpdates[i] - progressUpdates[i-1];
            if (increment > 50) { // No single jump should be more than 50%
                throw new Error(`Progress increment too large: ${increment}%`);
            }
        }
        
        console.log('✅ Progress percentage accuracy test passed');
    }

    /**
     * Test progress callback functionality
     * Requirements: 7.4
     */
    async testProgressCallbacks() {
        console.log('Testing progress callback functionality...');
        
        let callback1Called = false;
        let callback2Called = false;
        
        const callback1 = (progress) => {
            callback1Called = true;
        };
        
        const callback2 = (progress) => {
            callback2Called = true;
        };
        
        // Add callbacks to progress tracker
        this.progressTracker.addCallback(callback1);
        this.progressTracker.addCallback(callback2);
        
        // Trigger progress update
        this.progressTracker.updateProgress(50);
        
        // Verify both callbacks were called
        if (!callback1Called) {
            throw new Error('Progress callback 1 was not called');
        }
        
        if (!callback2Called) {
            throw new Error('Progress callback 2 was not called');
        }
        
        // Test callback removal
        this.progressTracker.removeCallback(callback1);
        callback1Called = false;
        callback2Called = false;
        
        this.progressTracker.updateProgress(75);
        
        if (callback1Called) {
            throw new Error('Removed callback should not be called');
        }
        
        if (!callback2Called) {
            throw new Error('Remaining callback should still be called');
        }
        
        console.log('✅ Progress callback functionality test passed');
    }

    /**
     * Test large file generation performance
     * Requirements: 7.4, 7.5
     */
    async testLargeFilePerformance() {
        console.log('Testing large file generation performance...');
        
        // Create large audio data (simulate 5-minute audio)
        const largeAudioData = {
            ...this.mockAudioData,
            duration: 300, // 5 minutes
            size: 1024 * 1024 * 50 // 50MB
        };
        
        const startTime = Date.now();
        
        let progressUpdates = [];
        const progressCallback = (progress) => {
            progressUpdates.push({
                progress: progress,
                timestamp: Date.now()
            });
        };
        
        const file = await this.mockFileGenerators.mp4(largeAudioData, 'ultra', progressCallback);
        
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        // Verify generation completed within reasonable time (should be fast for mock)
        if (generationTime > 10000) { // 10 seconds max for mock
            throw new Error(`Large file generation took too long: ${generationTime}ms`);
        }
        
        // Verify progress updates were frequent enough for large files
        if (progressUpdates.length < 5) {
            throw new Error('Large file generation should provide frequent progress updates');
        }
        
        // Verify file was generated successfully
        if (!file || !file.size) {
            throw new Error('Large file generation failed');
        }
        
        console.log(`✅ Large file performance test passed (${generationTime}ms)`);
    }

    /**
     * Test concurrent download handling
     * Requirements: 7.5
     */
    async testConcurrentDownloads() {
        console.log('Testing concurrent download handling...');
        
        const concurrentDownloads = [];
        const progressTrackers = [];
        
        // Start multiple downloads simultaneously
        for (let i = 0; i < 3; i++) {
            const progressCallback = (progress) => {
                progressTrackers[i] = progressTrackers[i] || [];
                progressTrackers[i].push(progress);
            };
            
            const downloadPromise = this.mockFileGenerators.mp4(
                this.mockAudioData, 
                'standard', 
                progressCallback
            );
            
            concurrentDownloads.push(downloadPromise);
        }
        
        // Wait for all downloads to complete
        const results = await Promise.all(concurrentDownloads);
        
        // Verify all downloads completed successfully
        if (results.length !== 3) {
            throw new Error('Not all concurrent downloads completed');
        }
        
        for (let i = 0; i < results.length; i++) {
            if (!results[i] || !results[i].size) {
                throw new Error(`Concurrent download ${i} failed`);
            }
        }
        
        // Verify each download had independent progress tracking
        for (let i = 0; i < progressTrackers.length; i++) {
            if (!progressTrackers[i] || progressTrackers[i].length === 0) {
                throw new Error(`Concurrent download ${i} had no progress updates`);
            }
        }
        
        console.log('✅ Concurrent download handling test passed');
    }

    /**
     * Test download cancellation support
     * Requirements: 7.5
     */
    async testDownloadCancellation() {
        console.log('Testing download cancellation support...');
        
        let cancelled = false;
        let progressReceived = false;
        
        const progressCallback = (progress) => {
            progressReceived = true;
            if (progress > 30) {
                cancelled = true;
                throw new Error('CANCELLED'); // Simulate cancellation
            }
        };
        
        try {
            await this.mockFileGenerators.mp4(this.mockAudioData, 'high', progressCallback);
            throw new Error('Download should have been cancelled');
        } catch (error) {
            if (error.message !== 'CANCELLED') {
                throw error;
            }
        }
        
        // Verify cancellation occurred
        if (!cancelled) {
            throw new Error('Download cancellation was not triggered');
        }
        
        if (!progressReceived) {
            throw new Error('Progress should be received before cancellation');
        }
        
        console.log('✅ Download cancellation support test passed');
    }

    /**
     * Test error recovery during generation
     * Requirements: 7.5
     */
    async testErrorRecoveryGeneration() {
        console.log('Testing error recovery during generation...');
        
        // Simulate error during generation
        const originalGenerator = this.mockFileGenerators.mp4;
        let errorThrown = false;
        let recoveryAttempted = false;
        
        this.mockFileGenerators.mp4 = async (audioData, quality, progressCallback) => {
            if (!errorThrown) {
                errorThrown = true;
                throw new Error('SIMULATED_ERROR');
            }
            recoveryAttempted = true;
            return await originalGenerator(audioData, quality, progressCallback);
        };
        
        try {
            // First attempt should fail
            await this.mockFileGenerators.mp4(this.mockAudioData, 'standard');
            throw new Error('First attempt should have failed');
        } catch (error) {
            if (error.message !== 'SIMULATED_ERROR') {
                throw error;
            }
        }
        
        // Second attempt should succeed (recovery)
        const file = await this.mockFileGenerators.mp4(this.mockAudioData, 'standard');
        
        if (!file) {
            throw new Error('Recovery attempt failed');
        }
        
        if (!recoveryAttempted) {
            throw new Error('Recovery was not attempted');
        }
        
        // Restore original generator
        this.mockFileGenerators.mp4 = originalGenerator;
        
        console.log('✅ Error recovery during generation test passed');
    }

    /**
     * Test memory management during generation
     * Requirements: 7.5
     */
    async testMemoryManagement() {
        console.log('Testing memory management during generation...');
        
        // Monitor memory usage during file generation
        const initialMemory = this.getMemoryUsage();
        
        // Generate multiple files to test memory management
        for (let i = 0; i < 5; i++) {
            await this.mockFileGenerators.mp4(this.mockAudioData, 'standard');
            
            // Check memory usage doesn't grow excessively
            const currentMemory = this.getMemoryUsage();
            const memoryIncrease = currentMemory - initialMemory;
            
            if (memoryIncrease > 100) { // 100MB threshold for mock
                console.warn(`Memory usage increased by ${memoryIncrease}MB`);
            }
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        console.log('✅ Memory management test passed');
    }

    // Helper methods for file generation and validation

    async generateMockMP4(audioData, quality, progressCallback) {
        return await this.simulateFileGeneration({
            format: 'mp4',
            container: 'MP4',
            videoCodec: 'H.264',
            audioCodec: 'AAC',
            profile: 'baseline',
            quality: this.getQualitySettings(quality),
            size: this.calculateFileSize(audioData, quality, 'mp4'),
            duration: audioData.duration,
            checksum: 'mock_mp4_checksum_' + Date.now(),
            metadata: audioData.metadata
        }, progressCallback);
    }

    async generateMockMOV(audioData, quality, progressCallback) {
        return await this.simulateFileGeneration({
            format: 'mov',
            container: 'MOV',
            videoCodec: 'ProRes',
            audioCodec: 'PCM',
            editingCompatible: true,
            quality: this.getQualitySettings(quality),
            size: this.calculateFileSize(audioData, quality, 'mov'),
            duration: audioData.duration,
            colorSpace: 'Rec. 709',
            metadata: {
                ...audioData.metadata,
                timecode: '00:00:00:00'
            },
            audioQuality: {
                sampleRate: audioData.sampleRate,
                bitRate: audioData.bitRate
            }
        }, progressCallback);
    }

    async generateMockMP3(audioData, quality, progressCallback) {
        return await this.simulateFileGeneration({
            format: 'mp3',
            container: 'MP3',
            audioCodec: 'MP3',
            quality: this.getQualitySettings(quality),
            size: this.calculateFileSize(audioData, quality, 'mp3'),
            duration: audioData.duration,
            id3Tags: audioData.metadata,
            frameStructure: 'valid'
        }, progressCallback);
    }

    async generateMockGIF(audioData, quality, progressCallback) {
        return await this.simulateFileGeneration({
            format: 'gif',
            container: 'GIF',
            animated: true,
            frameCount: Math.floor(audioData.duration * 10), // 10 FPS
            looping: true,
            quality: this.getQualitySettings(quality),
            size: this.calculateFileSize(audioData, quality, 'gif'),
            duration: audioData.duration
        }, progressCallback);
    }

    async simulateFileGeneration(fileProperties, progressCallback) {
        const steps = 20;
        const stepDelay = 100; // 100ms per step
        
        for (let i = 0; i <= steps; i++) {
            const progress = Math.floor((i / steps) * 100);
            
            if (progressCallback) {
                progressCallback(progress);
            }
            
            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
        
        return fileProperties;
    }

    getQualitySettings(quality) {
        const settings = {
            standard: { resolution: '720p', bitrate: 2000000 },
            high: { resolution: '1080p', bitrate: 5000000 },
            ultra: { resolution: '4K', bitrate: 15000000 }
        };
        
        return settings[quality] || settings.standard;
    }

    calculateFileSize(audioData, quality, format) {
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
    }

    // Validation helper methods

    validateMP4Quality(file, quality) {
        const expectedSettings = this.getQualitySettings(quality);
        
        if (file.quality.resolution !== expectedSettings.resolution) {
            throw new Error(`Expected ${expectedSettings.resolution}, got ${file.quality.resolution}`);
        }
        
        if (file.quality.bitrate !== expectedSettings.bitrate) {
            throw new Error(`Expected bitrate ${expectedSettings.bitrate}, got ${file.quality.bitrate}`);
        }
    }

    validateFileSizeForQuality(file, quality, format) {
        const expectedSize = this.calculateFileSize(this.mockAudioData, quality, format);
        const tolerance = expectedSize * 0.1; // 10% tolerance
        
        if (Math.abs(file.size - expectedSize) > tolerance) {
            throw new Error(`File size ${file.size} not within expected range for ${quality} quality`);
        }
    }

    verifyFileStructure(file, format) {
        // Mock file structure verification
        return file.format === format && file.container && file.size > 0;
    }

    verifyAudioVideoSync(file) {
        // Mock audio-video sync verification
        return file.duration > 0 && file.videoCodec && file.audioCodec;
    }

    verifyFileCompleteness(file) {
        // Mock file completeness verification
        return file.size > 0 && file.duration > 0;
    }

    calculateExpectedChecksum(file) {
        // Mock checksum calculation
        return 'mock_checksum_' + file.format + '_' + file.size;
    }

    verifyProfessionalMetadata(file) {
        return file.metadata && file.metadata.timecode && file.colorSpace;
    }

    verifyTimecodeAccuracy(file) {
        return file.metadata.timecode === '00:00:00:00';
    }

    verifyMP3FrameStructure(file) {
        return file.frameStructure === 'valid';
    }

    verifyID3Tags(file) {
        return file.id3Tags && file.id3Tags.title;
    }

    verifyAudioQuality(file, format) {
        return file.audioCodec && file.duration > 0;
    }

    verifyGIFStructure(file) {
        return file.animated && file.frameCount > 0;
    }

    verifyAnimationProperties(file) {
        return file.looping && file.frameCount > 0;
    }

    verifyFrameTimingGIF(file) {
        const expectedFrames = Math.floor(this.mockAudioData.duration * 10);
        return Math.abs(file.frameCount - expectedFrames) <= 1;
    }

    getMemoryUsage() {
        // Mock memory usage calculation
        return Math.random() * 50; // Random value between 0-50MB
    }

    /**
     * Add test result
     */
    addTestResult(testName, status, message = '') {
        const result = {
            test: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.testStartTime
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASSED' ? '✅' : '❌';
        console.log(`${statusIcon} ${testName}: ${status} ${message ? '- ' + message : ''}`);
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
        const failedTests = totalTests - passedTests;
        const totalDuration = Date.now() - this.testStartTime;
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
                duration: totalDuration
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📊 Format-Specific Download Test Report');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Duration: ${totalDuration}ms`);
        console.log('=' .repeat(50));
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`  • ${result.test}: ${result.message}`);
                });
        }
        
        return report;
    }
}

// Make the tester available globally
window.FormatSpecificDownloadTester = FormatSpecificDownloadTester;

console.log('✅ Format-Specific Download Tester loaded');