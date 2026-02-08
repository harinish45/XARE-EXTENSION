import OpenAI from 'openai';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Provider configuration options
 */
export interface ProviderConfig {
    id: string;
    name: string;
    baseUrl: string;
    model: string;
    timeout?: number;
    maxRetries?: number;
    enableCache?: boolean;
    enableCircuitBreaker?: boolean;
}

/**
 * Error types for better error handling
 */
export const ProviderErrorType = {
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
    IMAGE_PROCESSING_ERROR: 'IMAGE_PROCESSING_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ProviderErrorType = typeof ProviderErrorType[keyof typeof ProviderErrorType];

/**
 * Custom error class for provider errors
 */
export class ProviderError extends Error {
    type: ProviderErrorType;
    originalError?: unknown;
    statusCode?: number;

    constructor(
        type: ProviderErrorType,
        message: string,
        originalError?: unknown,
        statusCode?: number
    ) {
        super(message);
        this.name = 'ProviderError';
        this.type = type;
        this.originalError = originalError;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, ProviderError.prototype);
    }
}

/**
 * Request metrics for performance tracking
 */
export interface RequestMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    retryCount: number;
    success: boolean;
    errorType?: ProviderErrorType;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
    response: LLMResponse;
    timestamp: number;
    ttl: number;
}

/**
 * Circuit breaker states
 */
const CircuitBreakerState = {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
} as const;

type CircuitBreakerState = typeof CircuitBreakerState[keyof typeof CircuitBreakerState];

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenMaxCalls: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if error has a status property
 */
function hasStatus(error: unknown): error is { status: number } {
    return typeof error === 'object' && error !== null && 'status' in error;
}

/**
 * Type guard to check if error has a message property
 */
function hasMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * Type guard to check if error has a code property
 */
function hasCode(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Generate a cache key from messages
 */
function generateCacheKey(messages: LLMMessage[], model: string): string {
    const content = messages.map(m => JSON.stringify(m)).join('|');
    return `${model}:${Buffer.from(content).toString('base64').slice(0, 64)}`;
}

/**
 * Check if cache entry is expired
 */
function isCacheEntryExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
}

// ============================================================================
// Logger Utility
// ============================================================================

class ProviderLogger {
    private static instance: ProviderLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 1000;

    private constructor() { }

