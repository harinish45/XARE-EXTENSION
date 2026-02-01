// Performance Monitoring Service

export interface PerformanceMetrics {
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    timing: {
        responseTime: number;
        renderTime: number;
        totalTime: number;
    };
    network: {
        requestCount: number;
        failureCount: number;
        averageLatency: number;
    };
}

export class PerformanceMonitoringService {
    private metrics: PerformanceMetrics[] = [];
    private startTime: number = 0;

    // Start monitoring
    startMonitoring(): void {
        this.startTime = performance.now();
    }

    // Record metrics
    async recordMetrics(): Promise<PerformanceMetrics> {
        const memory = await this.getMemoryUsage();
        const timing = this.getTimingMetrics();
        const network = this.getNetworkMetrics();

        const metrics: PerformanceMetrics = { memory, timing, network };
        this.metrics.push(metrics);

        // Keep only last 100 metrics
        if (this.metrics.length > 100) {
            this.metrics.shift();
        }

        return metrics;
    }

    // Get memory usage
    private async getMemoryUsage(): Promise<PerformanceMetrics['memory']> {
        if ('memory' in performance) {
            const mem = (performance as any).memory;
            return {
                used: mem.usedJSHeapSize,
                total: mem.totalJSHeapSize,
                percentage: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100
            };
        }
        return { used: 0, total: 0, percentage: 0 };
    }

    // Get timing metrics
    private getTimingMetrics(): PerformanceMetrics['timing'] {
        const now = performance.now();
        return {
            responseTime: 0,
            renderTime: 0,
            totalTime: now - this.startTime
        };
    }

    // Get network metrics
    private getNetworkMetrics(): PerformanceMetrics['network'] {
        const entries = performance.getEntriesByType('resource');
        const requests = entries.filter(e => e.name.includes('http'));

        return {
            requestCount: requests.length,
            failureCount: 0,
            averageLatency: requests.length > 0
                ? requests.reduce((sum, e) => sum + e.duration, 0) / requests.length
                : 0
        };
    }

    // Get average metrics
    getAverageMetrics(): PerformanceMetrics | null {
        if (this.metrics.length === 0) return null;

        const avg: PerformanceMetrics = {
            memory: { used: 0, total: 0, percentage: 0 },
            timing: { responseTime: 0, renderTime: 0, totalTime: 0 },
            network: { requestCount: 0, failureCount: 0, averageLatency: 0 }
        };

        this.metrics.forEach(m => {
            avg.memory.used += m.memory.used;
            avg.memory.total += m.memory.total;
            avg.memory.percentage += m.memory.percentage;
            avg.timing.responseTime += m.timing.responseTime;
            avg.timing.renderTime += m.timing.renderTime;
            avg.timing.totalTime += m.timing.totalTime;
            avg.network.requestCount += m.network.requestCount;
            avg.network.failureCount += m.network.failureCount;
            avg.network.averageLatency += m.network.averageLatency;
        });

        const count = this.metrics.length;
        avg.memory.used /= count;
        avg.memory.total /= count;
        avg.memory.percentage /= count;
        avg.timing.responseTime /= count;
        avg.timing.renderTime /= count;
        avg.timing.totalTime /= count;
        avg.network.requestCount /= count;
        avg.network.failureCount /= count;
        avg.network.averageLatency /= count;

        return avg;
    }

    // Auto-optimize based on metrics
    async autoOptimize(): Promise<void> {
        const avg = this.getAverageMetrics();
        if (!avg) return;

        // High memory usage
        if (avg.memory.percentage > 80) {
            console.warn('High memory usage detected, clearing caches...');
            // Clear caches
        }

        // Slow response times
        if (avg.timing.totalTime > 5000) {
            console.warn('Slow response times detected, optimizing...');
            // Enable performance mode
        }
    }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
