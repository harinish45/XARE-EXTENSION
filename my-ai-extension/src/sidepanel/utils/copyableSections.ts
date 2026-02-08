// Helper function to preprocess AI response content
// Detects sections like "Sample Input:", "Sample Output:", "Example:", "Commands:"
// and wraps them in copyable blocks with individual copy buttons

export function preprocessCopyableSections(content: string): string {
    const lines = content.split('\n');
    const processed: string[] = [];

    // Keywords that start a new section
    // Removed generic words like "Input", "Output" to avoid false positives in normal sentences
    const sectionKeywords = [
        'sample input',
        'sample output',
        'example',
        'command',
        'matrix a',
        'matrix b',
        'matrix c',
        'matrix 1',
        'matrix 2',
        'result matrix'
    ];

    let currentSection: { title: string; content: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimLine = line.trim();
        const lowerLine = trimLine.toLowerCase();

        // 1. Check for Section Header
        // Must end with ':' and start with a keyword
        // OR be exactly a keyword + ':'
        let isSectionHeader = false;

        if (trimLine.endsWith(':')) {
            isSectionHeader = sectionKeywords.some(keyword =>
                lowerLine.startsWith(keyword)
            );
        }

        if (isSectionHeader) {
            // Close previous section if exists
            if (currentSection) {
                processed.push('');
                processed.push(`**${currentSection.title}**`);
                processed.push('');
                processed.push('```copyable-section');
                // Use default content if empty to prevent collapse
                const contentText = currentSection.content.length > 0
                    ? currentSection.content.join('\n')
                    : ' ';
                processed.push(contentText);
                processed.push('```');
                processed.push('');
            }

            // Start new section
            currentSection = {
                title: trimLine,
                content: []
            };
        }
        else if (currentSection) {
            // We are inside a section.
            // Logic: Capture everything until the next empty line?
            // Or until the next header?

            // If the line is empty, we keep it in content usually, 
            // unless it's the *start* of the content.

            // If we hit a line that LOOKS like a header (bolded text), maybe stop?
            // " **Next Step:** "

            if (trimLine === '' && currentSection.content.length === 0) {
                // Skip leading empty lines
            } else {
                currentSection.content.push(line);
            }
        }
        else {
            // Regular text
            processed.push(line);
        }
    }

    // Close final section
    if (currentSection) {
        processed.push('');
        processed.push(`**${currentSection.title}**`);
        processed.push('');
        processed.push('```copyable-section');
        const contentText = currentSection.content.length > 0
            ? currentSection.content.join('\n')
            : ' ';
        processed.push(contentText);
        processed.push('```');
        processed.push('');
    }

    return processed.join('\n');
}
