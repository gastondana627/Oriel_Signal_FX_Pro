/**
 * Download Modal with Format Selection
 * Provides a user-friendly interface for choosing download formats
 */
class DownloadModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentAudioData = null;
        this.init();
    }

    /**
     * Initialize the download modal
     */
    init() {
        this.createModal();
        this.attachEventListeners();
    }

    /**
     * Create the modal HTML structure
     */
    createModal() {
        const modalHTML = `
            <div id="download-modal" class="download-modal" style="display: none;">
                <div class="download-modal-overlay"></div>
                <div class="download-modal-content">
                    <div class="download-modal-header">
                        <h3>🎵 Download Your Audio Visualization</h3>
                        <button class="download-modal-close" aria-label="Close">&times;</button>
                    </div>
                    
                    <div class="download-modal-body">
                        <p class="download-description">Choose your preferred format:</p>
                        
                        <div class="download-format-grid">
                            <div class="download-format-option free-option" data-format="gif">
                                <div class="format-icon">🖼️</div>
                                <div class="format-info">
                                    <h4>Animated GIF</h4>
                                    <p>Looping visualization with watermark</p>
                                    <span class="format-size">~5-15MB</span>
                                </div>
                                <div class="format-badge free">Free</div>
                            </div>
                            
                            <div class="download-format-option premium-option" data-format="mp4" data-tier="personal">
                                <div class="format-icon">🎬</div>
                                <div class="format-info">
                                    <h4>MP4 Video - Personal</h4>
                                    <p>1080p HD, personal use license</p>
                                    <span class="format-size">~10-25MB</span>
                                </div>
                                <div class="format-badge personal">$2.99</div>
                            </div>
                            
                            <div class="download-format-option premium-option" data-format="mp4" data-tier="commercial">
                                <div class="format-icon">🎬</div>
                                <div class="format-info">
                                    <h4>MP4 Video - Commercial</h4>
                                    <p>1080p HD, commercial use license</p>
                                    <span class="format-size">~10-25MB</span>
                                </div>
                                <div class="format-badge commercial">$9.99</div>
                            </div>
                            
                            <div class="download-format-option premium-option" data-format="mp4" data-tier="premium">
                                <div class="format-icon">🎥</div>
                                <div class="format-info">
                                    <h4>MP4 Video - Premium</h4>
                                    <p>4K Ultra HD, extended commercial license</p>
                                    <span class="format-size">~50-100MB</span>
                                </div>
                                <div class="format-badge premium">$19.99</div>
                            </div>
                        </div>
                        
                        <div class="download-options">
                            <div class="quality-selector">
                                <label for="quality-select">Quality:</label>
                                <select id="quality-select">
                                    <option value="standard">Standard (720p)</option>
                                    <option value="high" selected>High (1080p)</option>
                                    <option value="ultra">Ultra (4K) - Premium</option>
                                </select>
                            </div>
                            
                            <div class="duration-info">
                                <span class="duration-label">Duration: <span id="audio-duration">--:--</span></span>
                            </div>
                        </div>
                        
                        <div class="download-credits">
                            <div class="credits-info">
                                <span class="credits-icon">💎</span>
                                <span class="credits-text">Credits remaining: <span id="credits-count">--</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="download-modal-footer">
                        <button class="btn-secondary download-cancel">Cancel</button>
                        <button class="btn-primary download-confirm" disabled>
                            <span class="download-btn-text">Select Format</span>
                            <span class="download-btn-icon">⬇️</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('download-modal');
    }

    /**
     * Add CSS styles for the modal
     */
    addStyles() {
        if (document.getElementById('download-modal-styles')) return;

        const styles = `
            <style id="download-modal-styles">
                .download-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .download-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                }

                .download-modal-content {
                    position: relative;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid rgba(131, 9, 213, 0.3);
                }

                .download-modal-header {
                    padding: 25px 30px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .download-modal-header h3 {
                    margin: 0;
                    color: #fff;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .download-modal-close {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                }

                .download-modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .download-modal-body {
                    padding: 30px;
                }

                .download-description {
                    color: #ccc;
                    margin-bottom: 25px;
                    font-size: 1.1rem;
                }

                .download-format-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin-bottom: 30px;
                }

                .download-format-option {
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid transparent;
                    border-radius: 15px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .download-format-option:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(131, 9, 213, 0.5);
                    transform: translateY(-2px);
                }

                .download-format-option.selected {
                    border-color: #8309D5;
                    background: rgba(131, 9, 213, 0.1);
                }

                .format-icon {
                    font-size: 2.5rem;
                    flex-shrink: 0;
                }

                .format-info {
                    flex: 1;
                }

                .format-info h4 {
                    margin: 0 0 5px 0;
                    color: #fff;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .format-info p {
                    margin: 0 0 8px 0;
                    color: #ccc;
                    font-size: 0.9rem;
                }

                .format-size {
                    color: #999;
                    font-size: 0.8rem;
                }

                .format-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #4CAF50;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .format-badge.premium {
                    background: linear-gradient(45deg, #8309D5, #FF6B35);
                }

                .download-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                }

                .quality-selector label {
                    color: #ccc;
                    margin-right: 10px;
                }

                .quality-selector select {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                }

                .duration-info {
                    color: #ccc;
                    font-size: 0.9rem;
                }

                .download-credits {
                    text-align: center;
                    padding: 15px;
                    background: rgba(131, 9, 213, 0.1);
                    border-radius: 10px;
                    border: 1px solid rgba(131, 9, 213, 0.3);
                }

                .credits-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    color: #fff;
                    font-weight: 500;
                }

                .credits-icon {
                    font-size: 1.2rem;
                }

                .download-modal-footer {
                    padding: 20px 30px 30px;
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                }

                .btn-secondary, .btn-primary {
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #fff;
                }

                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                }

                .btn-primary {
                    background: linear-gradient(45deg, #8309D5, #FF6B35);
                    border: none;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 5px 15px rgba(131, 9, 213, 0.4);
                }

                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .download-format-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .download-options {
                        flex-direction: column;
                        gap: 15px;
                        align-items: flex-start;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close modal events
        const closeBtn = this.modal.querySelector('.download-modal-close');
        const cancelBtn = this.modal.querySelector('.download-cancel');
        const overlay = this.modal.querySelector('.download-modal-overlay');

        [closeBtn, cancelBtn, overlay].forEach(element => {
            element.addEventListener('click', () => this.close());
        });

        // Format selection
        const formatOptions = this.modal.querySelectorAll('.download-format-option');
        formatOptions.forEach(option => {
            option.addEventListener('click', () => this.selectFormat(option));
        });

        // Confirm download
        const confirmBtn = this.modal.querySelector('.download-confirm');
        confirmBtn.addEventListener('click', () => this.confirmDownload());

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Select a download format
     */
    selectFormat(option) {
        // Remove previous selection
        this.modal.querySelectorAll('.download-format-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select new format
        option.classList.add('selected');
        
        const format = option.dataset.format;
        const tier = option.dataset.tier;
        const confirmBtn = this.modal.querySelector('.download-confirm');
        const btnText = confirmBtn.querySelector('.download-btn-text');
        
        // Store selected format and tier
        this.selectedFormat = format;
        this.selectedTier = tier;
        
        // Update button text based on format type
        if (option.classList.contains('free-option')) {
            btnText.textContent = `Download Free ${format.toUpperCase()}`;
            confirmBtn.disabled = false;
        } else if (option.classList.contains('premium-option')) {
            const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
            btnText.textContent = `Purchase ${tierName} License`;
            confirmBtn.disabled = false;
        }
    }

    /**
     * Show the download modal
     */
    show(audioData = null) {
        this.currentAudioData = audioData;
        this.addStyles();
        this.updateModalData();
        
        // Ensure modal exists
        if (!this.modal) {
            console.error('Download modal not found! Recreating...');
            this.createModal();
        }
        
        this.modal.style.display = 'flex';
        this.isOpen = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Download modal opened');
    }

    /**
     * Hide the download modal
     */
    close() {
        this.modal.style.display = 'none';
        this.isOpen = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Reset selection
        this.modal.querySelectorAll('.download-format-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const confirmBtn = this.modal.querySelector('.download-confirm');
        confirmBtn.disabled = true;
        confirmBtn.querySelector('.download-btn-text').textContent = 'Select Format';
    }

    /**
     * Update modal with current data
     */
    updateModalData() {
        // Update duration if available
        const durationElement = this.modal.querySelector('#audio-duration');
        if (this.currentAudioData && this.currentAudioData.duration) {
            const minutes = Math.floor(this.currentAudioData.duration / 60);
            const seconds = Math.floor(this.currentAudioData.duration % 60);
            durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update credits count
        const creditsElement = this.modal.querySelector('#credits-count');
        if (window.usageTracker) {
            try {
                const usage = window.usageTracker.getUsageStats();
                const remaining = usage.remainingDownloads || (usage.downloadsLimit - usage.downloadsUsed);
                creditsElement.textContent = remaining;
            } catch (error) {
                console.warn('Could not get usage stats:', error.message);
                creditsElement.textContent = '3'; // Default fallback
            }
        } else {
            creditsElement.textContent = '--';
        }
    }

    /**
     * Confirm and start download
     */
    async confirmDownload() {
        const selectedOption = this.modal.querySelector('.download-format-option.selected');
        if (!selectedOption) return;

        const format = this.selectedFormat;
        const tier = this.selectedTier;
        const quality = this.modal.querySelector('#quality-select').value;

        try {
            // Show loading state
            const confirmBtn = this.modal.querySelector('.download-confirm');
            const originalText = confirmBtn.querySelector('.download-btn-text').textContent;
            
            if (selectedOption.classList.contains('free-option')) {
                // Handle free download
                confirmBtn.querySelector('.download-btn-text').textContent = 'Downloading...';
                confirmBtn.disabled = true;
                
                await this.startFreeDownload(format, quality);
                this.close();
                
            } else if (selectedOption.classList.contains('premium-option')) {
                // Handle premium purchase
                confirmBtn.querySelector('.download-btn-text').textContent = 'Opening purchase...';
                confirmBtn.disabled = true;
                
                await this.startPurchaseFlow(tier, format, quality);
                
                // Reset button after purchase modal opens
                confirmBtn.querySelector('.download-btn-text').textContent = originalText;
                confirmBtn.disabled = false;
            }

        } catch (error) {
            console.error('Download/Purchase failed:', error);
            
            // Show error notification
            if (window.notifications) {
                window.notifications.showError('Process failed. Please try again.');
            }

            // Reset button
            const confirmBtn = this.modal.querySelector('.download-confirm');
            confirmBtn.querySelector('.download-btn-text').textContent = originalText;
            confirmBtn.disabled = false;
        }
    }

    /**
     * Start free download process
     */
    async startFreeDownload(format, quality) {
        console.log(`Starting free download: ${format} (${quality})`);
        
        // Check free download limits first
        const limitsCheck = await this.checkFreeDownloadLimits();
        if (!limitsCheck.allowed) {
            throw new Error(limitsCheck.message || 'Free download limit exceeded');
        }

        switch (format) {
            case 'gif':
                // Use existing GIF download function with watermark
                if (window.downloadGifFile) {
                    await window.downloadGifFile(true); // true for watermark
                } else {
                    throw new Error('GIF download not available');
                }
                break;
                
            default:
                throw new Error(`Free download not available for ${format} format`);
        }
    }
    
    /**
     * Start purchase flow for premium downloads
     */
    async startPurchaseFlow(tier, format, quality) {
        console.log(`Starting purchase flow: ${tier} ${format} (${quality})`);
        
        // Generate file ID for this download
        const fileId = this.generateFileId(format, quality);
        
        // Close download modal
        this.close();
        
        // Open purchase modal
        if (window.purchaseModal) {
            window.purchaseModal.show(fileId, (downloadToken) => {
                // Handle successful purchase
                this.handlePurchaseComplete(downloadToken, format, quality);
            });
        } else {
            throw new Error('Purchase system not available');
        }
    }
    
    /**
     * Check free download limits
     */
    async checkFreeDownloadLimits() {
        try {
            const response = await fetch('/api/downloads/check-limits');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking download limits:', error);
            return { allowed: false, message: 'Unable to verify download limits' };
        }
    }
    
    /**
     * Generate unique file ID for download
     */
    generateFileId(format, quality) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `${format}_${quality}_${timestamp}_${random}`;
    }
    
    /**
     * Handle completed purchase
     */
    async handlePurchaseComplete(downloadToken, format, quality) {
        try {
            // Start premium download with token
            await this.startPremiumDownload(downloadToken, format, quality);
            
            // Show success message
            if (window.notifications) {
                window.notifications.showSuccess('Purchase completed! Your download is starting.');
            }
            
        } catch (error) {
            console.error('Premium download failed:', error);
            
            if (window.notifications) {
                window.notifications.showError('Download failed. Please contact support with your purchase confirmation.');
            }
        }
    }
    
    /**
     * Start premium download with purchase token
     */
    async startPremiumDownload(downloadToken, format, quality) {
        console.log(`Starting premium download: ${format} (${quality}) with token: ${downloadToken}`);
        
        // Call premium download endpoint
        const response = await fetch(`/api/downloads/secure/${downloadToken}`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Premium download failed');
        }
        
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio_visualization_${format}_${quality}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Legacy method for backward compatibility
     */
    async startDownload(format, quality) {
        // Redirect to new methods based on format
        if (format === 'gif') {
            await this.startFreeDownload(format, quality);
        } else {
                    window.notifications.showInfo('Video downloads coming soon! Premium feature in development.');
                }
                break;
                
            case 'gif':
                // GIF export - would need canvas to GIF conversion
                if (window.notifications) {
                    window.notifications.showInfo('GIF downloads coming soon! Feature in development.');
                }
                break;
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
}

// Initialize download modal
const downloadModal = new DownloadModal();

// Make available globally
window.downloadModal = downloadModal;

// Replace the old download button functionality
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other scripts to load
    setTimeout(() => {
        // Replace MP3 download button
        const mp3Button = document.getElementById('download-mp3-button');
        if (mp3Button) {
            // Remove all existing event listeners by cloning the element
            const newButton = mp3Button.cloneNode(true);
            mp3Button.parentNode.replaceChild(newButton, mp3Button);
            
            // Add new event listener with higher priority
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎵 Download button clicked - showing modal');
                downloadModal.show();
            }, true); // Use capture phase for higher priority
        }

        // Also handle any other download buttons
        const downloadButtons = document.querySelectorAll('[data-download]');
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📥 Download button clicked - showing modal');
                downloadModal.show();
            }, true);
        });
        
        console.log('✅ Download modal event handlers installed');
    }, 1000); // Wait 1 second for other scripts to load
});

console.log('✅ Download Modal initialized');