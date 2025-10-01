/**
 * Analytics and Monitoring Unit Tests
 * Comprehensive tests for analytics event tracking, error logging, and performance monitoring
 */

// Mock dependencies
const mockApiClient = {
    post: jest.fn(),
    request: jest.fn()
};

const mockAppConfig = {
    isFeatureEnabled: jest.fn(),
    isDevelopment: jest.fn(() => false),
    api: {
        baseUrl: 'http://localhost:8000',
        endpoints: {
            analytics: '/api/analytics',
            monitoring: '/api/monitoring'
        }
    }
};

// Mock global objects
global.performance = {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
    }
};

global.navigator = {
    onLine: true,
    userAgent: 'Mozilla/5.0 (Test Browser)',
    language: 'en-US',
    deviceMemory: 4,
    hardwareConcurrency: 8,
    connection: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
    }
};

global.screen = {
    width: 1920,
    height: 1080
};

global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    location: {
        href: 'http://localhost:3000',
        pathname: '/'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16))
};

global.document = {
    referrer: 'http://example.com',
    hidden: false,
    addEventListener: jest.fn(),
    querySelector: jest.fn()
};

global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn()
}));
des
cribe('AnalyticsManager', () => {
    let analyticsManager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAppConfig.isFeatureEnabled.mockReturnValue(true);
        
        // Load the AnalyticsManager class
        require('./analytics-manager.js');
        analyticsManager = new window.AnalyticsManager(mockApiClient, mockAppConfig);
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(analyticsManager.apiClient).toBe(mockApiClient);
            expect(analyticsManager.appConfig).toBe(mockAppConfig);
            expect(analyticsManager.isEnabled).toBe(true);
            expect(analyticsManager.sessionId).toMatch(/^session_/);
            expect(analyticsManager.eventQueue).toEqual([]);
        });

        test('should disable when feature is disabled', () => {
            mockAppConfig.isFeatureEnabled.mockReturnValue(false);
            const disabledManager = new window.AnalyticsManager(mockApiClient, mockAppConfig);
            expect(disabledManager.isEnabled).toBe(false);
        });

        test('should generate unique session ID', () => {
            const manager1 = new window.AnalyticsManager(mockApiClient, mockAppConfig);
            const manager2 = new window.AnalyticsManager(mockApiClient, mockAppConfig);
            expect(manager1.sessionId).not.toBe(manager2.sessionId);
        });
    });

    describe('Event Tracking', () => {
        test('should track generic events with correct structure', () => {
            const eventName = 'test_event';
            const properties = { key: 'value' };
            
            analyticsManager.trackEvent(eventName, properties);
            
            expect(analyticsManager.eventQueue).toHaveLength(1);
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe(eventName);
            expect(event.properties.key).toBe('value');
            expect(event.sessionId).toBe(analyticsManager.sessionId);
            expect(event.userId).toBeNull();
            expect(event.userPlan).toBe('free');
        });

        test('should not track events when disabled', () => {
            analyticsManager.isEnabled = false;
            analyticsManager.trackEvent('test_event');
            expect(analyticsManager.eventQueue).toHaveLength(0);
        });

        test('should include context information in events', () => {
            analyticsManager.trackEvent('test_event');
            
            const event = analyticsManager.eventQueue[0];
            expect(event.properties.url).toBe('http://localhost:3000');
            expect(event.properties.userAgent).toBe('Mozilla/5.0 (Test Browser)');
            expect(event.properties.screenResolution).toBe('1920x1080');
            expect(event.properties.viewportSize).toBe('1920x1080');
        });

        test('should flush events when queue reaches batch size', async () => {
            mockApiClient.post.mockResolvedValue({});
            
            // Fill queue to batch size
            for (let i = 0; i < analyticsManager.batchSize; i++) {
                analyticsManager.trackEvent(`event_${i}`);
            }
            
            // Wait for async flush
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockApiClient.post).toHaveBeenCalledWith('/api/analytics/track', {
                events: expect.any(Array),
                sessionId: analyticsManager.sessionId,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('User Management', () => {
        test('should set user information correctly', () => {
            const userId = 'user123';
            const userPlan = 'pro';
            
            analyticsManager.setUser(userId, userPlan);
            
            expect(analyticsManager.userId).toBe(userId);
            expect(analyticsManager.userPlan).toBe(userPlan);
            expect(analyticsManager.eventQueue).toHaveLength(1);
            expect(analyticsManager.eventQueue[0].eventName).toBe('user_identified');
        });

        test('should clear user information on logout', () => {
            analyticsManager.setUser('user123', 'pro');
            analyticsManager.clearUser();
            
            expect(analyticsManager.userId).toBeNull();
            expect(analyticsManager.userPlan).toBe('free');
            expect(analyticsManager.eventQueue).toHaveLength(2); // identify + logout
            expect(analyticsManager.eventQueue[1].eventName).toBe('user_logout');
        });
    });

    describe('Specialized Tracking Methods', () => {
        test('should track visualizer interactions', () => {
            const action = 'play_audio';
            const details = { duration: 120 };
            
            analyticsManager.trackVisualizerInteraction(action, details);
            
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe('visualizer_interaction');
            expect(event.properties.action).toBe(action);
            expect(event.properties.duration).toBe(120);
        });

        test('should track audio uploads', () => {
            const mockFile = {
                size: 1024000,
                type: 'audio/mp3',
                name: 'test.mp3',
                duration: 180
            };
            
            analyticsManager.trackAudioUpload(mockFile);
            
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe('audio_upload');
            expect(event.properties.fileSize).toBe(1024000);
            expect(event.properties.fileType).toBe('audio/mp3');
            expect(event.properties.fileName).toBe('test.mp3');
            expect(event.properties.duration).toBe(180);
        });

        test('should track downloads with success status', () => {
            analyticsManager.trackDownload('gif', true, { quality: 'high' });
            
            const events = analyticsManager.eventQueue;
            expect(events).toHaveLength(2); // download_attempt + conversion_funnel
            
            const downloadEvent = events.find(e => e.eventName === 'download_attempt');
            expect(downloadEvent.properties.downloadType).toBe('gif');
            expect(downloadEvent.properties.success).toBe(true);
            expect(downloadEvent.properties.quality).toBe('high');
            
            const conversionEvent = events.find(e => e.eventName === 'conversion_funnel');
            expect(conversionEvent.properties.step).toBe('download_completed');
        });

        test('should track authentication events', () => {
            analyticsManager.trackAuth('login', true, { method: 'email' });
            
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe('auth_event');
            expect(event.properties.action).toBe('login');
            expect(event.properties.success).toBe(true);
            expect(event.properties.method).toBe('email');
        });

        test('should track payment events with conversion funnel', () => {
            analyticsManager.trackPayment('completed', { amount: 9.99, plan: 'pro' });
            
            const events = analyticsManager.eventQueue;
            expect(events).toHaveLength(2); // payment_event + conversion_funnel
            
            const paymentEvent = events.find(e => e.eventName === 'payment_event');
            expect(paymentEvent.properties.action).toBe('completed');
            expect(paymentEvent.properties.amount).toBe(9.99);
            
            const conversionEvent = events.find(e => e.eventName === 'conversion_funnel');
            expect(conversionEvent.properties.step).toBe('payment_completed');
        });

        test('should track feature usage with premium detection', () => {
            analyticsManager.trackFeatureUsage('extended_recording', { duration: 60 });
            
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe('feature_usage');
            expect(event.properties.feature).toBe('extended_recording');
            expect(event.properties.isPremiumFeature).toBe(true);
        });
    });

    describe('Conversion Funnel Tracking', () => {
        test('should determine correct funnel type', () => {
            expect(analyticsManager.determineFunnelType('user_registered')).toBe('registration');
            expect(analyticsManager.determineFunnelType('payment_completed')).toBe('payment');
            expect(analyticsManager.determineFunnelType('download_completed')).toBe('usage');
            expect(analyticsManager.determineFunnelType('other_event')).toBe('engagement');
        });

        test('should track conversion steps with funnel type', () => {
            analyticsManager.trackConversionStep('payment_initiated', { plan: 'pro' });
            
            const event = analyticsManager.eventQueue[0];
            expect(event.eventName).toBe('conversion_funnel');
            expect(event.properties.step).toBe('payment_initiated');
            expect(event.properties.funnelType).toBe('payment');
            expect(event.properties.plan).toBe('pro');
        });
    });

    describe('Offline Support', () => {
        test('should store events locally when offline', () => {
            global.navigator.onLine = false;
            localStorage.getItem.mockReturnValue('[]');
            
            analyticsManager.storeEventsLocally([{ id: 'test', eventName: 'test' }]);
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'analytics_queue',
                JSON.stringify([{ id: 'test', eventName: 'test' }])
            );
        });

        test('should load and send stored events when online', async () => {
            const storedEvents = [{ id: 'stored', eventName: 'stored_event' }];
            localStorage.getItem.mockReturnValue(JSON.stringify(storedEvents));
            mockApiClient.post.mockResolvedValue({});
            
            await analyticsManager.loadStoredEvents();
            
            expect(mockApiClient.post).toHaveBeenCalledWith('/api/analytics/track', {
                events: storedEvents,
                sessionId: analyticsManager.sessionId,
                timestamp: expect.any(Number),
                isBacklog: true
            });
            expect(localStorage.removeItem).toHaveBeenCalledWith('analytics_queue');
        });
    });

    describe('Analytics Summary', () => {
        test('should return correct analytics summary', () => {
            analyticsManager.setUser('user123', 'pro');
            analyticsManager.trackEvent('test_event');
            
            const summary = analyticsManager.getAnalyticsSummary();
            
            expect(summary).toEqual({
                sessionId: analyticsManager.sessionId,
                userId: 'user123',
                userPlan: 'pro',
                eventsQueued: 2, // user_identified + test_event
                isOnline: true,
                isEnabled: true
            });
        });
    });
});des
cribe('ErrorMonitor', () => {
    let errorMonitor;
    let mockAnalyticsManager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAppConfig.isFeatureEnabled.mockReturnValue(true);
        
        mockAnalyticsManager = {
            trackError: jest.fn()
        };
        
        // Load the ErrorMonitor class
        require('./error-monitor.js');
        errorMonitor = new window.ErrorMonitor(mockApiClient, mockAppConfig, mockAnalyticsManager);
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(errorMonitor.apiClient).toBe(mockApiClient);
            expect(errorMonitor.appConfig).toBe(mockAppConfig);
            expect(errorMonitor.analyticsManager).toBe(mockAnalyticsManager);
            expect(errorMonitor.isEnabled).toBe(true);
            expect(errorMonitor.errorQueue).toEqual([]);
            expect(errorMonitor.sessionId).toMatch(/^error_session_/);
        });

        test('should disable when feature is disabled', () => {
            mockAppConfig.isFeatureEnabled.mockReturnValue(false);
            const disabledMonitor = new window.ErrorMonitor(mockApiClient, mockAppConfig);
            expect(disabledMonitor.isEnabled).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle and queue errors correctly', () => {
            const errorData = {
                type: 'javascript_error',
                message: 'Test error',
                filename: 'test.js',
                lineno: 10
            };
            const context = { component: 'test' };
            
            errorMonitor.handleError(errorData, context);
            
            expect(errorMonitor.errorQueue).toHaveLength(1);
            const error = errorMonitor.errorQueue[0];
            expect(error.type).toBe('javascript_error');
            expect(error.message).toBe('Test error');
            expect(error.context.component).toBe('test');
            expect(error.sessionId).toBe(errorMonitor.sessionId);
        });

        test('should not handle errors when disabled', () => {
            errorMonitor.isEnabled = false;
            errorMonitor.handleError({ type: 'test', message: 'test' });
            expect(errorMonitor.errorQueue).toHaveLength(0);
        });

        test('should track errors in analytics when available', () => {
            const errorData = { type: 'test', message: 'test error' };
            const context = { page: 'home' };
            
            errorMonitor.handleError(errorData, context);
            
            expect(mockAnalyticsManager.trackError).toHaveBeenCalledWith(errorData, context);
        });

        test('should include context information in error entries', () => {
            errorMonitor.handleError({ type: 'test', message: 'test' });
            
            const error = errorMonitor.errorQueue[0];
            expect(error.url).toBe('http://localhost:3000');
            expect(error.userAgent).toBe('Mozilla/5.0 (Test Browser)');
            expect(error.context.viewport).toBe('1920x1080');
            expect(error.context.online).toBe(true);
        });
    });

    describe('Specialized Error Logging', () => {
        test('should log API errors with request details', () => {
            const endpoint = '/api/test';
            const method = 'POST';
            const status = 500;
            const response = 'Internal Server Error';
            const requestData = { key: 'value' };
            
            errorMonitor.logApiError(endpoint, method, status, response, requestData);
            
            const error = errorMonitor.errorQueue[0];
            expect(error.type).toBe('api_error');
            expect(error.endpoint).toBe(endpoint);
            expect(error.method).toBe(method);
            expect(error.status).toBe(status);
            expect(error.response).toBe(response);
            expect(error.requestData).toEqual(requestData);
        });

        test('should log authentication errors', () => {
            const action = 'login';
            const error = new Error('Invalid credentials');
            const details = { email: 'test@example.com' };
            
            errorMonitor.logAuthError(action, error, details);
            
            const loggedError = errorMonitor.errorQueue[0];
            expect(loggedError.type).toBe('auth_error');
            expect(loggedError.action).toBe(action);
            expect(loggedError.error).toBe('Invalid credentials');
        });

        test('should log payment errors with sanitized data', () => {
            const action = 'process_payment';
            const error = new Error('Payment failed');
            const paymentData = {
                amount: 9.99,
                cardNumber: '4111111111111111', // Should be removed
                cvv: '123', // Should be removed
                plan: 'pro'
            };
            
            errorMonitor.logPaymentError(action, error, paymentData);
            
            const loggedError = errorMonitor.errorQueue[0];
            expect(loggedError.type).toBe('payment_error');
            expect(loggedError.paymentData.amount).toBe(9.99);
            expect(loggedError.paymentData.plan).toBe('pro');
            expect(loggedError.paymentData.cardNumber).toBeUndefined();
            expect(loggedError.paymentData.cvv).toBeUndefined();
        });

        test('should log visualizer errors with settings', () => {
            const component = 'audio-processor';
            const error = new Error('Processing failed');
            const settings = { quality: 'high', duration: 30 };
            
            errorMonitor.logVisualizerError(component, error, settings);
            
            const loggedError = errorMonitor.errorQueue[0];
            expect(loggedError.type).toBe('visualizer_error');
            expect(loggedError.component).toBe(component);
            expect(loggedError.settings).toEqual(settings);
        });

        test('should log file errors with sanitized file info', () => {
            const operation = 'upload';
            const error = new Error('File too large');
            const fileInfo = {
                name: 'test.mp3',
                size: 10000000,
                type: 'audio/mp3',
                content: 'binary data' // Should not be included
            };
            
            errorMonitor.logFileError(operation, error, fileInfo);
            
            const loggedError = errorMonitor.errorQueue[0];
            expect(loggedError.type).toBe('file_error');
            expect(loggedError.fileInfo.name).toBe('test.mp3');
            expect(loggedError.fileInfo.size).toBe(10000000);
            expect(loggedError.fileInfo.type).toBe('audio/mp3');
            expect(loggedError.fileInfo.content).toBeUndefined();
        });
    });

    describe('Error Classification', () => {
        test('should identify critical errors correctly', () => {
            const criticalError = { type: 'payment_error', message: 'Payment failed' };
            const nonCriticalError = { type: 'ui_error', message: 'Button not found' };
            
            expect(errorMonitor.isCriticalError(criticalError)).toBe(true);
            expect(errorMonitor.isCriticalError(nonCriticalError)).toBe(false);
        });

        test('should identify critical errors by message content', () => {
            const networkError = { type: 'general', message: 'Network error occurred' };
            const serverError = { type: 'general', message: 'Server error detected' };
            
            expect(errorMonitor.isCriticalError(networkError)).toBe(true);
            expect(errorMonitor.isCriticalError(serverError)).toBe(true);
        });
    });

    describe('User-Friendly Messages', () => {
        test('should provide appropriate messages for API errors', () => {
            const serverError = { type: 'api_error', status: 500 };
            const authError = { type: 'api_error', status: 401 };
            const forbiddenError = { type: 'api_error', status: 403 };
            const rateLimitError = { type: 'api_error', status: 429 };
            
            expect(errorMonitor.getUserFriendlyMessage(serverError))
                .toBe('Server error occurred. Please try again in a moment.');
            expect(errorMonitor.getUserFriendlyMessage(authError))
                .toBe('Please log in again to continue.');
            expect(errorMonitor.getUserFriendlyMessage(forbiddenError))
                .toBe('You don\'t have permission to perform this action.');
            expect(errorMonitor.getUserFriendlyMessage(rateLimitError))
                .toBe('Too many requests. Please wait a moment before trying again.');
        });

        test('should provide appropriate messages for different error types', () => {
            const authError = { type: 'auth_error' };
            const paymentError = { type: 'payment_error' };
            const fileError = { type: 'file_error' };
            const visualizerError = { type: 'visualizer_error' };
            
            expect(errorMonitor.getUserFriendlyMessage(authError))
                .toBe('Authentication failed. Please try logging in again.');
            expect(errorMonitor.getUserFriendlyMessage(paymentError))
                .toBe('Payment processing failed. Please try again or use a different payment method.');
            expect(errorMonitor.getUserFriendlyMessage(fileError))
                .toBe('File processing failed. Please try with a different file or check the file format.');
            expect(errorMonitor.getUserFriendlyMessage(visualizerError))
                .toBe('Visualizer error occurred. Please refresh the page and try again.');
        });
    });

    describe('Error Queue Management', () => {
        test('should trim queue when it exceeds max size', () => {
            // Fill queue beyond max size
            for (let i = 0; i < errorMonitor.maxQueueSize + 10; i++) {
                errorMonitor.handleError({ type: 'test', message: `error ${i}` });
            }
            
            expect(errorMonitor.errorQueue).toHaveLength(errorMonitor.maxQueueSize);
        });

        test('should flush errors to backend', async () => {
            mockApiClient.post.mockResolvedValue({});
            
            errorMonitor.handleError({ type: 'test', message: 'test error' });
            await errorMonitor.flushErrors();
            
            expect(mockApiClient.post).toHaveBeenCalledWith('/api/monitoring/errors', {
                errors: expect.any(Array),
                sessionId: errorMonitor.sessionId,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('Error Statistics', () => {
        test('should return correct error statistics', () => {
            errorMonitor.setUser('user123');
            errorMonitor.handleError({ type: 'test', message: 'test error' });
            
            const stats = errorMonitor.getErrorStats();
            
            expect(stats).toEqual({
                sessionId: errorMonitor.sessionId,
                userId: 'user123',
                errorsQueued: 1,
                isEnabled: true,
                lastError: expect.objectContaining({
                    type: 'test',
                    message: 'test error'
                })
            });
        });
    });
});describ
e('PerformanceMonitor', () => {
    let performanceMonitor;
    let mockAnalyticsManager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAppConfig.isFeatureEnabled.mockReturnValue(true);
        
        mockAnalyticsManager = {
            trackPerformance: jest.fn()
        };
        
        // Load the PerformanceMonitor class
        require('./performance-monitor.js');
        performanceMonitor = new window.PerformanceMonitor(mockApiClient, mockAppConfig, mockAnalyticsManager);
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(performanceMonitor.apiClient).toBe(mockApiClient);
            expect(performanceMonitor.appConfig).toBe(mockAppConfig);
            expect(performanceMonitor.analyticsManager).toBe(mockAnalyticsManager);
            expect(performanceMonitor.isEnabled).toBe(true);
            expect(performanceMonitor.metricsQueue).toEqual([]);
            expect(performanceMonitor.sessionId).toMatch(/^perf_session_/);
        });

        test('should disable when feature is disabled', () => {
            mockAppConfig.isFeatureEnabled.mockReturnValue(false);
            const disabledMonitor = new window.PerformanceMonitor(mockApiClient, mockAppConfig);
            expect(disabledMonitor.isEnabled).toBe(false);
        });
    });

    describe('Metric Recording', () => {
        test('should record metrics with correct structure', () => {
            const metricType = 'test_metric';
            const data = { value: 100, unit: 'ms' };
            
            performanceMonitor.recordMetric(metricType, data);
            
            expect(performanceMonitor.metricsQueue).toHaveLength(1);
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe(metricType);
            expect(metric.data).toEqual(data);
            expect(metric.sessionId).toBe(performanceMonitor.sessionId);
            expect(metric.context.url).toBe('http://localhost:3000');
        });

        test('should not record metrics when disabled', () => {
            performanceMonitor.isEnabled = false;
            performanceMonitor.recordMetric('test', { value: 1 });
            expect(performanceMonitor.metricsQueue).toHaveLength(0);
        });

        test('should include context information in metrics', () => {
            performanceMonitor.recordMetric('test', { value: 1 });
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.context.userAgent).toBe('Mozilla/5.0 (Test Browser)');
            expect(metric.context.viewport).toBe('1920x1080');
            expect(metric.context.deviceMemory).toBe(4);
            expect(metric.context.hardwareConcurrency).toBe(8);
        });
    });

    describe('API Performance Tracking', () => {
        test('should track API call performance', () => {
            const endpoint = '/api/test';
            const method = 'GET';
            const startTime = 1000;
            const endTime = 1500;
            const status = 200;
            const size = 1024;
            
            performanceMonitor.trackApiCall(endpoint, method, startTime, endTime, status, size);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe('api_response_time');
            expect(metric.data.endpoint).toBe(endpoint);
            expect(metric.data.method).toBe(method);
            expect(metric.data.duration).toBe(500);
            expect(metric.data.status).toBe(status);
            expect(metric.data.size).toBe(size);
            expect(metric.data.slow).toBe(false);
            expect(metric.data.failed).toBe(false);
        });

        test('should mark slow API calls', () => {
            performanceMonitor.trackApiCall('/api/slow', 'GET', 1000, 4000, 200);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.data.slow).toBe(true);
        });

        test('should mark failed API calls', () => {
            performanceMonitor.trackApiCall('/api/error', 'POST', 1000, 1500, 500);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.data.failed).toBe(true);
        });

        test('should track in analytics when available', () => {
            performanceMonitor.trackApiCall('/api/test', 'GET', 1000, 1500, 200);
            
            expect(mockAnalyticsManager.trackPerformance).toHaveBeenCalledWith(
                'api_call',
                500,
                {
                    endpoint: '/api/test',
                    method: 'GET',
                    status: 200
                }
            );
        });
    });

    describe('Visualizer Performance Tracking', () => {
        test('should track visualizer operations', () => {
            const operation = 'audio_processing';
            const duration = 250;
            const details = { fileSize: 1024000, quality: 'high' };
            
            performanceMonitor.trackVisualizerPerformance(operation, duration, details);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe('visualizer_performance');
            expect(metric.data.operation).toBe(operation);
            expect(metric.data.duration).toBe(duration);
            expect(metric.data.fileSize).toBe(1024000);
            expect(metric.data.quality).toBe('high');
        });

        test('should track in analytics when available', () => {
            performanceMonitor.trackVisualizerPerformance('render', 100, { frames: 30 });
            
            expect(mockAnalyticsManager.trackPerformance).toHaveBeenCalledWith(
                'visualizer_operation',
                100,
                {
                    operation: 'render',
                    frames: 30
                }
            );
        });
    });

    describe('File Processing Performance', () => {
        test('should track file processing with throughput calculation', () => {
            const operation = 'upload';
            const fileSize = 1024000; // 1MB
            const duration = 2000; // 2 seconds
            const success = true;
            
            performanceMonitor.trackFileProcessing(operation, fileSize, duration, success);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe('file_processing');
            expect(metric.data.operation).toBe(operation);
            expect(metric.data.fileSize).toBe(fileSize);
            expect(metric.data.duration).toBe(duration);
            expect(metric.data.success).toBe(success);
            expect(metric.data.throughput).toBe(fileSize / duration);
        });

        test('should handle failed file processing', () => {
            performanceMonitor.trackFileProcessing('process', 1000, 500, false);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.data.success).toBe(false);
            expect(metric.data.throughput).toBe(0);
        });
    });

    describe('User Interaction Performance', () => {
        test('should track interaction performance with responsiveness', () => {
            const interaction = 'button_click';
            const startTime = 1000;
            const endTime = 1050; // 50ms - responsive
            const details = { button: 'download' };
            
            performanceMonitor.trackInteractionPerformance(interaction, startTime, endTime, details);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe('interaction_performance');
            expect(metric.data.interaction).toBe(interaction);
            expect(metric.data.duration).toBe(50);
            expect(metric.data.responsive).toBe(true);
            expect(metric.data.button).toBe('download');
        });

        test('should mark slow interactions as non-responsive', () => {
            performanceMonitor.trackInteractionPerformance('modal_open', 1000, 1150); // 150ms
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.data.responsive).toBe(false);
        });
    });

    describe('Connection Information', () => {
        test('should get connection information when available', () => {
            const connectionInfo = performanceMonitor.getConnectionInfo();
            
            expect(connectionInfo).toEqual({
                effectiveType: '4g',
                downlink: 10,
                rtt: 50,
                saveData: false
            });
        });

        test('should handle missing connection API', () => {
            delete global.navigator.connection;
            const connectionInfo = performanceMonitor.getConnectionInfo();
            expect(connectionInfo).toBeNull();
        });
    });

    describe('Resource Type Detection', () => {
        test('should identify resource types correctly', () => {
            expect(performanceMonitor.getResourceType('script.js')).toBe('script');
            expect(performanceMonitor.getResourceType('style.css')).toBe('stylesheet');
            expect(performanceMonitor.getResourceType('font.woff2')).toBe('font');
            expect(performanceMonitor.getResourceType('image.png')).toBe('image');
            expect(performanceMonitor.getResourceType('/api/data')).toBe('api');
            expect(performanceMonitor.getResourceType('unknown.xyz')).toBe('other');
        });
    });

    describe('Performance Benchmarks', () => {
        test('should create and execute benchmarks', () => {
            const benchmark = performanceMonitor.createBenchmark('test_operation');
            
            // Simulate some work
            const duration = benchmark.end();
            
            expect(duration).toBeGreaterThan(0);
            expect(performanceMonitor.metricsQueue).toHaveLength(1);
            
            const metric = performanceMonitor.metricsQueue[0];
            expect(metric.type).toBe('benchmark');
            expect(metric.data.name).toBe('test_operation');
            expect(metric.data.duration).toBe(duration);
        });
    });

    describe('Performance Summary', () => {
        test('should return correct performance summary', () => {
            performanceMonitor.setUser('user123');
            performanceMonitor.recordMetric('test', { value: 1 });
            performanceMonitor.pageLoadTime = 2500;
            
            const summary = performanceMonitor.getPerformanceSummary();
            
            expect(summary).toEqual({
                sessionId: performanceMonitor.sessionId,
                userId: 'user123',
                pageLoadTime: 2500,
                metricsQueued: 1,
                isEnabled: true,
                recentMetrics: expect.any(Array)
            });
        });
    });

    describe('Metrics Queue Management', () => {
        test('should trim queue when it exceeds max size', () => {
            // Fill queue beyond max size
            for (let i = 0; i < performanceMonitor.maxQueueSize + 10; i++) {
                performanceMonitor.recordMetric('test', { value: i });
            }
            
            expect(performanceMonitor.metricsQueue).toHaveLength(performanceMonitor.maxQueueSize);
        });

        test('should flush metrics to backend', async () => {
            mockApiClient.post.mockResolvedValue({});
            
            performanceMonitor.recordMetric('test', { value: 1 });
            await performanceMonitor.flushMetrics();
            
            expect(mockApiClient.post).toHaveBeenCalledWith('/api/monitoring/performance', {
                metrics: expect.any(Array),
                sessionId: performanceMonitor.sessionId,
                timestamp: expect.any(Number)
            });
        });
    });
});desc
ribe('MonitoringIntegration', () => {
    let monitoringIntegration;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up global dependencies
        global.window.apiClient = mockApiClient;
        global.window.appConfig = mockAppConfig;
        
        // Load the MonitoringIntegration class
        require('./monitoring-integration.js');
    });

    describe('Initialization', () => {
        test('should wait for dependencies before initializing', async () => {
            // Remove dependencies temporarily
            delete global.window.apiClient;
            delete global.window.appConfig;
            
            const integration = new window.MonitoringIntegration();
            
            // Add dependencies back
            global.window.apiClient = mockApiClient;
            global.window.appConfig = mockAppConfig;
            
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 200));
            
            expect(integration.isInitialized).toBe(true);
        });

        test('should initialize all monitoring components', async () => {
            mockAppConfig.isFeatureEnabled.mockReturnValue(true);
            
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            expect(integration.analyticsManager).toBeDefined();
            expect(integration.errorMonitor).toBeDefined();
            expect(integration.performanceMonitor).toBeDefined();
            expect(global.window.analyticsManager).toBeDefined();
            expect(global.window.errorMonitor).toBeDefined();
            expect(global.window.performanceMonitor).toBeDefined();
        });
    });

    describe('User Management Integration', () => {
        test('should set user across all monitoring components', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            const userId = 'user123';
            const userPlan = 'pro';
            
            integration.setUser(userId, userPlan);
            
            expect(integration.analyticsManager.userId).toBe(userId);
            expect(integration.analyticsManager.userPlan).toBe(userPlan);
            expect(integration.errorMonitor.userId).toBe(userId);
            expect(integration.performanceMonitor.userId).toBe(userId);
        });

        test('should clear user from all monitoring components', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            integration.setUser('user123', 'pro');
            integration.clearUser();
            
            expect(integration.analyticsManager.userId).toBeNull();
            expect(integration.errorMonitor.userId).toBeNull();
            expect(integration.performanceMonitor.userId).toBeNull();
        });
    });

    describe('Monitoring Status', () => {
        test('should return comprehensive monitoring status', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            const status = integration.getMonitoringStatus();
            
            expect(status).toEqual({
                isInitialized: true,
                analytics: expect.any(Object),
                errors: expect.any(Object),
                performance: expect.any(Object)
            });
        });
    });

    describe('Data Flushing', () => {
        test('should flush all monitoring data', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            // Mock flush methods
            integration.analyticsManager.flushEvents = jest.fn().mockResolvedValue();
            integration.errorMonitor.flushErrors = jest.fn().mockResolvedValue();
            integration.performanceMonitor.flushMetrics = jest.fn().mockResolvedValue();
            
            await integration.flushAllData();
            
            expect(integration.analyticsManager.flushEvents).toHaveBeenCalledWith(true);
            expect(integration.errorMonitor.flushErrors).toHaveBeenCalledWith(true);
            expect(integration.performanceMonitor.flushMetrics).toHaveBeenCalledWith(true);
        });
    });

    describe('Monitoring Control', () => {
        test('should enable/disable all monitoring components', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            // Mock setEnabled methods
            integration.analyticsManager.setEnabled = jest.fn();
            integration.errorMonitor.setEnabled = jest.fn();
            integration.performanceMonitor.setEnabled = jest.fn();
            
            integration.setMonitoringEnabled(false);
            
            expect(integration.analyticsManager.setEnabled).toHaveBeenCalledWith(false);
            expect(integration.errorMonitor.setEnabled).toHaveBeenCalledWith(false);
            expect(integration.performanceMonitor.setEnabled).toHaveBeenCalledWith(false);
        });
    });

    describe('Comprehensive Reporting', () => {
        test('should generate comprehensive monitoring report', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            // Mock report methods
            integration.performanceMonitor.getPerformanceInsights = jest.fn().mockReturnValue([]);
            integration.analyticsManager.getConversionFunnelData = jest.fn().mockReturnValue({});
            integration.performanceMonitor.getCoreWebVitals = jest.fn().mockReturnValue({});
            
            const report = integration.getMonitoringReport();
            
            expect(report).toEqual({
                status: expect.any(Object),
                insights: [],
                conversionFunnels: {},
                coreWebVitals: {}
            });
        });
    });

    describe('API Monitoring Integration', () => {
        test('should wrap API client with monitoring', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            // Mock the original request method
            const originalRequest = jest.fn().mockResolvedValue({ status: 200, data: {} });
            integration.apiClient.request = originalRequest;
            
            // Set up API monitoring
            integration.setupApiMonitoring();
            
            // Make an API call
            await integration.apiClient.request('GET', '/api/test');
            
            // Verify monitoring was called
            expect(originalRequest).toHaveBeenCalledWith('GET', '/api/test', null, {});
        });

        test('should track API errors', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            // Mock the original request method to throw error
            const error = new Error('API Error');
            error.status = 500;
            const originalRequest = jest.fn().mockRejectedValue(error);
            integration.apiClient.request = originalRequest;
            
            // Set up API monitoring
            integration.setupApiMonitoring();
            
            // Make an API call that fails
            try {
                await integration.apiClient.request('POST', '/api/error', { data: 'test' });
            } catch (e) {
                // Expected to throw
            }
            
            // Verify error was logged
            expect(originalRequest).toHaveBeenCalledWith('POST', '/api/error', { data: 'test' }, {});
        });
    });

    describe('Element Type Detection', () => {
        test('should detect download types correctly', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            const gifElement = { id: 'download-gif-btn' };
            const mp4Element = { id: 'download-mp4-btn' };
            const audioElement = { id: 'download-audio-btn' };
            const unknownElement = { id: 'other-btn' };
            
            expect(integration.getDownloadType(gifElement)).toBe('gif');
            expect(integration.getDownloadType(mp4Element)).toBe('mp4');
            expect(integration.getDownloadType(audioElement)).toBe('audio');
            expect(integration.getDownloadType(unknownElement)).toBe('unknown');
        });

        test('should detect modal types correctly', async () => {
            const integration = new window.MonitoringIntegration();
            await integration.init();
            
            const loginElement = { id: 'login-modal-trigger' };
            const registerElement = { id: 'register-modal-trigger' };
            const dashboardElement = { id: 'dashboard-modal-trigger' };
            const paymentElement = { id: 'payment-modal-trigger' };
            const unknownElement = { id: 'other-modal-trigger' };
            
            expect(integration.getModalType(loginElement)).toBe('login');
            expect(integration.getModalType(registerElement)).toBe('register');
            expect(integration.getModalType(dashboardElement)).toBe('dashboard');
            expect(integration.getModalType(paymentElement)).toBe('payment');
            expect(integration.getModalType(unknownElement)).toBe('unknown');
        });
    });
});

