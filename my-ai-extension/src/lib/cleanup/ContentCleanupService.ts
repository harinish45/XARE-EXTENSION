// Content Cleanup Service

export class ContentCleanupService {
    // Remove ads and clutter from page
    async cleanupPage(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Remove ads
                const adSelectors = [
                    '[class*="ad-"]',
                    '[id*="ad-"]',
                    '.advertisement',
                    '.ad-container',
                    'iframe[src*="ads"]',
                    '[class*="sponsor"]'
                ];

                adSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });

                // Remove popups
                document.querySelectorAll('[class*="popup"], [class*="modal"]').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.position === 'fixed' || style.position === 'absolute') {
                        el.remove();
                    }
                });

                // Remove sticky headers/footers
                document.querySelectorAll('header, footer').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.position === 'sticky' || style.position === 'fixed') {
                        (el as HTMLElement).style.position = 'static';
                    }
                });
            }
        });
    }

    // Enable reader mode
    async enableReaderMode(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Find main content
                const article = document.querySelector('article') ||
                    document.querySelector('main') ||
                    document.querySelector('[role="main"]') ||
                    document.body;

                // Hide everything except main content
                document.body.childNodes.forEach(node => {
                    if (node !== article && node.nodeType === 1) {
                        (node as HTMLElement).style.display = 'none';
                    }
                });

                // Style for reading
                document.body.style.backgroundColor = '#f5f5f5';
                document.body.style.padding = '40px';
                (article as HTMLElement).style.maxWidth = '800px';
                (article as HTMLElement).style.margin = '0 auto';
                (article as HTMLElement).style.backgroundColor = 'white';
                (article as HTMLElement).style.padding = '40px';
                (article as HTMLElement).style.lineHeight = '1.6';
                (article as HTMLElement).style.fontSize = '18px';
            }
        });
    }
}

export const contentCleanupService = new ContentCleanupService();
