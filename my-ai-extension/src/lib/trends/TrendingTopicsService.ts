export interface TrendingTopic {
    id: string;
    title: string;
    category: 'news' | 'tech' | 'business' | 'science' | 'general' | 'product';
    emoji: string;
    timestamp: number;
    source: string;
    url?: string;
    engagement?: number;
}

/**
 * Service to fetch and cache trending topics from multiple sources
 */
export class TrendingTopicsService {
    private static CACHE_KEY = 'trending_topics';
    private static CACHE_TIMESTAMP_KEY = 'trending_topics_timestamp';
    private static CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

    /**
     * Get trending topics - uses cache if fresh, otherwise fetches new
     */
    static async getTrendingTopics(): Promise<TrendingTopic[]> {
        try {
            // Check cache first
            const cached = await this.getCachedTopics();
            const isFresh = await this.isCacheFresh();

            if (cached && isFresh) {
                console.log('Using cached trending topics');
                return cached;
            }

            // Fetch fresh topics
            console.log('Fetching fresh trending topics...');
            return await this.fetchFreshTopics();

        } catch (error) {
            console.error('Failed to get trending topics:', error);

            // Return cached even if stale, or fallback
            const cached = await this.getCachedTopics();
            return cached || this.getFallbackTopics();
        }
    }

