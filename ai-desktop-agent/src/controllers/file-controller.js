const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class FileController {
    constructor() {
        // Initialize file controller
    }

    async readFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }

    async writeFile(filePath, content) {
        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            await fs.ensureDir(dir);

            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        } catch (error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
    }

    async copyFile(from, to) {
        try {
            await fs.copy(from, to);
            return true;
        } catch (error) {
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }

    async moveFile(from, to) {
        try {
            await fs.move(from, to);
            return true;
        } catch (error) {
            throw new Error(`Failed to move file: ${error.message}`);
        }
    }

    async deleteFile(filePath) {
        try {
            await fs.remove(filePath);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    async searchFiles(pattern, directory = '.') {
        return new Promise((resolve, reject) => {
            glob(pattern, { cwd: directory }, (error, files) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(files);
                }
            });
        });
    }

    async listFiles(directory) {
        try {
            const files = await fs.readdir(directory);
            return files;
        } catch (error) {
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }

    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile()
            };
        } catch (error) {
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    async createDirectory(dirPath) {
        try {
            await fs.ensureDir(dirPath);
            return true;
        } catch (error) {
            throw new Error(`Failed to create directory: ${error.message}`);
        }
    }
}

module.exports = FileController;
