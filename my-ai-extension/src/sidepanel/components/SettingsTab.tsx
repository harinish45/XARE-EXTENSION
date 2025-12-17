import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { PROVIDERS } from './ModelSelector';

export const SettingsTab: React.FC = () => {
    // TODO: Load saved keys from chrome.storage.local
    // For now, simple UI

    const handleSave = (providerId: string, value: string) => {
        console.log(`Saving key for ${providerId}:`, value);
        if (chrome?.storage?.local) {
            chrome.storage.local.set({ [`api_key_${providerId}`]: value });
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <h2 className="text-lg font-semibold mb-2">API Configuration</h2>
            {PROVIDERS.map((provider) => (
                <Card key={provider.id}>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base font-medium">{provider.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex gap-2">
                        <Input
                            type="password"
                            placeholder={`Enter ${provider.name} API Key`}
                            onChange={(e) => handleSave(provider.id, e.target.value)}
                            className="flex-1"
                        />
                    </CardContent>
                </Card>
            ))}
            <div className="h-4"></div>
        </div>
    );
};
