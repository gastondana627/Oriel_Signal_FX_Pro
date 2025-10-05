/**
 * Responsive Geometric Manager
 * Handles responsive behavior and geometric animations for the Oriel FX application
 * Task 8.1: Mobile compatibility and responsive scaling
 * Task 8.2: Geometric animations and interactions
 */

class ResponsiveGeometricManager {
    constructor() {
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            large: 1200,
            ultrawide: 1600
        };
        
        this.currentBreakpoint = 'mobile';
        this.isTouch = 'ontouchstart' in window;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.animations = new Map();
        this.observers = new Map();
        
        this.init();
    }
    
    init() {
        this.detectBreakpoint();
        this.setupResponsiveListeners();
        this.initializeControlPanelBehavior();
        this.setupGeometricAnimations();
        this.initializeIntersectionObserver();
        this.optimizeForDevice();
        
        console.log('📱 Responsive Geometric Manager initialized');
        console.log(`Current breakpoint: ${this.currentBreakpoint}`);
        console.log(`Touch device: ${this.isTouch}`);
        console.log(`Reduced motion: ${this.prefersReducedMotion}`);
    }
    
    detectBreakpoint() {
        const width = window.innerWidth;
        
        if (width <= this.breakpoints.mobile) {
            this.currentBreakpoint = 'mobile';
        } else if (width <= this.breakpoints.tablet) {
            this.currentBreakpoint = 'tablet';
        } else if (width <= this.breakpoints.desktop) {
            this.currentBreakpoint = 'desktop';
        } else if (width <= this.breakpoints.large) {
            this.currentBreakpoint = 'large';
        } else {
            this.currentBreakpoint = 'ultrawide';
        }
        
        document.body.setAttribute('data-breakpoint', this.currentBreakpoint);
        document.body.setAttribute('data-touch', this.isTouch);
        document.body.setAttribute('data-reduced-motion', this.prefersReducedMotion);
    }
    
    setupResponsiveListeners() {
        // Debounced resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldBreakpoint = this.currentBreakpoint;
                this.detectBreakpoint();
                
                if (oldBreakpoint !== this.currentBreakpoint) {
                    this.onBreakpointChange(oldBreakpoint, this.currentBreakpoint);
                }
                
                this.updateResponsiveElements();
            }, 150);
        });
        
        // Orientation change handler
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.detectBreakpoint();
                this.updateResponsiveElements();
            }, 100);
        });
        
        // Reduced motion preference change
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
            document.body.setAttribute('data-reduced-motion', this.prefersReducedMotion);
            this.updateAnimations();
        });
    }
    
    onBreakpointChange(oldBreakpoint, newBreakpoint) {
        console.log(`📱 Breakpoint changed: ${oldBreakpoint} → ${newBreakpoint}`);
        
        // Adjust control panel behavior
        this.adjustControlPanelForBreakpoint(newBreakpoint);
        
        // Update logo sizes
        this.updateLogoSizes(newBreakpoint);
        
        // Adjust modal behavior
        this.adjustModalBehavior(newBreakpoint);
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('breakpointChange', {
            detail: { oldBreakpoint, newBreakpoint }
        }));
    }
    
    initializeControlPanelBehavior() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;
        
        // Create toggle button if it doesn't exist
        let toggleButton = controlPanel.querySelector('.control-panel-toggle');
        if (!toggleButton) {
            toggleButton = document.createElement('button');
            toggleButton.className = 'control-panel-toggle';
            toggleButton.innerHTML = this.currentBreakpoint === 'mobile' ? '⬆️ Controls' : '◀️';
            controlPanel.appendChild(toggleButton);
        }
        
        // Handle toggle behavior
        let isCollapsed = false;
        toggleButton.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            controlPanel.classList.toggle('collapsed', isCollapsed);
            
            if (this.currentBreakpoint === 'mobile') {
                toggleButton.innerHTML = isCollapsed ? '⬇️ Controls' : '⬆️ Controls';
            } else {
                toggleButton.innerHTML = isCollapsed ? '▶️' : '◀️';
            }
            
            // Animate toggle
            this.animateToggle(toggleButton, isCollapsed);
        });
        
        // Auto-collapse on mobile for better UX
        if (this.currentBreakpoint === 'mobile') {
            controlPanel.classList.add('collapsed');
            isCollapsed = true;
            toggleButton.innerHTML = '⬇️ Controls';
        }
    }
    
    adjustControlPanelForBreakpoint(breakpoint) {
        const controlPanel = document.querySelector('.control-panel');
        const toggleButton = controlPanel?.querySelector('.control-panel-toggle');
        
        if (!controlPanel || !toggleButton) return;
        
        // Remove existing breakpoint classes
        controlPanel.classList.remove('mobile-layout', 'tablet-layout', 'desktop-layout');
        
        // Add new breakpoint class
        controlPanel.classList.add(`${breakpoint}-layout`);
        
        // Update toggle button text/icon
        const isCollapsed = controlPanel.classList.contains('collapsed');
        if (breakpoint === 'mobile') {
            toggleButton.innerHTML = isCollapsed ? '⬇️ Controls' : '⬆️ Controls';
        } else {
            toggleButton.innerHTML = isCollapsed ? '▶️' : '◀️';
        }
    }
    
    updateLogoSizes(breakpoint) {
        if (!window.geometricLogo) return;
        
        const logoSizes = {
            mobile: { header: 40, modal: 24, watermark: 16 },
            tablet: { header: 50, modal: 28, watermark: 18 },
            desktop: { header: 60, modal: 30, watermark: 20 },
            large: { header: 70, modal: 35, watermark: 22 },
            ultrawide: { header: 80, modal: 40, watermark: 24 }
        };
        
        const sizes = logoSizes[breakpoint] || logoSizes.desktop;
        
        // Update logo instances
        window.geometricLogo.logoInstances.forEach((svg, key) => {
            let size = sizes.header;
            if (key.includes('modal')) size = sizes.modal;
            if (key.includes('watermark')) size = sizes.watermark;
            
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
        });
    }
    
    adjustModalBehavior(breakpoint) {
        const modals = document.querySelectorAll('.auth-modal, .payment-modal, .dashboard-modal');
        
        modals.forEach(modal => {
            const content = modal.querySelector('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
            if (!content) return;
            
            // Remove existing responsive classes
            content.classList.remove('mobile-modal', 'tablet-modal', 'desktop-modal');
            
            // Add appropriate class
            content.classList.add(`${breakpoint}-modal`);
            
            // Adjust modal positioning for mobile
            if (breakpoint === 'mobile') {
                content.style.margin = '10px';
                content.style.maxHeight = 'calc(100vh - 20px)';
                content.style.overflow = 'auto';
            } else {
                content.style.margin = '';
                content.style.maxHeight = '';
                content.style.overflow = '';
            }
        });
    }
    
    setupGeometricAnimations() {
        if (this.prefersReducedMotion) {
            console.log('🎭 Animations disabled due to reduced motion preference');
            return;
        }
        
        this.initializeHoverAnimations();
        this.initializeScrollAnimations();
        this.initializeInteractiveElements();
        this.initializeProgressAnimations();
    }
    
    initializeHoverAnimations() {
        // Enhanced button hover effects
        const buttons = document.querySelectorAll('.geometric-button, button:not(.close-button):not(.modal-button)');
        
        buttons.forEach(button => {
            if (this.isTouch) return; // Skip hover effects on touch devices
            
            button.addEventListener('mouseenter', (e) => {
                this.animateButtonHover(e.target, true);
            });
            
            button.addEventListener('mouseleave', (e) => {
                this.animateButtonHover(e.target, false);
            });
            
            button.addEventListener('click', (e) => {
                this.animateButtonClick(e.target);
            });
        });
        
        // Card hover animations
        const cards = document.querySelectorAll('.geometric-card, .plan-card, .credit-option');
        cards.forEach(card => {
            if (this.isTouch) return;
            
            card.addEventListener('mouseenter', (e) => {
                this.animateCardHover(e.target, true);
            });
            
            card.addEventListener('mouseleave', (e) => {
                this.animateCardHover(e.target, false);
            });
        });
    }
    
    animateButtonHover(button, isEntering) {
        if (this.prefersReducedMotion) return;
        
        const scale = isEntering ? 1.05 : 1;
        const glow = isEntering ? 'var(--geometric-glow-mixed)' : 'var(--geometric-glow-cyan)';
        
        button.style.transform = `scale(${scale})`;
        button.style.boxShadow = glow;
        
        if (isEntering) {
            button.classList.add('geometric-interactive');
            this.createRippleEffect(button);
        } else {
            button.classList.remove('geometric-interactive');
        }
    }
    
    animateButtonClick(button) {
        if (this.prefersReducedMotion) return;
        
        // Create click animation
        button.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        // Create pulse effect
        this.createPulseEffect(button);
    }
    
    animateCardHover(card, isEntering) {
        if (this.prefersReducedMotion) return;
        
        const translateY = isEntering ? -8 : 0;
        const scale = isEntering ? 1.02 : 1;
        
        card.style.transform = `translateY(${translateY}px) scale(${scale})`;
        
        if (isEntering) {
            card.classList.add('geometric-interactive', 'border-dancing');
        } else {
            card.classList.remove('geometric-interactive', 'border-dancing');
        }
    }
    
    createRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.className = 'geometric-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.3), transparent);
            transform: scale(0);
            animation: geometric-ripple 0.6s linear;
            pointer-events: none;
            z-index: 1;
        `;
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.marginLeft = -size / 2 + 'px';
        ripple.style.marginTop = -size / 2 + 'px';
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    createPulseEffect(element) {
        const pulse = document.createElement('div');
        pulse.className = 'geometric-pulse-effect';
        pulse.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid var(--geometric-cyan);
            border-radius: inherit;
            animation: geometric-pulse-expand 0.8s ease-out;
            pointer-events: none;
            z-index: 2;
        `;
        
        element.style.position = 'relative';
        element.appendChild(pulse);
        
        setTimeout(() => {
            pulse.remove();
        }, 800);
    }
    
    initializeScrollAnimations() {
        // Animate elements as they come into view
        const animatedElements = document.querySelectorAll('.geometric-card, .plan-card, .stat-card');
        
        animatedElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            element.style.transitionDelay = `${index * 0.1}s`;
        });
        
        // Trigger animations when elements are visible
        setTimeout(() => {
            animatedElements.forEach(element => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        }, 100);
    }
    
    initializeIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('geometric-visible');
                    this.animateElementEntry(entry.target);
                } else {
                    entry.target.classList.remove('geometric-visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe elements that should animate on scroll
        const observeElements = document.querySelectorAll('.control-panel, .user-status-bar, .geometric-card');
        observeElements.forEach(element => {
            observer.observe(element);
        });
        
        this.observers.set('scroll', observer);
    }
    
    animateElementEntry(element) {
        if (this.prefersReducedMotion) return;
        
        element.style.animation = 'geometric-fade-in-up 0.6s ease forwards';
    }
    
    initializeInteractiveElements() {
        // Add interactive classes to appropriate elements
        const interactiveElements = document.querySelectorAll(
            '.geometric-button, button:not(.close-button), .geometric-card, .plan-card'
        );
        
        interactiveElements.forEach(element => {
            element.classList.add('geometric-interactive');
            
            // Add morphing effect to certain elements
            if (element.classList.contains('plan-card') || element.classList.contains('credit-option')) {
                element.classList.add('morphing');
            }
            
            // Add flowing gradient to buttons
            if (element.tagName === 'BUTTON') {
                element.classList.add('flowing');
            }
        });
    }
    
    initializeProgressAnimations() {
        // Animate progress bars
        const progressBars = document.querySelectorAll('.progress-bar-inner, .usage-progress-bar');
        
        progressBars.forEach(bar => {
            const targetWidth = bar.style.width || bar.getAttribute('data-width') || '0%';
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.width = targetWidth;
            }, 500);
        });
        
        // Animate circular progress
        const circularProgress = document.querySelectorAll('.progress-ring-circle');
        circularProgress.forEach(circle => {
            const circumference = 2 * Math.PI * 50; // radius = 50
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = circumference;
            
            const targetProgress = circle.getAttribute('data-progress') || 0;
            const offset = circumference - (targetProgress / 100) * circumference;
            
            setTimeout(() => {
                circle.style.strokeDashoffset = offset;
            }, 500);
        });
    }
    
    updateResponsiveElements() {
        // Update any elements that need responsive adjustments
        this.updateControlPanelLayout();
        this.updateModalSizes();
        this.updateFontSizes();
    }
    
    updateControlPanelLayout() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return;
        
        const controlGroups = controlPanel.querySelectorAll('.control-group');
        
        controlGroups.forEach(group => {
            if (this.currentBreakpoint === 'mobile') {
                group.style.flexDirection = 'column';
            } else if (this.currentBreakpoint === 'tablet') {
                group.style.flexDirection = 'row';
                group.style.flexWrap = 'wrap';
            } else {
                group.style.display = 'grid';
                group.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
            }
        });
    }
    
    updateModalSizes() {
        const modals = document.querySelectorAll('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
        
        modals.forEach(modal => {
            if (this.currentBreakpoint === 'mobile') {
                modal.style.width = 'calc(100vw - 20px)';
                modal.style.maxWidth = 'none';
                modal.style.margin = '10px';
            } else if (this.currentBreakpoint === 'tablet') {
                modal.style.width = '90vw';
                modal.style.maxWidth = '600px';
                modal.style.margin = '20px auto';
            } else {
                modal.style.width = '80vw';
                modal.style.maxWidth = '800px';
                modal.style.margin = '40px auto';
            }
        });
    }
    
    updateFontSizes() {
        const root = document.documentElement;
        
        const fontSizes = {
            mobile: '14px',
            tablet: '15px',
            desktop: '16px',
            large: '17px',
            ultrawide: '18px'
        };
        
        root.style.fontSize = fontSizes[this.currentBreakpoint] || fontSizes.desktop;
    }
    
    optimizeForDevice() {
        // Optimize animations for device capabilities
        if (this.isTouch) {
            document.body.classList.add('touch-device');
            // Disable hover animations on touch devices
            const style = document.createElement('style');
            style.textContent = `
                .touch-device .geometric-interactive:hover {
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Optimize for low-end devices
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
            document.body.classList.add('low-end-device');
            this.prefersReducedMotion = true;
        }
        
        // Optimize for slow connections
        if (navigator.connection && navigator.connection.effectiveType === 'slow-2g') {
            document.body.classList.add('slow-connection');
            this.prefersReducedMotion = true;
        }
    }
    
    updateAnimations() {
        if (this.prefersReducedMotion) {
            // Disable all animations
            const style = document.createElement('style');
            style.id = 'reduced-motion-override';
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            // Re-enable animations
            const existingStyle = document.getElementById('reduced-motion-override');
            if (existingStyle) {
                existingStyle.remove();
            }
        }
    }
    
    // Public API methods
    getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }
    
    isCurrentBreakpoint(breakpoint) {
        return this.currentBreakpoint === breakpoint;
    }
    
    isMobile() {
        return this.currentBreakpoint === 'mobile';
    }
    
    isTablet() {
        return this.currentBreakpoint === 'tablet';
    }
    
    isDesktop() {
        return ['desktop', 'large', 'ultrawide'].includes(this.currentBreakpoint);
    }
    
    animateToggle(element, isCollapsed) {
        if (this.prefersReducedMotion) return;
        
        element.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    // Utility method to create custom animations
    createCustomAnimation(element, keyframes, options = {}) {
        if (this.prefersReducedMotion) return;
        
        const animation = element.animate(keyframes, {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards',
            ...options
        });
        
        const animationId = Date.now() + Math.random();
        this.animations.set(animationId, animation);
        
        animation.addEventListener('finish', () => {
            this.animations.delete(animationId);
        });
        
        return animation;
    }
    
    // Clean up method
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        // Disconnect observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        // Cancel animations
        this.animations.forEach(animation => {
            animation.cancel();
        });
        
        console.log('📱 Responsive Geometric Manager destroyed');
    }
}

// Add required CSS animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes geometric-ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes geometric-pulse-expand {
        to {
            transform: scale(1.1);
            opacity: 0;
        }
    }
    
    @keyframes geometric-fade-in-up {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(animationStyles);

// Initialize the responsive manager
document.addEventListener('DOMContentLoaded', () => {
    window.responsiveGeometricManager = new ResponsiveGeometricManager();
});

// Export for use in other modules
window.ResponsiveGeometricManager = ResponsiveGeometricManager;