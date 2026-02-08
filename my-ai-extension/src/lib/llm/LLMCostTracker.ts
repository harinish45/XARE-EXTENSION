/**
 * LLM Cost Tracker
 * 
 * Tracks token usage and estimated costs for LLM providers.
 * Monitors quota limits and alerts when approaching thresholds.
 */

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface CostEstimate {
    promptCost: number;
    completionCost: number;
    totalCost: number;
    currency: string;
}

export interface ProviderPricing {
    provider: string;
    model: string;
    promptTokenCost: number;      // Cost per 1K tokens
    completionTokenCost: number;  // Cost per 1K tokens
    currency: string;
    quotaLimit?: number;           // Free tier limit (tokens/month)
    quotaResetDay?: number;        // Day of month quota resets
}

export interface ProviderUsage {
    provider: string;
    model: string;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    requestCount: number;
    lastUsed: number;
    quotaUsed: number;             // Percentage of quota used
    quotaRemaining?: number;       // Tokens remaining in quota
}

export interface QuotaAlert {
    provider: string;
    level: 'warning' | 'critical' | 'exceeded';
    quotaUsed: number;
    quotaLimit: number;
    message: string;
    timestamp: number;
}

// Pricing data for common providers (as of 2024)
const PROVIDER_PRICING: Record<string, ProviderPricing> = {
    'openai-gpt-4': {
        provider: 'openai',
        model: 'gpt-4',
        promptTokenCost: 0.03,        // $0.03 per 1K tokens
        completionTokenCost: 0.06,    // $0.06 per 1K tokens
        currency: 'USD'
    },
    'openai-gpt-3.5-turbo': {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        promptTokenCost: 0.0015,
        completionTokenCost: 0.002,
        currency: 'USD'
    },
    'anthropic-claude-3-opus': {
        provider: 'anthropic',
        model: 'claude-3-opus',
        promptTokenCost: 0.015,
        completionTokenCost: 0.075,
        currency: 'USD'
    },
    'anthropic-claude-3-sonnet': {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        promptTokenCost: 0.003,
        completionTokenCost: 0.015,
        currency: 'USD'
    },
    'gemini-pro': {
        provider: 'gemini',
        model: 'gemini-pro',
        promptTokenCost: 0,           // Free tier
        completionTokenCost: 0,
        currency: 'USD',
        quotaLimit: 60000,            // 60 requests per minute
        quotaResetDay: 1
    },
    'groq-mixtral': {
        provider: 'groq',
        model: 'mixtral-8x7b',
        promptTokenCost: 0,           // Free tier
        completionTokenCost: 0,
        currency: 'USD',
        quotaLimit: 14400,            // Requests per day
        quotaResetDay: 1
    },
    'ollama-local': {
        provider: 'ollama',
        model: 'local',
        promptTokenCost: 0,           // Local = free
        completionTokenCost: 0,
        currency: 'USD'
    }
};

export class LLMCostTracker {
    private usageMap: Map<string, ProviderUsage> = new Map();
    private pricingMap: Map<string, ProviderPricing> = new Map();
    private quotaAlerts: QuotaAlert[] = [];
    private alertThresholds = {
        warning: 0.75,      // 75% of quota
        critical: 0.90      // 90% of quota
    };

    constructor() {
        // Initialize with default pricing
        Object.values(PROVIDER_PRICING).forEach(pricing => {
            const key = `${pricing.provider}-${pricing.model}`;
            this.pricingMap.set(key, pricing);
        });
    }

    /**
     * Add custom pricing for a provider/model
     */
    addPricing(pricing: ProviderPricing): void {
        const key = `${pricing.provider}-${pricing.model}`;
        this.pricingMap.set(key, pricing);
    }

