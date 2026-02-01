// Offline Support Service

export interface QueuedRequest {
    id: string;
    type: 'chat' | 'research' | 'search';
    data: any;
    timestamp: number;
    retries: number;
}

class OfflineService {
    private queue: QueuedRequest[] = [];
    private isOnline: boolean = navigator.onLine;
    private listeners: Set<(online: boolean) => void> = new Set();

    constructor() {
        this.init();
    }

    private init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Load queued requests from storage
        this.loadQueue();
    }

    private handleOnline() {
        this.isOnline = true;
        this.notifyListeners(true);
        this.processQueue();
    }

    private handleOffline() {
        this.isOnline = false;
        this.notifyListeners(false);
    }

    // Subscribe to online/offline status changes
    subscribe(callback: (online: boolean) => void): () => void {
        this.listeners.add(callback);
        // Immediately notify of current status
        callback(this.isOnline);

        // Return unsubscribe function
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(online: boolean) {
        this.listeners.forEach(callback => callback(online));
    }

    // Queue a request when offline
    queueRequest(type: QueuedRequest['type'], data: any): string {
        const request: QueuedRequest = {
            id: Date.now().toString(),
            type,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        this.queue.push(request);
        this.saveQueue();
        return request.id;
    }

    // Process queued requests when back online
    private async processQueue() {
        if (!this.isOnline || this.queue.length === 0) return;

        const requests = [...this.queue];
        this.queue = [];

        for (const request of requests) {
            try {
                // Attempt to process the request
                // This would need to be implemented based on request type
                console.log('Processing queued request:', request);

                // If successful, remove from queue
                // If failed, re-queue with incremented retry count
                if (request.retries < 3) {
                    request.retries++;
                    this.queue.push(request);
                }
            } catch (error) {
                console.error('Failed to process queued request:', error);
                if (request.retries < 3) {
                    request.retries++;
                    this.queue.push(request);
                }
            }
        }

        this.saveQueue();
    }

    private async loadQueue() {
        try {
            const stored = await chrome.storage.local.get('offline-queue');
            if (stored['offline-queue']) {
                this.queue = stored['offline-queue'];
            }
        } catch (e) {
            console.error('Failed to load offline queue:', e);
        }
    }

    private async saveQueue() {
        try {
            await chrome.storage.local.set({ 'offline-queue': this.queue });
        } catch (e) {
            console.error('Failed to save offline queue:', e);
        }
    }

    isOnlineNow(): boolean {
        return this.isOnline;
    }

    getQueuedCount(): number {
        return this.queue.length;
    }

    clearQueue() {
        this.queue = [];
        this.saveQueue();
    }
}

export const offlineService = new OfflineService();
