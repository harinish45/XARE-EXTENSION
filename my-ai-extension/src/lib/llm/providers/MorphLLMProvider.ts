import { apiConfigService } from '../../config/APIConfigService';

interface MorphLLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface MorphLLMRequest {
    model: string;
    messages: MorphLLMMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

interface MorphLLMResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

class MorphLLMProvider {
    /**
     * Send chat completion request to MorphLLM
     */
    async chat(
        messages: MorphLLMMessage[],
        options?: {
            temperature?: number;
            maxTokens?: number;
            stream?: boolean;
        }
    ): Promise<string> {
        const config = apiConfigService.getMorphLLMConfig();

        if (!config.apiKey) {
            throw new Error('MorphLLM API key not configured');
        }

        const request: MorphLLMRequest = {
            model: config.model,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
            stream: options?.stream || false,
        };

        try {
            const response = await fetch(`${config.endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`MorphLLM API error: ${response.statusText}`);
            }

            const data: MorphLLMResponse = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('MorphLLM error:', error);
            throw error;
        }
    }

    /**
     * Simple completion helper
     */
    async complete(prompt: string, systemPrompt?: string): Promise<string> {
        const messages: MorphLLMMessage[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        return this.chat(messages);
    }

    /**
     * Stream chat completion
     */
    async *streamChat(
        messages: MorphLLMMessage[],
        options?: {
            temperature?: number;
            maxTokens?: number;
        }
    ): AsyncGenerator<string, void, unknown> {
        const config = apiConfigService.getMorphLLMConfig();

        if (!config.apiKey) {
            throw new Error('MorphLLM API key not configured');
        }

        const request: MorphLLMRequest = {
            model: config.model,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
            stream: true,
        };

        const response = await fetch(`${config.endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`MorphLLM API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}

export const morphLLMProvider = new MorphLLMProvider();
