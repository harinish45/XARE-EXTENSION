const { app, BrowserWindow } = require('electron');
const path = require('path');
require('dotenv').config();

const WindowManager = require('./window-manager');
const ShortcutManager = require('./shortcuts');
const TrayManager = require('./tray');
const IPCHandlers = require('./ipc-handlers');

class DesktopAgent {
    constructor() {
        this.windowManager = null;
        this.shortcutManager = null;
        this.trayManager = null;
        this.ipcHandlers = null;
    }

    async initialize() {
        // Create window
        this.windowManager = new WindowManager();
        this.windowManager.createFloatingWindow();

        // Setup IPC handlers
        this.ipcHandlers = new IPCHandlers(this.windowManager);
        this.ipcHandlers.register();

        // Register global shortcuts
        this.shortcutManager = new ShortcutManager(this.windowManager);
        this.shortcutManager.register();

        // Create system tray
        this.trayManager = new TrayManager(this.windowManager);
        this.trayManager.create();

        console.log('AI Desktop Agent initialized');
    }

    cleanup() {
        if (this.shortcutManager) {
            this.shortcutManager.unregisterAll();
        }
    }
}

// App lifecycle
let agent;

app.whenReady().then(async () => {
    agent = new DesktopAgent();
    await agent.initialize();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            agent.windowManager.createFloatingWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Don't quit on macOS
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (agent) {
        agent.cleanup();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
