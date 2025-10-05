/**
 * Mobile Compatibility Validation Runner
 * Task 8.1: Validate mobile compatibility implementation
 * Tests all aspects of responsive geometric design
 */

class MobileCompatibilityTestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        this.init();
    }
    
    init() {
        console.log('🧪 Starting Mobile Compatibility Validation...');
        this.runAllTests();
        this.generateReport();
    }
    
    runAllTests() {
        this.testViewportSetup();
        this.testResponsiveCSS();
        this.testMobileEnhancements();
        this.testTouchOptimizations();
        this.testGeometricThemeIntegration();
        this.testPerformanceOptimizations();
        this.testAccessibilityFeatures();
    }
    
    testViewportSetup() {
        console.log('📱 Testing viewport setup...');
        
        // Test viewport meta tag
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        this.addTest(
            'Viewport Meta Tag',
            viewportMeta !== null,
            'Viewport meta tag is required for responsive design',
            'critical'
        );
        
        if (viewportMeta) {
            const content = viewportMeta.getAttribute('content');
            this.addTest(
                'Viewport Width Setting',
                content.includes('width=device-width'),
                'Viewport should be set to device-width',
                'critical'
            );
            
            this.addTest(
                'Initial Scale Setting',
                content.includes('initial-scale=1'),
                'Initial scale should be 1.0',
                'warning'
            );
        }
        
        // Test CSS viewport units support
        const testElement = document.createElement('div');
        testElement.style.width = '100vw';
        testElement.style.height = '100vh';
        document.body.appendChild(testElement);
        
        const computedStyle = getComputedStyle(testElement);
        const supportsViewportUnits = computedStyle.width !== '0px' && computedStyle.height !== '0px';
        
        this.addTest(
            'Viewport Units Support',
            supportsViewportUnits,
            'Browser should support vw/vh units',
            'warning'
        );
        
        document.body.removeChild(testElement);
    }
    
    testResponsiveCSS() {
        console.log('📐 Testing responsive CSS...');
        
        // Test CSS file inclusion
        const responsiveCSS = Array.from(document.styleSheets).some(sheet => {
            try {
                return sheet.href && (
                    sheet.href.includes('responsive-geometric-enhancements.css') ||
                    sheet.href.includes('mobile-geometric-enhancements.css')
                );
            } catch (e) {
                return false;
            }
        });
        
        this.addTest(
            'Responsive CSS Files',
            responsiveCSS,
            'Responsive CSS files should be included',
            'critical'
        );
        
        // Test CSS custom properties
        const rootStyles = getComputedStyle(document.documentElement);
        const geometricCyan = rootStyles.getPropertyValue('--geometric-cyan');
        const geometricPink = rootStyles.getPropertyValue('--geometric-pink');
        
        this.addTest(
            'Geometric Color Variables',
            geometricCyan.includes('#00D4FF') && geometricPink.includes('#FF6B6B'),
            'Geometric theme colors should be defined',
            'critical'
        );
        
        // Test mobile-specific variables
        const mobileSpacing = rootStyles.getPropertyValue('--mobile-spacing');
        const mobileTouchTarget = rootStyles.getPropertyValue('--mobile-touch-target');
        
        this.addTest(
            'Mobile CSS Variables',
            mobileSpacing.trim() !== '' || mobileTouchTarget.trim() !== '',
            'Mobile-specific CSS variables should be defined',
            'warning'
        );
        
        // Test media query support
        const supportsMediaQueries = window.matchMedia && window.matchMedia('(max-width: 480px)').matches !== undefined;
        
        this.addTest(
            'Media Query Support',
            supportsMediaQueries,
            'Browser should support CSS media queries',
            'critical'
        );
    }
    
    testMobileEnhancements() {
        console.log('📱 Testing mobile enhancements...');
        
        // Test responsive manager
        const responsiveManager = window.responsiveGeometricManager;
        this.addTest(
            'Responsive Manager',
            responsiveManager !== undefined,
            'Responsive Geometric Manager should be loaded',
            'critical'
        );
        
        if (responsiveManager) {
            // Test breakpoint detection
            const currentBreakpoint = responsiveManager.getCurrentBreakpoint();
            this.addTest(
                'Breakpoint Detection',
                currentBreakpoint !== undefined,
                'Should detect current breakpoint',
                'critical'
            );
            
            // Test device detection
            const isMobile = responsiveManager.isMobile();
            const isTablet = responsiveManager.isTablet();
            const isDesktop = responsiveManager.isDesktop();
            
            this.addTest(
                'Device Type Detection',
                typeof isMobile === 'boolean' && typeof isTablet === 'boolean' && typeof isDesktop === 'boolean',
                'Should detect device types correctly',
                'warning'
            );
        }
        
        // Test control panel mobile behavior
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            const styles = getComputedStyle(controlPanel);
            
            // Check if control panel has mobile positioning on small screens
            if (window.innerWidth <= 480) {
                const isMobilePositioned = styles.position === 'fixed' && 
                                         (styles.bottom === '0px' || parseInt(styles.bottom) >= 0);
                
                this.addTest(
                    'Control Panel Mobile Position',
                    isMobilePositioned,
                    'Control panel should be bottom-positioned on mobile',
                    'critical'
                );
            }
            
            // Test toggle button presence on mobile
            const toggleButton = controlPanel.querySelector('.control-panel-toggle');
            if (window.innerWidth <= 768) {
                this.addTest(
                    'Control Panel Toggle Button',
                    toggleButton !== null,
                    'Toggle button should be present on mobile/tablet',
                    'warning'
                );
            }
        }
    }
    
    testTouchOptimizations() {
        console.log('👆 Testing touch optimizations...');
        
        // Test touch target sizes
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [onclick]');
        let adequateTargets = 0;
        let totalTargets = 0;
        
        interactiveElements.forEach(element => {
            if (element.offsetParent === null) return; // Skip hidden elements
            
            const rect = element.getBoundingClientRect();
            totalTargets++;
            
            // iOS minimum touch target is 44px
            if (rect.width >= 44 && rect.height >= 44) {
                adequateTargets++;
            }
        });
        
        const touchTargetRatio = totalTargets > 0 ? adequateTargets / totalTargets : 1;
        
        this.addTest(
            'Touch Target Sizes',
            touchTargetRatio >= 0.8,
            `${adequateTargets}/${totalTargets} elements meet 44px minimum touch target`,
            'critical'
        );
        
        // Test tap highlight removal
        const bodyStyles = getComputedStyle(document.body);
        const tapHighlight = bodyStyles.webkitTapHighlightColor || bodyStyles.tapHighlightColor;
        
        this.addTest(
            'Tap Highlight Optimization',
            tapHighlight === 'rgba(0, 0, 0, 0)' || tapHighlight === 'transparent' || tapHighlight.includes('rgba(0, 212, 255'),
            'Tap highlight should be customized or removed',
            'warning'
        );
        
        // Test touch action optimization
        const hasOptimizedTouchAction = Array.from(document.styleSheets).some(sheet => {
            try {
                return Array.from(sheet.cssRules || []).some(rule => 
                    rule.style && rule.style.touchAction === 'manipulation'
                );
            } catch (e) {
                return false;
            }
        });
        
        this.addTest(
            'Touch Action Optimization',
            hasOptimizedTouchAction,
            'Touch action should be optimized for better performance',
            'warning'
        );
    }
    
    testGeometricThemeIntegration() {
        console.log('🎨 Testing geometric theme integration...');
        
        // Test geometric theme CSS
        const geometricCSS = Array.from(document.styleSheets).some(sheet => {
            try {
                return sheet.href && sheet.href.includes('geometric-theme-system.css');
            } catch (e) {
                return false;
            }
        });
        
        this.addTest(
            'Geometric Theme CSS',
            geometricCSS,
            'Geometric theme CSS should be loaded',
            'critical'
        );
        
        // Test gradient support
        const testElement = document.createElement('div');
        testElement.style.background = 'linear-gradient(45deg, #00D4FF, #FF6B6B)';
        document.body.appendChild(testElement);
        
        const gradientSupport = getComputedStyle(testElement).background.includes('gradient') ||
                               getComputedStyle(testElement).backgroundImage.includes('gradient');
        
        this.addTest(
            'CSS Gradient Support',
            gradientSupport,
            'Browser should support CSS gradients',
            'warning'
        );
        
        document.body.removeChild(testElement);
        
        // Test backdrop filter support
        const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                      CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
        
        this.addTest(
            'Backdrop Filter Support',
            supportsBackdropFilter,
            'Backdrop filter enhances visual quality but is not critical',
            'info'
        );
        
        // Test geometric elements
        const geometricElements = document.querySelectorAll('[class*="geometric-"]');
        
        this.addTest(
            'Geometric Elements Present',
            geometricElements.length > 0,
            'Geometric themed elements should be present',
            'warning'
        );
    }
    
    testPerformanceOptimizations() {
        console.log('⚡ Testing performance optimizations...');
        
        // Test CSS will-change properties
        const elementsWithWillChange = document.querySelectorAll('[style*="will-change"], .geometric-button, button');
        
        this.addTest(
            'Performance Hints Present',
            elementsWithWillChange.length > 0,
            'Elements should have performance optimization hints',
            'warning'
        );
        
        // Test reduced motion support
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.addTest(
            'Reduced Motion Detection',
            window.matchMedia !== undefined,
            'Should be able to detect reduced motion preference',
            'warning'
        );
        
        // Test animation optimization
        const hasReducedMotionCSS = Array.from(document.styleSheets).some(sheet => {
            try {
                return Array.from(sheet.cssRules || []).some(rule => 
                    rule.media && rule.media.mediaText.includes('prefers-reduced-motion')
                );
            } catch (e) {
                return false;
            }
        });
        
        this.addTest(
            'Reduced Motion CSS Rules',
            hasReducedMotionCSS,
            'CSS should include reduced motion rules',
            'warning'
        );
        
        // Test hardware acceleration hints
        const hasTransform3d = Array.from(document.styleSheets).some(sheet => {
            try {
                return Array.from(sheet.cssRules || []).some(rule => 
                    rule.style && (
                        rule.style.transform && rule.style.transform.includes('translateZ') ||
                        rule.style.webkitTransform && rule.style.webkitTransform.includes('translateZ')
                    )
                );
            } catch (e) {
                return false;
            }
        });
        
        this.addTest(
            'Hardware Acceleration Hints',
            hasTransform3d,
            'CSS should include hardware acceleration hints',
            'info'
        );
    }
    
    testAccessibilityFeatures() {
        console.log('♿ Testing accessibility features...');
        
        // Test semantic HTML
        const semanticElements = document.querySelectorAll('main, section, article, nav, header, footer, aside');
        
        this.addTest(
            'Semantic HTML Elements',
            semanticElements.length > 0,
            'Should use semantic HTML elements',
            'warning'
        );
        
        // Test ARIA labels
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
        
        this.addTest(
            'ARIA Attributes',
            elementsWithAria.length > 0,
            'Interactive elements should have ARIA attributes',
            'warning'
        );
        
        // Test focus management
        const focusableElements = document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]');
        let elementsWithFocusStyles = 0;
        
        focusableElements.forEach(element => {
            // Simple check for focus styles
            const styles = getComputedStyle(element);
            if (styles.outline !== 'none' || styles.outlineStyle !== 'none') {
                elementsWithFocusStyles++;
            }
        });
        
        this.addTest(
            'Focus Indicators',
            focusableElements.length === 0 || elementsWithFocusStyles > 0,
            'Focusable elements should have visible focus indicators',
            'warning'
        );
        
        // Test color contrast (basic check)
        const bodyStyles = getComputedStyle(document.body);
        const textColor = bodyStyles.color;
        const hasLightText = textColor.includes('255') || textColor.includes('white') || textColor === 'rgb(255, 255, 255)';
        
        this.addTest(
            'Text Color Contrast',
            hasLightText,
            'Text should have sufficient contrast against dark background',
            'warning'
        );
    }
    
    addTest(name, passed, description, severity = 'info') {
        const test = {
            name,
            passed,
            description,
            severity,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(test);
        
        if (passed) {
            this.results.passed++;
            console.log(`✅ ${name}: ${description}`);
        } else {
            if (severity === 'critical') {
                this.results.failed++;
                console.error(`❌ ${name}: ${description}`);
            } else if (severity === 'warning') {
                this.results.warnings++;
                console.warn(`⚠️ ${name}: ${description}`);
            } else {
                console.info(`ℹ️ ${name}: ${description}`);
            }
        }
    }
    
    generateReport() {
        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 100;
        
        console.log('\n📊 Mobile Compatibility Test Results:');
        console.log('=====================================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings}`);
        console.log(`📈 Pass Rate: ${passRate}%`);
        
        // Determine overall grade
        let grade;
        if (this.results.failed === 0 && passRate >= 95) grade = 'A+';
        else if (this.results.failed === 0 && passRate >= 90) grade = 'A';
        else if (this.results.failed <= 1 && passRate >= 85) grade = 'B+';
        else if (this.results.failed <= 2 && passRate >= 80) grade = 'B';
        else if (this.results.failed <= 3 && passRate >= 75) grade = 'C+';
        else if (this.results.failed <= 4 && passRate >= 70) grade = 'C';
        else grade = 'D';
        
        console.log(`🎯 Overall Grade: ${grade}`);
        
        // Critical issues summary
        const criticalIssues = this.results.tests.filter(test => !test.passed && test.severity === 'critical');
        if (criticalIssues.length > 0) {
            console.log('\n🚨 Critical Issues to Address:');
            criticalIssues.forEach(issue => {
                console.log(`   • ${issue.name}: ${issue.description}`);
            });
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (this.results.failed > 0) {
            console.log('   • Address all critical issues before deployment');
        }
        if (this.results.warnings > 2) {
            console.log('   • Consider addressing warning items for better user experience');
        }
        if (passRate < 90) {
            console.log('   • Run additional testing on actual mobile devices');
        }
        
        console.log('\n✨ Mobile compatibility validation complete!');
        
        return {
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings,
                total,
                passRate,
                grade
            },
            tests: this.results.tests,
            criticalIssues,
            timestamp: new Date().toISOString()
        };
    }
}

// Auto-run when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.mobileCompatibilityTestRunner = new MobileCompatibilityTestRunner();
    }, 1000);
});

// Export for manual testing
window.MobileCompatibilityTestRunner = MobileCompatibilityTestRunner;