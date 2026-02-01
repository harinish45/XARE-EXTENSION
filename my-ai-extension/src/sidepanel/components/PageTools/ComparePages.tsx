import React, { useState } from 'react';
import { GitCompare, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

interface TabOption {
    id: number;
    title: string;
    url: string;
}

interface Props {
    onCompare: (tabIds: number[]) => void;
    isLoading?: boolean;
}

export function ComparePages({ onCompare, isLoading }: Props) {
    const [selectedTabs, setSelectedTabs] = useState<number[]>([]);
    const [availableTabs] = useState<TabOption[]>([
        // Mock data - will be populated from chrome.tabs API
        { id: 1, title: 'Documentation', url: 'https://example.com/docs' },
        { id: 2, title: 'Tutorial', url: 'https://example.com/tutorial' }
    ]);

    const toggleTab = (tabId: number) => {
        setSelectedTabs(prev =>
            prev.includes(tabId)
                ? prev.filter(id => id !== tabId)
                : [...prev, tabId]
        );
    };

    const handleCompare = () => {
        if (selectedTabs.length >= 2) {
            onCompare(selectedTabs);
        }
    };

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Compare Pages</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {selectedTabs.length}/2+ selected
                </div>
            </div>

            {/* Instructions */}
            <div className="glass-subtle p-2 rounded text-xs text-muted-foreground">
                Select 2 or more tabs to compare their content
            </div>

            {/* Tab List */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Open Tabs ({availableTabs.length})
                </div>

                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                    {availableTabs.map((tab) => {
                        const isSelected = selectedTabs.includes(tab.id);

                        return (
                            <button
                                key={tab.id}
                                onClick={() => toggleTab(tab.id)}
                                className={cn(
                                    "w-full p-2 rounded-lg text-left transition-all",
                                    "hover:bg-white/10",
                                    isSelected
                                        ? "glass-subtle ring-2 ring-blue-500 bg-blue-500/10"
                                        : "bg-white/5"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <div className={cn(
                                        "w-4 h-4 rounded border mt-0.5",
                                        isSelected
                                            ? "bg-blue-500 border-blue-500"
                                            : "border-white/20"
                                    )}>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{tab.title}</div>
                                        <div className="text-xs text-muted-foreground truncate">{tab.url}</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Comparison Options */}
            <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Compare</div>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Text content</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Structure (HTML)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>Images</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button
                    onClick={handleCompare}
                    disabled={isLoading || selectedTabs.length < 2}
                    className="flex-1 h-9"
                    variant="default"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Comparing...
                        </>
                    ) : (
                        <>Compare ({selectedTabs.length})</>
                    )}
                </Button>

                {selectedTabs.length > 0 && (
                    <Button
                        onClick={() => setSelectedTabs([])}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
