// Smart Data Extraction Service with Performance Optimizations

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExtractedData {
    tables: TableData[];
    lists: ListData[];
    images: ImageData[];
    links: LinkData[];
    metadata: PageMetadata;
    extractionTime: number;
    elementCounts: ElementCounts;
}

export interface TableData {
    headers: string[];
    rows: string[][];
    caption?: string;
    rowCount: number;
    columnCount: number;
}

export interface ListData {
    type: 'ordered' | 'unordered';
    items: string[];
    itemCount: number;
    nestedLevel: number;
}

export interface ImageData {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
    isLazyLoaded: boolean;
}

export interface LinkData {
    text: string;
    href: string;
    title?: string;
    isExternal: boolean;
    isNoFollow: boolean;
}

export interface PageMetadata {
    title: string;
    description?: string;
    author?: string;
    publishDate?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
    language?: string;
    charset?: string;
}

export interface ElementCounts {
    tables: number;
    lists: number;
    images: number;
    links: number;
    totalElements: number;
}

export interface ExtractionOptions {
    includeTables?: boolean;
    includeLists?: boolean;
    includeImages?: boolean;
    includeLinks?: boolean;
    includeMetadata?: boolean;
    maxTables?: number;
    maxLists?: number;
    maxImages?: number;
    maxLinks?: number;
    skipEmptyElements?: boolean;
    minImageSize?: number;
}

export interface ExtractionMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsed?: number;
    success: boolean;
    error?: string;
}

// ============================================================================
// Logger Utility
// ============================================================================

