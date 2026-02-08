/**
 * Permission Service
 * 
 * Manages permissions for automation actions to prevent unauthorized or dangerous operations.
 * Implements whitelist/blacklist, permission levels, and user confirmation for risky actions.
 */

export type PermissionLevel = 'low' | 'medium' | 'high';
export type ActionType = 'read' | 'write' | 'delete' | 'execute' | 'navigate' | 'send';

export interface PermissionRule {
    action: string;
    resource?: string;
    allowed: boolean;
    requireConfirmation: boolean;
    reason?: string;
}

export interface PermissionCheck {
    allowed: boolean;
    requiresConfirmation: boolean;
    reason?: string;
}

export interface PermissionConfig {
    level: PermissionLevel;
    dangerousActions: string[];
    whitelist: string[];
    blacklist: string[];
    autoApprove: string[];
}

const DEFAULT_CONFIG: PermissionConfig = {
    level: 'medium',
    dangerousActions: [
        'delete_file',
        'send_email',
        'make_purchase',
        'execute_code',
        'system_command',
        'delete_data',
        'modify_settings'
    ],
    whitelist: [],
    blacklist: [],
    autoApprove: ['read', 'navigate', 'scroll', 'click']
};

export class PermissionService {
    private static instance: PermissionService;
    private config: PermissionConfig;
    private rules: Map<string, PermissionRule> = new Map();
    private pendingConfirmations: Map<string, (approved: boolean) => void> = new Map();

