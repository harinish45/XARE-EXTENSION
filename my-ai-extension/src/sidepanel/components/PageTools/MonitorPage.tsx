import React, { useState } from 'react';
import { Eye, Bell, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

interface Props {
    onStartMonitoring: (interval: number) => void;
    onStopMonitoring: () => void;
    isMonitoring?: boolean;
}

const CHECK_INTERVALS = [
    { value: 30, label: '30 sec' },
    { value: 60, label: '1 min' },
    { value: 300, label: '5 min' },
    { value: 900, label: '15 min' },
    { value: 3600, label: '1 hour' }
];

export function MonitorPage({ onStartMonitoring, onStopMonitoring, isMonitoring }: Props) {
    const [checkInterval, setCheckInterval] = useState(60);
    const [notifications, setNotifications] = useState(true);

    const handleToggleMonitoring = () => {
        if (isMonitoring) {
            onStopMonitoring();
        } else {
            onStartMonitoring(checkInterval);
        }
    };

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium">Monitor Page</span>
                </div>
                <div className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isMonitoring ? "text-green-400" : "text-muted-foreground"
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isMonitoring ? "bg-green-500 animate-pulse" : "bg-gray-500"
                    )} />
                    {isMonitoring ? 'Active' : 'Inactive'}
                </div>
            </div>

            {/* Status */}
            {isMonitoring && (
                <div className="glass-subtle p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Monitoring active</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Checking every {CHECK_INTERVALS.find(i => i.value === checkInterval)?.label}
                    </div>
                </div>
            )}

            {/* Check Interval */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Check Interval
                </div>

                <div className="grid grid-cols-5 gap-1">
                    {CHECK_INTERVALS.map((interval) => (
                        <button
                            key={interval.value}
                            onClick={() => setCheckInterval(interval.value)}
                            disabled={isMonitoring}
                            className={cn(
                                "p-2 rounded-lg text-center transition-all text-xs",
                                "hover:bg-white/10",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                checkInterval === interval.value
                                    ? "glass-subtle ring-2 ring-amber-500 bg-amber-500/10"
                                    : "bg-white/5"
                            )}
                        >
                            {interval.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Monitor Options */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">What to monitor</div>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">Text changes</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">New elements</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                </label>

                <label className="flex items-center justify-between glass-subtle p-2 rounded cursor-pointer">
                    <span className="text-xs">Price changes</span>
                    <input type="checkbox" className="rounded" />
                </label>
            </div>

            {/* Notifications */}
            <label className="flex items-center justify-between glass-subtle p-3 rounded cursor-pointer">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-sm">Desktop notifications</span>
                </div>
                <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    className="rounded"
                />
            </label>

            {/* Action Button */}
            <Button
                onClick={handleToggleMonitoring}
                className={cn(
                    "w-full h-9",
                    isMonitoring && "bg-red-500 hover:bg-red-600"
                )}
                variant={isMonitoring ? "destructive" : "default"}
            >
                {isMonitoring ? (
                    <>
                        <Eye className="w-4 h-4 mr-2" />
                        Stop Monitoring
                    </>
                ) : (
                    <>
                        <Clock className="w-4 h-4 mr-2" />
                        Start Monitoring
                    </>
                )}
            </Button>
        </div>
    );
}
