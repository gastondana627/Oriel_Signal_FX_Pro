/**
 * Fix Download Modal Integration
 * Ensures the download modal properly intercepts all download attempts
 */

(function() {
    'use strict';
    
    console.log('🔧 Fixing download modal integration...');
    
    // Wait for DOM and other scripts to load
    function initializeDownloadModalFix() {
        // Ensure download modal is available
        if (!window.downloadModal) {
            console.warn('Download modal not available, retrying...');
            setTimeout(initializeDownloadModalFix, 500);
            return;
        }
        
        console.log('✅ Download modal found, applying fixes...');
        
        // 1. Override the main download button behavior
        const mainDownloadButton = document.getElementById('download-button');
        if (mainDownloadButton) {
            // Remove all existing event listeners by cloning
            const newMainButton = mainDownloadButton.cloneNode(true);
            mainDownloadButton.parentNode.replaceChild(newMainButton, mainDownloadButton);
            
            // Add new event listener that shows our modal instead
            newMainButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎵 Main download button clicked - showing format modal');
                
                // Hide the old modal if it's showing
                const oldModal = document.getElementById('modal');
                if (oldModal) {
                    oldModal.style.display = 'none';
                }
                
                // Show our new modal
                window.downloadModal.show();
            });
            
            console.log('✅ Main download button intercepted');
        }
        
        // 2. Override modal download buttons if they exist
        const modalDownloadButtons = [
            '#download-mp3-button',
            '#download-gif-button', 
            '#download-mp4-button',
            '#download-webm-button',
            '#download-mov-button'
        ];
        
        modalDownloadButtons.forEach(selector => {
            const button = document.querySelector(selector);
            if (button) {
                // Clone to remove existing listeners
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add new listener that shows format modal
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`📥 ${selector} clicked - showing format modal`);
                    
                    // Hide the old modal
                    const oldModal = document.getElementById('modal');
                    if (oldModal) {
                        oldModal.style.display = 'none';
                    }
                    
                    // Show our new modal
                    window.downloadModal.show();
                });
                
                console.log(`✅ ${selector} intercepted`);
            }
        });
        
        // 3. Override any direct calls to downloadAudioFile
        if (window.downloadAudioFile) {
            const originalDownloadAudioFile = window.downloadAudioFile;
            
            window.downloadAudioFile = function(...args) {
                console.log('🎵 downloadAudioFile called - showing format modal instead');
                
                // Show format modal instead of direct download
                window.downloadModal.show();
                
                // Don't call the original function
                return Promise.resolve();
            };
            
            // Store original for modal to use
            window.downloadModal.originalDownloadAudioFile = originalDownloadAudioFile;
            
            console.log('✅ downloadAudioFile function intercepted');
        }
        
        // 4. Update the download modal to use the original function for MP3
        if (window.downloadModal && window.downloadModal.originalDownloadAudioFile) {
            const originalStartDownload = window.downloadModal.startDownload;
            
            window.downloadModal.startDownload = async function(format, quality) {
                console.log(`Starting download: ${format} (${quality})`);

                switch (format) {
                    case 'mp3':
                        // Use the original MP3 download function
                        try {
                            await this.originalDownloadAudioFile();
                            console.log('✅ MP3 download completed');
                        } catch (error) {
                            console.error('❌ MP3 download failed:', error);
                            throw error;
                        }
                        break;
                        
                    case 'mp4':
                    case 'mov':
                        // Premium video formats - show coming soon message
                        if (window.notificationManager) {
                            window.notificationManager.showInfo('Video downloads coming soon! Premium feature in development.');
                        } else if (window.notifications) {
                            window.notifications.showInfo('Video downloads coming soon! Premium feature in development.');
                        } else {
                            alert('Video downloads coming soon! Premium feature in development.');
                        }
                        break;
                        
                    case 'gif':
                        // Try to use existing GIF functionality if available
                        const gifButton = document.getElementById('download-gif-button');
                        if (gifButton && gifButton.click) {
                            // Temporarily restore original functionality for GIF
                            const originalGifHandler = gifButton.onclick;
                            if (originalGifHandler) {
                                try {
                                    await originalGifHandler();
                                    console.log('✅ GIF download completed');
                                } catch (error) {
                                    console.error('❌ GIF download failed:', error);
                                    throw error;
                                }
                            } else {
                                if (window.notificationManager) {
                                    window.notificationManager.showInfo('GIF downloads coming soon! Feature in development.');
                                } else {
                                    alert('GIF downloads coming soon! Feature in development.');
                                }
                            }
                        } else {
                            if (window.notificationManager) {
                                window.notificationManager.showInfo('GIF downloads coming soon! Feature in development.');
                            } else {
                                alert('GIF downloads coming soon! Feature in development.');
                            }
                        }
                        break;
                        
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }
            };
            
            console.log('✅ Download modal startDownload method updated');
        }
        
        // 5. Add CSS to hide the old modal when our modal is shown
        const hideOldModalCSS = `
            <style id="hide-old-modal-css">
                /* Hide old modal when new modal is active */
                body.download-modal-active #modal {
                    display: none !important;
                }
                
                /* Ensure our modal has higher z-index */
                .download-modal {
                    z-index: 10001 !important;
                }
            </style>
        `;
        
        if (!document.getElementById('hide-old-modal-css')) {
            document.head.insertAdjacentHTML('beforeend', hideOldModalCSS);
        }
        
        // 6. Update modal show/hide to manage body class
        if (window.downloadModal) {
            const originalShow = window.downloadModal.show;
            const originalClose = window.downloadModal.close;
            
            window.downloadModal.show = function(...args) {
                document.body.classList.add('download-modal-active');
                return originalShow.apply(this, args);
            };
            
            window.downloadModal.close = function(...args) {
                document.body.classList.remove('download-modal-active');
                return originalClose.apply(this, args);
            };
        }
        
        console.log('✅ Download modal integration fix completed');
        
        // 7. Test the integration
        setTimeout(() => {
            console.log('🧪 Testing download modal integration...');
            
            const mainButton = document.getElementById('download-button');
            if (mainButton) {
                console.log('✅ Main download button found and should be intercepted');
            }
            
            const mp3Button = document.getElementById('download-mp3-button');
            if (mp3Button) {
                console.log('✅ MP3 download button found and should be intercepted');
            }
            
            if (window.downloadModal) {
                console.log('✅ Download modal is available');
            }
            
            console.log('🎉 Download modal integration test completed');
        }, 1000);
    }
    
    // Start the initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeDownloadModalFix, 1000);
        });
    } else {
        setTimeout(initializeDownloadModalFix, 1000);
    }
    
})();

console.log('📦 Download modal integration fix loaded');