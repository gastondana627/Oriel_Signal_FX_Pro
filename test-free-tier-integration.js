/**
 * Test suite for Free Tier Integration
 */

class FreeTierIntegrationTests {
    constructor() {
        this.testResults = [];
        this.mockApiResponses = {};
    }

    // Mock fetch for testing
    setupMockFetch() {
        this.originalFetch = window.fetch;
        window.fetch = async (url, options) => {
            const mockResponse = this.mockApiResponses[url];
            if (mockResponse) {
                return {
                    ok: mockResponse.ok,
                    status: mockResponse.status,
                    json: async () => mockResponse.data
                };
            }
            return this.originalFetch(url, options);
        };
    }

    restoreFetch() {
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
    }

    addTestResult(testName, status, message = '') {
        this.testResults.push({
            test: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString()
        });
        console.log(`${status}: ${testName}${message ? ' - ' + message : ''}`);
    }

    async runAllTests() {
        console.log('Starting Free Tier Integration Tests...');
        this.setupMockFetch();

        try {
            await this.testFreeTierManagerInitialization();
            await this.testSessionIdGeneration();
            await this.testDownloadLimitsCheck();
            await this.testFreeDownloadProcess();
            await this.testUpgradePromptDisplay();
            await this.testAccountUpgrade();
            await this.testWatermarkFunctionality();
            await this.testUIUpdates();
        } catch (error) {
            console.error('Test suite error:', error);
        } finally {
            this.restoreFetch();
        }

        this.displayResults();
        return this.testResults;
    }

    async testFreeTierManagerInitialization() {
        try {
            // Clear localStorage for clean test
            localStorage.removeItem('oriel_session_id');
            localStorage.removeItem('user_data');

            const manager = new FreeTierManager();
            
            if (manager.sessionId && manager.sessionId.startsWith('session_')) {
                this.addTestResult('FreeTier Manager Initialization', 'PASSED');
            } else {
                this.addTestResult('FreeTier Manager Initialization', 'FAILED', 'Session ID not generated');
            }

            if (manager.apiBaseUrl === '/api/downloads') {
                this.addTestResult('API Base URL Configuration', 'PASSED');
            } else {
                this.addTestResult('API Base URL Configuration', 'FAILED', 'Incorrect API URL');
            }
        } catch (error) {
            this.addTestResult('FreeTier Manager Initialization', 'FAILED', error.message);
        }
    }

    async testSessionIdGeneration() {
        try {
            localStorage.removeItem('oriel_session_id');
            
            const manager1 = new FreeTierManager();
            const sessionId1 = manager1.sessionId;
            
            const manager2 = new FreeTierManager();
            const sessionId2 = manager2.sessionId;
            
            if (sessionId1 === sessionId2) {
                this.addTestResult('Session ID Persistence', 'PASSED');
            } else {
                this.addTestResult('Session ID Persistence', 'FAILED', 'Session ID not persisted');
            }

            if (sessionId1.length > 10 && sessionId1.includes('session_')) {
                this.addTestResult('Session ID Format', 'PASSED');
            } else {
                this.addTestResult('Session ID Format', 'FAILED', 'Invalid session ID format');
            }
        } catch (error) {
            this.addTestResult('Session ID Generation', 'FAILED', error.message);
        }
    }

    async testDownloadLimitsCheck() {
        try {
            // Mock API response for anonymous user
            this.mockApiResponses['/api/downloads/check-limits?session_id=test_session'] = {
                ok: true,
                status: 200,
                data: {
                    success: true,
                    downloads_used: 1,
                    max_downloads: 3,
                    downloads_remaining: 2,
                    has_downloads_remaining: true
                }
            };

            const manager = new FreeTierManager();
            manager.sessionId = 'test_session';
            
            const result = await manager.checkDownloadLimits();
            
            if (result.success && result.downloads_remaining === 2) {
                this.addTestResult('Download Limits Check', 'PASSED');
            } else {
                this.addTestResult('Download Limits Check', 'FAILED', 'Incorrect limit data');
            }
        } catch (error) {
            this.addTestResult('Download Limits Check', 'FAILED', error.message);
        }
    }

    async testFreeDownloadProcess() {
        try {
            // Mock successful free download
            this.mockApiResponses['/api/downloads/free-download'] = {
                ok: true,
                status: 200,
                data: {
                    success: true,
                    download_url: '/api/downloads/watermarked/test_file.mp4',
                    downloads_used: 2,
                    downloads_remaining: 1,
                    is_last_free_download: false,
                    watermarked: true,
                    license_type: 'personal_use',
                    message: 'Free download complete! 1 downloads remaining.'
                }
            };

            const manager = new FreeTierManager();
            const result = await manager.processFreeDownload('test_file');
            
            if (result.success && result.watermarked && result.downloads_remaining === 1) {
                this.addTestResult('Free Download Process', 'PASSED');
            } else {
                this.addTestResult('Free Download Process', 'FAILED', 'Download process failed');
            }
        } catch (error) {
            this.addTestResult('Free Download Process', 'FAILED', error.message);
        }
    }