    private constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.loadConfig();
    }

    static getInstance(): PermissionService {
        if (!PermissionService.instance) {
            PermissionService.instance = new PermissionService();
        }
        return PermissionService.instance;
    }

    /**
     * Check if an action is permitted
     */
    async checkPermission(
        action: string,
        resource?: string,
        actionType?: ActionType
    ): Promise<PermissionCheck> {
        // Check blacklist first
        if (this.isBlacklisted(action, resource)) {
            return {
                allowed: false,
                requiresConfirmation: false,
                reason: 'Action or resource is blacklisted'
            };
        }

        // Check whitelist
        if (this.isWhitelisted(action, resource)) {
            return {
                allowed: true,
                requiresConfirmation: false,
                reason: 'Action or resource is whitelisted'
            };
        }

        // Check custom rules
        const rule = this.getRule(action, resource);
        if (rule) {
            return {
                allowed: rule.allowed,
                requiresConfirmation: rule.requireConfirmation,
                reason: rule.reason
            };
        }

        // Check based on permission level and action type
        const isDangerous = this.isDangerousAction(action);
        const isAutoApproved = this.isAutoApprovedAction(action);

        switch (this.config.level) {
            case 'low':
                // Allow everything except blacklisted
                return {
                    allowed: true,
                    requiresConfirmation: isDangerous,
                    reason: isDangerous ? 'Dangerous action requires confirmation' : undefined
                };

            case 'medium':
                // Allow most things, confirm dangerous actions
                if (isDangerous) {
                    return {
                        allowed: true,
                        requiresConfirmation: true,
                        reason: 'Dangerous action requires confirmation'
                    };
                }
                if (actionType === 'delete' || actionType === 'execute') {
                    return {
                        allowed: true,
                        requiresConfirmation: true,
                        reason: 'Destructive action requires confirmation'
                    };
                }
                return {
                    allowed: true,
                    requiresConfirmation: false
                };

            case 'high':
                // Require confirmation for everything except auto-approved
                return {
                    allowed: true,
                    requiresConfirmation: !isAutoApproved,
                    reason: !isAutoApproved ? 'High security mode - confirmation required' : undefined
                };

            default:
                return {
                    allowed: false,
                    requiresConfirmation: false,
                    reason: 'Unknown permission level'
                };
        }
    }

    /**
     * Request user confirmation for an action
     */
    async requestPermission(
        action: string,
        resource?: string,
        description?: string
    ): Promise<boolean> {
        const confirmationId = this.generateConfirmationId();

        return new Promise((resolve) => {
            this.pendingConfirmations.set(confirmationId, resolve);

            // Show confirmation dialog
            this.showConfirmationDialog(confirmationId, action, resource, description);

            // Auto-deny after 30 seconds
            setTimeout(() => {
                if (this.pendingConfirmations.has(confirmationId)) {
                    this.respondToConfirmation(confirmationId, false);
                }
            }, 30000);
        });
    }

    /**
     * Show confirmation dialog to user
     */
    private showConfirmationDialog(
        confirmationId: string,
        action: string,
        resource?: string,
        description?: string
    ): void {
        // This would show a UI dialog in practice
        // For now, log to console
        console.log(`[PermissionService] Confirmation required:`, {
            id: confirmationId,
            action,
            resource,
            description
        });

        // In a real implementation, this would trigger a UI notification
        // that calls respondToConfirmation() with the user's choice
    }

    /**
     * Respond to a confirmation request
     */
    respondToConfirmation(confirmationId: string, approved: boolean): void {
        const resolver = this.pendingConfirmations.get(confirmationId);
        if (resolver) {
            resolver(approved);
            this.pendingConfirmations.delete(confirmationId);
            console.log(`[PermissionService] Confirmation ${approved ? 'approved' : 'denied'}: ${confirmationId}`);
        }
    }

    /**
     * Set permission level
     */
    setPermissionLevel(level: PermissionLevel): void {
        this.config.level = level;
        this.saveConfig();
        console.log(`[PermissionService] Permission level set to: ${level}`);
    }

    /**
     * Add to whitelist
     */
    addToWhitelist(item: string): void {
        if (!this.config.whitelist.includes(item)) {
            this.config.whitelist.push(item);
            this.saveConfig();
            console.log(`[PermissionService] Added to whitelist: ${item}`);
        }
    }

    /**
     * Add to blacklist
     */
    addToBlacklist(item: string): void {
        if (!this.config.blacklist.includes(item)) {
            this.config.blacklist.push(item);
            this.saveConfig();
            console.log(`[PermissionService] Added to blacklist: ${item}`);
        }
    }

    /**
     * Remove from whitelist
     */
    removeFromWhitelist(item: string): void {
        this.config.whitelist = this.config.whitelist.filter(i => i !== item);
        this.saveConfig();
    }

    /**
     * Remove from blacklist
     */
    removeFromBlacklist(item: string): void {
        this.config.blacklist = this.config.blacklist.filter(i => i !== item);
        this.saveConfig();
    }

    /**
     * Add custom permission rule
     */
    addRule(rule: PermissionRule): void {
        const key = this.getRuleKey(rule.action, rule.resource);
        this.rules.set(key, rule);
        console.log(`[PermissionService] Added rule: ${key}`);
    }

    /**
     * Remove permission rule
     */
    removeRule(action: string, resource?: string): void {
        const key = this.getRuleKey(action, resource);
        this.rules.delete(key);
    }

    /**
     * Check if action/resource is whitelisted
     */
    private isWhitelisted(action: string, resource?: string): boolean {
        return this.config.whitelist.some(item =>
            action.includes(item) || (resource && resource.includes(item))
        );
    }

    /**
     * Check if action/resource is blacklisted
     */
    private isBlacklisted(action: string, resource?: string): boolean {
        return this.config.blacklist.some(item =>
            action.includes(item) || (resource && resource.includes(item))
        );
    }

    /**
     * Check if action is dangerous
     */
    private isDangerousAction(action: string): boolean {
        return this.config.dangerousActions.some(dangerous =>
            action.toLowerCase().includes(dangerous.toLowerCase())
        );
    }

    /**
     * Check if action is auto-approved
     */
    private isAutoApprovedAction(action: string): boolean {
        return this.config.autoApprove.some(approved =>
            action.toLowerCase().includes(approved.toLowerCase())
        );
    }

    /**
     * Get rule for action/resource
     */
    private getRule(action: string, resource?: string): PermissionRule | null {
        const key = this.getRuleKey(action, resource);
        return this.rules.get(key) || null;
    }

    /**
     * Generate rule key
     */
    private getRuleKey(action: string, resource?: string): string {
        return resource ? `${action}:${resource}` : action;
    }

    /**
     * Generate confirmation ID
     */
    private generateConfirmationId(): string {
        return `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load configuration from storage
     */
    private async loadConfig(): Promise<void> {
        try {
            const result = await chrome.storage.local.get('permission_config');
            if (result.permission_config) {
                this.config = { ...this.config, ...result.permission_config };
            }
        } catch (error) {
            console.error('[PermissionService] Failed to load config:', error);
        }
    }

    /**
     * Save configuration to storage
     */
    private async saveConfig(): Promise<void> {
        try {
            await chrome.storage.local.set({ permission_config: this.config });
        } catch (error) {
            console.error('[PermissionService] Failed to save config:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): PermissionConfig {
        return { ...this.config };
    }

    /**
     * Reset to default configuration
     */
    resetConfig(): void {
        this.config = { ...DEFAULT_CONFIG };
        this.rules.clear();
        this.saveConfig();
        console.log('[PermissionService] Configuration reset to defaults');
    }
}

// Singleton instance
export const permissionService = PermissionService.getInstance();
