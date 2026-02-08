import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Camera, Zap, Settings, Minimize2, MessageSquare, Loader2 } from "lucide-react";

export default function App() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleExpanded = () => {
        const newExpandedState = !isExpanded;
        setIsExpanded(newExpandedState);

        if (window.api && window.api.resizeWindow) {
            if (newExpandedState) {
                window.api.resizeWindow(450, 700);
            } else {
                window.api.resizeWindow(200, 200);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            // Call AI chat API
            const response = await window.api.chat(inputMessage);

            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: response.text || response.error || "I'm here to help!",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = async (action) => {
        const actionMessages = {
            analyze: "📸 Analyzing your screen...",
            automate: "⚡ Starting automation...",
            organize: "📁 Organizing files..."
        };

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: actionMessages[action],
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            if (action === 'analyze') {
                const response = await window.api.analyzeScreen("What's on my screen?");
                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: response.analysis || response.error || "Screen analysis complete!",
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: "Action completed! (Note: Full automation requires additional setup)",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-transparent">
            {/* Floating Icon (Collapsed State) */}
            {!isExpanded && (
                <div
                    onClick={toggleExpanded}
                    className="draggable-icon absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                    <div className="relative">
                        {/* Animated glow rings */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                        {/* Icon container with glassmorphism */}
                        <div className="relative bg-gradient-to-br from-blue-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl rounded-full p-8 shadow-2xl group-hover:scale-110 transition-all duration-300 border border-white/20">
                            <div className="text-6xl">🦅</div>
                        </div>

                        {/* Orbiting particles */}
                        <div className="absolute inset-0 rounded-full">
                            <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                            <div className="absolute bottom-0 right-1/2 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                            <div className="absolute top-1/2 right-0 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                    </div>

                    {/* Enhanced tooltip */}
                    <div className="absolute top-full mt-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Click to open AI Agent
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded State - Premium Chat Interface */}
            {isExpanded && (
                <div className="no-drag w-full h-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border-b border-white/10 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        AI Agent
                                    </h1>
                                    <p className="text-xs text-slate-400">Always ready to help</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleExpanded}
                                    className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors duration-200 group"
                                    title="Minimize"
                                >
                                    <Minimize2 className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-4 bg-slate-900/50 border-b border-white/5">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleQuickAction('analyze')}
                                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 rounded-xl transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40 group"
                            >
                                <Camera className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-slate-300">Analyze</span>
                            </button>
                            <button
                                onClick={() => handleQuickAction('automate')}
                                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 rounded-xl transition-all duration-200 border border-purple-500/20 hover:border-purple-500/40 group"
                            >
                                <Zap className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-slate-300">Automate</span>
                            </button>
                            <button
                                onClick={() => handleQuickAction('organize')}
                                className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-pink-600/20 to-pink-700/20 hover:from-pink-600/30 hover:to-pink-700/30 rounded-xl transition-all duration-200 border border-pink-500/20 hover:border-pink-500/40 group"
                            >
                                <Settings className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-slate-300">Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-2xl border border-white/5 mb-4">
                                    <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold mb-2 text-slate-200">Welcome!</h3>
                                    <p className="text-sm text-slate-400 max-w-xs">
                                        I'm your AI assistant. Ask me anything or use the quick actions above!
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-3 ${message.type === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                                        : 'bg-slate-800/50 text-slate-200 border border-white/5'
                                        }`}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs opacity-60 mt-1">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
                                <div className="bg-slate-800/50 rounded-2xl p-3 border border-white/5">
                                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-slate-900/50 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask me anything..."
                                className="flex-1 bg-slate-800/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-white/5 transition-all"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white p-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed group"
                            >
                                <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
