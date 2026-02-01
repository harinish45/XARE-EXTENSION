import React, { useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Model {
    id: string;
    name: string;
    provider: string;
    icon: string;
    badge?: 'max' | 'new' | 'pro';
    contextWindow?: string;
    description?: string;
}

interface ModelSelectorDropdownProps {
    selectedModel: string;
    onSelectModel: (modelId: string) => void;
    className?: string;
}

const models: Model[] = [
    // Google Models
    { id: 'sonar', name: 'Sonar', provider: 'Google', icon: '💎', contextWindow: '128K' },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', icon: 'G', badge: 'new', contextWindow: '1M' },
    { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', icon: 'G', badge: 'pro', contextWindow: '2M' },
    { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'Google', icon: '⚙️', contextWindow: '200K' },

    // Anthropic Models
    { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', icon: 'A', contextWindow: '200K' },
    { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', icon: 'A', badge: 'max', contextWindow: '200K' },

    // Other Models
    { id: 'grok-4.1', name: 'Grok 4.1', provider: 'xAI', icon: '✖️', contextWindow: '128K' },
    { id: 'kimi-k2', name: 'Kimi K2 Thinking', provider: 'Moonshot', icon: 'K', description: 'Hosted in the US', contextWindow: '200K' },
];

const providerOrder = ['Google', 'Anthropic', 'xAI', 'Moonshot'];

export const ModelSelectorDropdown: React.FC<ModelSelectorDropdownProps> = ({
    selectedModel,
    onSelectModel,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedModelData = models.find(m => m.id === selectedModel);
    const groupedModels = providerOrder.map(provider => ({
        provider,
        models: models.filter(m => m.provider === provider),
    })).filter(group => group.models.length > 0);

    return (
        <div className={cn("relative", className)}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-lg",
                    "bg-white/5 border border-white/10 hover:bg-white/10",
                    "transition-all duration-150 min-w-[200px]",
                    isOpen && "border-blue-500/50"
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedModelData?.icon || '🤖'}</span>
                    <span className="text-sm font-medium text-white">
                        {selectedModelData?.name || 'Select Model'}
                    </span>
                    {selectedModelData?.badge && (
                        <span className={cn(
                            "px-1.5 py-0.5 text-xs rounded",
                            selectedModelData.badge === 'max' && "bg-purple-500/20 text-purple-400",
                            selectedModelData.badge === 'new' && "bg-green-500/20 text-green-400",
                            selectedModelData.badge === 'pro' && "bg-blue-500/20 text-blue-400"
                        )}>
                            {selectedModelData.badge}
                        </span>
                    )}
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className={cn(
                        "absolute top-full left-0 right-0 mt-2 z-50",
                        "bg-gray-900 border border-white/10 rounded-xl shadow-2xl",
                        "max-h-[400px] overflow-y-auto",
                        "animate-fade-in"
                    )}>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Sparkles className="w-4 h-4" />
                                <span>Upgrade for best models</span>
                            </div>
                        </div>

                        {/* Model Groups */}
                        {groupedModels.map((group, groupIndex) => (
                            <div key={group.provider}>
                                {/* Provider Header */}
                                <div className="px-4 py-2 bg-white/5">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">
                                        {group.provider}
                                    </span>
                                </div>

                                {/* Models */}
                                {group.models.map((model) => {
                                    const isSelected = model.id === selectedModel;

                                    return (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                onSelectModel(model.id);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3",
                                                "hover:bg-white/5 transition-colors",
                                                isSelected && "bg-blue-500/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{model.icon}</span>
                                                <div className="flex flex-col items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-sm font-medium",
                                                            isSelected ? "text-blue-400" : "text-white"
                                                        )}>
                                                            {model.name}
                                                        </span>
                                                        {model.badge && (
                                                            <span className={cn(
                                                                "px-1.5 py-0.5 text-xs rounded",
                                                                model.badge === 'max' && "bg-purple-500/20 text-purple-400",
                                                                model.badge === 'new' && "bg-green-500/20 text-green-400",
                                                                model.badge === 'pro' && "bg-blue-500/20 text-blue-400"
                                                            )}>
                                                                {model.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {model.description && (
                                                        <span className="text-xs text-gray-500">
                                                            {model.description}
                                                        </span>
                                                    )}
                                                    {model.contextWindow && (
                                                        <span className="text-xs text-gray-500">
                                                            {model.contextWindow} context
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <Check className="w-4 h-4 text-blue-400" />
                                            )}
                                        </button>
                                    );
                                })}

                                {/* Divider between groups */}
                                {groupIndex < groupedModels.length - 1 && (
                                    <div className="border-b border-white/10" />
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
