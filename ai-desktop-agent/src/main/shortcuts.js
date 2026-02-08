const { globalShortcut } = require('electron');

class ShortcutManager {
    constructor(windowManager) {
        this.windowManager = windowManager;
    }

    register() {
        // Toggle window visibility
        globalShortcut.register('CommandOrControl+Shift+Space', () => {
            this.windowManager.toggleWindow();
        });

        // Quick screenshot + AI analysis
        globalShortcut.register('CommandOrControl+Shift+S', () => {
            this.captureAndAnalyze();
        });

        // Emergency stop
        globalShortcut.register('CommandOrControl+Shift+Escape', () => {
            this.emergencyStop();
        });

        console.log('Global shortcuts registered');
    }

    unregisterAll() {
        globalShortcut.unregisterAll();
        console.log('Global shortcuts unregistered');
    }

    captureAndAnalyze() {
        // Implementation in automation section
        console.log('Capture and analyze triggered');
        // This will be connected to the screen controller and AI engine
    }

    emergencyStop() {
        // Stop all running automations
        console.log('Emergency stop triggered');
        // This will stop all running workflows and actions
    }
}

module.exports = ShortcutManager;
