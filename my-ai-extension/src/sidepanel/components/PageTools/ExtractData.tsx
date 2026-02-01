import React, { useState } from 'react';
import { Table, Download, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

type ExportFormat = 'table' | 'list' | 'json' | 'csv';

const FORMATS: { key: ExportFormat; label: string; icon: any; description: string }[] = [
    { key: 'table', label: 'Table', icon: Table, description: 'HTML table' },
    { key: 'list', label: 'List', icon: CheckCircle2, description: 'Bullet points' },
    { key: 'json', label: 'JSON', icon: '{}', description: 'Structured data' },
    { key: 'csv', label: 'CSV', icon: Download, description: 'Spreadsheet' }
];

interface Props {
    onExtract: (format: ExportFormat) => void;
    isLoading?: boolean;
}

export function ExtractData({ onExtract, isLoading }: Props) {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('table');
    const [copied, setCopied] = useState(false);

    const handleExtract = () => {
        onExtract(selectedFormat);
    };

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">Extract Data</span>
                </div>
            </div>

            {/* Format Selector */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Output Format
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {FORMATS.map((format) => {
                        const Icon = format.icon;
                        const isSelected = selectedFormat === format.key;

                        return (
                            <button
                                key={format.key}
                                onClick={() => setSelectedFormat(format.key)}
                                className={cn(
                                    "p-3 rounded-lg transition-all text-left",
                                    "hover:bg-white/10",
                                    isSelected
                                        ? "glass-subtle ring-2 ring-purple-500 bg-purple-500/10"
                                        : "bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {typeof Icon === 'string' ? (
                                        <span className="text-sm font-mono font-bold text-purple-400">{Icon}</span>
                                    ) : (
                                        <Icon className={cn(
                                            "w-4 h-4",
                                            isSelected ? "text-purple-400" : "text-muted-foreground"
                                        )} />
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isSelected ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        {format.label}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {format.description}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Extraction Options */}
            <div className="glass-subtle p-2 rounded space-y-2">
                <div className="text-xs font-medium">Options</div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Include headers</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span>Auto-detect tables</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>Include links</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button
                    onClick={handleExtract}
                    disabled={isLoading}
                    className="flex-1 h-9"
                    variant="default"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Extracting...
                        </>
                    ) : (
                        <>Extract Data</>
                    )}
                </Button>

                <Button
                    onClick={handleCopy}
                    disabled={isLoading}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                >
                    {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
