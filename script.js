document.addEventListener('DOMContentLoaded', async () => {
    // --- Get all elements ---
    const playPauseButton = document.getElementById('play-pause-button');
    const audioElement = document.getElementById('background-music');
    const glowColorInput = document.getElementById('glowColor');
    const pulseInput = document.getElementById('pulse');
    const downloadButton = document.getElementById('download-button');
    const audioUploadInput = document.getElementById('audioUpload');
    const randomizeButton = document.getElementById('randomize-button');
    const shapeSelector = document.querySelector('.shape-selector');
    const progressModal = document.getElementById('progress-modal');
    const progressBarInner = document.getElementById('progress-bar-inner');
    const downloadsRemainingText = document.getElementById('downloads-remaining');
    const modalStatus = document.getElementById('modal-status');
    const bmacButton = document.getElementById('bmac-button');
    const bmacQrcode = document.getElementById('bmac-qrcode');

    // New elements from the refactored modal
    const closeModalBtn = document.getElementById('close-modal-btn');
    const choiceView = document.getElementById('choice-view');
    const progressView = document.getElementById('progress-view');
    const downloadGifButton = document.getElementById('download-gif-button');
    const downloadMp3Button = document.getElementById('download-mp3-button');

    let audioContext;
    let audioInitialized = false;
    let isAnimationPaused = false;

    // --- Wait for SaaS System Initialization ---
    console.log('🎵 Oriel FX - Waiting for SaaS system initialization...');
    
    try {
        // Wait for SaaS initialization to complete
        await window.saasInitializer.waitForInitialization();
        console.log('✅ SaaS system initialized successfully');
        
        // Get initialized components
        const components = window.saasInitializer.getStatus();
        console.log('📊 Available components:', components.components);
        
    } catch (error) {
        console.error('❌ SaaS initialization failed:', error);
        // Continue with basic functionality
        console.log('⚠️ Continuing with basic functionality only');
    }

    // --- ANIMATION PAUSE CONTROL ---
    window.setAnimationPaused = function(paused) {
        isAnimationPaused = paused;
        // This will be used by the graph.js file to pause/resume animation
        if (window.pauseAnimation) {
            window.pauseAnimation(paused);
        }
    };

    // --- DOWNLOAD & USAGE LIMIT LOGIC ---
    async function checkDownloadPermission() {
        try {
            if (window.paymentIntegration) {
                return await window.paymentIntegration.checkDownloadPermission();
            }
            
            // Fallback logic for when payment integration is not available
            if (window.usageTracker) {
                return await window.usageTracker.canUserDownload();
            }
            
            // Basic fallback
            const count = localStorage.getItem('orielFxDownloads');
            const remaining = count === null ? 3 : parseInt(count);
            
            if (remaining <= 0) {
                if (window.notifications) {
                    window.notifications.show('Free download limit reached. Sign up for more downloads!', 'warning');
                }
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking download permission:', error);
            return false;
        }
    }
    
    async function trackDownload(downloadType, metadata = {}) {
        try {
            if (window.usageTracker) {
                return await window.usageTracker.trackDownload(downloadType, metadata);
            }
            
            // Fallback to local storage
            const count = localStorage.getItem('orielFxDownloads');
            const remaining = count === null ? 3 : parseInt(count);
            localStorage.setItem('orielFxDownloads', Math.max(0, remaining - 1));
            
            updateDownloadCounter();
            return { success: true };
        } catch (error) {
            console.error('Failed to track download:', error);
            throw error;
        }
    }
    
    function updateDownloadCounter() {
        // Update downloads remaining display
        if (window.authUI) {
            window.authUI.updateUI();
        } else if (downloadsRemainingText) {
            // Fallback display
            const count = localStorage.getItem('orielFxDownloads');
            const remaining = count === null ? 3 : parseInt(count);
            downloadsRemainingText.textContent = `${remaining} free downloads remaining.`;
        }
    }

    // --- MODAL CONTROL LOGIC ---
    downloadButton.addEventListener('click', async () => {
        // Check download permission first
        const canDownload = await checkDownloadPermission();
        if (!canDownload) {
            return; // Permission check will handle showing appropriate messages/modals
        }
        
        // Reset the modal to show the initial choices
        choiceView.classList.remove('hidden');
        progressView.classList.add('hidden');
        progressModal.classList.remove('modal-hidden');
        
        // Update modal based on user's plan
        updateDownloadModalForUserPlan();
    });

    closeModalBtn.addEventListener('click', () => {
        progressModal.classList.add('modal-hidden');
    });
    
    // --- UPDATE MODAL FOR USER PLAN ---
    function updateDownloadModalForUserPlan() {
        try {
            // Get user's plan and available features
            const userPlan = window.authManager?.getCurrentUser()?.plan || 'free';
            const maxRecordingTime = window.featureManager?.getMaxRecordingTime() || 30;
            const availableFormats = window.featureManager?.getAvailableExportFormats() || ['gif', 'mp3'];
            
            // Update modal buttons based on available formats
            const modalButtons = document.querySelector('.modal-buttons');
            if (modalButtons) {
                modalButtons.innerHTML = '';
                
                // Create buttons for each available format
                availableFormats.forEach(format => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'modal-button';
                    
                    switch (format) {
                        case 'gif':
                            button.id = 'download-gif-button';
                            button.textContent = `Download GIF (${maxRecordingTime}s)`;
                            button.addEventListener('click', async () => {
                                await startIntegratedRecording('gif');
                            });
                            break;
                        case 'mp4':
                            button.id = 'download-mp4-button';
                            button.textContent = `Download MP4 (${maxRecordingTime}s)`;
                            button.addEventListener('click', async () => {
                                await startIntegratedRecording('mp4');
                            });
                            break;
                        case 'webm':
                            button.id = 'download-webm-button';
                            button.textContent = `Download WebM (${maxRecordingTime}s)`;
                            button.addEventListener('click', async () => {
                                await startIntegratedRecording('webm');
                            });
                            break;
                        case 'mov':
                            button.id = 'download-mov-button';
                            button.textContent = `Download MOV (${maxRecordingTime}s)`;
                            button.addEventListener('click', async () => {
                                await startIntegratedRecording('mov');
                            });
                            break;
                        case 'mp3':
                            // Skip MP3 for video formats - this is audio only
                            return;
                        default:
                            button.textContent = `Download ${format.toUpperCase()}`;
                            button.addEventListener('click', async () => {
                                await startIntegratedRecording(format);
                            });
                    }
                    
                    modalButtons.appendChild(button);
                });
                
                // Add audio download button separately if needed
                if (availableFormats.includes('mp3')) {
                    const audioButton = document.createElement('button');
                    audioButton.type = 'button';
                    audioButton.className = 'modal-button';
                    audioButton.id = 'download-mp3-button';
                    audioButton.textContent = 'Download Audio (MP3)';
                    audioButton.addEventListener('click', async () => {
                        await downloadAudioFile();
                    });
                    modalButtons.appendChild(audioButton);
                }
            }
            
            // Update modal title based on user plan
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                if (userPlan === 'free') {
                    modalTitle.innerHTML = `
                        Choose Download Format
                        <small style="display: block; font-size: 0.8em; color: #888; margin-top: 5px;">
                            Upgrade for longer recordings and more formats
                        </small>
                    `;
                } else {
                    modalTitle.innerHTML = `
                        Choose Download Format
                        <small style="display: block; font-size: 0.8em; color: #8309D5; margin-top: 5px;">
                            ${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan - ${availableFormats.length} formats available
                        </small>
                    `;
                }
            }
            
        } catch (error) {
            console.error('Error updating download modal:', error);
        }
    }

    // --- GIF DOWNLOAD LOGIC ---
    downloadGifButton.addEventListener('click', async () => {
        try {
            // Start recording with integrated system
            await startIntegratedRecording('gif');
            
        } catch (error) {
            console.error('Error starting GIF recording:', error);
            
            // Show error message
            if (window.notifications) {
                window.notifications.show('Failed to start recording. Please try again.', 'error');
            } else {
                alert('Failed to start recording. Please try again.');
            }
            
            // Reset modal state
            progressModal.classList.add('modal-hidden');
        }
    });

    // --- INTEGRATED RECORDING FUNCTION ---
    async function startIntegratedRecording(format) {
        // Show progress view
        choiceView.classList.add('hidden');
        progressView.classList.remove('hidden');

        try {
            // Get recording parameters based on user's plan
            const maxDuration = window.featureManager?.getMaxRecordingTime() || 30;
            const quality = window.featureManager?.getCurrentUserPlan() === 'free' ? 'standard' : 'high';
            
            // Prepare download metadata
            const downloadMetadata = {
                format: format,
                duration: maxDuration,
                quality: quality,
                timestamp: new Date().toISOString()
            };

            // Update modal text with dynamic duration
            modalStatus.textContent = `Recording for ${maxDuration} seconds...`;
            progressBarInner.style.width = '0%';

            // Use premium recording if available, otherwise fallback
            if (window.premiumRecording) {
                await startPremiumRecording(format, maxDuration, downloadMetadata);
            } else {
                await startLegacyRecording(format, maxDuration, downloadMetadata);
            }

        } catch (error) {
            console.error('Recording failed:', error);
            modalStatus.textContent = 'Recording failed. Please try again.';
            
            setTimeout(() => {
                progressModal.classList.add('modal-hidden');
            }, 2000);
            
            throw error;
        }
    }

    // Premium recording function
    async function startPremiumRecording(format, maxDuration, downloadMetadata) {
        try {
            // Start premium recording
            const recordingStarted = await window.premiumRecording.startRecording(format, {
                duration: maxDuration,
                onProgress: (progress) => {
                    const percentage = Math.round(progress * 100);
                    progressBarInner.style.width = `${percentage}%`;
                    modalStatus.textContent = `Processing... ${percentage}%`;
                }
            });

            if (!recordingStarted) {
                throw new Error('Failed to start premium recording');
            }

            // Start audio if not playing
            if (!audioInitialized || (audioContext && audioContext.state === 'suspended')) {
                window.togglePlayPause();
            }

            // Set up completion handler
            const recordingInterval = setInterval(async () => {
                const status = window.premiumRecording.getRecordingStatus();
                
                if (!status.isRecording) {
                    clearInterval(recordingInterval);
                    
                    try {
                        modalStatus.textContent = 'Finalizing... Download will begin shortly.';
                        
                        // Track the successful download
                        await trackDownload(format, downloadMetadata);
                        
                        // Update UI to reflect new usage
                        updateDownloadCounter();
                        
                        // Show success message
                        if (window.notifications) {
                            window.notifications.show('Recording completed successfully!', 'success');
                        }
                        
                        // Close modal after a delay
                        setTimeout(() => {
                            progressModal.classList.add('modal-hidden');
                        }, 2000);
                        
                    } catch (error) {
                        console.error('Error finalizing download:', error);
                        modalStatus.textContent = 'Download completed with warnings.';
                        
                        setTimeout(() => {
                            progressModal.classList.add('modal-hidden');
                        }, 2000);
                    }
                } else {
                    // Update progress
                    const progress = status.elapsed / status.maxDuration;
                    const percentage = Math.round(progress * 100);
                    progressBarInner.style.width = `${percentage}%`;
                    
                    const remaining = Math.max(0, status.maxDuration - status.elapsed);
                    modalStatus.textContent = `Recording... ${Math.ceil(remaining)}s remaining`;
                }
            }, 500);
            
        } catch (error) {
            console.error('Premium recording failed:', error);
            throw error;
        }
    }

    // Legacy recording fallback
    async function startLegacyRecording(format, maxDuration, downloadMetadata) {
        try {
            // Start the capture process
            window.capturer = new CCapture({
                format: format, 
                workersPath: 'assets/', 
                framerate: 30,
                onProgress: (progress) => {
                    const percentage = Math.round(progress * 100);
                    progressBarInner.style.width = `${percentage}%`;
                    modalStatus.textContent = `Processing... ${percentage}%`;
                }
            });
            
            progressBarInner.style.width = '0%';
            modalStatus.textContent = `Recording for ${maxDuration} seconds...`;
            capturer.start();
            
            // Start audio if not playing
            if (!audioInitialized || (audioContext && audioContext.state === 'suspended')) {
                window.togglePlayPause();
            }
            
            // Record for specified duration then finalize
            setTimeout(async () => {
                try {
                    capturer.stop();
                    modalStatus.textContent = 'Finalizing... Download will begin shortly.';
                    capturer.save();
                    
                    // Track the successful download
                    await trackDownload(format, downloadMetadata);
                    
                    // Update UI to reflect new usage
                    updateDownloadCounter();
                    
                    // Show success message
                    if (window.notifications) {
                        window.notifications.show('Recording completed successfully!', 'success');
                    }
                    
                    // Close modal after a delay
                    setTimeout(() => {
                        progressModal.classList.add('modal-hidden');
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error finalizing download:', error);
                    modalStatus.textContent = 'Download completed with warnings.';
                    
                    setTimeout(() => {
                        progressModal.classList.add('modal-hidden');
                    }, 2000);
                }
            }, maxDuration * 1000);
            
        } catch (error) {
            console.error('Legacy recording failed:', error);
            throw error;
        }
    }

    // --- AUDIO DOWNLOAD FUNCTION ---
    async function downloadAudioFile() {
        try {
            // Prepare download metadata
            const downloadMetadata = {
                format: 'mp3',
                duration: 0, // MP3 downloads don't have duration limits
                quality: 'standard',
                timestamp: new Date().toISOString(),
                fileSize: 'unknown'
            };
            
            // Perform the download
            const link = document.createElement('a');
            link.href = audioElement.src;
            link.download = 'Oriel_FX_Audio.mp3';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Track the successful download (non-blocking)
            try {
                await trackDownload('mp3', downloadMetadata);
            } catch (error) {
                console.warn('Download tracking failed, but download succeeded:', error);
                // Don't fail the download if tracking fails
            }
            
            // Update UI to reflect new usage
            updateDownloadCounter();
            
            // Close modal
            progressModal.classList.add('modal-hidden');
            
            // Show success message
            if (window.notifications) {
                window.notifications.show('MP3 download started successfully!', 'success');
            } else {
                alert('MP3 download started successfully!');
            }
            
        } catch (error) {
            console.error('Error downloading MP3:', error);
            
            // Show error message
            if (window.notifications) {
                window.notifications.show('Failed to download MP3. Please try again.', 'error');
            } else {
                alert('Failed to download MP3. Please try again.');
            }
            
            // Close modal
            progressModal.classList.add('modal-hidden');
        }
    }

    // --- LEGACY MP3 BUTTON HANDLER (for backward compatibility) ---
    if (downloadMp3Button) {
        downloadMp3Button.addEventListener('click', downloadAudioFile);
    }

    // --- Master list of all available shapes ---
    const allShapes = [
        { id: 'cube', name: 'Cube' }, { id: 'sphere', name: 'Sphere' },
        { id: 'icosahedron', name: 'Crystal' }, { id: 'torus', name: 'Donut' },
        { id: 'dodecahedron', name: 'Gem' }, { id: 'torusKnot', name: 'Knot' },
        { id: 'cone', name: 'Cone' }, { id: 'cylinder', name: 'Cylinder' },
        { id: 'octahedron', name: 'Octahedron' }, { id: 'tetrahedron', name: 'Pyramid' },
        { id: 'ring', name: 'Ring' }, { id: 'plane', name: 'Plane' },
        { id: 'spikySphere', name: 'Spiky' }, { id: 'torusLarge', name: 'Hoop' },
        { id: 'conePointy', name: 'Spire' }, { id: 'crystalTall', name: 'Shard' },
        { id: 'twistedBox', name: 'Twisted Box' }, { id: 'wavyPlane', name: 'Wavy Plane' },
        { id: 'polyStar', name: 'Star' }, { id: 'randomPoly', name: 'Asteroid' }
    ];
    let currentShapes = [];

    // --- Function to update the shape buttons in the UI ---
    function updateShapeButtons() {
        shapeSelector.innerHTML = '';
        let availableShapes = allShapes.filter(shape => !currentShapes.some(current => current.id === shape.id));
        if (availableShapes.length < 3) {
            availableShapes = allShapes;
            currentShapes = [];
        }
        const newRandomShapes = [...availableShapes].sort(() => 0.5 - Math.random()).slice(0, 3);
        currentShapes = newRandomShapes;
        newRandomShapes.forEach(shapeInfo => {
            const button = document.createElement('button');
            button.className = 'shape-btn dynamic-color';
            button.textContent = shapeInfo.name;
            button.setAttribute('data-shape', shapeInfo.id);
            button.style.backgroundColor = glowColorInput.value;
            button.addEventListener('click', () => {
                if (window.config && window.recreateShape) {
                    window.config.shape = shapeInfo.id;
                    window.recreateShape();
                }
            });
            shapeSelector.appendChild(button);
        });
    }

    // --- Play/Pause Logic ---
    window.togglePlayPause = function() {
        // Don't allow play/pause if animation is paused by modal
        if (isAnimationPaused) {
            return;
        }
        
        if (!audioInitialized) {
            audioContext = initAudio();
            audioInitialized = true;
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
            audioElement.play();
            playPauseButton.textContent = "Pause";
            if (window.pauseAnimation) window.pauseAnimation(false);
        } else {
            audioContext.suspend();
            audioElement.pause();
            playPauseButton.textContent = "Play";
            if (window.pauseAnimation) window.pauseAnimation(true);
        }
    };
    playPauseButton.addEventListener('click', window.togglePlayPause);

    // --- Control Panel Listeners ---
    glowColorInput.addEventListener('input', (event) => {
        const newColor = event.target.value;
        if (window.config) {
            window.config.glowColor = parseInt(newColor.replace('#', '0x'));
            document.querySelectorAll('.dynamic-color').forEach(elem => {
                elem.style.backgroundColor = newColor;
            });
        }
    });

    pulseInput.addEventListener('input', (event) => {
        if (window.config) {
            window.config.pulseIntensity = parseFloat(event.target.value);
        }
    });
    
    audioUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (audioContext && audioContext.state === 'running') {
            window.togglePlayPause();
        }
        const fileURL = URL.createObjectURL(file);
        audioElement.src = fileURL;
        audioElement.load();
        playPauseButton.textContent = "Play New Track";
        if (!audioInitialized) {
            audioContext = initAudio();
            audioInitialized = true;
        }
    });

    randomizeButton.addEventListener('click', () => {
        updateShapeButtons();
    });
    
    // --- Buy Me a Coffee Hover Logic ---
    bmacButton.addEventListener('mouseover', () => { bmacQrcode.classList.remove('qrcode-hidden'); });
    bmacButton.addEventListener('mouseout', () => { bmacQrcode.classList.add('qrcode-hidden'); });

    // --- Initial Setup ---
    updateDownloadCounter();
    updateShapeButtons();
    
    // Set up dashboard button handler
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
            if (window.dashboardUI) {
                window.dashboardUI.showDashboard();
            }
        });
    }
    
    // Listen for SaaS system events
    window.addEventListener('oriel_saas_initialized', (event) => {
        console.log('🎉 SaaS system ready, updating UI...');
        updateDownloadCounter();
        updateDownloadModalForUserPlan();
    });
    
    window.addEventListener('oriel_auth_state_changed', () => {
        console.log('🔄 Auth state changed, updating UI...');
        updateDownloadCounter();
        updateDownloadModalForUserPlan();
    });
    
    window.addEventListener('oriel_usage_updated', () => {
        console.log('📊 Usage updated, refreshing counter...');
        updateDownloadCounter();
    });
    
    // Expose download function globally for SaaS integration
    window.downloadAudioFile = downloadAudioFile;
    
    console.log('🎵 Oriel FX main script initialization completed');
});