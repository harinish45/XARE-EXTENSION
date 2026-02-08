import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Sun, Moon, Palette, Type } from 'lucide-react';
import { cn } from '../../lib/utils';

const ACCENT_COLORS = [
    { name: 'Purple', value: '250 100% 65%' },
    { name: 'Blue', value: '220 100% 60%' },
    { name: 'Cyan', value: '180 100% 50%' },
    { name: 'Green', value: '152 76% 46%' },
    { name: 'Orange', value: '38 92% 50%' },
    { name: 'Pink', value: '330 100% 65%' },
];

const FONT_SIZES = [
    { name: 'Small', value: '14px' },
    { name: 'Medium', value: '16px' },
    { name: 'Large', value: '18px' },
];

export const ThemeSettings: React.FC = () => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value);
    const [fontSize, setFontSize] = useState(FONT_SIZES[1].value);

    const applyTheme = (newTheme: 'dark' | 'light') => {
        setTheme(newTheme);
        chrome.storage.local.set({ 'xare-theme': newTheme });
    };

    const applyAccentColor = (color: string) => {
        setAccentColor(color);
        chrome.storage.local.set({ 'xare-accent': color });
    };

    const applyFontSize = (size: string) => {
        setFontSize(size);
        chrome.storage.local.set({ 'xare-font-size': size });
    };

    React.useEffect(() => {
        document.documentElement.classList.toggle('light', theme === 'light');
    }, [theme]);

    React.useEffect(() => {
        document.documentElement.style.setProperty('--primary', accentColor);
    }, [accentColor]);

    React.useEffect(() => {
        document.documentElement.style.fontSize = fontSize;
    }, [fontSize]);

    // Load saved preferences
    React.useEffect(() => {
        chrome.storage.local.get(['xare-theme', 'xare-accent', 'xare-font-size'], (result) => {
            if (result['xare-theme']) {
                setTheme(result['xare-theme']);
            }
            if (result['xare-accent']) {
                setAccentColor(result['xare-accent']);
            }
            if (result['xare-font-size']) {
                setFontSize(result['xare-font-size']);
            }
        });
    }, []);

    return (
        <div className="space-y-4">
            {/* Theme Toggle */}
            <Card variant="glass">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        Theme
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex gap-2">
                        <Button
                            variant={theme === 'dark' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => applyTheme('dark')}
                            className="flex-1"
                        >
                            <Moon className="h-4 w-4 mr-2" />
                            Dark
                        </Button>
                        <Button
                            variant={theme === 'light' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => applyTheme('light')}
                            className="flex-1"
                        >
                            <Sun className="h-4 w-4 mr-2" />
                            Light
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Accent Color */}
            <Card variant="glass">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Accent Color
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                        {ACCENT_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => applyAccentColor(color.value)}
                                className={cn(
                                    "h-10 rounded-lg border-2 transition-all",
                                    accentColor === color.value
                                        ? "border-white scale-105"
                                        : "border-white/20 hover:border-white/40"
                                )}
                                style={{ background: `hsl(${color.value})` }}
                                title={color.name}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Font Size */}
            <Card variant="glass">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Font Size
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex gap-2">
                        {FONT_SIZES.map((size) => (
                            <Button
                                key={size.value}
                                variant={fontSize === size.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => applyFontSize(size.value)}
                                className="flex-1"
                            >
                                {size.name}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                        Theme preferences are saved automatically and will persist across sessions.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
