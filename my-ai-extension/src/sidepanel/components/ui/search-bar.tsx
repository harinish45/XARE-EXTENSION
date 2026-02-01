import React, { useState } from 'react';
import { Input } from './ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = "Search...",
    className
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className={cn(
            "relative flex items-center",
            className
        )}>
            <Search className={cn(
                "absolute left-3 h-4 w-4 transition-colors",
                isFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="pl-9 pr-9"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
