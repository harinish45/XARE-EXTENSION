/**
 * PageStability: Intelligent waiting for page state changes.
 * Detects DOM mutations, URL changes, and loading states.
 */
export class PageStability {
    private observer: MutationObserver | null = null;
    private lastUrl: string = '';
    private mutationCount = 0;

    constructor() {
        this.lastUrl = window.location.href;
    }

    /**
     * Wait for page to stabilize (DOM stops changing).
     */
    async waitForStable(timeoutMs = 3000, settleDuration = 500): Promise<boolean> {
        return new Promise((resolve) => {
            let lastMutationTime = Date.now();
            let resolved = false;

            this.observer = new MutationObserver(() => {
                lastMutationTime = Date.now();
                this.mutationCount++;
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });

            const checkStable = setInterval(() => {
                const timeSinceLastMutation = Date.now() - lastMutationTime;

                if (timeSinceLastMutation >= settleDuration) {
                    cleanup();
                    resolved = true;
                    resolve(true);
                }
            }, 100);

            const timeout = setTimeout(() => {
                if (!resolved) {
                    cleanup();
                    resolve(false); // Timed out but continue anyway
                }
            }, timeoutMs);

            const cleanup = () => {
                clearInterval(checkStable);
                clearTimeout(timeout);
                this.observer?.disconnect();
            };
        });
    }

    /**
     * Wait for URL to change (navigation).
     */
    async waitForUrlChange(timeoutMs = 5000): Promise<boolean> {
        const startUrl = window.location.href;
        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.location.href !== startUrl) {
                    clearInterval(check);
                    this.lastUrl = window.location.href;
                    resolve(true);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 100);
        });
    }

    /**
     * Wait for an element to appear.
     */
    async waitForElement(selector: string, timeoutMs = 5000): Promise<HTMLElement | null> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = setInterval(() => {
                const el = document.querySelector(selector) as HTMLElement;
                if (el) {
                    clearInterval(check);
                    resolve(el);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(check);
                    resolve(null);
                }
            }, 100);
        });
    }

    /**
     * Wait for loading indicators to disappear.
     */
    async waitForLoadingComplete(timeoutMs = 5000): Promise<boolean> {
        const loadingSelectors = [
            '[class*="loading"]',
            '[class*="spinner"]',
            '[class*="skeleton"]',
            '[aria-busy="true"]',
            '.loader',
            '.loading'
        ];

        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = setInterval(() => {
                const hasLoading = loadingSelectors.some(sel =>
                    document.querySelector(sel) !== null
                );

                if (!hasLoading) {
                    clearInterval(check);
                    resolve(true);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 200);
        });
    }

    /**
     * Check if URL changed since last check.
     */
    hasUrlChanged(): boolean {
        const changed = window.location.href !== this.lastUrl;
        this.lastUrl = window.location.href;
        return changed;
    }

    /**
     * Wait for element to become enabled.
     */
    async waitForEnabled(element: HTMLElement, timeoutMs = 3000): Promise<boolean> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = setInterval(() => {
                const isDisabled =
                    element.hasAttribute('disabled') ||
                    element.getAttribute('aria-disabled') === 'true' ||
                    element.classList.contains('disabled');

                if (!isDisabled) {
                    clearInterval(check);
                    resolve(true);
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 100);
        });
    }
}
