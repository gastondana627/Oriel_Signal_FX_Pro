/**
 * Notification Manager for user feedback
 * Handles toast/banner notifications with different types
 */
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.defaultDuration = 5000; // 5 seconds
        this.maxNotifications = 5;
        
        this.init();
    }

    /**
     * Initialize the notification system
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createContainer();
                this.addStyles();
            });
        } else {
            this.createContainer();
            this.addStyles();
        }
    }

    /**
     * Create the notification container
     */
    createContainer() {
        // Ensure document.body exists
        if (!document.body) {
            console.warn('Document body not ready, retrying...');
            setTimeout(() => this.createContainer(), 100);
            return;
        }

        // Remove existing container if it exists
        const existingContainer = document.getElementById('notification-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    /**
     * Add CSS styles for notifications
     */
    addStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            }

            .notification {
                padding: 16px 20px;
                border-radius: 8px;
                color: white;
                font-family: sans-serif;
                font-size: 14px;
                line-height: 1.4;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                position: relative;
                cursor: pointer;
                word-wrap: break-word;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .notification-success {
                background-color: #10b981;
                border-left: 4px solid #059669;
            }

            .notification-error {
                background-color: #ef4444;
                border-left: 4px solid #dc2626;
            }

            .notification-warning {
                background-color: #f59e0b;
                border-left: 4px solid #d97706;
            }

            .notification-info {
                background-color: #3b82f6;
                border-left: 4px solid #2563eb;
            }

            .notification-close {
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.8);
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                color: white;
            }

            .notification-title {
                font-weight: bold;
                margin-bottom: 4px;
            }

            .notification-message {
                margin: 0;
                padding-right: 20px;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background-color: rgba(255, 255, 255, 0.3);
                transition: width linear;
            }

            @media (max-width: 600px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .notification {
                    transform: translateY(-100%);
                }

                .notification.show {
                    transform: translateY(0);
                }

                .notification.hide {
                    transform: translateY(-100%);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show a notification
     */
    show(message, type = 'info', options = {}) {
        const {
            title = null,
            duration = this.defaultDuration,
            persistent = false,
            onClick = null,
            id = null
        } = options;

        // Remove existing notification with same ID if provided
        if (id) {
            this.remove(id);
        }

        // Limit number of notifications
        if (this.notifications.length >= this.maxNotifications) {
            this.remove(this.notifications[0].id);
        }

        const notification = this.createNotification(message, type, {
            title,
            duration,
            persistent,
            onClick,
            id: id || this.generateId()
        });

        this.notifications.push(notification);
        this.container.appendChild(notification.element);

        // Trigger animation
        setTimeout(() => {
            notification.element.classList.add('show');
        }, 10);

        // Auto-remove if not persistent
        if (!persistent && duration > 0) {
            notification.timer = setTimeout(() => {
                this.remove(notification.id);
            }, duration);

            // Add progress bar
            if (duration > 1000) {
                this.addProgressBar(notification, duration);
            }
        }

        return notification.id;
    }

    /**
     * Create notification element
     */
    createNotification(message, type, options) {
        const { title, onClick, id } = options;
        
        const element = document.createElement('div');
        element.className = `notification notification-${type}`;
        element.setAttribute('data-id', id);

        let content = '';
        if (title) {
            content += `<div class="notification-title">${this.escapeHtml(title)}</div>`;
        }
        content += `<div class="notification-message">${this.escapeHtml(message)}</div>`;
        content += `<button class="notification-close" aria-label="Close">&times;</button>`;

        element.innerHTML = content;

        // Add click handlers
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(id);
        });

        if (onClick) {
            element.addEventListener('click', onClick);
            element.style.cursor = 'pointer';
        }

        return {
            id,
            element,
            timer: null
        };
    }

    /**
     * Add progress bar to notification
     */
    addProgressBar(notification, duration) {
        const progressBar = document.createElement('div');
        progressBar.className = 'notification-progress';
        progressBar.style.width = '100%';
        notification.element.appendChild(progressBar);

        // Animate progress bar
        setTimeout(() => {
            progressBar.style.width = '0%';
            progressBar.style.transition = `width ${duration}ms linear`;
        }, 10);
    }

    /**
     * Remove notification by ID
     */
    remove(id) {
        const notificationIndex = this.notifications.findIndex(n => n.id === id);
        if (notificationIndex === -1) return;

        const notification = this.notifications[notificationIndex];
        
        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animate out
        notification.element.classList.remove('show');
        notification.element.classList.add('hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        }, 300);

        // Remove from array
        this.notifications.splice(notificationIndex, 1);
    }

    /**
     * Remove all notifications
     */
    clear() {
        [...this.notifications].forEach(notification => {
            this.remove(notification.id);
        });
    }

    /**
     * Show success notification
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     */
    error(message, options = {}) {
        return this.show(message, 'error', { 
            duration: 8000, // Longer duration for errors
            ...options 
        });
    }

    /**
     * Show warning notification
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Alias for error method (for compatibility)
     */
    showError(message, options = {}) {
        return this.error(message, options);
    }

    /**
     * Alias for success method (for compatibility)
     */
    showSuccess(message, options = {}) {
        return this.success(message, options);
    }

    /**
     * Alias for warning method (for compatibility)
     */
    showWarning(message, options = {}) {
        return this.warning(message, options);
    }

    /**
     * Alias for info method (for compatibility)
     */
    showInfo(message, options = {}) {
        return this.info(message, options);
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update notification content
     */
    update(id, message, type = null) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return false;

        const messageElement = notification.element.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        if (type) {
            // Remove old type class and add new one
            notification.element.className = notification.element.className
                .replace(/notification-\w+/, `notification-${type}`);
        }

        return true;
    }
}

// Create global instance (prevent duplicates)
if (!window.NotificationManager) {
    window.NotificationManager = NotificationManager;
}
if (!window.notifications) {
    window.notifications = new NotificationManager();
}
// Alias for backward compatibility
if (!window.notificationManager) {
    window.notificationManager = window.notifications;
}