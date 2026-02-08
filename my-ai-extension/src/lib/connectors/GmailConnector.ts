/**
 * Gmail Connector
 * Integrates with Gmail API for email operations
 */

import { BaseConnector } from './BaseConnector';

export interface GmailMessage {
    id: string;
    threadId: string;
    from: string;
    to: string[];
    subject: string;
    body: string;
    date: Date;
    labels: string[];
    attachments?: Array<{
        filename: string;
        mimeType: string;
        size: number;
        attachmentId: string;
    }>;
}

export interface GmailSendOptions {
    to: string | string[];
    subject: string;
    body: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        mimeType?: string;
    }>;
}

export class GmailConnector extends BaseConnector {
    private accessToken: string | null = null;
    private readonly apiBase = 'https://gmail.googleapis.com/gmail/v1';

    constructor() {
        super('gmail');
    }

    /**
     * Authenticate with Gmail using OAuth 2.0
     * @param accessToken - OAuth access token
     */
    async authenticate(accessToken: string): Promise<void> {
        this.accessToken = accessToken;
        this.isAuthenticated = true;
    }

    /**
     * Send an email
     * @param options - Email options
     * @returns Message ID
     */
    async sendEmail(options: GmailSendOptions): Promise<string> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const message = this.createMimeMessage(options);
        const encodedMessage = Buffer.from(message).toString('base64url');

        const response = await fetch(`${this.apiBase}/users/me/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raw: encodedMessage
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`);
        }

        const data = await response.json();
        return data.id;
    }

    /**
     * Get messages from inbox
     * @param maxResults - Maximum number of messages to retrieve
     * @param query - Gmail search query
     * @returns Array of messages
     */
    async getMessages(maxResults: number = 10, query: string = ''): Promise<GmailMessage[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const params = new URLSearchParams({
            maxResults: maxResults.toString(),
            ...(query && { q: query })
        });

        const response = await fetch(`${this.apiBase}/users/me/messages?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get messages: ${response.statusText}`);
        }

        const data = await response.json();
        const messages: GmailMessage[] = [];

        for (const msg of data.messages || []) {
            const fullMessage = await this.getMessage(msg.id);
            if (fullMessage) {
                messages.push(fullMessage);
            }
        }

        return messages;
    }

    /**
     * Get a specific message
     * @param messageId - Message ID
     * @returns Message details
     */
    async getMessage(messageId: string): Promise<GmailMessage | null> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const response = await fetch(`${this.apiBase}/users/me/messages/${messageId}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return this.parseMessage(data);
    }

    /**
     * Search emails
     * @param query - Gmail search query
     * @param maxResults - Maximum results
     * @returns Array of messages
     */
    async searchEmails(query: string, maxResults: number = 10): Promise<GmailMessage[]> {
        return this.getMessages(maxResults, query);
    }

    /**
     * Delete a message
     * @param messageId - Message ID
     * @returns True if deleted
     */
    async deleteMessage(messageId: string): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const response = await fetch(`${this.apiBase}/users/me/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        return response.ok;
    }

    /**
     * Add labels to message
     * @param messageId - Message ID
     * @param labelIds - Array of label IDs
     * @returns True if successful
     */
    async addLabels(messageId: string, labelIds: string[]): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const response = await fetch(`${this.apiBase}/users/me/messages/${messageId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addLabelIds: labelIds
            })
        });

        return response.ok;
    }

    /**
     * Remove labels from message
     * @param messageId - Message ID
     * @param labelIds - Array of label IDs
     * @returns True if successful
     */
    async removeLabels(messageId: string, labelIds: string[]): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const response = await fetch(`${this.apiBase}/users/me/messages/${messageId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                removeLabelIds: labelIds
            })
        });

        return response.ok;
    }

    /**
     * Get all labels
     * @returns Array of labels
     */
    async getLabels(): Promise<Array<{ id: string; name: string; type: string }>> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Gmail');
        }

        const response = await fetch(`${this.apiBase}/users/me/labels`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get labels: ${response.statusText}`);
        }

        const data = await response.json();
        return data.labels || [];
    }

    /**
     * Mark message as read
     * @param messageId - Message ID
     * @returns True if successful
     */
    async markAsRead(messageId: string): Promise<boolean> {
        return this.removeLabels(messageId, ['UNREAD']);
    }

    /**
     * Mark message as unread
     * @param messageId - Message ID
     * @returns True if successful
     */
    async markAsUnread(messageId: string): Promise<boolean> {
        return this.addLabels(messageId, ['UNREAD']);
    }

    /**
     * Create MIME message
     * @param options - Email options
     * @returns MIME message string
     */
    private createMimeMessage(options: GmailSendOptions): string {
        const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        const cc = options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : '';
        const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : '';

        let message = [
            `To: ${to}`,
            ...(cc ? [`Cc: ${cc}`] : []),
            ...(bcc ? [`Bcc: ${bcc}`] : []),
            `Subject: ${options.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            options.body
        ].join('\r\n');

        return message;
    }

    /**
     * Parse Gmail API message to GmailMessage
     * @param data - Raw message data from API
     * @returns Parsed message
     */
    private parseMessage(data: any): GmailMessage {
        const headers = data.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

        return {
            id: data.id,
            threadId: data.threadId,
            from: getHeader('From'),
            to: getHeader('To').split(',').map((e: string) => e.trim()),
            subject: getHeader('Subject'),
            body: this.extractBody(data.payload),
            date: new Date(parseInt(data.internalDate)),
            labels: data.labelIds || []
        };
    }

    /**
     * Extract email body from payload
     * @param payload - Message payload
     * @returns Email body
     */
    private extractBody(payload: any): string {
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
                    if (part.body?.data) {
                        return Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }
                }
            }
        }

        return '';
    }
}
