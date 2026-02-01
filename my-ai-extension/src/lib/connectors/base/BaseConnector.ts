// Connector System - Base architecture for external integrations

export interface ConnectorConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'productivity' | 'storage' | 'communication' | 'development';
    authType: 'oauth' | 'apikey' | 'none';
    enabled: boolean;
}

export interface ConnectorCapability {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export abstract class BaseConnector {
    protected config: ConnectorConfig;
    protected accessToken?: string;

    constructor(config: ConnectorConfig) {
        this.config = config;
    }

    abstract authenticate(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract getCapabilities(): ConnectorCapability[];
    abstract execute(capability: string, params: Record<string, any>): Promise<any>;

    getId(): string {
        return this.config.id;
    }

    getName(): string {
        return this.config.name;
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.config.enabled = enabled;
        await this.saveConfig();
    }

    protected async saveConfig(): Promise<void> {
        const key = `connector_${this.config.id}`;
        await chrome.storage.local.set({ [key]: this.config });
    }

    protected async loadConfig(): Promise<void> {
        const key = `connector_${this.config.id}`;
        const result = await chrome.storage.local.get(key);
        if (result[key]) {
            this.config = { ...this.config, ...result[key] };
        }
    }

    protected async saveToken(token: string): Promise<void> {
        const key = `connector_token_${this.config.id}`;
        await chrome.storage.local.set({ [key]: token });
        this.accessToken = token;
    }

    protected async loadToken(): Promise<string | undefined> {
        const key = `connector_token_${this.config.id}`;
        const result = await chrome.storage.local.get(key);
        this.accessToken = result[key];
        return this.accessToken;
    }
}

export class ConnectorRegistry {
    private connectors: Map<string, BaseConnector> = new Map();

    register(connector: BaseConnector): void {
        this.connectors.set(connector.getId(), connector);
    }

    get(id: string): BaseConnector | undefined {
        return this.connectors.get(id);
    }

    getAll(): BaseConnector[] {
        return Array.from(this.connectors.values());
    }

    getEnabled(): BaseConnector[] {
        return this.getAll().filter(c => c.isEnabled());
    }

    getByCategory(category: string): BaseConnector[] {
        return this.getAll().filter(c => (c as any).config.category === category);
    }
}

export const connectorRegistry = new ConnectorRegistry();
