import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ModelSelector } from './components/ModelSelector';
import { ChatTab } from './components/ChatTab';
import { WorkflowsTab } from './components/WorkflowsTab';
import { SettingsTab } from './components/SettingsTab';
import { MessageSquare, Zap, Settings } from 'lucide-react';
import { useStore } from '../lib/store';

function App() {
  const { activeModel, setActiveModel } = useStore();
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden font-sans antialiased">
      {/* Header */}
      <header className="flex h-14 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur z-10 sticky top-0">
        <div className="flex-1">
          <ModelSelector value={activeModel} onValueChange={setActiveModel} className="w-full" />
        </div>
      </header>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/20">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex gap-2 items-center text-xs font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex gap-2 items-center text-xs font-medium">
              <Zap className="h-3.5 w-3.5" />
              Auto
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex gap-2 items-center text-xs font-medium">
              <Settings className="h-3.5 w-3.5" />
              Config
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-full overflow-hidden">
          <ChatTab />
        </TabsContent>
        <TabsContent value="workflows" className="flex-1 overflow-y-auto mt-0">
          <WorkflowsTab />
        </TabsContent>
        <TabsContent value="settings" className="flex-1 overflow-y-auto mt-0">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
