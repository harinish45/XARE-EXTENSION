import type { AutomationAction } from '../../content/AutomationEngine';

export interface ActionRecord {
    action: AutomationAction;
    result: 'success' | 'failed' | 'skipped';
    error?: string;
    timestamp: number;
}

/**
 * TaskMemory: Tracks action history for context-aware prompting.
 * Feeds back into LLM prompt to prevent repeating failed actions.
 */
export class TaskMemory {
    private actions: ActionRecord[] = [];
    private maxHistory = 10;
    private clickedElements: Set<string> = new Set();
    private failedElements: Set<string> = new Set();

    record(action: AutomationAction, result: 'success' | 'failed' | 'skipped', error?: string): void {
        this.actions.push({
            action,
            result,
            error,
            timestamp: Date.now()
        });

        // Track clicked elements
        if (action.type === 'CLICK' && action.text) {
            if (result === 'success') {
                this.clickedElements.add(action.text.toLowerCase());
            } else {
                this.failedElements.add(action.text.toLowerCase());
            }
        }

        // Trim old history
        if (this.actions.length > this.maxHistory) {
            this.actions = this.actions.slice(-this.maxHistory);
        }
    }

    wasAlreadyClicked(text: string): boolean {
        return this.clickedElements.has(text.toLowerCase());
    }

    hasFailed(text: string): boolean {
        return this.failedElements.has(text.toLowerCase());
    }

    /**
     * Generate a summary for the LLM prompt.
     */
    toPromptString(): string {
        if (this.actions.length === 0) return '';

        const lines = this.actions.map((rec, i) => {
            const actionStr = `${rec.action.type}${rec.action.text ? ` "${rec.action.text}"` : ''}`;
            const resultStr = rec.result === 'success' ? '✓' : `✗ (${rec.error || 'failed'})`;
            return `${i + 1}. ${actionStr} → ${resultStr}`;
        });

        return `Previous actions:\n${lines.join('\n')}`;
    }

    getLastAction(): ActionRecord | null {
        return this.actions[this.actions.length - 1] || null;
    }

    getFailedCount(): number {
        return this.actions.filter(a => a.result === 'failed').length;
    }

    clear(): void {
        this.actions = [];
        this.clickedElements.clear();
        this.failedElements.clear();
    }
}
