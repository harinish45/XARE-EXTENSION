import React from 'react';
import { cn } from "../../lib/utils";

// List of supported providers
export const PROVIDERS = [
    { id: 'openai', name: 'OpenAI (GPT-4o)' },
    { id: 'anthropic', name: 'Anthropic (Claude 3.5)' },
    { id: 'gemini', name: 'Google Gemini 1.5' },
    { id: 'perplexity', name: 'Perplexity (Deep Research)' },
    { id: 'azure', name: 'Azure OpenAI' },
    { id: 'deepseek', name: 'DeepSeek V3' },
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
            <select
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
                {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-background text-foreground">
                        {p.name}
                    </option>
                ))}
            </select>
            {/* Chevron down icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>
        </div>
    );
};
