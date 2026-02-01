// 3D Card Component with tilt effect

import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

interface Card3DProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
}

export const Card3D: React.FC<Card3DProps> = ({
    children,
    className,
    intensity = 10
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * intensity;
        const rotateY = ((centerX - x) / centerX) * intensity;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "transition-transform duration-200 ease-out",
                "hover:shadow-2xl",
                className
            )}
            style={{
                transformStyle: 'preserve-3d',
                willChange: 'transform'
            }}
        >
            {children}
        </div>
    );
};

// Floating element component
interface FloatingElementProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
    children,
    className,
    delay = 0
}) => {
    return (
        <div
            className={cn("animate-float", className)}
            style={{
                animationDelay: `${delay}s`
            }}
        >
            {children}
        </div>
    );
};