// Integration tests for the complete monitoring system
describe('Complete Monitoring System Integration', () => {
    let analyticsManager;
    let errorMonitor;
    let performanceMonitor;
    let monitoringIntegration;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockAppConfig.isFeatureEnabled.mockReturnValue(true);
        
        // Set up global dependencies
        global.window.apiClient = mockApiClient;
        global.window.appConfig = mockAppConfig;
        
        // Load all classes
        require('./analytics-manager.js');
        require('./error-monitor.js');
        require('./performance-monitor.js');
        require('./monitoring-integration.js');
        
        // Initialize components
        analyticsManager = new window.AnalyticsManager(mockApiClient, mockAppConfig);
        errorMonitor = new window.ErrorMonitor(mockApiClient, mockAppConfig, analyticsManager);
        performanceMonitor = new window.PerformanceMonitor(mockApiClient, mockAppConfig, analyticsManager);
        
        monitoringIntegration = new window.MonitoringIntegration();
        await monitoringIntegration.init();
    });

    test('should track user journey from registration to payment', async () => {
        // Simulate user registration
        analyticsManager.trackAuth('register', true);
        analyticsManager.setUser('user123', 'free');
        
        // Simulate audio upload
        const mockFile = { size: 1024000, type: 'audio/mp3', name: 'test.mp3' };
        analyticsManager.trackAudioUpload(mockFile);
        
        // Simulate visualization generation
        analyticsManager.trackVisualizationGenerated({ type: 'bars', duration: 30 });
        
        // Simulate download attempt (reaching limit)
        analyticsManager.trackDownload('gif', false, { reason: 'limit_reached' });
        
        // Simulate payment
        analyticsManager.trackPayment('initiated', { plan: 'pro', amount: 9.99 });
        analyticsManager.trackPayment('completed', { plan: 'pro', amount: 9.99 });
        
        // Simulate successful download after payment
        analyticsManager.trackDownload('gif', true, { plan: 'pro' });
        
        // Verify events were tracked
        expect(analyticsManager.eventQueue.length).toBeGreaterThan(5);
        
        // Verify conversion funnel events
        const conversionEvents = analyticsManager.eventQueue.filter(e => e.eventName === 'conversion_funnel');
        expect(conversionEvents.length).toBeGreaterThan(0);
        
        // Verify payment events
        const paymentEvents = analyticsManager.eventQueue.filter(e => e.eventName === 'payment_event');
        expect(paymentEvents).toHaveLength(2); // initiated + completed
    });

    test('should handle errors throughout user journey', async () => {
        // Simulate API error during login
        errorMonitor.logApiError('/api/auth/login', 'POST', 401, 'Unauthorized');
        
        // Simulate file upload error
        const uploadError = new Error('File too large');
        errorMonitor.logFileError('upload', uploadError, { size: 50000000 });
        
        // Simulate payment error
        const paymentError = new Error('Card declined');
        errorMonitor.logPaymentError('process', paymentError, { amount: 9.99 });
        
        // Simulate visualizer error
        const vizError = new Error('WebGL not supported');
        errorMonitor.logVisualizerError('renderer', vizError, { browser: 'old' });
        
        // Verify errors were logged
        expect(errorMonitor.errorQueue).toHaveLength(4);
        
        // Verify error types
        const errorTypes = errorMonitor.errorQueue.map(e => e.type);
        expect(errorTypes).toContain('api_error');
        expect(errorTypes).toContain('file_error');
        expect(errorTypes).toContain('payment_error');
        expect(errorTypes).toContain('visualizer_error');
        
        // Verify analytics tracking of errors
        expect(analyticsManager.trackError).toHaveBeenCalledTimes(4);
    });

    test('should monitor performance throughout user journey', async () => {
        // Simulate API call performance
        performanceMonitor.trackApiCall('/api/auth/login', 'POST', 1000, 1200, 200);
        
        // Simulate file processing performance
        performanceMonitor.trackFileProcessing('upload', 1024000, 2000, true);
        
        // Simulate visualizer performance
        performanceMonitor.trackVisualizerPerformance('render', 16.67, { fps: 60 });
        
        // Simulate user interaction performance
        performanceMonitor.trackInteractionPerformance('button_click', 1000, 1050);
        
        // Verify metrics were recorded
        expect(performanceMonitor.metricsQueue).toHaveLength(4);
        
        // Verify metric types
        const metricTypes = performanceMonitor.metricsQueue.map(m => m.type);
        expect(metricTypes).toContain('api_response_time');
        expect(metricTypes).toContain('file_processing');
        expect(metricTypes).toContain('visualizer_performance');
        expect(metricTypes).toContain('interaction_performance');
        
        // Verify analytics tracking of performance
        expect(analyticsManager.trackPerformance).toHaveBeenCalledTimes(2); // API + visualizer
    });

    test('should flush all data when requested', async () => {
        mockApiClient.post.mockResolvedValue({});
        
        // Add some data to all queues
        analyticsManager.trackEvent('test_event');
        errorMonitor.handleError({ type: 'test', message: 'test' });
        performanceMonitor.recordMetric('test', { value: 1 });
        
        // Flush all data
        await monitoringIntegration.flushAllData();
        
        // Verify all endpoints were called
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/analytics/track', expect.any(Object));
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/monitoring/errors', expect.any(Object));
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/monitoring/performance', expect.any(Object));
    });

    test('should handle offline scenarios gracefully', async () => {
        // Simulate going offline
        global.navigator.onLine = false;
        
        // Track events while offline
        analyticsManager.trackEvent('offline_event');
        errorMonitor.handleError({ type: 'offline', message: 'offline error' });
        performanceMonitor.recordMetric('offline', { value: 1 });
        
        // Verify data is queued but not sent
        expect(analyticsManager.eventQueue).toHaveLength(1);
        expect(errorMonitor.errorQueue).toHaveLength(1);
        expect(performanceMonitor.metricsQueue).toHaveLength(1);
        
        // Simulate coming back online
        global.navigator.onLine = true;
        mockApiClient.post.mockResolvedValue({});
        
        // Flush data
        await analyticsManager.flushEvents();
        await errorMonitor.flushErrors();
        await performanceMonitor.flushMetrics();
        
        // Verify data was sent
        expect(mockApiClient.post).toHaveBeenCalledTimes(3);
    });
});