// Workspace Management Service

export interface Workspace {
    id: string;
    name: string;
    description: string;
    sessions: string[];
    createdAt: number;
    lastAccessed: number;
}

export class WorkspaceManagementService {
    private workspaces: Map<string, Workspace> = new Map();
    private activeWorkspaceId: string | null = null;

    // Create workspace
    async createWorkspace(name: string, description: string = ''): Promise<string> {
        const id = `workspace-${Date.now()}`;
        const workspace: Workspace = {
            id,
            name,
            description,
            sessions: [],
            createdAt: Date.now(),
            lastAccessed: Date.now()
        };

        this.workspaces.set(id, workspace);
        await this.save();
        return id;
    }

    // Switch workspace
    async switchWorkspace(id: string): Promise<void> {
        if (!this.workspaces.has(id)) {
            throw new Error('Workspace not found');
        }

        this.activeWorkspaceId = id;
        const workspace = this.workspaces.get(id)!;
        workspace.lastAccessed = Date.now();
        await this.save();
    }

    // Get active workspace
    getActiveWorkspace(): Workspace | null {
        if (!this.activeWorkspaceId) return null;
        return this.workspaces.get(this.activeWorkspaceId) || null;
    }

    // Get all workspaces
    getAllWorkspaces(): Workspace[] {
        return Array.from(this.workspaces.values())
            .sort((a, b) => b.lastAccessed - a.lastAccessed);
    }

    // Delete workspace
    async deleteWorkspace(id: string): Promise<void> {
        this.workspaces.delete(id);
        if (this.activeWorkspaceId === id) {
            this.activeWorkspaceId = null;
        }
        await this.save();
    }

    // Add session to workspace
    async addSession(workspaceId: string, sessionId: string): Promise<void> {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        if (!workspace.sessions.includes(sessionId)) {
            workspace.sessions.push(sessionId);
            await this.save();
        }
    }

    private async save(): Promise<void> {
        const data = Array.from(this.workspaces.values());
        await chrome.storage.local.set({
            'xare-workspaces': data,
            'xare-active-workspace': this.activeWorkspaceId
        });
    }

    async load(): Promise<void> {
        const result = await chrome.storage.local.get(['xare-workspaces', 'xare-active-workspace']);
        if (result['xare-workspaces']) {
            result['xare-workspaces'].forEach((ws: Workspace) => {
                this.workspaces.set(ws.id, ws);
            });
        }
        this.activeWorkspaceId = result['xare-active-workspace'] || null;
    }
}

export const workspaceManagementService = new WorkspaceManagementService();
