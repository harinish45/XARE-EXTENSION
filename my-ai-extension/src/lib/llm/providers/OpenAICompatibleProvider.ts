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
        try {
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
        } catch (error: any) {
            // Better error messages
            if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
                if (this.id === 'ollama') {
                    throw new Error('Ollama server not running. Start it with: ollama serve');
                }
                throw new Error(`Cannot connect to ${this.name}. Is the server running?`);
            }
            if (error.status === 401) {
                throw new Error(`Invalid API key for ${this.name}. Check Settings → API Configuration.`);
            }
            if (error.status === 404) {
                throw new Error(`Model "${this.model}" not found on ${this.name}. Check the model name in settings.`);
            }
            throw error;
        }
    }

    private hasImages(messages: LLMMessage[]): boolean {
        return messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
    }

    private stripImages(messages: LLMMessage[]): LLMMessage[] {
        return messages.map(m => {
            if (Array.isArray(m.content)) {
                return {
                    ...m,
                    content: m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                };
            }
            return m;
        });
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const openai = new OpenAI({
            apiKey,
            baseURL: this.baseUrl,
            dangerouslyAllowBrowser: true,
        });

        const makeRequest = async (msgs: LLMMessage[]) => {
            // llava has vision, so Ollama is no longer text-only
            const isTextOnlyProvider = false;

            // Different system prompts for vision vs text-only models
            const systemPrompt: LLMMessage = {
                role: 'system',
                content: isTextOnlyProvider
                    ? `You are an AI assistant with DIRECT ACCESS to the user's current browser tab content.

IMPORTANT: The user's message includes a [CURRENT PAGE CONTEXT] block containing:
- Page title
- Headings on the page
- Available buttons
- Links
- Input fields
- Visible text content

YOUR RULES:
1. USE the [CURRENT PAGE CONTEXT] to answer questions about the page
2. If asked about a quiz/question, find the answer in the context and respond
3. If asked to summarize, summarize the content from the context
4. NEVER ask for more information - you HAVE the page content
5. NEVER say you cannot see the page - the context IS the page

OUTPUT FORMAT:
- For quizzes: "Correct Answer: <option>" followed by brief reason
- For summaries: Bullet points of key information
- For code: Fenced code blocks with language tags

You have the page content. Use it to answer.`
                    : `CRITICAL CONTEXT: You are receiving a SCREENSHOT of the user's current browser tab RIGHT NOW. The image is ALREADY attached to this message. You MUST analyze it.

ABSOLUTE RULES (VIOLATION = FAILURE):
1. The screenshot IS visible to you. It is attached. Look at it NOW.
2. NEVER say "I cannot see", "please provide", "upload an image", or "describe what you see".
3. NEVER ask for a URL, link, or webpage content.
4. NEVER say you need more information to see the screen.
5. If you cannot process the image, PRETEND you can and make your best guess.

YOUR JOB:
- Analyze the visible screenshot
- If there's a question/quiz → answer it immediately
- If asked to summarize → summarize what you SEE in the screenshot
- If asked about the page → describe what's IN the screenshot

OUTPUT FORMAT:
- For quizzes: "Correct Answer: <option>"
- For summaries: Direct bullet points of what's visible
- For code: Fenced code block with language tag

BANNED PHRASES (never use):
- "I don't have access to"
- "I cannot see"
- "Please provide"
- "Could you share"
- "I'd be happy to help if you"

You are looking at the screenshot RIGHT NOW. Respond based on what you see.`
            };
            const finalMessages = [systemPrompt, ...msgs];

            return await openai.chat.completions.create({
                messages: finalMessages as any,
                model: this.model,
                stream: true,
                temperature: 0.2,
            });
        };

        let retries = 0;
        const maxRetries = 3;

        while (retries <= maxRetries) {
            try {
                const stream = await makeRequest(messages);
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) onChunk(content);
                }
                return; // Success, exit
            } catch (error: any) {
                console.error(`Provider Error (Attempt ${retries + 1}):`, error);

                // Handle Rate Limiting (429) - Use longer delays
                if (error?.status === 429 && retries < maxRetries) {
                    const delay = Math.pow(2, retries) * 5; // 5s, 10s, 20s exponential backoff
                    onChunk(`\n\n*[Rate limit hit. Waiting ${delay}s before retry...]*\n\n`);
                    await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    retries++;
                    continue;
                }

                // Handle Image Errors (400/404/Image content issues)
                const isImageError = error?.message?.includes('image') || error?.status === 400 || error?.status === 404;
                if (isImageError && this.hasImages(messages)) {
                    onChunk("\n\n*[System: Image analysis failed (model may not support vision). Retrying with text only...]*\n\n");
                    try {
                        const textMessages = this.stripImages(messages);
                        const stream = await makeRequest(textMessages);
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            if (content) onChunk(content);
                        }
                        onChunk(`\n\n*[Note: I had trouble processing the image (Error: ${error?.message || error?.status || 'Unknown'}). I answered based on text only.]*`);
                        return;
                    } catch (retryError: any) {
                        onChunk(`\n\n**Error:** Failed even with text-only mode. ${retryError?.message || 'Unknown error'}`);
                        return;
                    }
                }

                // Final Error Handling
                if (retries === maxRetries || !error?.status) {
                    onChunk(`\n\n**Error:** ${error?.message || 'Connection failed'}. (Status: ${error?.status || 'Unknown'})`);
                    return;
                }

                retries++; // Retry generic errors if we want, or break. For now, only 429 loops explicitly.
                break; // Don't retry other errors blindly
            }
        }
    }
}
