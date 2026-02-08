const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
    constructor() {
        this.floatingWindow = null;
    }

    createFloatingWindow() {
        this.floatingWindow = new BrowserWindow({
            width: 400,
            height: 600,
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
