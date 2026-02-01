import type { AutomationAction } from '../../content/AutomationEngine';

export type ParseResult =
    | { success: true; action: AutomationAction }
    | { success: false; error: 'PARSER_ERROR' };

/**
 * Parse structured LLM output into an AutomationAction.
 * 
 * Accepts formats:
 * ACTION: CLICK
 * TEXT: Sign Up
 * 
 * Or:
 * ACTION:CLICK
 * TEXT:Sign Up
 */
export function parseActionResponse(response: string): ParseResult {
    const lines = response.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Find ACTION line (required)
    let actionType: string | null = null;
    let text: string | undefined;
    let value: string | undefined;
    let direction: 'UP' | 'DOWN' | undefined;
    let target: string | undefined;

    for (const line of lines) {
        // Flexible parsing: ACTION:CLICK or ACTION: CLICK or ACTION : CLICK
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.substring(0, colonIndex).trim().toUpperCase();
        const val = line.substring(colonIndex + 1).trim();

        switch (key) {
            case 'ACTION':
                actionType = val.toUpperCase();
                break;
            case 'TEXT':
                text = val;
                break;
            case 'VALUE':
                value = val;
                break;
            case 'TARGET':
                target = val;
                break;
            case 'DIRECTION':
                direction = val.toUpperCase() as 'UP' | 'DOWN';
                break;
        }
    }

    // Validate we got an action
    if (!actionType) {
        console.warn('Parser: No ACTION found in response:', response);
        return { success: false, error: 'PARSER_ERROR' };
    }

    // Map to ActionType
    const validActions = ['CLICK', 'TYPE', 'SCROLL', 'WAIT', 'SUMMARIZE', 'FINISH', 'SCRAPE', 'GET_DOM_SUMMARY'];
    if (!validActions.includes(actionType)) {
        console.warn('Parser: Unknown action type:', actionType);
        return { success: false, error: 'PARSER_ERROR' };
    }

    // Build the action
    const action: AutomationAction = {
        type: actionType as AutomationAction['type'],
        text: text || target,
        value,
        direction,
    };

    // For TYPE, use value as the text to type, and text as the target
    if (actionType === 'TYPE') {
        action.text = target || text; // target field identifies the input
        action.value = value || text; // value is what to type
    }

    return { success: true, action };
}

/**
 * Check if two actions are the same (for stuck detection)
 */
export function actionsEqual(a: AutomationAction, b: AutomationAction): boolean {
    return a.type === b.type && a.text === b.text && a.value === b.value;
}
