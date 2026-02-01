// Follow-up Suggestion Chips Component

import React from 'react';
import { Button } from './ui/button';
import { Lightbulb, ArrowRight, HelpCircle, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FollowUpSuggestion } from '../../lib/suggestions/FollowUpGenerator';

const CATEGORY_ICONS = {
    clarify: HelpCircle,
    deepen: Layers,
    related: Lightbulb,
    expand: ArrowRight,
};

const CATEGORY_COLORS = {
    clarify: 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20',
    deepen: 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
    related: 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20',
    expand: 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20',
};

interface FollowUpChipsProps {
    suggestions: FollowUpSuggestion[];
    onSelect: (suggestion: FollowUpSuggestion) => void;
    className?: string;
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ suggestions, onSelect, className }) => {
    if (suggestions.length === 0) return null;

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {suggestions.map((suggestion) => {
                const Icon = CATEGORY_ICONS[suggestion.category];
                const colorClass = CATEGORY_COLORS[suggestion.category];

                return (
                    <button
                        key={suggestion.id}
                        onClick={() => onSelect(suggestion)}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                            "hover:scale-105 hover:shadow-lg",
                            colorClass
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-left">{suggestion.text}</span>
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                );
            })}
        </div>
    );
};
