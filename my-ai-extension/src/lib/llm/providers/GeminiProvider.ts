import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

export class GeminiProvider implements LLMProvider {
    id = 'gemini';
    name = 'Google Gemini';

    private formatHistory(messages: LLMMessage[]): any[] {
        return messages.map(m => {
            const parts = [];
            if (typeof m.content === 'string') {
                parts.push({ text: m.content });
            } else {
                m.content.forEach(c => {
                    if (c.type === 'text') parts.push({ text: c.text });
                    if (c.type === 'image_url') {
                        const matches = c.image_url.url.match(/^data:(.+);base64,(.+)$/);
                        if (matches) {
                            parts.push({
                                inlineData: {
                                    mimeType: matches[1],
                                    data: matches[2]
                                }
                            });
                        }
                    }
                });
            }
            return {
                role: m.role === 'assistant' ? 'model' : 'user',
                parts
            };
        });
    }

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Gemini history MUST start with a user message.
        let startIndex = messages.findIndex(m => m.role === 'user');
        if (startIndex === -1) startIndex = 0;

        const formatted = this.formatHistory(messages.slice(startIndex, -1));
        const lastMsg = this.formatHistory([messages[messages.length - 1]])[0];

        const chat = model.startChat({ history: formatted });
        const result = await chat.sendMessage(lastMsg.parts);

        const response = await result.response;
        return { content: response.text() };
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { temperature: 0.2 }
        });

        // QUIZ SOLVER SYSTEM INSTRUCTION - Shorter to avoid API errors
        const systemInstructionText = `You are analyzing the user's current browser screenshot. The image IS attached. 
Rules: 1) Never ask for the image or URL. 2) Answer quizzes immediately with "Correct Answer: <option>". 3) Summarize what you SEE. 4) For code, use fenced blocks with language tags.`;

        // Gemini history MUST start with a user message.
        let startIndex = messages.findIndex(m => m.role === 'user');
        if (startIndex === -1) startIndex = 0;

        const formatted = this.formatHistory(messages.slice(startIndex, -1));
        const lastMsg = this.formatHistory([messages[messages.length - 1]])[0]; // array of 1, take 0

        const chat = model.startChat({
            history: formatted,
            systemInstruction: { role: 'user', parts: [{ text: systemInstructionText }] }
        });
        const result = await chat.sendMessageStream(lastMsg.parts);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            onChunk(text);
        }
    }
}
