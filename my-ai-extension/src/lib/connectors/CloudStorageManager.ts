import { GoogleDriveConnector } from './GoogleDriveConnector';
import { DropboxConnector } from './DropboxConnector';
import { OneDriveConnector } from './OneDriveConnector';

export type CloudProvider = 'google-drive' | 'dropbox' | 'onedrive';

interface CloudFile {
    id: string;
    name: string;
    size: number;
    modifiedTime: string;
    webUrl: string;
    isFolder: boolean;
    provider: CloudProvider;
}

interface UploadOptions {
    name: string;
    content: Blob | File;
    parentId?: string;
}

interface SearchOptions {
    query: string;
    provider?: CloudProvider;
    fileType?: string;
}

/**
 * Unified Cloud Storage Manager
 * Provides a single interface to interact with multiple cloud storage providers
 */
export class CloudStorageManager {
    private static instance: CloudStorageManager;

    private googleDrive: GoogleDriveConnector;
    private dropbox: DropboxConnector;
    private oneDrive: OneDriveConnector;

    private constructor() {
        this.googleDrive = GoogleDriveConnector.getInstance();
        this.dropbox = DropboxConnector.getInstance();
        this.oneDrive = OneDriveConnector.getInstance();
    }

    public static getInstance(): CloudStorageManager {
        if (!CloudStorageManager.instance) {
            CloudStorageManager.instance = new CloudStorageManager();
        }
        return CloudStorageManager.instance;
    }

