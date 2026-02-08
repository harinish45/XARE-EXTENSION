/**
 * Task Planner Module
 * Breaks down complex tasks into executable steps
 */

class TaskPlanner {
    constructor(aiEngine) {
        this.aiEngine = aiEngine;
    }

    /**
     * Plan a complex task by breaking it down into steps
     * @param {string} taskDescription - Description of the task to plan
     * @param {Object} context - Current context (active window, etc.)
     * @returns {Promise<Object>} Task plan with steps
     */
    async planTask(taskDescription, context = {}) {
        const prompt = this.buildPlanningPrompt(taskDescription, context);

        try {
            const response = await this.aiEngine.chat(prompt, context);
            const plan = this.parsePlan(response.text);

            return {
                success: true,
                task: taskDescription,
                plan: plan,
                rawResponse: response.text
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                task: taskDescription
            };
        }
    }

    /**
     * Build the planning prompt for the AI
     * @param {string} taskDescription - Task to plan
     * @param {Object} context - Current context
     * @returns {string} Planning prompt
     */
    buildPlanningPrompt(taskDescription, context) {
        return `You are a task planning AI. Break down the following task into specific, executable steps.

Task: ${taskDescription}

Context:
- Active Window: ${context.activeWindow?.title || 'Unknown'}
- Available Actions: mouse_click, mouse_move, keyboard_type, open_app, file_operation, browser_navigate, screen_capture, screen_ocr

Break down the task into steps following this format:

PLAN:
Step 1: [Brief description of what to do]
  - Action: [action_type]
  - Parameters: {JSON parameters}
  - Reasoning: [Why this step is needed]

Step 2: [Brief description of what to do]
  - Action: [action_type]
  - Parameters: {JSON parameters}
  - Reasoning: [Why this step is needed]

... continue for all steps

Make sure each step:
1. Is specific and actionable
2. Has clear parameters
3. Can be executed independently
4. Has a clear purpose

Consider error handling and verification steps.`;
    }

    /**
     * Parse the AI response into a structured plan
     * @param {string} responseText - AI response text
     * @returns {Array} Array of plan steps
     */
    parsePlan(responseText) {
        const steps = [];
        const planRegex = /PLAN:([\s\S]*)/i;
        const planMatch = responseText.match(planRegex);

        if (!planMatch) {
            // Try to parse without PLAN prefix
            return this.parseStepsFromText(responseText);
        }

        const planText = planMatch[1];
        const stepRegex = /Step\s+(\d+):\s*([^\n]+)\s*-?\s*Action:\s*(\w+)\s*-?\s*Parameters:\s*(\{[^}]+\})\s*-?\s*Reasoning:\s*([^\n]+)/gi;

        let match;
        while ((match = stepRegex.exec(planText)) !== null) {
            steps.push({
                stepNumber: parseInt(match[1]),
                description: match[2].trim(),
                action: match[3].trim(),
                parameters: this.parseJSON(match[4]),
                reasoning: match[5].trim()
            });
        }

        // If regex didn't match, try alternative parsing
        if (steps.length === 0) {
            return this.parseStepsFromText(planText);
        }

