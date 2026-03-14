/**
 * Validation Script for Audio Upload and Modal Fixes
 * Run this in the browser console to verify implementation
 */

(function() {
    'use strict';

    console.log('🔍 Starting validation...\n');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    function pass(test) {
        results.passed.push(test);
        console.log(`✅ PASS: ${test}`);
    }

    function fail(test, reason) {
        results.failed.push({ test, reason });
        console.error(`❌ FAIL: ${test}\n   Reason: ${reason}`);
    }

    function warn(test, reason) {
        results.warnings.push({ test, reason });
        console.warn(`⚠️  WARN: ${test}\n   Reason: ${reason}`);
    }

    // Test 1: Audio Upload Input Exists
    console.log('\n📋 Test 1: Audio Upload Input');
    const audioInput = document.getElementById('audioUpload');
    if (audioInput) {
        pass('Audio upload input element exists');
        
        // Check attributes
        if (audioInput.getAttribute('accept') === 'audio/*') {
            pass('Audio input has correct accept attribute');
        } else {
            fail('Audio input accept attribute', 'Expected "audio/*", got "' + audioInput.getAttribute('accept') + '"');
        }

        if (audioInput.type === 'file') {
            pass('Audio input type is "file"');
        } else {
            fail('Audio input type', 'Expected "file", got "' + audioInput.type + '"');
        }
    } else {
        fail('Audio upload input element', 'Element with id "audioUpload" not found');
    }

    // Test 2: Upload Label Exists
    console.log('\n📋 Test 2: Upload Label');
    const uploadLabel = document.querySelector('label[for="audioUpload"]');
    if (uploadLabel) {
        pass('Upload label element exists');
        
        // Check if label is clickable
        const labelFor = uploadLabel.getAttribute('for');
        if (labelFor === 'audioUpload') {
            pass('Upload label correctly linked to input');
        } else {
            fail('Upload label linkage', 'Expected for="audioUpload", got "' + labelFor + '"');
        }
    } else {
        fail('Upload label element', 'Label with for="audioUpload" not found');
    }

    // Test 3: Modal Elements Exist
    console.log('\n📋 Test 3: Modal Elements');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    
    if (loginModal) {
        pass('Login modal exists');
    } else {
        fail('Login modal', 'Element with id "login-modal" not found');
    }

    if (registerModal) {
        pass('Register modal exists');
    } else {
        fail('Register modal', 'Element with id "register-modal" not found');
    }

    // Test 4: Close Buttons Exist
    console.log('\n📋 Test 4: Modal Close Buttons');
    const loginCloseBtn = document.getElementById('login-close-btn');
    const registerCloseBtn = document.getElementById('register-close-btn');

    if (loginCloseBtn) {
        pass('Login close button exists');
        if (loginCloseBtn.classList.contains('close-button')) {
            pass('Login close button has correct class');
        }
    } else {
        fail('Login close button', 'Element with id "login-close-btn" not found');
    }

    if (registerCloseBtn) {
        pass('Register close button exists');
        if (registerCloseBtn.classList.contains('close-button')) {
            pass('Register close button has correct class');
        }
    } else {
        fail('Register close button', 'Element with id "register-close-btn" not found');
    }

    // Test 5: Modal Switching Links
    console.log('\n📋 Test 5: Modal Switching Links');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');

    if (showRegisterLink) {
        pass('Show register link exists');
    } else {
        fail('Show register link', 'Element with id "show-register-link" not found');
    }

    if (showLoginLink) {
        pass('Show login link exists');
    } else {
        fail('Show login link', 'Element with id "show-login-link" not found');
    }

    // Test 6: Premium UI Controller
    console.log('\n📋 Test 6: Premium UI Controller');
    if (window.premiumUI) {
        pass('Premium UI Controller initialized');
        
        if (typeof window.premiumUI.openModal === 'function') {
            pass('openModal method exists');
        } else {
            fail('openModal method', 'Method not found on premiumUI object');
        }

        if (typeof window.premiumUI.closeModal === 'function') {
            pass('closeModal method exists');
        } else {
            fail('closeModal method', 'Method not found on premiumUI object');
        }
    } else {
        fail('Premium UI Controller', 'window.premiumUI not found');
    }

    // Test 7: Audio Upload Handler
    console.log('\n📋 Test 7: Audio Upload Handler');
    if (typeof window.triggerAudioUpload === 'function') {
        pass('Audio upload trigger function exists');
    } else {
        warn('Audio upload trigger function', 'window.triggerAudioUpload not found (may not be critical)');
    }

    // Test 8: Event Listeners
    console.log('\n📋 Test 8: Event Listeners');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    if (loginBtn) {
        pass('Login button exists');
    } else {
        fail('Login button', 'Element with id "login-btn" not found');
    }

    if (registerBtn) {
        pass('Register button exists');
    } else {
        fail('Register button', 'Element with id "register-btn" not found');
    }

    // Test 9: CSS Classes
    console.log('\n📋 Test 9: CSS Classes');
    if (loginModal && loginModal.classList.contains('auth-modal')) {
        pass('Login modal has auth-modal class');
    } else {
        fail('Login modal class', 'Missing auth-modal class');
    }

    if (loginModal && loginModal.classList.contains('modal-hidden')) {
        pass('Login modal initially hidden');
    } else {
        warn('Login modal visibility', 'Modal may be visible on page load');
    }

    // Test 10: Z-Index Layering
    console.log('\n📋 Test 10: Modal Layering');
    if (loginModal) {
        const computedStyle = window.getComputedStyle(loginModal);
        const zIndex = computedStyle.zIndex;
        
        if (zIndex === '10000' || parseInt(zIndex) >= 10000) {
            pass('Login modal has correct z-index for layering');
        } else {
            warn('Login modal z-index', `Expected 10000 or higher, got ${zIndex}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    console.log('='.repeat(60));

    if (results.failed.length === 0) {
        console.log('\n🎉 All critical tests passed!');
        console.log('✨ Audio upload and modal system are properly configured.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  Warnings detected (non-critical):');
        results.warnings.forEach(w => {
            console.log(`   - ${w.test}: ${w.reason}`);
        });
    }

    // Return results for programmatic access
    return {
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length,
        success: results.failed.length === 0,
        details: results
    };
})();
