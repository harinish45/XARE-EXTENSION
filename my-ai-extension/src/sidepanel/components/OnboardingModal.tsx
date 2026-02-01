import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
    Sparkles, ArrowRight, Check, Zap, BookOpen,
    MessageSquare, Settings, X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to XARE',
        description: 'Your AI-powered browser assistant',
        icon: Sparkles,
        content: (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    XARE combines multiple AI models, web search, and automation to help you:
                </p>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400" />
                        Chat with 8 different AI models
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400" />
                        Research topics with web search
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400" />
                        Save and organize responses
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400" />
                        Use voice input/output
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: 'setup',
        title: 'Set Up Your API Keys',
        description: 'Add at least one API key to get started',
        icon: Settings,
        content: (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    XARE supports multiple AI providers. You'll need an API key from at least one:
                </p>
                <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-sm font-medium">OpenAI (Recommended)</p>
                        <p className="text-xs text-muted-foreground">GPT-4, GPT-4o - Get key at platform.openai.com</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-sm font-medium">Anthropic Claude</p>
                        <p className="text-xs text-muted-foreground">Get key at console.anthropic.com</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-sm font-medium">Google Gemini</p>
                        <p className="text-xs text-muted-foreground">Get key at aistudio.google.com</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    💡 Tip: You can add more API keys later in Settings
                </p>
            </div>
        )
    },
    {
        id: 'features',
        title: 'Quick Tour',
        description: 'Learn the key features',
        icon: Zap,
        content: (
            <div className="space-y-3">
                <div className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                    <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Chat Tab</p>
                        <p className="text-xs text-muted-foreground">
                            Use the Wand icon to enhance prompts, Templates for quick actions
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                    <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Auto Tab</p>
                        <p className="text-xs text-muted-foreground">
                            Deep Research mode for comprehensive topic analysis
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                    <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">Keyboard Shortcuts</p>
                        <p className="text-xs text-muted-foreground">
                            Ctrl+Shift+X to open, Ctrl+Shift+N for new chat
                        </p>
                    </div>
                </div>
            </div>
        )
    }
];

export const OnboardingModal: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => {
            onComplete();
            // Mark onboarding as complete
            chrome.storage.local.set({ 'xare-onboarding-complete': true });
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <Card className="max-w-lg w-full mx-4 glass-elevated">
                <CardContent className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                                <step.icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">{step.title}</h2>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSkip}
                            className="shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="min-h-[200px]">
                        {step.content}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 flex-1 rounded-full transition-colors",
                                    i <= currentStep ? "bg-primary" : "bg-white/10"
                                )}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-muted-foreground"
                        >
                            Skip Tour
                        </Button>
                        <Button onClick={handleNext}>
                            {isLastStep ? 'Get Started' : 'Next'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
