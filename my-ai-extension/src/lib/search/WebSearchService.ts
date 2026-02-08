// Web Search Service with Improved Error Handling

// ============================================================================
// Type Definitions
// ============================================================================

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    favicon?: string;
    source?: 'duckduckgo' | 'google' | 'wikipedia';
    score?: number;
}

export interface SearchResponse {
    results: SearchResult[];
    query: string;
    responseTime: number;
    cached?: boolean;
    source?: string;
}

export interface SearchOptions {
    query: string;
    maxResults?: number;
    timeout?: number;
    includeFallbacks?: boolean;
    enableCache?: boolean;
}

export interface SearchMetrics {
    searchCount: number;
    errorCount: number;
    cacheHitCount: number;
    averageResponseTime: number;
    lastSearchTime: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const SearchErrorType = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    INVALID_QUERY: 'INVALID_QUERY',
    RATE_LIMITED: 'RATE_LIMITED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SearchErrorType = typeof SearchErrorType[keyof typeof SearchErrorType];

export class SearchError extends Error {
    type: SearchErrorType;
    query?: string;

    constructor(type: SearchErrorType, message: string, query?: string) {
        super(message);
        this.name = 'SearchError';
        this.type = type;
        this.query = query;
        Object.setPrototypeOf(this, SearchError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class SearchLogger {
    private static instance: SearchLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): SearchLogger {
        if (!SearchLogger.instance) {
            SearchLogger.instance = new SearchLogger();
        }
        return SearchLogger.instance;
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
        console.log(`[WebSearch] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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
    response: SearchResponse;
    timestamp: number;
    ttl: number;
}

class SearchCache {
    private cache = new Map<string, CacheEntry>();
    private defaultTTL = 10 * 60 * 1000; // 10 minutes

    get(key: string): SearchResponse | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            SearchLogger.getInstance().debug('Cache entry expired', { key });
            return null;
        }
        SearchLogger.getInstance().debug('Cache hit', { key });
        return { ...entry.response, cached: true };
    }

    set(key: string, response: SearchResponse, ttl?: number): void {
        const entry: CacheEntry = {
            response,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        };
        this.cache.set(key, entry);
        SearchLogger.getInstance().debug('Cache set', { key, ttl: entry.ttl });
    }

    clear(): void {
        this.cache.clear();
        SearchLogger.getInstance().info('Cache cleared');
    }

    clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
        SearchLogger.getInstance().debug('Expired cache entries cleared');
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

class WebSearchService {
    private ddgApiUrl = 'https://api.duckduckgo.com/';
    private cache: SearchCache;
    private metrics: SearchMetrics = {
        searchCount: 0,
        errorCount: 0,
        cacheHitCount: 0,
        averageResponseTime: 0,
        lastSearchTime: 0,
    };
    private activeRequests = new Map<string, AbortController>();

    constructor() {
        this.cache = new SearchCache();
        SearchLogger.getInstance().info('WebSearchService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Perform web search using DuckDuckGo Instant Answer API (free, no API key needed)
     */
    async search(options: SearchOptions): Promise<SearchResponse> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            SearchLogger.getInstance().info('Search initiated', { requestId, query: options.query });

            // Validate query
            const sanitizedQuery = this.sanitizeQuery(options.query);
            if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
                throw new SearchError(
                    SearchErrorType.INVALID_QUERY,
                    'Query cannot be empty',
                    options.query
                );
            }

            // Check cache if enabled
            if (options.enableCache !== false) {
                const cacheKey = this.generateCacheKey(sanitizedQuery);
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.metrics.cacheHitCount++;
                    this.metrics.lastSearchTime = Date.now();
                    SearchLogger.getInstance().info('Search served from cache', { requestId, duration: Date.now() - startTime });
                    return cached;
                }
            }

            // Create abort controller for timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, options.timeout || 30000);

            this.activeRequests.set(requestId, abortController);

            // Execute search
            const results = await this.executeSearch(sanitizedQuery, abortController.signal, options.includeFallbacks !== false);
            clearTimeout(timeoutId);

            // Cache the response
            if (options.enableCache !== false) {
                const cacheKey = this.generateCacheKey(sanitizedQuery);
                this.cache.set(cacheKey, {
                    results,
                    query: sanitizedQuery,
                    responseTime: Date.now() - startTime,
                    source: 'duckduckgo',
                });
            }

            // Update metrics
            const duration = Date.now() - startTime;
            this.metrics.searchCount++;
            this.metrics.lastSearchTime = Date.now();
            this.updateAverageResponseTime(duration);

            SearchLogger.getInstance().info('Search completed successfully', { requestId, duration, resultCount: results.length });

            return {
                results,
                query: sanitizedQuery,
                responseTime: duration,
                source: 'duckduckgo',
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errorCount++;
            this.metrics.lastSearchTime = Date.now();

            // Clean up abort controller
            this.activeRequests.delete(requestId);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            SearchLogger.getInstance().error('Search failed', { requestId, duration, error: errorMessage });

            // Return fallback results on error
            if (options.includeFallbacks !== false) {
                const fallbackResults = this.generateFallbackResults(options.query);
                SearchLogger.getInstance().info('Returning fallback results', { requestId, fallbackCount: fallbackResults.length });
                return {
                    results: fallbackResults,
                    query: options.query,
                    responseTime: duration,
                    source: 'fallback',
                };
            }

            throw this.handleError(error, options.query);
        }
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests(): void {
        for (const [requestId, controller] of this.activeRequests.entries()) {
            controller.abort();
            SearchLogger.getInstance().info('Request cancelled', { requestId });
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
    getMetrics(): SearchMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            searchCount: 0,
            errorCount: 0,
            cacheHitCount: 0,
            averageResponseTime: 0,
            lastSearchTime: 0,
        };
        SearchLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return SearchLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        SearchLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async executeSearch(
        query: string,
        signal: AbortSignal,
        includeFallbacks: boolean
    ): Promise<SearchResult[]> {
        const requestId = this.generateRequestId();

        try {
            SearchLogger.getInstance().debug('Executing DuckDuckGo search', { requestId, query });

            // DuckDuckGo Instant Answer API
            const url = `${this.ddgApiUrl}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

            const response = await fetch(url, {
                signal,
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const results: SearchResult[] = [];

            // Abstract (main answer)
            if (data.Abstract && data.AbstractURL) {
                results.push({
                    title: data.Heading || 'Result',
                    url: data.AbstractURL,
                    snippet: data.Abstract,
                    favicon: data.Image ? `https://duckduckgo.com${data.Image}` : undefined,
                    source: 'duckduckgo',
                    score: 100,
                });
            }

            // Related topics
            if (data.RelatedTopics) {
                for (const topic of data.RelatedTopics.slice(0, 4)) {
                    if (topic.FirstURL && topic.Text) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'Related',
                            url: topic.FirstURL,
                            snippet: topic.Text,
                            favicon: topic.Icon?.URL ? `https://duckduckgo.com${topic.Icon.URL}` : undefined,
                            source: 'duckduckgo',
                            score: 80,
                        });
                    }
                }
            }

            // If no DDG results and fallbacks enabled, generate helpful links
            if (results.length === 0 && includeFallbacks) {
                const fallbackResults = this.generateFallbackResults(query);
                results.push(...fallbackResults);
            }

            SearchLogger.getInstance().debug('Search executed successfully', { requestId, resultCount: results.length });

            return results;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new SearchError(
                    SearchErrorType.TIMEOUT,
                    'Request timeout',
                    query
                );
            }

            if (error instanceof Error && error.message.includes('fetch')) {
                throw new SearchError(
                    SearchErrorType.NETWORK_ERROR,
                    'Network error. Please check your connection.',
                    query
                );
            }

            throw error;
        }
    }

