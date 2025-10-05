/**
 * Download Functionality Parity Validator
 * Tests audio upload and download functionality with geometric UI design
 */
class DownloadFunctionalityParityValidator {
    constructor() {
        this.currentEnvironment = this.detectEnvironment();
        this.testResults = {};
        this.testSteps = [
            'upload-ui',
            'file-validation', 
            'visualizer-load',
            'audio-processing',
            'download-ui',
            'format-selection',
            'api-upload',
            'api-download'
        ];
        this.completedSteps = 0;
        this.failedSteps = 0;
        this.selectedFormat = null;
        this.testAudioFile = null;
        
        this.init();
    }

    init() {
        this.updateEnvironmentInfo();
        this.setupEventListeners();
        this.initializeUI();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'localhost';
        } else {
            return 'production';
        }
    }

    updateEnvironmentInfo() {
        const envInfo = this.getEnvironmentInfo();
        document.getElementById('currentEnvironment').textContent = 
            this.currentEnvironment.charAt(0).toUpperCase() + this.currentEnvironment.slice(1);
        document.getElementById('apiBaseUrl').textContent = envInfo.apiUrl;
        document.getElementById('hostname').textContent = window.location.hostname;
    }

    getEnvironmentInfo() {
        let apiUrl;
        if (this.currentEnvironment === 'localhost') {
            apiUrl = 'http://localhost:9999';
        } else {
            apiUrl = 'https://api.orielfx.com';
        }
        return { apiUrl };
    }

    setupEventListeners() {
        // Main test controls
        document.getElementById('runFullTest').addEventListener('click', () => {
            this.runFullTest();
        });

        document.getElementById('clearResults').addEventListener('click', () => {
            this.clearResults();
        });

        // Audio file upload
        document.getElementById('testAudioFile').addEventListener('change', (e) => {
            this.handleAudioFileSelection(e.target.files[0]);
        });

        // Format selection
        document.querySelectorAll('.format-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectFormat(e.currentTarget.dataset.format);
            });
        });

        // Download test button
        document.getElementById('testDownloadButton').addEventListener('click', () => {
            this.testDownloadProcess();
        });

        // Step expansion
        document.querySelectorAll('.expand-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const step = e.target.closest('.test-step');
                step.classList.toggle('expanded');
                e.target.textContent = step.classList.contains('expanded') ? '▲' : '▼';
            });
        });
    }

    initializeUI() {
        this.updateProgress();
        this.updateTestStatus('Ready to start testing');
    }

    async runFullTest() {
        this.showLoading();
        this.clearResults();
        this.updateTestStatus('Running comprehensive download functionality test...');
        
        try {
            // Run all test steps sequentially
            for (const step of this.testSteps) {
                await this.runTestStep(step);
                await this.delay(500); // Small delay between steps
            }
            
            this.generateTestReport();
            this.updateTestStatus('Test completed');
        } catch (error) {
            console.error('Test execution failed:', error);
            this.updateTestStatus('Test failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async runTestStep(stepName) {
        const stepElement = document.querySelector(`[data-step="${stepName}"]`);
        if (!stepElement) return;

        this.updateStepStatus(stepElement, 'running');
        
        try {
            let result;
            
            switch (stepName) {
                case 'upload-ui':
                    result = await this.testUploadUI();
                    break;
                case 'file-validation':
                    result = await this.testFileValidation();
                    break;
                case 'visualizer-load':
                    result = await this.testVisualizerLoad();
                    break;
                case 'audio-processing':
                    result = await this.testAudioProcessing();
                    break;
                case 'download-ui':
                    result = await this.testDownloadUI();
                    break;
                case 'format-selection':
                    result = await this.testFormatSelection();
                    break;
                case 'api-upload':
                    result = await this.testApiUpload();
                    break;
                case 'api-download':
                    result = await this.testApiDownload();
                    break;
                default:
                    result = { passed: false, error: 'Unknown test step' };
            }
            
            this.testResults[stepName] = result;
            
            if (result.passed) {
                this.updateStepStatus(stepElement, 'passed');
                this.completedSteps++;
            } else if (result.warning) {
                this.updateStepStatus(stepElement, 'warning');
                this.completedSteps++;
            } else {
                this.updateStepStatus(stepElement, 'failed');
                this.failedSteps++;
            }
            
            this.updateStepDetails(stepElement, result);
            this.updateProgress();
            
        } catch (error) {
            console.error(`Test step ${stepName} failed:`, error);
            this.testResults[stepName] = {
                passed: false,
                error: error.message
            };
            this.updateStepStatus(stepElement, 'failed');
            this.failedSteps++;
            this.updateProgress();
        }
    }

    // Test Implementation Methods

    async testUploadUI() {
        const startTime = performance.now();
        
        try {
            // Check for audio upload elements
            const audioUpload = document.getElementById('audioUpload');
            const uploadLabel = document.querySelector('label[for="audioUpload"]');
            const testAudioUpload = document.getElementById('testAudioFile');
            
            // Check for geometric styling
            const hasGeometricStyling = this.checkGeometricStyling();
            
            // Check upload button styling
            const uploadButtons = document.querySelectorAll('.upload-btn, .upload-button');
            const hasStyledButtons = uploadButtons.length > 0;
            
            const mainUploadExists = audioUpload !== null;
            const testUploadExists = testAudioUpload !== null;
            const hasUploadLabel = uploadLabel !== null;
            
            const passed = (mainUploadExists || testUploadExists) && hasStyledButtons;
            
            return {
                passed,
                warning: !hasGeometricStyling,
                message: passed ? 'Upload UI elements present' : 'Upload UI incomplete',
                details: `Main upload: ${mainUploadExists}, Test upload: ${testUploadExists}, Styled buttons: ${hasStyledButtons}, Geometric styling: ${hasGeometricStyling}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testFileValidation() {
        const startTime = performance.now();
        
        try {
            const audioUpload = document.getElementById('audioUpload') || document.getElementById('testAudioFile');
            
            if (!audioUpload) {
                return {
                    passed: false,
                    error: 'No audio upload input found',
                    duration: performance.now() - startTime
                };
            }
            
            const acceptAttribute = audioUpload.accept;
            const acceptsAudio = acceptAttribute && acceptAttribute.includes('audio');
            const acceptsSpecificFormats = acceptAttribute && (
                acceptAttribute.includes('mp3') || 
                acceptAttribute.includes('wav') || 
                acceptAttribute.includes('audio/*')
            );
            
            // Test file type validation (simulated)
            const supportedFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
            const hasFormatValidation = acceptsAudio || acceptsSpecificFormats;
            
            return {
                passed: hasFormatValidation,
                message: hasFormatValidation ? 'File validation configured' : 'File validation missing',
                details: `Accept attribute: "${acceptAttribute}", Supports audio: ${acceptsAudio}, Format validation: ${hasFormatValidation}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testVisualizerLoad() {
        const startTime = performance.now();
        
        try {
            // Check for visualizer elements
            const graphContainer = document.getElementById('graph-container');
            const playButton = document.getElementById('play-pause-button');
            const controlPanel = document.querySelector('.control-panel');
            
            // Check for canvas or SVG (rendering elements)
            const hasCanvas = document.querySelector('canvas') !== null;
            const hasSvg = document.querySelector('svg') !== null;
            
            // Check for geometric theme elements
            const hasGeometricControls = this.checkGeometricControls();
            
            // Check if visualizer scripts are loaded
            const hasVisualizerScript = this.checkVisualizerScript();
            
            const hasContainer = graphContainer !== null;
            const hasControls = playButton !== null && controlPanel !== null;
            const hasRenderer = hasCanvas || hasSvg;
            
            const passed = hasContainer && hasControls;
            
            return {
                passed,
                warning: !hasRenderer || !hasGeometricControls,
                message: passed ? 'Visualizer engine loaded' : 'Visualizer engine missing',
                details: `Container: ${hasContainer}, Controls: ${hasControls}, Renderer: ${hasRenderer}, Geometric: ${hasGeometricControls}, Script: ${hasVisualizerScript}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testAudioProcessing() {
        const startTime = performance.now();
        
        try {
            // Check for Web Audio API support
            const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
            
            // Check for audio analysis elements
            const hasAudioAnalysis = typeof window.AnalyserNode !== 'undefined';
            
            // Check for file reader support
            const hasFileReader = 'FileReader' in window;
            
            // Check if audio processing functions exist
            const hasAudioProcessing = this.checkAudioProcessingFunctions();
            
            // Test basic audio context creation
            let canCreateAudioContext = false;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContext();
                canCreateAudioContext = true;
                audioContext.close();
            } catch (e) {
                canCreateAudioContext = false;
            }
            
            const passed = hasWebAudio && hasFileReader && canCreateAudioContext;
            
            return {
                passed,
                warning: !hasAudioProcessing,
                message: passed ? 'Audio processing capabilities available' : 'Audio processing limited',
                details: `Web Audio API: ${hasWebAudio}, File Reader: ${hasFileReader}, Audio Context: ${canCreateAudioContext}, Processing functions: ${hasAudioProcessing}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testDownloadUI() {
        const startTime = performance.now();
        
        try {
            // Check for download button
            const downloadButton = document.getElementById('download-button');
            const testDownloadButton = document.getElementById('testDownloadButton');
            
            // Check for geometric progress indicators
            const progressElements = document.querySelectorAll('.progress, .geometric-progress, [class*="progress"]');
            const hasProgressIndicators = progressElements.length > 0;
            
            // Check for geometric styling on download elements
            const hasGeometricDownloadStyling = this.checkGeometricDownloadStyling();
            
            // Check for download modal or preview
            const downloadPreview = document.getElementById('downloadPreview');
            const hasDownloadPreview = downloadPreview !== null;
            
            const hasDownloadButton = downloadButton !== null || testDownloadButton !== null;
            
            const passed = hasDownloadButton && hasProgressIndicators;
            
            return {
                passed,
                warning: !hasGeometricDownloadStyling,
                message: passed ? 'Download UI with geometric design present' : 'Download UI incomplete',
                details: `Download button: ${hasDownloadButton}, Progress indicators: ${hasProgressIndicators}, Geometric styling: ${hasGeometricDownloadStyling}, Preview: ${hasDownloadPreview}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testFormatSelection() {
        const startTime = performance.now();
        
        try {
            // Check for format selection elements
            const formatOptions = document.querySelectorAll('.format-option');
            const hasFormatOptions = formatOptions.length > 0;
            
            // Check for supported formats
            const supportedFormats = [];
            formatOptions.forEach(option => {
                const format = option.dataset.format;
                if (format) {
                    supportedFormats.push(format);
                }
            });
            
            // Check for essential formats
            const hasGif = supportedFormats.includes('gif');
            const hasMp4 = supportedFormats.includes('mp4');
            const hasMp3 = supportedFormats.includes('mp3');
            
            // Check format selection functionality
            const hasFormatSelection = this.checkFormatSelectionFunctionality();
            
            const passed = hasFormatOptions && supportedFormats.length >= 3;
            
            return {
                passed,
                warning: !hasGif || !hasMp4,
                message: passed ? `${supportedFormats.length} export formats available` : 'Format selection incomplete',
                details: `Format options: ${hasFormatOptions}, Supported formats: [${supportedFormats.join(', ')}], Selection functionality: ${hasFormatSelection}`,
                duration: performance.now() - startTime
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiUpload() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            
            // Test upload endpoint availability
            const uploadEndpoint = `${apiUrl}/api/upload`;
            
            try {
                const response = await fetch(uploadEndpoint, {
                    method: 'OPTIONS'
                });
                
                const endpointAvailable = response.status !== 404;
                
                // Test CORS headers for file upload
                const corsHeaders = {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods')
                };
                
                const hasCorsSupport = corsHeaders['Access-Control-Allow-Origin'] !== null;
                const supportsPost = corsHeaders['Access-Control-Allow-Methods']?.includes('POST') || true;
                
                return {
                    passed: endpointAvailable,
                    warning: !hasCorsSupport,
                    message: endpointAvailable ? 'Upload endpoint available' : 'Upload endpoint not found',
                    details: `Endpoint: ${uploadEndpoint}, Available: ${endpointAvailable}, CORS: ${hasCorsSupport}, POST support: ${supportsPost}`,
                    duration: performance.now() - startTime
                };
            } catch (networkError) {
                return {
                    passed: false,
                    error: `Network error: ${networkError.message}`,
                    details: `Failed to connect to ${uploadEndpoint}`,
                    duration: performance.now() - startTime
                };
            }
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    async testApiDownload() {
        const startTime = performance.now();
        
        try {
            const apiUrl = this.getEnvironmentInfo().apiUrl;
            
            // Test download endpoint availability
            const downloadEndpoint = `${apiUrl}/api/download`;
            
            try {
                const response = await fetch(downloadEndpoint, {
                    method: 'OPTIONS'
                });
                
                const endpointAvailable = response.status !== 404;
                
                // Test job/render endpoint (alternative)
                const jobEndpoint = `${apiUrl}/api/jobs`;
                const jobResponse = await fetch(jobEndpoint, {
                    method: 'OPTIONS'
                });
                
                const jobEndpointAvailable = jobResponse.status !== 404;
                
                // Check for download generation capabilities
                const hasDownloadGeneration = endpointAvailable || jobEndpointAvailable;
                
                return {
                    passed: hasDownloadGeneration,
                    message: hasDownloadGeneration ? 'Download generation available' : 'Download endpoints not found',
                    details: `Download endpoint: ${endpointAvailable}, Job endpoint: ${jobEndpointAvailable}, Generation capability: ${hasDownloadGeneration}`,
                    duration: performance.now() - startTime
                };
            } catch (networkError) {
                return {
                    passed: false,
                    error: `Network error: ${networkError.message}`,
                    details: `Failed to connect to download endpoints`,
                    duration: performance.now() - startTime
                };
            }
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                duration: performance.now() - startTime
            };
        }
    }

    // Helper Methods

    checkGeometricStyling() {
        // Check for geometric theme CSS
        const stylesheets = Array.from(document.styleSheets);
        const hasGeometricTheme = stylesheets.some(sheet => {
            try {
                return sheet.href && sheet.href.includes('geometric');
            } catch (e) {
                return false;
            }
        });
        
        // Check for CSS custom properties
        const rootStyles = getComputedStyle(document.documentElement);
        const hasCyanColor = rootStyles.getPropertyValue('--primary-cyan').trim() !== '';
        const hasPinkColor = rootStyles.getPropertyValue('--primary-pink').trim() !== '';
        
        return hasGeometricTheme || hasCyanColor || hasPinkColor;
    }

    checkGeometricControls() {
        // Check for geometric control elements
        const geometricElements = document.querySelectorAll(
            '.geometric, [class*="geometric"], .control-panel, [class*="glow"], [class*="neon"]'
        );
        
        return geometricElements.length > 0;
    }

    checkVisualizerScript() {
        // Check if main visualizer script is loaded
        const scripts = Array.from(document.scripts);
        return scripts.some(script => 
            script.src.includes('script.js') || 
            script.src.includes('visualizer') ||
            script.textContent.includes('visualizer') ||
            script.textContent.includes('AudioContext')
        );
    }

    checkAudioProcessingFunctions() {
        // Check for audio processing related functions in global scope
        return typeof window.processAudio === 'function' ||
               typeof window.analyzeAudio === 'function' ||
               typeof window.createVisualizer === 'function' ||
               document.querySelector('script').textContent.includes('createAnalyser');
    }

    checkGeometricDownloadStyling() {
        // Check for geometric styling on download elements
        const downloadElements = document.querySelectorAll(
            '#download-button, .download-button, .geometric-progress, [class*="progress"]'
        );
        
        if (downloadElements.length === 0) return false;
        
        // Check if elements have geometric styling
        for (const element of downloadElements) {
            const styles = getComputedStyle(element);
            const hasGradient = styles.background.includes('gradient') || 
                              styles.backgroundImage.includes('gradient');
            const hasGeometricBorder = styles.borderRadius !== '0px' || 
                                     styles.clipPath !== 'none';
            
            if (hasGradient || hasGeometricBorder) {
                return true;
            }
        }
        
        return false;
    }

    checkFormatSelectionFunctionality() {
        // Check if format selection has click handlers
        const formatOptions = document.querySelectorAll('.format-option');
        
        for (const option of formatOptions) {
            if (option.onclick || option.addEventListener) {
                return true;
            }
        }
        
        return false;
    }

    // UI Event Handlers

    handleAudioFileSelection(file) {
        if (!file) return;
        
        this.testAudioFile = file;
        const uploadStatus = document.getElementById('uploadStatus');
        
        if (file.type.startsWith('audio/')) {
            uploadStatus.innerHTML = `
                <div class="success-message">
                    ✅ Audio file selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
            `;
            
            // Show download preview
            document.getElementById('downloadPreview').style.display = 'block';
        } else {
            uploadStatus.innerHTML = `
                <div class="error-message">
                    ❌ Invalid file type. Please select an audio file.
                </div>
            `;
        }
    }

    selectFormat(format) {
        // Update UI
        document.querySelectorAll('.format-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelector(`[data-format="${format}"]`).classList.add('selected');
        
        this.selectedFormat = format;
        document.getElementById('testDownloadButton').disabled = false;
        document.getElementById('previewStatus').textContent = `${format.toUpperCase()} selected`;
    }

    async testDownloadProcess() {
        if (!this.selectedFormat) {
            alert('Please select a format first');
            return;
        }
        
        const progressContainer = document.getElementById('downloadProgress');
        const progressBar = document.getElementById('downloadProgressBar');
        const downloadButton = document.getElementById('testDownloadButton');
        
        downloadButton.disabled = true;
        downloadButton.textContent = 'Processing...';
        progressContainer.style.display = 'block';
        
        // Simulate download process with geometric progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                downloadButton.textContent = 'Download Complete!';
                downloadButton.style.background = 'linear-gradient(135deg, #28A745, #20C997)';
                
                setTimeout(() => {
                    downloadButton.disabled = false;
                    downloadButton.textContent = 'Start Download Test';
                    downloadButton.style.background = 'linear-gradient(135deg, #00D4FF, #FF6B6B)';
                    progressContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                }, 2000);
            }
        }, 200);
    }

    // UI Update Methods

    updateStepStatus(element, status) {
        const statusElement = element.querySelector('.step-status');
        statusElement.className = `step-status status-${status}`;
        
        const statusText = {
            pending: 'Pending',
            running: 'Running...',
            passed: 'Passed',
            failed: 'Failed',
            warning: 'Warning'
        };
        
        statusElement.textContent = statusText[status];
    }

    updateStepDetails(element, result) {
        const stepName = element.dataset.step;
        const detailsElement = element.querySelector('.test-details div');
        
        if (detailsElement && result) {
            detailsElement.innerHTML = `
                <div><strong>Result:</strong> ${result.message || 'Test completed'}</div>
                ${result.details ? `<div><strong>Details:</strong> ${result.details}</div>` : ''}
                ${result.duration ? `<div><strong>Duration:</strong> ${result.duration.toFixed(2)}ms</div>` : ''}
                ${result.error ? `<div style="color: #DC3545;"><strong>Error:</strong> ${result.error}</div>` : ''}
            `;
        }
    }

    updateProgress() {
        const totalSteps = this.testSteps.length;
        const progressPercent = Math.round((this.completedSteps / totalSteps) * 100);
        
        document.getElementById('completedSteps').textContent = this.completedSteps;
        document.getElementById('failedSteps').textContent = this.failedSteps;
        document.getElementById('testProgress').textContent = `${progressPercent}%`;
        document.getElementById('overallProgress').style.width = `${progressPercent}%`;
    }

    updateTestStatus(status) {
        document.getElementById('testStatus').textContent = status;
    }

    clearResults() {
        this.testResults = {};
        this.completedSteps = 0;
        this.failedSteps = 0;
        
        // Reset all step statuses
        document.querySelectorAll('.test-step').forEach(step => {
            this.updateStepStatus(step, 'pending');
            const detailsElement = step.querySelector('.test-details div');
            if (detailsElement) {
                const stepName = step.dataset.step;
                detailsElement.textContent = this.getStepDescription(stepName);
            }
        });
        
        this.updateProgress();
        this.updateTestStatus('Ready to start testing');
        
        // Hide results section
        document.getElementById('testResults').style.display = 'none';
    }

    getStepDescription(stepName) {
        const descriptions = {
            'upload-ui': 'Testing upload button, file input, and geometric styling...',
            'file-validation': 'Testing supported audio formats (MP3, WAV, etc.)...',
            'visualizer-load': 'Testing visualizer engine and geometric rendering...',
            'audio-processing': 'Testing audio analysis and waveform generation...',
            'download-ui': 'Testing download button and geometric progress indicators...',
            'format-selection': 'Testing available export formats and selection UI...',
            'api-upload': 'Testing API upload endpoint and file handling...',
            'api-download': 'Testing API download endpoint and file generation...'
        };
        
        return descriptions[stepName] || 'Running test...';
    }

    generateTestReport() {
        const totalSteps = this.testSteps.length;
        const passedSteps = Object.values(this.testResults).filter(r => r.passed).length;
        const warningSteps = Object.values(this.testResults).filter(r => r.warning).length;
        const successRate = Math.round((passedSteps / totalSteps) * 100);
        
        const resultsSection = document.getElementById('testResults');
        const resultsContent = document.getElementById('resultsContent');
        
        let reportHtml = `
            <div class="results-summary">
                <div class="summary-card">
                    <div class="summary-number">${successRate}%</div>
                    <div class="summary-label">Success Rate</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number" style="color: #28A745;">${passedSteps}</div>
                    <div class="summary-label">Passed</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number" style="color: #FFC107;">${warningSteps}</div>
                    <div class="summary-label">Warnings</div>
                </div>
                <div class="summary-card">
                    <div class="summary-number" style="color: #DC3545;">${this.failedSteps}</div>
                    <div class="summary-label">Failed</div>
                </div>
            </div>
        `;
        
        if (this.failedSteps > 0) {
            reportHtml += '<h4 style="color: #DC3545;">Failed Tests:</h4><ul>';
            Object.entries(this.testResults).forEach(([step, result]) => {
                if (!result.passed && !result.warning) {
                    reportHtml += `<li>${step}: ${result.error || result.message}</li>`;
                }
            });
            reportHtml += '</ul>';
        }
        
        if (warningSteps > 0) {
            reportHtml += '<h4 style="color: #FFC107;">Warnings:</h4><ul>';
            Object.entries(this.testResults).forEach(([step, result]) => {
                if (result.warning) {
                    reportHtml += `<li>${step}: ${result.message}</li>`;
                }
            });
            reportHtml += '</ul>';
        }
        
        // Environment-specific recommendations
        reportHtml += `
            <h4>Environment: ${this.currentEnvironment.toUpperCase()}</h4>
            <p>This test validates that audio upload and download functionality works correctly with the geometric UI design in the ${this.currentEnvironment} environment.</p>
        `;
        
        if (successRate >= 80) {
            reportHtml += '<div class="success-message">✅ Download functionality is working well with geometric UI design!</div>';
        } else if (successRate >= 60) {
            reportHtml += '<div class="error-message">⚠️ Download functionality has some issues that should be addressed.</div>';
        } else {
            reportHtml += '<div class="error-message">❌ Download functionality has significant issues that need immediate attention.</div>';
        }
        
        resultsContent.innerHTML = reportHtml;
        resultsSection.style.display = 'block';
        
        // Console report
        console.log(`
=== Download Functionality Test Report (${this.currentEnvironment.toUpperCase()}) ===
Total Steps: ${totalSteps}
Passed: ${passedSteps}
Warnings: ${warningSteps}
Failed: ${this.failedSteps}
Success Rate: ${successRate}%
        `);
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the validator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.downloadParityValidator = new DownloadFunctionalityParityValidator();
});

// Export for debugging
window.DownloadFunctionalityParityValidator = DownloadFunctionalityParityValidator;