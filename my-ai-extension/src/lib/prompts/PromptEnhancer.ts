// Prompt Enhancer Service
// Uses the active LLM to improve user prompts

export interface EnhancedPrompt {
    original: string;
    enhanced: string;
    suggestions?: string[];
}

export const ENHANCE_SYSTEM_PROMPT = `You are a prompt enhancement expert. Your job is to take a user's rough prompt and make it clearer, more specific, and more effective.

Rules:
- Keep the user's original intent
- Add relevant context and specificity
- Use clear, direct language
- Make it actionable
- Don't add unnecessary fluff
- Keep similar length unless more detail helps

Return ONLY the enhanced prompt, no explanations.`;

export const PROMPT_TEMPLATES = [
    {
        id: 'summarize',
        name: 'Summarize',
        icon: 'FileText',
        description: 'Get key points from content',
        prompt: 'Summarize the main points of this content in a clear, concise bullet list. Focus on the most important information.',
    },
    {
        id: 'explain',
        name: 'Explain Simply',
        icon: 'Lightbulb',
        description: 'Explain like I\'m 5',
        prompt: 'Explain this in simple terms that anyone can understand. Use analogies and avoid jargon.',
    },
    {
        id: 'code_review',
        name: 'Code Review',
        icon: 'Code',
        description: 'Review code for issues',
        prompt: 'Review this code for bugs, security issues, performance problems, and best practices. Provide specific suggestions for improvement.',
    },
    {
        id: 'translate',
        name: 'Translate',
        icon: 'Languages',
        description: 'Translate to another language',
        prompt: 'Translate the following text to [TARGET_LANGUAGE], preserving the original meaning and tone:',
    },
    {
        id: 'brainstorm',
        name: 'Brainstorm',
        icon: 'Sparkles',
        description: 'Generate creative ideas',
        prompt: 'Brainstorm 5-10 creative ideas for the following. Think outside the box and include both practical and innovative suggestions:',
    },
    {
        id: 'pros_cons',
        name: 'Pros & Cons',
        icon: 'Scale',
        description: 'Analyze trade-offs',
        prompt: 'Analyze the pros and cons of this decision/topic. Be balanced and thorough, considering multiple perspectives.',
    },
    {
        id: 'step_by_step',
        name: 'Step by Step',
        icon: 'ListOrdered',
        description: 'Break into steps',
        prompt: 'Break this down into clear, numbered steps. Be specific and actionable for each step.',
    },
    {
        id: 'debug',
        name: 'Debug Help',
        icon: 'Bug',
        description: 'Fix errors and bugs',
        prompt: 'Help me debug this issue. Identify the root cause and provide a working solution with explanation.',
    },
    {
        id: 'rewrite',
        name: 'Rewrite',
        icon: 'RefreshCw',
        description: 'Improve writing',
        prompt: 'Rewrite this to be clearer, more engaging, and professional while keeping the core message intact.',
    },
    {
        id: 'extract_data',
        name: 'Extract Data',
        icon: 'Database',
        description: 'Pull structured data',
        prompt: 'Extract the key data points from this content and present them in a structured format (table or JSON).',
    },
];

export class PromptEnhancer {
    async enhance(
        prompt: string,
        apiKey: string,
        providerId: string,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        return new Promise((resolve) => {
            const port = chrome.runtime.connect({ name: 'llm-stream' });
            let response = '';

            port.onMessage.addListener((msg) => {
                if (msg.type === 'CHUNK') {
                    response += msg.content;
                    onChunk?.(msg.content);
                } else if (msg.type === 'DONE' || msg.type === 'ERROR') {
                    port.disconnect();
                    resolve(response.trim());
                }
            });

            port.postMessage({
                action: 'GENERATE_STREAM',
                data: {
                    providerId,
                    messages: [
                        { role: 'system', content: ENHANCE_SYSTEM_PROMPT },
                        { role: 'user', content: `Enhance this prompt:\n\n"${prompt}"` }
                    ],
                    apiKey
                }
            });
        });
    }
}

export const promptEnhancer = new PromptEnhancer();
