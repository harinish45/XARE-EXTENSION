// Follow-up Suggestion Generator - AI-powered related questions

import type { ChatMessage } from '../store';

export interface FollowUpSuggestion {
    id: string;
    text: string;
    category: 'clarify' | 'deepen' | 'related' | 'expand';
}

export class FollowUpGenerator {
    // Generate follow-up suggestions based on conversation context
    async generateSuggestions(messages: ChatMessage[]): Promise<FollowUpSuggestion[]> {
        if (messages.length === 0) return [];

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'assistant') return [];

        // Extract topic from last response
        const topic = this.extractTopic(lastMessage.content);

        // Generate contextual suggestions
        return this.createSuggestions(topic, lastMessage.content);
    }

    private extractTopic(content: string): string {
        // Simple topic extraction - first sentence or first 50 chars
        const firstSentence = content.split(/[.!?]/)[0];
        return firstSentence.substring(0, 50);
    }

    private createSuggestions(topic: string, content: string): FollowUpSuggestion[] {
        const suggestions: FollowUpSuggestion[] = [];

        // Clarification questions
        if (content.length > 200) {
            suggestions.push({
                id: 'clarify-1',
                text: 'Can you explain that in simpler terms?',
                category: 'clarify'
            });
        }

        // Deep dive
        suggestions.push({
            id: 'deepen-1',
            text: 'Tell me more about this',
            category: 'deepen'
        });

        // Related topics
        suggestions.push({
            id: 'related-1',
            text: 'What are related concepts?',
            category: 'related'
        });

        // Practical application
        if (content.includes('code') || content.includes('example')) {
            suggestions.push({
                id: 'expand-1',
                text: 'Show me a practical example',
                category: 'expand'
            });
        } else {
            suggestions.push({
                id: 'expand-1',
                text: 'How can I apply this?',
                category: 'expand'
            });
        }

        return suggestions.slice(0, 4); // Max 4 suggestions
    }

    // Smart suggestions based on content analysis
    generateSmartSuggestions(content: string): FollowUpSuggestion[] {
        const suggestions: FollowUpSuggestion[] = [];

        // Code-related
        if (content.includes('```')) {
            suggestions.push({
                id: 'code-1',
                text: 'Explain this code step by step',
                category: 'clarify'
            });
            suggestions.push({
                id: 'code-2',
                text: 'Are there any edge cases?',
                category: 'deepen'
            });
        }

        // List-related
        if (content.match(/^\d+\./m) || content.match(/^[-*]/m)) {
            suggestions.push({
                id: 'list-1',
                text: 'Elaborate on the first point',
                category: 'deepen'
            });
        }

        // Question-related
        if (content.includes('?')) {
            suggestions.push({
                id: 'question-1',
                text: 'What are the pros and cons?',
                category: 'expand'
            });
        }

        return suggestions;
    }
}

export const followUpGenerator = new FollowUpGenerator();
