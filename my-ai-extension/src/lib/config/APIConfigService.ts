// API Configuration for XARE Extension
// Stores API keys and endpoints for all integrated services

export interface APIConfig {
    daytona: {
        apiKey: string;
        endpoint: string;
    };
    morphllm: {
        apiKey: string;
        endpoint: string;
        model: string;
    };
    tavily: {
        apiKey: string;
        endpoint: string;
    };
    firecrawl: {
        apiKey: string;
        endpoint: string;
    };
    composio: {
        apiKey: string;
        endpoint: string;
    };
}

class APIConfigService {
    private config: Partial<APIConfig> = {};

    /**
     * Initialize API configuration from storage
     */
    async initialize(): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('apiConfig');
            if (stored.apiConfig) {
                this.config = stored.apiConfig;
            }
        } catch (error) {
            console.error('Failed to load API config:', error);
        }
    }

    /**
     * Save API configuration to storage
     */
    async save(config: Partial<APIConfig>): Promise<void> {
        this.config = { ...this.config, ...config };
        await chrome.storage.local.set({ apiConfig: this.config });
    }

    /**
     * Get Daytona configuration
     */
    getDaytonaConfig() {
        return this.config.daytona || {
            apiKey: '',
            endpoint: 'https://api.daytona.io/v1',
        };
    }

    /**
     * Get MorphLLM configuration
     */
    getMorphLLMConfig() {
        return this.config.morphllm || {
            apiKey: '',
            endpoint: 'https://api.morphllm.com/v1',
            model: 'morph-1',
        };
    }

    /**
     * Get Tavily configuration
     */
    getTavilyConfig() {
        return this.config.tavily || {
            apiKey: '',
            endpoint: 'https://api.tavily.com/search',
        };
    }

    /**
     * Get Firecrawl configuration
     */
    getFirecrawlConfig() {
        return this.config.firecrawl || {
            apiKey: '',
            endpoint: 'https://api.firecrawl.dev/v0',
        };
    }

    /**
     * Get Composio configuration
     */
    getComposioConfig() {
        return this.config.composio || {
            apiKey: '',
            endpoint: 'https://api.composio.dev/v1',
        };
    }

    /**
     * Set Daytona API key
     */
    async setDaytonaKey(apiKey: string): Promise<void> {
        await this.save({
            daytona: { ...this.getDaytonaConfig(), apiKey },
        });
    }

    /**
     * Set MorphLLM API key
     */
    async setMorphLLMKey(apiKey: string, model?: string): Promise<void> {
        await this.save({
            morphllm: { ...this.getMorphLLMConfig(), apiKey, model: model || 'morph-1' },
        });
    }

    /**
     * Set Tavily API key
     */
    async setTavilyKey(apiKey: string): Promise<void> {
        await this.save({
            tavily: { ...this.getTavilyConfig(), apiKey },
        });
    }

    /**
     * Set Firecrawl API key
     */
    async setFirecrawlKey(apiKey: string): Promise<void> {
        await this.save({
            firecrawl: { ...this.getFirecrawlConfig(), apiKey },
        });
    }

    /**
     * Set Composio API key
     */
    async setComposioKey(apiKey: string): Promise<void> {
        await this.save({
            composio: { ...this.getComposioConfig(), apiKey },
        });
    }

    /**
     * Check if all APIs are configured
     */
    isFullyConfigured(): boolean {
        return !!(
            this.config.daytona?.apiKey &&
            this.config.morphllm?.apiKey &&
            this.config.tavily?.apiKey &&
            this.config.firecrawl?.apiKey &&
            this.config.composio?.apiKey
        );
    }

    /**
     * Get missing API keys
     */
    getMissingKeys(): string[] {
        const missing: string[] = [];
        if (!this.config.daytona?.apiKey) missing.push('Daytona');
        if (!this.config.morphllm?.apiKey) missing.push('MorphLLM');
        if (!this.config.tavily?.apiKey) missing.push('Tavily');
        if (!this.config.firecrawl?.apiKey) missing.push('Firecrawl');
        if (!this.config.composio?.apiKey) missing.push('Composio');
        return missing;
    }
}

export const apiConfigService = new APIConfigService();
