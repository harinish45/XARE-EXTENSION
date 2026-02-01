// Smart Context Integration

import { connectorRegistry } from '../connectors/base/BaseConnector';

export interface ContextSuggestion {
    id: string;
    type: 'connector' | 'file' | 'web';
    title: string;
    description: string;
    action: () => Promise<any>;
}

export class SmartContextService {
    // Analyze prompt and suggest relevant context
    async suggestContext(prompt: string): Promise<ContextSuggestion[]> {
        const suggestions: ContextSuggestion[] = [];

        // Check for file-related keywords
        if (this.containsKeywords(prompt, ['file', 'document', 'drive', 'folder'])) {
            const driveConnector = connectorRegistry.get('google-drive');
            if (driveConnector?.isEnabled()) {
                suggestions.push({
                    id: 'drive-search',
                    type: 'connector',
                    title: 'Search Google Drive',
                    description: 'Find relevant files in your Drive',
                    action: async () => {
                        return await driveConnector.execute('search', { query: prompt });
                    }
                });
            }
        }

        // Check for code-related keywords
        if (this.containsKeywords(prompt, ['code', 'repository', 'github', 'repo'])) {
            const githubConnector = connectorRegistry.get('github');
            if (githubConnector?.isEnabled()) {
                suggestions.push({
                    id: 'github-search',
                    type: 'connector',
                    title: 'Search GitHub',
                    description: 'Find code in your repositories',
                    action: async () => {
                        return await githubConnector.execute('search-code', { query: prompt });
                    }
                });
            }
        }

        // Check for note-related keywords
        if (this.containsKeywords(prompt, ['note', 'notion', 'page', 'database'])) {
            const notionConnector = connectorRegistry.get('notion');
            if (notionConnector?.isEnabled()) {
                suggestions.push({
                    id: 'notion-search',
                    type: 'connector',
                    title: 'Search Notion',
                    description: 'Find pages in your workspace',
                    action: async () => {
                        return await notionConnector.execute('search', { query: prompt });
                    }
                });
            }
        }

        return suggestions;
    }

    private containsKeywords(text: string, keywords: string[]): boolean {
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword));
    }

    // Auto-attach context based on prompt
    async autoAttachContext(prompt: string): Promise<string> {
        const suggestions = await this.suggestContext(prompt);

        if (suggestions.length === 0) {
            return prompt;
        }

        // For now, just return the prompt with context suggestions
        // In a full implementation, this would fetch and attach actual context
        return prompt;
    }
}

export const smartContextService = new SmartContextService();
