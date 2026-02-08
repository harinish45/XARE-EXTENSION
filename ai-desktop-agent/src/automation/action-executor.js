const InputController = require('../controllers/input-controller');
const ScreenController = require('../controllers/screen-controller');
const FileController = require('../controllers/file-controller');
const BrowserController = require('../controllers/browser-controller');
const AppController = require('../controllers/app-controller');
const ClipboardController = require('../controllers/clipboard-controller');

class ActionExecutor {
    constructor() {
        this.inputController = new InputController();
        this.screenController = new ScreenController();
        this.fileController = new FileController();
        this.browserController = new BrowserController();
        this.appController = new AppController();
        this.clipboardController = new ClipboardController();

        this.actionMap = this.buildActionMap();
    }

    buildActionMap() {
        return {
            // Mouse actions
            'mouse_move': (params) => this.inputController.moveMouse(params.x, params.y),
            'mouse_click': (params) => this.inputController.clickMouse(params.button || 'left'),
            'mouse_drag': (params) => this.inputController.dragMouse(
                params.startX, params.startY, params.endX, params.endY
            ),
            'mouse_scroll': (params) => this.inputController.scrollMouse(params.amount),

            // Keyboard actions
            'keyboard_type': (params) => this.inputController.typeText(params.text),
            'keyboard_press': (params) => this.inputController.pressKey(params.key, params.modifiers || []),
            'keyboard_shortcut': (params) => this.inputController.pressShortcut(params.shortcut),

            // Screen actions
            'screen_capture': () => this.screenController.captureScreen(),
            'screen_ocr': async (params) => {
                const img = params.image || await this.screenController.captureScreen();
                return await this.screenController.extractText(img);
            },
            'screen_find_text': (params) => this.screenController.findTextOnScreen(params.text),

            // File actions
            'file_read': (params) => this.fileController.readFile(params.path),
            'file_write': (params) => this.fileController.writeFile(params.path, params.content),
            'file_copy': (params) => this.fileController.copyFile(params.from, params.to),
            'file_move': (params) => this.fileController.moveFile(params.from, params.to),
            'file_delete': (params) => this.fileController.deleteFile(params.path),
            'file_search': (params) => this.fileController.searchFiles(params.pattern, params.directory),

            // Browser actions
            'browser_navigate': (params) => this.browserController.navigate(params.url),
            'browser_click': (params) => this.browserController.clickElement(params.selector),
            'browser_type': (params) => this.browserController.typeInElement(params.selector, params.text),
            'browser_extract': (params) => this.browserController.extractData(params.selector),

            // App actions
            'app_open': (params) => this.appController.openApplication(params.name),
            'app_close': (params) => this.appController.closeApplication(params.name),

            // Clipboard actions
            'clipboard_read': () => this.clipboardController.read(),
            'clipboard_write': (params) => this.clipboardController.write(params.text),

            // Wait action
            'wait': (params) => this.sleep(params.ms || 1000)
        };
    }

    async execute(action) {
        const { type, params, requireConfirmation = false } = action;

        // Safety check for destructive actions
        if (requireConfirmation && !await this.confirmAction(action)) {
            throw new Error('Action cancelled by user');
        }

        const actionFunction = this.actionMap[type];

        if (!actionFunction) {
            throw new Error(`Unknown action type: ${type}`);
        }

        try {
            const result = await actionFunction(params);
            return {
                success: true,
                result,
                action: type
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                action: type
            };
        }
    }

    async executeSequence(actions) {
        const results = [];

        for (const action of actions) {
            const result = await this.execute(action);
            results.push(result);

            if (!result.success && action.stopOnError !== false) {
                break;
            }

            // Delay between actions if specified
            if (action.delay) {
                await this.sleep(action.delay);
            }
        }

        return results;
    }

    async confirmAction(action) {
        // This would show a confirmation dialog to user
        // Implementation depends on your UI
        return true; // Placeholder
    }

    getAvailableActions() {
        return Object.keys(this.actionMap);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ActionExecutor;
