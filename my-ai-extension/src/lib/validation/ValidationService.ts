// ============================================================================
// Comprehensive Validation Service
// Enhanced with advanced validation patterns, robust error handling,
// comprehensive logging, and metrics tracking
// ============================================================================

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    error?: string;
    errors?: string[];
    warnings?: string[];
    data?: any;
}

export interface ValidationRule {
    required?: boolean;
    type?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
    custom?: (value: any) => ValidationResult | boolean;
}

export interface ValidationSchema {
    [key: string]: ValidationRule;
}

export interface SecurityThreat {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
}

export interface SecurityScanResult {
    safe: boolean;
    threats: SecurityThreat[];
    sanitized?: string;
}

export interface ValidationMetrics {
    validationCount: number;
    errorCount: number;
    warningCount: number;
    securityScanCount: number;
    threatCount: number;
    lastValidationTime: number;
}

export const ValidationErrorType = {
    INVALID_INPUT: 'INVALID_INPUT',
    INVALID_FORMAT: 'INVALID_FORMAT',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    SECURITY_THREAT: 'SECURITY_THREAT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ValidationErrorTypeValue = keyof typeof ValidationErrorType;

export class ValidationError extends Error {
    type: ValidationErrorTypeValue;
    field?: string;

    constructor(type: ValidationErrorTypeValue, message: string, field?: string) {
        super(message);
        this.name = 'ValidationError';
        this.type = type;
        this.field = field;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class ValidationLogger {
    private static instance: ValidationLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): ValidationLogger {
        if (!ValidationLogger.instance) {
            ValidationLogger.instance = new ValidationLogger();
        }
        return ValidationLogger.instance;
    }

    private log(level: string, message: string, data?: unknown): void {
        const entry = {
            timestamp: Date.now(),
            level,
            message,
            data,
        };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        console.log(`[Validation] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
    }

    info(message: string, data?: unknown): void {
        this.log('INFO', message, data);
    }

    warn(message: string, data?: unknown): void {
        this.log('WARN', message, data);
    }

    error(message: string, data?: unknown): void {
        this.log('ERROR', message, data);
    }

    debug(message: string, data?: unknown): void {
        this.log('DEBUG', message, data);
    }

    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }
}

// ============================================================================
// Main Service Class
// ============================================================================

export class ValidationService {
    private metrics: ValidationMetrics = {
        validationCount: 0,
        errorCount: 0,
        warningCount: 0,
        securityScanCount: 0,
        threatCount: 0,
        lastValidationTime: 0,
    };
    private apiKeyPatterns: Record<string, RegExp>;

    constructor() {
        this.apiKeyPatterns = {
            openai: /^sk-[A-Za-z0-9]{48}$/,
            anthropic: /^sk-ant-[A-Za-z0-9-]{95}$/,
            gemini: /^[A-Za-z0-9_-]{39}$/,
            perplexity: /^pplx-[A-Za-z0-9]{40}$/,
            azure: /^[A-Za-z0-9]{32}$/,
            deepseek: /^sk-[A-Za-z0-9]{48}$/,
            ollama: /^[A-Za-z0-9_-]{20,}$/,
            openrouter: /^sk-or-[A-Za-z0-9]{48}$/,
        };
        ValidationLogger.getInstance().info('ValidationService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Validate API key format
     */
    validateApiKey(provider: string, key: string): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating API key', { requestId, provider });

            // Check if key is empty
            if (!key || key.trim().length === 0) {
                this.metrics.errorCount++;
                return { valid: false, error: 'API key cannot be empty' };
            }

            // Check if provider is supported
            const pattern = this.apiKeyPatterns[provider.toLowerCase()];
            if (!pattern) {
                ValidationLogger.getInstance().warn('Unknown provider, skipping format validation', { requestId, provider });
                return { valid: true, warnings: ['Unknown provider, format validation skipped'] };
            }

            // Validate format
            if (!pattern.test(key)) {
                this.metrics.errorCount++;
                return { valid: false, error: `Invalid ${provider} API key format` };
            }

            ValidationLogger.getInstance().info('API key validation passed', { requestId, provider });
            return { valid: true };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ValidationLogger.getInstance().error('API key validation failed', { requestId, provider, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Sanitize user input
     */
    sanitizeInput(input: string, options?: { removeScripts?: boolean; removeIframes?: boolean; removeEvents?: boolean }): string {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().debug('Sanitizing input', { requestId, inputLength: input.length });

            const opts = {
                removeScripts: true,
                removeIframes: true,
                removeEvents: true,
                ...options,
            };

            let sanitized = input;

            // Remove scripts
            if (opts.removeScripts) {
                sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }

            // Remove iframes
            if (opts.removeIframes) {
                sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
            }

            // Remove javascript: and event handlers
            if (opts.removeEvents) {
                sanitized = sanitized
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }

            // Remove other potentially dangerous patterns
            sanitized = sanitized
                .replace(/<[^>]*>/g, '') // Remove all HTML tags
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/&/g, '&')
                .trim();

            ValidationLogger.getInstance().debug('Input sanitized', { requestId, originalLength: input.length, sanitizedLength: sanitized.length });

            return sanitized;
        } catch (error) {
            ValidationLogger.getInstance().error('Input sanitization failed', { requestId, error });
            return input; // Return original on error
        }
    }

    /**
     * Validate URL
     */
    validateUrl(url: string, options?: { allowedProtocols?: string[]; requireHttps?: boolean }): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating URL', { requestId, url });

            const opts = {
                allowedProtocols: ['http:', 'https:'],
                requireHttps: false,
                ...options,
            };

            const parsed = new URL(url);

            // Check protocol
            if (!opts.allowedProtocols.includes(parsed.protocol)) {
                this.metrics.errorCount++;
                return { valid: false, error: `URL must use one of these protocols: ${opts.allowedProtocols.join(', ')}` };
            }

            // Check HTTPS requirement
            if (opts.requireHttps && parsed.protocol !== 'https:') {
                this.metrics.errorCount++;
                return { valid: false, error: 'URL must use HTTPS protocol' };
            }

            ValidationLogger.getInstance().info('URL validation passed', { requestId, url });
            return { valid: true };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Invalid URL format';
            ValidationLogger.getInstance().error('URL validation failed', { requestId, url, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Validate JSON
     */
    validateJSON(json: string, options?: { maxDepth?: number; maxKeys?: number }): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating JSON', { requestId, jsonLength: json.length });

            const opts = {
                maxDepth: 10,
                maxKeys: 1000,
                ...options,
            };

            const data = JSON.parse(json);

            // Validate depth
            const depth = this.getObjectDepth(data);
            if (depth > opts.maxDepth) {
                this.metrics.errorCount++;
                return { valid: false, error: `JSON depth exceeds maximum of ${opts.maxDepth}` };
            }

            // Validate key count
            const keyCount = this.getObjectKeyCount(data);
            if (keyCount > opts.maxKeys) {
                this.metrics.errorCount++;
                return { valid: false, error: `JSON key count exceeds maximum of ${opts.maxKeys}` };
            }

            ValidationLogger.getInstance().info('JSON validation passed', { requestId, depth, keyCount });
            return { valid: true, data };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
            ValidationLogger.getInstance().error('JSON validation failed', { requestId, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Validate email
     */
    validateEmail(email: string, options?: { requireTLD?: boolean; maxLength?: number }): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating email', { requestId, email });

            const opts = {
                requireTLD: true,
                maxLength: 254,
                ...options,
            };

            // Check length
            if (email.length > opts.maxLength) {
                this.metrics.errorCount++;
                return { valid: false, error: `Email exceeds maximum length of ${opts.maxLength}` };
            }

            // Basic email pattern
            const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!pattern.test(email)) {
                this.metrics.errorCount++;
                return { valid: false, error: 'Invalid email format' };
            }

            // Check for TLD if required
            if (opts.requireTLD) {
                const parts = email.split('@');
                const domain = parts[1];
                if (!domain || !domain.includes('.')) {
                    this.metrics.errorCount++;
                    return { valid: false, error: 'Email must have a valid domain with TLD' };
                }
            }

            ValidationLogger.getInstance().info('Email validation passed', { requestId, email });
            return { valid: true };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ValidationLogger.getInstance().error('Email validation failed', { requestId, email, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Validate file size
     */
    validateFileSize(sizeBytes: number, maxMB: number = 10): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating file size', { requestId, sizeBytes, maxMB });

            const maxBytes = maxMB * 1024 * 1024;
            if (sizeBytes > maxBytes) {
                this.metrics.errorCount++;
                return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
            }

            ValidationLogger.getInstance().info('File size validation passed', { requestId, sizeBytes });
            return { valid: true };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ValidationLogger.getInstance().error('File size validation failed', { requestId, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Validate file type
     */
    validateFileType(filename: string, allowedTypes: string[]): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating file type', { requestId, filename, allowedTypes });

            const ext = filename.split('.').pop()?.toLowerCase();
            if (!ext) {
                this.metrics.errorCount++;
                return { valid: false, error: 'File has no extension' };
            }

            if (!allowedTypes.includes(ext)) {
                this.metrics.errorCount++;
                return { valid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` };
            }

            ValidationLogger.getInstance().info('File type validation passed', { requestId, ext });
            return { valid: true };
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ValidationLogger.getInstance().error('File type validation failed', { requestId, filename, error: errorMessage });
            return { valid: false, error: errorMessage };
        }
    }

    /**
     * Validate schema
     */
    validateSchema(data: any, schema: ValidationSchema): ValidationResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Validating schema', { requestId, schemaKeys: Object.keys(schema) });

            const errors: string[] = [];
            const warnings: string[] = [];

            Object.entries(schema).forEach(([key, rules]: [string, ValidationRule]) => {
                const value = data[key];

                // Required check
                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`${key} is required`);
                    return;
                }

                if (value === undefined || value === null || value === '') return;

                // Type check
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`${key} must be of type ${rules.type}`);
                }

                // Min/max for numbers
                if (typeof value === 'number') {
                    if (rules.min !== undefined && value < rules.min) {
                        errors.push(`${key} must be at least ${rules.min}`);
                    }
                    if (rules.max !== undefined && value > rules.max) {
                        errors.push(`${key} must be at most ${rules.max}`);
                    }
                }

                // Length for strings
                if (typeof value === 'string') {
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`${key} must be at least ${rules.minLength} characters`);
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`${key} must be at most ${rules.maxLength} characters`);
                    }
                }

                // Pattern for strings
                if (rules.pattern && typeof value === 'string') {
                    if (!new RegExp(rules.pattern).test(value)) {
                        errors.push(`${key} does not match required pattern`);
                    }
                }

                // Enum check
                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
                }

                // Custom validation
                if (rules.custom) {
                    const customResult = rules.custom(value);
                    if (customResult === false) {
                        errors.push(`${key} failed custom validation`);
                    } else if (typeof customResult === 'object' && !customResult.valid) {
                        errors.push(...(customResult.errors || [`${key} failed custom validation`]));
                        warnings.push(...(customResult.warnings || []));
                    }
                }
            });

            // Update metrics
            this.metrics.validationCount++;
            this.metrics.errorCount += errors.length;
            this.metrics.warningCount += warnings.length;
            this.metrics.lastValidationTime = Date.now();

            const result: ValidationResult = {
                valid: errors.length === 0,
            };

            if (errors.length > 0) {
                result.errors = errors;
            }

            if (warnings.length > 0) {
                result.warnings = warnings;
            }

            ValidationLogger.getInstance().info('Schema validation completed', { requestId, valid: result.valid, errorCount: errors.length, warningCount: warnings.length });

            return result;
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ValidationLogger.getInstance().error('Schema validation failed', { requestId, error: errorMessage });
            return { valid: false, errors: [errorMessage] };
        }
    }

    /**
     * Security scan
     */
    securityScan(input: string, options?: { checkSQL?: boolean; checkXSS?: boolean; checkPathTraversal?: boolean; checkCommandInjection?: boolean }): SecurityScanResult {
        const requestId = this.generateRequestId();

        try {
            ValidationLogger.getInstance().info('Security scan initiated', { requestId, inputLength: input.length });

            const opts = {
                checkSQL: true,
                checkXSS: true,
                checkPathTraversal: true,
                checkCommandInjection: true,
                ...options,
            };

            const threats: SecurityThreat[] = [];

            // Check for SQL injection
            if (opts.checkSQL) {
                const sqlPatterns = [
                    { pattern: /(\bOR\b|\bAND\b).*=|;.*DROP|;.*DELETE|;.*INSERT|;.*UPDATE|;.*SELECT/i, severity: 'high' as const, description: 'Potential SQL injection' },
                    { pattern: /UNION.*SELECT|' OR '1'='1|" OR "1"="/i, severity: 'critical' as const, description: 'SQL injection attempt' },
                ];

                for (const { pattern, severity, description } of sqlPatterns) {
                    const match = input.match(pattern);
                    if (match) {
                        threats.push({
                            type: 'SQL_INJECTION',
                            severity,
                            description,
                            location: match.index?.toString(),
                        });
                    }
                }
            }

            // Check for XSS
            if (opts.checkXSS) {
                const xssPatterns = [
                    { pattern: /<script[^>]*>.*?<\/script>/gi, severity: 'critical' as const, description: 'Script tag injection' },
                    { pattern: /javascript:/gi, severity: 'high' as const, description: 'JavaScript protocol' },
                    { pattern: /onerror\s*=|onload\s*=|onclick\s*=|onmouseover\s*=/gi, severity: 'high' as const, description: 'Event handler injection' },
                    { pattern: /<iframe[^>]*>.*?<\/iframe>/gi, severity: 'medium' as const, description: 'Iframe injection' },
                    { pattern: /<img[^>]*onerror[^>]*>/gi, severity: 'high' as const, description: 'Image event handler injection' },
                ];

                for (const { pattern, severity, description } of xssPatterns) {
                    const match = input.match(pattern);
                    if (match) {
                        threats.push({
                            type: 'XSS',
                            severity,
                            description,
                            location: match.index?.toString(),
                        });
                    }
                }
            }

            // Check for path traversal
            if (opts.checkPathTraversal) {
                const pathPatterns = [
                    { pattern: /\.\.[\/\\]/g, severity: 'high' as const, description: 'Path traversal attempt' },
                    { pattern: /%2e%2e|%5c|%2f/gi, severity: 'high' as const, description: 'URL-encoded path traversal' },
                ];

                for (const { pattern, severity, description } of pathPatterns) {
                    const match = input.match(pattern);
                    if (match) {
                        threats.push({
                            type: 'PATH_TRAVERSAL',
                            severity,
                            description,
                            location: match.index?.toString(),
                        });
                    }
                }
            }

            // Check for command injection
            if (opts.checkCommandInjection) {
                const cmdPatterns = [
                    { pattern: /[;&|`$()]/g, severity: 'high' as const, description: 'Command injection characters' },
                    { pattern: /&&|\|\||;/g, severity: 'medium' as const, description: 'Command chaining' },
                ];

                for (const { pattern, severity, description } of cmdPatterns) {
                    const match = input.match(pattern);
                    if (match) {
                        threats.push({
                            type: 'COMMAND_INJECTION',
                            severity,
                            description,
                            location: match.index?.toString(),
                        });
                    }
                }
            }

            // Update metrics
            this.metrics.securityScanCount++;
            this.metrics.threatCount += threats.length;
            this.metrics.lastValidationTime = Date.now();

            const result: SecurityScanResult = {
                safe: threats.length === 0,
                threats,
            };

            // Sanitize if threats found
            if (threats.length > 0) {
                result.sanitized = this.sanitizeInput(input);
            }

            ValidationLogger.getInstance().info('Security scan completed', { requestId, safe: result.safe, threatCount: threats.length });

            return result;
        } catch (error) {
            ValidationLogger.getInstance().error('Security scan failed', { requestId, error });
            return { safe: false, threats: [{ type: 'SCAN_ERROR', severity: 'medium', description: 'Security scan failed' }] };
        }
    }

    /**
     * Get metrics
     */
    getMetrics(): ValidationMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            validationCount: 0,
            errorCount: 0,
            warningCount: 0,
            securityScanCount: 0,
            threatCount: 0,
            lastValidationTime: 0,
        };
        ValidationLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return ValidationLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        ValidationLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private getObjectDepth(obj: any, depth = 0): number {
        if (typeof obj !== 'object' || obj === null) {
            return depth;
        }

        let maxDepth = depth;
        for (const value of Object.values(obj)) {
            const childDepth = this.getObjectDepth(value, depth + 1);
            if (childDepth > maxDepth) {
                maxDepth = childDepth;
            }
        }

        return maxDepth;
    }

    private getObjectKeyCount(obj: any): number {
        if (typeof obj !== 'object' || obj === null) {
            return 0;
        }

        let count = 0;
        for (const value of Object.values(obj)) {
            count += 1;
            if (typeof value === 'object' && value !== null) {
                count += this.getObjectKeyCount(value);
            }
        }

        return count;
    }

    private generateRequestId(): string {
        return `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const validationService = new ValidationService();
