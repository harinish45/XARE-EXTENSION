/**
 * OCR Service
 * 
 * Provides text extraction from images using Tesseract.js.
 * Supports multiple languages and caching for performance.
 * 
 * NOTE: Requires tesseract.js to be installed:
 * npm install tesseract.js
 */

// Uncomment when tesseract.js is installed
// import Tesseract from 'tesseract.js';

export interface OCROptions {
    lang?: string | string[];       // Language(s) to recognize (default: 'eng')
    psm?: number;                   // Page segmentation mode (0-13)
    oem?: number;                   // OCR Engine mode (0-3)
    whitelist?: string;             // Whitelist of characters
    blacklist?: string;             // Blacklist of characters
}

export interface OCRResult {
    text: string;
    confidence: number;
    words: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
    lines: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
}

export interface OCRCache {
    imageHash: string;
    result: OCRResult;
    timestamp: number;
}

export class OCRService {
    private static instance: OCRService;
    private cache: Map<string, OCRCache> = new Map();
    private cacheMaxAge = 3600000; // 1 hour
    private cacheMaxSize = 50;
    private isInitialized = false;

    private constructor() { }

    static getInstance(): OCRService {
        if (!OCRService.instance) {
            OCRService.instance = new OCRService();
        }
        return OCRService.instance;
    }

    /**
     * Initialize Tesseract worker
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // TODO: Initialize Tesseract worker when library is installed
            // this.worker = await Tesseract.createWorker();
            // await this.worker.loadLanguage('eng');
            // await this.worker.initialize('eng');
            this.isInitialized = true;
            console.log('[OCRService] Initialized');
        } catch (error) {
            console.error('[OCRService] Initialization failed:', error);
            throw new Error('OCR initialization failed. Is tesseract.js installed?');
        }
    }

    /**
     * Extract text from an image
     */
    async extractText(
        imageSource: string | Blob | ImageData,
        _options: OCROptions = {}
    ): Promise<OCRResult> {
        await this.initialize();

        // Check cache
        const imageHash = await this.hashImage(imageSource);
        const cached = this.getFromCache(imageHash);
        if (cached) {
            console.log('[OCRService] Cache hit');
            return cached;
        }

        try {
            // TODO: Perform OCR when tesseract.js is installed
            // const result = await this.worker.recognize(imageSource, {
            //     lang: options.lang || 'eng',
            //     ...options
            // });

            // Placeholder result until tesseract.js is installed
            const result: OCRResult = {
                text: '[OCR not available - tesseract.js not installed]',
                confidence: 0,
                words: [],
                lines: []
            };

            // Cache result
            this.addToCache(imageHash, result);

            console.log(`[OCRService] Extracted text (confidence: ${result.confidence}%)`);
            return result;
        } catch (error) {
            console.error('[OCRService] Text extraction failed:', error);
            throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract text from a screenshot
     */
    async extractTextFromScreenshot(
        dataUrl: string,
        options: OCROptions = {}
    ): Promise<OCRResult> {
        return this.extractText(dataUrl, options);
    }

    /**
     * Extract text from current tab
     */
    async extractTextFromCurrentTab(options: OCROptions = {}): Promise<OCRResult> {
        try {
            // Capture screenshot of current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
                throw new Error('No active tab found');
            }

            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png'
            });

            return this.extractTextFromScreenshot(dataUrl, options);
        } catch (error) {
            console.error('[OCRService] Screenshot capture failed:', error);
            throw error;
        }
    }

    /**
     * Extract text from a specific region
     */
    async extractTextFromRegion(
        imageSource: string | Blob,
        region: { x: number; y: number; width: number; height: number },
        options: OCROptions = {}
    ): Promise<OCRResult> {
        // Create canvas to crop image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // Load image
        const img = await this.loadImage(imageSource);

        // Set canvas size to region
        canvas.width = region.width;
        canvas.height = region.height;

        // Draw cropped region
        ctx.drawImage(
            img,
            region.x, region.y, region.width, region.height,
            0, 0, region.width, region.height
        );

        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/png');

        return this.extractText(croppedDataUrl, options);
    }

    /**
     * Find text on screen
     */
    async findTextOnScreen(
        searchText: string,
        imageSource: string | Blob,
        options: OCROptions = {}
    ): Promise<Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>> {
        const result = await this.extractText(imageSource, options);

        const matches = result.words.filter(word =>
            word.text.toLowerCase().includes(searchText.toLowerCase())
        );

        return matches;
    }

    /**
     * Load image from various sources
     */
    private loadImage(source: string | Blob): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));

            if (typeof source === 'string') {
                img.src = source;
            } else {
                const url = URL.createObjectURL(source);
                img.src = url;
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve(img);
                };
            }
        });
    }

    /**
     * Hash image for caching
     */
    private async hashImage(imageSource: string | Blob | ImageData): Promise<string> {
        let data: string;

        if (typeof imageSource === 'string') {
            data = imageSource;
        } else if (imageSource instanceof Blob) {
            data = await this.blobToDataUrl(imageSource);
        } else {
            // ImageData
            data = JSON.stringify(imageSource.data.slice(0, 1000)); // Sample first 1000 pixels
        }

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < Math.min(data.length, 10000); i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Convert Blob to Data URL
     */
    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Get result from cache
     */
    private getFromCache(imageHash: string): OCRResult | null {
        const cached = this.cache.get(imageHash);
        if (!cached) return null;

        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheMaxAge) {
            this.cache.delete(imageHash);
            return null;
        }

        return cached.result;
    }

    /**
     * Add result to cache
     */
    private addToCache(imageHash: string, result: OCRResult): void {
        // Enforce cache size limit
        if (this.cache.size >= this.cacheMaxSize) {
            // Remove oldest entry
            const oldestKey = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.cache.delete(oldestKey);
        }

        this.cache.set(imageHash, {
            imageHash,
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('[OCRService] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        maxAge: number;
        hitRate: number;
    } {
        return {
            size: this.cache.size,
            maxSize: this.cacheMaxSize,
            maxAge: this.cacheMaxAge,
            hitRate: 0 // TODO: Track hit rate
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        try {
            // TODO: Terminate worker when tesseract.js is installed
            // await this.worker?.terminate();
            this.isInitialized = false;
            this.clearCache();
            console.log('[OCRService] Cleaned up');
        } catch (error) {
            console.error('[OCRService] Cleanup failed:', error);
        }
    }
}

// Singleton instance
export const ocrService = OCRService.getInstance();
