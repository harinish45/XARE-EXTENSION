const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    resizeWindow: (width, height) => ipcRenderer.send('window:resize', { width, height }),

    // AI chat
    chat: (message) => ipcRenderer.invoke('ai:chat', message),
    clearHistory: () => ipcRenderer.invoke('ai:clear-history'),
    getProviders: () => ipcRenderer.invoke('ai:get-providers'),

    // Actions
    executeAction: (action) => ipcRenderer.invoke('action:execute', action),
    executeSequence: (actions) => ipcRenderer.invoke('action:execute-sequence', actions),
    getAvailableActions: () => ipcRenderer.invoke('actions:get-available'),

    // Screen
    captureScreen: () => ipcRenderer.invoke('screen:capture'),
    analyzeScreen: (question) => ipcRenderer.invoke('screen:analyze', question),

    // Window info
    getActiveWindow: () => ipcRenderer.invoke('window:get-active'),
    listWindows: () => ipcRenderer.invoke('window:list'),

    // Task planning
    planTask: (taskDescription) => ipcRenderer.invoke('task:plan', taskDescription),

    // Memory
    getMemoryStats: () => ipcRenderer.invoke('memory:get-stats')
});
