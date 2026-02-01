import React, { useState } from 'react';
import { Users, Code, FileText, BarChart3, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AGENTS } from '../../../lib/agents/MultiAgentService';

const AGENT_ICONS: Record<string, any> = {
    researcher: BarChart3,
    coder: Code,
    writer: FileText,
    analyst: Users
};

const AGENT_GRADIENTS: Record<string, string> = {
    researcher: 'from-purple-500 to-pink-500',
    coder: 'from-blue-500 to-cyan-500',
    writer: 'from-green-500 to-emerald-500',
    analyst: 'from-orange-500 to-red-500'
};

interface Props {
    onAgentSelect: (agentIds: string[]) => void;
    selectedAgents: string[];
}

export function AgentSelector({ onAgentSelect, selectedAgents }: Props) {
    const [localSelected, setLocalSelected] = useState<string[]>(selectedAgents);

    const toggleAgent = (agentId: string) => {
        const newSelected = localSelected.includes(agentId)
            ? localSelected.filter(id => id !== agentId)
            : [...localSelected, agentId];

        setLocalSelected(newSelected);
        onAgentSelect(newSelected);
    };

    const selectAll = () => {
        const allIds = AGENTS.map(a => a.id);
        setLocalSelected(allIds);
        onAgentSelect(allIds);
    };

    const clearAll = () => {
        setLocalSelected([]);
        onAgentSelect([]);
    };

    return (
        <div className="p-3 border-b border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">Select AI Agents</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        All
                    </button>
                    <span className="text-xs text-muted-foreground">•</span>
                    <button
                        onClick={clearAll}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-2 gap-2">
                {AGENTS.map((agent) => {
                    const Icon = AGENT_ICONS[agent.id] || Users;
                    const isSelected = localSelected.includes(agent.id);

                    return (
                        <button
                            key={agent.id}
                            onClick={() => toggleAgent(agent.id)}
                            className={cn(
                                "relative p-3 rounded-lg transition-all duration-200",
                                "glass-subtle hover:bg-white/10",
                                "group",
                                isSelected && "ring-2 ring-blue-500 bg-blue-500/10"
                            )}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                </div>
                            )}

                            {/* Agent Icon */}
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        "bg-gradient-to-br",
                                        AGENT_GRADIENTS[agent.id],
                                        "group-hover:scale-110 transition-transform"
                                    )}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* Agent Info */}
                            <div className="text-left">
                                <div className="text-sm font-medium mb-0.5">{agent.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                    {agent.role}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Selected Count */}
            {localSelected.length > 0 && (
                <div className="mt-3 text-xs text-center text-muted-foreground">
                    {localSelected.length} {localSelected.length === 1 ? 'agent' : 'agents'} selected
                </div>
            )}
        </div>
    );
}
