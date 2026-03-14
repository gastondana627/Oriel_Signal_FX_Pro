/**
 * Professional Creative Tool Controller
 * Handles interactions, drag & drop, and UI state management
 */

class ProfessionalToolController {
    constructor() {
        this.init();
    }

    init() {
        console.log('🎨 Professional Tool Controller initializing...');
        
        this.setupDragAndDrop();
        this.setupShapeSelector();
        this.setupRangeInputs();
        this.setupModalSystem();
        this.setupTransportControls();
        this.setupKeyboardShortcuts();
        
        console.log('✅ Professional Tool Controller initialized');
    }

    /**
     * Drag & Drop File Upload
     */
    setupDragAndDrop() {
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('audioUpload');

        if (!uploadZone || !fileInput) return;

        // Click to browse
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => {
                uploadZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => {
                uploadZone.classList.remove('dragover');
            });
        });

        // Handle drop
        uploadZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    handleFileUpload(file) {
        if (!file.type.startsWith('audio/')) {
            this.showNotification('Please select an audio file', 'error');
            return;
        }

        console.log('📁 File uploaded:', file.name);
        
        // Update upload zone text
        const uploadZone = document.getElementById('upload-zone');
        const uploadText = uploadZone.querySelector('.upload-text');
        if (uploadText) {
            uploadText.textContent = file.name;
            setTimeout(() => {
                uploadText.textContent = 'Drop audio file here';
            }, 3000);
        }

        // Trigger audio loading (handled by script.js)
        const audioInput = document.getElementById('audioUpload');
        if (audioInput && audioInput.dispatchEvent) {
            audioInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    /**
     * Shape Selector - Segmented Control
     */
    setupShapeSelector() {
        const shapeButtons = document.querySelectorAll('.shape-button');
        
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
     * Transport Controls
     */
    setupTransportControls() {
        const playButton = document.getElementById('play-pause-button');
        
        if (playButton) {
            playButton.addEventListener('click', () => {
                // Toggle play/pause icon
                const svg = playButton.querySelector('svg');
                const isPlaying = playButton.dataset.playing === 'true';
                
                if (isPlaying) {
                    // Show play icon
                    svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
                    playButton.dataset.playing = 'false';
                } else {
                    // Show pause icon
                    svg.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
                    playButton.dataset.playing = 'true';
                }
            });
        }
    }

    /**
     * Keyboard Shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    document.getElementById('play-pause-button')?.click();
                    break;
                case 'r':
                    document.getElementById('randomize-button')?.click();
                    break;
                case 'd':
                    document.getElementById('download-button')?.click();
                    break;
                case 'u':
                    document.getElementById('audioUpload')?.click();
                    break;
            }
        });
    }

    /**
     * Notification System
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            padding: 16px 24px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'error') {
            notification.style.borderColor = '#ff00ff';
        } else if (type === 'success') {
            notification.style.borderColor = '#00f5ff';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Update Downloads Status
     */
    updateDownloadsStatus(remaining) {
        const statusText = document.getElementById('downloads-remaining-text');
        if (statusText) {
            statusText.textContent = `${remaining} Download${remaining !== 1 ? 's' : ''} Remaining`;
        }
    }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.professionalTool = new ProfessionalToolController();
    });
} else {
    window.professionalTool = new ProfessionalToolController();
}

console.log('🎨 Professional Tool Controller loaded');
