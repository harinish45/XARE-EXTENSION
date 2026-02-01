// DOM Manipulation Service - Full page access and editing

export interface DOMElement {
    selector: string;
    tagName: string;
    textContent: string;
    innerHTML: string;
    attributes: Record<string, string>;
}

export class DOMManipulationService {
    // Get element by selector
    async getElement(selector: string): Promise<DOMElement | null> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return null;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string) => {
                const el = document.querySelector(sel);
                if (!el) return null;

                const attrs: Record<string, string> = {};
                for (const attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }

                return {
                    selector: sel,
                    tagName: el.tagName,
                    textContent: el.textContent || '',
                    innerHTML: el.innerHTML,
                    attributes: attrs
                };
            },
            args: [selector]
        });

        return result[0]?.result || null;
    }

    // Set element text content
    async setTextContent(selector: string, text: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string, txt: string) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                el.textContent = txt;
                return true;
            },
            args: [selector, text]
        });

        return result[0]?.result || false;
    }

    // Set element HTML
    async setInnerHTML(selector: string, html: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string, htmlContent: string) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                el.innerHTML = htmlContent;
                return true;
            },
            args: [selector, html]
        });

        return result[0]?.result || false;
    }

    // Modify element styles
    async setStyles(selector: string, styles: Record<string, string>): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string, styleObj: Record<string, string>) => {
                const el = document.querySelector(sel) as HTMLElement;
                if (!el) return false;
                Object.assign(el.style, styleObj);
                return true;
            },
            args: [selector, styles]
        });

        return result[0]?.result || false;
    }

    // Add element
    async addElement(parentSelector: string, tagName: string, attributes?: Record<string, string>, textContent?: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (parent: string, tag: string, attrs?: Record<string, string>, text?: string) => {
                const parentEl = document.querySelector(parent);
                if (!parentEl) return false;

                const newEl = document.createElement(tag);
                if (attrs) {
                    Object.entries(attrs).forEach(([key, value]) => {
                        newEl.setAttribute(key, value);
                    });
                }
                if (text) newEl.textContent = text;

                parentEl.appendChild(newEl);
                return true;
            },
            args: [parentSelector, tagName, attributes, textContent]
        });

        return result[0]?.result || false;
    }

    // Remove element
    async removeElement(selector: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                el.remove();
                return true;
            },
            args: [selector]
        });

        return result[0]?.result || false;
    }

    // Get all elements matching selector
    async getAllElements(selector: string): Promise<DOMElement[]> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return [];

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string) => {
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => {
                    const attrs: Record<string, string> = {};
                    for (const attr of el.attributes) {
                        attrs[attr.name] = attr.value;
                    }

                    return {
                        selector: sel,
                        tagName: el.tagName,
                        textContent: el.textContent || '',
                        innerHTML: el.innerHTML,
                        attributes: attrs
                    };
                });
            },
            args: [selector]
        });

        return result[0]?.result || [];
    }

    // Click element
    async clickElement(selector: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string) => {
                const el = document.querySelector(sel) as HTMLElement;
                if (!el) return false;
                el.click();
                return true;
            },
            args: [selector]
        });

        return result[0]?.result || false;
    }

    // Fill form field
    async fillField(selector: string, value: string): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sel: string, val: string) => {
                const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
                if (!el) return false;
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            },
            args: [selector, value]
        });

        return result[0]?.result || false;
    }
}

export const domManipulationService = new DOMManipulationService();
