import { apiConfigService } from '../config/APIConfigService';

export interface ComposioTool {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface ComposioAction {
    name: string;
    appName: string;
    description: string;
    parameters?: Record<string, any>;
}

export interface ComposioExecuteOptions {
    action: string;
    params: Record<string, any>;
    entityId?: string;
}

export interface ComposioExecuteResult {
    success: boolean;
    data?: any;
    error?: string;
}

class ComposioService {
    /**
     * Get available tools/integrations
     */
    async getTools(): Promise<ComposioTool[]> {
        const config = apiConfigService.getComposioConfig();

        if (!config.apiKey) {
            throw new Error('Composio API key not configured');
        }

        try {
            const response = await fetch(`${config.endpoint}/tools`, {
                headers: {
                    'X-API-Key': config.apiKey,
                },
            });

            if (!response.ok) {
                throw new Error(`Composio API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.tools || [];
        } catch (error) {
            console.error('Composio get tools error:', error);
            throw error;
        }
    }

    /**
     * Get available actions for an app
     */
    async getActions(appName: string): Promise<ComposioAction[]> {
        const config = apiConfigService.getComposioConfig();

        if (!config.apiKey) {
            throw new Error('Composio API key not configured');
        }

        try {
            const response = await fetch(`${config.endpoint}/apps/${appName}/actions`, {
                headers: {
                    'X-API-Key': config.apiKey,
                },
            });

            if (!response.ok) {
                throw new Error(`Composio API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.actions || [];
        } catch (error) {
            console.error('Composio get actions error:', error);
            throw error;
        }
    }

    /**
     * Execute an action
     */
    async execute(options: ComposioExecuteOptions): Promise<ComposioExecuteResult> {
        const config = apiConfigService.getComposioConfig();

        if (!config.apiKey) {
            throw new Error('Composio API key not configured');
        }

        try {
            const response = await fetch(`${config.endpoint}/actions/${options.action}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.apiKey,
                },
                body: JSON.stringify({
                    params: options.params,
                    entityId: options.entityId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Composio API error: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data.result,
            };
        } catch (error) {
            console.error('Composio execute error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Connect an integration
     */
    async connect(appName: string, authConfig?: Record<string, any>): Promise<{ connectionId: string }> {
        const config = apiConfigService.getComposioConfig();

        if (!config.apiKey) {
            throw new Error('Composio API key not configured');
        }

        const response = await fetch(`${config.endpoint}/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.apiKey,
            },
            body: JSON.stringify({
                appName,
                authConfig,
            }),
        });

        if (!response.ok) {
            throw new Error(`Composio API error: ${response.statusText}`);
        }

        const data = await response.json();
        return { connectionId: data.connectionId };
    }

    /**
     * Quick actions for common integrations
     */
    async sendEmail(to: string, subject: string, body: string): Promise<ComposioExecuteResult> {
        return this.execute({
            action: 'gmail_send_email',
            params: { to, subject, body },
        });
    }

    async createCalendarEvent(
        title: string,
        startTime: string,
        endTime: string,
        description?: string
    ): Promise<ComposioExecuteResult> {
        return this.execute({
            action: 'google_calendar_create_event',
            params: { title, startTime, endTime, description },
        });
    }

    async createNotionPage(
        databaseId: string,
        properties: Record<string, any>
    ): Promise<ComposioExecuteResult> {
        return this.execute({
            action: 'notion_create_page',
            params: { databaseId, properties },
        });
    }

    async sendSlackMessage(channel: string, text: string): Promise<ComposioExecuteResult> {
        return this.execute({
            action: 'slack_send_message',
            params: { channel, text },
        });
    }
}

export const composioService = new ComposioService();
