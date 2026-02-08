/**
 * Code Generation Service
 * Generates code snippets and complete files using AI
 */

export interface CodeGenerationOptions {
    prompt: string;
    language?: string;
    framework?: string;
    style?: 'functional' | 'object-oriented' | 'procedural';
    includeComments?: boolean;
    includeTests?: boolean;
}

export interface GeneratedCode {
    code: string;
    language: string;
    explanation?: string;
    tests?: string;
}

export class CodeGenerationService {
    private static instance: CodeGenerationService;
    private apiKey: string | null = null;
    private model: string = 'gpt-4';

    private constructor() { }

    static getInstance(): CodeGenerationService {
        if (!CodeGenerationService.instance) {
            CodeGenerationService.instance = new CodeGenerationService();
        }
        return CodeGenerationService.instance;
    }

    /**
     * Set API key and model
     * @param apiKey - OpenAI API key
     * @param model - Model to use (default: gpt-4)
     */
    configure(apiKey: string, model: string = 'gpt-4'): void {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Generate code from prompt
     * @param options - Generation options
     * @returns Generated code
     */
    async generateCode(options: CodeGenerationOptions): Promise<GeneratedCode> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const systemPrompt = this.buildSystemPrompt(options);
        const userPrompt = this.buildUserPrompt(options);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Code generation failed: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        return this.parseGeneratedCode(content, options.language || 'javascript');
    }

    /**
     * Generate function from description
     * @param description - Function description
     * @param language - Programming language
     * @returns Generated function code
     */
    async generateFunction(description: string, language: string = 'javascript'): Promise<string> {
        const result = await this.generateCode({
            prompt: `Generate a function that ${description}`,
            language,
            includeComments: true
        });
        return result.code;
    }

    /**
     * Generate class from description
     * @param description - Class description
     * @param language - Programming language
     * @returns Generated class code
     */
    async generateClass(description: string, language: string = 'javascript'): Promise<string> {
        const result = await this.generateCode({
            prompt: `Generate a class that ${description}`,
            language,
            style: 'object-oriented',
            includeComments: true
        });
        return result.code;
    }

    /**
     * Generate API endpoint
     * @param description - Endpoint description
     * @param framework - Framework to use
     * @returns Generated endpoint code
     */
    async generateAPIEndpoint(description: string, framework: string = 'express'): Promise<string> {
        const result = await this.generateCode({
            prompt: `Generate an API endpoint that ${description}`,
            language: 'javascript',
            framework,
            includeComments: true
        });
        return result.code;
    }

    /**
     * Generate tests for code
     * @param code - Code to test
     * @param language - Programming language
     * @param testFramework - Test framework
     * @returns Generated test code
     */
    async generateTests(
        code: string,
        language: string = 'javascript',
        testFramework: string = 'jest'
    ): Promise<string> {
        const result = await this.generateCode({
            prompt: `Generate ${testFramework} tests for the following code:\n\n${code}`,
            language,
            framework: testFramework,
            includeComments: true
        });
        return result.code;
    }

    /**
     * Refactor code
     * @param code - Code to refactor
     * @param instructions - Refactoring instructions
     * @param language - Programming language
     * @returns Refactored code
     */
    async refactorCode(code: string, instructions: string, language: string = 'javascript'): Promise<string> {
        const result = await this.generateCode({
            prompt: `Refactor the following code according to these instructions: ${instructions}\n\nCode:\n${code}`,
            language,
            includeComments: true
        });
        return result.code;
    }

    /**
     * Explain code
     * @param code - Code to explain
     * @param language - Programming language
     * @returns Code explanation
     */
    async explainCode(code: string, language: string = 'javascript'): Promise<string> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a code explanation expert. Explain code clearly and concisely.'
                    },
                    {
                        role: 'user',
                        content: `Explain the following ${language} code:\n\n${code}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Code explanation failed: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Build system prompt based on options
     * @param options - Generation options
     * @returns System prompt
     */
    private buildSystemPrompt(options: CodeGenerationOptions): string {
        let prompt = 'You are an expert programmer. Generate clean, efficient, and well-structured code.';

        if (options.language) {
            prompt += ` Use ${options.language}.`;
        }

        if (options.framework) {
            prompt += ` Use the ${options.framework} framework.`;
        }

        if (options.style) {
            prompt += ` Follow ${options.style} programming style.`;
        }

        if (options.includeComments) {
            prompt += ' Include helpful comments.';
        }

        if (options.includeTests) {
            prompt += ' Include unit tests.';
        }

        return prompt;
    }

    /**
     * Build user prompt
     * @param options - Generation options
     * @returns User prompt
     */
    private buildUserPrompt(options: CodeGenerationOptions): string {
        return options.prompt;
    }

    /**
     * Parse generated code from response
     * @param content - Response content
     * @param language - Programming language
     * @returns Parsed code
     */
    private parseGeneratedCode(content: string, language: string): GeneratedCode {
        // Extract code blocks from markdown
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
        const matches = Array.from(content.matchAll(codeBlockRegex));

        if (matches.length > 0) {
            const code = matches[0][1].trim();
            const explanation = content.replace(codeBlockRegex, '').trim();

            return {
                code,
                language,
                explanation: explanation || undefined
            };
        }

        // If no code blocks, return entire content as code
        return {
            code: content.trim(),
            language
        };
    }
}
