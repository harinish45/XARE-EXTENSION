// Response Mode System - Precision control over AI responses

export type ResponseMode = 'concise' | 'detailed' | 'technical' | 'creative';

export interface ModeConfig {
    id: ResponseMode;
    name: string;
    description: string;
    icon: string;
    systemPrompt: string;
}

export const RESPONSE_MODES: Record<ResponseMode, ModeConfig> = {
    concise: {
        id: 'concise',
        name: 'Concise',
        description: 'Brief, to-the-point answers',
        icon: 'Zap',
        systemPrompt: 'Provide concise, direct answers. Be brief and focused. Avoid unnecessary details. Use bullet points when appropriate.'
    },
    detailed: {
        id: 'detailed',
        name: 'Detailed',
        description: 'Comprehensive, in-depth responses',
        icon: 'FileText',
        systemPrompt: 'Provide comprehensive, detailed answers. Include examples, explanations, and context. Be thorough and educational.'
    },
    technical: {
        id: 'technical',
        name: 'Technical',
        description: 'Code-focused, precise technical answers',
        icon: 'Code',
        systemPrompt: 'Provide technical, code-focused answers. Include code examples, technical details, and best practices. Be precise and accurate.'
    },
    creative: {
        id: 'creative',
        name: 'Creative',
        description: 'Expansive, imaginative responses',
        icon: 'Sparkles',
        systemPrompt: 'Provide creative, expansive answers. Think outside the box. Include multiple perspectives and innovative ideas.'
    }
};

export class ResponseModeManager {
    private currentMode: ResponseMode = 'detailed';

    setMode(mode: ResponseMode): void {
        this.currentMode = mode;
        // Save to storage
        chrome.storage.local.set({ 'xare-response-mode': mode });
    }

    getMode(): ResponseMode {
        return this.currentMode;
    }

    getModeConfig(): ModeConfig {
        return RESPONSE_MODES[this.currentMode];
    }

    getSystemPrompt(): string {
        return RESPONSE_MODES[this.currentMode].systemPrompt;
    }

    async loadMode(): Promise<void> {
        const result = await chrome.storage.local.get('xare-response-mode');
        if (result['xare-response-mode']) {
            this.currentMode = result['xare-response-mode'];
        }
    }
}

export const responseModeManager = new ResponseModeManager();
