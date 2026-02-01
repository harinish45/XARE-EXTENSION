// Conversation Memory Service

export interface ConversationMemory {
    userId: string;
    preferences: Record<string, any>;
    topics: string[];
    facts: Record<string, string>;
    lastInteraction: number;
}

export class ConversationMemoryService {
    private memory: ConversationMemory = {
        userId: 'default',
        preferences: {},
        topics: [],
        facts: {},
        lastInteraction: Date.now()
    };

    // Remember user preference
    async rememberPreference(key: string, value: any): Promise<void> {
        this.memory.preferences[key] = value;
        await this.save();
    }

    // Get user preference
    getPreference(key: string): any {
        return this.memory.preferences[key];
    }

    // Remember a fact
    async rememberFact(key: string, value: string): Promise<void> {
        this.memory.facts[key] = value;
        await this.save();
    }

    // Recall a fact
    recallFact(key: string): string | undefined {
        return this.memory.facts[key];
    }

    // Add topic to conversation history
    async addTopic(topic: string): Promise<void> {
        if (!this.memory.topics.includes(topic)) {
            this.memory.topics.push(topic);
            if (this.memory.topics.length > 50) {
                this.memory.topics.shift(); // Keep last 50 topics
            }
            await this.save();
        }
    }

    // Get conversation topics
    getTopics(): string[] {
        return this.memory.topics;
    }

    // Get context summary
    getContextSummary(): string {
        const prefs = Object.entries(this.memory.preferences)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');

        const recentTopics = this.memory.topics.slice(-5).join(', ');

        return `User preferences: ${prefs || 'none'}. Recent topics: ${recentTopics || 'none'}.`;
    }

    // Save to storage
    private async save(): Promise<void> {
        this.memory.lastInteraction = Date.now();
        await chrome.storage.local.set({ 'xare-memory': this.memory });
    }

    // Load from storage
    async load(): Promise<void> {
        const result = await chrome.storage.local.get('xare-memory');
        if (result['xare-memory']) {
            this.memory = result['xare-memory'];
        }
    }

    // Clear memory
    async clear(): Promise<void> {
        this.memory = {
            userId: 'default',
            preferences: {},
            topics: [],
            facts: {},
            lastInteraction: Date.now()
        };
        await this.save();
    }
}

export const conversationMemoryService = new ConversationMemoryService();
