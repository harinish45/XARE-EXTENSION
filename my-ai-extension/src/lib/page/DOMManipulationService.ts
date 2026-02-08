// DOM Manipulation Service - Full page access and editing with robust error handling

// ============================================================================
// Type Definitions
// ============================================================================

export interface BoundingRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface DOMElement {
    selector: string;
    tagName: string;
    textContent: string;
    innerHTML: string;
    attributes: Record<string, string>;
    isVisible: boolean;
    isDisabled: boolean;
    boundingRect?: BoundingRect;
}

export interface DOMManipulationResult {
    success: boolean;
    element?: DOMElement | null;
    error?: string;
    timestamp: number;
}

export interface BatchOperation {
    type: 'setText' | 'setHTML' | 'setStyle' | 'add' | 'remove' | 'click' | 'fill';
    selector: string;
    value?: any;
    attributes?: Record<string, string>;
}

export interface BatchOperationResult {
    operations: Array<{
        operation: BatchOperation;
        success: boolean;
        error?: string;
    }>;
    totalSuccess: number;
    totalFailed: number;
    duration: number;
}

export interface DOMManipulationOptions {
    waitForElement?: boolean;
    timeout?: number;
    retryCount?: number;
    validateBeforeAction?: boolean;
    scrollIntoView?: boolean;
}

export interface DOMManipulationMetrics {
    operationCount: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
    lastOperationTime: number;
}

// ============================================================================
// Error Types
// ============================================================================

export const DOMErrorType = {
    ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
    INVALID_SELECTOR: 'INVALID_SELECTOR',
    OPERATION_FAILED: 'OPERATION_FAILED',
    TIMEOUT: 'TIMEOUT',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    READ_ONLY: 'READ_ONLY',
} as const;

export type DOMErrorType = typeof DOMErrorType[keyof typeof DOMErrorType];

export class DOMError extends Error {
    type: DOMErrorType;
    selector?: string;
    operation?: string;

    constructor(type: DOMErrorType, message: string, selector?: string, operation?: string) {
        super(message);
        this.name = 'DOMError';
        this.type = type;
        this.selector = selector;
        this.operation = operation;
        Object.setPrototypeOf(this, DOMError.prototype);
    }
}

// ============================================================================
// Logger Utility
// ============================================================================

class DOMLogger {
    private static instance: DOMLogger;
    private logs: Array<{ timestamp: number; level: string; message: string; data?: unknown }> = [];
    private maxLogs = 500;

    private constructor() { }

    static getInstance(): DOMLogger {
        if (!DOMLogger.instance) {
            DOMLogger.instance = new DOMLogger();
        }
        return DOMLogger.instance;
    }

    private log(level: string, message: string, data?: unknown): void {
        const entry = {
            timestamp: Date.now(),
            level,
            message,
            data,
        };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        console.log(`[DOMManipulation] [${level}] [${new Date(entry.timestamp).toISOString()}] ${message}`, data || '');
    }

    info(message: string, data?: unknown): void {
        this.log('INFO', message, data);
    }

    warn(message: string, data?: unknown): void {
        this.log('WARN', message, data);
    }

    error(message: string, data?: unknown): void {
        this.log('ERROR', message, data);
    }

    debug(message: string, data?: unknown): void {
        this.log('DEBUG', message, data);
    }

    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }
}

// ============================================================================
// Main Service Class
// ============================================================================

export class DOMManipulationService {
    private metrics: DOMManipulationMetrics = {
        operationCount: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        lastOperationTime: 0,
    };
    private defaultOptions: DOMManipulationOptions = {
        waitForElement: false,
        timeout: 5000,
        retryCount: 1,
        validateBeforeAction: true,
        scrollIntoView: false,
    };

    constructor() {
        DOMLogger.getInstance().info('DOMManipulationService initialized');
    }

    // ========================================================================
    // Public Methods
    // ========================================================================

