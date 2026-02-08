import { LLMService } from '../lib/llm/LLMService';

console.log("[Background] XARE Extension - Background Worker Loaded");

const llmService = LLMService.getInstance();

// Test if LLMService is working
console.log("[Background] LLMService instance:", !!llmService);

chrome.runtime.onConnect.addListener((port) => {
    console.log(`[Background] Port connected: ${port.name}`);

    if (port.name === 'llm-stream') {
        port.onMessage.addListener(async (msg) => {
            console.log("[Background] Message received:", msg);

            if (msg.action === 'GENERATE_STREAM') {
                const { providerId, messages } = msg.data;

                console.log(`[Background] ===== STREAM REQUEST START =====`);
                console.log(`[Background] Provider: ${providerId}`);
                console.log(`[Background] Message count: ${messages?.length || 0}`);

                // Validate input
                if (!providerId) {
                    const error = 'No provider ID specified';
                    console.error(`[Background] ERROR: ${error}`);
                    port.postMessage({ type: 'ERROR', error });
                    return;
                }

                if (!messages || messages.length === 0) {
                    const error = 'No messages provided';
                    console.error(`[Background] ERROR: ${error}`);
                    port.postMessage({ type: 'ERROR', error });
                    return;
                }

                try {
                    // Fetch and decrypt API key
                    console.log(`[Background] Fetching config for ${providerId}...`);
                    const config = await LLMService.getProviderConfig(providerId);
                    console.log(`[Background] Config retrieved, hasKey: ${!!config.apiKey}, keyLength: ${config.apiKey?.length || 0}`);

                    // Ollama, OpenRouter don't strictly need API keys
                    const noKeyAllowed = ['ollama', 'openrouter'].includes(providerId);


                    const apiKey = config.apiKey || 'not-needed';

                    if (!config.apiKey && !noKeyAllowed) {
                        const error = `No API key configured for ${providerId}. Please add it in Settings.`;
                        console.error(`[Background] ERROR: ${error}`);
                        port.postMessage({ type: 'ERROR', error });
                        return;
                    }

                    console.log(`[Background] Starting stream for ${providerId}...`);
                    console.log(`[Background] Using API key: ${apiKey.substring(0, 10)}...`);

                    let chunkCount = 0;
                    let totalLength = 0;

                    // Stream response
                    await llmService.stream(providerId, messages, apiKey, (chunk) => {
                        chunkCount++;
                        totalLength += chunk.length;

                        console.log(`[Background] Chunk #${chunkCount}: ${chunk.length} chars, total: ${totalLength}`);
                        console.log(`[Background] Chunk preview: "${chunk.substring(0, 100)}..."`);

                        try {
                            port.postMessage({ type: 'CHUNK', content: chunk });
                            console.log(`[Background] Chunk #${chunkCount} sent to UI successfully`);
                        } catch (postError) {
                            console.error(`[Background] Failed to send chunk #${chunkCount}:`, postError);
                        }
                    });

                    console.log(`[Background] Stream completed successfully`);
                    console.log(`[Background] Total chunks: ${chunkCount}, Total length: ${totalLength}`);
                    port.postMessage({ type: 'DONE' });
                    console.log(`[Background] ===== STREAM REQUEST END =====`);

                } catch (error: any) {
                    console.error('[Background] ===== STREAM ERROR =====');
                    console.error('[Background] Error type:', error?.constructor?.name);
                    console.error('[Background] Error message:', error?.message);
                    console.error('[Background] Error stack:', error?.stack);
                    console.error('[Background] Full error:', error);

                    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';

                    try {
                        port.postMessage({
                            type: 'ERROR',
                            error: errorMessage,
                            details: {
                                name: error?.name,
                                status: error?.status,
                                stack: error?.stack?.substring(0, 200)
                            }
                        });
                        console.log('[Background] Error message sent to UI');
                    } catch (postError) {
                        console.error('[Background] Failed to send error to UI:', postError);
                    }

                    console.error('[Background] ===== STREAM ERROR END =====');
                }
            }
        });

        port.onDisconnect.addListener(() => {
            console.log('[Background] Port disconnected');
        });
    }
});

// Message listener for one-off tasks
chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
    console.log("[Background] Runtime message received:", _message);
    return false; // Synchronous response
});

// Ensure side panel opens on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log("[Background] Side panel behavior set"))
    .catch((error) => console.error("[Background] Side panel error:", error));

console.log("[Background] All listeners registered successfully");
