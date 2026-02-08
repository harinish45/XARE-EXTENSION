/**
 * Safety Module
 * Provides safety checks and validation for actions
 */

class Safety {
    constructor() {
        this.dangerousActions = [
            'file_delete',
            'system_shutdown',
            'system_restart',
            'browser_submit',
            'app_close'
        ];

        this.sensitivePatterns = [
            /password/i,
            /token/i,
            /secret/i,
            /api[_-]?key/i,
            /credit[_-]?card/i,
            /ssn/i,
            /social[_-]?security/i
        ];

        this.blockedDomains = [
            // Add domains that should be blocked
        ];

        this.blockedPaths = [
            // Add paths that should be blocked
            'C:\\Windows',
            'C:\\Program Files',
            'C:\\Program Files (x86)',
            '/System',
            '/usr/bin',
            '/usr/sbin'
        ];
    }

    /**
     * Check if an action requires confirmation
     * @param {string} actionType - Type of action
     * @returns {boolean} True if confirmation needed
     */
    requiresConfirmation(actionType) {
        return this.dangerousActions.includes(actionType);
    }

    /**
     * Check if an action is allowed
     * @param {string} actionType - Type of action
     * @param {Object} params - Action parameters
     * @returns {Object} Safety check result
     */
    checkAction(actionType, params = {}) {
        const result = {
            allowed: true,
            reason: null,
            warnings: []
        };

        // Check if action is dangerous
        if (this.dangerousActions.includes(actionType)) {
            result.warnings.push(`Action '${actionType}' is potentially dangerous`);
        }

        // Check parameters for sensitive data
        const sensitiveData = this.checkSensitiveData(params);
        if (sensitiveData.length > 0) {
            result.warnings.push(`Sensitive data detected in parameters: ${sensitiveData.join(', ')}`);
        }

        // Check file paths
        if (params.path) {
            const pathCheck = this.checkPath(params.path);
            if (!pathCheck.allowed) {
                result.allowed = false;
                result.reason = pathCheck.reason;
            }
        }

        // Check URLs
        if (params.url) {
            const urlCheck = this.checkURL(params.url);
            if (!urlCheck.allowed) {
                result.allowed = false;
                result.reason = urlCheck.reason;
            }
        }

        return result;
    }

    /**
     * Check for sensitive data in parameters
     * @param {Object} params - Parameters to check
     * @returns {Array} List of sensitive keys found
     */
    checkSensitiveData(params) {
        const sensitive = [];

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string') {
                for (const pattern of this.sensitivePatterns) {
                    if (pattern.test(key) || pattern.test(value)) {
                        sensitive.push(key);
                        break;
                    }
                }
            }
        }

        return sensitive;
    }

    /**
     * Check if a path is safe to access
     * @param {string} filePath - Path to check
     * @returns {Object} Safety check result
     */
    checkPath(filePath) {
        const result = {
            allowed: true,
            reason: null
        };

        // Normalize path
        const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

        // Check against blocked paths
        for (const blockedPath of this.blockedPaths) {
            const normalizedBlocked = blockedPath.toLowerCase().replace(/\\/g, '/');
            if (normalizedPath.startsWith(normalizedBlocked)) {
                result.allowed = false;
                result.reason = `Access to system path '${blockedPath}' is blocked`;
                return result;
            }
        }

        return result;
    }

    /**
     * Check if a URL is safe
     * @param {string} url - URL to check
     * @returns {Object} Safety check result
     */
    checkURL(url) {
        const result = {
            allowed: true,
            reason: null
        };

        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // Check against blocked domains
            for (const blockedDomain of this.blockedDomains) {
                if (hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`)) {
                    result.allowed = false;
                    result.reason = `Domain '${blockedDomain}' is blocked`;
                    return result;
                }
            }

            // Check for non-HTTP protocols
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                result.allowed = false;
                result.reason = `Protocol '${urlObj.protocol}' is not allowed`;
            }

        } catch (error) {
            result.allowed = false;
            result.reason = 'Invalid URL format';
        }

        return result;
    }

    /**
     * Sanitize parameters by removing sensitive data
     * @param {Object} params - Parameters to sanitize
     * @returns {Object} Sanitized parameters
     */
    sanitizeParams(params) {
        const sanitized = { ...params };

        for (const key of Object.keys(sanitized)) {
            for (const pattern of this.sensitivePatterns) {
                if (pattern.test(key)) {
                    sanitized[key] = '[REDACTED]';
                    break;
                }
            }
        }

        return sanitized;
    }

    /**
     * Validate a workflow for safety
     * @param {Object} workflow - Workflow to validate
     * @returns {Object} Validation result
     */
    validateWorkflow(workflow) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            result.errors.push('Workflow must have steps array');
            return result;
        }

        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            const safetyCheck = this.checkAction(step.action, step.params);

            if (!safetyCheck.allowed) {
                result.errors.push(`Step ${i + 1}: ${safetyCheck.reason}`);
            }

            if (safetyCheck.warnings.length > 0) {
                result.warnings.push(`Step ${i + 1}: ${safetyCheck.warnings.join(', ')}`);
            }
        }

        result.valid = result.errors.length === 0;
        return result;
    }

    /**
     * Add a dangerous action type
     * @param {string} actionType - Action type to add
     */
    addDangerousAction(actionType) {
        if (!this.dangerousActions.includes(actionType)) {
            this.dangerousActions.push(actionType);
        }
    }

    /**
     * Remove a dangerous action type
     * @param {string} actionType - Action type to remove
     */
    removeDangerousAction(actionType) {
        const index = this.dangerousActions.indexOf(actionType);
        if (index !== -1) {
            this.dangerousActions.splice(index, 1);
        }
    }

    /**
     * Add a blocked domain
     * @param {string} domain - Domain to block
     */
    addBlockedDomain(domain) {
        if (!this.blockedDomains.includes(domain)) {
            this.blockedDomains.push(domain);
        }
    }

    /**
     * Add a blocked path
     * @param {string} path - Path to block
     */
    addBlockedPath(path) {
        if (!this.blockedPaths.includes(path)) {
            this.blockedPaths.push(path);
        }
    }

    /**
     * Get current safety configuration
     * @returns {Object} Safety configuration
     */
    getConfig() {
        return {
            dangerousActions: [...this.dangerousActions],
            blockedDomains: [...this.blockedDomains],
            blockedPaths: [...this.blockedPaths]
        };
    }
}

// Singleton instance
const safety = new Safety();

module.exports = safety;
