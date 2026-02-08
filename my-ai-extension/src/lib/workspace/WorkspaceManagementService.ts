// ============================================================================
// Workspace Management Service
// Enhanced with performance optimizations, caching, metrics tracking,
// and robust error handling
// ============================================================================

// ============================================================================
// Type Definitions
// ============================================================================

export interface Workspace {
    id: string;
    name: string;
    description: string;
    sessions: string[];
    createdAt: number;
    lastAccessed: number;
    tags?: string[];
    color?: string;
    icon?: string;
}

export interface WorkspaceCreateOptions {
    name: string;
    description?: string;
    tags?: string[];
    color?: string;
    icon?: string;
}

export interface WorkspaceUpdateOptions {
    name?: string;
    description?: string;
    tags?: string[];
    color?: string;
    icon?: string;
}

export interface WorkspaceMetrics {
    createCount: number;
    switchCount: number;
    deleteCount: number;
    addSessionCount: number;
    removeSessionCount: number;
    updateCount: number;
    errorCount: number;
    lastOperationTime: number;
    totalWorkspaces: number;
    totalSessions: number;
}

export const WorkspaceErrorType = {
    WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
    WORKSPACE_EXISTS: 'WORKSPACE_EXISTS',
    INVALID_NAME: 'INVALID_NAME',
    STORAGE_ERROR: 'STORAGE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type WorkspaceErrorTypeValue = keyof typeof WorkspaceErrorType;

export class WorkspaceError extends Error {
    type: WorkspaceErrorTypeValue;
    workspaceId?: string;

    constructor(type: WorkspaceErrorTypeValue, message: string, workspaceId?: string) {
        super(message);
        this.name = 'WorkspaceError';
        this.type = type;
        this.workspaceId = workspaceId;
        Object.setPrototypeOf(this, WorkspaceError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class WorkspaceLogger {
    private static instance: WorkspaceLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): WorkspaceLogger {
        if (!WorkspaceLogger.instance) {
            WorkspaceLogger.instance = new WorkspaceLogger();
        }
        return WorkspaceLogger.instance;
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
        console.log(`[Workspace] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
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

export class WorkspaceManagementService {
    private workspaces: Map<string, Workspace> = new Map();
    private activeWorkspaceId: string | null = null;
    private metrics: WorkspaceMetrics = {
        createCount: 0,
        switchCount: 0,
        deleteCount: 0,
        addSessionCount: 0,
        removeSessionCount: 0,
        updateCount: 0,
        errorCount: 0,
        lastOperationTime: 0,
        totalWorkspaces: 0,
        totalSessions: 0,
    };
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTimeout = 60000; // 1 minute cache
    private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private saveDebounceDelay = 500; // 500ms debounce

    constructor() {
        WorkspaceLogger.getInstance().info('WorkspaceManagementService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Create a new workspace
     */
    async createWorkspace(options: WorkspaceCreateOptions): Promise<string> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Creating workspace', { requestId, name: options.name });

            // Validate options
            this.validateCreateOptions(options);

            // Check for duplicate name
            const existing = Array.from(this.workspaces.values()).find(w => w.name === options.name);
            if (existing) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_EXISTS,
                    `Workspace with name "${options.name}" already exists`
                );
            }

            const id = `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const workspace: Workspace = {
                id,
                name: options.name,
                description: options.description || '',
                sessions: [],
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                tags: options.tags || [],
                color: options.color,
                icon: options.icon,
            };

            this.workspaces.set(id, workspace);
            this.invalidateCache();
            await this.debouncedSave();

            this.metrics.createCount++;
            this.metrics.totalWorkspaces = this.workspaces.size;
            this.metrics.lastOperationTime = Date.now();

            WorkspaceLogger.getInstance().info('Workspace created successfully', {
                requestId,
                workspaceId: id,
                duration: Date.now() - startTime,
            });

            return id;
        } catch (error) {
            this.handleError(error, 'createWorkspace', requestId);
            throw error;
        }
    }

    /**
     * Switch to a different workspace
     */
    async switchWorkspace(id: string): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Switching workspace', { requestId, workspaceId: id });

            const workspace = this.workspaces.get(id);
            if (!workspace) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_NOT_FOUND,
                    'Workspace not found',
                    id
                );
            }

            this.activeWorkspaceId = id;
            workspace.lastAccessed = Date.now();
            this.invalidateCache();
            await this.debouncedSave();

            this.metrics.switchCount++;
            this.metrics.lastOperationTime = Date.now();

            WorkspaceLogger.getInstance().info('Workspace switched successfully', {
                requestId,
                workspaceId: id,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'switchWorkspace', requestId, id);
            throw error;
        }
    }

    /**
     * Get the active workspace
     */
    getActiveWorkspace(): Workspace | null {
        if (!this.activeWorkspaceId) return null;
        return this.workspaces.get(this.activeWorkspaceId) || null;
    }

    /**
     * Get a workspace by ID
     */
    getWorkspace(id: string): Workspace | null {
        return this.workspaces.get(id) || null;
    }

    /**
     * Get all workspaces
     */
    getAllWorkspaces(options?: { sortBy?: 'lastAccessed' | 'createdAt' | 'name'; order?: 'asc' | 'desc' }): Workspace[] {
        const cacheKey = `allWorkspaces_${options?.sortBy}_${options?.order}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        let workspaces = Array.from(this.workspaces.values());

        // Sort workspaces
        const sortBy = options?.sortBy || 'lastAccessed';
        const order = options?.order || 'desc';

        workspaces.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'lastAccessed':
                    comparison = b.lastAccessed - a.lastAccessed;
                    break;
                case 'createdAt':
                    comparison = b.createdAt - a.createdAt;
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
            }
            return order === 'asc' ? -comparison : comparison;
        });

        this.setCache(cacheKey, workspaces);
        return workspaces;
    }

    /**
     * Search workspaces by name or description
     */
    searchWorkspaces(query: string): Workspace[] {
        const cacheKey = `search_${query}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        const lowerQuery = query.toLowerCase();
        const results = Array.from(this.workspaces.values()).filter(
            ws =>
                ws.name.toLowerCase().includes(lowerQuery) ||
                ws.description.toLowerCase().includes(lowerQuery) ||
                ws.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );

        this.setCache(cacheKey, results);
        return results;
    }

    /**
     * Update a workspace
     */
    async updateWorkspace(id: string, options: WorkspaceUpdateOptions): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Updating workspace', { requestId, workspaceId: id });

            const workspace = this.workspaces.get(id);
            if (!workspace) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_NOT_FOUND,
                    'Workspace not found',
                    id
                );
            }

            // Update fields
            if (options.name !== undefined) {
                if (options.name.trim().length === 0) {
                    throw new WorkspaceError(
                        WorkspaceErrorType.INVALID_NAME,
                        'Workspace name cannot be empty',
                        id
                    );
                }
                workspace.name = options.name;
            }
            if (options.description !== undefined) {
                workspace.description = options.description;
            }
            if (options.tags !== undefined) {
                workspace.tags = options.tags;
            }
            if (options.color !== undefined) {
                workspace.color = options.color;
            }
            if (options.icon !== undefined) {
                workspace.icon = options.icon;
            }

            workspace.lastAccessed = Date.now();
            this.invalidateCache();
            await this.debouncedSave();

            this.metrics.updateCount++;
            this.metrics.lastOperationTime = Date.now();

            WorkspaceLogger.getInstance().info('Workspace updated successfully', {
                requestId,
                workspaceId: id,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'updateWorkspace', requestId, id);
            throw error;
        }
    }

    /**
     * Delete a workspace
     */
    async deleteWorkspace(id: string): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Deleting workspace', { requestId, workspaceId: id });

            const workspace = this.workspaces.get(id);
            if (!workspace) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_NOT_FOUND,
                    'Workspace not found',
                    id
                );
            }

            this.workspaces.delete(id);
            if (this.activeWorkspaceId === id) {
                this.activeWorkspaceId = null;
            }
            this.invalidateCache();
            await this.debouncedSave();

            this.metrics.deleteCount++;
            this.metrics.totalWorkspaces = this.workspaces.size;
            this.metrics.lastOperationTime = Date.now();

            WorkspaceLogger.getInstance().info('Workspace deleted successfully', {
                requestId,
                workspaceId: id,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'deleteWorkspace', requestId, id);
            throw error;
        }
    }

    /**
     * Add a session to a workspace
     */
    async addSession(workspaceId: string, sessionId: string): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Adding session to workspace', { requestId, workspaceId, sessionId });

            const workspace = this.workspaces.get(workspaceId);
            if (!workspace) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_NOT_FOUND,
                    'Workspace not found',
                    workspaceId
                );
            }

            if (!workspace.sessions.includes(sessionId)) {
                workspace.sessions.push(sessionId);
                workspace.lastAccessed = Date.now();
                this.invalidateCache();
                await this.debouncedSave();

                this.metrics.addSessionCount++;
                this.metrics.totalSessions = this.calculateTotalSessions();
                this.metrics.lastOperationTime = Date.now();
            }

            WorkspaceLogger.getInstance().info('Session added successfully', {
                requestId,
                workspaceId,
                sessionId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'addSession', requestId, workspaceId);
            throw error;
        }
    }

    /**
     * Remove a session from a workspace
     */
    async removeSession(workspaceId: string, sessionId: string): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Removing session from workspace', { requestId, workspaceId, sessionId });

            const workspace = this.workspaces.get(workspaceId);
            if (!workspace) {
                throw new WorkspaceError(
                    WorkspaceErrorType.WORKSPACE_NOT_FOUND,
                    'Workspace not found',
                    workspaceId
                );
            }

            const index = workspace.sessions.indexOf(sessionId);
            if (index > -1) {
                workspace.sessions.splice(index, 1);
                workspace.lastAccessed = Date.now();
                this.invalidateCache();
                await this.debouncedSave();

                this.metrics.removeSessionCount++;
                this.metrics.totalSessions = this.calculateTotalSessions();
                this.metrics.lastOperationTime = Date.now();
            }

            WorkspaceLogger.getInstance().info('Session removed successfully', {
                requestId,
                workspaceId,
                sessionId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'removeSession', requestId, workspaceId);
            throw error;
        }
    }

    /**
     * Get metrics
     */
    getMetrics(): WorkspaceMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            createCount: 0,
            switchCount: 0,
            deleteCount: 0,
            addSessionCount: 0,
            removeSessionCount: 0,
            updateCount: 0,
            errorCount: 0,
            lastOperationTime: 0,
            totalWorkspaces: this.workspaces.size,
            totalSessions: this.calculateTotalSessions(),
        };
        WorkspaceLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return WorkspaceLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        WorkspaceLogger.getInstance().clearLogs();
    }

    /**
     * Load workspaces from storage
     */
    async load(): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Loading workspaces from storage', { requestId });

            const result = await chrome.storage.local.get(['xare-workspaces', 'xare-active-workspace']) as {
                'xare-workspaces'?: Workspace[];
                'xare-active-workspace'?: string | null;
            };

            if (result['xare-workspaces']) {
                result['xare-workspaces'].forEach((ws: Workspace) => {
                    this.workspaces.set(ws.id, ws);
                });
            }

            this.activeWorkspaceId = result['xare-active-workspace'] || null;
            this.metrics.totalWorkspaces = this.workspaces.size;
            this.metrics.totalSessions = this.calculateTotalSessions();

            WorkspaceLogger.getInstance().info('Workspaces loaded successfully', {
                requestId,
                count: this.workspaces.size,
                activeWorkspaceId: this.activeWorkspaceId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'load', requestId);
            throw error;
        }
    }

    /**
     * Clear all workspaces
     */
    async clearAll(): Promise<void> {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        try {
            WorkspaceLogger.getInstance().info('Clearing all workspaces', { requestId });

            this.workspaces.clear();
            this.activeWorkspaceId = null;
            this.invalidateCache();
            await this.save();

            this.metrics.totalWorkspaces = 0;
            this.metrics.totalSessions = 0;
            this.metrics.lastOperationTime = Date.now();

            WorkspaceLogger.getInstance().info('All workspaces cleared', {
                requestId,
                duration: Date.now() - startTime,
            });
        } catch (error) {
            this.handleError(error, 'clearAll', requestId);
            throw error;
        }
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private validateCreateOptions(options: WorkspaceCreateOptions): void {
        if (!options.name || options.name.trim().length === 0) {
            throw new WorkspaceError(
                WorkspaceErrorType.INVALID_NAME,
                'Workspace name is required'
            );
        }

        if (options.name.length > 100) {
            throw new WorkspaceError(
                WorkspaceErrorType.INVALID_NAME,
                'Workspace name must be less than 100 characters'
            );
        }

        if (options.description && options.description.length > 500) {
            throw new WorkspaceError(
                WorkspaceErrorType.INVALID_NAME,
                'Workspace description must be less than 500 characters'
            );
        }
    }

    private calculateTotalSessions(): number {
        let total = 0;
        for (const workspace of this.workspaces.values()) {
            total += workspace.sessions.length;
        }
        return total;
    }

    private async save(): Promise<void> {
        const requestId = this.generateRequestId();

        try {
            const data = Array.from(this.workspaces.values());
            await chrome.storage.local.set({
                'xare-workspaces': data,
                'xare-active-workspace': this.activeWorkspaceId,
            });

            WorkspaceLogger.getInstance().debug('Workspaces saved to storage', { requestId });
        } catch (error) {
            WorkspaceLogger.getInstance().error('Failed to save workspaces', { requestId, error });
            throw new WorkspaceError(
                WorkspaceErrorType.STORAGE_ERROR,
                'Failed to save workspaces to storage'
            );
        }
    }

    private debouncedSave(): Promise<void> {
        return new Promise((resolve) => {
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
            }

            this.saveDebounceTimer = setTimeout(async () => {
                await this.save();
                resolve();
            }, this.saveDebounceDelay);
        });
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    private getFromCache(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        const age = Date.now() - cached.timestamp;
        if (age > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    private invalidateCache(): void {
        this.cache.clear();
    }

    private handleError(
        error: unknown,
        operation: string,
        requestId: string,
        workspaceId?: string
    ): void {
        this.metrics.errorCount++;

        if (error instanceof WorkspaceError) {
            WorkspaceLogger.getInstance().error('Workspace operation failed', {
                requestId,
                operation,
                workspaceId,
                errorType: error.type,
                errorMessage: error.message,
            });
        } else {
            WorkspaceLogger.getInstance().error('Workspace operation failed with unknown error', {
                requestId,
                operation,
                workspaceId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private generateRequestId(): string {
        return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const workspaceManagementService = new WorkspaceManagementService();
