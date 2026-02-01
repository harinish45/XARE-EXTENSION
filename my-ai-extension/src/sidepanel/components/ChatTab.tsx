import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
    Send, X, StopCircle, Sparkles, Square,
    Copy, Mic, Volume2, VolumeX,
    Pin, PinOff, FileText, Lightbulb, Code, Languages, Scale,
    ListOrdered, Bug, RefreshCw, Database, ChevronDown, Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { captureVisibleTab } from '../../lib/utils/screenshot';
import { useStore } from '../../lib/store';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/vs2015.css';

import { PROMPT_TEMPLATES, promptEnhancer } from '../../lib/prompts/PromptEnhancer';
import { speechService } from '../../lib/speech/SpeechService';
import { useToast } from './ui/toast';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
    FileText: <FileText className="h-4 w-4" />,
    Lightbulb: <Lightbulb className="h-4 w-4" />,
    Code: <Code className="h-4 w-4" />,
    Languages: <Languages className="h-4 w-4" />,
    Sparkles: <Sparkles className="h-4 w-4" />,
    Scale: <Scale className="h-4 w-4" />,
    ListOrdered: <ListOrdered className="h-4 w-4" />,
    Bug: <Bug className="h-4 w-4" />,
    RefreshCw: <RefreshCw className="h-4 w-4" />,
    Database: <Database className="h-4 w-4" />,
};



