/**
 * UI Value Display Enhancement
 * Shows real-time values for range inputs and color pickers
 */

(function() {
    'use strict';

    // Update color value display
    const glowColorInput = document.getElementById('glowColor');
    const glowColorValue = document.getElementById('glow-color-value');
    
    if (glowColorInput && glowColorValue) {
        glowColorInput.addEventListener('input', (e) => {
            glowColorValue.textContent = e.target.value.toUpperCase();
        });
    }

    // Update pulse value display
    const pulseInput = document.getElementById('pulse');
    const pulseValue = document.getElementById('pulse-value');
    
    if (pulseInput && pulseValue) {
        pulseInput.addEventListener('input', (e) => {
            pulseValue.textContent = parseFloat(e.target.value).toFixed(1);
        });
    }

    console.log('✨ UI value display enhancement loaded');
})();
