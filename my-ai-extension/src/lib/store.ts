import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[]; // Base64 strings
    sources?: { title: string; url: string; favicon?: string; snippet?: string }[];
    timestamp: number;
    pinned?: boolean;
}

interface SavedResponse {
    id: string;
    content: string;
    title: string;
    timestamp: number;
    tags?: string[];
}

interface AppState {
    // Model State
    activeModel: string;
    setActiveModel: (model: string) => void;

    // Chat State
    messages: ChatMessage[];
    conversations: { id: string; title: string; messages: ChatMessage[]; timestamps: number; isTemporary?: boolean }[];
    currentConversationId: string | null;
    isTemporaryMode: boolean;

    addMessage: (msg: ChatMessage) => void;
    clearMessages: () => void;
    setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;

    // Conversation Actions
    createNewConversation: (isTemporary?: boolean) => void;
    loadConversation: (id: string) => void;
    deleteConversation: (id: string) => void;
    toggleTemporaryMode: () => void;

    // Legacy Session Support (Keeping for compatibility)
    sessions: { id: string; title: string; messages: ChatMessage[]; timestamp: number }[];
    currentSessionId: string | null;
    saveCurrentSession: () => void;
    loadSession: (id: string) => void;
    startNewSession: () => void;
    deleteSession: (id: string) => void;

    // Saved/Pinned Responses
    savedResponses: SavedResponse[];
    saveResponse: (content: string, title?: string) => void;
    deleteSavedResponse: (id: string) => void;
    togglePinMessage: (timestamp: number) => void;

    // Sidebar/UI State
    isSidebarOpen: boolean;
    toggleSidebar: () => void;

    // Automation State
    automationStatus: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR';
    setAutomationStatus: (status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ERROR') => void;

    // Text-Only Mode
    isTextOnlyMode: boolean;
    toggleTextOnlyMode: () => void;

    // Voice Settings
    voiceEnabled: boolean;
    toggleVoice: () => void;

    // Chat Mode
    chatMode: string | null;
    setChatMode: (mode: string | null) => void;

    // Multi-tab
    selectedTabIds: number[];
    setSelectedTabIds: (ids: number[]) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            activeModel: 'openai',
            setActiveModel: (model) => set({ activeModel: model }),

            messages: [],
            conversations: [],
            currentConversationId: null,
            isTemporaryMode: false,

            // Legacy
            sessions: [],
            currentSessionId: null,

            addMessage: (msg) => {
                const state = get();
                const newMessages = [...state.messages, msg];

                // IF TEMPORARY MODE: Just update messages, don't save to conversations
                if (state.isTemporaryMode) {
                    set({ messages: newMessages });
                    return;
                }

                // IF REGULAR MODE: Update conversation history
                let conversationId = state.currentConversationId;
                let conversations = [...state.conversations];

                // If no current conversation, create one
                if (!conversationId) {
                    conversationId = Date.now().toString();
                    const title = msg.role === 'user' ? msg.content.slice(0, 40) : 'New Chat';
                    conversations.unshift({
                        id: conversationId,
                        title,
                        messages: newMessages,
                        timestamps: Date.now()
                    });
                } else {
                    // Update existing
                    const index = conversations.findIndex(c => c.id === conversationId);
                    if (index !== -1) {
                        conversations[index] = {
                            ...conversations[index],
                            messages: newMessages,
                            timestamps: Date.now()
                        };
                        // Move to top
                        const conv = conversations.splice(index, 1)[0];
                        conversations.unshift(conv);
                    }
                }

                // Enforce limit of 50
                if (conversations.length > 50) {
                    conversations = conversations.slice(0, 50);
                }

                set({
                    messages: newMessages,
                    conversations,
                    currentConversationId: conversationId
                });
            },

            clearMessages: () => set({ messages: [], currentConversationId: null }),

            setMessages: (msgs) => set((state) => ({
                messages: typeof msgs === 'function' ? msgs(state.messages) : msgs
            })),

            createNewConversation: (isTemporary = false) => {
                set({
                    messages: [],
                    currentConversationId: null,
                    isTemporaryMode: isTemporary
                });
            },

            loadConversation: (id) => {
                const state = get();
                const conv = state.conversations.find(c => c.id === id);
                if (conv) {
                    set({
                        messages: conv.messages,
                        currentConversationId: id,
                        isTemporaryMode: false
                    });
                }
            },

            deleteConversation: (id) => {
                set(state => ({
                    conversations: state.conversations.filter(c => c.id !== id),
                    messages: state.currentConversationId === id ? [] : state.messages,
                    currentConversationId: state.currentConversationId === id ? null : state.currentConversationId
                }));
            },

            toggleTemporaryMode: () => {
                const state = get();
                const newMode = !state.isTemporaryMode;
                set({
                    isTemporaryMode: newMode,
                    messages: [], // Clear view when switching
                    currentConversationId: null
                });
            },

            // Legacy methods
            saveCurrentSession: () => { },
            loadSession: () => { },
            startNewSession: () => { },
            deleteSession: () => { },

            // Saved Responses
            savedResponses: [],
            saveResponse: (content, title) => set((state) => ({
                savedResponses: [
                    {
                        id: Date.now().toString(),
                        content,
                        title: title || content.substring(0, 50) + '...',
                        timestamp: Date.now()
                    },
                    ...state.savedResponses
                ]
            })),
            deleteSavedResponse: (id) => set((state) => ({
                savedResponses: state.savedResponses.filter(r => r.id !== id)
            })),
            togglePinMessage: (timestamp) => set((state) => ({
                messages: state.messages.map(m =>
                    m.timestamp === timestamp ? { ...m, pinned: !m.pinned } : m
                )
            })),

            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

            automationStatus: 'IDLE',
            setAutomationStatus: (status) => set({ automationStatus: status }),

            isTextOnlyMode: false,
            toggleTextOnlyMode: () => set((state) => ({ isTextOnlyMode: !state.isTextOnlyMode })),

            voiceEnabled: false,
            toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),

            chatMode: null,
            setChatMode: (mode) => set({ chatMode: mode }),

            selectedTabIds: [],
            setSelectedTabIds: (ids) => set({ selectedTabIds: ids }),
        }),
        {
            name: 'xare-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
