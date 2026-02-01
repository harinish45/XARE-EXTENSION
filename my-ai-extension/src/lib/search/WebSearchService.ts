// Web Search Service - Uses DuckDuckGo Instant Answer API (free, no key needed)
// For production, consider Brave Search API or SerpAPI

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    favicon?: string;
}

export interface SearchResponse {
    results: SearchResult[];
    query: string;
}

class WebSearchService {
    // DuckDuckGo Instant Answer API (free, no API key)
    private ddgApiUrl = 'https://api.duckduckgo.com/';

    async search(query: string): Promise<SearchResult[]> {
        try {
            // DuckDuckGo Instant Answer API
            const url = `${this.ddgApiUrl}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

            const response = await fetch(url);
            const data = await response.json();

            const results: SearchResult[] = [];

            // Abstract (main answer)
            if (data.Abstract && data.AbstractURL) {
                results.push({
                    title: data.Heading || 'Result',
                    url: data.AbstractURL,
                    snippet: data.Abstract,
                    favicon: data.Image ? `https://duckduckgo.com${data.Image}` : undefined
                });
            }

            // Related topics
            if (data.RelatedTopics) {
                for (const topic of data.RelatedTopics.slice(0, 4)) {
                    if (topic.FirstURL && topic.Text) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'Related',
                            url: topic.FirstURL,
                            snippet: topic.Text,
                            favicon: topic.Icon?.URL ? `https://duckduckgo.com${topic.Icon.URL}` : undefined
                        });
                    }
                }
            }

            // If no DDG results, generate helpful links
            if (results.length === 0) {
                results.push(
                    {
                        title: `Google Search: ${query}`,
                        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                        snippet: 'Search on Google for more results'
                    },
                    {
                        title: `Wikipedia: ${query}`,
                        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
                        snippet: 'Search Wikipedia encyclopedia'
                    }
                );
            }

            return results;
        } catch (error) {
            console.error('Search failed:', error);
            // Fallback to generated search links
            return [
                {
                    title: `Search: ${query}`,
                    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                    snippet: 'Click to search on Google'
                },
                {
                    title: 'Wikipedia',
                    url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
                    snippet: 'Search Wikipedia'
                }
            ];
        }
    }

    // Extract domain from URL for display
    getDomain(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    // Get favicon URL
    getFavicon(url: string): string {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return '';
        }
    }
}

export const webSearchService = new WebSearchService();