    private generateFallbackResults(query: string): SearchResult[] {
        const results: SearchResult[] = [];

        // Google Search
        results.push({
            title: `Google Search: ${query}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: 'Search on Google for more results',
            source: 'google',
            score: 50,
        });

        // Wikipedia
        results.push({
            title: `Wikipedia: ${query}`,
            url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
            snippet: 'Search Wikipedia encyclopedia',
            source: 'wikipedia',
            score: 40,
        });

        return results;
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

    private generateCacheKey(query: string): string {
        return Buffer.from(query.toLowerCase().trim()).toString('base64').substring(0, 64);
    }

    private generateRequestId(): string {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private updateAverageResponseTime(duration: number): void {
        const totalDuration = this.metrics.averageResponseTime * (this.metrics.searchCount - 1) + duration;
        this.metrics.averageResponseTime = totalDuration / this.metrics.searchCount;
    }

    private handleError(error: unknown, query?: string): SearchError {
        if (error instanceof SearchError) {
            return error;
        }

        if (error instanceof Error) {
            if (error.message.includes('timeout') || error.name === 'AbortError') {
                return new SearchError(
                    SearchErrorType.TIMEOUT,
                    'Request timeout. Please try again.',
                    query
                );
            }
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return new SearchError(
                    SearchErrorType.NETWORK_ERROR,
                    'Network error. Please check your connection.',
                    query
                );
            }
        }

        return new SearchError(
            SearchErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'Unknown error occurred',
            query
        );
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Extract domain from URL for display
     */
    getDomain(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    /**
     * Get favicon URL
     */
    getFavicon(url: string): string {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return '';
        }
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const webSearchService = new WebSearchService();
