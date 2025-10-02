#!/usr/bin/env node

/**
 * Server Status Checker
 * Quick utility to check if backend and frontend servers are running
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class ServerStatusChecker {
    constructor() {
        this.results = [];
    }

    async checkServer(url, name) {
        return new Promise((resolve) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const startTime = Date.now();
            
            const req = client.request({
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: 'GET',
                timeout: 5000
            }, (res) => {
                const duration = Date.now() - startTime;
                const result = {
                    name,
                    url,
                    status: 'ONLINE',
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    message: `Server responding (${res.statusCode})`
                };
                
                this.results.push(result);
                console.log(`✅ ${name}: ${result.message} - ${result.duration}`);
                resolve(result);
            });

            req.on('error', (error) => {
                const duration = Date.now() - startTime;
                const result = {
                    name,
                    url,
                    status: 'OFFLINE',
                    statusCode: null,
                    duration: `${duration}ms`,
                    message: error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message
                };
                
                this.results.push(result);
                console.log(`❌ ${name}: ${result.message} - ${result.duration}`);
                resolve(result);
            });

            req.on('timeout', () => {
                req.destroy();
                const result = {
                    name,
                    url,
                    status: 'TIMEOUT',
                    statusCode: null,
                    duration: '5000ms+',
                    message: 'Request timeout'
                };
                
                this.results.push(result);
                console.log(`⏰ ${name}: ${result.message}`);
                resolve(result);
            });

            req.end();
        });
    }

    async checkAllServers() {
        console.log('🔍 Checking server status...\n');

        const servers = [
            { name: 'Backend (localhost:8000)', url: 'http://localhost:8000/api/health' },
            { name: 'Backend (127.0.0.1:8000)', url: 'http://127.0.0.1:8000/api/health' },
            { name: 'Frontend (localhost:3000)', url: 'http://localhost:3000' },
            { name: 'Frontend (127.0.0.1:3000)', url: 'http://127.0.0.1:3000' }
        ];

        for (const server of servers) {
            await this.checkServer(server.url, server.name);
        }

        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SERVER STATUS REPORT');
        console.log('='.repeat(60));

        const online = this.results.filter(r => r.status === 'ONLINE').length;
        const offline = this.results.filter(r => r.status === 'OFFLINE').length;
        const timeout = this.results.filter(r => r.status === 'TIMEOUT').length;

        console.log(`✅ Online: ${online}`);
        console.log(`❌ Offline: ${offline}`);
        console.log(`⏰ Timeout: ${timeout}`);

        console.log('\n📋 RECOMMENDATIONS:');

        const backendOffline = this.results.some(r => 
            r.name.includes('Backend') && r.status !== 'ONLINE'
        );

        const frontendOffline = this.results.some(r => 
            r.name.includes('Frontend') && r.status !== 'ONLINE'
        );

        if (backendOffline) {
            console.log('\n🔧 Backend Server Issues:');
            console.log('   1. Start the backend server:');
            console.log('      cd backend && python oriel_backend.py');
            console.log('   2. Or use the development server:');
            console.log('      cd backend && python run_dev_server.py');
            console.log('   3. Check if port 8000 is available:');
            console.log('      lsof -i :8000');
        }

        if (frontendOffline) {
            console.log('\n🔧 Frontend Server Issues:');
            console.log('   1. Start a simple HTTP server:');
            console.log('      python3 -m http.server 3000');
            console.log('   2. Or use Node.js:');
            console.log('      npx http-server -p 3000');
            console.log('   3. Or open index.html directly in browser');
        }

        if (online === this.results.length) {
            console.log('\n🎉 All servers are running correctly!');
        }

        console.log('='.repeat(60));
    }
}

// Run if called directly
if (require.main === module) {
    const checker = new ServerStatusChecker();
    checker.checkAllServers().catch(console.error);
}

module.exports = ServerStatusChecker;