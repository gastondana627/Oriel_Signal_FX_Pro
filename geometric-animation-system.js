/**
 * Geometric Animation System
 * Advanced animations and interactions for the geometric theme
 * Task 8.2: Geometric animations and interactions
 */

class GeometricAnimationSystem {
    constructor() {
        this.animations = new Map();
        this.observers = new Map();
        this.isInitialized = false;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Animation configurations
        this.config = {
            neonGlow: {
                duration: 2000,
                easing: 'ease-in-out',
                iterations: Infinity
            },
            shapeMorph: {
                duration: 3000,
                easing: 'ease-in-out',
                iterations: Infinity
            },
            gradientFlow: {
                duration: 4000,
                easing: 'ease',
                iterations: Infinity
            },
            pulse: {
                duration: 800,
                easing: 'ease-out',
                iterations: 1
            },
            ripple: {
                duration: 600,
                easing: 'ease-out',
                iterations: 1
            }
        };
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.createAnimationStyles();
        this.setupIntersectionObserver();
        this.initializeHoverEffects();
        this.initializeClickEffects();
        this.initializeScrollAnimations();
        this.setupParticleSystem();
        this.initializeGlowEffects();
        
        this.isInitialized = true;
        console.log('✨ Geometric Animation System initialized');
    }
    
