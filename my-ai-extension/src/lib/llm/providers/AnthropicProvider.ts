import Anthropic from '@anthropic-ai/sdk';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

export class AnthropicProvider implements LLMProvider {
    id = 'anthropic';
    name = 'Anthropic';

    private formatMessages(messages: LLMMessage[]): any[] {
        return messages.map(m => {
            if (Array.isArray(m.content)) {
                return {
                    role: m.role as 'user' | 'assistant',
                    content: m.content.map(c => {
                        if (c.type === 'text') return { type: 'text', text: c.text };
                        if (c.type === 'image_url') {
                            // OpenAi uses "data:image/jpeg;base64,..."
                            // Anthropic needs "base64" string and media_type
                            // We need to parse the data URL.
                            const matches = c.image_url.url.match(/^data:(.+);base64,(.+)$/);
                            if (matches) {
                                return {
                                    type: 'image',
                                    source: {
                                        type: 'base64',
                                        media_type: matches[1] as any,
                                        data: matches[2]
                                    }
                                };
                            }
                            return { type: 'text', text: '[Image Error]' };
                        }
                        return { type: 'text', text: '' };
                    })
                };
            }
            return { role: m.role as 'user' | 'assistant', content: m.content };
        });
    }

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

        const formatted = this.formatMessages(messages);

        const msg = await client.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: formatted,
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
        return { content: text };
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

        const formatted = this.formatMessages(messages);

        const stream = await client.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: formatted,
            stream: true,
        });

        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                onChunk(chunk.delta.text);
            }
        }
    }
}
