// Deep Research Agent - Multi-step research workflow
import { webSearchService, type SearchResult } from '../search/WebSearchService';

export interface ResearchStep {
    id: string;
    type: 'planning' | 'searching' | 'analyzing' | 'synthesizing';
    status: 'pending' | 'running' | 'completed' | 'failed';
    title: string;
    data?: any;
    error?: string;
}

export interface ResearchResult {
    topic: string;
    summary: string;
    keyFindings: string[];
    sources: SearchResult[];
    timestamp: number;
}

export class ResearchAgent {
    private steps: ResearchStep[] = [];
    private abortController: AbortController | null = null;

    constructor() { }

    async execute(
        topic: string,
        apiKey: string,
        providerId: string,
        onStepUpdate: (steps: ResearchStep[]) => void,
        onProgress: (message: string) => void
    ): Promise<ResearchResult> {
        this.steps = [];
        this.abortController = new AbortController();

        try {
            // Step 1: Planning - Generate search queries
            this.addStep('planning', 'planning', 'running', 'Planning research strategy');
            onStepUpdate([...this.steps]);
            onProgress('Analyzing topic and planning research approach...');

            const queries = await this.generateSearchQueries(topic, apiKey, providerId);
            this.updateStep('planning', 'completed', { queries });
            onStepUpdate([...this.steps]);

            // Step 2: Searching - Execute searches
            this.addStep('searching', 'searching', 'running', 'Gathering information');
            onStepUpdate([...this.steps]);
            onProgress(`Searching for information using ${queries.length} queries...`);

            const allResults: SearchResult[] = [];
            for (const query of queries) {
                if (this.abortController.signal.aborted) break;

                onProgress(`Searching: "${query}"`);
                const results = await webSearchService.search(query);
                allResults.push(...results);

                // Small delay between searches
                await this.sleep(500);
            }

            // Deduplicate by URL
            const uniqueResults = this.deduplicateResults(allResults);
            this.updateStep('searching', 'completed', { resultsCount: uniqueResults.length });
            onStepUpdate([...this.steps]);

            // Step 3: Analyzing - Extract key information
            this.addStep('analyzing', 'analyzing', 'running', 'Analyzing sources');
            onStepUpdate([...this.steps]);
            onProgress('Analyzing and extracting key information...');

            const analysis = await this.analyzeResults(topic, uniqueResults, apiKey, providerId);
            this.updateStep('analyzing', 'completed', { analyzed: true });
            onStepUpdate([...this.steps]);

            // Step 4: Synthesizing - Create final report
            this.addStep('synthesizing', 'synthesizing', 'running', 'Creating research report');
            onStepUpdate([...this.steps]);
            onProgress('Synthesizing findings into a comprehensive report...');

            const result = await this.synthesizeReport(topic, analysis, uniqueResults, apiKey, providerId);
            this.updateStep('synthesizing', 'completed', { complete: true });
            onStepUpdate([...this.steps]);

            return result;

        } catch (error: any) {
            const failedStep = this.steps.find(s => s.status === 'running');
            if (failedStep) {
                this.updateStep(failedStep.id, 'failed', null, error.message);
                onStepUpdate([...this.steps]);
            }
            throw error;
        }
    }

    stop(): void {
        this.abortController?.abort();
    }

    private async generateSearchQueries(topic: string, apiKey: string, providerId: string): Promise<string[]> {
        // Use LLM to generate diverse search queries
        const prompt = `Generate 3-5 specific search queries to thoroughly research the following topic. Return ONLY a JSON array of strings, no other text.

Topic: "${topic}"

Example output format:
["query 1", "query 2", "query 3"]`;

        const response = await this.callLLM(prompt, apiKey, providerId);

        try {
            // Extract JSON array from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const queries = JSON.parse(jsonMatch[0]);
                return queries.slice(0, 5);
            }
        } catch (e) {
            console.error('Failed to parse queries:', e);
        }

        // Fallback: generate basic queries
        return [
            topic,
            `${topic} overview`,
            `${topic} explained`,
        ];
    }

    private deduplicateResults(results: SearchResult[]): SearchResult[] {
        const seen = new Set<string>();
        return results.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        }).slice(0, 10); // Keep top 10
    }

    private async analyzeResults(
        topic: string,
        results: SearchResult[],
        apiKey: string,
        providerId: string
    ): Promise<string> {
        const sourceSummary = results
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
            .join('\n\n');

        const prompt = `Analyze these search results about "${topic}" and extract the key facts and insights:

${sourceSummary}

Provide a structured analysis with:
1. Main points discovered
2. Important facts and figures
3. Different perspectives or viewpoints
4. Areas that need more research`;

        return await this.callLLM(prompt, apiKey, providerId);
    }

    private async synthesizeReport(
        topic: string,
        analysis: string,
        sources: SearchResult[],
        apiKey: string,
        providerId: string
    ): Promise<ResearchResult> {
        const prompt = `Based on this analysis, create a comprehensive yet concise research summary about "${topic}":

${analysis}

Format your response as:
## Summary
[2-3 paragraph executive summary]

## Key Findings
- [bullet point 1]
- [bullet point 2]
- [bullet point 3]
(add more as needed)

## Conclusion
[Brief conclusion and recommendations]`;

        const report = await this.callLLM(prompt, apiKey, providerId);

        // Extract key findings from the report
        const findingsMatch = report.match(/## Key Findings\n([\s\S]*?)(?=##|$)/);
        const keyFindings = findingsMatch
            ? findingsMatch[1]
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.replace(/^-\s*/, '').trim())
                .filter(Boolean)
            : [];

        return {
            topic,
            summary: report,
            keyFindings,
            sources,
            timestamp: Date.now()
        };
    }

    private async callLLM(prompt: string, apiKey: string, providerId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const port = chrome.runtime.connect({ name: 'llm-stream' });
            let response = '';

            const timeout = setTimeout(() => {
                port.disconnect();
                reject(new Error('LLM request timed out'));
            }, 60000);

            port.onMessage.addListener((msg) => {
                if (msg.type === 'CHUNK') {
                    response += msg.content;
                } else if (msg.type === 'DONE') {
                    clearTimeout(timeout);
                    port.disconnect();
                    resolve(response);
                } else if (msg.type === 'ERROR') {
                    clearTimeout(timeout);
                    port.disconnect();
                    reject(new Error(msg.error));
                }
            });

            port.postMessage({
                action: 'GENERATE_STREAM',
                data: {
                    providerId,
                    messages: [{ role: 'user', content: prompt }],
                    apiKey
                }
            });
        });
    }

    private addStep(id: string, type: ResearchStep['type'], status: ResearchStep['status'], title: string) {
        this.steps.push({ id, type, status, title });
    }

    private updateStep(id: string, status: ResearchStep['status'], data?: any, error?: string) {
        const step = this.steps.find(s => s.id === id);
        if (step) {
            step.status = status;
            if (data) step.data = data;
            if (error) step.error = error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSteps(): ResearchStep[] {
        return [...this.steps];
    }
}

export const researchAgent = new ResearchAgent();
