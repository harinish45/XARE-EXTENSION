import { AutomationEngine, type AutomationAction } from './AutomationEngine';

console.log("The Ghost in the Shell: Content Script Loaded");

const engine = new AutomationEngine();

// Listen for messages from Side Panel or Background
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    if (message.action === 'EXECUTE_AUTOMATION') {
        const action = message.data as AutomationAction;
        engine.execute(action)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep channel open for async response
    }
});
