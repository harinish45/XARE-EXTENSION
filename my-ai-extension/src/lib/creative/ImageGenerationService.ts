/**
 * Image Generation Service
 * Generates images using AI models (DALL-E, Stable Diffusion, etc.)
 */

export interface ImageGenerationOptions {
    prompt: string;
    model?: 'dall-e-3' | 'dall-e-2' | 'stable-diffusion';
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number;
}

export interface GeneratedImage {
    url: string;
    revised_prompt?: string;
    b64_json?: string;
}

export class ImageGenerationService {
    private static instance: ImageGenerationService;
    private apiKey: string | null = null;

    private constructor() { }

    static getInstance(): ImageGenerationService {
        if (!ImageGenerationService.instance) {
            ImageGenerationService.instance = new ImageGenerationService();
        }
        return ImageGenerationService.instance;
    }

    /**
     * Set API key for image generation
     * @param apiKey - OpenAI API key
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /**
     * Generate image using DALL-E
     * @param options - Generation options
     * @returns Generated images
     */
    async generateWithDALLE(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const model = options.model || 'dall-e-3';
        const size = options.size || '1024x1024';
        const quality = options.quality || 'standard';
        const n = options.n || 1;

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                prompt: options.prompt,
                size,
                quality,
                n,
                ...(options.style && { style: options.style })
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Image generation failed: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Generate image using Stable Diffusion (via Replicate or similar)
     * @param prompt - Image prompt
     * @returns Generated image URL
     */
    async generateWithStableDiffusion(prompt: string): Promise<string> {
        // Placeholder for Stable Diffusion integration
        // Would require Replicate API or similar service
        throw new Error('Stable Diffusion integration not yet implemented');
    }

    /**
     * Edit image using DALL-E
     * @param image - Original image file
     * @param mask - Mask image file (transparent areas will be edited)
     * @param prompt - Edit prompt
     * @param size - Output size
     * @returns Edited images
     */
    async editImage(
        image: File,
        mask: File | null,
        prompt: string,
        size: '256x256' | '512x512' | '1024x1024' = '1024x1024'
    ): Promise<GeneratedImage[]> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const formData = new FormData();
        formData.append('image', image);
        if (mask) formData.append('mask', mask);
        formData.append('prompt', prompt);
        formData.append('size', size);
        formData.append('n', '1');

        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Image edit failed: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Create variation of image using DALL-E
     * @param image - Original image file
     * @param n - Number of variations
     * @param size - Output size
     * @returns Image variations
     */
    async createVariation(
        image: File,
        n: number = 1,
        size: '256x256' | '512x512' | '1024x1024' = '1024x1024'
    ): Promise<GeneratedImage[]> {
        if (!this.apiKey) {
            throw new Error('API key not set');
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('n', n.toString());
        formData.append('size', size);

        const response = await fetch('https://api.openai.com/v1/images/variations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Image variation failed: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Download image from URL to blob
     * @param url - Image URL
     * @returns Image blob
     */
    async downloadImage(url: string): Promise<Blob> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }
        return response.blob();
    }

    /**
     * Convert blob to base64
     * @param blob - Image blob
     * @returns Base64 string
     */
    async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
