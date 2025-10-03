/**
 * Comprehensive Error Recovery System
 * Handles errors gracefully with user-friendly messages and recovery options
 */

class ErrorRecoverySystem {
    constructor() {
        this.supportApiUrl = '/api/support';
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.errorHistory = [];
        
        this.init();
    }
    
    init() {
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledError(event.reason);
            event.preventDefault();
        });
        
        // Global error handler for JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleUnhandledError(event.error);
        });
        
        // Network error detection
        window.addEventListener('online', () => {
            this.handleNetworkRestore();
        });
        
        window.addEventListener('offline', () => {
            this.handleNetworkLoss();
        });
    }
    
    /**
     * Handle API errors with automatic retry and user feedback
     */
    async handleApiError(error, context = {}) {
        const errorInfo = this.analyzeError(error, context);
        this.logError(errorInfo);
        
        // Check if this is a retryable error
        if (errorInfo.retryable && this.shouldRetry(context.endpoint)) {
            return this.attemptRetry(context);
        }
        
        // Show user-friendly error message
        this.showErrorMessage(errorInfo);
        
        return { success: false, error: errorInfo };
    }
    
    /**
     * Analyze error to determine type and appropriate response
     */
    analyzeError(error, context = {}) {
        const errorInfo = {
            type: 'unknown',
            message: 'An unexpected error occurred',
            retryable: false,
            showSupport: false,
            userFriendly: true,
            timestamp: new Date().toISOString(),
            context: context
        };
        
        // Network errors
        if (!navigator.onLine) {
            errorInfo.type = 'network';
            errorInfo.message = 'No internet connection. Please check your network and try again.';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // Fetch/Network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            errorInfo.type = 'network';
            errorInfo.message = 'Network connection issue. Please try again.';
            errorInfo.retryable = true;
            return errorInfo;
        }
        
        // HTTP errors
        if (error.status) {
            switch (error.status) {
                case 400:
                    errorInfo.type = 'validation';
                    errorInfo.message = 'Please check your information and try again.';
                    errorInfo.retryable = false;
                    break;
                case 401:
                    errorInfo.type = 'authentication';
                    errorInfo.message = 'Please log in to continue.';
                    errorInfo.retryable = false;
                    break;
                case 403:
                    errorInfo.type = 'authorization';
                    errorInfo.message = 'You do not have permission to perform this action.';
                    errorInfo.retryable = false;
                    break;
                case 404:
                    errorInfo.type = 'not_found';
                    errorInfo.message = 'The requested resource was not found.';
                    errorInfo.retryable = false;
                    break;
                case 429:
                    errorInfo.type = 'rate_limit';
                    errorInfo.message = 'Too many requests. Please wait a moment and try again.';
                    errorInfo.retryable = true;
                    break;
                case 500:
                    errorInfo.type = 'server';
                    errorInfo.message = 'Server error. Please try again in a few moments.';
                    errorInfo.retryable = true;
                    errorInfo.showSupport = true;
                    break;
                case 502:
                case 503:
                case 504:
                    errorInfo.type = 'service_unavailable';
                    errorInfo.message = 'Service temporarily unavailable. Please try again later.';
                    errorInfo.retryable = true;
                    break;
                default:
                    errorInfo.type = 'http';
                    errorInfo.message = `Request failed with status ${error.status}`;
                    errorInfo.retryable = error.status >= 500;
                    errorInfo.showSupport = error.status >= 500;
            }
        }
        
        // Parse error response for more details
        if (error.response) {
            try {
                const errorData = typeof error.response === 'string' 
                    ? JSON.parse(error.response) 
                    : error.response;
                
                if (errorData.error) {
                    errorInfo.message = errorData.error.message || errorInfo.message;
                    errorInfo.retryable = errorData.error.recoverable || errorInfo.retryable;
                    errorInfo.code = errorData.error.code;
                }
            } catch (e) {
                // Ignore JSON parsing errors
            }
        }
        
        return errorInfo;
    }
    
    /**
     * Check if we should retry the request
     */
    shouldRetry(endpoint) {
        if (!endpoint) return false;
        
        const attempts = this.retryAttempts.get(endpoint) || 0;
        return attempts < this.maxRetries;
    }
    
    /**
     * Attempt to retry the failed request
     */
    async attemptRetry(context) {
        const endpoint = context.endpoint;
        const attempts = this.retryAttempts.get(endpoint) || 0;
        
        if (attempts >= this.maxRetries) {
            return { success: false, error: 'Max retries exceeded' };
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempts) * 1000;
        await this.delay(delay);
        
        this.retryAttempts.set(endpoint, attempts + 1);
        
        try {
            // Show retry notification
            this.showRetryNotification(attempts + 1);
            
            // Retry the request
            if (context.retryFunction) {
                const result = await context.retryFunction();
                
                // Success - reset retry count
                this.retryAttempts.delete(endpoint);
                this.hideRetryNotification();
                
                return { success: true, data: result };
            }
        } catch (error) {
            // Retry failed, will be handled by the calling code
            return this.handleApiError(error, context);
        }
        
        return { success: false, error: 'Retry function not provided' };
    }
    
    /**
     * Show user-friendly error message with appropriate actions
     */
    showErrorMessage(errorInfo) {
        const errorContainer = this.createErrorContainer(errorInfo);
        
        // Remove any existing error messages
        this.clearErrorMessages();
        
        // Add to page
        document.body.appendChild(errorContainer);
        
        // Animate in
        setTimeout(() => {
            errorContainer.classList.add('show');
        }, 100);
        
        // Auto-hide after delay (unless it has action buttons)
        if (!errorInfo.showSupport && !errorInfo.retryable) {
            setTimeout(() => {
                this.removeErrorMessage(errorContainer);
            }, 8000);
        }
    }
    
    /**
     * Create error message container with appropriate actions
     */
    createErrorContainer(errorInfo) {
        const container = document.createElement('div');
        container.className = 'error-recovery-notification';
        container.setAttribute('data-error-type', errorInfo.type);
        
        const content = document.createElement('div');
        content.className = 'error-content';
        
        // Error icon
        const icon = document.createElement('div');
        icon.className = 'error-icon';
        icon.innerHTML = this.getErrorIcon(errorInfo.type);
        
        // Error message
        const message = document.createElement('div');
        message.className = 'error-message';
        message.innerHTML = `
            <strong>${this.getErrorTitle(errorInfo.type)}</strong>
            <p>${errorInfo.message}</p>
        `;
        
        content.appendChild(icon);
        content.appendChild(message);
        
        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'error-actions';
        
        if (errorInfo.retryable && errorInfo.context.retryFunction) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-primary btn-sm';
            retryBtn.textContent = 'Try Again';
            retryBtn.onclick = () => {
                this.removeErrorMessage(container);
                errorInfo.context.retryFunction();
            };
            actions.appendChild(retryBtn);
        }
        
        if (errorInfo.showSupport) {
            const supportBtn = document.createElement('button');
            supportBtn.className = 'btn btn-outline-secondary btn-sm';
            supportBtn.textContent = 'Get Help';
            supportBtn.onclick = () => this.showSupportOptions(errorInfo);
            actions.appendChild(supportBtn);
        }
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'error-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.removeErrorMessage(container);
        
        container.appendChild(content);
        if (actions.children.length > 0) {
            container.appendChild(actions);
        }
        container.appendChild(closeBtn);
        
        return container;
    }
    
    /**
     * Get appropriate icon for error type
     */
    getErrorIcon(type) {
        const icons = {
            network: '📡',
            validation: '⚠️',
            authentication: '🔐',
            authorization: '🚫',
            not_found: '🔍',
            rate_limit: '⏱️',
            server: '🔧',
            service_unavailable: '🚧',
            unknown: '❌'
        };
        
        return icons[type] || icons.unknown;
    }
    
    /**
     * Get appropriate title for error type
     */
    getErrorTitle(type) {
        const titles = {
            network: 'Connection Issue',
            validation: 'Invalid Input',
            authentication: 'Authentication Required',
            authorization: 'Access Denied',
            not_found: 'Not Found',
            rate_limit: 'Rate Limited',
            server: 'Server Error',
            service_unavailable: 'Service Unavailable',
            unknown: 'Error'
        };
        
        return titles[type] || titles.unknown;
    }
    
    /**
     * Show support options modal
     */
    showSupportOptions(errorInfo) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay support-options-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Get Help</h3>
                    <button class="modal-close" onclick="this.closest('.support-options-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="support-options">
                        <div class="support-option">
                            <h4>📧 Email Support</h4>
                            <p>Send us details about this error and we'll help you resolve it.</p>
                            <button class="btn btn-primary" onclick="errorRecoverySystem.createSupportTicket('${errorInfo.type}', '${errorInfo.message}', ${JSON.stringify(errorInfo.context).replace(/"/g, '&quot;')})">
                                Create Support Ticket
                            </button>
                        </div>
                        
                        <div class="support-option">
                            <h4>💬 Quick Solutions</h4>
                            <div class="quick-solutions">
                                ${this.getQuickSolutions(errorInfo.type)}
                            </div>
                        </div>
                        
                        <div class="support-option">
                            <h4>🔄 Troubleshooting</h4>
                            <ul class="troubleshooting-steps">
                                <li>Refresh the page and try again</li>
                                <li>Clear your browser cache and cookies</li>
                                <li>Try using a different browser or incognito mode</li>
                                <li>Check your internet connection</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Get quick solutions for specific error types
     */
    getQuickSolutions(type) {
        const solutions = {
            network: `
                <p>• Check your internet connection</p>
                <p>• Try refreshing the page</p>
                <p>• Disable VPN if you're using one</p>
            `,
            validation: `
                <p>• Double-check all required fields</p>
                <p>• Ensure email addresses are valid</p>
                <p>• Check file size and format requirements</p>
            `,
            authentication: `
                <p>• Try logging out and logging back in</p>
                <p>• Clear browser cookies and cache</p>
                <p>• Reset your password if needed</p>
            `,
            server: `
                <p>• Wait a few minutes and try again</p>
                <p>• The issue is likely temporary</p>
                <p>• Contact support if it persists</p>
            `
        };
        
        return solutions[type] || '<p>• Try refreshing the page</p><p>• Contact support if the issue persists</p>';
    }
    
    /**
     * Create support ticket for the error
     */
    async createSupportTicket(errorType, errorMessage, context) {
        try {
            const email = prompt('Please enter your email address:');
            if (!email) return;
            
            const description = `
I encountered an error while using the application:

Error Type: ${errorType}
Error Message: ${errorMessage}
Timestamp: ${new Date().toISOString()}
Page URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Additional Context:
${JSON.stringify(context, null, 2)}

Please help me resolve this issue.
            `.trim();
            
            const response = await fetch('/api/support/ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    subject: `Error Report: ${errorType}`,
                    description: description,
                    category: 'technical',
                    error_details: {
                        type: errorType,
                        message: errorMessage,
                        context: context
                    },
                    browser_info: {
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('Support ticket created successfully! You will receive a confirmation email shortly.');
                // Close support modal
                document.querySelector('.support-options-modal')?.remove();
            } else {
                throw new Error(result.error || 'Failed to create support ticket');
            }
            
        } catch (error) {
            console.error('Error creating support ticket:', error);
            this.showErrorMessage({
                type: 'server',
                message: 'Failed to create support ticket. Please email us directly at support@orielfx.com',
                retryable: false,
                showSupport: false
            });
        }
    }
    
    /**
     * Show success message
     */
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <span class="success-message">${message}</span>
            </div>
            <button class="success-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.classList.add('fade-out');
                setTimeout(() => successDiv.remove(), 300);
            }
        }, 5000);
    }
    
    /**
     * Show retry notification
     */
    showRetryNotification(attempt) {
        let notification = document.querySelector('.retry-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'retry-notification';
            document.body.appendChild(notification);
        }
        
        notification.innerHTML = `
            <div class="retry-content">
                <span class="retry-spinner"></span>
                <span>Retrying... (Attempt ${attempt})</span>
            </div>
        `;
        
        notification.classList.add('show');
    }
    
    /**
     * Hide retry notification
     */
    hideRetryNotification() {
        const notification = document.querySelector('.retry-notification');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }
    
    /**
     * Handle network restoration
     */
    handleNetworkRestore() {
        this.showSuccessMessage('Internet connection restored!');
        
        // Clear network-related retry counts
        for (const [endpoint, attempts] of this.retryAttempts.entries()) {
            this.retryAttempts.delete(endpoint);
        }
    }
    
    /**
     * Handle network loss
     */
    handleNetworkLoss() {
        this.showErrorMessage({
            type: 'network',
            message: 'Internet connection lost. Please check your network connection.',
            retryable: false,
            showSupport: false
        });
    }
    
    /**
     * Handle unhandled errors
     */
    handleUnhandledError(error) {
        console.error('Unhandled error:', error);
        
        // Don't show UI for every unhandled error, just log it
        this.logError({
            type: 'unhandled',
            message: error.message || 'Unhandled error occurred',
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Log error for debugging and analytics
     */
    logError(errorInfo) {
        this.errorHistory.push(errorInfo);
        
        // Keep only last 50 errors
        if (this.errorHistory.length > 50) {
            this.errorHistory.shift();
        }
        
        // Send to analytics/logging service if available
        if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('Error Occurred', {
                errorType: errorInfo.type,
                errorMessage: errorInfo.message,
                retryable: errorInfo.retryable,
                context: errorInfo.context
            });
        }
    }
    
    /**
     * Clear all error messages
     */
    clearErrorMessages() {
        const errors = document.querySelectorAll('.error-recovery-notification');
        errors.forEach(error => error.remove());
    }
    
    /**
     * Remove specific error message
     */
    removeErrorMessage(container) {
        container.classList.add('fade-out');
        setTimeout(() => {
            if (container.parentElement) {
                container.remove();
            }
        }, 300);
    }
    
    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get error history for debugging
     */
    getErrorHistory() {
        return this.errorHistory;
    }
    
    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.retryAttempts.clear();
    }
}

// Initialize global error recovery system
const errorRecoverySystem = new ErrorRecoverySystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecoverySystem;
}