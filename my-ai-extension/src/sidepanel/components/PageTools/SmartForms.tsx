import React, { useState } from 'react';
import { Edit3, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

interface Props {
    onAutoFill: () => void;
    isLoading?: boolean;
}

export function SmartForms({ onAutoFill, isLoading }: Props) {
    const [autoDetect, setAutoDetect] = useState(true);
    const [formsFound, setFormsFound] = useState(0);

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium">Smart Forms</span>
                </div>
                {formsFound > 0 && (
                    <div className="text-xs text-green-400">
                        {formsFound} form{formsFound > 1 ? 's' : ''} detected
                    </div>
                )}
            </div>

            {/* Status Card */}
            <div className="glass-subtle p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        autoDetect ? "bg-green-500 animate-pulse" : "bg-gray-500"
                    )} />
                    <span className="text-sm">
                        {autoDetect ? 'Auto-detection enabled' : 'Manual mode'}
                    </span>
                </div>

                <div className="text-xs text-muted-foreground">
                    Forms will be automatically filled with intelligent suggestions based on context.
                </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Features</div>

                <div className="space-y-1.5">
                    {[
                        'Auto-detect form fields',
                        'Smart value suggestions',
                        'Validation before submit',
                        'Multi-step form support'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Settings */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Settings</div>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">Auto-detect forms</span>
                    <input
                        type="checkbox"
                        checked={autoDetect}
                        onChange={(e) => setAutoDetect(e.target.checked)}
                        className="rounded"
                    />
                </label>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">Validate before fill</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">Ask before submit</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                </label>
            </div>

            {/* Action Button */}
            <Button
                onClick={onAutoFill}
                disabled={isLoading || formsFound === 0}
                className="w-full h-9"
                variant="default"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Filling...
                    </>
                ) : (
                    <>
                        <Zap className="w-4 h-4 mr-2" />
                        Auto-Fill Forms
                    </>
                )}
            </Button>
        </div>
    );
}
