export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface LLMResponse {
    content: string;
    usage?: {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
    };
}

export interface LLMProvider {
    id: string;
    name: string;
    generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse>;
    stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void>;
}