        return steps;
    }

    /**
     * Parse steps from text using alternative method
     * @param {string} text - Text to parse
     * @returns {Array} Array of steps
     */
    parseStepsFromText(text) {
        const steps = [];
        const lines = text.split('\n').filter(line => line.trim());

        let currentStep = null;
        let stepNumber = 0;

        for (const line of lines) {
            const stepMatch = line.match(/(?:Step\s*)?(\d+)[.:]\s*(.+)/i);
            if (stepMatch) {
                if (currentStep) {
                    steps.push(currentStep);
                }
                stepNumber = parseInt(stepMatch[1]);
                currentStep = {
                    stepNumber: stepNumber,
                    description: stepMatch[2].trim(),
                    action: null,
                    parameters: {},
                    reasoning: ''
                };
            } else if (currentStep) {
                const actionMatch = line.match(/action:\s*(\w+)/i);
                const paramsMatch = line.match(/parameters:\s*(\{[^}]+\})/i);
                const reasoningMatch = line.match(/reasoning:\s*(.+)/i);

                if (actionMatch) {
                    currentStep.action = actionMatch[1].trim();
                }
                if (paramsMatch) {
                    currentStep.parameters = this.parseJSON(paramsMatch[1]);
                }
                if (reasoningMatch) {
                    currentStep.reasoning = reasoningMatch[1].trim();
                }
            }
        }

        if (currentStep) {
            steps.push(currentStep);
        }

        return steps;
    }

    /**
     * Safely parse JSON
     * @param {string} jsonString - JSON string to parse
     * @returns {Object} Parsed object or empty object
     */
    parseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Failed to parse JSON:', jsonString, error);
            return {};
        }
    }

    /**
     * Convert plan steps to executable actions
     * @param {Array} steps - Plan steps
     * @returns {Array} Executable actions
     */
    convertToActions(steps) {
        return steps.map(step => ({
            type: step.action,
            params: step.parameters,
            description: step.description,
            stepNumber: step.stepNumber
        }));
    }

    /**
     * Validate a plan for completeness and correctness
     * @param {Array} steps - Plan steps to validate
     * @returns {Object} Validation result
     */
    validatePlan(steps) {
        const issues = [];
        const warnings = [];

        if (steps.length === 0) {
            issues.push('Plan has no steps');
        }

        for (const step of steps) {
            // Check for required fields
            if (!step.action) {
                issues.push(`Step ${step.stepNumber}: Missing action type`);
            }
            if (!step.description) {
                warnings.push(`Step ${step.stepNumber}: Missing description`);
            }

            // Check for dangerous actions
            if (this.isDangerousAction(step.action)) {
                warnings.push(`Step ${step.stepNumber}: Action '${step.action}' may require confirmation`);
            }
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            warnings: warnings
        };
    }

    /**
     * Check if an action is dangerous
     * @param {string} action - Action type
     * @returns {boolean} True if dangerous
     */
    isDangerousAction(action) {
        const dangerousActions = [
            'file_delete',
            'system_shutdown',
            'system_restart',
            'browser_submit'
        ];
        return dangerousActions.includes(action);
    }

    /**
     * Estimate time to complete a plan
     * @param {Array} steps - Plan steps
     * @returns {Object} Time estimate
     */
    estimateTime(steps) {
        const actionTimes = {
            'mouse_move': 0.1,
            'mouse_click': 0.1,
            'keyboard_type': 0.5,
            'keyboard_press': 0.1,
            'screen_capture': 0.5,
            'screen_ocr': 2,
            'file_read': 0.5,
            'file_write': 0.5,
            'file_delete': 0.3,
            'browser_navigate': 2,
            'app_open': 1,
            'app_close': 0.5,
            'wait': 0.001 // per ms
        };

        let totalTime = 0;
        for (const step of steps) {
            const baseTime = actionTimes[step.action] || 1;
            totalTime += baseTime;

            // Add wait time if specified
            if (step.parameters && step.parameters.ms) {
                totalTime += step.parameters.ms / 1000;
            }
        }

        return {
            estimatedSeconds: Math.round(totalTime),
            estimatedMinutes: Math.round(totalTime / 60 * 10) / 10,
            steps: steps.length
        };
    }

    /**
     * Get a summary of the plan
     * @param {Array} steps - Plan steps
     * @returns {string} Plan summary
     */
    getPlanSummary(steps) {
        const timeEstimate = this.estimateTime(steps);
        const validation = this.validatePlan(steps);

        let summary = `Plan Summary:\n`;
        summary += `- Steps: ${steps.length}\n`;
        summary += `- Estimated time: ${timeEstimate.estimatedSeconds} seconds\n`;

        if (validation.issues.length > 0) {
            summary += `- Issues: ${validation.issues.length}\n`;
        }

        if (validation.warnings.length > 0) {
            summary += `- Warnings: ${validation.warnings.length}\n`;
        }

        return summary;
    }
}

module.exports = TaskPlanner;
