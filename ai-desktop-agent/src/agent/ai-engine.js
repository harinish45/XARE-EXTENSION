const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

class AIEngine {
    constructor(config) {
        this.anthropic = null;
        this.openai = null;
        this.provider = config.defaultProvider || 'anthropic';
        this.conversationHistory = [];

        // Initialize providers based on available keys
        if (config.anthropicKey) {
            this.anthropic = new Anthropic({
                apiKey: config.anthropicKey
            });
        }

        if (config.openaiKey) {
            this.openai = new OpenAI({
                apiKey: config.openaiKey
            });
        }

        // Fallback to available provider
        if (!this.anthropic && this.openai) {
            this.provider = 'openai';
        } else if (!this.openai && this.anthropic) {
            this.provider = 'anthropic';
        }
    }

    async chat(userMessage, systemContext = {}) {
        const message = {
            role: 'user',
            content: userMessage
        };

        this.conversationHistory.push(message);

        if (this.provider === 'anthropic' && this.anthropic) {
            return await this.chatAnthropic(systemContext);
        } else if (this.provider === 'openai' && this.openai) {
            return await this.chatOpenAI(systemContext);
        } else {
            throw new Error('No AI provider available. Please configure API keys.');
        }
    }

    async chatAnthropic(systemContext) {
        const systemPrompt = this.buildSystemPrompt(systemContext);

        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: this.conversationHistory
        });

        const assistantMessage = {
            role: 'assistant',
            content: response.content[0].text
        };

        this.conversationHistory.push(assistantMessage);

        return {
            text: response.content[0].text,
            actions: this.extractActions(response.content[0].text)
        };
    }

    async chatOpenAI(systemContext) {
        const systemPrompt = this.buildSystemPrompt(systemContext);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory
        ];

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: messages,
            max_tokens: 4096
        });

        const assistantMessage = {
            role: 'assistant',
            content: response.choices[0].message.content
        };

        this.conversationHistory.push(assistantMessage);

        return {
            text: response.choices[0].message.content,
            actions: this.extractActions(response.choices[0].message.content)
        };
    }

    async analyzeScreen(screenshotBase64, question) {
        if (this.provider === 'anthropic' && this.anthropic) {
            return await this.analyzeScreenAnthropic(screenshotBase64, question);
        } else if (this.provider === 'openai' && this.openai) {
            return await this.analyzeScreenOpenAI(screenshotBase64, question);
        } else {
            throw new Error('No AI provider available for vision analysis.');
        }
    }

    async analyzeScreenAnthropic(screenshotBase64, question) {
        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png',
                            data: screenshotBase64
                        }
                    },
                    {
                        type: 'text',
                        text: question || 'Describe what you see on this screen.'
                    }
                ]
            }]
        });

        return response.content[0].text;
    }

    async analyzeScreenOpenAI(screenshotBase64, question) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${screenshotBase64}`
                        }
                    },
                    {
                        type: 'text',
                        text: question || 'Describe what you see on this screen.'
                    }
                ]
            }],
            max_tokens: 2048
        });

        return response.choices[0].message.content;
    }

    buildSystemPrompt(context) {
        return `You are an AI desktop automation agent with access to system controls.

Current Context:
- Active Window: ${context.activeWindow?.title || 'Unknown'}
- Screen Resolution: ${context.screenSize || 'Unknown'}
- Available Actions: mouse_click, mouse_move, keyboard_type, open_app, file_operation, browser_navigate, screen_capture, screen_ocr

Your capabilities:
1. Control mouse and keyboard
2. Read and interact with any application
3. Manage files and folders
4. Automate browser tasks
5. Execute complex workflows
6. Analyze screenshots with vision AI

When the user gives you a task, break it down into specific actions and respond in this format:

THOUGHT: [Your reasoning about what needs to be done]
ACTIONS:
1. [action_name]: [parameters]
2. [action_name]: [parameters]

Available action types:
- mouse_move: {x: number, y: number}
- mouse_click: {button: 'left'|'right'|'middle'}
- mouse_drag: {startX, startY, endX, endY}
- mouse_scroll: {amount: number}
- keyboard_type: {text: string}
- keyboard_press: {key: string, modifiers: string[]}
- keyboard_shortcut: {shortcut: string}
- screen_capture: {}
- screen_ocr: {}
- file_read: {path: string}
- file_write: {path: string, content: string}
- file_copy: {from: string, to: string}
- file_move: {from: string, to: string}
- file_delete: {path: string}
- browser_navigate: {url: string}
- app_open: {name: string}
- app_close: {name: string}
- wait: {ms: number}

Always ask for confirmation before:
- Deleting files
- Sending emails/messages
- Making purchases
- Executing irreversible actions

Be helpful, efficient, and safe. If you're unsure about something, ask the user for clarification.`;
    }

    extractActions(responseText) {
        // Parse AI response to extract structured actions
        const actionRegex = /ACTIONS:\n([\s\S]*?)(?:\n\n|$)/;
        const match = responseText.match(actionRegex);

        if (!match) return [];

        const actionLines = match[1].split('\n').filter(line => line.trim());
        const actions = [];

        for (const line of actionLines) {
            const actionMatch = line.match(/\d+\.\s*(\w+):\s*(.+)/);
            if (actionMatch) {
                try {
                    const params = this.parseActionParams(actionMatch[2]);
                    actions.push({
                        type: actionMatch[1],
                        params: params
                    });
                } catch (error) {
                    console.error('Failed to parse action:', actionMatch[2], error);
                }
            }
        }

        return actions;
    }

    parseActionParams(paramString) {
        // Try to parse as JSON first
        try {
            return JSON.parse(paramString);
        } catch (e) {
            // If not JSON, return as string
            return paramString;
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    setProvider(provider) {
        if (provider === 'anthropic' && this.anthropic) {
            this.provider = 'anthropic';
        } else if (provider === 'openai' && this.openai) {
            this.provider = 'openai';
        } else {
            throw new Error(`Provider ${provider} not available`);
        }
    }

    getAvailableProviders() {
        const providers = [];
        if (this.anthropic) providers.push('anthropic');
        if (this.openai) providers.push('openai');
        return providers;
    }
}

module.exports = AIEngine;
