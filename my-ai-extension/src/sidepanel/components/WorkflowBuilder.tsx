/**
 * Visual Workflow Builder Component
 * Drag-and-drop interface for creating automation workflows
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card } from './ui/card';

export interface WorkflowNode {
    id: string;
    type: 'action' | 'condition' | 'loop' | 'trigger';
    label: string;
    config: Record<string, any>;
    position: { x: number; y: number };
    connections: string[];
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    createdAt: Date;
    updatedAt: Date;
}

const NODE_TYPES = {
    action: {
        label: 'Action',
        color: '#3b82f6',
        icon: '⚡',
        templates: [
            { type: 'click', label: 'Click Element', config: { selector: '' } },
            { type: 'type', label: 'Type Text', config: { selector: '', text: '' } },
            { type: 'navigate', label: 'Navigate', config: { url: '' } },
            { type: 'scroll', label: 'Scroll', config: { direction: 'down', amount: 100 } },
            { type: 'wait', label: 'Wait', config: { duration: 1000 } },
            { type: 'screenshot', label: 'Take Screenshot', config: {} },
            { type: 'extract', label: 'Extract Data', config: { selector: '', attribute: 'textContent' } }
        ]
    },
    condition: {
        label: 'Condition',
        color: '#f59e0b',
        icon: '🔀',
        templates: [
            { type: 'if', label: 'If Condition', config: { expression: '' } },
            { type: 'exists', label: 'Element Exists', config: { selector: '' } },
            { type: 'contains', label: 'Text Contains', config: { selector: '', text: '' } }
        ]
    },
    loop: {
        label: 'Loop',
        color: '#8b5cf6',
        icon: '🔁',
        templates: [
            { type: 'for', label: 'For Loop', config: { count: 10 } },
            { type: 'while', label: 'While Loop', config: { condition: '' } },
            { type: 'forEach', label: 'For Each', config: { selector: '' } }
        ]
    },
    trigger: {
        label: 'Trigger',
        color: '#10b981',
        icon: '🎯',
        templates: [
            { type: 'manual', label: 'Manual Trigger', config: {} },
            { type: 'schedule', label: 'Schedule', config: { cron: '0 9 * * *' } },
            { type: 'webhook', label: 'Webhook', config: { url: '' } },
            { type: 'fileChange', label: 'File Change', config: { path: '' } }
        ]
    }
};

export const WorkflowBuilder: React.FC = () => {
    const [workflow, setWorkflow] = useState<Workflow>({
        id: crypto.randomUUID(),
        name: 'New Workflow',
        description: '',
        nodes: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Add node to workflow
    const addNode = useCallback((type: string, template: any, position: { x: number; y: number }) => {
        const newNode: WorkflowNode = {
            id: crypto.randomUUID(),
            type: type as any,
            label: template.label,
            config: { ...template.config },
            position,
            connections: []
        };

        setWorkflow(prev => ({
            ...prev,
            nodes: [...prev.nodes, newNode],
            updatedAt: new Date()
        }));
    }, []);

    // Update node position
    const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map(node =>
                node.id === nodeId ? { ...node, position } : node
            ),
            updatedAt: new Date()
        }));
    }, []);

    // Delete node
    const deleteNode = useCallback((nodeId: string) => {
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.filter(node => node.id !== nodeId),
            updatedAt: new Date()
        }));
        setSelectedNode(null);
    }, []);

    // Connect nodes
    const connectNodes = useCallback((fromId: string, toId: string) => {
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map(node =>
                node.id === fromId
                    ? { ...node, connections: [...node.connections, toId] }
                    : node
            ),
            updatedAt: new Date()
        }));
    }, []);

    // Export workflow
    const exportWorkflow = useCallback(() => {
        const json = JSON.stringify(workflow, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [workflow]);

    // Import workflow
    const importWorkflow = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                setWorkflow({
                    ...imported,
                    createdAt: new Date(imported.createdAt),
                    updatedAt: new Date(imported.updatedAt)
                });
            } catch (error) {
                console.error('Failed to import workflow:', error);
            }
        };
        reader.readAsText(file);
    }, []);

    // Handle drag start from palette
    const handlePaletteDragStart = (type: string, template: any) => {
        const tempNode: WorkflowNode = {
            id: 'temp',
            type: type as any,
            label: template.label,
            config: { ...template.config },
            position: { x: 0, y: 0 },
            connections: []
        };
        setDraggedNode(tempNode);
    };

    // Handle drop on canvas
    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedNode || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - panOffset.x) / zoom;
        const y = (e.clientY - rect.top - panOffset.y) / zoom;

        addNode(draggedNode.type, { label: draggedNode.label, config: draggedNode.config }, { x, y });
        setDraggedNode(null);
    };

    return (
        <div className="workflow-builder h-full flex flex-col bg-gray-50">
            {/* Toolbar */}
            <div className="toolbar flex items-center justify-between p-4 bg-white border-b">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={workflow.name}
                        onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        className="text-xl font-bold border-none outline-none"
                        placeholder="Workflow Name"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportWorkflow}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Export
                    </button>
                    <label className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
                        Import
                        <input
                            type="file"
                            accept=".json"
                            onChange={(e) => e.target.files?.[0] && importWorkflow(e.target.files[0])}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={() => setWorkflow(prev => ({ ...prev, nodes: [] }))}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Node Palette */}
                <div className="palette w-64 bg-white border-r p-4 overflow-y-auto">
                    <h3 className="font-bold mb-4">Node Palette</h3>
                    {Object.entries(NODE_TYPES).map(([type, config]) => (
                        <div key={type} className="mb-6">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <span>{config.icon}</span>
                                <span>{config.label}</span>
                            </h4>
                            <div className="space-y-2">
                                {config.templates.map((template, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={() => handlePaletteDragStart(type, template)}
                                        className="p-2 bg-gray-100 rounded cursor-move hover:bg-gray-200 text-sm"
                                        style={{ borderLeft: `3px solid ${config.color}` }}
                                    >
                                        {template.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    className="canvas flex-1 relative overflow-hidden bg-gray-100"
                    onDrop={handleCanvasDrop}
                    onDragOver={(e) => e.preventDefault()}
                    style={{
                        backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    <div
                        className="canvas-content"
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}
                    >
                        {/* Render connections */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            {workflow.nodes.map(node =>
                                node.connections.map(targetId => {
                                    const target = workflow.nodes.find(n => n.id === targetId);
                                    if (!target) return null;
                                    return (
                                        <line
                                            key={`${node.id}-${targetId}`}
                                            x1={node.position.x + 100}
                                            y1={node.position.y + 40}
                                            x2={target.position.x}
                                            y2={target.position.y + 40}
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            markerEnd="url(#arrowhead)"
                                        />
                                    );
                                })
                            )}
                            <defs>
                                <marker
                                    id="arrowhead"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="9"
                                    refY="3"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                                </marker>
                            </defs>
                        </svg>

                        {/* Render nodes */}
                        {workflow.nodes.map(node => {
                            const nodeType = NODE_TYPES[node.type];
                            return (
                                <div
                                    key={node.id}
                                    className={`absolute p-4 bg-white rounded-lg shadow-lg cursor-move ${selectedNode === node.id ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                    style={{
                                        left: node.position.x,
                                        top: node.position.y,
                                        width: 200,
                                        borderLeft: `4px solid ${nodeType.color}`
                                    }}
                                    onClick={() => setSelectedNode(node.id)}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('nodeId', node.id);
                                    }}
                                    onDragEnd={(e) => {
                                        const rect = canvasRef.current?.getBoundingClientRect();
                                        if (!rect) return;
                                        const x = (e.clientX - rect.left - panOffset.x) / zoom;
                                        const y = (e.clientY - rect.top - panOffset.y) / zoom;
                                        updateNodePosition(node.id, { x, y });
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg">{nodeType.icon}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNode(node.id);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="font-semibold text-sm">{node.label}</div>
                                    <div className="text-xs text-gray-500 mt-1">{node.type}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Properties Panel */}
                {selectedNode && (
                    <div className="properties w-80 bg-white border-l p-4 overflow-y-auto">
                        <h3 className="font-bold mb-4">Properties</h3>
                        {(() => {
                            const node = workflow.nodes.find(n => n.id === selectedNode);
                            if (!node) return null;

                            return (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Label</label>
                                        <input
                                            type="text"
                                            value={node.label}
                                            onChange={(e) => {
                                                setWorkflow(prev => ({
                                                    ...prev,
                                                    nodes: prev.nodes.map(n =>
                                                        n.id === selectedNode ? { ...n, label: e.target.value } : n
                                                    )
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Configuration</label>
                                        <textarea
                                            value={JSON.stringify(node.config, null, 2)}
                                            onChange={(e) => {
                                                try {
                                                    const config = JSON.parse(e.target.value);
                                                    setWorkflow(prev => ({
                                                        ...prev,
                                                        nodes: prev.nodes.map(n =>
                                                            n.id === selectedNode ? { ...n, config } : n
                                                        )
                                                    }));
                                                } catch (error) {
                                                    // Invalid JSON, ignore
                                                }
                                            }}
                                            className="w-full px-3 py-2 border rounded font-mono text-xs"
                                            rows={10}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="status-bar flex items-center justify-between p-2 bg-white border-t text-sm text-gray-600">
                <div>Nodes: {workflow.nodes.length}</div>
                <div>Zoom: {Math.round(zoom * 100)}%</div>
                <div>Last updated: {workflow.updatedAt.toLocaleTimeString()}</div>
            </div>
        </div>
    );
};
