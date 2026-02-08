# How to Run the AI Desktop Agent with React

## Quick Start

Since npm install is having issues, here's how to run the app:

### Step 1: Install Dependencies Manually

```bash
# Clear npm cache first
npm cache clean --force

# Try installing again
npm install

# If that fails, try without package-lock
rm package-lock.json
npm install
```

### Step 2: Build the React Renderer

```bash
npm run build:renderer
```

This will compile your React components using Webpack and output to `dist/renderer/bundle.js`.

### Step 3: Run the Application

```bash
npm start
```

Or for development mode:

```bash
npm run dev
```

## Development Workflow

For active development, use two terminals:

**Terminal 1** - Watch mode for React:
```bash
npm run watch:renderer
```

**Terminal 2** - Run Electron:
```bash
electron .
```

This way, Webpack will automatically rebuild when you change React files.

## Troubleshooting

### If npm install fails:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm cache clean --force`
3. Try `npm install` again
4. If still failing, install key packages individually:
   ```bash
   npm install react react-dom
   npm install webpack webpack-cli babel-loader
   npm install tailwindcss postcss autoprefixer
   ```

### If build fails:
- Check that all config files exist: `webpack.config.js`, `.babelrc`, `tailwind.config.js`
- Ensure `src/renderer/index.jsx` exists
- Check console for specific error messages

### If Electron won't start:
- Make sure `dist/renderer/bundle.js` exists (run `npm run build:renderer` first)
- Check `src/renderer/index.html` is loading the correct bundle path
- Look for errors in Electron's DevTools console

## What Was Changed

1. **Added React** to your Electron app
2. **Created build system** with Webpack + Babel
3. **Set up Tailwind CSS** for styling
4. **Converted app.js** to React component
5. **Created task management UI** with animations

The app now uses React for the UI while keeping Electron for desktop integration!