    /**
     * Fetch fresh trending topics from multiple sources
     */
    private static async fetchFreshTopics(): Promise<TrendingTopic[]> {
        const topics: TrendingTopic[] = [];

        try {
            // Fetch from all sources in parallel (best effort)
            const results = await Promise.allSettled([
                this.fetchHackerNews(),
                this.fetchRedditTrending(),
                this.fetchProductHunt(),
                this.fetchGitHubTrending()
            ]);

            // Collect successful results
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    topics.push(...result.value);
                } else {
                    const sources = ['Hacker News', 'Reddit', 'Product Hunt', 'GitHub'];
                    console.warn(`Failed to fetch from ${sources[index]}:`, result.reason);
                }
            });

            // If we got at least some topics, rank and cache them
            if (topics.length > 0) {
                const ranked = this.rankTopics(topics);
                await this.cacheTopics(ranked);
                return ranked.slice(0, 6); // Top 6
            }

            // No topics fetched, use fallback
            return this.getFallbackTopics();

        } catch (error) {
            console.error('Error fetching fresh topics:', error);
            return this.getFallbackTopics();
        }
    }

    /**
     * Fetch from Hacker News (free API)
     */
    private static async fetchHackerNews(): Promise<TrendingTopic[]> {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const storyIds = await response.json() as number[];

        // Get top 3 stories
        const stories = await Promise.all(
            storyIds.slice(0, 3).map(async (id) => {
                const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                return await res.json();
            })
        );

        return stories.map(story => ({
            id: `hn_${story.id}`,
            title: story.title,
            category: 'tech' as const,
            emoji: '💻',
            timestamp: story.time * 1000,
            source: 'Hacker News',
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            engagement: story.score
        }));
    }

    /**
     * Fetch from Reddit (free API)
     */
    private static async fetchRedditTrending(): Promise<TrendingTopic[]> {
        const subreddits = [
            { name: 'technology', category: 'tech' as const, emoji: '🚀' },
            { name: 'science', category: 'science' as const, emoji: '🔬' },
            { name: 'worldnews', category: 'news' as const, emoji: '🌍' }
        ];

        const topics: TrendingTopic[] = [];

        for (const sub of subreddits) {
            try {
                const response = await fetch(`https://www.reddit.com/r/${sub.name}/hot.json?limit=1`);
                const data = await response.json();

                if (data.data?.children?.[0]) {
                    const post = data.data.children[0].data;
                    topics.push({
                        id: `reddit_${post.id}`,
                        title: post.title,
                        category: sub.category,
                        emoji: sub.emoji,
                        timestamp: post.created_utc * 1000,
                        source: `r/${sub.name}`,
                        url: `https://reddit.com${post.permalink}`,
                        engagement: post.ups
                    });
                }
            } catch (error) {
                console.warn(`Failed to fetch from r/${sub.name}:`, error);
            }
        }

        return topics;
    }

    /**
     * Fetch from Product Hunt (scraping - no auth needed)
     */
    private static async fetchProductHunt(): Promise<TrendingTopic[]> {
        try {
            // Simple fetch of Product Hunt homepage
            const response = await fetch('https://www.producthunt.com');
            const html = await response.text();

            // Extract product names using regex (simple approach)
            const titleRegex = /"name":"([^"]+)"/g;
            const matches = Array.from(html.matchAll(titleRegex));

            if (matches.length > 0) {
                const product = matches[0][1];
                return [{
                    id: `ph_${Date.now()}`,
                    title: `New on Product Hunt: ${product}`,
                    category: 'product',
                    emoji: '🎯',
                    timestamp: Date.now(),
                    source: 'Product Hunt',
                    url: 'https://www.producthunt.com',
                    engagement: 0
                }];
            }
        } catch (error) {
            console.warn('Failed to fetch Product Hunt:', error);
        }

        return [];
    }

    /**
     * Fetch GitHub Trending (free API)
     */
    private static async fetchGitHubTrending(): Promise<TrendingTopic[]> {
        try {
            // Search for repos created recently, sorted by stars
            const response = await fetch(
                'https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=2'
            );
            const data = await response.json();

            if (data.items) {
                return data.items.map((repo: any) => ({
                    id: `gh_${repo.id}`,
                    title: `${repo.full_name}: ${repo.description || 'Trending on GitHub'}`,
                    category: 'tech' as const,
                    emoji: '⭐',
                    timestamp: new Date(repo.created_at).getTime(),
                    source: 'GitHub',
                    url: repo.html_url,
                    engagement: repo.stargazers_count
                }));
            }
        } catch (error) {
            console.warn('Failed to fetch GitHub trending:', error);
        }

        return [];
    }

    /**
     * Rank topics by recency, engagement, and diversity
     */
    private static rankTopics(topics: TrendingTopic[]): TrendingTopic[] {
        // Score each topic
        const scored = topics.map(topic => {
            let score = 0;

            // Recency score (0-40 points) - favor recent topics
            const ageHours = (Date.now() - topic.timestamp) / (1000 * 60 * 60);
            score += Math.max(0, 40 - ageHours);

            // Engagement score (0-30 points)
            if (topic.engagement) {
                score += Math.min(30, topic.engagement / 100);
            }

            // Source diversity bonus (0-30 points)
            const sourceScores: Record<string, number> = {
                'Hacker News': 25,
                'Product Hunt': 30,
                'GitHub': 20,
                'Reddit': 15
            };
            score += sourceScores[topic.source] || 10;

            return { topic, score };
        });

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        // Ensure diversity (max 2 from same category in top 6)
        const diverse: TrendingTopic[] = [];
        const categoryCount: Record<string, number> = {};

        for (const { topic } of scored) {
            const count = categoryCount[topic.category] || 0;

            if (count < 2 || diverse.length >= 5) {
                diverse.push(topic);
                categoryCount[topic.category] = count + 1;
            }

            if (diverse.length >= 6) break;
        }

        return diverse;
    }

    /**
     * Cache topics to storage
     */
    private static async cacheTopics(topics: TrendingTopic[]): Promise<void> {
        await chrome.storage.local.set({
            [this.CACHE_KEY]: JSON.stringify(topics),
            [this.CACHE_TIMESTAMP_KEY]: Date.now()
        });
    }

    /**
     * Get cached topics from storage
     */
    private static async getCachedTopics(): Promise<TrendingTopic[] | null> {
        const result = await chrome.storage.local.get(this.CACHE_KEY) as Record<string, string>;
        const cached = result[this.CACHE_KEY];

        if (!cached) return null;

        try {
            return JSON.parse(cached);
        } catch {
            return null;
        }
    }

    /**
     * Check if cache is still fresh (< 2 hours old)
     */
    private static async isCacheFresh(): Promise<boolean> {
        const result = await chrome.storage.local.get(this.CACHE_TIMESTAMP_KEY) as Record<string, number>;
        const timestamp = result[this.CACHE_TIMESTAMP_KEY];

        if (!timestamp) return false;

        const age = Date.now() - timestamp;
        return age < this.CACHE_DURATION;
    }

    /**
     * Fallback topics if all APIs fail
     */
    private static getFallbackTopics(): TrendingTopic[] {
        return [
            {
                id: 'fallback_1',
                title: 'Explain quantum computing simply',
                category: 'science',
                emoji: '⚛️',
                timestamp: Date.now(),
                source: 'Suggested'
            },
            {
                id: 'fallback_2',
                title: 'Help me brainstorm startup ideas',
                category: 'business',
                emoji: '💡',
                timestamp: Date.now(),
                source: 'Suggested'
            },
            {
                id: 'fallback_3',
                title: "What's happening in AI today?",
                category: 'tech',
                emoji: '🤖',
                timestamp: Date.now(),
                source: 'Suggested'
            },
            {
                id: 'fallback_4',
                title: 'Latest tech trends',
                category: 'tech',
                emoji: '📱',
                timestamp: Date.now(),
                source: 'Suggested'
            },
            {
                id: 'fallback_5',
                title: 'Summarize recent news',
                category: 'news',
                emoji: '📰',
                timestamp: Date.now(),
                source: 'Suggested'
            },
            {
                id: 'fallback_6',
                title: 'Explain a complex topic',
                category: 'general',
                emoji: '🎓',
                timestamp: Date.now(),
                source: 'Suggested'
            }
        ];
    }

    /**
     * Force refresh topics (bypasses cache)
     */
    static async forceRefresh(): Promise<TrendingTopic[]> {
        console.log('Force refreshing trending topics...');
        return await this.fetchFreshTopics();
    }
}
