import OpenAI from 'openai';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

export class OpenAICompatibleProvider implements LLMProvider {
    id: string;
    name: string;
    baseUrl: string;
    model: string;

    constructor(id: string, name: string, baseUrl: string, model: string) {
        this.id = id;
        this.name = name;
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const openai = new OpenAI({
            apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true,
        });
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: this.model,
        });
        return {
            content: completion.choices[0]?.message?.content || '',
        };
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const openai = new OpenAI({
            apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true,
        });
        const stream = await openai.chat.completions.create({
            messages: messages as any,
            model: this.model,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) onChunk(content);
        }
    }
}
