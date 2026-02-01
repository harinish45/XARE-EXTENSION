export const captureVisibleTab = async (): Promise<string> => {
    try {
        // Get the active tab in the current window to find its window ID
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];

        if (!activeTab?.windowId) {
            // Fallback: try getting the lastFocused window
            const lastFocusedWindow = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
            const windowId = lastFocusedWindow?.id;

            if (windowId) {
                console.log('[XARE] Using lastFocused window:', windowId);
                const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 70 });
                return dataUrl;
            }
            throw new Error('No active window found');
        }

        console.log('[XARE] Capturing window:', activeTab.windowId, 'tab:', activeTab.title);
        const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'jpeg', quality: 70 });
        return dataUrl;
    } catch (error) {
        console.error('[XARE] Screenshot failed:', error);
        throw new Error('Failed to capture screenshot. Ensure specific host permissions or <all_urls> is active.');
    }
};
