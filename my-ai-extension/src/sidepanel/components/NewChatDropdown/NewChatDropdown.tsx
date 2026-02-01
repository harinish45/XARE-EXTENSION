import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { getModesByCategory, type ChatMode } from './chatModes';
import { cn } from '../../../lib/utils';

const CATEGORIES = [
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'content', label: 'Content' },
    { id: 'pagetools', label: 'Page Tools' },
    { id: 'automation', label: 'Automation' },
    { id: 'developer', label: 'Developer' }
];

interface Props {
    onModeSelect: (mode: ChatMode) => void;
}

export function NewChatDropdown({ onModeSelect }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        // Keyboard shortcuts
        const handleKeyboard = (e: KeyboardEvent) => {
            // Ctrl/Cmd + K to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(!isOpen);
            }

            // Escape to close
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        document.addEventListener('keydown', handleKeyboard);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyboard);
        };
    }, [isOpen]);

    const handleModeClick = (mode: ChatMode) => {
        onModeSelect(mode);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    "hover:bg-white/10 active:scale-95",
                    isOpen && "bg-white/15 ring-2 ring-blue-500/50"
                )}
                title="New Chat (Ctrl+K)"
                aria-label="Start new chat"
                aria-expanded={isOpen}
            >
                <Plus className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isOpen && "rotate-45"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-12 right-0 w-80 max-h-[600px] overflow-y-auto z-50 custom-scrollbar">
                    <div className="
            bg-slate-900/95 backdrop-blur-xl
            border border-white/10
            rounded-xl shadow-2xl shadow-black/50
            p-2 animate-scale-in origin-top-right
          ">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-white/5 mb-2">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Start New Chat
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                                17 specialized modes available
                            </div>
                        </div>

                        {/* Categories */}
                        {CATEGORIES.map((category) => {
                            const modes = getModesByCategory(category.id);
                            if (modes.length === 0) return null;

                            return (
                                <div key={category.id} className="mb-3 last:mb-0">
                                    {/* Category Header */}
                                    <div className="px-3 py-1.5">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            {category.label}
                                        </div>
                                    </div>

                                    {/* Mode Buttons */}
                                    <div className="space-y-1">
                                        {modes.map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => handleModeClick(mode.id)}
                                                className="
                          w-full flex items-center gap-3 px-3 py-2.5
                          rounded-lg hover:bg-white/10 active:bg-white/15
                          transition-all duration-150 group
                        "
                                                aria-label={`Start ${mode.label} - ${mode.description}`}
                                            >
                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-9 h-9 flex items-center justify-center shrink-0",
                                                    "rounded-lg bg-gradient-to-br",
                                                    mode.gradient,
                                                    "border border-white/10",
                                                    "group-hover:border-white/20 group-hover:scale-110",
                                                    "transition-all duration-200"
                                                )}>
                                                    <mode.icon className="w-5 h-5 text-white" />
                                                </div>

                                                {/* Label */}
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="text-sm font-medium text-white flex items-center gap-2">
                                                        <span className="truncate">{mode.label}</span>
                                                        {mode.isPremium && (
                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 shrink-0">
                                                                PRO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                                                        {mode.description}
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <ChevronRight className="
                          w-4 h-4 text-gray-500 opacity-0 -translate-x-2 shrink-0
                          group-hover:opacity-100 group-hover:translate-x-0
                          transition-all duration-200
                        " />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Footer Hint */}
                        <div className="px-3 py-2 border-t border-white/5 mt-2">
                            <div className="text-[10px] text-gray-500">
                                Tip: Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-gray-400">Ctrl+K</kbd> to open
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
