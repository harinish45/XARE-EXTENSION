const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AppController {
    constructor() {
        // Initialize app controller
    }

    async openApplication(appName) {
        try {
            // Platform-specific app launching
            const command = this.getOpenCommand(appName);
            await execAsync(command);
            return true;
        } catch (error) {
            throw new Error(`Failed to open application: ${error.message}`);
        }
    }

    async closeApplication(appName) {
        try {
            // Platform-specific app closing
            const command = this.getCloseCommand(appName);
            await execAsync(command);
            return true;
        } catch (error) {
            throw new Error(`Failed to close application: ${error.message}`);
        }
    }

    async isAppRunning(appName) {
        try {
            // Check if app is running
            const command = this.getCheckCommand(appName);
            const { stdout } = await execAsync(command);
            return stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    getOpenCommand(appName) {
        const platform = process.platform;

        switch (platform) {
            case 'win32':
                return `start "" "${appName}"`;
            case 'darwin':
                return `open -a "${appName}"`;
            case 'linux':
                return `${appName} &`;
            default:
                return appName;
        }
    }

    getCloseCommand(appName) {
        const platform = process.platform;

        switch (platform) {
            case 'win32':
                return `taskkill /IM "${appName}.exe" /F`;
            case 'darwin':
                return `pkill -f "${appName}"`;
            case 'linux':
                return `pkill -f "${appName}"`;
            default:
                return `pkill -f "${appName}"`;
        }
    }

    getCheckCommand(appName) {
        const platform = process.platform;

        switch (platform) {
            case 'win32':
                return `tasklist | findstr /i "${appName}.exe"`;
            case 'darwin':
                return `pgrep -f "${appName}"`;
            case 'linux':
                return `pgrep -f "${appName}"`;
            default:
                return `pgrep -f "${appName}"`;
        }
    }
}

module.exports = AppController;
