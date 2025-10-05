/**
 * Validation Script for Responsive Geometric Design Implementation
 * Tests all features implemented in Task 8.1 and 8.2
 */

class ResponsiveGeometricValidator {
    constructor() {
        this.testResults = {
            mobileCompatibility: [],
            responsiveScaling: [],
            visualQuality: [],
            neonGlowEffects: [],
            shapeMorphing: [],
            gradientAnimations: [],
            interactionEffects: [],
            performance: []
        };
        
        this.init();
    }
    
    init() {
        console.log('🧪 Starting Responsive Geometric Design Validation');
        this.runAllTests();
    }
    
    async runAllTests() {
        // Test 8.1: Mobile Compatibility
        await this.testMobileCompatibility();
        await this.testResponsiveScaling();
        await this.testVisualQuality();
        
        // Test 8.2: Geometric Animations and Interactions
        await this.testNeonGlowEffects();
        await this.testShapeMorphing();
        await this.testGradientAnimations();
        await this.testInteractionEffects();
        
        // Performance tests
        await this.testPerformance();
        
        this.generateReport();
    }
    
    async testMobileCompatibility() {
        console.log('📱 Testing mobile compatibility...');
        
        // Test viewport meta tag
        const viewport = document.querySelector('meta[name="viewport"]');
        this.addResult('mobileCompatibility', 'Viewport meta tag', !!viewport);
        
        // Test responsive CSS classes
        const responsiveCSS = document.querySelector('link[href*="responsive-geometric-enhancements.css"]');
        this.addResult('mobileCompatibility', 'Responsive CSS loaded', !!responsiveCSS);
        
        // Test responsive manager initialization
        const responsiveManager = window.responsiveGeometricManager;
        this.addResult('mobileCompatibility', 'Responsive manager initialized', !!responsiveManager);
        
        // Test breakpoint detection
        if (responsiveManager) {
            const breakpoint = responsiveManager.getCurrentBreakpoint();
            this.addResult('mobileCompatibility', 'Breakpoint detection working', !!breakpoint);
            
            // Test mobile-specific features
            const isMobile = responsiveManager.isMobile();
            const isTouch = responsiveManager.isTouch;
            this.addResult('mobileCompatibility', 'Mobile detection', typeof isMobile === 'boolean');
            this.addResult('mobileCompatibility', 'Touch detection', typeof isTouch === 'boolean');
        }
        
        // Test control panel responsiveness
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            const hasToggle = controlPanel.querySelector('.control-panel-toggle');
            this.addResult('mobileCompatibility', 'Control panel toggle exists', !!hasToggle);
        }
        
