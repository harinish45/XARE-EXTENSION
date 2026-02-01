// Voice Input/Output Service using Web Speech API

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}

declare var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
};

export interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    error: string | null;
}

class SpeechService {
    private recognition: SpeechRecognition | null = null;
    private synthesis: SpeechSynthesis;

    constructor() {
        this.synthesis = window.speechSynthesis;
        this.initRecognition();
    }

    private initRecognition() {
        const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionConstructor) {
            this.recognition = new SpeechRecognitionConstructor();
            this.recognition!.continuous = false;
            this.recognition!.interimResults = true;
            this.recognition!.lang = 'en-US';
        }
    }

    isSupported(): { speech: boolean; recognition: boolean } {
        return {
            speech: 'speechSynthesis' in window,
            recognition: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        };
    }

    startListening(
        onResult: (transcript: string, isFinal: boolean) => void,
        onError: (error: string) => void,
        onEnd: () => void
    ): void {
        if (!this.recognition) {
            onError('Speech recognition not supported');
            return;
        }

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            let isFinal = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    isFinal = true;
                }
            }

            onResult(transcript, isFinal);
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            onError(event.error);
        };

        this.recognition.onend = () => {
            onEnd();
        };

        try {
            this.recognition.start();
        } catch (e) {
            onError('Failed to start recognition');
        }
    }

    stopListening(): void {
        this.recognition?.stop();
    }

    speak(
        text: string,
        onEnd?: () => void,
        options?: { rate?: number; pitch?: number; voice?: string }
    ): void {
        // Cancel any current speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate ?? 1;
        utterance.pitch = options?.pitch ?? 1;

        // Set voice if specified
        if (options?.voice) {
            const voices = this.synthesis.getVoices();
            const voice = voices.find(v => v.name === options.voice);
            if (voice) utterance.voice = voice;
        }

        utterance.onend = () => {
            onEnd?.();
        };

        this.synthesis.speak(utterance);
    }

    stopSpeaking(): void {
        this.synthesis.cancel();
    }

    getVoices(): SpeechSynthesisVoice[] {
        return this.synthesis.getVoices();
    }

    isSpeaking(): boolean {
        return this.synthesis.speaking;
    }
}

export const speechService = new SpeechService();
