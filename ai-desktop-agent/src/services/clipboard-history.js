/**
 * Clipboard History Service
 * Tracks clipboard changes and maintains history
 */

const robot = require('../utils/robot-fallback');
const EventEmitter = require('events');

class ClipboardHistory extends EventEmitter {
    constructor(options = {}) {
        super();
        this.history = [];
        this.maxSize = options.maxSize || 100;
        this.pollInterval = options.pollInterval || 500;
        this.isMonitoring = false;
        this.lastClipboard = '';
        this.monitorTimer = null;
        this.pinnedItems = new Set();
    }

    /**
     * Start monitoring clipboard changes
     */
    startMonitoring() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.lastClipboard = this.getClipboard();

        this.monitorTimer = setInterval(() => {
            const current = this.getClipboard();
            if (current && current !== this.lastClipboard) {
                this.addToHistory(current);
                this.lastClipboard = current;
                this.emit('change', {
                    content: current,
                    timestamp: Date.now(),
                    format: this.detectFormat(current)
                });
            }
        }, this.pollInterval);
    }

    /**
     * Stop monitoring clipboard changes
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
    }

    /**
     * Get current clipboard content
     * @returns {string}
     */
    getClipboard() {
        try {
            return robot.getClipboard() || '';
        } catch (error) {
            console.error('Get clipboard error:', error);
            return '';
        }
    }

    /**
     * Set clipboard content
     * @param {string} content
     */
    setClipboard(content) {
        try {
            robot.setClipboard(content);
            return true;
        } catch (error) {
            console.error('Set clipboard error:', error);
            return false;
        }
    }

    /**
     * Add content to history
     * @param {string} content
     * @param {Object} metadata
     */
    addToHistory(content, metadata = {}) {
        const item = {
            id: Date.now(),
            content,
            timestamp: Date.now(),
            format: this.detectFormat(content),
            pinned: false,
            ...metadata
        };

        // Remove duplicates
        this.history = this.history.filter(h => h.content !== content);

        // Add to beginning
        this.history.unshift(item);

        // Trim history (keep pinned items)
        const unpinned = this.history.filter(h => !h.pinned);
        const pinned = this.history.filter(h => h.pinned);

        if (unpinned.length > this.maxSize) {
            this.history = [
                ...pinned,
                ...unpinned.slice(0, this.maxSize)
            ];
        }

        this.emit('history:add', item);
        return item;
    }

    /**
     * Get clipboard history
     * @param {number} limit - Maximum items to return
     * @returns {Array}
     */
    getHistory(limit = null) {
        if (limit) {
            return this.history.slice(0, limit);
        }
        return [...this.history];
    }

    /**
     * Search clipboard history
     * @param {string} query
     * @returns {Array}
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(item =>
            item.content.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get item by ID
     * @param {number} id
     * @returns {Object|null}
     */
    getItem(id) {
        return this.history.find(item => item.id === id) || null;
    }

    /**
     * Pin an item
     * @param {number} id
     * @returns {boolean}
     */
    pin(id) {
        const item = this.getItem(id);
        if (item) {
            item.pinned = true;
            this.pinnedItems.add(id);
            this.emit('history:pin', item);
            return true;
        }
        return false;
    }

    /**
     * Unpin an item
     * @param {number} id
     * @returns {boolean}
     */
    unpin(id) {
        const item = this.getItem(id);
        if (item) {
            item.pinned = false;
            this.pinnedItems.delete(id);
            this.emit('history:unpin', item);
            return true;
        }
        return false;
    }

    /**
     * Delete an item from history
     * @param {number} id
     * @returns {boolean}
     */
    deleteItem(id) {
        const index = this.history.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.history[index];
            this.history.splice(index, 1);
            this.pinnedItems.delete(id);
            this.emit('history:delete', item);
            return true;
        }
        return false;
    }

    /**
     * Clear all history
     * @param {boolean} includePinned - Whether to clear pinned items
     */
    clear(includePinned = false) {
        if (includePinned) {
            this.history = [];
            this.pinnedItems.clear();
        } else {
            this.history = this.history.filter(item => item.pinned);
        }
        this.emit('history:clear', { includePinned });
    }

    /**
     * Detect clipboard content format
     * @param {string} content
     * @returns {string}
     */
    detectFormat(content) {
        if (!content) return 'empty';

        // URL
        if (/^https?:\/\//i.test(content)) {
            return 'url';
        }

        // Email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)) {
            return 'email';
        }

        // File path
        if (/^[a-zA-Z]:\\|^\//.test(content)) {
            return 'path';
        }

        // HTML
        if (/<[^>]+>/.test(content)) {
            return 'html';
        }

        // JSON
        try {
            JSON.parse(content);
            return 'json';
        } catch { }

        // Code (contains common code patterns)
        if (/[{}\[\];()=>]/.test(content) && content.split('\n').length > 1) {
            return 'code';
        }

        // Number
        if (/^\d+(\.\d+)?$/.test(content)) {
            return 'number';
        }

        // Multi-line text
        if (content.split('\n').length > 1) {
            return 'multiline';
        }

        return 'text';
    }

    /**
     * Get statistics about clipboard history
     * @returns {Object}
     */
    getStats() {
        const formats = {};
        this.history.forEach(item => {
            formats[item.format] = (formats[item.format] || 0) + 1;
        });

        return {
            total: this.history.length,
            pinned: this.pinnedItems.size,
            formats,
            oldestTimestamp: this.history[this.history.length - 1]?.timestamp,
            newestTimestamp: this.history[0]?.timestamp
        };
    }

    /**
     * Export history to JSON
     * @returns {string}
     */
    export() {
        return JSON.stringify({
            history: this.history,
            pinnedItems: Array.from(this.pinnedItems),
            exportedAt: Date.now()
        }, null, 2);
    }

    /**
     * Import history from JSON
     * @param {string} json
     * @returns {boolean}
     */
    import(json) {
        try {
            const data = JSON.parse(json);
            this.history = data.history || [];
            this.pinnedItems = new Set(data.pinnedItems || []);
            this.emit('history:import', { count: this.history.length });
            return true;
        } catch (error) {
            console.error('Import history error:', error);
            return false;
        }
    }
}

module.exports = ClipboardHistory;
