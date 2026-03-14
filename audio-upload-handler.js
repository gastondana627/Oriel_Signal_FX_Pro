/**
 * Audio Upload Handler Enhancement
 * Adds visual feedback to the existing audio upload functionality
 */

(function() {
    'use strict';

    console.log('🎵 Audio Upload Handler Enhancement initializing...');

    // Wait for DOM to be ready
    function initAudioUpload() {
        const audioUploadInput = document.getElementById('audioUpload');
        const uploadLabel = document.querySelector('label[for="audioUpload"]');

        if (!audioUploadInput) {
            console.error('❌ Audio upload input not found');
            return;
        }

        console.log('✅ Audio upload input found');

        // Remove pointer-events: none to ensure label is clickable
        audioUploadInput.style.pointerEvents = 'auto';

        // Add visual feedback when file is selected
        audioUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (!file) {
                console.log('No file selected');
                return;
            }

            console.log('📁 File selected:', {
                name: file.name,
                type: file.type,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
            });

            // Update label text to show selected file
            if (uploadLabel) {
                const fileName = file.name.length > 20 
                    ? file.name.substring(0, 17) + '...' 
                    : file.name;
                uploadLabel.innerHTML = `📁 ${fileName}`;
                uploadLabel.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                uploadLabel.style.background = 'rgba(102, 126, 234, 0.1)';
                
                // Reset after a delay
                setTimeout(() => {
                    uploadLabel.innerHTML = '📁 Upload Audio';
                    uploadLabel.style.borderColor = '';
                    uploadLabel.style.background = '';
                }, 3000);
            }

            // Dispatch custom event for other scripts
            document.dispatchEvent(new CustomEvent('audioFileSelected', {
                detail: { name: file.name, file: file }
            }));
        });

        // Ensure label is clickable
        if (uploadLabel) {
            uploadLabel.style.cursor = 'pointer';
            
            // Add visual feedback on hover
            uploadLabel.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.transition = 'transform 0.2s ease';
            });

            uploadLabel.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
            
            // Ensure clicking label triggers input
            uploadLabel.addEventListener('click', function(e) {
                console.log('📁 Upload label clicked');
                e.preventDefault();
                audioUploadInput.click();
            });
        }

        console.log('✅ Audio upload handler enhancement initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAudioUpload);
    } else {
        initAudioUpload();
    }

    console.log('✅ Audio Upload Handler Enhancement loaded');
})();
