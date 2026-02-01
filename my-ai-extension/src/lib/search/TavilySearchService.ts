import { apiConfigService } from '../config/APIConfigService';

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
}

export interface TavilySearchOptions {
    query: string;
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
    includeImages?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
}

export interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    images?: string[];
    responseTime: number;
}

class TavilySearchService {
    /**
     * Perform web search using Tavily API
     */
    async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
        const config = apiConfigService.getTavilyConfig();

        if (!config.apiKey) {
            throw new Error('Tavily API key not configured');
        }

        const requestBody = {
            api_key: config.apiKey,
            query: options.query,
            search_depth: options.searchDepth || 'basic',
            max_results: options.maxResults || 10,
            include_answer: options.includeAnswer !== false,
            include_images: options.includeImages || false,
            include_domains: options.includeDomains || [],
            exclude_domains: options.excludeDomains || [],
        };

        try {
            const startTime = Date.now();

            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.statusText}`);
            }

            const data = await response.json();
            const responseTime = Date.now() - startTime;

            return {
                query: options.query,
                answer: data.answer,
                results: data.results || [],
                images: data.images || [],
                responseTime,
            };
        } catch (error) {
            console.error('Tavily search error:', error);
            throw error;
        }
    }

    /**
     * Quick search with answer
     */
    async quickSearch(query: string): Promise<{ answer: string; sources: TavilySearchResult[] }> {
        const result = await this.search({
            query,
            searchDepth: 'basic',
            maxResults: 5,
            includeAnswer: true,
        });

        return {
            answer: result.answer || 'No answer found',
            sources: result.results,
        };
    }

    /**
     * Deep research with advanced search
     */
    async deepResearch(query: string, maxResults = 15): Promise<TavilySearchResponse> {
        return this.search({
            query,
            searchDepth: 'advanced',
            maxResults,
            includeAnswer: true,
            includeImages: true,
        });
    }

    /**
     * Domain-specific search
     */
    async domainSearch(
        query: string,
        domains: string[],
        excludeDomains?: string[]
    ): Promise<TavilySearchResponse> {
        return this.search({
            query,
            includeDomains: domains,
            excludeDomains,
            maxResults: 10,
        });
    }
}

export const tavilySearchService = new TavilySearchService();
