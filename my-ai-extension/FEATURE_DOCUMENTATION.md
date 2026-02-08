# AI Desktop Agent & Extension - Feature Documentation

## Overview

This document provides comprehensive documentation for the AI Desktop Agent and Browser Extension, detailing all features, architecture, and capabilities.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Services](#core-services)
3. [LLM Integration](#llm-integration)
4. [Automation Features](#automation-features)
5. [Page Manipulation](#page-manipulation)
6. [Connectors & Integrations](#connectors--integrations)
7. [Workspace Management](#workspace-management)
8. [Security & Validation](#security--validation)
9. [Search Services](#search-services)
10. [Monitoring & Analytics](#monitoring--analytics)

---

## Architecture Overview

### Desktop Agent (Electron)

The Desktop Agent is built with Electron and provides system-level automation capabilities:

- **Screen Controller**: Captures screenshots and performs OCR
- **Input Controller**: Simulates mouse and keyboard input
- **Window Controller**: Manages application windows
- **Browser Controller**: Automates web browsers
- **Clipboard Controller**: Manages clipboard operations
- **File Controller**: Handles file system operations
- **App Controller**: Manages application lifecycle

### Browser Extension (Chrome)

The Browser Extension provides web-based AI capabilities:

- **Content Scripts**: Inject AI into web pages
- **Background Service**: Manages extension lifecycle
- **Side Panel**: Provides AI chat interface
- **Storage**: Persists user data and settings

---

## Core Services

### 1. LLM Service

**Location**: `src/lib/llm/LLMService.ts`

**Features**:
- Multi-provider support (OpenAI, Anthropic, Azure, Gemini, Perplexity, MorphLLM)
- Streaming responses
- Context management
- Error handling and retry logic

**Usage**:
```typescript
import { llmService } from './lib/llm/LLMService';

const response = await llmService.generate(
  [{ role: 'user', content: 'Hello!' }],
  'your-api-key'
);
```

### 2. OpenAI Compatible Provider

**Location**: `src/lib/llm/providers/OpenAICompatibleProvider.ts`

**Enhanced Features**:
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Response Caching**: Improves performance for repeated requests
- **Retry Logic**: Automatic retries with exponential backoff
- **Metrics Tracking**: Monitors request performance
- **Custom Error Types**: Detailed error information

**Configuration**:
```typescript
const provider = new OpenAICompatibleProvider({
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  enableCache: true,
  maxRetries: 3,
  timeout: 30000,
});
```

---

## LLM Integration

### Supported Providers

| Provider | Model | Features |
|----------|-------|----------|
| OpenAI | GPT-4, GPT-3.5 | Streaming, function calling |
| Anthropic | Claude 3.5 Sonnet | Long context, vision |
| Azure | Azure OpenAI | Enterprise support |
| Gemini | Gemini Pro | Multimodal |
| Perplexity | pplx-7b-online | Web search |
| MorphLLM | Custom models | Flexible deployment |
| DeepSeek | deepseek-chat | Cost-effective |
| Ollama | Local models | Privacy-focused |
| OpenRouter | Multiple models | Unified API |

### Provider Configuration

Each provider can be configured via the LLM Provider Settings component:

```typescript
interface LLMProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}
```

---

## Automation Features

### Automation Service

**Location**: `src/lib/automation/AutomationService.ts`

**Features**:
- Task planning and execution
- Action chains with conditional logic
- Loop support
- Error handling and recovery
- Progress tracking

**Automation Loop**:
```typescript
import { AutomationLoop } from './lib/automation/AutomationLoop';

const loop = new AutomationLoop({
  maxIterations: 10,
  timeout: 60000,
  onProgress: (progress) => console.log(progress),
});

await loop.execute(actions);
```

### Task Memory

**Location**: `src/lib/automation/TaskMemory.ts`

**Features**:
- Stores task state
- Tracks execution history
- Enables task resumption
- Provides context for AI decisions

---

## Page Manipulation

### Data Extraction Service

**Location**: `src/lib/page/DataExtractionService.ts`

**Enhanced Features**:
- **Caching**: Improves performance for repeated extractions
- **Configurable Options**: Fine-tune extraction behavior
- **Metrics Tracking**: Monitor extraction performance
- **Comprehensive Logging**: Debug extraction issues

**Extraction Types**:
- Text content
- Tables
- Lists
- Images
- Links
- Metadata

**Usage**:
```typescript
import { dataExtractionService } from './lib/page/DataExtractionService';

const data = await dataExtractionService.extractAll({
  includeTables: true,
  includeLists: true,
  includeImages: true,
  maxTables: 100,
});
```

### DOM Manipulation Service

**Location**: `src/lib/page/DOMManipulationService.ts`

**Enhanced Features**:
- **Batch Operations**: Execute multiple actions efficiently
- **Metrics Tracking**: Monitor manipulation performance
- **Custom Error Types**: Detailed error information
- **Comprehensive Logging**: Debug manipulation issues

**Operations**:
- Set text content
- Set inner HTML
- Click elements
- Scroll to element
- Highlight elements
- Remove elements

**Batch Operations**:
```typescript
const result = await domManipulationService.executeBatch([
  { type: 'setText', selector: '#title', value: 'New Title' },
  { type: 'click', selector: '#submit' },
  { type: 'scroll', selector: '#content', options: { behavior: 'smooth' } },
]);
```

### Page Actions Service

**Location**: `src/lib/page/PageActionsService.ts`

**Features**:
- Click elements
- Fill forms
- Navigate pages
- Wait for elements
- Take screenshots

### Page Summarization Service

**Location**: `src/lib/page/PageSummarizationService.ts`

**Features**:
- Extract key points
- Generate summaries
- Identify important sections
- Extract action items

---

## Connectors & Integrations

### Notion Connector

**Location**: `src/lib/connectors/notion/NotionConnector.ts`

**Enhanced Features**:
- **Security Layer**: Data sanitization and validation
- **Comprehensive Logging**: Track all operations
- **Metrics Tracking**: Monitor connector performance
- **Custom Error Types**: Detailed error information

**Operations**:
- Read/write pages
- Query databases
- Create blocks
- Update content

**Usage**:
```typescript
import { notionConnector } from './lib/connectors/notion/NotionConnector';

const page = await notionConnector.getPage('page-id');
await notionConnector.updatePage('page-id', { title: 'New Title' });
```

### GitHub Connector

**Location**: `src/lib/connectors/github/GitHubConnector.ts`

**Features**:
- Repository management
- Issue tracking
- Pull request operations
- Code review

### Google Drive Connector

**Location**: `src/lib/connectors/google/GoogleDriveConnector.ts`

**Features**:
- File upload/download
- Folder management
- Search files
- Share files

---

## Workspace Management

### Workspace Management Service

**Location**: `src/lib/workspace/WorkspaceManagementService.ts`

**Enhanced Features**:
- **Caching**: Improves performance for repeated queries
- **Debounced Saving**: Reduces storage operations
- **Search Functionality**: Find workspaces by name/description
- **Metrics Tracking**: Monitor workspace operations
- **Custom Error Types**: Detailed error information

**Workspace Features**:
- Create/delete workspaces
- Switch between workspaces
- Add/remove sessions
- Update workspace metadata
- Search workspaces
- Tags and colors

**Usage**:
```typescript
import { workspaceManagementService } from './lib/workspace/WorkspaceManagementService';

const workspaceId = await workspaceManagementService.createWorkspace({
  name: 'My Project',
  description: 'Project workspace',
  tags: ['work', 'important'],
  color: '#3b82f6',
});

await workspaceManagementService.switchWorkspace(workspaceId);
```

### Daytona Service

**Location**: `src/lib/workspace/DaytonaService.ts`

**Enhanced Features**:
- **Request Cancellation**: Abort long-running requests
- **Timeout Handling**: Configurable timeouts for all operations
- **Metrics Tracking**: Monitor API performance
- **Custom Error Types**: Detailed error information
- **Comprehensive Logging**: Track all operations

**Operations**:
- List workspaces
- Create workspaces
- Start/stop workspaces
- Delete workspaces
- Execute commands

**Usage**:
```typescript
import { daytonaService } from './lib/workspace/DaytonaService';

const workspaces = await daytonaService.listWorkspaces();
const workspace = await daytonaService.createWorkspace({
  name: 'dev-environment',
  repository: 'https://github.com/user/repo',
});

await daytonaService.startWorkspace(workspace.id);
const result = await daytonaService.executeCommand(workspace.id, 'npm install');
```

---

## Security & Validation

### Key Vault

**Location**: `src/lib/security/KeyVault.ts`

**Enhanced Features**:
- **Key Rotation**: Periodic key rotation for enhanced security
- **Metrics Tracking**: Monitor encryption operations
- **Comprehensive Logging**: Track all key operations
- **Custom Error Types**: Detailed error information

**Features**:
- Encrypt API keys using Web Crypto API
- Secure storage in Chrome storage
- Key rotation support
- Input validation and sanitization

**Usage**:
```typescript
import { keyVault } from './lib/security/KeyVault';

// Encrypt and store API key
await keyVault.storeApiKey('openai', 'sk-...');

// Retrieve and decrypt API key
const apiKey = await keyVault.getApiKey('openai');

// Rotate encryption key
await keyVault.rotateKey();
```

### Validation Service

**Location**: `src/lib/validation/ValidationService.ts`

**Enhanced Features**:
- **Advanced Validation Patterns**: Comprehensive validation rules
- **Security Scanning**: Detect SQL injection, XSS, path traversal, command injection
- **Metrics Tracking**: Monitor validation operations
- **Custom Error Types**: Detailed error information
- **Comprehensive Logging**: Track all validations

**Validation Types**:
- API key format validation
- URL validation
- Email validation
- JSON validation
- File size/type validation
- Schema validation
- Input sanitization
- Security scanning

**Usage**:
```typescript
import { validationService } from './lib/validation/ValidationService';

// Validate API key
const result = validationService.validateApiKey('openai', 'sk-...');

// Sanitize input
const sanitized = validationService.sanitizeInput(userInput);

// Security scan
const scanResult = validationService.securityScan(userInput);
if (!scanResult.safe) {
  console.warn('Threats detected:', scanResult.threats);
}

// Validate schema
const schema = {
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  email: { required: true, type: 'string', pattern: '^[^@]+@[^@]+$' },
};
const validationResult = validationService.validateSchema(data, schema);
```

---

## Search Services

### Tavily Search Service

**Location**: `src/lib/search/TavilySearchService.ts`

**Enhanced Features**:
- **Caching**: Improves performance for repeated searches
- **Retry Logic**: Automatic retries with exponential backoff
- **Abort Controllers**: Cancel long-running requests
- **Metrics Tracking**: Monitor search performance
- **Comprehensive Logging**: Track all searches

**Search Types**:
- Quick search
- Deep research
- Domain search
- News search

**Usage**:
```typescript
import { tavilySearchService } from './lib/search/TavilySearchService';

const results = await tavilySearchService.search({
  query: 'AI developments in 2024',
  maxResults: 10,
  searchDepth: 'advanced',
});
```

### Web Search Service

**Location**: `src/lib/search/WebSearchService.ts`

**Enhanced Features**:
- **Caching**: Improves performance for repeated searches
- **Retry Logic**: Automatic retries with exponential backoff
- **Abort Controllers**: Cancel long-running requests
- **Metrics Tracking**: Monitor search performance
- **Comprehensive Logging**: Track all searches

**Features**:
- DuckDuckGo Instant Answer API (free, no API key required)
- Fallback search methods
- Result ranking
- Source attribution

**Usage**:
```typescript
import { webSearchService } from './lib/search/WebSearchService';

const results = await webSearchService.search({
  query: 'TypeScript best practices',
  maxResults: 10,
});
```

---

## Monitoring & Analytics

### Performance Monitoring Service

**Location**: `src/lib/monitoring/PerformanceMonitoringService.ts`

**Features**:
- Track operation performance
- Monitor memory usage
- Detect performance bottlenecks
- Generate performance reports

### Page Monitoring Service

**Location**: `src/lib/monitoring/PageMonitoringService.ts`

**Features**:
- Monitor page changes
- Track DOM mutations
- Detect page stability
- Trigger actions on changes

### Usage Tracking Service

**Location**: `src/lib/analytics/UsageTracker.ts`

**Features**:
- Track feature usage
- Monitor user behavior
- Generate usage reports
- Identify popular features

---

## Error Recovery

### Error Recovery Service

**Location**: `src/lib/recovery/ErrorRecoveryService.ts`

**Features**:
- Automatic error detection
- Recovery strategies
- Retry logic
- Error reporting

---

## Advanced Features

### Multi-Agent Service

**Location**: `src/lib/agents/MultiAgentService.ts`

**Features**:
- Coordinate multiple AI agents
- Task distribution
- Agent communication
- Result aggregation

### Research Agent

**Location**: `src/lib/agents/ResearchAgent.ts`

**Features**:
- Multi-source research
- Information synthesis
- Citation generation
- Report generation

### Multi-Source Research Service

**Location**: `src/lib/research/MultiSourceResearchService.ts`

**Features**:
- Aggregate multiple sources
- Cross-reference information
- Identify consensus
- Highlight discrepancies

---

## Configuration

### API Config Service

**Location**: `src/lib/config/APIConfigService.ts`

**Features**:
- Centralized API configuration
- Secure credential storage
- Environment-specific settings
- Configuration validation

---

## Utilities

### Logging Service

**Location**: `src/lib/logging/LoggingService.ts`

**Features**:
- Structured logging
- Log levels (DEBUG, INFO, WARN, ERROR)
- Log filtering
- Log export

### Context Service

**Location**: `src/lib/context/SmartContext.ts`

**Features**:
- Context management
- Context persistence
- Context retrieval
- Context analysis

---

## Best Practices

### 1. Error Handling

Always use custom error types for better error handling:

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof CustomError) {
    // Handle specific error
  } else {
    // Handle generic error
  }
}
```

### 2. Metrics Tracking

Monitor service performance using built-in metrics:

```typescript
const metrics = service.getMetrics();
console.log('Operation count:', metrics.operationCount);
console.log('Error count:', metrics.errorCount);
```

### 3. Logging

Use the built-in logger for debugging:

```typescript
const logs = service.getLogs();
console.log('Recent logs:', logs);
```

### 4. Caching

Leverage caching for improved performance:

```typescript
// First call - fetches from source
const result1 = await service.getData();

// Second call - returns from cache
const result2 = await service.getData();
```

### 5. Security

Always validate and sanitize user input:

```typescript
const sanitized = validationService.sanitizeInput(userInput);
const scanResult = validationService.securityScan(userInput);
if (!scanResult.safe) {
  // Handle security threat
}
```

---

## API Reference

### Service Methods

All services follow a consistent pattern:

- **Get Metrics**: `service.getMetrics()` - Returns service metrics
- **Reset Metrics**: `service.resetMetrics()` - Resets service metrics
- **Get Logs**: `service.getLogs()` - Returns service logs
- **Clear Logs**: `service.clearLogs()` - Clears service logs

### Error Types

All services use custom error types:

- **ValidationError**: Validation errors
- **DaytonaError**: Daytona API errors
- **WorkspaceError**: Workspace management errors
- **NotionError**: Notion API errors

---

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify API key is configured
   - Check API key format
   - Ensure API key has required permissions

2. **Timeout Errors**
   - Increase timeout value
   - Check network connectivity
   - Verify API endpoint is accessible

3. **Validation Errors**
   - Review validation rules
   - Check input format
   - Sanitize input before validation

4. **Storage Errors**
   - Check storage quota
   - Clear old data
   - Verify storage permissions

---

## Contributing

When adding new features:

1. Follow existing patterns
2. Add comprehensive logging
3. Implement metrics tracking
4. Use custom error types
5. Add unit tests
6. Update documentation

---

## License

This project is licensed under the MIT License.
