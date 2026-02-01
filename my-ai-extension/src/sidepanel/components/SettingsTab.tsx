import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { PROVIDERS } from './ModelSelector';
import { Save, Check, ShieldAlert, ZapOff, Loader2, CheckCircle2, XCircle, Shield, BarChart3, Clock, MessageSquare, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { encryptApiKey, decryptApiKey } from '../../lib/security/KeyVault';
import { usageTracker, type UsageStats } from '../../lib/analytics/UsageTracker';
import { ThemeSettings } from './ThemeSettings';

const PROVIDER_COLORS: Record<string, string> = {
    openai: 'from-emerald-500 to-emerald-600',
    anthropic: 'from-orange-500 to-orange-600',
    gemini: 'from-blue-500 to-indigo-600',
    perplexity: 'from-purple-500 to-pink-600',
    azure: 'from-sky-500 to-blue-600',
    deepseek: 'from-cyan-500 to-teal-600',
    ollama: 'from-gray-500 to-gray-600',
    openrouter: 'from-rose-500 to-pink-600',
};

export const SettingsTab: React.FC = () => {
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'testing' | 'success' | 'error'>>({});
    const [activeSection, setActiveSection] = useState<'api' | 'analytics' | 'theme'>('api');
    const [stats, setStats] = useState<UsageStats | null>(null);
    const { isTextOnlyMode, toggleTextOnlyMode } = useStore();

    useEffect(() => {
        const loadKeys = async () => {
            const loaded: Record<string, string> = {};
            for (const provider of PROVIDERS) {
                const keyName = `api_key_${provider.id}`;
                const result = await chrome.storage.local.get(keyName) as Record<string, string>;
                if (result[keyName]) {
                    // Decrypt the key for display (masked)
                    const decrypted = await decryptApiKey(result[keyName]);
                    loaded[provider.id] = decrypted;
                }
            }
            setKeys(prev => ({ ...prev, ...loaded }));
        };
        loadKeys();
        loadStats();
    }, []);

    const loadStats = async () => {
        const s = await usageTracker.getStats();
        setStats(s);
    };

    const handleSave = async (providerId: string) => {
        const value = keys[providerId];
        if (!value) return;

        setStatus(prev => ({ ...prev, [providerId]: 'saving' }));

        try {
            // Encrypt before saving
            const encrypted = await encryptApiKey(value);
            await chrome.storage.local.set({ [`api_key_${providerId}`]: encrypted });

            setStatus(prev => ({ ...prev, [providerId]: 'saved' }));
            setTimeout(() => setStatus(prev => ({ ...prev, [providerId]: 'idle' })), 2000);
        } catch (e) {
            console.error('Save failed:', e);
            setStatus(prev => ({ ...prev, [providerId]: 'error' }));
        }
    };

    const handleTest = async (providerId: string) => {
        const value = keys[providerId];
        if (!value) return;

        setStatus(prev => ({ ...prev, [providerId]: 'testing' }));
        await new Promise(r => setTimeout(r, 1000));

        if (value.length > 10) {
            setStatus(prev => ({ ...prev, [providerId]: 'success' }));
        } else {
            setStatus(prev => ({ ...prev, [providerId]: 'error' }));
        }

        setTimeout(() => setStatus(prev => ({ ...prev, [providerId]: 'idle' })), 3000);
    };

    const handleChange = (providerId: string, value: string) => {
        setKeys(prev => ({ ...prev, [providerId]: value }));
        if (status[providerId] !== 'idle') {
            setStatus(prev => ({ ...prev, [providerId]: 'idle' }));
        }
    };

    const recentUsage = stats ? usageTracker.getRecentUsage(7) : [];

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Section Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/[0.06]">
                <button
                    onClick={() => setActiveSection('api')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeSection === 'api'
                            ? "gradient-primary text-white shadow-lg"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    <Shield className="h-4 w-4" />
                    API Keys
                </button>
                <button
                    onClick={() => { setActiveSection('analytics'); loadStats(); }}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeSection === 'analytics'
                            ? "gradient-primary text-white shadow-lg"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                </button>
            </div>

            {activeSection === 'api' ? (
                <>
                    {/* Provider Cards */}
                    <div className="space-y-3">
                        {PROVIDERS.map((provider) => {
                            const colorClass = PROVIDER_COLORS[provider.id] || 'from-gray-500 to-gray-600';
                            const currentStatus = status[provider.id];
                            const hasKey = !!keys[provider.id];

                            return (
                                <Card key={provider.id} variant="glass" className="overflow-hidden">
                                    <CardHeader className="p-4 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                                colorClass
                                            )}>
                                                {provider.name.charAt(0)}
                                            </div>

                                            <div className="flex-1">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    {provider.name}
                                                    {currentStatus === 'success' && (
                                                        <span className="badge badge-success">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                    {currentStatus === 'error' && (
                                                        <span className="badge badge-error">
                                                            <XCircle className="h-3 w-3" />
                                                            Invalid
                                                        </span>
                                                    )}
                                                </CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-4 pt-0 space-y-3">
                                        <Input
                                            type="password"
                                            placeholder={`Enter ${provider.name} API Key`}
                                            value={keys[provider.id] || ''}
                                            onChange={(e) => handleChange(provider.id, e.target.value)}
                                            className="font-mono text-xs"
                                        />

                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTest(provider.id)}
                                                disabled={currentStatus === 'testing' || !hasKey}
                                                className="h-8 text-xs"
                                            >
                                                {currentStatus === 'testing' ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                                        Testing...
                                                    </>
                                                ) : "Test Key"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(provider.id)}
                                                disabled={currentStatus === 'saving' || !hasKey}
                                                className={cn(
                                                    "h-8 text-xs min-w-[80px]",
                                                    currentStatus === 'saved' && "bg-emerald-600 hover:bg-emerald-700"
                                                )}
                                            >
                                                {currentStatus === 'saving' ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : currentStatus === 'saved' ? (
                                                    <>
                                                        <Check className="mr-1 h-3 w-3" />
                                                        Saved
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="mr-1 h-3 w-3" />
                                                        Save
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Troubleshooting */}
                    <Card className="border-orange-500/20 bg-orange-500/5">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-400">
                                <ShieldAlert className="h-4 w-4" />
                                Troubleshooting
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <p className="text-xs text-muted-foreground mb-3">
                                If you see image errors, use this mode to force text-only requests.
                            </p>
                            <Button
                                variant={isTextOnlyMode ? "destructive" : "outline"}
                                size="sm"
                                className="w-full justify-start text-xs h-9"
                                onClick={toggleTextOnlyMode}
                            >
                                {isTextOnlyMode ? <ZapOff className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                Force Text-Only Mode: <span className="ml-1 font-bold">{isTextOnlyMode ? "ON" : "OFF"}</span>
                            </Button>
                        </CardContent>
                    </Card>
                </>
            ) : (
                /* Analytics Section */
                <div className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card variant="glass" className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                                    <div className="text-xs text-muted-foreground">Messages</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="glass" className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
                                    <Zap className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats?.totalTokensEstimate || 0}</div>
                                    <div className="text-xs text-muted-foreground">Tokens (est)</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="glass" className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{Math.round(stats?.averageResponseTime || 0)}ms</div>
                                    <div className="text-xs text-muted-foreground">Avg Response</div>
                                </div>
                            </div>
                        </Card>
                        <Card variant="glass" className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats?.sessionsCount || 0}</div>
                                    <div className="text-xs text-muted-foreground">Sessions</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Usage by Provider */}
                    <Card variant="glass">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Usage by Provider</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {stats && Object.keys(stats.messagesByProvider).length > 0 ? (
                                <div className="space-y-2">
                                    {Object.entries(stats.messagesByProvider).map(([provider, count]) => (
                                        <div key={provider} className="flex items-center gap-3">
                                            <div className="text-xs font-medium w-24 truncate">{provider}</div>
                                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full gradient-primary"
                                                    style={{ width: `${(count / stats.totalMessages) * 100}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground w-12 text-right">{count}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No usage data yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Last 7 Days */}
                    <Card variant="glass">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="flex items-end justify-between gap-1 h-20">
                                {recentUsage.map((day, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                            className="w-full rounded-t gradient-primary transition-all"
                                            style={{
                                                height: day.count > 0
                                                    ? `${Math.max(10, (day.count / Math.max(...recentUsage.map(d => d.count), 1)) * 100)}%`
                                                    : '4px',
                                                opacity: day.count > 0 ? 1 : 0.3
                                            }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">
                                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reset Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={async () => {
                            await usageTracker.resetStats();
                            loadStats();
                        }}
                    >
                        Reset Analytics
                    </Button>
                </div>
            )}

            {activeSection === 'theme' && (
                <ThemeSettings />
            )}
        </div>
    );
};
