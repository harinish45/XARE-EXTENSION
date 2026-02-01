import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Source {
    id: string;
    title: string;
    url: string;
    snippet: string;
    favicon?: string;
    publishedDate?: string;
    credibilityScore?: number;
    type: 'web' | 'wikipedia' | 'news' | 'academic' | 'data' | 'page' | 'notes' | 'service';
}

interface MultiSourceDisplayProps {
    sources: Source[];
    answer: string;
    className?: string;
}

const sourceColors = {
    web: '🔴',
    wikipedia: '🟢',
    news: '🔵',
    academic: '🟡',
    data: '🟣',
    page: '🟠',
    notes: '🟤',
    service: '⚪',
};

export const MultiSourceDisplay: React.FC<MultiSourceDisplayProps> = ({
    sources,
    answer,
    className,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Answer with inline citations */}
            <div className="prose prose-invert max-w-none">
                <div className="text-gray-200 leading-relaxed">
                    {answer}
                </div>
            </div>

            {/* Sources Summary */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                        "bg-white/5 border border-white/10",
                        "hover:bg-white/10 transition-colors text-sm"
                    )}
                >
                    <span className="flex items-center gap-1">
                        {Object.entries(
                            sources.reduce((acc, s) => {
                                acc[s.type] = (acc[s.type] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                            <span key={type} title={`${count} ${type} source(s)`}>
                                {sourceColors[type as keyof typeof sourceColors]}
                            </span>
                        ))}
                    </span>
                    <span className="text-gray-300">
                        {sources.length} source{sources.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Source type legend */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🔴 Web</span>
                    <span>🟢 Wiki</span>
                    <span>🔵 News</span>
                    <span>🟡 Academic</span>
                    <span>🟣 Data</span>
                </div>
            </div>

            {/* Expanded Sources List */}
            {isExpanded && (
                <div className="space-y-2 animate-fade-in">
                    {sources.map((source, index) => (
                        <div
                            key={source.id}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg",
                                "bg-white/5 border border-white/10",
                                "hover:bg-white/10 transition-colors group cursor-pointer"
                            )}
                            onClick={() => setSelectedSource(source)}
                        >
                            {/* Source indicator */}
                            <span className="text-lg flex-shrink-0 mt-0.5">
                                {sourceColors[source.type]}
                            </span>

                            {/* Source info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                        [{index + 1}] {source.title}
                                    </h4>
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                    {source.snippet}
                                </p>

                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    {source.publishedDate && <span>{source.publishedDate}</span>}
                                    {source.credibilityScore && (
                                        <span className="flex items-center gap-1">
                                            <span className={cn(
                                                "w-2 h-2 rounded-full",
                                                source.credibilityScore >= 0.8 ? "bg-green-500" :
                                                    source.credibilityScore >= 0.6 ? "bg-yellow-500" :
                                                        "bg-red-500"
                                            )} />
                                            {Math.round(source.credibilityScore * 100)}% credible
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Source Preview Modal */}
            {selectedSource && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={() => setSelectedSource(null)}
                    />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-xl p-6 shadow-2xl">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">
                                        {sourceColors[selectedSource.type]}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {selectedSource.title}
                                        </h3>
                                        <a
                                            href={selectedSource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-400 hover:underline"
                                        >
                                            {selectedSource.url}
                                        </a>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSource(null)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-gray-300 leading-relaxed">
                                {selectedSource.snippet}
                            </p>

                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                                <a
                                    href={selectedSource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                                >
                                    Visit Source
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`[${selectedSource.title}](${selectedSource.url})`)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                                >
                                    Copy Citation
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
