/**
 * Final UX Integration and Polish
 * Implements final UX improvements and ensures seamless integration
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class FinalUXIntegration {
    constructor() {
        this.config = {
            // Performance thresholds for final optimization
            performance: {
                pageLoadTarget: 2500, // Improved from 3000ms
                apiResponseTarget: 400, // Improved from 500ms
                fileGenerationTarget: 25000, // Improved from 30000ms
                memoryUsageTarget: 75, // Improved from 80%
                errorRateTarget: 2 // Improved from 5%
            },
            
            // UX enhancement settings
            ux: {
                animationDuration: 250, // Optimized for better feel
                feedbackDelay: 100, // Faster feedback
                loadingMinDuration: 500, // Prevent flash
                notificationStackLimit: 3,
                progressUpdateRate: 60 // 60fps for smooth progress
            },
            
            // Accessibility improvements
            accessibility: {
                focusRingColor: '#8309D5',
                highContrastRatio: 4.5,
                reducedMotionFallback: true,
                keyboardNavigationEnabled: true
            }
        };

        this.state = {
            isInitialized: false,
            systemsReady: new Set(),
            activeOperations: new Map(),
            performanceMetrics: new Map(),
            userPreferences: new Map()
        };

        this.systems = {
            uxEnhancement: null,
            userFeedback: null,
            performanceOptimization: null,
            errorHandler: null
        };

        this.init();
    }

    /**
     * Initialize final UX integration
     */
    async init() {
        try {
            console.log('🎨 Initializing Final UX Integration...');
            
            // Wait for core systems to be available
            await this.waitForCoreSystems();
            
            // Initialize integration systems
            await this.initializeIntegrationSystems();
            
            // Apply final polish and optimizations
            await this.applyFinalPolish();
            
            // Setup cross-system communication
            await this.setupSystemCommunication();
            
            // Apply performance optimizations
            await this.applyPerformanceOptimizations();
            
            // Setup user preference management
            await this.setupUserPreferences();
            
            // Initialize accessibility enhancements
            await this.initializeAccessibilityEnhancements();
            
            this.state.isInitialized = true;
            console.log('✅ Final UX Integration completed successfully');
            
            // Dispatch ready event
            this.dispatchReadyEvent();
            
        } catch (error) {
            console.error('❌ Failed to initialize Final UX Integration:', error);
            // Continue with degraded functionality
            this.initializeFallbackMode();
        }
    }

    /**
     * Wait for core systems to be available
     */
    async waitForCoreSystems() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100; // 100ms
        const startTime = Date.now();

        const requiredSystems = [
            'UXEnhancementSystem',
            'EnhancedUserFeedback',
            'PerformanceOptimization'
        ];

        while (Date.now() - startTime < maxWaitTime) {
            const availableSystems = requiredSystems.filter(system => 
                window[system] || window[system.toLowerCase()]
            );

            if (availableSystems.length === requiredSystems.length) {
                console.log('✅ All core UX systems are available');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        console.warn('⚠️ Some core systems not available, continuing with available systems');
    }

    /**
     * Initialize integration systems
     */
    async initializeIntegrationSystems() {
        // Initialize UX Enhancement System
        if (window.UXEnhancementSystem) {
            this.systems.uxEnhancement = new window.UXEnhancementSystem();
            this.state.systemsReady.add('uxEnhancement');
        }

        // Initialize Enhanced User Feedback
        if (window.EnhancedUserFeedback) {
            this.systems.userFeedback = new window.EnhancedUserFeedback();
            this.state.systemsReady.add('userFeedback');
        }

        // Initialize Performance Optimization
        if (window.PerformanceOptimization) {
            this.systems.performanceOptimization = new window.PerformanceOptimization();
            this.state.systemsReady.add('performanceOptimization');
        }

        console.log(`✅ Initialized ${this.state.systemsReady.size} integration systems`);
    }

    /**
     * Apply final polish and improvements
     */
    async applyFinalPolish() {
        // Enhance button interactions
        this.enhanceButtonInteractions();
        
        // Improve form user experience
        this.improveFormExperience();
        
        // Polish modal interactions
        this.polishModalInteractions();
        
        // Enhance loading states
        this.enhanceLoadingStates();
        
        // Improve error messaging
        this.improveErrorMessaging();
        
        // Add micro-interactions
        this.addMicroInteractions();
        
        console.log('✅ Final polish applied');
    }

    /**
     * Enhance button interactions with better feedback
     */
    enhanceButtonInteractions() {
        document.querySelectorAll('button').forEach(button => {
            if (!button.classList.contains('final-ux-enhanced')) {
                button.classList.add('final-ux-enhanced');
                
                // Add ripple effect on click
                button.addEventListener('click', (e) => {
                    this.createRippleEffect(button, e);
                });

                // Add hover state enhancement
                button.addEventListener('mouseenter', () => {
                    this.enhanceHoverState(button);
                });

                button.addEventListener('mouseleave', () => {
                    this.removeHoverState(button);
                });

                // Add focus enhancement
                button.addEventListener('focus', () => {
                    this.enhanceFocusState(button);
                });

                button.addEventListener('blur', () => {
                    this.removeFocusState(button);
                });
            }
        });
    }

    /**
     * Create ripple effect for button clicks
     */
    createRippleEffect(button, event) {
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'final-ux-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
            z-index: 1;
        `;

        // Ensure button has relative positioning
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        button.style.overflow = 'hidden';

        button.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    /**
     * Enhance hover state for buttons
     */
    enhanceHoverState(button) {
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        button.style.transition = 'all 0.2s ease';
    }

    /**
     * Remove hover state enhancement
     */
    removeHoverState(button) {
        button.style.transform = '';
        button.style.boxShadow = '';
    }

    /**
     * Enhance focus state for accessibility
     */
    enhanceFocusState(button) {
        button.style.outline = `2px solid ${this.config.accessibility.focusRingColor}`;
        button.style.outlineOffset = '2px';
    }

    /**
     * Remove focus state enhancement
     */
    removeFocusState(button) {
        button.style.outline = '';
        button.style.outlineOffset = '';
    }

    /**
     * Improve form user experience
     */
    improveFormExperience() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('final-ux-enhanced')) {
                input.classList.add('final-ux-enhanced');
                
                // Add floating label effect
                this.addFloatingLabel(input);
                
                // Add real-time validation feedback
                this.addValidationFeedback(input);
                
                // Add input enhancement animations
                this.addInputAnimations(input);
            }
        });
    }

    /**
     * Add floating label effect to inputs
     */
    addFloatingLabel(input) {
        const label = input.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            const wrapper = document.createElement('div');
            wrapper.className = 'final-ux-input-wrapper';
            wrapper.style.cssText = 'position: relative; margin-bottom: 20px;';
            
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            
            // Style the floating label
            label.style.cssText = `
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: white;
                padding: 0 4px;
                color: #6b7280;
                transition: all 0.2s ease;
                pointer-events: none;
                font-size: 14px;
            `;

            // Handle label animation
            const updateLabel = () => {
                if (input.value || input === document.activeElement) {
                    label.style.top = '0';
                    label.style.transform = 'translateY(-50%)';
                    label.style.fontSize = '12px';
                    label.style.color = '#8309D5';
                } else {
                    label.style.top = '50%';
                    label.style.transform = 'translateY(-50%)';
                    label.style.fontSize = '14px';
                    label.style.color = '#6b7280';
                }
            };

            input.addEventListener('focus', updateLabel);
            input.addEventListener('blur', updateLabel);
            input.addEventListener('input', updateLabel);
            
            // Initial state
            updateLabel();
        }
    }

    /**
     * Add real-time validation feedback
     */
    addValidationFeedback(input) {
        let validationTimeout;
        
        input.addEventListener('input', () => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                this.validateInput(input);
            }, 300); // Debounce validation
        });

        input.addEventListener('blur', () => {
            this.validateInput(input);
        });
    }

    /**
     * Validate input and show feedback
     */
    validateInput(input) {
        const isValid = input.checkValidity();
        const wrapper = input.closest('.final-ux-input-wrapper') || input.parentNode;
        
        // Remove existing validation indicators
        const existingIndicator = wrapper.querySelector('.final-ux-validation-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (input.value) {
            const indicator = document.createElement('div');
            indicator.className = 'final-ux-validation-indicator';
            indicator.style.cssText = `
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 16px;
                pointer-events: none;
            `;
            
            if (isValid) {
                indicator.textContent = '✓';
                indicator.style.color = '#10b981';
                input.style.borderColor = '#10b981';
            } else {
                indicator.textContent = '✗';
                indicator.style.color = '#ef4444';
                input.style.borderColor = '#ef4444';
            }
            
            wrapper.appendChild(indicator);
        } else {
            input.style.borderColor = '';
        }
    }

    /**
     * Add input enhancement animations
     */
    addInputAnimations(input) {
        input.addEventListener('focus', () => {
            input.style.transform = 'scale(1.02)';
            input.style.transition = 'all 0.2s ease';
        });

        input.addEventListener('blur', () => {
            input.style.transform = '';
        });
    }

    /**
     * Polish modal interactions
     */
    polishModalInteractions() {
        document.querySelectorAll('.modal, .auth-modal, .payment-modal, .dashboard-modal').forEach(modal => {
            if (!modal.classList.contains('final-ux-enhanced')) {
                modal.classList.add('final-ux-enhanced');
                
                // Add backdrop blur effect
                this.addBackdropBlur(modal);
                
                // Add modal entrance animation
                this.addModalAnimation(modal);
                
                // Add focus trap
                this.addFocusTrap(modal);
                
                // Add escape key handling
                this.addEscapeKeyHandling(modal);
            }
        });
    }

    /**
     * Add backdrop blur effect to modals
     */
    addBackdropBlur(modal) {
        const backdrop = modal.querySelector('.modal-backdrop, .auth-modal, .payment-modal, .dashboard-modal');
        if (backdrop) {
            backdrop.style.backdropFilter = 'blur(5px)';
            backdrop.style.webkitBackdropFilter = 'blur(5px)';
        }
    }

    /**
     * Add modal entrance animation
     */
    addModalAnimation(modal) {
        const content = modal.querySelector('.modal-content, .auth-modal-content, .payment-modal-content, .dashboard-modal-content');
        if (content) {
            // Set initial state
            content.style.transform = 'scale(0.9) translateY(-20px)';
            content.style.opacity = '0';
            content.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Animate in when modal is shown
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (!modal.classList.contains('modal-hidden')) {
                            setTimeout(() => {
                                content.style.transform = 'scale(1) translateY(0)';
                                content.style.opacity = '1';
                            }, 10);
                        }
                    }
                });
            });
            
            observer.observe(modal, { attributes: true });
        }
    }

    /**
     * Add focus trap to modals
     */
    addFocusTrap(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
        }
    }

    /**
     * Add escape key handling to modals
     */
    addEscapeKeyHandling(modal) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('modal-hidden')) {
                const closeButton = modal.querySelector('.close-button, .auth-close-btn, .payment-close-btn, .dashboard-close-btn');
                if (closeButton) {
                    closeButton.click();
                }
            }
        });
    }

    /**
     * Enhance loading states with better animations
     */
    enhanceLoadingStates() {
        // Enhance existing loading indicators
        document.querySelectorAll('.spinner-ring, .loading-spinner').forEach(spinner => {
            if (!spinner.classList.contains('final-ux-enhanced')) {
                spinner.classList.add('final-ux-enhanced');
                
                // Add pulsing effect
                spinner.style.animation = 'spin 1s linear infinite, pulse 2s ease-in-out infinite alternate';
            }
        });

        // Enhance progress bars
        document.querySelectorAll('.progress-bar, .ux-progress-bar').forEach(progressBar => {
            if (!progressBar.classList.contains('final-ux-enhanced')) {
                progressBar.classList.add('final-ux-enhanced');
                
                const fill = progressBar.querySelector('.progress-fill, .ux-progress-fill, .progress-bar-inner');
                if (fill) {
                    // Add shimmer effect
                    fill.style.background = `
                        linear-gradient(90deg, #8309D5, #a855f7, #8309D5)
                    `;
                    fill.style.backgroundSize = '200% 100%';
                    fill.style.animation = 'shimmer 2s ease-in-out infinite';
                }
            }
        });
    }

    /**
     * Improve error messaging with better UX
     */
    improveErrorMessaging() {
        // Enhance error display
        document.querySelectorAll('.form-error, .error-message').forEach(errorElement => {
            if (!errorElement.classList.contains('final-ux-enhanced')) {
                errorElement.classList.add('final-ux-enhanced');
                
                // Add slide-in animation for errors
                errorElement.style.transform = 'translateY(-10px)';
                errorElement.style.opacity = '0';
                errorElement.style.transition = 'all 0.3s ease';
                
                // Animate in when error is shown
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            if (errorElement.textContent.trim()) {
                                errorElement.style.transform = 'translateY(0)';
                                errorElement.style.opacity = '1';
                            } else {
                                errorElement.style.transform = 'translateY(-10px)';
                                errorElement.style.opacity = '0';
                            }
                        }
                    });
                });
                
                observer.observe(errorElement, { childList: true, characterData: true, subtree: true });
            }
        });
    }

    /**
     * Add micro-interactions for better user feedback
     */
    addMicroInteractions() {
        // Add hover effects to interactive elements
        document.querySelectorAll('a, button, .clickable').forEach(element => {
            if (!element.classList.contains('final-ux-micro-enhanced')) {
                element.classList.add('final-ux-micro-enhanced');
                
                element.addEventListener('mouseenter', () => {
                    element.style.transition = 'all 0.2s ease';
                    element.style.transform = 'translateY(-1px)';
                });

                element.addEventListener('mouseleave', () => {
                    element.style.transform = '';
                });
            }
        });

        // Add click feedback to all interactive elements
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, a, .clickable')) {
                this.addClickFeedback(e.target);
            }
        });
    }

    /**
     * Add visual click feedback
     */
    addClickFeedback(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    /**
     * Setup cross-system communication
     */
    async setupSystemCommunication() {
        // Create event bus for system communication
        this.eventBus = new EventTarget();
        
        // Setup system event listeners
        this.setupSystemEventListeners();
        
        // Create unified API for all systems
        this.createUnifiedAPI();
        
        console.log('✅ Cross-system communication established');
    }

    /**
     * Setup system event listeners
     */
    setupSystemEventListeners() {
        // Listen for performance events
        this.eventBus.addEventListener('performance-threshold-exceeded', (event) => {
            this.handlePerformanceIssue(event.detail);
        });

        // Listen for error events
        this.eventBus.addEventListener('error-occurred', (event) => {
            this.handleSystemError(event.detail);
        });

        // Listen for user feedback events
        this.eventBus.addEventListener('user-feedback-requested', (event) => {
            this.handleUserFeedbackRequest(event.detail);
        });
    }

    /**
     * Create unified API for all systems
     */
    createUnifiedAPI() {
        window.FinalUX = {
            // Loading management
            showLoading: (message, operation) => {
                if (this.systems.uxEnhancement) {
                    this.systems.uxEnhancement.showLoading(operation, message);
                }
            },
            
            hideLoading: (operation) => {
                if (this.systems.uxEnhancement) {
                    this.systems.uxEnhancement.hideLoading(operation);
                }
            },
            
            // Progress management
            showProgress: (percentage, message) => {
                if (this.systems.uxEnhancement) {
                    this.systems.uxEnhancement.showProgress(percentage, message);
                }
            },
            
            hideProgress: () => {
                if (this.systems.uxEnhancement) {
                    this.systems.uxEnhancement.hideProgress();
                }
            },
            
            // Notification management
            showNotification: (message, type, duration) => {
                if (this.systems.userFeedback) {
                    return this.systems.userFeedback.showNotification(message, type, { duration });
                } else if (this.systems.uxEnhancement) {
                    return this.systems.uxEnhancement.showNotification(message, type, duration);
                }
            },
            
            // Error handling
            handleError: (error, context) => {
                if (this.systems.uxEnhancement) {
                    this.systems.uxEnhancement.handleError(error, context);
                }
            },
            
            // Performance monitoring
            trackPerformance: (metric, value) => {
                if (this.systems.performanceOptimization) {
                    this.systems.performanceOptimization.trackMetric(metric, value);
                }
            }
        };
    }

    /**
     * Apply performance optimizations
     */
    async applyPerformanceOptimizations() {
        // Optimize CSS animations
        this.optimizeCSSAnimations();
        
        // Optimize JavaScript execution
        this.optimizeJavaScriptExecution();
        
        // Optimize DOM operations
        this.optimizeDOMOperations();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        console.log('✅ Performance optimizations applied');
    }

    /**
     * Optimize CSS animations for better performance
     */
    optimizeCSSAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            .final-ux-enhanced {
                will-change: transform, opacity;
            }
            
            .final-ux-enhanced:hover {
                will-change: transform;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Optimize JavaScript execution
     */
    optimizeJavaScriptExecution() {
        // Use requestAnimationFrame for smooth animations
        this.animationFrame = null;
        
        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // Throttle scroll events
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = setTimeout(() => {
                    this.handleScroll();
                    scrollTimeout = null;
                }, 16); // ~60fps
            }
        });
    }

    /**
     * Optimize DOM operations
     */
    optimizeDOMOperations() {
        // Use document fragments for multiple DOM insertions
        this.documentFragment = document.createDocumentFragment();
        
        // Cache frequently accessed elements
        this.cachedElements = new Map();
        
        // Setup mutation observer for efficient DOM monitoring
        this.setupMutationObserver();
    }

    /**
     * Setup mutation observer for efficient DOM monitoring
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enhanceNewElement(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Enhance newly added elements
     */
    enhanceNewElement(element) {
        // Apply enhancements to new buttons
        if (element.tagName === 'BUTTON') {
            this.enhanceButtonInteractions();
        }
        
        // Apply enhancements to new inputs
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
            this.improveFormExperience();
        }
        
        // Apply enhancements to new modals
        if (element.classList.contains('modal')) {
            this.polishModalInteractions();
        }
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor frame rate
        this.monitorFrameRate();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Monitor user interactions
        this.monitorUserInteractions();
    }

    /**
     * Monitor frame rate for smooth animations
     */
    monitorFrameRate() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 60;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Adjust animation quality based on FPS
                if (fps < 30) {
                    this.reduceAnimationQuality();
                } else if (fps > 50) {
                    this.restoreAnimationQuality();
                }
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                
                if (usagePercent > this.config.performance.memoryUsageTarget) {
                    this.optimizeMemoryUsage();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Monitor user interactions for performance insights
     */
    monitorUserInteractions() {
        ['click', 'scroll', 'keydown', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                this.trackUserInteraction(eventType, e);
            }, { passive: true });
        });
    }

    /**
     * Track user interaction performance
     */
    trackUserInteraction(type, event) {
        const interactionData = {
            type,
            timestamp: performance.now(),
            target: event.target.tagName,
            className: event.target.className
        };
        
        // Store interaction data for analysis
        this.state.performanceMetrics.set(`interaction_${Date.now()}`, interactionData);
        
        // Keep only recent interactions
        if (this.state.performanceMetrics.size > 100) {
            const oldestKey = this.state.performanceMetrics.keys().next().value;
            this.state.performanceMetrics.delete(oldestKey);
        }
    }

    /**
     * Setup user preference management
     */
    async setupUserPreferences() {
        // Load user preferences from localStorage
        this.loadUserPreferences();
        
        // Setup preference change listeners
        this.setupPreferenceListeners();
        
        // Apply user preferences
        this.applyUserPreferences();
        
        console.log('✅ User preference management configured');
    }

    /**
     * Load user preferences from storage
     */
    loadUserPreferences() {
        try {
            const stored = localStorage.getItem('finalUXPreferences');
            if (stored) {
                const preferences = JSON.parse(stored);
                Object.entries(preferences).forEach(([key, value]) => {
                    this.state.userPreferences.set(key, value);
                });
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    /**
     * Setup preference change listeners
     */
    setupPreferenceListeners() {
        // Listen for system preference changes
        if (window.matchMedia) {
            // Dark mode preference
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                this.state.userPreferences.set('darkMode', e.matches);
                this.applyUserPreferences();
            });
            
            // Reduced motion preference
            window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
                this.state.userPreferences.set('reducedMotion', e.matches);
                this.applyUserPreferences();
            });
            
            // High contrast preference
            window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
                this.state.userPreferences.set('highContrast', e.matches);
                this.applyUserPreferences();
            });
        }
    }

    /**
     * Apply user preferences to the interface
     */
    applyUserPreferences() {
        // Apply reduced motion
        if (this.state.userPreferences.get('reducedMotion')) {
            document.body.classList.add('final-ux-reduced-motion');
        } else {
            document.body.classList.remove('final-ux-reduced-motion');
        }
        
        // Apply high contrast
        if (this.state.userPreferences.get('highContrast')) {
            document.body.classList.add('final-ux-high-contrast');
        } else {
            document.body.classList.remove('final-ux-high-contrast');
        }
        
        // Save preferences
        this.saveUserPreferences();
    }

    /**
     * Save user preferences to storage
     */
    saveUserPreferences() {
        try {
            const preferences = Object.fromEntries(this.state.userPreferences);
            localStorage.setItem('finalUXPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save user preferences:', error);
        }
    }

    /**
     * Initialize accessibility enhancements
     */
    async initializeAccessibilityEnhancements() {
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup screen reader support
        this.setupScreenReaderSupport();
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Add accessibility styles
        this.addAccessibilityStyles();
        
        console.log('✅ Accessibility enhancements initialized');
    }

    /**
     * Setup enhanced keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Enhanced tab navigation
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
            
            // Arrow key navigation for custom components
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.handleArrowNavigation(e);
            }
            
            // Enter and Space for activation
            if (e.key === 'Enter' || e.key === ' ') {
                this.handleActivation(e);
            }
        });
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Add ARIA labels to interactive elements
        document.querySelectorAll('button, a, input, select, textarea').forEach(element => {
            if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
                const label = this.generateAriaLabel(element);
                if (label) {
                    element.setAttribute('aria-label', label);
                }
            }
        });
        
        // Setup live regions for dynamic content
        this.setupLiveRegions();
    }

    /**
     * Generate appropriate ARIA label for element
     */
    generateAriaLabel(element) {
        // Use existing text content or placeholder
        const text = element.textContent.trim() || 
                    element.placeholder || 
                    element.title || 
                    element.alt;
        
        if (text) {
            return text;
        }
        
        // Generate based on element type and context
        if (element.tagName === 'BUTTON') {
            if (element.classList.contains('close-button')) {
                return 'Close dialog';
            }
            if (element.classList.contains('download-button')) {
                return 'Download file';
            }
        }
        
        return null;
    }

    /**
     * Setup live regions for screen readers
     */
    setupLiveRegions() {
        // Create live region for status updates
        if (!document.getElementById('final-ux-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'final-ux-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(liveRegion);
        }
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Track focus for better management
        let lastFocusedElement = null;
        
        document.addEventListener('focusin', (e) => {
            lastFocusedElement = e.target;
        });
        
        // Restore focus when modals close
        document.addEventListener('modal-closed', () => {
            if (lastFocusedElement && document.contains(lastFocusedElement)) {
                lastFocusedElement.focus();
            }
        });
    }

    /**
     * Add accessibility styles
     */
    addAccessibilityStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .final-ux-reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            
            .final-ux-high-contrast {
                filter: contrast(150%) brightness(110%);
            }
            
            .final-ux-focus-visible {
                outline: 2px solid ${this.config.accessibility.focusRingColor} !important;
                outline-offset: 2px !important;
            }
            
            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle performance issues
     */
    handlePerformanceIssue(details) {
        console.warn('Performance issue detected:', details);
        
        // Apply performance optimizations
        this.reduceAnimationQuality();
        this.optimizeMemoryUsage();
        
        // Notify user if severe
        if (details.severity === 'critical') {
            window.FinalUX?.showNotification(
                'Performance issue detected. Some animations may be reduced for better experience.',
                'warning',
                5000
            );
        }
    }

    /**
     * Handle system errors
     */
    handleSystemError(error) {
        console.error('System error:', error);
        
        // Use unified error handling
        window.FinalUX?.handleError(error, { source: 'final-ux-integration' });
    }

    /**
     * Handle user feedback requests
     */
    handleUserFeedbackRequest(request) {
        // Route to appropriate feedback system
        if (request.type === 'notification') {
            window.FinalUX?.showNotification(request.message, request.level, request.duration);
        } else if (request.type === 'progress') {
            window.FinalUX?.showProgress(request.percentage, request.message);
        }
    }

    /**
     * Reduce animation quality for performance
     */
    reduceAnimationQuality() {
        document.body.classList.add('final-ux-reduced-animations');
    }

    /**
     * Restore animation quality
     */
    restoreAnimationQuality() {
        document.body.classList.remove('final-ux-reduced-animations');
    }

    /**
     * Optimize memory usage
     */
    optimizeMemoryUsage() {
        // Clear old performance metrics
        if (this.state.performanceMetrics.size > 50) {
            const entries = Array.from(this.state.performanceMetrics.entries());
            entries.slice(0, 25).forEach(([key]) => {
                this.state.performanceMetrics.delete(key);
            });
        }
        
        // Clear cached elements
        this.cachedElements.clear();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Initialize fallback mode for degraded functionality
     */
    initializeFallbackMode() {
        console.warn('Initializing Final UX Integration in fallback mode');
        
        // Provide basic functionality
        window.FinalUX = {
            showLoading: (message) => console.log('Loading:', message),
            hideLoading: () => console.log('Loading complete'),
            showProgress: (percentage, message) => console.log(`Progress: ${percentage}% - ${message}`),
            hideProgress: () => console.log('Progress complete'),
            showNotification: (message, type) => {
                console.log(`${type.toUpperCase()}: ${message}`);
                // Fallback to alert for critical messages
                if (type === 'error') {
                    alert(message);
                }
            },
            handleError: (error) => {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        };
        
        this.state.isInitialized = true;
    }

    /**
     * Dispatch ready event
     */
    dispatchReadyEvent() {
        const event = new CustomEvent('final-ux-ready', {
            detail: {
                systems: Array.from(this.state.systemsReady),
                config: this.config,
                api: window.FinalUX
            }
        });
        
        document.dispatchEvent(event);
        console.log('🎉 Final UX Integration is ready!');
    }

    // Utility methods for handling events
    handleResize() {
        // Handle responsive adjustments
        this.applyResponsiveOptimizations();
    }

    handleScroll() {
        // Handle scroll-based optimizations
        this.optimizeScrollPerformance();
    }

    handleTabNavigation(event) {
        // Enhanced tab navigation logic
        const focusableElements = document.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        // Add visual focus indicators
        event.target.classList.add('final-ux-focus-visible');
        setTimeout(() => {
            event.target.classList.remove('final-ux-focus-visible');
        }, 2000);
    }

    handleArrowNavigation(event) {
        // Custom arrow navigation for components
        const target = event.target;
        
        // Handle navigation in custom components
        if (target.closest('.dashboard-tabs')) {
            this.handleTabArrowNavigation(event);
        }
    }

    handleActivation(event) {
        // Handle Enter/Space activation
        const target = event.target;
        
        if (target.tagName === 'BUTTON' || target.hasAttribute('role')) {
            // Prevent default to avoid double activation
            if (event.key === ' ') {
                event.preventDefault();
            }
            
            // Add activation feedback
            this.addClickFeedback(target);
        }
    }

    handleTabArrowNavigation(event) {
        // Navigate between tabs with arrow keys
        const tabs = event.target.closest('.dashboard-tabs').querySelectorAll('.dashboard-tab-btn');
        const currentIndex = Array.from(tabs).indexOf(event.target);
        
        let nextIndex;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        } else {
            nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        }
        
        tabs[nextIndex].focus();
        event.preventDefault();
    }

    applyResponsiveOptimizations() {
        // Apply responsive optimizations based on screen size
        const width = window.innerWidth;
        
        if (width < 768) {
            // Mobile optimizations
            document.body.classList.add('final-ux-mobile');
            this.config.ux.animationDuration = 200; // Faster animations on mobile
        } else {
            document.body.classList.remove('final-ux-mobile');
            this.config.ux.animationDuration = 250; // Normal animations
        }
    }

    optimizeScrollPerformance() {
        // Optimize scroll performance
        const scrollTop = window.pageYOffset;
        
        // Pause non-critical animations during scroll
        if (!this.scrollTimeout) {
            document.body.classList.add('final-ux-scrolling');
            
            this.scrollTimeout = setTimeout(() => {
                document.body.classList.remove('final-ux-scrolling');
                this.scrollTimeout = null;
            }, 150);
        }
    }
}

// Initialize Final UX Integration when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FinalUXIntegration();
    });
} else {
    new FinalUXIntegration();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinalUXIntegration;
}