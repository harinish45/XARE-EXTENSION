import React, { useState, useEffect } from 'react';
import { Check, Eye, EyeOff, Cpu, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PROVIDERS } from './ModelSelector';
import { encryptApiKey, decryptApiKey } from '../../lib/security/KeyVault';

interface LLMProviderSettingsProps {
    className?: string;
}

// Provider metadata for better UX
const PROVIDER_META: Record<string, {
    description: string;
    placeholder: string;
    color: string;
    requiresEndpoint?: boolean;
    endpointPlaceholder?: string;
}> = {
    openai: {
        description: 'GPT-4, GPT-3.5, etc.',
        placeholder: 'sk-...',
        color: 'from-emerald-500 to-emerald-600'
    },
    anthropic: {
        description: 'Claude 3.5, Claude 3 Opus, etc.',
        placeholder: 'sk-ant-...',
        color: 'from-orange-500 to-orange-600'
    },
    gemini: {
        description: 'Gemini 1.5 Flash, Pro (Free tier available)',
        placeholder: 'AIza...',
        color: 'from-blue-500 to-indigo-600'
    },
    perplexity: {
        description: 'sonar-pro, Deep Research models',
        placeholder: 'pplx-...',
        color: 'from-purple-500 to-pink-600'
    },
    azure: {
        description: 'Azure-hosted OpenAI models',
        placeholder: 'azure-key-...',
        color: 'from-sky-500 to-blue-600',
        requiresEndpoint: true,
        endpointPlaceholder: 'https://your-resource.openai.azure.com'
    },
    deepseek: {
        description: 'DeepSeek V3, R1 models',
        placeholder: 'sk-...',
        color: 'from-cyan-500 to-teal-600'
    },
    ollama: {
        description: 'Local models (llama, llava, etc.)',
        placeholder: 'Leave empty for local',
        color: 'from-gray-500 to-gray-600',
        requiresEndpoint: true,
        endpointPlaceholder: 'http://localhost:11434'
    },
    openrouter: {
        description: 'Access to multiple providers',
        placeholder: 'sk-or-...',
        color: 'from-rose-500 to-pink-600'
    }
};

export const LLMProviderSettings: React.FC<LLMProviderSettingsProps> = ({ className }) => {
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [endpoints, setEndpoints] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingProvider, setSavingProvider] = useState<string | null>(null);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setLoading(true);
        const loadedKeys: Record<string, string> = {};
        const loadedEndpoints: Record<string, string> = {};

        for (const provider of PROVIDERS) {
            // Load API key
            const keyName = `api_key_${provider.id}`;
            const result = await chrome.storage.local.get(keyName) as Record<string, string>;
            if (result[keyName]) {
                try {
                    const decrypted = await decryptApiKey(result[keyName]);
                    loadedKeys[provider.id] = decrypted;
                } catch (e) {
                    console.error(`Failed to decrypt ${provider.id} key:`, e);
                }
            }

            // Load endpoint if applicable
            const providerMeta = PROVIDER_META[provider.id];
            if (providerMeta?.requiresEndpoint) {
                const endpointName = `api_endpoint_${provider.id}`;
                const endpointResult = await chrome.storage.local.get(endpointName) as Record<string, string>;
                if (endpointResult[endpointName]) {
                    loadedEndpoints[provider.id] = endpointResult[endpointName];
                }
            }
        }

        setKeys(loadedKeys);
        setEndpoints(loadedEndpoints);
        setLoading(false);
    };

    const handleSaveProvider = async (providerId: string) => {
        setSavingProvider(providerId);

        try {
            // Save API key if provided
            const key = keys[providerId];
            if (key) {
                const encrypted = await encryptApiKey(key);
                await chrome.storage.local.set({ [`api_key_${providerId}`]: encrypted });
            }

            // Save endpoint if applicable and provided
            const providerMeta = PROVIDER_META[providerId];
            if (providerMeta?.requiresEndpoint) {
                const endpoint = endpoints[providerId];
                if (endpoint) {
                    await chrome.storage.local.set({ [`api_endpoint_${providerId}`]: endpoint });
                }
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error('Save failed:', e);
        } finally {
            setSavingProvider(null);
        }
    };

    const toggleShowKey = (providerId: string) => {
        setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
    };

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    LLM Provider Configuration
                </h3>
                <p className="text-sm text-gray-400">
                    Configure API keys for AI language model providers
                </p>
            </div>

            {/* Provider List */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {PROVIDERS.map((provider) => {
                        const meta = PROVIDER_META[provider.id];
                        const hasKey = !!keys[provider.id];
                        const isSaving = savingProvider === provider.id;

                        return (
                            <div
                                key={provider.id}
                                className="p-4 bg-graphite-900 border border-white/5 rounded-lg space-y-3"
                            >
                                {/* Provider Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1 h-6 rounded-full bg-gradient-to-b",
                                                meta.color
                                            )} />
                                            <h4 className="text-sm font-semibold text-white">
                                                {provider.name}
                                            </h4>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 ml-3">
                                            {meta.description}
                                        </p>
                                    </div>
                                    {hasKey && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs text-green-400">
                                            <Check className="w-3 h-3" />
                                            Configured
                                        </div>
                                    )}
                                </div>

                                {/* API Key Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-300">
                                        API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKeys[provider.id] ? 'text' : 'password'}
                                            value={keys[provider.id] || ''}
                                            onChange={(e) => setKeys(prev => ({
                                                ...prev,
                                                [provider.id]: e.target.value
                                            }))}
                                            placeholder={meta.placeholder}
                                            className={cn(
                                                "w-full px-3 py-2 pr-10 rounded-lg",
                                                "bg-graphite-950 border border-white/5",
                                                "text-white placeholder:text-gray-500 text-sm",
                                                "focus:border-blue-500 focus:outline-none",
                                                "transition-colors"
                                            )}
                                        />
                                        <button
                                            onClick={() => toggleShowKey(provider.id)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showKeys[provider.id] ?
                                                <EyeOff className="w-4 h-4" /> :
                                                <Eye className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Endpoint Input (if required) */}
                                {meta.requiresEndpoint && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-300">
                                            Endpoint URL
                                        </label>
                                        <input
                                            type="text"
                                            value={endpoints[provider.id] || ''}
                                            onChange={(e) => setEndpoints(prev => ({
                                                ...prev,
                                                [provider.id]: e.target.value
                                            }))}
                                            placeholder={meta.endpointPlaceholder}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg",
                                                "bg-graphite-950 border border-white/5",
                                                "text-white placeholder:text-gray-500 text-sm",
                                                "focus:border-blue-500 focus:outline-none",
                                                "transition-colors"
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Save Button */}
                                <button
                                    onClick={() => handleSaveProvider(provider.id)}
                                    disabled={isSaving || (!keys[provider.id] && !endpoints[provider.id])}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                                        "text-sm font-medium transition-all",
                                        isSaving || (!keys[provider.id] && !endpoints[provider.id])
                                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                            : "bg-blue-500 hover:bg-blue-600 text-white"
                                    )}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : saved ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Saved!
                                        </>
                                    ) : (
                                        `Save ${provider.name.split(' ')[0]} Config`
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Help Text */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                <p className="text-xs text-blue-400">
                    <strong>Security:</strong> All API keys are encrypted and stored locally in your browser.
                    They are never sent to external servers except to the respective AI provider.
                </p>
                <p className="text-xs text-blue-400">
                    <strong>Free Options:</strong> Google Gemini offers a generous free tier.
                    Ollama is completely free for local models.
                </p>
            </div>
        </div>
    );
};
