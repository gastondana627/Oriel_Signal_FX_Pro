/**
 * UI Initialization Fix
 * Resolves delayed rendering and ensures consistent geometric theme loading
 */

class UIInitializationFix {
    constructor() {
        this.isInitialized = false;
        this.loadStartTime = performance.now();
        this.criticalResources = [
            'geometric-theme-system.css',
            'unified-geometric-fix.css',
            'style.css'
        ];
        this.initializationSteps = [];
        
        this.init();
    }

    init() {
        // Add loading class to body immediately
        document.body.classList.add('loading-state');
        
        // Start initialization process
        this.waitForDOMReady().then(() => {
            this.initializeUI();
        });
    }

    async waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    async initializeUI() {
        console.log('🎨 Starting UI initialization...');
        
        try {
            // Step 1: Ensure critical CSS is loaded
            await this.ensureCriticalCSS();
            
            // Step 2: Fix scroll and overflow issues immediately
            this.fixScrollIssues();
            
            // Step 3: Initialize geometric theme
            await this.initializeGeometricTheme();
            
            // Step 4: Fix positioning conflicts
            this.fixPositioningConflicts();
            
            // Step 5: Initialize responsive behavior
            this.initializeResponsiveBehavior();
            
            // Step 6: Setup performance optimizations
            this.setupPerformanceOptimizations();
            
            // Step 7: Mark as loaded
            this.markAsLoaded();
            
            console.log(`✅ UI initialization complete in ${(performance.now() - this.loadStartTime).toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ UI initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async ensureCriticalCSS() {
        const promises = this.criticalResources.map(resource => {
            return new Promise((resolve) => {
                const existingLink = document.querySelector(`link[href*="${resource}"]`);
                if (existingLink) {
                    if (existingLink.sheet) {
                        resolve();
                    } else {
                        existingLink.addEventListener('load', resolve);
                        existingLink.addEventListener('error', resolve);
                    }
                } else {
                    // CSS file doesn't exist, that's okay
                    resolve();
                }
            });
        });

        await Promise.all(promises);
        console.log('📄 Critical CSS loaded');
    }

    fixScrollIssues() {
        // Remove overflow: hidden from body and html
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        
        // Ensure proper viewport
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0';
            document.head.appendChild(viewport);
        }
        
        console.log('📜 Scroll issues fixed');
    }

    async initializeGeometricTheme() {
        // Apply CSS custom properties immediately
        const root = document.documentElement;
        
        const geometricProperties = {
            '--primary-cyan': '#00D4FF',
            '--primary-pink': '#FF6B6B',
            '--dark-bg': '#0A0A0A',
            '--dark-bg-secondary': '#1A1A1A',
            '--gradient-primary': 'linear-gradient(135deg, #00D4FF, #FF6B6B)',
            '--geometric-glow': '0 0 20px rgba(0, 212, 255, 0.3)',
            '--transition-normal': '0.3s ease'
        };

        Object.entries(geometricProperties).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Apply geometric classes to existing elements
        this.applyGeometricClasses();
        
        console.log('🎨 Geometric theme initialized');
    }

    applyGeometricClasses() {
        // Apply geometric styling to buttons
        const buttons = document.querySelectorAll('button, .btn, .upload-btn');
        buttons.forEach(button => {
            if (!button.classList.contains('geometric-btn')) {
                button.classList.add('geometric-btn');
            }
        });

        // Apply geometric styling to modals
        const modals = document.querySelectorAll('.modal, [id*="modal"]');
        modals.forEach(modal => {
            modal.classList.add('geometric-modal');
        });

        // Apply geometric styling to panels
        const panels = document.querySelectorAll('.control-panel, .user-status-bar');
        panels.forEach(panel => {
            panel.classList.add('geometric-panel');
        });
    }

    fixPositioningConflicts() {
        // Ensure graph container doesn't block interactions
        const graphContainer = document.getElementById('graph-container');
        if (graphContainer) {
            graphContainer.style.pointerEvents = 'none';
            
            // But allow canvas interactions for visualizer
            const canvas = graphContainer.querySelector('canvas');
            if (canvas) {
                canvas.style.pointerEvents = 'auto';
            }
        }

        // Fix z-index conflicts
        const zIndexMap = {
            '#graph-container': 1,
            '.control-panel': 100,
            '.user-status-bar': 100,
            '#play-pause-button': 100,
            '#download-button': 100,
            '.auth-modal': 1000,
            '.payment-modal': 1000,
            '.dashboard-modal': 1000
        };

        Object.entries(zIndexMap).forEach(([selector, zIndex]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.zIndex = zIndex;
            });
        });

        console.log('🎯 Positioning conflicts resolved');
    }

    initializeResponsiveBehavior() {
        // Handle window resize
        const handleResize = this.debounce(() => {
            this.updateResponsiveLayout();
        }, 250);

        window.addEventListener('resize', handleResize);
        
        // Initial responsive layout
        this.updateResponsiveLayout();
        
        console.log('📱 Responsive behavior initialized');
    }

    updateResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
        
        document.body.classList.toggle('mobile-layout', isMobile);
        document.body.classList.toggle('tablet-layout', isTablet);
        document.body.classList.toggle('desktop-layout', !isMobile && !isTablet);

        // Adjust control panel for mobile
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel && isMobile) {
            controlPanel.style.position = 'relative';
            controlPanel.style.top = 'auto';
            controlPanel.style.left = 'auto';
            controlPanel.style.margin = '16px';
        } else if (controlPanel) {
            controlPanel.style.position = 'fixed';
            controlPanel.style.top = '32px';
            controlPanel.style.left = '24px';
            controlPanel.style.margin = '0';
        }
    }

    setupPerformanceOptimizations() {
        // Enable hardware acceleration for key elements
        const acceleratedElements = document.querySelectorAll(
            '.control-panel, .user-status-bar, #play-pause-button, #download-button, .geometric-btn'
        );
        
        acceleratedElements.forEach(element => {
            element.style.transform = 'translateZ(0)';
            element.style.willChange = 'transform';
        });

        // Optimize animations
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }

        console.log('⚡ Performance optimizations applied');
    }

    markAsLoaded() {
        // Remove loading state
        document.body.classList.remove('loading-state');
        document.body.classList.add('loaded');
        
        // Dispatch custom event
        const loadedEvent = new CustomEvent('uiInitialized', {
            detail: {
                loadTime: performance.now() - this.loadStartTime,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(loadedEvent);
        this.isInitialized = true;
    }

    handleInitializationError(error) {
        console.error('UI Initialization Error:', error);
        
        // Fallback: at least fix the scroll issue
        this.fixScrollIssues();
        document.body.classList.remove('loading-state');
        document.body.classList.add('error-state');
        
        // Show user-friendly error
        this.showErrorMessage('UI initialization encountered an issue. Some features may not work as expected.');
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            font-family: sans-serif;
            font-size: 14px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public methods for external use
    isReady() {
        return this.isInitialized;
    }

    forceReinitialization() {
        this.isInitialized = false;
        this.loadStartTime = performance.now();
        this.initializeUI();
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.uiInitFix = new UIInitializationFix();
    
    // Expose for debugging
    window.debugUI = () => {
        console.log('UI Initialization Status:', {
            isReady: window.uiInitFix.isReady(),
            loadTime: performance.now() - window.uiInitFix.loadStartTime,
            bodyClasses: Array.from(document.body.classList),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIInitializationFix;
}