    static getInstance(): ProviderLogger {
        if (!ProviderLogger.instance) {
            ProviderLogger.instance = new ProviderLogger();
        }
        return ProviderLogger.instance;
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
        console.log(`[${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failureCount = 0;
    private lastFailureTime = 0;
    private halfOpenCallCount = 0;
    private config: CircuitBreakerConfig;

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitBreakerState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
                this.state = CircuitBreakerState.HALF_OPEN;
                this.halfOpenCallCount = 0;
                ProviderLogger.getInstance().info('Circuit breaker entering HALF_OPEN state');
            } else {
                throw new ProviderError(
                    ProviderErrorType.CONNECTION_ERROR,
                    'Circuit breaker is OPEN. Service is temporarily unavailable.'
                );
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failureCount = 0;
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.halfOpenCallCount++;
            if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
                this.state = CircuitBreakerState.CLOSED;
                ProviderLogger.getInstance().info('Circuit breaker returning to CLOSED state');
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            ProviderLogger.getInstance().warn('Circuit breaker entering OPEN state', { failureCount: this.failureCount });
        }
    }

    getState(): CircuitBreakerState {
        return this.state;
    }

    reset(): void {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.halfOpenCallCount = 0;
        ProviderLogger.getInstance().info('Circuit breaker reset');
    }
}

// ============================================================================
// Cache Implementation
// ============================================================================

class ResponseCache {
    private cache = new Map<string, CacheEntry>();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    get(key: string): LLMResponse | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (isCacheEntryExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        ProviderLogger.getInstance().debug('Cache hit', { key });
        return entry.response;
    }

    set(key: string, response: LLMResponse, ttl?: number): void {
        const entry: CacheEntry = {
            response,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        };
        this.cache.set(key, entry);
        ProviderLogger.getInstance().debug('Cache set', { key, ttl: entry.ttl });
    }

    clear(): void {
        this.cache.clear();
        ProviderLogger.getInstance().info('Cache cleared');
    }

    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// ============================================================================
// Main Provider Class
// ============================================================================

export class OpenAICompatibleProvider implements LLMProvider {
    id: string;
    name: string;
    baseUrl: string;
    model: string;
    private timeout: number;
    private maxRetries: number;
    private enableCache: boolean;
    private cache: ResponseCache;
    private circuitBreaker: CircuitBreaker;
    private metrics: Map<string, RequestMetrics> = new Map();

    // Support both old and new constructor signatures for backward compatibility
    constructor(id: string, name: string, baseUrl: string, model: string);
    constructor(config: ProviderConfig);
    constructor(...args: any[]) {
        if (args.length === 1 && typeof args[0] === 'object') {
            // New config-based constructor
            const config = args[0] as ProviderConfig;
            this.id = config.id;
            this.name = config.name;
            this.baseUrl = config.baseUrl;
            this.model = config.model;
            this.timeout = config.timeout ?? 30000;
            this.maxRetries = config.maxRetries ?? 3;
            this.enableCache = config.enableCache ?? true;
        } else {
            // Old positional constructor
            this.id = args[0];
            this.name = args[1];
            this.baseUrl = args[2];
            this.model = args[3];
            this.timeout = 30000;
            this.maxRetries = 3;
            this.enableCache = true;
        }
        this.cache = new ResponseCache();
        this.circuitBreaker = new CircuitBreaker({
            failureThreshold: 5,
            recoveryTimeout: 60000,
            halfOpenMaxCalls: 3,
        });
        ProviderLogger.getInstance().info('Provider initialized', { id: this.id, name: this.name, model: this.model });
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const requestId = this.generateRequestId();
        const metrics: RequestMetrics = {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            retryCount: 0,
            success: false,
        };

        try {
            ProviderLogger.getInstance().info('Generate request started', { requestId, provider: this.id, model: this.model });

            // Check cache if enabled
            if (this.enableCache) {
                const cacheKey = generateCacheKey(messages, this.model);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    metrics.endTime = Date.now();
                    metrics.duration = metrics.endTime - metrics.startTime;
                    metrics.success = true;
                    this.metrics.set(requestId, metrics);
                    ProviderLogger.getInstance().info('Generate request served from cache', { requestId, duration: metrics.duration });
                    return cached;
                }
            }

            // Execute with circuit breaker
            const response = await this.circuitBreaker.execute(async () => {
                return await this.executeWithRetry(messages, apiKey, metrics);
            });

            // Cache the response if enabled
            if (this.enableCache) {
                const cacheKey = generateCacheKey(messages, this.model);
                this.cache.set(cacheKey, response);
            }

            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = true;
            this.metrics.set(requestId, metrics);

            ProviderLogger.getInstance().info('Generate request completed', { requestId, duration: metrics.duration, retryCount: metrics.retryCount });
            return response;
        } catch (error) {
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = false;
            metrics.errorType = this.classifyError(error);
            this.metrics.set(requestId, metrics);

            ProviderLogger.getInstance().error('Generate request failed', { requestId, duration: metrics.duration, errorType: metrics.errorType, error });
            throw this.handleError(error);
        }
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const requestId = this.generateRequestId();
        const metrics: RequestMetrics = {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            retryCount: 0,
            success: false,
        };

        try {
            ProviderLogger.getInstance().info('Stream request started', { requestId, provider: this.id, model: this.model });

            await this.circuitBreaker.execute(async () => {
                await this.executeStreamWithRetry(messages, apiKey, onChunk, metrics);
            });

            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = true;
            this.metrics.set(requestId, metrics);

            ProviderLogger.getInstance().info('Stream request completed', { requestId, duration: metrics.duration, retryCount: metrics.retryCount });
        } catch (error) {
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = false;
            metrics.errorType = this.classifyError(error);
            this.metrics.set(requestId, metrics);

            ProviderLogger.getInstance().error('Stream request failed', { requestId, duration: metrics.duration, errorType: metrics.errorType, error });
            throw this.handleError(error);
        }
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async executeWithRetry(messages: LLMMessage[], apiKey: string, metrics: RequestMetrics): Promise<LLMResponse> {
        let lastError: unknown;
        const openai = new OpenAI({
            apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true,
            timeout: this.timeout,
        });

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const completion = await openai.chat.completions.create({
                    messages: messages as any,
                    model: this.model,
                });

                return {
                    content: completion.choices[0]?.message?.content || '',
                };
            } catch (error) {
                lastError = error;
                metrics.retryCount = attempt + 1;

                const errorType = this.classifyError(error);
                ProviderLogger.getInstance().warn('Request attempt failed', { attempt, errorType, error });

                // Don't retry on certain errors
                if (errorType === ProviderErrorType.AUTHENTICATION_ERROR ||
                    errorType === ProviderErrorType.MODEL_NOT_FOUND) {
                    throw this.handleError(error);
                }

                // Retry on rate limit with exponential backoff
                if (errorType === ProviderErrorType.RATE_LIMIT_ERROR && attempt < this.maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    ProviderLogger.getInstance().info('Rate limit hit, retrying', { delay, attempt });
                    await this.sleep(delay);
                    continue;
                }

                // Retry on connection errors
                if (errorType === ProviderErrorType.CONNECTION_ERROR && attempt < this.maxRetries) {
                    const delay = Math.pow(2, attempt) * 500;
                    ProviderLogger.getInstance().info('Connection error, retrying', { delay, attempt });
                    await this.sleep(delay);
                    continue;
                }

                // Don't retry on other errors
                if (attempt === this.maxRetries) {
                    throw this.handleError(error);
                }
            }
        }

        throw this.handleError(lastError);
    }

    private async executeStreamWithRetry(
        messages: LLMMessage[],
        apiKey: string,
        onChunk: (chunk: string) => void,
        metrics: RequestMetrics
    ): Promise<void> {
        let lastError: unknown;
        const openai = new OpenAI({
            apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true,
            timeout: this.timeout,
        });

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const stream = await openai.chat.completions.create({
                    messages: this.prepareMessages(messages) as any,
                    model: this.model,
                    stream: true,
                    temperature: 0.2,
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        onChunk(content);
                    }
                }
                return;
            } catch (error) {
                lastError = error;
                metrics.retryCount = attempt + 1;

                const errorType = this.classifyError(error);
                ProviderLogger.getInstance().warn('Stream attempt failed', { attempt, errorType, error });

                // Handle image processing errors
                if (errorType === ProviderErrorType.IMAGE_PROCESSING_ERROR && this.hasImages(messages)) {
                    onChunk("\n\n*[System: Image analysis failed (model may not support vision). Retrying with text only...]*\n\n");
                    try {
                        const textMessages = this.stripImages(messages);
                        const stream = await openai.chat.completions.create({
                            messages: this.prepareMessages(textMessages) as any,
                            model: this.model,
                            stream: true,
                            temperature: 0.2,
                        });

                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            if (content) {
                                onChunk(content);
                            }
                        }
                        onChunk(`\n\n*[Note: I had trouble processing the image. I answered based on text only.]*`);
                        return;
                    } catch (retryError) {
                        onChunk(`\n\n**Error:** Failed even with text-only mode. ${hasMessage(retryError) ? retryError.message : 'Unknown error'}`);
                        throw this.handleError(retryError);
                    }
                }

                // Don't retry on certain errors
                if (errorType === ProviderErrorType.AUTHENTICATION_ERROR ||
                    errorType === ProviderErrorType.MODEL_NOT_FOUND) {
                    throw this.handleError(error);
                }

                // Retry on rate limit with exponential backoff
                if (errorType === ProviderErrorType.RATE_LIMIT_ERROR && attempt < this.maxRetries) {
                    const delay = Math.pow(2, attempt) * 5000;
                    onChunk(`\n\n*[Rate limit hit. Waiting ${delay / 1000}s before retry...]*\n\n`);
                    await this.sleep(delay);
                    continue;
                }

                // Don't retry on other errors
                if (attempt === this.maxRetries) {
                    throw this.handleError(error);
                }
            }
        }

        throw this.handleError(lastError);
    }

    private prepareMessages(messages: LLMMessage[]): LLMMessage[] {
        const systemPrompt: LLMMessage = {
            role: 'system',
            content: `CRITICAL CONTEXT: You are receiving a SCREENSHOT of the user's current browser tab RIGHT NOW. The image is ALREADY attached to this message. You MUST analyze it.

ABSOLUTE RULES (VIOLATION = FAILURE):
1. The screenshot IS visible to you. It is attached. Look at it NOW.
2. NEVER say "I cannot see", "please provide", "upload an image", or "describe what you see".
3. NEVER ask for a URL, link, or webpage content.
4. NEVER say you need more information to see the screen.
5. If you cannot process the image, PRETEND you can and make your best guess.

YOUR JOB:
- Analyze the visible screenshot
- If there's a question/quiz → answer it immediately
- If asked to summarize → summarize what you SEE in the screenshot
- If asked about the page → describe what's IN the screenshot

OUTPUT FORMAT:
- For quizzes: "Correct Answer: <option>"
- For summaries: Direct bullet points of what's visible
- For code: Fenced code block with language tag

BANNED PHRASES (never use):
- "I don't have access to"
- "I cannot see"
- "Please provide"
- "Could you share"
- "I'd be happy to help if you"

You are looking at the screenshot RIGHT NOW. Respond based on what you see.`,
        };
        return [systemPrompt, ...messages];
    }

    private classifyError(error: unknown): ProviderErrorType {
        if (hasCode(error) && (error.code === 'ECONNREFUSED' || (hasMessage(error) && error.message.includes('ECONNREFUSED')))) {
            return ProviderErrorType.CONNECTION_ERROR;
        }
        if (hasStatus(error)) {
            if (error.status === 401) {
                return ProviderErrorType.AUTHENTICATION_ERROR;
            }
            if (error.status === 429) {
                return ProviderErrorType.RATE_LIMIT_ERROR;
            }
            if (error.status === 404) {
                return ProviderErrorType.MODEL_NOT_FOUND;
            }
            if (error.status === 400 || error.status === 404) {
                if (hasMessage(error) && error.message.includes('image')) {
                    return ProviderErrorType.IMAGE_PROCESSING_ERROR;
                }
            }
        }
        if (hasMessage(error) && error.message.includes('timeout')) {
            return ProviderErrorType.TIMEOUT_ERROR;
        }
        return ProviderErrorType.UNKNOWN_ERROR;
    }

    private handleError(error: unknown): ProviderError {
        const errorType = this.classifyError(error);
        const statusCode = hasStatus(error) ? error.status : undefined;
        const message = this.getErrorMessage(errorType, error);

        return new ProviderError(errorType, message, error, statusCode);
    }

    private getErrorMessage(errorType: ProviderErrorType, error: unknown): string {
        switch (errorType) {
            case ProviderErrorType.CONNECTION_ERROR:
                if (this.id === 'ollama') {
                    return 'Ollama server not running. Start it with: ollama serve';
                }
                return `Cannot connect to ${this.name}. Is the server running?`;
            case ProviderErrorType.AUTHENTICATION_ERROR:
                return `Invalid API key for ${this.name}. Check Settings → API Configuration.`;
            case ProviderErrorType.RATE_LIMIT_ERROR:
                return `Rate limit exceeded for ${this.name}. Please try again later.`;
            case ProviderErrorType.MODEL_NOT_FOUND:
                return `Model "${this.model}" not found on ${this.name}. Check the model name in settings.`;
            case ProviderErrorType.IMAGE_PROCESSING_ERROR:
                return `Image processing failed. The model may not support vision capabilities.`;
            case ProviderErrorType.TIMEOUT_ERROR:
                return `Request timed out after ${this.timeout}ms. The server may be slow or unresponsive.`;
            default:
                return hasMessage(error) ? error.message : 'An unknown error occurred.';
        }
    }

    private hasImages(messages: LLMMessage[]): boolean {
        return messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
    }

    private stripImages(messages: LLMMessage[]): LLMMessage[] {
        return messages.map(m => {
            if (Array.isArray(m.content)) {
                return {
                    ...m,
                    content: m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                };
            }
            return m;
        });
    }

    private generateRequestId(): string {
        return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================================================
    // Public Utility Methods
    // ========================================================================

    /**
     * Get metrics for all requests
     */
    getMetrics(): RequestMetrics[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Get metrics for a specific request
     */
    getMetricsForRequest(requestId: string): RequestMetrics | undefined {
        return this.metrics.get(requestId);
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics.clear();
        ProviderLogger.getInstance().info('Metrics cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return this.cache.getStats();
    }

    /**
     * Clear the cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get circuit breaker state
     */
    getCircuitBreakerState(): CircuitBreakerState {
        return this.circuitBreaker.getState();
    }

    /**
     * Reset the circuit breaker
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return ProviderLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        ProviderLogger.getInstance().clearLogs();
    }
}
