// Connector Marketplace UI

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { connectorRegistry } from '../../lib/connectors/base/BaseConnector';
import { GoogleDriveConnector } from '../../lib/connectors/google/GoogleDriveConnector';
import { HardDrive, Github, FileText, MessageSquare, Check, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

const CONNECTOR_ICONS: Record<string, any> = {
    'HardDrive': HardDrive,
    'Github': Github,
    'FileText': FileText,
    'MessageSquare': MessageSquare,
};

const AVAILABLE_CONNECTORS = [
    {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Access and search your Google Drive files',
        icon: 'HardDrive',
        category: 'storage',
        status: 'available'
    },
    {
        id: 'notion',
        name: 'Notion',
        description: 'Query databases and create pages',
        icon: 'FileText',
        category: 'productivity',
        status: 'coming-soon'
    },
    {
        id: 'github',
        name: 'GitHub',
        description: 'Search code and manage issues',
        icon: 'Github',
        category: 'development',
        status: 'coming-soon'
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send messages and search history',
        icon: 'MessageSquare',
        category: 'communication',
        status: 'coming-soon'
    },
];

export const ConnectorMarketplace: React.FC = () => {
    const [installedConnectors, setInstalledConnectors] = useState<Set<string>>(new Set());

    const handleInstall = async (connectorId: string) => {
        if (connectorId === 'google-drive') {
            const connector = new GoogleDriveConnector();
            await connector.authenticate();
            connectorRegistry.register(connector);
            setInstalledConnectors(prev => new Set([...prev, connectorId]));
        }
    };

    const handleUninstall = async (connectorId: string) => {
        const connector = connectorRegistry.get(connectorId);
        if (connector) {
            await connector.disconnect();
            setInstalledConnectors(prev => {
                const next = new Set(prev);
                next.delete(connectorId);
                return next;
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold">Connector Marketplace</h2>
                <p className="text-sm text-muted-foreground">
                    Connect external services to enhance your AI assistant
                </p>
            </div>

            <div className="grid gap-3">
                {AVAILABLE_CONNECTORS.map((connector) => {
                    const Icon = CONNECTOR_ICONS[connector.icon];
                    const isInstalled = installedConnectors.has(connector.id);
                    const isComingSoon = connector.status === 'coming-soon';

                    return (
                        <Card key={connector.id} variant="glass" className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                        isInstalled ? "gradient-primary" : "bg-white/10"
                                    )}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold">{connector.name}</h3>
                                            {isInstalled && (
                                                <span className="badge badge-success text-xs">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Installed
                                                </span>
                                            )}
                                            {isComingSoon && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                                    Coming Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {connector.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 rounded bg-white/5">
                                                {connector.category}
                                            </span>
                                            {!isComingSoon && (
                                                isInstalled ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUninstall(connector.id)}
                                                        className="h-7 text-xs"
                                                    >
                                                        Disconnect
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleInstall(connector.id)}
                                                        className="h-7 text-xs"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Connect
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
