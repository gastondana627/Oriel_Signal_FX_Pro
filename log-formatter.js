/**
 * Log Formatting Utilities for Consistent Terminal Output
 * Provides utilities for formatting logs in development and testing environments.
 */

class LogFormatter {
    constructor(config = {}) {
        this.config = {
            showTimestamp: config.showTimestamp !== false,
            showLevel: config.showLevel !== false,
            showRequestId: config.showRequestId !== false,
            colorize: config.colorize !== false,
            maxMessageLength: config.maxMessageLength || 100,
            indentSize: config.indentSize || 2,
            ...config
        };

        // ANSI color codes for terminal output
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            gray: '\x1b[90m'
        };

        // Level-specific formatting
        this.levelConfig = {
            DEBUG: { emoji: '🔍', color: this.colors.gray, label: 'DEBUG' },
            INFO: { emoji: 'ℹ️', color: this.colors.blue, label: 'INFO ' },
            WARN: { emoji: '⚠️', color: this.colors.yellow, label: 'WARN ' },
            ERROR: { emoji: '❌', color: this.colors.red, label: 'ERROR' },
            CRITICAL: { emoji: '🚨', color: this.colors.red + this.colors.bright, label: 'CRIT ' }
        };
    }

    /**
     * Format a log entry for terminal output
     */
    formatLogEntry(logEntry) {
        const parts = [];
        
        // Timestamp
        if (this.config.showTimestamp) {
            const timestamp = this.formatTimestamp(logEntry.timestamp);
            parts.push(this.colorize(timestamp, this.colors.gray));
        }

        // Level with emoji and color
        if (this.config.showLevel) {
            const levelInfo = this.levelConfig[logEntry.level] || this.levelConfig.INFO;
            const levelText = `${levelInfo.emoji} ${levelInfo.label}`;
            parts.push(this.colorize(levelText, levelInfo.color));
        }

        // Request ID
        if (this.config.showRequestId && logEntry.requestId) {
            const requestId = `[${logEntry.requestId}]`;
            parts.push(this.colorize(requestId, this.colors.cyan));
        }

        // Session ID (abbreviated)
        if (logEntry.sessionId) {
            const sessionId = `(${logEntry.sessionId.slice(-8)})`;
            parts.push(this.colorize(sessionId, this.colors.magenta));
        }

        // Main message
        const message = this.formatMessage(logEntry.message);
        parts.push(message);

        return parts.join(' ');
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
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
     * Format message with length limits
     */
    formatMessage(message) {
        if (message.length <= this.config.maxMessageLength) {
            return message;
        }
        
        const truncated = message.substring(0, this.config.maxMessageLength - 3) + '...';
        return truncated;
    }

    /**
     * Apply color to text if colorization is enabled
     */
    colorize(text, color) {
        if (!this.config.colorize) {
            return text;
        }
        return `${color}${text}${this.colors.reset}`;
    }

    /**
     * Format context object for display
     */
    formatContext(context, indent = 0) {
        if (!context || Object.keys(context).length === 0) {
            return '';
        }

        const indentStr = ' '.repeat(indent);
        const lines = [];

        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'object' && value !== null) {
                lines.push(`${indentStr}${this.colorize(key + ':', this.colors.cyan)}`);
                lines.push(this.formatContext(value, indent + this.config.indentSize));
            } else {
                const formattedValue = this.formatValue(value);
                lines.push(`${indentStr}${this.colorize(key + ':', this.colors.cyan)} ${formattedValue}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Format individual values
     */
    formatValue(value) {
        if (typeof value === 'string') {
            return this.colorize(`"${value}"`, this.colors.green);
        } else if (typeof value === 'number') {
            return this.colorize(value.toString(), this.colors.yellow);
        } else if (typeof value === 'boolean') {
            return this.colorize(value.toString(), this.colors.magenta);
        } else if (value === null) {
            return this.colorize('null', this.colors.gray);
        } else if (value === undefined) {
            return this.colorize('undefined', this.colors.gray);
        } else {
            return JSON.stringify(value);
        }
    }

    /**
     * Format error information
     */
    formatError(error) {
        if (!error) return '';

        const lines = [];
        
        // Error name and message
        lines.push(this.colorize(`${error.name}: ${error.message}`, this.colors.red));
        
        // Stack trace (if available and not too long)
        if (error.stack) {
            const stackLines = error.stack.split('\n').slice(1, 6); // First 5 stack frames
            stackLines.forEach(line => {
                lines.push(this.colorize(`  ${line.trim()}`, this.colors.gray));
            });
        }

        return lines.join('\n');
    }

    /**
     * Format API request/response logs
     */
    formatApiLog(logEntry) {
        const { context } = logEntry;
        
        if (context.actionType === 'api_request') {
            return this.formatApiRequest(logEntry);
        } else if (context.actionType === 'api_response') {
            return this.formatApiResponse(logEntry);
        }
        
        return this.formatLogEntry(logEntry);
    }

    /**
     * Format API request log
     */
    formatApiRequest(logEntry) {
        const { context } = logEntry;
        const method = this.colorize(context.method, this.colors.blue);
        const url = this.colorize(context.url, this.colors.cyan);
        
        let formatted = `${method} ${url}`;
        
        if (context.requestData) {
            formatted += `\n  ${this.colorize('Body:', this.colors.gray)} ${context.requestData}`;
        }
        
        return formatted;
    }

    /**
     * Format API response log
     */
    formatApiResponse(logEntry) {
        const { context } = logEntry;
        const status = context.status;
        
        // Color status code based on value
        let statusColor = this.colors.green;
        if (status >= 400 && status < 500) {
            statusColor = this.colors.yellow;
        } else if (status >= 500) {
            statusColor = this.colors.red;
        }
        
        const statusText = this.colorize(status.toString(), statusColor);
        const duration = context.duration ? `${context.duration}ms` : '';
        const durationText = duration ? this.colorize(duration, this.colors.magenta) : '';
        
        let formatted = `${statusText}`;
        if (durationText) {
            formatted += ` (${durationText})`;
        }
        
        return formatted;
    }

    /**
     * Format user action logs
     */
    formatUserAction(logEntry) {
        const { context } = logEntry;
        const action = this.colorize(context.action, this.colors.green);
        const user = context.details?.userId ? 
            this.colorize(`[${context.details.userId}]`, this.colors.cyan) : '';
        
        let formatted = `👤 ${action}`;
        if (user) {
            formatted += ` ${user}`;
        }
        
        if (context.details && Object.keys(context.details).length > 0) {
            formatted += `\n${this.formatContext(context.details, 2)}`;
        }
        
        return formatted;
    }

    /**
     * Format performance metric logs
     */
    formatPerformanceLog(logEntry) {
        const { context } = logEntry;
        const metric = this.colorize(context.metric, this.colors.blue);
        const value = this.colorize(context.value.toString(), this.colors.yellow);
        const unit = context.unit ? this.colorize(context.unit, this.colors.gray) : '';
        
        return `📊 ${metric}: ${value}${unit ? ' ' + unit : ''}`;
    }

    /**
     * Create a formatted log output based on log type
     */
    format(logEntry) {
        const baseFormat = this.formatLogEntry(logEntry);
        
        // Add context-specific formatting
        let contextFormat = '';
        if (logEntry.context) {
            const actionType = logEntry.context.actionType;
            
            switch (actionType) {
                case 'api_request':
                case 'api_response':
                    contextFormat = this.formatApiLog(logEntry);
                    break;
                case 'user_action':
                    contextFormat = this.formatUserAction(logEntry);
                    break;
                case 'performance':
                    contextFormat = this.formatPerformanceLog(logEntry);
                    break;
                default:
                    if (Object.keys(logEntry.context).length > 0) {
                        contextFormat = this.formatContext(logEntry.context, 2);
                    }
            }
        }

        // Add error formatting
        let errorFormat = '';
        if (logEntry.error) {
            errorFormat = this.formatError(logEntry.error);
        }

        // Combine all parts
        const parts = [baseFormat];
        if (contextFormat) {
            parts.push(contextFormat);
        }
        if (errorFormat) {
            parts.push(errorFormat);
        }

        return parts.join('\n');
    }

    /**
     * Create a separator line for log sections
     */
    createSeparator(title = '', length = 80) {
        const char = '─';
        if (!title) {
            return this.colorize(char.repeat(length), this.colors.gray);
        }
        
        const padding = Math.max(0, length - title.length - 4);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        
        const separator = char.repeat(leftPad) + `  ${title}  ` + char.repeat(rightPad);
        return this.colorize(separator, this.colors.gray);
    }

    /**
     * Format a batch of logs with separators
     */
    formatBatch(logs, title = '') {
        const lines = [];
        
        if (title) {
            lines.push(this.createSeparator(title));
        }
        
        logs.forEach((log, index) => {
            lines.push(this.format(log));
            
            // Add spacing between logs
            if (index < logs.length - 1) {
                lines.push('');
            }
        });
        
        if (title) {
            lines.push(this.createSeparator());
        }
        
        return lines.join('\n');
    }
}

// Create global formatter instance
window.logFormatter = new LogFormatter({
    colorize: true,
    showTimestamp: true,
    showLevel: true,
    showRequestId: true
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogFormatter;
}