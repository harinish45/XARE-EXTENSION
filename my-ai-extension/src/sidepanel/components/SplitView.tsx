// Split View Component for side-by-side comparison

import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SplitViewProps {
    left: React.ReactNode;
    right: React.ReactNode;
    defaultSplit?: number;
    minSize?: number;
}

export const SplitView: React.FC<SplitViewProps> = ({
    left,
    right,
    defaultSplit = 50,
    minSize = 20
}) => {
    const [split, setSplit] = useState(defaultSplit);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const newSplit = ((e.clientX - rect.left) / rect.width) * 100;

        if (newSplit >= minSize && newSplit <= (100 - minSize)) {
            setSplit(newSplit);
        }
    };

    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mouseup', handleMouseUp);
            return () => document.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging]);

    return (
        <div
            className="flex h-full w-full relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Left Panel */}
            <div
                className="overflow-auto"
                style={{ width: `${split}%` }}
            >
                {left}
            </div>

            {/* Resizer */}
            <div
                className={cn(
                    "w-1 bg-white/10 hover:bg-primary cursor-col-resize flex items-center justify-center group relative",
                    isDragging && "bg-primary"
                )}
                onMouseDown={handleMouseDown}
            >
                <div className="absolute inset-y-0 -left-1 -right-1" />
                <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Right Panel */}
            <div
                className="overflow-auto"
                style={{ width: `${100 - split}%` }}
            >
                {right}
            </div>
        </div>
    );
};
