import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Camera, X, StopCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { captureVisibleTab } from '../../lib/utils/screenshot';
import { useStore } from '../../lib/store';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css'; // Premium dark theme for code

export const ChatTab: React.FC = () => {
    const { activeModel, messages, addMessage, setMessages } = useStore();
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const portRef = useRef<chrome.runtime.Port | null>(null);

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
            addMessage({ role: 'assistant', content: 'Failed to capture screenshot. Check permissions.', timestamp: Date.now() });
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

    const handleSend = async () => {
        if ((!input.trim() && !attachedImage) || isStreaming) return;

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

        // Placeholder for AI reply
        addMessage({ role: 'assistant', content: '', timestamp: Date.now() + 1 });

        const port = chrome.runtime.connect({ name: 'llm-stream' });
        portRef.current = port;

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
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = fullResponse;
                    }
                    return newMsgs;
                });
            } else if (msg.type === 'DONE') {
                setIsStreaming(false);
                port.disconnect();
                portRef.current = null;
            } else if (msg.type === 'ERROR') {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = `Error: ${msg.error}`;
                    return newMsgs;
                });
                setIsStreaming(false);
                port.disconnect();
                portRef.current = null;
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
                            "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm overflow-hidden",
                            msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted/50 text-foreground border border-border/50 rounded-bl-none prose prose-invert prose-sm max-w-none break-words"
                        )}>
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <ReactMarkdown
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                        code: (props) => {
                                            const { children, className, node, ...rest } = props;
                                            const match = /language-(\w+)/.exec(className || '')
                                            return match ? (
                                                <div className="relative group">
                                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-xs text-muted-foreground">{match[1]}</span>
                                                    </div>
                                                    <code {...rest} className={className}>
                                                        {children}
                                                    </code>
                                                </div>
                                            ) : (
                                                <code {...rest} className={cn("bg-muted px-1.5 py-0.5 rounded font-mono text-xs", className)}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
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
                    {isStreaming ? (
                        <Button size="icon" onClick={stopGeneration} variant="destructive" className="shrink-0 h-10 w-10 rounded-full shadow-lg">
                            <StopCircle className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button size="icon" onClick={handleSend} className="shrink-0 h-10 w-10 rounded-full shadow-lg shadow-primary/20">
                            <Send className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
