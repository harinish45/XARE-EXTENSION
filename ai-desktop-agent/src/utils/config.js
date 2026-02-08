require('dotenv').config();

class Config {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        return {
            // AI Configuration
            anthropicKey: process.env.ANTHROPIC_API_KEY || '',
            openaiKey: process.env.OPENAI_API_KEY || '',
            defaultProvider: process.env.DEFAULT_PROVIDER || 'anthropic',

            // App Configuration
            logLevel: process.env.LOG_LEVEL || 'info',
            nodeEnv: process.env.NODE_ENV || 'development',

            // Window Configuration
            windowWidth: parseInt(process.env.WINDOW_WIDTH) || 400,
            windowHeight: parseInt(process.env.WINDOW_HEIGHT) || 600,
            windowTransparent: process.env.WINDOW_TRANSPARENT !== 'false',
            windowAlwaysOnTop: process.env.WINDOW_ALWAYS_ON_TOP !== 'false',

            // Automation Configuration
            maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS) || 1,
            actionDelay: parseInt(process.env.ACTION_DELAY) || 100,
            enableConfirmation: process.env.ENABLE_CONFIRMATION !== 'false',

            // Storage Configuration
            dataDir: process.env.DATA_DIR || this.getDefaultDataDir(),
            enableVectorStore: process.env.ENABLE_VECTOR_STORE !== 'false',

            // Security Configuration
            enableSafetyChecks: process.env.ENABLE_SAFETY_CHECKS !== 'false',
            allowedActions: process.env.ALLOWED_ACTIONS ? process.env.ALLOWED_ACTIONS.split(',') : null,
            blockedActions: process.env.BLOCKED_ACTIONS ? process.env.BLOCKED_ACTIONS.split(',') : [],

            // Feature Flags
            enableBrowserAutomation: process.env.ENABLE_BROWSER_AUTOMATION !== 'false',
            enableFileOperations: process.env.ENABLE_FILE_OPERATIONS !== 'false',
            enableSystemCommands: process.env.ENABLE_SYSTEM_COMMANDS !== 'false',

            // Hotkeys
            hotkeyToggle: process.env.HOTKEY_TOGGLE || 'CommandOrControl+Shift+Space',
            hotkeyScreenshot: process.env.HOTKEY_SCREENSHOT || 'CommandOrControl+Shift+S',
            hotkeyEmergency: process.env.HOTKEY_EMERGENCY || 'CommandOrControl+Shift+Escape'
        };
    }

    getDefaultDataDir() {
        const platform = process.platform;
        const baseDir = process.env.APPDATA || process.env.HOME;

        switch (platform) {
            case 'win32':
                return path.join(baseDir, 'ai-desktop-agent');
            case 'darwin':
                return path.join(baseDir, 'Library', 'Application Support', 'ai-desktop-agent');
            case 'linux':
                return path.join(baseDir, '.config', 'ai-desktop-agent');
            default:
                return path.join(baseDir, '.ai-desktop-agent');
        }
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
    }

    getAll() {
        return { ...this.config };
    }

    validate() {
        const errors = [];
        const warnings = [];

        // Check API keys
        if (!this.config.anthropicKey && !this.config.openaiKey) {
            errors.push('No API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env file.');
        }

        // Check numeric values
        if (this.config.windowWidth < 200 || this.config.windowWidth > 2000) {
            warnings.push('Window width should be between 200 and 2000');
        }

        if (this.config.windowHeight < 200 || this.config.windowHeight > 2000) {
            warnings.push('Window height should be between 200 and 2000');
        }

        if (this.config.maxConcurrentTasks < 1 || this.config.maxConcurrentTasks > 10) {
            warnings.push('Max concurrent tasks should be between 1 and 10');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    isProduction() {
        return this.config.nodeEnv === 'production';
    }

    isDevelopment() {
        return this.config.nodeEnv === 'development';
    }
}

// Singleton instance
const config = new Config();

module.exports = config;
