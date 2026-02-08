# AI Desktop Agent - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Chrome/Edge browser (for extension)
- API keys for AI providers (Anthropic, OpenAI, etc.)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LEAN
```

### 2. Install Desktop Agent Dependencies

```bash
cd ai-desktop-agent
npm install
```

### 3. Install Browser Extension Dependencies

```bash
cd ../my-ai-extension
npm install
```

---

## Configuration

### Desktop Agent Configuration

Create a `.env` file in `ai-desktop-agent/`:

```env
# AI Provider Configuration
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
DEFAULT_AI_PROVIDER=anthropic

# Optional: Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_key_here
AZURE_ENDPOINT=https://your-resource.openai.azure.com
AZURE_DEPLOYMENT=your-deployment-name
```

### Browser Extension Configuration

1. Build the extension:
```bash
cd my-ai-extension
npm run build
```

2. Load in Chrome/Edge:
   - Open `chrome://extensions`
   - Enable "Developer Mode"
   - Click "Load unpacked"
   - Select the `my-ai-extension` folder

3. Configure API keys in extension settings:
   - Click the extension icon
   - Go to Settings
   - Add your API keys for each provider

---

## Running the Desktop Agent

```bash
cd ai-desktop-agent
npm start
```

The agent will start with a floating icon in the center of your screen.

---

## Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+Space` | Toggle window visibility |
| `Cmd/Ctrl+Shift+S` | Screenshot and analyze |
| `Cmd/Ctrl+Shift+Escape` | Emergency stop |

---

## Basic Usage

### 1. Chat with the Agent

Click the floating icon to open the chat interface. Type your request in plain English:

```
"Take a screenshot and tell me what's on screen"
```

### 2. Automate Tasks

```
"Open Chrome and search for AI automation tools"
```

### 3. File Operations

```
"Create a new file called notes.txt with my meeting notes"
```

### 4. Window Management

```
"List all open windows and focus on Chrome"
```

### 5. Browser Automation

```
"Navigate to github.com and search for automation tools"
```

---

## Browser Extension Usage

### 1. Open the Side Panel

Click the extension icon and select "Open Side Panel"

### 2. Chat with AI

Type your question or request:

```
"Summarize this page"
```

### 3. Automate Page Actions

```
"Click the login button and type my username"
```

### 4. Research

```
"Research the latest AI trends and summarize"
```

### 5. Use Templates

Select a template from the templates menu and fill in the variables.

---

## Common Workflows

### Workflow 1: Daily Standup Report

1. Take screenshot of your work
2. Ask agent to analyze and summarize
3. Generate standup report
4. Copy to clipboard

```
"Take a screenshot, analyze what I'm working on, and create a daily standup report"
```

### Workflow 2: Email Triage

1. Open email client
2. Ask agent to categorize emails
3. Draft responses for important emails
4. Schedule sends

```
"Open Gmail, categorize my emails, and draft responses for high-priority ones"
```

### Workflow 3: Research & Documentation

1. Search for topic
2. Extract key information
3. Generate documentation
4. Save to file

```
"Research AI automation best practices and create a markdown document with the findings"
```

### Workflow 4: Code Review

1. Open code file
2. Ask agent to review
3. Get suggestions
4. Apply improvements

```
"Review this code and suggest improvements for performance and readability"
```

---

## Troubleshooting

### Issue: "Screenshot functionality requires Visual Studio Build Tools"

**Solution**: The screen controller now uses platform-specific commands:
- Windows: PowerShell (built-in)
- macOS: screencapture (built-in)
- Linux: gnome-screenshot or scrot

### Issue: "AI engine not initialized"

**Solution**: Configure API keys in `.env` file or extension settings.

### Issue: "Action execution failed"

**Solution**: Check that the action type is supported and parameters are correct.

### Issue: Extension not loading

**Solution**: Enable Developer Mode and load the unpacked extension from the build folder.

---

## Getting Help

- Check the [Feature Documentation](FEATURE_DOCUMENTATION.md) for detailed feature descriptions
- Review code comments for implementation details
- Test features incrementally to identify issues

---

## Next Steps

1. Configure your API keys
2. Try basic commands to test functionality
3. Explore the workflow templates
4. Customize the agent to your needs
5. Build custom workflows for your daily tasks

---

**Happy Automating! 🚀**
