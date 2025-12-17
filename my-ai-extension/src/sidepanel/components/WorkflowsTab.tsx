import React from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Play } from 'lucide-react';
import { ResearchAgent } from '../../lib/agents/ResearchAgent';
import { useStore } from '../../lib/store';

interface Workflow {
    id: string;
    name: string;
    description: string;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
    { id: 'summarize', name: 'Summarize Page', description: 'Extracts text and generates a summary.' },
    { id: 'smart_reply', name: 'Smart Reply', description: 'Generates a reply for the selected input field.' },
    { id: 'data_extract', name: 'Data Extractor', description: 'Scrapes structured data from the page.' },
    { id: 'deep_research', name: 'Deep Research Agent', description: 'Researches a topic using multiple sources.' },
];

export const WorkflowsTab: React.FC = () => {
    const { addMessage } = useStore();

    const handleRun = async (id: string) => {
        console.log('Running workflow:', id);
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTabId = tabs[0]?.id;

        if (id === 'deep_research') {
            const topic = prompt("Enter research topic:");
            if (!topic) return;

            addMessage({ role: 'assistant', content: `Starting Deep Research on: "${topic}"...`, timestamp: Date.now() });

            const agent = new ResearchAgent();
            const result = await agent.execute(topic, (steps) => {
                // We could emit status updates to chat
                const lastStep = steps[steps.length - 1];
                console.log("Research Step:", lastStep);
            });

            addMessage({ role: 'assistant', content: `Research Result:\n${result}`, timestamp: Date.now() });
            return;
        }

        if (activeTabId) {
            if (id === 'summarize') {
                chrome.tabs.sendMessage(activeTabId, { action: 'EXECUTE_AUTOMATION', data: { type: 'SCRAPE' } }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        alert("Error: Content script not ready. Reload page?");
                        return;
                    }
                    if (response && response.result) {
                        // Send to chat
                        addMessage({ role: 'user', content: `Summarize this page content:\n${response.result.substring(0, 5000)}...`, timestamp: Date.now() });
                        // Trigger generation? Chat logic handles manual send usually. 
                        // Here we injected a message. The user might need to hit send or we simulate it.
                        // Ideally we invoke the LLM stream directly.
                        alert("Content extracted. Check Chat tab.");
                    }
                });
            } else if (id === 'smart_reply') {
                chrome.tabs.sendMessage(activeTabId, { action: 'EXECUTE_AUTOMATION', data: { type: 'TYPE', text: 'Hello! This is an AI reply.', selector: 'input:focus, textarea:focus' } });
            } else {
                alert(`Workflow ${id} not implemented in demo.`);
            }
        } else {
            alert("No active tab found.");
        }
    };

    return (
        <div className="grid gap-4 p-4">
            {SAMPLE_WORKFLOWS.map((wf) => (
                <Card key={wf.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{wf.name}</CardTitle>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleRun(wf.id); }}>
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
};
