const { ipcMain } = require('electron');
const ScreenController = require('../controllers/screen-controller');
const InputController = require('../controllers/input-controller');
const FileController = require('../controllers/file-controller');
const BrowserController = require('../controllers/browser-controller');
const AppController = require('../controllers/app-controller');
const ClipboardController = require('../controllers/clipboard-controller');
const WindowController = require('../controllers/window-controller');
const ActionExecutor = require('../automation/action-executor');
const AIEngine = require('../agent/ai-engine');
const MemoryManager = require('../agent/memory-manager');
const TaskPlanner = require('../agent/task-planner');
const VisionAI = require('../agent/vision');
require('dotenv').config();

class IPCHandlers {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.screenController = null;
        this.inputController = null;
        this.fileController = null;
        this.browserController = null;
        this.appController = null;
        this.clipboardController = null;
        this.windowController = null;
        this.actionExecutor = null;
        this.aiEngine = null;
        this.memoryManager = null;
        this.taskPlanner = null;
        this.visionAI = null;
    }

    register() {
        // Initialize controllers
        this.initializeControllers();

        // Chat with AI
        ipcMain.handle('ai:chat', async (event, message) => {
            try {
                if (!this.aiEngine) {
                    return { text: "AI engine not initialized. Please configure API keys in .env file." };
                }

                const activeWindow = await this.screenController.getActiveWindow();
                const context = {
                    activeWindow,
                    screenSize: this.inputController ? this.inputController.getScreenSize() : { width: 1920, height: 1080 }
                };

                const response = await this.aiEngine.chat(message, context);

                // Store in memory
                if (this.memoryManager) {
                    this.memoryManager.addMessage('user', message);
                    this.memoryManager.addMessage('assistant', response.text);
                }

                return response;
            } catch (error) {
                console.error('AI chat error:', error);
                return { error: error.message };
            }
        });

        // Execute action
        ipcMain.handle('action:execute', async (event, action) => {
            try {
                if (!this.actionExecutor) {
                    return { success: false, error: "Action executor not initialized" };
                }
                return await this.actionExecutor.execute(action);
            } catch (error) {
                console.error('Action execution error:', error);
                return { success: false, error: error.message };
            }
        });

        // Execute sequence of actions
        ipcMain.handle('action:execute-sequence', async (event, actions) => {
            try {
                if (!this.actionExecutor) {
                    return { success: false, error: "Action executor not initialized" };
                }
                return await this.actionExecutor.executeSequence(actions);
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
                if (!this.aiEngine || !this.visionAI) {
                    return { success: false, error: "AI engine not initialized. Please configure API keys." };
                }

                const base64 = await this.screenController.captureToBase64();
                const analysis = await this.visionAI.analyzeScreenshot(base64, question);
                return { success: true, analysis };
            } catch (error) {
                console.error('Screen analysis error:', error);
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

        // List all windows
        ipcMain.handle('window:list', async () => {
            try {
                if (!this.windowController) {
                    return { success: false, error: "Window controller not initialized" };
                }
                const windows = await this.windowController.getWindows();
                return { success: true, windows };
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

        ipcMain.on('window:resize', (event, { width, height }) => {
            const window = this.windowManager.getWindow();
            window.setSize(width, height);
            window.center();
        });

        // Clear AI conversation history
        ipcMain.handle('ai:clear-history', async () => {
            try {
                if (this.memoryManager) {
                    this.memoryManager.clearHistory();
                }
                if (this.aiEngine) {
                    this.aiEngine.clearHistory();
                }
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Get available actions
        ipcMain.handle('actions:get-available', async () => {
            try {
                if (!this.actionExecutor) {
                    return { success: false, error: "Action executor not initialized" };
                }
                const actions = this.actionExecutor.getAvailableActions();
                return { success: true, actions };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Plan a task
        ipcMain.handle('task:plan', async (event, taskDescription) => {
            try {
                if (!this.taskPlanner || !this.aiEngine) {
                    return { success: false, error: "Task planner not initialized" };
                }

                const activeWindow = await this.screenController.getActiveWindow();
                const context = {
                    activeWindow,
                    screenSize: this.inputController ? this.inputController.getScreenSize() : { width: 1920, height: 1080 }
                };

                const plan = await this.taskPlanner.planTask(taskDescription, context);
                return plan;
            } catch (error) {
                console.error('Task planning error:', error);
                return { success: false, error: error.message };
            }
        });

        // Get memory stats
        ipcMain.handle('memory:get-stats', async () => {
            try {
                if (!this.memoryManager) {
                    return { success: false, error: "Memory manager not initialized" };
                }
                const stats = this.memoryManager.getStats();
                return { success: true, stats };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Get AI providers
        ipcMain.handle('ai:get-providers', async () => {
            try {
                if (!this.aiEngine) {
                    return { success: false, error: "AI engine not initialized" };
                }
                const providers = this.aiEngine.getAvailableProviders();
                return { success: true, providers };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        console.log('IPC handlers registered');
    }

    async initializeControllers() {
        try {
            // Initialize basic controllers
            this.screenController = new ScreenController();
            await this.screenController.initialize();

            // Try to initialize input controller (requires robotjs which may not be installed)
            try {
                this.inputController = new InputController();
                console.log('Input controller initialized');
            } catch (error) {
                console.warn('Input controller not available (robotjs not installed):', error.message);
            }

            this.fileController = new FileController();
            this.browserController = new BrowserController();
            await this.browserController.initialize();
            this.appController = new AppController();
            this.clipboardController = new ClipboardController();
            this.windowController = new WindowController();

            // Initialize action executor
            this.actionExecutor = new ActionExecutor();

            // Initialize AI components if API keys are available
            const config = {
                anthropicKey: process.env.ANTHROPIC_API_KEY,
                openaiKey: process.env.OPENAI_API_KEY,
                defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'anthropic'
            };

            if (config.anthropicKey || config.openaiKey) {
                this.aiEngine = new AIEngine(config);
                this.memoryManager = new MemoryManager();
                this.taskPlanner = new TaskPlanner(this.aiEngine);
                this.visionAI = new VisionAI(this.aiEngine);
                console.log('AI components initialized');
            } else {
                console.warn('No API keys found. AI features will be limited.');
            }

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
