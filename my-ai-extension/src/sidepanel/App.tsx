import { useState } from 'react';
import { ChatTab } from './components/ChatTab';
import { ToastProvider } from './components/ui/toast';
import { Plus, Settings, History, Clock, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { SettingsPanel } from './components/SettingsPanel';
import { Button } from './components/ui/button';
import { cn } from '../lib/utils';

function App() {
  const { clearMessages, conversations, loadConversation, deleteConversation, isTemporaryMode, toggleTemporaryMode } = useStore();
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [showConversations, setShowConversations] = useState(false);

  // Smart timestamp formatting
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (diffDays === 0) {
      return `Today ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday ${timeStr}`;
    } else if (diffDays < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${dayName} ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };


  return (
    <ToastProvider>
      <div className="flex h-screen w-full bg-graphite-950 text-foreground overflow-hidden font-sans antialiased">
        {/* Conversation History Sidebar */}
        {showConversations && (
          <div className="w-80 border-r border-white/5 bg-graphite-900 flex flex-col backdrop-blur-xl">
            {/* Header with Clear All */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-graphite-900/95">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Recent Chats</h2>
              </div>
              {conversations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Clear all conversations? This cannot be undone.')) {
                      conversations.forEach(conv => deleteConversation(conv.id));
                      setShowConversations(false);
                    }
                  }}
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group relative px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-all duration-150 border-b border-white/5"
                >
                  {/* Conversation Button */}
                  <button
                    onClick={() => {
                      loadConversation(conv.id);
                      setShowConversations(false);
                    }}
                    className="w-full text-left pr-8"
                  >
                    <p className="text-sm font-medium text-foreground mb-1.5 leading-tight line-clamp-2">
                      {conv.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(conv.timestamps)}
                    </p>
                  </button>

                  {/* Delete Button (appears on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${conv.title}"?`)) {
                        deleteConversation(conv.id);
                      }
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 transition-all"
                    title="Delete conversation"
                  >
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <History className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/70">Start chatting to see history here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-graphite-900/50 backdrop-blur-xl">
            {/* Left side - Title only */}
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-coral-500 bg-clip-text text-transparent">
              XARE
            </h1>

            {/* Center - Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
              <button
                onClick={toggleTemporaryMode}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  !isTemporaryMode
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Saved
              </button>
              <button
                onClick={toggleTemporaryMode}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  isTemporaryMode
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Temporary
              </button>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => clearMessages()}
                className="h-9 w-9 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center"
                title="New chat"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="h-9 w-9 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center"
                title="Recent conversations"
              >
                <History className="h-5 w-5" />
              </button>

              <button
                onClick={() => setIsSettingsPanelOpen(true)}
                className="h-9 w-9 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Content - Just Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatTab />
          </div>
        </div>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
        />
      </div>
    </ToastProvider>
  );
}

export default App;
