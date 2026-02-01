// Usage Analytics Tracker

export interface UsageStats {
    totalMessages: number;
    totalTokensEstimate: number;
    messagesByProvider: Record<string, number>;
    averageResponseTime: number;
    sessionsCount: number;
    lastUsed: number;
    dailyUsage: Record<string, number>; // date string -> count
}

const ANALYTICS_KEY = 'xare-analytics';

class UsageTracker {
    private stats: UsageStats;

    constructor() {
        this.stats = this.getDefaultStats();
        this.loadStats();
    }

    private getDefaultStats(): UsageStats {
        return {
            totalMessages: 0,
            totalTokensEstimate: 0,
            messagesByProvider: {},
            averageResponseTime: 0,
            sessionsCount: 0,
            lastUsed: Date.now(),
            dailyUsage: {},
        };
    }

    private async loadStats(): Promise<void> {
        const stored = await chrome.storage.local.get(ANALYTICS_KEY);
        if (stored[ANALYTICS_KEY]) {
            this.stats = { ...this.getDefaultStats(), ...stored[ANALYTICS_KEY] };
        }
    }

    private async saveStats(): Promise<void> {
        await chrome.storage.local.set({ [ANALYTICS_KEY]: this.stats });
    }

    async trackMessage(providerId: string, messageLength: number, responseTimeMs: number): Promise<void> {
        this.stats.totalMessages++;
        this.stats.totalTokensEstimate += Math.ceil(messageLength / 4); // Rough token estimate
        this.stats.messagesByProvider[providerId] = (this.stats.messagesByProvider[providerId] || 0) + 1;
        this.stats.lastUsed = Date.now();

        // Update average response time
        const prevTotal = this.stats.averageResponseTime * (this.stats.totalMessages - 1);
        this.stats.averageResponseTime = (prevTotal + responseTimeMs) / this.stats.totalMessages;

        // Track daily usage
        const today = new Date().toISOString().split('T')[0];
        this.stats.dailyUsage[today] = (this.stats.dailyUsage[today] || 0) + 1;

        await this.saveStats();
    }

    async trackSession(): Promise<void> {
        this.stats.sessionsCount++;
        await this.saveStats();
    }

    async getStats(): Promise<UsageStats> {
        await this.loadStats();
        return { ...this.stats };
    }

    async resetStats(): Promise<void> {
        this.stats = this.getDefaultStats();
        await this.saveStats();
    }

    // Get usage for last N days
    getRecentUsage(days: number = 7): { date: string; count: number }[] {
        const result: { date: string; count: number }[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                count: this.stats.dailyUsage[dateStr] || 0
            });
        }

        return result;
    }
}

export const usageTracker = new UsageTracker();
