const { Ollama } = require('ollama');
const fs = require('fs');
const path = require('path');

class OllamaEngine {
    constructor(config = {}) {
        this.ollama = new Ollama({
            host: config.host || process.env.OLLAMA_HOST || 'http://localhost:11434'
        });

        this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2';
        this.visionModel = config.visionModel || process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision';
        this.conversationHistory = [];
        this.systemPrompt = this.buildSystemPrompt();
    }

    async chat(userMessage, systemContext = {}) {
        const message = {
            role: 'user',
            content: userMessage
        };

        this.conversationHistory.push(message);

        try {
            const response = await this.ollama.chat({
                model: this.model,
                messages: [
                    { role: 'system', content: this.buildSystemPrompt(systemContext) },
                    ...this.conversationHistory
                ],
                stream: false
            });

            const assistantMessage = {
                role: 'assistant',
                content: response.message.content
            };

            this.conversationHistory.push(assistantMessage);

            return {
                text: response.message.content,
                actions: this.extractActions(response.message.content)
            };
        } catch (error) {
            console.error('Ollama chat error:', error);
            throw new Error(`AI chat failed: ${error.message}`);
        }
    }

    async analyzeScreen(screenshotBase64, question) {
        try {
            const response = await this.ollama.chat({
                model: this.visionModel,
                messages: [{
                    role: 'user',
                    content: question || 'Describe what you see on this screen in detail.',
                    images: [screenshotBase64]
                }],
                stream: false
            });

            return response.message.content;
        } catch (error) {
            console.error('Vision analysis error:', error);
            throw new Error(`Vision analysis failed: ${error.message}`);
        }
    }

    async streamChat(userMessage, systemContext = {}, onChunk) {
        const message = {
            role: 'user',
            content: userMessage
        };

        this.conversationHistory.push(message);

        let fullResponse = '';

        try {
            const stream = await this.ollama.chat({
                model: this.model,
                messages: [
                    { role: 'system', content: this.buildSystemPrompt(systemContext) },
                    ...this.conversationHistory
                ],
                stream: true
            });

            for await (const chunk of stream) {
                const content = chunk.message.content;
                fullResponse += content;
                if (onChunk) {
                    onChunk(content);
                }
            }

            const assistantMessage = {
                role: 'assistant',
                content: fullResponse
            };

            this.conversationHistory.push(assistantMessage);

            return {
                text: fullResponse,
                actions: this.extractActions(fullResponse)
            };
        } catch (error) {
            console.error('Ollama stream error:', error);
            throw new Error(`AI stream failed: ${error.message}`);
        }
    }

    buildSystemPrompt(context = {}) {
        return `You are an AI desktop automation agent with full system access and control.

Current Context:
- Active Window: ${context.activeWindow || 'Unknown'}
- Screen Resolution: ${context.screenSize || 'Unknown'}
- Operating System: Windows
- Available Actions: mouse_click, mouse_move, mouse_drag, mouse_scroll, keyboard_type, keyboard_press, keyboard_shortcut, screen_capture, screen_ocr, file_read, file_write, file_copy, file_move, file_delete, browser_navigate, browser_click, browser_type, app_open, app_close, wait

Your capabilities:
1. Control mouse and keyboard with pixel-perfect precision
2. Read and interact with any application on screen
3. Manage files and folders
4. Automate browser tasks
5. Execute complex multi-step workflows
6. Analyze screenshots using vision AI

When the user gives you a task, break it down into specific actions and respond in this format:

THOUGHT: [Your reasoning about how to accomplish the task]

ACTIONS:
1. action_name: {"param1": "value1", "param2": "value2"}
2. action_name: {"param": "value"}
...

Example:
User: "Open Notepad and type Hello World"

THOUGHT: I need to open Notepad application and then type the text.

ACTIONS:
1. app_open: {"name": "notepad"}
2. wait: {"ms": 1000}
3. keyboard_type: {"text": "Hello World"}

Safety Rules:
- Always ask for confirmation before:
  * Deleting files or folders
  * Sending emails or messages
  * Making purchases or financial transactions
  * Executing irreversible system changes
- If unsure about a command, ask for clarification
- Explain what you're about to do before destructive actions

Be helpful, efficient, precise, and safe. Always explain your reasoning.`;
    }

    extractActions(responseText) {
        // Parse AI response to extract structured actions
        const actionRegex = /ACTIONS:\s*([\s\S]*?)(?:\n\n|$)/;
        const match = responseText.match(actionRegex);

        if (!match) return [];

        const actionLines = match[1].split('\n').filter(line => line.trim());
        const actions = [];

        for (const line of actionLines) {
            // Match format: "1. action_name: {json}"
            const actionMatch = line.match(/\d+\.\s*(\w+):\s*(\{.*\})/);
            if (actionMatch) {
                try {
                    const params = JSON.parse(actionMatch[2]);
                    actions.push({
                        type: actionMatch[1],
                        params: params
                    });
                } catch (e) {
                    console.error('Failed to parse action params:', actionMatch[2]);
                }
            }
        }

        return actions;
    }

    async checkOllamaStatus() {
        try {
            const response = await this.ollama.list();
            return {
                available: true,
                models: response.models.map(m => m.name)
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    async pullModel(modelName) {
        try {
            const stream = await this.ollama.pull({
                model: modelName,
                stream: true
            });

            for await (const chunk of stream) {
                console.log('Pull progress:', chunk);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    getHistory() {
        return this.conversationHistory;
    }
}

module.exports = OllamaEngine;
