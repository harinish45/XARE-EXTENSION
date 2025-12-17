import type { LLMProvider, LLMMessage } from './types';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { PerplexityProvider } from './providers/PerplexityProvider';
import { AzureProvider } from './providers/AzureProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';

export class LLMService {
    private providers: Map<string, LLMProvider> = new Map();

    constructor() {
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new GeminiProvider());
        this.registerProvider(new PerplexityProvider());
        this.registerProvider(new AzureProvider());

        // Register Generic Providers
        this.registerProvider(new OpenAICompatibleProvider('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'));
        this.registerProvider(new OpenAICompatibleProvider('ollama', 'Ollama (Local)', 'http://localhost:11434/v1', 'llama3'));
        this.registerProvider(new OpenAICompatibleProvider('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'openai/gpt-3.5-turbo'));
    }

    registerProvider(provider: LLMProvider) {
        this.providers.set(provider.id, provider);
    }

    getProvider(id: string): LLMProvider | undefined {
        return this.providers.get(id);
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

export const llmService = new LLMService();
