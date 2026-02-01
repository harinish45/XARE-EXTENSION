// Form Intelligence Service - Auto-fill forms with AI

export class FormIntelligenceService {
    // Detect form fields on page
    async detectFormFields(): Promise<any[]> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return [];

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const fields = Array.from(document.querySelectorAll('input, textarea, select'));
                return fields.map(field => ({
                    type: (field as HTMLInputElement).type || 'text',
                    name: (field as HTMLInputElement).name,
                    id: field.id,
                    placeholder: (field as HTMLInputElement).placeholder,
                    required: (field as HTMLInputElement).required
                }));
            }
        });

        return result[0]?.result || [];
    }

    // Auto-fill form with context
    async autoFillForm(context: Record<string, string>): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data: Record<string, string>) => {
                Object.entries(data).forEach(([key, value]) => {
                    const field = document.querySelector(`[name="${key}"], #${key}`) as HTMLInputElement;
                    if (field) {
                        field.value = value;
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            },
            args: [context]
        });
    }
}

export const formIntelligenceService = new FormIntelligenceService();
