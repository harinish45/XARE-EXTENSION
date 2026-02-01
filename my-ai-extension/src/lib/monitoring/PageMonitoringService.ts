// Page Monitoring Service

export interface PageMonitor {
    id: string;
    url: string;
    selector?: string;
    interval: number;
    lastCheck: number;
    lastValue: string;
    onChange: (newValue: string) => void;
}

export class PageMonitoringService {
    private monitors: Map<string, PageMonitor> = new Map();
    private intervals: Map<string, number> = new Map();

    // Start monitoring a page element
    async startMonitoring(
        url: string,
        selector: string,
        interval: number,
        onChange: (newValue: string) => void
    ): Promise<string> {
        const id = `monitor-${Date.now()}`;
        const monitor: PageMonitor = {
            id,
            url,
            selector,
            interval,
            lastCheck: Date.now(),
            lastValue: '',
            onChange
        };

        this.monitors.set(id, monitor);

        // Start checking
        const intervalId = window.setInterval(() => this.checkPage(id), interval);
        this.intervals.set(id, intervalId);

        return id;
    }

    // Check page for changes
    private async checkPage(monitorId: string): Promise<void> {
        const monitor = this.monitors.get(monitorId);
        if (!monitor) return;

        try {
            const [tab] = await chrome.tabs.query({ url: monitor.url });
            if (!tab?.id) return;

            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (sel: string) => {
                    const el = document.querySelector(sel);
                    return el?.textContent || '';
                },
                args: [monitor.selector!]
            });

            const newValue = result[0]?.result || '';
            if (newValue !== monitor.lastValue) {
                monitor.lastValue = newValue;
                monitor.onChange(newValue);
            }

            monitor.lastCheck = Date.now();
        } catch (error) {
            console.error('Page monitoring error:', error);
        }
    }

    // Stop monitoring
    stopMonitoring(id: string): void {
        const intervalId = this.intervals.get(id);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(id);
        }
        this.monitors.delete(id);
    }

    // Get all monitors
    getAllMonitors(): PageMonitor[] {
        return Array.from(this.monitors.values());
    }
}

export const pageMonitoringService = new PageMonitoringService();