    createAnimationStyles() {
        const style = document.createElement('style');
        style.id = 'geometric-animations';
        style.textContent = `
            /* Neon Glow Animations */
            @keyframes geometric-neon-pulse {
                0%, 100% {
                    box-shadow: 
                        0 0 5px var(--geometric-cyan),
                        0 0 10px var(--geometric-cyan),
                        0 0 15px var(--geometric-cyan),
                        0 0 20px var(--geometric-cyan);
                    filter: brightness(1);
                }
                50% {
                    box-shadow: 
                        0 0 10px var(--geometric-pink),
                        0 0 20px var(--geometric-pink),
                        0 0 30px var(--geometric-pink),
                        0 0 40px var(--geometric-pink);
                    filter: brightness(1.2);
                }
            }
            
            @keyframes geometric-neon-breathe {
                0%, 100% {
                    filter: 
                        drop-shadow(0 0 10px rgba(0, 212, 255, 0.4))
                        brightness(1);
                }
                50% {
                    filter: 
                        drop-shadow(0 0 20px rgba(255, 107, 107, 0.6))
                        brightness(1.1);
                }
            }
            
            /* Shape Morphing Animations */
            @keyframes geometric-hexagon-morph {
                0%, 100% {
                    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                }
                25% {
                    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                }
                50% {
                    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
                }
                75% {
                    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
                }
            }
            
            @keyframes geometric-diamond-morph {
                0%, 100% {
                    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
                }
                33% {
                    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                }
                66% {
                    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
                }
            }
            
            /* Gradient Flow Animations */
            @keyframes geometric-gradient-wave {
                0% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
                100% {
                    background-position: 0% 50%;
                }
            }
            
            @keyframes geometric-gradient-spiral {
                0% {
                    background: conic-gradient(from 0deg, var(--geometric-cyan), var(--geometric-pink), var(--geometric-cyan));
                }
                100% {
                    background: conic-gradient(from 360deg, var(--geometric-cyan), var(--geometric-pink), var(--geometric-cyan));
                }
            }
            
            /* Border Animations */
            @keyframes geometric-border-dance {
                0%, 100% {
                    border-image-source: linear-gradient(45deg, var(--geometric-cyan), var(--geometric-pink));
                }
                25% {
                    border-image-source: linear-gradient(135deg, var(--geometric-cyan), var(--geometric-pink));
                }
                50% {
                    border-image-source: linear-gradient(225deg, var(--geometric-cyan), var(--geometric-pink));
                }
                75% {
                    border-image-source: linear-gradient(315deg, var(--geometric-cyan), var(--geometric-pink));
                }
            }
            
            @keyframes geometric-border-glow {
                0%, 100% {
                    border-color: var(--geometric-cyan);
                    box-shadow: 0 0 10px var(--geometric-cyan);
                }
                50% {
                    border-color: var(--geometric-pink);
                    box-shadow: 0 0 20px var(--geometric-pink);
                }
            }
            
            /* Particle Animations */
            @keyframes geometric-particle-float {
                0%, 100% {
                    transform: translateY(0px) rotate(0deg);
                    opacity: 0.3;
                }
                50% {
                    transform: translateY(-20px) rotate(180deg);
                    opacity: 0.8;
                }
            }
            
            @keyframes geometric-particle-orbit {
                0% {
                    transform: rotate(0deg) translateX(30px) rotate(0deg);
                }
                100% {
                    transform: rotate(360deg) translateX(30px) rotate(-360deg);
                }
            }
            
            /* Ripple Effects */
            @keyframes geometric-ripple {
                0% {
                    transform: scale(0);
                    opacity: 1;
                }
                100% {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes geometric-multi-ripple {
                0% {
                    transform: scale(0);
                    opacity: 0.8;
                }
                50% {
                    opacity: 0.4;
                }
                100% {
                    transform: scale(3);
                    opacity: 0;
                }
            }
            
            /* Entrance Animations */
            @keyframes geometric-fade-in-up {
                0% {
                    opacity: 0;
                    transform: translateY(30px) scale(0.9);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes geometric-slide-in-left {
                0% {
                    opacity: 0;
                    transform: translateX(-50px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes geometric-zoom-in {
                0% {
                    opacity: 0;
                    transform: scale(0.3);
                }
                50% {
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                }
            }
            
            /* Hover Animations */
            @keyframes geometric-hover-lift {
                0% {
                    transform: translateY(0) scale(1);
                }
                100% {
                    transform: translateY(-8px) scale(1.02);
                }
            }
            
            @keyframes geometric-hover-glow {
                0% {
                    filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.3));
                }
                100% {
                    filter: drop-shadow(0 0 20px rgba(255, 107, 107, 0.6));
                }
            }
            
            /* Loading Animations */
            @keyframes geometric-loading-dots {
                0%, 20% {
                    color: var(--geometric-cyan);
                    transform: scale(1);
                }
                50% {
                    color: var(--geometric-pink);
                    transform: scale(1.2);
                }
                80%, 100% {
                    color: var(--geometric-cyan);
                    transform: scale(1);
                }
            }
            
            @keyframes geometric-loading-spinner {
                0% {
                    transform: rotate(0deg);
                    border-color: var(--geometric-cyan) transparent transparent transparent;
                }
                25% {
                    border-color: var(--geometric-pink) var(--geometric-cyan) transparent transparent;
                }
                50% {
                    border-color: transparent var(--geometric-pink) var(--geometric-cyan) transparent;
                }
                75% {
                    border-color: transparent transparent var(--geometric-pink) var(--geometric-cyan);
                }
                100% {
                    transform: rotate(360deg);
                    border-color: var(--geometric-cyan) transparent transparent transparent;
                }
            }
            
            /* Animation Classes */
            .geometric-animate-neon {
                animation: geometric-neon-pulse 2s ease-in-out infinite;
            }
            
            .geometric-animate-breathe {
                animation: geometric-neon-breathe 3s ease-in-out infinite;
            }
            
            .geometric-animate-morph-hexagon {
                animation: geometric-hexagon-morph 4s ease-in-out infinite;
            }
            
            .geometric-animate-morph-diamond {
                animation: geometric-diamond-morph 3s ease-in-out infinite;
            }
            
            .geometric-animate-gradient-wave {
                background: linear-gradient(270deg, var(--geometric-cyan), var(--geometric-pink), var(--geometric-cyan));
                background-size: 200% 200%;
                animation: geometric-gradient-wave 4s ease infinite;
            }
            
            .geometric-animate-gradient-spiral {
                animation: geometric-gradient-spiral 6s linear infinite;
            }
            
            .geometric-animate-border-dance {
                border: 2px solid;
                border-image: linear-gradient(45deg, var(--geometric-cyan), var(--geometric-pink)) 1;
                animation: geometric-border-dance 3s ease-in-out infinite;
            }
            
            .geometric-animate-border-glow {
                animation: geometric-border-glow 2s ease-in-out infinite;
            }
            
            .geometric-animate-float {
                animation: geometric-particle-float 3s ease-in-out infinite;
            }
            
            .geometric-animate-orbit {
                animation: geometric-particle-orbit 8s linear infinite;
            }
            
            /* Hover States */
            .geometric-hover-lift:hover {
                animation: geometric-hover-lift 0.3s ease forwards;
            }
            
            .geometric-hover-glow:hover {
                animation: geometric-hover-glow 0.3s ease forwards;
            }
            
            /* Reduced Motion Overrides */
            @media (prefers-reduced-motion: reduce) {
                .geometric-animate-neon,
                .geometric-animate-breathe,
                .geometric-animate-morph-hexagon,
                .geometric-animate-morph-diamond,
                .geometric-animate-gradient-wave,
                .geometric-animate-gradient-spiral,
                .geometric-animate-border-dance,
                .geometric-animate-border-glow,
                .geometric-animate-float,
                .geometric-animate-orbit {
                    animation: none !important;
                }
                
                .geometric-hover-lift:hover,
                .geometric-hover-glow:hover {
                    animation: none !important;
                    transform: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElementEntry(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe elements that should animate on scroll
        const animateOnScroll = document.querySelectorAll(
            '.geometric-card, .plan-card, .credit-option, .stat-card, .control-panel'
        );
        
        animateOnScroll.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
            observer.observe(element);
        });
        
        this.observers.set('scroll', observer);
    }
    
    animateElementEntry(element) {
        if (this.prefersReducedMotion) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            return;
        }
        
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        
        // Add entrance animation class
        element.classList.add('geometric-entrance-animated');
        
        // Add subtle glow effect
        setTimeout(() => {
            if (element.classList.contains('geometric-card') || element.classList.contains('plan-card')) {
                element.classList.add('geometric-animate-breathe');
                
                // Remove after a few cycles
                setTimeout(() => {
                    element.classList.remove('geometric-animate-breathe');
                }, 6000);
            }
        }, 600);
    }
    
    initializeHoverEffects() {
        // Enhanced button hover effects
        const buttons = document.querySelectorAll('.geometric-button, button:not(.close-button):not(.modal-button)');
        
        buttons.forEach(button => {
            if ('ontouchstart' in window) return; // Skip on touch devices
            
            button.classList.add('geometric-hover-lift', 'geometric-hover-glow');
            
            button.addEventListener('mouseenter', (e) => {
                this.createHoverParticles(e.target);
                if (!this.prefersReducedMotion) {
                    e.target.classList.add('geometric-animate-neon');
                }
            });
            
            button.addEventListener('mouseleave', (e) => {
                e.target.classList.remove('geometric-animate-neon');
            });
        });
        
        // Card hover effects
        const cards = document.querySelectorAll('.geometric-card, .plan-card, .credit-option');
        cards.forEach(card => {
            if ('ontouchstart' in window) return;
            
            card.addEventListener('mouseenter', (e) => {
                if (!this.prefersReducedMotion) {
                    e.target.classList.add('geometric-animate-border-glow');
                    this.createFloatingShapes(e.target);
                }
            });
            
            card.addEventListener('mouseleave', (e) => {
                e.target.classList.remove('geometric-animate-border-glow');
            });
        });
        
        // Logo hover effects
        if (window.geometricLogo) {
            window.geometricLogo.logoInstances.forEach(logo => {
                logo.addEventListener('mouseenter', () => {
                    if (!this.prefersReducedMotion) {
                        logo.classList.add('geometric-animate-breathe');
                    }
                });
                
                logo.addEventListener('mouseleave', () => {
                    logo.classList.remove('geometric-animate-breathe');
                });
            });
        }
    }
    
    initializeClickEffects() {
        // Add click effects to interactive elements
        const clickableElements = document.querySelectorAll(
            '.geometric-button, button, .geometric-card, .plan-card, .credit-option'
        );
        
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                this.createRippleEffect(e);
                this.createClickPulse(e.target);
            });
        });
    }
    
    createRippleEffect(event) {
        if (this.prefersReducedMotion) return;
        
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        const ripple = document.createElement('div');
        ripple.className = 'geometric-ripple-effect';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.4), rgba(255, 107, 107, 0.2), transparent);
            width: ${size}px;
            height: ${size}px;
            left: ${event.clientX - rect.left - size / 2}px;
            top: ${event.clientY - rect.top - size / 2}px;
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
    
    createClickPulse(element) {
        if (this.prefersReducedMotion) return;
        
        const pulse = document.createElement('div');
        pulse.className = 'geometric-click-pulse';
        pulse.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border: 2px solid var(--geometric-cyan);
            border-radius: inherit;
            pointer-events: none;
            z-index: 1001;
            animation: geometric-multi-ripple 0.8s ease-out;
        `;
        
        element.style.position = 'relative';
        element.appendChild(pulse);
        
        setTimeout(() => {
            pulse.remove();
        }, 800);
    }
    
