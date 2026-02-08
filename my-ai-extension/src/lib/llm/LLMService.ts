import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { PerplexityProvider } from './providers/PerplexityProvider';
import { AzureProvider } from './providers/AzureProvider';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';
import { decryptApiKey } from '../security/KeyVault';
import { providerHealthMonitor } from './ProviderHealthMonitor';
import { llmCostTracker } from './LLMCostTracker';

// Provider priority order for fallback (free providers first)
const PROVIDER_PRIORITY = [
    'ollama',       // Local, always free
    'deepseek',     // Free tier
    'gemini',       // Good free tier
    'openrouter',   // Various free models
    'perplexity',   // Free tier
    'openai',       // Paid fallback
    'anthropic',    // Paid fallback
    'azure'         // Enterprise fallback
];

export class LLMService {
    private static instance: LLMService;
    private providers: Map<string, LLMProvider>;
    private enableFallback: boolean = true;
    private maxRetries: number = 3;

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

    async chat(options: {
        messages: LLMMessage[];
        providerId?: string;
        stream?: boolean;
        onChunk?: (chunk: string) => void;
        enableFallback?: boolean;
    }): Promise<LLMResponse> {
        const enableFallback = options.enableFallback ?? this.enableFallback;

        if (enableFallback) {
            return this.chatWithFallback(options);
        }

        const providerId = options.providerId || 'anthropic';
        const { apiKey } = await LLMService.getProviderConfig(providerId);

        if (!apiKey) {
            throw new Error(`No API key configured for provider: ${providerId}`);
        }

        if (options.stream && options.onChunk) {
            await this.stream(providerId, options.messages, apiKey, options.onChunk);
            return { content: '' };
        }

        return await this.generate(providerId, options.messages, apiKey);
    }

    /**
     * Chat with automatic fallback to other providers on failure
     */
    private async chatWithFallback(options: {
        messages: LLMMessage[];
        providerId?: string;
        stream?: boolean;
        onChunk?: (chunk: string) => void;
    }): Promise<LLMResponse> {
        const requestedProvider = options.providerId;
        const providers = this.getProviderPriority(requestedProvider);

        let lastError: Error | null = null;
        const attemptedProviders: string[] = [];

        for (const providerId of providers) {
            // Check if provider is available
            if (!providerHealthMonitor.isProviderAvailable(providerId)) {
                console.log(`[LLMService] Skipping unavailable provider: ${providerId}`);
                continue;
            }

            // Check quota
            const provider = this.providers.get(providerId);
            if (!provider) continue;

            const model = this.getDefaultModel(providerId);
            if (!llmCostTracker.isWithinQuota(providerId, model)) {
                console.log(`[LLMService] Skipping ${providerId} - quota exceeded`);
                continue;
            }

            // Get API key
            const { apiKey } = await LLMService.getProviderConfig(providerId);
            if (!apiKey && providerId !== 'ollama') {
                console.log(`[LLMService] Skipping ${providerId} - no API key`);
                continue;
            }

            // Attempt request with retries
            for (let retry = 0; retry < this.maxRetries; retry++) {
                try {
                    attemptedProviders.push(providerId);
                    console.log(`[LLMService] Attempting ${providerId} (attempt ${retry + 1}/${this.maxRetries})`);

                    const startTime = Date.now();
                    let response: LLMResponse;

                    if (options.stream && options.onChunk) {
                        await this.stream(providerId, options.messages, apiKey, options.onChunk);
                        response = { content: '' };
                    } else {
                        response = await this.generate(providerId, options.messages, apiKey);
                    }

                    const duration = Date.now() - startTime;

                    // Record success
                    providerHealthMonitor.recordSuccess(providerId);

                    // Track usage (estimate tokens if not provided)
                    const estimatedTokens = this.estimateTokens(options.messages, response.content);
                    llmCostTracker.recordUsage(providerId, model, estimatedTokens);

                    console.log(`[LLMService] Success with ${providerId} in ${duration}ms`);
                    return response;

                } catch (error) {
                    lastError = error as Error;
                    console.error(`[LLMService] ${providerId} failed (attempt ${retry + 1}):`, error);

                    // Record failure
                    providerHealthMonitor.recordFailure(providerId);

                    // Exponential backoff before retry
                    if (retry < this.maxRetries - 1) {
                        const backoffMs = Math.pow(2, retry) * 1000;
                        await new Promise(resolve => setTimeout(resolve, backoffMs));
                    }
                }
            }
        }

        // All providers failed
        const errorMessage = `All providers failed. Attempted: ${attemptedProviders.join(', ')}. Last error: ${lastError?.message}`;
        console.error(`[LLMService] ${errorMessage}`);
        throw new Error(errorMessage);
    }

    /**
     * Get provider priority order
     */
    private getProviderPriority(requestedProvider?: string): string[] {
        if (requestedProvider) {
            // Try requested provider first, then fallback to priority order
            return [
                requestedProvider,
                ...PROVIDER_PRIORITY.filter(p => p !== requestedProvider)
            ];
        }
        return [...PROVIDER_PRIORITY];
    }

    /**
     * Get default model for a provider
     */
    private getDefaultModel(providerId: string): string {
        const modelMap: Record<string, string> = {
            'openai': 'gpt-3.5-turbo',
            'anthropic': 'claude-3-sonnet',
            'gemini': 'gemini-pro',
            'perplexity': 'llama-3.1-sonar-small-128k-online',
            'azure': 'gpt-35-turbo',
            'deepseek': 'deepseek-chat',
            'ollama': 'llava',
            'openrouter': 'gpt-3.5-turbo'
        };
        return modelMap[providerId] || 'default';
    }

    /**
     * Estimate token usage (rough approximation)
     */
    private estimateTokens(messages: LLMMessage[], response: string): {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } {
        // Rough estimate: 1 token ≈ 4 characters
        const promptText = messages.map(m => m.content).join(' ');
        const promptTokens = Math.ceil(promptText.length / 4);
        const completionTokens = Math.ceil(response.length / 4);

        return {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens
        };
    }

    /**
     * Get health status of all providers
     */
    getProviderHealthStatus() {
        return providerHealthMonitor.getAllProviderHealth();
    }

    /**
     * Get usage statistics
     */
    getUsageStatistics() {
        return llmCostTracker.getAllUsage();
    }

    /**
     * Get cost summary
     */
    getCostSummary() {
        return llmCostTracker.getSummary();
    }

    /**
     * Enable or disable automatic fallback
     */
    setFallbackEnabled(enabled: boolean) {
        this.enableFallback = enabled;
    }

    /**
     * Set maximum retries per provider
     */
    setMaxRetries(retries: number) {
        this.maxRetries = Math.max(1, retries);
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
