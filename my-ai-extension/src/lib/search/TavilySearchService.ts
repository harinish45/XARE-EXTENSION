// Tavily Search Service with Async Workflow Optimizations

import { apiConfigService } from '../config/APIConfigService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
    snippet?: string;
}

export interface TavilySearchOptions {
    query: string;
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
    includeImages?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
    timeout?: number;
    retryCount?: number;
}

export interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    images?: string[];
    responseTime: number;
    retryCount: number;
    cached?: boolean;
}

export interface TavilyConfig {
    apiKey: string;
    endpoint: string;
    timeout: number;
    maxRetries: number;
    enableCache: boolean;
    cacheTTL: number;
}

export interface TavilyMetrics {
    searchCount: number;
    quickSearchCount: number;
    deepResearchCount: number;
    domainSearchCount: number;
    errorCount: number;
    cacheHitCount: number;
    averageResponseTime: number;
    lastSearchTime: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const TavilyErrorType = {
    INVALID_API_KEY: 'INVALID_API_KEY',
    RATE_LIMITED: 'RATE_LIMITED',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    INVALID_REQUEST: 'INVALID_REQUEST',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type TavilyErrorType = typeof TavilyErrorType[keyof typeof TavilyErrorType];

export class TavilyError extends Error {
    type: TavilyErrorType;
    statusCode?: number;
    query?: string;

    constructor(type: TavilyErrorType, message: string, statusCode?: number, query?: string) {
        super(message);
        this.name = 'TavilyError';
        this.type = type;
        this.statusCode = statusCode;
        this.query = query;
        Object.setPrototypeOf(this, TavilyError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class TavilyLogger {
    private static instance: TavilyLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): TavilyLogger {
        if (!TavilyLogger.instance) {
            TavilyLogger.instance = new TavilyLogger();
        }
        return TavilyLogger.instance;
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
        console.log(`[TavilySearch] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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
// Cache Implementation
// ============================================================================

interface CacheEntry {
    response: TavilySearchResponse;
    timestamp: number;
    ttl: number;
}

class TavilyCache {
    private cache = new Map<string, CacheEntry>();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    get(key: string): TavilySearchResponse | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            TavilyLogger.getInstance().debug('Cache entry expired', { key });
            return null;
        }
        TavilyLogger.getInstance().debug('Cache hit', { key });
        return { ...entry.response, cached: true };
    }

    set(key: string, response: TavilySearchResponse, ttl?: number): void {
        const entry: CacheEntry = {
            response,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        };
        this.cache.set(key, entry);
        TavilyLogger.getInstance().debug('Cache set', { key, ttl: entry.ttl });
    }

    clear(): void {
        this.cache.clear();
        TavilyLogger.getInstance().info('Cache cleared');
    }

    clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
        TavilyLogger.getInstance().debug('Expired cache entries cleared');
    }

    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// ============================================================================
// Main Service Class
// ============================================================================

class TavilySearchService {
    private config: TavilyConfig;
    private cache: TavilyCache;
    private metrics: TavilyMetrics = {
        searchCount: 0,
        quickSearchCount: 0,
        deepResearchCount: 0,
        domainSearchCount: 0,
        errorCount: 0,
        cacheHitCount: 0,
        averageResponseTime: 0,
        lastSearchTime: 0,
    };
    private activeRequests = new Map<string, AbortController>();

    constructor() {
        this.config = {
            apiKey: '',
            endpoint: 'https://api.tavily.com/search',
            timeout: 30000,
            maxRetries: 3,
            enableCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes
        };
        this.cache = new TavilyCache();
        TavilyLogger.getInstance().info('TavilySearchService initialized', { config: this.config });
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Perform web search using Tavily API with async workflow optimizations
     */
    async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            TavilyLogger.getInstance().info('Search initiated', { requestId, query: options.query });

            // Get API config
            const apiConfig = apiConfigService.getTavilyConfig();
            if (!apiConfig.apiKey) {
                throw new TavilyError(
                    TavilyErrorType.INVALID_API_KEY,
                    'Tavily API key not configured',
                    undefined,
                    options.query
                );
            }

            // Update config with API key
            this.config.apiKey = apiConfig.apiKey;
            if (apiConfig.endpoint) {
                this.config.endpoint = apiConfig.endpoint;
            }

            // Sanitize query
            const sanitizedQuery = this.sanitizeQuery(options.query);

            // Check cache if enabled
            if (this.config.enableCache) {
                const cacheKey = this.generateCacheKey(sanitizedQuery, options);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.metrics.cacheHitCount++;
                    this.metrics.lastSearchTime = Date.now();
                    TavilyLogger.getInstance().info('Search served from cache', { requestId, duration: Date.now() - startTime });
                    return cached;
                }
            }

            // Create abort controller for timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, options.timeout || this.config.timeout);

            this.activeRequests.set(requestId, abortController);

            // Execute search with retry logic
            const response = await this.executeWithRetry(
                async () => {
                    const result = await this.makeRequest(sanitizedQuery, options, abortController.signal);
                    clearTimeout(timeoutId);
                    return result;
                },
                options.retryCount || this.config.maxRetries,
                options.query
            );

            // Cache the response if enabled
            if (this.config.enableCache) {
                const cacheKey = this.generateCacheKey(sanitizedQuery, options);
                this.cache.set(cacheKey, response, this.config.cacheTTL);
            }

            // Update metrics
            const duration = Date.now() - startTime;
            this.metrics.searchCount++;
            this.metrics.lastSearchTime = Date.now();
            this.updateAverageResponseTime(duration);

            TavilyLogger.getInstance().info('Search completed successfully', { requestId, duration, resultCount: response.results.length });

            return {
                ...response,
                responseTime: duration,
                retryCount: 0,
                cached: false,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errorCount++;
            this.metrics.lastSearchTime = Date.now();

            // Clean up abort controller
            this.activeRequests.delete(requestId);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            TavilyLogger.getInstance().error('Search failed', { requestId, duration, error: errorMessage });

            throw this.handleError(error, options.query);
        }
    }

    /**
     * Quick search with answer (optimized for speed)
     */
    async quickSearch(query: string): Promise<{ answer: string; sources: TavilySearchResult[] }> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            TavilyLogger.getInstance().info('Quick search initiated', { requestId, query });

            const result = await this.search({
                query,
                searchDepth: 'basic',
                maxResults: 5,
                includeAnswer: true,
                timeout: 10000, // Faster timeout for quick search
                retryCount: 1, // Fewer retries for quick search
            });

            this.metrics.quickSearchCount++;
            const duration = Date.now() - startTime;
            TavilyLogger.getInstance().info('Quick search completed', { requestId, duration });

            return {
                answer: result.answer || 'No answer found',
                sources: result.results,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            TavilyLogger.getInstance().error('Quick search failed', { requestId, duration, error: errorMessage });
            throw error;
        }
    }

    /**
     * Deep research with advanced search (optimized for comprehensive results)
     */
    async deepResearch(query: string, maxResults = 15): Promise<TavilySearchResponse> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            TavilyLogger.getInstance().info('Deep research initiated', { requestId, query, maxResults });

            const result = await this.search({
                query,
                searchDepth: 'advanced',
                maxResults,
                includeAnswer: true,
                includeImages: true,
                timeout: 60000, // Longer timeout for deep research
                retryCount: 3, // More retries for deep research
            });

            this.metrics.deepResearchCount++;
            const duration = Date.now() - startTime;
            TavilyLogger.getInstance().info('Deep research completed', { requestId, duration, resultCount: result.results.length });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            TavilyLogger.getInstance().error('Deep research failed', { requestId, duration, error: errorMessage });
            throw error;
        }
    }

    /**
     * Domain-specific search (optimized for targeted results)
     */
    async domainSearch(
        query: string,
        domains: string[],
        excludeDomains?: string[]
    ): Promise<TavilySearchResponse> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            TavilyLogger.getInstance().info('Domain search initiated', { requestId, query, domains, excludeDomains });

            const result = await this.search({
                query,
                includeDomains: domains,
                excludeDomains,
                maxResults: 10,
                timeout: 20000, // Moderate timeout for domain search
                retryCount: 2,
            });

            this.metrics.domainSearchCount++;
            const duration = Date.now() - startTime;
            TavilyLogger.getInstance().info('Domain search completed', { requestId, duration, resultCount: result.results.length });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            TavilyLogger.getInstance().error('Domain search failed', { requestId, duration, error: errorMessage });
            throw error;
        }
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests(): void {
        for (const [requestId, controller] of this.activeRequests.entries()) {
            controller.abort();
            TavilyLogger.getInstance().info('Request cancelled', { requestId });
        }
        this.activeRequests.clear();
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void {
        this.cache.clearExpired();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return this.cache.getStats();
    }

    /**
     * Get metrics
     */
    getMetrics(): TavilyMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            searchCount: 0,
            quickSearchCount: 0,
            deepResearchCount: 0,
            domainSearchCount: 0,
            errorCount: 0,
            cacheHitCount: 0,
            averageResponseTime: 0,
            lastSearchTime: 0,
        };
        TavilyLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return TavilyLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        TavilyLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async makeRequest(
        query: string,
        options: TavilySearchOptions,
        signal: AbortSignal
    ): Promise<TavilySearchResponse> {
        const requestId = this.generateRequestId();

        try {
            TavilyLogger.getInstance().debug('Making HTTP request', { requestId, query });

            const requestBody = {
                api_key: this.config.apiKey,
                query,
                search_depth: options.searchDepth || 'basic',
                max_results: options.maxResults || 10,
                include_answer: options.includeAnswer !== false,
                include_images: options.includeImages || false,
                include_domains: options.includeDomains || [],
                exclude_domains: options.excludeDomains || [],
            };

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal,
            });

            if (!response.ok) {
                throw await this.handleResponseError(response, requestId, query);
            }

            const data = await response.json();
            TavilyLogger.getInstance().debug('HTTP request successful', { requestId });

            return {
                query,
                answer: data.answer,
                results: data.results || [],
                images: data.images || [],
                responseTime: 0,
                retryCount: 0,
            };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new TavilyError(
                    TavilyErrorType.TIMEOUT,
                    'Request timeout',
                    undefined,
                    query
                );
            }
            throw error;
        }
    }

    private async executeWithRetry<T>(
        fn: () => Promise<T>,
        maxRetries: number,
        query: string
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                // Don't retry on certain errors
                if (error instanceof TavilyError) {
                    if (
                        error.type === TavilyErrorType.INVALID_API_KEY ||
                        error.type === TavilyErrorType.INVALID_REQUEST
                    ) {
                        throw error;
                    }
                }

                // Retry on rate limit with exponential backoff
                if (error instanceof TavilyError && error.type === TavilyErrorType.RATE_LIMITED) {
                    if (attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000;
                        TavilyLogger.getInstance().warn('Rate limit hit, retrying', { attempt, delay });
                        await this.sleep(delay);
                        continue;
                    }
                }

                // Retry on network errors
                if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
                    if (attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 500;
                        TavilyLogger.getInstance().warn('Network error, retrying', { attempt, delay });
                        await this.sleep(delay);
                        continue;
                    }
                }

                // Don't retry on other errors
                if (attempt === maxRetries) {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    private async handleResponseError(response: Response, requestId: string, query: string): Promise<TavilyError> {
        const statusCode = response.status;

        let errorType: TavilyErrorType;
        let message: string;

        switch (statusCode) {
            case 401:
                errorType = TavilyErrorType.INVALID_API_KEY;
                message = 'Invalid API key. Please check your Tavily API key.';
                break;
            case 429:
                errorType = TavilyErrorType.RATE_LIMITED;
                message = 'Rate limit exceeded. Please try again later.';
                break;
            case 402:
                errorType = TavilyErrorType.QUOTA_EXCEEDED;
                message = 'API quota exceeded. Please upgrade your plan.';
                break;
            case 400:
                errorType = TavilyErrorType.INVALID_REQUEST;
                message = 'Invalid request. Please check your parameters.';
                break;
            default:
                errorType = TavilyErrorType.UNKNOWN_ERROR;
                message = `HTTP error ${statusCode}: ${response.statusText}`;
        }

        TavilyLogger.getInstance().error('Response error', { requestId, statusCode, errorType, message });

        return new TavilyError(errorType, message, statusCode, query);
    }

    private handleError(error: unknown, query?: string): TavilyError {
        if (error instanceof TavilyError) {
            return error;
        }

        if (error instanceof Error) {
            if (error.message.includes('timeout') || error.name === 'AbortError') {
                return new TavilyError(
                    TavilyErrorType.TIMEOUT,
                    'Request timeout. Please try again.',
                    undefined,
                    query
                );
            }
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return new TavilyError(
                    TavilyErrorType.NETWORK_ERROR,
                    'Network error. Please check your connection.',
                    undefined,
                    query
                );
            }
        }

        return new TavilyError(
            TavilyErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'Unknown error occurred',
            undefined,
            query
        );
    }

    private sanitizeQuery(query: string): string {
        // Remove potentially dangerous characters
        return query
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()
            .substring(0, 500); // Limit query length
    }

    private generateCacheKey(query: string, options: TavilySearchOptions): string {
        const key = `${query}:${options.searchDepth || 'basic'}:${options.maxResults || 10}:${options.includeAnswer}:${options.includeImages}`;
        return Buffer.from(key).toString('base64').substring(0, 64);
    }

    private generateRequestId(): string {
        return `tavily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private updateAverageResponseTime(duration: number): void {
        const totalDuration = this.metrics.averageResponseTime * (this.metrics.searchCount - 1) + duration;
        this.metrics.averageResponseTime = totalDuration / this.metrics.searchCount;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const tavilySearchService = new TavilySearchService();
