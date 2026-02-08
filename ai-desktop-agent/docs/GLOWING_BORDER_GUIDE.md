# Glowing Border Effect - Implementation Guide

## Overview

The Glowing Border Effect is a vanilla CSS/JavaScript component that creates an animated, mouse-tracking gradient border around elements. It's designed to integrate seamlessly with the AI Desktop Agent's glassmorphism aesthetic.

## Features

✨ **Mouse-Tracking**: Border gradient follows your cursor with smooth animations  
🎨 **Customizable**: Extensive configuration via CSS custom properties and data attributes  
⚡ **Performance**: Pure CSS with minimal JavaScript for optimal performance  
🎯 **Proximity Detection**: Activates only when mouse is near the element  
🔄 **Smooth Animations**: Eased transitions using cubic bezier curves  
🎭 **Multiple Variants**: Default colorful gradient or monochrome white variant  

## Quick Start

### 1. Include Files

Add to your HTML `<head>`:
```html
<link rel="stylesheet" href="glowing-border.css">
```

Add before closing `</body>`:
```html
<script src="glowing-border.js"></script>
```

### 2. Basic Usage

Add `data-glow` attribute to any element:

```html
<div data-glow>
  Your content here
</div>
```

That's it! The glowing border will automatically activate when you move your mouse near the element.

## Configuration Options

### Data Attributes

Configure the effect using data attributes:

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-glow` | - | - | **Required** - Enables the glowing effect |
| `data-glow-spread` | number | 40 | Gradient spread angle in degrees (10-90) |
| `data-glow-proximity` | number | 64 | Activation distance in pixels (32-200) |
| `data-glow-border-width` | number | 3 | Border thickness in pixels (1-8) |
| `data-glow-blur` | number | 0 | Blur amount in pixels (0-10) |
| `data-glow-inactive-zone` | number | 0.01 | Center dead zone ratio (0-1) |
| `data-glow-enabled` | boolean | true | Enable/disable the effect |
| `data-glow-disabled` | boolean | false | Disable the effect |
| `data-glow-variant` | string | default | Color variant: "default" or "white" |

### Example Configurations

#### Subtle Effect
```html
<div data-glow 
     data-glow-spread="30" 
     data-glow-proximity="48" 
     data-glow-border-width="2">
  Subtle glow
</div>
```

#### Intense Effect
```html
<div data-glow 
     data-glow-spread="60" 
     data-glow-proximity="96" 
     data-glow-border-width="4"
     data-glow-blur="2">
  Intense glow
</div>
```

#### White Variant
```html
<div data-glow 
     data-glow-variant="white">
  Monochrome glow
</div>
```

## CSS Classes

### Preset Classes

Apply these classes for pre-configured effects:

```css
.glow-subtle    /* Refined, minimal glow */
.glow-intense   /* Maximum impact with blur */
.glow-card      /* Optimized for card components */
```

### Modifier Classes

```css
.glow-container  /* Applied automatically to elements with data-glow */
.glow-enabled    /* Shows the glow effect */
.glow-active     /* Glow is currently active */
.glow-blur       /* Applies blur filter */
.glow-white      /* White/black gradient variant */
.glow-pulse      /* Adds pulsing animation */
```

## JavaScript API

### Manual Initialization

```javascript
const element = document.querySelector('.my-element');
const glow = new GlowingBorder(element, {
  spread: 40,
  proximity: 64,
  blur: 0,
  borderWidth: 3,
  inactiveZone: 0.01,
  glow: true,
  disabled: false,
  movementDuration: 2000,
  variant: 'default'
});
```

### Methods

```javascript
// Enable the effect
glow.enable();

// Disable the effect
glow.disable();

// Update options
glow.updateOptions({
  spread: 60,
  proximity: 100
});

// Destroy instance
glow.destroy();
```

## CSS Custom Properties

You can override these CSS variables for global customization:

```css
:root {
  --glow-spread: 40;
  --glow-blur: 0px;
  --glow-proximity: 64px;
  --glow-border-width: 3px;
  --glow-inactive-zone: 0.01;
  --glow-active: 0;
  --glow-angle: 0deg;
  
  /* Gradient colors */
  --glow-color-1: #dd7bbb;
  --glow-color-2: #d79f1e;
  --glow-color-3: #5a922c;
  --glow-color-4: #4c7894;
}
```

### Custom Color Scheme

```css
.my-custom-glow {
  --glow-color-1: #ff6b6b;
  --glow-color-2: #4ecdc4;
  --glow-color-3: #45b7d1;
  --glow-color-4: #f7b731;
}
```

## Integration Examples

### Chat Message Bubbles

```html
<div class="message-content glow-subtle" 
     data-glow 
     data-glow-spread="30" 
     data-glow-proximity="48">
  Message content
</div>
```

### Action Cards

```html
<div class="action-card glow-card" 
     data-glow 
     data-glow-spread="40" 
     data-glow-proximity="64">
  <h3>Action Title</h3>
  <p>Description</p>
</div>
```

### Main Container

```html
<div class="container" 
     data-glow 
     data-glow-spread="40" 
     data-glow-proximity="64" 
     data-glow-border-width="3">
  App content
</div>
```

## Performance Considerations

### Optimization Tips

1. **Limit Active Elements**: Don't apply to too many elements simultaneously
2. **Use Proximity Wisely**: Larger proximity values require more calculations
3. **Disable When Hidden**: Disable the effect on hidden elements
4. **Passive Event Listeners**: Already implemented for scroll and mousemove

### Browser Compatibility

- ✅ Chrome/Edge 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Electron (all recent versions)

## Troubleshooting

### Glow Not Appearing

1. Ensure `data-glow` attribute is present
2. Check that CSS and JS files are loaded
3. Verify element has `position: relative` or is a block element
4. Check browser console for errors

### Performance Issues

1. Reduce number of glowing elements
2. Decrease `proximity` value
3. Disable blur effect
4. Use `disabled` attribute when not needed

### Glow Not Following Mouse

1. Check that element is visible and not covered
2. Verify JavaScript is loaded after DOM
3. Ensure no conflicting event listeners

## Demo Page

Open [glowing-demo.html](../src/renderer/glowing-demo.html) in your browser to see:
- Interactive controls for all parameters
- Multiple preset examples
- Live configuration testing
- Usage code snippets

## Advanced Customization

### Creating Custom Variants

```css
.glow-neon {
  --glow-color-1: #00ff00;
  --glow-color-2: #00ffff;
  --glow-color-3: #ff00ff;
  --glow-color-4: #ffff00;
  --glow-spread: 50;
  --glow-blur: 3px;
}
```

### Combining with Animations

```css
@keyframes glow-rotate-full {
  from { --glow-angle: 0deg; }
  to { --glow-angle: 360deg; }
}

.glow-rotating::after {
  animation: glow-rotate-full 10s linear infinite;
}
```

## Best Practices

1. **Use Sparingly**: Apply to key UI elements for maximum impact
2. **Match Your Theme**: Customize colors to match your app's design
3. **Test Performance**: Monitor frame rates with multiple glowing elements
4. **Accessibility**: Ensure sufficient contrast for readability
5. **Responsive Design**: Adjust proximity and spread for mobile devices

## Credits

Inspired by the React component from Aceternity UI, converted to vanilla CSS/JS for optimal performance in Electron applications.