class ExtractionLogger {
    private static instance: ExtractionLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): ExtractionLogger {
        if (!ExtractionLogger.instance) {
            ExtractionLogger.instance = new ExtractionLogger();
        }
        return ExtractionLogger.instance;
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
        console.log(`[DataExtraction] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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

class ExtractionCache {
    private cache = new Map<string, { data: ExtractedData; timestamp: number; ttl: number }>();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    get(tabId: number): ExtractedData | null {
        const key = `tab_${tabId}`;
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        ExtractionLogger.getInstance().debug('Cache hit', { tabId });
        return entry.data;
    }

    set(tabId: number, data: ExtractedData, ttl?: number): void {
        const key = `tab_${tabId}`;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        });
        ExtractionLogger.getInstance().debug('Cache set', { tabId, ttl: ttl ?? this.defaultTTL });
    }

    clear(): void {
        this.cache.clear();
        ExtractionLogger.getInstance().info('Cache cleared');
    }

    clearTab(tabId: number): void {
        const key = `tab_${tabId}`;
        this.cache.delete(key);
        ExtractionLogger.getInstance().debug('Cache cleared for tab', { tabId });
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

export class DataExtractionService {
    private cache: ExtractionCache;
    private metrics: Map<string, ExtractionMetrics> = new Map();
    private defaultOptions: ExtractionOptions = {
        includeTables: true,
        includeLists: true,
        includeImages: true,
        includeLinks: true,
        includeMetadata: true,
        maxTables: 100,
        maxLists: 100,
        maxImages: 500,
        maxLinks: 1000,
        skipEmptyElements: true,
        minImageSize: 100, // 100 bytes
    };

    constructor() {
        this.cache = new ExtractionCache();
        ExtractionLogger.getInstance().info('DataExtractionService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Extract all data from the current page
     */
    async extractAll(options?: Partial<ExtractionOptions>): Promise<ExtractedData> {
        const requestId = this.generateRequestId();
        const metrics: ExtractionMetrics = {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            success: false,
        };

        try {
            ExtractionLogger.getInstance().info('Extraction started', { requestId, options });

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
                throw new Error('No active tab found');
            }

            // Check cache first
            const cached = this.cache.get(tab.id);
            if (cached) {
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.success = true;
                this.metrics.set(requestId, metrics);
                ExtractionLogger.getInstance().info('Extraction served from cache', { requestId, duration: metrics.duration });
                return cached;
            }

            // Merge options with defaults
            const mergedOptions = { ...this.defaultOptions, ...options };

            // Execute extraction script
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.extractionFunction,
                args: [mergedOptions],
            });

            const data = result[0]?.result;
            if (!data) {
                throw new Error('Extraction returned no data');
            }

            // Add metadata
            const enrichedData: ExtractedData = {
                ...data,
                extractionTime: Date.now(),
                elementCounts: this.calculateElementCounts(data),
            };

            // Cache the result
            this.cache.set(tab.id, enrichedData);

            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = true;
            this.metrics.set(requestId, metrics);

            ExtractionLogger.getInstance().info('Extraction completed', {
                requestId,
                duration: metrics.duration,
                elementCounts: enrichedData.elementCounts,
            });

            return enrichedData;
        } catch (error) {
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = false;
            metrics.error = error instanceof Error ? error.message : 'Unknown error';
            this.metrics.set(requestId, metrics);

            ExtractionLogger.getInstance().error('Extraction failed', { requestId, error: metrics.error });
            throw new Error(`Data extraction failed: ${metrics.error}`);
        }
    }

    /**
     * Extract only tables from the page
     */
    async extractTables(maxTables?: number): Promise<TableData[]> {
        const data = await this.extractAll({ includeTables: true, includeLists: false, includeImages: false, includeLinks: false, includeMetadata: false, maxTables });
        return data.tables;
    }

    /**
     * Extract only lists from the page
     */
    async extractLists(maxLists?: number): Promise<ListData[]> {
        const data = await this.extractAll({ includeTables: false, includeLists: true, includeImages: false, includeLinks: false, includeMetadata: false, maxLists });
        return data.lists;
    }

    /**
     * Extract only images from the page
     */
    async extractImages(maxImages?: number): Promise<ImageData[]> {
        const data = await this.extractAll({ includeTables: false, includeLists: false, includeImages: true, includeLinks: false, includeMetadata: false, maxImages });
        return data.images;
    }

    /**
     * Extract only links from the page
     */
    async extractLinks(maxLinks?: number): Promise<LinkData[]> {
        const data = await this.extractAll({ includeTables: false, includeLists: false, includeImages: false, includeLinks: true, includeMetadata: false, maxLinks });
        return data.links;
    }

    /**
     * Extract only metadata from the page
     */
    async extractMetadata(): Promise<PageMetadata> {
        const data = await this.extractAll({ includeTables: false, includeLists: false, includeImages: false, includeLinks: false, includeMetadata: true });
        return data.metadata;
    }

    /**
     * Export tables to CSV format
     */
    async exportToCSV(tables: TableData[]): Promise<string> {
        if (tables.length === 0) {
            ExtractionLogger.getInstance().warn('No tables to export');
            return '';
        }

        ExtractionLogger.getInstance().info('Exporting tables to CSV', { tableCount: tables.length });

        let csv = '';
        tables.forEach((table, index) => {
            if (table.caption) {
                csv += `# ${table.caption}\n`;
            }
            if (table.headers.length > 0) {
                csv += table.headers.map(h => this.escapeCSV(h)).join(',') + '\n';
            }
            table.rows.forEach(row => {
                csv += row.map(cell => this.escapeCSV(cell)).join(',') + '\n';
            });
            if (index < tables.length - 1) {
                csv += '\n';
            }
        });

        return csv;
    }

    /**
     * Export data to JSON format
     */
    async exportToJSON(data: ExtractedData): Promise<string> {
        ExtractionLogger.getInstance().info('Exporting data to JSON');
        return JSON.stringify(data, null, 2);
    }

    /**
     * Download extracted data as a file
     */
    async downloadData(data: string, filename: string, type: 'csv' | 'json'): Promise<void> {
        try {
            ExtractionLogger.getInstance().info('Downloading data', { filename, type });

            const blob = new Blob([data], { type: type === 'csv' ? 'text/csv' : 'application/json' });
            const url = URL.createObjectURL(blob);

            const downloadId = await chrome.downloads.download({
                url,
                filename,
                saveAs: true,
            });

            ExtractionLogger.getInstance().info('Download started', { downloadId, filename });

            // Clean up URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 5000);
        } catch (error) {
            ExtractionLogger.getInstance().error('Download failed', { filename, error });
            throw new Error(`Failed to download data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Clear the extraction cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Clear cache for a specific tab
     */
    clearTabCache(tabId: number): void {
        this.cache.clearTab(tabId);
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return this.cache.getStats();
    }

    /**
     * Get extraction metrics
     */
    getMetrics(): ExtractionMetrics[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Get metrics for a specific request
     */
    getMetricsForRequest(requestId: string): ExtractionMetrics | undefined {
        return this.metrics.get(requestId);
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics.clear();
        ExtractionLogger.getInstance().info('Metrics cleared');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return ExtractionLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        ExtractionLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Main extraction function to be injected into the page
     */
    private extractionFunction(options: ExtractionOptions): ExtractedData {
        const startTime = performance.now();

        const result: ExtractedData = {
            tables: [],
            lists: [],
            images: [],
            links: [],
            metadata: {
                title: document.title,
            },
            extractionTime: 0,
            elementCounts: {
                tables: 0,
                lists: 0,
                images: 0,
                links: 0,
                totalElements: 0,
            },
        };

        // Extract tables
        if (options.includeTables) {
            const tables = Array.from(document.querySelectorAll('table'));
            const maxTables = options.maxTables ?? tables.length;

            for (let i = 0; i < Math.min(tables.length, maxTables); i++) {
                const table = tables[i];
                const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
                const rows = Array.from(table.querySelectorAll('tr'))
                    .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || ''))
                    .filter(row => row.length > 0 && (options.skipEmptyElements ? row.some(cell => cell.length > 0) : true));
                const caption = table.querySelector('caption')?.textContent?.trim();

                if (rows.length > 0) {
                    result.tables.push({
                        headers,
                        rows,
                        caption,
                        rowCount: rows.length,
                        columnCount: headers.length || (rows[0]?.length || 0),
                    });
                }
            }
            result.elementCounts.tables = result.tables.length;
        }

        // Extract lists
        if (options.includeLists) {
            const lists = Array.from(document.querySelectorAll('ul, ol'));
            const maxLists = options.maxLists ?? lists.length;

            for (let i = 0; i < Math.min(lists.length, maxLists); i++) {
                const list = lists[i];
                const items = Array.from(list.querySelectorAll('li'))
                    .map(li => li.textContent?.trim() || '')
                    .filter(item => !options.skipEmptyElements || item.length > 0);

                if (items.length > 0) {
                    result.lists.push({
                        type: list.tagName === 'OL' ? 'ordered' : 'unordered',
                        items,
                        itemCount: items.length,
                        nestedLevel: this.calculateNestedLevel(list),
                    });
                }
            }
            result.elementCounts.lists = result.lists.length;
        }

        // Extract images
        if (options.includeImages) {
            const images = Array.from(document.querySelectorAll('img'));
            const maxImages = options.maxImages ?? images.length;

            for (let i = 0; i < Math.min(images.length, maxImages); i++) {
                const img = images[i] as HTMLImageElement;
                const src = img.src;
                const alt = img.alt || '';
                const width = img.naturalWidth || img.width;
                const height = img.naturalHeight || img.height;
                const isLazyLoaded = img.loading === 'lazy' || img.hasAttribute('data-src');

                // Skip if below minimum size
                if (options.minImageSize && width * height < options.minImageSize) {
                    continue;
                }

                result.images.push({
                    src,
                    alt,
                    width,
                    height,
                    format: this.getImageFormat(src),
                    isLazyLoaded,
                });
            }
            result.elementCounts.images = result.images.length;
        }

        // Extract links
        if (options.includeLinks) {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const maxLinks = options.maxLinks ?? links.length;

            for (let i = 0; i < Math.min(links.length, maxLinks); i++) {
                const link = links[i] as HTMLAnchorElement;
                const text = link.textContent?.trim() || '';
                const href = link.href;
                const title = link.getAttribute('title') || undefined;
                const isExternal = !href.startsWith(window.location.origin);
                const isNoFollow = link.rel?.includes('nofollow') || false;

                if (options.skipEmptyElements && text.length === 0) {
                    continue;
                }

                result.links.push({
                    text,
                    href,
                    title,
                    isExternal,
                    isNoFollow,
                });
            }
            result.elementCounts.links = result.links.length;
        }

        // Extract metadata
        if (options.includeMetadata) {
            result.metadata = {
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
                author: document.querySelector('meta[name="author"]')?.getAttribute('content') || undefined,
                publishDate: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || undefined,
                keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || undefined,
                ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined,
                ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
                ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined,
                canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
                language: document.documentElement.lang || undefined,
                charset: document.characterSet || undefined,
            };
        }

        result.extractionTime = performance.now() - startTime;
        result.elementCounts.totalElements =
            result.elementCounts.tables +
            result.elementCounts.lists +
            result.elementCounts.images +
            result.elementCounts.links;

        return result;
    }

    /**
     * Calculate the nested level of a list element
     */
    private calculateNestedLevel(list: Element): number {
        let level = 0;
        let parent = list.parentElement;
        while (parent) {
            if (parent.tagName === 'UL' || parent.tagName === 'OL') {
                level++;
            }
            parent = parent.parentElement;
        }
        return level;
    }

    /**
     * Get image format from URL
     */
    private getImageFormat(src: string): string | undefined {
        const match = src.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return match ? match[1].toLowerCase() : undefined;
    }

    /**
     * Escape CSV value
     */
    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Calculate element counts from extracted data
     */
    private calculateElementCounts(data: ExtractedData): ElementCounts {
        return {
            tables: data.tables.length,
            lists: data.lists.length,
            images: data.images.length,
            links: data.links.length,
            totalElements: data.tables.length + data.lists.length + data.images.length + data.links.length,
        };
    }

    /**
     * Generate a unique request ID
     */
    private generateRequestId(): string {
        return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const dataExtractionService = new DataExtractionService();
