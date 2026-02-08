/**
 * Shadow DOM Service
 * Handles element detection and manipulation across shadow DOM boundaries
 */

export class ShadowDOMService {
    private static instance: ShadowDOMService;

    private constructor() { }

    static getInstance(): ShadowDOMService {
        if (!ShadowDOMService.instance) {
            ShadowDOMService.instance = new ShadowDOMService();
        }
        return ShadowDOMService.instance;
    }

    /**
     * Find element across shadow DOM boundaries
     * @param selector - CSS selector
     * @param root - Root element to start search from
     * @returns Found element or null
     */
    findElement(selector: string, root: Document | Element = document): Element | null {
        // Try normal querySelector first
        const element = root.querySelector(selector);
        if (element) {
            return element;
        }

        // Search in shadow roots
        return this.findInShadowRoots(selector, root);
    }

    /**
     * Find all elements across shadow DOM boundaries
     * @param selector - CSS selector
     * @param root - Root element to start search from
     * @returns Array of found elements
     */
    findAllElements(selector: string, root: Document | Element = document): Element[] {
        const elements: Element[] = [];

        // Get elements from normal DOM
        const normalElements = Array.from(root.querySelectorAll(selector));
        elements.push(...normalElements);

        // Get elements from shadow DOMs
        const shadowElements = this.findAllInShadowRoots(selector, root);
        elements.push(...shadowElements);

        return elements;
    }

    /**
     * Recursively search shadow roots for element
     * @param selector - CSS selector
     * @param root - Root element
     * @returns Found element or null
     */
    private findInShadowRoots(selector: string, root: Document | Element): Element | null {
        const allElements = root.querySelectorAll('*');

        for (const element of Array.from(allElements)) {
            if (element.shadowRoot) {
                // Search in shadow root
                const found = element.shadowRoot.querySelector(selector);
                if (found) {
                    return found;
                }

                // Recursively search nested shadow roots
                const nested = this.findInShadowRoots(selector, element.shadowRoot);
                if (nested) {
                    return nested;
                }
            }
        }

        return null;
    }

    /**
     * Recursively search shadow roots for all matching elements
     * @param selector - CSS selector
     * @param root - Root element
     * @returns Array of found elements
     */
    private findAllInShadowRoots(selector: string, root: Document | Element): Element[] {
        const elements: Element[] = [];
        const allElements = root.querySelectorAll('*');

        for (const element of Array.from(allElements)) {
            if (element.shadowRoot) {
                // Get elements from shadow root
                const shadowElements = Array.from(element.shadowRoot.querySelectorAll(selector));
                elements.push(...shadowElements);

                // Recursively search nested shadow roots
                const nested = this.findAllInShadowRoots(selector, element.shadowRoot);
                elements.push(...nested);
            }
        }

        return elements;
    }

    /**
     * Get all shadow roots in the document
     * @param root - Root element
     * @returns Array of shadow roots
     */
    getAllShadowRoots(root: Document | Element = document): ShadowRoot[] {
        const shadowRoots: ShadowRoot[] = [];
        const allElements = root.querySelectorAll('*');

        for (const element of Array.from(allElements)) {
            if (element.shadowRoot) {
                shadowRoots.push(element.shadowRoot);

                // Recursively get nested shadow roots
                const nested = this.getAllShadowRoots(element.shadowRoot);
                shadowRoots.push(...nested);
            }
        }

        return shadowRoots;
    }

    /**
     * Check if element is inside shadow DOM
     * @param element - Element to check
     * @returns True if element is in shadow DOM
     */
    isInShadowDOM(element: Element): boolean {
        let current: Node | null = element;

        while (current) {
            if (current instanceof ShadowRoot) {
                return true;
            }
            current = current.parentNode;
        }

        return false;
    }

    /**
     * Get shadow root host for element
     * @param element - Element inside shadow DOM
     * @returns Shadow root host element or null
     */
    getShadowHost(element: Element): Element | null {
        let current: Node | null = element;

        while (current) {
            if (current instanceof ShadowRoot) {
                return current.host;
            }
            current = current.parentNode;
        }

        return null;
    }

    /**
     * Get full path to element including shadow DOM boundaries
     * @param element - Target element
     * @returns Array of path segments
     */
    getElementPath(element: Element): string[] {
        const path: string[] = [];
        let current: Node | null = element;

        while (current) {
            if (current instanceof Element) {
                const selector = this.getElementSelector(current);
                path.unshift(selector);
            } else if (current instanceof ShadowRoot) {
                path.unshift('::shadow-root');
            }
            current = current.parentNode;
        }

        return path;
    }

    /**
     * Get unique selector for element
     * @param element - Target element
     * @returns CSS selector
     */
    private getElementSelector(element: Element): string {
        if (element.id) {
            return `#${element.id}`;
        }

        const tagName = element.tagName.toLowerCase();
        const classes = Array.from(element.classList).join('.');

        if (classes) {
            return `${tagName}.${classes}`;
        }

        // Use nth-child if no id or class
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-child(${index})`;
        }

        return tagName;
    }

    /**
     * Click element in shadow DOM
     * @param selector - CSS selector
     * @param root - Root element
     * @returns True if clicked successfully
     */
    async clickElement(selector: string, root: Document | Element = document): Promise<boolean> {
        const element = this.findElement(selector, root);
        if (element && element instanceof HTMLElement) {
            element.click();
            return true;
        }
        return false;
    }

    /**
     * Set value of input in shadow DOM
     * @param selector - CSS selector
     * @param value - Value to set
     * @param root - Root element
     * @returns True if value was set
     */
    async setValue(selector: string, value: string, root: Document | Element = document): Promise<boolean> {
        const element = this.findElement(selector, root);
        if (element && element instanceof HTMLInputElement) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }

    /**
     * Get text content from element in shadow DOM
     * @param selector - CSS selector
     * @param root - Root element
     * @returns Text content or null
     */
    getTextContent(selector: string, root: Document | Element = document): string | null {
        const element = this.findElement(selector, root);
        return element?.textContent || null;
    }

    /**
     * Get attribute from element in shadow DOM
     * @param selector - CSS selector
     * @param attribute - Attribute name
     * @param root - Root element
     * @returns Attribute value or null
     */
    getAttribute(selector: string, attribute: string, root: Document | Element = document): string | null {
        const element = this.findElement(selector, root);
        return element?.getAttribute(attribute) || null;
    }

    /**
     * Wait for element to appear in shadow DOM
     * @param selector - CSS selector
     * @param timeout - Maximum wait time in ms
     * @param root - Root element
     * @returns Found element or null
     */
    async waitForElement(
        selector: string,
        timeout: number = 5000,
        root: Document | Element = document
    ): Promise<Element | null> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = this.findElement(selector, root);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null;
    }
}
