const robot = require('../utils/robot-fallback');

class InputController {
    constructor() {
        // Configure robot.js speed
        robot.setMouseDelay(2);
        robot.setKeyboardDelay(10);

        // Human-like movement configuration
        this.movementConfig = {
            minSpeed: 0.5,          // Minimum speed multiplier
            maxSpeed: 2.0,          // Maximum speed multiplier
            baseSteps: 100,         // Base number of steps for movement
            jitterAmount: 2,        // Pixels of random jitter
            pauseProbability: 0.1,  // Chance of micro-pause during movement
            overshootChance: 0.15,  // Chance of slight overshoot
            overshootAmount: 5      // Pixels of overshoot
        };
    }

    // Mouse Actions
    async moveMouse(x, y, smooth = true) {
        if (!smooth) {
            robot.moveMouse(x, y);
            return;
        }

        // Use human-like movement
        await this.moveMouseHumanLike(x, y);
    }

    /**
     * Move mouse with human-like Bezier curve path
     */
    async moveMouseHumanLike(targetX, targetY, options = {}) {
        const start = this.getMousePosition();
        const config = { ...this.movementConfig, ...options };

        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(targetX - start.x, 2) + Math.pow(targetY - start.y, 2)
        );

        if (distance < 5) {
            // Too close, just move directly
            robot.moveMouse(targetX, targetY);
            return;
        }

        // Generate Bezier curve control points
        const controlPoints = this.generateBezierControlPoints(
            start.x, start.y, targetX, targetY
        );

        // Calculate number of steps based on distance
        const steps = Math.max(
            config.baseSteps,
            Math.floor(distance / 2)
        );

        // Generate path points along Bezier curve
        const path = this.generateBezierPath(
            start.x, start.y,
            controlPoints.cp1x, controlPoints.cp1y,
            controlPoints.cp2x, controlPoints.cp2y,
            targetX, targetY,
            steps
        );

        // Move along path with variable speed and jitter
        for (let i = 0; i < path.length; i++) {
            const point = path[i];

            // Add micro-jitter
            const jitterX = (Math.random() - 0.5) * config.jitterAmount;
            const jitterY = (Math.random() - 0.5) * config.jitterAmount;

            robot.moveMouse(
                Math.round(point.x + jitterX),
                Math.round(point.y + jitterY)
            );

            // Variable delay based on position in path
            const progress = i / path.length;
            const speedMultiplier = this.getSpeedMultiplier(progress, config);
            const delay = Math.floor(10 / speedMultiplier);

            await this.sleep(delay);

            // Random micro-pauses
            if (Math.random() < config.pauseProbability) {
                await this.sleep(Math.random() * 50 + 20);
            }
        }

        // Possible overshoot and correction
        if (Math.random() < config.overshootChance) {
            const overshootX = targetX + (Math.random() - 0.5) * config.overshootAmount;
            const overshootY = targetY + (Math.random() - 0.5) * config.overshootAmount;

            robot.moveMouse(Math.round(overshootX), Math.round(overshootY));
            await this.sleep(50);
        }

        // Final position
        robot.moveMouse(targetX, targetY);
    }

    /**
     * Generate Bezier curve control points
     */
    generateBezierControlPoints(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Control point offset (20-40% of distance)
        const offsetRatio = 0.2 + Math.random() * 0.2;
        const offset = distance * offsetRatio;

        // Random angle variation
        const angleVariation = (Math.random() - 0.5) * Math.PI / 4;

        // First control point
        const cp1x = startX + dx * 0.33 + Math.cos(angleVariation) * offset;
        const cp1y = startY + dy * 0.33 + Math.sin(angleVariation) * offset;

        // Second control point
        const cp2x = startX + dx * 0.66 - Math.cos(angleVariation) * offset;
        const cp2y = startY + dy * 0.66 - Math.sin(angleVariation) * offset;

        return { cp1x, cp1y, cp2x, cp2y };
    }

    /**
     * Generate points along cubic Bezier curve
     */
    generateBezierPath(x0, y0, x1, y1, x2, y2, x3, y3, steps) {
        const path = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.cubicBezier(t, x0, y0, x1, y1, x2, y2, x3, y3);
            path.push(point);
        }

        return path;
    }

    /**
     * Calculate point on cubic Bezier curve
     */
    cubicBezier(t, x0, y0, x1, y1, x2, y2, x3, y3) {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        return {
            x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
            y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
        };
    }

    /**
     * Get speed multiplier based on progress (ease-in-out)
     */
    getSpeedMultiplier(progress, config) {
        // Start slow, speed up in middle, slow down at end
        let speed;

        if (progress < 0.2) {
            // Ease in
            speed = config.minSpeed + (progress / 0.2) * (config.maxSpeed - config.minSpeed);
        } else if (progress > 0.8) {
            // Ease out
            const easeOutProgress = (progress - 0.8) / 0.2;
            speed = config.maxSpeed - easeOutProgress * (config.maxSpeed - config.minSpeed);
        } else {
            // Full speed in middle
            speed = config.maxSpeed;
        }

        // Add slight random variation
        speed *= 0.9 + Math.random() * 0.2;

        return speed;
    }

    async clickMouse(button = 'left', doubleClick = false) {
        // Add slight pre-click delay for realism
        await this.sleep(Math.random() * 50 + 20);

        if (doubleClick) {
            robot.mouseClick(button, true);
        } else {
            robot.mouseClick(button);
        }

        // Add slight post-click delay
        await this.sleep(Math.random() * 30 + 10);
    }

    async dragMouse(startX, startY, endX, endY) {
        // Move to start position with human-like movement
        await this.moveMouseHumanLike(startX, startY);
        await this.sleep(100);

        robot.mouseToggle('down');
        await this.sleep(50);

        // Drag with human-like movement
        await this.moveMouseHumanLike(endX, endY, {
            minSpeed: 0.3,  // Slower during drag
            maxSpeed: 1.0
        });

        await this.sleep(50);
        robot.mouseToggle('up');
    }

    async scrollMouse(amount, direction = 'down') {
        const scrollAmount = direction === 'down' ? -amount : amount;

        // Break scroll into smaller chunks for realism
        const chunks = Math.ceil(Math.abs(amount) / 3);
        const chunkSize = Math.floor(scrollAmount / chunks);

        for (let i = 0; i < chunks; i++) {
            robot.scrollMouse(0, chunkSize);
            await this.sleep(Math.random() * 50 + 30);
        }
    }

    // Keyboard Actions
    async typeText(text, delay = 10) {
        // Variable typing speed for realism
        for (const char of text) {
            robot.typeString(char);

            // Variable delay between keystrokes
            const charDelay = delay + (Math.random() - 0.5) * delay * 0.5;
            await this.sleep(charDelay);

            // Occasional longer pause (thinking)
            if (Math.random() < 0.05) {
                await this.sleep(Math.random() * 200 + 100);
            }
        }
    }

    async pressKey(key, modifiers = []) {
        // Small delay before key press
        await this.sleep(Math.random() * 30 + 10);

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

        await this.sleep(Math.random() * 30 + 10);
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

    /**
     * Set movement configuration
     */
    setMovementConfig(config) {
        this.movementConfig = { ...this.movementConfig, ...config };
    }

    /**
     * Get movement configuration
     */
    getMovementConfig() {
        return { ...this.movementConfig };
    }
}

module.exports = InputController;
