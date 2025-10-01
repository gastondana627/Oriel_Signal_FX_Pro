/**
 * Integration test for SaaS utilities
 * This file can be loaded in the browser console to test the utilities
 */

function testSaaSIntegration() {
    console.log('🧪 Testing SaaS Integration Utilities...\n');

    // Test 1: AppConfig
    console.log('1. Testing AppConfig...');
    try {
        console.log('   Environment:', window.appConfig.getEnvironment());
        console.log('   API Base URL:', window.appConfig.getApiBaseUrl());
        console.log('   Feature enabled (userRegistration):', window.appConfig.isFeatureEnabled('userRegistration'));
        console.log('   Free plan:', window.appConfig.getPlan('free'));
        console.log('   ✅ AppConfig working correctly');
    } catch (error) {
        console.error('   ❌ AppConfig error:', error);
    }

    // Test 2: ApiClient
    console.log('\n2. Testing ApiClient...');
    try {
        const apiClient = new window.ApiClient();
        console.log('   API Client created with base URL:', apiClient.baseUrl);
        console.log('   Headers (no token):', apiClient.createHeaders());
        
        // Test token management
        apiClient.saveToken('test-token-123');
        console.log('   Headers (with token):', apiClient.createHeaders());
        apiClient.saveToken(null); // Clear token
        
        console.log('   ✅ ApiClient working correctly');
    } catch (error) {
        console.error('   ❌ ApiClient error:', error);
    }

    // Test 3: NotificationManager
    console.log('\n3. Testing NotificationManager...');
    try {
        // Test different notification types
        const successId = window.notifications.success('Test success message', { duration: 2000 });
        setTimeout(() => {
            window.notifications.info('Test info message', { duration: 2000 });
        }, 500);
        setTimeout(() => {
            window.notifications.warning('Test warning message', { duration: 2000 });
        }, 1000);
        setTimeout(() => {
            window.notifications.error('Test error message', { duration: 2000 });
        }, 1500);
        
        console.log('   Notification ID:', successId);
        console.log('   ✅ NotificationManager working correctly');
    } catch (error) {
        console.error('   ❌ NotificationManager error:', error);
    }

    // Test 4: Integration between utilities
    console.log('\n4. Testing utility integration...');
    try {
        // Create API client with config
        const apiClient = new window.ApiClient(window.appConfig.getApiBaseUrl());
        
        // Add error interceptor that uses notifications
        apiClient.addResponseInterceptor(async (response, error) => {
            if (error) {
                window.notifications.error(`API Error: ${error.message}`);
            }
            return { response, error };
        });
        
        console.log('   ✅ Utilities integrated successfully');
    } catch (error) {
        console.error('   ❌ Integration error:', error);
    }

    // Test 5: Payment System (if available)
    console.log('\n5. Testing Payment System...');
    try {
        if (window.PaymentManager && window.paymentManager) {
            console.log('   Payment Manager initialized:', !!window.paymentManager);
            console.log('   Can make payments:', window.paymentManager.canMakePayments());
            console.log('   Upgrade options for free plan:', window.paymentManager.getUpgradeOptions('free'));
            console.log('   ✅ Payment system working correctly');
        } else {
            console.log('   ⚠️ Payment system not yet initialized (this is normal during page load)');
        }
    } catch (error) {
        console.error('   ❌ Payment system error:', error);
    }

    // Test 6: Usage Tracker (if available)
    console.log('\n6. Testing Usage Tracker...');
    try {
        if (window.UsageTracker && window.usageTracker) {
            const usageStats = window.usageTracker.getUsageStats();
            console.log('   Usage stats:', usageStats);
            console.log('   Can user download:', window.usageTracker.canUserDownload());
            console.log('   Usage summary:', window.usageTracker.getUsageSummary());
            console.log('   ✅ Usage tracker working correctly');
        } else {
            console.log('   ⚠️ Usage tracker not yet initialized (this is normal during page load)');
        }
    } catch (error) {
        console.error('   ❌ Usage tracker error:', error);
    }

    console.log('\n🎉 SaaS Integration test completed!');
    console.log('💡 You can now use:');
    console.log('   - window.appConfig for configuration');
    console.log('   - window.ApiClient for API calls');
    console.log('   - window.notifications for user feedback');
    console.log('   - window.paymentManager for payments (when initialized)');
    console.log('   - window.usageTracker for usage tracking (when initialized)');
}

// Auto-run test if in development
if (window.appConfig && window.appConfig.isDevelopment()) {
    // Run test after a short delay to ensure all scripts are loaded
    setTimeout(testSaaSIntegration, 1000);
}

// Export for manual testing
window.testSaaSIntegration = testSaaSIntegration;