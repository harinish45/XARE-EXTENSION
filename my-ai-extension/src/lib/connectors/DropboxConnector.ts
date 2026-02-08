/**
 * Dropbox Connector
 * Integrates with Dropbox API for file operations
 */

import { BaseConnector } from './BaseConnector';

export interface DropboxFile {
    id: string;
    name: string;
    path_display: string;
    size?: number;
    client_modified?: Date;
    server_modified?: Date;
    is_downloadable?: boolean;
}

export class DropboxConnector extends BaseConnector {
    private accessToken: string | null = null;
    private readonly apiBase = 'https://api.dropboxapi.com/2';
    private readonly contentBase = 'https://content.dropboxapi.com/2';

    constructor() {
        super('dropbox');
    }

    /**
     * Authenticate with Dropbox using OAuth token
     * @param accessToken - OAuth access token
     */
    async authenticate(accessToken: string): Promise<void> {
        this.accessToken = accessToken;
        this.isAuthenticated = true;
    }

    /**
     * List files in folder
     * @param path - Folder path (empty string for root)
     * @returns Array of files
     */
    async listFiles(path: string = ''): Promise<DropboxFile[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/list_folder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path || '' })
        });

        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.entries || []).map((entry: any) => this.parseFile(entry));
    }

    /**
     * Upload file to Dropbox
     * @param file - File to upload
     * @param path - Destination path
     * @returns Uploaded file metadata
     */
    async uploadFile(file: File, path: string): Promise<DropboxFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.contentBase}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({
                    path,
                    mode: 'add',
                    autorename: true,
                    mute: false
                }),
                'Content-Type': 'application/octet-stream'
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Download file from Dropbox
     * @param path - File path
     * @returns File blob
     */
    async downloadFile(path: string): Promise<Blob> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.contentBase}/files/download`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({ path })
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return response.blob();
    }

    /**
     * Delete file or folder
     * @param path - Path to delete
     * @returns True if deleted
     */
    async deleteFile(path: string): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/delete_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        return response.ok;
    }

    /**
     * Create folder
     * @param path - Folder path
     * @returns Created folder metadata
     */
    async createFolder(path: string): Promise<DropboxFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/create_folder_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data.metadata);
    }

    /**
     * Move file or folder
     * @param fromPath - Source path
     * @param toPath - Destination path
     * @returns Moved file metadata
     */
    async moveFile(fromPath: string, toPath: string): Promise<DropboxFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/move_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_path: fromPath,
                to_path: toPath
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to move file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data.metadata);
    }

    /**
     * Copy file or folder
     * @param fromPath - Source path
     * @param toPath - Destination path
     * @returns Copied file metadata
     */
    async copyFile(fromPath: string, toPath: string): Promise<DropboxFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/copy_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_path: fromPath,
                to_path: toPath
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to copy file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data.metadata);
    }

    /**
     * Search files
     * @param query - Search query
     * @returns Array of matching files
     */
    async searchFiles(query: string): Promise<DropboxFile[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/search_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                options: {
                    max_results: 100
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to search files: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.matches || []).map((match: any) => this.parseFile(match.metadata.metadata));
    }

    /**
     * Get file metadata
     * @param path - File path
     * @returns File metadata
     */
    async getFileMetadata(path: string): Promise<DropboxFile | null> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/files/get_metadata`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Create shared link
     * @param path - File path
     * @returns Shared link URL
     */
    async createSharedLink(path: string): Promise<string> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Dropbox');
        }

        const response = await fetch(`${this.apiBase}/sharing/create_shared_link_with_settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        if (!response.ok) {
            throw new Error(`Failed to create shared link: ${response.statusText}`);
        }

        const data = await response.json();
        return data.url;
    }

    /**
     * Parse Dropbox API file to DropboxFile
     * @param data - Raw file data from API
     * @returns Parsed file
     */
    private parseFile(data: any): DropboxFile {
        return {
            id: data.id,
            name: data.name,
            path_display: data.path_display,
            size: data.size,
            client_modified: data.client_modified ? new Date(data.client_modified) : undefined,
            server_modified: data.server_modified ? new Date(data.server_modified) : undefined,
            is_downloadable: data.is_downloadable
        };
    }
}
