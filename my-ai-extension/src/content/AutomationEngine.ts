export type ActionType = 'SCRAPE' | 'CLICK' | 'TYPE' | 'MONITOR' | 'HIGHLIGHT';

export interface AutomationAction {
    type: ActionType;
    selector: string;
    text?: string;
    value?: string;
}

export class AutomationEngine {
    constructor() {
        console.log('AutomationEngine initialized');
    }

    async execute(action: AutomationAction): Promise<any> {
        console.log('Executing action:', action);
        const element = document.querySelector(action.selector) as HTMLElement;

        if (!element && action.type !== 'MONITOR') {
            if (action.type !== 'SCRAPE') throw new Error(`Element not found: ${action.selector}`);
            return null;
        }

        switch (action.type) {
            case 'SCRAPE':
                if (!element) return document.body.innerText;
                return element.innerText || element.textContent || '';

            case 'CLICK':
                await this.visualizeClick(element);
                element.click();
                return { success: true };

            case 'TYPE':
                await this.visualizeHighlight(element);
                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                    element.value = action.text || '';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    element.textContent = action.text || '';
                }
                return { success: true };

            case 'HIGHLIGHT':
                this.visualizeHighlight(element);
                return { success: true };

            case 'MONITOR':
                return { success: true, message: 'Monitor started (mock)' };

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    private async visualizeClick(element: HTMLElement) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const circle = document.createElement('div');
        circle.style.position = 'fixed'; // vs absolute? fixed covers viewport
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.style.width = '20px';
        circle.style.height = '20px';
        circle.style.borderRadius = '50%';
        circle.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        circle.style.border = '2px solid red';
        circle.style.transform = 'translate(-50%, -50%) scale(0)';
        circle.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        circle.style.zIndex = '999999';
        circle.style.pointerEvents = 'none';

        document.body.appendChild(circle);

        // Animate in
        setTimeout(() => {
            circle.style.transform = 'translate(-50%, -50%) scale(1.5)';
        }, 10);

        // Wait and remove
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                circle.style.opacity = '0';
                setTimeout(() => {
                    circle.remove();
                    resolve();
                }, 300);
            }, 500);
        });
    }

    private async visualizeHighlight(element: HTMLElement) {
        const originalOutline = element.style.outline;
        const originalTransition = element.style.transition;

        element.style.transition = 'outline 0.2s ease-in-out';
        element.style.outline = '3px solid #22D3EE'; // Cyan accent

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                element.style.outline = originalOutline;
                element.style.transition = originalTransition;
                resolve();
            }, 1000); // Highlight duration
        });
    }
}
