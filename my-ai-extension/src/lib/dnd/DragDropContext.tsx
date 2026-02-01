// Drag and Drop Context

import React, { createContext, useContext, useState } from 'react';

interface DragDropContextType {
    draggedItem: any;
    setDraggedItem: (item: any) => void;
    dropTarget: string | null;
    setDropTarget: (target: string | null) => void;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    return (
        <DragDropContext.Provider value={{ draggedItem, setDraggedItem, dropTarget, setDropTarget }}>
            {children}
        </DragDropContext.Provider>
    );
};

export const useDragDrop = () => {
    const context = useContext(DragDropContext);
    if (!context) {
        throw new Error('useDragDrop must be used within DragDropProvider');
    }
    return context;
};

// Draggable Component
interface DraggableProps {
    id: string;
    data: any;
    children: React.ReactNode;
    className?: string;
}

export const Draggable: React.FC<DraggableProps> = ({ id, data, children, className }) => {
    const { setDraggedItem } = useDragDrop();

    const handleDragStart = (e: React.DragEvent) => {
        setDraggedItem({ id, data });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={className}
        >
            {children}
        </div>
    );
};

// Droppable Component
interface DroppableProps {
    id: string;
    onDrop: (item: any) => void;
    children: React.ReactNode;
    className?: string;
}

export const Droppable: React.FC<DroppableProps> = ({ id, onDrop, children, className }) => {
    const { draggedItem, setDropTarget } = useDragDrop();
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(true);
        setDropTarget(id);
    };

    const handleDragLeave = () => {
        setIsOver(false);
        setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        setDropTarget(null);
        if (draggedItem) {
            onDrop(draggedItem);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${className} ${isOver ? 'ring-2 ring-primary' : ''}`}
        >
            {children}
        </div>
    );
};
