/**
 * Creative Suite Controller
 * Handles Play/Pause toggle and all interactions
 */

class CreativeSuiteController {
    constructor() {
        this.isPlaying = false;
        this.init();
    }

    init() {
        console.log('🎨 Creative Suite Controller initializing...');
        
        this.setupPlayPauseToggle();
        this.setupShapeSelector();
        this.setupRangeInputs();
        this.setupModalSystem();
        this.setupFileUpload();
        
        console.log('✅ Creative Suite Controller initialized');
    }

    /**
     * Play/Pause Toggle with Icon Change
     */
    setupPlayPauseToggle() {
        const pauseButton = document.getElementById('pause-button');
        
        if (!pauseButton) return;

        pauseButton.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            
            const icon = pauseButton.querySelector('svg');
            const text = pauseButton.querySelector('span');
            
            if (this.isPlaying) {
                // Show Play icon
                icon.innerHTML = `
                    <polygon points="5 3 19 12 5 21 5 3"/>
                `;
                text.textContent = 'Play';
            } else {
                // Show Pause icon
                icon.innerHTML = `
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                `;
                text.textContent = 'Pause';
            }
            
            // Trigger existing play/pause logic
            const playPauseButton = document.getElementById('play-pause-button');
            if (playPauseButton) {
                playPauseButton.click();
            }
        });
    }

    /**
     * Shape Selector
     */
    setupShapeSelector() {
        const shapeButtons = document.querySelectorAll('.shape-btn');
        
        shapeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active from all
                shapeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active to clicked
                button.classList.add('active');
                
                // Dispatch shape change event
                const shape = button.dataset.shape;
                document.dispatchEvent(new CustomEvent('shapeChanged', {
                    detail: { shape }
                }));
                
                console.log('🔷 Shape changed to:', shape);
            });
        });
    }

    /**
     * Range Input Value Display
     */
    setupRangeInputs() {
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        
        rangeInputs.forEach(input => {
            const valueDisplay = document.getElementById(`${input.id}-value`);
            
            if (valueDisplay) {
                input.addEventListener('input', (e) => {
                    valueDisplay.textContent = e.target.value;
                });
            }
        });

        // Color input
        const colorInput = document.getElementById('glowColor');
        const colorValue = document.getElementById('glow-color-value');
        
        if (colorInput && colorValue) {
            colorInput.addEventListener('input', (e) => {
                colorValue.textContent = e.target.value.toUpperCase();
            });
        }
    }

    /**
     * Modal System
     */
    setupModalSystem() {
        // Login modal
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
        
        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', () => {
                this.openModal(loginModal);
            });
        }

        // Register modal
        const registerBtn = document.getElementById('register-btn');
        const registerModal = document.getElementById('register-modal');
        
        if (registerBtn && registerModal) {
            registerBtn.addEventListener('click', () => {
                this.openModal(registerModal);
            });
        }

        // Modal switching
        const showRegisterLink = document.getElementById('show-register-link');
        const showLoginLink = document.getElementById('show-login-link');
        
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(loginModal);
                setTimeout(() => this.openModal(registerModal), 300);
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(registerModal);
                setTimeout(() => this.openModal(loginModal), 300);
            });
        }

        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
                    this.closeModal(modal);
                });
            }
        });
    }

    openModal(modal) {
        if (!modal) return;
        modal.classList.remove('hidden');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"])');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.add('hidden');
    }

    /**
     * File Upload
     */
    setupFileUpload() {
        const fileInput = document.getElementById('audioUpload');
        const uploadLabel = document.querySelector('label[for="audioUpload"]');
        
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('📁 File uploaded:', file.name);
                
                // Update label text temporarily
                if (uploadLabel) {
                    const originalText = uploadLabel.innerHTML;
                    uploadLabel.innerHTML = `<span>✓</span><span>${file.name.substring(0, 15)}...</span>`;
                    
                    setTimeout(() => {
                        uploadLabel.innerHTML = originalText;
                    }, 3000);
                }
            }
        });
    }

    /**
     * Update Downloads Status
     */
    updateDownloadsStatus(remaining) {
        const downloadsText = document.getElementById('downloads-text');
        if (downloadsText) {
            downloadsText.textContent = `${remaining} Free Download${remaining !== 1 ? 's' : ''}`;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.creativeSuite = new CreativeSuiteController();
    });
} else {
    window.creativeSuite = new CreativeSuiteController();
}

console.log('🎨 Creative Suite Controller loaded');
