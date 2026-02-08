/**
 * Intent Parser Module
 * Parses user commands and determines the intent and required actions
 */

class IntentParser {
    constructor() {
        this.intentPatterns = this.initializePatterns();
    }

    /**
     * Initialize intent patterns for common commands
     */
    initializePatterns() {
        return {
            // File operations
            file: {
                patterns: [
                    /open\s+(?:file|folder|directory)\s+(.+)/i,
                    /delete\s+(?:file|folder)\s+(.+)/i,
                    /move\s+(.+?)\s+to\s+(.+)/i,
                    /copy\s+(.+?)\s+to\s+(.+)/i,
                    /create\s+(?:file|folder)\s+(.+)/i,
                    /find\s+(?:file|files?)\s+(.+)/i,
                    /organize\s+(.+)/i
                ],
                actions: ['file_read', 'file_write', 'file_delete', 'file_move', 'file_copy', 'file_search']
            },

            // Application control
            app: {
                patterns: [
                    /open\s+(?:app|application|program)\s+(.+)/i,
                    /launch\s+(.+)/i,
                    /close\s+(?:app|application|program)\s+(.+)/i,
                    /quit\s+(.+)/i,
                    /restart\s+(.+)/i
                ],
                actions: ['app_open', 'app_close']
            },

            // Browser operations
            browser: {
                patterns: [
                    /open\s+(?:browser|chrome|firefox|edge)\s+(?:and\s+)?(?:go\s+to|navigate\s+to|open)\s+(.+)/i,
                    /go\s+to\s+(.+)/i,
                    /navigate\s+to\s+(.+)/i,
                    /search\s+(?:for\s+)?(.+)\s+(?:on|in)\s+(google|bing|duckduckgo)/i
                ],
                actions: ['browser_navigate', 'browser_click', 'browser_type', 'browser_extract']
            },

            // Mouse/keyboard actions
            input: {
                patterns: [
                    /click\s+(?:at\s+)?(?:position\s+)?(\d+)[,\s]+(\d+)/i,
                    /type\s+(?:text\s+)?["'](.+)["']/i,
                    /press\s+(?:key\s+)?(.+)/i,
                    /scroll\s+(up|down)\s+(\d+)/i
                ],
                actions: ['mouse_click', 'mouse_move', 'keyboard_type', 'keyboard_press', 'mouse_scroll']
            },

            // Screen operations
            screen: {
                patterns: [
                    /take\s+(?:a\s+)?screenshot/i,
                    /capture\s+screen/i,
                    /analyze\s+screen/i,
                    /read\s+screen/i,
                    /what\s+(?:is\s+)?(?:on\s+)?(?:the\s+)?screen/i
                ],
                actions: ['screen_capture', 'screen_ocr', 'screen_find_text']
            },

            // Automation/workflow
            automation: {
                patterns: [
                    /automate\s+(.+)/i,
                    /create\s+(?:a\s+)?workflow\s+(?:for\s+)?(.+)/i,
                    /run\s+(?:workflow|automation)\s+(.+)/i,
                    /schedule\s+(.+)/i
                ],
                actions: ['workflow_execute', 'workflow_create', 'workflow_schedule']
            },

            // Information queries
            query: {
                patterns: [
                    /what\s+(?:is|are)\s+(.+)/i,
                    /how\s+(?:do|to|can)\s+(.+)/i,
                    /tell\s+me\s+(?:about\s+)?(.+)/i,
                    /explain\s+(.+)/i,
                    /help\s+(?:with\s+)?(.+)/i
                ],
                actions: [] // Just informational, no actions needed
            },

            // System operations
            system: {
                patterns: [
                    /shutdown/i,
                    /restart\s+(?:computer|system)/i,
                    /lock\s+(?:screen|computer)/i,
                    /empty\s+(?:trash|recycle\s+bin)/i
                ],
                actions: ['system_shutdown', 'system_restart', 'system_lock']
            }
        };
    }

    /**
     * Parse user input and determine intent
     * @param {string} input - User's command or question
     * @returns {Object} Parsed intent with action suggestions
     */
    parse(input) {
        const result = {
            intent: 'unknown',
            confidence: 0,
            entities: {},
            suggestedActions: [],
            rawInput: input
        };

        // Check each intent category
        for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
            for (const pattern of intentData.patterns) {
                const match = input.match(pattern);
                if (match) {
                    result.intent = intentName;
                    result.confidence = 0.8;
                    result.suggestedActions = intentData.actions;

                    // Extract entities from match groups
                    if (match.length > 1) {
                        result.entities = this.extractEntities(match, intentName);
                    }

                    return result;
                }
            }
        }

        // If no pattern matched, it's a general query
        if (input.includes('?') || input.toLowerCase().startsWith('what') ||
            input.toLowerCase().startsWith('how') || input.toLowerCase().startsWith('tell')) {
            result.intent = 'query';
            result.confidence = 0.5;
        }

        return result;
    }

