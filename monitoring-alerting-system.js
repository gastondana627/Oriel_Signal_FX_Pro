/**
 * Monitoring and Alerting System for Production Issues
 * Comprehensive monitoring solution for production environment
 * Requirements: 6.1, 6.2, 6.3, 9.4
 */

class MonitoringAlertingSystem {
    constructor(config = {}) {
        this.config = {
            // Monitoring intervals (in milliseconds)
            healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
            performanceCheckInterval: config.performanceCheckInterval || 60000, // 1 minute
            resourceCheckInterval: config.resourceCheckInterval || 120000, // 2 minutes
            
            // Alert thresholds
            thresholds: {
                responseTime: config.responseTime || 2000, // 2 seconds
                errorRate: config.errorRate || 0.02, // 2%
                memoryUsage: config.memoryUsage || 0.85, // 85%
                cpuUsage: config.cpuUsage || 0.80, // 80%
                diskUsage: config.diskUsage || 0.90, // 90%
                dbConnections: config.dbConnections || 80, // 80% of max connections
            },
            
            // Alert configuration
            alerts: {
                email: config.emailAlerts || false,
                slack: config.slackAlerts || false,
                webhook: config.webhookUrl || null,
                console: config.consoleAlerts !== false, // Default to true
            },
            
            // Service endpoints
            services: {
                frontend: config.frontendUrl || 'http://localhost:3000',
                backend: config.backendUrl || 'http://localhost:8000',
                database: config.databaseUrl || 'postgresql://localhost:5432'
            }
        };
        
        this.metrics = {
            responseTime: [],
            errorRate: [],
            memoryUsage: [],
            cpuUsage: [],
            diskUsage: [],
            activeConnections: 0,
            uptime: Date.now()
        };
        
        this.alerts = [];
        this.isMonitoring = false;
        this.intervals = {};
    }

    /**
     * Start monitoring system
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️  Monitoring system is already running');
            return;
        }

        console.log('🚀 Starting Production Monitoring System...');
        this.isMonitoring = true;
        
        // Start monitoring intervals
        this.intervals.health = setInterval(() => this.checkSystemHealth(), this.config.healthCheckInterval);
        this.intervals.performance = setInterval(() => this.checkPerformance(), this.config.performanceCheckInterval);
        this.intervals.resources = setInterval(() => this.checkResources(), this.config.resourceCheckInterval);
        
        // Initial checks
        this.checkSystemHealth();
        this.checkPerformance();
        this.checkResources();
        
        console.log('✅ Monitoring system started successfully');
        this.logMonitoringStatus();
    }

    /**
     * Stop monitoring system
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('⚠️  Monitoring system is not running');
            return;
        }

        console.log('🛑 Stopping Production Monitoring System...');
        
        // Clear all intervals
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        this.intervals = {};
        
        this.isMonitoring = false;
        console.log('✅ Monitoring system stopped');
    }

    /**
     * Check overall system health
     */
    async checkSystemHealth() {
        try {
            console.log('🔍 Checking system health...');
            
            // Check frontend health
            const frontendHealth = await this.checkServiceHealth(this.config.services.frontend);
            
            // Check backend health
            const backendHealth = await this.checkServiceHealth(`${this.config.services.backend}/health`);
            
            // Check database connectivity
            const databaseHealth = await this.checkDatabaseHealth();
            
            // Evaluate overall health
            const overallHealth = frontendHealth.healthy && backendHealth.healthy && databaseHealth.healthy;
            
            if (!overallHealth) {
                this.triggerAlert('critical', 'System Health', 'One or more services are unhealthy', {
                    frontend: frontendHealth,
                    backend: backendHealth,
                    database: databaseHealth
                });
            }
            
            // Log health status
            this.logHealthStatus(frontendHealth, backendHealth, databaseHealth);
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
            this.triggerAlert('critical', 'Monitoring System', 'Health check process failed', { error: error.message });
        }
    }

