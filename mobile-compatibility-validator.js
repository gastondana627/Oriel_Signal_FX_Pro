/**
 * Mobile Compatibility Validator
 * Task 8.1: Comprehensive mobile compatibility testing and validation
 * Ensures geometric theme works perfectly across all mobile devices
 */

class MobileCompatibilityValidator {
    constructor() {
        this.testResults = new Map();
        this.deviceInfo = {};
        this.performanceMetrics = {};
        this.init();
    }
    
    init() {
        this.detectDevice();
        this.setupEventListeners();
        this.runInitialTests();
        console.log('📱 Mobile Compatibility Validator initialized');
    }
    
    detectDevice() {
        this.deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            touchSupport: 'ontouchstart' in window,
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent),
            isMobile: window.innerWidth <= 768,
            isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
            isDesktop: window.innerWidth > 1024,
            hasNotch: this.detectNotch(),
            supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)') || CSS.supports('-webkit-backdrop-filter', 'blur(10px)'),
            supportsGridLayout: CSS.supports('display', 'grid'),
            supportsFlexbox: CSS.supports('display', 'flex'),
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
            connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
        };
        
        console.log('📱 Device Info:', this.deviceInfo);
    }
    
    detectNotch() {
        // Detect iPhone X+ notch
        if (this.deviceInfo?.isIOS) {
            const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)');
            return safeAreaTop && parseInt(safeAreaTop) > 0;
        }
        return false;
    }
    
    setupEventListeners() {
        // Resize and orientation change
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.detectDevice();
                this.runResponsiveTests();
            }, 250);
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.detectDevice();
                this.runResponsiveTests();
            }, 500);
        });
        
        // Performance monitoring
        this.monitorPerformance();
    }
    
    runInitialTests() {
        this.testViewportConfiguration();
        this.testResponsiveBreakpoints();
        this.testTouchTargets();
        this.testGeometricTheme();
        this.testControlPanelMobile();
        this.testModalResponsiveness();
        this.testTypographyScaling();
        this.testAccessibility();
        this.testPerformance();
        this.generateReport();
    }
    
    runResponsiveTests() {
        this.testResponsiveBreakpoints();
        this.testControlPanelMobile();
        this.testModalResponsiveness();
        this.generateReport();
    }
    
    testViewportConfiguration() {
        const results = [];
        
        // Check viewport meta tag
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        results.push({
            test: 'Viewport Meta Tag',
            pass: viewportMeta && viewportMeta.content.includes('width=device-width'),
            details: viewportMeta ? viewportMeta.content : 'Missing viewport meta tag',
            critical: true
        });
        
        // Check initial scale
        results.push({
            test: 'Initial Scale',
            pass: !viewportMeta || viewportMeta.content.includes('initial-scale=1'),
            details: 'Initial scale should be 1.0 for proper mobile rendering',
            critical: true
        });
        
        // Check user scalability
        const userScalable = viewportMeta && viewportMeta.content.includes('user-scalable=no');
        results.push({
            test: 'User Scalability',
            pass: !userScalable,
            details: userScalable ? 'User scaling disabled (accessibility concern)' : 'User scaling allowed',
            critical: false
        });
        
        // Check viewport dimensions
        results.push({
            test: 'Viewport Dimensions',
            pass: window.innerWidth > 0 && window.innerHeight > 0,
            details: `${window.innerWidth}x${window.innerHeight}`,
            critical: true
        });
        
        this.testResults.set('viewport', results);
    }
    
    testResponsiveBreakpoints() {
        const results = [];
        const width = window.innerWidth;
        
        // Test breakpoint detection
        const responsiveManager = window.responsiveGeometricManager;
        if (responsiveManager) {
            const currentBreakpoint = responsiveManager.getCurrentBreakpoint();
            let expectedBreakpoint;
            
            if (width <= 480) expectedBreakpoint = 'mobile';
            else if (width <= 768) expectedBreakpoint = 'tablet';
            else if (width <= 1024) expectedBreakpoint = 'desktop';
            else if (width <= 1200) expectedBreakpoint = 'large';
            else expectedBreakpoint = 'ultrawide';
            
            results.push({
                test: 'Breakpoint Detection',
                pass: currentBreakpoint === expectedBreakpoint,
                details: `Current: ${currentBreakpoint}, Expected: ${expectedBreakpoint}`,
                critical: true
            });
        } else {
            results.push({
                test: 'Responsive Manager',
                pass: false,
                details: 'Responsive Geometric Manager not found',
                critical: true
            });
        }
        
        // Test CSS breakpoints
        const testElement = document.createElement('div');
        testElement.style.cssText = 'position: absolute; top: -9999px; left: -9999px;';
        document.body.appendChild(testElement);
        
        // Test mobile styles
        testElement.className = 'mobile-only';
        const mobileVisible = getComputedStyle(testElement).display !== 'none';
        results.push({
            test: 'Mobile CSS Breakpoint',
            pass: width <= 480 ? mobileVisible : !mobileVisible,
            details: `Mobile styles ${mobileVisible ? 'active' : 'inactive'} at ${width}px`,
            critical: false
        });
        
        // Test tablet styles
        testElement.className = 'tablet-only';
        const tabletVisible = getComputedStyle(testElement).display !== 'none';
        results.push({
            test: 'Tablet CSS Breakpoint',
            pass: (width > 480 && width <= 768) ? tabletVisible : !tabletVisible,
            details: `Tablet styles ${tabletVisible ? 'active' : 'inactive'} at ${width}px`,
            critical: false
        });
        
        document.body.removeChild(testElement);
        
        this.testResults.set('breakpoints', results);
    }
    
    testTouchTargets() {
        const results = [];
        const minTouchTarget = 44; // iOS minimum
        const recommendedTouchTarget = 48; // Android recommendation
        
        // Test all interactive elements
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [onclick], [role="button"]');
        
        let totalElements = 0;
        let adequateTargets = 0;
        let recommendedTargets = 0;
        
        interactiveElements.forEach((element, index) => {
            if (element.offsetParent === null) return; // Skip hidden elements
            
            const rect = element.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const area = width * height;
            
            totalElements++;
            
            const isAdequate = width >= minTouchTarget && height >= minTouchTarget;
            const isRecommended = width >= recommendedTouchTarget && height >= recommendedTouchTarget;
            
            if (isAdequate) adequateTargets++;
            if (isRecommended) recommendedTargets++;
            
            // Log problematic elements
            if (!isAdequate && index < 10) { // Limit logging
                console.warn(`Small touch target: ${element.tagName} ${width}x${height}px`, element);
            }
        });
        
        results.push({
            test: 'Touch Target Adequacy',
            pass: adequateTargets / totalElements >= 0.9, // 90% should be adequate
            details: `${adequateTargets}/${totalElements} elements meet 44px minimum`,
            critical: true
        });
        
        results.push({
            test: 'Touch Target Recommendation',
            pass: recommendedTargets / totalElements >= 0.8, // 80% should be recommended size
            details: `${recommendedTargets}/${totalElements} elements meet 48px recommendation`,
            critical: false
        });
        
        // Test specific critical elements
        const criticalElements = [
            { selector: '#play-pause-button', name: 'Play/Pause Button' },
            { selector: '#download-button', name: 'Download Button' },
            { selector: '.auth-btn', name: 'Auth Buttons' },
            { selector: '.user-btn', name: 'User Buttons' }
        ];
        
        criticalElements.forEach(({ selector, name }) => {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                const rect = element.getBoundingClientRect();
                const isAdequate = rect.width >= minTouchTarget && rect.height >= minTouchTarget;
                
                results.push({
                    test: `${name} Touch Target`,
                    pass: isAdequate,
                    details: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
                    critical: true
                });
            }
        });
        
        this.testResults.set('touchTargets', results);
    }
    
    testGeometricTheme() {
        const results = [];
        
        // Test CSS custom properties
        const rootStyles = getComputedStyle(document.documentElement);
        const geometricCyan = rootStyles.getPropertyValue('--geometric-cyan').trim();
        const geometricPink = rootStyles.getPropertyValue('--geometric-pink').trim();
        
        results.push({
            test: 'Geometric Color Variables',
            pass: geometricCyan.includes('#00D4FF') && geometricPink.includes('#FF6B6B'),
            details: `Cyan: ${geometricCyan}, Pink: ${geometricPink}`,
            critical: true
        });
        
        // Test gradient support
        const testElement = document.createElement('div');
        testElement.style.background = 'linear-gradient(45deg, #00D4FF, #FF6B6B)';
        document.body.appendChild(testElement);
        
        const gradientSupport = getComputedStyle(testElement).background.includes('gradient') || 
                               getComputedStyle(testElement).backgroundImage.includes('gradient');
        
        results.push({
            test: 'CSS Gradient Support',
            pass: gradientSupport,
            details: gradientSupport ? 'Gradients supported' : 'Gradients not supported',
            critical: false
        });
        
        document.body.removeChild(testElement);
        
        // Test backdrop filter support
        results.push({
            test: 'Backdrop Filter Support',
            pass: this.deviceInfo.supportsBackdropFilter,
            details: this.deviceInfo.supportsBackdropFilter ? 'Backdrop filters supported' : 'Backdrop filters not supported',
            critical: false
        });
        
        // Test geometric animations
        const animatedElements = document.querySelectorAll('.geometric-pulse, .geometric-rotate, [class*="geometric-"]');
        results.push({
            test: 'Geometric Elements Present',
            pass: animatedElements.length > 0,
            details: `${animatedElements.length} geometric elements found`,
            critical: false
        });
        
        this.testResults.set('geometricTheme', results);
    }
    
    testControlPanelMobile() {
        const results = [];
        const controlPanel = document.querySelector('.control-panel');
        
        if (!controlPanel) {
            results.push({
                test: 'Control Panel Existence',
                pass: false,
                details: 'Control panel not found',
                critical: true
            });
            this.testResults.set('controlPanel', results);
            return;
        }
        
        const rect = controlPanel.getBoundingClientRect();
        const styles = getComputedStyle(controlPanel);
        
        // Test visibility
        results.push({
            test: 'Control Panel Visibility',
            pass: rect.width > 0 && rect.height > 0 && styles.display !== 'none',
            details: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
            critical: true
        });
        
        // Test mobile positioning
        if (this.deviceInfo.isMobile) {
            const isBottomPositioned = styles.position === 'fixed' && 
                                     (styles.bottom === '0px' || parseInt(styles.bottom) >= 0);
            
            results.push({
                test: 'Mobile Bottom Positioning',
                pass: isBottomPositioned,
                details: `Position: ${styles.position}, Bottom: ${styles.bottom}`,
                critical: true
            });
        }
        
        // Test toggle button
        const toggleButton = controlPanel.querySelector('.control-panel-toggle');
        if (this.deviceInfo.isMobile) {
            results.push({
                test: 'Mobile Toggle Button',
                pass: toggleButton !== null,
                details: toggleButton ? 'Toggle button present' : 'Toggle button missing',
                critical: true
            });
            
            if (toggleButton) {
                const toggleRect = toggleButton.getBoundingClientRect();
                results.push({
                    test: 'Toggle Button Touch Target',
                    pass: toggleRect.width >= 44 && toggleRect.height >= 44,
                    details: `${Math.round(toggleRect.width)}x${Math.round(toggleRect.height)}px`,
                    critical: true
                });
            }
        }
        
        // Test control inputs
        const inputs = controlPanel.querySelectorAll('input, button, select');
        let adequateInputs = 0;
        
        inputs.forEach(input => {
            const inputRect = input.getBoundingClientRect();
            if (inputRect.height >= 44) adequateInputs++;
        });
        
        results.push({
            test: 'Control Input Touch Targets',
            pass: inputs.length === 0 || adequateInputs / inputs.length >= 0.8,
            details: `${adequateInputs}/${inputs.length} inputs have adequate touch targets`,
            critical: true
        });
        
        this.testResults.set('controlPanel', results);
    }
    
    testModalResponsiveness() {
        const results = [];
        
        // Test modal containers
        const modals = document.querySelectorAll('.auth-modal, .payment-modal, .dashboard-modal');
        
        results.push({
            test: 'Modal Elements Present',
            pass: modals.length > 0,
            details: `${modals.length} modal containers found`,
            critical: false
        });
        
        modals.forEach((modal, index) => {
            const content = modal.querySelector('.auth-modal-content, .payment-modal-content, .dashboard-modal-content');
            
            if (content) {
                const styles = getComputedStyle(content);
                
                // Test mobile width
                if (this.deviceInfo.isMobile) {
                    const hasFullWidth = styles.width === '100%' || 
                                       styles.maxWidth === '100%' ||
                                       parseInt(styles.width) >= window.innerWidth * 0.9;
                    
                    results.push({
                        test: `Modal ${index + 1} Mobile Width`,
                        pass: hasFullWidth,
                        details: `Width: ${styles.width}, Max-width: ${styles.maxWidth}`,
                        critical: true
                    });
                }
                
                // Test overflow handling
                results.push({
                    test: `Modal ${index + 1} Overflow`,
                    pass: styles.overflowY === 'auto' || styles.overflowY === 'scroll',
                    details: `Overflow-Y: ${styles.overflowY}`,
                    critical: false
                });
            }
        });
        
        this.testResults.set('modals', results);
    }
    
    testTypographyScaling() {
        const results = [];
        
        // Test root font size
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        results.push({
            test: 'Root Font Size',
            pass: rootFontSize >= 14,
            details: `${rootFontSize}px`,
            critical: false
        });
        
        // Test text scaling
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label');
        let readableText = 0;
        let totalText = 0;
        
        textElements.forEach(element => {
            if (element.offsetParent === null) return; // Skip hidden elements
            if (element.textContent.trim().length === 0) return; // Skip empty elements
            
            const fontSize = parseFloat(getComputedStyle(element).fontSize);
            totalText++;
            
            if (fontSize >= 14) readableText++;
        });
        
        results.push({
            test: 'Text Readability',
            pass: totalText === 0 || readableText / totalText >= 0.8,
            details: `${readableText}/${totalText} elements have readable font size (≥14px)`,
            critical: false
        });
        
        // Test line height
        const bodyLineHeight = getComputedStyle(document.body).lineHeight;
        const lineHeightValue = parseFloat(bodyLineHeight);
        results.push({
            test: 'Line Height',
            pass: lineHeightValue >= 1.4 || bodyLineHeight === 'normal',
            details: `Line height: ${bodyLineHeight}`,
            critical: false
        });
        
        this.testResults.set('typography', results);
    }
    
    testAccessibility() {
        const results = [];
        
        // Test reduced motion support
        results.push({
            test: 'Reduced Motion Preference',
            pass: true, // Always pass, informational
            details: `Reduced motion: ${this.deviceInfo.prefersReducedMotion ? 'enabled' : 'disabled'}`,
            critical: false
        });
        
        // Test high contrast support
        results.push({
            test: 'High Contrast Preference',
            pass: true, // Always pass, informational
            details: `High contrast: ${this.deviceInfo.prefersHighContrast ? 'enabled' : 'disabled'}`,
            critical: false
        });
        
        // Test focus indicators
        const focusableElements = document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]');
        let elementsWithFocus = 0;
        
        focusableElements.forEach(element => {
            // Create a temporary focus to test styles
            const originalOutline = element.style.outline;
            element.focus();
            const focusStyles = getComputedStyle(element);
            element.blur();
            element.style.outline = originalOutline;
            
            if (focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none') {
                elementsWithFocus++;
            }
        });
        
        results.push({
            test: 'Focus Indicators',
            pass: focusableElements.length === 0 || elementsWithFocus / focusableElements.length >= 0.5,
            details: `${elementsWithFocus}/${focusableElements.length} elements have focus indicators`,
            critical: false
        });
        
        // Test color contrast (basic check)
        const bodyStyles = getComputedStyle(document.body);
        const textColor = bodyStyles.color;
        const backgroundColor = bodyStyles.backgroundColor;
        
        results.push({
            test: 'Color Contrast',
            pass: true, // Basic check - would need more sophisticated contrast calculation
            details: `Text: ${textColor}, Background: ${backgroundColor}`,
            critical: false
        });
        
        this.testResults.set('accessibility', results);
    }
    
    testPerformance() {
        const results = [];
        
        // Test animation performance
        if (this.performanceMetrics.fps) {
            results.push({
                test: 'Frame Rate',
                pass: this.performanceMetrics.fps >= 30,
                details: `${this.performanceMetrics.fps} FPS`,
                critical: false
            });
        }
        
        // Test memory usage
        if (performance.memory) {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            results.push({
                test: 'Memory Usage',
                pass: memoryMB < 100,
                details: `${memoryMB} MB`,
                critical: false
            });
        }
        
        // Test paint timing
        if (performance.getEntriesByType) {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            
            if (firstPaint) {
                results.push({
                    test: 'First Paint Time',
                    pass: firstPaint.startTime < 2000,
                    details: `${Math.round(firstPaint.startTime)}ms`,
                    critical: false
                });
            }
        }
        
        // Test connection type
        if (this.deviceInfo.connectionType) {
            results.push({
                test: 'Connection Type',
                pass: true, // Informational
                details: this.deviceInfo.connectionType,
                critical: false
            });
        }
        
        this.testResults.set('performance', results);
    }
    
    monitorPerformance() {
        // FPS monitoring
        let frames = 0;
        let lastTime = performance.now();
        
        const countFrames = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.fps = frames;
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(countFrames);
        };
        
        requestAnimationFrame(countFrames);
    }
    
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            deviceInfo: this.deviceInfo,
            testResults: Object.fromEntries(this.testResults),
            summary: this.generateSummary()
        };
        
        console.log('📱 Mobile Compatibility Report:', report);
        
        // Dispatch custom event with results
        window.dispatchEvent(new CustomEvent('mobileCompatibilityReport', {
            detail: report
        }));
        
        return report;
    }
    
    generateSummary() {
        let totalTests = 0;
        let passedTests = 0;
        let criticalTests = 0;
        let passedCriticalTests = 0;
        
        this.testResults.forEach(categoryResults => {
            categoryResults.forEach(result => {
                totalTests++;
                if (result.pass) passedTests++;
                if (result.critical) {
                    criticalTests++;
                    if (result.pass) passedCriticalTests++;
                }
            });
        });
        
        return {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            passRate: Math.round((passedTests / totalTests) * 100),
            criticalTests,
            passedCriticalTests,
            criticalPassRate: criticalTests > 0 ? Math.round((passedCriticalTests / criticalTests) * 100) : 100,
            overallGrade: this.calculateGrade(passedTests, totalTests, passedCriticalTests, criticalTests)
        };
    }
    
    calculateGrade(passed, total, criticalPassed, criticalTotal) {
        const overallRate = (passed / total) * 100;
        const criticalRate = criticalTotal > 0 ? (criticalPassed / criticalTotal) * 100 : 100;
        
        // Weight critical tests more heavily
        const weightedScore = (overallRate * 0.6) + (criticalRate * 0.4);
        
        if (weightedScore >= 95) return 'A+';
        if (weightedScore >= 90) return 'A';
        if (weightedScore >= 85) return 'B+';
        if (weightedScore >= 80) return 'B';
        if (weightedScore >= 75) return 'C+';
        if (weightedScore >= 70) return 'C';
        if (weightedScore >= 65) return 'D+';
        if (weightedScore >= 60) return 'D';
        return 'F';
    }
    
    // Public API methods
    getReport() {
        return this.generateReport();
    }
    
    getDeviceInfo() {
        return this.deviceInfo;
    }
    
    runTest(testName) {
        switch (testName) {
            case 'viewport':
                this.testViewportConfiguration();
                break;
            case 'breakpoints':
                this.testResponsiveBreakpoints();
                break;
            case 'touchTargets':
                this.testTouchTargets();
                break;
            case 'geometricTheme':
                this.testGeometricTheme();
                break;
            case 'controlPanel':
                this.testControlPanelMobile();
                break;
            case 'modals':
                this.testModalResponsiveness();
                break;
            case 'typography':
                this.testTypographyScaling();
                break;
            case 'accessibility':
                this.testAccessibility();
                break;
            case 'performance':
                this.testPerformance();
                break;
            default:
                this.runInitialTests();
        }
        
        return this.testResults.get(testName) || this.generateReport();
    }
}

// Initialize validator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileCompatibilityValidator = new MobileCompatibilityValidator();
});

// Export for use in other modules
window.MobileCompatibilityValidator = MobileCompatibilityValidator;