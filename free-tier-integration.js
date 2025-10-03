/**
 * Free Tier Integration for One-Time Download Licensing
 * Handles free download limits, upgrade prompts, and watermarked downloads
 */

class FreeTierManager {
    constructor() {
        this.apiBaseUrl = '/api/downloads';
        this.sessionId = this.getOrCreateSessionId();
        this.userId = this.getCurrentUserId();
        this.upgradePromptCooldown = 5 * 60 * 1000; // 5 minutes
        this.lastUpgradePrompt = 0;
    }

    /**
     * Get or create a session ID for anonymous users
     */
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('oriel_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('oriel_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Get current user ID if authenticated
     */
    getCurrentUserId() {
        try {
            const userData = localStorage.getItem('user_data');
            if (userData) {
                const user = JSON.parse(userData);
                return user.id || user.user_id;
            }
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
        return null;
    }

    /**
     * Check free download eligibility
     */
    async checkDownloadLimits() {
        try {
            const params = new URLSearchParams();
            if (this.userId) {
                params.append('user_id', this.userId);
            } else {
                params.append('session_id', this.sessionId);
            }

            const response = await fetch(`${this.apiBaseUrl}/check-limits?${params}`);
            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    ...data
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to check limits'
                };
            }
        } catch (error) {
            console.error('Error checking download limits:', error);
            return {
                success: false,
                error: 'Network error checking limits'
            };
        }
    }

