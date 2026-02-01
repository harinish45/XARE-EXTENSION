// Export Service - Export chats and research to various formats

import type { ChatMessage } from '../store';
import type { ResearchResult } from '../agents/ResearchAgent';

export class ExportService {
    // Export chat history as markdown
    static exportChatAsMarkdown(messages: ChatMessage[], title?: string): string {
        const timestamp = new Date().toLocaleString();
        let markdown = `# ${title || 'Chat Export'}\n\n`;
        markdown += `*Exported on ${timestamp}*\n\n---\n\n`;

        for (const msg of messages) {
            if (msg.role === 'user') {
                markdown += `## 👤 User\n\n${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
                markdown += `## 🤖 Assistant\n\n${msg.content}\n\n`;

                if (msg.sources && msg.sources.length > 0) {
                    markdown += `### Sources\n\n`;
                    for (const source of msg.sources) {
                        markdown += `- [${source.title}](${source.url})\n`;
                    }
                    markdown += `\n`;
                }
            }

            markdown += `---\n\n`;
        }

        return markdown;
    }

    // Export research report as markdown
    static exportResearchAsMarkdown(research: ResearchResult): string {
        const timestamp = new Date(research.timestamp).toLocaleString();
        let markdown = `# Research Report: ${research.topic}\n\n`;
        markdown += `*Generated on ${timestamp}*\n\n---\n\n`;
        markdown += research.summary;
        markdown += `\n\n---\n\n`;
        markdown += `## Sources\n\n`;

        for (const source of research.sources) {
            markdown += `- [${source.title}](${source.url})\n`;
            if (source.snippet) {
                markdown += `  > ${source.snippet}\n`;
            }
        }

        return markdown;
    }

    // Download as file
    static downloadAsFile(content: string, filename: string, mimeType: string = 'text/markdown') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Copy to clipboard with formatting
    static async copyToClipboard(content: string): Promise<void> {
        await navigator.clipboard.writeText(content);
    }

    // Export entire conversation
    static exportConversation(
        messages: ChatMessage[],
        sessionTitle?: string
    ): void {
        const markdown = this.exportChatAsMarkdown(messages, sessionTitle);
        const filename = `${sessionTitle || 'chat'}-${Date.now()}.md`;
        this.downloadAsFile(markdown, filename);
    }

    // Export research report
    static exportResearch(research: ResearchResult): void {
        const markdown = this.exportResearchAsMarkdown(research);
        const filename = `research-${research.topic.replace(/\s+/g, '-')}-${Date.now()}.md`;
        this.downloadAsFile(markdown, filename);
    }

    // Export code blocks only
    static exportCodeBlocks(messages: ChatMessage[]): string {
        let code = '';
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

        for (const msg of messages) {
            if (msg.role === 'assistant') {
                let match;
                while ((match = codeBlockRegex.exec(msg.content)) !== null) {
                    const language = match[1] || 'text';
                    const codeContent = match[2];
                    code += `// Language: ${language}\n${codeContent}\n\n`;
                }
            }
        }

        return code;
    }
}

export const exportService = ExportService;
