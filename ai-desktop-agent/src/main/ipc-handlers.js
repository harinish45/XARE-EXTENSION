const { ipcMain } = require('electron');
const AIEngine = require('../agent/ai-engine');
const ActionExecutor = require('../automation/action-executor');
const ScreenController = require('../controllers/screen-controller');

class IPCHandlers {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.aiEngine = null;
        this.actionExecutor = null;
        this.screenController = null;
    }

    register() {
        // Initialize controllers
        this.initializeControllers();

        // Chat with AI
        ipcMain.handle('ai:chat', async (event, message) => {
            try {
                const activeWindow = await this.screenController.getActiveWindow();
                const response = await this.aiEngine.chat(message, { activeWindow });
                return response;
            } catch (error) {
                console.error('AI chat error:', error);
                return { error: error.message };
            }
        });

        // Execute action
        ipcMain.handle('action:execute', async (event, action) => {
            try {
                const result = await this.actionExecutor.execute(action);
                return result;
            } catch (error) {
                console.error('Action execution error:', error);
                return { success: false, error: error.message };
            }
        });

        // Execute sequence of actions
        ipcMain.handle('action:execute-sequence', async (event, actions) => {
            try {
                const results = await this.actionExecutor.executeSequence(actions);
                return { success: true, results };
            } catch (error) {
                console.error('Action sequence execution error:', error);
                return { success: false, error: error.message };
            }
        });

        // Capture screen
        ipcMain.handle('screen:capture', async () => {
            try {
                const base64 = await this.screenController.captureToBase64();
                return { success: true, image: base64 };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Analyze screen with AI
        ipcMain.handle('screen:analyze', async (event, question) => {
            try {
                const base64 = await this.screenController.captureToBase64();
                const analysis = await this.aiEngine.analyzeScreen(base64, question);
                return { success: true, analysis };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Get active window info
        ipcMain.handle('window:get-active', async () => {
            try {
                const window = await this.screenController.getActiveWindow();
                return { success: true, window };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Window controls
        ipcMain.on('window:minimize', () => {
            this.windowManager.getWindow().hide();
        });

        ipcMain.on('window:close', () => {
            this.windowManager.getWindow().hide();
        });

        // Clear AI conversation history
        ipcMain.handle('ai:clear-history', async () => {
            try {
                this.aiEngine.clearHistory();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Get available actions
        ipcMain.handle('actions:get-available', async () => {
            try {
                const actions = this.actionExecutor.getAvailableActions();
                return { success: true, actions };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        console.log('IPC handlers registered');
    }

    async initializeControllers() {
        try {
            this.aiEngine = new AIEngine({
                anthropicKey: process.env.ANTHROPIC_API_KEY,
                openaiKey: process.env.OPENAI_API_KEY,
                defaultProvider: process.env.DEFAULT_PROVIDER || 'anthropic'
            });

            this.actionExecutor = new ActionExecutor();
            this.screenController = new ScreenController();
            await this.screenController.initialize();

            console.log('Controllers initialized successfully');
        } catch (error) {
            console.error('Failed to initialize controllers:', error);
        }
    }

    unregister() {
        // Remove all IPC handlers
        ipcMain.removeAllListeners();
        console.log('IPC handlers unregistered');
    }
}

module.exports = IPCHandlers;
