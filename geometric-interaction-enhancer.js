/**
 * Geometric Interaction Enhancer
 * Advanced interaction effects for geometric elements
 * Task 8.2: Enhanced geometric interactions
 */

class GeometricInteractionEnhancer {
    constructor() {
        this.activeInteractions = new Map();
        this.touchSupport = 'ontouchstart' in window;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.config = {
            magneticStrength: 0.3,
            magneticRadius: 100,
            tiltStrength: 15,
            glowIntensity: 0.6,
            particleCount: 8,
            rippleSize: 200
        };
        
        this.init();
    }
    
    init() {
        this.setupMagneticEffects();
        this.setupTiltEffects();
        this.setupGlowTrails();
        this.setupAdvancedHovers();
        this.setupGestureSupport();
        this.setupKeyboardInteractions();
        
        console.log('🎯 Geometric Interaction Enhancer initialized');
    }
    
    setupMagneticEffects() {
        if (this.touchSupport || this.prefersReducedMotion) return;
        
        const magneticElements = document.querySelectorAll(
            '.geometric-button, .geometric-card, .plan-card, .credit-option'
        );
        
        magneticElements.forEach(element => {
            element.classList.add('geometric-magnetic');
            
            const handleMouseMove = (e) => {
                this.applyMagneticEffect(element, e);
            };
            
            const handleMouseLeave = () => {
                this.resetMagneticEffect(element);
            };
            
            element.addEventListener('mousemove', handleMouseMove);
            element.addEventListener('mouseleave', handleMouseLeave);
            
            // Store handlers for cleanup
            this.activeInteractions.set(element, {
                mousemove: handleMouseMove,
                mouseleave: handleMouseLeave
            });
        });
    }
    
    applyMagneticEffect(element, event) {
        if (this.prefersReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < this.config.magneticRadius) {
            const strength = (this.config.magneticRadius - distance) / this.config.magneticRadius;
            const moveX = deltaX * strength * this.config.magneticStrength;
            const moveY = deltaY * strength * this.config.magneticStrength;
            
            element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
            element.style.transition = 'transform 0.1s ease-out';
            
            // Add magnetic glow
            element.style.boxShadow = `
                0 0 ${20 + strength * 20}px rgba(0, 212, 255, ${0.3 + strength * 0.3}),
                0 0 ${40 + strength * 40}px rgba(255, 107, 107, ${0.1 + strength * 0.2})
            `;
        }
    }
    
    resetMagneticEffect(element) {
        element.style.transform = '';
        element.style.transition = 'transform 0.3s ease';
        element.style.boxShadow = '';
    }
    
    setupTiltEffects() {
        if (this.touchSupport || this.prefersReducedMotion) return;
        
        const tiltElements = document.querySelectorAll('.geometric-card, .plan-card');
        
        tiltElements.forEach(element => {
            element.classList.add('geometric-tilt');
            
            const handleMouseMove = (e) => {
                this.applyTiltEffect(element, e);
            };
            
            const handleMouseLeave = () => {
                this.resetTiltEffect(element);
            };
            
            element.addEventListener('mousemove', handleMouseMove);
            element.addEventListener('mouseleave', handleMouseLeave);
            
            // Update interaction handlers
            const existing = this.activeInteractions.get(element) || {};
            this.activeInteractions.set(element, {
                ...existing,
                tiltMove: handleMouseMove,
                tiltLeave: handleMouseLeave
            });
        });
    }
    
