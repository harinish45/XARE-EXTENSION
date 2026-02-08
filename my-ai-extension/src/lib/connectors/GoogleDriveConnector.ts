/**
 * Google Drive Connector
 * Integrates with Google Drive API for file operations
 */

import { BaseConnector } from './BaseConnector';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    createdTime: Date;
    modifiedTime: Date;
    webViewLink?: string;
    webContentLink?: string;
    parents?: string[];
}

export interface UploadOptions {
    name: string;
    mimeType?: string;
    parents?: string[];
    description?: string;
}

export class GoogleDriveConnector extends BaseConnector {
    private accessToken: string | null = null;
    private readonly apiBase = 'https://www.googleapis.com/drive/v3';
    private readonly uploadBase = 'https://www.googleapis.com/upload/drive/v3';

    constructor() {
        super('google-drive');
    }

    /**
     * Authenticate with Google Drive using OAuth 2.0
     * @param accessToken - OAuth access token
     */
    async authenticate(accessToken: string): Promise<void> {
        this.accessToken = accessToken;
        this.isAuthenticated = true;
    }

    /**
     * List files in Drive
     * @param query - Search query
     * @param pageSize - Number of files to retrieve
     * @returns Array of files
     */
    async listFiles(query: string = '', pageSize: number = 100): Promise<DriveFile[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const params = new URLSearchParams({
            pageSize: pageSize.toString(),
            fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents)',
            ...(query && { q: query })
        });

        const response = await fetch(`${this.apiBase}/files?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.files || []).map((file: any) => this.parseFile(file));
    }

    /**
     * Get file metadata
     * @param fileId - File ID
     * @returns File metadata
     */
    async getFile(fileId: string): Promise<DriveFile | null> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const params = new URLSearchParams({
            fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents'
        });

        const response = await fetch(`${this.apiBase}/files/${fileId}?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Upload file to Drive
     * @param file - File to upload
     * @param options - Upload options
     * @returns Uploaded file metadata
     */
    async uploadFile(file: File, options: UploadOptions): Promise<DriveFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const metadata = {
            name: options.name,
            mimeType: options.mimeType || file.type,
            ...(options.parents && { parents: options.parents }),
            ...(options.description && { description: options.description })
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        const response = await fetch(`${this.uploadBase}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Download file from Drive
     * @param fileId - File ID
     * @returns File blob
     */
    async downloadFile(fileId: string): Promise<Blob> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(`${this.apiBase}/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return response.blob();
    }

    /**
     * Delete file from Drive
     * @param fileId - File ID
     * @returns True if deleted
     */
    async deleteFile(fileId: string): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(`${this.apiBase}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        return response.ok;
    }

    /**
     * Create folder in Drive
     * @param name - Folder name
     * @param parentId - Parent folder ID
     * @returns Created folder metadata
     */
    async createFolder(name: string, parentId?: string): Promise<DriveFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] })
        };

        const response = await fetch(`${this.apiBase}/files?fields=id,name,mimeType,createdTime,modifiedTime,parents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Move file to folder
     * @param fileId - File ID
     * @param folderId - Destination folder ID
     * @returns Updated file metadata
     */
    async moveFile(fileId: string, folderId: string): Promise<DriveFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        // Get current parents
        const file = await this.getFile(fileId);
        if (!file) {
            throw new Error('File not found');
        }

        const previousParents = file.parents?.join(',') || '';

        const params = new URLSearchParams({
            addParents: folderId,
            removeParents: previousParents,
            fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents'
        });

        const response = await fetch(`${this.apiBase}/files/${fileId}?${params}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to move file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Rename file
     * @param fileId - File ID
     * @param newName - New file name
     * @returns Updated file metadata
     */
    async renameFile(fileId: string, newName: string): Promise<DriveFile> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(`${this.apiBase}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            throw new Error(`Failed to rename file: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseFile(data);
    }

    /**
     * Search files
     * @param query - Search query
     * @returns Array of matching files
     */
    async searchFiles(query: string): Promise<DriveFile[]> {
        return this.listFiles(`name contains '${query}'`);
    }

    /**
     * Get files in folder
     * @param folderId - Folder ID
     * @returns Array of files in folder
     */
    async getFilesInFolder(folderId: string): Promise<DriveFile[]> {
        return this.listFiles(`'${folderId}' in parents`);
    }

    /**
     * Share file
     * @param fileId - File ID
     * @param email - Email to share with
     * @param role - Permission role (reader, writer, commenter)
     * @returns True if shared
     */
    async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(`${this.apiBase}/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'user',
                role,
                emailAddress: email
            })
        });

        return response.ok;
    }

    /**
     * Parse Drive API file to DriveFile
     * @param data - Raw file data from API
     * @returns Parsed file
     */
    private parseFile(data: any): DriveFile {
        return {
            id: data.id,
            name: data.name,
            mimeType: data.mimeType,
            size: data.size ? parseInt(data.size) : undefined,
            createdTime: new Date(data.createdTime),
            modifiedTime: new Date(data.modifiedTime),
            webViewLink: data.webViewLink,
            webContentLink: data.webContentLink,
            parents: data.parents
        };
    }
}