export const ChatTab: React.FC = () => {
    const {
        activeModel, setActiveModel, messages, addMessage, setMessages,
        conversations, createNewConversation, loadConversation, deleteConversation,
        isTemporaryMode, toggleTemporaryMode,
        isTextOnlyMode, saveResponse, togglePinMessage, voiceEnabled
    } = useStore();
    const { addToast } = useToast();

    // Helper to format relative time
    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [autoContext, setAutoContext] = useState(true);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [selectedModel, setSelectedModel] = useState('OpenAI');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const portRef = useRef<chrome.runtime.Port | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-speak assistant responses when voice is enabled
    useEffect(() => {
        if (voiceEnabled && !isStreaming && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant' && lastMsg.content && !isSpeaking) {
                // Only speak new messages (within last 2 seconds)
                if (Date.now() - lastMsg.timestamp < 2000) {
                    handleSpeak(lastMsg.content);
                }
            }
        }
    }, [messages, isStreaming, voiceEnabled]);



    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copied to clipboard', 'success');
    };

    // Voice input
    const toggleListening = () => {
        if (isListening) {
            speechService.stopListening();
            setIsListening(false);
        } else {
            setIsListening(true);
            speechService.startListening(
                (transcript, isFinal) => {
                    setInput(transcript);
                    if (isFinal) {
                        setIsListening(false);
                    }
                },
                (error) => {
                    console.error('Speech error:', error);
                    setIsListening(false);
                },
                () => setIsListening(false)
            );
        }
    };

    // Text to speech
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                    setAttachedImage(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        } else {
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                    const textContent = `[File: ${file.name}]\n\`\`\`\n${ev.target.result}\n\`\`\``;
                    setInput(prev => (prev ? prev + '\n\n' + textContent : textContent));
                }
            };
            reader.readAsText(file);
        }
    };

    const clearImage = () => setAttachedImage(null);

    const stopGeneration = () => {
        if (portRef.current) {
            portRef.current.disconnect();
            portRef.current = null;
        }
        setIsStreaming(false);
        addMessage({ role: 'assistant', content: ' [Stopped]', timestamp: Date.now() });
    };

    const handleSpeak = (text: string) => {
        if (isSpeaking) {
            speechService.stopSpeaking();
            setIsSpeaking(false);
        } else {
            setIsSpeaking(true);
            speechService.speak(text, () => setIsSpeaking(false));
        }
    };

    // Prompt enhancer
    const handleEnhancePrompt = async () => {
        if (!input.trim() || isEnhancing) return;

        setIsEnhancing(true);
        try {
            const keyName = `api_key_${activeModel}`;
            const result = await chrome.storage.local.get(keyName) as Record<string, string>;
            const apiKey = result[keyName];

            if (!apiKey) {
                addMessage({ role: 'assistant', content: 'Please set your API key first.', timestamp: Date.now() });
                return;
            }

            const enhanced = await promptEnhancer.enhance(input, apiKey, activeModel);
            setInput(enhanced);
        } catch (e) {
            console.error('Enhance failed:', e);
        } finally {
            setIsEnhancing(false);
        }
    };

    // Apply template
    const applyTemplate = (prompt: string) => {
        setInput(prev => prev ? `${prompt}\n\n${prev}` : prompt);
    };

    const handleSend = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if ((!textToSend.trim() && !attachedImage) || isStreaming) return;

        const smartTriggerRegex = /(see|read|check|look at|analyze|summarize|explain) (this |my )?(tab|page|screen|site|website|content)|(answer|solve) (this|the) (question|problem|equation)/i;
        const isSmartTrigger = smartTriggerRegex.test(textToSend);

        let autoImage: string | null = null;
        let domContext: string | null = null;

        if ((autoContext || isSmartTrigger) && !attachedImage && !isStreaming) {
            try {
                const visionModels = ['openai', 'claude', 'gemini', 'openrouter', 'flash', 'ollama'];
                const isVisionModel = visionModels.some(m => activeModel.includes(m) || activeModel === m);

                if (isVisionModel) {
                    autoImage = await captureVisibleTab();
                } else {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    const tabId = tabs[0]?.id;

                    if (tabId) {
                        try {
                            const injectionResult = await chrome.scripting.executeScript({
                                target: { tabId },
                                func: () => {
                                    const title = document.title;
                                    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                                        .map(el => (el.textContent || '').trim())
                                        .filter(t => t.length > 0).slice(0, 10);
                                    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
                                        .map(el => (el.textContent || '').trim())
                                        .filter(t => t.length > 0 && t.length < 50).slice(0, 15);
                                    const links = Array.from(document.querySelectorAll('a'))
                                        .map(el => (el.textContent || '').trim())
                                        .filter(t => t.length > 0 && t.length < 50).slice(0, 15);
                                    const visibleText = document.body.innerText.substring(0, 2500);
                                    return { title, headings, buttons, links, visibleText };
                                }
                            });
                            const injectedData = injectionResult[0]?.result;
                            if (injectedData) {
                                domContext = `[PAGE CONTEXT]
Title: ${injectedData.title || 'Unknown'}
Headings: ${(injectedData.headings || []).join(' | ')}

${(injectedData.visibleText || '').substring(0, 2000)}
[END CONTEXT]

`;
                            }
                        } catch (injectErr) {
                            domContext = '';
                        }
                    }
                }
            } catch (e) {
                console.error("[XARE] Auto-capture failed:", e);
            }
        }

        const finalImage = isTextOnlyMode ? null : (attachedImage || autoImage);

        const messageContent = domContext
            ? `${domContext}User question: ${textToSend}`
            : (textToSend || (finalImage ? 'Analyze this image' : ''));

        const storeMsg = {
            role: 'user' as const,
            content: messageContent,
            images: finalImage ? [finalImage] : undefined,
            timestamp: Date.now()
        };

        addMessage(storeMsg);
        setInput('');
        setAttachedImage(null);
        setIsStreaming(true);

        addMessage({ role: 'assistant', content: '', timestamp: Date.now() + 1 });

        console.log('[ChatTab] Connecting to background...');
        const port = chrome.runtime.connect({ name: 'llm-stream' });
        portRef.current = port;

        let fullResponse = '';

        // Set up listener BEFORE sending message to avoid race condition
        port.onMessage.addListener((msg) => {
            console.log('[ChatTab] Received message:', msg.type, msg);

            if (msg.type === 'CHUNK') {
                fullResponse += msg.content;
                console.log('[ChatTab] Updating message, fullResponse length:', fullResponse.length);
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = fullResponse;
                    }
                    return newMsgs;
                });
            } else if (msg.type === 'DONE') {
                console.log('[ChatTab] Stream completed');
                setIsStreaming(false);
                port.disconnect();
                portRef.current = null;
            } else if (msg.type === 'ERROR') {
                console.error('[ChatTab] Error from background:', msg.error);
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    lastMsg.content = `Error: ${msg.error}`;
                    return newMsgs;
                });
                setIsStreaming(false);
                port.disconnect();
                portRef.current = null;
            }
        });

        const history = messages.concat(storeMsg).map(m => {
            if (m.images && m.images.length > 0) {
                return {
                    role: m.role,
                    content: [
                        { type: 'text', text: m.content },
                        { type: 'image_url', image_url: { url: m.images[0] } }
                    ]
                };
            }
            return { role: m.role, content: m.content };
        });

        console.log('[ChatTab] Sending GENERATE_STREAM:', { providerId: activeModel, messageCount: history.length });

        port.postMessage({
            action: 'GENERATE_STREAM',
            data: {
                providerId: activeModel,
                messages: history
            }
        });
    };

    const showEmptyState = messages.length === 1 && messages[0].role === 'assistant';

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {showEmptyState ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in">
                        {/* Greeting */}
                        <div className="text-center space-y-3">
                            <p className="text-sm text-muted-foreground">Hi Harinish</p>
                            <h3 className="text-2xl font-semibold">Where should we start?</h3>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={cn(
                            "flex w-full flex-col gap-2 animate-slide-up",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}>
                            {msg.images && msg.images.map((img, idx) => (
                                <img key={idx} src={img} alt="Attachment" className="max-w-[80%] rounded-xl border border-white/10 shadow-lg" />
                            ))}

                            <div className={cn(
                                "max-w-[85%] text-sm leading-relaxed overflow-hidden relative group",
                                msg.role === 'user'
                                    ? "bubble-user text-white"
                                    : "bubble-ai prose prose-invert prose-sm max-w-none break-words"
                            )}>
                                {msg.role === 'user' ? (
                                    msg.content.replace(/\[PAGE CONTEXT\][\s\S]*?\[END CONTEXT\]\s*/g, '')
                                ) : (
                                    <>
                                        {msg.content.startsWith('Error:') ? (
                                            // Error message styling
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                                <p className="text-red-400 text-sm font-medium mb-2">
                                                    {msg.content}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        console.log('[ChatTab] Retry button clicked');
                                                        // Find the previous user message
                                                        const userMsgIndex = messages.findIndex(m => m.timestamp === msg.timestamp) - 1;
                                                        if (userMsgIndex >= 0 && messages[userMsgIndex].role === 'user') {
                                                            // Remove error message
                                                            setMessages(prev => prev.filter(m => m.timestamp !== msg.timestamp));
                                                            // Retry with same input
                                                            setInput(messages[userMsgIndex].content);
                                                            setTimeout(() => {
                                                                const sendBtn = document.querySelector('[data-send-button]') as HTMLButtonElement;
                                                                sendBtn?.click();
                                                            }, 100);
                                                        }
                                                    }}
                                                    className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/20"
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                                    Retry
                                                </Button>
                                            </div>
                                        ) : (
                                            // Normal message
                                            <>
                                                <ReactMarkdown
                                                    rehypePlugins={[rehypeHighlight]}
                                                    components={{
                                                        code: (props) => {
                                                            const { children, className, ...rest } = props;
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            const codeText = String(children).replace(/\n$/, '');

                                                            return match ? (
                                                                <div className="my-3 code-block">
                                                                    <div className="code-block-header">
                                                                        <span className="text-xs text-muted-foreground font-mono">{match[1]}</span>
                                                                        <button
                                                                            onClick={() => copyToClipboard(codeText)}
                                                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                                        >
                                                                            <Copy className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <pre className="code-block-content">
                                                                        <code {...rest} className={className}>{children}</code>
                                                                    </pre>
                                                                </div>
                                                            ) : (
                                                                <code {...rest} className={cn("bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs", className)}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>

                                                {msg.content && (
                                                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => copyToClipboard(msg.content)} title="Copy">
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleSpeak(msg.content)} title="Speak">
                                                            {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn("h-7 w-7 rounded-lg", msg.pinned && "text-primary")}
                                                            onClick={() => togglePinMessage(msg.timestamp)}
                                                            title={msg.pinned ? "Unpin" : "Pin"}
                                                        >
                                                            {msg.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => saveResponse(msg.content)} title="Save">
                                                            <FileText className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {isStreaming && (
                    <div className="flex items-center gap-2.5 py-2">
                        <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                console.log('[ChatTab] Stop button clicked');
                                if (portRef.current) {
                                    portRef.current.disconnect();
                                    portRef.current = null;
                                }
                                setIsStreaming(false);
                                addToast('Generation stopped', 'info');
                            }}
                            className="ml-auto h-7 text-xs"
                        >
                            <Square className="h-3 w-3 mr-1.5" />
                            Stop
                        </Button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Antigravity Style */}
            <div className="border-t border-white/[0.04] bg-graphite-950 p-4">
                {attachedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={attachedImage} alt="Attached" className="max-w-[200px] rounded-lg border border-white/10" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-graphite-900 hover:bg-red-500"
                            onClick={clearImage}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}


                {/* Hidden File Input */}
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />

                {/* Input Field */}
                <Input
                    className="w-full mb-3 rounded-xl"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={isStreaming}
                />

                {
                    isTemporaryMode && (
                        <div className="mx-auto mb-2 flex items-center justify-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs rounded-full w-fit">
                            <span>🔒</span>
                            <span>Temporary Conversation Active</span>
                        </div>
                    )
                }

                {/* Toolbar Row - Antigravity Style */}
                <div className="flex items-center gap-2">
                    {/* Plus Menu - Comprehensive Features */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-9 w-9 rounded-lg hover:bg-white/5"
                                title="New & Features"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 p-0">
                            <div className="max-h-[500px] overflow-y-auto">
                                {/* New Chat */}
                                <div className="px-3 py-2 border-b border-white/10">
                                    <button
                                        onClick={() => createNewConversation(false)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                    >
                                        <Plus className="h-4 w-4 text-blue-400" />
                                        <div>
                                            <div className="text-sm font-medium">New Chat</div>
                                            <div className="text-xs text-muted-foreground">Start fresh conversation</div>
                                        </div>
                                    </button>
                                </div>

                                {/* Temporary Mode Toggle */}
                                <div className="px-3 py-2 border-b border-white/10">
                                    <button
                                        onClick={toggleTemporaryMode}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <span className="text-lg">🔒</span>
                                            <div>
                                                <div className="text-sm font-medium">Temporary Mode</div>
                                                <div className="text-xs text-muted-foreground">Auto-delete after session</div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-8 h-4 rounded-full transition-colors relative",
                                            isTemporaryMode ? "bg-orange-500" : "bg-white/20"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                                                isTemporaryMode ? "left-4.5" : "left-0.5"
                                            )} style={{ left: isTemporaryMode ? '18px' : '2px' }} />
                                        </div>
                                    </button>
                                </div>

                                {/* Recent Chats */}
                                {conversations.length > 0 && (
                                    <div className="px-3 py-2 border-b border-white/10">
                                        <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-1">Recent Chats</div>
                                        <div className="grid gap-0.5 max-h-[200px] overflow-y-auto">
                                            {conversations.slice(0, 5).map((chat) => (
                                                <button
                                                    key={chat.id}
                                                    onClick={() => loadConversation(chat.id)}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group relative"
                                                >
                                                    <span className="text-lg">💬</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate pr-6">{chat.title}</div>
                                                        <div className="text-xs text-muted-foreground">{formatTime(chat.timestamps)}</div>
                                                    </div>
                                                    {/* Delete button appears on hover */}
                                                    <div
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded cursor-pointer text-gray-400 hover:text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteConversation(chat.id);
                                                        }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Modes Section */}
                                <div className="px-3 py-2">
                                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-1">Modes</div>
                                    <div className="grid gap-0.5">
                                        {[
                                            { name: 'Chat', desc: 'General conversation', icon: '💬' },
                                            { name: 'Planning', desc: 'Strategic thinking', icon: '📋' },
                                            { name: 'Research', desc: 'Deep analysis', icon: '🔍' },
                                            { name: 'Code', desc: 'Programming help', icon: '💻' },
                                            { name: 'Writing', desc: 'Content creation', icon: '✍️' },
                                            { name: 'Study Mode', desc: 'Learning & education', icon: '📚' },
                                            { name: 'Deep Research', desc: 'Comprehensive investigation', icon: '🔬' },
                                            { name: 'Scoping Research', desc: 'Project scoping', icon: '🎯' },
                                            { name: 'Web Search', desc: 'Live web search', icon: '🌐' },
                                        ].map((mode) => (
                                            <button
                                                key={mode.name}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                            >
                                                <span className="text-lg">{mode.icon}</span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{mode.name}</div>
                                                    <div className="text-xs text-muted-foreground">{mode.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tools Section */}
                                <div className="px-3 py-2 border-t border-white/10">
                                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-1">Actions & Tools</div>
                                    <div className="grid gap-0.5">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-lg">📎</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">Upload File</div>
                                                <div className="text-xs text-muted-foreground">Image or text file</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={handleEnhancePrompt}
                                            disabled={isEnhancing}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-lg">✨</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">Enhance Prompt</div>
                                                <div className="text-xs text-muted-foreground">Improve using AI</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setAutoContext(!autoContext)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                        >
                                            <span className="text-lg">🎯</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">Auto-Context</div>
                                                <div className="text-xs text-muted-foreground">{autoContext ? 'Enabled' : 'Disabled'}</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Templates Section */}
                                <div className="px-3 py-2 border-t border-white/10">
                                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-1">Templates</div>
                                    <div className="grid gap-0.5">
                                        {PROMPT_TEMPLATES.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => applyTemplate(template.prompt)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                            >
                                                <span className="text-lg">{TEMPLATE_ICONS[template.icon] || '📝'}</span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{template.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{template.prompt}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Integration Section */}
                                <div className="px-3 py-2 border-t border-white/10">
                                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-1">Integrations</div>
                                    <div className="grid gap-0.5">
                                        {[
                                            { name: 'MCP Servers', desc: 'Model Context Protocol', icon: '🔌' },
                                            { name: 'Add Connectors', desc: 'Connect external tools', icon: '🔗' },
                                            { name: 'Apps', desc: 'Installed applications', icon: '📦' },
                                        ].map((tool) => (
                                            <button
                                                key={tool.name}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                            >
                                                <span className="text-lg">{tool.icon}</span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{tool.name}</div>
                                                    <div className="text-xs text-muted-foreground">{tool.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Mode Selector Dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 h-9 gap-1.5 text-xs hover:bg-white/5"
                            >
                                <span className="capitalize">Planning</span>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-56 p-2">
                            <div className="grid gap-1">
                                {['Chat', 'Planning', 'Research', 'Code', 'Writing'].map((mode) => (
                                    <button
                                        key={mode}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Model Selector Dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 h-9 gap-1.5 text-xs hover:bg-white/5"
                            >
                                <span>{selectedModel}</span>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-72 p-2 max-h-96 overflow-y-auto">
                            <div className="grid gap-1">
                                {/* OpenAI */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('OpenAI');
                                        setActiveModel('openai');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    OpenAI
                                </button>

                                {/* Anthropic */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('Anthropic');
                                        setActiveModel('anthropic');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    Anthropic
                                </button>

                                {/* Gemini */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('Gemini');
                                        setActiveModel('gemini');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    Gemini
                                </button>

                                {/* Perplexity */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('Perplexity');
                                        setActiveModel('perplexity');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    Perplexity
                                </button>

                                {/* Azure */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('Azure');
                                        setActiveModel('azure');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    Azure
                                </button>

                                {/* DeepSeek */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('DeepSeek');
                                        setActiveModel('deepseek');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    DeepSeek
                                </button>

                                {/* Ollama */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('Ollama (Local)');
                                        setActiveModel('ollama');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    Ollama (Local)
                                </button>

                                {/* OpenRouter */}
                                <button
                                    onClick={() => {
                                        setSelectedModel('OpenRouter');
                                        setActiveModel('openrouter');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                                >
                                    OpenRouter
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Microphone Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9 rounded-lg hover:bg-white/5"
                        onClick={toggleListening}
                        disabled={isStreaming}
                        title="Voice input"
                    >
                        <Mic className="h-4 w-4" />
                    </Button>

                    {/* Send or Stop button */}
                    {isStreaming ? (
                        <Button size="icon" onClick={stopGeneration} variant="destructive" className="shrink-0 h-9 w-9 rounded-lg">
                            <StopCircle className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button size="icon" onClick={() => handleSend()} className="shrink-0 h-9 w-9 rounded-lg shadow-lg shadow-primary/30" data-send-button>
                            <Send className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div >
        </div >
    );
};
