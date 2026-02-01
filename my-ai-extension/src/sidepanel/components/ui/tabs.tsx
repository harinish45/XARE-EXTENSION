import * as React from "react"
import { cn } from "../../../lib/utils"

const TabsContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
} | null>(null)

const Tabs = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        value: string
        onValueChange: (value: string) => void
    }
>(({ className, value, onValueChange, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
        <div ref={ref} className={cn("", className)} {...props} />
    </TabsContext.Provider>
))
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            // Container styling
            "inline-flex items-center justify-center gap-1 p-1",
            // Glass background
            "rounded-xl bg-white/5 backdrop-blur-sm",
            // Border
            "border border-white/[0.06]",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isSelected = context?.value === value

    return (
        <button
            ref={ref}
            data-state={isSelected ? "active" : "inactive"}
            className={cn(
                // Base
                "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2",
                "rounded-lg text-sm font-medium",
                // Transition
                "transition-all duration-200",
                // Focus
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                // Disabled
                "disabled:pointer-events-none disabled:opacity-50",
                // Inactive state
                "text-muted-foreground hover:text-foreground hover:bg-white/5",
                // Active state - gradient background
                isSelected && [
                    "gradient-primary text-white",
                    "shadow-lg shadow-primary/20",
                ],
                className
            )}
            onClick={() => context?.onValueChange(value)}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (context?.value !== value) return null

    return (
        <div
            ref={ref}
            className={cn(
                "mt-2 animate-fade-in",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        />
    )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