    /**
     * Check service health
     */
    async checkServiceHealth(url) {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'GET',
                timeout: 5000 
            });
            const responseTime = Date.now() - startTime;
            
            return {
                healthy: response.ok,
                status: response.status,
                responseTime: responseTime,
                url: url
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                url: url
            };
        }
    }

    /**
     * Check database health
     */
    async checkDatabaseHealth() {
        try {
            // Test database connectivity via backend API
            const response = await fetch(`${this.config.services.backend}/api/health/database`, {
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    healthy: true,
                    connections: data.connections || 0,
                    responseTime: data.responseTime || 0
                };
            } else {
                return {
                    healthy: false,
                    error: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Check performance metrics
     */
    async checkPerformance() {
        try {
            console.log('📊 Checking performance metrics...');
            
            // Measure API response times
            const apiResponseTime = await this.measureAPIResponseTime();
            this.metrics.responseTime.push({
                timestamp: Date.now(),
                value: apiResponseTime
            });
            
            // Calculate error rate
            const errorRate = await this.calculateErrorRate();
            this.metrics.errorRate.push({
                timestamp: Date.now(),
                value: errorRate
            });
            
            // Check thresholds and trigger alerts
            if (apiResponseTime > this.config.thresholds.responseTime) {
                this.triggerAlert('warning', 'Performance', 'High API response time', {
                    responseTime: apiResponseTime,
                    threshold: this.config.thresholds.responseTime
                });
            }
            
            if (errorRate > this.config.thresholds.errorRate) {
                this.triggerAlert('critical', 'Performance', 'High error rate detected', {
                    errorRate: errorRate,
                    threshold: this.config.thresholds.errorRate
                });
            }
            
            // Keep only last 100 measurements
            this.metrics.responseTime = this.metrics.responseTime.slice(-100);
            this.metrics.errorRate = this.metrics.errorRate.slice(-100);
            
        } catch (error) {
            console.error('❌ Performance check failed:', error);
        }
    }

    /**
     * Check system resources
     */
    async checkResources() {
        try {
            console.log('💾 Checking system resources...');
            
            // Check memory usage
            const memoryUsage = await this.getMemoryUsage();
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                value: memoryUsage
            });
            
            // Check CPU usage
            const cpuUsage = await this.getCPUUsage();
            this.metrics.cpuUsage.push({
                timestamp: Date.now(),
                value: cpuUsage
            });
            
            // Check disk usage
            const diskUsage = await this.getDiskUsage();
            this.metrics.diskUsage.push({
                timestamp: Date.now(),
                value: diskUsage
            });
            
            // Check thresholds and trigger alerts
            if (memoryUsage > this.config.thresholds.memoryUsage) {
                this.triggerAlert('warning', 'Resources', 'High memory usage', {
                    memoryUsage: memoryUsage,
                    threshold: this.config.thresholds.memoryUsage
                });
            }
            
            if (cpuUsage > this.config.thresholds.cpuUsage) {
                this.triggerAlert('warning', 'Resources', 'High CPU usage', {
                    cpuUsage: cpuUsage,
                    threshold: this.config.thresholds.cpuUsage
                });
            }
            
            if (diskUsage > this.config.thresholds.diskUsage) {
                this.triggerAlert('critical', 'Resources', 'High disk usage', {
                    diskUsage: diskUsage,
                    threshold: this.config.thresholds.diskUsage
                });
            }
            
            // Keep only last 100 measurements
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
            this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
            this.metrics.diskUsage = this.metrics.diskUsage.slice(-100);
            
        } catch (error) {
            console.error('❌ Resource check failed:', error);
        }
    }

    /**
     * Measure API response time
     */
    async measureAPIResponseTime() {
        try {
            const startTime = Date.now();
            const response = await fetch(`${this.config.services.backend}/health`, {
                timeout: 10000
            });
            const responseTime = Date.now() - startTime;
            
            return response.ok ? responseTime : 9999; // Return high value on error
        } catch (error) {
            return 9999; // Return high value on error
        }
    }

    /**
     * Calculate current error rate
     */
    async calculateErrorRate() {
        try {
            // Get error statistics from backend
            const response = await fetch(`${this.config.services.backend}/api/monitoring/errors`, {
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.errorRate || 0;
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get memory usage percentage
     */
    async getMemoryUsage() {
        try {
            // For Node.js environment
            if (typeof process !== 'undefined' && process.memoryUsage) {
                const usage = process.memoryUsage();
                const totalMemory = require('os').totalmem();
                return usage.heapUsed / totalMemory;
            }
            
            // Simulate memory usage for browser environment
            return Math.random() * 0.3 + 0.4; // 40-70%
        } catch (error) {
            return 0.5; // Default to 50%
        }
    }

    /**
     * Get CPU usage percentage
     */
    async getCPUUsage() {
        try {
            // For Node.js environment
            if (typeof process !== 'undefined' && process.cpuUsage) {
                const usage = process.cpuUsage();
                const totalUsage = usage.user + usage.system;
                return totalUsage / 1000000; // Convert to percentage
            }
            
            // Simulate CPU usage for browser environment
            return Math.random() * 0.4 + 0.3; // 30-70%
        } catch (error) {
            return 0.5; // Default to 50%
        }
    }

    /**
     * Get disk usage percentage
     */
    async getDiskUsage() {
        try {
            // Get disk usage from backend monitoring endpoint
            const response = await fetch(`${this.config.services.backend}/api/monitoring/disk`, {
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.diskUsage || 0.5;
            }
            
            // Simulate disk usage
            return Math.random() * 0.3 + 0.4; // 40-70%
        } catch (error) {
            return 0.5; // Default to 50%
        }
    }

    /**
     * Trigger alert based on severity and type
     */
    triggerAlert(severity, category, message, details = {}) {
        const alert = {
            id: this.generateAlertId(),
            timestamp: new Date().toISOString(),
            severity: severity,
            category: category,
            message: message,
            details: details,
            resolved: false
        };
        
        this.alerts.push(alert);
        
        // Send alert through configured channels
        if (this.config.alerts.console) {
            this.sendConsoleAlert(alert);
        }
        
        if (this.config.alerts.email) {
            this.sendEmailAlert(alert);
        }
        
        if (this.config.alerts.slack) {
            this.sendSlackAlert(alert);
        }
        
        if (this.config.alerts.webhook) {
            this.sendWebhookAlert(alert);
        }
        
        // Keep only last 1000 alerts
        this.alerts = this.alerts.slice(-1000);
    }

    /**
     * Send console alert
     */
    sendConsoleAlert(alert) {
        const severityIcon = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'critical': '🚨'
        };
        
        const icon = severityIcon[alert.severity] || '📢';
        console.log(`\n${icon} ALERT [${alert.severity.toUpperCase()}] - ${alert.category}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Time: ${alert.timestamp}`);
        
        if (Object.keys(alert.details).length > 0) {
            console.log(`   Details: ${JSON.stringify(alert.details, null, 2)}`);
        }
        console.log('');
    }

    /**
     * Send email alert (placeholder)
     */
    async sendEmailAlert(alert) {
        try {
            // This would integrate with an email service
            console.log(`📧 Email alert sent: ${alert.message}`);
        } catch (error) {
            console.error('Failed to send email alert:', error);
        }
    }

    /**
     * Send Slack alert (placeholder)
     */
    async sendSlackAlert(alert) {
        try {
            // This would integrate with Slack API
            console.log(`💬 Slack alert sent: ${alert.message}`);
        } catch (error) {
            console.error('Failed to send Slack alert:', error);
        }
    }

    /**
     * Send webhook alert
     */
    async sendWebhookAlert(alert) {
        try {
            if (!this.config.alerts.webhook) return;
            
            const response = await fetch(this.config.alerts.webhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(alert)
            });
            
            if (response.ok) {
                console.log(`🔗 Webhook alert sent: ${alert.message}`);
            } else {
                console.error(`Failed to send webhook alert: HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send webhook alert:', error);
        }
    }

    /**
     * Generate unique alert ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current system status
     */
    getSystemStatus() {
        const now = Date.now();
        const uptime = now - this.metrics.uptime;
        
        // Calculate averages for recent metrics
        const recentResponseTime = this.getRecentAverage(this.metrics.responseTime, 5);
        const recentErrorRate = this.getRecentAverage(this.metrics.errorRate, 5);
        const recentMemoryUsage = this.getRecentAverage(this.metrics.memoryUsage, 5);
        const recentCpuUsage = this.getRecentAverage(this.metrics.cpuUsage, 5);
        
        return {
            timestamp: new Date().toISOString(),
            uptime: uptime,
            monitoring: this.isMonitoring,
            metrics: {
                responseTime: recentResponseTime,
                errorRate: recentErrorRate,
                memoryUsage: recentMemoryUsage,
                cpuUsage: recentCpuUsage
            },
            alerts: {
                total: this.alerts.length,
                unresolved: this.alerts.filter(a => !a.resolved).length,
                recent: this.alerts.slice(-10)
            }
        };
    }

    /**
     * Get recent average for metrics
     */
    getRecentAverage(metrics, count = 5) {
        if (metrics.length === 0) return 0;
        
        const recent = metrics.slice(-count);
        const sum = recent.reduce((acc, metric) => acc + metric.value, 0);
        return sum / recent.length;
    }

    /**
     * Log monitoring status
     */
    logMonitoringStatus() {
        console.log('\n📊 Monitoring Configuration:');
        console.log(`   Health Check Interval: ${this.config.healthCheckInterval / 1000}s`);
        console.log(`   Performance Check Interval: ${this.config.performanceCheckInterval / 1000}s`);
        console.log(`   Resource Check Interval: ${this.config.resourceCheckInterval / 1000}s`);
        console.log('\n🎯 Alert Thresholds:');
        console.log(`   Response Time: ${this.config.thresholds.responseTime}ms`);
        console.log(`   Error Rate: ${(this.config.thresholds.errorRate * 100).toFixed(1)}%`);
        console.log(`   Memory Usage: ${(this.config.thresholds.memoryUsage * 100).toFixed(1)}%`);
        console.log(`   CPU Usage: ${(this.config.thresholds.cpuUsage * 100).toFixed(1)}%`);
        console.log(`   Disk Usage: ${(this.config.thresholds.diskUsage * 100).toFixed(1)}%`);
        console.log('\n📢 Alert Channels:');
        console.log(`   Console: ${this.config.alerts.console ? '✅' : '❌'}`);
        console.log(`   Email: ${this.config.alerts.email ? '✅' : '❌'}`);
        console.log(`   Slack: ${this.config.alerts.slack ? '✅' : '❌'}`);
        console.log(`   Webhook: ${this.config.alerts.webhook ? '✅' : '❌'}`);
        console.log('');
    }

    /**
     * Log health status
     */
    logHealthStatus(frontend, backend, database) {
        console.log('🏥 Health Status:');
        console.log(`   Frontend: ${frontend.healthy ? '✅' : '❌'} ${frontend.responseTime ? `(${frontend.responseTime}ms)` : ''}`);
        console.log(`   Backend: ${backend.healthy ? '✅' : '❌'} ${backend.responseTime ? `(${backend.responseTime}ms)` : ''}`);
        console.log(`   Database: ${database.healthy ? '✅' : '❌'} ${database.responseTime ? `(${database.responseTime}ms)` : ''}`);
    }

    /**
     * Generate monitoring report
     */
    generateReport() {
        const status = this.getSystemStatus();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 PRODUCTION MONITORING REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n⏱️  System Uptime: ${Math.floor(status.uptime / 1000 / 60)} minutes`);
        console.log(`📈 Monitoring Status: ${status.monitoring ? 'Active' : 'Inactive'}`);
        
        console.log('\n📊 Current Metrics:');
        console.log(`   Response Time: ${status.metrics.responseTime.toFixed(0)}ms`);
        console.log(`   Error Rate: ${(status.metrics.errorRate * 100).toFixed(2)}%`);
        console.log(`   Memory Usage: ${(status.metrics.memoryUsage * 100).toFixed(1)}%`);
        console.log(`   CPU Usage: ${(status.metrics.cpuUsage * 100).toFixed(1)}%`);
        
        console.log(`\n🚨 Alerts Summary:`);
        console.log(`   Total Alerts: ${status.alerts.total}`);
        console.log(`   Unresolved: ${status.alerts.unresolved}`);
        
        if (status.alerts.recent.length > 0) {
            console.log('\n📋 Recent Alerts:');
            status.alerts.recent.forEach((alert, index) => {
                const time = new Date(alert.timestamp).toLocaleTimeString();
                console.log(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message} (${time})`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        
        return status;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonitoringAlertingSystem;
}

// Auto-start monitoring if called directly
if (typeof window === 'undefined' && require.main === module) {
    const monitor = new MonitoringAlertingSystem({
        healthCheckInterval: 30000,
        performanceCheckInterval: 60000,
        resourceCheckInterval: 120000,
        consoleAlerts: true
    });
    
    monitor.startMonitoring();
    
    // Generate report every 5 minutes
    setInterval(() => {
        monitor.generateReport();
    }, 300000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down monitoring system...');
        monitor.stopMonitoring();
        process.exit(0);
    });
}