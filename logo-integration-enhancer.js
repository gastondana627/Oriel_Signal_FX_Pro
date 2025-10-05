/**
 * Logo Integration Enhancer
 * Enhances the existing Oriel FX application with integrated geometric logos
 */

class LogoIntegrationEnhancer {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Wait for both DOM and geometric logo system to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.enhance());
        } else {
            this.enhance();
        }
    }
    
    enhance() {
        // Wait for geometric logo system to be available
        const checkLogoSystem = () => {
            if (window.geometricLogo && window.OrielLogo) {
                this.performEnhancements();
            } else {
                setTimeout(checkLogoSystem, 100);
            }
        };
        
        checkLogoSystem();
    }
    
    performEnhancements() {
        if (this.initialized) return;
        
        console.log('🎨 Enhancing application with logo integration...');
        
        // Enhance existing modals
        this.enhanceModals();
        
        // Add loading states to existing functionality
        this.enhanceLoadingStates();
        
        // Enhance user interactions
        this.enhanceUserInteractions();
        
        // Add logo to control panel
        this.enhanceControlPanel();
        
        // Integrate with authentication system
        this.enhanceAuthSystem();
        
        this.initialized = true;
        console.log('✅ Logo integration enhancement complete');
    }
    
    enhanceModals() {
        // Monitor for modal openings and add logos dynamically
        const modalIds = [
            'login-modal', 'register-modal', 'plan-selection-modal',
            'credit-purchase-modal', 'user-dashboard-modal',
            'payment-success-modal', 'payment-error-modal'
        ];
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                // Add logo to modal header if not already present
                this.addLogoToModal(modal, modalId);
                
                // Monitor modal visibility changes
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            const isVisible = !modal.classList.contains('modal-hidden');
                            if (isVisible) {
                                this.onModalOpen(modal, modalId);
                            }
                        }
                    });
                });
                
                observer.observe(modal, { attributes: true });
            }
        });
    }
    
    addLogoToModal(modal, modalId) {
        const headerSelectors = [
            '.auth-header h2',
            '.payment-header h2', 
            '.dashboard-header h2',
            '.success h2',
            '.error h2'
        ];
        
        for (const selector of headerSelectors) {
            const header = modal.querySelector(selector);
            if (header && !header.querySelector('.oriel-modal-logo')) {
                const logo = window.OrielLogo.addToElement(header, 24, `modal-${modalId}-logo`);
                if (logo) {
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.gap = '8px';
                    logo.style.marginRight = '8px';
                    break;
                }
            }
        }
    }
    
    onModalOpen(modal, modalId) {
        // Add subtle pulse animation when modal opens
        const logo = modal.querySelector('.oriel-modal-logo');
        if (logo && window.OrielLogo) {
            setTimeout(() => {
                window.OrielLogo.pulse(`modal-${modalId}-logo`);
            }, 300);
        }
    }
    
    enhanceLoadingStates() {
        // Enhance existing loading functionality
        const originalFetch = window.fetch;
        let activeRequests = 0;
        
        window.fetch = async function(...args) {
            activeRequests++;
            
            // Show loading for longer requests
            const loadingTimeout = setTimeout(() => {
                if (activeRequests > 0 && window.OrielLogo) {
                    window.OrielLogo.showLoading('Processing...');
                }
            }, 500);
            
            try {
                const response = await originalFetch.apply(this, args);
                return response;
            } finally {
                activeRequests--;
                clearTimeout(loadingTimeout);
                
                if (activeRequests === 0 && window.OrielLogo) {
                    setTimeout(() => {
                        window.OrielLogo.hideLoading();
                    }, 200);
                }
            }
        };
        
        // Enhance download button with loading state
        const downloadButton = document.getElementById('download-button');
        if (downloadButton) {
            const originalClick = downloadButton.onclick;
            downloadButton.addEventListener('click', (e) => {
                if (window.OrielLogo) {
                    window.OrielLogo.showLoading('Preparing download...');
                    
                    // Hide loading after download starts
                    setTimeout(() => {
                        window.OrielLogo.hideLoading();
                    }, 3000);
                }
            });
        }
    }
    
    enhanceUserInteractions() {
        // Add logo pulse on successful actions
        const successActions = [
            'login-submit-btn',
            'register-submit-btn', 
            'upgrade-btn',
            'buy-credits-btn'
        ];
        
        successActions.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    // Pulse header logo on user actions
                    setTimeout(() => {
                        if (window.OrielLogo) {
                            window.OrielLogo.pulse('header');
                        }
                    }, 100);
                });
            }
        });
        
        // Enhance randomize button
        const randomizeButton = document.getElementById('randomize-button');
        if (randomizeButton) {
            randomizeButton.addEventListener('click', () => {
                if (window.OrielLogo) {
                    window.OrielLogo.pulse('header');
                }
            });
        }
    }
    
    enhanceControlPanel() {
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel && !controlPanel.querySelector('.oriel-watermark')) {
            // Add subtle watermark logo
            const watermark = window.OrielLogo.addToElement(controlPanel, 18, 'control-panel-watermark');
            if (watermark) {
                watermark.style.position = 'absolute';
                watermark.style.bottom = '8px';
                watermark.style.right = '8px';
                watermark.style.opacity = '0.4';
                watermark.style.pointerEvents = 'none';
                
                controlPanel.style.position = 'relative';
            }
        }
    }
    
    enhanceAuthSystem() {
        // Monitor authentication state changes
        if (window.authManager) {
            const originalUpdateUI = window.authManager.updateUI;
            if (originalUpdateUI) {
                window.authManager.updateUI = function(user) {
                    const result = originalUpdateUI.call(this, user);
                    
                    // Pulse logo on auth state changes
                    if (window.OrielLogo) {
                        setTimeout(() => {
                            window.OrielLogo.pulse('header');
                        }, 500);
                    }
                    
                    return result;
                };
            }
        }
        
        // Enhance login/logout buttons
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (window.OrielLogo) {
                    window.OrielLogo.pulse('header');
                }
            });
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.OrielLogo) {
                    window.OrielLogo.pulse('header');
                }
            });
        }
    }
    
    // Public methods for external use
    addLogoToCustomElement(element, size = 30) {
        if (window.OrielLogo) {
            return window.OrielLogo.addToElement(element, size);
        }
        return null;
    }
    
    showCustomLoading(message) {
        if (window.OrielLogo) {
            window.OrielLogo.showLoading(message);
        }
    }
    
    hideCustomLoading() {
        if (window.OrielLogo) {
            window.OrielLogo.hideLoading();
        }
    }
    
    pulseHeaderLogo() {
        if (window.OrielLogo) {
            window.OrielLogo.pulse('header');
        }
    }
}

// Initialize the logo integration enhancer
window.logoIntegrationEnhancer = new LogoIntegrationEnhancer();

// Export for external use
window.LogoEnhancer = {
    addLogo: (element, size) => window.logoIntegrationEnhancer?.addLogoToCustomElement(element, size),
    showLoading: (message) => window.logoIntegrationEnhancer?.showCustomLoading(message),
    hideLoading: () => window.logoIntegrationEnhancer?.hideCustomLoading(),
    pulse: () => window.logoIntegrationEnhancer?.pulseHeaderLogo()
};

console.log('🎨 Logo Integration Enhancer loaded');