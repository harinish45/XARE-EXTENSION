import React, { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

const SUMMARY_LEVELS = [
    { level: 1, label: 'Headlines', description: 'Key points only', color: 'text-blue-400' },
    { level: 2, label: 'Brief', description: '2-3 sentences', color: 'text-cyan-400' },
    { level: 3, label: 'Standard', description: 'Balanced overview', color: 'text-green-400' },
    { level: 4, label: 'Detailed', description: 'Comprehensive', color: 'text-yellow-400' },
    { level: 5, label: 'Complete', description: 'Full analysis', color: 'text-orange-400' }
];

interface Props {
    onSummarize: (level: number) => void;
    isLoading?: boolean;
}

export function SummarizePage({ onSummarize, isLoading }: Props) {
    const [selectedLevel, setSelectedLevel] = useState(3);

    const handleSummarize = () => {
        onSummarize(selectedLevel);
    };

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">Summarize Page</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    Level {selectedLevel}/5
                </div>
            </div>

            {/* Level Selector */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                    Detail Level
                </div>

                {/* Visual Level Indicator */}
                <div className="flex gap-1 mb-3">
                    {SUMMARY_LEVELS.map((lvl) => (
                        <button
                            key={lvl.level}
                            onClick={() => setSelectedLevel(lvl.level)}
                            className={cn(
                                "flex-1 h-2 rounded-full transition-all",
                                selectedLevel >= lvl.level
                                    ? "bg-gradient-to-r from-blue-500 to-green-500"
                                    : "bg-white/10"
                            )}
                            title={`${lvl.label}: ${lvl.description}`}
                        />
                    ))}
                </div>

                {/* Level Description Cards */}
                <div className="grid grid-cols-5 gap-1">
                    {SUMMARY_LEVELS.map((lvl) => (
                        <button
                            key={lvl.level}
                            onClick={() => setSelectedLevel(lvl.level)}
                            className={cn(
                                "p-2 rounded-lg text-center transition-all",
                                "hover:bg-white/10",
                                selectedLevel === lvl.level
                                    ? "glass-subtle ring-1 ring-blue-500"
                                    : "bg-white/5"
                            )}
                        >
                            <div className={cn(
                                "text-xs font-semibold mb-0.5",
                                selectedLevel === lvl.level ? lvl.color : "text-muted-foreground"
                            )}>
                                {lvl.level}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                                {lvl.label}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Selected Level Info */}
                <div className="glass-subtle p-2 rounded text-xs">
                    <span className={SUMMARY_LEVELS[selectedLevel - 1].color}>
                        {SUMMARY_LEVELS[selectedLevel - 1].label}
                    </span>
                    <span className="text-muted-foreground"> - {SUMMARY_LEVELS[selectedLevel - 1].description}</span>
                </div>
            </div>

            {/* Action Button */}
            <Button
                onClick={handleSummarize}
                disabled={isLoading}
                className="w-full h-9"
                variant="default"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Summarizing...
                    </>
                ) : (
                    <>Generate Summary</>
                )}
            </Button>
        </div>
    );
}
