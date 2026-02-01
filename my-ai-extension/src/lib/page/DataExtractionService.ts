// Smart Data Extraction Service

export interface ExtractedData {
    tables: TableData[];
    lists: ListData[];
    images: ImageData[];
    links: LinkData[];
    metadata: PageMetadata;
}

export interface TableData {
    headers: string[];
    rows: string[][];
    caption?: string;
}

export interface ListData {
    type: 'ordered' | 'unordered';
    items: string[];
}

export interface ImageData {
    src: string;
    alt: string;
    width?: number;
    height?: number;
}

export interface LinkData {
    text: string;
    href: string;
    title?: string;
}

export interface PageMetadata {
    title: string;
    description?: string;
    author?: string;
    publishDate?: string;
    keywords?: string[];
}

export class DataExtractionService {
    // Extract all data from page
    async extractAll(): Promise<ExtractedData> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) throw new Error('No active tab');

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Extract tables
                const tables = Array.from(document.querySelectorAll('table')).map(table => {
                    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
                    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
                        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
                    ).filter(row => row.length > 0);
                    const caption = table.querySelector('caption')?.textContent?.trim();

                    return { headers, rows, caption };
                });

                // Extract lists
                const lists = Array.from(document.querySelectorAll('ul, ol')).map(list => ({
                    type: list.tagName === 'OL' ? 'ordered' as const : 'unordered' as const,
                    items: Array.from(list.querySelectorAll('li')).map(li => li.textContent?.trim() || '')
                }));

                // Extract images
                const images = Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    width: img.width,
                    height: img.height
                }));

                // Extract links
                const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
                    text: a.textContent?.trim() || '',
                    href: (a as HTMLAnchorElement).href,
                    title: a.getAttribute('title') || undefined
                }));

                // Extract metadata
                const metadata = {
                    title: document.title,
                    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
                    author: document.querySelector('meta[name="author"]')?.getAttribute('content') || undefined,
                    publishDate: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || undefined,
                    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || undefined
                };

                return { tables, lists, images, links, metadata };
            }
        });

        return result[0]?.result || { tables: [], lists: [], images: [], links: [], metadata: { title: '' } };
    }

    // Export to CSV
    async exportToCSV(tables: TableData[]): Promise<string> {
        if (tables.length === 0) return '';

        let csv = '';
        tables.forEach((table, index) => {
            if (table.caption) csv += `# ${table.caption}\n`;
            if (table.headers.length > 0) {
                csv += table.headers.join(',') + '\n';
            }
            table.rows.forEach(row => {
                csv += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',') + '\n';
            });
            if (index < tables.length - 1) csv += '\n';
        });

        return csv;
    }

    // Export to JSON
    async exportToJSON(data: ExtractedData): Promise<string> {
        return JSON.stringify(data, null, 2);
    }

    // Download extracted data
    async downloadData(data: string, filename: string, type: 'csv' | 'json'): Promise<void> {
        const blob = new Blob([data], { type: type === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url,
            filename,
            saveAs: true
        });

        URL.revokeObjectURL(url);
    }
}

export const dataExtractionService = new DataExtractionService();
