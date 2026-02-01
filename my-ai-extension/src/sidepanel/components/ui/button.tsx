import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                // Primary: Gradient with glow
                default: "gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110",

                // Destructive: Red with glow
                destructive: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90 hover:shadow-destructive/40",

                // Outline: Glass border
                outline: "border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20",

                // Secondary: Subtle glass
                secondary: "bg-secondary/80 text-secondary-foreground backdrop-blur-sm hover:bg-secondary",

                // Ghost: Transparent hover
                ghost: "hover:bg-white/10 hover:text-foreground",

                // Link: Underline style
                link: "text-primary underline-offset-4 hover:underline",

                // Glass: Full glassmorphism
                glass: "glass hover:bg-white/10 text-foreground",

                // Gradient Outline: Gradient border effect
                "gradient-outline": "gradient-border bg-transparent hover:bg-white/5 text-foreground",
            },
            size: {
                default: "h-10 px-5 py-2",
                sm: "h-9 rounded-md px-4 text-xs",
                lg: "h-12 rounded-xl px-8 text-base",
                icon: "h-10 w-10 rounded-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
