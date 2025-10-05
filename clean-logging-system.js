/**
 * Clean Logging System with Spam Prevention
 * Provides intelligent log filtering, rate limiting, and clean console output
 */

class CleanLoggingSystem {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'INFO',
            enableSpamFilter: config.enableSpamFilter !== false,
            spamThreshold: config.spamThreshold || 3,
            spamWindow: config.spamWindow || 10000, // 10 seconds
            maxLogBuffer: config.maxLogBuffer || 1000,
            enableConsoleOverride: config.enableConsoleOverride !== false,
            enableGrouping: config.enableGrouping !== false,
            groupWindow: config.groupWindow || 5000, // 5 seconds
            ...config
        };

        // Log levels
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };

        this.currentLevel = this.levels[this.config.level] || this.levels.INFO;

        // Spam prevention
        this.messageHistory = new Map();
        this.spamFilter = new Map();
        this.rateLimiter = new Map();
        
        // Log grouping
        this.logGroups = new Map();
        this.groupTimers = new Map();
        
        // Log buffer for analysis
        this.logBuffer = [];
        
        // Spam patterns
        this.spamPatterns = [
            /Failed to fetch/i,
            /NetworkError/i,
            /ERR_NETWORK/i,
            /ERR_INTERNET_DISCONNECTED/i,
            /Download modal not found/i,
            /Health check failed/i,
            /Preferences sync failed/i,
            /401.*unauthorized/i,
            /CORS.*error/i,
            /Mixed Content/i,
            /Uncaught.*Promise/i
        ];

        // Known spam sources
        this.spamSources = [
            'health-check',
            'download-modal-retry',
            'preferences-sync',
            'token-refresh-loop',
            'cors-preflight'
        ];

        this.init();
    }

    /**
     * Initialize clean logging system
     */
    init() {
        if (this.config.enableConsoleOverride) {
            this.overrideConsoleMethods();
        }
        
        this.setupPeriodicCleanup();
        
        console.log('Clean Logging System initialized with spam prevention');
    }

    /**
     * Override console methods to add spam filtering
     */
    overrideConsoleMethods() {
        // Store original methods
        this.originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug.bind(console)
        };

        // Override console.log
        console.log = (...args) => {
            if (this.shouldLog('INFO', args)) {
                this.processLog('INFO', args, this.originalConsole.log);
            }
        };

        // Override console.info
        console.info = (...args) => {
            if (this.shouldLog('INFO', args)) {
                this.processLog('INFO', args, this.originalConsole.info);
            }
        };

        // Override console.warn
        console.warn = (...args) => {
            if (this.shouldLog('WARN', args)) {
                this.processLog('WARN', args, this.originalConsole.warn);
            }
        };

        // Override console.error
        console.error = (...args) => {
            if (this.shouldLog('ERROR', args)) {
                this.processLog('ERROR', args, this.originalConsole.error);
            }
        };

        // Override console.debug
        console.debug = (...args) => {
            if (this.shouldLog('DEBUG', args)) {
                this.processLog('DEBUG', args, this.originalConsole.debug);
            }
        };
    }

    /**
     * Process log message with filtering and grouping
     */
    processLog(level, args, originalMethod) {
        const message = this.formatMessage(args);
        const logEntry = this.createLogEntry(level, message, args);
        
        // Add to buffer
        this.addToBuffer(logEntry);
        
        // Check for grouping
        if (this.config.enableGrouping && this.shouldGroup(logEntry)) {
            this.addToGroup(logEntry, originalMethod);
        } else {
            // Output directly
            this.outputLog(logEntry, originalMethod);
        }
    }

    /**
     * Check if log should be processed
     */
    shouldLog(level, args) {
        // Check log level
        if (this.levels[level] < this.currentLevel) {
            return false;
        }

        // Check spam filter
        if (this.config.enableSpamFilter && this.isSpamMessage(args)) {
            return false;
        }

        // Check rate limiting
        if (this.isRateLimited(args)) {
            return false;
        }

        return true;
    }

    /**
     * Check if message is spam
     */
    isSpamMessage(args) {
        const message = this.formatMessage(args);
        
        // Check against spam patterns
        for (const pattern of this.spamPatterns) {
            if (pattern.test(message)) {
                this.recordSpamMessage(message, 'pattern');
                return true;
            }
        }

        // Check message frequency
        const messageKey = this.getMessageKey(message);
        const now = Date.now();
        
        if (!this.messageHistory.has(messageKey)) {
            this.messageHistory.set(messageKey, { count: 1, firstSeen: now, lastSeen: now });
            return false;
        }

        const history = this.messageHistory.get(messageKey);
        history.count++;
        history.lastSeen = now;

        // Check if within spam window and above threshold
        if (now - history.firstSeen < this.config.spamWindow && history.count > this.config.spamThreshold) {
            this.recordSpamMessage(message, 'frequency');
            return true;
        }

        // Reset if outside window
        if (now - history.firstSeen > this.config.spamWindow) {
            history.count = 1;
            history.firstSeen = now;
        }

        return false;
    }

    /**
     * Check if message is rate limited
     */
    isRateLimited(args) {
        const message = this.formatMessage(args);
        const messageKey = this.getMessageKey(message);
        const now = Date.now();
        
        if (!this.rateLimiter.has(messageKey)) {
            this.rateLimiter.set(messageKey, { lastLogged: now, count: 1 });
            return false;
        }

        const limiter = this.rateLimiter.get(messageKey);
        
        // Allow one message per second for the same message
        if (now - limiter.lastLogged < 1000) {
            limiter.count++;
            return true;
        }

        limiter.lastLogged = now;
        limiter.count = 1;
        return false;
    }

    /**
     * Record spam message for analysis
     */
    recordSpamMessage(message, reason) {
        const key = this.getMessageKey(message);
        
        if (!this.spamFilter.has(key)) {
            this.spamFilter.set(key, { message: message, count: 0, reason: reason, firstSeen: Date.now() });
        }
        
        this.spamFilter.get(key).count++;
    }

    /**
     * Check if log should be grouped
     */
    shouldGroup(logEntry) {
        // Group similar error messages
        const groupKey = this.getGroupKey(logEntry);
        return groupKey !== null;
    }

    /**
     * Add log to group
     */
    addToGroup(logEntry, originalMethod) {
        const groupKey = this.getGroupKey(logEntry);
        
        if (!this.logGroups.has(groupKey)) {
            this.logGroups.set(groupKey, {
                entries: [],
                count: 0,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }

        const group = this.logGroups.get(groupKey);
        group.entries.push(logEntry);
        group.count++;
        group.lastSeen = Date.now();

        // Clear existing timer
        if (this.groupTimers.has(groupKey)) {
            clearTimeout(this.groupTimers.get(groupKey));
        }

        // Set timer to flush group
        const timer = setTimeout(() => {
            this.flushGroup(groupKey, originalMethod);
        }, this.config.groupWindow);

        this.groupTimers.set(groupKey, timer);
    }

    /**
     * Flush grouped logs
     */
    flushGroup(groupKey, originalMethod) {
        const group = this.logGroups.get(groupKey);
        
        if (!group || group.entries.length === 0) {
            return;
        }

        if (group.count === 1) {
            // Single message, output normally
            this.outputLog(group.entries[0], originalMethod);
        } else {
            // Multiple messages, output as group
            this.outputGroupedLog(group, originalMethod);
        }

        // Clean up
        this.logGroups.delete(groupKey);
        this.groupTimers.delete(groupKey);
    }

    /**
     * Output grouped log
     */
    outputGroupedLog(group, originalMethod) {
        const firstEntry = group.entries[0];
        const duration = group.lastSeen - group.firstSeen;
        
        const groupMessage = `[${group.count}x] ${firstEntry.message} (${duration}ms)`;
        
        originalMethod(
            `%c${this.formatTimestamp()} [${firstEntry.level}] ${groupMessage}`,
            this.getLevelStyle(firstEntry.level)
        );

        // Show details in collapsed group if more than 3 occurrences
        if (group.count > 3) {
            console.groupCollapsed(`Details (${group.count} occurrences)`);
            group.entries.slice(0, 5).forEach(entry => {
                originalMethod(`  ${this.formatTimestamp(entry.timestamp)} ${entry.message}`);
            });
            if (group.count > 5) {
                originalMethod(`  ... and ${group.count - 5} more`);
            }
            console.groupEnd();
        }
    }

    /**
     * Output single log
     */
    outputLog(logEntry, originalMethod) {
        const formattedMessage = `%c${this.formatTimestamp(logEntry.timestamp)} [${logEntry.level}] ${logEntry.message}`;
        const style = this.getLevelStyle(logEntry.level);
        
        originalMethod(formattedMessage, style);
        
        // Add additional context if available
        if (logEntry.context && Object.keys(logEntry.context).length > 0) {
            originalMethod('Context:', logEntry.context);
        }
    }

    /**
     * Create log entry object
     */
    createLogEntry(level, message, args) {
        return {
            id: this.generateLogId(),
            timestamp: Date.now(),
            level: level,
            message: message,
            args: args,
            context: this.extractContext(args),
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
    }

    /**
     * Extract context from log arguments
     */
    extractContext(args) {
        const context = {};
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
                // Merge object properties
                Object.assign(context, arg);
            }
        }
        
        return context;
    }

    /**
     * Format message from arguments
     */
    formatMessage(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            } else if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return '[Object]';
                }
            } else {
                return String(arg);
            }
        }).join(' ');
    }

    /**
     * Get message key for deduplication
     */
    getMessageKey(message) {
        // Normalize message for grouping
        return message
            .replace(/\d+/g, 'N') // Replace numbers with N
            .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
            .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, 'IP') // Replace IP addresses
            .substring(0, 200); // Limit length
    }

    /**
     * Get group key for similar messages
     */
    getGroupKey(logEntry) {
        const message = logEntry.message;
        
        // Group API errors
        if (message.includes('API') || message.includes('fetch') || message.includes('request')) {
            return `api_${logEntry.level}`;
        }
        
        // Group authentication errors
        if (message.includes('auth') || message.includes('token') || message.includes('login')) {
            return `auth_${logEntry.level}`;
        }
        
        // Group network errors
        if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
            return `network_${logEntry.level}`;
        }
        
        // Group UI errors
        if (message.includes('modal') || message.includes('element') || message.includes('DOM')) {
            return `ui_${logEntry.level}`;
        }
        
        return null; // Don't group
    }

    /**
     * Get CSS style for log level
     */
    getLevelStyle(level) {
        const styles = {
            DEBUG: 'color: #888; font-size: 11px;',
            INFO: 'color: #0066cc; font-weight: normal;',
            WARN: 'color: #ff9900; font-weight: bold;',
            ERROR: 'color: #cc0000; font-weight: bold;',
            CRITICAL: 'color: #ff0000; font-weight: bold; background: #ffe6e6;'
        };
        
        return styles[level] || styles.INFO;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp = Date.now()) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    /**
     * Add log to buffer
     */
    addToBuffer(logEntry) {
        this.logBuffer.push(logEntry);
        
        // Trim buffer if too large
        if (this.logBuffer.length > this.config.maxLogBuffer) {
            this.logBuffer = this.logBuffer.slice(-this.config.maxLogBuffer);
        }
    }

    /**
     * Setup periodic cleanup
     */
    setupPeriodicCleanup() {
        // Clean up old entries every minute
        setInterval(() => {
            this.cleanupOldEntries();
        }, 60000);
    }

    /**
     * Clean up old entries
     */
    cleanupOldEntries() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutes
        
        // Clean message history
        for (const [key, history] of this.messageHistory.entries()) {
            if (now - history.lastSeen > maxAge) {
                this.messageHistory.delete(key);
            }
        }
        
        // Clean rate limiter
        for (const [key, limiter] of this.rateLimiter.entries()) {
            if (now - limiter.lastLogged > maxAge) {
                this.rateLimiter.delete(key);
            }
        }
        
        // Clean spam filter
        for (const [key, spam] of this.spamFilter.entries()) {
            if (now - spam.firstSeen > maxAge) {
                this.spamFilter.delete(key);
            }
        }
    }

    /**
     * Generate unique log ID
     */
    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Public API methods
     */
    
    /**
     * Log with specific level
     */
    log(level, message, context = {}) {
        if (this.levels[level] >= this.currentLevel) {
            const args = [message];
            if (Object.keys(context).length > 0) {
                args.push(context);
            }
            
            const logEntry = this.createLogEntry(level, message, args);
            this.addToBuffer(logEntry);
            
            const originalMethod = this.originalConsole[level.toLowerCase()] || this.originalConsole.log;
            this.outputLog(logEntry, originalMethod);
        }
    }

    /**
     * Convenience methods
     */
    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }

    info(message, context = {}) {
        this.log('INFO', message, context);
    }

    warn(message, context = {}) {
        this.log('WARN', message, context);
    }

    error(message, context = {}) {
        this.log('ERROR', message, context);
    }

    critical(message, context = {}) {
        this.log('CRITICAL', message, context);
    }

    /**
     * Get logging statistics
     */
    getStats() {
        return {
            level: this.config.level,
            logBuffer: this.logBuffer.length,
            messageHistory: this.messageHistory.size,
            spamFiltered: this.spamFilter.size,
            activeGroups: this.logGroups.size,
            rateLimited: this.rateLimiter.size
        };
    }

    /**
     * Get spam report
     */
    getSpamReport() {
        const report = [];
        
        for (const [key, spam] of this.spamFilter.entries()) {
            report.push({
                message: spam.message.substring(0, 100),
                count: spam.count,
                reason: spam.reason,
                firstSeen: new Date(spam.firstSeen).toISOString()
            });
        }
        
        return report.sort((a, b) => b.count - a.count);
    }

    /**
     * Clear all filters and history
     */
    reset() {
        this.messageHistory.clear();
        this.spamFilter.clear();
        this.rateLimiter.clear();
        this.logGroups.clear();
        this.logBuffer = [];
        
        // Clear timers
        for (const timer of this.groupTimers.values()) {
            clearTimeout(timer);
        }
        this.groupTimers.clear();
        
        this.info('Clean logging system reset');
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.config.level = level;
            this.currentLevel = this.levels[level];
            this.info(`Log level set to ${level}`);
        }
    }

    /**
     * Enable/disable spam filter
     */
    setSpamFilter(enabled) {
        this.config.enableSpamFilter = enabled;
        this.info(`Spam filter ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Add custom spam pattern
     */
    addSpamPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.spamPatterns.push(pattern);
            this.info('Custom spam pattern added');
        }
    }

    /**
     * Remove spam pattern
     */
    removeSpamPattern(pattern) {
        const index = this.spamPatterns.findIndex(p => p.toString() === pattern.toString());
        if (index !== -1) {
            this.spamPatterns.splice(index, 1);
            this.info('Spam pattern removed');
        }
    }
}

// Initialize global clean logging system
window.cleanLoggingSystem = new CleanLoggingSystem({
    level: window.appConfig?.isDevelopment() ? 'DEBUG' : 'INFO',
    enableSpamFilter: true,
    spamThreshold: 3,
    enableGrouping: true
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CleanLoggingSystem;
}