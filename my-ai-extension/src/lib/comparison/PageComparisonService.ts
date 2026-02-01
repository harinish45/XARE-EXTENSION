// Page Comparison Service

export interface PageSnapshot {
    id: string;
    url: string;
    content: string;
    timestamp: number;
}

export class PageComparisonService {
    private snapshots: Map<string, PageSnapshot[]> = new Map();

    // Take snapshot of current page
    async takeSnapshot(url: string): Promise<string> {
        const [tab] = await chrome.tabs.query({ url });
        if (!tab.id) throw new Error('Page not found');

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });

        const content = result[0]?.result || '';
        const id = `snapshot-${Date.now()}`;

        const snapshot: PageSnapshot = {
            id,
            url,
            content,
            timestamp: Date.now()
        };

        if (!this.snapshots.has(url)) {
            this.snapshots.set(url, []);
        }
        this.snapshots.get(url)!.push(snapshot);

        return id;
    }

    // Compare two snapshots
    compareSnapshots(id1: string, id2: string): { added: string[]; removed: string[]; unchanged: number } {
        let snapshot1: PageSnapshot | undefined;
        let snapshot2: PageSnapshot | undefined;

        for (const snaps of this.snapshots.values()) {
            snapshot1 = snapshot1 || snaps.find(s => s.id === id1);
            snapshot2 = snapshot2 || snaps.find(s => s.id === id2);
        }

        if (!snapshot1 || !snapshot2) {
            return { added: [], removed: [], unchanged: 0 };
        }

        const lines1 = snapshot1.content.split('\n');
        const lines2 = snapshot2.content.split('\n');

        const added = lines2.filter(line => !lines1.includes(line));
        const removed = lines1.filter(line => !lines2.includes(line));
        const unchanged = lines1.filter(line => lines2.includes(line)).length;

        return { added, removed, unchanged };
    }

    // Get all snapshots for URL
    getSnapshots(url: string): PageSnapshot[] {
        return this.snapshots.get(url) || [];
    }
}

export const pageComparisonService = new PageComparisonService();
