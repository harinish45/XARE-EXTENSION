/**
 * Task Queue Module
 * Manages queued tasks and their execution
 */

class TaskQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxConcurrent = 1;
        this.currentTasks = 0;
        this.taskHistory = [];
        this.paused = false;
    }

    /**
     * Add a task to the queue
     * @param {Object} task - Task to add
     * @param {number} priority - Task priority (higher = more important)
     * @returns {string} Task ID
     */
    add(task, priority = 0) {
        const taskId = this.generateId();
        const queuedTask = {
            id: taskId,
            task,
            priority,
            status: 'queued',
            addedAt: Date.now(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null
        };

        // Insert in priority order
        let insertIndex = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            if (priority > this.queue[i].priority) {
                insertIndex = i;
                break;
            }
        }

        this.queue.splice(insertIndex, 0, queuedTask);

        // Start processing if not already
        if (!this.processing) {
            this.process();
        }

        return taskId;
    }

    /**
     * Process the queue
     */
    async process() {
        if (this.processing || this.paused) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0 && this.currentTasks < this.maxConcurrent && !this.paused) {
            const queuedTask = this.queue.shift();
            this.currentTasks++;

            // Execute task
            this.executeTask(queuedTask).finally(() => {
                this.currentTasks--;
            });
        }

        this.processing = false;
    }

    /**
     * Execute a single task
     * @param {Object} queuedTask - Task to execute
     */
    async executeTask(queuedTask) {
        queuedTask.status = 'running';
        queuedTask.startedAt = Date.now();

        try {
            // Execute the task function
            if (typeof queuedTask.task === 'function') {
                queuedTask.result = await queuedTask.task();
            } else if (queuedTask.task.execute) {
                queuedTask.result = await queuedTask.task.execute();
            } else {
                throw new Error('Task must be a function or have an execute method');
            }

            queuedTask.status = 'completed';
        } catch (error) {
            queuedTask.status = 'failed';
            queuedTask.error = error.message;
        }

        queuedTask.completedAt = Date.now();
        queuedTask.duration = queuedTask.completedAt - queuedTask.startedAt;

        // Add to history
        this.taskHistory.push(queuedTask);

        // Continue processing
        this.process();
    }

    /**
     * Get task status
     * @param {string} taskId - Task ID
     * @returns {Object|null} Task status or null
     */
    getTaskStatus(taskId) {
        // Check queue
        const queuedTask = this.queue.find(t => t.id === taskId);
        if (queuedTask) {
            return {
                id: queuedTask.id,
                status: queuedTask.status,
                priority: queuedTask.priority,
                addedAt: queuedTask.addedAt
            };
        }

        // Check history
        const historyTask = this.taskHistory.find(t => t.id === taskId);
        if (historyTask) {
            return historyTask;
        }

        return null;
    }

    /**
     * Cancel a task
     * @param {string} taskId - Task ID to cancel
     * @returns {boolean} True if cancelled
     */
    cancel(taskId) {
        const index = this.queue.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const task = this.queue.splice(index, 1)[0];
            task.status = 'cancelled';
            task.completedAt = Date.now();
            this.taskHistory.push(task);
            return true;
        }
        return false;
    }

    /**
     * Pause the queue
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume the queue
     */
    resume() {
        this.paused = false;
        this.process();
    }

    /**
     * Clear the queue
     */
    clear() {
        // Mark all queued tasks as cancelled
        for (const task of this.queue) {
            task.status = 'cancelled';
            task.completedAt = Date.now();
            this.taskHistory.push(task);
        }
        this.queue = [];
    }

    /**
     * Get queue statistics
     * @returns {Object} Queue statistics
     */
    getStats() {
        const historyStats = {
            total: this.taskHistory.length,
            completed: this.taskHistory.filter(t => t.status === 'completed').length,
            failed: this.taskHistory.filter(t => t.status === 'failed').length,
            cancelled: this.taskHistory.filter(t => t.status === 'cancelled').length
        };

        const avgDuration = historyStats.completed > 0
            ? this.taskHistory
                .filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + t.duration, 0) / historyStats.completed
            : 0;

        return {
            queue: {
                length: this.queue.length,
                processing: this.currentTasks,
                paused: this.paused
            },
            history: historyStats,
            averageDuration: Math.round(avgDuration)
        };
    }

    /**
     * Get task history
     * @param {number} limit - Maximum number of entries
     * @returns {Array} Task history
     */
    getHistory(limit = 50) {
        return this.taskHistory.slice(-limit);
    }

    /**
     * Clear task history
     */
    clearHistory() {
        this.taskHistory = [];
    }

    /**
     * Set maximum concurrent tasks
     * @param {number} max - Maximum concurrent tasks
     */
    setMaxConcurrent(max) {
        this.maxConcurrent = Math.max(1, max);
    }

    /**
     * Reorder tasks by priority
     */
    reorder() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get all queued tasks
     * @returns {Array} Queued tasks
     */
    getQueue() {
        return [...this.queue];
    }

    /**
     * Generate a unique task ID
     * @returns {string} Task ID
     */
    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = TaskQueue;
