/**
 * Performance Optimization Module
 * Implements performance improvements based on testing metrics
 * Requirements: 8.1, 8.5 - Performance optimization and loading indicators
 */

class PerformanceOptimization {
    constructor() {
        this.config = {
            // Performance thresholds (in milliseconds)
            thresholds: {
                pageLoad: 3000,
                apiResponse: 500,
                fileGeneration: 30000,
                firstContentfulPaint: 1800,
                largestContentfulPaint: 2500
            },
            
            // Optimization settings
            optimization: {
                enableResourceHints: true,
                enableImageOptimization: true,
                enableCodeSplitting: true,
                enableCaching: true,
                enableCompression: true
            },
            
            // Monitoring intervals
            monitoring: {
                performanceCheck: 10000, // 10 seconds
                memoryCheck: 30000, // 30 seconds
                networkCheck: 5000 // 5 seconds
            }
        };

        this.metrics = {
            pageLoadTime: null,
            apiResponseTimes: [],
            fileGenerationTimes: [],
            memoryUsage: [],
            networkLatency: [],
            userInteractions: []
        };

        this.optimizations = {
            applied: new Set(),
            pending: new Set(),
            failed: new Set()
        };

        this.init();
    }

    /**
     * Initialize performance optimization system
     */
    async init() {
        try {
            console.log('🚀 Initializing Performance Optimization System...');
            
            await this.setupPerformanceMonitoring();
            await this.applyInitialOptimizations();
            await this.setupResourceOptimization();
            await this.setupNetworkOptimization();
            await this.setupMemoryOptimization();
            await this.setupRenderOptimization();
            
            console.log('✅ Performance Optimization System initialized');
            
            // Start continuous monitoring
            this.startContinuousMonitoring();
            
        } catch (error) {
            console.error('❌ Failed to initialize Performance Optimization:', error);
            throw error;
        }
    }

    /**
     * Setup performance monitoring
     */
    async setupPerformanceMonitoring() {
        // Monitor page load performance
        this.monitorPageLoad();
        
        // Monitor API performance
        this.monitorAPIPerformance();
        
        // Monitor file generation performance
        this.monitorFileGeneration();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Monitor network performance
        this.monitorNetworkPerformance();
        
        console.log('✅ Performance monitoring configured');
    }

