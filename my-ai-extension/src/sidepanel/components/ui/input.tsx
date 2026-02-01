import * as React from "react"
import { cn } from "../../../lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // Base styles
                    "flex h-11 w-full rounded-xl px-4 py-2 text-sm",
                    // Glass background
                    "bg-white/5 backdrop-blur-sm",
                    // Border
                    "border border-white/10",
                    // Placeholder
                    "placeholder:text-muted-foreground/60",
                    // Focus state with gradient glow
                    "focus-visible:outline-none focus-visible:border-primary/50",
                    "focus-visible:ring-2 focus-visible:ring-primary/20",
                    "focus-visible:bg-white/[0.07]",
                    // Hover
                    "hover:border-white/20 hover:bg-white/[0.06]",
                    // Transition
                    "transition-all duration-200",
                    // File input
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    // Disabled
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
