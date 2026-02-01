import React, { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { voiceCommandsService } from '../../../lib/voice/VoiceCommandsService';
import { Button } from '../ui/button';

export function VoiceVisualizer() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(20));

    useEffect(() => {
        // Check initial state
        setIsListening(voiceCommandsService.getIsListening());

        // Animate waveform when listening
        if (isListening) {
            const interval = setInterval(() => {
                setWaveHeights(Array(20).fill(0).map(() => Math.random() * 100));
            }, 100);
            return () => clearInterval(interval);
        } else {
            setWaveHeights(Array(20).fill(20));
        }
    }, [isListening]);

    const toggleListening = () => {
        if (isListening) {
            voiceCommandsService.stopListening();
            setIsListening(false);
        } else {
            voiceCommandsService.startListening();
            setIsListening(true);
        }
    };

    const commands = voiceCommandsService.getCommands();

    return (
        <div className="p-3 border-b border-white/5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-3 h-3 rounded-full transition-colors",
                        isListening ? "bg-red-500 animate-pulse" : "bg-gray-500"
                    )} />
                    <span className="text-sm">
                        {isListening ? 'Listening...' : 'Say "Hey XARE"'}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleListening}
                    className="h-8 w-8"
                >
                    {isListening ? (
                        <MicOff className="w-4 h-4 text-red-400" />
                    ) : (
                        <Mic className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Waveform */}
            <div className="glass-subtle p-4 rounded-lg">
                <div className="h-20 flex items-end justify-center gap-1">
                    {waveHeights.map((height, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-1 bg-blue-500 rounded-full transition-all duration-100",
                                !isListening && "bg-gray-600"
                            )}
                            style={{
                                height: `${height}%`,
                                minHeight: '20%'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Transcript */}
            {transcript && (
                <div className="glass-subtle p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Last heard:</div>
                    <div className="text-sm italic">"{transcript}"</div>
                </div>
            )}

            {/* Available Commands */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Available Commands ({commands.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {commands.map((cmd, i) => (
                        <div key={i} className="glass-subtle p-2 rounded text-xs">
                            <div className="font-medium">"Hey XARE, {cmd.phrase}"</div>
                            <div className="text-muted-foreground text-[10px]">{cmd.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
