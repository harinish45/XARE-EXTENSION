/**
 * Action History Service
 * 
 * Records all automation actions with before/after state for undo/redo functionality.
 * Enables recovery from mistakes and provides audit trail.
 */

export interface ActionState {
    type: string;
    target?: string;
    value?: any;
    metadata?: Record<string, any>;
}

export interface ActionRecord {
    id: string;
    timestamp: number;
    action: string;
    description: string;
    beforeState: ActionState;
    afterState: ActionState;
    undoable: boolean;
    undone: boolean;
}

export interface UndoResult {
    success: boolean;
    actionId: string;
    error?: string;
}

export class ActionHistoryService {
    private static instance: ActionHistoryService;
    private history: ActionRecord[] = [];
    private maxHistorySize: number = 100;
    private currentIndex: number = -1;

    private constructor() { }

    static getInstance(): ActionHistoryService {
        if (!ActionHistoryService.instance) {
            ActionHistoryService.instance = new ActionHistoryService();
        }
        return ActionHistoryService.instance;
    }

    /**
     * Record an action in history
     */
    recordAction(
        action: string,
        description: string,
        beforeState: ActionState,
        afterState: ActionState,
        undoable: boolean = true
    ): string {
        const record: ActionRecord = {
            id: this.generateId(),
            timestamp: Date.now(),
            action,
            description,
            beforeState,
            afterState,
            undoable,
            undone: false
        };

        // If we're not at the end of history, remove everything after current position
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add new record
        this.history.push(record);
        this.currentIndex++;

        // Enforce max size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

        console.log(`[ActionHistory] Recorded: ${description} (${record.id})`);
        return record.id;
    }

    /**
     * Undo the last action
     */
    async undo(): Promise<UndoResult> {
        if (this.currentIndex < 0) {
            return {
                success: false,
                actionId: '',
                error: 'Nothing to undo'
            };
        }

        const record = this.history[this.currentIndex];

        if (!record.undoable) {
            return {
                success: false,
                actionId: record.id,
                error: 'Action is not undoable'
            };
        }

        if (record.undone) {
            return {
                success: false,
                actionId: record.id,
                error: 'Action already undone'
            };
        }

        try {
            // Perform undo by restoring before state
            await this.restoreState(record.beforeState);

            record.undone = true;
            this.currentIndex--;

            console.log(`[ActionHistory] Undone: ${record.description}`);
            return {
                success: true,
                actionId: record.id
            };
        } catch (error) {
            console.error(`[ActionHistory] Undo failed:`, error);
            return {
                success: false,
                actionId: record.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Redo the last undone action
     */
    async redo(): Promise<UndoResult> {
        if (this.currentIndex >= this.history.length - 1) {
            return {
                success: false,
                actionId: '',
                error: 'Nothing to redo'
            };
        }

        const record = this.history[this.currentIndex + 1];

        if (!record.undone) {
            return {
                success: false,
                actionId: record.id,
                error: 'Action not undone'
            };
        }

        try {
            // Perform redo by restoring after state
            await this.restoreState(record.afterState);

            record.undone = false;
            this.currentIndex++;

            console.log(`[ActionHistory] Redone: ${record.description}`);
            return {
                success: true,
                actionId: record.id
            };
        } catch (error) {
            console.error(`[ActionHistory] Redo failed:`, error);
            return {
                success: false,
                actionId: record.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Undo multiple actions
     */
    async undoMultiple(count: number): Promise<UndoResult[]> {
        const results: UndoResult[] = [];

        for (let i = 0; i < count; i++) {
            const result = await this.undo();
            results.push(result);

            if (!result.success) {
                break;
            }
        }

        return results;
    }

    /**
     * Restore a state (implement based on action type)
     */
    private async restoreState(state: ActionState): Promise<void> {
        // This is a placeholder - actual implementation depends on action types
        switch (state.type) {
            case 'dom_change':
                await this.restoreDOMState(state);
                break;
            case 'input':
                await this.restoreInputState(state);
                break;
            case 'navigation':
                await this.restoreNavigationState(state);
                break;
            case 'file_operation':
                await this.restoreFileState(state);
                break;
            default:
                console.warn(`[ActionHistory] Unknown state type: ${state.type}`);
        }
    }

    /**
     * Restore DOM state
     */
    private async restoreDOMState(state: ActionState): Promise<void> {
        if (!state.target) return;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error('No active tab');

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (selector: string, value: any) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        if ('value' in element) {
                            (element as HTMLInputElement).value = value;
                        } else if ('textContent' in element) {
                            element.textContent = value;
                        }
                    }
                },
                args: [state.target, state.value]
            });
        } catch (error) {
            console.error('[ActionHistory] DOM restore failed:', error);
            throw error;
        }
    }

    /**
     * Restore input state
     */
    private async restoreInputState(state: ActionState): Promise<void> {
        // Similar to DOM state but for input fields
        await this.restoreDOMState(state);
    }

    /**
     * Restore navigation state
     */
    private async restoreNavigationState(state: ActionState): Promise<void> {
        if (!state.value) return;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error('No active tab');

            await chrome.tabs.update(tab.id, { url: state.value });
        } catch (error) {
            console.error('[ActionHistory] Navigation restore failed:', error);
            throw error;
        }
    }

    /**
     * Restore file state
     */
    private async restoreFileState(_state: ActionState): Promise<void> {
        // File operations typically can't be undone automatically
        console.warn('[ActionHistory] File operations cannot be automatically undone');
        throw new Error('File operations cannot be automatically undone');
    }

    /**
     * Get action history
     */
    getHistory(limit?: number): ActionRecord[] {
        const history = [...this.history];
        return limit ? history.slice(-limit) : history;
    }

    /**
     * Get specific action by ID
     */
    getAction(actionId: string): ActionRecord | null {
        return this.history.find(r => r.id === actionId) || null;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex >= 0 &&
            this.history[this.currentIndex]?.undoable === true &&
            this.history[this.currentIndex]?.undone === false;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1 &&
            this.history[this.currentIndex + 1]?.undone === true;
    }

    /**
     * Get undo/redo status
     */
    getStatus(): {
        canUndo: boolean;
        canRedo: boolean;
        historySize: number;
        currentIndex: number;
    } {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            historySize: this.history.length,
            currentIndex: this.currentIndex
        };
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
        this.currentIndex = -1;
        console.log('[ActionHistory] History cleared');
    }

    /**
     * Set maximum history size
     */
    setMaxHistorySize(size: number): void {
        this.maxHistorySize = Math.max(10, size);

        // Trim if necessary
        if (this.history.length > this.maxHistorySize) {
            const excess = this.history.length - this.maxHistorySize;
            this.history = this.history.slice(excess);
            this.currentIndex = Math.max(-1, this.currentIndex - excess);
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export history for persistence
     */
    exportHistory(): ActionRecord[] {
        return this.history.map(r => ({ ...r }));
    }

    /**
     * Import history from persistence
     */
    importHistory(history: ActionRecord[]): void {
        this.history = history.map(r => ({ ...r }));
        this.currentIndex = this.history.length - 1;
    }
}

// Singleton instance
export const actionHistoryService = ActionHistoryService.getInstance();
