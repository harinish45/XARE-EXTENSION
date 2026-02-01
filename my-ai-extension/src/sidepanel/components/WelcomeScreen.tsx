import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TrendingTopicsService, type TrendingTopic } from '../../lib/trends/TrendingTopicsService';

interface WelcomeScreenProps {
    onPromptClick: (prompt: string) => void;
    onMoreIdeas?: () => void;
    className?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    onPromptClick,
    onMoreIdeas,
    className,
}) => {
    const [topics, setTopics] = useState<TrendingTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load topics on mount
    useEffect(() => {
        loadTopics();

        // Auto-refresh every 2 hours
        const interval = setInterval(() => {
            console.log('Auto-refreshing trending topics...');
            loadTopics(false);
        }, 2 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const loadTopics = async (showLoading = true) => {
        if (showLoading) setLoading(true);

        try {
            const freshTopics = await TrendingTopicsService.getTrendingTopics();
            setTopics(freshTopics);
        } catch (error) {
            console.error('Failed to load trending topics:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const freshTopics = await TrendingTopicsService.forceRefresh();
            setTopics(freshTopics);
        } catch (error) {
            console.error('Failed to refresh topics:', error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className={cn("flex-1 flex flex-col items-center justify-center px-6 py-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", className)}>
            {/* Compact Heading */}
            <div className="text-center mb-4 flex items-center gap-3">
                <h1 className="text-xl font-semibold text-white">
                    Where should we start?
                </h1>

                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className={cn(
                        "p-1.5 rounded-lg transition-all",
                        "hover:bg-white/10 active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    title="Refresh trending topics"
                >
                    <RefreshCw
                        className={cn(
                            "w-4 h-4 text-gray-400",
                            refreshing && "animate-spin"
                        )}
                    />
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex flex-col items-center gap-6 py-12 w-full max-w-2xl">
                    {/* Spinner */}
                    <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                    <p className="text-sm text-gray-400">Loading trending topics...</p>

                    {/* Skeleton Cards */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="h-20 bg-slate-800/50 rounded-lg animate-pulse border border-white/5"
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Topic Grid */}
                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        {topics.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => onPromptClick(topic.title)}
                                className={cn(
                                    "group relative p-2.5 rounded-lg text-left",
                                    "bg-graphite-900 border border-white/5",
                                    "hover:bg-graphite-800 hover:border-white/10",
                                    "transition-all duration-150 shadow-sm"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-base flex-shrink-0">{topic.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-gray-300 group-hover:text-white line-clamp-2 block">
                                            {topic.title}
                                        </span>

                                        {/* Source Badge */}
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-gray-500 group-hover:text-gray-400">
                                                {topic.source}
                                            </span>
                                            {topic.engagement && topic.engagement > 100 && (
                                                <>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {topic.engagement > 1000
                                                            ? `${(topic.engagement / 1000).toFixed(1)}k`
                                                            : topic.engagement}
                                                        {topic.source === 'GitHub' ? '⭐' : '▲'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* New Indicator */}
                                {isRecent(topic.timestamp) && (
                                    <div className="absolute top-2 right-2">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            NEW
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* More Ideas Button */}
                    {onMoreIdeas && (
                        <button
                            onClick={onMoreIdeas}
                            className={cn(
                                "text-xs text-gray-400 hover:text-white",
                                "flex items-center gap-1.5 transition-colors"
                            )}
                        >
                            <RefreshCw className="w-3 h-3" />
                            More ideas
                        </button>
                    )}
                </>
            )}
        </div>
    );

    // Helper to check if topic is recent (< 24 hours)
    function isRecent(timestamp: number): boolean {
        const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        return ageHours < 24;
    }
};
