/**
 * Download Modal Interception Testing Module
 * Tests download button click interception, modal display validation, and format option verification
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

class DownloadModalInterceptionTester {
    constructor() {
        this.testResults = [];
        this.originalDownloadFunction = null;
        this.modalElement = null;
        this.testStartTime = null;
        this.downloadButtonClicked = false;
        this.modalDisplayed = false;
        this.formatSelected = null;
        this.modalCancelled = false;
    }

    /**
     * Initialize the testing environment
     */
    async init() {
        console.log('🧪 Initializing Download Modal Interception Tests...');
        
        // Store original download function if it exists
        this.originalDownloadFunction = window.downloadAudioFile;
        
        // Ensure download modal is available
        if (!window.downloadModal) {
            throw new Error('Download modal not found. Please ensure download-modal.js is loaded.');
        }
        
        // Get modal element reference
        this.modalElement = document.getElementById('download-modal');
        if (!this.modalElement) {
            throw new Error('Download modal element not found in DOM');
        }
        
        console.log('✅ Download Modal Interception Tester initialized');
    }

    /**
     * Run all download modal interception tests
     */
    async runAllTests() {
        console.log('🚀 Starting Download Modal Interception Tests...');
        this.testStartTime = Date.now();
        
        const tests = [
            { name: 'Download Button Click Interception', fn: () => this.testDownloadButtonInterception() },
            { name: 'Modal Display Validation', fn: () => this.testModalDisplayValidation() },
            { name: 'Format Option Verification', fn: () => this.testFormatOptionVerification() },
            { name: 'Modal Cancellation Testing', fn: () => this.testModalCancellation() },
            { name: 'Modal Overlay Click Handling', fn: () => this.testOverlayClickHandling() },
            { name: 'Escape Key Modal Closing', fn: () => this.testEscapeKeyClosing() },
            { name: 'Format Selection State Management', fn: () => this.testFormatSelectionState() },
            { name: 'Download Button State Updates', fn: () => this.testDownloadButtonStateUpdates() },
            { name: 'Modal Accessibility Features', fn: () => this.testModalAccessibility() },
            { name: 'Modal Responsive Behavior', fn: () => this.testModalResponsiveBehavior() }
        ];

        for (const test of tests) {
            try {
                console.log(`\n🧪 Running: ${test.name}`);
                await test.fn();
                this.addTestResult(test.name, 'PASSED', 'Test completed successfully');
            } catch (error) {
                console.error(`❌ ${test.name} failed:`, error);
                this.addTestResult(test.name, 'FAILED', error.message);
            }
        }

        return this.generateTestReport();
    }

    /**
     * Test download button click interception
     * Requirement 5.1: WHEN a user clicks any download button THEN the system SHALL prevent immediate file download
     */
    async testDownloadButtonInterception() {
        console.log('Testing download button click interception...');
        
        // Reset test state
        this.downloadButtonClicked = false;
        this.modalDisplayed = false;
        
        // Find download buttons
        const downloadButtons = [
            document.getElementById('download-button'),
            document.getElementById('download-mp3-button'),
            document.getElementById('download-gif-button'),
            document.getElementById('download-mp4-button')
        ].filter(btn => btn !== null);
        
        if (downloadButtons.length === 0) {
            throw new Error('No download buttons found for testing');
        }
        
        // Test each download button
        for (const button of downloadButtons) {
            console.log(`Testing button: ${button.id}`);
            
            // Mock the download function to detect if it's called
            let downloadFunctionCalled = false;
            const originalFunction = window.downloadAudioFile;
            window.downloadAudioFile = () => {
                downloadFunctionCalled = true;
                console.log('Download function was called (should be intercepted)');
            };
            
            // Click the button
            button.click();
            
            // Wait for modal to appear
            await this.waitForCondition(() => {
                const modal = document.getElementById('download-modal');
                return modal && modal.style.display === 'flex';
            }, 2000, 'Modal should appear after button click');
            
            // Verify modal is displayed
            const modal = document.getElementById('download-modal');
            if (!modal || modal.style.display !== 'flex') {
                throw new Error(`Modal not displayed after clicking ${button.id}`);
            }
            
            // Verify download function was NOT called immediately
            if (downloadFunctionCalled) {
                throw new Error(`Download function was called immediately for ${button.id} - interception failed`);
            }
            
            console.log(`✅ Button ${button.id} properly intercepted`);
            
            // Close modal for next test
            window.downloadModal.close();
            
            // Restore original function
            window.downloadAudioFile = originalFunction;
            
            // Wait for modal to close
            await this.waitForCondition(() => {
                return modal.style.display === 'none';
            }, 1000, 'Modal should close');
        }
        
        console.log('✅ All download buttons properly intercepted');
    }

    /**
     * Test modal display validation
     * Requirement 5.2: WHEN the download modal opens THEN the system SHALL display all available format options clearly
     */
    async testModalDisplayValidation() {
        console.log('Testing modal display validation...');
        
        // Open the modal
        window.downloadModal.show();
        
        // Wait for modal to appear
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        
        // Verify modal structure
        const requiredElements = [
            '.download-modal-header h3',
            '.download-modal-close',
            '.download-format-grid',
            '.download-format-option[data-format="mp3"]',
            '.download-format-option[data-format="mp4"]',
            '.download-format-option[data-format="mov"]',
            '.download-format-option[data-format="gif"]',
            '.download-confirm',
            '.download-cancel'
        ];
        
        for (const selector of requiredElements) {
            const element = modal.querySelector(selector);
            if (!element) {
                throw new Error(`Required modal element not found: ${selector}`);
            }
        }
        
        // Verify format options are visible and properly labeled
        const formatOptions = modal.querySelectorAll('.download-format-option');
        const expectedFormats = ['mp3', 'mp4', 'mov', 'gif'];
        
        if (formatOptions.length !== expectedFormats.length) {
            throw new Error(`Expected ${expectedFormats.length} format options, found ${formatOptions.length}`);
        }
        
        // Verify each format option has proper content
        formatOptions.forEach(option => {
            const format = option.dataset.format;
            const icon = option.querySelector('.format-icon');
            const title = option.querySelector('.format-info h4');
            const description = option.querySelector('.format-info p');
            const size = option.querySelector('.format-size');
            
            if (!icon || !title || !description || !size) {
                throw new Error(`Format option ${format} missing required elements`);
            }
            
            if (!title.textContent.trim()) {
                throw new Error(`Format option ${format} has empty title`);
            }
            
            if (!description.textContent.trim()) {
                throw new Error(`Format option ${format} has empty description`);
            }
        });
        
        // Verify modal is properly styled and visible
        const computedStyle = window.getComputedStyle(modal);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            throw new Error('Modal is not visible');
        }
        
        // Verify modal overlay
        const overlay = modal.querySelector('.download-modal-overlay');
        if (!overlay) {
            throw new Error('Modal overlay not found');
        }
        
        console.log('✅ Modal display validation passed');
        
        // Close modal
        window.downloadModal.close();
    }

    /**
     * Test format option verification
     * Requirement 5.2: Format options should be clearly displayed and selectable
     */
    async testFormatOptionVerification() {
        console.log('Testing format option verification...');
        
        // Open the modal
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        const formatOptions = modal.querySelectorAll('.download-format-option');
        const confirmButton = modal.querySelector('.download-confirm');
        
        // Verify initial state - no format selected, confirm button disabled
        if (!confirmButton.disabled) {
            throw new Error('Confirm button should be disabled initially');
        }
        
        if (confirmButton.querySelector('.download-btn-text').textContent !== 'Select Format') {
            throw new Error('Confirm button should show "Select Format" initially');
        }
        
        // Test each format option selection
        for (const option of formatOptions) {
            const format = option.dataset.format;
            console.log(`Testing format selection: ${format}`);
            
            // Click the format option
            option.click();
            
            // Wait for selection to register
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify option is selected
            if (!option.classList.contains('selected')) {
                throw new Error(`Format option ${format} not marked as selected`);
            }
            
            // Verify other options are not selected
            formatOptions.forEach(otherOption => {
                if (otherOption !== option && otherOption.classList.contains('selected')) {
                    throw new Error(`Multiple format options selected simultaneously`);
                }
            });
            
            // Verify confirm button is enabled and updated
            if (confirmButton.disabled) {
                throw new Error(`Confirm button should be enabled after selecting ${format}`);
            }
            
            const buttonText = confirmButton.querySelector('.download-btn-text').textContent;
            const expectedText = `Download ${format.toUpperCase()}`;
            if (!buttonText.includes(expectedText)) {
                throw new Error(`Confirm button text should include "${expectedText}", got "${buttonText}"`);
            }
            
            // Check for premium badge on premium formats
            const isPremium = ['mp4', 'mov'].includes(format);
            if (isPremium && !buttonText.includes('Premium')) {
                throw new Error(`Premium format ${format} should show Premium indicator`);
            }
            
            console.log(`✅ Format ${format} selection working correctly`);
        }
        
        console.log('✅ Format option verification passed');
        
        // Close modal
        window.downloadModal.close();
    }

    /**
     * Test modal cancellation
     * Requirement 5.3: WHEN a user cancels the modal THEN the system SHALL return to the previous state without downloading anything
     */
    async testModalCancellation() {
        console.log('Testing modal cancellation...');
        
        // Test cancel button
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        const cancelButton = modal.querySelector('.download-cancel');
        
        // Select a format first
        const formatOption = modal.querySelector('.download-format-option[data-format="mp3"]');
        formatOption.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify format is selected
        if (!formatOption.classList.contains('selected')) {
            throw new Error('Format should be selected before cancellation test');
        }
        
        // Mock download function to ensure it's not called
        let downloadCalled = false;
        const originalFunction = window.downloadAudioFile;
        window.downloadAudioFile = () => {
            downloadCalled = true;
        };
        
        // Click cancel button
        cancelButton.click();
        
        // Wait for modal to close
        await this.waitForCondition(() => {
            return modal.style.display === 'none';
        }, 2000, 'Modal should close after cancel');
        
        // Verify download was not called
        if (downloadCalled) {
            throw new Error('Download function should not be called when modal is cancelled');
        }
        
        // Verify modal state is reset
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            return modal.style.display === 'flex';
        }, 1000, 'Modal should reopen');
        
        // Check that selection is cleared
        const selectedOptions = modal.querySelectorAll('.download-format-option.selected');
        if (selectedOptions.length > 0) {
            throw new Error('Format selection should be cleared after cancellation');
        }
        
        const confirmButton = modal.querySelector('.download-confirm');
        if (!confirmButton.disabled) {
            throw new Error('Confirm button should be disabled after cancellation');
        }
        
        // Restore original function
        window.downloadAudioFile = originalFunction;
        
        console.log('✅ Modal cancellation test passed');
        
        // Close modal
        window.downloadModal.close();
    }

    /**
     * Test overlay click handling
     */
    async testOverlayClickHandling() {
        console.log('Testing overlay click handling...');
        
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        const overlay = modal.querySelector('.download-modal-overlay');
        
        // Click overlay
        overlay.click();
        
        // Wait for modal to close
        await this.waitForCondition(() => {
            return modal.style.display === 'none';
        }, 2000, 'Modal should close when overlay is clicked');
        
        console.log('✅ Overlay click handling test passed');
    }

    /**
     * Test escape key closing
     */
    async testEscapeKeyClosing() {
        console.log('Testing escape key closing...');
        
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        
        // Simulate escape key press
        const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true
        });
        
        document.dispatchEvent(escapeEvent);
        
        // Wait for modal to close
        await this.waitForCondition(() => {
            return modal.style.display === 'none';
        }, 2000, 'Modal should close when Escape key is pressed');
        
        console.log('✅ Escape key closing test passed');
    }

    /**
     * Test format selection state management
     */
    async testFormatSelectionState() {
        console.log('Testing format selection state management...');
        
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        const formatOptions = modal.querySelectorAll('.download-format-option');
        
        // Test that only one format can be selected at a time
        const mp3Option = modal.querySelector('.download-format-option[data-format="mp3"]');
        const mp4Option = modal.querySelector('.download-format-option[data-format="mp4"]');
        
        // Select MP3
        mp3Option.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mp3Option.classList.contains('selected')) {
            throw new Error('MP3 option should be selected');
        }
        
        // Select MP4
        mp4Option.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mp4Option.classList.contains('selected')) {
            throw new Error('MP4 option should be selected');
        }
        
        if (mp3Option.classList.contains('selected')) {
            throw new Error('MP3 option should be deselected when MP4 is selected');
        }
        
        console.log('✅ Format selection state management test passed');
        
        window.downloadModal.close();
    }

    /**
     * Test download button state updates
     */
    async testDownloadButtonStateUpdates() {
        console.log('Testing download button state updates...');
        
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        const confirmButton = modal.querySelector('.download-confirm');
        const buttonText = confirmButton.querySelector('.download-btn-text');
        
        // Initial state
        if (!confirmButton.disabled) {
            throw new Error('Confirm button should be disabled initially');
        }
        
        if (buttonText.textContent !== 'Select Format') {
            throw new Error('Initial button text should be "Select Format"');
        }
        
        // Select format and verify button updates
        const mp3Option = modal.querySelector('.download-format-option[data-format="mp3"]');
        mp3Option.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (confirmButton.disabled) {
            throw new Error('Confirm button should be enabled after format selection');
        }
        
        if (!buttonText.textContent.includes('Download MP3')) {
            throw new Error('Button text should update to show selected format');
        }
        
        console.log('✅ Download button state updates test passed');
        
        window.downloadModal.close();
    }

    /**
     * Test modal accessibility features
     */
    async testModalAccessibility() {
        console.log('Testing modal accessibility features...');
        
        window.downloadModal.show();
        
        await this.waitForCondition(() => {
            const modal = document.getElementById('download-modal');
            return modal && modal.style.display === 'flex';
        }, 2000, 'Modal should be displayed');
        
        const modal = document.getElementById('download-modal');
        
        // Check for close button aria-label
        const closeButton = modal.querySelector('.download-modal-close');
        if (!closeButton.getAttribute('aria-label')) {
            throw new Error('Close button should have aria-label');
        }
        
        // Check for proper heading structure
        const heading = modal.querySelector('h3');
        if (!heading) {
            throw new Error('Modal should have a heading');
        }
        
        // Check for keyboard navigation support
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) {
            throw new Error('Modal should have focusable elements');
        }
        
        console.log('✅ Modal accessibility test passed');
        
        window.downloadModal.close();
    }

    /**
     * Test modal responsive behavior
     */
    async testModalResponsiveBehavior() {
        console.log('Testing modal responsive behavior...');
        
        // Store original viewport
        const originalWidth = window.innerWidth;
        
        try {
            // Test mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375
            });
            
            window.dispatchEvent(new Event('resize'));
            
            window.downloadModal.show();
            
            await this.waitForCondition(() => {
                const modal = document.getElementById('download-modal');
                return modal && modal.style.display === 'flex';
            }, 2000, 'Modal should be displayed on mobile');
            
            const modal = document.getElementById('download-modal');
            const modalContent = modal.querySelector('.download-modal-content');
            
            // Check that modal is still visible and usable on mobile
            const computedStyle = window.getComputedStyle(modalContent);
            if (computedStyle.display === 'none') {
                throw new Error('Modal content should be visible on mobile');
            }
            
            console.log('✅ Modal responsive behavior test passed');
            
            window.downloadModal.close();
            
        } finally {
            // Restore original viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalWidth
            });
            window.dispatchEvent(new Event('resize'));
        }
    }

    /**
     * Wait for a condition to be true with timeout
     */
    async waitForCondition(condition, timeout = 5000, description = 'Condition') {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        throw new Error(`Timeout waiting for: ${description}`);
    }

    /**
     * Add test result
     */
    addTestResult(testName, status, message = '') {
        const result = {
            test: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.testStartTime
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASSED' ? '✅' : '❌';
        console.log(`${statusIcon} ${testName}: ${status} ${message ? '- ' + message : ''}`);
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
        const failedTests = totalTests - passedTests;
        const totalDuration = Date.now() - this.testStartTime;
        
        const report = {
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
                duration: totalDuration
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📊 Download Modal Interception Test Report');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Duration: ${totalDuration}ms`);
        console.log('=' .repeat(50));
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(result => {
                    console.log(`  • ${result.test}: ${result.message}`);
                });
        }
        
        return report;
    }
}

// Make the tester available globally
window.DownloadModalInterceptionTester = DownloadModalInterceptionTester;

console.log('✅ Download Modal Interception Tester loaded');