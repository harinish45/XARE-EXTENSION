import React, { useState, useEffect } from 'react';
import { Key, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiConfigService } from '../../lib/config/APIConfigService';

interface APISettingsProps {
    className?: string;
}

export const APISettings: React.FC<APISettingsProps> = ({ className }) => {
    const [daytonaKey, setDaytonaKey] = useState('');
    const [morphllmKey, setMorphllmKey] = useState('');
    const [tavilyKey, setTavilyKey] = useState('');
    const [firecrawlKey, setFirecrawlKey] = useState('');
    const [composioKey, setComposioKey] = useState('');

    const [showKeys, setShowKeys] = useState({
        daytona: false,
        morphllm: false,
        tavily: false,
        firecrawl: false,
        composio: false,
    });

    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        setLoading(true);
        await apiConfigService.initialize();

        const daytonaConfig = apiConfigService.getDaytonaConfig();
        const morphllmConfig = apiConfigService.getMorphLLMConfig();
        const tavilyConfig = apiConfigService.getTavilyConfig();
        const firecrawlConfig = apiConfigService.getFirecrawlConfig();
        const composioConfig = apiConfigService.getComposioConfig();

        setDaytonaKey(daytonaConfig.apiKey || '');
        setMorphllmKey(morphllmConfig.apiKey || '');
        setTavilyKey(tavilyConfig.apiKey || '');
        setFirecrawlKey(firecrawlConfig.apiKey || '');
        setComposioKey(composioConfig.apiKey || '');

        setLoading(false);
    };

    const handleSave = async () => {
        setLoading(true);

        await apiConfigService.setDaytonaKey(daytonaKey);
        await apiConfigService.setMorphLLMKey(morphllmKey);
        await apiConfigService.setTavilyKey(tavilyKey);
        await apiConfigService.setFirecrawlKey(firecrawlKey);
        await apiConfigService.setComposioKey(composioKey);

        setSaved(true);
        setLoading(false);

        setTimeout(() => setSaved(false), 3000);
    };

    const toggleShow = (key: keyof typeof showKeys) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const missingKeys = apiConfigService.getMissingKeys();

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">API Configuration</h3>
                <p className="text-sm text-gray-400">
                    Configure your API keys for enhanced features
                </p>
            </div>

            {/* Status Alert */}
            {missingKeys.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-500">Missing API Keys</p>
                        <p className="text-xs text-yellow-400 mt-1">
                            {missingKeys.join(', ')} API keys are not configured
                        </p>
                    </div>
                </div>
            )}

            {/* API Key Inputs */}
            <div className="space-y-4">
                {/* Daytona */}
                <APIKeyInput
                    label="Daytona API Key"
                    description="AI workspace management"
                    value={daytonaKey}
                    onChange={setDaytonaKey}
                    show={showKeys.daytona}
                    onToggleShow={() => toggleShow('daytona')}
                    placeholder="daytona_..."
                />

                {/* MorphLLM */}
                <APIKeyInput
                    label="MorphLLM API Key"
                    description="Advanced language model"
                    value={morphllmKey}
                    onChange={setMorphllmKey}
                    show={showKeys.morphllm}
                    onToggleShow={() => toggleShow('morphllm')}
                    placeholder="morph_..."
                />

                {/* Tavily */}
                <APIKeyInput
                    label="Tavily API Key"
                    description="Advanced web search"
                    value={tavilyKey}
                    onChange={setTavilyKey}
                    show={showKeys.tavily}
                    onToggleShow={() => toggleShow('tavily')}
                    placeholder="tvly-..."
                />

                {/* Firecrawl */}
                <APIKeyInput
                    label="Firecrawl API Key"
                    description="Web scraping & crawling"
                    value={firecrawlKey}
                    onChange={setFirecrawlKey}
                    show={showKeys.firecrawl}
                    onToggleShow={() => toggleShow('firecrawl')}
                    placeholder="fc-..."
                />

                {/* Composio */}
                <APIKeyInput
                    label="Composio API Key"
                    description="Tool integrations (Gmail, Slack, etc.)"
                    value={composioKey}
                    onChange={setComposioKey}
                    show={showKeys.composio}
                    onToggleShow={() => toggleShow('composio')}
                    placeholder="comp_..."
                />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                        "bg-blue-500 hover:bg-blue-600 text-white",
                        loading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {saved ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Key className="w-4 h-4" />
                            Save API Keys
                        </>
                    )}
                </button>

                {saved && (
                    <span className="text-sm text-green-400">
                        API keys saved successfully
                    </span>
                )}
            </div>

            {/* Help Text */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                    <strong>Note:</strong> API keys are stored securely in your browser's local storage.
                    They are never sent to our servers.
                </p>
            </div>
        </div>
    );
};

// Helper component for API key input
const APIKeyInput: React.FC<{
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggleShow: () => void;
    placeholder: string;
}> = ({ label, description, value, onChange, show, onToggleShow, placeholder }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-sm font-medium text-white">{label}</label>
                    <p className="text-xs text-gray-400">{description}</p>
                </div>
                {value && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-xs text-green-400">
                        <Check className="w-3 h-3" />
                        Configured
                    </div>
                )}
            </div>

            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full px-3 py-2 pr-10 rounded-lg",
                        "bg-graphite-900 border border-white/5",
                        "text-white placeholder:text-gray-500",
                        "focus:border-blue-500 focus:outline-none",
                        "transition-colors"
                    )}
                />
                <button
                    onClick={onToggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};
