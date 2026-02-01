// Mode Selector Component - UI for switching response modes

import React from 'react';
import { Button } from './ui/button';
import { Zap, FileText, Code, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type ResponseMode, RESPONSE_MODES, responseModeManager } from '../../lib/modes/ResponseModes';

const MODE_ICONS = {
    Zap,
    FileText,
    Code,
    Sparkles
};

interface ModeSelectorProps {
    value: ResponseMode;
    onChange: (mode: ResponseMode) => void;
    className?: string;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange, className }) => {
    return (
        <div className={cn("flex gap-1 p-1 rounded-lg bg-white/5 border border-white/[0.06]", className)}>
            {Object.values(RESPONSE_MODES).map((mode) => {
                const Icon = MODE_ICONS[mode.icon as keyof typeof MODE_ICONS];
                const isActive = value === mode.id;

                return (
                    <button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            isActive
                                ? "bg-primary text-white shadow-lg"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                        title={mode.description}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{mode.name}</span>
                    </button>
                );
            })}
        </div>
    );
};
