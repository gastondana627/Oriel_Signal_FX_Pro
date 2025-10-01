#!/usr/bin/env node

/**
 * Node.js test runner for authentication unit tests
 * Simulates browser environment and runs tests programmatically
 */

// Simulate browser globals
global.window = {
    localStorage: {
        storage: {},
        getItem(key) { return this.storage[key] || null; },
        setItem(key, value) { this.storage[key] = value; },
        removeItem(key) { delete this.storage[key]; },
        clear() { this.storage = {}; }
    },
    location: { 
        href: 'http://localhost:3000',
        hostname: 'localhost',
        port: '3000',
        protocol: 'http:'
    },
    document: {
        body: { 
            innerHTML: '',
            appendChild: () => {},
            removeChild: () => {},
            querySelector: () => null,
            querySelectorAll: () => []
        },
        getElementById: function(id) {
            // Return mock DOM elements
            return {
                id: id,
                classList: {
                    contains: () => false,
                    add: () => {},
                    remove: () => {},
                    toggle: () => {}
                },
                addEventListener: () => {},
                textContent: '',
                value: '',
                disabled: false,
                querySelector: () => null,
                querySelectorAll: () => [],
                appendChild: () => {},
                removeChild: () => {},
                style: {},
                dataset: {}
            };
        },
        addEventListener: () => {},
        createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            classList: { 
                add: () => {}, 
                remove: () => {},
                contains: () => false,
                toggle: () => {}
            },
            addEventListener: () => {},
            appendChild: () => {},
            removeChild: () => {},
            textContent: '',
            innerHTML: '',
            style: {},
            dataset: {}
        }),
        createTextNode: (text) => ({ textContent: text }),
        querySelector: () => null,
        querySelectorAll: () => []
    },
    btoa: (str) => Buffer.from(str).toString('base64'),
    atob: (str) => Buffer.from(str, 'base64').toString(),
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Date: Date,
    Math: Math,
    console: console
};

global.document = global.window.document;
global.localStorage = global.window.localStorage;
global.btoa = global.window.btoa;
global.atob = global.window.atob;
global.fetch = global.window.fetch;

// Mock Event class
global.Event = class Event {
    constructor(type, options = {}) {
        this.type = type;
        this.bubbles = options.bubbles || false;
        this.cancelable = options.cancelable || false;
        this.preventDefault = () => {};
        this.stopPropagation = () => {};
    }
};

// Load the authentication modules
const fs = require('fs');
const path = require('path');

function loadScript(filename) {
    const scriptPath = path.join(__dirname, filename);
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Remove any browser-specific code that might cause issues
    const cleanedScript = scriptContent
        .replace(/document\.addEventListener\('DOMContentLoaded'.*?\}\);/gs, '')
        .replace(/if \(typeof window !== 'undefined'.*?\}\);/gs, '');
    
    eval(cleanedScript);
}

try {
    console.log('🔧 Loading authentication modules...\n');
    
    // Load dependencies in order
    loadScript('app-config.js');
    loadScript('notification-manager.js');
    loadScript('api-client.js');
    loadScript('auth-manager.js');
    loadScript('auth-ui.js');
    loadScript('auth-tests.js');
    
    console.log('✅ All modules loaded successfully\n');
    
    // Run the tests
    async function runTests() {
        console.log('🚀 Starting Authentication Unit Tests...\n');
        
        const testSuite = new global.window.AuthenticationTests();
        const results = await testSuite.runAllTests();
        
        console.log('\n🎯 Test Execution Complete!');
        
        // Exit with appropriate code
        const summary = testSuite.printResults();
        if (summary.failed > 0 || summary.errors > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
    
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Failed to load modules:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}