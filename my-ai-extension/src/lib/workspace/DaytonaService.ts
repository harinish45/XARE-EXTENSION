import { apiConfigService } from '../config/APIConfigService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DaytonaWorkspace {
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping';
    createdAt: string;
    repository?: string;
    branch?: string;
    envVars?: Record<string, string>;
}

export interface DaytonaCreateWorkspaceOptions {
    name: string;
    repository?: string;
    branch?: string;
    envVars?: Record<string, string>;
}

export interface DaytonaConfig {
    endpoint: string;
    apiKey: string;
}

export interface DaytonaMetrics {
    listWorkspacesCount: number;
    createWorkspaceCount: number;
    startWorkspaceCount: number;
    stopWorkspaceCount: number;
    deleteWorkspaceCount: number;
    getWorkspaceCount: number;
    executeCommandCount: number;
    errorCount: number;
    lastOperationTime: number;
}

export const DaytonaErrorType = {
    API_KEY_MISSING: 'API_KEY_MISSING',
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type DaytonaErrorTypeValue = keyof typeof DaytonaErrorType;

export class DaytonaError extends Error {
    type: DaytonaErrorTypeValue;
    workspaceId?: string;
    statusCode?: number;

    constructor(type: DaytonaErrorTypeValue, message: string, workspaceId?: string, statusCode?: number) {
        super(message);
        this.name = 'DaytonaError';
        this.type = type;
        this.workspaceId = workspaceId;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, DaytonaError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class DaytonaLogger {
    private static instance: DaytonaLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): DaytonaLogger {
        if (!DaytonaLogger.instance) {
            DaytonaLogger.instance = new DaytonaLogger();
        }
        return DaytonaLogger.instance;
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
        console.log(`[Daytona] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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

class DaytonaService {
    private metrics: DaytonaMetrics = {
        listWorkspacesCount: 0,
        createWorkspaceCount: 0,
        startWorkspaceCount: 0,
        stopWorkspaceCount: 0,
        deleteWorkspaceCount: 0,
        getWorkspaceCount: 0,
        executeCommandCount: 0,
        errorCount: 0,
        lastOperationTime: 0,
    };
    private activeRequests = new Map<string, AbortController>();
    private defaultTimeout = 30000; // 30 seconds

    constructor() {
        DaytonaLogger.getInstance().info('DaytonaService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * List all workspaces
     */
    async listWorkspaces(options?: { timeout?: number }): Promise<DaytonaWorkspace[]> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Listing workspaces', { requestId });

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            const response = await this.executeRequest(
                `${config.endpoint}/workspaces`,
                {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    signal: abortController.signal,
                },
                requestId
            );

            const data = await response.json();
            const workspaces = data.workspaces || [];

            this.metrics.listWorkspacesCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspaces listed successfully', {
                requestId,
                count: workspaces.length,
                duration: Date.now() - startTime,
            });

            return workspaces;
        } catch (error) {
            this.handleError(error, 'listWorkspaces', requestId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Create a new workspace
     */
    async createWorkspace(options: DaytonaCreateWorkspaceOptions, requestOptions?: { timeout?: number }): Promise<DaytonaWorkspace> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Creating workspace', { requestId, name: options.name });

            // Validate options
            this.validateCreateOptions(options);

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, requestOptions?.timeout);

            const response = await this.executeRequest(
                `${config.endpoint}/workspaces`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    body: JSON.stringify({
                        name: options.name,
                        repository: options.repository,
                        branch: options.branch || 'main',
                        envVars: options.envVars || {},
                    }),
                    signal: abortController.signal,
                },
                requestId
            );

            const workspace = await response.json();

            this.metrics.createWorkspaceCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspace created successfully', {
                requestId,
                workspaceId: workspace.id,
                duration: Date.now() - startTime,
            });

            return workspace;
        } catch (error) {
            this.handleError(error, 'createWorkspace', requestId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Start a workspace
     */
    async startWorkspace(workspaceId: string, options?: { timeout?: number }): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Starting workspace', { requestId, workspaceId });

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            await this.executeRequest(
                `${config.endpoint}/workspaces/${workspaceId}/start`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    signal: abortController.signal,
                },
                requestId
            );

            this.metrics.startWorkspaceCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspace started successfully', {
                requestId,
                workspaceId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'startWorkspace', requestId, workspaceId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Stop a workspace
     */
    async stopWorkspace(workspaceId: string, options?: { timeout?: number }): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Stopping workspace', { requestId, workspaceId });

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            await this.executeRequest(
                `${config.endpoint}/workspaces/${workspaceId}/stop`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    signal: abortController.signal,
                },
                requestId
            );

            this.metrics.stopWorkspaceCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspace stopped successfully', {
                requestId,
                workspaceId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'stopWorkspace', requestId, workspaceId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Delete a workspace
     */
    async deleteWorkspace(workspaceId: string, options?: { timeout?: number }): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Deleting workspace', { requestId, workspaceId });

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            await this.executeRequest(
                `${config.endpoint}/workspaces/${workspaceId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    signal: abortController.signal,
                },
                requestId
            );

            this.metrics.deleteWorkspaceCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspace deleted successfully', {
                requestId,
                workspaceId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'deleteWorkspace', requestId, workspaceId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Get workspace details
     */
    async getWorkspace(workspaceId: string, options?: { timeout?: number }): Promise<DaytonaWorkspace> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Getting workspace details', { requestId, workspaceId });

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            const response = await this.executeRequest(
                `${config.endpoint}/workspaces/${workspaceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    signal: abortController.signal,
                },
                requestId
            );

            const workspace = await response.json();

            this.metrics.getWorkspaceCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Workspace details retrieved successfully', {
                requestId,
                workspaceId,
                duration: Date.now() - startTime,
            });

            return workspace;
        } catch (error) {
            this.handleError(error, 'getWorkspace', requestId, workspaceId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Execute command in workspace
     */
    async executeCommand(workspaceId: string, command: string, options?: { timeout?: number }): Promise<{ output: string }> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            DaytonaLogger.getInstance().info('Executing command in workspace', { requestId, workspaceId, command });

            // Validate command
            if (!command || command.trim().length === 0) {
                throw new DaytonaError(
                    DaytonaErrorType.VALIDATION_ERROR,
                    'Command cannot be empty',
                    workspaceId
                );
            }

            const config = this.getConfig();
            const abortController = this.createAbortController(requestId, options?.timeout);

            const response = await this.executeRequest(
                `${config.endpoint}/workspaces/${workspaceId}/execute`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`,
                    },
                    body: JSON.stringify({ command }),
                    signal: abortController.signal,
                },
                requestId
            );

            const result = await response.json();

            this.metrics.executeCommandCount++;
            this.metrics.lastOperationTime = Date.now();

            DaytonaLogger.getInstance().info('Command executed successfully', {
                requestId,
                workspaceId,
                duration: Date.now() - startTime,
            });

            return result;
        } catch (error) {
            this.handleError(error, 'executeCommand', requestId, workspaceId);
            throw error;
        } finally {
            this.cleanupRequest(requestId);
        }
    }

    /**
     * Get metrics
     */
    getMetrics(): DaytonaMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            listWorkspacesCount: 0,
            createWorkspaceCount: 0,
            startWorkspaceCount: 0,
            stopWorkspaceCount: 0,
            deleteWorkspaceCount: 0,
            getWorkspaceCount: 0,
            executeCommandCount: 0,
            errorCount: 0,
            lastOperationTime: 0,
        };
        DaytonaLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return DaytonaLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        DaytonaLogger.getInstance().clearLogs();
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests(): void {
        DaytonaLogger.getInstance().info('Cancelling all active requests');
        for (const [requestId, controller] of this.activeRequests.entries()) {
            controller.abort();
            DaytonaLogger.getInstance().debug('Request cancelled', { requestId });
        }
        this.activeRequests.clear();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private getConfig(): DaytonaConfig {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new DaytonaError(
                DaytonaErrorType.API_KEY_MISSING,
                'Daytona API key not configured'
            );
        }

        return {
            endpoint: config.endpoint || 'https://api.daytona.dev',
            apiKey: config.apiKey,
        };
    }

    private validateCreateOptions(options: DaytonaCreateWorkspaceOptions): void {
        if (!options.name || options.name.trim().length === 0) {
            throw new DaytonaError(
                DaytonaErrorType.VALIDATION_ERROR,
                'Workspace name is required'
            );
        }

        if (options.name.length > 100) {
            throw new DaytonaError(
                DaytonaErrorType.VALIDATION_ERROR,
                'Workspace name must be less than 100 characters'
            );
        }

        if (options.repository && !this.isValidUrl(options.repository)) {
            throw new DaytonaError(
                DaytonaErrorType.VALIDATION_ERROR,
                'Invalid repository URL'
            );
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    private async executeRequest(
        url: string,
        options: RequestInit,
        requestId: string
    ): Promise<Response> {
        try {
            DaytonaLogger.getInstance().debug('Executing request', { requestId, url, method: options.method });

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new DaytonaError(
                    DaytonaErrorType.API_ERROR,
                    `Daytona API error: ${response.statusText}`,
                    undefined,
                    response.status
                );
            }

            return response;
        } catch (error) {
            if (error instanceof DaytonaError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new DaytonaError(
                    DaytonaErrorType.TIMEOUT_ERROR,
                    'Request timeout',
                    undefined
                );
            }

            throw new DaytonaError(
                DaytonaErrorType.NETWORK_ERROR,
                error instanceof Error ? error.message : 'Network error',
                undefined
            );
        }
    }

    private async parseErrorResponse(response: Response): Promise<any> {
        try {
            return await response.json();
        } catch {
            return { message: response.statusText };
        }
    }

    private handleError(
        error: unknown,
        operation: string,
        requestId: string,
        workspaceId?: string
    ): void {
        this.metrics.errorCount++;

        if (error instanceof DaytonaError) {
            DaytonaLogger.getInstance().error('Daytona operation failed', {
                requestId,
                operation,
                workspaceId,
                errorType: error.type,
                errorMessage: error.message,
                statusCode: error.statusCode,
            });
        } else {
            DaytonaLogger.getInstance().error('Daytona operation failed with unknown error', {
                requestId,
                operation,
                workspaceId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private createAbortController(requestId: string, timeout?: number): AbortController {
        const controller = new AbortController();
        this.activeRequests.set(requestId, controller);

        const timeoutMs = timeout ?? this.defaultTimeout;
        setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        return controller;
    }

    private cleanupRequest(requestId: string): void {
        this.activeRequests.delete(requestId);
    }

    private generateRequestId(): string {
        return `daytona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const daytonaService = new DaytonaService();
