import { BaseConnector } from './BaseConnector';

interface OneDriveFile {
    id: string;
    name: string;
    size: number;
    createdDateTime: string;
    lastModifiedDateTime: string;
    webUrl: string;
    downloadUrl?: string;
    folder?: {
        childCount: number;
    };
    file?: {
        mimeType: string;
    };
}

interface OneDriveUploadOptions {
    name: string;
    content: Blob | File;
    parentId?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
}

interface OneDriveShareOptions {
    type: 'view' | 'edit';
    scope?: 'anonymous' | 'organization';
    expirationDateTime?: string;
}

/**
 * OneDrive API Connector
 * Provides integration with Microsoft OneDrive for file storage and management
 */
export class OneDriveConnector extends BaseConnector {
    private static instance: OneDriveConnector;
    private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

    private constructor() {
        super('OneDrive');
    }

    public static getInstance(): OneDriveConnector {
        if (!OneDriveConnector.instance) {
            OneDriveConnector.instance = new OneDriveConnector();
        }
        return OneDriveConnector.instance;
    }

    /**
     * Upload a file to OneDrive
     */
    async uploadFile(options: OneDriveUploadOptions): Promise<OneDriveFile> {
        await this.ensureAuthenticated();

        const { name, content, parentId = 'root', conflictBehavior = 'rename' } = options;

        // For files smaller than 4MB, use simple upload
        if (content.size < 4 * 1024 * 1024) {
            const endpoint = parentId === 'root'
                ? `${this.baseUrl}/me/drive/root:/${encodeURIComponent(name)}:/content`
                : `${this.baseUrl}/me/drive/items/${parentId}:/${encodeURIComponent(name)}:/content`;

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': content.type || 'application/octet-stream',
                },
                body: content,
            });

            if (!response.ok) {
                throw new Error(`Failed to upload file: ${response.statusText}`);
            }

            return await response.json();
        } else {
            // For larger files, use upload session
            return await this.uploadLargeFile(name, content, parentId);
        }
    }

    /**
     * Upload large file using upload session
     */
    private async uploadLargeFile(
        name: string,
        content: Blob,
        parentId: string
    ): Promise<OneDriveFile> {
        // Create upload session
        const sessionEndpoint = parentId === 'root'
            ? `${this.baseUrl}/me/drive/root:/${encodeURIComponent(name)}:/createUploadSession`
            : `${this.baseUrl}/me/drive/items/${parentId}:/${encodeURIComponent(name)}:/createUploadSession`;

        const sessionResponse = await fetch(sessionEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item: {
                    '@microsoft.graph.conflictBehavior': 'rename',
                },
            }),
        });

        if (!sessionResponse.ok) {
            throw new Error(`Failed to create upload session: ${sessionResponse.statusText}`);
        }

        const session = await sessionResponse.json();
        const uploadUrl = session.uploadUrl;

        // Upload in chunks (10MB each)
        const chunkSize = 10 * 1024 * 1024;
        let offset = 0;

        while (offset < content.size) {
            const chunk = content.slice(offset, offset + chunkSize);
            const chunkEnd = Math.min(offset + chunkSize, content.size);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Length': chunk.size.toString(),
                    'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${content.size}`,
                },
                body: chunk,
            });

            if (!uploadResponse.ok && uploadResponse.status !== 202) {
                throw new Error(`Failed to upload chunk: ${uploadResponse.statusText}`);
            }

            if (uploadResponse.status === 201 || uploadResponse.status === 200) {
                return await uploadResponse.json();
            }

            offset = chunkEnd;
        }

        throw new Error('Upload completed but no file metadata returned');
    }

    /**
     * Download a file from OneDrive
     */
    async downloadFile(fileId: string): Promise<Blob> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${fileId}/content`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(fileId: string): Promise<OneDriveFile> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${fileId}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to get file metadata: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Create a folder
     */
    async createFolder(name: string, parentId: string = 'root'): Promise<OneDriveFile> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${parentId}/children`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename',
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to create folder: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * List files in a folder
     */
    async listFiles(folderId: string = 'root'): Promise<OneDriveFile[]> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${folderId}/children`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value || [];
    }

    /**
     * Search for files
     */
    async searchFiles(query: string): Promise<OneDriveFile[]> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/root/search(q='${encodeURIComponent(query)}')`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to search files: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value || [];
    }

    /**
     * Delete a file or folder
     */
    async deleteItem(itemId: string): Promise<void> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${itemId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to delete item: ${response.statusText}`);
        }
    }

    /**
     * Move or rename a file/folder
     */
    async moveItem(
        itemId: string,
        newParentId?: string,
        newName?: string
    ): Promise<OneDriveFile> {
        await this.ensureAuthenticated();

        const updateData: any = {};

        if (newParentId) {
            updateData.parentReference = { id: newParentId };
        }

        if (newName) {
            updateData.name = newName;
        }

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${itemId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to move/rename item: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Copy a file or folder
     */
    async copyItem(
        itemId: string,
        parentId: string,
        newName?: string
    ): Promise<{ location: string }> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${itemId}/copy`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parentReference: { id: parentId },
                    name: newName,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to copy item: ${response.statusText}`);
        }

        // Copy is async, returns a monitor URL
        const location = response.headers.get('Location');
        return { location: location || '' };
    }

    /**
     * Create a sharing link
     */
    async createShareLink(
        itemId: string,
        options: OneDriveShareOptions
    ): Promise<{ link: string }> {
        await this.ensureAuthenticated();

        const { type, scope = 'anonymous', expirationDateTime } = options;

        const response = await fetch(
            `${this.baseUrl}/me/drive/items/${itemId}/createLink`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type,
                    scope,
                    expirationDateTime,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to create share link: ${response.statusText}`);
        }

        const data = await response.json();
        return { link: data.link.webUrl };
    }

    /**
     * Get storage quota information
     */
    async getStorageQuota(): Promise<{
        total: number;
        used: number;
        remaining: number;
    }> {
        await this.ensureAuthenticated();

        const response = await fetch(
            `${this.baseUrl}/me/drive`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to get storage quota: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            total: data.quota.total,
            used: data.quota.used,
            remaining: data.quota.remaining,
        };
    }
}
