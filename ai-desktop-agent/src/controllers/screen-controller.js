const screenshot = require('screenshot-desktop');
const activeWin = require('active-win');

class ScreenController {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        this.initialized = true;
    }

    async captureScreen(displayIndex = 0) {
        try {
            const imgBuffer = await screenshot({ screen: displayIndex });
            return imgBuffer;
        } catch (error) {
            console.error('Screenshot failed:', error);
            throw error;
        }
    }

    async captureRegion(x, y, width, height) {
        const fullScreen = await this.captureScreen();

        // Note: This would require sharp for cropping
        // For now, return the full screen
        return fullScreen;
    }

    async extractText(imageBuffer) {
        // OCR functionality would be implemented here with Tesseract.js
        // For now, return placeholder
        console.log('OCR extraction called - implement with Tesseract.js');
        return '';
    }

    async findTextOnScreen(searchText) {
        const screenshot = await this.captureScreen();
        const text = await this.extractText(screenshot);

        return text.includes(searchText);
    }

    async getActiveWindow() {
        try {
            const window = await activeWin();
            return {
                title: window.title,
                owner: window.owner.name,
                bounds: window.bounds,
                id: window.id
            };
        } catch (error) {
            console.error('Failed to get active window:', error);
            return null;
        }
    }

    async captureToBase64() {
        const imgBuffer = await this.captureScreen();
        return imgBuffer.toString('base64');
    }

    async cleanup() {
        // Cleanup resources if needed
    }
}

module.exports = ScreenController;
