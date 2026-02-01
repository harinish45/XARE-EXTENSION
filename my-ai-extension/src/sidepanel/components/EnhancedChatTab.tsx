import React, { useState, useEffect, useCallback } from 'react';
import { MinimalSearchBar } from './MinimalSearchBar';
import { ToolsToolbar } from './ToolsToolbar';
import { WelcomeScreen } from './WelcomeScreen';
import { SettingsPanel } from './SettingsPanel';
import { CommandPalette, type CommandAction } from './CommandPalette';
import { useStore } from '../../lib/store';
import { useToast } from './ui/toast';
import { cn } from '../../lib/utils';
import { llmService } from '../../lib/llm/LLMService';
import type { LLMMessage } from '../../lib/llm/types';
import { tabContextService } from '../../lib/context/TabContextService';
import { AutomationService } from '../../lib/automation/AutomationService';
import {
    Search, FileText, Image as ImageIcon, ShoppingCart, Brain,
    FileUp
} from 'lucide-react';

export const EnhancedChatTab: React.FC = () => {
    const { messages, addMessage, setMessages, activeModel } = useStore();
    const { addToast } = useToast();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceCommandsActive, setIsVoiceCommandsActive] = useState(false);
    const [activeTools, setActiveTools] = useState<string[]>([]);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

    // handleSend function - THE CRUCIAL MISSING PIECE
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        // Add user message
        addMessage({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });

        // Check if this is an automation command
        if (AutomationService.isAutomationCommand(userMessage)) {
            try {
                // Get page summary for better automation planning
                const pageSummary = await AutomationService.getPageSummary();

                // Parse command into actions
                const actions = await AutomationService.parseCommand(userMessage, pageSummary);

                // Show what we're about to do
                const actionsList = actions.map((a, i) =>
                    `${i + 1}. ${a.type}: ${a.text || a.value || a.direction || ''}`
                ).join('\n');

                addMessage({
                    role: 'assistant',
                    content: `🤖 Executing automation:\n${actionsList}\n\nStarting...`,
                    timestamp: Date.now()
                });

                // Execute automation
                let progressMessage = '';
                const result = await AutomationService.executeAutomation(
                    actions,
                    undefined,
                    (action, _actionResult) => {
                        // Update progress
                        progressMessage += `\n✅ ${action.type} completed`;
                        setMessages(prev => {
                            const msgs = [...prev];
                            const lastMsg = msgs[msgs.length - 1];
                            if (lastMsg.role === 'assistant') {
                                lastMsg.content = `🤖 Executing automation:\n${actionsList}\n${progressMessage}`;
                            }
                            return msgs;
                        });
                    }
                );

                // Show final result
                setMessages(prev => {
                    const msgs = [...prev];
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = result.success
                            ? `✅ Automation complete!\n\n${result.message}\n${progressMessage}`
                            : `❌ Automation failed:\n\n${result.message}\n${progressMessage}`;
                    }
                    return msgs;
                });

                setIsLoading(false);
                return;

            } catch (error: any) {
                addMessage({
                    role: 'assistant',
                    content: `❌ Automation error: ${error.message}`,
                    timestamp: Date.now()
                });
                setIsLoading(false);
                return;
            }
        }

        // Prepare assistant message for streaming (regular chat)
        const assistantTimestamp = Date.now() + 1;
        addMessage({
            role: 'assistant',
            content: '',
            timestamp: assistantTimestamp
        });

        try {
            // Get current tab context (screenshot + content)
            const enrichedData = await tabContextService.enrichMessageWithContext(
                userMessage,
                true // include screenshot for vision models
            );

            // Check if current model supports vision
            const visionModels = ['openai', 'anthropic', 'gemini', 'ollama'];
            const supportsVision = visionModels.includes(activeModel);

            // Build message with context
            let finalMessage: string | Array<any> = enrichedData.enrichedMessage;

            // For vision models, include screenshot
            if (supportsVision && enrichedData.screenshot) {
                finalMessage = [
                    { type: 'text', text: enrichedData.enrichedMessage },
                    {
                        type: 'image_url',
                        image_url: { url: enrichedData.screenshot }
                    }
                ];
            }

            // Convert chat messages to LLM format
            const llmMessages: LLMMessage[] = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content
            }));

            // Add the new user message with context
            llmMessages.push({
                role: 'user',
                content: finalMessage
            });

            // Stream response
            let fullResponse = '';

            await llmService.chat({
                messages: llmMessages,
                providerId: activeModel,
                stream: true,
                onChunk: (chunk) => {
                    fullResponse += chunk;

                    // Update the assistant message with accumulated content
                    setMessages(prev => prev.map(msg =>
                        msg.timestamp === assistantTimestamp
                            ? { ...msg, content: fullResponse }
                            : msg
                    ));
                }
            });

            setIsLoading(false);

        } catch (error: any) {
            console.error('Chat error:', error);

            // Update assistant message with error
            setMessages(prev => prev.map(msg =>
                msg.timestamp === assistantTimestamp
                    ? {
                        ...msg,
                        content: `❌ Error: ${error.message}\n\nPlease check:\n1. API key is configured in Settings → LLM Providers\n2. Selected model (${activeModel}) is available\n3. Your internet connection`
                    }
                    : msg
            ));

            addToast(`Error: ${error.message}`);
            setIsLoading(false);
        }
    }, [input, isLoading, messages, activeModel, addMessage, setMessages, addToast]);


    // Command palette actions
    const commandActions: CommandAction[] = [
        {
            id: 'deep-research',
            name: 'Deep research',
            description: 'Multi-source research with citations',
            icon: <Search className="w-4 h-4" />,
            category: 'Research',
            keywords: ['research', 'search', 'find'],
            action: () => {
                setActiveTools(prev => [...prev, 'research']);
                addToast('Deep research mode activated');
            }
        },
        {
            id: 'summarize',
            name: 'Summarize page',
            description: 'Summarize current page content',
            icon: <FileText className="w-4 h-4" />,
            category: 'Quick Actions',
            keywords: ['summarize', 'summary', 'tldr'],
            action: () => {
                setInput('Summarize this page');
                addToast('Summarize mode ready');
            }
        },
        {
            id: 'create-image',
            name: 'Create image',
            description: 'Generate images with AI',
            icon: <ImageIcon className="w-4 h-4" />,
            category: 'Create',
            keywords: ['image', 'generate', 'create', 'draw'],
            action: () => {
                addToast('Image generation ready');
            }
        },
        {
            id: 'shopping',
            name: 'Shopping research',
            description: 'Product comparisons and recommendations',
            icon: <ShoppingCart className="w-4 h-4" />,
            category: 'Research',
            keywords: ['shopping', 'product', 'compare', 'buy'],
            action: () => {
                addToast('Shopping research mode');
            }
        },
        {
            id: 'thinking',
            name: 'Thinking mode',
            description: 'Show reasoning process',
            icon: <Brain className="w-4 h-4" />,
            category: 'Advanced',
            keywords: ['thinking', 'reasoning', 'explain'],
            action: () => {
                addToast('Thinking mode activated');
            }
        },
        {
            id: 'attach-files',
            name: 'Attach files',
            description: 'Upload images, PDFs, documents',
            icon: <FileUp className="w-4 h-4" />,
            category: 'Quick Actions',
            keywords: ['attach', 'upload', 'file'],
            action: () => {
                document.getElementById('file-upload')?.click();
            }
        },
    ];

    // Keyboard shortcut for command palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Contextual awareness for the chat
    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, () => {
            // TODO: Use this context for smarter prompting if needed
        });
    }, []);


    const handleToolClick = useCallback((tool: string) => {
        setActiveTools(prev =>
            prev.includes(tool)
                ? prev.filter(t => t !== tool)
                : [...prev, tool]
        );

        // Handle specific tool actions
        switch (tool) {
            case 'research':
                addToast('Deep research mode: Multi-source research activated');
                break;
            case 'sources':
                addToast('Sources selector: Choose your research sources');
                break;
            case 'apps':
                setIsCommandPaletteOpen(true);
                break;
            case 'reader':
                addToast('Reader mode: Clean reading view activated');
                break;
            case 'web':
                addToast('Web search toggled');
                break;
            case 'model':
                // Model selector is now in the toolbar itself
                addToast('Model selector: Choose your AI model');
                break;
            case 'attach':
                document.getElementById('file-upload')?.click();
                break;
            case 'settings':
                setIsSettingsPanelOpen(true);
                break;
        }
    }, [addToast]);

    const handlePromptClick = useCallback((prompt: string) => {
        setInput(prompt);
    }, []);

    const handleVoiceInput = useCallback(() => {
        setIsVoiceActive(prev => !prev);
        addToast(isVoiceActive ? 'Voice input stopped' : 'Voice input started');
    }, [isVoiceActive, addToast]);

    const handleVoiceCommands = useCallback(() => {
        setIsVoiceCommandsActive(prev => !prev);
        addToast(isVoiceCommandsActive ? 'Voice commands off' : 'Voice commands on - Say "hey xare" to activate');
    }, [isVoiceCommandsActive, addToast]);

    const hasMessages = messages.length > 0;

    return (
        <div className="flex flex-col h-full bg-graphite-950">
            {/* Welcome Screen (shown when no messages) */}
            {!hasMessages && (
                <WelcomeScreen
                    onPromptClick={handlePromptClick}
                />
            )}

            {/* Messages Area */}
            {hasMessages && (
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex gap-3",
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[80%] rounded-xl px-4 py-3",
                                    message.role === 'user'
                                        ? 'bg-blue-600 shadow-lg text-white'
                                        : 'bg-graphite-900 border border-white/5 shadow-md'
                                )}
                            >
                                <p className="text-sm">{message.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 space-y-3 border-t border-white/10">
                {/* Tools Toolbar */}
                <ToolsToolbar
                    onToolClick={handleToolClick}
                    activeTools={activeTools}
                />

                {/* Minimal Search Bar */}
                <MinimalSearchBar
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSend}
                    onVoiceInput={handleVoiceInput}
                    onVoiceCommands={handleVoiceCommands}
                    isVoiceActive={isVoiceActive}
                    isVoiceCommandsActive={isVoiceCommandsActive}
                    disabled={isLoading}
                    placeholder={isLoading ? 'Generating response...' : 'Ask anything. Type @ for mentions and / for shortcuts'}
                />
            </div>

            {/* Command Palette */}
            <CommandPalette
                actions={commandActions}
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={isSettingsPanelOpen}
                onClose={() => setIsSettingsPanelOpen(false)}
            />

            {/* Hidden file input */}
            <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        addToast(`File attached: ${file.name}`);
                    }
                }}
            />
        </div>
    );
};
