import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Camera, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { captureVisibleTab } from '../../lib/utils/screenshot';
import { useStore } from '../../lib/store';

export const ChatTab: React.FC = () => {
    const { activeModel, messages, addMessage, setMessages } = useStore();
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleScreenshot = async () => {
        try {
            const dataUrl = await captureVisibleTab();
            setAttachedImage(dataUrl);
        } catch (err) {
            console.error(err);
            // Add system message or toast?
            addMessage({ role: 'assistant', content: 'Failed to capture screenshot. Check permissions.', timestamp: Date.now() });
        }
    };

    const clearImage = () => setAttachedImage(null);

    const handleSend = async () => {
        if ((!input.trim() && !attachedImage) || isStreaming) return;

        // Check API Key first (TODO: Move to store or service checker)
        let apiKey = '';
        const keyName = `api_key_${activeModel}`;
        const result = await chrome.storage.local.get(keyName) as Record<string, string>;
        apiKey = result[keyName];

        if (!apiKey) {
            addMessage({ role: 'user', content: input, timestamp: Date.now() });
            addMessage({ role: 'assistant', content: `Please set your API key for ${activeModel} in Settings.`, timestamp: Date.now() });
            setInput('');
            return;
        }

        // Construct Context
        // If image attached, content is array.
        if (attachedImage) {
            // Logic handled by storeMsg
        }

        // userMsg removed (unused) 
        // Types.ts LLMMessage has content as string|Array. 
        // Store ChatMessage has content string, but we can extend it or serialize it.
        // For now, let's keep store simple or update store type? 
        // Store type `ChatMessage` uses `images?: string[]`.
        // Let's adapt data for the Store separately from the LLM.

        const storeMsg = {
            role: 'user' as const,
            content: input || (attachedImage ? 'Image Analysis' : ''),
            images: attachedImage ? [attachedImage] : undefined,
            timestamp: Date.now()
        };

        addMessage(storeMsg);
        setInput('');
        setAttachedImage(null);
        setIsStreaming(true);

        // Initial assistant message placeholder
        const assistantMsgId = Date.now() + 1; // logical ID
        // We add a temp message to store? Or wait for first chunk?
        // Let's add empty.
        addMessage({ role: 'assistant', content: '', timestamp: assistantMsgId });

        const port = chrome.runtime.connect({ name: 'llm-stream' });

        // Prepare history for LLM (mapping Store -> LLMMessage)
        // We need to verify if LLMService can handle the store format.
        // Store: { role, content, images } -> LLMMessage: { role, content: string | [...] }
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

        // Send only necessary context (last N messages?)

        port.postMessage({
            action: 'GENERATE_STREAM',
            data: {
                providerId: activeModel,
                messages: history,
                apiKey
            }
        });

        let fullResponse = '';

        port.onMessage.addListener((msg) => {
            if (msg.type === 'CHUNK') {
                fullResponse += msg.content;
                // Update last message in store
                // This is inefficient with Zustand setMessages([...]) every chunk.
                // Ideally we'd update specific index.
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = fullResponse;
                    return newMsgs;
                });
            } else if (msg.type === 'DONE') {
                setIsStreaming(false);
                port.disconnect();
            } else if (msg.type === 'ERROR') {
                // handle error
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = `Error: ${msg.error}`;
                    return newMsgs;
                });
                setIsStreaming(false);
                port.disconnect();
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex w-full flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
                        {msg.images && msg.images.map((img, idx) => (
                            <img key={idx} src={img} alt="User upload" className="max-w-[80%] rounded-lg border border-border shadow-sm" />
                        ))}
                        <div className={cn(
                            "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                            msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted/50 text-foreground border border-border/50 rounded-bl-none"
                        )}>
                            {msg.content}
                        </div>
                        {/* Timeline / Status could go here */}
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-background/95 backdrop-blur pb-6">
                {attachedImage && (
                    <div className="relative mb-2 inline-block">
                        <img src={attachedImage} alt="Attachment" className="h-20 rounded border border-border" />
                        <button onClick={clearImage} className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow-sm hover:bg-destructive/90">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <div className="flex gap-3 items-center">
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-full" onClick={handleScreenshot} disabled={isStreaming}>
                        <Camera className="h-5 w-5" />
                    </Button>
                    <Input
                        className="flex-1 rounded-full px-4 border-border/60 hover:border-primary/50 focus-visible:ring-primary/20"
                        placeholder="Ask anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={isStreaming}
                    />
                    <Button size="icon" onClick={handleSend} className="shrink-0 h-10 w-10 rounded-full shadow-lg shadow-primary/20" disabled={isStreaming}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
