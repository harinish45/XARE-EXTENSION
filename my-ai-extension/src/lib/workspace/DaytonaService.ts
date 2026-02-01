import { apiConfigService } from '../config/APIConfigService';

export interface DaytonaWorkspace {
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping';
    createdAt: string;
    repository?: string;
}

export interface DaytonaCreateWorkspaceOptions {
    name: string;
    repository?: string;
    branch?: string;
    envVars?: Record<string, string>;
}

class DaytonaService {
    /**
     * List all workspaces
     */
    async listWorkspaces(): Promise<DaytonaWorkspace[]> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        try {
            const response = await fetch(`${config.endpoint}/workspaces`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Daytona API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.workspaces || [];
        } catch (error) {
            console.error('Daytona list workspaces error:', error);
            throw error;
        }
    }

    /**
     * Create a new workspace
     */
    async createWorkspace(options: DaytonaCreateWorkspaceOptions): Promise<DaytonaWorkspace> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces`, {
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
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Start a workspace
     */
    async startWorkspace(workspaceId: string): Promise<void> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces/${workspaceId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }
    }

    /**
     * Stop a workspace
     */
    async stopWorkspace(workspaceId: string): Promise<void> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces/${workspaceId}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }
    }

    /**
     * Delete a workspace
     */
    async deleteWorkspace(workspaceId: string): Promise<void> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces/${workspaceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }
    }

    /**
     * Get workspace details
     */
    async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces/${workspaceId}`, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Execute command in workspace
     */
    async executeCommand(workspaceId: string, command: string): Promise<{ output: string }> {
        const config = apiConfigService.getDaytonaConfig();

        if (!config.apiKey) {
            throw new Error('Daytona API key not configured');
        }

        const response = await fetch(`${config.endpoint}/workspaces/${workspaceId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({ command }),
        });

        if (!response.ok) {
            throw new Error(`Daytona API error: ${response.statusText}`);
        }

        return await response.json();
    }
}

export const daytonaService = new DaytonaService();
