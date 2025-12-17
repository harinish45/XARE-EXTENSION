import OpenAI from 'openai';
import type { LLMMessage, LLMProvider, LLMResponse } from '../types';

export class AzureProvider implements LLMProvider {
    id = 'azure';
    name = 'Azure OpenAI';

    async getAzureConfig(): Promise<{ endpoint: string; deployment: string }> {
        const result = await chrome.storage.local.get(['azure_endpoint', 'azure_deployment']) as { azure_endpoint?: string, azure_deployment?: string };
        return {
            endpoint: result.azure_endpoint || '',
            deployment: result.azure_deployment || ''
        };
    }

    async generate(messages: LLMMessage[], apiKey: string): Promise<LLMResponse> {
        const { endpoint, deployment } = await this.getAzureConfig();
        if (!endpoint || !deployment) throw new Error("Azure Endpoint or Deployment ID not configured.");

        const openai = new OpenAI({
            apiKey,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            dangerouslyAllowBrowser: true,
        });

        const completion = await openai.chat.completions.create({
            messages: messages as any,
            model: '',
        });
        return {
            content: completion.choices[0]?.message?.content || '',
        };
    }

    async stream(messages: LLMMessage[], apiKey: string, onChunk: (chunk: string) => void): Promise<void> {
        const { endpoint, deployment } = await this.getAzureConfig();
        if (!endpoint || !deployment) throw new Error("Azure Endpoint or Deployment ID not configured.");

        const openai = new OpenAI({
            apiKey,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            dangerouslyAllowBrowser: true,
        });

        const stream = await openai.chat.completions.create({
            messages: messages as any,
            model: '',
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) onChunk(content);
        }
    }
}
