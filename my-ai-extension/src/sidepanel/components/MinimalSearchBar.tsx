import React, { useState, useRef, useEffect } from 'react';
import { Mic, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MinimalSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    placeholder?: string;
    className?: string;
    onVoiceInput?: () => void;
    onVoiceCommands?: () => void;
    isVoiceActive?: boolean;
    isVoiceCommandsActive?: boolean;
    disabled?: boolean;
}

export const MinimalSearchBar: React.FC<MinimalSearchBarProps> = ({
    value,
    onChange,
    onSubmit,
    placeholder = "Ask anything. Type @ for mentions and / for shortcuts",
    className,
    onVoiceInput,
    onVoiceCommands,
    isVoiceActive = false,
    isVoiceCommandsActive = false,
    disabled = false,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                onSubmit(value);
            }
        }
        if (e.key === 'Escape') {
            onChange('');
            textareaRef.current?.blur();
        }
    };

    return (
        <div
            className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                "bg-graphite-900 backdrop-blur-sm border border-white/10",
                isFocused && "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
                className
            )}
        >
            {/* Input Field */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={disabled}
                className={cn(
                    "flex-1 bg-transparent border-none outline-none resize-none",
                    "text-sm text-white placeholder:text-gray-400",
                    "min-h-[24px] max-h-[200px] overflow-y-auto",
                    "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            />

            {/* Voice Input Icon */}
            <button
                onClick={onVoiceInput}
                className={cn(
                    "p-2 rounded-lg transition-all duration-150",
                    "hover:bg-white/10 hover:scale-110",
                    isVoiceActive && "bg-red-500/20 text-red-400 animate-pulse"
                )}
                title="Voice input (Ctrl+Shift+V)"
            >
                <Mic className="w-5 h-5" />
            </button>

            {/* Voice Commands Icon (Teal) */}
            <button
                onClick={onVoiceCommands}
                className={cn(
                    "p-2 rounded-lg transition-all duration-150",
                    "hover:bg-teal-500/20 hover:scale-110",
                    isVoiceCommandsActive ? "bg-teal-500/30 text-teal-400" : "text-teal-500"
                )}
                title="Voice commands - say 'hey xare' (Ctrl+Shift+C)"
            >
                <Activity className="w-5 h-5" />
            </button>
        </div>
    );
};
