// Intelligent Page Summarization Service

import type { ChatMessage } from '../store';

export interface SummaryLevel {
    level: 'brief' | 'detailed' | 'technical';
    length: 'short' | 'medium' | 'long';
}

export interface PageSummary {
    tldr: string;
    keyPoints: string[];
    mainTopics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    category: string;
    readingTime: number;
    wordCount: number;
}

export class PageSummarizationService {
    // Summarize current page content
    async summarizePage(level: SummaryLevel['level'] = 'detailed'): Promise<PageSummary> {
        const pageContent = await this.getPageContent();

        return {
            tldr: await this.generateTLDR(pageContent, level),
            keyPoints: await this.extractKeyPoints(pageContent, level),
            mainTopics: await this.identifyTopics(pageContent),
            sentiment: await this.analyzeSentiment(pageContent),
            category: await this.categorize(pageContent),
            readingTime: this.calculateReadingTime(pageContent),
            wordCount: this.countWords(pageContent)
        };
    }

    // Get page content from active tab
    private async getPageContent(): Promise<string> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return '';

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Extract main content, ignore nav/footer/ads
                const article = document.querySelector('article') ||
                    document.querySelector('main') ||
                    document.body;

                // Remove scripts, styles, nav, footer
                const clone = article.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('script, style, nav, footer, aside, .ad, .advertisement').forEach(el => el.remove());

                return clone.innerText;
            }
        });

        return result[0]?.result || '';
    }

    // Generate TL;DR based on level
    private async generateTLDR(content: string, level: SummaryLevel['level']): Promise<string> {
        const maxLength = level === 'brief' ? 100 : level === 'detailed' ? 300 : 500;

        // Simple extractive summarization (first sentences)
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        let summary = '';

        for (const sentence of sentences) {
            if (summary.length + sentence.length > maxLength) break;
            summary += sentence.trim() + '. ';
        }

        return summary.trim() || 'No summary available';
    }

    // Extract key points
    private async extractKeyPoints(content: string, level: SummaryLevel['level']): Promise<string[]> {
        const count = level === 'brief' ? 3 : level === 'detailed' ? 5 : 7;

        // Find sentences with important keywords
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const keywords = ['important', 'key', 'main', 'significant', 'critical', 'essential', 'first', 'second', 'finally'];

        const keyPoints = sentences
            .filter(s => keywords.some(kw => s.toLowerCase().includes(kw)))
            .slice(0, count)
            .map(s => s.trim());

        return keyPoints.length > 0 ? keyPoints : sentences.slice(0, count).map(s => s.trim());
    }

    // Identify main topics
    private async identifyTopics(content: string): Promise<string[]> {
        // Simple topic extraction based on word frequency
        const words = content.toLowerCase().split(/\W+/);
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            if (word.length > 4 && !stopWords.has(word)) {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });

        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    // Analyze sentiment
    private async analyzeSentiment(content: string): Promise<'positive' | 'neutral' | 'negative'> {
        const positive = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'best', 'love', 'happy'];
        const negative = ['bad', 'terrible', 'awful', 'worst', 'hate', 'poor', 'disappointing'];

        const words = content.toLowerCase().split(/\W+/);
        let score = 0;

        words.forEach(word => {
            if (positive.includes(word)) score++;
            if (negative.includes(word)) score--;
        });

        return score > 2 ? 'positive' : score < -2 ? 'negative' : 'neutral';
    }

    // Categorize content
    private async categorize(content: string): Promise<string> {
        const categories = {
            'Technology': ['software', 'code', 'programming', 'tech', 'computer', 'ai', 'ml'],
            'Business': ['business', 'company', 'market', 'finance', 'revenue', 'profit'],
            'Science': ['research', 'study', 'science', 'experiment', 'data', 'analysis'],
            'News': ['news', 'report', 'today', 'announced', 'breaking'],
            'Education': ['learn', 'tutorial', 'guide', 'course', 'lesson', 'teach']
        };

        const lowerContent = content.toLowerCase();
        let maxScore = 0;
        let category = 'General';

        Object.entries(categories).forEach(([cat, keywords]) => {
            const score = keywords.reduce((sum, kw) =>
                sum + (lowerContent.split(kw).length - 1), 0);
            if (score > maxScore) {
                maxScore = score;
                category = cat;
            }
        });

        return category;
    }

    // Calculate reading time
    private calculateReadingTime(content: string): number {
        const wordsPerMinute = 200;
        const words = this.countWords(content);
        return Math.ceil(words / wordsPerMinute);
    }

    // Count words
    private countWords(content: string): number {
        return content.split(/\s+/).filter(w => w.length > 0).length;
    }
}

export const pageSummarizationService = new PageSummarizationService();
