const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
    constructor() {
        this.floatingWindow = null;
    }

    createFloatingWindow() {
        this.floatingWindow = new BrowserWindow({
            width: 200,                // Start small for icon
            height: 200,
            frame: false,              // No title bar
            transparent: true,         // Transparent background
            alwaysOnTop: true,        // Always visible
            skipTaskbar: true,        // Don't show in taskbar
            resizable: true,
            movable: true,
            hasShadow: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        this.floatingWindow.loadFile('src/renderer/index.html');

        // Open DevTools in development mode
        if (process.argv.includes('--dev')) {
            this.floatingWindow.webContents.openDevTools({ mode: 'detach' });
        }

        // Make window draggable
        this.floatingWindow.setAlwaysOnTop(true, 'floating');

        // Hide instead of close
        this.floatingWindow.on('close', (e) => {
            e.preventDefault();
            this.floatingWindow.hide();
        });

        return this.floatingWindow;
    }

    toggleWindow() {
        if (this.floatingWindow.isVisible()) {
            this.floatingWindow.hide();
        } else {
            this.floatingWindow.show();
            this.floatingWindow.focus();
        }
    }

    getWindow() {
        return this.floatingWindow;
    }
}

module.exports = WindowManager;
