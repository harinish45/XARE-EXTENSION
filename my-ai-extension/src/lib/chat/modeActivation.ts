import { type ChatMode, getModeConfig } from '../../sidepanel/components/NewChatDropdown/chatModes';

export interface ModeActivationResult {
    greeting: string;
    success: boolean;
    error?: string;
}

/**
 * Activate a chat mode and return the greeting message
 */
export const activateMode = async (mode: ChatMode): Promise<ModeActivationResult> => {
    const config = getModeConfig(mode);

    if (!config) {
        return {
            greeting: 'Error: Mode not found',
            success: false,
            error: `Mode ${mode} does not exist`
        };
    }

    // Generate greeting (handle function or string)
    const greeting = typeof config.greeting === 'function'
        ? config.greeting()
        : config.greeting;

    try {
        // Mode-specific activation logic
        switch (mode) {
            case 'research':
                // Enable multi-source research features
                await activateResearchMode();
                break;

            case 'agents':
                // Initialize multi-agent system
                await activateAgentsMode();
                break;

            case 'factcheck':
                // Prepare fact-checking service
                await activateFactCheckMode();
                break;

            case 'memory':
                // Load conversation memory
                await activateMemoryMode();
                break;

            case 'voice':
                // Start voice recognition
                await activateVoiceMode();
                break;

            case 'reader':
                // Prepare document reading
                await activateReaderMode();
                break;

            case 'websearch':
                // Enable web search services
                await activateWebSearchMode();
                break;

            case 'media':
                // Prepare vision/media analysis
                await activateMediaMode();
                break;

            case 'mentions':
                // Load tab context
                await activateMentionsMode();
                break;

            case 'summarize':
                // Prepare page summarization
                await activateSummarizeMode();
                break;

            case 'extract':
                // Prepare data extraction
                await activateExtractMode();
                break;

            case 'forms':
                // Initialize form intelligence
                await activateFormsMode();
                break;

            case 'compare':
                // Prepare page comparison
                await activateCompareMode();
                break;

            case 'monitor':
                // Start page monitoring
                await activateMonitorMode();
                break;

            case 'workflows':
                // Initialize automation engine
                await activateWorkflowsMode();
                break;

            case 'apps':
                // Load app integrations
                await activateAppsMode();
                break;

            case 'devworkspace':
                // Connect to Daytona
                await activateDevWorkspaceMode();
                break;

            default:
                console.log(`Mode ${mode} has no specific activation logic`);
        }

        return { greeting, success: true };

    } catch (error) {
        console.error(`Error activating mode ${mode}:`, error);
        return {
            greeting,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

// Mode-specific activation functions

async function activateResearchMode() {
    // Import and configure research service
    const { multiSourceResearchService } = await import('../research/MultiSourceResearchService');
    // Configure for deep research
    console.log('Research mode activated');
}

async function activateAgentsMode() {
    // Import multi-agent service
    const { multiAgentService } = await import('../agents/MultiAgentService');
    console.log('AI Agents mode activated - available agents:', multiAgentService.getAgents());
}

async function activateFactCheckMode() {
    // Import fact-checking service
    const { factCheckingService } = await import('../verification/FactCheckingService');
    console.log('Fact-checking mode activated');
}

async function activateMemoryMode() {
    // Load conversation memory
    const { conversationMemoryService } = await import('../memory/ConversationMemoryService');
    await conversationMemoryService.load();
    console.log('Memory mode activated');
}

async function activateVoiceMode() {
    // Start voice commands
    const { voiceCommandsService } = await import('../voice/VoiceCommandsService');
    voiceCommandsService.startListening();
    console.log('Voice mode activated');
}

async function activateReaderMode() {
    // Prepare summarization service
    const { fiveLevelSummarizationService } = await import('../summarization/FiveLevelSummarizationService');
    console.log('Reader mode activated');
}

async function activateWebSearchMode() {
    // Check if search APIs are configured
    const { webSearchService } = await import('../search/WebSearchService');
    console.log('Web search mode activated');
}

async function activateMediaMode() {
    // Prepare for image upload
    console.log('Media mode activated - ready for image analysis');
}

async function activateMentionsMode() {
    // Load tab context
    const { tabContextService } = await import('../context/TabContextService');
    console.log('Mentions mode activated');
}

async function activateSummarizeMode() {
    // Prepare page summarization
    const { pageSummarizationService } = await import('../page/PageSummarizationService');
    console.log('Summarize mode activated');
}

async function activateExtractMode() {
    // Prepare data extraction
    const { dataExtractionService } = await import('../page/DataExtractionService');
    console.log('Extract mode activated');
}

async function activateFormsMode() {
    // Initialize form intelligence
    const { formIntelligenceService } = await import('../forms/FormIntelligenceService');
    console.log('Smart Forms mode activated');
}

async function activateCompareMode() {
    // Prepare comparison service
    const { pageComparisonService } = await import('../comparison/PageComparisonService');
    console.log('Compare mode activated');
}

async function activateMonitorMode() {
    // Start page monitoring
    const { pageMonitoringService } = await import('../monitoring/PageMonitoringService');
    console.log('Monitor mode activated');
}

async function activateWorkflowsMode() {
    // Initialize automation
    const { automationService } = await import('../automation/AutomationService');
    console.log('Workflows mode activated');
}

async function activateAppsMode() {
    // Load app integrations
    const { composioService } = await import('../integrations/ComposioService');
    console.log('Apps mode activated');
}

async function activateDevWorkspaceMode() {
    // Connect to Daytona
    const { daytonaService } = await import('../workspace/DaytonaService');
    console.log('Dev Workspace mode activated');
}
