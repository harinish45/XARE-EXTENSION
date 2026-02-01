// Rich Text Editor Component

import React, { useState } from 'react';
import { Button } from './ui/button';
import {
    Bold, Italic, Code, List, ListOrdered,
    Link, Image, Quote, Heading2
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Type your message...',
    className
}) => {
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const insertMarkdown = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

        onChange(newText);

        // Set cursor position
        setTimeout(() => {
            textarea.focus();
            const newPos = start + before.length + selectedText.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const toolbar = [
        { icon: Bold, action: () => insertMarkdown('**', '**'), title: 'Bold' },
        { icon: Italic, action: () => insertMarkdown('*', '*'), title: 'Italic' },
        { icon: Code, action: () => insertMarkdown('`', '`'), title: 'Code' },
        { icon: Heading2, action: () => insertMarkdown('## ', ''), title: 'Heading' },
        { icon: List, action: () => insertMarkdown('- ', ''), title: 'Bullet List' },
        { icon: ListOrdered, action: () => insertMarkdown('1. ', ''), title: 'Numbered List' },
        { icon: Quote, action: () => insertMarkdown('> ', ''), title: 'Quote' },
        { icon: Link, action: () => insertMarkdown('[', '](url)'), title: 'Link' },
        { icon: Image, action: () => insertMarkdown('![alt](', ')'), title: 'Image' },
    ];

    return (
        <div className={cn("border border-white/10 rounded-lg overflow-hidden", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5">
                {toolbar.map((tool, index) => (
                    <button
                        key={index}
                        onClick={tool.action}
                        title={tool.title}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                        <tool.icon className="h-4 w-4" />
                    </button>
                ))}
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="h-7 text-xs"
                >
                    {showPreview ? 'Edit' : 'Preview'}
                </Button>
            </div>

            {/* Editor/Preview */}
            {showPreview ? (
                <div className="p-4 prose prose-invert prose-sm max-w-none min-h-[200px]">
                    {value || <span className="text-muted-foreground">Nothing to preview</span>}
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-4 bg-transparent border-0 outline-none resize-none min-h-[200px] font-mono text-sm"
                />
            )}
        </div>
    );
};
