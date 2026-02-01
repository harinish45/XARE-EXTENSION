import { apiConfigService } from '../config/APIConfigService';

export interface FirecrawlScrapeOptions {
    url: string;
    formats?: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[];
    onlyMainContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
}

export interface FirecrawlScrapeResult {
    success: boolean;
    data?: {
        markdown?: string;
        html?: string;
        rawHtml?: string;
        screenshot?: string;
        metadata?: {
            title?: string;
            description?: string;
            language?: string;
            sourceURL?: string;
        };
    };
    error?: string;
}

export interface FirecrawlCrawlOptions {
    url: string;
    maxDepth?: number;
    limit?: number;
    allowBackwardLinks?: boolean;
    allowExternalLinks?: boolean;
}

export interface FirecrawlMapOptions {
    url: string;
    search?: string;
    limit?: number;
}

class FirecrawlService {
    /**
     * Scrape a single URL
     */
    async scrape(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
        const config = apiConfigService.getFirecrawlConfig();

        if (!config.apiKey) {
            throw new Error('Firecrawl API key not configured');
        }

        try {
            const response = await fetch(`${config.endpoint}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    url: options.url,
                    formats: options.formats || ['markdown'],
                    onlyMainContent: options.onlyMainContent !== false,
                    includeTags: options.includeTags,
                    excludeTags: options.excludeTags,
                    waitFor: options.waitFor,
                }),
            });

            if (!response.ok) {
                throw new Error(`Firecrawl API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Firecrawl scrape error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Scrape and get markdown content
     */
    async scrapeMarkdown(url: string): Promise<string> {
        const result = await this.scrape({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
        });

        if (!result.success || !result.data?.markdown) {
            throw new Error(result.error || 'Failed to scrape content');
        }

        return result.data.markdown;
    }

    /**
     * Scrape and get clean HTML
     */
    async scrapeHTML(url: string): Promise<string> {
        const result = await this.scrape({
            url,
            formats: ['html'],
            onlyMainContent: true,
        });

        if (!result.success || !result.data?.html) {
            throw new Error(result.error || 'Failed to scrape content');
        }

        return result.data.html;
    }

    /**
     * Take screenshot of a page
     */
    async screenshot(url: string): Promise<string> {
        const result = await this.scrape({
            url,
            formats: ['screenshot'],
        });

        if (!result.success || !result.data?.screenshot) {
            throw new Error(result.error || 'Failed to capture screenshot');
        }

        return result.data.screenshot;
    }

    /**
     * Crawl a website
     */
    async crawl(options: FirecrawlCrawlOptions): Promise<{ jobId: string }> {
        const config = apiConfigService.getFirecrawlConfig();

        if (!config.apiKey) {
            throw new Error('Firecrawl API key not configured');
        }

        const response = await fetch(`${config.endpoint}/crawl`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                url: options.url,
                maxDepth: options.maxDepth || 2,
                limit: options.limit || 100,
                allowBackwardLinks: options.allowBackwardLinks || false,
                allowExternalLinks: options.allowExternalLinks || false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Firecrawl API error: ${response.statusText}`);
        }

        const data = await response.json();
        return { jobId: data.jobId };
    }

    /**
     * Map a website (get all URLs)
     */
    async map(options: FirecrawlMapOptions): Promise<string[]> {
        const config = apiConfigService.getFirecrawlConfig();

        if (!config.apiKey) {
            throw new Error('Firecrawl API key not configured');
        }

        const response = await fetch(`${config.endpoint}/map`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                url: options.url,
                search: options.search,
                limit: options.limit || 5000,
            }),
        });

        if (!response.ok) {
            throw new Error(`Firecrawl API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.links || [];
    }
}

export const firecrawlService = new FirecrawlService();
