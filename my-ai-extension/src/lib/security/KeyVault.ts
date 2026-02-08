// API Key Encryption using Web Crypto API with Strengthened Security

// ============================================================================
// Type Definitions
// ============================================================================

export interface EncryptionResult {
    success: boolean;
    encrypted?: string;
    decrypted?: string;
    error?: string;
}

export interface KeyVaultConfig {
    keyName?: string;
    algorithm?: string;
    keyLength?: number;
    ivLength?: number;
    enableLogging?: boolean;
}

export interface KeyVaultMetrics {
    encryptionCount: number;
    decryptionCount: number;
    errorCount: number;
    lastOperationTime: number;
    keyRotationCount: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const KeyVaultErrorType = {
    KEY_GENERATION_FAILED: 'KEY_GENERATION_FAILED',
    ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
    DECRYPTION_FAILED: 'DECRYPTION_FAILED',
    INVALID_CIPHERTEXT: 'INVALID_CIPHERTEXT',
    STORAGE_ERROR: 'STORAGE_ERROR',
    KEY_ROTATION_FAILED: 'KEY_ROTATION_FAILED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type KeyVaultErrorType = typeof KeyVaultErrorType[keyof typeof KeyVaultErrorType];

export class KeyVaultError extends Error {
    type: KeyVaultErrorType;
    operation?: string;

    constructor(type: KeyVaultErrorType, message: string, operation?: string) {
        super(message);
        this.name = 'KeyVaultError';
        this.type = type;
        this.operation = operation;
        Object.setPrototypeOf(this, KeyVaultError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class KeyVaultLogger {
    private static instance: KeyVaultLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): KeyVaultLogger {
        if (!KeyVaultLogger.instance) {
            KeyVaultLogger.instance = new KeyVaultLogger();
        }
        return KeyVaultLogger.instance;
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
        console.log(`[KeyVault] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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
// Main KeyVault Class
// ============================================================================

class KeyVault {
    private config: Required<KeyVaultConfig>;
    private metrics: KeyVaultMetrics = {
        encryptionCount: 0,
        decryptionCount: 0,
        errorCount: 0,
        lastOperationTime: 0,
        keyRotationCount: 0,
    };
    private keyCache: CryptoKey | null = null;
    private keyCacheTimestamp: number = 0;
    private readonly KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(config?: KeyVaultConfig) {
        this.config = {
            keyName: 'xare-encryption-key',
            algorithm: 'AES-GCM',
            keyLength: 256,
            ivLength: 12,
            enableLogging: true,
            ...config,
        };
        KeyVaultLogger.getInstance().info('KeyVault initialized', { config: this.config });
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Encrypt an API key
     */
    async encryptApiKey(plaintext: string): Promise<EncryptionResult> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            KeyVaultLogger.getInstance().info('Encryption initiated', { requestId, keyName: this.config.keyName });

            // Validate input
            if (!plaintext || typeof plaintext !== 'string') {
                throw new KeyVaultError(
                    KeyVaultErrorType.INVALID_CIPHERTEXT,
                    'Plaintext must be a non-empty string',
                    'encryptApiKey'
                );
            }

            if (plaintext.length === 0) {
                throw new KeyVaultError(
                    KeyVaultErrorType.INVALID_CIPHERTEXT,
                    'Plaintext cannot be empty',
                    'encryptApiKey'
                );
            }

            // Sanitize input
            const sanitized = this.sanitizeInput(plaintext);

            // Get or create encryption key
            const key = await this.getOrCreateKey();

            // Generate random IV (Initialization Vector)
            const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));

            // Encrypt
            const encoder = new TextEncoder();
            const data = encoder.encode(sanitized);

            const encrypted = await crypto.subtle.encrypt(
                { name: this.config.algorithm, iv },
                key,
                data
            );

            // Combine IV + encrypted data and encode as base64
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            const encryptedBase64 = btoa(String.fromCharCode(...combined));

            // Update metrics
            const duration = Date.now() - startTime;
            this.metrics.encryptionCount++;
            this.metrics.lastOperationTime = Date.now();

            KeyVaultLogger.getInstance().info('Encryption completed successfully', { requestId, duration });

            return {
                success: true,
                encrypted: encryptedBase64,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errorCount++;
            this.metrics.lastOperationTime = Date.now();

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            KeyVaultLogger.getInstance().error('Encryption failed', { requestId, duration, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Decrypt an API key
     */
    async decryptApiKey(ciphertext: string): Promise<EncryptionResult> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            KeyVaultLogger.getInstance().info('Decryption initiated', { requestId });

            // Validate input
            if (!ciphertext || typeof ciphertext !== 'string') {
                throw new KeyVaultError(
                    KeyVaultErrorType.INVALID_CIPHERTEXT,
                    'Ciphertext must be a non-empty string',
                    'decryptApiKey'
                );
            }

            // Check if value looks encrypted (base64)
            if (!this.isEncrypted(ciphertext)) {
                KeyVaultLogger.getInstance().warn('Value does not appear encrypted, returning as-is', { requestId });
                return {
                    success: true,
                    decrypted: ciphertext,
                };
            }

            // Get encryption key
            const key = await this.getOrCreateKey();

            // Decode from base64
            const combined = new Uint8Array(
                atob(ciphertext).split('').map(c => c.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = combined.slice(0, this.config.ivLength);
            const encrypted = combined.slice(this.config.ivLength);

            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                { name: this.config.algorithm, iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decrypted);

            // Update metrics
            const duration = Date.now() - startTime;
            this.metrics.decryptionCount++;
            this.metrics.lastOperationTime = Date.now();

            KeyVaultLogger.getInstance().info('Decryption completed successfully', { requestId, duration });

            return {
                success: true,
                decrypted: decryptedText,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errorCount++;
            this.metrics.lastOperationTime = Date.now();

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            KeyVaultLogger.getInstance().error('Decryption failed', { requestId, duration, error: errorMessage });

            // If decryption fails (e.g., old unencrypted key), return as-is
            KeyVaultLogger.getInstance().warn('Returning ciphertext as-is due to decryption failure', { requestId });
            return {
                success: true,
                decrypted: ciphertext,
            };
        }
    }

    /**
     * Rotate encryption key (for security)
     */
    async rotateKey(): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            KeyVaultLogger.getInstance().info('Key rotation initiated', { requestId });

            // Clear cached key
            this.keyCache = null;
            this.keyCacheTimestamp = 0;

            // Remove old key from storage
            await chrome.storage.local.remove(this.config.keyName);

            // Generate and store new key
            const newKey = await this.generateKey();
            await this.storeKey(newKey);

            // Update metrics
            const duration = Date.now() - startTime;
            this.metrics.keyRotationCount++;
            this.metrics.lastOperationTime = Date.now();

            KeyVaultLogger.getInstance().info('Key rotation completed successfully', { requestId, duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errorCount++;
            this.metrics.lastOperationTime = Date.now();

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            KeyVaultLogger.getInstance().error('Key rotation failed', { requestId, duration, error: errorMessage });

            throw new KeyVaultError(
                KeyVaultErrorType.KEY_ROTATION_FAILED,
                `Failed to rotate encryption key: ${errorMessage}`,
                'rotateKey'
            );
        }
    }

    /**
     * Clear all encryption keys from storage
     */
    async clearKeys(): Promise<void> {
        const requestId = this.generateRequestId();

        try {
            KeyVaultLogger.getInstance().info('Clearing all keys', { requestId });

            // Clear cache
            this.keyCache = null;
            this.keyCacheTimestamp = 0;

            // Remove from storage
            await chrome.storage.local.remove(this.config.keyName);

            KeyVaultLogger.getInstance().info('Keys cleared successfully', { requestId });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            KeyVaultLogger.getInstance().error('Failed to clear keys', { requestId, error: errorMessage });

            throw new KeyVaultError(
                KeyVaultErrorType.STORAGE_ERROR,
                `Failed to clear encryption keys: ${errorMessage}`,
                'clearKeys'
            );
        }
    }

    /**
     * Get metrics
     */
    getMetrics(): KeyVaultMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            encryptionCount: 0,
            decryptionCount: 0,
            errorCount: 0,
            lastOperationTime: 0,
            keyRotationCount: 0,
        };
        KeyVaultLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return KeyVaultLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        KeyVaultLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async getOrCreateKey(): Promise<CryptoKey> {
        // Check cache first
        if (this.keyCache && Date.now() - this.keyCacheTimestamp < this.KEY_CACHE_TTL) {
            KeyVaultLogger.getInstance().debug('Using cached key');
            return this.keyCache;
        }

        // Try to get existing key from storage
        const stored = await chrome.storage.local.get(this.config.keyName);

        if (stored[this.config.keyName]) {
            // Import existing key - handle both array and object formats
            const storedValue = stored[this.config.keyName];
            const keyArrayData = Array.isArray(storedValue)
                ? storedValue
                : storedValue ? Object.values(storedValue as Record<string, unknown>) : [];
            const keyData = new Uint8Array(keyArrayData as number[]);
            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: this.config.algorithm, length: this.config.keyLength },
                false,
                ['encrypt', 'decrypt']
            );

            // Cache the key
            this.keyCache = key;
            this.keyCacheTimestamp = Date.now();

            KeyVaultLogger.getInstance().debug('Using existing key from storage');
            return key;
        }

        // Generate new key
        const key = await this.generateKey();
        await this.storeKey(key);

        // Cache the key
        this.keyCache = key;
        this.keyCacheTimestamp = Date.now();

        KeyVaultLogger.getInstance().debug('Generated and stored new key');
        return key;
    }

    private async generateKey(): Promise<CryptoKey> {
        return await crypto.subtle.generateKey(
            { name: this.config.algorithm, length: this.config.keyLength },
            true,
            ['encrypt', 'decrypt']
        );
    }

    private async storeKey(key: CryptoKey): Promise<void> {
        // Export and store the key
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        await chrome.storage.local.set({
            [this.config.keyName]: Array.from(new Uint8Array(exportedKey))
        });
    }

    private sanitizeInput(input: string): string {
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()
            .substring(0, 10000); // Limit input length
    }

    private isEncrypted(value: string): boolean {
        // Encrypted values are longer and base64
        if (value.length < 20) return false;
        try {
            atob(value);
            return value.includes('=') || /^[A-Za-z0-9+/]+$/.test(value);
        } catch {
            return false;
        }
    }

    private generateRequestId(): string {
        return `keyvault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const keyVault = new KeyVault();

// ============================================================================
// Exported Functions (for backward compatibility)
// ============================================================================

/**
 * Encrypt an API key
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
    const result = await keyVault.encryptApiKey(plaintext);
    if (!result.success || !result.encrypted) {
        throw new Error(result.error || 'Encryption failed');
    }
    return result.encrypted;
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(ciphertext: string): Promise<string> {
    const result = await keyVault.decryptApiKey(ciphertext);
    if (!result.success || !result.decrypted) {
        throw new Error(result.error || 'Decryption failed');
    }
    return result.decrypted;
}

/**
 * Check if a string looks encrypted (base64)
 */
export function isEncrypted(value: string): boolean {
    return keyVault['isEncrypted'](value);
}

/**
 * Get key vault metrics
 */
export function getKeyVaultMetrics(): KeyVaultMetrics {
    return keyVault.getMetrics();
}

/**
 * Reset key vault metrics
 */
export function resetKeyVaultMetrics(): void {
    keyVault.resetMetrics();
}

/**
 * Rotate encryption key
 */
export async function rotateKey(): Promise<void> {
    await keyVault.rotateKey();
}

/**
 * Clear all encryption keys
 */
export async function clearKeys(): Promise<void> {
    await keyVault.clearKeys();
}