    /**
     * Monitor page load performance
     */
    monitorPageLoad() {
        // Use Performance API to track page load metrics
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    if (navigation) {
                        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
                        
                        // Check if page load is within threshold
                        if (this.metrics.pageLoadTime > this.config.thresholds.pageLoad) {
                            console.warn(`⚠️ Slow page load detected: ${this.metrics.pageLoadTime}ms`);
                            this.optimizePageLoad();
                        }
                    }
                }, 100);
            });

            // Monitor paint metrics
            if ('PerformanceObserver' in window) {
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-contentful-paint') {
                            if (entry.startTime > this.config.thresholds.firstContentfulPaint) {
                                console.warn(`⚠️ Slow FCP detected: ${entry.startTime}ms`);
                                this.optimizeRenderPerformance();
                            }
                        }
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });
            }
        }
    }

    /**
     * Monitor API performance
     */
    monitorAPIPerformance() {
        // Intercept fetch requests to monitor API performance
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = performance.now();
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track API response time
                this.metrics.apiResponseTimes.push({
                    url: args[0],
                    duration,
                    timestamp: Date.now(),
                    status: response.status
                });
                
                // Keep only last 100 entries
                if (this.metrics.apiResponseTimes.length > 100) {
                    this.metrics.apiResponseTimes.shift();
                }
                
                // Check if response time is within threshold
                if (duration > this.config.thresholds.apiResponse) {
                    console.warn(`⚠️ Slow API response: ${args[0]} took ${duration.toFixed(2)}ms`);
                    this.optimizeAPIPerformance(args[0], duration);
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track failed requests
                this.metrics.apiResponseTimes.push({
                    url: args[0],
                    duration,
                    timestamp: Date.now(),
                    status: 'error',
                    error: error.message
                });
                
                throw error;
            }
        };
    }

    /**
     * Monitor file generation performance
     */
    monitorFileGeneration() {
        // This would integrate with existing file generation systems
        // to track generation times and optimize accordingly
        
        // Example integration point
        if (window.premiumRecording) {
            const originalStartRecording = window.premiumRecording.startRecording;
            
            window.premiumRecording.startRecording = async (...args) => {
                const startTime = performance.now();
                
                try {
                    const result = await originalStartRecording.apply(window.premiumRecording, args);
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    this.metrics.fileGenerationTimes.push({
                        format: args[0],
                        duration,
                        timestamp: Date.now(),
                        success: true
                    });
                    
                    if (duration > this.config.thresholds.fileGeneration) {
                        console.warn(`⚠️ Slow file generation: ${args[0]} took ${duration.toFixed(2)}ms`);
                        this.optimizeFileGeneration(args[0], duration);
                    }
                    
                    return result;
                } catch (error) {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    this.metrics.fileGenerationTimes.push({
                        format: args[0],
                        duration,
                        timestamp: Date.now(),
                        success: false,
                        error: error.message
                    });
                    
                    throw error;
                }
            };
        }
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const memoryInfo = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
                
                this.metrics.memoryUsage.push(memoryInfo);
                
                // Keep only last 50 entries
                if (this.metrics.memoryUsage.length > 50) {
                    this.metrics.memoryUsage.shift();
                }
                
                // Check for memory issues
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                if (usagePercent > 80) {
                    console.warn(`⚠️ High memory usage: ${usagePercent.toFixed(2)}%`);
                    this.optimizeMemoryUsage();
                }
                
            }, this.config.monitoring.memoryCheck);
        }
    }

    /**
     * Monitor network performance
     */
    monitorNetworkPerformance() {
        // Monitor network connectivity and latency
        setInterval(async () => {
            try {
                const startTime = performance.now();
                
                // Ping a lightweight endpoint to measure latency
                const response = await fetch('/api/health', {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                
                const endTime = performance.now();
                const latency = endTime - startTime;
                
                this.metrics.networkLatency.push({
                    latency,
                    timestamp: Date.now(),
                    online: navigator.onLine
                });
                
                // Keep only last 20 entries
                if (this.metrics.networkLatency.length > 20) {
                    this.metrics.networkLatency.shift();
                }
                
                // Check for network issues
                if (latency > 2000) { // 2 seconds
                    console.warn(`⚠️ High network latency: ${latency.toFixed(2)}ms`);
                    this.optimizeNetworkPerformance();
                }
                
            } catch (error) {
                this.metrics.networkLatency.push({
                    latency: null,
                    timestamp: Date.now(),
                    online: false,
                    error: error.message
                });
            }
        }, this.config.monitoring.networkCheck);
    }

    /**
     * Apply initial optimizations
     */
    async applyInitialOptimizations() {
        // Apply resource hints
        if (this.config.optimization.enableResourceHints) {
            this.applyResourceHints();
        }
        
        // Optimize images
        if (this.config.optimization.enableImageOptimization) {
            this.optimizeImages();
        }
        
        // Setup caching
        if (this.config.optimization.enableCaching) {
            this.setupCaching();
        }
        
        // Optimize CSS and JS loading
        this.optimizeResourceLoading();
        
        console.log('✅ Initial optimizations applied');
    }

    /**
     * Apply resource hints for better loading performance
     */
    applyResourceHints() {
        const head = document.head;
        
        // Preconnect to external domains
        const preconnectDomains = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ];
        
        preconnectDomains.forEach(domain => {
            if (!document.querySelector(`link[href="${domain}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = domain;
                head.appendChild(link);
            }
        });
        
        // Prefetch critical resources
        const prefetchResources = [
            '/api/health',
            'assets/favicon.ico'
        ];
        
        prefetchResources.forEach(resource => {
            if (!document.querySelector(`link[href="${resource}"]`)) {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = resource;
                head.appendChild(link);
            }
        });
        
        this.optimizations.applied.add('resource-hints');
    }

    /**
     * Optimize images for better performance
     */
    optimizeImages() {
        // Add lazy loading to images
        document.querySelectorAll('img').forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            // Add decode hint for better performance
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
        
        // Setup intersection observer for advanced lazy loading
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
        
        this.optimizations.applied.add('image-optimization');
    }

    /**
     * Setup caching strategies
     */
    setupCaching() {
        // Setup service worker for caching (if not already present)
        if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
            this.setupServiceWorker();
        }
        
        // Setup localStorage caching for API responses
        this.setupAPIResponseCaching();
        
        this.optimizations.applied.add('caching');
    }

    /**
     * Setup service worker for caching
     */
    async setupServiceWorker() {
        try {
            // Create a simple service worker for caching static assets
            const swCode = `
                const CACHE_NAME = 'oriel-fx-v1';
                const urlsToCache = [
                    '/',
                    '/style.css',
                    '/script.js',
                    '/assets/favicon.ico'
                ];

                self.addEventListener('install', (event) => {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.addAll(urlsToCache))
                    );
                });

                self.addEventListener('fetch', (event) => {
                    event.respondWith(
                        caches.match(event.request)
                            .then((response) => {
                                return response || fetch(event.request);
                            })
                    );
                });
            `;
            
            // Create service worker blob
            const swBlob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(swBlob);
            
            // Register service worker
            await navigator.serviceWorker.register(swUrl);
            console.log('✅ Service worker registered for caching');
            
        } catch (error) {
            console.warn('⚠️ Service worker registration failed:', error);
        }
    }

    /**
     * Setup API response caching
     */
    setupAPIResponseCaching() {
        const cache = new Map();
        const cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Intercept API calls for caching
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Only cache GET requests
            if (options.method && options.method !== 'GET') {
                return originalFetch(url, options);
            }
            
            // Check cache first
            const cacheKey = `${url}_${JSON.stringify(options)}`;
            const cached = cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < cacheTimeout) {
                return new Response(cached.data, {
                    status: 200,
                    statusText: 'OK',
                    headers: cached.headers
                });
            }
            
            // Fetch and cache response
            try {
                const response = await originalFetch(url, options);
                
                if (response.ok && response.status === 200) {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.text();
                    
                    cache.set(cacheKey, {
                        data,
                        headers: response.headers,
                        timestamp: Date.now()
                    });
                    
                    // Cleanup old cache entries
                    if (cache.size > 50) {
                        const oldestKey = cache.keys().next().value;
                        cache.delete(oldestKey);
                    }
                }
                
                return response;
            } catch (error) {
                throw error;
            }
        };
    }

    /**
     * Optimize resource loading
     */
    optimizeResourceLoading() {
        // Defer non-critical JavaScript
        document.querySelectorAll('script').forEach(script => {
            if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
                // Only defer external scripts or non-critical internal scripts
                if (script.src || script.textContent.includes('analytics') || script.textContent.includes('tracking')) {
                    script.setAttribute('defer', '');
                }
            }
        });
        
        // Optimize CSS loading
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            // Add media attribute for non-critical CSS
            if (!link.hasAttribute('media') && !link.href.includes('style.css')) {
                link.setAttribute('media', 'print');
                link.setAttribute('onload', "this.media='all'");
            }
        });
        
        this.optimizations.applied.add('resource-loading');
    }

    /**
     * Setup resource optimization
     */
    async setupResourceOptimization() {
        // Implement resource bundling and minification strategies
        this.optimizeResourceBundling();
        
        // Setup code splitting for large modules
        this.setupCodeSplitting();
        
        console.log('✅ Resource optimization configured');
    }

    /**
     * Optimize resource bundling
     */
    optimizeResourceBundling() {
        // Group related resources for better caching
        // This would typically be done at build time, but we can optimize loading order
        
        const criticalResources = [
            'style.css',
            'script.js',
            'app-config.js'
        ];
        
        const nonCriticalResources = [
            'analytics-manager.js',
            'performance-monitor.js',
            'error-monitor.js'
        ];
        
        // Load critical resources first
        criticalResources.forEach(resource => {
            const element = document.querySelector(`[src="${resource}"], [href="${resource}"]`);
            if (element) {
                element.setAttribute('data-priority', 'high');
            }
        });
        
        // Defer non-critical resources
        nonCriticalResources.forEach(resource => {
            const element = document.querySelector(`[src="${resource}"], [href="${resource}"]`);
            if (element && element.tagName === 'SCRIPT') {
                element.setAttribute('defer', '');
            }
        });
    }

    /**
     * Setup code splitting
     */
    setupCodeSplitting() {
        // Implement dynamic imports for large modules
        const dynamicModules = [
            'premium-features',
            'analytics-manager',
            'dashboard-ui'
        ];
        
        dynamicModules.forEach(moduleName => {
            // Replace synchronous loading with dynamic imports
            if (window[moduleName]) {
                // Module already loaded, no action needed
                return;
            }
            
            // Create lazy loader
            Object.defineProperty(window, moduleName, {
                get: function() {
                    if (!this._module) {
                        this._module = import(`./${moduleName}.js`).then(module => {
                            return module.default || module;
                        });
                    }
                    return this._module;
                },
                configurable: true
            });
        });
    }

    /**
     * Setup network optimization
     */
    async setupNetworkOptimization() {
        // Implement request batching
        this.setupRequestBatching();
        
        // Setup connection pooling
        this.setupConnectionPooling();
        
        // Setup compression
        this.setupCompression();
        
        console.log('✅ Network optimization configured');
    }

    /**
     * Setup request batching
     */
    setupRequestBatching() {
        const batchQueue = [];
        const batchTimeout = 100; // 100ms
        let batchTimer = null;
        
        // Intercept API calls for batching
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Only batch certain types of requests
            if (url.includes('/api/analytics') || url.includes('/api/tracking')) {
                return new Promise((resolve, reject) => {
                    batchQueue.push({ url, options, resolve, reject });
                    
                    if (batchTimer) {
                        clearTimeout(batchTimer);
                    }
                    
                    batchTimer = setTimeout(() => {
                        this.processBatchQueue();
                    }, batchTimeout);
                });
            }
            
            return originalFetch(url, options);
        };
    }

    /**
     * Process batch queue
     */
    async processBatchQueue() {
        if (batchQueue.length === 0) return;
        
        const batch = batchQueue.splice(0);
        
        try {
            // Group requests by endpoint
            const groups = batch.reduce((acc, request) => {
                const endpoint = request.url.split('?')[0];
                if (!acc[endpoint]) acc[endpoint] = [];
                acc[endpoint].push(request);
                return acc;
            }, {});
            
            // Process each group
            for (const [endpoint, requests] of Object.entries(groups)) {
                if (requests.length === 1) {
                    // Single request, process normally
                    const request = requests[0];
                    try {
                        const response = await fetch(request.url, request.options);
                        request.resolve(response);
                    } catch (error) {
                        request.reject(error);
                    }
                } else {
                    // Multiple requests, batch them
                    try {
                        const batchResponse = await this.sendBatchRequest(endpoint, requests);
                        requests.forEach((request, index) => {
                            request.resolve(batchResponse[index] || new Response('{}', { status: 200 }));
                        });
                    } catch (error) {
                        requests.forEach(request => request.reject(error));
                    }
                }
            }
        } catch (error) {
            batch.forEach(request => request.reject(error));
        }
    }

    /**
     * Send batch request
     */
    async sendBatchRequest(endpoint, requests) {
        // This would depend on backend support for batch requests
        // For now, just process them individually
        const responses = [];
        
        for (const request of requests) {
            try {
                const response = await fetch(request.url, request.options);
                responses.push(response);
            } catch (error) {
                responses.push(new Response('{}', { status: 500 }));
            }
        }
        
        return responses;
    }

    /**
     * Setup connection pooling
     */
    setupConnectionPooling() {
        // Limit concurrent connections to prevent overwhelming the server
        const maxConcurrentConnections = 6;
        const connectionQueue = [];
        let activeConnections = 0;
        
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            return new Promise((resolve, reject) => {
                const executeRequest = async () => {
                    activeConnections++;
                    
                    try {
                        const response = await originalFetch(...args);
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    } finally {
                        activeConnections--;
                        
                        // Process next request in queue
                        if (connectionQueue.length > 0) {
                            const nextRequest = connectionQueue.shift();
                            nextRequest();
                        }
                    }
                };
                
                if (activeConnections < maxConcurrentConnections) {
                    executeRequest();
                } else {
                    connectionQueue.push(executeRequest);
                }
            });
        };
    }

    /**
     * Setup compression
     */
    setupCompression() {
        // Add compression headers to requests
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            const headers = new Headers(options.headers || {});
            
            // Add compression headers
            if (!headers.has('Accept-Encoding')) {
                headers.set('Accept-Encoding', 'gzip, deflate, br');
            }
            
            return originalFetch(url, {
                ...options,
                headers
            });
        };
    }

    /**
     * Setup memory optimization
     */
    async setupMemoryOptimization() {
        // Implement garbage collection strategies
        this.setupGarbageCollection();
        
        // Setup memory leak detection
        this.setupMemoryLeakDetection();
        
        console.log('✅ Memory optimization configured');
    }

    /**
     * Setup garbage collection
     */
    setupGarbageCollection() {
        // Periodic cleanup of unused resources
        setInterval(() => {
            this.performGarbageCollection();
        }, 60000); // Every minute
    }

    /**
     * Perform garbage collection
     */
    performGarbageCollection() {
        // Clear old metrics
        if (this.metrics.apiResponseTimes.length > 100) {
            this.metrics.apiResponseTimes = this.metrics.apiResponseTimes.slice(-50);
        }
        
        if (this.metrics.fileGenerationTimes.length > 50) {
            this.metrics.fileGenerationTimes = this.metrics.fileGenerationTimes.slice(-25);
        }
        
        if (this.metrics.memoryUsage.length > 50) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-25);
        }
        
        // Clear old user interactions
        if (this.metrics.userInteractions.length > 100) {
            this.metrics.userInteractions = this.metrics.userInteractions.slice(-50);
        }
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Setup memory leak detection
     */
    setupMemoryLeakDetection() {
        let lastMemoryUsage = 0;
        let memoryIncreaseCount = 0;
        
        setInterval(() => {
            if ('memory' in performance) {
                const currentMemory = performance.memory.usedJSHeapSize;
                
                if (currentMemory > lastMemoryUsage * 1.1) { // 10% increase
                    memoryIncreaseCount++;
                    
                    if (memoryIncreaseCount > 5) { // 5 consecutive increases
                        console.warn('⚠️ Potential memory leak detected');
                        this.handleMemoryLeak();
                        memoryIncreaseCount = 0;
                    }
                } else {
                    memoryIncreaseCount = 0;
                }
                
                lastMemoryUsage = currentMemory;
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Handle memory leak
     */
    handleMemoryLeak() {
        // Aggressive cleanup
        this.performGarbageCollection();
        
        // Clear caches
        if (window.caches) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.includes('temp') || name.includes('cache')) {
                        caches.delete(name);
                    }
                });
            });
        }
        
        // Clear localStorage of non-essential data
        const essentialKeys = ['orielFxDownloads', 'authToken', 'userPreferences'];
        Object.keys(localStorage).forEach(key => {
            if (!essentialKeys.includes(key)) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Setup render optimization
     */
    async setupRenderOptimization() {
        // Implement virtual scrolling for large lists
        this.setupVirtualScrolling();
        
        // Optimize animations
        this.optimizeAnimations();
        
        // Setup frame rate monitoring
        this.setupFrameRateMonitoring();
        
        console.log('✅ Render optimization configured');
    }

    /**
     * Setup virtual scrolling
     */
    setupVirtualScrolling() {
        // Find large lists and implement virtual scrolling
        document.querySelectorAll('[data-virtual-scroll]').forEach(container => {
            this.implementVirtualScrolling(container);
        });
    }

    /**
     * Implement virtual scrolling for container
     */
    implementVirtualScrolling(container) {
        const itemHeight = parseInt(container.dataset.itemHeight) || 50;
        const items = Array.from(container.children);
        const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        let scrollTop = 0;
        let startIndex = 0;
        
        const updateVisibleItems = () => {
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(newStartIndex + visibleCount, items.length);
            
            if (newStartIndex !== startIndex) {
                startIndex = newStartIndex;
                
                // Hide all items
                items.forEach(item => item.style.display = 'none');
                
                // Show visible items
                for (let i = startIndex; i < endIndex; i++) {
                    if (items[i]) {
                        items[i].style.display = 'block';
                        items[i].style.transform = `translateY(${i * itemHeight}px)`;
                    }
                }
            }
        };
        
        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            requestAnimationFrame(updateVisibleItems);
        });
        
        // Initial render
        updateVisibleItems();
    }

    /**
     * Optimize animations
     */
    optimizeAnimations() {
        // Use CSS transforms instead of changing layout properties
        document.querySelectorAll('[data-animate]').forEach(element => {
            element.style.willChange = 'transform, opacity';
        });
        
        // Debounce scroll animations
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                // Process scroll animations
                this.processScrollAnimations();
            }, 16); // ~60fps
        });
    }

    /**
     * Process scroll animations
     */
    processScrollAnimations() {
        document.querySelectorAll('[data-scroll-animate]').forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible && !element.classList.contains('animated')) {
                element.classList.add('animated');
            }
        });
    }

    /**
     * Setup frame rate monitoring
     */
    setupFrameRateMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 60;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) { // Every second
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Check for performance issues
                if (fps < 30) {
                    console.warn(`⚠️ Low frame rate detected: ${fps} FPS`);
                    this.optimizeRenderPerformance();
                }
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    /**
     * Start continuous monitoring
     */
    startContinuousMonitoring() {
        setInterval(() => {
            this.analyzePerformanceMetrics();
        }, this.config.monitoring.performanceCheck);
    }

    /**
     * Analyze performance metrics and apply optimizations
     */
    analyzePerformanceMetrics() {
        // Analyze API performance
        if (this.metrics.apiResponseTimes.length > 10) {
            const avgResponseTime = this.metrics.apiResponseTimes
                .slice(-10)
                .reduce((sum, metric) => sum + metric.duration, 0) / 10;
            
            if (avgResponseTime > this.config.thresholds.apiResponse) {
                this.optimizeAPIPerformance();
            }
        }
        
        // Analyze memory usage
        if (this.metrics.memoryUsage.length > 5) {
            const latestMemory = this.metrics.memoryUsage.slice(-5);
            const memoryTrend = latestMemory[latestMemory.length - 1].used - latestMemory[0].used;
            
            if (memoryTrend > 10 * 1024 * 1024) { // 10MB increase
                this.optimizeMemoryUsage();
            }
        }
    }

    // Optimization methods for specific performance issues

    /**
     * Optimize page load performance
     */
    optimizePageLoad() {
        if (this.optimizations.applied.has('page-load-optimization')) {
            return;
        }
        
        // Apply additional optimizations for slow page loads
        this.applyResourceHints();
        this.optimizeResourceLoading();
        
        this.optimizations.applied.add('page-load-optimization');
        console.log('✅ Page load optimization applied');
    }

    /**
     * Optimize API performance
     */
    optimizeAPIPerformance(url = null, duration = null) {
        if (this.optimizations.applied.has('api-optimization')) {
            return;
        }
        
        // Apply API-specific optimizations
        this.setupRequestBatching();
        this.setupAPIResponseCaching();
        
        this.optimizations.applied.add('api-optimization');
        console.log('✅ API performance optimization applied');
    }

    /**
     * Optimize file generation performance
     */
    optimizeFileGeneration(format = null, duration = null) {
        if (this.optimizations.applied.has('file-generation-optimization')) {
            return;
        }
        
        // Apply file generation optimizations
        // This would integrate with the file generation system
        console.log(`🎬 Optimizing file generation for ${format}`);
        
        this.optimizations.applied.add('file-generation-optimization');
    }

    /**
     * Optimize memory usage
     */
    optimizeMemoryUsage() {
        this.performGarbageCollection();
        
        // Additional memory optimizations
        if (window.uxEnhancementSystem) {
            window.uxEnhancementSystem.performMemoryCleanup();
        }
        
        console.log('🧹 Memory optimization performed');
    }

    /**
     * Optimize network performance
     */
    optimizeNetworkPerformance() {
        if (this.optimizations.applied.has('network-optimization')) {
            return;
        }
        
        this.setupConnectionPooling();
        this.setupCompression();
        
        this.optimizations.applied.add('network-optimization');
        console.log('✅ Network performance optimization applied');
    }

    /**
     * Optimize render performance
     */
    optimizeRenderPerformance() {
        if (this.optimizations.applied.has('render-optimization')) {
            return;
        }
        
        this.optimizeAnimations();
        this.setupVirtualScrolling();
        
        this.optimizations.applied.add('render-optimization');
        console.log('✅ Render performance optimization applied');
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        return {
            metrics: {
                pageLoadTime: this.metrics.pageLoadTime,
                avgApiResponseTime: this.metrics.apiResponseTimes.length > 0 
                    ? this.metrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / this.metrics.apiResponseTimes.length 
                    : null,
                avgFileGenerationTime: this.metrics.fileGenerationTimes.length > 0
                    ? this.metrics.fileGenerationTimes.reduce((sum, m) => sum + m.duration, 0) / this.metrics.fileGenerationTimes.length
                    : null,
                currentMemoryUsage: this.metrics.memoryUsage.length > 0
                    ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
                    : null,
                avgNetworkLatency: this.metrics.networkLatency.length > 0
                    ? this.metrics.networkLatency.filter(m => m.latency).reduce((sum, m) => sum + m.latency, 0) / this.metrics.networkLatency.filter(m => m.latency).length
                    : null
            },
            optimizations: {
                applied: Array.from(this.optimizations.applied),
                pending: Array.from(this.optimizations.pending),
                failed: Array.from(this.optimizations.failed)
            },
            thresholds: this.config.thresholds,
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Check page load time
        if (this.metrics.pageLoadTime && this.metrics.pageLoadTime > this.config.thresholds.pageLoad) {
            recommendations.push({
                type: 'page-load',
                message: `Page load time (${this.metrics.pageLoadTime}ms) exceeds threshold (${this.config.thresholds.pageLoad}ms)`,
                suggestion: 'Consider optimizing resource loading and implementing code splitting'
            });
        }
        
        // Check API performance
        if (this.metrics.apiResponseTimes.length > 0) {
            const avgApiTime = this.metrics.apiResponseTimes.reduce((sum, m) => sum + m.duration, 0) / this.metrics.apiResponseTimes.length;
            if (avgApiTime > this.config.thresholds.apiResponse) {
                recommendations.push({
                    type: 'api-performance',
                    message: `Average API response time (${avgApiTime.toFixed(2)}ms) exceeds threshold (${this.config.thresholds.apiResponse}ms)`,
                    suggestion: 'Consider implementing request batching and response caching'
                });
            }
        }
        
        // Check memory usage
        if (this.metrics.memoryUsage.length > 0) {
            const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
            const usagePercent = (latestMemory.used / latestMemory.limit) * 100;
            if (usagePercent > 70) {
                recommendations.push({
                    type: 'memory-usage',
                    message: `Memory usage (${usagePercent.toFixed(2)}%) is high`,
                    suggestion: 'Consider implementing more aggressive garbage collection and memory cleanup'
                });
            }
        }
        
        return recommendations;
    }
}

// Initialize Performance Optimization System
window.performanceOptimization = new PerformanceOptimization();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimization;
}