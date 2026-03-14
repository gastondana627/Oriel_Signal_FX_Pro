/**
 * Premium UI Controller
 * Handles modal layering, animations, and intuitive interactions
 */

class PremiumUIController {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        this.setupModalSystem();
        this.setupAnimations();
        this.setupKeyboardShortcuts();
        this.setupAccessibility();
    }

    /**
     * Modal System - Proper Layering and Focus Management
     */
    setupModalSystem() {
        // Get all modals
        const modals = document.querySelectorAll('.auth-modal');
        
        modals.forEach(modal => {
            // Close button
            const closeBtn = modal.querySelector('.close-button');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(modal));
            }

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });

            // Prevent clicks inside modal from closing
            const modalContent = modal.querySelector('.auth-modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });

        // Setup modal triggers
        this.setupModalTriggers();
    }

    setupModalTriggers() {
        // Login button
        const loginBtn = document.getElementById('login-btn');
        const loginModal = document.getElementById('login-modal');
        if (loginBtn && loginModal) {
            loginBtn.addEventListener('click', () => this.openModal(loginModal));
        }

        // Register button
        const registerBtn = document.getElementById('register-btn');
        const registerModal = document.getElementById('register-modal');
        if (registerBtn && registerModal) {
            registerBtn.addEventListener('click', () => this.openModal(registerModal));
        }

        // Switch between login and register
        const switchToRegister = document.getElementById('show-register-link');
        if (switchToRegister && loginModal && registerModal) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(loginModal);
                setTimeout(() => this.openModal(registerModal), 300);
            });
        }

        const switchToLogin = document.getElementById('show-login-link');
        if (switchToLogin && registerModal && loginModal) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(registerModal);
                setTimeout(() => this.openModal(loginModal), 300);
            });
        }
    }

    openModal(modal) {
        if (!modal) return;

        // Close any open modal first
        if (this.activeModal && this.activeModal !== modal) {
            this.closeModal(this.activeModal);
        }

        // Hide main UI elements
        this.dimBackground(true);

        // Show modal
        modal.classList.remove('modal-hidden');
        modal.classList.add('active');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 350);

        // Set active modal
        this.activeModal = modal;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Announce to screen readers
        this.announceModal(modal);
    }

    closeModal(modal) {
        if (!modal) return;

        modal.classList.remove('active');
        
        setTimeout(() => {
            modal.classList.add('modal-hidden');
            
            // Restore background
            if (!this.hasOpenModals()) {
                this.dimBackground(false);
                document.body.style.overflow = '';
            }
        }, 350);

        if (this.activeModal === modal) {
            this.activeModal = null;
        }
    }

    dimBackground(dim) {
        const controlPanel = document.querySelector('.control-panel');
        const userStatus = document.querySelector('.user-status-bar');
        const bottomActions = document.querySelectorAll('#play-pause-button, #download-button');

        const elements = [controlPanel, userStatus, ...bottomActions].filter(el => el);

        elements.forEach(el => {
            if (dim) {
                el.style.opacity = '0.3';
                el.style.pointerEvents = 'none';
                el.style.filter = 'blur(4px)';
            } else {
                el.style.opacity = '';
                el.style.pointerEvents = '';
                el.style.filter = '';
            }
        });
    }

    hasOpenModals() {
        const modals = document.querySelectorAll('.auth-modal.active');
        return modals.length > 0;
    }

    /**
     * Smooth Animations
     */
    setupAnimations() {
        // Animate elements on load
        const animateElements = document.querySelectorAll('.control-panel, .user-status-bar, #play-pause-button, #download-button');
        
        animateElements.forEach((el, index) => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    el.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 100 * index);
            }
        });

        // Button hover effects
        this.setupButtonEffects();
    }

    setupButtonEffects() {
        const buttons = document.querySelectorAll('.premium-btn, .auth-btn, .shape-btn');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', (e) => {
                this.createRipple(e);
            });
        });
    }

    createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        button.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Keyboard Shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC to close modal
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }

            // Ctrl/Cmd + K to focus search (if implemented)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Focus search or command palette
            }
        });
    }

    /**
     * Accessibility Enhancements
     */
    setupAccessibility() {
        // Add ARIA labels
        this.addAriaLabels();

        // Trap focus in modals
        this.setupFocusTrap();

        // Announce dynamic content
        this.setupLiveRegions();
    }

    addAriaLabels() {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.setAttribute('aria-label', 'Open login modal');

        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) registerBtn.setAttribute('aria-label', 'Open registration modal');

        const closeButtons = document.querySelectorAll('.close-button');
        closeButtons.forEach(btn => {
            btn.setAttribute('aria-label', 'Close modal');
        });
    }

    setupFocusTrap() {
        document.addEventListener('keydown', (e) => {
            if (!this.activeModal || e.key !== 'Tab') return;

            const focusableElements = this.activeModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        });
    }

    setupLiveRegions() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);

        this.liveRegion = liveRegion;
    }

    announceModal(modal) {
        if (!this.liveRegion) return;

        const title = modal.querySelector('.auth-header h2');
        if (title) {
            this.liveRegion.textContent = `${title.textContent} modal opened`;
        }
    }

    announce(message) {
        if (!this.liveRegion) return;
        this.liveRegion.textContent = message;
    }

    /**
     * Form Validation Enhancement
     */
    enhanceFormValidation() {
        const forms = document.querySelectorAll('.auth-form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input');
            
            inputs.forEach(input => {
                // Real-time validation
                input.addEventListener('blur', () => {
                    this.validateInput(input);
                });

                // Clear error on input
                input.addEventListener('input', () => {
                    const errorElement = input.parentElement.querySelector('.form-error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                    input.classList.remove('error');
                });
            });
        });
    }

    validateInput(input) {
        const errorElement = input.parentElement.querySelector('.form-error');
        if (!errorElement) return;

        let errorMessage = '';

        if (input.required && !input.value.trim()) {
            errorMessage = 'This field is required';
        } else if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                errorMessage = 'Please enter a valid email address';
            }
        } else if (input.type === 'password' && input.value) {
            if (input.value.length < 8) {
                errorMessage = 'Password must be at least 8 characters';
            }
        }

        if (errorMessage) {
            errorElement.textContent = errorMessage;
            input.classList.add('error');
        } else {
            errorElement.textContent = '';
            input.classList.remove('error');
        }
    }

    /**
     * Smooth Scroll Enhancement
     */
    enableSmoothScroll() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    /**
     * Performance Optimization
     */
    optimizePerformance() {
        // Use passive event listeners for scroll
        document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });

        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
    }

    handleScroll() {
        // Add scroll-based effects if needed
    }

    handleResize() {
        // Handle responsive adjustments
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.premiumUI = new PremiumUIController();
    });
} else {
    window.premiumUI = new PremiumUIController();
}

// Add ripple effect styles
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .error {
        border-color: #f5576c !important;
        box-shadow: 0 0 0 4px rgba(245, 87, 108, 0.1) !important;
    }
`;
document.head.appendChild(style);

console.log('✨ Premium UI Controller initialized');
