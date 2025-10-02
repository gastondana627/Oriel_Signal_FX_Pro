/**
 * Enhanced Logging System for Oriel Signal FX Pro
 * Provides centralized logging with structured output formats, request/response logging,
 * user action tracking, and consistent terminal output formatting.
 */

class EnhancedLogger {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'INFO',
            environment: config.environment || 'development',
            enableConsole: config.enableConsole !== false,
            enableServer: false, // Temporarily disable server logging to prevent cascade
            serverEndpoint: config.serverEndpoint || '/api/logs',
            maxBufferSize: config.maxBufferSize || 100,
            flushInterval: config.flushInterval || 5000,
            includeStackTrace: config.includeStackTrace !== false,
            ...config
        };

        this.logBuffer = [];
        this.sessionId = this.generateSessionId();
        this.requestCounter = 0;
        this.userContext = {};
        
        // Log levels
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };

        this.currentLevel = this.levels[this.config.level] || this.levels.INFO;

        // Initialize periodic buffer flush
        if (this.config.enableServer) {
            this.startBufferFlush();
        }

        // Initialize request/response interceptors
        this.initializeRequestLogging();
        
        // Log system initialization
        this.info('Enhanced logging system initialized', {
            sessionId: this.sessionId,
            level: this.config.level,
            environment: this.config.environment
        });
    }

    /**
     * Generate unique session ID for tracking user sessions
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set user context for all subsequent logs
     */
    setUserContext(context) {
        this.userContext = { ...this.userContext, ...context };
        this.info('User context updated', { userContext: this.userContext });
    }

    /**
     * Clear user context (e.g., on logout)
     */
    clearUserContext() {
        this.userContext = {};
        this.info('User context cleared');
    }

    /**
     * Create structured log entry
     */
    createLogEntry(level, message, context = {}, error = null) {
        const timestamp = new Date().toISOString();
        const requestId = this.getCurrentRequestId();
        
        const logEntry = {
            timestamp,
            level,
            message,
            sessionId: this.sessionId,
            requestId,
            userContext: this.userContext,
            url: window.location.href,
            userAgent: navigator.userAgent,
            context,
            environment: this.config.environment
        };

        // Add error details if provided
        if (error) {
            logEntry.error = {
                name: error.name,
                message: error.message,
                stack: this.config.includeStackTrace ? error.stack : undefined
            };
        }

        // Add performance timing if available
        if (window.performance && window.performance.now) {
            logEntry.performanceTimestamp = window.performance.now();
        }

        return logEntry;
    }

    /**
     * Get current request ID from context
     */
    getCurrentRequestId() {
        return window.currentRequestId || `req_${++this.requestCounter}`;
    }

    /**
     * Check if log level should be processed
     */
    shouldLog(level) {
        return this.levels[level] >= this.currentLevel;
    }

    /**
     * Format log entry for console output
     */
    formatConsoleOutput(logEntry) {
        const { timestamp, level, message, requestId, context, error } = logEntry;
        const time = new Date(timestamp).toLocaleTimeString();
        
        let emoji = '';
        let color = '';
        
        switch (level) {
            case 'DEBUG':
                emoji = '🔍';
                color = 'color: #888';
                break;
            case 'INFO':
                emoji = 'ℹ️';
                color = 'color: #0066cc';
                break;
            case 'WARN':
                emoji = '⚠️';
                color = 'color: #ff9900';
                break;
            case 'ERROR':
                emoji = '❌';
                color = 'color: #cc0000';
                break;
            case 'CRITICAL':
                emoji = '🚨';
                color = 'color: #ff0000; font-weight: bold';
                break;
        }

        const baseMessage = `%c[${time}] ${emoji} ${level} [${requestId}] ${message}`;
        const args = [baseMessage, color];

        // Add context if present
        if (Object.keys(context).length > 0) {
            args.push('\nContext:', context);
        }

        // Add error if present
        if (error) {
            args.push('\nError:', error);
        }

        return args;
    }

    /**
     * Output log to console
     */
    outputToConsole(logEntry) {
        if (!this.config.enableConsole) return;

        const args = this.formatConsoleOutput(logEntry);
        
        switch (logEntry.level) {
            case 'DEBUG':
            case 'INFO':
                console.log(...args);
                break;
            case 'WARN':
                console.warn(...args);
                break;
            case 'ERROR':
            case 'CRITICAL':
                console.error(...args);
                break;
        }
    }

    /**
     * Add log entry to server buffer
     */
    bufferForServer(logEntry) {
        if (!this.config.enableServer) return;

        this.logBuffer.push(logEntry);
        
        // Flush buffer if it's full
        if (this.logBuffer.length >= this.config.maxBufferSize) {
            this.flushBuffer();
        }
    }

    /**
     * Flush log buffer to server
     */
    async flushBuffer() {
        if (this.logBuffer.length === 0 || !this.config.enableServer) {
            this.logBuffer = []; // Clear buffer even if not sending
            return;
        }

        const logsToSend = [...this.logBuffer];
        this.logBuffer = [];

        try {
            const response = await fetch(this.config.serverEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logs: logsToSend,
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`Server logging failed: ${response.status}`);
            }
        } catch (error) {
            // Fallback to console if server logging fails
            console.warn('Failed to send logs to server:', error);
            console.log('Buffered logs:', logsToSend);
        }
    }

    /**
     * Start periodic buffer flush
     */
    startBufferFlush() {
        setInterval(() => {
            this.flushBuffer();
        }, this.config.flushInterval);

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flushBuffer();
        });
    }

    /**
     * Core logging method
     */
    log(level, message, context = {}, error = null) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.createLogEntry(level, message, context, error);
        
        this.outputToConsole(logEntry);
        this.bufferForServer(logEntry);
    }

    /**
     * Debug level logging
     */
    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }

    /**
     * Info level logging
     */
    info(message, context = {}) {
        this.log('INFO', message, context);
    }

    /**
     * Warning level logging
     */
    warn(message, context = {}, error = null) {
        this.log('WARN', message, context, error);
    }

    /**
     * Error level logging
     */
    error(message, context = {}, error = null) {
        this.log('ERROR', message, context, error);
    }

    /**
     * Critical level logging
     */
    critical(message, context = {}, error = null) {
        this.log('CRITICAL', message, context, error);
    }

    /**
     * Log user actions with context and timestamps
     */
    logUserAction(action, details = {}) {
        this.info(`User Action: ${action}`, {
            actionType: 'user_action',
            action,
            details,
            timestamp: Date.now(),
            page: window.location.pathname,
            referrer: document.referrer
        });
    }

    /**
     * Log API requests
     */
    logApiRequest(method, url, requestData = null) {
        const requestId = `req_${++this.requestCounter}`;
        window.currentRequestId = requestId;
        
        this.info(`API Request: ${method} ${url}`, {
            actionType: 'api_request',
            method,
            url,
            requestId,
            requestData: requestData ? JSON.stringify(requestData) : null,
            timestamp: Date.now()
        });
        
        return requestId;
    }

    /**
     * Log API responses
     */
    logApiResponse(requestId, status, responseData = null, duration = null) {
        const level = status >= 400 ? 'ERROR' : 'INFO';
        
        this.log(level, `API Response: ${status}`, {
            actionType: 'api_response',
            requestId,
            status,
            responseData: responseData ? JSON.stringify(responseData) : null,
            duration,
            timestamp: Date.now()
        });
        
        // Clear current request ID
        if (window.currentRequestId === requestId) {
            window.currentRequestId = null;
        }
    }

    /**
     * Log performance metrics
     */
    logPerformance(metric, value, context = {}) {
        this.info(`Performance: ${metric} = ${value}`, {
            actionType: 'performance',
            metric,
            value,
            ...context
        });
    }

    /**
     * Initialize request/response logging interceptors
     */
    initializeRequestLogging() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url, options = {}] = args;
            const method = options.method || 'GET';
            const startTime = performance.now();
            
            const requestId = this.logApiRequest(method, url, options.body);
            
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - startTime;
                
                // Clone response to read body without consuming it
                const responseClone = response.clone();
                let responseData = null;
                
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        responseData = await responseClone.json();
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
                
                this.logApiResponse(requestId, response.status, responseData, duration);
                return response;
            } catch (error) {
                const duration = performance.now() - startTime;
                this.logApiResponse(requestId, 0, null, duration);
                this.error('Fetch request failed', { requestId, url, method }, error);
                throw error;
            }
        };

        // Intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._loggerMethod = method;
            this._loggerUrl = url;
            this._loggerStartTime = performance.now();
            return originalXHROpen.call(this, method, url, ...args);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
            const requestId = window.enhancedLogger.logApiRequest(this._loggerMethod, this._loggerUrl, data);
            this._loggerRequestId = requestId;
            
            this.addEventListener('loadend', () => {
                const duration = performance.now() - this._loggerStartTime;
                let responseData = null;
                
                try {
                    if (this.responseType === '' || this.responseType === 'text') {
                        responseData = this.responseText;
                    } else if (this.responseType === 'json') {
                        responseData = this.response;
                    }
                } catch (e) {
                    // Ignore response parsing errors
                }
                
                window.enhancedLogger.logApiResponse(requestId, this.status, responseData, duration);
            });
            
            return originalXHRSend.call(this, data);
        };
    }

    /**
     * Get logging statistics
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            bufferSize: this.logBuffer.length,
            requestCounter: this.requestCounter,
            userContext: this.userContext,
            config: this.config
        };
    }
}

// Create global logger instance
window.enhancedLogger = new EnhancedLogger({
    level: window.appConfig?.isDevelopment() ? 'DEBUG' : 'INFO',
    environment: window.appConfig?.isDevelopment() ? 'development' : 'production',
    enableServer: true,
    serverEndpoint: '/api/logs'
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedLogger;
}