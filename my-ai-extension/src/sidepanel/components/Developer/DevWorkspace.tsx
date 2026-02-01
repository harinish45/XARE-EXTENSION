import { useState } from 'react';
import { Terminal, FolderGit2, Play, Square, RefreshCw, ExternalLink, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

interface Workspace {
    id: string;
    name: string;
    project: string;
    status: 'running' | 'stopped' | 'starting';
    runtime: string;
}

interface Props {
    onCreateWorkspace: () => void;
    onOpenWorkspace: (id: string) => void;
    onStopWorkspace: (id: string) => void;
    isLoading?: boolean;
}

export function DevWorkspace({ onCreateWorkspace, onOpenWorkspace, onStopWorkspace, isLoading }: Props) {
    const [activeWorkspace] = useState<string | null>(null);
    const [workspaces] = useState<Workspace[]>([
        // Mock data - will be populated from Daytona API
        {
            id: '1',
            name: 'my-project-dev',
            project: 'my-api-server',
            status: 'running',
            runtime: 'Node.js 20'
        },
        {
            id: '2',
            name: 'frontend-workspace',
            project: 'react-app',
            status: 'stopped',
            runtime: 'Node.js 18'
        }
    ]);

    const runningCount = workspaces.filter(w => w.status === 'running').length;

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium">Dev Workspace</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 rounded">
                        PRO
                    </span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {runningCount} running
                </div>
            </div>

            {/* Status Banner */}
            {runningCount > 0 && (
                <div className="glass-subtle p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-cyan-400">
                            {runningCount} workspace{runningCount > 1 ? 's' : ''} active
                        </span>
                    </div>
                </div>
            )}

            {/* Workspace List */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Your Workspaces ({workspaces.length})
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                    {workspaces.map((workspace) => {
                        const isActive = activeWorkspace === workspace.id;
                        const isRunning = workspace.status === 'running';

                        return (
                            <div
                                key={workspace.id}
                                className={cn(
                                    "p-3 rounded-lg transition-all",
                                    "glass-subtle hover:bg-white/10",
                                    isActive && "ring-2 ring-cyan-500 bg-cyan-500/10"
                                )}
                            >
                                {/* Workspace Info */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FolderGit2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">{workspace.name}</span>
                                            <div className={cn(
                                                "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                                isRunning
                                                    ? "bg-green-500/20 text-green-400"
                                                    : workspace.status === 'starting'
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                            )}>
                                                {workspace.status}
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{workspace.project}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {workspace.runtime}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5">
                                    {isRunning ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="flex-1 h-7 text-xs"
                                                onClick={() => onOpenWorkspace(workspace.id)}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Open IDE
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={() => onStopWorkspace(workspace.id)}
                                            >
                                                <Square className="w-3 h-3 text-red-400" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="flex-1 h-7 text-xs"
                                            onClick={() => onOpenWorkspace(workspace.id)}
                                        >
                                            <Play className="w-3 h-3 mr-1" />
                                            Start
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {/* Refresh workspace */ }}
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Quick Actions</div>

                <div className="grid grid-cols-2 gap-2">
                    <button className="glass-subtle p-2 rounded-lg hover:bg-white/10 transition-all text-left">
                        <div className="text-xs font-medium mb-0.5">New Project</div>
                        <div className="text-[10px] text-muted-foreground">From template</div>
                    </button>

                    <button className="glass-subtle p-2 rounded-lg hover:bg-white/10 transition-all text-left">
                        <div className="text-xs font-medium mb-0.5">Clone Repo</div>
                        <div className="text-[10px] text-muted-foreground">From GitHub</div>
                    </button>
                </div>
            </div>

            {/* Features */}
            <div className="glass-subtle p-3 rounded-lg space-y-2">
                <div className="text-xs font-medium">Powered by Daytona</div>
                <div className="space-y-1.5">
                    {[
                        'Cloud-based development',
                        'Pre-configured environments',
                        'Instant workspace sync',
                        'Collaborative coding'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create New Workspace */}
            <Button
                onClick={onCreateWorkspace}
                disabled={isLoading}
                className="w-full h-9"
                variant="default"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Creating...
                    </>
                ) : (
                    <>
                        <Terminal className="w-4 h-4 mr-2" />
                        Create New Workspace
                    </>
                )}
            </Button>
        </div>
    );
}