    /**
     * Record token usage for a request
     */
    recordUsage(
        provider: string,
        model: string,
        usage: TokenUsage
    ): void {
        const key = `${provider}-${model}`;

        let providerUsage = this.usageMap.get(key);
        if (!providerUsage) {
            providerUsage = {
                provider,
                model,
                totalPromptTokens: 0,
                totalCompletionTokens: 0,
                totalTokens: 0,
                estimatedCost: 0,
                requestCount: 0,
                lastUsed: Date.now(),
                quotaUsed: 0
            };
        }

        // Update usage
        providerUsage.totalPromptTokens += usage.promptTokens;
        providerUsage.totalCompletionTokens += usage.completionTokens;
        providerUsage.totalTokens += usage.totalTokens;
        providerUsage.requestCount++;
        providerUsage.lastUsed = Date.now();

        // Calculate cost
        const pricing = this.pricingMap.get(key);
        if (pricing) {
            const promptCost = (usage.promptTokens / 1000) * pricing.promptTokenCost;
            const completionCost = (usage.completionTokens / 1000) * pricing.completionTokenCost;
            providerUsage.estimatedCost += promptCost + completionCost;

            // Update quota usage
            if (pricing.quotaLimit) {
                providerUsage.quotaUsed = (providerUsage.requestCount / pricing.quotaLimit) * 100;
                providerUsage.quotaRemaining = pricing.quotaLimit - providerUsage.requestCount;

                // Check for quota alerts
                this.checkQuotaAlerts(provider, model, providerUsage, pricing);
            }
        }

        this.usageMap.set(key, providerUsage);
    }

    /**
     * Check if quota thresholds are exceeded and create alerts
     */
    private checkQuotaAlerts(
        provider: string,
        model: string,
        usage: ProviderUsage,
        pricing: ProviderPricing
    ): void {
        if (!pricing.quotaLimit) return;

        const quotaPercentage = usage.quotaUsed / 100;
        const key = `${provider}-${model}`;

        // Check if already alerted
        const existingAlert = this.quotaAlerts.find(
            a => a.provider === key && a.timestamp > Date.now() - 3600000 // 1 hour
        );
        if (existingAlert) return;

        let alert: QuotaAlert | null = null;

        if (quotaPercentage >= 1.0) {
            alert = {
                provider: key,
                level: 'exceeded',
                quotaUsed: usage.requestCount,
                quotaLimit: pricing.quotaLimit,
                message: `Quota exceeded for ${provider}/${model}. ${usage.requestCount}/${pricing.quotaLimit} requests used.`,
                timestamp: Date.now()
            };
        } else if (quotaPercentage >= this.alertThresholds.critical) {
            alert = {
                provider: key,
                level: 'critical',
                quotaUsed: usage.requestCount,
                quotaLimit: pricing.quotaLimit,
                message: `Critical: ${(quotaPercentage * 100).toFixed(1)}% of quota used for ${provider}/${model}`,
                timestamp: Date.now()
            };
        } else if (quotaPercentage >= this.alertThresholds.warning) {
            alert = {
                provider: key,
                level: 'warning',
                quotaUsed: usage.requestCount,
                quotaLimit: pricing.quotaLimit,
                message: `Warning: ${(quotaPercentage * 100).toFixed(1)}% of quota used for ${provider}/${model}`,
                timestamp: Date.now()
            };
        }

        if (alert) {
            this.quotaAlerts.push(alert);
            console.warn(`[LLMCostTracker] ${alert.message}`);
        }
    }

    /**
     * Get usage for a specific provider/model
     */
    getUsage(provider: string, model: string): ProviderUsage | null {
        const key = `${provider}-${model}`;
        return this.usageMap.get(key) || null;
    }

    /**
     * Get all usage data
     */
    getAllUsage(): ProviderUsage[] {
        return Array.from(this.usageMap.values());
    }

