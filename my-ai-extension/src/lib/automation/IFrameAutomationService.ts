/**
 * iFrame Automation Service
 * Handles cross-frame automation and element detection
 */

export interface IFrameInfo {
    id: string;
    src: string;
    name: string;
    element: HTMLIFrameElement;
    accessible: boolean;
}

export class IFrameAutomationService {
    private static instance: IFrameAutomationService;

    private constructor() { }

    static getInstance(): IFrameAutomationService {
        if (!IFrameAutomationService.instance) {
            IFrameAutomationService.instance = new IFrameAutomationService();
        }
        return IFrameAutomationService.instance;
    }

    /**
     * Get all iFrames on the page
     * @returns Array of iFrame information
     */
    getAllIFrames(): IFrameInfo[] {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        return iframes.map((iframe, index) => ({
            id: iframe.id || `iframe-${index}`,
            src: iframe.src,
            name: iframe.name,
            element: iframe,
            accessible: this.isIFrameAccessible(iframe)
        }));
    }

    /**
     * Check if iFrame is accessible (same origin)
     * @param iframe - iFrame element
     * @returns True if accessible
     */
    private isIFrameAccessible(iframe: HTMLIFrameElement): boolean {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            return doc !== null && doc !== undefined;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get iFrame document
     * @param iframe - iFrame element or selector
     * @returns iFrame document or null
     */
    getIFrameDocument(iframe: HTMLIFrameElement | string): Document | null {
        try {
            const element = typeof iframe === 'string'
                ? document.querySelector(iframe) as HTMLIFrameElement
                : iframe;

            if (!element) {
                return null;
            }

            return element.contentDocument || element.contentWindow?.document || null;
        } catch (error) {
            console.error('Cannot access iFrame document:', error);
            return null;
        }
    }

    /**
     * Find element in iFrame
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @returns Found element or null
     */
    findElementInIFrame(iframeSelector: string, elementSelector: string): Element | null {
        const doc = this.getIFrameDocument(iframeSelector);
        if (!doc) {
            return null;
        }
        return doc.querySelector(elementSelector);
    }

    /**
     * Find all elements in iFrame
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @returns Array of found elements
     */
    findAllElementsInIFrame(iframeSelector: string, elementSelector: string): Element[] {
        const doc = this.getIFrameDocument(iframeSelector);
        if (!doc) {
            return [];
        }
        return Array.from(doc.querySelectorAll(elementSelector));
    }

    /**
     * Find element across all iFrames
     * @param selector - Element selector
     * @returns Found element or null
     */
    findElementInAnyIFrame(selector: string): { element: Element; iframe: HTMLIFrameElement } | null {
        const iframes = this.getAllIFrames();

        for (const iframeInfo of iframes) {
            if (!iframeInfo.accessible) {
                continue;
            }

            const doc = this.getIFrameDocument(iframeInfo.element);
            if (doc) {
                const element = doc.querySelector(selector);
                if (element) {
                    return {
                        element,
                        iframe: iframeInfo.element
                    };
                }
            }
        }

        return null;
    }

    /**
     * Click element in iFrame
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @returns True if clicked successfully
     */
    async clickElementInIFrame(iframeSelector: string, elementSelector: string): Promise<boolean> {
        const element = this.findElementInIFrame(iframeSelector, elementSelector);
        if (element && element instanceof HTMLElement) {
            element.click();
            return true;
        }
        return false;
    }

    /**
     * Set value in iFrame input
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @param value - Value to set
     * @returns True if value was set
     */
    async setValueInIFrame(
        iframeSelector: string,
        elementSelector: string,
        value: string
    ): Promise<boolean> {
        const element = this.findElementInIFrame(iframeSelector, elementSelector);
        if (element && element instanceof HTMLInputElement) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }

    /**
     * Get text content from element in iFrame
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @returns Text content or null
     */
    getTextContentFromIFrame(iframeSelector: string, elementSelector: string): string | null {
        const element = this.findElementInIFrame(iframeSelector, elementSelector);
        return element?.textContent || null;
    }

    /**
     * Execute script in iFrame
     * @param iframeSelector - iFrame selector
     * @param script - Script to execute
     * @returns Script result
     */
    async executeScriptInIFrame(iframeSelector: string, script: string): Promise<any> {
        const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
        if (!iframe || !iframe.contentWindow) {
            throw new Error('iFrame not found or not accessible');
        }

        try {
            return iframe.contentWindow.eval(script);
        } catch (error) {
            console.error('Script execution in iFrame failed:', error);
            throw error;
        }
    }

    /**
     * Wait for iFrame to load
     * @param iframeSelector - iFrame selector
     * @param timeout - Maximum wait time in ms
     * @returns True if loaded
     */
    async waitForIFrameLoad(iframeSelector: string, timeout: number = 10000): Promise<boolean> {
        const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
        if (!iframe) {
            return false;
        }

        return new Promise((resolve) => {
            const startTime = Date.now();

            const checkLoad = () => {
                try {
                    const doc = this.getIFrameDocument(iframe);
                    if (doc && doc.readyState === 'complete') {
                        resolve(true);
                        return;
                    }
                } catch (error) {
                    // iFrame not accessible yet
                }

                if (Date.now() - startTime >= timeout) {
                    resolve(false);
                    return;
                }

                setTimeout(checkLoad, 100);
            };

            iframe.addEventListener('load', () => resolve(true), { once: true });
            checkLoad();
        });
    }

    /**
     * Wait for element in iFrame
     * @param iframeSelector - iFrame selector
     * @param elementSelector - Element selector within iFrame
     * @param timeout - Maximum wait time in ms
     * @returns Found element or null
     */
    async waitForElementInIFrame(
        iframeSelector: string,
        elementSelector: string,
        timeout: number = 5000
    ): Promise<Element | null> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = this.findElementInIFrame(iframeSelector, elementSelector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null;
    }

    /**
     * Get iFrame URL
     * @param iframeSelector - iFrame selector
     * @returns iFrame URL or null
     */
    getIFrameURL(iframeSelector: string): string | null {
        const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
        if (!iframe) {
            return null;
        }

        try {
            return iframe.contentWindow?.location.href || iframe.src;
        } catch (error) {
            return iframe.src;
        }
    }

    /**
     * Navigate iFrame to URL
     * @param iframeSelector - iFrame selector
     * @param url - URL to navigate to
     * @returns True if navigation started
     */
    navigateIFrame(iframeSelector: string, url: string): boolean {
        const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
        if (!iframe) {
            return false;
        }

        try {
            if (iframe.contentWindow) {
                iframe.contentWindow.location.href = url;
            } else {
                iframe.src = url;
            }
            return true;
        } catch (error) {
            console.error('iFrame navigation failed:', error);
            return false;
        }
    }

    /**
     * Get nested iFrames (iFrames within iFrames)
     * @param rootIframe - Root iFrame selector
     * @returns Array of nested iFrame information
     */
    getNestedIFrames(rootIframe: string): IFrameInfo[] {
        const doc = this.getIFrameDocument(rootIframe);
        if (!doc) {
            return [];
        }

        const iframes = Array.from(doc.querySelectorAll('iframe'));
        return iframes.map((iframe, index) => ({
            id: iframe.id || `nested-iframe-${index}`,
            src: iframe.src,
            name: iframe.name,
            element: iframe,
            accessible: this.isIFrameAccessible(iframe)
        }));
    }

    /**
     * Post message to iFrame
     * @param iframeSelector - iFrame selector
     * @param message - Message to send
     * @param targetOrigin - Target origin (default: *)
     */
    postMessageToIFrame(iframeSelector: string, message: any, targetOrigin: string = '*'): boolean {
        const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
        if (!iframe || !iframe.contentWindow) {
            return false;
        }

        try {
            iframe.contentWindow.postMessage(message, targetOrigin);
            return true;
        } catch (error) {
            console.error('Post message to iFrame failed:', error);
            return false;
        }
    }
}
