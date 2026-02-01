// Retry utility with exponential backoff

interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

export class RetryService {
    static async withRetry<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxAttempts = 3,
            initialDelay = 1000,
            maxDelay = 10000,
            backoffFactor = 2,
            onRetry
        } = options;

        let lastError: Error;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    throw error;
                }

                // Last attempt - throw error
                if (attempt === maxAttempts) {
                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    initialDelay * Math.pow(backoffFactor, attempt - 1),
                    maxDelay
                );

                // Notify about retry
                onRetry?.(attempt, error);

                // Wait before retry
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    private static isNonRetryableError(error: any): boolean {
        // Don't retry on these errors
        const nonRetryableMessages = [
            'invalid api key',
            'unauthorized',
            'forbidden',
            'not found',
            'invalid request'
        ];

        const errorMessage = error.message?.toLowerCase() || '';
        return nonRetryableMessages.some(msg => errorMessage.includes(msg));
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Rate limit specific retry
    static async withRateLimitRetry<T>(
        fn: () => Promise<T>,
        onRateLimit?: (retryAfter: number) => void
    ): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            // Check if it's a rate limit error (429)
            if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
                // Extract retry-after time (default 60 seconds)
                const retryAfter = this.extractRetryAfter(error) || 60;

                onRateLimit?.(retryAfter);

                // Wait for the specified time
                await this.sleep(retryAfter * 1000);

                // Retry once after cooldown
                return await fn();
            }

            throw error;
        }
    }

    private static extractRetryAfter(error: any): number | null {
        // Try to extract retry-after from error message
        const match = error.message?.match(/retry after (\d+)/i);
        return match ? parseInt(match[1]) : null;
    }
}

export const retryService = RetryService;
