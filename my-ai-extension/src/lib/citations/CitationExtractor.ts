// Citation Extractor - Auto-extract and format citations

export interface Citation {
    id: string;
    text: string;
    url?: string;
    title?: string;
    source?: string;
}

export class CitationExtractor {
    // Extract citations from markdown text
    extractCitations(text: string): Citation[] {
        const citations: Citation[] = [];
        const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;
        let index = 1;

        while ((match = urlRegex.exec(text)) !== null) {
            citations.push({
                id: `cite-${index}`,
                text: match[1],
                url: match[2],
                title: match[1],
                source: this.extractDomain(match[2])
            });
            index++;
        }

        return citations;
    }

    // Format text with footnote-style citations
    formatWithFootnotes(text: string, citations: Citation[]): string {
        let formatted = text;

        citations.forEach((citation, index) => {
            const footnote = `[${index + 1}]`;
            const linkPattern = `[${citation.text}](${citation.url})`;
            formatted = formatted.replace(linkPattern, `${citation.text}${footnote}`);
        });

        // Add footnotes section
        if (citations.length > 0) {
            formatted += '\n\n---\n\n**References:**\n\n';
            citations.forEach((citation, index) => {
                formatted += `[${index + 1}] ${citation.title} - ${citation.url}\n`;
            });
        }

        return formatted;
    }

    // Extract domain from URL
    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return 'Unknown';
        }
    }

    // Generate citation in different formats
    generateCitation(citation: Citation, format: 'apa' | 'mla' | 'chicago' = 'apa'): string {
        const domain = citation.source || 'Unknown';
        const title = citation.title || 'Untitled';
        const url = citation.url || '';

        switch (format) {
            case 'apa':
                return `${domain}. ${title}. Retrieved from ${url}`;
            case 'mla':
                return `"${title}." ${domain}, ${url}.`;
            case 'chicago':
                return `${domain}. "${title}." Accessed ${new Date().toLocaleDateString()}. ${url}.`;
            default:
                return `${title} - ${url}`;
        }
    }
}

export const citationExtractor = new CitationExtractor();
