// Page Actions Automation Service

export interface PageAction {
    type: 'click' | 'fill' | 'navigate' | 'scroll' | 'wait' | 'extract';
    selector?: string;
    value?: string;
    url?: string;
    duration?: number;
}

export interface ActionRecording {
    id: string;
    name: string;
    actions: PageAction[];
    createdAt: number;
}

export class PageActionsService {
    private recordings: Map<string, ActionRecording> = new Map();
    private isRecording = false;
    private currentRecording: PageAction[] = [];

    // Execute a single action
    async executeAction(action: PageAction): Promise<boolean> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return false;

        switch (action.type) {
            case 'click':
                return await this.clickElement(tab.id, action.selector!);
            case 'fill':
                return await this.fillField(tab.id, action.selector!, action.value!);
            case 'navigate':
                return await this.navigate(tab.id, action.url!);
            case 'scroll':
                return await this.scroll(tab.id, action.value!);
            case 'wait':
                await this.wait(action.duration!);
                return true;
            default:
                return false;
        }
    }

    // Execute sequence of actions
    async executeSequence(actions: PageAction[]): Promise<boolean> {
        for (const action of actions) {
            const success = await this.executeAction(action);
            if (!success) return false;
            await this.wait(500); // Small delay between actions
        }
        return true;
    }

    // Start recording actions
    startRecording(): void {
        this.isRecording = true;
        this.currentRecording = [];
    }

    // Stop recording and save
    stopRecording(name: string): string {
        this.isRecording = false;
        const id = Date.now().toString();
        const recording: ActionRecording = {
            id,
            name,
            actions: [...this.currentRecording],
            createdAt: Date.now()
        };
        this.recordings.set(id, recording);
        this.saveRecordings();
        return id;
    }

    // Add action to current recording
    recordAction(action: PageAction): void {
        if (this.isRecording) {
            this.currentRecording.push(action);
        }
    }

    // Replay recorded sequence
    async replayRecording(id: string): Promise<boolean> {
        const recording = this.recordings.get(id);
        if (!recording) return false;
        return await this.executeSequence(recording.actions);
    }

    // Private helper methods
    private async clickElement(tabId: number, selector: string): Promise<boolean> {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
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

    private async fillField(tabId: number, selector: string, value: string): Promise<boolean> {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: (sel: string, val: string) => {
                const el = document.querySelector(sel) as HTMLInputElement;
                if (!el) return false;
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            },
            args: [selector, value]
        });
        return result[0]?.result || false;
    }

    private async navigate(tabId: number, url: string): Promise<boolean> {
        await chrome.tabs.update(tabId, { url });
        return true;
    }

    private async scroll(tabId: number, direction: string): Promise<boolean> {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: (dir: string) => {
                const amount = dir === 'down' ? window.innerHeight : -window.innerHeight;
                window.scrollBy({ top: amount, behavior: 'smooth' });
                return true;
            },
            args: [direction]
        });
        return result[0]?.result || false;
    }

    private async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async saveRecordings(): Promise<void> {
        const recordingsArray = Array.from(this.recordings.values());
        await chrome.storage.local.set({ 'xare-recordings': recordingsArray });
    }

    async loadRecordings(): Promise<void> {
        const result = await chrome.storage.local.get('xare-recordings');
        if (result['xare-recordings']) {
            result['xare-recordings'].forEach((rec: ActionRecording) => {
                this.recordings.set(rec.id, rec);
            });
        }
    }

    getAllRecordings(): ActionRecording[] {
        return Array.from(this.recordings.values());
    }

    deleteRecording(id: string): void {
        this.recordings.delete(id);
        this.saveRecordings();
    }
}

export const pageActionsService = new PageActionsService();
