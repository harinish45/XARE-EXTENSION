/**
 * Provider Health Monitor
 * 
 * Tracks the health status of LLM providers using circuit breaker pattern.
 * Automatically disables unhealthy providers and re-enables them after cooldown.
 */

export interface ProviderHealth {
    provider: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
    successCount: number;
    failureCount: number;
    totalRequests: number;
    successRate: number;
    lastSuccess: number | null;
    lastFailure: number | null;
    consecutiveFailures: number;
    circuitState: 'closed' | 'open' | 'half-open';
    nextRetryTime: number | null;
}

export interface CircuitBreakerConfig {
    failureThreshold: number;      // Number of failures before opening circuit
    resetTimeout: number;           // Time in ms before attempting half-open
    halfOpenRequests: number;       // Number of test requests in half-open state
    degradedThreshold: number;      // Success rate below this = degraded
    unhealthyThreshold: number;     // Success rate below this = unhealthy
}

export interface HealthCheckResult {
    provider: string;
    healthy: boolean;
    reason?: string;
    metrics: ProviderHealth;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 60000,            // 1 minute
    halfOpenRequests: 1,
    degradedThreshold: 0.8,         // 80% success rate
    unhealthyThreshold: 0.5         // 50% success rate
};

export class ProviderHealthMonitor {
    private healthMap: Map<string, ProviderHealth> = new Map();
    private config: CircuitBreakerConfig;
    private halfOpenAttempts: Map<string, number> = new Map();

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize health tracking for a provider
     */
    initializeProvider(provider: string): void {
        if (!this.healthMap.has(provider)) {
            this.healthMap.set(provider, {
                provider,
                status: 'healthy',
                successCount: 0,
                failureCount: 0,
                totalRequests: 0,
                successRate: 1.0,
                lastSuccess: null,
                lastFailure: null,
                consecutiveFailures: 0,
                circuitState: 'closed',
                nextRetryTime: null
            });
        }
    }

    /**
     * Record a successful request
     */
    recordSuccess(provider: string): void {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;

        health.successCount++;
        health.totalRequests++;
        health.lastSuccess = Date.now();
        health.consecutiveFailures = 0;
        health.successRate = health.successCount / health.totalRequests;

        // Update status based on success rate
        if (health.circuitState === 'half-open') {
            const attempts = (this.halfOpenAttempts.get(provider) || 0) + 1;
            this.halfOpenAttempts.set(provider, attempts);

            if (attempts >= this.config.halfOpenRequests) {
                // Enough successful half-open requests, close the circuit
                health.circuitState = 'closed';
                health.nextRetryTime = null;
                this.halfOpenAttempts.delete(provider);
                console.log(`[ProviderHealthMonitor] Circuit closed for ${provider}`);
            }
        }

        // Update health status
        if (health.successRate >= this.config.degradedThreshold) {
            health.status = 'healthy';
        } else if (health.successRate >= this.config.unhealthyThreshold) {
            health.status = 'degraded';
        }

        this.healthMap.set(provider, health);
    }

    /**
     * Record a failed request
     */
    recordFailure(provider: string): void {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;

        health.failureCount++;
        health.totalRequests++;
        health.lastFailure = Date.now();
        health.consecutiveFailures++;
        health.successRate = health.totalRequests > 0
            ? health.successCount / health.totalRequests
            : 0;

        // Update health status
        if (health.successRate < this.config.unhealthyThreshold) {
            health.status = 'unhealthy';
        } else if (health.successRate < this.config.degradedThreshold) {
            health.status = 'degraded';
        }

        // Circuit breaker logic
        if (health.consecutiveFailures >= this.config.failureThreshold) {
            health.circuitState = 'open';
            health.nextRetryTime = Date.now() + this.config.resetTimeout;
            this.halfOpenAttempts.delete(provider);
            console.warn(`[ProviderHealthMonitor] Circuit opened for ${provider} after ${health.consecutiveFailures} failures`);
        }

        this.healthMap.set(provider, health);
    }

