import React from 'react';
import { Sparkles, Grid3x3, BookOpen, Globe, Paperclip } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToolsToolbarProps {
    onToolClick: (tool: string) => void;
    activeTools: string[];
    className?: string;
}

export const ToolsToolbar: React.FC<ToolsToolbarProps> = ({
    onToolClick,
    activeTools,
    className,
}) => {
    const tools = [
        { id: 'research', icon: Sparkles, tooltip: 'Deep research' },
        { id: 'apps', icon: Grid3x3, tooltip: 'Apps' },
        { id: 'reader', icon: BookOpen, tooltip: 'Reader mode' },
        { id: 'web', icon: Globe, tooltip: 'Web search' },
        { id: 'attach', icon: Paperclip, tooltip: 'Attach files' },
    ];

    return (
        <div
            className={cn(
                "flex items-center justify-center gap-1 px-3 py-2",
                "bg-graphite-900 border border-white/5 shadow-2xl rounded-lg",
                className
            )}
        >
            {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTools.includes(tool.id);

                return (
                    <button
                        key={tool.id}
                        onClick={() => onToolClick(tool.id)}
                        className={cn(
                            "p-2.5 rounded-lg transition-all duration-150",
                            "hover:bg-white/10",
                            isActive && "bg-white/10 text-blue-400"
                        )}
                        title={tool.tooltip}
                    >
                        <Icon className="w-5 h-5" />
                    </button>
                );
            })}
        </div>
    );
};
