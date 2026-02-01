// Multi-Agent Orchestration Service

export interface Agent {
    id: string;
    name: string;
    role: string;
    systemPrompt: string;
}

export const AGENTS: Agent[] = [
    {
        id: 'researcher',
        name: 'Researcher',
        role: 'Research and gather information',
        systemPrompt: 'You are a research specialist. Gather comprehensive information, cite sources, and provide detailed analysis.'
    },
    {
        id: 'coder',
        name: 'Coder',
        role: 'Write and review code',
        systemPrompt: 'You are a senior software engineer. Write clean, efficient code with best practices. Provide explanations and handle edge cases.'
    },
    {
        id: 'writer',
        name: 'Writer',
        role: 'Create content',
        systemPrompt: 'You are a professional writer. Create engaging, well-structured content with proper grammar and style.'
    },
    {
        id: 'analyst',
        name: 'Analyst',
        role: 'Analyze data and trends',
        systemPrompt: 'You are a data analyst. Analyze information, identify patterns, and provide insights with data-driven recommendations.'
    }
];

export class MultiAgentService {
    // Orchestrate multiple agents for a task
    async orchestrate(task: string, agentIds: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        // Run each agent
        for (const agentId of agentIds) {
            const agent = AGENTS.find(a => a.id === agentId);
            if (!agent) continue;

            // In real implementation, would call LLM with agent's system prompt
            const response = `[${agent.name}]: Response to "${task}"`;
            results.set(agentId, response);
        }

        return results;
    }

    // Coordinate agents in sequence
    async coordinateSequence(task: string, agentIds: string[]): Promise<string> {
        let context = task;

        for (const agentId of agentIds) {
            const agent = AGENTS.find(a => a.id === agentId);
            if (!agent) continue;

            // Each agent builds on previous agent's work
            context = `${agent.name} building on: ${context}`;
        }

        return context;
    }

    // Get all available agents
    getAgents(): Agent[] {
        return AGENTS;
    }
}

export const multiAgentService = new MultiAgentService();
