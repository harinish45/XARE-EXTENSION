import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import {
    Search, Loader2, CheckCircle2, Circle, AlertCircle,
    ExternalLink, BookOpen, Sparkles, XCircle, Copy, Download
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { researchAgent, type ResearchStep, type ResearchResult } from '../../lib/agents/ResearchAgent';
import { useStore } from '../../lib/store';
import ReactMarkdown from 'react-markdown';
import { exportService } from '../../lib/utils/ExportService';
import { useToast } from './ui/toast';

const STEP_ICONS: Record<ResearchStep['type'], React.ReactNode> = {
    planning: <Sparkles className="h-4 w-4" />,
    searching: <Search className="h-4 w-4" />,
    analyzing: <BookOpen className="h-4 w-4" />,
    synthesizing: <Sparkles className="h-4 w-4" />,
};

export const ResearchPanel: React.FC = () => {
    const { activeModel } = useStore();
    const [topic, setTopic] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    const [steps, setSteps] = useState<ResearchStep[]>([]);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const handleResearch = async () => {
        if (!topic.trim() || isResearching) return;

        setIsResearching(true);
        setSteps([]);
        setProgress('');
        setResult(null);
        setError(null);

        try {
            // Get API key
            const keyName = `api_key_${activeModel}`;
            const stored = await chrome.storage.local.get(keyName) as Record<string, string>;
            const apiKey = stored[keyName];

            if (!apiKey) {
                setError('Please set your API key in Settings first.');
                setIsResearching(false);
                return;
            }

            const researchResult = await researchAgent.execute(
                topic,
                apiKey,
                activeModel,
                (newSteps) => setSteps([...newSteps]),
                (msg) => setProgress(msg)
            );

            setResult(researchResult);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Research failed');
        } finally {
            setIsResearching(false);
        }
    };

    const handleStop = () => {
        researchAgent.stop();
        setIsResearching(false);
        setProgress('Research stopped');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copied to clipboard', 'success');
    };

    const handleExportResearch = () => {
        if (!result) return;
        try {
            exportService.exportResearch(result);
            addToast('Research exported successfully', 'success');
        } catch (error) {
            addToast('Failed to export research', 'error');
        }
    };

    return (
        <div className="space-y-4">
            {/* Input Section */}
            <Card className="bg-graphite-850 border-white/5">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold text-white">Deep Research</h3>
                    </div>
                    <p className="text-xs text-gray-400">
                        Enter a topic to research. The AI will search, analyze, and synthesize information.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter research topic..."
                            disabled={isResearching}
                            onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                            className="flex-1 bg-graphite-900 border-white/5 text-white placeholder:text-gray-500"
                        />
                        {isResearching ? (
                            <Button variant="destructive" onClick={handleStop} className="shrink-0">
                                <XCircle className="h-4 w-4 mr-1" />
                                Stop
                            </Button>
                        ) : (
                            <Button onClick={handleResearch} disabled={!topic.trim()} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                                <Search className="h-4 w-4 mr-1" />
                                Research
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Progress Steps */}
            {steps.length > 0 && (
                <Card className="bg-graphite-900 border-white/5">
                    <CardContent className="p-4 space-y-3">
                        <h4 className="text-sm font-medium text-white">Research Progress</h4>
                        <div className="space-y-2">
                            {steps.map((step) => (
                                <div
                                    key={step.id}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent",
                                        step.status === 'running' && "bg-blue-500/5 border-blue-500/20",
                                        step.status === 'completed' && "bg-green-500/5 border-green-500/20",
                                        step.status === 'failed' && "bg-red-500/5 border-red-500/20"
                                    )}
                                >
                                    <div className={cn(
                                        "shrink-0",
                                        step.status === 'running' && "text-blue-400 animate-pulse",
                                        step.status === 'completed' && "text-green-400",
                                        step.status === 'failed' && "text-red-400",
                                        step.status === 'pending' && "text-gray-600"
                                    )}>
                                        {step.status === 'running' ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : step.status === 'completed' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : step.status === 'failed' ? (
                                            <AlertCircle className="h-4 w-4" />
                                        ) : (
                                            <Circle className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={cn(
                                            "text-sm font-medium",
                                            step.status === 'pending' ? "text-gray-500" : "text-white"
                                        )}>{step.title}</span>
                                        {step.error && (
                                            <p className="text-xs text-red-400 truncate">{step.error}</p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-gray-500">
                                        {STEP_ICONS[step.type]}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {progress && (
                            <p className="text-xs text-blue-400 animate-pulse">{progress}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Error */}
            {error && (
                <Card className="border-red-500/30 bg-red-500/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                        <p className="text-sm text-red-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {result && (
                <Card className="bg-graphite-900 border-white/5">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h4 className="text-sm font-medium flex items-center gap-2 text-white">
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                Research Complete
                            </h4>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 hover:bg-white/5 text-gray-400 hover:text-white"
                                    onClick={() => copyToClipboard(result.summary)}
                                >
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    Copy
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 hover:bg-white/5 text-gray-400 hover:text-white"
                                    onClick={handleExportResearch}
                                >
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-blue-400">
                            <ReactMarkdown>{result.summary}</ReactMarkdown>
                        </div>

                        {/* Sources */}
                        {result.sources.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-white/5">
                                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sources ({result.sources.length})</h5>
                                <div className="grid gap-2">
                                    {result.sources.slice(0, 5).map((source, i) => (
                                        <a
                                            key={i}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg bg-graphite-850 hover:bg-graphite-800 border border-transparent hover:border-white/5 transition-all group"
                                        >
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`}
                                                alt=""
                                                className="h-4 w-4 rounded opacity-80 group-hover:opacity-100"
                                            />
                                            <span className="text-xs text-gray-400 group-hover:text-blue-400 truncate flex-1 transition-colors">{source.title}</span>
                                            <ExternalLink className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
