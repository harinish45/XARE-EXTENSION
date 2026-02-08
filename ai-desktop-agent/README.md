# AI Desktop Agent 🤖

A powerful AI-powered desktop automation agent built with Electron. Control your entire system with natural language commands through a floating icon interface.

## 🌟 Features

- **🎯 Floating Icon UI** - Always-on-top, draggable interface
- **🖱️ Input Automation** - Mouse and keyboard control with human-like movement
- **📸 Screen Capture & OCR** - Screenshot capture and text extraction
- **🪟 Window Management** - Control any window across multiple monitors
- **📁 File Operations** - Automated file management and monitoring
- **📋 Clipboard History** - Track and manage clipboard with search
- **⚡ Workflow Engine** - Visual workflow builder with conditional logic
- **🔑 Global Shortcuts** - System-wide hotkeys for quick access
- **🎙️ Voice Commands** - Speech recognition and text-to-speech
- **☁️ Cloud Integration** - Google Drive, Dropbox, OneDrive support

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-desktop-agent.git
cd ai-desktop-agent

# Install dependencies
npm install

# Build the renderer
npm run build:renderer

# Start the app
npm run dev
```

### Running in Production

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle floating window |
| `Ctrl+Shift+C` | Capture screenshot |
| `Ctrl+Shift+E` | Emergency stop |
| `Ctrl+Shift+H` | Show clipboard history |
| `Ctrl+Shift+W` | Open workflow builder |

## 🛠️ Configuration

Create a `.env` file in the root directory:

```env
# AI Model Configuration
OLLAMA_URL=http://localhost:11434
OPENAI_API_KEY=your_key_here

# Window Configuration
WINDOW_WIDTH=200
WINDOW_HEIGHT=200
WINDOW_EXPANDED_WIDTH=450
WINDOW_EXPANDED_HEIGHT=700

# Automation Configuration
ENABLE_HUMAN_LIKE_MOVEMENT=true
MOUSE_SPEED=1.0
KEYBOARD_DELAY=10
```

## 📖 Usage Examples

### Automate Desktop Tasks

```javascript
// Example: Open Chrome and navigate to GitHub
await window.api.executeWorkflow({
  actions: [
    { type: 'openApp', app: 'chrome' },
    { type: 'wait', duration: 2000 },
    { type: 'type', text: 'github.com' },
    { type: 'pressKey', key: 'enter' }
  ]
});
```

### Capture and OCR

```javascript
// Take screenshot and extract text
const screenshot = await window.api.captureScreen();
const text = await window.api.extractText(screenshot);
console.log('Detected text:', text);
```

### File Monitoring

```javascript
// Watch downloads folder
await window.api.watchDirectory('C:\\Users\\Downloads', {
  onChange: async (event, filePath) => {
    console.log(`File ${event}: ${filePath}`);
  }
});
```

## 🏗️ Architecture

```
ai-desktop-agent/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React UI
│   ├── controllers/       # System controllers
│   ├── automation/        # Automation engine
│   ├── services/          # Background services
│   └── agent/             # AI agent logic
├── assets/                # Icons and resources
└── dist/                  # Build output
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Known Issues

- **RobotJS**: Native module requires compilation. The app includes a fallback mode for testing.
  - To enable full mouse/keyboard automation: `npm install robotjs && npx electron-rebuild`

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Automation with [RobotJS](http://robotjs.io/)
- OCR with [Tesseract.js](https://tesseract.projectnaptha.com/)

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ by the AI Desktop Agent Team**