    /**
     * Get the connector for a specific provider
     */
    private getConnector(provider: CloudProvider) {
        switch (provider) {
            case 'google-drive':
                return this.googleDrive;
            case 'dropbox':
                return this.dropbox;
            case 'onedrive':
                return this.oneDrive;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }

    /**
     * Upload a file to a specific cloud provider
     */
    async uploadFile(
        provider: CloudProvider,
        options: UploadOptions
    ): Promise<CloudFile> {
        const connector = this.getConnector(provider);

        switch (provider) {
            case 'google-drive': {
                const file = await this.googleDrive.uploadFile(options);
                return this.normalizeGoogleDriveFile(file);
            }
            case 'dropbox': {
                const file = await this.dropbox.uploadFile(options);
                return this.normalizeDropboxFile(file);
            }
            case 'onedrive': {
                const file = await this.oneDrive.uploadFile(options);
                return this.normalizeOneDriveFile(file);
            }
        }
    }

    /**
     * Download a file from a specific cloud provider
     */
    async downloadFile(provider: CloudProvider, fileId: string): Promise<Blob> {
        const connector = this.getConnector(provider);

        switch (provider) {
            case 'google-drive':
                return await this.googleDrive.downloadFile(fileId);
            case 'dropbox':
                return await this.dropbox.downloadFile(fileId);
            case 'onedrive':
                return await this.oneDrive.downloadFile(fileId);
        }
    }

    /**
     * List files in a folder across a specific provider
     */
    async listFiles(
        provider: CloudProvider,
        folderId?: string
    ): Promise<CloudFile[]> {
        switch (provider) {
            case 'google-drive': {
                const files = await this.googleDrive.listFiles(folderId);
                return files.map(f => this.normalizeGoogleDriveFile(f));
            }
            case 'dropbox': {
                const files = await this.dropbox.listFiles(folderId || '');
                return files.map(f => this.normalizeDropboxFile(f));
            }
            case 'onedrive': {
                const files = await this.oneDrive.listFiles(folderId);
                return files.map(f => this.normalizeOneDriveFile(f));
            }
        }
    }

    /**
     * Search for files across one or all providers
     */
    async searchFiles(options: SearchOptions): Promise<CloudFile[]> {
        const { query, provider, fileType } = options;

        if (provider) {
            // Search in specific provider
            return await this.searchInProvider(provider, query, fileType);
        } else {
            // Search across all providers
            const results = await Promise.allSettled([
                this.searchInProvider('google-drive', query, fileType),
                this.searchInProvider('dropbox', query, fileType),
                this.searchInProvider('onedrive', query, fileType),
            ]);

            return results
                .filter((r): r is PromiseFulfilledResult<CloudFile[]> => r.status === 'fulfilled')
                .flatMap(r => r.value);
        }
    }

    /**
     * Search in a specific provider
     */
    private async searchInProvider(
        provider: CloudProvider,
        query: string,
        fileType?: string
    ): Promise<CloudFile[]> {
        try {
            switch (provider) {
                case 'google-drive': {
                    const files = await this.googleDrive.searchFiles(query, fileType);
                    return files.map(f => this.normalizeGoogleDriveFile(f));
                }
                case 'dropbox': {
                    const files = await this.dropbox.searchFiles(query);
                    return files.map(f => this.normalizeDropboxFile(f));
                }
                case 'onedrive': {
                    const files = await this.oneDrive.searchFiles(query);
                    return files.map(f => this.normalizeOneDriveFile(f));
                }
            }
        } catch (error) {
            console.error(`Failed to search in ${provider}:`, error);
            return [];
        }
    }

    /**
     * Create a folder in a specific provider
     */
    async createFolder(
        provider: CloudProvider,
        name: string,
        parentId?: string
    ): Promise<CloudFile> {
        switch (provider) {
            case 'google-drive': {
                const folder = await this.googleDrive.createFolder(name, parentId);
                return this.normalizeGoogleDriveFile(folder);
            }
            case 'dropbox': {
                const folder = await this.dropbox.createFolder(parentId ? `${parentId}/${name}` : `/${name}`);
                return this.normalizeDropboxFile(folder);
            }
            case 'onedrive': {
                const folder = await this.oneDrive.createFolder(name, parentId);
                return this.normalizeOneDriveFile(folder);
            }
        }
    }

    /**
     * Delete a file or folder
     */
    async deleteItem(provider: CloudProvider, itemId: string): Promise<void> {
        const connector = this.getConnector(provider);

        switch (provider) {
            case 'google-drive':
                await this.googleDrive.deleteFile(itemId);
                break;
            case 'dropbox':
                await this.dropbox.deleteItem(itemId);
                break;
            case 'onedrive':
                await this.oneDrive.deleteItem(itemId);
                break;
        }
    }

    /**
     * Create a sharing link
     */
    async createShareLink(
        provider: CloudProvider,
        itemId: string,
        options: { type: 'view' | 'edit' }
    ): Promise<string> {
        switch (provider) {
            case 'google-drive': {
                const result = await this.googleDrive.shareFile(itemId, options.type);
                return result.link;
            }
            case 'dropbox': {
                const result = await this.dropbox.createShareLink(itemId);
                return result.url;
            }
            case 'onedrive': {
                const result = await this.oneDrive.createShareLink(itemId, options);
                return result.link;
            }
        }
    }

    /**
     * Get storage quota for all providers
     */
    async getAllStorageQuotas(): Promise<
        Record<CloudProvider, { total: number; used: number; remaining: number }>
    > {
        const [googleQuota, dropboxQuota, oneDriveQuota] = await Promise.allSettled([
            this.googleDrive.getStorageQuota(),
            this.dropbox.getStorageQuota(),
            this.oneDrive.getStorageQuota(),
        ]);

        return {
            'google-drive': googleQuota.status === 'fulfilled'
                ? googleQuota.value
                : { total: 0, used: 0, remaining: 0 },
            'dropbox': dropboxQuota.status === 'fulfilled'
                ? dropboxQuota.value
                : { total: 0, used: 0, remaining: 0 },
            'onedrive': oneDriveQuota.status === 'fulfilled'
                ? oneDriveQuota.value
                : { total: 0, used: 0, remaining: 0 },
        };
    }

    /**
     * Normalize Google Drive file to common format
     */
    private normalizeGoogleDriveFile(file: any): CloudFile {
        return {
            id: file.id,
            name: file.name,
            size: parseInt(file.size || '0'),
            modifiedTime: file.modifiedTime,
            webUrl: file.webViewLink,
            isFolder: file.mimeType === 'application/vnd.google-apps.folder',
            provider: 'google-drive',
        };
    }

    /**
     * Normalize Dropbox file to common format
     */
    private normalizeDropboxFile(file: any): CloudFile {
        return {
            id: file.id,
            name: file.name,
            size: file.size || 0,
            modifiedTime: file.client_modified || file.server_modified,
            webUrl: file.path_display,
            isFolder: file['.tag'] === 'folder',
            provider: 'dropbox',
        };
    }

    /**
     * Normalize OneDrive file to common format
     */
    private normalizeOneDriveFile(file: any): CloudFile {
        return {
            id: file.id,
            name: file.name,
            size: file.size || 0,
            modifiedTime: file.lastModifiedDateTime,
            webUrl: file.webUrl,
            isFolder: !!file.folder,
            provider: 'onedrive',
        };
    }

    /**
     * Sync a file across multiple providers
     */
    async syncFileAcrossProviders(
        sourceProvider: CloudProvider,
        sourceFileId: string,
        targetProviders: CloudProvider[]
    ): Promise<Record<CloudProvider, CloudFile>> {
        // Download from source
        const fileBlob = await this.downloadFile(sourceProvider, sourceFileId);

        // Get file metadata from source
        let fileName = 'synced-file';
        switch (sourceProvider) {
            case 'google-drive': {
                const metadata = await this.googleDrive.getFileMetadata(sourceFileId);
                fileName = metadata.name;
                break;
            }
            case 'dropbox': {
                const metadata = await this.dropbox.getFileMetadata(sourceFileId);
                fileName = metadata.name;
                break;
            }
            case 'onedrive': {
                const metadata = await this.oneDrive.getFileMetadata(sourceFileId);
                fileName = metadata.name;
                break;
            }
        }

        // Upload to target providers
        const results: Record<string, CloudFile> = {};

        for (const targetProvider of targetProviders) {
            if (targetProvider !== sourceProvider) {
                try {
                    const uploadedFile = await this.uploadFile(targetProvider, {
                        name: fileName,
                        content: fileBlob,
                    });
                    results[targetProvider] = uploadedFile;
                } catch (error) {
                    console.error(`Failed to sync to ${targetProvider}:`, error);
                }
            }
        }

        return results as Record<CloudProvider, CloudFile>;
    }
}
