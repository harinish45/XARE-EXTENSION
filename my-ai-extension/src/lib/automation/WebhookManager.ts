// Webhook Manager

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string;
}

export class WebhookManager {
    private webhooks: Map<string, Webhook> = new Map();

    async register(webhook: Omit<Webhook, 'id'>): Promise<string> {
        const id = Date.now().toString();
        const newWebhook: Webhook = { ...webhook, id };
        this.webhooks.set(id, newWebhook);
        await this.saveWebhooks();
        return id;
    }

    async unregister(id: string): Promise<void> {
        this.webhooks.delete(id);
        await this.saveWebhooks();
    }

    async trigger(event: string, data: any): Promise<void> {
        const webhooksToTrigger = Array.from(this.webhooks.values())
            .filter(webhook => webhook.enabled && webhook.events.includes(event));

        await Promise.all(
            webhooksToTrigger.map(webhook => this.sendWebhook(webhook, event, data))
        );
    }

    private async sendWebhook(webhook: Webhook, event: string, data: any): Promise<void> {
        try {
            const payload = {
                event,
                data,
                timestamp: Date.now()
            };

            await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret })
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error(`Failed to send webhook to ${webhook.url}:`, error);
        }
    }

    private async saveWebhooks(): Promise<void> {
        const webhooksArray = Array.from(this.webhooks.values());
        await chrome.storage.local.set({ 'xare-webhooks': webhooksArray });
    }

    async loadWebhooks(): Promise<void> {
        const result = await chrome.storage.local.get('xare-webhooks');
        if (result['xare-webhooks']) {
            result['xare-webhooks'].forEach((webhook: Webhook) => {
                this.webhooks.set(webhook.id, webhook);
            });
        }
    }
}

export const webhookManager = new WebhookManager();
