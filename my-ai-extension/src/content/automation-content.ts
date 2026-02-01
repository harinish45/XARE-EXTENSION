import { AutomationEngine, type AutomationAction } from './AutomationEngine';

// Initialize automation engine
const engine = new AutomationEngine();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PING_ENGINE') {
        sendResponse({ alive: true });
        return true;
    }

    if (message.type === 'EXECUTE_AUTOMATION') {
        const action: AutomationAction = message.action;

        engine.execute(action)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });

        return true; // Keep message channel open for async response
    }

    return false;
});

console.log('🤖 Automation content script loaded');
