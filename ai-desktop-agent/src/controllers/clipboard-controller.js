const clipboardy = require('clipboardy');

class ClipboardController {
    constructor() {
        // Initialize clipboard controller
    }

    async read() {
        try {
            const text = await clipboardy.read();
            return text;
        } catch (error) {
            throw new Error(`Failed to read clipboard: ${error.message}`);
        }
    }

    async write(text) {
        try {
            await clipboardy.write(text);
            return true;
        } catch (error) {
            throw new Error(`Failed to write to clipboard: ${error.message}`);
        }
    }

    async clear() {
        try {
            await clipboardy.write('');
            return true;
        } catch (error) {
            throw new Error(`Failed to clear clipboard: ${error.message}`);
        }
    }
}

module.exports = ClipboardController;
