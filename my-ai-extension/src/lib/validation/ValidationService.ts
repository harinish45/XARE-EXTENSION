// Comprehensive Validation Service

export class ValidationService {
    // Validate API key format
    validateApiKey(provider: string, key: string): { valid: boolean; error?: string } {
        if (!key || key.trim().length === 0) {
            return { valid: false, error: 'API key cannot be empty' };
        }

        const patterns: Record<string, RegExp> = {
            openai: /^sk-[A-Za-z0-9]{48}$/,
            anthropic: /^sk-ant-[A-Za-z0-9-]{95}$/,
            gemini: /^[A-Za-z0-9_-]{39}$/,
            perplexity: /^pplx-[A-Za-z0-9]{40}$/
        };

        const pattern = patterns[provider];
        if (pattern && !pattern.test(key)) {
            return { valid: false, error: `Invalid ${provider} API key format` };
        }

        return { valid: true };
    }

    // Sanitize user input
    sanitizeInput(input: string): string {
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    // Validate URL
    validateUrl(url: string): { valid: boolean; error?: string } {
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
            }
            return { valid: true };
        } catch {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    // Validate JSON
    validateJSON(json: string): { valid: boolean; error?: string; data?: any } {
        try {
            const data = JSON.parse(json);
            return { valid: true, data };
        } catch (error) {
            return { valid: false, error: (error as Error).message };
        }
    }

    // Validate email
    validateEmail(email: string): { valid: boolean; error?: string } {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!pattern.test(email)) {
            return { valid: false, error: 'Invalid email format' };
        }
        return { valid: true };
    }

    // Validate file size
    validateFileSize(sizeBytes: number, maxMB: number = 10): { valid: boolean; error?: string } {
        const maxBytes = maxMB * 1024 * 1024;
        if (sizeBytes > maxBytes) {
            return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
        }
        return { valid: true };
    }

    // Validate file type
    validateFileType(filename: string, allowedTypes: string[]): { valid: boolean; error?: string } {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!ext || !allowedTypes.includes(ext)) {
            return { valid: false, error: `File type must be one of: ${allowedTypes.join(', ')}` };
        }
        return { valid: true };
    }

    // Validate schema
    validateSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        Object.entries(schema).forEach(([key, rules]: [string, any]) => {
            const value = data[key];

            // Required check
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                return;
            }

            if (value === undefined || value === null) return;

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
        });

        return { valid: errors.length === 0, errors };
    }

    // Security scan
    securityScan(input: string): { safe: boolean; threats: string[] } {
        const threats: string[] = [];

        // Check for SQL injection
        if (/(\bOR\b|\bAND\b).*=|;.*DROP|;.*DELETE|;.*INSERT/i.test(input)) {
            threats.push('Potential SQL injection');
        }

        // Check for XSS
        if (/<script|javascript:|onerror=|onload=/i.test(input)) {
            threats.push('Potential XSS attack');
        }

        // Check for path traversal
        if (/\.\.[\/\\]/.test(input)) {
            threats.push('Potential path traversal');
        }

        return { safe: threats.length === 0, threats };
    }
}

export const validationService = new ValidationService();
