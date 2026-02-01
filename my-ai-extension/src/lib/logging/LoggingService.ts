// Logging & Debugging Service

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    data?: any;
    stack?: string;
}

export class LoggingService {
    private logs: LogEntry[] = [];
    private maxLogs = 1000;
    private debugMode = false;

    // Enable/disable debug mode
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    // Log debug message
    debug(message: string, data?: any): void {
        if (this.debugMode) {
            this.log('debug', message, data);
        }
    }

    // Log info message
    info(message: string, data?: any): void {
        this.log('info', message, data);
    }

    // Log warning
    warn(message: string, data?: any): void {
        this.log('warn', message, data);
        console.warn(message, data);
    }

    // Log error
    error(message: string, error?: any): void {
        const stack = error?.stack || new Error().stack;
        this.log('error', message, error, stack);
        console.error(message, error);
    }

    // Internal log method
    private log(level: LogLevel, message: string, data?: any, stack?: string): void {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            data,
            stack
        };

        this.logs.push(entry);

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Also log to console in debug mode
        if (this.debugMode) {
            console.log(`[${level.toUpperCase()}]`, message, data);
        }
    }

    // Get all logs
    getLogs(level?: LogLevel): LogEntry[] {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return this.logs;
    }

    // Export logs
    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    // Clear logs
    clear(): void {
        this.logs = [];
    }

    // Get logs summary
    getSummary(): { debug: number; info: number; warn: number; error: number } {
        return {
            debug: this.logs.filter(l => l.level === 'debug').length,
            info: this.logs.filter(l => l.level === 'info').length,
            warn: this.logs.filter(l => l.level === 'warn').length,
            error: this.logs.filter(l => l.level === 'error').length
        };
    }
}

export const loggingService = new LoggingService();
