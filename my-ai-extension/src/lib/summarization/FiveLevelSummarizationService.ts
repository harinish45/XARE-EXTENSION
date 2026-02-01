export type SummarizationLevel = 'quick' | 'standard' | 'detailed' | 'comprehensive' | 'academic';
export type SummaryFormat = 'paragraph' | 'bullets' | 'outline' | 'keypoints';

export interface SummarizationOptions {
    level?: SummarizationLevel;
    format?: SummaryFormat;
    maxLength?: number;
    includeKeyPoints?: boolean;
    includeSentiment?: boolean;
}

export interface SummaryResult {
    summary: string;
    keyPoints?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    readingTime?: string;
    wordCount?: number;
    level: SummarizationLevel;
    format: SummaryFormat;
}

class FiveLevelSummarizationService {
    /**
     * Summarize content at specified level
     */
    async summarize(
        content: string,
        options: SummarizationOptions = {}
    ): Promise<SummaryResult> {
        const {
            level = 'standard',
            format = 'paragraph',
            includeKeyPoints = true,
            includeSentiment = false,
        } = options;

        // Calculate word count
        const wordCount = content.split(/\s+/).length;

        // Determine target length based on level
        const targetLength = this.getTargetLength(level, wordCount);

        // Generate summary
        const summary = await this.generateSummary(content, level, format, targetLength);

        // Extract key points if requested
        const keyPoints = includeKeyPoints ? this.extractKeyPoints(content, level) : undefined;

        // Analyze sentiment if requested
        const sentiment = includeSentiment ? this.analyzeSentiment(content) : undefined;

        // Calculate reading time
        const readingTime = this.calculateReadingTime(summary);

        return {
            summary,
            keyPoints,
            sentiment,
            readingTime,
            wordCount: summary.split(/\s+/).length,
            level,
            format,
        };
    }

    /**
     * Get target summary length based on level
     */
    private getTargetLength(level: SummarizationLevel, originalLength: number): number {
        const ratios = {
            quick: 0.1,        // 10% of original
            standard: 0.25,    // 25% of original
            detailed: 0.4,     // 40% of original
            comprehensive: 0.6, // 60% of original
            academic: 0.8,     // 80% of original
        };

        return Math.max(50, Math.floor(originalLength * ratios[level]));
    }

    /**
     * Generate summary at specified level and format
     */
    private async generateSummary(
        content: string,
        level: SummarizationLevel,
        format: SummaryFormat,
        targetLength: number
    ): Promise<string> {
        // Extract sentences
        const sentences = this.extractSentences(content);

        // Score sentences by importance
        const scoredSentences = this.scoreSentences(sentences, content);

        // Select top sentences based on target length
        const selectedSentences = this.selectSentences(scoredSentences, targetLength);

        // Format summary
        return this.formatSummary(selectedSentences, format, level);
    }

    /**
     * Extract sentences from content
     */
    private extractSentences(content: string): string[] {
        return content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 10);
    }

    /**
     * Score sentences by importance
     */
    private scoreSentences(sentences: string[], fullContent: string): Array<{ sentence: string; score: number }> {
        const wordFrequency = this.calculateWordFrequency(fullContent);

        return sentences.map(sentence => {
            const words = sentence.toLowerCase().split(/\s+/);
            const score = words.reduce((sum, word) => sum + (wordFrequency[word] || 0), 0) / words.length;

            return { sentence, score };
        });
    }

    /**
     * Calculate word frequency
     */
    private calculateWordFrequency(content: string): Record<string, number> {
        const words = content.toLowerCase().split(/\s+/);
        const frequency: Record<string, number> = {};

        // Common stop words to ignore
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        ]);

        words.forEach(word => {
            if (!stopWords.has(word) && word.length > 3) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });

        return frequency;
    }

    /**
     * Select sentences based on target length
     */
    private selectSentences(
        scoredSentences: Array<{ sentence: string; score: number }>,
        targetLength: number
    ): string[] {
        // Sort by score
        const sorted = [...scoredSentences].sort((a, b) => b.score - a.score);

        // Select sentences until target length is reached
        const selected: string[] = [];
        let currentLength = 0;

        for (const { sentence } of sorted) {
            const words = sentence.split(/\s+/).length;
            if (currentLength + words <= targetLength) {
                selected.push(sentence);
                currentLength += words;
            }

            if (currentLength >= targetLength * 0.9) break;
        }

        return selected;
    }

    /**
     * Format summary based on format type
     */
    private formatSummary(sentences: string[], format: SummaryFormat, level: SummarizationLevel): string {
        switch (format) {
            case 'bullets':
                return sentences.map(s => `• ${s}`).join('\n');

            case 'outline':
                return this.createOutline(sentences, level);

            case 'keypoints':
                return this.createKeyPoints(sentences);

            case 'paragraph':
            default:
                return sentences.join('. ') + '.';
        }
    }

    /**
     * Create outline format
     */
    private createOutline(sentences: string[], level: SummarizationLevel): string {
        const sectionsCount = level === 'quick' ? 2 : level === 'standard' ? 3 : 4;
        const sentencesPerSection = Math.ceil(sentences.length / sectionsCount);

        let outline = '';
        for (let i = 0; i < sectionsCount; i++) {
            const sectionSentences = sentences.slice(i * sentencesPerSection, (i + 1) * sentencesPerSection);
            if (sectionSentences.length > 0) {
                outline += `${i + 1}. ${sectionSentences[0]}\n`;
                sectionSentences.slice(1).forEach(s => {
                    outline += `   - ${s}\n`;
                });
            }
        }

        return outline;
    }

    /**
     * Create key points format
     */
    private createKeyPoints(sentences: string[]): string {
        return sentences.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
    }

    /**
     * Extract key points from content
     */
    private extractKeyPoints(content: string, level: SummarizationLevel): string[] {
        const pointsCount = {
            quick: 3,
            standard: 5,
            detailed: 7,
            comprehensive: 10,
            academic: 15,
        };

        const sentences = this.extractSentences(content);
        const scored = this.scoreSentences(sentences, content);
        const sorted = scored.sort((a, b) => b.score - a.score);

        return sorted
            .slice(0, pointsCount[level])
            .map(s => s.sentence);
    }

    /**
     * Analyze sentiment of content
     */
    private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'success', 'win', 'best'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'fail', 'worst', 'poor', 'disappointing', 'unfortunate'];

        const words = content.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (positiveWords.includes(word)) positiveCount++;
            if (negativeWords.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount * 1.5) return 'positive';
        if (negativeCount > positiveCount * 1.5) return 'negative';
        return 'neutral';
    }

    /**
     * Calculate reading time
     */
    private calculateReadingTime(text: string): string {
        const wordsPerMinute = 200;
        const words = text.split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);

        if (minutes < 1) return 'Less than 1 min';
        if (minutes === 1) return '1 min';
        return `${minutes} mins`;
    }
}

export const fiveLevelSummarizationService = new FiveLevelSummarizationService();