    /**
     * Extract entities from regex match
     * @param {Array} match - Regex match array
     * @param {string} intent - Intent name
     * @returns {Object} Extracted entities
     */
    extractEntities(match, intent) {
        const entities = {};

        switch (intent) {
            case 'file':
                if (match[1]) entities.path = match[1].trim();
                if (match[2]) entities.destination = match[2].trim();
                break;
            case 'app':
                if (match[1]) entities.appName = match[1].trim();
                break;
            case 'browser':
                if (match[1]) entities.url = match[1].trim();
                if (match[2]) entities.searchEngine = match[2].trim();
                break;
            case 'input':
                if (match[1]) entities.x = parseInt(match[1]);
                if (match[2]) entities.y = parseInt(match[2]);
                if (match[1] && !match[2]) entities.text = match[1].trim();
                break;
            case 'automation':
                if (match[1]) entities.workflowName = match[1].trim();
                break;
            case 'query':
                if (match[1]) entities.query = match[1].trim();
                break;
        }

        return entities;
    }

    /**
     * Get action suggestions based on parsed intent
     * @param {Object} parsedIntent - Result from parse()
     * @returns {Array} Suggested actions with parameters
     */
    getSuggestedActions(parsedIntent) {
        const actions = [];

        switch (parsedIntent.intent) {
            case 'file':
                if (parsedIntent.entities.path) {
                    actions.push({
                        type: 'file_read',
                        params: { path: parsedIntent.entities.path }
                    });
                }
                break;

            case 'app':
                if (parsedIntent.entities.appName) {
                    actions.push({
                        type: 'app_open',
                        params: { name: parsedIntent.entities.appName }
                    });
                }
                break;

            case 'browser':
                if (parsedIntent.entities.url) {
                    actions.push({
                        type: 'browser_navigate',
                        params: { url: this.formatUrl(parsedIntent.entities.url) }
                    });
                }
                break;

            case 'input':
                if (parsedIntent.entities.x !== undefined && parsedIntent.entities.y !== undefined) {
                    actions.push({
                        type: 'mouse_move',
                        params: { x: parsedIntent.entities.x, y: parsedIntent.entities.y }
                    });
                    actions.push({
                        type: 'mouse_click',
                        params: { button: 'left' }
                    });
                }
                if (parsedIntent.entities.text) {
                    actions.push({
                        type: 'keyboard_type',
                        params: { text: parsedIntent.entities.text }
                    });
                }
                break;

            case 'screen':
                actions.push({
                    type: 'screen_capture',
                    params: {}
                });
                break;
        }

        return actions;
    }

    /**
     * Format URL if needed
     * @param {string} url - URL to format
     * @returns {string} Formatted URL
     */
    formatUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    }

    /**
     * Check if action requires confirmation
     * @param {string} actionType - Type of action
     * @returns {boolean} True if confirmation needed
     */
    requiresConfirmation(actionType) {
        const dangerousActions = [
            'file_delete',
            'file_move',
            'system_shutdown',
            'system_restart',
            'browser_submit',
            'browser_click' // When on sensitive elements
        ];

        return dangerousActions.includes(actionType);
    }
}

module.exports = IntentParser;
