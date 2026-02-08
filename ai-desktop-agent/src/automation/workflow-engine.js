/**
 * Workflow Engine Module
 * Orchestrates workflow execution and management
 */

class WorkflowEngine {
    constructor(actionExecutor) {
        this.actionExecutor = actionExecutor;
        this.activeWorkflows = new Map();
        this.workflowHistory = [];
    }

    /**
     * Execute a workflow
     * @param {Object} workflow - Workflow definition
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflow(workflow, context = {}) {
        const workflowId = this.generateId();
        const execution = {
            id: workflowId,
            workflow: workflow.name || 'Unnamed',
            startTime: Date.now(),
            status: 'running',
            steps: [],
            context
        };

        this.activeWorkflows.set(workflowId, execution);

        try {
            // Execute each step
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];

                const stepResult = await this.executeStep(step, context, execution);
                execution.steps.push(stepResult);

                // Check if step failed and should stop
                if (!stepResult.success && step.stopOnError !== false) {
                    execution.status = 'failed';
                    execution.error = stepResult.error;
                    break;
                }

                // Update context with step results
                if (stepResult.output !== undefined) {
                    context[step.name || `step_${i}`] = stepResult.output;
                }

                // Delay between steps if specified
                if (step.delay) {
                    await this.sleep(step.delay);
                }
            }

            // Mark as completed if not failed
            if (execution.status === 'running') {
                execution.status = 'completed';
            }

        } catch (error) {
            execution.status = 'error';
            execution.error = error.message;
        }

        execution.endTime = Date.now();
        execution.duration = execution.endTime - execution.startTime;

        // Add to history
        this.workflowHistory.push(execution);

        // Remove from active workflows
        this.activeWorkflows.delete(workflowId);

        return execution;
    }

    /**
     * Execute a single workflow step
     * @param {Object} step - Step definition
     * @param {Object} context - Execution context
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Step result
     */
    async executeStep(step, context, execution) {
        const stepResult = {
            name: step.name || 'Unnamed step',
            action: step.action,
            startTime: Date.now(),
            status: 'running'
        };

        try {
            // Resolve parameters with context
            const resolvedParams = this.resolveParameters(step.params, context);

            // Execute the action
            const actionResult = await this.actionExecutor.execute({
                type: step.action,
                params: resolvedParams,
                requireConfirmation: step.requireConfirmation || false
            });

            stepResult.success = actionResult.success;
            stepResult.output = actionResult.result;
            stepResult.error = actionResult.error;
            stepResult.status = actionResult.success ? 'completed' : 'failed';

        } catch (error) {
            stepResult.success = false;
            stepResult.error = error.message;
            stepResult.status = 'error';
        }

        stepResult.endTime = Date.now();
        stepResult.duration = stepResult.endTime - stepResult.startTime;

        return stepResult;
    }

    /**
     * Resolve parameters with context variables
     * @param {any} params - Parameters to resolve
     * @param {Object} context - Context object
     * @returns {any} Resolved parameters
     */
    resolveParameters(params, context) {
        if (typeof params === 'string') {
            return this.resolveString(params, context);
        }

        if (Array.isArray(params)) {
            return params.map(item => this.resolveParameters(item, context));
        }

        if (typeof params === 'object' && params !== null) {
            const resolved = {};
            for (const [key, value] of Object.entries(params)) {
                resolved[key] = this.resolveParameters(value, context);
            }
            return resolved;
        }

        return params;
    }

    /**
     * Resolve string with variable substitution
     * @param {string} str - String to resolve
     * @param {Object} context - Context object
     * @returns {string} Resolved string
     */
    resolveString(str, context) {
        return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] !== undefined ? context[key] : match;
        });
    }

    /**
     * Stop a running workflow
     * @param {string} workflowId - Workflow ID to stop
     * @returns {boolean} True if stopped
     */
    stopWorkflow(workflowId) {
        const execution = this.activeWorkflows.get(workflowId);
        if (execution) {
            execution.status = 'stopped';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            this.activeWorkflows.delete(workflowId);
            return true;
        }
        return false;
    }

    /**
     * Get active workflows
     * @returns {Array} Active workflows
     */
    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }

    /**
     * Get workflow history
     * @param {number} limit - Maximum number of entries
     * @returns {Array} Workflow history
     */
    getHistory(limit = 50) {
        return this.workflowHistory.slice(-limit);
    }

    /**
     * Clear workflow history
     */
    clearHistory() {
        this.workflowHistory = [];
    }

    /**
     * Validate a workflow definition
     * @param {Object} workflow - Workflow to validate
     * @returns {Object} Validation result
     */
    validateWorkflow(workflow) {
        const errors = [];
        const warnings = [];

        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow must have a steps array');
            return { valid: false, errors, warnings };
        }

        if (workflow.steps.length === 0) {
            warnings.push('Workflow has no steps');
        }

        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];

            if (!step.action) {
                errors.push(`Step ${i + 1}: Missing action type`);
            }

            if (step.delay && typeof step.delay !== 'number') {
                errors.push(`Step ${i + 1}: Delay must be a number`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Create a workflow from a template
     * @param {string} templateName - Template name
     * @param {Object} variables - Template variables
     * @returns {Object} Workflow definition
     */
    createFromTemplate(templateName, variables = {}) {
        const templates = this.getTemplates();
        const template = templates[templateName];

        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }

        return this.resolveParameters(template, variables);
    }

    /**
     * Get available workflow templates
     * @returns {Object} Available templates
     */
    getTemplates() {
        return {
            'email-summary': {
                name: 'Email Summary',
                description: 'Create and send an email summary',
                steps: [
                    {
                        name: 'open_email_client',
                        action: 'app_open',
                        params: { name: 'outlook' }
                    },
                    {
                        name: 'compose_email',
                        action: 'keyboard_shortcut',
                        params: { shortcut: 'ctrl+n' },
                        delay: 1000
                    },
                    {
                        name: 'type_subject',
                        action: 'keyboard_type',
                        params: { text: '{{subject}}' }
                    },
                    {
                        name: 'tab_to_body',
                        action: 'keyboard_press',
                        params: { key: 'tab' }
                    },
                    {
                        name: 'type_body',
                        action: 'keyboard_type',
                        params: { text: '{{body}}' }
                    }
                ]
            },
            'screenshot-and-save': {
                name: 'Screenshot and Save',
                description: 'Take a screenshot and save it',
                steps: [
                    {
                        name: 'capture_screen',
                        action: 'screen_capture',
                        params: {}
                    },
                    {
                        name: 'save_screenshot',
                        action: 'file_write',
                        params: {
                            path: '{{savePath}}',
                            content: '{{screenshotData}}'
                        }
                    }
                ]
            },
            'open-website': {
                name: 'Open Website',
                description: 'Open a browser and navigate to a website',
                steps: [
                    {
                        name: 'open_browser',
                        action: 'app_open',
                        params: { name: 'chrome' }
                    },
                    {
                        name: 'navigate',
                        action: 'browser_navigate',
                        params: { url: '{{url}}' },
                        delay: 2000
                    }
                ]
            }
        };
    }

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = WorkflowEngine;
