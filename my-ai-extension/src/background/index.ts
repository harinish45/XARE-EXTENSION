import { llmService } from '../lib/llm/LLMService';

console.log("The Ghost in the Shell: Background Worker Loaded");

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'llm-stream') {
        port.onMessage.addListener(async (msg) => {
            if (msg.action === 'GENERATE_STREAM') {
                const { providerId, messages, apiKey } = msg.data;
                try {
                    await llmService.streamResponse(providerId, messages, apiKey, (chunk) => {
                        port.postMessage({ type: 'CHUNK', content: chunk });
                    });
                    port.postMessage({ type: 'DONE' });
                } catch (error: any) {
                    port.postMessage({ type: 'ERROR', error: error.message });
                }
            }
        });
    }
});

// Message listener for one-off tasks (e.g. context menu or simple commands)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    console.log("Background received:", message);
    // Forwarding if needed, or handling auth
});

// Ensure side panel opens on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
