document.addEventListener('DOMContentLoaded', () => {
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

    // --- DOWNLOAD & USAGE LIMIT LOGIC ---
    function getDownloadsRemaining() {
        const count = localStorage.getItem('orielFxDownloads');
        return count === null ? 3 : parseInt(count);
    }
    function useDownload() {
        let count = getDownloadsRemaining();
        localStorage.setItem('orielFxDownloads', Math.max(0, count - 1));
        updateDownloadCounter();
    }
    function updateDownloadCounter() {
        downloadsRemainingText.textContent = `${getDownloadsRemaining()} free downloads remaining.`;
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
    downloadGifButton.addEventListener('click', () => {
        if (getDownloadsRemaining() <= 0) {
            alert("You've used all your free downloads! Clear browser data to reset for this prototype.");
            return;
        }
        
        choiceView.classList.add('hidden');
        progressView.classList.remove('hidden');

        window.capturer = new CCapture({
            format: 'gif', workersPath: 'assets/', framerate: 30,
            onProgress: (progress) => {
                const percentage = Math.round(progress * 100);
                progressBarInner.style.width = `${percentage}%`;
                modalStatus.textContent = `Processing... ${percentage}%`;
            }
        });
        useDownload();
        progressBarInner.style.width = '0%';
        modalStatus.textContent = 'Recording for 30 seconds...';
        capturer.start();
        if (!audioInitialized || (audioContext && audioContext.state === 'suspended')) {
            window.togglePlayPause();
        }
        setTimeout(() => {
            capturer.stop();
            modalStatus.textContent = 'Finalizing... Download will begin shortly.';
            capturer.save();
            setTimeout(() => {
                progressModal.classList.add('modal-hidden');
            }, 4000);
        }, 30000);
    });

    // --- MP3 DOWNLOAD LOGIC ---
    downloadMp3Button.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = audioElement.src;
        link.download = 'Oriel_FX_Audio.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        progressModal.classList.add('modal-hidden');
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
        if (!audioInitialized) {
            audioContext = initAudio();
            audioInitialized = true;
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
            audioElement.play();
            playPauseButton.textContent = "Pause";
            if (window.setAnimationPaused) window.setAnimationPaused(false);
        } else {
            audioContext.suspend();
            audioElement.pause();
            playPauseButton.textContent = "Play";
            if (window.setAnimationPaused) window.setAnimationPaused(true);
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
});