    /**
     * Calculate cost estimate for a token usage
     */
    estimateCost(
        provider: string,
        model: string,
        usage: TokenUsage
    ): CostEstimate | null {
        const key = `${provider}-${model}`;
        const pricing = this.pricingMap.get(key);

        if (!pricing) {
            return null;
        }

        const promptCost = (usage.promptTokens / 1000) * pricing.promptTokenCost;
        const completionCost = (usage.completionTokens / 1000) * pricing.completionTokenCost;

        return {
            promptCost,
            completionCost,
            totalCost: promptCost + completionCost,
            currency: pricing.currency
        };
    }

    /**
     * Get total cost across all providers
     */
    getTotalCost(): number {
        return Array.from(this.usageMap.values())
            .reduce((sum, usage) => sum + usage.estimatedCost, 0);
    }

    /**
     * Check if provider is within quota
     */
    isWithinQuota(provider: string, model: string): boolean {
        const key = `${provider}-${model}`;
        const usage = this.usageMap.get(key);
        const pricing = this.pricingMap.get(key);

        if (!pricing || !pricing.quotaLimit) {
            return true; // No quota limit
        }

        if (!usage) {
            return true; // No usage yet
        }

        return usage.requestCount < pricing.quotaLimit;
    }

    /**
     * Get remaining quota for a provider
     */
    getRemainingQuota(provider: string, model: string): number | null {
        const key = `${provider}-${model}`;
        const usage = this.usageMap.get(key);
        const pricing = this.pricingMap.get(key);

        if (!pricing || !pricing.quotaLimit) {
            return null; // No quota limit
        }

        const used = usage ? usage.requestCount : 0;
        return Math.max(0, pricing.quotaLimit - used);
    }

    /**
     * Get recent quota alerts
     */
    getRecentAlerts(hours: number = 24): QuotaAlert[] {
        const cutoff = Date.now() - (hours * 3600000);
        return this.quotaAlerts.filter(alert => alert.timestamp >= cutoff);
    }

    /**
     * Clear alerts for a provider
     */
    clearAlerts(provider?: string): void {
        if (provider) {
            this.quotaAlerts = this.quotaAlerts.filter(a => !a.provider.startsWith(provider));
        } else {
            this.quotaAlerts = [];
        }
    }

    /**
     * Reset usage for a provider (e.g., monthly reset)
     */
    resetUsage(provider: string, model: string): void {
        const key = `${provider}-${model}`;
        this.usageMap.delete(key);
        this.clearAlerts(key);
        console.log(`[LLMCostTracker] Usage reset for ${provider}/${model}`);
    }

    /**
     * Reset all usage data
     */
    resetAll(): void {
        this.usageMap.clear();
        this.quotaAlerts = [];
        console.log(`[LLMCostTracker] All usage data reset`);
    }

    /**
     * Get usage summary
     */
    getSummary(): {
        totalCost: number;
        totalRequests: number;
        totalTokens: number;
        providerCount: number;
        activeAlerts: number;
    } {
        const usages = Array.from(this.usageMap.values());

        return {
            totalCost: this.getTotalCost(),
            totalRequests: usages.reduce((sum, u) => sum + u.requestCount, 0),
            totalTokens: usages.reduce((sum, u) => sum + u.totalTokens, 0),
            providerCount: usages.length,
            activeAlerts: this.getRecentAlerts(24).length
        };
    }

    /**
     * Export usage data for persistence
     */
    exportData(): {
        usage: Record<string, ProviderUsage>;
        alerts: QuotaAlert[];
    } {
        const usage: Record<string, ProviderUsage> = {};
        this.usageMap.forEach((data, key) => {
            usage[key] = { ...data };
        });

        return {
            usage,
            alerts: [...this.quotaAlerts]
        };
    }

    /**
     * Import usage data from persistence
     */
    importData(data: {
        usage: Record<string, ProviderUsage>;
        alerts: QuotaAlert[];
    }): void {
        Object.entries(data.usage).forEach(([key, usage]) => {
            this.usageMap.set(key, usage);
        });
        this.quotaAlerts = data.alerts;
    }
}

// Singleton instance
export const llmCostTracker = new LLMCostTracker();
