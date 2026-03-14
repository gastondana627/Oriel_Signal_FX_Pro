/**
 * Vaporwave Glassmorphism Theme Controller
 * Handles smooth transitions, animations, and interactions
 */

class VaporwaveThemeController {
    constructor() {
        this.init();
    }

    init() {
        console.log('🌌 Vaporwave Theme Controller initializing...');
        
        this.setupSmoothScrolling();
        this.setupParallaxEffects();
        this.setupButtonAnimations();
        this.setupShapeTransitions();
        this.setupModalAnimations();
        this.setupNeonPulse();
        
        console.log('✨ Vaporwave Theme Controller initialized');
    }

    /**
     * Smooth Scrolling
     */
    setupSmoothScrolling() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    /**
     * Parallax Effects for Floating Elements
     */
    setupParallaxEffects() {
        let ticking = false;
        
        window.addEventListener('mousemove', (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateParallax(e);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    updateParallax(e) {
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const moveX = (clientX - centerX) / 50;
        const moveY = (clientY - centerY) / 50;
        
        // Apply subtle parallax to sidebar
        const sidebar = document.querySelector('.control-panel');
        if (sidebar) {
            sidebar.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
        
        // Apply parallax to header
        const header = document.querySelector('.top-nav');
        if (header) {
            header.style.transform = `translateX(-50%) translate(${moveX * 0.5}px, ${moveY * 0.5}px)`;
        }
    }

    /**
     * Button Animations with Ripple Effect
     */
    setupButtonAnimations() {
        const buttons = document.querySelectorAll('.ghost-btn, .auth-btn, .shape-btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRipple(e, button);
            });
            
            // Magnetic effect on hover
            button.addEventListener('mousemove', (e) => {
                this.magneticEffect(e, button);
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = '';
            });
        });
    }

    createRipple(e, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 245, 255, 0.6) 0%, transparent 70%);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
            z-index: 0;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    magneticEffect(e, element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) / 10;
        const deltaY = (e.clientY - centerY) / 10;
        
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    /**
     * Shape Transitions with Framer Motion-like Easing
     */
    setupShapeTransitions() {
        const shapeButtons = document.querySelectorAll('.shape-btn');
        
        shapeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active from all
                shapeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active to clicked
                button.classList.add('active');
                
                // Animate shape change
                this.animateShapeChange(button);
            });
        });
    }

    animateShapeChange(button) {
        // Create expanding circle animation
        const circle = document.createElement('div');
        circle.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, rgba(0, 245, 255, 0.3), rgba(255, 0, 255, 0.3));
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            animation: shape-morph 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            z-index: 999;
        `;
        
        document.body.appendChild(circle);
        setTimeout(() => circle.remove(), 800);
    }

    /**
     * Modal Animations
     */
    setupModalAnimations() {
        const modals = document.querySelectorAll('.auth-modal');
        
        modals.forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isHidden = modal.classList.contains('modal-hidden');
                        if (!isHidden) {
                            this.animateModalOpen(modal);
                        }
                    }
                });
            });
            
            observer.observe(modal, { attributes: true });
        });
    }

    animateModalOpen(modal) {
        const content = modal.querySelector('.auth-modal-content');
        if (content) {
            content.style.animation = 'none';
            setTimeout(() => {
                content.style.animation = 'modal-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 10);
        }
    }

    /**
     * Neon Pulse Effect for Visualizer
     */
    setupNeonPulse() {
        const canvas = document.querySelector('#graph-container canvas');
        if (!canvas) return;
        
        let pulseIntensity = 0;
        let pulseDirection = 1;
        
        const animatePulse = () => {
            pulseIntensity += 0.02 * pulseDirection;
            
            if (pulseIntensity >= 1) pulseDirection = -1;
            if (pulseIntensity <= 0) pulseDirection = 1;
            
            const cyan = 10 + (pulseIntensity * 10);
            const pink = 20 + (pulseIntensity * 10);
            
            canvas.style.filter = `
                drop-shadow(0 0 ${cyan}px rgba(0, 245, 255, 0.8))
                drop-shadow(0 0 ${pink}px rgba(255, 0, 255, 0.6))
            `;
            
            requestAnimationFrame(animatePulse);
        };
        
        animatePulse();
    }

    /**
     * Smooth Value Updates for Range Inputs
     */
    setupRangeInputs() {
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        
        rangeInputs.forEach(input => {
            const valueDisplay = input.parentElement.querySelector('label span:last-child');
            
            if (valueDisplay) {
                input.addEventListener('input', (e) => {
                    const value = e.target.value;
                    valueDisplay.textContent = value;
                    
                    // Animate value change
                    valueDisplay.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        valueDisplay.style.transform = 'scale(1)';
                    }, 200);
                });
            }
        });
    }

    /**
     * Intersection Observer for Fade-in Animations
     */
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        const elements = document.querySelectorAll('.control-section');
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            observer.observe(el);
        });
    }

    /**
     * Keyboard Shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space to play/pause
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                const playButton = document.getElementById('play-pause-button');
                if (playButton) playButton.click();
            }
            
            // R to randomize
            if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
                const randomButton = document.getElementById('randomize-button');
                if (randomButton) randomButton.click();
            }
            
            // D to download
            if (e.code === 'KeyD' && !e.ctrlKey && !e.metaKey) {
                const downloadButton = document.getElementById('download-button');
                if (downloadButton) downloadButton.click();
            }
        });
    }

    /**
     * Performance Optimization
     */
    optimizePerformance() {
        // Use passive event listeners
        const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];
        
        passiveEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {}, { passive: true });
        });
        
        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
    }

    handleResize() {
        // Recalculate positions if needed
        console.log('Window resized, recalculating layout...');
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes shape-morph {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(100);
            opacity: 0;
        }
    }
    
    @keyframes glow-pulse {
        0%, 100% {
            box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
        }
        50% {
            box-shadow: 0 0 40px rgba(0, 245, 255, 0.6);
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.vaporwaveTheme = new VaporwaveThemeController();
    });
} else {
    window.vaporwaveTheme = new VaporwaveThemeController();
}

console.log('🌌 Vaporwave Theme Controller loaded');