    /**
     * Process a free download
     */
    async processFreeDownload(fileId, format = 'mp4') {
        try {
            const requestData = {
                file_id: fileId,
                format: format
            };

            if (this.userId) {
                requestData.user_id = this.userId;
            } else {
                requestData.session_id = this.sessionId;
            }

            const response = await fetch(`${this.apiBaseUrl}/free-download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                // Successful free download
                this.updateDownloadUI(data);
                return {
                    success: true,
                    ...data
                };
            } else if (response.status === 403 && data.upgrade_prompt) {
                // Show upgrade prompt
                this.showUpgradePrompt(data.upgrade_prompt, data);
                return {
                    success: false,
                    needsUpgrade: true,
                    ...data
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to process download'
                };
            }
        } catch (error) {
            console.error('Error processing free download:', error);
            return {
                success: false,
                error: 'Network error processing download'
            };
        }
    }

    /**
     * Show upgrade prompt when limits are reached
     */
    showUpgradePrompt(promptData, usageData = {}) {
        // Check cooldown to avoid spamming prompts
        const now = Date.now();
        if (now - this.lastUpgradePrompt < this.upgradePromptCooldown) {
            return;
        }
        this.lastUpgradePrompt = now;

        // Create upgrade prompt modal
        const modal = this.createUpgradeModal(promptData, usageData);
        document.body.appendChild(modal);

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Auto-close after 30 seconds
        setTimeout(() => {
            this.closeUpgradeModal(modal);
        }, 30000);
    }

    /**
     * Create upgrade prompt modal
     */
    createUpgradeModal(promptData, usageData) {
        const modal = document.createElement('div');
        modal.className = 'upgrade-prompt-modal';
        modal.innerHTML = `
            <div class="upgrade-prompt-overlay">
                <div class="upgrade-prompt-content">
                    <button class="upgrade-prompt-close" onclick="this.closest('.upgrade-prompt-modal').remove()">×</button>
                    
                    <div class="upgrade-prompt-header">
                        <h3>${promptData.title}</h3>
                        <p>${promptData.message}</p>
                    </div>

                    <div class="upgrade-prompt-usage">
                        <div class="usage-bar">
                            <div class="usage-fill" style="width: ${(usageData.downloads_used / usageData.max_downloads) * 100}%"></div>
                        </div>
                        <p>${usageData.downloads_used || 0} of ${usageData.max_downloads || 3} free downloads used</p>
                    </div>

                    <div class="upgrade-prompt-benefits">
                        <h4>Benefits:</h4>
                        <ul>
                            ${promptData.benefits ? promptData.benefits.map(benefit => `<li>${benefit}</li>`).join('') : ''}
                        </ul>
                    </div>

                    <div class="upgrade-prompt-actions">
                        <button class="upgrade-btn primary" onclick="window.location.href='${promptData.action_url}'">
                            ${promptData.action_text}
                        </button>
                        <button class="upgrade-btn secondary" onclick="this.closest('.upgrade-prompt-modal').remove()">
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Close upgrade modal
     */
    closeUpgradeModal(modal) {
        if (modal && modal.parentNode) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    /**
     * Update download UI with current status
     */
    updateDownloadUI(data) {
        // Update download counter
        const counterElement = document.querySelector('.downloads-remaining');
        if (counterElement) {
            counterElement.textContent = `${data.downloads_remaining} free downloads remaining`;
            
            if (data.downloads_remaining === 0) {
                counterElement.classList.add('exhausted');
            } else if (data.downloads_remaining <= 1) {
                counterElement.classList.add('warning');
            }
        }

        // Show success message
        if (data.success && window.notifications) {
            let message = data.message || 'Download ready!';
            if (data.watermarked) {
                message += ' (Watermarked version - upgrade for full quality)';
            }
            window.notifications.show(message, 'success');
        }

        // Update download button if it's the last free download
        if (data.is_last_free_download) {
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.textContent = 'Last Free Download';
                downloadBtn.classList.add('last-download');
            }
        }
    }

    /**
     * Initialize free tier UI elements
     */
    initializeUI() {
        this.addUpgradePromptStyles();
        this.updateDownloadCounter();
        this.setupDownloadButton();
    }

    /**
     * Add CSS styles for upgrade prompts
     */
    addUpgradePromptStyles() {
        if (document.getElementById('upgrade-prompt-styles')) {
            return; // Already added
        }

        const styles = document.createElement('style');
        styles.id = 'upgrade-prompt-styles';
        styles.textContent = `
            .upgrade-prompt-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }

            .upgrade-prompt-modal.show {
                opacity: 1;
                visibility: visible;
            }

            .upgrade-prompt-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .upgrade-prompt-content {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                position: relative;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                transform: translateY(-20px);
                transition: transform 0.3s ease;
            }

            .upgrade-prompt-modal.show .upgrade-prompt-content {
                transform: translateY(0);
            }

            .upgrade-prompt-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s ease;
            }

            .upgrade-prompt-close:hover {
                background-color: #f0f0f0;
            }

            .upgrade-prompt-header h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 24px;
            }

            .upgrade-prompt-header p {
                margin: 0 0 20px 0;
                color: #666;
                line-height: 1.5;
            }

            .upgrade-prompt-usage {
                margin-bottom: 20px;
            }

            .usage-bar {
                width: 100%;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .usage-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #FF9800, #F44336);
                transition: width 0.3s ease;
            }

            .upgrade-prompt-benefits h4 {
                margin: 0 0 10px 0;
                color: #333;
            }

            .upgrade-prompt-benefits ul {
                margin: 0 0 20px 0;
                padding-left: 20px;
            }

            .upgrade-prompt-benefits li {
                margin-bottom: 5px;
                color: #666;
            }

            .upgrade-prompt-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .upgrade-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .upgrade-btn.primary {
                background: #007bff;
                color: white;
            }

            .upgrade-btn.primary:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }

            .upgrade-btn.secondary {
                background: #f8f9fa;
                color: #666;
                border: 1px solid #dee2e6;
            }

            .upgrade-btn.secondary:hover {
                background: #e9ecef;
            }

            .downloads-remaining.warning {
                color: #ff9800;
                font-weight: bold;
            }

            .downloads-remaining.exhausted {
                color: #f44336;
                font-weight: bold;
            }

            .download-btn.last-download {
                background: linear-gradient(45deg, #ff9800, #f57c00);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Update download counter display
     */
    async updateDownloadCounter() {
        const limits = await this.checkDownloadLimits();
        if (limits.success) {
            const counterElement = document.querySelector('.downloads-remaining');
            if (counterElement) {
                counterElement.textContent = `${limits.downloads_remaining} free downloads remaining`;
                
                if (limits.downloads_remaining === 0) {
                    counterElement.classList.add('exhausted');
                } else if (limits.downloads_remaining <= 1) {
                    counterElement.classList.add('warning');
                }
            }
        }
    }

    /**
     * Setup download button with free tier integration
     */
    setupDownloadButton() {
        const downloadBtn = document.querySelector('.download-btn, #download-button');
        if (downloadBtn && !downloadBtn.dataset.freeTierSetup) {
            downloadBtn.dataset.freeTierSetup = 'true';
            
            const originalClick = downloadBtn.onclick;
            downloadBtn.onclick = async (event) => {
                event.preventDefault();
                
                // Check limits first
                const limits = await this.checkDownloadLimits();
                if (!limits.success) {
                    if (window.notifications) {
                        window.notifications.show('Unable to check download limits', 'error');
                    }
                    return;
                }

                if (!limits.has_downloads_remaining) {
                    // Show upgrade prompt
                    const promptResponse = await fetch(`${this.apiBaseUrl}/upgrade-prompt?${new URLSearchParams({
                        session_id: this.sessionId,
                        user_id: this.userId || '',
                        reason: 'limit_reached'
                    })}`);
                    
                    if (promptResponse.ok) {
                        const promptData = await promptResponse.json();
                        this.showUpgradePrompt(promptData.prompt, promptData.current_usage);
                    }
                    return;
                }

                // Process free download
                const fileId = downloadBtn.dataset.fileId || 'default_file';
                const result = await this.processFreeDownload(fileId);
                
                if (result.success && result.download_url) {
                    // Trigger download
                    const link = document.createElement('a');
                    link.href = result.download_url;
                    link.download = '';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else if (originalClick) {
                    // Fallback to original behavior
                    originalClick.call(downloadBtn, event);
                }
            };
        }
    }

    /**
     * Handle user registration upgrade
     */
    async handleUserRegistration(newUserId) {
        if (this.sessionId && newUserId) {
            try {
                // Transfer anonymous usage to registered user
                const response = await fetch(`${this.apiBaseUrl}/upgrade-account`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        session_id: this.sessionId,
                        user_id: newUserId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.userId = newUserId;
                    
                    // Update UI
                    this.updateDownloadCounter();
                    
                    if (window.notifications && data.upgrade_benefit > 0) {
                        window.notifications.show(
                            `Welcome! You now have ${data.downloads_remaining} free downloads (${data.upgrade_benefit} bonus for registering)`,
                            'success'
                        );
                    }
                }
            } catch (error) {
                console.error('Error upgrading account:', error);
            }
        }
    }
}

// Initialize free tier manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.freeTierManager = new FreeTierManager();
    window.freeTierManager.initializeUI();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeTierManager;
}