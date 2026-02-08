# Quick Start Guide

Welcome to the AI Desktop Agent and Browser Extension! This guide will help you get started quickly.

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Basic Usage](#basic-usage)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)

---

## Installation

### Desktop Agent

#### Prerequisites

- Node.js 18+
- npm or yarn
- Windows, macOS, or Linux

#### Steps

1. Clone the repository:
```bash
git clone https://github.com/your-repo/ai-desktop-agent.git
cd ai-desktop-agent
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

### Browser Extension

#### Prerequisites

- Chrome, Edge, or Brave browser
- Node.js 18+
- npm or yarn

#### Steps

1. Clone the repository:
```bash
git clone https://github.com/your-repo/my-ai-extension.git
cd my-ai-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension:
   - Open Chrome/Edge
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

---

## Configuration

### Setting Up API Keys

The extension supports multiple LLM providers. Configure your preferred provider:

#### OpenAI

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open the extension settings
3. Select "OpenAI" as the provider
4. Enter your API key
5. Select your model (GPT-4, GPT-3.5, etc.)

#### Anthropic (Claude)

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Open the extension settings
3. Select "Anthropic" as the provider
4. Enter your API key
5. Select your model (Claude 3.5 Sonnet, etc.)

#### Other Providers

The extension also supports:
- Azure OpenAI
- Google Gemini
- Perplexity
- MorphLLM
- DeepSeek
- Ollama (local)
- OpenRouter

### Setting Up Connectors

#### Notion

1. Create an integration at [Notion My Integrations](https://www.notion.so/my-integrations)
2. Copy the integration token
3. Open the extension settings
4. Navigate to "Connectors" > "Notion"
5. Enter your integration token
6. Share pages with your integration

#### GitHub

1. Create a personal access token at [GitHub Settings](https://github.com/settings/tokens)
2. Select required scopes (repo, read:org, etc.)
3. Open the extension settings
4. Navigate to "Connectors" > "GitHub"
5. Enter your access token

#### Google Drive

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Drive API
3. Create OAuth credentials
4. Open the extension settings
5. Navigate to "Connectors" > "Google Drive"
6. Enter your credentials

---

## Basic Usage

### Using the Browser Extension

#### 1. Open the Side Panel

Click the extension icon in your browser toolbar to open the AI side panel.

#### 2. Start a Conversation

Type your message in the chat input and press Enter. The AI will respond based on the current page context.

#### 3. Use Page Actions

The extension can perform actions on the current page:

- **Extract Data**: Extract tables, lists, and other structured data
- **Summarize**: Generate a summary of page content
- **Analyze**: Analyze page structure and content
- **Edit**: Modify page elements (text, HTML, etc.)

#### 4. Use Automation

Create automated workflows:

1. Click the "Automation" tab
2. Create a new workflow
3. Add actions (click, type, wait, etc.)
4. Run the workflow

### Using the Desktop Agent

#### 1. Screen Capture

The agent can capture screenshots and perform OCR:

```javascript
// Capture screen
const screenshot = await screenController.captureScreen();

// Perform OCR
const text = await screenController.performOCR(screenshot);
```

#### 2. Mouse & Keyboard Control

Simulate user input:

```javascript
// Click at coordinates
await inputController.click(100, 200);

// Type text
await inputController.type('Hello, World!');

// Press key
await inputController.pressKey('Enter');
```

#### 3. Window Management

Control application windows:

```javascript
// List windows
const windows = await windowController.getWindows();

// Focus window
await windowController.focusWindow(windowId);

// Resize window
await windowController.resizeWindow(windowId, 800, 600);
```

#### 4. Browser Automation

Automate web browsers:

```javascript
// Open URL
await browserController.openUrl('https://example.com');

// Search
await browserController.search('AI developments');

// Get page content
const content = await browserController.getPageContent();
```

---

## Advanced Features

### Workspace Management

Organize your work into workspaces:

```typescript
import { workspaceManagementService } from './lib/workspace/WorkspaceManagementService';

// Create a workspace
const workspaceId = await workspaceManagementService.createWorkspace({
  name: 'My Project',
  description: 'Project workspace',
  tags: ['work', 'important'],
  color: '#3b82f6',
});

// Switch to workspace
await workspaceManagementService.switchWorkspace(workspaceId);

// Add session to workspace
await workspaceManagementService.addSession(workspaceId, sessionId);

// Search workspaces
const results = workspaceManagementService.searchWorkspaces('project');
```

### Daytona Integration

Manage development workspaces:

```typescript
import { daytonaService } from './lib/workspace/DaytonaService';

// List workspaces
const workspaces = await daytonaService.listWorkspaces();

// Create workspace
const workspace = await daytonaService.createWorkspace({
  name: 'dev-environment',
  repository: 'https://github.com/user/repo',
});

// Start workspace
await daytonaService.startWorkspace(workspace.id);

// Execute command
const result = await daytonaService.executeCommand(
  workspace.id,
  'npm install'
);
```

### Data Extraction

Extract structured data from web pages:

```typescript
import { dataExtractionService } from './lib/page/DataExtractionService';

// Extract all data
const data = await dataExtractionService.extractAll({
  includeTables: true,
  includeLists: true,
  includeImages: true,
  maxTables: 100,
});

// Extract specific data
const tables = await dataExtractionService.extractTables();
const lists = await dataExtractionService.extractLists();
```

### DOM Manipulation

Modify page elements:

```typescript
import { domManipulationService } from './lib/page/DOMManipulationService';

// Set text content
await domManipulationService.setTextContent('#title', 'New Title');

// Set inner HTML
await domManipulationService.setInnerHTML('#content', '<p>New content</p>');

// Click element
await domManipulationService.clickElement('#submit');

// Batch operations
const result = await domManipulationService.executeBatch([
  { type: 'setText', selector: '#title', value: 'New Title' },
  { type: 'click', selector: '#submit' },
]);
```

### Search Services

Search the web:

```typescript
import { tavilySearchService } from './lib/search/TavilySearchService';
import { webSearchService } from './lib/search/WebSearchService';

// Tavily search (requires API key)
const tavilyResults = await tavilySearchService.search({
  query: 'AI developments in 2024',
  maxResults: 10,
  searchDepth: 'advanced',
});

// Web search (free, no API key)
const webResults = await webSearchService.search({
  query: 'TypeScript best practices',
  maxResults: 10,
});
```

### Security & Validation

Validate and sanitize input:

```typescript
import { validationService } from './lib/validation/ValidationService';
import { keyVault } from './lib/security/KeyVault';

// Validate API key
const result = validationService.validateApiKey('openai', 'sk-...');

// Sanitize input
const sanitized = validationService.sanitizeInput(userInput);

// Security scan
const scanResult = validationService.securityScan(userInput);
if (!scanResult.safe) {
  console.warn('Threats detected:', scanResult.threats);
}

// Encrypt and store API key
await keyVault.storeApiKey('openai', 'sk-...');

// Retrieve and decrypt API key
const apiKey = await keyVault.getApiKey('openai');
```

### Metrics & Logging

Monitor service performance:

```typescript
// Get metrics
const metrics = service.getMetrics();
console.log('Operation count:', metrics.operationCount);
console.log('Error count:', metrics.errorCount);

// Get logs
const logs = service.getLogs();
console.log('Recent logs:', logs);

// Reset metrics
service.resetMetrics();

// Clear logs
service.clearLogs();
```

---

## Troubleshooting

### Common Issues

#### Extension Not Loading

1. Ensure you're using a supported browser (Chrome, Edge, Brave)
2. Check that Developer mode is enabled
3. Verify the extension is built (`npm run build`)
4. Check the browser console for errors

#### API Key Errors

1. Verify your API key is correct
2. Check that the API key has the required permissions
3. Ensure you've selected the correct provider
4. Try regenerating your API key

#### Timeout Errors

1. Check your network connection
2. Increase the timeout value in settings
3. Verify the API endpoint is accessible
4. Try again later

#### Storage Errors

1. Check your browser storage quota
2. Clear old data from the extension
3. Verify storage permissions are granted
4. Try using a different browser profile

#### Desktop Agent Issues

1. Ensure Node.js 18+ is installed
2. Check that all dependencies are installed (`npm install`)
3. Verify the application has the required permissions
4. Check the application logs for errors

### Getting Help

- Check the [FEATURE_DOCUMENTATION.md](FEATURE_DOCUMENTATION.md) for detailed information
- Review the code comments for implementation details
- Check the browser console for error messages
- Review the application logs for desktop agent issues

---

## Next Steps

1. **Explore Features**: Try out different features and capabilities
2. **Customize Settings**: Configure the extension to your preferences
3. **Create Workflows**: Build automated workflows for common tasks
4. **Integrate Services**: Connect to your favorite services (Notion, GitHub, etc.)
5. **Monitor Performance**: Use metrics to optimize your workflows

---

## Resources

- [Feature Documentation](FEATURE_DOCUMENTATION.md) - Comprehensive feature documentation
- [API Reference](FEATURE_DOCUMENTATION.md#api-reference) - API reference guide
- [Best Practices](FEATURE_DOCUMENTATION.md#best-practices) - Development best practices
- [Troubleshooting](FEATURE_DOCUMENTATION.md#troubleshooting) - Troubleshooting guide

---

## License

This project is licensed under the MIT License.
