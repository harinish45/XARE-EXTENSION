/**
 * Voice Command Service
 * Handles voice recognition and command processing
 */

export interface VoiceCommand {
    command: string;
    confidence: number;
    timestamp: Date;
}

export type VoiceCommandCallback = (command: VoiceCommand) => void;

export class VoiceCommandService {
    private static instance: VoiceCommandService;
    private recognition: any = null;
    private isListening: boolean = false;
    private callbacks: VoiceCommandCallback[] = [];
    private language: string = 'en-US';

    private constructor() {
        this.initializeRecognition();
    }

    static getInstance(): VoiceCommandService {
        if (!VoiceCommandService.instance) {
            VoiceCommandService.instance = new VoiceCommandService();
        }
        return VoiceCommandService.instance;
    }

    /**
     * Initialize speech recognition
     */
    private initializeRecognition(): void {
        // Check for browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = this.language;

        this.recognition.onresult = (event: any) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.trim();
            const confidence = event.results[last][0].confidence;

            const voiceCommand: VoiceCommand = {
                command,
                confidence,
                timestamp: new Date()
            };

            this.handleCommand(voiceCommand);
        };

        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart recognition if no speech detected
                if (this.isListening) {
                    this.recognition.start();
                }
            }
        };

        this.recognition.onend = () => {
            // Restart recognition if still supposed to be listening
            if (this.isListening) {
                this.recognition.start();
            }
        };
    }

    /**
     * Start listening for voice commands
     */
    startListening(): void {
        if (!this.recognition) {
            throw new Error('Speech recognition not supported');
        }

        if (this.isListening) {
            return;
        }

        this.isListening = true;
        this.recognition.start();
    }

    /**
     * Stop listening for voice commands
     */
    stopListening(): void {
        if (!this.recognition || !this.isListening) {
            return;
        }

        this.isListening = false;
        this.recognition.stop();
    }

    /**
     * Check if currently listening
     * @returns True if listening
     */
    isActive(): boolean {
        return this.isListening;
    }

    /**
     * Set recognition language
     * @param language - Language code (e.g., 'en-US', 'es-ES')
     */
    setLanguage(language: string): void {
        this.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
    }

    /**
     * Register callback for voice commands
     * @param callback - Callback function
     */
    onCommand(callback: VoiceCommandCallback): void {
        this.callbacks.push(callback);
    }

    /**
     * Unregister callback
     * @param callback - Callback function to remove
     */
    offCommand(callback: VoiceCommandCallback): void {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    /**
     * Handle recognized command
     * @param command - Voice command
     */
    private handleCommand(command: VoiceCommand): void {
        // Notify all callbacks
        this.callbacks.forEach(callback => {
            try {
                callback(command);
            } catch (error) {
                console.error('Error in voice command callback:', error);
            }
        });
    }

    /**
     * Parse command for specific action
     * @param command - Command string
     * @returns Parsed action and parameters
     */
    parseCommand(command: string): { action: string; params: Record<string, any> } | null {
        const lowerCommand = command.toLowerCase();

        // Click commands
        if (lowerCommand.includes('click')) {
            const target = lowerCommand.replace(/click\s+(on\s+)?/i, '').trim();
            return { action: 'click', params: { target } };
        }

        // Type commands
        if (lowerCommand.includes('type')) {
            const text = lowerCommand.replace(/type\s+/i, '').trim();
            return { action: 'type', params: { text } };
        }

        // Navigate commands
        if (lowerCommand.includes('go to') || lowerCommand.includes('navigate to')) {
            const url = lowerCommand.replace(/(go to|navigate to)\s+/i, '').trim();
            return { action: 'navigate', params: { url } };
        }

        // Scroll commands
        if (lowerCommand.includes('scroll')) {
            const direction = lowerCommand.includes('up') ? 'up' : 'down';
            return { action: 'scroll', params: { direction } };
        }

        // Search commands
        if (lowerCommand.includes('search for')) {
            const query = lowerCommand.replace(/search for\s+/i, '').trim();
            return { action: 'search', params: { query } };
        }

        // Open commands
        if (lowerCommand.includes('open')) {
            const target = lowerCommand.replace(/open\s+/i, '').trim();
            return { action: 'open', params: { target } };
        }

        // Close commands
        if (lowerCommand.includes('close')) {
            const target = lowerCommand.replace(/close\s+/i, '').trim();
            return { action: 'close', params: { target } };
        }

        return null;
    }

    /**
     * Speak text using text-to-speech
     * @param text - Text to speak
     * @param options - Speech options
     */
    speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}): void {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        utterance.lang = this.language;

        speechSynthesis.speak(utterance);
    }

    /**
     * Stop speaking
     */
    stopSpeaking(): void {
        speechSynthesis.cancel();
    }
}
