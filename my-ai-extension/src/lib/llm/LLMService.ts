import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { PerplexityProvider } from './providers/PerplexityProvider';
import { AzureProvider } from './providers/AzureProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';
import { decryptApiKey } from '../security/KeyVault';

export class LLMService {
    private static instance: LLMService;
    private providers: Map<string, LLMProvider>;

    private constructor() {
        this.providers = new Map();
        this.registerProviders();
    }

    static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    private registerProviders() {
        const providerInstances: LLMProvider[] = [
            new OpenAIProvider(),
            new AnthropicProvider(),
            new GeminiProvider(),
            new PerplexityProvider(),
            new AzureProvider(),
            // DeepSeek, Ollama, OpenRouter use OpenAICompatibleProvider
            new OpenAICompatibleProvider('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'),
            new OpenAICompatibleProvider('ollama', 'Ollama (Local)', 'http://localhost:11434/v1', 'llava'),
            new OpenAICompatibleProvider('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'gpt-3.5-turbo')
        ];

        providerInstances.forEach(provider => {
            this.providers.set(provider.id, provider);
        });
    }

    async generate(providerId: string, messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        return provider.generate(messages, apiKey);
    }

    async stream(
        providerId: string,
        messages: LLMMessage[],
        apiKey: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        return provider.stream(messages, apiKey, onChunk);
    }

    static async getProviderConfig(providerId: string): Promise<{ apiKey: string }> {
        const keyName = `api_key_${providerId}`;
        const result = await chrome.storage.local.get(keyName) as Record<string, string>;

        if (result[keyName]) {
            try {
                const decryptedKey = await decryptApiKey(result[keyName]);
                return { apiKey: decryptedKey };
            } catch (e) {
                console.error(`Failed to decrypt key for ${providerId}:`, e);
                return { apiKey: '' };
            }
        }

        return { apiKey: '' };
    }
}

export const llmService = LLMService.getInstance();
