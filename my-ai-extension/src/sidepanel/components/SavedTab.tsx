import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useStore, type ChatMessage } from '../../lib/store';
import { Trash2, Copy, Pin, FileText, Search } from 'lucide-react';

export const SavedTab: React.FC = () => {
    const { savedResponses, deleteSavedResponse, messages } = useStore();

    // Get pinned messages
    const pinnedMessages = messages.filter((m: ChatMessage) => m.pinned && m.role === 'assistant');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex-col h-full p-4 space-y-4 bg-graphite-950 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex">
            {/* Header */}
            <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Saved Items
                </h2>
                <p className="text-xs text-gray-400">
                    Your pinned messages and saved responses
                </p>
            </div>

            {/* Pinned Messages Section */}
            {pinnedMessages.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Pin className="h-4 w-4" />
                        Pinned ({pinnedMessages.length})
                    </h3>
                    <div className="space-y-2">
                        {pinnedMessages.map((msg: ChatMessage, i: number) => (
                            <Card key={i} className="overflow-hidden bg-graphite-900 border-white/5">
                                <CardContent className="p-3">
                                    <p className="text-sm text-gray-300 line-clamp-3 mb-2">
                                        {msg.content.substring(0, 200)}...
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            {new Date(msg.timestamp).toLocaleDateString()}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-white/5"
                                            onClick={() => copyToClipboard(msg.content)}
                                        >
                                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Responses Section */}
            <div className="space-y-2 flex-1">
                <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Saved Responses ({savedResponses.length})
                </h3>

                {savedResponses.length === 0 && pinnedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-graphite-900 flex items-center justify-center mb-4">
                            <Search className="h-8 w-8 text-gray-600" />
                        </div>
                        <h3 className="text-sm font-medium text-white mb-1">No saved items yet</h3>
                        <p className="text-xs text-gray-500 max-w-[200px]">
                            Pin messages or save responses to find them here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {savedResponses.map((saved) => (
                            <Card key={saved.id} className="overflow-hidden bg-graphite-900 border-white/5 group">
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="text-sm font-medium text-white line-clamp-1 flex-1">
                                            {saved.title}
                                        </h4>
                                        <button
                                            onClick={() => deleteSavedResponse(saved.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                        {saved.content.substring(0, 150)}...
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            {new Date(saved.timestamp).toLocaleDateString()}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-white/5"
                                            onClick={() => copyToClipboard(saved.content)}
                                        >
                                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
