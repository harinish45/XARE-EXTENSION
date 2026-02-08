const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class Logger {
    constructor() {
        this.logDir = path.join(process.env.APPDATA || process.env.HOME, 'ai-desktop-agent', 'logs');
        this.logger = null;
    }

    async initialize() {
        // Ensure log directory exists
        await fs.ensureDir(this.logDir);

        // Create logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                // Write all logs to combined.log
                new winston.transports.File({
                    filename: path.join(this.logDir, 'combined.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                // Write error logs to error.log
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ]
        });

        // Add console transport in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }

        console.log('Logger initialized:', this.logDir);
    }

    info(message, meta = {}) {
        this.logger?.info(message, meta);
    }

    error(message, meta = {}) {
        this.logger?.error(message, meta);
    }

    warn(message, meta = {}) {
        this.logger?.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger?.debug(message, meta);
    }

    verbose(message, meta = {}) {
        this.logger?.verbose(message, meta);
    }

    // Action logging
    logAction(actionType, params, result) {
        this.info('Action executed', {
            actionType,
            params: this.sanitizeParams(params),
            success: result.success,
            error: result.error,
            duration: result.duration
        });
    }

    // Workflow logging
    logWorkflow(workflowName, steps, result) {
        this.info('Workflow executed', {
            workflowName,
            stepsCount: steps.length,
            status: result.status,
            duration: result.duration,
            error: result.error
        });
    }

    // AI logging
    logAIRequest(provider, model, message, response) {
        this.info('AI request', {
            provider,
            model,
            messageLength: message.length,
            responseLength: response?.text?.length || 0,
            actionsCount: response?.actions?.length || 0
        });
    }

    // Sanitize sensitive parameters
    sanitizeParams(params) {
        const sanitized = { ...params };
        const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'key'];

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    // Get log files
    async getLogFiles() {
        try {
            const files = await fs.readdir(this.logDir);
            return files.filter(f => f.endsWith('.log'));
        } catch (error) {
            return [];
        }
    }

    // Read log file
    async readLogFile(filename) {
        try {
            const filePath = path.join(this.logDir, filename);
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to read log file: ${error.message}`);
        }
    }

    // Clear logs
    async clearLogs() {
        try {
            await fs.emptyDir(this.logDir);
            this.info('Logs cleared');
        } catch (error) {
            this.error('Failed to clear logs', { error: error.message });
        }
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;
