import { parseActionResponse, actionsEqual } from './ActionParser';
import { TaskMemory } from './TaskMemory';
import type { AutomationAction, DOMSummary } from '../../content/AutomationEngine';

export type AutomationStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';

export interface AutomationState {
    status: AutomationStatus;
    currentStep: number;
    maxSteps: number;
    lastAction: AutomationAction | null;
    lastActionCount: number;
    error: string | null;
    task: string;
    memory: string; // Action history for display
}

export interface LoopCallbacks {
    onStatusChange: (state: AutomationState) => void;
    onActionExecuted: (action: AutomationAction, result: any) => void;
    captureScreenshot: () => Promise<string>;
    getDOMSummary: () => Promise<DOMSummary>;
    executeAction: (action: AutomationAction) => Promise<any>;
    callLLM: (prompt: string, screenshot: string, domSummary: DOMSummary) => Promise<string>;
}

const AUTOMATION_SYSTEM_PROMPT = `You are an automation decision engine inside a browser extension.

You can see:
- The current webpage screenshot
- Extracted visible text from the page
- History of previous actions and their results

Rules:
- You do NOT interact with the page directly.
- You ONLY decide the next action.
- Actions must be returned in the exact format specified.
- Do NOT explain your reasoning.
- Do NOT ask questions.
- Do NOT repeat actions that already failed.
- Prefer CLICK over TYPE when a visible option exists.
- If no valid action is possible, return ACTION: FINISH

Allowed Actions:
- CLICK (target by visible text)
- TYPE (into input fields)
- SCROLL (UP or DOWN)
- WAIT
- FINISH

Output Format (STRICT):
ACTION: <action_type>
TEXT: <visible_text_to_click_or_target>
VALUE: <text_to_type_if_TYPE_action>
DIRECTION: <UP_or_DOWN_if_SCROLL>

Examples:
ACTION: CLICK
TEXT: Sign Up

ACTION: TYPE
TARGET: Search
VALUE: hello world

ACTION: SCROLL
DIRECTION: DOWN

ACTION: FINISH`;

export class AutomationLoop {
    private state: AutomationState;
    private callbacks: LoopCallbacks;
    private abortController: AbortController | null = null;
    private memory: TaskMemory;

    constructor(callbacks: LoopCallbacks) {
        this.callbacks = callbacks;
        this.memory = new TaskMemory();
        this.state = this.initialState('');
    }

    private initialState(task: string): AutomationState {
        return {
            status: 'idle',
            currentStep: 0,
            maxSteps: 20,
            lastAction: null,
            lastActionCount: 0,
            error: null,
            task,
            memory: '',
        };
    }

    async start(task: string): Promise<void> {
        this.state = this.initialState(task);
        this.state.status = 'running';
        this.memory.clear();
        this.abortController = new AbortController();
        this.emitStatus();

        try {
            await this.loop();
        } catch (err: any) {
            this.state.status = 'error';
            this.state.error = err.message;
            this.emitStatus();
        }
    }

    stop(): void {
        this.abortController?.abort();
        this.state.status = 'idle';
        this.emitStatus();
    }

    private async loop(): Promise<void> {
        while (
            this.state.status === 'running' &&
            this.state.currentStep < this.state.maxSteps
        ) {
            // Check abort
            if (this.abortController?.signal.aborted) {
                this.state.status = 'idle';
                break;
            }

            // Step 1: Capture screenshot + DOM
            const screenshot = await this.callbacks.captureScreenshot();
            const domSummary = await this.callbacks.getDOMSummary();

            // Step 2: Build prompt with memory context
            const memoryContext = this.memory.toPromptString();
            const userPrompt = `Task: ${this.state.task}

Current page title: ${domSummary.title}
Visible buttons: ${domSummary.buttons.join(', ')}
Visible links: ${domSummary.links.slice(0, 10).join(', ')}
Input fields: ${domSummary.inputs.join(', ')}

${memoryContext ? memoryContext + '\n\n' : ''}Decide the next action to complete the task.`;

            const llmResponse = await this.callbacks.callLLM(
                AUTOMATION_SYSTEM_PROMPT + '\n\n' + userPrompt,
                screenshot,
                domSummary
            );

            // Step 3: Parse response
            const parseResult = parseActionResponse(llmResponse);

            if (!parseResult.success) {
                // Re-prompt on parse error
                console.warn('Parser error, asking LLM to retry');
                const retryResponse = await this.callbacks.callLLM(
                    'Respond ONLY in ACTION format. No prose.\n\n' + userPrompt,
                    screenshot,
                    domSummary
                );
                const retryParse = parseActionResponse(retryResponse);
                if (!retryParse.success) {
                    this.state.error = 'LLM failed to return valid action format';
                    this.state.status = 'error';
                    break;
                }
                // Use retry result
                await this.executeStep(retryParse.action);
            } else {
                await this.executeStep(parseResult.action);
            }

            // Check for FINISH
            if (this.state.lastAction?.type === 'FINISH') {
                this.state.status = 'finished';
                break;
            }

            this.state.currentStep++;
            this.state.memory = this.memory.toPromptString();
            this.emitStatus();

            // Small delay between steps
            await this.sleep(500);
        }

        if (this.state.currentStep >= this.state.maxSteps && this.state.status === 'running') {
            this.state.status = 'finished';
            this.state.error = 'Max steps reached';
        }

        this.emitStatus();
    }

    private async executeStep(action: AutomationAction): Promise<void> {
        // Same-action detection (stuck guard)
        if (this.state.lastAction && actionsEqual(action, this.state.lastAction)) {
            this.state.lastActionCount++;
            if (this.state.lastActionCount >= 3) {
                console.warn('Same action repeated 3 times, forcing WAIT and scroll');
                this.memory.record(action, 'skipped', 'Repeated 3 times');
                await this.callbacks.executeAction({ type: 'SCROLL', direction: 'DOWN' });
                await this.callbacks.executeAction({ type: 'WAIT' });
                this.state.lastActionCount = 0;
                return;
            }
        } else {
            this.state.lastActionCount = 1;
        }

        this.state.lastAction = action;

        // Check if this element already failed
        if (action.type === 'CLICK' && action.text && this.memory.hasFailed(action.text)) {
            console.warn('Skipping previously failed action:', action.text);
            this.memory.record(action, 'skipped', 'Previously failed');
            return;
        }

        // Execute the action
        const result = await this.callbacks.executeAction(action);

        // Record in memory
        if (result.success) {
            this.memory.record(action, 'success');
        } else {
            this.memory.record(action, 'failed', result.error);
        }

        this.callbacks.onActionExecuted(action, result);
    }

    private emitStatus(): void {
        this.callbacks.onStatusChange({ ...this.state });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getState(): AutomationState {
        return { ...this.state };
    }
}

export { AUTOMATION_SYSTEM_PROMPT };