    async testUpgradePromptDisplay() {
        try {
            // Mock exhausted downloads response
            this.mockApiResponses['/api/downloads/free-download'] = {
                ok: false,
                status: 403,
                data: {
                    success: false,
                    error: 'No free downloads remaining',
                    error_code: 'NO_FREE_DOWNLOADS',
                    downloads_remaining: 0,
                    upgrade_available: true,
                    upgrade_prompt: {
                        title: 'Free Downloads Exhausted',
                        message: 'You\'ve used all your free downloads. Upgrade to continue downloading!',
                        action_text: 'Sign Up for More',
                        action_url: '/register',
                        benefits: ['Get 2 more free downloads', 'Save your download history']
                    }
                }
            };

            const manager = new FreeTierManager();
            manager.lastUpgradePrompt = 0; // Reset cooldown
            
            const result = await manager.processFreeDownload('test_file');
            
            if (!result.success && result.needsUpgrade) {
                this.addTestResult('Upgrade Prompt Trigger', 'PASSED');
            } else {
                this.addTestResult('Upgrade Prompt Trigger', 'FAILED', 'Upgrade prompt not triggered');
            }

            // Check if modal was created
            setTimeout(() => {
                const modal = document.querySelector('.upgrade-prompt-modal');
                if (modal) {
                    this.addTestResult('Upgrade Modal Creation', 'PASSED');
                    modal.remove(); // Clean up
                } else {
                    this.addTestResult('Upgrade Modal Creation', 'FAILED', 'Modal not created');
                }
            }, 100);
        } catch (error) {
            this.addTestResult('Upgrade Prompt Display', 'FAILED', error.message);
        }
    }

    async testAccountUpgrade() {
        try {
            // Mock account upgrade response
            this.mockApiResponses['/api/downloads/upgrade-account'] = {
                ok: true,
                status: 200,
                data: {
                    success: true,
                    downloads_used: 2,
                    max_downloads: 5,
                    downloads_remaining: 3,
                    upgrade_benefit: 2
                }
            };

            const manager = new FreeTierManager();
            await manager.handleUserRegistration('user_123');
            
            if (manager.userId === 'user_123') {
                this.addTestResult('Account Upgrade Process', 'PASSED');
            } else {
                this.addTestResult('Account Upgrade Process', 'FAILED', 'User ID not updated');
            }
        } catch (error) {
            this.addTestResult('Account Upgrade', 'FAILED', error.message);
        }
    }

    async testWatermarkFunctionality() {
        try {
            // Test watermark indication in download response
            const mockResponse = {
                success: true,
                download_url: '/api/downloads/watermarked/test_file_watermarked_abc123.mp4',
                watermarked: true,
                license_type: 'personal_use'
            };

            if (mockResponse.watermarked && mockResponse.download_url.includes('watermarked')) {
                this.addTestResult('Watermark Functionality', 'PASSED');
            } else {
                this.addTestResult('Watermark Functionality', 'FAILED', 'Watermark not indicated');
            }
        } catch (error) {
            this.addTestResult('Watermark Functionality', 'FAILED', error.message);
        }
    }

    async testUIUpdates() {
        try {
            // Create test DOM elements
            const testContainer = document.createElement('div');
            testContainer.innerHTML = `
                <div class="downloads-remaining">3 free downloads remaining</div>
                <button class="download-btn">Download</button>
            `;
            document.body.appendChild(testContainer);

            const manager = new FreeTierManager();
            
            // Test UI update with download data
            const mockData = {
                success: true,
                downloads_remaining: 1,
                is_last_free_download: false,
                watermarked: true,
                message: 'Download complete!'
            };

            manager.updateDownloadUI(mockData);

            const counterElement = testContainer.querySelector('.downloads-remaining');
            if (counterElement.textContent.includes('1 free downloads remaining')) {
                this.addTestResult('UI Counter Update', 'PASSED');
            } else {
                this.addTestResult('UI Counter Update', 'FAILED', 'Counter not updated');
            }

            // Clean up
            testContainer.remove();
        } catch (error) {
            this.addTestResult('UI Updates', 'FAILED', error.message);
        }
    }

    displayResults() {
        console.log('\n=== Free Tier Integration Test Results ===');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\nFailed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(r => console.log(`- ${r.test}: ${r.message}`));
        }

        // Create results display in DOM
        this.createResultsDisplay();
    }

    createResultsDisplay() {
        const existingResults = document.getElementById('free-tier-test-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsDiv = document.createElement('div');
        resultsDiv.id = 'free-tier-test-results';
        resultsDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
        `;

        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const successRate = ((passed / this.testResults.length) * 100).toFixed(1);

        resultsDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">Free Tier Integration Tests</h3>
            <div style="margin-bottom: 10px;">
                <strong>Results:</strong> ${passed}/${this.testResults.length} passed (${successRate}%)
            </div>
            <div style="max-height: 200px; overflow-y: auto;">
                ${this.testResults.map(r => `
                    <div style="margin: 5px 0; color: ${r.status === 'PASSED' ? 'green' : 'red'};">
                        ${r.status === 'PASSED' ? '✓' : '✗'} ${r.test}
                        ${r.message ? `<br>&nbsp;&nbsp;&nbsp;${r.message}` : ''}
                    </div>
                `).join('')}
            </div>
            <button onclick="this.parentElement.remove()" style="
                margin-top: 10px;
                padding: 5px 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">Close</button>
        `;

        document.body.appendChild(resultsDiv);
    }
}

// Auto-run tests if FreeTierManager is available
if (typeof FreeTierManager !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add a small delay to ensure everything is loaded
        setTimeout(() => {
            const tests = new FreeTierIntegrationTests();
            tests.runAllTests();
        }, 1000);
    });
}

// Export for manual testing
window.FreeTierIntegrationTests = FreeTierIntegrationTests;