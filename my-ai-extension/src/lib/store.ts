import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[]; // Base64 strings
    timestamp: number;
}

interface AppState {
    // Model State
    activeModel: string;
    setActiveModel: (model: string) => void;

    // Chat State
    messages: ChatMessage[];
    addMessage: (msg: ChatMessage) => void;
    clearMessages: () => void;
    setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;

    // Sidebar/UI State
    isSidebarOpen: boolean;
    toggleSidebar: () => void;

    // Automation State
    automationStatus: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR';
    setAutomationStatus: (status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR') => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            activeModel: 'openai',
            setActiveModel: (model) => set({ activeModel: model }),

            messages: [{ role: 'assistant', content: 'Hello! I am your Omni-Agent. How can I help you today?', timestamp: Date.now() }],
            addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
            clearMessages: () => set({ messages: [] }),
            setMessages: (msgs) => set((state) => ({
                messages: typeof msgs === 'function' ? msgs(state.messages) : msgs
            })),

            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

            automationStatus: 'IDLE',
            setAutomationStatus: (status) => set({ automationStatus: status }),
        }),
        {
            name: 'omni-agent-storage',
            storage: createJSONStorage(() => localStorage), // Persist to localStorage
        }
    )
);
