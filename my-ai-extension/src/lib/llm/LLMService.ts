import type { LLMProvider, LLMMessage, LLMResponse } from './types';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { PerplexityProvider } from './providers/PerplexityProvider';
import { AzureProvider } from './providers/AzureProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import { decryptApiKey } from '../security/KeyVault';

export interface ChatParams {
    messages: LLMMessage[];
    providerId?: string;
    stream?: boolean;
    onChunk?: (chunk: string) => void;
}

export interface ProviderConfig {
    apiKey: string;
    endpoint?: string;
}

export class LLMService {
    private providers: Map<string, LLMProvider> = new Map();

    private static instance: LLMService;
    private static retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
    };

    constructor() {
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new GeminiProvider());
        this.registerProvider(new PerplexityProvider());
        this.registerProvider(new AzureProvider());

        // Register Generic Providers
        this.registerProvider(new OpenAICompatibleProvider('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'));
        this.registerProvider(new OpenAICompatibleProvider('ollama', 'Ollama (Local)', 'http://localhost:11434/v1', 'llava'));
        this.registerProvider(new OpenAICompatibleProvider('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'google/gemini-2.0-flash-exp:free'));
        console.log("LLMService Initialized");
    }

    static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    registerProvider(provider: LLMProvider) {
        this.providers.set(provider.id, provider);
    }

    getProvider(id: string): LLMProvider | undefined {
        return this.providers.get(id);
    }

    /**
     * Main chat method with automatic retry and fallback
     */
    async chat(params: ChatParams): Promise<LLMResponse> {
        const { messages, providerId, stream, onChunk } = params;

        // Get provider (or use default)
        const provider = providerId || await this.getDefaultProvider();

        // Get API key
        const config = await LLMService.getProviderConfig(provider);

        if (!config.apiKey) {
            throw new Error(`No API key configured for ${provider}. Please configure it in Settings → LLM Providers.`);
        }

        // Get provider instance
        const client = this.getProvider(provider);
        if (!client) {
            throw new Error(`Provider ${provider} not found`);
        }

        // Try primary provider
        try {
            if (stream && onChunk) {
                await client.stream(messages, config.apiKey, onChunk);
                return { content: '' }; // Content accumulated via onChunk
            } else {
                return await this.chatWithRetry(client, messages, config.apiKey);
            }
        } catch (primaryError: any) {
            console.error(`Primary provider ${provider} failed:`, primaryError);

            // Fallback to alternative provider
            const fallback = await this.getFallbackProvider(provider);

            if (fallback) {
                console.log(`Falling back to ${fallback}...`);
                return await this.chat({
                    ...params,
                    providerId: fallback
                });
            }

            throw primaryError;
        }
    }

    /**
     * Chat with exponential backoff retry
     */
    private async chatWithRetry(
        client: LLMProvider,
        messages: LLMMessage[],
        apiKey: string,
        retryCount = 0
    ): Promise<LLMResponse> {
        try {
            return await client.generate(messages, apiKey);
        } catch (error: any) {
            if (retryCount >= LLMService.retryConfig.maxRetries) {
                throw error;
            }

            // Check if error is retryable
            if (LLMService.isRetryableError(error)) {
                const delay = Math.min(
                    LLMService.retryConfig.baseDelay * Math.pow(2, retryCount),
                    LLMService.retryConfig.maxDelay
                );

                console.log(`Retry ${retryCount + 1}/${LLMService.retryConfig.maxRetries} after ${delay}ms...`);

                await new Promise(resolve => setTimeout(resolve, delay));

                return await this.chatWithRetry(client, messages, apiKey, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Check if error is retryable
     */
    private static isRetryableError(error: any): boolean {
        if (!error) return false;

        const message = error.message?.toLowerCase() || '';
        const status = error.status || error.statusCode;

        // Retry on network errors
        if (message.includes('network') || message.includes('timeout')) {
            return true;
        }

        // Retry on rate limits
        if (status === 429) {
            return true;
        }

        // Retry on server errors
        if (status >= 500 && status < 600) {
            return true;
        }

        return false;
    }

    /**
     * Get provider configuration (API key, endpoint)
     */
    static async getProviderConfig(providerId: string): Promise<ProviderConfig> {
        const keyName = `api_key_${providerId}`;
        const endpointName = `api_endpoint_${providerId}`;

        const result = await chrome.storage.local.get([keyName, endpointName]) as Record<string, string>;

        if (!result[keyName]) {
            return { apiKey: '' };
        }

        try {
            const apiKey = await decryptApiKey(result[keyName]);
            return {
                apiKey,
                endpoint: result[endpointName]
            };
        } catch (e) {
            console.error('Failed to decrypt API key:', e);
            return { apiKey: '' };
        }
    }

    /**
     * Get default provider (first configured one)
     */
    private async getDefaultProvider(): Promise<string> {
        const providerIds = Array.from(this.providers.keys());

        for (const id of providerIds) {
            const config = await LLMService.getProviderConfig(id);
            if (config.apiKey) {
                return id;
            }
        }

        throw new Error('No LLM provider configured. Please add an API key in Settings → LLM Providers.');
    }

    /**
     * Get fallback provider chain
     */
    private async getFallbackProvider(failedProvider: string): Promise<string | null> {
        const fallbackChain: Record<string, string[]> = {
            'openai': ['anthropic', 'gemini', 'openrouter'],
            'anthropic': ['openai', 'gemini', 'openrouter'],
            'gemini': ['openrouter', 'openai'],
            'perplexity': ['openrouter', 'gemini'],
            'azure': ['openai', 'openrouter'],
            'deepseek': ['openrouter', 'gemini'],
            'ollama': ['openai', 'gemini']
        };

        const fallbacks = fallbackChain[failedProvider] || [];

        // Find first configured fallback
        for (const fallback of fallbacks) {
            const config = await LLMService.getProviderConfig(fallback);
            if (config.apiKey) {
                return fallback;
            }
        }

        return null;
    }

    async streamResponse(
        providerId: string,
        messages: LLMMessage[],
        apiKey: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        await provider.stream(messages, apiKey, onChunk);
    }
}

export const llmService = LLMService.getInstance();
