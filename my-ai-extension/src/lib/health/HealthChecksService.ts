// Health Checks Service

export interface HealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        api: boolean;
        storage: boolean;
        network: boolean;
        memory: boolean;
    };
    lastCheck: number;
}

export class HealthChecksService {
    private status: HealthStatus = {
        overall: 'healthy',
        checks: {
            api: true,
            storage: true,
            network: true,
            memory: true
        },
        lastCheck: Date.now()
    };

    // Run all health checks
    async runHealthChecks(): Promise<HealthStatus> {
        const checks = await Promise.all([
            this.checkAPI(),
            this.checkStorage(),
            this.checkNetwork(),
            this.checkMemory()
        ]);

        this.status.checks = {
            api: checks[0],
            storage: checks[1],
            network: checks[2],
            memory: checks[3]
        };

        // Determine overall health
        const failedChecks = Object.values(this.status.checks).filter(c => !c).length;
        if (failedChecks === 0) {
            this.status.overall = 'healthy';
        } else if (failedChecks <= 1) {
            this.status.overall = 'degraded';
        } else {
            this.status.overall = 'unhealthy';
        }

        this.status.lastCheck = Date.now();
        return this.status;
    }

    // Check API connectivity
    private async checkAPI(): Promise<boolean> {
        try {
            // Simple check - just verify we can access storage
            await chrome.storage.local.get('test');
            return true;
        } catch {
            return false;
        }
    }

    // Check storage availability
    private async checkStorage(): Promise<boolean> {
        try {
            await chrome.storage.local.set({ 'health-check': Date.now() });
            await chrome.storage.local.get('health-check');
            return true;
        } catch {
            return false;
        }
    }

    // Check network connectivity
    private async checkNetwork(): Promise<boolean> {
        return navigator.onLine;
    }

    // Check memory usage
    private async checkMemory(): Promise<boolean> {
        if ('memory' in performance) {
            const mem = (performance as any).memory;
            const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
            return usagePercent < 90; // Healthy if under 90%
        }
        return true; // Assume healthy if can't check
    }

    // Get current status
    getStatus(): HealthStatus {
        return this.status;
    }

    // Auto-run checks periodically
    startMonitoring(intervalMs: number = 60000): void {
        setInterval(() => this.runHealthChecks(), intervalMs);
    }
}

export const healthChecksService = new HealthChecksService();