    /**
     * Get element by selector with detailed information
     */
    async getElement(selector: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Getting element', { requestId, selector, options });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.getElementFunction, [selector, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, `Element not found: ${selector}`, selector);
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Element retrieved successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to get element', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Set element text content
     */
    async setTextContent(selector: string, text: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Setting text content', { requestId, selector, textLength: text.length });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.setTextContentFunction, [selector, text, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to set text content for: ${selector}`, selector, 'setTextContent');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Text content set successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to set text content', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Set element inner HTML
     */
    async setInnerHTML(selector: string, html: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Setting inner HTML', { requestId, selector, htmlLength: html.length });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.setInnerHTMLFunction, [selector, html, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to set inner HTML for: ${selector}`, selector, 'setInnerHTML');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Inner HTML set successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to set inner HTML', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Modify element styles
     */
    async setStyles(selector: string, styles: Record<string, string>, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Setting styles', { requestId, selector, styleCount: Object.keys(styles).length });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.setStylesFunction, [selector, styles, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to set styles for: ${selector}`, selector, 'setStyles');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Styles set successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to set styles', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Add new element to DOM
     */
    async addElement(
        parentSelector: string,
        tagName: string,
        attributes?: Record<string, string>,
        textContent?: string,
        options?: Partial<DOMManipulationOptions>
    ): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Adding element', { requestId, parentSelector, tagName, attributes, textContent });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.addElementFunction, [parentSelector, tagName, attributes, textContent, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to add element to: ${parentSelector}`, parentSelector, 'addElement');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Element added successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to add element', { requestId, parentSelector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Remove element from DOM
     */
    async removeElement(selector: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Removing element', { requestId, selector });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.removeElementFunction, [selector, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to remove element: ${selector}`, selector, 'removeElement');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Element removed successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to remove element', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Get all elements matching selector
     */
    async getAllElements(selector: string, options?: Partial<DOMManipulationOptions>): Promise<DOMElement[]> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Getting all elements', { requestId, selector });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement[]>(tab.id, this.getAllElementsFunction, [selector, mergedOptions]);

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Elements retrieved successfully', { requestId, count: result?.length || 0, duration: Date.now() - startTime });

            return result || [];
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to get all elements', { requestId, selector, error: errorMessage });
            return [];
        }
    }

    /**
     * Click element
     */
    async clickElement(selector: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Clicking element', { requestId, selector });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.clickElementFunction, [selector, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to click element: ${selector}`, selector, 'clickElement');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Element clicked successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to click element', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Fill form field
     */
    async fillField(selector: string, value: string, options?: Partial<DOMManipulationOptions>): Promise<DOMManipulationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            DOMLogger.getInstance().info('Filling field', { requestId, selector, valueLength: value.length });

            const mergedOptions = { ...this.defaultOptions, ...options };
            const tab = await this.getActiveTab();
            if (!tab.id) {
                throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
            }

            const result = await this.executeScript<DOMElement | null>(tab.id, this.fillFieldFunction, [selector, value, mergedOptions]);

            if (!result) {
                throw new DOMError(DOMErrorType.OPERATION_FAILED, `Failed to fill field: ${selector}`, selector, 'fillField');
            }

            this.updateMetrics(true, Date.now() - startTime);
            DOMLogger.getInstance().info('Field filled successfully', { requestId, duration: Date.now() - startTime });

            return {
                success: true,
                element: result,
                timestamp: Date.now(),
            };
        } catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            DOMLogger.getInstance().error('Failed to fill field', { requestId, selector, error: errorMessage });

            return {
                success: false,
                error: errorMessage,
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Execute multiple operations in batch
     */
    async executeBatch(operations: BatchOperation[]): Promise<BatchOperationResult> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        DOMLogger.getInstance().info('Executing batch operations', { requestId, operationCount: operations.length });

        const results: Array<{ operation: BatchOperation; success: boolean; error?: string }> = [];
        let totalSuccess = 0;
        let totalFailed = 0;

        for (const operation of operations) {
            try {
                let result: DOMManipulationResult;

                switch (operation.type) {
                    case 'setText':
                        result = await this.setTextContent(operation.selector, operation.value);
                        break;
                    case 'setHTML':
                        result = await this.setInnerHTML(operation.selector, operation.value);
                        break;
                    case 'setStyle':
                        result = await this.setStyles(operation.selector, operation.value);
                        break;
                    case 'add':
                        result = await this.addElement(operation.selector, operation.value, operation.attributes);
                        break;
                    case 'remove':
                        result = await this.removeElement(operation.selector);
                        break;
                    case 'click':
                        result = await this.clickElement(operation.selector);
                        break;
                    case 'fill':
                        result = await this.fillField(operation.selector, operation.value);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }

                if (result.success) {
                    totalSuccess++;
                    results.push({ operation, success: true });
                } else {
                    totalFailed++;
                    results.push({ operation, success: false, error: result.error });
                }
            } catch (error) {
                totalFailed++;
                results.push({
                    operation,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        const duration = Date.now() - startTime;
        DOMLogger.getInstance().info('Batch operations completed', {
            requestId,
            totalSuccess,
            totalFailed,
            duration,
        });

        return {
            operations: results,
            totalSuccess,
            totalFailed,
            duration,
        };
    }

    /**
     * Get metrics
     */
    getMetrics(): DOMManipulationMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            operationCount: 0,
            successCount: 0,
            failureCount: 0,
            averageDuration: 0,
            lastOperationTime: 0,
        };
        DOMLogger.getInstance().info('Metrics reset');
    }

    /**
     * Get all logs
     */
    getLogs(): Array<{ timestamp: number; level: string; message: string; data?: unknown }> {
        return DOMLogger.getInstance().getLogs();
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        DOMLogger.getInstance().clearLogs();
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private async getActiveTab(): Promise<chrome.tabs.Tab> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new DOMError(DOMErrorType.ELEMENT_NOT_FOUND, 'No active tab found');
        }
        return tab;
    }

    private async executeScript<T>(tabId: number, func: (...args: any[]) => T, args: any[]): Promise<T | null> {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func,
            args,
        });
        const scriptResult = result[0]?.result;
        return scriptResult !== undefined ? (scriptResult as T) : null;
    }

    private updateMetrics(success: boolean, duration: number): void {
        this.metrics.operationCount++;
        this.metrics.lastOperationTime = Date.now();

        if (success) {
            this.metrics.successCount++;
        } else {
            this.metrics.failureCount++;
        }

        // Update average duration
        const totalDuration = this.metrics.averageDuration * (this.metrics.operationCount - 1) + duration;
        this.metrics.averageDuration = totalDuration / this.metrics.operationCount;
    }

    private generateRequestId(): string {
        return `dom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================================================
    // Script Functions (injected into page)
    // ========================================================================

    private getElementFunction = (selector: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector);
            if (!el) return null;

            const attrs: Record<string, string> = {};
            for (const attr of el.attributes) {
                attrs[attr.name] = attr.value;
            }

            const htmlEl = el as HTMLElement;
            const rect = htmlEl.getBoundingClientRect();

            return {
                selector,
                tagName: el.tagName,
                textContent: el.textContent || '',
                innerHTML: el.innerHTML,
                attributes: attrs,
                isVisible: htmlEl.offsetParent !== null,
                isDisabled: htmlEl.hasAttribute('disabled'),
                boundingRect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                },
            };
        } catch (error) {
            console.error('Error in getElementFunction:', error);
            return null;
        }
    };

    private setTextContentFunction = (selector: string, text: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector);
            if (!el) return null;

            el.textContent = text;
            return this.getElementFunction(selector, options);
        } catch (error) {
            console.error('Error in setTextContentFunction:', error);
            return null;
        }
    };

    private setInnerHTMLFunction = (selector: string, html: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector);
            if (!el) return null;

            el.innerHTML = html;
            return this.getElementFunction(selector, options);
        } catch (error) {
            console.error('Error in setInnerHTMLFunction:', error);
            return null;
        }
    };

    private setStylesFunction = (selector: string, styles: Record<string, string>, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector) as HTMLElement;
            if (!el) return null;

            Object.assign(el.style, styles);
            return this.getElementFunction(selector, options);
        } catch (error) {
            console.error('Error in setStylesFunction:', error);
            return null;
        }
    };

    private addElementFunction = (
        parentSelector: string,
        tagName: string,
        attributes?: Record<string, string>,
        textContent?: string,
        options?: DOMManipulationOptions
    ): DOMElement | null => {
        try {
            const parentEl = document.querySelector(parentSelector);
            if (!parentEl) return null;

            const newEl = document.createElement(tagName);
            if (attributes) {
                Object.entries(attributes).forEach(([key, value]) => {
                    newEl.setAttribute(key, value);
                });
            }
            if (textContent) {
                newEl.textContent = textContent;
            }

            parentEl.appendChild(newEl);
            return this.getElementFunction(`[${tagName}]`, options || {});
        } catch (error) {
            console.error('Error in addElementFunction:', error);
            return null;
        }
    };

    private removeElementFunction = (selector: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector);
            if (!el) return null;

            const elementData = this.getElementFunction(selector, options);
            el.remove();
            return elementData;
        } catch (error) {
            console.error('Error in removeElementFunction:', error);
            return null;
        }
    };

    private getAllElementsFunction = (selector: string, options: DOMManipulationOptions): DOMElement[] => {
        try {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).map(el => {
                const attrs: Record<string, string> = {};
                for (const attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }

                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();

                return {
                    selector,
                    tagName: el.tagName,
                    textContent: el.textContent || '',
                    innerHTML: el.innerHTML,
                    attributes: attrs,
                    isVisible: htmlEl.offsetParent !== null,
                    isDisabled: htmlEl.hasAttribute('disabled'),
                    boundingRect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom,
                        left: rect.left,
                    },
                };
            });
        } catch (error) {
            console.error('Error in getAllElementsFunction:', error);
            return [];
        }
    };

    private clickElementFunction = (selector: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector) as HTMLElement;
            if (!el) return null;

            const elementData = this.getElementFunction(selector, options);
            el.click();
            return elementData;
        } catch (error) {
            console.error('Error in clickElementFunction:', error);
            return null;
        }
    };

    private fillFieldFunction = (selector: string, value: string, options: DOMManipulationOptions): DOMElement | null => {
        try {
            const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
            if (!el) return null;

            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            return this.getElementFunction(selector, options);
        } catch (error) {
            console.error('Error in fillFieldFunction:', error);
            return null;
        }
    };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const domManipulationService = new DOMManipulationService();
