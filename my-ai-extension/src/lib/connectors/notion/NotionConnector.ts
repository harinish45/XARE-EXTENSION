// Notion Connector with Enhanced Security and Logging

import { BaseConnector, type ConnectorConfig, type ConnectorCapability } from '../base/BaseConnector';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NotionPage {
    id: string;
    title: string;
    content?: string;
    parent?: string;
    created_time?: string;
    last_edited_time?: string;
    archived?: boolean;
}

export interface NotionDatabase {
    id: string;
    title: string;
    description?: string;
    properties: Record<string, any>;
}

export interface NotionSearchResult {
    results: NotionPage[];
    total: number;
    next_cursor?: string;
}

export interface NotionQueryFilter {
    property?: string;
    condition?: string;
    value?: any;
}

export interface NotionConfig {
    apiVersion?: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
}

export interface NotionMetrics {
    searchCount: number;
    queryCount: number;
    createCount: number;
    errorCount: number;
    lastOperationTime: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const NotionErrorType = {
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    RATE_LIMITED: 'RATE_LIMITED',
    NOT_FOUND: 'NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INVALID_REQUEST: 'INVALID_REQUEST',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type NotionErrorType = typeof NotionErrorType[keyof typeof NotionErrorType];

export class NotionError extends Error {
    type: NotionErrorType;
    statusCode?: number;
    requestId?: string;

    constructor(type: NotionErrorType, message: string, statusCode?: number, requestId?: string) {
        super(message);
        this.name = 'NotionError';
        this.type = type;
        this.statusCode = statusCode;
        this.requestId = requestId;
        Object.setPrototypeOf(this, NotionError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class NotionLogger {
    private static instance: NotionLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): NotionLogger {
        if (!NotionLogger.instance) {
            NotionLogger.instance = new NotionLogger();
        }
        return NotionLogger.instance;
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
        console.log(`[NotionConnector] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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
// Security Utility
// ============================================================================

class NotionSecurity {
    private static instance: NotionSecurity;
    private sensitiveFields = ['access_token', 'token', 'password', 'secret', 'key'];
    private maxRequestSize = 10 * 1024 * 1024; // 10MB

    private constructor() { }

    static getInstance(): NotionSecurity {
        if (!NotionSecurity.instance) {
            NotionSecurity.instance = new NotionSecurity();
        }
        return NotionSecurity.instance;
    }

    /**
     * Sanitize data by removing sensitive fields
     */
    sanitizeData(data: Record<string, any>): Record<string, any> {
        const sanitized = { ...data };
        for (const field of this.sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '***REDACTED***';
            }
        }
        return sanitized;
    }

    /**
     * Validate request size
     */
    validateRequestSize(data: any): boolean {
        const size = JSON.stringify(data).length;
        if (size > this.maxRequestSize) {
            NotionLogger.getInstance().warn('Request size exceeds limit', { size, maxSize: this.maxRequestSize });
            return false;
        }
        return true;
    }

    /**
     * Validate API key format
     */
    validateApiKey(apiKey: string): boolean {
        // Notion API keys are typically 32 characters
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        return apiKey.length >= 32;
    }

    /**
     * Sanitize query string
     */
    sanitizeQuery(query: string): string {
        // Remove potentially dangerous characters
        return query
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim()
            .substring(0, 1000); // Limit query length
    }
}

// ============================================================================
// Main Connector Class
// ============================================================================

export class NotionConnector extends BaseConnector {
    private notionConfig: NotionConfig;
    private metrics: NotionMetrics = {
        searchCount: 0,
        queryCount: 0,
        createCount: 0,
        errorCount: 0,
        lastOperationTime: 0,
    };

    constructor(config?: NotionConfig) {
        const connectorConfig: ConnectorConfig = {
            id: 'notion',
            name: 'Notion',
            description: 'Query databases and create pages in Notion',
            icon: 'FileText',
            category: 'productivity',
            authType: 'oauth',
            enabled: false,
        };

        super(connectorConfig);

        this.notionConfig = {
            apiVersion: '2022-06-28',
            baseUrl: 'https://api.notion.com/v1',
            timeout: 30000,
            maxRetries: 3,
            ...config,
        };

        NotionLogger.getInstance().info('NotionConnector initialized', { config: this.notionConfig });
    }

    // ========================================================================
    // Authentication Methods
    // ========================================================================

    async authenticate(): Promise<void> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Authentication initiated', { requestId });

            if (!this.accessToken) {
                throw new NotionError(
                    NotionErrorType.INVALID_TOKEN,
                    'No access token provided'
                );
            }

            // Validate API key format
            if (!NotionSecurity.getInstance().validateApiKey(this.accessToken)) {
                throw new NotionError(
                    NotionErrorType.INVALID_TOKEN,
                    'Invalid API key format'
                );
            }

            // Test the token by making a simple request
            await this.makeRequest('/users/me', 'GET');

            await this.setEnabled(true);
            NotionLogger.getInstance().info('Authentication successful', { requestId });
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            NotionLogger.getInstance().error('Authentication failed', { requestId, error: errorMessage });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Disconnect initiated', { requestId });

            // Clear sensitive data
            this.accessToken = undefined;

            await this.setEnabled(false);
            NotionLogger.getInstance().info('Disconnect successful', { requestId });
        } catch (error) {
            this.metrics.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            NotionLogger.getInstance().error('Disconnect failed', { requestId, error: errorMessage });
            throw error;
        }
    }

    // ========================================================================
    // Capability Methods
    // ========================================================================

    getCapabilities(): ConnectorCapability[] {
        return [
            {
                id: 'search',
                name: 'Search Pages',
                description: 'Search for pages in Notion',
                parameters: { query: 'string' },
            },
            {
                id: 'query-database',
                name: 'Query Database',
                description: 'Query a Notion database',
                parameters: { databaseId: 'string', filter: 'object' },
            },
            {
                id: 'create-page',
                name: 'Create Page',
                description: 'Create a new page',
                parameters: { title: 'string', content: 'string', parent: 'string' },
            },
            {
                id: 'get-page',
                name: 'Get Page',
                description: 'Get a specific page by ID',
                parameters: { pageId: 'string' },
            },
            {
                id: 'update-page',
                name: 'Update Page',
                description: 'Update an existing page',
                parameters: { pageId: 'string', title: 'string', content: 'string' },
            },
        ];
    }

    async execute(capability: string, params: Record<string, any>): Promise<any> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            NotionLogger.getInstance().info('Executing capability', { requestId, capability, params: NotionSecurity.getInstance().sanitizeData(params) });

            if (!this.isEnabled()) {
                throw new NotionError(
                    NotionErrorType.PERMISSION_DENIED,
                    'Notion connector is not enabled. Please authenticate first.'
                );
            }

            if (!this.accessToken) {
                throw new NotionError(
                    NotionErrorType.INVALID_TOKEN,
                    'No access token available'
                );
            }

            // Validate request size
            if (!NotionSecurity.getInstance().validateRequestSize(params)) {
                throw new NotionError(
                    NotionErrorType.INVALID_REQUEST,
                    'Request size exceeds maximum limit'
                );
            }

            let result: any;

            switch (capability) {
                case 'search':
                    result = await this.searchPages(params.query);
                    this.metrics.searchCount++;
                    break;
                case 'query-database':
                    result = await this.queryDatabase(params.databaseId, params.filter);
                    this.metrics.queryCount++;
                    break;
                case 'create-page':
                    result = await this.createPage(params.title, params.content, params.parent);
                    this.metrics.createCount++;
                    break;
                case 'get-page':
                    result = await this.getPage(params.pageId);
                    break;
                case 'update-page':
                    result = await this.updatePage(params.pageId, params.title, params.content);
                    break;
                default:
                    throw new NotionError(
                        NotionErrorType.UNKNOWN_ERROR,
                        `Unknown capability: ${capability}`
                    );
            }

            this.metrics.lastOperationTime = Date.now();
            const duration = Date.now() - startTime;
            NotionLogger.getInstance().info('Capability executed successfully', { requestId, capability, duration });

            return result;
        } catch (error) {
            this.metrics.errorCount++;
            this.metrics.lastOperationTime = Date.now();
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            NotionLogger.getInstance().error('Capability execution failed', { requestId, capability, duration, error: errorMessage });
            throw error;
        }
    }

    // ========================================================================
    // API Methods
    // ========================================================================

    private async searchPages(query: string): Promise<NotionSearchResult> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Searching pages', { requestId, query });

            // Sanitize query
            const sanitizedQuery = NotionSecurity.getInstance().sanitizeQuery(query);

            const response = await this.makeRequest('/search', 'POST', {
                query: sanitizedQuery,
                filter: {
                    value: 'page',
                    property: 'object',
                },
            });

            NotionLogger.getInstance().info('Search completed', { requestId, resultCount: response.results?.length || 0 });

            return {
                results: response.results || [],
                total: response.results?.length || 0,
                next_cursor: response.next_cursor,
            };
        } catch (error) {
            NotionLogger.getInstance().error('Search failed', { requestId, error });
            throw this.handleError(error);
        }
    }

    private async queryDatabase(databaseId: string, filter?: NotionQueryFilter): Promise<NotionDatabase[]> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Querying database', { requestId, databaseId, filter });

            const response = await this.makeRequest(`/databases/${databaseId}/query`, 'POST', {
                filter: filter || {},
            });

            NotionLogger.getInstance().info('Database query completed', { requestId, resultCount: response.results?.length || 0 });

            return response.results || [];
        } catch (error) {
            NotionLogger.getInstance().error('Database query failed', { requestId, error });
            throw this.handleError(error);
        }
    }

    private async createPage(title: string, content?: string, parent?: string): Promise<NotionPage> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Creating page', { requestId, title, parent });

            const pageData: any = {
                parent: parent ? { type: 'page_id', page_id: parent } : undefined,
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                },
            };

            if (content) {
                pageData.children = [
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: content,
                                    },
                                },
                            ],
                        },
                    },
                ];
            }

            const response = await this.makeRequest('/pages', 'POST', pageData);

            NotionLogger.getInstance().info('Page created successfully', { requestId, pageId: response.id });

            return {
                id: response.id,
                title,
                content,
                parent,
                created_time: response.created_time,
                last_edited_time: response.last_edited_time,
            };
        } catch (error) {
            NotionLogger.getInstance().error('Page creation failed', { requestId, error });
            throw this.handleError(error);
        }
    }

    private async getPage(pageId: string): Promise<NotionPage> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Getting page', { requestId, pageId });

            const response = await this.makeRequest(`/pages/${pageId}`, 'GET');

            NotionLogger.getInstance().info('Page retrieved successfully', { requestId, pageId });

            return {
                id: response.id,
                title: response.properties?.title?.title?.[0]?.text?.content || '',
                created_time: response.created_time,
                last_edited_time: response.last_edited_time,
                archived: response.archived || false,
            };
        } catch (error) {
            NotionLogger.getInstance().error('Page retrieval failed', { requestId, error });
            throw this.handleError(error);
        }
    }

    private async updatePage(pageId: string, title?: string, content?: string): Promise<NotionPage> {
        const requestId = this.generateRequestId();

        try {
            NotionLogger.getInstance().info('Updating page', { requestId, pageId, title });

            const pageData: any = {};

            if (title) {
                pageData.properties = {
                    title: {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                };
            }

            if (content) {
                pageData.children = [
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: content,
                                    },
                                },
                            ],
                        },
                    },
                ];
            }

            const response = await this.makeRequest(`/pages/${pageId}`, 'PATCH', pageData);

            NotionLogger.getInstance().info('Page updated successfully', { requestId, pageId });

            return {
                id: response.id,
                title: title || response.properties?.title?.title?.[0]?.text?.content || '',
                created_time: response.created_time,
                last_edited_time: response.last_edited_time,
            };
        } catch (error) {
            NotionLogger.getInstance().error('Page update failed', { requestId, error });
            throw this.handleError(error);
        }
    }

    // ========================================================================
    // HTTP Request Methods
    // ========================================================================

    private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PATCH', data?: any): Promise<any> {
        const requestId = this.generateRequestId();
        const url = `${this.notionConfig.baseUrl}${endpoint}`;

        try {
            NotionLogger.getInstance().debug('Making HTTP request', { requestId, method, endpoint });

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': this.notionConfig.apiVersion || '2022-06-28',
            };

            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
            });

            if (!response.ok) {
                throw await this.handleResponseError(response, requestId);
            }

            const result = await response.json();
            NotionLogger.getInstance().debug('HTTP request successful', { requestId, method, endpoint });

            return result;
        } catch (error) {
            NotionLogger.getInstance().error('HTTP request failed', { requestId, method, endpoint, error });
            throw this.handleError(error);
        }
    }

    private async handleResponseError(response: Response, requestId: string): Promise<NotionError> {
        const statusCode = response.status;
        const requestIdHeader = response.headers.get('request-id');

        let errorType: NotionErrorType;
        let message: string;

        switch (statusCode) {
            case 401:
                errorType = NotionErrorType.AUTHENTICATION_FAILED;
                message = 'Authentication failed. Invalid or expired access token.';
                break;
            case 403:
                errorType = NotionErrorType.PERMISSION_DENIED;
                message = 'Permission denied. You do not have access to this resource.';
                break;
            case 404:
                errorType = NotionErrorType.NOT_FOUND;
                message = 'Resource not found.';
                break;
            case 429:
                errorType = NotionErrorType.RATE_LIMITED;
                message = 'Rate limit exceeded. Please try again later.';
                break;
            case 400:
                errorType = NotionErrorType.INVALID_REQUEST;
                message = 'Invalid request. Please check your parameters.';
                break;
            default:
                errorType = NotionErrorType.UNKNOWN_ERROR;
                message = `HTTP error ${statusCode}: ${response.statusText}`;
        }

        NotionLogger.getInstance().error('Response error', { requestId, statusCode, errorType, message });

        return new NotionError(errorType, message, statusCode, requestIdHeader || requestId);
    }

    private handleError(error: unknown): NotionError {
        if (error instanceof NotionError) {
            return error;
        }

        if (error instanceof Error) {
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return new NotionError(
                    NotionErrorType.NETWORK_ERROR,
                    'Network error. Please check your connection.'
                );
            }
            if (error.message.includes('timeout')) {
                return new NotionError(
                    NotionErrorType.TIMEOUT,
                    'Request timeout. Please try again.'
                );
            }
        }

        return new NotionError(
            NotionErrorType.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'Unknown error occurred'
        );
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    private generateRequestId(): string {
        return `notion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get metrics
     */
    getMetrics(): NotionMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            searchCount: 0,
            queryCount: 0,
            createCount: 0,
            errorCount: 0,
            lastOperationTime: 0,
        };
        NotionLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return NotionLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        NotionLogger.getInstance().clearLogs();
    }
}
