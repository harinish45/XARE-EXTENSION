/**
 * Glowing Border Effect - JavaScript Controller
 * Handles mouse tracking and dynamic glow positioning
 */

class GlowingBorder {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            blur: options.blur || 0,
            inactiveZone: options.inactiveZone || 0.7,
            proximity: options.proximity || 64,
            spread: options.spread || 40,
            glow: options.glow !== false,
            disabled: options.disabled || false,
            movementDuration: options.movementDuration || 2000,
            borderWidth: options.borderWidth || 3,
            variant: options.variant || 'default'
        };

        this.lastPosition = { x: 0, y: 0 };
        this.animationFrame = null;
        this.currentAngle = 0;
        this.targetAngle = 0;
        this.animationStartTime = 0;
        this.animationStartAngle = 0;

        this.init();
    }

    init() {
        if (this.options.disabled) {
            return;
        }

        // Add CSS classes
        this.element.classList.add('glow-container');
        if (this.options.glow) {
            this.element.classList.add('glow-enabled', 'glow-active');
        }
        if (this.options.blur > 0) {
            this.element.classList.add('glow-blur');
        }
        if (this.options.variant === 'white') {
            this.element.classList.add('glow-white');
        }

        // Set CSS custom properties
        this.updateCSSProperties();

        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.animate = this.animate.bind(this);

        // Add event listeners
        document.body.addEventListener('mousemove', this.handleMouseMove, { passive: true });
        window.addEventListener('scroll', this.handleScroll, { passive: true });

        // Start animation loop
        this.startAnimation();
    }

    updateCSSProperties() {
        this.element.style.setProperty('--glow-blur', `${this.options.blur}px`);
        this.element.style.setProperty('--glow-spread', this.options.spread);
        this.element.style.setProperty('--glow-proximity', `${this.options.proximity}px`);
        this.element.style.setProperty('--glow-border-width', `${this.options.borderWidth}px`);
        this.element.style.setProperty('--glow-inactive-zone', this.options.inactiveZone);
        this.element.style.setProperty('--glow-active', '0');
        this.element.style.setProperty('--glow-angle', '0deg');
    }

    handleMouseMove(e) {
        this.lastPosition = { x: e.clientX, y: e.clientY };
        this.updateGlow(e.clientX, e.clientY);
    }

    handleScroll() {
        this.updateGlow(this.lastPosition.x, this.lastPosition.y);
    }

    updateGlow(mouseX, mouseY) {
        if (this.options.disabled) {
            return;
        }

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.5;
        const centerY = rect.top + rect.height * 0.5;

        // Calculate distance from center
        const distanceFromCenter = Math.hypot(mouseX - centerX, mouseY - centerY);
        const inactiveRadius = 0.5 * Math.min(rect.width, rect.height) * this.options.inactiveZone;

        // Check if in inactive zone
        if (distanceFromCenter < inactiveRadius) {
            this.element.style.setProperty('--glow-active', '0');
            return;
        }

        // Check if within proximity
        const isActive =
            mouseX > rect.left - this.options.proximity &&
            mouseX < rect.left + rect.width + this.options.proximity &&
            mouseY > rect.top - this.options.proximity &&
            mouseY < rect.top + rect.height + this.options.proximity;

        this.element.style.setProperty('--glow-active', isActive ? '1' : '0');

        if (!isActive) {
            return;
        }

        // Calculate angle
        let angle = (180 * Math.atan2(mouseY - centerY, mouseX - centerX)) / Math.PI + 90;

        // Normalize angle
        const angleDiff = ((angle - this.currentAngle + 180) % 360) - 180;
        this.targetAngle = this.currentAngle + angleDiff;

        // Start new animation
        this.animationStartTime = performance.now();
        this.animationStartAngle = this.currentAngle;
    }

    animate(timestamp) {
        if (this.options.disabled) {
            return;
        }

        // Calculate animation progress
        const elapsed = timestamp - this.animationStartTime;
        const progress = Math.min(elapsed / this.options.movementDuration, 1);

        // Easing function (cubic bezier approximation)
        const eased = this.easeOutCubic(progress);

        // Interpolate angle
        this.currentAngle = this.animationStartAngle + (this.targetAngle - this.animationStartAngle) * eased;

        // Update CSS
        this.element.style.setProperty('--glow-angle', `${this.currentAngle}deg`);

        // Continue animation
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    startAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    enable() {
        this.options.disabled = false;
        this.element.classList.add('glow-enabled', 'glow-active');
        this.startAnimation();
    }

    disable() {
        this.options.disabled = true;
        this.element.classList.remove('glow-enabled', 'glow-active');
        this.stopAnimation();
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.updateCSSProperties();
    }

    destroy() {
        this.stopAnimation();
        document.body.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('scroll', this.handleScroll);
        this.element.classList.remove('glow-container', 'glow-enabled', 'glow-active', 'glow-blur', 'glow-white');
    }
}

// Auto-initialize elements with data-glow attribute
document.addEventListener('DOMContentLoaded', () => {
    const glowElements = document.querySelectorAll('[data-glow]');
    glowElements.forEach(element => {
        const options = {
            spread: parseInt(element.dataset.glowSpread) || 40,
            proximity: parseInt(element.dataset.glowProximity) || 64,
            blur: parseInt(element.dataset.glowBlur) || 0,
            borderWidth: parseInt(element.dataset.glowBorderWidth) || 3,
            inactiveZone: parseFloat(element.dataset.glowInactiveZone) || 0.01,
            glow: element.dataset.glowEnabled !== 'false',
            disabled: element.dataset.glowDisabled === 'true',
            variant: element.dataset.glowVariant || 'default'
        };
        new GlowingBorder(element, options);
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlowingBorder;
}
