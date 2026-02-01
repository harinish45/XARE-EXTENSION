export type ActionType = 'SCRAPE' | 'CLICK' | 'TYPE' | 'SCROLL' | 'WAIT' | 'HIGHLIGHT' | 'GET_DOM_SUMMARY' | 'FINISH';

export interface AutomationAction {
    type: ActionType;
    selector?: string;
    text?: string;
    value?: string;
    direction?: 'UP' | 'DOWN';
}

export interface DOMSummary {
    title: string;
    headings: string[];
    buttons: string[];
    links: string[];
    inputs: string[];
    visibleText: string;
}

export class AutomationEngine {
    constructor() {
        console.log('AutomationEngine initialized');
    }

    async execute(action: AutomationAction): Promise<any> {
        console.log('Executing action:', action);

        switch (action.type) {
            case 'SCRAPE':
                return this.scrape(action.selector);

            case 'CLICK':
                return this.smartClick(action.text, action.selector);

            case 'TYPE':
                return this.smartType(action.text, action.value, action.selector);

            case 'SCROLL':
                return this.scroll(action.direction || 'DOWN');

            case 'WAIT':
                return this.wait(1000);

            case 'HIGHLIGHT':
                if (action.selector) {
                    const el = document.querySelector(action.selector) as HTMLElement;
                    if (el) await this.visualizeHighlight(el);
                }
                return { success: true };

            case 'GET_DOM_SUMMARY':
                return this.getDOMSummary();

            case 'FINISH':
                return { success: true, finished: true };

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    // Smart CLICK with tiered escalation and confidence scoring
    private async smartClick(text?: string, selector?: string): Promise<any> {
        if (!text && !selector) {
            return { success: false, error: 'No text or selector provided' };
        }

        // Tiered escalation strategy
        const strategies = [
            { name: 'exact_button', fn: () => this.findByExactText(text!, 'button, [role="button"]') },
            { name: 'exact_link', fn: () => this.findByExactText(text!, 'a') },
            { name: 'partial_button', fn: () => this.findByPartialText(text!, 'button, [role="button"]') },
            { name: 'partial_link', fn: () => this.findByPartialText(text!, 'a') },
            { name: 'aria_label', fn: () => document.querySelector(`[aria-label*="${text}" i]`) as HTMLElement },
            { name: 'input_value', fn: () => document.querySelector(`input[value*="${text}" i]`) as HTMLElement },
            { name: 'any_element', fn: () => this.findByPartialText(text!, '*') },
            { name: 'selector', fn: () => selector ? document.querySelector(selector) as HTMLElement : null },
        ];

        // Confidence scores for strategies
        const confidenceMap: Record<string, number> = {
            'exact_button': 1.0,
            'exact_link': 0.95,
            'partial_button': 0.7,
            'partial_link': 0.65,
            'aria_label': 0.6,
            'input_value': 0.5,
            'any_element': 0.4,
            'selector': 0.3,
        };

        let element: HTMLElement | null = null;
        let usedStrategy = '';
        let confidence = 0;

        if (text) {
            for (const strategy of strategies) {
                try {
                    element = strategy.fn();
                    if (element && this.isClickable(element)) {
                        usedStrategy = strategy.name;
                        confidence = confidenceMap[strategy.name] || 0;
                        break;
                    }
                } catch {
                    continue;
                }
            }
        }

        // Fallback: try scrolling to find element
        if (!element && text) {
            window.scrollBy({ top: 300, behavior: 'smooth' });
            await this.sleep(500);
            element = this.findByPartialText(text, 'button, a, [role="button"]');
            if (element) {
                usedStrategy = 'scroll_and_find';
                confidence = 0.3;
            }
        }

        if (!element) {
            return {
                success: false,
                error: `Element not found: "${text || selector}"`,
                tried: strategies.map(s => s.name)
            };
        }

        // Check if element is disabled
        if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
            return { success: false, error: 'Element is disabled', element: text };
        }

        await this.visualizeClick(element);
        element.click();

        return {
            success: true,
            clicked: text || selector,
            strategy: usedStrategy,
            confidence
        };
    }

    private findByExactText(text: string, selector: string): HTMLElement | null {
        const elements = document.querySelectorAll(selector);
        const lowerText = text.toLowerCase().trim();

        for (const el of elements) {
            const elText = (el.textContent || '').toLowerCase().trim();
            if (elText === lowerText) {
                return el as HTMLElement;
            }
        }
        return null;
    }

    private findByPartialText(text: string, selector: string): HTMLElement | null {
        const elements = document.querySelectorAll(selector);
        const lowerText = text.toLowerCase().trim();

        // First try starts-with
        for (const el of elements) {
            const elText = (el.textContent || '').toLowerCase().trim();
            if (elText.startsWith(lowerText)) {
                return el as HTMLElement;
            }
        }

        // Then try contains
        for (const el of elements) {
            const elText = (el.textContent || '').toLowerCase().trim();
            if (elText.includes(lowerText)) {
                return el as HTMLElement;
            }
        }

        return null;
    }

    private isClickable(element: HTMLElement): boolean {
        const rect = element.getBoundingClientRect();
        // Must be visible and have size
        return rect.width > 0 && rect.height > 0 &&
            rect.top < window.innerHeight && rect.bottom > 0;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Smart TYPE: find input by text/label/placeholder, then type
    private async smartType(target?: string, value?: string, selector?: string): Promise<any> {
        let element: HTMLElement | null = null;

        if (target) {
            // 1. Try placeholder match
            element = document.querySelector(`input[placeholder*="${target}" i], textarea[placeholder*="${target}" i]`) as HTMLElement;

            // 2. Try associated label
            if (!element) {
                const labels = document.querySelectorAll('label');
                for (const label of labels) {
                    if ((label.textContent || '').toLowerCase().includes(target.toLowerCase())) {
                        const forId = label.getAttribute('for');
                        if (forId) element = document.getElementById(forId) as HTMLElement;
                        break;
                    }
                }
            }

            // 3. Try aria-label
            if (!element) element = document.querySelector(`input[aria-label*="${target}" i], textarea[aria-label*="${target}" i]`) as HTMLElement;
        }

        // Fallback to selector
        if (!element && selector) {
            element = document.querySelector(selector) as HTMLElement;
        }

        // Last resort: first visible input
        if (!element) {
            element = document.querySelector('input:not([type="hidden"]), textarea') as HTMLElement;
        }

        if (!element) {
            return { success: false, error: `Input not found: "${target || selector}"` };
        }

        await this.visualizeHighlight(element);

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.focus();
            element.value = value || '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return { success: true, typed: value };
    }

    private scroll(direction: 'UP' | 'DOWN'): { success: boolean } {
        const amount = direction === 'DOWN' ? 500 : -500;
        window.scrollBy({ top: amount, behavior: 'smooth' });
        return { success: true };
    }

    private wait(ms: number): Promise<{ success: boolean }> {
        return new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), ms);
        });
    }

    private scrape(selector?: string): string {
        if (selector) {
            const el = document.querySelector(selector) as HTMLElement;
            if (el) return el.innerText || el.textContent || '';
        }
        return document.body.innerText;
    }

    getDOMSummary(): DOMSummary {
        const title = document.title;

        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(el => (el.textContent || '').trim())
            .filter(t => t.length > 0)
            .slice(0, 10);

        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]'))
            .map(el => (el.textContent || (el as HTMLInputElement).value || '').trim())
            .filter(t => t.length > 0 && t.length < 50)
            .slice(0, 15);

        const links = Array.from(document.querySelectorAll('a'))
            .map(el => (el.textContent || '').trim())
            .filter(t => t.length > 0 && t.length < 50)
            .slice(0, 15);

        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'))
            .map(el => {
                const placeholder = (el as HTMLInputElement).placeholder || '';
                const label = el.getAttribute('aria-label') || '';
                const name = el.getAttribute('name') || '';
                return placeholder || label || name || 'input';
            })
            .filter(t => t.length > 0)
            .slice(0, 10);

        // Visible text (truncated)
        const visibleText = document.body.innerText.substring(0, 2000);

        return { title, headings, buttons, links, inputs, visibleText };
    }

    private async visualizeClick(element: HTMLElement) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const circle = document.createElement('div');
        circle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: rgba(34, 211, 238, 0.5);
            border: 2px solid #22D3EE;
            transform: translate(-50%, -50%) scale(0);
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
            z-index: 999999;
            pointer-events: none;
        `;

        document.body.appendChild(circle);

        setTimeout(() => {
            circle.style.transform = 'translate(-50%, -50%) scale(1.5)';
        }, 10);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                circle.style.opacity = '0';
                setTimeout(() => {
                    circle.remove();
                    resolve();
                }, 300);
            }, 400);
        });
    }

    private async visualizeHighlight(element: HTMLElement) {
        const originalOutline = element.style.outline;
        const originalTransition = element.style.transition;

        element.style.transition = 'outline 0.2s ease-in-out';
        element.style.outline = '3px solid #22D3EE';

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                element.style.outline = originalOutline;
                element.style.transition = originalTransition;
                resolve();
            }, 800);
        });
    }
}
