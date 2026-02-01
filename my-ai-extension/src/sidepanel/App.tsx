import { useState } from 'react';
import { ChatTab } from './components/ChatTab';
import { ToastProvider } from './components/ui/toast';
import { Plus, Settings } from 'lucide-react';
import { useStore } from '../lib/store';
import { SettingsPanel } from './components/SettingsPanel';

function App() {
  const { clearMessages } = useStore();
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);



  return (
    <ToastProvider>
      <div className="flex h-screen w-full flex-col bg-graphite-950 text-foreground overflow-hidden font-sans antialiased">
        {/* Minimal Header - Antigravity Style */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-graphite-950">
          {/* Left: + Icon for New Chat */}
          <button
            onClick={() => clearMessages()}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Right: Settings */}
          <button
            onClick={() => setIsSettingsPanelOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content - Just Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatTab />
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
