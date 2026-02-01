import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type'], duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 3000) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg",
                        "glass-elevated animate-slide-up",
                        "border",
                        toast.type === 'success' && "border-emerald-500/30 bg-emerald-500/10",
                        toast.type === 'error' && "border-red-500/30 bg-red-500/10",
                        toast.type === 'info' && "border-primary/30 bg-primary/10"
                    )}
                >
                    {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
                    {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
                    {toast.type === 'info' && <Info className="h-5 w-5 text-primary shrink-0" />}

                    <span className="text-sm flex-1">{toast.message}</span>

                    <button
                        onClick={() => onRemove(toast.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

// Simple toast function for use outside React
let toastFn: ((message: string, type?: Toast['type']) => void) | null = null;

export const setToastFn = (fn: typeof toastFn) => {
    toastFn = fn;
};

export const toast = {
    success: (message: string) => toastFn?.(message, 'success'),
    error: (message: string) => toastFn?.(message, 'error'),
    info: (message: string) => toastFn?.(message, 'info'),
};
