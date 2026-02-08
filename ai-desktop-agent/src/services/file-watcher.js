/**
 * File Watcher Service
 * Monitors file system changes and triggers workflows
 */

const chokidar = require('chokidar');
const EventEmitter = require('events');

class FileWatcher extends EventEmitter {
    constructor() {
        super();
        this.watchers = new Map();
        this.watchId = 0;
    }

    /**
     * Watch a file or directory for changes
     * @param {string} path - Path to watch
     * @param {Object} options - Watch options
     * @returns {number} Watch ID
     */
    watch(path, options = {}) {
        const id = ++this.watchId;

        const watchOptions = {
            persistent: true,
            ignoreInitial: options.ignoreInitial !== false,
            ignored: options.ignored || /(^|[\/\\])\../,  // ignore dotfiles
            awaitWriteFinish: {
                stabilityThreshold: options.stabilityThreshold || 2000,
                pollInterval: options.pollInterval || 100
            },
            ...options
        };

        const watcher = chokidar.watch(path, watchOptions);

        // File added
        watcher.on('add', (filePath) => {
            this.emit('file:add', {
                watchId: id,
                path: filePath,
                event: 'add',
                timestamp: Date.now()
            });
        });

        // File changed
        watcher.on('change', (filePath) => {
            this.emit('file:change', {
                watchId: id,
                path: filePath,
                event: 'change',
                timestamp: Date.now()
            });
        });

        // File removed
        watcher.on('unlink', (filePath) => {
            this.emit('file:delete', {
                watchId: id,
                path: filePath,
                event: 'delete',
                timestamp: Date.now()
            });
        });

        // Directory added
        watcher.on('addDir', (dirPath) => {
            this.emit('dir:add', {
                watchId: id,
                path: dirPath,
                event: 'addDir',
                timestamp: Date.now()
            });
        });

        // Directory removed
        watcher.on('unlinkDir', (dirPath) => {
            this.emit('dir:delete', {
                watchId: id,
                path: dirPath,
                event: 'deleteDir',
                timestamp: Date.now()
            });
        });

        // Error handling
        watcher.on('error', (error) => {
            this.emit('error', {
                watchId: id,
                error: error.message,
                timestamp: Date.now()
            });
        });

        // Ready event
        watcher.on('ready', () => {
            this.emit('ready', {
                watchId: id,
                path,
                timestamp: Date.now()
            });
        });

        this.watchers.set(id, {
            watcher,
            path,
            options: watchOptions
        });

        return id;
    }

    /**
     * Watch with pattern matching
     * @param {string} path - Path to watch
     * @param {string|RegExp} pattern - Pattern to match
     * @param {Object} options - Watch options
     * @returns {number} Watch ID
     */
    watchPattern(path, pattern, options = {}) {
        const id = this.watch(path, options);
        const watchInfo = this.watchers.get(id);

        // Add pattern filter
        const originalWatcher = watchInfo.watcher;
        const patternRegex = typeof pattern === 'string'
            ? new RegExp(pattern.replace(/\*/g, '.*'))
            : pattern;

        // Filter events by pattern
        const filterByPattern = (eventName) => {
            const originalListener = originalWatcher.listeners(eventName)[0];
            originalWatcher.removeAllListeners(eventName);
            originalWatcher.on(eventName, (filePath) => {
                if (patternRegex.test(filePath)) {
                    originalListener(filePath);
                }
            });
        };

        filterByPattern('add');
        filterByPattern('change');
        filterByPattern('unlink');

        watchInfo.pattern = pattern;
        return id;
    }

    /**
     * Stop watching a path
     * @param {number} id - Watch ID
     * @returns {Promise<boolean>}
     */
    async unwatch(id) {
        const watchInfo = this.watchers.get(id);
        if (!watchInfo) {
            return false;
        }

        await watchInfo.watcher.close();
        this.watchers.delete(id);
        return true;
    }

    /**
     * Stop all watchers
     * @returns {Promise<void>}
     */
    async unwatchAll() {
        const promises = [];
        for (const [id, watchInfo] of this.watchers.entries()) {
            promises.push(watchInfo.watcher.close());
        }
        await Promise.all(promises);
        this.watchers.clear();
    }

    /**
     * Get all active watchers
     * @returns {Array}
     */
    getWatchers() {
        const result = [];
        for (const [id, watchInfo] of this.watchers.entries()) {
            result.push({
                id,
                path: watchInfo.path,
                pattern: watchInfo.pattern,
                options: watchInfo.options
            });
        }
        return result;
    }

    /**
     * Get watcher by ID
     * @param {number} id - Watch ID
     * @returns {Object|null}
     */
    getWatcher(id) {
        const watchInfo = this.watchers.get(id);
        if (!watchInfo) {
            return null;
        }
        return {
            id,
            path: watchInfo.path,
            pattern: watchInfo.pattern,
            options: watchInfo.options
        };
    }

    /**
     * Debounce file events
     * @param {string} eventName - Event name to debounce
     * @param {number} delay - Debounce delay in ms
     */
    debounce(eventName, delay = 1000) {
        const timers = new Map();

        this.on(eventName, (data) => {
            const key = `${data.watchId}:${data.path}`;

            if (timers.has(key)) {
                clearTimeout(timers.get(key));
            }

            const timer = setTimeout(() => {
                this.emit(`${eventName}:debounced`, data);
                timers.delete(key);
            }, delay);

            timers.set(key, timer);
        });
    }
}

module.exports = FileWatcher;
