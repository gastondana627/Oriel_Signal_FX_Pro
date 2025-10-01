/**
 * Simple Backend Connection Test
 * Run this in the browser console to test backend connectivity
 */

async function testBackendConnection() {
    const backendUrl = 'http://localhost:8000';
    
    console.log('🔗 Testing backend connection...');
    
    try {
        // Test health endpoint
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${backendUrl}/api/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.ok) {
            console.log('✅ Health check passed:', healthData);
        } else {
            console.log('❌ Health check failed:', healthResponse.status);
        }
        
        // Test auth status endpoint
        console.log('Testing auth status endpoint...');
        const authResponse = await fetch(`${backendUrl}/api/auth/status`);
        const authData = await authResponse.json();
        
        if (authResponse.ok) {
            console.log('✅ Auth status check passed:', authData);
        } else {
            console.log('❌ Auth status check failed:', authResponse.status);
        }
        
        // Test CORS
        console.log('Testing CORS configuration...');
        const corsHeaders = healthResponse.headers;
        const corsOrigin = corsHeaders.get('Access-Control-Allow-Origin');
        
        if (corsOrigin) {
            console.log('✅ CORS configured:', corsOrigin);
        } else {
            console.log('⚠️ CORS headers not found');
        }
        
        console.log('🎉 Backend connection test completed!');
        return true;
        
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Auto-run the test
testBackendConnection();