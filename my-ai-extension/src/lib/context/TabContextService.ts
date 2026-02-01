// Enhanced Multi-Tab Context Service with Screenshot Support

export interface TabContext {
    tabId: number;
    title: string;
    url: string;
    favicon?: string;
    summary?: string;
    selected: boolean;
    screenshot?: string; // Base64 data URL
    content?: string;
    timestamp?: number;
}

export interface PageContext {
    tab: TabContext;
    screenshot?: string;
    content: string;
    metadata: {
        domain: string;
        isArticle: boolean;
        hasForm: boolean;
        hasVideo: boolean;
        isShoppingPage: boolean;
        hasTable: boolean;
    };
}

class TabContextService {
    /**
     * Get all open tabs in current window
     */
    async getAllTabs(): Promise<TabContext[]> {
        const tabs = await chrome.tabs.query({ currentWindow: true });

        return tabs
            .filter(tab => tab.id && tab.url && !tab.url.startsWith('chrome://'))
            .map(tab => ({
                tabId: tab.id!,
                title: tab.title || 'Untitled',
                url: tab.url || '',
                favicon: tab.favIconUrl,
                selected: tab.active || false,
                timestamp: Date.now()
            }));
    }

    /**
     * Get currently active tab
     */
    async getActiveTab(): Promise<TabContext | null> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) return null;

        return {
            tabId: tab.id,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            favicon: tab.favIconUrl,
            selected: true,
            timestamp: Date.now()
        };
    }

    /**
     * Capture screenshot of a tab
     */
    async captureTabScreenshot(tabId?: number): Promise<string | null> {
        try {
            let targetTab: chrome.tabs.Tab;

            if (tabId) {
                targetTab = await chrome.tabs.get(tabId);
            } else {
                [targetTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            }

            if (!targetTab || !targetTab.id) {
                return null;
            }

            // Capture visible tab
            const screenshot = await chrome.tabs.captureVisibleTab(
                targetTab.windowId,
                { format: 'png' }
            );

            return screenshot;
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return null;
        }
    }

    /**
     * Get tab content (text extraction)
     */
    async getTabContent(tabId: number): Promise<string> {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const title = document.title;
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                        .map(el => el.textContent?.trim())
                        .filter(Boolean)
                        .slice(0, 10);
                    const text = document.body.innerText.substring(0, 3000);

                    return `Page: ${title}\nHeadings: ${headings.join(' | ')}\n\nContent:\n${text}`;
                }
            });

            return result[0]?.result || '';
        } catch (e) {
            console.error('Failed to get tab content:', e);
            return '';
        }
    }

    /**
     * Get comprehensive page context (screenshot + content + metadata)
     */
    async getCurrentPageContext(): Promise<PageContext | null> {
        const activeTab = await this.getActiveTab();

        if (!activeTab) {
            return null;
        }

        try {
            // Capture screenshot and content in parallel
            const [screenshot, content, metadata] = await Promise.all([
                this.captureTabScreenshot(activeTab.tabId),
                this.getTabContent(activeTab.tabId),
                this.getPageMetadata(activeTab.tabId)
            ]);

            return {
                tab: activeTab,
                screenshot: screenshot || undefined,
                content,
                metadata
            };
        } catch (error) {
            console.error('Failed to get page context:', error);
            return null;
        }
    }

    /**
     * Get page metadata (type detection)
     */
    private async getPageMetadata(tabId: number): Promise<PageContext['metadata']> {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const domain = window.location.hostname;

                    // Detect page types
                    const isArticle = !!document.querySelector('article') ||
                        !!document.querySelector('[role="article"]') ||
                        !!document.querySelector('.article, .post-content');

                    const hasForm = document.querySelectorAll('form').length > 0;

                    const hasVideo = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;

                    const isShoppingPage =
                        domain.includes('amazon') ||
                        domain.includes('ebay') ||
                        !!document.querySelector('[itemtype*="Product"]') ||
                        !!document.querySelector('.price, [class*="price"], [data-price]');

                    const hasTable = document.querySelectorAll('table').length > 0;

                    return {
                        domain,
                        isArticle,
                        hasForm,
                        hasVideo,
                        isShoppingPage,
                        hasTable
                    };
                }
            });

            return result[0]?.result || {
                domain: '',
                isArticle: false,
                hasForm: false,
                hasVideo: false,
                isShoppingPage: false,
                hasTable: false
            };
        } catch (error) {
            console.error('Failed to get page metadata:', error);
            return {
                domain: '',
                isArticle: false,
                hasForm: false,
                hasVideo: false,
                isShoppingPage: false,
                hasTable: false
            };
        }
    }

    /**
     * Get multi-tab context for comparison/research workflows
     */
    async getMultiTabContext(tabIds: number[]): Promise<string> {
        const contexts: string[] = [];

        for (const tabId of tabIds) {
            const content = await this.getTabContent(tabId);
            if (content) {
                contexts.push(`--- Tab ${tabId} ---\n${content}`);
            }
        }

        return contexts.join('\n\n');
    }

    /**
     * Summarize tab content
     */
    async summarizeTab(tabId: number): Promise<string> {
        const content = await this.getTabContent(tabId);
        // Return first 500 chars as a simple summary
        return content.substring(0, 500) + (content.length > 500 ? '...' : '');
    }

    /**
     * Enrich user message with current tab context
     */
    async enrichMessageWithContext(message: string, includeScreenshot: boolean = true): Promise<{
        enrichedMessage: string;
        screenshot?: string;
        context: PageContext | null;
    }> {
        const context = await this.getCurrentPageContext();

        if (!context) {
            return {
                enrichedMessage: message,
                context: null
            };
        }

        // Build context-aware message
        let enrichedMessage = `User is currently viewing: ${context.tab.title} (${context.tab.url})\n\n`;

        // Add page type hints
        if (context.metadata.isArticle) {
            enrichedMessage += `[This is an article page]\n`;
        }
        if (context.metadata.isShoppingPage) {
            enrichedMessage += `[This is a shopping/product page]\n`;
        }
        if (context.metadata.hasForm) {
            enrichedMessage += `[Page contains forms]\n`;
        }
        if (context.metadata.hasVideo) {
            enrichedMessage += `[Page contains video content]\n`;
        }
        if (context.metadata.hasTable) {
            enrichedMessage += `[Page contains data tables]\n`;
        }

        enrichedMessage += `\nPage content preview:\n${context.content.substring(0, 1000)}...\n\n`;
        enrichedMessage += `User's question: ${message}`;

        return {
            enrichedMessage,
            screenshot: includeScreenshot ? context.screenshot : undefined,
            context
        };
    }

    /**
     * Detect if user is doing multi-tab research
     */
    async detectMultiTabWorkflow(): Promise<{
        isComparing: boolean;
        isResearching: boolean;
        suggestion?: string;
    }> {
        const tabs = await this.getAllTabs();

        if (tabs.length <= 1) {
            return { isComparing: false, isResearching: false };
        }

        // Analyze tabs to detect patterns
        const domains = tabs.map(t => new URL(t.url).hostname);
        const uniqueDomains = new Set(domains);

        // Shopping comparison: multiple shopping sites
        const shoppingDomains = ['amazon', 'ebay', 'walmart', 'bestbuy', 'target'];
        const shoppingSites = domains.filter(d =>
            shoppingDomains.some(shop => d.includes(shop))
        );

        if (shoppingSites.length >= 2) {
            return {
                isComparing: true,
                isResearching: false,
                suggestion: `I notice you're comparing products across ${shoppingSites.length} stores. Would you like me to help compare prices or features?`
            };
        }

        // Research pattern: many different sites on similar topic
        if (uniqueDomains.size >= 3 && tabs.length >= 4) {
            return {
                isComparing: false,
                isResearching: true,
                suggestion: `You have ${tabs.length} tabs open. Researching something? I can summarize all of them for you.`
            };
        }

        return { isComparing: false, isResearching: false };
    }
}

export const tabContextService = new TabContextService();
