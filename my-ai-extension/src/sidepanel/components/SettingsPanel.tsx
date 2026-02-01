import React, { useState } from 'react';
import { X, Settings, User, Shield, Database, Key, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { APISettings } from './APISettings';
import { LLMProviderSettings } from './LLMProviderSettings';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    className,
}) => {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'personalization', label: 'Personalization', icon: User },
        { id: 'data', label: 'Data controls', icon: Database },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield },
        { id: 'llm-providers', label: 'LLM Providers', icon: Cpu },
        { id: 'api', label: 'API Keys', icon: Key },
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={cn(
                "fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50",
                "bg-graphite-950 border-l border-white/5 shadow-2xl",
                "overflow-hidden flex flex-col",
                "animate-slide-in-right",
                className
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-graphite-950">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-6 bg-graphite-900 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                                    isActive
                                        ? "border-blue-500 text-white"
                                        : "border-transparent text-gray-400 hover:text-white"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 bg-graphite-950">
                    {activeTab === 'general' && <GeneralSettings />}
                    {activeTab === 'personalization' && <PersonalizationSettings />}
                    {activeTab === 'data' && <DataControlsSettings />}
                    {activeTab === 'privacy' && <PrivacySettings />}
                    {activeTab === 'llm-providers' && <LLMProviderSettings />}
                    {activeTab === 'api' && <APISettings />}
                </div>
            </div>
        </>
    );
};

// General Settings Tab
const GeneralSettings: React.FC = () => (
    <div className="space-y-6">
        <SettingSection title="Response Preferences">
            <SettingToggle
                label="Web search"
                description="Enable web search for up-to-date information"
                defaultChecked={true}
            />
            <SettingToggle
                label="Multi-source research"
                description="Synthesize information from 5-15 sources"
                defaultChecked={true}
            />
            <SettingToggle
                label="Show sources"
                description="Display source citations with answers"
                defaultChecked={true}
            />
        </SettingSection>

        <SettingSection title="Voice & Audio">
            <SettingToggle
                label="Voice input"
                description="Enable voice-to-text input"
                defaultChecked={false}
            />
            <SettingToggle
                label="Voice commands"
                description="Always-listening mode with 'hey xare' wake word"
                defaultChecked={false}
            />
            <SettingToggle
                label="Read responses aloud"
                description="Automatically speak AI responses"
                defaultChecked={false}
            />
        </SettingSection>

        <SettingSection title="Interface">
            <SettingToggle
                label="Show contextual chips"
                description="Display context-aware prompt suggestions"
                defaultChecked={true}
            />
            <SettingToggle
                label="Compact mode"
                description="Reduce spacing for more content"
                defaultChecked={false}
            />
        </SettingSection>
    </div>
);

// Personalization Settings Tab
const PersonalizationSettings: React.FC = () => (
    <div className="space-y-6">
        <SettingSection title="Memory & Context">
            <SettingToggle
                label="Conversation memory"
                description="Remember context across conversations"
                defaultChecked={true}
            />
            <SettingToggle
                label="Learning from interactions"
                description="Improve responses based on your preferences"
                defaultChecked={true}
            />
        </SettingSection>

        <SettingSection title="Response Style">
            <SettingSelect
                label="Response length"
                options={['Concise', 'Balanced', 'Detailed']}
                defaultValue="Balanced"
            />
            <SettingSelect
                label="Tone"
                options={['Professional', 'Casual', 'Technical']}
                defaultValue="Professional"
            />
        </SettingSection>
    </div>
);

// Data Controls Settings Tab
const DataControlsSettings: React.FC = () => (
    <div className="space-y-6">
        <SettingSection title="Data Retention">
            <SettingSelect
                label="Auto-delete conversations"
                options={['Never', '24 hours', '7 days', '30 days', '90 days']}
                defaultValue="Never"
            />
            <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors">
                    Export all data
                </button>
                <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm transition-colors">
                    Delete all data
                </button>
            </div>
        </SettingSection>

        <SettingSection title="Training Data">
            <SettingToggle
                label="Never use my data for training"
                description="Guaranteed zero training on your conversations"
                defaultChecked={true}
            />
        </SettingSection>
    </div>
);

// Privacy & Security Settings Tab
const PrivacySettings: React.FC = () => (
    <div className="space-y-6">
        <SettingSection title="Compliance">
            <div className="flex flex-wrap gap-2">
                <Badge text="SOC 2 Type II" variant="green" />
                <Badge text="HIPAA" variant="green" />
                <Badge text="GDPR" variant="green" />
                <Badge text="PCI DSS" variant="green" />
            </div>
        </SettingSection>

        <SettingSection title="Audit Logging">
            <SettingToggle
                label="Enable audit logs"
                description="Track all data access and API calls (1-year retention)"
                defaultChecked={true}
            />
            <button className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
                Export audit logs
            </button>
        </SettingSection>

        <SettingSection title="Access Control">
            <SettingToggle
                label="SSO (Single Sign-On)"
                description="Google Workspace, Azure AD, Okta"
                defaultChecked={false}
            />
            <SettingToggle
                label="Two-factor authentication"
                description="Extra security for your account"
                defaultChecked={false}
            />
        </SettingSection>
    </div>
);

// Helper Components
const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const SettingToggle: React.FC<{
    label: string;
    description: string;
    defaultChecked?: boolean;
}> = ({ label, description, defaultChecked = false }) => {
    const [checked, setChecked] = useState(defaultChecked);

    return (
        <div className="flex items-start justify-between py-2">
            <div className="flex-1">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{description}</div>
            </div>
            <button
                onClick={() => setChecked(!checked)}
                className={cn(
                    "relative w-11 h-6 rounded-full transition-colors duration-200",
                    checked ? "bg-blue-500" : "bg-gray-600"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0.5"
                    )}
                />
            </button>
        </div>
    );
};

const SettingSelect: React.FC<{
    label: string;
    options: string[];
    defaultValue: string;
}> = ({ label, options, defaultValue }) => {
    const [value, setValue] = useState(defaultValue);

    return (
        <div className="flex items-center justify-between py-2">
            <div className="text-sm font-medium text-white">{label}</div>
            <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-3 py-1.5 bg-graphite-900 border border-white/5 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
            >
                {options.map((option) => (
                    <option key={option} value={option} className="bg-graphite-900 text-white">
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};

const Badge: React.FC<{ text: string; variant: 'green' | 'blue' | 'purple' }> = ({ text, variant }) => (
    <span className={cn(
        "px-2 py-1 text-xs rounded",
        variant === 'green' && "bg-green-500/20 text-green-400",
        variant === 'blue' && "bg-blue-500/20 text-blue-400",
        variant === 'purple' && "bg-purple-500/20 text-purple-400"
    )}>
        {text}
    </span>
);
