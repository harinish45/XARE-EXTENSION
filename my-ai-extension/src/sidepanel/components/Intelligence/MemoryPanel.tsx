import React, { useCallback, useEffect, useState } from 'react';
import { Brain, Trash2, Download } from 'lucide-react';
import { conversationMemoryService } from '../../../lib/memory/ConversationMemoryService';
import { Button } from '../ui/button';

export function MemoryPanel() {
    const [memory, setMemory] = useState({
        preferences: {} as Record<string, unknown>,
        topics: [] as string[],
        facts: {} as Record<string, string>
    });

    const loadMemory = useCallback(async () => {
        await conversationMemoryService.load();

        setMemory({
            preferences: conversationMemoryService.getPreference('all') || {},
            topics: conversationMemoryService.getTopics(),
            facts: {}
        });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadMemory();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadMemory]);

    const handleClearMemory = async () => {
        if (confirm('Clear all memory? This cannot be undone.')) {
            await conversationMemoryService.clear();
            loadMemory();
        }
    };

    const handleExportMemory = () => {
        const data = JSON.stringify(memory, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xare-memory-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const preferenceCount = Object.keys(memory.preferences).length;
    const topicCount = memory.topics.length;
    const factCount = Object.keys(memory.facts).length;

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium">Memory</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {preferenceCount} prefs • {topicCount} topics • {factCount} facts
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
                <div className="glass-subtle p-2 rounded text-center">
                    <div className="text-lg font-semibold text-cyan-400">{preferenceCount}</div>
                    <div className="text-xs text-muted-foreground">Preferences</div>
                </div>
                <div className="glass-subtle p-2 rounded text-center">
                    <div className="text-lg font-semibold text-blue-400">{topicCount}</div>
                    <div className="text-xs text-muted-foreground">Topics</div>
                </div>
                <div className="glass-subtle p-2 rounded text-center">
                    <div className="text-lg font-semibold text-purple-400">{factCount}</div>
                    <div className="text-xs text-muted-foreground">Facts</div>
                </div>
            </div>

            {/* Recent Topics */}
            {memory.topics.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Recent Topics</div>
                    <div className="flex flex-wrap gap-1">
                        {memory.topics.slice(-10).reverse().map((topic, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Preferences */}
            {preferenceCount > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Preferences</div>
                    <div className="space-y-1">
                        {Object.entries(memory.preferences).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between glass-subtle p-2 rounded text-xs">
                                <span className="text-muted-foreground">{key}</span>
                                <span className="font-medium">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportMemory}
                    className="flex-1 h-8 text-xs"
                >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearMemory}
                    className="flex-1 h-8 text-xs text-red-400 hover:text-red-300"
                >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                </Button>
            </div>

            {/* Empty State */}
            {preferenceCount === 0 && topicCount === 0 && factCount === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                    No memories stored yet. Start chatting to build context!
                </div>
            )}
        </div>
    );
}
