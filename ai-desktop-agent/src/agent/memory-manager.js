/**
 * Memory Manager Module
 * Manages conversation history, context, and long-term memory
 */

class MemoryManager {
    constructor() {
        this.conversationHistory = [];
        this.context = {};
        this.longTermMemory = {};
        this.maxHistoryLength = 50;
        this.maxContextItems = 20;
    }

    /**
     * Add a message to conversation history
     * @param {string} role - Message role (user, assistant, system)
     * @param {string} content - Message content
     * @param {Object} metadata - Optional metadata
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            role,
            content,
            timestamp: Date.now(),
            metadata
        };

        this.conversationHistory.push(message);

        // Trim history if too long
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }

    /**
     * Get conversation history
     * @param {number} limit - Maximum number of messages to return
     * @returns {Array} Conversation history
     */
    getHistory(limit = null) {
        if (limit) {
            return this.conversationHistory.slice(-limit);
        }
        return [...this.conversationHistory];
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Update context with new information
     * @param {string} key - Context key
     * @param {any} value - Context value
     */
    updateContext(key, value) {
        this.context[key] = {
            value,
            timestamp: Date.now()
        };

        // Trim context if too many items
        const keys = Object.keys(this.context);
        if (keys.length > this.maxContextItems) {
            // Remove oldest items
            const sortedKeys = keys.sort((a, b) =>
                this.context[a].timestamp - this.context[b].timestamp
            );
            const toRemove = sortedKeys.slice(0, keys.length - this.maxContextItems);
            for (const key of toRemove) {
                delete this.context[key];
            }
        }
    }

    /**
     * Get context value
     * @param {string} key - Context key
     * @returns {any} Context value or null
     */
    getContext(key) {
        const item = this.context[key];
        return item ? item.value : null;
    }

    /**
     * Get all context
     * @returns {Object} All context
     */
    getAllContext() {
        const result = {};
        for (const [key, item] of Object.entries(this.context)) {
            result[key] = item.value;
        }
        return result;
    }

    /**
     * Clear context
     */
    clearContext() {
        this.context = {};
    }

    /**
     * Store information in long-term memory
     * @param {string} key - Memory key
     * @param {any} value - Memory value
     * @param {Object} metadata - Optional metadata
     */
    storeLongTerm(key, value, metadata = {}) {
        this.longTermMemory[key] = {
            value,
            metadata,
            createdAt: Date.now(),
            accessCount: 0,
            lastAccessed: Date.now()
        };
    }

    /**
     * Retrieve from long-term memory
     * @param {string} key - Memory key
     * @returns {any} Memory value or null
     */
    retrieveLongTerm(key) {
        const item = this.longTermMemory[key];
        if (item) {
            item.accessCount++;
            item.lastAccessed = Date.now();
            return item.value;
        }
        return null;
    }

    /**
     * Search long-term memory by pattern
     * @param {string} pattern - Search pattern (supports wildcards)
     * @returns {Array} Matching memory items
     */
    searchLongTerm(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        const results = [];

        for (const [key, item] of Object.entries(this.longTermMemory)) {
            if (regex.test(key)) {
                results.push({
                    key,
                    value: item.value,
                    metadata: item.metadata,
                    createdAt: item.createdAt,
                    accessCount: item.accessCount
                });
            }
        }

        return results.sort((a, b) => b.accessCount - a.accessCount);
    }

    /**
     * Delete from long-term memory
     * @param {string} key - Memory key
     * @returns {boolean} True if deleted
     */
    deleteLongTerm(key) {
        if (this.longTermMemory[key]) {
            delete this.longTermMemory[key];
            return true;
        }
        return false;
    }

    /**
     * Clear long-term memory
     */
    clearLongTerm() {
        this.longTermMemory = {};
    }

    /**
     * Get memory statistics
     * @returns {Object} Memory statistics
     */
    getStats() {
        return {
            conversationHistory: {
                count: this.conversationHistory.length,
                maxLength: this.maxHistoryLength
            },
            context: {
                count: Object.keys(this.context).length,
                maxItems: this.maxContextItems
            },
            longTermMemory: {
                count: Object.keys(this.longTermMemory).length
            }
        };
    }

    /**
     * Export memory to JSON
     * @returns {string} JSON string of memory
     */
    export() {
        return JSON.stringify({
            conversationHistory: this.conversationHistory,
            context: this.context,
            longTermMemory: this.longTermMemory
        }, null, 2);
    }

    /**
     * Import memory from JSON
     * @param {string} json - JSON string to import
     * @returns {boolean} True if successful
     */
    import(json) {
        try {
            const data = JSON.parse(json);

            if (data.conversationHistory) {
                this.conversationHistory = data.conversationHistory;
            }

            if (data.context) {
                this.context = data.context;
            }

            if (data.longTermMemory) {
                this.longTermMemory = data.longTermMemory;
            }

            return true;
        } catch (error) {
            console.error('Failed to import memory:', error);
            return false;
        }
    }

    /**
     * Get relevant context for AI response
     * @returns {Object} Relevant context
     */
    getRelevantContext() {
        const context = this.getAllContext();

        // Add recent conversation summary
        const recentMessages = this.getHistory(5);
        const summary = recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
        }));

        return {
            ...context,
            recentConversation: summary
        };
    }

    /**
     * Store user preference
     * @param {string} preference - Preference key
     * @param {any} value - Preference value
     */
    setPreference(preference, value) {
        this.storeLongTerm(`preference:${preference}`, value, {
            type: 'preference'
        });
    }

    /**
     * Get user preference
     * @param {string} preference - Preference key
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Preference value or default
     */
    getPreference(preference, defaultValue = null) {
        return this.retrieveLongTerm(`preference:${preference}`) || defaultValue;
    }

    /**
     * Store workflow template
     * @param {string} name - Workflow name
     * @param {Array} steps - Workflow steps
     * @param {Object} metadata - Optional metadata
     */
    storeWorkflow(name, steps, metadata = {}) {
        this.storeLongTerm(`workflow:${name}`, steps, {
            type: 'workflow',
            ...metadata
        });
    }

    /**
     * Retrieve workflow template
     * @param {string} name - Workflow name
     * @returns {Array} Workflow steps or null
     */
    retrieveWorkflow(name) {
        return this.retrieveLongTerm(`workflow:${name}`);
    }

    /**
     * List all workflows
     * @returns {Array} List of workflow names
     */
    listWorkflows() {
        const results = this.searchLongTerm('workflow:*');
        return results.map(item => ({
            name: item.key.replace('workflow:', ''),
            steps: item.value,
            metadata: item.metadata,
            accessCount: item.accessCount
        }));
    }

    /**
     * Clean up old memory items
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
        const now = Date.now();

        // Clean up long-term memory
        for (const [key, item] of Object.entries(this.longTermMemory)) {
            if (now - item.createdAt > maxAge && item.accessCount === 0) {
                delete this.longTermMemory[key];
            }
        }
    }
}

module.exports = MemoryManager;