    applyTiltEffect(element, event) {
        if (this.prefersReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (event.clientX - centerX) / (rect.width / 2);
        const deltaY = (event.clientY - centerY) / (rect.height / 2);
        
        const tiltX = deltaY * this.config.tiltStrength;
        const tiltY = -deltaX * this.config.tiltStrength;
        
        element.style.transform = `
            perspective(1000px) 
            rotateX(${tiltX}deg) 
            rotateY(${tiltY}deg) 
            scale3d(1.02, 1.02, 1.02)
        `;
        element.style.transition = 'transform 0.1s ease-out';
        
        // Add depth shadow
        const shadowX = deltaX * 10;
        const shadowY = deltaY * 10;
        element.style.boxShadow = `
            ${shadowX}px ${shadowY}px 30px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(0, 212, 255, 0.2)
        `;
    }
    
    resetTiltEffect(element) {
        element.style.transform = '';
        element.style.transition = 'transform 0.3s ease';
        element.style.boxShadow = '';
    }
    
    setupGlowTrails() {
        if (this.touchSupport || this.prefersReducedMotion) return;
        
        const trailElements = document.querySelectorAll('.geometric-button, .auth-btn, .user-btn');
        
        trailElements.forEach(element => {
            element.addEventListener('mousemove', (e) => {
                this.createGlowTrail(element, e);
            });
        });
    }
    
    createGlowTrail(element, event) {
        if (this.prefersReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const trail = document.createElement('div');
        trail.className = 'geometric-glow-trail';
        trail.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.6), transparent);
            pointer-events: none;
            z-index: 1;
            left: ${x - 10}px;
            top: ${y - 10}px;
            animation: geometric-trail-fade 0.8s ease-out forwards;
        `;
        
        element.style.position = 'relative';
        element.appendChild(trail);
        
        setTimeout(() => {
            trail.remove();
        }, 800);
    }
    
    setupAdvancedHovers() {
        // Particle burst on hover
        const burstElements = document.querySelectorAll('.geometric-card, .plan-card');
        
        burstElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                if (!this.prefersReducedMotion) {
                    this.createParticleBurst(element);
                }
            });
        });
        
        // Morphing borders
        const morphElements = document.querySelectorAll('.credit-option, .stat-card');
        
        morphElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                if (!this.prefersReducedMotion) {
                    this.startBorderMorph(element);
                }
            });
            
            element.addEventListener('mouseleave', () => {
                this.stopBorderMorph(element);
            });
        });
    }
    
    createParticleBurst(element) {
        if (this.prefersReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        for (let i = 0; i < this.config.particleCount; i++) {
            const particle = document.createElement('div');
            const angle = (i / this.config.particleCount) * Math.PI * 2;
            const velocity = 50 + Math.random() * 30;
            
            particle.className = 'geometric-burst-particle';
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: ${i % 2 === 0 ? 'var(--geometric-cyan)' : 'var(--geometric-pink)'};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: ${centerX}px;
                top: ${centerY}px;
                animation: geometric-particle-burst 1s ease-out forwards;
                --angle: ${angle}rad;
                --velocity: ${velocity}px;
            `;
            
            element.style.position = 'relative';
            element.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    }
    
    startBorderMorph(element) {
        if (this.prefersReducedMotion) return;
        
        element.style.borderImage = 'linear-gradient(45deg, var(--geometric-cyan), var(--geometric-pink)) 1';
        element.style.animation = 'geometric-border-dance 2s ease-in-out infinite';
    }
    
    stopBorderMorph(element) {
        element.style.animation = '';
        element.style.borderImage = '';
    }
    
    setupGestureSupport() {
        if (!this.touchSupport) return;
        
        // Touch-specific interactions
        const touchElements = document.querySelectorAll('.geometric-button, .geometric-card');
        
        touchElements.forEach(element => {
            let touchStartTime = 0;
            
            element.addEventListener('touchstart', (e) => {
                touchStartTime = Date.now();
                this.createTouchRipple(element, e.touches[0]);
            });
            
            element.addEventListener('touchend', (e) => {
                const touchDuration = Date.now() - touchStartTime;
                
                if (touchDuration > 500) {
                    // Long press effect
                    this.createLongPressEffect(element);
                }
            });
        });
    }
    
