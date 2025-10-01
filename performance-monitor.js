/**
 * Performance Monitor
 * Handles performance metrics collection, API response time monitoring, and user experience tracking
 */
class PerformanceMonitor {
    constructor(apiClient, appConfig, analyticsManager = null) {
        this.apiClient = apiClient;
        this.appConfig = appConfig;
        this.analyticsManager = analyticsManager;
        this.isEnabled = appConfig.isFeatureEnabled('performanceMonitoring');
        this.metricsQueue = [];
        this.maxQueueSize = 100;
        this.flushInterval = 30000; // 30 seconds
        this.userId = null;
        this.sessionId = this.generateSessionId();
        this.pageLoadTime = null;
        this.navigationStart = performance.now();
        
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (!this.isEnabled) {
            console.log('Performance monitoring is disabled');
            return;
        }

        this.setupPerformanceObservers();
        this.trackPageLoad();
        this.startMetricsProcessing();
        this.monitorMemoryUsage();
        
        console.log('Performance Monitor initialized');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'perf_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set user information
     */
    setUser(userId) {
        this.userId = userId;
    }

    /**
     * Clear user information
     */
    clearUser() {
        this.userId = null;
    }

    /**
     * Set up performance observers
     */
    setupPerformanceObservers() {
        // Observe navigation timing
        if ('PerformanceObserver' in window) {
            try {
                // Navigation timing
                const navObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackNavigationTiming(entry);
                    }
                });
                navObserver.observe({ entryTypes: ['navigation'] });

                // Resource timing
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackResourceTiming(entry);
                    }
                });
                resourceObserver.observe({ entryTypes: ['resource'] });

                // Paint timing
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackPaintTiming(entry);
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });

                // Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackLCP(entry);
                    }
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay
                const fidObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackFID(entry);
                    }
                });
                fidObserver.observe({ entryTypes: ['first-input'] });

                // Layout Shift
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.trackCLS(entry);
                    }
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });

            } catch (error) {
                console.warn('Some performance observers not supported:', error);
            }
        }
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
                    
                    this.recordMetric('page_load', {
                        loadTime: this.pageLoadTime,
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                        firstByte: navigation.responseStart - navigation.navigationStart,
                        domInteractive: navigation.domInteractive - navigation.navigationStart,
                        resourcesLoaded: navigation.loadEventEnd - navigation.domContentLoadedEventEnd
                    });
                }
            }, 0);
        });
    }

    /**
     * Track navigation timing
     */
    trackNavigationTiming(entry) {
        this.recordMetric('navigation_timing', {
            type: entry.type,
            redirectTime: entry.redirectEnd - entry.redirectStart,
            dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
            connectTime: entry.connectEnd - entry.connectStart,
            requestTime: entry.responseStart - entry.requestStart,
            responseTime: entry.responseEnd - entry.responseStart,
            domProcessingTime: entry.domComplete - entry.domLoading,
            loadEventTime: entry.loadEventEnd - entry.loadEventStart
        });
    }

    /**
     * Track resource timing
     */
    trackResourceTiming(entry) {
        // Only track important resources to avoid spam
        const importantResources = ['.js', '.css', '.woff', '.woff2', 'api/'];
        const isImportant = importantResources.some(type => entry.name.includes(type));
        
        if (isImportant) {
            this.recordMetric('resource_timing', {
                name: entry.name,
                type: this.getResourceType(entry.name),
                duration: entry.duration,
                size: entry.transferSize || entry.encodedBodySize,
                cached: entry.transferSize === 0 && entry.encodedBodySize > 0
            });
        }
    }

    /**
     * Track paint timing
     */
    trackPaintTiming(entry) {
        this.recordMetric('paint_timing', {
            name: entry.name,
            startTime: entry.startTime
        });
    }

    /**
     * Track Largest Contentful Paint
     */
    trackLCP(entry) {
        this.recordMetric('largest_contentful_paint', {
            startTime: entry.startTime,
            size: entry.size,
            element: entry.element ? entry.element.tagName : null
        });
    }

    /**
     * Track First Input Delay
     */
    trackFID(entry) {
        this.recordMetric('first_input_delay', {
            delay: entry.processingStart - entry.startTime,
            duration: entry.duration,
            startTime: entry.startTime
        });
    }

    /**
     * Track Cumulative Layout Shift
     */
    trackCLS(entry) {
        if (!entry.hadRecentInput) {
            this.recordMetric('cumulative_layout_shift', {
                value: entry.value,
                sources: entry.sources ? entry.sources.length : 0
            });
        }
    }

    /**
     * Monitor API response times
     */
    trackApiCall(endpoint, method, startTime, endTime, status, size = 0) {
        const duration = endTime - startTime;
        
        this.recordMetric('api_response_time', {
            endpoint: endpoint,
            method: method,
            duration: duration,
            status: status,
            size: size,
            slow: duration > 2000, // Mark as slow if > 2 seconds
            failed: status >= 400
        });

        // Track in analytics if available
        if (this.analyticsManager) {
            this.analyticsManager.trackPerformance('api_call', duration, {
                endpoint: endpoint,
                method: method,
                status: status
            });
        }
    }

    /**
     * Monitor visualizer performance
     */
    trackVisualizerPerformance(operation, duration, details = {}) {
        this.recordMetric('visualizer_performance', {
            operation: operation,
            duration: duration,
            ...details
        });

        // Track in analytics if available
        if (this.analyticsManager) {
            this.analyticsManager.trackPerformance('visualizer_operation', duration, {
                operation: operation,
                ...details
            });
        }
    }

    /**
     * Monitor file processing performance
     */
    trackFileProcessing(operation, fileSize, duration, success = true) {
        this.recordMetric('file_processing', {
            operation: operation,
            fileSize: fileSize,
            duration: duration,
            success: success,
            throughput: success ? fileSize / duration : 0
        });
    }

    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.recordMetric('memory_usage', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    utilization: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                });
            }, 60000); // Every minute
        }
    }

    /**
     * Monitor frame rate
     */
    startFrameRateMonitoring() {
        let frames = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                this.recordMetric('frame_rate', {
                    fps: fps,
                    timestamp: currentTime
                });
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    /**
     * Track user interaction performance
     */
    trackInteractionPerformance(interaction, startTime, endTime, details = {}) {
        const duration = endTime - startTime;
        
        this.recordMetric('interaction_performance', {
            interaction: interaction,
            duration: duration,
            responsive: duration < 100, // Good responsiveness < 100ms
            ...details
        });
    }

    /**
     * Record performance metric
     */
    recordMetric(metricType, data) {
        if (!this.isEnabled) return;

        const metric = {
            id: this.generateMetricId(),
            sessionId: this.sessionId,
            userId: this.userId,
            type: metricType,
            timestamp: Date.now(),
            data: data,
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                connection: this.getConnectionInfo(),
                deviceMemory: navigator.deviceMemory || null,
                hardwareConcurrency: navigator.hardwareConcurrency || null
            }
        };

        this.metricsQueue.push(metric);
        
        // Trim queue if too large
        if (this.metricsQueue.length > this.maxQueueSize) {
            this.metricsQueue = this.metricsQueue.slice(-this.maxQueueSize);
        }

        // Log in development
        if (this.appConfig.isDevelopment()) {
            console.log('Performance Metric:', metricType, data);
        }

        // Flush if queue is getting full
        if (this.metricsQueue.length >= this.maxQueueSize * 0.8) {
            this.flushMetrics();
        }
    }

    /**
     * Get connection information
     */
    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    }

    /**
     * Get resource type from URL
     */
    getResourceType(url) {
        if (url.includes('.js')) return 'script';
        if (url.includes('.css')) return 'stylesheet';
        if (url.includes('.woff') || url.includes('.woff2')) return 'font';
        if (url.includes('.png') || url.includes('.jpg') || url.includes('.gif')) return 'image';
        if (url.includes('api/')) return 'api';
        return 'other';
    }

    /**
     * Start metrics processing
     */
    startMetricsProcessing() {
        // Flush metrics periodically
        setInterval(() => {
            if (this.metricsQueue.length > 0) {
                this.flushMetrics();
            }
        }, this.flushInterval);

        // Flush metrics before page unload
        window.addEventListener('beforeunload', () => {
            this.flushMetrics(true);
        });
    }

    /**
     * Flush metrics to backend
     */
    async flushMetrics(force = false) {
        if (!this.isEnabled || this.metricsQueue.length === 0) return;
        
        // Don't flush if offline unless forced
        if (!navigator.onLine && !force) return;

        const metricsToSend = [...this.metricsQueue];
        this.metricsQueue = [];

        try {
            await this.apiClient.post('/api/monitoring/performance', {
                metrics: metricsToSend,
                sessionId: this.sessionId,
                timestamp: Date.now()
            });

            if (this.appConfig.isDevelopment()) {
                console.log(`Flushed ${metricsToSend.length} performance metrics`);
            }
        } catch (error) {
            console.error('Failed to send performance metrics:', error);
            
            // Re-queue metrics if they failed to send
            this.metricsQueue.unshift(...metricsToSend);
            
            // Store in local storage as backup
            this.storeMetricsLocally(metricsToSend);
        }
    }

    /**
     * Store metrics locally when offline
     */
    storeMetricsLocally(metrics) {
        try {
            const stored = JSON.parse(localStorage.getItem('performance_queue') || '[]');
            stored.push(...metrics);
            
            // Keep only last 200 metrics to prevent storage overflow
            const trimmed = stored.slice(-200);
            localStorage.setItem('performance_queue', JSON.stringify(trimmed));
        } catch (error) {
            console.error('Failed to store performance metrics locally:', error);
        }
    }

    /**
     * Load and send stored metrics
     */
    async loadStoredMetrics() {
        try {
            const stored = JSON.parse(localStorage.getItem('performance_queue') || '[]');
            if (stored.length > 0) {
                await this.apiClient.post('/api/monitoring/performance', {
                    metrics: stored,
                    sessionId: this.sessionId,
                    timestamp: Date.now(),
                    isBacklog: true
                });
                
                localStorage.removeItem('performance_queue');
                console.log(`Sent ${stored.length} stored performance metrics`);
            }
        } catch (error) {
            console.error('Failed to send stored performance metrics:', error);
        }
    }

    /**
     * Generate unique metric ID
     */
    generateMetricId() {
        return 'metric_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const recentMetrics = this.metricsQueue.slice(-20);
        
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            pageLoadTime: this.pageLoadTime,
            metricsQueued: this.metricsQueue.length,
            isEnabled: this.isEnabled,
            recentMetrics: recentMetrics.map(m => ({
                type: m.type,
                timestamp: m.timestamp,
                data: m.data
            }))
        };
    }

    /**
     * Get Core Web Vitals
     */
    getCoreWebVitals() {
        // This would be populated by the performance observers
        return {
            lcp: null, // Largest Contentful Paint
            fid: null, // First Input Delay
            cls: null  // Cumulative Layout Shift
        };
    }

    /**
     * Create performance benchmark
     */
    createBenchmark(name) {
        const startTime = performance.now();
        
        return {
            end: () => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.recordMetric('benchmark', {
                    name: name,
                    duration: duration
                });
                
                return duration;
            }
        };
    }

    /**
     * Monitor long tasks
     */
    monitorLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordMetric('long_task', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            attribution: entry.attribution ? entry.attribution.map(a => ({
                                name: a.name,
                            })) : []
                        });
                    }
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('Long task observer not supported:', error);
            }
        }
    }

    /**
     * Enable/disable performance monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.flushMetrics(true); // Flush remaining metrics
        }
    }

    /**
     * Get performance insights
     */
    getPerformanceInsights() {
        const insights = [];
        
        if (this.pageLoadTime > 3000) {
            insights.push({
                type: 'warning',
                message: 'Page load time is slow',
                value: this.pageLoadTime,
                recommendation: 'Consider optimizing resources and reducing bundle size'
            });
        }
        
        // Add more insights based on collected metrics
        return insights;
    }
}

// Export for use in other modules
window.PerformanceMonitor = PerformanceMonitor;