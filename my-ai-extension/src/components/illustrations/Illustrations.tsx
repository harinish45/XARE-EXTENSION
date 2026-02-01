// Custom Illustrations - SVG components for empty states

import React from 'react';

export const EmptyStateIllustration: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="url(#gradient1)" opacity="0.1" />
        <path d="M60 100 L100 60 L140 100 L100 140 Z" fill="url(#gradient2)" opacity="0.3" />
        <circle cx="100" cy="100" r="20" fill="currentColor" opacity="0.5" />
        <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
        </defs>
    </svg>
);

export const NoMessagesIllustration: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="60" width="120" height="80" rx="10" fill="url(#msgGradient)" opacity="0.2" />
        <circle cx="70" cy="90" r="8" fill="currentColor" opacity="0.4" />
        <line x1="90" y1="90" x2="150" y2="90" stroke="currentColor" strokeWidth="3" opacity="0.4" />
        <circle cx="70" cy="110" r="8" fill="currentColor" opacity="0.4" />
        <line x1="90" y1="110" x2="130" y2="110" stroke="currentColor" strokeWidth="3" opacity="0.4" />
        <defs>
            <linearGradient id="msgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
        </defs>
    </svg>
);

export const NoSavedIllustration: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 40 L120 80 L160 90 L130 120 L140 160 L100 140 L60 160 L70 120 L40 90 L80 80 Z"
            fill="url(#starGradient)" opacity="0.3" />
        <circle cx="100" cy="100" r="15" fill="currentColor" opacity="0.5" />
        <defs>
            <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
        </defs>
    </svg>
);

export const ErrorIllustration: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="4" opacity="0.3" />
        <line x1="70" y1="70" x2="130" y2="130" stroke="currentColor" strokeWidth="4" opacity="0.5" />
        <line x1="130" y1="70" x2="70" y2="130" stroke="currentColor" strokeWidth="4" opacity="0.5" />
    </svg>
);

export const LoadingIllustration: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="40" stroke="url(#loadGradient)" strokeWidth="8" strokeDasharray="60 200" opacity="0.8">
            <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="1s" repeatCount="indefinite" />
        </circle>
        <defs>
            <linearGradient id="loadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
        </defs>
    </svg>
);
