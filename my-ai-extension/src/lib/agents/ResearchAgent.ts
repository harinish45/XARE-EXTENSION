import { llmService } from '../llm/LLMService';
import type { LLMMessage } from '../llm/types';

export interface ResearchStep {
    id: string;
    type: 'query' | 'search' | 'synthesize';
    status: 'pending' | 'running' | 'completed' | 'failed';
    data?: any;
}

export class ResearchAgent {
    private steps: ResearchStep[] = [];

    constructor() { }

    async execute(topic: string, onUpdate: (steps: ResearchStep[]) => void): Promise<string> {
        // Step 1: Generate Queries
        this.addStep('gen_queries', 'query', 'running');
        onUpdate([...this.steps]);

        const queryPrompt: LLMMessage[] = [{
            role: 'user',
            content: `Generate 3 distinct search queries to research the following topic: "${topic}". Return them as a JSON array of strings.`
        }];

        // Use a fast model for query gen (e.g. OpenAI or Gemini)
        // Ideally we pick from store, but here we enforce one or use active.
        // We'll assume LLMService can pick or we pass a preferred ID.
        // For now, let's use 'openai' or 'gemini' if configured, else whatever.
        const queriesResponse = await llmService.getProvider('openai')?.generate(queryPrompt, 'TODO_API_KEY');
        console.log("Queries generated:", queriesResponse);
        // Realistically we need the API key passed in. 
        // So execute() should take apiKey or context.

        this.updateStep('gen_queries', 'completed', { result: ['mock query 1', 'mock query 2'] });
        onUpdate([...this.steps]);

        return "Research complete (Mock)";
    }

    private addStep(id: string, type: any, status: any) {
        this.steps.push({ id, type, status });
    }

    private updateStep(id: string, status: any, data?: any) {
        const step = this.steps.find(s => s.id === id);
        if (step) {
            step.status = status;
            if (data) step.data = data;
        }
    }
}
