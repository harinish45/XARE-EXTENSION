/**
 * Emergency Stop Service
 * 
 * Provides a global kill switch to immediately stop all automation.
 * Can be triggered via keyboard shortcut or programmatically.
 */

export interface StoppableProcess {
    id: string;
    name: string;
    stop: () => Promise<void> | void;
}

export interface EmergencyStopEvent {
    timestamp: number;
    trigger: 'keyboard' | 'programmatic' | 'timeout';
    processesStoppedCount: number;
}

export class EmergencyStopService {
    private static instance: EmergencyStopService;
    private isStopped: boolean = false;
    private processes: Map<string, StoppableProcess> = new Map();
    private stopHistory: EmergencyStopEvent[] = [];
    private keyboardShortcut: string = 'Ctrl+Shift+Esc';
    private listeners: Set<(stopped: boolean) => void> = new Set();

    private constructor() {
        this.setupKeyboardListener();
    }

    static getInstance(): EmergencyStopService {
        if (!EmergencyStopService.instance) {
            EmergencyStopService.instance = new EmergencyStopService();
        }
        return EmergencyStopService.instance;
    }

    /**
     * Activate emergency stop
     */
    async activateEmergencyStop(trigger: 'keyboard' | 'programmatic' | 'timeout' = 'programmatic'): Promise<void> {
        if (this.isStopped) {
            console.log('[EmergencyStop] Already stopped');
            return;
        }

        console.warn(`[EmergencyStop] EMERGENCY STOP ACTIVATED (${trigger})`);
        this.isStopped = true;

        // Stop all registered processes
        const stopPromises: Promise<void>[] = [];
        let stoppedCount = 0;

        for (const [id, process] of this.processes.entries()) {
            try {
                console.log(`[EmergencyStop] Stopping process: ${process.name} (${id})`);
                const result = process.stop();
                if (result instanceof Promise) {
                    stopPromises.push(result);
                }
                stoppedCount++;
            } catch (error) {
                console.error(`[EmergencyStop] Failed to stop process ${id}:`, error);
            }
        }

        // Wait for all processes to stop
        await Promise.allSettled(stopPromises);

        // Record event
        const event: EmergencyStopEvent = {
            timestamp: Date.now(),
            trigger,
            processesStoppedCount: stoppedCount
        };
        this.stopHistory.push(event);

        // Notify listeners
        this.notifyListeners(true);

        // Show notification
        this.showNotification('Emergency Stop Activated',
            `Stopped ${stoppedCount} automation process(es)`);

        console.warn(`[EmergencyStop] Stopped ${stoppedCount} processes`);
    }

    /**
     * Deactivate emergency stop
     */
    deactivateEmergencyStop(): void {
        if (!this.isStopped) {
            console.log('[EmergencyStop] Not currently stopped');
            return;
        }

        console.log('[EmergencyStop] Emergency stop deactivated');
        this.isStopped = false;

        // Notify listeners
        this.notifyListeners(false);

        // Show notification
        this.showNotification('Emergency Stop Deactivated',
            'Automation can resume');
    }

    /**
     * Check if emergency stop is active
     */
    isEmergencyStopped(): boolean {
        return this.isStopped;
    }

    /**
     * Register a stoppable process
     */
    registerProcess(process: StoppableProcess): void {
        this.processes.set(process.id, process);
        console.log(`[EmergencyStop] Registered process: ${process.name} (${process.id})`);

        // If already stopped, stop this process immediately
        if (this.isStopped) {
            try {
                process.stop();
            } catch (error) {
                console.error(`[EmergencyStop] Failed to stop newly registered process:`, error);
            }
        }
    }

    /**
     * Unregister a process
     */
    unregisterProcess(processId: string): void {
        const process = this.processes.get(processId);
        if (process) {
            this.processes.delete(processId);
            console.log(`[EmergencyStop] Unregistered process: ${process.name} (${processId})`);
        }
    }

    /**
     * Get all registered processes
     */
    getRegisteredProcesses(): StoppableProcess[] {
        return Array.from(this.processes.values());
    }

    /**
     * Add listener for stop state changes
     */
    addListener(listener: (stopped: boolean) => void): void {
        this.listeners.add(listener);
    }

    /**
     * Remove listener
     */
    removeListener(listener: (stopped: boolean) => void): void {
        this.listeners.delete(listener);
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(stopped: boolean): void {
        this.listeners.forEach(listener => {
            try {
                listener(stopped);
            } catch (error) {
                console.error('[EmergencyStop] Listener error:', error);
            }
        });
    }

    /**
     * Setup keyboard listener
     */
    private setupKeyboardListener(): void {
        // Listen for keyboard shortcut
        document.addEventListener('keydown', (event) => {
            if (this.matchesShortcut(event)) {
                event.preventDefault();
                this.activateEmergencyStop('keyboard');
            }
        });

        console.log(`[EmergencyStop] Keyboard shortcut registered: ${this.keyboardShortcut}`);
    }

    /**
     * Check if keyboard event matches shortcut
     */
    private matchesShortcut(event: KeyboardEvent): boolean {
        const parts = this.keyboardShortcut.toLowerCase().split('+');
        const key = parts.pop();

        const ctrlPressed = parts.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
        const shiftPressed = parts.includes('shift') ? event.shiftKey : !event.shiftKey;
        const altPressed = parts.includes('alt') ? event.altKey : !event.altKey;
        const keyPressed = event.key.toLowerCase() === key;

        return ctrlPressed && shiftPressed && altPressed && keyPressed;
    }

    /**
     * Set keyboard shortcut
     */
    setKeyboardShortcut(shortcut: string): void {
        this.keyboardShortcut = shortcut;
        console.log(`[EmergencyStop] Keyboard shortcut updated: ${shortcut}`);
    }

    /**
     * Get keyboard shortcut
     */
    getKeyboardShortcut(): string {
        return this.keyboardShortcut;
    }

    /**
     * Show notification
     */
    private showNotification(title: string, message: string): void {
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('logo.png'),
                title,
                message,
                priority: 2
            });
        } catch (error) {
            console.error('[EmergencyStop] Failed to show notification:', error);
        }
    }

    /**
     * Get stop history
     */
    getStopHistory(limit?: number): EmergencyStopEvent[] {
        const history = [...this.stopHistory];
        return limit ? history.slice(-limit) : history;
    }

    /**
     * Clear stop history
     */
    clearHistory(): void {
        this.stopHistory = [];
    }

    /**
     * Get status
     */
    getStatus(): {
        isStopped: boolean;
        registeredProcesses: number;
        keyboardShortcut: string;
        lastStopEvent: EmergencyStopEvent | null;
    } {
        return {
            isStopped: this.isStopped,
            registeredProcesses: this.processes.size,
            keyboardShortcut: this.keyboardShortcut,
            lastStopEvent: this.stopHistory[this.stopHistory.length - 1] || null
        };
    }
}

// Singleton instance
export const emergencyStopService = EmergencyStopService.getInstance();
