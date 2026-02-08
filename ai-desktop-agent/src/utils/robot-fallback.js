/**
 * RobotJS Fallback Module
 * 
 * This module provides a fallback when robotjs is not available.
 * It logs actions instead of executing them, allowing the app to run
 * without the native robotjs dependency.
 * 
 * To enable full functionality, install robotjs:
 * npm install robotjs
 * npx electron-rebuild
 */

let robot;
let isRobotAvailable = false;

try {
    robot = require('robotjs');
    isRobotAvailable = true;
    console.log('✅ RobotJS loaded successfully');
} catch (error) {
    console.warn('⚠️  RobotJS not available. Using fallback mode.');
    console.warn('   Mouse and keyboard automation will be simulated.');
    console.warn('   To enable full functionality, run:');
    console.warn('   npm install robotjs && npx electron-rebuild');

    // Create mock robot object
    robot = {
        // Mouse functions
        moveMouse: (x, y) => {
            console.log(`[MOCK] Move mouse to (${x}, ${y})`);
        },

        mouseClick: (button = 'left', double = false) => {
            console.log(`[MOCK] ${double ? 'Double-' : ''}Click ${button} mouse button`);
        },

        mouseToggle: (down = 'down', button = 'left') => {
            console.log(`[MOCK] Mouse ${down} ${button} button`);
        },

        dragMouse: (x, y) => {
            console.log(`[MOCK] Drag mouse to (${x}, ${y})`);
        },

        scrollMouse: (x, y) => {
            console.log(`[MOCK] Scroll mouse (${x}, ${y})`);
        },

        getMousePos: () => {
            console.log('[MOCK] Get mouse position');
            return { x: 0, y: 0 };
        },

        // Keyboard functions
        keyTap: (key, modifier) => {
            const modStr = modifier ? ` with ${modifier}` : '';
            console.log(`[MOCK] Key tap: ${key}${modStr}`);
        },

        keyToggle: (key, down, modifier) => {
            const modStr = modifier ? ` with ${modifier}` : '';
            console.log(`[MOCK] Key ${down}: ${key}${modStr}`);
        },

        typeString: (string) => {
            console.log(`[MOCK] Type string: "${string}"`);
        },

        typeStringDelayed: (string, cpm) => {
            console.log(`[MOCK] Type string delayed (${cpm} cpm): "${string}"`);
        },

        // Screen functions
        screen: {
            capture: (x = 0, y = 0, width = 1920, height = 1080) => {
                console.log(`[MOCK] Capture screen region (${x}, ${y}, ${width}, ${height})`);
                return {
                    width,
                    height,
                    image: Buffer.alloc(width * height * 4),
                    colorAt: (x, y) => '000000'
                };
            }
        },

        getScreenSize: () => {
            console.log('[MOCK] Get screen size');
            return { width: 1920, height: 1080 };
        },

        getPixelColor: (x, y) => {
            console.log(`[MOCK] Get pixel color at (${x}, ${y})`);
            return '000000';
        },

        // Configuration functions
        setMouseDelay: (delay) => {
            console.log(`[MOCK] Set mouse delay: ${delay}ms`);
        },

        setKeyboardDelay: (delay) => {
            console.log(`[MOCK] Set keyboard delay: ${delay}ms`);
        }
    };
}

// Export the robot object and availability flag
module.exports = robot;
module.exports.isRobotAvailable = isRobotAvailable;
module.exports.getRobotStatus = () => ({
    available: isRobotAvailable,
    message: isRobotAvailable
        ? 'RobotJS is available - full automation enabled'
        : 'RobotJS not available - using fallback mode (actions will be logged but not executed)'
});
