import React from 'react';
import { cn } from '../../../lib/utils';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-white/[0.06]",
                className
            )}
        />
    );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => {
    return (
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === lines - 1 ? "w-3/4" : "w-full"
                    )}
                />
            ))}
        </div>
    );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={cn("glass rounded-xl p-4 space-y-3", className)}>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    );
};

export const SkeletonMessage: React.FC<{ isUser?: boolean }> = ({ isUser }) => {
    return (
        <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
            <div className={cn(
                "rounded-2xl p-4 space-y-2",
                isUser ? "bg-primary/20 w-2/3" : "glass w-3/4"
            )}>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                {!isUser && <Skeleton className="h-4 w-2/3" />}
            </div>
        </div>
    );
};

export const ChatSkeleton: React.FC = () => {
    return (
        <div className="space-y-4 p-4">
            <SkeletonMessage />
            <SkeletonMessage isUser />
            <SkeletonMessage />
        </div>
    );
};