    createHoverParticles(element) {
        if (this.prefersReducedMotion) return;
        
        const particleCount = 3;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'geometric-hover-particle';
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: var(--geometric-cyan);
                border-radius: 50%;
                pointer-events: none;
                z-index: 999;
                animation: geometric-particle-float 2s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
            `;
            
            element.style.position = 'relative';
            element.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 2000);
        }
    }
    
    createFloatingShapes(element) {
        if (this.prefersReducedMotion) return;
        
        const shapes = ['◆', '▲', '●', '■'];
        const shapeCount = 2;
        
        for (let i = 0; i < shapeCount; i++) {
            const shape = document.createElement('div');
            shape.className = 'geometric-floating-shape';
            shape.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            shape.style.cssText = `
                position: absolute;
                color: var(--geometric-pink);
                font-size: 12px;
                pointer-events: none;
                z-index: 998;
                animation: geometric-particle-orbit 4s linear infinite;
                animation-delay: ${i * 0.5}s;
                top: 50%;
                left: 50%;
                transform-origin: 0 0;
            `;
            
            element.style.position = 'relative';
            element.appendChild(shape);
            
            setTimeout(() => {
                shape.remove();
            }, 4000);
        }
    }
    
    initializeScrollAnimations() {
        // Parallax effect for background elements
        let ticking = false;
        
        const updateParallax = () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.geometric-parallax');
            
            parallaxElements.forEach((element, index) => {
                const speed = 0.5 + (index * 0.1);
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
            
            ticking = false;
        };
        
        const requestParallaxUpdate = () => {
            if (!ticking && !this.prefersReducedMotion) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', requestParallaxUpdate);
    }
    
    setupParticleSystem() {
        if (this.prefersReducedMotion) return;
        
        // Create ambient particles
        this.createAmbientParticles();
        
        // Refresh particles periodically
        setInterval(() => {
            this.createAmbientParticles();
        }, 10000);
    }
    
    createAmbientParticles() {
        if (this.prefersReducedMotion) return;
        
        const particleContainer = document.createElement('div');
        particleContainer.className = 'geometric-ambient-particles';
        particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: -1;
            overflow: hidden;
        `;
        
        // Create particles
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: ${i % 2 === 0 ? 'var(--geometric-cyan)' : 'var(--geometric-pink)'};
                border-radius: 50%;
                opacity: 0.3;
                animation: geometric-particle-float ${3 + Math.random() * 4}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
                top: ${Math.random() * 100}vh;
                left: ${Math.random() * 100}vw;
            `;
            
            particleContainer.appendChild(particle);
        }
        
        document.body.appendChild(particleContainer);
        
        // Remove after animation completes
        setTimeout(() => {
            particleContainer.remove();
        }, 8000);
    }
    
    initializeGlowEffects() {
        // Add glow effects to key elements
        const glowElements = document.querySelectorAll('.user-status-bar, .control-panel');
        
        glowElements.forEach(element => {
            if (!this.prefersReducedMotion) {
                element.classList.add('geometric-animate-breathe');
            }
        });
        
        // Pulsing glow for important buttons
        const importantButtons = document.querySelectorAll('#download-button, #upgrade-button');
        importantButtons.forEach(button => {
            if (!this.prefersReducedMotion) {
                button.classList.add('geometric-animate-neon');
            }
        });
    }
    
    // Public API methods
    addNeonGlow(element) {
        if (!this.prefersReducedMotion) {
            element.classList.add('geometric-animate-neon');
        }
    }
    
    removeNeonGlow(element) {
        element.classList.remove('geometric-animate-neon');
    }
    
    addShapeMorph(element, shape = 'hexagon') {
        if (!this.prefersReducedMotion) {
            element.classList.add(`geometric-animate-morph-${shape}`);
        }
    }
    
    removeShapeMorph(element, shape = 'hexagon') {
        element.classList.remove(`geometric-animate-morph-${shape}`);
    }
    
    addGradientFlow(element) {
        if (!this.prefersReducedMotion) {
            element.classList.add('geometric-animate-gradient-wave');
        }
    }
    
    removeGradientFlow(element) {
        element.classList.remove('geometric-animate-gradient-wave');
    }
    
    triggerRipple(element, x = null, y = null) {
        if (this.prefersReducedMotion) return;
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.4), transparent);
            width: ${size}px;
            height: ${size}px;
            left: ${(x || rect.width / 2) - size / 2}px;
            top: ${(y || rect.height / 2) - size / 2}px;
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
    
    // Performance monitoring
    getAnimationCount() {
        return document.querySelectorAll('[class*="geometric-animate"]').length;
    }
    
    pauseAllAnimations() {
        const style = document.createElement('style');
        style.id = 'geometric-animations-paused';
        style.textContent = `
            * {
                animation-play-state: paused !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    resumeAllAnimations() {
        const pausedStyle = document.getElementById('geometric-animations-paused');
        if (pausedStyle) {
            pausedStyle.remove();
        }
    }
    
    // Cleanup
    destroy() {
        // Remove observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Remove animation styles
        const animationStyles = document.getElementById('geometric-animations');
        if (animationStyles) {
            animationStyles.remove();
        }
        
        // Clear animations map
        this.animations.clear();
        
        console.log('✨ Geometric Animation System destroyed');
    }
}

// Initialize the animation system
document.addEventListener('DOMContentLoaded', () => {
    window.geometricAnimations = new GeometricAnimationSystem();
});

// Export for use in other modules
window.GeometricAnimationSystem = GeometricAnimationSystem;