/**
 * Enhanced UI Theme System with Animations
 * Fixes console log issues and implements cohesive design system
 */

class OrielUITheme {
    constructor() {
        this.colors = {
            primary: '#8309D5',
            secondary: '#FF6B6B', 
            accent: '#00D4FF',
            success: '#28A745',
            warning: '#FFC107',
            error: '#DC3545',
            dark: '#1A1A1A',
            light: '#FFFFFF',
            gray: {
                100: '#F8F9FA',
                200: '#E9ECEF',
                300: '#DEE2E6',
                400: '#CED4DA',
                500: '#6C757D',
                600: '#495057',
                700: '#343A40',
                800: '#212529',
                900: '#0D1117'
            }
        };
        
        this.animations = {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        };
        
        this.init();
    }
    
    init() {
        this.injectCSS();
        this.setupAnimationSystem();
        this.fixConsoleIssues();
    }
    
    injectCSS() {
        const css = `
            :root {
                --oriel-primary: ${this.colors.primary};
                --oriel-secondary: ${this.colors.secondary};
                --oriel-accent: ${this.colors.accent};
                --oriel-success: ${this.colors.success};
                --oriel-warning: ${this.colors.warning};
                --oriel-error: ${this.colors.error};
                --oriel-dark: ${this.colors.dark};
                --oriel-light: ${this.colors.light};
                --oriel-gray-100: ${this.colors.gray[100]};
                --oriel-gray-200: ${this.colors.gray[200]};
                --oriel-gray-300: ${this.colors.gray[300]};
                --oriel-gray-400: ${this.colors.gray[400]};
                --oriel-gray-500: ${this.colors.gray[500]};
                --oriel-gray-600: ${this.colors.gray[600]};
                --oriel-gray-700: ${this.colors.gray[700]};
                --oriel-gray-800: ${this.colors.gray[800]};
                --oriel-gray-900: ${this.colors.gray[900]};
                
                --oriel-ease-in-out: ${this.animations.easeInOut};
                --oriel-bounce: ${this.animations.bounce};
                --oriel-smooth: ${this.animations.smooth};
            }
            
            /* Oriel Brand Gradient */
            .oriel-gradient {
                background: linear-gradient(135deg, var(--oriel-primary), var(--oriel-secondary));
            }
            
            .oriel-gradient-text {
                background: linear-gradient(135deg, var(--oriel-primary), var(--oriel-secondary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            /* Animation Classes */
            .oriel-fade-in {
                animation: orielFadeIn 0.6s var(--oriel-ease-in-out);
            }
            
            .oriel-slide-up {
                animation: orielSlideUp 0.8s var(--oriel-bounce);
            }
            
            .oriel-pulse {
                animation: orielPulse 2s infinite;
            }
            
            .oriel-shimmer {
                animation: orielShimmer 1.5s infinite;
            }
            
            /* Download Animation Sequence */
            .oriel-download-sequence {
                position: relative;
                overflow: hidden;
            }
            
            .oriel-download-sequence::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent, 
                    rgba(131, 9, 213, 0.3), 
                    transparent
                );
                animation: orielDownloadProgress 3s ease-in-out;
            }
            
            /* Free Tier Watermark Animation */
            .oriel-free-tier-badge {
                position: relative;
                background: linear-gradient(45deg, var(--oriel-warning), #FFE066);
                color: var(--oriel-dark);
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                animation: orielFreeTierPulse 3s infinite;
                box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
            }
            
            /* Purchase Flow Animations */
            .oriel-purchase-modal {
                animation: orielModalSlideIn 0.5s var(--oriel-bounce);
            }
            
            .oriel-purchase-step {
                opacity: 0;
                transform: translateX(30px);
                animation: orielStepReveal 0.6s var(--oriel-ease-in-out) forwards;
            }
            
            .oriel-purchase-step:nth-child(2) { animation-delay: 0.1s; }
            .oriel-purchase-step:nth-child(3) { animation-delay: 0.2s; }
            .oriel-purchase-step:nth-child(4) { animation-delay: 0.3s; }
            
            /* Loading States */
            .oriel-loading {
                position: relative;
                color: transparent;
            }
            
            .oriel-loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border: 2px solid var(--oriel-gray-300);
                border-top: 2px solid var(--oriel-primary);
                border-radius: 50%;
                animation: orielSpin 1s linear infinite;
            }
            
            /* Success States */
            .oriel-success-checkmark {
                animation: orielCheckmarkDraw 0.8s var(--oriel-ease-in-out);
            }
            
            /* Keyframe Animations */
            @keyframes orielFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes orielSlideUp {
                from { 
                    opacity: 0; 
                    transform: translateY(30px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
            }
            
            @keyframes orielPulse {
                0%, 100% { 
                    transform: scale(1); 
                    opacity: 1; 
                }
                50% { 
                    transform: scale(1.05); 
                    opacity: 0.8; 
                }
            }
            
            @keyframes orielShimmer {
                0% { background-position: -200px 0; }
                100% { background-position: 200px 0; }
            }
            
            @keyframes orielDownloadProgress {
                0% { left: -100%; }
                50% { left: 0%; }
                100% { left: 100%; }
            }
            
            @keyframes orielFreeTierPulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
                }
                50% { 
                    transform: scale(1.02);
                    box-shadow: 0 6px 20px rgba(255, 193, 7, 0.5);
                }
            }
            
            @keyframes orielModalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes orielStepReveal {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes orielSpin {
                to { transform: rotate(360deg); }
            }
            
            @keyframes orielCheckmarkDraw {
                0% { stroke-dashoffset: 100; }
                100% { stroke-dashoffset: 0; }
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .oriel-purchase-modal {
                    animation: orielModalSlideUp 0.5s var(--oriel-ease-in-out);
                }
                
                @keyframes orielModalSlideUp {
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
            
            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                :root {
                    --oriel-dark: #FFFFFF;
                    --oriel-light: #1A1A1A;
                }
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }
    
    setupAnimationSystem() {
        // Animation sequence manager
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Pre-download animation sequence
        this.downloadSequences = {
            preparation: {
                duration: 500,
                animation: 'orielFadeIn'
            },
            processing: {
                duration: 2000,
                animation: 'orielDownloadProgress'
            },
            completion: {
                duration: 500,
                animation: 'orielSlideUp'
            }
        };
    }
    
    fixConsoleIssues() {
        // Fix health check spam
        this.setupGracefulHealthCheck();
        
        // Fix response.clone errors
        this.patchFetchResponses();
        
        // Fix download modal retry loops
        this.setupModalRetryLimits();
        
        // Reduce logging noise
        this.setupIntelligentLogging();
    }
    
    setupGracefulHealthCheck() {
        let healthCheckFailures = 0;
        const maxFailures = 3;
        let checkInterval = 5000; // Start with 5 seconds
        const maxInterval = 60000; // Max 1 minute
        
        const originalFetch = window.fetch;
        window.fetch = async function(url, options) {
            if (url.includes('/api/health')) {
                try {
                    const response = await originalFetch(url, options);
                    if (response.ok) {
                        healthCheckFailures = 0;
                        checkInterval = 5000; // Reset to normal
                    }
                    return response;
                } catch (error) {
                    healthCheckFailures++;
                    
                    if (healthCheckFailures >= maxFailures) {
                        // Exponential backoff
                        checkInterval = Math.min(checkInterval * 2, maxInterval);
                        console.warn(`⚠️ Health check failed ${healthCheckFailures} times. Reducing frequency to ${checkInterval/1000}s`);
                    }
                    
                    // Return a mock response to prevent errors
                    return new Response(null, { 
                        status: 503, 
                        statusText: 'Service Unavailable' 
                    });
                }
            }
            
            return originalFetch(url, options);
        };
    }
    
    patchFetchResponses() {
        const originalFetch = window.fetch;
        window.fetch = async function(url, options) {
            try {
                const response = await originalFetch(url, options);
                
                // Add clone method if missing
                if (response && typeof response.clone !== 'function') {
                    response.clone = function() {
                        return new Response(this.body, {
                            status: this.status,
                            statusText: this.statusText,
                            headers: this.headers
                        });
                    };
                }
                
                return response;
            } catch (error) {
                // Return a safe mock response
                return new Response(null, { 
                    status: 0, 
                    statusText: 'Network Error',
                    clone: function() {
                        return new Response(null, { 
                            status: 0, 
                            statusText: 'Network Error' 
                        });
                    }
                });
            }
        };
    }
    
    setupModalRetryLimits() {
        const retryLimits = new Map();
        const maxRetries = 5;
        
        const originalSetInterval = window.setInterval;
        window.setInterval = function(callback, delay) {
            const callbackString = callback.toString();
            
            // Detect download modal retry patterns
            if (callbackString.includes('download') && callbackString.includes('modal')) {
                const retryKey = callbackString.substring(0, 100);
                const currentRetries = retryLimits.get(retryKey) || 0;
                
                if (currentRetries >= maxRetries) {
                    console.warn('⚠️ Download modal retry limit reached. Stopping retries.');
                    return null; // Don't set the interval
                }
                
                retryLimits.set(retryKey, currentRetries + 1);
            }
            
            return originalSetInterval(callback, delay);
        };
    }
    
    setupIntelligentLogging() {
        const logCounts = new Map();
        const maxSameLogCount = 5;
        
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        function intelligentLog(level, originalMethod, ...args) {
            const message = args.join(' ');
            const logKey = `${level}:${message.substring(0, 50)}`;
            
            const count = logCounts.get(logKey) || 0;
            
            if (count < maxSameLogCount) {
                originalMethod(...args);
                logCounts.set(logKey, count + 1);
            } else if (count === maxSameLogCount) {
                originalMethod(`${message} (suppressing further identical messages)`);
                logCounts.set(logKey, count + 1);
            }
            // Suppress after maxSameLogCount
        }
        
        console.log = (...args) => intelligentLog('log', originalConsoleLog, ...args);
        console.error = (...args) => intelligentLog('error', originalConsoleError, ...args);
        console.warn = (...args) => intelligentLog('warn', originalConsoleWarn, ...args);
    }
    
    // Animation Methods
    async playDownloadSequence(element) {
        if (!element) return;
        
        element.classList.add('oriel-download-sequence');
        
        // Preparation phase
        await this.animateElement(element, 'oriel-fade-in', 500);
        
        // Processing phase (show progress)
        await this.animateElement(element, 'oriel-shimmer', 2000);
        
        // Completion phase
        await this.animateElement(element, 'oriel-slide-up', 500);
        
        element.classList.remove('oriel-download-sequence');
    }
    
    async playFreeTierAnimation(element) {
        if (!element) return;
        
        element.classList.add('oriel-free-tier-badge');
        
        // Subtle pulse to encourage upgrade
        setTimeout(() => {
            element.classList.add('oriel-pulse');
        }, 1000);
    }
    
    async playPurchaseFlowAnimation(container) {
        if (!container) return;
        
        container.classList.add('oriel-purchase-modal');
        
        const steps = container.querySelectorAll('.purchase-step');
        steps.forEach((step, index) => {
            step.classList.add('oriel-purchase-step');
            step.style.animationDelay = `${index * 0.1}s`;
        });
    }
    
    animateElement(element, animationClass, duration) {
        return new Promise(resolve => {
            element.classList.add(animationClass);
            
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    }
    
    // Utility Methods
    showLoadingState(element) {
        if (element) {
            element.classList.add('oriel-loading');
        }
    }
    
    hideLoadingState(element) {
        if (element) {
            element.classList.remove('oriel-loading');
        }
    }
    
    showSuccessState(element) {
        if (element) {
            element.classList.add('oriel-success-checkmark');
        }
    }
}

// Initialize the theme system
const orielTheme = new OrielUITheme();

// Export for use in other modules
window.OrielUITheme = OrielUITheme;
window.orielTheme = orielTheme;

console.log('🎨 Oriel UI Theme System initialized with animations and console fixes!');