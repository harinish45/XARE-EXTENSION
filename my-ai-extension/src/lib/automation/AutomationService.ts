import type { AutomationAction } from '../../content/AutomationEngine';
import { llmService } from '../llm/LLMService';

export interface AutomationCommand {
    naturalLanguage: string;
    actions: AutomationAction[];
}

export interface AutomationResult {
    success: boolean;
    message: string;
    results: any[];
}

/**
 * Service to parse natural language into automation actions
 * and coordinate execution
 */
export class AutomationService {
    /**
     * Parse natural language command into automation actions using LLM
     */
    static async parseCommand(command: string, pageContext?: string): Promise<AutomationAction[]> {
        const systemPrompt = `You are an automation planner. Convert user commands into structured automation actions.

Available action types:
- CLICK: Click an element (provide text to click or selector)
- TYPE: Type into input field (provide target field name/placeholder and value to type)
- SCROLL: Scroll page (direction: UP or DOWN)
- WAIT: Wait 1 second
- SCRAPE: Extract text from page (optional selector)
- GET_DOM_SUMMARY: Get page structure
- FINISH: Complete automation

When user says something like:
- "Click login" → [{type: "CLICK", text: "login"}]
- "Type john@email.com into email" → [{type: "TYPE", target: "email", value: "john@email.com"}]
- "Scroll down" → [{type: "SCROLL", direction: "DOWN"}]
- "Click submit then wait" → [{type: "CLICK", text: "submit"}, {type: "WAIT"}]

Respond ONLY with a JSON array of actions. No explanations.

Example response format:
[{"type": "CLICK", "text": "login"}, {"type": "WAIT"}, {"type": "TYPE", "text": "email", "value": "user@example.com"}]`;

        const userMessage = pageContext
            ? `Page context:\n${pageContext}\n\nUser command: ${command}`
            : `User command: ${command}`;

        try {
            const response = await llmService.chat({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                stream: false
            });

            // Parse JSON response
            const jsonMatch = response.content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('LLM did not return valid JSON array');
            }

            const actions = JSON.parse(jsonMatch[0]);
            return actions;

        } catch (error) {
            console.error('Failed to parse command:', error);

            // Fallback: simple keyword-based parsing
            return this.fallbackParse(command);
        }
    }

    /**
     * Fallback parser for when LLM fails
     */
    private static fallbackParse(command: string): AutomationAction[] {
        const lower = command.toLowerCase().trim();
        const actions: AutomationAction[] = [];

        // Click patterns
        if (lower.includes('click')) {
            const match = lower.match(/click (?:on |the )?([^,\.]+)/);
            if (match) {
                actions.push({ type: 'CLICK', text: match[1].trim() });
            }
        }

        // Type patterns
        if (lower.includes('type') || lower.includes('enter')) {
            const match = lower.match(/(?:type|enter) ["']?([^"']+)["']? (?:into|in) (?:the )?([^,\.]+)/);
            if (match) {
                actions.push({
                    type: 'TYPE',
                    text: match[2].trim(),
                    value: match[1].trim()
                });
            }
        }

        // Scroll patterns
        if (lower.includes('scroll down')) {
            actions.push({ type: 'SCROLL', direction: 'DOWN' });
        } else if (lower.includes('scroll up')) {
            actions.push({ type: 'SCROLL', direction: 'UP' });
        }

        // Wait patterns
        if (lower.includes('wait')) {
            actions.push({ type: 'WAIT' });
        }

        // Scrape patterns
        if (lower.includes('extract') || lower.includes('scrape') || lower.includes('get text')) {
            actions.push({ type: 'SCRAPE' });
        }

        // If no actions found, try to infer click
        if (actions.length === 0 && !lower.includes('?')) {
            // Likely a click command without explicit "click"
            actions.push({ type: 'CLICK', text: lower });
        }

        return actions;
    }

    /**
     * Execute automation actions on current tab
     */
    static async executeAutomation(
        actions: AutomationAction[],
        tabId?: number,
        onProgress?: (action: AutomationAction, result: any) => void
    ): Promise<AutomationResult> {
        const results: any[] = [];
        let errorOccurred = false;

        // Get active tab if not specified
        if (!tabId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            tabId = tab.id;
        }

        if (!tabId) {
            return {
                success: false,
                message: 'No active tab found',
                results: []
            };
        }

        // Execute each action sequentially
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];

            try {
                // Inject automation engine if not already present
                await this.ensureEngineInjected(tabId);

                // Execute action in content script
                const result = await chrome.tabs.sendMessage(tabId, {
                    type: 'EXECUTE_AUTOMATION',
                    action
                });

                results.push(result);

                if (onProgress) {
                    onProgress(action, result);
                }

                // Check if action failed
                if (result && !result.success) {
                    errorOccurred = true;
                    break;
                }

                // Small delay between actions for UI updates
                await this.sleep(300);

            } catch (error: any) {
                console.error(`Action ${i} failed:`, error);
                results.push({
                    success: false,
                    error: error.message
                });
                errorOccurred = true;
                break;
            }
        }

        return {
            success: !errorOccurred,
            message: errorOccurred
                ? `Automation stopped at step ${results.length}/${actions.length}`
                : `Successfully completed ${actions.length} actions`,
            results
        };
    }

    /**
     * Ensure automation engine is injected into tab
     */
    private static async ensureEngineInjected(tabId: number): Promise<void> {
        try {
            // Check if engine already exists
            await chrome.tabs.sendMessage(tabId, { type: 'PING_ENGINE' });
        } catch {
            // Engine not present, inject it
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/AutomationEngine.js'] // Assuming compiled output
            });

            // Wait for injection
            await this.sleep(500);
        }
    }

    /**
     * Get page summary for better automation planning
     */
    static async getPageSummary(tabId?: number): Promise<string> {
        if (!tabId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            tabId = tab.id;
        }

        if (!tabId) return '';

        try {
            await this.ensureEngineInjected(tabId);

            const summary = await chrome.tabs.sendMessage(tabId, {
                type: 'EXECUTE_AUTOMATION',
                action: { type: 'GET_DOM_SUMMARY' }
            });

            return this.formatDOMSummary(summary);
        } catch (error) {
            console.error('Failed to get page summary:', error);
            return '';
        }
    }

    /**
     * Format DOM summary for LLM consumption
     */
    private static formatDOMSummary(summary: any): string {
        if (!summary) return '';

        return `
Page: ${summary.title || 'Unknown'}

Headings: ${summary.headings?.join(', ') || 'None'}

Available Buttons: ${summary.buttons?.join(', ') || 'None'}

Available Links: ${summary.links?.join(', ') || 'None'}

Input Fields: ${summary.inputs?.join(', ') || 'None'}

Visible Text (preview):
${summary.visibleText || ''}
        `.trim();
    }

    /**
     * Check if command is automation-related
     */
    static isAutomationCommand(message: string): boolean {
        const lower = message.toLowerCase();

        const automationKeywords = [
            'click', 'type', 'enter', 'fill', 'scroll',
            'navigate', 'go to', 'press', 'tap',
            'extract', 'scrape', 'get', 'find',
            'submit', 'search for'
        ];

        return automationKeywords.some(keyword => lower.includes(keyword));
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
