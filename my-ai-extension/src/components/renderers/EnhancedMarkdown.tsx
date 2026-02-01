// Advanced renderers for tables, math, and diagrams

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface EnhancedMarkdownProps {
    content: string;
}

export const EnhancedMarkdown: React.FC<EnhancedMarkdownProps> = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
                // Enhanced table rendering
                table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-white/10 border border-white/10 rounded-lg" {...props} />
                    </div>
                ),
                thead: ({ node, ...props }) => (
                    <thead className="bg-white/5" {...props} />
                ),
                th: ({ node, ...props }) => (
                    <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider" {...props} />
                ),
                td: ({ node, ...props }) => (
                    <td className="px-4 py-2 text-sm text-muted-foreground border-t border-white/5" {...props} />
                ),
                tr: ({ node, ...props }) => (
                    <tr className="hover:bg-white/5 transition-colors" {...props} />
                ),
                // Enhanced code blocks
                code: ({ node, inline, className, children, ...props }: any) => {
                    if (inline) {
                        return (
                            <code className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-mono text-sm" {...props}>
                                {children}
                            </code>
                        );
                    }
                    return (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
                // Enhanced blockquotes
                blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground" {...props} />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

// Table renderer component
export const TableRenderer: React.FC<{ data: string[][] }> = ({ data }) => {
    if (!data || data.length === 0) return null;

    const headers = data[0];
    const rows = data.slice(1);

    return (
        <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-white/10 border border-white/10 rounded-lg">
                <thead className="bg-white/5">
                    <tr>
                        {headers.map((header, i) => (
                            <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className="px-4 py-2 text-sm text-muted-foreground">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
