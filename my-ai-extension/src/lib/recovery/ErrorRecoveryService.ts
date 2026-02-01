// Advanced Error Recovery System

export interface RetryConfig {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
    retryableErrors: string[];
}

export class ErrorRecoveryService {
    private defaultConfig: RetryConfig = {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'NetworkError', '429', '503', '504']
    };

    // Execute with retry and fallback
    async executeWithRecovery<T>(
        primary: () => Promise<T>,
        fallbacks: (() => Promise<T>)[],
        config: Partial<RetryConfig> = {}
    ): Promise<T> {
        const finalConfig = { ...this.defaultConfig, ...config };

        // Try primary with retry
        try {
            return await this.retryWithBackoff(primary, finalConfig);
        } catch (primaryError) {
            console.warn('Primary execution failed, trying fallbacks:', primaryError);

            // Try fallbacks
            for (const fallback of fallbacks) {
                try {
                    return await this.retryWithBackoff(fallback, finalConfig);
                } catch (fallbackError) {
                    console.warn('Fallback failed:', fallbackError);
                    continue;
                }
            }

            throw new Error('All execution attempts failed');
        }
    }

    // Retry with exponential backoff
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        config: RetryConfig
    ): Promise<T> {
        let lastError: Error | undefined;
        let backoff = config.backoffMs;

        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                // Check if error is retryable
                if (!this.isRetryable(error, config.retryableErrors)) {
                    throw error;
                }

                // Last attempt, don't wait
                if (attempt === config.maxAttempts) {
                    break;
                }

                // Wait with exponential backoff
                await this.sleep(backoff);
                backoff = Math.min(backoff * 2, config.maxBackoffMs);
            }
        }

        throw lastError || new Error('Max retry attempts reached');
    }

    // Check if error is retryable
    private isRetryable(error: any, retryableErrors: string[]): boolean {
        const errorString = error?.message || error?.code || String(error);
        return retryableErrors.some(retryable => errorString.includes(retryable));
    }

    // Graceful degradation
    async degradeGracefully<T>(
        ideal: () => Promise<T>,
        acceptable: () => Promise<T>,
        minimal: () => Promise<T>
    ): Promise<{ result: T; quality: 'ideal' | 'acceptable' | 'minimal' }> {
        try {
            const result = await ideal();
            return { result, quality: 'ideal' };
        } catch {
            try {
                const result = await acceptable();
                return { result, quality: 'acceptable' };
            } catch {
                const result = await minimal();
                return { result, quality: 'minimal' };
            }
        }
    }

    // Self-healing: detect and fix common issues
    async selfHeal(error: Error): Promise<boolean> {
        const errorMsg = error.message.toLowerCase();

        // API key issues
        if (errorMsg.includes('api key') || errorMsg.includes('unauthorized')) {
            // Prompt user to update API key
            return false;
        }

        // Rate limit
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            // Wait and retry
            await this.sleep(60000); // Wait 1 minute
            return true;
        }

        // Network issues
        if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
            // Check connectivity
            const online = navigator.onLine;
            if (!online) {
                // Wait for connection
                await this.waitForOnline();
                return true;
            }
        }

        return false;
    }

    private async waitForOnline(): Promise<void> {
        return new Promise(resolve => {
            if (navigator.onLine) {
                resolve();
                return;
            }

            const handler = () => {
                window.removeEventListener('online', handler);
                resolve();
            };

            window.addEventListener('online', handler);
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const errorRecoveryService = new ErrorRecoveryService();
