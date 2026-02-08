const robot = require('robotjs');

class InputController {
    constructor() {
        // Configure robot.js speed
        robot.setMouseDelay(2);
        robot.setKeyboardDelay(10);
    }

    // Mouse Actions
    async moveMouse(x, y, smooth = true) {
        robot.moveMouse(x, y);
    }

    async clickMouse(button = 'left', doubleClick = false) {
        if (doubleClick) {
            robot.mouseClick(button, true);
        } else {
            robot.mouseClick(button);
        }
    }

    async dragMouse(startX, startY, endX, endY) {
        robot.moveMouse(startX, startY);
        robot.mouseToggle('down');
        robot.dragMouse(endX, endY);
        robot.mouseToggle('up');
    }

    async scrollMouse(amount, direction = 'down') {
        const scrollAmount = direction === 'down' ? -amount : amount;
        robot.scrollMouse(0, scrollAmount);
    }

    // Keyboard Actions
    async typeText(text, delay = 10) {
        robot.setKeyboardDelay(delay);
        robot.typeString(text);
    }

    async pressKey(key, modifiers = []) {
        if (modifiers.length > 0) {
            robot.keyTap(key, modifiers);
        } else {
            robot.keyTap(key);
        }
    }

    async pressShortcut(shortcut) {
        // shortcut format: "ctrl+c", "alt+tab", etc.
        const parts = shortcut.toLowerCase().split('+');
        const key = parts.pop();
        const modifiers = parts;

        robot.keyTap(key, modifiers);
    }

    async holdKey(key, duration = 1000) {
        robot.keyToggle(key, 'down');
        await this.sleep(duration);
        robot.keyToggle(key, 'up');
    }

    // Utility
    getMousePosition() {
        const pos = robot.getMousePos();
        return { x: pos.x, y: pos.y };
    }

    getScreenSize() {
        const size = robot.getScreenSize();
        return { width: size.width, height: size.height };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = InputController;
