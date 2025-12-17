import OpenAI from 'openai';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

export class OpenAIProvider implements LLMProvider {
    id = 'openai';
    name = 'OpenAI';

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: 'gpt-4o',
        });
        return {
            content: completion.choices[0]?.message?.content || '',
        };
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const stream = await openai.chat.completions.create({
            messages: messages as any,
            model: 'gpt-4o',
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) onChunk(content);
        }
    }
}