    /**
     * Check if a provider is available for use
     */
    isProviderAvailable(provider: string): boolean {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;

        // Check if manually disabled
        if (health.status === 'disabled') {
            return false;
        }

        // Check circuit breaker state
        if (health.circuitState === 'open') {
            // Check if it's time to try half-open
            if (health.nextRetryTime && Date.now() >= health.nextRetryTime) {
                health.circuitState = 'half-open';
                this.halfOpenAttempts.set(provider, 0);
                this.healthMap.set(provider, health);
                console.log(`[ProviderHealthMonitor] Circuit half-open for ${provider}`);
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Get health status for a provider
     */
    getProviderHealth(provider: string): ProviderHealth | null {
        return this.healthMap.get(provider) || null;
    }

    /**
     * Get health status for all providers
     */
    getAllProviderHealth(): ProviderHealth[] {
        return Array.from(this.healthMap.values());
    }

    /**
     * Get list of healthy providers
     */
    getHealthyProviders(): string[] {
        return Array.from(this.healthMap.entries())
            .filter(([_, health]) =>
                this.isProviderAvailable(health.provider) &&
                (health.status === 'healthy' || health.status === 'degraded')
            )
            .map(([provider]) => provider);
    }

    /**
     * Manually disable a provider
     */
    disableProvider(provider: string): void {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;
        health.status = 'disabled';
        this.healthMap.set(provider, health);
        console.log(`[ProviderHealthMonitor] Provider ${provider} manually disabled`);
    }

    /**
     * Manually enable a provider
     */
    enableProvider(provider: string): void {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;
        health.status = 'healthy';
        health.circuitState = 'closed';
        health.nextRetryTime = null;
        health.consecutiveFailures = 0;
        this.healthMap.set(provider, health);
        console.log(`[ProviderHealthMonitor] Provider ${provider} manually enabled`);
    }

    /**
     * Reset health statistics for a provider
     */
    resetProvider(provider: string): void {
        this.healthMap.delete(provider);
        this.halfOpenAttempts.delete(provider);
        this.initializeProvider(provider);
        console.log(`[ProviderHealthMonitor] Provider ${provider} reset`);
    }

    /**
     * Reset all provider statistics
     */
    resetAll(): void {
        this.healthMap.clear();
        this.halfOpenAttempts.clear();
        console.log(`[ProviderHealthMonitor] All providers reset`);
    }

    /**
     * Perform health check on a provider
     */
    performHealthCheck(provider: string): HealthCheckResult {
        this.initializeProvider(provider);
        const health = this.healthMap.get(provider)!;

        const available = this.isProviderAvailable(provider);
        let reason: string | undefined;

        if (!available) {
            if (health.status === 'disabled') {
                reason = 'Provider manually disabled';
            } else if (health.circuitState === 'open') {
                const waitTime = health.nextRetryTime
                    ? Math.ceil((health.nextRetryTime - Date.now()) / 1000)
                    : 0;
                reason = `Circuit breaker open, retry in ${waitTime}s`;
            }
        } else if (health.status === 'unhealthy') {
            reason = `Low success rate: ${(health.successRate * 100).toFixed(1)}%`;
        } else if (health.status === 'degraded') {
            reason = `Degraded performance: ${(health.successRate * 100).toFixed(1)}%`;
        }

        return {
            provider,
            healthy: available && health.status !== 'unhealthy',
            reason,
            metrics: { ...health }
        };
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary(): {
        totalProviders: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
        disabled: number;
        circuitOpen: number;
    } {
        const providers = Array.from(this.healthMap.values());

        return {
            totalProviders: providers.length,
            healthy: providers.filter(p => p.status === 'healthy').length,
            degraded: providers.filter(p => p.status === 'degraded').length,
            unhealthy: providers.filter(p => p.status === 'unhealthy').length,
            disabled: providers.filter(p => p.status === 'disabled').length,
            circuitOpen: providers.filter(p => p.circuitState === 'open').length
        };
    }

    /**
     * Export health data for persistence
     */
    exportHealthData(): Record<string, ProviderHealth> {
        const data: Record<string, ProviderHealth> = {};
        this.healthMap.forEach((health, provider) => {
            data[provider] = { ...health };
        });
        return data;
    }

    /**
     * Import health data from persistence
     */
    importHealthData(data: Record<string, ProviderHealth>): void {
        Object.entries(data).forEach(([provider, health]) => {
            this.healthMap.set(provider, health);
        });
    }
}

// Singleton instance
export const providerHealthMonitor = new ProviderHealthMonitor();