    createTouchRipple(element, touch) {
        const rect = element.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.className = 'geometric-touch-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.3), transparent);
            width: ${this.config.rippleSize}px;
            height: ${this.config.rippleSize}px;
            left: ${x - this.config.rippleSize / 2}px;
            top: ${y - this.config.rippleSize / 2}px;
            pointer-events: none;
            z-index: 1000;
            animation: geometric-ripple 0.6s ease-out;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    createLongPressEffect(element) {
        if (this.prefersReducedMotion) return;
        
        const pulse = document.createElement('div');
        pulse.className = 'geometric-long-press-pulse';
        pulse.style.cssText = `
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border: 2px solid var(--geometric-pink);
            border-radius: inherit;
            pointer-events: none;
            z-index: 1001;
            animation: geometric-long-press 1s ease-out;
        `;
        
        element.style.position = 'relative';
        element.appendChild(pulse);
        
        setTimeout(() => {
            pulse.remove();
        }, 1000);
    }
    
    setupKeyboardInteractions() {
        // Enhanced keyboard navigation
        const focusableElements = document.querySelectorAll(
            '.geometric-button, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(element => {
            element.addEventListener('focus', () => {
                this.createFocusGlow(element);
            });
            
            element.addEventListener('blur', () => {
                this.removeFocusGlow(element);
            });
            
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    this.createKeyboardActivation(element);
                }
            });
        });
    }
    
    createFocusGlow(element) {
        element.style.outline = 'none';
        element.style.boxShadow = `
            0 0 0 2px var(--geometric-cyan),
            0 0 10px rgba(0, 212, 255, 0.5)
        `;
        
        if (!this.prefersReducedMotion) {
            element.style.animation = 'geometric-focus-pulse 2s ease-in-out infinite';
        }
    }
    
    removeFocusGlow(element) {
        element.style.outline = '';
        element.style.boxShadow = '';
        element.style.animation = '';
    }
    
    createKeyboardActivation(element) {
        if (this.prefersReducedMotion) return;
        
        const activation = document.createElement('div');
        activation.className = 'geometric-keyboard-activation';
        activation.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(0, 212, 255, 0.1), rgba(255, 107, 107, 0.1));
            pointer-events: none;
            z-index: 1;
            animation: geometric-keyboard-flash 0.3s ease-out;
        `;
        
        element.style.position = 'relative';
        element.appendChild(activation);
        
        setTimeout(() => {
            activation.remove();
        }, 300);
    }
    
    // Public API methods
    enableMagneticEffect(element) {
        if (!this.touchSupport && !this.prefersReducedMotion) {
            element.classList.add('geometric-magnetic');
        }
    }
    
    disableMagneticEffect(element) {
        element.classList.remove('geometric-magnetic');
        this.resetMagneticEffect(element);
    }
    
    enableTiltEffect(element) {
        if (!this.touchSupport && !this.prefersReducedMotion) {
            element.classList.add('geometric-tilt');
        }
    }
    
    disableTiltEffect(element) {
        element.classList.remove('geometric-tilt');
        this.resetTiltEffect(element);
    }
    
    triggerParticleBurst(element) {
        this.createParticleBurst(element);
    }
    
    // Performance monitoring
    getActiveInteractionCount() {
        return this.activeInteractions.size;
    }
    
    // Cleanup
    destroy() {
        // Remove all event listeners
        this.activeInteractions.forEach((handlers, element) => {
            Object.entries(handlers).forEach(([event, handler]) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.activeInteractions.clear();
        
        console.log('🎯 Geometric Interaction Enhancer destroyed');
    }
}

// Add required CSS animations
const interactionStyles = document.createElement('style');
interactionStyles.textContent = `
    @keyframes geometric-trail-fade {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(2);
        }
    }
    
    @keyframes geometric-particle-burst {
        0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(
                calc(cos(var(--angle)) * var(--velocity)),
                calc(sin(var(--angle)) * var(--velocity))
            ) scale(0);
        }
    }
    
    @keyframes geometric-long-press {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(1.2);
        }
    }
    
    @keyframes geometric-focus-pulse {
        0%, 100% {
            box-shadow: 
                0 0 0 2px var(--geometric-cyan),
                0 0 10px rgba(0, 212, 255, 0.5);
        }
        50% {
            box-shadow: 
                0 0 0 2px var(--geometric-pink),
                0 0 20px rgba(255, 107, 107, 0.7);
        }
    }
    
    @keyframes geometric-keyboard-flash {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
    
    /* Interaction enhancement classes */
    .geometric-magnetic {
        cursor: pointer;
        will-change: transform;
    }
    
    .geometric-tilt {
        transform-style: preserve-3d;
        will-change: transform;
    }
    
    /* Reduced motion overrides */
    @media (prefers-reduced-motion: reduce) {
        .geometric-magnetic,
        .geometric-tilt {
            will-change: auto;
        }
        
        .geometric-focus-pulse {
            animation: none !important;
        }
    }
`;
document.head.appendChild(interactionStyles);

// Initialize the interaction enhancer
document.addEventListener('DOMContentLoaded', () => {
    window.geometricInteractions = new GeometricInteractionEnhancer();
});

// Export for use in other modules
window.GeometricInteractionEnhancer = GeometricInteractionEnhancer;