// Model Comparison Component

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PROVIDERS } from './ModelSelector';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ComparisonResult {
    providerId: string;
    response: string;
    responseTime: number;
    tokenCount: number;
}

interface ModelComparisonProps {
    prompt: string;
    onComplete?: (results: ComparisonResult[]) => void;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ prompt, onComplete }) => {
    const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
    const [isComparing, setIsComparing] = useState(false);
    const [results, setResults] = useState<ComparisonResult[]>([]);

    const toggleModel = (modelId: string) => {
        setSelectedModels(prev => {
            const next = new Set(prev);
            if (next.has(modelId)) {
                next.delete(modelId);
            } else {
                next.add(modelId);
            }
            return next;
        });
    };

    const handleCompare = async () => {
        if (selectedModels.size === 0 || !prompt) return;

        setIsComparing(true);
        const comparisonResults: ComparisonResult[] = [];

        // Simulate comparison (in real implementation, would call each model)
        for (const modelId of selectedModels) {
            const startTime = Date.now();

            // Placeholder response
            const response = `Response from ${modelId} for: ${prompt}`;
            const responseTime = Date.now() - startTime;
            const tokenCount = Math.floor(Math.random() * 500) + 100;

            comparisonResults.push({
                providerId: modelId,
                response,
                responseTime,
                tokenCount
            });
        }

        setResults(comparisonResults);
        setIsComparing(false);
        onComplete?.(comparisonResults);
    };

    return (
        <div className="space-y-4">
            {/* Model Selection */}
            <Card variant="glass">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">Select Models to Compare</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                        {PROVIDERS.slice(0, 4).map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => toggleModel(provider.id)}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                                    selectedModels.has(provider.id)
                                        ? "border-primary bg-primary/10"
                                        : "border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className={cn(
                                    "h-4 w-4 rounded border flex items-center justify-center",
                                    selectedModels.has(provider.id) ? "bg-primary border-primary" : "border-white/20"
                                )}>
                                    {selectedModels.has(provider.id) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm">{provider.name}</span>
                            </button>
                        ))}
                    </div>
                    <Button
                        onClick={handleCompare}
                        disabled={selectedModels.size === 0 || isComparing}
                        className="w-full mt-3"
                    >
                        {isComparing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Comparing...
                            </>
                        ) : (
                            `Compare ${selectedModels.size} Model${selectedModels.size !== 1 ? 's' : ''}`
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
                <div className="grid gap-3">
                    {results.map((result) => {
                        const provider = PROVIDERS.find(p => p.id === result.providerId);
                        return (
                            <Card key={result.providerId} variant="glass">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">{provider?.name}</CardTitle>
                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                            <span>{result.responseTime}ms</span>
                                            <span>•</span>
                                            <span>{result.tokenCount} tokens</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <p className="text-sm">{result.response}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
