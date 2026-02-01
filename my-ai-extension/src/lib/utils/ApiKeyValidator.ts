// API Key Validator

export interface ValidationResult {
    valid: boolean;
    error?: string;
    suggestion?: string;
}

export class ApiKeyValidator {
    // Format validators for different providers
    private static formats: Record<string, RegExp> = {
        openai: /^sk-[A-Za-z0-9]{48,}$/,
        anthropic: /^sk-ant-[A-Za-z0-9-]{95,}$/,
        gemini: /^[A-Za-z0-9_-]{39}$/,
        perplexity: /^pplx-[A-Za-z0-9]{32,}$/,
        azure: /^[A-Za-z0-9]{32}$/,
    };

    static validateFormat(providerId: string, apiKey: string): ValidationResult {
        if (!apiKey || apiKey.trim().length === 0) {
            return {
                valid: false,
                error: 'API key cannot be empty',
                suggestion: 'Please enter your API key'
            };
        }

        const format = this.formats[providerId];
        if (!format) {
            // No specific format for this provider, accept any non-empty string
            return { valid: true };
        }

        if (!format.test(apiKey)) {
            return {
                valid: false,
                error: 'Invalid API key format',
                suggestion: this.getFormatSuggestion(providerId)
            };
        }

        return { valid: true };
    }

    private static getFormatSuggestion(providerId: string): string {
        const suggestions: Record<string, string> = {
            openai: 'OpenAI keys start with "sk-" followed by 48+ characters',
            anthropic: 'Anthropic keys start with "sk-ant-" followed by ~95 characters',
            gemini: 'Gemini keys are 39 characters long',
            perplexity: 'Perplexity keys start with "pplx-" followed by 32+ characters',
            azure: 'Azure keys are 32 characters long',
        };

        return suggestions[providerId] || 'Check your API key format';
    }

    static async testKey(
        providerId: string,
        apiKey: string,
        onProgress?: (message: string) => void
    ): Promise<ValidationResult> {
        // First check format
        const formatCheck = this.validateFormat(providerId, apiKey);
        if (!formatCheck.valid) {
            return formatCheck;
        }

        onProgress?.('Testing API key...');

        try {
            // Make a minimal test request
            const port = chrome.runtime.connect({ name: 'llm-stream' });

            return await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    port.disconnect();
                    resolve({
                        valid: false,
                        error: 'Request timed out',
                        suggestion: 'Check your internet connection'
                    });
                }, 10000);

                let hasResponse = false;

                port.onMessage.addListener((msg) => {
                    if (hasResponse) return;
                    hasResponse = true;

                    clearTimeout(timeout);
                    port.disconnect();

                    if (msg.type === 'CHUNK' || msg.type === 'DONE') {
                        resolve({ valid: true });
                    } else if (msg.type === 'ERROR') {
                        const error = msg.error.toLowerCase();

                        if (error.includes('invalid') || error.includes('unauthorized')) {
                            resolve({
                                valid: false,
                                error: 'Invalid API key',
                                suggestion: 'Please check your API key is correct'
                            });
                        } else if (error.includes('rate limit')) {
                            resolve({
                                valid: true, // Key is valid, just rate limited
                                error: 'Rate limited (key is valid)',
                                suggestion: 'Wait a moment before trying again'
                            });
                        } else {
                            resolve({
                                valid: false,
                                error: msg.error,
                                suggestion: 'Check the error message above'
                            });
                        }
                    }
                });

                // Send minimal test request
                port.postMessage({
                    action: 'GENERATE_STREAM',
                    data: {
                        providerId,
                        messages: [{ role: 'user', content: 'Hi' }],
                        apiKey
                    }
                });
            });
        } catch (error: any) {
            return {
                valid: false,
                error: error.message,
                suggestion: 'An unexpected error occurred'
            };
        }
    }
}

export const apiKeyValidator = ApiKeyValidator;
