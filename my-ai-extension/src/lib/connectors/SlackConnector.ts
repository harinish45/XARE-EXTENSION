/**
 * Slack Connector
 * Integrates with Slack API for messaging and automation
 */

import { BaseConnector } from './BaseConnector';

export interface SlackMessage {
    channel: string;
    text: string;
    attachments?: any[];
    blocks?: any[];
    thread_ts?: string;
}

export interface SlackChannel {
    id: string;
    name: string;
    is_channel: boolean;
    is_group: boolean;
    is_im: boolean;
    is_private: boolean;
}

export class SlackConnector extends BaseConnector {
    private accessToken: string | null = null;
    private readonly apiBase = 'https://slack.com/api';

    constructor() {
        super('slack');
    }

    /**
     * Authenticate with Slack using OAuth token
     * @param accessToken - OAuth access token
     */
    async authenticate(accessToken: string): Promise<void> {
        this.accessToken = accessToken;
        this.isAuthenticated = true;
    }

    /**
     * Send a message to a channel
     * @param message - Message options
     * @returns Message timestamp
     */
    async sendMessage(message: SlackMessage): Promise<string> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const response = await fetch(`${this.apiBase}/chat.postMessage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Failed to send message: ${data.error}`);
        }

        return data.ts;
    }

    /**
     * Get channel history
     * @param channel - Channel ID
     * @param limit - Number of messages to retrieve
     * @returns Array of messages
     */
    async getChannelHistory(channel: string, limit: number = 100): Promise<any[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const params = new URLSearchParams({
            channel,
            limit: limit.toString()
        });

        const response = await fetch(`${this.apiBase}/conversations.history?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Failed to get channel history: ${data.error}`);
        }

        return data.messages || [];
    }

    /**
     * List all channels
     * @returns Array of channels
     */
    async listChannels(): Promise<SlackChannel[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const response = await fetch(`${this.apiBase}/conversations.list`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Failed to list channels: ${data.error}`);
        }

        return data.channels || [];
    }

    /**
     * Reply to a thread
     * @param channel - Channel ID
     * @param thread_ts - Thread timestamp
     * @param text - Reply text
     * @returns Message timestamp
     */
    async replyToThread(channel: string, thread_ts: string, text: string): Promise<string> {
        return this.sendMessage({
            channel,
            text,
            thread_ts
        });
    }

    /**
     * Add reaction to message
     * @param channel - Channel ID
     * @param timestamp - Message timestamp
     * @param name - Emoji name
     * @returns True if successful
     */
    async addReaction(channel: string, timestamp: string, name: string): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const response = await fetch(`${this.apiBase}/reactions.add`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel,
                timestamp,
                name
            })
        });

        const data = await response.json();
        return data.ok;
    }

    /**
     * Upload file to channel
     * @param channel - Channel ID
     * @param file - File content
     * @param filename - File name
     * @param title - File title
     * @returns File info
     */
    async uploadFile(channel: string, file: Blob, filename: string, title?: string): Promise<any> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const formData = new FormData();
        formData.append('channels', channel);
        formData.append('file', file, filename);
        if (title) formData.append('title', title);

        const response = await fetch(`${this.apiBase}/files.upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Failed to upload file: ${data.error}`);
        }

        return data.file;
    }

    /**
     * Get user info
     * @param userId - User ID
     * @returns User information
     */
    async getUserInfo(userId: string): Promise<any> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const params = new URLSearchParams({ user: userId });

        const response = await fetch(`${this.apiBase}/users.info?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Failed to get user info: ${data.error}`);
        }

        return data.user;
    }

    /**
     * Set user status
     * @param status_text - Status text
     * @param status_emoji - Status emoji
     * @returns True if successful
     */
    async setStatus(status_text: string, status_emoji: string): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Slack');
        }

        const response = await fetch(`${this.apiBase}/users.profile.set`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                profile: {
                    status_text,
                    status_emoji
                }
            })
        });

        const data = await response.json();
        return data.ok;
    }
}
