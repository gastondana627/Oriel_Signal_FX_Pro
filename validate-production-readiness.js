#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Comprehensive validation and monitoring setup for production deployment
 * Requirements: 6.1, 6.2, 6.3, 9.4
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class ProductionReadinessOrchestrator {
    constructor() {
        this.config = {
            frontend: {
                port: 3000,
                url: 'http://localhost:3000',
                startCommand: 'python -m http.server 3000',
                healthPath: '/'
            },
            backend: {
                port: 8000,
                url: 'http://localhost:8000',
                startCommand: 'python oriel_backend.py',
                healthPath: '/health',
                workingDir: './backend'
            },
            validation: {
                timeout: 300000, // 5 minutes
                retryAttempts: 3,
                retryDelay: 5000
            }
        };
        
        this.processes = {};
        this.validationResults = [];
        this.isRunning = false;
    }

    /**
     * Main orchestration method
     */
    async run() {
        console.log('🚀 Starting Production Readiness Validation Orchestrator\n');
        
        try {
            // Step 1: Environment preparation
            await this.prepareEnvironment();
            
            // Step 2: Start services
            await this.startServices();
            
            // Step 3: Wait for services to be ready
            await this.waitForServices();
            
            // Step 4: Run comprehensive validation
            const validationResults = await this.runValidation();
            
            // Step 5: Start monitoring (if validation passes)
            if (validationResults.success) {
                await this.startMonitoring();
            }
            
            // Step 6: Generate final report
            await this.generateFinalReport(validationResults);
            
            // Step 7: Provide next steps
            this.provideNextSteps(validationResults);
            
        } catch (error) {
            console.error('❌ Orchestration failed:', error);
            await this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Prepare environment for validation
     */
    async prepareEnvironment() {
        console.log('🔧 Preparing environment...');
        
        try {
            // Check Node.js version
            const nodeVersion = process.version;
            console.log(`   Node.js version: ${nodeVersion}`);
            
            // Check Python availability
            try {
                const { stdout } = await execAsync('python --version');
                console.log(`   Python version: ${stdout.trim()}`);
            } catch (error) {
                throw new Error('Python is not available or not in PATH');
            }
            
            // Check required files exist
            const requiredFiles = [
                'production-readiness-validator.js',
                'monitoring-alerting-system.js',
                'deployment-validation-procedures.md',
                'backend/oriel_backend.py'
            ];
            
            for (const file of requiredFiles) {
                try {
                    await fs.access(file);
                    console.log(`   ✅ Found: ${file}`);
                } catch (error) {
                    throw new Error(`Required file missing: ${file}`);
                }
            }
            
            // Create logs directory if it doesn't exist
            try {
                await fs.mkdir('logs', { recursive: true });
                console.log('   ✅ Logs directory ready');
            } catch (error) {
                console.log('   ⚠️  Could not create logs directory:', error.message);
            }
            
            console.log('✅ Environment preparation complete\n');
            
        } catch (error) {
            throw new Error(`Environment preparation failed: ${error.message}`);
        }
    }

    /**
     * Start required services
     */
    async startServices() {
        console.log('🚀 Starting services...');
        
        try {
            // Kill any existing processes on the ports
            await this.killExistingProcesses();
            
            // Start backend service
            console.log('   Starting backend service...');
            await this.startBackendService();
            
            // Start frontend service
            console.log('   Starting frontend service...');
            await this.startFrontendService();
            
            console.log('✅ Services started\n');
            
        } catch (error) {
            throw new Error(`Service startup failed: ${error.message}`);
        }
    }

    /**
     * Kill existing processes on required ports
     */
    async killExistingProcesses() {
        const ports = [this.config.frontend.port, this.config.backend.port];
        
        for (const port of ports) {
            try {
                const { stdout } = await execAsync(`lsof -ti:${port}`);
                if (stdout.trim()) {
                    const pids = stdout.trim().split('\n');
                    for (const pid of pids) {
                        await execAsync(`kill -9 ${pid}`);
                        console.log(`   🔪 Killed process ${pid} on port ${port}`);
                    }
                }
            } catch (error) {
                // No process found on port, which is fine
            }
        }
    }

    /**
     * Start backend service
     */
    async startBackendService() {
        return new Promise((resolve, reject) => {
            const backend = spawn('python', ['oriel_backend.py'], {
                cwd: this.config.backend.workingDir,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });
            
            this.processes.backend = backend;
            
            let output = '';
            backend.stdout.on('data', (data) => {
                output += data.toString();
                console.log(`   [Backend] ${data.toString().trim()}`);
            });
            
            backend.stderr.on('data', (data) => {
                console.log(`   [Backend Error] ${data.toString().trim()}`);
            });
            
            backend.on('error', (error) => {
                reject(new Error(`Backend startup failed: ${error.message}`));
            });
            
            // Wait for startup indication
            setTimeout(() => {
                if (backend.pid) {
                    console.log(`   ✅ Backend service started (PID: ${backend.pid})`);
                    resolve();
                } else {
                    reject(new Error('Backend service failed to start'));
                }
            }, 3000);
        });
    }

    /**
     * Start frontend service
     */
    async startFrontendService() {
        return new Promise((resolve, reject) => {
            const frontend = spawn('python', ['-m', 'http.server', this.config.frontend.port.toString()], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });
            
            this.processes.frontend = frontend;
            
            frontend.stdout.on('data', (data) => {
                console.log(`   [Frontend] ${data.toString().trim()}`);
            });
            
            frontend.stderr.on('data', (data) => {
                console.log(`   [Frontend Error] ${data.toString().trim()}`);
            });
            
            frontend.on('error', (error) => {
                reject(new Error(`Frontend startup failed: ${error.message}`));
            });
            
            // Wait for startup
            setTimeout(() => {
                if (frontend.pid) {
                    console.log(`   ✅ Frontend service started (PID: ${frontend.pid})`);
                    resolve();
                } else {
                    reject(new Error('Frontend service failed to start'));
                }
            }, 2000);
        });
    }

    /**
     * Wait for services to be ready
     */
    async waitForServices() {
        console.log('⏳ Waiting for services to be ready...');
        
        const maxAttempts = 30;
        const delay = 2000;
        
        // Wait for backend
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${this.config.backend.url}${this.config.backend.healthPath}`);
                if (response.ok) {
                    console.log('   ✅ Backend service is ready');
                    break;
                }
            } catch (error) {
                if (i === maxAttempts - 1) {
                    throw new Error('Backend service failed to become ready');
                }
            }
            await this.sleep(delay);
        }
        
        // Wait for frontend
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${this.config.frontend.url}${this.config.frontend.healthPath}`);
                if (response.ok) {
                    console.log('   ✅ Frontend service is ready');
                    break;
                }
            } catch (error) {
                if (i === maxAttempts - 1) {
                    throw new Error('Frontend service failed to become ready');
                }
            }
            await this.sleep(delay);
        }
        
        console.log('✅ All services are ready\n');
    }

    /**
     * Run comprehensive validation
     */
    async runValidation() {
        console.log('🔍 Running comprehensive validation...');
        
        try {
            // Import and run the validator
            const ProductionReadinessValidator = require('./production-readiness-validator.js');
            const validator = new ProductionReadinessValidator();
            
            const results = await validator.validateProductionReadiness();
            
            console.log('\n📊 Validation Summary:');
            console.log(`   Total Tests: ${results.results ? results.results.length : 0}`);
            console.log(`   Critical Issues: ${results.criticalIssues ? results.criticalIssues.length : 0}`);
            console.log(`   Warnings: ${results.warnings ? results.warnings.length : 0}`);
            console.log(`   Production Ready: ${results.success ? '✅ YES' : '❌ NO'}`);
            
            return results;
            
        } catch (error) {
            throw new Error(`Validation failed: ${error.message}`);
        }
    }

    /**
     * Start monitoring system
     */
    async startMonitoring() {
        console.log('📊 Starting monitoring system...');
        
        try {
            const MonitoringAlertingSystem = require('./monitoring-alerting-system.js');
            const monitor = new MonitoringAlertingSystem({
                healthCheckInterval: 30000,
                performanceCheckInterval: 60000,
                resourceCheckInterval: 120000,
                consoleAlerts: true
            });
            
            monitor.startMonitoring();
            this.monitor = monitor;
            
            console.log('✅ Monitoring system started');
            
            // Generate monitoring report every 5 minutes
            this.monitoringInterval = setInterval(() => {
                console.log('\n📊 Monitoring Report:');
                monitor.generateReport();
            }, 300000);
            
        } catch (error) {
            console.log(`⚠️  Monitoring startup failed: ${error.message}`);
        }
    }

    /**
     * Generate final report
     */
    async generateFinalReport(validationResults) {
        console.log('\n📋 Generating final report...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch
                },
                services: {
                    frontend: {
                        url: this.config.frontend.url,
                        pid: this.processes.frontend ? this.processes.frontend.pid : null
                    },
                    backend: {
                        url: this.config.backend.url,
                        pid: this.processes.backend ? this.processes.backend.pid : null
                    }
                },
                validation: validationResults,
                monitoring: this.monitor ? this.monitor.getSystemStatus() : null
            };
            
            // Write report to file
            const reportPath = `logs/production-readiness-report-${new Date().toISOString().split('T')[0]}.json`;
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`✅ Report saved to: ${reportPath}`);
            
            return report;
            
        } catch (error) {
            console.log(`⚠️  Report generation failed: ${error.message}`);
        }
    }

    /**
     * Provide next steps based on validation results
     */
    provideNextSteps(validationResults) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 NEXT STEPS');
        console.log('='.repeat(60));
        
        if (validationResults.success) {
            console.log('\n✅ PRODUCTION READY!');
            console.log('\nRecommended next steps:');
            console.log('1. 🚀 Deploy to production environment');
            console.log('2. 📊 Monitor system performance closely');
            console.log('3. 🔍 Run periodic health checks');
            console.log('4. 📋 Review monitoring alerts regularly');
            console.log('\nTo access the monitoring dashboard:');
            console.log(`   Open: http://localhost:3000/production-readiness-test-runner.html`);
            
        } else {
            console.log('\n🚨 PRODUCTION ISSUES DETECTED!');
            console.log('\nCritical issues that must be resolved:');
            
            validationResults.criticalIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.category}: ${issue.issue}`);
                console.log(`   Details: ${issue.details}`);
            });
            
            console.log('\nRecommended actions:');
            console.log('1. 🔧 Fix all critical issues listed above');
            console.log('2. 🔄 Re-run validation: node validate-production-readiness.js');
            console.log('3. 📖 Review deployment procedures in deployment-validation-procedures.md');
            console.log('4. 🆘 Contact development team if issues persist');
        }
        
        if (validationResults.warnings && validationResults.warnings.length > 0) {
            console.log(`\n⚠️  ${validationResults.warnings.length} warnings detected:`);
            validationResults.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning.category}: ${warning.issue}`);
            });
            console.log('\nWarnings should be addressed but do not block deployment.');
        }
        
        console.log('\n📚 Additional Resources:');
        console.log('   - Deployment Procedures: deployment-validation-procedures.md');
        console.log('   - Monitoring Dashboard: production-readiness-test-runner.html');
        console.log('   - System Logs: logs/ directory');
        
        console.log('\n' + '='.repeat(60));
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        // Stop monitoring
        if (this.monitor) {
            this.monitor.stopMonitoring();
        }
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Kill spawned processes
        Object.entries(this.processes).forEach(([name, process]) => {
            if (process && process.pid) {
                try {
                    process.kill('SIGTERM');
                    console.log(`   🔪 Terminated ${name} process (PID: ${process.pid})`);
                } catch (error) {
                    console.log(`   ⚠️  Failed to terminate ${name} process: ${error.message}`);
                }
            }
        });
        
        console.log('✅ Cleanup complete');
    }

    /**
     * Utility method for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received shutdown signal...');
    if (global.orchestrator) {
        await global.orchestrator.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received termination signal...');
    if (global.orchestrator) {
        await global.orchestrator.cleanup();
    }
    process.exit(0);
});

// Main execution
if (require.main === module) {
    const orchestrator = new ProductionReadinessOrchestrator();
    global.orchestrator = orchestrator;
    
    orchestrator.run().catch(async (error) => {
        console.error('\n❌ Orchestration failed:', error.message);
        await orchestrator.cleanup();
        process.exit(1);
    });
}

module.exports = ProductionReadinessOrchestrator;