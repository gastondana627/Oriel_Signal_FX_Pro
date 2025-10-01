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

    // --- Initialize Authentication System ---
    try {
        // Initialize authentication manager
        window.authManager = await AuthManager.initialize();
        
        // Initialize authentication UI
        window.authUI = await AuthUI.initialize();
        
        // Initialize usage tracker
        window.usageTracker = await UsageTracker.initialize();
        
        // Connect AuthUI with UsageTracker
        if (window.authUI && window.usageTracker) {
            window.authUI.setUsageTracker(window.usageTracker);
        }
        
        console.log('Authentication and usage tracking systems initialized successfully');
    } catch (error) {
        console.error('Failed to initialize authentication/usage systems:', error);
        // Continue without authentication features
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
    function getDownloadsRemaining() {
        if (window.usageTracker) {
            return window.usageTracker.getRemainingDownloads();
        }
        
        // Fallback to old logic if usage tracker not available
        const count = localStorage.getItem('orielFxDownloads');
        return count === null ? 3 : parseInt(count);
    }
    
    async function checkDownloadLimits() {
        if (window.usageTracker) {
            return window.usageTracker.canUserDownload();
        }
        
        // Fallback logic
        const remaining = getDownloadsRemaining();
        if (remaining <= 0) {
            return {
                allowed: false,
                reason: 'free_limit',
                message: 'Free download limit reached. Sign up for more downloads!'
            };
        }
        
        return { allowed: true };
    }
    
    async function trackDownload(downloadType, metadata = {}) {
        if (window.usageTracker) {
            try {
                return await window.usageTracker.trackDownload(downloadType, metadata);
            } catch (error) {
                console.error('Failed to track download:', error);
                throw error;
            }
        }
        
        // Fallback to old logic
        useDownloadFallback();
        return { success: true };
    }
    
    function useDownloadFallback() {
        // Legacy fallback for when usage tracker is not available
        if (!window.authManager || !window.authManager.isAuthenticated) {
            let count = getDownloadsRemaining();
            localStorage.setItem('orielFxDownloads', Math.max(0, count - 1));
        }
        updateDownloadCounter();
    }
    
    function updateDownloadCounter() {
        // This function is now handled by the AuthUI component
        // Keep it for backward compatibility but let AuthUI handle the display
        if (window.authUI) {
            window.authUI.updateAnonymousDownloads();
        } else {
            // Fallback for when auth system isn't loaded
            if (downloadsRemainingText) {
                downloadsRemainingText.textContent = `${getDownloadsRemaining()} free downloads remaining.`;
            }
        }
    }
    
    function showUpgradePrompt(reason, message) {
        if (window.usageTracker) {
            window.usageTracker.showUpgradePrompt(reason);
        } else if (window.notificationManager) {
            window.notificationManager.show(message, 'warning');
        } else {
            alert(message);
        }
    }

    // --- MODAL CONTROL LOGIC ---
    downloadButton.addEventListener('click', () => {
        // Reset the modal to show the initial choices
        choiceView.classList.remove('hidden');
        progressView.classList.add('hidden');
        progressModal.classList.remove('modal-hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        progressModal.classList.add('modal-hidden');
    });

    // --- GIF DOWNLOAD LOGIC ---
    downloadGifButton.addEventListener('click', async () => {
        try {
            // Check download limits first
            const canDownload = await checkDownloadLimits();
            if (!canDownload.allowed) {
                showUpgradePrompt(canDownload.reason, canDownload.message);
                return;
            }
            
            // Show progress view
            choiceView.classList.add('hidden');
            progressView.classList.remove('hidden');

            // Prepare download metadata
            const downloadMetadata = {
                format: 'gif',
                duration: 30,
                quality: 'standard',
                timestamp: new Date().toISOString()
            };

            // Start the capture process
            window.capturer = new CCapture({
                format: 'gif', 
                workersPath: 'assets/', 
                framerate: 30,
                onProgress: (progress) => {
                    const percentage = Math.round(progress * 100);
                    progressBarInner.style.width = `${percentage}%`;
                    modalStatus.textContent = `Processing... ${percentage}%`;
                }
            });
            
            progressBarInner.style.width = '0%';
            modalStatus.textContent = 'Recording for 30 seconds...';
            capturer.start();
            
            // Start audio if not playing
            if (!audioInitialized || (audioContext && audioContext.state === 'suspended')) {
                window.togglePlayPause();
            }
            
            // Record for 30 seconds then finalize
            setTimeout(async () => {
                try {
                    capturer.stop();
                    modalStatus.textContent = 'Finalizing... Download will begin shortly.';
                    capturer.save();
                    
                    // Track the successful download
                    await trackDownload('gif', downloadMetadata);
                    
                    // Update UI to reflect new usage
                    updateDownloadCounter();
                    
                    // Close modal after a delay
                    setTimeout(() => {
                        progressModal.classList.add('modal-hidden');
                    }, 4000);
                    
                } catch (error) {
                    console.error('Error finalizing download:', error);
                    modalStatus.textContent = 'Download completed with warnings.';
                    
                    // Still close the modal
                    setTimeout(() => {
                        progressModal.classList.add('modal-hidden');
                    }, 2000);
                }
            }, 30000);
            
        } catch (error) {
            console.error('Error starting GIF download:', error);
            
            // Show error message
            if (window.notificationManager) {
                window.notificationManager.show('Failed to start download. Please try again.', 'error');
            }
            
            // Reset modal state
            progressModal.classList.add('modal-hidden');
        }
    });

    // --- MP3 DOWNLOAD LOGIC ---
    downloadMp3Button.addEventListener('click', async () => {
        try {
            // Check download limits first
            const canDownload = await checkDownloadLimits();
            if (!canDownload.allowed) {
                showUpgradePrompt(canDownload.reason, canDownload.message);
                return;
            }
            
            // Prepare download metadata
            const downloadMetadata = {
                format: 'mp3',
                duration: 0, // MP3 downloads don't have duration limits
                quality: 'standard',
                timestamp: new Date().toISOString(),
                fileSize: 'unknown' // Could be calculated if needed
            };
            
            // Perform the download
            const link = document.createElement('a');
            link.href = audioElement.src;
            link.download = 'Oriel_FX_Audio.mp3';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Track the successful download
            await trackDownload('mp3', downloadMetadata);
            
            // Update UI to reflect new usage
            updateDownloadCounter();
            
            // Close modal
            progressModal.classList.add('modal-hidden');
            
            // Show success message
            if (window.notificationManager) {
                window.notificationManager.show('MP3 download started successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Error downloading MP3:', error);
            
            // Show error message
            if (window.notificationManager) {
                window.notificationManager.show('Failed to download MP3. Please try again.', 'error');
            }
            
            // Close modal
            progressModal.classList.add('modal-hidden');
        }
    });

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
    
    // Update UI after auth system is initialized
    if (window.authUI) {
        window.authUI.updateUI();
    }
});