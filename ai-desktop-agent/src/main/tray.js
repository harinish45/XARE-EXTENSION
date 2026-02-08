const { Tray, Menu, app } = require('electron');
const path = require('path');

class TrayManager {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.tray = null;
    }

    create() {
        // Use a default icon or create one
        const iconPath = path.join(__dirname, '../../assets/icon.png');

        try {
            this.tray = new Tray(iconPath);
        } catch (error) {
            console.warn('Could not load tray icon, using default');
            // Fallback - Electron will use a default icon
            this.tray = new Tray(null);
        }

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show Agent',
                click: () => this.windowManager.toggleWindow()
            },
            {
                label: 'Quick Actions',
                submenu: [
                    {
                        label: 'Screenshot & Analyze',
                        click: () => this.triggerQuickAction('screenshot')
                    },
                    {
                        label: 'Organize Downloads',
                        click: () => this.triggerQuickAction('organize')
                    },
                    {
                        label: 'Email Summary',
                        click: () => this.triggerQuickAction('email')
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => this.openSettings()
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => app.quit()
            }
        ]);

        this.tray.setContextMenu(contextMenu);
        this.tray.setToolTip('AI Desktop Agent');

        // Double-click to show window
        this.tray.on('double-click', () => {
            this.windowManager.toggleWindow();
        });

        console.log('System tray created');
    }

    triggerQuickAction(action) {
        // This will be connected to the automation engine
        console.log(`Quick action triggered: ${action}`);
        // Implementation will be added when automation engine is ready
    }

    openSettings() {
        // Show the window and navigate to settings
        if (!this.windowManager.getWindow().isVisible()) {
            this.windowManager.toggleWindow();
        }
        // Send IPC message to renderer to show settings
        this.windowManager.getWindow().webContents.send('show-settings');
    }
}

module.exports = TrayManager;
