/**
 * Geometric Modal Enhancements - Apply geometric theme to all modals
 * Ensures payment, authentication, and dashboard modals have consistent geometric styling
 */

(function() {
    'use strict';
    
    console.log('🎨 Applying geometric enhancements to modals...');
    
    class GeometricModalEnhancer {
        constructor() {
            this.init();
        }
        
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.enhanceAllModals();
                });
            } else {
                this.enhanceAllModals();
            }
            
            // Set up modal event listeners
            this.setupModalHandlers();
        }
        
        enhanceAllModals() {
            // Enhance authentication modals
            this.enhanceAuthModals();
            
            // Enhance payment modals
            this.enhancePaymentModals();
            
            // Enhance dashboard modal
            this.enhanceDashboardModal();
            
            // Add geometric animations
            this.addModalAnimations();
            
            console.log('✅ All modals enhanced with geometric theme');
        }
        
        enhanceAuthModals() {
            const authModals = [
                '#login-modal',
                '#register-modal'
            ];
            
            authModals.forEach(selector => {
                const modal = document.querySelector(selector);
                if (modal) {
                    this.applyGeometricStyling(modal, 'auth');
                    
                    // Enhance form inputs
                    const inputs = modal.querySelectorAll('input');
                    inputs.forEach(input => {
                        this.enhanceInput(input);
                    });
                    
                    // Enhance buttons
                    const buttons = modal.querySelectorAll('button');
                    buttons.forEach(button => {
                        this.enhanceButton(button);
                    });
                }
            });
        }
        
        enhancePaymentModals() {
            const paymentModals = [
                '#plan-selection-modal',
                '#credit-purchase-modal',
                '#payment-success-modal',
                '#payment-error-modal'
            ];
            
            paymentModals.forEach(selector => {
                const modal = document.querySelector(selector);
                if (modal) {
                    this.applyGeometricStyling(modal, 'payment');
                    
                    // Enhance plan cards
                    const planCards = modal.querySelectorAll('.plan-card, .credit-option');
                    planCards.forEach(card => {
                        this.enhancePlanCard(card);
                    });
                    
                    // Enhance payment buttons
                    const buttons = modal.querySelectorAll('button');
                    buttons.forEach(button => {
                        this.enhanceButton(button);
                    });
                }
            });
        }
        
        enhanceDashboardModal() {
            const dashboardModal = document.querySelector('#user-dashboard-modal');
            if (dashboardModal) {
                this.applyGeometricStyling(dashboardModal, 'dashboard');
                
                // Enhance dashboard tabs
                const tabs = dashboardModal.querySelectorAll('.dashboard-tab-btn');
                tabs.forEach(tab => {
                    this.enhanceTab(tab);
                });
                
                // Enhance dashboard cards
                const cards = dashboardModal.querySelectorAll('.stat-card, .info-item');
                cards.forEach(card => {
                    this.enhanceDashboardCard(card);
                });
                
                // Enhance forms
                const forms = dashboardModal.querySelectorAll('form');
                forms.forEach(form => {
                    this.enhanceForm(form);
                });
            }
        }
        
        applyGeometricStyling(modal, type) {
            // Add geometric classes
            modal.classList.add('geometric-modal');
            
            const modalContent = modal.querySelector('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
            if (modalContent) {
                modalContent.classList.add('geometric-modal-content');
                
                // Add type-specific styling
                modalContent.classList.add(`geometric-${type}-modal`);
                
                // Add geometric border effect
                if (!modalContent.querySelector('.geometric-border-effect')) {
                    const borderEffect = document.createElement('div');
                    borderEffect.className = 'geometric-border-effect';
                    modalContent.insertBefore(borderEffect, modalContent.firstChild);
                }
            }
        }
        
        enhanceInput(input) {
            input.classList.add('geometric-input');
            
            // Add focus effects
            input.addEventListener('focus', () => {
                input.classList.add('geometric-focus');
            });
            
            input.addEventListener('blur', () => {
                input.classList.remove('geometric-focus');
            });
        }
        
        enhanceButton(button) {
            // Skip close buttons and certain system buttons
            if (button.classList.contains('close-button') || 
                button.classList.contains('modal-button')) {
                return;
            }
            
            button.classList.add('geometric-button');
            
            // Add click animation
            button.addEventListener('click', () => {
                button.classList.add('geometric-click');
                setTimeout(() => {
                    button.classList.remove('geometric-click');
                }, 200);
            });
        }
        
        enhancePlanCard(card) {
            card.classList.add('geometric-card');
            
            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.classList.add('geometric-hover');
            });
            
            card.addEventListener('mouseleave', () => {
                card.classList.remove('geometric-hover');
            });
            
            // Add selection effects for credit options
            if (card.classList.contains('credit-option')) {
                card.addEventListener('click', () => {
                    // Remove selection from siblings
                    const siblings = card.parentNode.querySelectorAll('.credit-option');
                    siblings.forEach(sibling => {
                        sibling.classList.remove('geometric-selected');
                    });
                    
                    // Add selection to clicked card
                    card.classList.add('geometric-selected');
                });
            }
        }
        
        enhanceDashboardCard(card) {
            card.classList.add('geometric-card');
            
            // Add subtle animation
            card.style.animationDelay = `${Math.random() * 0.5}s`;
        }
        
        enhanceTab(tab) {
            tab.classList.add('geometric-tab');
            
            // Add click effects
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                const allTabs = tab.parentNode.querySelectorAll('.dashboard-tab-btn');
                allTabs.forEach(t => {
                    t.classList.remove('geometric-active');
                });
                
                // Add active to clicked tab
                tab.classList.add('geometric-active');
            });
        }
        
        enhanceForm(form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                this.enhanceInput(input);
            });
            
            const buttons = form.querySelectorAll('button');
            buttons.forEach(button => {
                this.enhanceButton(button);
            });
        }
        
        addModalAnimations() {
            // Add CSS for geometric modal animations
            const style = document.createElement('style');
            style.textContent = `
                /* Geometric Modal Enhancements */
                .geometric-modal {
                    backdrop-filter: blur(10px);
                }
                
                .geometric-modal-content {
                    position: relative;
                    overflow: hidden;
                    animation: geometricModalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .geometric-border-effect {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--geometric-gradient-primary);
                    z-index: 1;
                }
                
                .geometric-border-effect::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                    animation: geometricBorderSweep 2s ease-in-out infinite;
                }
                
                .geometric-input {
                    transition: var(--geometric-transition);
                    border: 2px solid var(--geometric-cyan);
                    background: rgba(10, 10, 10, 0.8);
                    color: white;
                    border-radius: var(--geometric-border-radius);
                }
                
                .geometric-input:focus,
                .geometric-input.geometric-focus {
                    border-color: var(--geometric-pink);
                    box-shadow: var(--geometric-glow-pink);
                    outline: none;
                }
                
                .geometric-card {
                    transition: var(--geometric-transition);
                    border: 2px solid var(--geometric-cyan);
                    background: rgba(10, 10, 10, 0.8);
                    border-radius: var(--geometric-border-radius);
                    position: relative;
                    overflow: hidden;
                }
                
                .geometric-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--geometric-gradient-primary);
                }
                
                .geometric-card.geometric-hover {
                    border-color: var(--geometric-pink);
                    box-shadow: var(--geometric-glow-mixed);
                    transform: translateY(-4px);
                }
                
                .geometric-card.geometric-selected {
                    border-color: var(--geometric-pink);
                    box-shadow: var(--geometric-glow-pink);
                    background: rgba(255, 107, 107, 0.1);
                }
                
                .geometric-tab {
                    transition: var(--geometric-transition);
                    position: relative;
                }
                
                .geometric-tab.geometric-active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--geometric-gradient-primary);
                    border-radius: 2px 2px 0 0;
                }
                
                .geometric-button.geometric-click {
                    transform: scale(0.95);
                }
                
                /* Modal Animations */
                @keyframes geometricModalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                @keyframes geometricBorderSweep {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                
                /* Success/Error Modal Specific Styling */
                .geometric-payment-modal .success-icon {
                    color: var(--geometric-cyan);
                    text-shadow: var(--geometric-glow-cyan);
                }
                
                .geometric-payment-modal .error-icon {
                    color: var(--geometric-pink);
                    text-shadow: var(--geometric-glow-pink);
                }
                
                /* Progress Bar Enhancements */
                .progress-bar {
                    background: var(--geometric-dark);
                    border: 1px solid var(--geometric-cyan);
                    border-radius: var(--geometric-border-radius);
                }
                
                .progress-bar-inner {
                    background: var(--geometric-gradient-primary);
                    border-radius: var(--geometric-border-radius);
                    position: relative;
                }
                
                .progress-bar-inner::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    animation: progressShimmer 2s ease-in-out infinite;
                }
                
                @keyframes progressShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                /* Mobile Responsiveness */
                @media (max-width: 768px) {
                    .geometric-modal-content {
                        margin: 10px;
                        animation: geometricModalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    
                    @keyframes geometricModalSlideUp {
                        from {
                            opacity: 0;
                            transform: translateY(100%);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        setupModalHandlers() {
            // Handle modal opening/closing with geometric effects
            const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
            modalTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    const modalId = trigger.dataset.modalTrigger;
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        this.openModalWithEffect(modal);
                    }
                });
            });
            
            // Handle close buttons
            const closeButtons = document.querySelectorAll('.close-button');
            closeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const modal = button.closest('.auth-modal, .payment-modal, .dashboard-modal');
                    if (modal) {
                        this.closeModalWithEffect(modal);
                    }
                });
            });
        }
        
        openModalWithEffect(modal) {
            modal.classList.remove('modal-hidden');
            
            const modalContent = modal.querySelector('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
            if (modalContent) {
                modalContent.style.animation = 'geometricModalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        }
        
        closeModalWithEffect(modal) {
            const modalContent = modal.querySelector('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
            if (modalContent) {
                modalContent.style.animation = 'geometricModalSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                setTimeout(() => {
                    modal.classList.add('modal-hidden');
                }, 300);
            } else {
                modal.classList.add('modal-hidden');
            }
        }
    }
    
    // Initialize geometric modal enhancer
    const geometricModalEnhancer = new GeometricModalEnhancer();
    window.geometricModalEnhancer = geometricModalEnhancer;
    
    console.log('✅ Geometric modal enhancements applied');
    
})();