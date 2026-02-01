// Command Palette - ⌘K quick actions

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from './ui/input';

export interface CommandAction {
    id: string;
    name: string;
    description?: string;
    icon?: React.ReactNode;
    keywords?: string[];
    action: () => void;
    category?: string;
}

interface CommandPaletteProps {
    actions: CommandAction[];
    isOpen: boolean;
    onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ actions, isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredActions = actions.filter(action => {
        const searchText = `${action.name} ${action.description} ${action.keywords?.join(' ')}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
    });

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredActions[selectedIndex]) {
                filteredActions[selectedIndex].action();
                onClose();
            }
        }
    }, [isOpen, selectedIndex, filteredActions, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-graphite-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl mx-4 bg-graphite-900 border border-white/5 rounded-xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-graphite-950">
                    <Command className="h-5 w-5 text-blue-500" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a command or search..."
                        className="border-0 bg-transparent focus:ring-0 text-white placeholder:text-gray-500"
                        autoFocus
                    />
                    <kbd className="px-2 py-1 text-[10px] rounded bg-white/5 text-gray-400 font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredActions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No commands found
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredActions.map((action, index) => (
                                <button
                                    key={action.id}
                                    onClick={() => {
                                        action.action();
                                        onClose();
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150",
                                        index === selectedIndex
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                                            : "hover:bg-white/5 text-gray-300"
                                    )}
                                >
                                    {action.icon && (
                                        <div className="shrink-0">{action.icon}</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">{action.name}</div>
                                        {action.description && (
                                            <div className={cn(
                                                "text-xs truncate",
                                                index === selectedIndex ? "text-white/80" : "text-muted-foreground"
                                            )}>
                                                {action.description}
                                            </div>
                                        )}
                                    </div>
                                    {action.category && (
                                        <div className="text-xs px-2 py-1 rounded bg-white/10">
                                            {action.category}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