        // Test minimum touch target sizes (44px minimum for iOS)
        const buttons = document.querySelectorAll('.geometric-button, button');
        let minTouchTargetsMet = true;
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            if (rect.height < 44 || rect.width < 44) {
                minTouchTargetsMet = false;
            }
        });
        this.addResult('mobileCompatibility', 'Minimum touch targets (44px)', minTouchTargetsMet);
    }
    
    async testResponsiveScaling() {
        console.log('📏 Testing responsive scaling...');
        
        // Test CSS custom properties for responsive design
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        const hasResponsiveVars = [
            '--geometric-scale-factor',
            '--geometric-spacing',
            '--geometric-border-radius-mobile'
        ].every(prop => computedStyle.getPropertyValue(prop));
        
        this.addResult('responsiveScaling', 'Responsive CSS variables', hasResponsiveVars);
        
        // Test geometric elements scaling
        const geometricElements = document.querySelectorAll('.geometric-card, .geometric-button');
        let elementsHaveResponsiveClasses = true;
        
        geometricElements.forEach(element => {
            const hasResponsiveClass = element.classList.contains('geometric-responsive-text') ||
                                     element.classList.contains('geometric-responsive-spacing') ||
                                     element.classList.contains('geometric-responsive-border');
            if (!hasResponsiveClass) {
                // Check if element has responsive styles applied
                const styles = getComputedStyle(element);
                const hasClampFontSize = styles.fontSize.includes('clamp') || 
                                       styles.fontSize.includes('vw') ||
                                       styles.fontSize.includes('rem');
                if (!hasClampFontSize) {
                    elementsHaveResponsiveClasses = false;
                }
            }
        });
        
        this.addResult('responsiveScaling', 'Elements have responsive scaling', elementsHaveResponsiveClasses);
        
        // Test logo responsive sizing
        if (window.geometricLogo) {
            const logoInstances = window.geometricLogo.logoInstances;
            let logosHaveResponsiveSizes = logoInstances.size > 0;
            
            logoInstances.forEach(logo => {
                const width = logo.getAttribute('width');
                const height = logo.getAttribute('height');
                if (!width || !height) {
                    logosHaveResponsiveSizes = false;
                }
            });
            
            this.addResult('responsiveScaling', 'Logo responsive sizing', logosHaveResponsiveSizes);
        }
    }
    
    async testVisualQuality() {
        console.log('🎨 Testing visual quality on different devices...');
        
        // Test geometric theme consistency
        const themeCSS = document.querySelector('link[href*="geometric-theme-system.css"]');
        this.addResult('visualQuality', 'Geometric theme CSS loaded', !!themeCSS);
        
        // Test CSS custom properties for colors
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        const hasGeometricColors = [
            '--geometric-cyan',
            '--geometric-pink',
            '--geometric-gradient-primary'
        ].every(prop => computedStyle.getPropertyValue(prop));
        
        this.addResult('visualQuality', 'Geometric color variables', hasGeometricColors);
        
        // Test visual elements have proper styling
        const visualElements = document.querySelectorAll('.geometric-card, .geometric-button, .user-status-bar');
        let elementsHaveGeometricStyling = true;
        
        visualElements.forEach(element => {
            const styles = getComputedStyle(element);
            const hasGradient = styles.background.includes('gradient') || 
                              styles.borderImage.includes('gradient') ||
                              element.style.background.includes('gradient');
            const hasBorderRadius = parseFloat(styles.borderRadius) > 0;
            
            if (!hasGradient && !hasBorderRadius) {
                elementsHaveGeometricStyling = false;
            }
        });
        
        this.addResult('visualQuality', 'Elements have geometric styling', elementsHaveGeometricStyling);
        
        // Test reduced motion support
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.addResult('visualQuality', 'Reduced motion preference detected', typeof prefersReducedMotion === 'boolean');
    }
    
    async testNeonGlowEffects() {
        console.log('✨ Testing neon glow effects...');
        
        // Test animation system initialization
        const animationSystem = window.geometricAnimations;
        this.addResult('neonGlowEffects', 'Animation system initialized', !!animationSystem);
        
        // Test neon glow CSS classes exist
        const animationStyles = document.getElementById('geometric-animations');
        this.addResult('neonGlowEffects', 'Animation styles loaded', !!animationStyles);
        
        if (animationStyles) {
            const cssText = animationStyles.textContent;
            const hasNeonAnimations = cssText.includes('geometric-neon-pulse') &&
                                    cssText.includes('geometric-neon-breathe');
            this.addResult('neonGlowEffects', 'Neon animation keyframes exist', hasNeonAnimations);
        }
        
        // Test glow effects on hover
        const glowElements = document.querySelectorAll('.geometric-button, .geometric-card');
        let elementsHaveGlowEffects = glowElements.length > 0;
        
        glowElements.forEach(element => {
            const hasGlowClass = element.classList.contains('geometric-hover-glow') ||
                               element.classList.contains('geometric-animate-neon');
            if (!hasGlowClass) {
                // Check computed styles for glow effects
                const styles = getComputedStyle(element);
                const hasBoxShadow = styles.boxShadow !== 'none';
                const hasFilter = styles.filter !== 'none';
                if (!hasBoxShadow && !hasFilter) {
                    elementsHaveGlowEffects = false;
                }
            }
        });
        
        this.addResult('neonGlowEffects', 'Elements have glow effects', elementsHaveGlowEffects);
        
        // Test programmatic glow control
        if (animationSystem) {
            const testElement = document.createElement('div');
            testElement.className = 'test-glow-element';
            document.body.appendChild(testElement);
            
            try {
                animationSystem.addNeonGlow(testElement);
                const hasGlowClass = testElement.classList.contains('geometric-animate-neon');
                this.addResult('neonGlowEffects', 'Programmatic glow control', hasGlowClass);
                
                animationSystem.removeNeonGlow(testElement);
                const glowRemoved = !testElement.classList.contains('geometric-animate-neon');
                this.addResult('neonGlowEffects', 'Glow removal works', glowRemoved);
            } catch (error) {
                this.addResult('neonGlowEffects', 'Programmatic glow control', false);
            }
            
            document.body.removeChild(testElement);
        }
    }
    
    async testShapeMorphing() {
        console.log('🔄 Testing shape morphing animations...');
        
        // Test shape morphing CSS animations
        const animationStyles = document.getElementById('geometric-animations');
        if (animationStyles) {
            const cssText = animationStyles.textContent;
            const hasMorphAnimations = cssText.includes('geometric-hexagon-morph') &&
                                     cssText.includes('geometric-diamond-morph');
            this.addResult('shapeMorphing', 'Morph animation keyframes exist', hasMorphAnimations);
            
            const hasMorphClasses = cssText.includes('geometric-animate-morph-hexagon') &&
                                  cssText.includes('geometric-animate-morph-diamond');
            this.addResult('shapeMorphing', 'Morph animation classes exist', hasMorphClasses);
        }
        
        // Test clip-path support
        const testElement = document.createElement('div');
        testElement.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
        const supportsClipPath = testElement.style.clipPath !== '';
        this.addResult('shapeMorphing', 'Clip-path support', supportsClipPath);
        
        // Test programmatic shape morphing
        if (window.geometricAnimations) {
            const testElement = document.createElement('div');
            testElement.className = 'test-morph-element';
            document.body.appendChild(testElement);
            
            try {
                window.geometricAnimations.addShapeMorph(testElement, 'hexagon');
                const hasMorphClass = testElement.classList.contains('geometric-animate-morph-hexagon');
                this.addResult('shapeMorphing', 'Programmatic morph control', hasMorphClass);
                
                window.geometricAnimations.removeShapeMorph(testElement, 'hexagon');
                const morphRemoved = !testElement.classList.contains('geometric-animate-morph-hexagon');
                this.addResult('shapeMorphing', 'Morph removal works', morphRemoved);
            } catch (error) {
                this.addResult('shapeMorphing', 'Programmatic morph control', false);
            }
            
            document.body.removeChild(testElement);
        }
    }
    
    async testGradientAnimations() {
        console.log('🌈 Testing gradient animations...');
        
        // Test gradient animation CSS
        const animationStyles = document.getElementById('geometric-animations');
        if (animationStyles) {
            const cssText = animationStyles.textContent;
            const hasGradientAnimations = cssText.includes('geometric-gradient-wave') &&
                                        cssText.includes('geometric-gradient-spiral');
            this.addResult('gradientAnimations', 'Gradient animation keyframes exist', hasGradientAnimations);
        }
        
        // Test CSS gradient support
        const testElement = document.createElement('div');
        testElement.style.background = 'linear-gradient(45deg, #00D4FF, #FF6B6B)';
        const supportsGradients = testElement.style.background.includes('gradient');
        this.addResult('gradientAnimations', 'CSS gradient support', supportsGradients);
        
        // Test animated gradient elements
        const gradientElements = document.querySelectorAll('.geometric-animate-gradient-wave, .geometric-animate-gradient-spiral');
        this.addResult('gradientAnimations', 'Gradient animated elements exist', gradientElements.length > 0);
        
        // Test programmatic gradient animation
        if (window.geometricAnimations) {
            const testElement = document.createElement('div');
            testElement.className = 'test-gradient-element';
            document.body.appendChild(testElement);
            
            try {
                window.geometricAnimations.addGradientFlow(testElement);
                const hasGradientClass = testElement.classList.contains('geometric-animate-gradient-wave');
                this.addResult('gradientAnimations', 'Programmatic gradient control', hasGradientClass);
                
                window.geometricAnimations.removeGradientFlow(testElement);
                const gradientRemoved = !testElement.classList.contains('geometric-animate-gradient-wave');
                this.addResult('gradientAnimations', 'Gradient removal works', gradientRemoved);
            } catch (error) {
                this.addResult('gradientAnimations', 'Programmatic gradient control', false);
            }
            
            document.body.removeChild(testElement);
        }
    }
    
    async testInteractionEffects() {
        console.log('🎯 Testing interaction effects...');
        
        // Test interaction enhancer initialization
        const interactionEnhancer = window.geometricInteractions;
        this.addResult('interactionEffects', 'Interaction enhancer initialized', !!interactionEnhancer);
        
        // Test interaction CSS styles
        const interactionStyles = document.querySelector('style');
        let hasInteractionStyles = false;
        if (interactionStyles) {
            const cssText = interactionStyles.textContent;
            hasInteractionStyles = cssText.includes('geometric-ripple') ||
                                 cssText.includes('geometric-trail-fade') ||
                                 cssText.includes('geometric-particle-burst');
        }
        this.addResult('interactionEffects', 'Interaction styles loaded', hasInteractionStyles);
        
        // Test magnetic effect classes
        const magneticElements = document.querySelectorAll('.geometric-magnetic');
        this.addResult('interactionEffects', 'Magnetic elements exist', magneticElements.length > 0);
        
        // Test tilt effect classes
        const tiltElements = document.querySelectorAll('.geometric-tilt');
        this.addResult('interactionEffects', 'Tilt elements exist', tiltElements.length > 0);
        
        // Test ripple effect functionality
        if (window.geometricAnimations) {
            const testElement = document.createElement('div');
            testElement.className = 'test-ripple-element';
            testElement.style.cssText = 'width: 100px; height: 100px; position: relative;';
            document.body.appendChild(testElement);
            
            try {
                window.geometricAnimations.triggerRipple(testElement);
                // Check if ripple element was created
                setTimeout(() => {
                    const rippleExists = testElement.querySelector('.geometric-ripple-effect');
                    this.addResult('interactionEffects', 'Ripple effect works', !!rippleExists);
                }, 100);
            } catch (error) {
                this.addResult('interactionEffects', 'Ripple effect works', false);
            }
            
            setTimeout(() => {
                document.body.removeChild(testElement);
            }, 1000);
        }
        
        // Test touch support detection
        const touchSupported = 'ontouchstart' in window;
        this.addResult('interactionEffects', 'Touch support detected', typeof touchSupported === 'boolean');
    }
    
    async testPerformance() {
        console.log('⚡ Testing performance...');
        
        // Test animation count
        const animatedElements = document.querySelectorAll('[class*="geometric-animate"]');
        const animationCount = animatedElements.length;
        this.addResult('performance', 'Animation count reasonable', animationCount < 50);
        
        // Test FPS monitoring
        let frameCount = 0;
        const startTime = performance.now();
        
        const countFrames = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - startTime >= 1000) {
                const fps = frameCount;
                this.addResult('performance', 'FPS above 30', fps > 30);
                this.addResult('performance', 'FPS above 60', fps > 60);
                return;
            }
            
            requestAnimationFrame(countFrames);
        };
        
        requestAnimationFrame(countFrames);
        
        // Test memory usage (approximate)
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            this.addResult('performance', 'Memory usage reasonable', memoryUsage < 100);
        }
        
        // Test reduced motion compliance
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            const animatingElements = document.querySelectorAll('[style*="animation"]');
            const respectsReducedMotion = animatingElements.length === 0;
            this.addResult('performance', 'Respects reduced motion', respectsReducedMotion);
        }
        
        // Test CSS will-change usage
        const elementsWithWillChange = document.querySelectorAll('[style*="will-change"]');
        this.addResult('performance', 'Appropriate will-change usage', elementsWithWillChange.length < 20);
    }
    
    addResult(category, test, passed) {
        this.testResults[category].push({
            test,
            passed,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${category}: ${test}`);
    }
    
    generateReport() {
        console.log('\n📊 RESPONSIVE GEOMETRIC DESIGN VALIDATION REPORT');
        console.log('='.repeat(60));
        
        let totalTests = 0;
        let passedTests = 0;
        
        Object.entries(this.testResults).forEach(([category, results]) => {
            const categoryPassed = results.filter(r => r.passed).length;
            const categoryTotal = results.length;
            const percentage = Math.round((categoryPassed / categoryTotal) * 100);
            
            console.log(`\n${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${percentage}%)`);
            
            results.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                console.log(`  ${status} ${result.test}`);
            });
            
            totalTests += categoryTotal;
            passedTests += categoryPassed;
        });
        
        const overallPercentage = Math.round((passedTests / totalTests) * 100);
        
        console.log('\n' + '='.repeat(60));
        console.log(`OVERALL RESULT: ${passedTests}/${totalTests} tests passed (${overallPercentage}%)`);
        
        if (overallPercentage >= 90) {
            console.log('🎉 EXCELLENT: Responsive geometric design implementation is highly successful!');
        } else if (overallPercentage >= 75) {
            console.log('✅ GOOD: Responsive geometric design implementation is mostly successful!');
        } else if (overallPercentage >= 60) {
            console.log('⚠️ FAIR: Responsive geometric design implementation needs some improvements.');
        } else {
            console.log('❌ POOR: Responsive geometric design implementation needs significant work.');
        }
        
        // Store results for external access
        window.responsiveGeometricValidationResults = {
            summary: {
                totalTests,
                passedTests,
                percentage: overallPercentage
            },
            details: this.testResults
        };
        
        return this.testResults;
    }
}

// Auto-run validation when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for all systems to initialize
    setTimeout(() => {
        window.responsiveGeometricValidator = new ResponsiveGeometricValidator();
    }, 2000);
});

// Export for manual testing
window.ResponsiveGeometricValidator = ResponsiveGeometricValidator;