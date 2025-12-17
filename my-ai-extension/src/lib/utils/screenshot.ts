export const captureVisibleTab = async (): Promise<string> => {
    try {
        // chrome.tabs.captureVisibleTab(windowId, options)
        // defined in @types/chrome: export function captureVisibleTab(windowId?: number, options?: ImageDetails): Promise<string>;
        // null is accepted for current window in standard API but types might require number | undefined.
        // passing nothing = current window.
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'jpeg', quality: 60 });
        return dataUrl;
    } catch (error) {
        console.error('Screenshot failed:', error);
        throw new Error('Failed to capture screenshot. Ensure specific host permissions or <all_urls> is active.');
    }
};
