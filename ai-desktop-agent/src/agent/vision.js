/**
 * Vision AI Module
 * Handles image analysis and visual understanding capabilities
 */

class VisionAI {
    constructor(aiEngine) {
        this.aiEngine = aiEngine;
    }

    /**
     * Analyze a screenshot and extract information
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @param {string} question - Question to ask about the screenshot
     * @returns {Promise<string>} Analysis result
     */
    async analyzeScreenshot(screenshotBase64, question) {
        return await this.aiEngine.analyzeScreen(screenshotBase64, question);
    }

    /**
     * Find UI elements on screen
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @param {string} elementType - Type of element to find (button, input, etc.)
     * @returns {Promise<Array>} Array of found elements with coordinates
     */
    async findUIElements(screenshotBase64, elementType) {
        const question = `Find all ${elementType} elements on this screen. Return their coordinates in the format: [{"x": number, "y": number, "width": number, "height": number, "label": "text"}]`;
        const response = await this.aiEngine.analyzeScreen(screenshotBase64, question);

        try {
            // Try to parse JSON response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Failed to parse UI elements:', error);
        }

        return [];
    }

    /**
     * Read text from a specific region of the screen
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @param {Object} region - Region coordinates {x, y, width, height}
     * @returns {Promise<string>} Extracted text
     */
    async readTextFromRegion(screenshotBase64, region) {
        const question = `Read all text in the region at x=${region.x}, y=${region.y}, width=${region.width}, height=${region.height}. Return only the text content.`;
        return await this.aiEngine.analyzeScreen(screenshotBase64, question);
    }

    /**
     * Compare two screenshots and identify differences
     * @param {string} screenshot1Base64 - First screenshot
     * @param {string} screenshot2Base64 - Second screenshot
     * @returns {Promise<string>} Description of differences
     */
    async compareScreenshots(screenshot1Base64, screenshot2Base64) {
        // Note: This would require multi-image support from the AI provider
        // For now, we'll describe each separately
        const desc1 = await this.aiEngine.analyzeScreen(screenshot1Base64, 'Describe this screenshot in detail.');
        const desc2 = await this.aiEngine.analyzeScreen(screenshot2Base64, 'Describe this screenshot in detail.');

        return `Screenshot 1: ${desc1}\n\nScreenshot 2: ${desc2}`;
    }

    /**
     * Detect if a specific element is visible on screen
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @param {string} elementDescription - Description of element to find
     * @returns {Promise<boolean>} True if element is found
     */
    async isElementVisible(screenshotBase64, elementDescription) {
        const question = `Is there a ${elementDescription} visible on this screen? Answer with "yes" or "no" only.`;
        const response = await this.aiEngine.analyzeScreen(screenshotBase64, question);
        return response.toLowerCase().includes('yes');
    }

    /**
     * Get the coordinates of a specific element
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @param {string} elementDescription - Description of element to find
     * @returns {Promise<Object|null>} Coordinates {x, y} or null if not found
     */
    async getElementCoordinates(screenshotBase64, elementDescription) {
        const question = `Find the ${elementDescription} on this screen and return its center coordinates in the format: {"x": number, "y": number}. If not found, return null.`;
        const response = await this.aiEngine.analyzeScreen(screenshotBase64, question);

        try {
            const jsonMatch = response.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Failed to parse element coordinates:', error);
        }

        return null;
    }

    /**
     * Analyze the current screen state
     * @param {string} screenshotBase64 - Base64 encoded screenshot
     * @returns {Promise<Object>} Screen state information
     */
    async analyzeScreenState(screenshotBase64) {
        const question = `Analyze this screen and provide:
1. What application is this?
2. What is the main content?
3. What interactive elements are visible?
4. What is the current state (loading, error, success, etc.)?

Return as JSON with keys: application, content, elements, state`;
        const response = await this.aiEngine.analyzeScreen(screenshotBase64, question);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Failed to parse screen state:', error);
        }

        return {
            application: 'Unknown',
            content: response,
            elements: [],
            state: 'unknown'
        };
    }
}

module.exports = VisionAI;
