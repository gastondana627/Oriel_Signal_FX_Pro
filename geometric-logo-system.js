/**
 * Geometric Logo System - Icosahedron with Cyan/Pink Gradients
 * Creates and integrates the geometric logo throughout the application
 */

class GeometricLogoSystem {
    constructor() {
        this.logoId = 'oriel-geometric-logo';
        this.gradientId = 'oriel-gradient';
        this.size = 120;
        this.animationSpeed = 0.5;
        this.isAnimating = false;
        
        this.colors = {
            cyan: '#00D4FF',
            pink: '#FF6B6B',
            darkBg: '#0A0A0A'
        };
        
        // Track all logo instances
        this.logoInstances = new Map();
        
        this.init();
    }
    
    init() {
        this.createHeaderLogo();
        this.createLoadingLogo();
        this.integrateIntoApplication();
        this.addResponsiveCSS();
        this.startAnimation();
    }
    
    createHeaderLogo() {
        // Create header container
        const headerContainer = document.createElement('div');
        headerContainer.id = 'oriel-header';
        headerContainer.className = 'oriel-header';
        
        // Create logo SVG
        const logoSvg = this.createLogoSVG('header-logo', 60);
        logoSvg.style.cssText = `
            cursor: pointer;
            filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.4));
            transition: all 0.3s ease;
        `;
        
        // Create title text
        const titleText = document.createElement('div');
        titleText.className = 'oriel-title';
        titleText.innerHTML = '<span class="oriel-title-text">ORIEL FX</span>';
        
        headerContainer.appendChild(logoSvg);
        headerContainer.appendChild(titleText);
        
        // Add to page
        document.body.insertBefore(headerContainer, document.body.firstChild);
        
        // Store reference
        this.logoInstances.set('header', logoSvg);
        this.headerContainer = headerContainer;
        
        // Add interactivity
        this.addLogoInteractivity(logoSvg);
    }
    
    createLoadingLogo() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'oriel-loading-overlay';
        loadingOverlay.className = 'oriel-loading-overlay hidden';
        
        // Create loading logo
        const loadingLogo = this.createLogoSVG('loading-logo', 100);
        loadingLogo.style.cssText = `
            filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.6));
            animation: oriel-loading-pulse 2s ease-in-out infinite;
        `;
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'oriel-loading-text';
        loadingText.textContent = 'Loading...';
        
        loadingOverlay.appendChild(loadingLogo);
        loadingOverlay.appendChild(loadingText);
        
        // Add to page
        document.body.appendChild(loadingOverlay);
        
