// Voice Commands Service

export interface VoiceCommand {
    phrase: string;
    action: () => void;
    description: string;
}

export class VoiceCommandsService {
    private recognition: any;
    private isListening = false;
    private commands: VoiceCommand[] = [];
    private wakeWord = 'hey xare';

    constructor() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.setupRecognition();
        }
    }

    private setupRecognition(): void {
        if (!this.recognition) return;

        this.recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('')
                .toLowerCase();

            // Check for wake word
            if (transcript.includes(this.wakeWord)) {
                this.handleWakeWord(transcript);
            }
        };

        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
        };
    }

    private handleWakeWord(transcript: string): void {
        // Extract command after wake word
        const commandText = transcript.split(this.wakeWord)[1]?.trim();
        if (!commandText) return;

        // Find matching command
        const command = this.commands.find(cmd =>
            commandText.includes(cmd.phrase.toLowerCase())
        );

        if (command) {
            command.action();
        }
    }

    // Register a voice command
    registerCommand(phrase: string, action: () => void, description: string): void {
        this.commands.push({ phrase, action, description });
    }

    // Start listening
    startListening(): void {
        if (!this.recognition) {
            console.error('Speech recognition not supported');
            return;
        }

        this.isListening = true;
        this.recognition.start();
    }

    // Stop listening
    stopListening(): void {
        if (!this.recognition) return;

        this.isListening = false;
        this.recognition.stop();
    }

    // Get all registered commands
    getCommands(): VoiceCommand[] {
        return this.commands;
    }

    // Check if listening
    getIsListening(): boolean {
        return this.isListening;
    }
}

export const voiceCommandsService = new VoiceCommandsService();

// Register default commands
voiceCommandsService.registerCommand('new chat', () => {
    // Trigger new chat
    const event = new CustomEvent('voice-command', { detail: { action: 'new-chat' } });
    window.dispatchEvent(event);
}, 'Start a new conversation');

voiceCommandsService.registerCommand('search', () => {
    const event = new CustomEvent('voice-command', { detail: { action: 'search' } });
    window.dispatchEvent(event);
}, 'Open search');

voiceCommandsService.registerCommand('settings', () => {
    const event = new CustomEvent('voice-command', { detail: { action: 'settings' } });
    window.dispatchEvent(event);
}, 'Open settings');
