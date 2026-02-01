import React from 'react';
import { cn } from "../../lib/utils";
import { ChevronDown, Sparkles } from 'lucide-react';

// List of supported providers
export const PROVIDERS = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'gemini', name: 'Gemini' },
    { id: 'perplexity', name: 'Perplexity' },
    { id: 'azure', name: 'Azure' },
    { id: 'deepseek', name: 'DeepSeek' },
    { id: 'ollama', name: 'Ollama (Local)' },
    { id: 'openrouter', name: 'OpenRouter' },
];

interface ModelSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onValueChange, className }) => {
    return (
        <div className={cn("relative", className)}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <select
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className={cn(
                    "w-full appearance-none rounded-xl pl-9 pr-9 py-2.5 text-sm font-medium",
                    "bg-graphite-900 border border-white/5",
                    "hover:bg-graphite-800 hover:border-white/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                    "transition-all duration-200",
                    "cursor-pointer",
                )}
            >
                {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-graphite-900 text-foreground">
                        {p.name}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
            </div>
        </div>
    );
};