        // Store reference
        this.logoInstances.set('loading', loadingLogo);
        this.loadingOverlay = loadingOverlay;
    }
    
    createLogoSVG(id, size) {
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', id);
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 120 120');
        svg.className = 'oriel-logo-svg';
        
        // Create gradient definition
        this.createGradient(svg);
        
        // Create icosahedron paths
        this.createIcosahedron(svg);
        
        return svg;
    }
    
    createGradient(svg) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Main gradient
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', `${this.gradientId}-${svg.id}`);
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', this.colors.cyan);
        stop1.setAttribute('stop-opacity', '1');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', this.colors.pink);
        stop2.setAttribute('stop-opacity', '1');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        
        // Glow gradient
        const glowGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        glowGradient.setAttribute('id', `oriel-glow-gradient-${svg.id}`);
        glowGradient.setAttribute('cx', '50%');
        glowGradient.setAttribute('cy', '50%');
        glowGradient.setAttribute('r', '50%');
        
        const glowStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        glowStop1.setAttribute('offset', '0%');
        glowStop1.setAttribute('stop-color', this.colors.cyan);
        glowStop1.setAttribute('stop-opacity', '0.3');
        
        const glowStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        glowStop2.setAttribute('offset', '100%');
        glowStop2.setAttribute('stop-color', this.colors.pink);
        glowStop2.setAttribute('stop-opacity', '0');
        
        glowGradient.appendChild(glowStop1);
        glowGradient.appendChild(glowStop2);
        defs.appendChild(glowGradient);
        
        svg.appendChild(defs);
    }
    
    createIcosahedron(svg) {
        // Icosahedron vertices (scaled and centered for 120x120 viewBox)
        const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
        const scale = 25;
        const centerX = 60;
        const centerY = 60;
        
        // Calculate vertices
        const vertices = [
            [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
            [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
            [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]
        ].map(([x, y, z]) => [
            centerX + x * scale,
            centerY + y * scale,
            z * scale
        ]);
        
        // Define faces (triangles) of the icosahedron
        const faces = [
            [0, 1, 8], [0, 8, 4], [0, 4, 5], [0, 5, 9], [0, 9, 1],
            [2, 3, 10], [2, 10, 4], [2, 4, 8], [2, 8, 6], [2, 6, 3],
            [1, 6, 8], [1, 7, 6], [1, 9, 7], [3, 7, 11], [3, 11, 10],
            [4, 10, 5], [5, 10, 11], [5, 11, 9], [6, 7, 3], [7, 9, 11]
        ];
        
        // Create group for the icosahedron
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', `icosahedron-group-${svg.id}`);
        group.className = 'oriel-icosahedron-group';
        
        // Create visible edges (wireframe style)
        const edges = new Set();
        faces.forEach(face => {
            for (let i = 0; i < 3; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % 3];
                const edge = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                edges.add(edge);
            }
        });
        
        // Draw edges
        edges.forEach(edge => {
            const [v1, v2] = edge.split('-').map(Number);
            const [x1, y1] = vertices[v1];
            const [x2, y2] = vertices[v2];
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', `url(#${this.gradientId}-${svg.id})`);
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            line.style.opacity = '0.8';
            
            group.appendChild(line);
        });
        
        // Add vertices as small circles
        vertices.forEach(([x, y], index) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '2');
            circle.setAttribute('fill', `url(#${this.gradientId}-${svg.id})`);
            circle.style.opacity = '0.9';
            
            group.appendChild(circle);
        });
        
        svg.appendChild(group);
        return group;
    }
    
    integrateIntoApplication() {
        // Add logo to modals when they open
        this.addModalLogos();
        
        // Add logo to splash screens
        this.addSplashLogo();
        
        // Integrate with existing UI elements
        this.enhanceExistingElements();
    }
    
    addModalLogos() {
        // Add small logos to modal headers
        const modals = [
            'login-modal', 'register-modal', 'plan-selection-modal', 
            'credit-purchase-modal', 'user-dashboard-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const header = modal.querySelector('.auth-header, .payment-header, .dashboard-header');
                if (header && !header.querySelector('.oriel-modal-logo')) {
                    const modalLogo = this.createLogoSVG(`modal-logo-${modalId}`, 30);
                    modalLogo.className = 'oriel-modal-logo';
                    modalLogo.style.cssText = `
                        margin-right: 10px;
                        vertical-align: middle;
                        filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.3));
                    `;
                    
                    const h2 = header.querySelector('h2');
                    if (h2) {
                        h2.insertBefore(modalLogo, h2.firstChild);
                    }
                    
                    this.logoInstances.set(`modal-${modalId}`, modalLogo);
                }
            }
        });
    }
    
    addSplashLogo() {
        // Create splash screen with logo for initial loading
        const splashScreen = document.createElement('div');
        splashScreen.id = 'oriel-splash-screen';
        splashScreen.className = 'oriel-splash-screen';
        
        const splashLogo = this.createLogoSVG('splash-logo', 150);
        splashLogo.style.cssText = `
            filter: drop-shadow(0 0 40px rgba(0, 212, 255, 0.8));
            animation: oriel-splash-pulse 3s ease-in-out infinite;
        `;
        
        const splashTitle = document.createElement('div');
        splashTitle.className = 'oriel-splash-title';
        splashTitle.innerHTML = '<span class="oriel-gradient-text">ORIEL FX</span>';
        
        const splashSubtitle = document.createElement('div');
        splashSubtitle.className = 'oriel-splash-subtitle';
        splashSubtitle.textContent = 'Audio Visualizer';
        
        splashScreen.appendChild(splashLogo);
        splashScreen.appendChild(splashTitle);
        splashScreen.appendChild(splashSubtitle);
        
        document.body.appendChild(splashScreen);
        
        this.logoInstances.set('splash', splashLogo);
        this.splashScreen = splashScreen;
        
        // Auto-hide splash after 2 seconds
        setTimeout(() => {
            this.hideSplash();
        }, 2000);
    }
    
    enhanceExistingElements() {
        // Add subtle logo watermark to control panel
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel && !controlPanel.querySelector('.oriel-watermark')) {
            const watermark = this.createLogoSVG('watermark-logo', 20);
            watermark.className = 'oriel-watermark';
            watermark.style.cssText = `
                position: absolute;
                bottom: 10px;
                right: 10px;
                opacity: 0.3;
                filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.2));
            `;
            
            controlPanel.style.position = 'relative';
            controlPanel.appendChild(watermark);
            
            this.logoInstances.set('watermark', watermark);
        }
    }
    
    addLogoInteractivity(svg) {
        svg.addEventListener('mouseenter', () => {
            svg.style.transform = 'scale(1.1)';
            svg.style.filter = svg.style.filter.replace(/rgba\([^)]+\)/, 'rgba(255, 107, 107, 0.5)');
        });
        
        svg.addEventListener('mouseleave', () => {
            svg.style.transform = 'scale(1)';
            svg.style.filter = svg.style.filter.replace(/rgba\([^)]+\)/, 'rgba(0, 212, 255, 0.4)');
        });
        
        svg.addEventListener('click', () => {
            this.pulseAnimation(svg);
        });
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        let rotation = 0;
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            rotation += this.animationSpeed;
            
            // Animate all logo instances
            this.logoInstances.forEach((svg, key) => {
                const group = svg.querySelector('.oriel-icosahedron-group');
                if (group) {
                    group.style.transformOrigin = '60px 60px';
                    group.style.transform = `rotate(${rotation}deg)`;
                }
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    stopAnimation() {
        this.isAnimating = false;
    }
    
    pulseAnimation(svg) {
        const targetSvg = svg || this.logoInstances.get('header');
        if (!targetSvg) return;
        
        const originalTransform = targetSvg.style.transform;
        const originalFilter = targetSvg.style.filter;
        
        targetSvg.style.transform = 'scale(1.3)';
        targetSvg.style.filter = 'drop-shadow(0 0 40px rgba(255, 107, 107, 0.7))';
        
        setTimeout(() => {
            targetSvg.style.transform = originalTransform;
            targetSvg.style.filter = originalFilter;
        }, 200);
    }
    
    // Loading state management
    showLoading(message = 'Loading...') {
        if (this.loadingOverlay) {
            const loadingText = this.loadingOverlay.querySelector('.oriel-loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            this.loadingOverlay.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }
    
    hideSplash() {
        if (this.splashScreen) {
            this.splashScreen.style.opacity = '0';
            setTimeout(() => {
                this.splashScreen.style.display = 'none';
            }, 500);
        }
    }
    
    addResponsiveCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Header Logo Styles */
            .oriel-header {
                position: fixed;
                top: 20px;
                left: 20px;
                display: flex;
                align-items: center;
                gap: 15px;
                z-index: 1000;
                background: rgba(10, 10, 10, 0.8);
                backdrop-filter: blur(10px);
                padding: 10px 20px;
                border-radius: 25px;
                border: 1px solid rgba(0, 212, 255, 0.2);
            }
            
            .oriel-title {
                display: flex;
                align-items: center;
            }
            
            .oriel-title-text {
                font-family: 'Arial', sans-serif;
                font-size: 1.2rem;
                font-weight: bold;
                background: linear-gradient(135deg, #00D4FF, #FF6B6B);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
            }
            
            /* Loading Overlay Styles */
            .oriel-loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(10, 10, 10, 0.95);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.5s ease;
            }
            
            .oriel-loading-overlay.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            .oriel-loading-text {
                margin-top: 20px;
                font-family: 'Arial', sans-serif;
                font-size: 1.1rem;
                color: #00D4FF;
                text-align: center;
            }
            
            /* Splash Screen Styles */
            .oriel-splash-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #16213e 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                transition: opacity 0.5s ease;
            }
            
            .oriel-splash-title {
                margin-top: 30px;
                font-family: 'Arial', sans-serif;
                font-size: 3rem;
                font-weight: bold;
                text-align: center;
            }
            
            .oriel-splash-subtitle {
                margin-top: 10px;
                font-family: 'Arial', sans-serif;
                font-size: 1.2rem;
                color: rgba(0, 212, 255, 0.8);
                text-align: center;
            }
            
            .oriel-gradient-text {
                background: linear-gradient(135deg, #00D4FF, #FF6B6B);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
            }
            
            /* Modal Logo Styles */
            .oriel-modal-logo {
                display: inline-block;
                vertical-align: middle;
            }
            
            /* Watermark Styles */
            .oriel-watermark {
                pointer-events: none;
            }
            
            /* Logo SVG Common Styles */
            .oriel-logo-svg {
                cursor: pointer;
                user-select: none;
                transition: all 0.3s ease;
            }
            
            /* Animations */
            @keyframes oriel-loading-pulse {
                0%, 100% {
                    transform: scale(1);
                    filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.6));
                }
                50% {
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 40px rgba(255, 107, 107, 0.8));
                }
            }
            
            @keyframes oriel-splash-pulse {
                0%, 100% {
                    transform: scale(1);
                    filter: drop-shadow(0 0 40px rgba(0, 212, 255, 0.8));
                }
                33% {
                    transform: scale(1.05);
                    filter: drop-shadow(0 0 50px rgba(0, 212, 255, 1));
                }
                66% {
                    transform: scale(1.1);
                    filter: drop-shadow(0 0 60px rgba(255, 107, 107, 1));
                }
            }
            
            @keyframes oriel-glow {
                0%, 100% {
                    filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.4));
                }
                50% {
                    filter: drop-shadow(0 0 25px rgba(255, 107, 107, 0.6));
                }
            }
            
            .oriel-logo-svg:hover {
                animation: oriel-glow 2s ease-in-out infinite;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .oriel-header {
                    top: 15px;
                    left: 15px;
                    padding: 8px 15px;
                    gap: 10px;
                }
                
                .oriel-title-text {
                    font-size: 1rem;
                }
                
                .oriel-splash-title {
                    font-size: 2.5rem;
                }
                
                .oriel-splash-subtitle {
                    font-size: 1rem;
                }
            }
            
            @media (max-width: 480px) {
                .oriel-header {
                    top: 10px;
                    left: 10px;
                    padding: 6px 12px;
                    gap: 8px;
                }
                
                .oriel-title-text {
                    font-size: 0.9rem;
                }
                
                .oriel-splash-title {
                    font-size: 2rem;
                }
                
                .oriel-splash-subtitle {
                    font-size: 0.9rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Utility methods
    updateColors(cyan, pink) {
        this.colors.cyan = cyan;
        this.colors.pink = pink;
        
        // Update all gradients
        this.logoInstances.forEach((svg, key) => {
            const gradient = svg.querySelector(`#${this.gradientId}-${svg.id}`);
            if (gradient) {
                const stops = gradient.querySelectorAll('stop');
                if (stops[0]) stops[0].setAttribute('stop-color', cyan);
                if (stops[1]) stops[1].setAttribute('stop-color', pink);
            }
        });
    }
    
    resizeLogo(instanceKey, newSize) {
        const svg = this.logoInstances.get(instanceKey);
        if (svg) {
            svg.setAttribute('width', newSize);
            svg.setAttribute('height', newSize);
        }
    }
    
    setLogoPosition(instanceKey, x, y) {
        const svg = this.logoInstances.get(instanceKey);
        if (svg && svg.parentElement) {
            svg.parentElement.style.left = `${x}px`;
            svg.parentElement.style.top = `${y}px`;
        }
    }
    
    // Public API methods
    showSplash() {
        if (this.splashScreen) {
            this.splashScreen.style.display = 'flex';
            this.splashScreen.style.opacity = '1';
        }
    }
    
    toggleAnimation() {
        if (this.isAnimating) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
    
    // Get logo instance for external use
    getLogo(instanceKey = 'header') {
        return this.logoInstances.get(instanceKey);
    }
    
    // Add logo to custom element
    addLogoToElement(element, size = 40, id = null) {
        const logoId = id || `custom-logo-${Date.now()}`;
        const logo = this.createLogoSVG(logoId, size);
        logo.style.cssText = `
            filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.3));
        `;
        
        element.appendChild(logo);
        this.logoInstances.set(logoId, logo);
        this.addLogoInteractivity(logo);
        
        return logo;
    }
}

// Initialize the geometric logo system
document.addEventListener('DOMContentLoaded', () => {
    // Initialize immediately for splash screen
    window.geometricLogo = new GeometricLogoSystem();
    console.log('🎨 Geometric logo system initialized with full integration');
    
    // Integrate with existing modals after a short delay
    setTimeout(() => {
        window.geometricLogo.addModalLogos();
    }, 1000);
});

// Export for use in other modules
window.GeometricLogoSystem = GeometricLogoSystem;

// Utility functions for external use
window.OrielLogo = {
    show: (instanceKey = 'header') => window.geometricLogo?.getLogo(instanceKey),
    showLoading: (message) => window.geometricLogo?.showLoading(message),
    hideLoading: () => window.geometricLogo?.hideLoading(),
    showSplash: () => window.geometricLogo?.showSplash(),
    hideSplash: () => window.geometricLogo?.hideSplash(),
    addToElement: (element, size, id) => window.geometricLogo?.addLogoToElement(element, size, id),
    pulse: (instanceKey) => {
        const logo = window.geometricLogo?.getLogo(instanceKey);
        if (logo) window.geometricLogo?.pulseAnimation(logo);
    }
};