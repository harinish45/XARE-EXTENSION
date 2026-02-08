import React, { useState, useEffect } from "react";
import Plan from "./components/ui/agent-plan";


export default function App() {
    const [showDemo, setShowDemo] = useState(false);

    useEffect(() => {
        console.log("🚀 AI Desktop Agent initialized");
    }, []);

    return (
        <div className="bg-background text-foreground h-full overflow-auto p-2">
            <div className="bg-card border-border rounded-lg border shadow overflow-hidden">
                <div className="p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">AI Desktop Agent</h2>
                        <button
                            onClick={() => setShowDemo(!showDemo)}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                            {showDemo ? "Hide Demo" : "Show Demo"}
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-2">
                            I can help you automate tasks, control applications, and much more.
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors">
                                📸 Analyze Screen
                            </button>
                            <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors">
                                📁 Organize Files
                            </button>
                            <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors">
                                ❓ Help
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showDemo && (
                <div className="mt-4 bg-card border-border rounded-lg border shadow overflow-hidden">
                    <div className="p-4">
                        <h3 className="font-semibold mb-3">Task Management Demo</h3>
                        <Plan />
                    </div>
                </div>
            )}
        </div>
    );
}
