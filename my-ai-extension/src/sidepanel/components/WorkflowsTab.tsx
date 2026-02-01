import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Bot, BookOpen, Zap } from 'lucide-react';
import { ResearchPanel } from './ResearchPanel';

export const WorkflowsTab: React.FC = () => {
    const [activeWorkflow, setActiveWorkflow] = useState<'research' | 'automation' | null>(null);

    if (activeWorkflow === 'research') {
        return (
            <div className="p-4 space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveWorkflow(null)}
                    className="mb-2"
                >
                    ← Back to Workflows
                </Button>
                <ResearchPanel />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 space-y-4 bg-graphite-950 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Automation & Research
                </h2>
                <p className="text-xs text-gray-400">
                    Powerful AI workflows for research and automation
                </p>
            </div>

            {/* Workflow Cards */}
            <div className="grid gap-3">
                {/* Deep Research */}
                <Card
                    className="overflow-hidden cursor-pointer bg-graphite-900 border-white/5 hover:bg-graphite-800 transition-all duration-200 group"
                    onClick={() => setActiveWorkflow('research')}
                >
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                                    Deep Research
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-green-500/20 text-green-400 font-bold">NEW</span>
                                </h3>
                                <p className="text-xs text-gray-400 mb-2">
                                    Multi-step AI research: search, analyze, and synthesize information on any topic
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300">Web Search</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300">Analysis</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300">Synthesis</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Browser Automation - Coming Soon */}
                <Card className="overflow-hidden opacity-50 bg-graphite-900 border-white/5">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-graphite-800 flex items-center justify-center shrink-0">
                                <Bot className="h-6 w-6 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-400 mb-1 flex items-center gap-2">
                                    Browser Automation
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">Coming Soon</span>
                                </h3>
                                <p className="text-xs text-gray-500">
                                    AI-powered browser automation for repetitive tasks
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-white">About Workflows</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Workflows combine multiple AI capabilities to accomplish complex tasks.
                                Deep Research uses web search, LLM analysis, and synthesis to create comprehensive reports.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
