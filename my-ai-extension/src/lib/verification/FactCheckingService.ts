// Fact-Checking Service

import { webSearchService } from '../search/WebSearchService';

export interface FactCheckResult {
    claim: string;
    verdict: 'verified' | 'disputed' | 'unverified';
    confidence: number;
    sources: string[];
    explanation: string;
}

export class FactCheckingService {
    // Extract claims from text
    extractClaims(text: string): string[] {
        const claims: string[] = [];

        // Split by sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

        // Look for factual statements (contains numbers, dates, names)
        sentences.forEach(sentence => {
            if (this.isFactualStatement(sentence)) {
                claims.push(sentence.trim());
            }
        });

        return claims.slice(0, 5); // Max 5 claims
    }

    private isFactualStatement(sentence: string): boolean {
        // Check for numbers, dates, proper nouns
        const hasNumber = /\d+/.test(sentence);
        const hasDate = /\b(19|20)\d{2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(sentence);
        const hasProperNoun = /\b[A-Z][a-z]+\b/.test(sentence);

        return hasNumber || hasDate || hasProperNoun;
    }

    // Verify a claim using web search
    async verifyClaim(claim: string): Promise<FactCheckResult> {
        try {
            // Search for the claim
            const searchResults = await webSearchService.search(claim);

            if (searchResults.length === 0) {
                return {
                    claim,
                    verdict: 'unverified',
                    confidence: 0,
                    sources: [],
                    explanation: 'No sources found to verify this claim'
                };
            }

            // Analyze search results
            const sources = searchResults.slice(0, 3).map(r => r.url);
            const snippets = searchResults.slice(0, 3).map(r => r.snippet).join(' ');

            // Simple verification logic
            const confidence = this.calculateConfidence(claim, snippets);
            const verdict = confidence > 0.7 ? 'verified' : confidence > 0.3 ? 'disputed' : 'unverified';

            return {
                claim,
                verdict,
                confidence,
                sources,
                explanation: this.generateExplanation(verdict, sources.length)
            };
        } catch (error) {
            return {
                claim,
                verdict: 'unverified',
                confidence: 0,
                sources: [],
                explanation: 'Error checking claim'
            };
        }
    }

    private calculateConfidence(claim: string, evidence: string): number {
        // Simple keyword matching
        const claimWords = claim.toLowerCase().split(/\s+/);
        const evidenceWords = evidence.toLowerCase().split(/\s+/);

        let matches = 0;
        claimWords.forEach(word => {
            if (word.length > 3 && evidenceWords.includes(word)) {
                matches++;
            }
        });

        return Math.min(matches / Math.max(claimWords.length, 1), 1);
    }

    private generateExplanation(verdict: string, sourceCount: number): string {
        if (verdict === 'verified') {
            return `Found ${sourceCount} sources supporting this claim`;
        } else if (verdict === 'disputed') {
            return `Found ${sourceCount} sources with mixed information`;
        } else {
            return 'Insufficient evidence to verify this claim';
        }
    }

    // Batch verify multiple claims
    async verifyAll(claims: string[]): Promise<FactCheckResult[]> {
        const results = await Promise.all(
            claims.map(claim => this.verifyClaim(claim))
        );
        return results;
    }
}

export const factCheckingService = new FactCheckingService();
