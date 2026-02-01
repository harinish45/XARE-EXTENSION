import * as React from "react"
import { cn } from "../../../lib/utils"

interface PopoverContextType {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PopoverContext = React.createContext<PopoverContextType>({ open: false, setOpen: () => { } });

const PopoverRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <PopoverContext.Provider value={{ open, setOpen }}>
            <div ref={ref} className="relative inline-block">
                {children}
            </div>
        </PopoverContext.Provider>
    );
};

const Trigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
    const { setOpen, open } = React.useContext(PopoverContext);
    return (
        <div onClick={() => setOpen(!open)} className="cursor-pointer inline-flex">
            {children}
        </div>
    );
};

const Content: React.FC<{ children: React.ReactNode; align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; className?: string }> = ({ children, align = 'center', side = 'bottom', className }) => {
    const { open } = React.useContext(PopoverContext);
    if (!open) return null;

    return (
        <div className={cn(
            // Position
            "absolute z-50",
            side === 'bottom' && "mt-2",
            side === 'top' && "bottom-full mb-2",
            // Alignment
            align === 'start' && "left-0",
            align === 'center' && "left-1/2 -translate-x-1/2",
            align === 'end' && "right-0",
            // Glass styling
            "rounded-xl",
            "bg-popover/95 backdrop-blur-xl",
            "border border-white/10",
            // Shadow
            "shadow-xl shadow-black/30",
            // Animation
            side === 'bottom' ? "animate-scale-in origin-top" : "animate-scale-in origin-bottom",
            // Text
            "text-popover-foreground",
            className
        )}>
            {children}
        </div>
    );
};

export { PopoverRoot as Popover, Trigger as PopoverTrigger, Content as PopoverContent }
