# AI Desktop Agent

An AI-powered desktop automation agent with system-wide access and control for Windows, macOS, and Linux.

## Features

- 🤖 **AI-Powered Automation**: Leverage Claude or GPT-4 for intelligent task execution
- 🖱️ **Mouse & Keyboard Control**: Automate input actions across all applications
- 📸 **Screen Analysis**: Capture and analyze screenshots with vision AI
- 📁 **File Operations**: Read, write, copy, move, and organize files
- 🌐 **Browser Automation**: Automate web tasks with Puppeteer/Playwright
- 🔄 **Workflow System**: Create and execute complex multi-step workflows
- 💾 **Persistent Storage**: SQLite database for conversations and workflows
- 🔒 **Safety Checks**: Built-in safety validation for dangerous actions
- ⌨️ **Global Shortcuts**: Quick access with customizable hotkeys
- 🎨 **Modern UI**: Clean, floating widget interface

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API key from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/ai-desktop-agent.git
cd ai-desktop-agent
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. Run the application:
```bash
npm start
```

## Configuration

Edit the `.env` file to configure:

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `DEFAULT_PROVIDER`: Choose between 'anthropic' or 'openai'
- `HOTKEY_TOGGLE`: Global shortcut to toggle the window (default: Ctrl+Shift+Space)
- `HOTKEY_SCREENSHOT`: Shortcut for screenshot analysis (default: Ctrl+Shift+S)

## Usage

### Basic Chat

Simply type your commands or questions in the chat interface:

```
User: Open Chrome and go to google.com
AI: I'll open Chrome and navigate to google.com for you.
```

### Automation Commands

The agent can execute various actions:

**Mouse Actions:**
- `mouse_move {x, y}` - Move mouse to coordinates
- `mouse_click {button}` - Click left/right/middle button
- `mouse_drag {startX, startY, endX, endY}` - Drag mouse

**Keyboard Actions:**
- `keyboard_type {text}` - Type text
- `keyboard_press {key, modifiers}` - Press key with optional modifiers
- `keyboard_shortcut {shortcut}` - Execute keyboard shortcut

**Screen Actions:**
- `screen_capture` - Take a screenshot
- `screen_ocr` - Extract text from screen

**File Actions:**
- `file_read {path}` - Read file contents
- `file_write {path, content}` - Write to file
- `file_copy {from, to}` - Copy file
- `file_move {from, to}` - Move file
- `file_delete {path}` - Delete file

**Browser Actions:**
- `browser_navigate {url}` - Navigate to URL
- `browser_click {selector}` - Click element
- `browser_type {selector, text}` - Type in element

**App Actions:**
- `app_open {name}` - Open application
- `app_close {name}` - Close application

### Workflows

Create reusable workflows for common tasks:

```json
{
  "name": "Email Summary",
  "description": "Create and send daily email summary",
  "steps": [
    {
      "action": "app_open",
      "params": { "name": "outlook" }
    },
    {
      "action": "keyboard_shortcut",
      "params": { "shortcut": "ctrl+n" }
    }
  ]
}
```

## Project Structure

```
ai-desktop-agent/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/           # UI (HTML/CSS/JS)
│   ├── agent/              # AI engine
│   ├── automation/          # Workflow engine
│   ├── controllers/         # System controllers
│   ├── storage/            # Database & vector store
│   └── utils/              # Utilities
├── workflows/             # Pre-built workflows
├── assets/               # Icons and resources
└── package.json
```

## Building

### Development
```bash
npm run dev
```

### Production Build

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

Builds will be in the `dist/` directory.

## Safety

The agent includes built-in safety features:

- Confirmation dialogs for dangerous actions
- Blocked system paths
- Sensitive data detection
- Configurable action allowlists/blocklists
- Emergency stop shortcut (Ctrl+Shift+Escape)

## Troubleshooting

### Application won't start
- Check that Node.js 18+ is installed
- Verify API keys are set in `.env`
- Check logs in `~/ai-desktop-agent/logs/`

### Actions not working
- Ensure the application has necessary permissions
- Check if the action is blocked in settings
- Verify the target application is running

### AI not responding
- Check your API key is valid
- Verify you have API credits remaining
- Check network connection

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/) and [OpenAI GPT-4](https://openai.com/)
- Automation using [robotjs](https://github.com/octalmage/robotjs)
