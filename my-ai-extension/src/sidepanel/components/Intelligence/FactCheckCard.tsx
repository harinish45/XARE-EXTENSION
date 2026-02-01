import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { FactCheckResult } from '../../../lib/verification/FactCheckingService';

interface Props {
    result: FactCheckResult;
    className?: string;
}

export function FactCheckCard({ result, className }: Props) {
    const getVerdictColor = () => {
        switch (result.verdict) {
            case 'verified':
                return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'disputed':
                return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'unverified':
                return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getConfidenceColor = () => {
        if (result.confidence > 0.7) return 'bg-green-500';
        if (result.confidence > 0.3) return 'bg-yellow-500';
        return 'bg-gray-500';
    };

    const VerdictIcon = {
        verified: CheckCircle2,
        disputed: AlertCircle,
        unverified: HelpCircle
    }[result.verdict];

    return (
        <div className={cn("glass-subtle p-4 rounded-lg space-y-3", className)}>
            {/* Claim */}
            <div className="text-sm leading-relaxed">{result.claim}</div>

            {/* Verdict & Confidence */}
            <div className="flex items-center gap-3">
                {/* Verdict Badge */}
                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                    getVerdictColor()
                )}>
                    <VerdictIcon className="w-3.5 h-3.5" />
                    <span className="capitalize">{result.verdict}</span>
                </div>

                {/* Confidence Meter */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-500",
                                getConfidenceColor()
                            )}
                            style={{ width: `${result.confidence * 100}%` }}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                        {Math.round(result.confidence * 100)}%
                    </span>
                </div>
            </div>

            {/* Explanation */}
            <div className="text-xs text-muted-foreground">
                {result.explanation}
            </div>

            {/* Sources */}
            {result.sources.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                    <div className="text-xs font-medium text-muted-foreground">Sources:</div>
                    {result.sources.map((source, i) => (
                        <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors group"
                        >
                            <span className="font-mono">[{i + 1}]</span>
                            <span className="flex-1 truncate">{source}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
