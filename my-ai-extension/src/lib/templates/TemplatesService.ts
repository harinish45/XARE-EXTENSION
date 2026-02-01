// Templates Library

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
    variables: string[];
    icon: string;
}

export const TEMPLATE_LIBRARY: PromptTemplate[] = [
    // Writing
    {
        id: 'email-professional',
        name: 'Professional Email',
        description: 'Write a professional email',
        category: 'Writing',
        template: 'Write a professional email about {{topic}} to {{recipient}}. Tone: {{tone}}',
        variables: ['topic', 'recipient', 'tone'],
        icon: 'Mail'
    },
    {
        id: 'blog-post',
        name: 'Blog Post',
        description: 'Create a blog post outline',
        category: 'Writing',
        template: 'Create a detailed blog post about {{topic}}. Target audience: {{audience}}. Length: {{length}} words.',
        variables: ['topic', 'audience', 'length'],
        icon: 'FileText'
    },
    // Code
    {
        id: 'code-review',
        name: 'Code Review',
        description: 'Review code for issues',
        category: 'Code',
        template: 'Review this {{language}} code for bugs, performance issues, and best practices:\n\n{{code}}',
        variables: ['language', 'code'],
        icon: 'Code'
    },
    {
        id: 'code-explain',
        name: 'Explain Code',
        description: 'Explain how code works',
        category: 'Code',
        template: 'Explain this {{language}} code in simple terms:\n\n{{code}}',
        variables: ['language', 'code'],
        icon: 'BookOpen'
    },
    // Research
    {
        id: 'research-summary',
        name: 'Research Summary',
        description: 'Summarize research topic',
        category: 'Research',
        template: 'Provide a comprehensive summary of {{topic}}. Include key points, recent developments, and implications.',
        variables: ['topic'],
        icon: 'Search'
    },
    {
        id: 'compare-options',
        name: 'Compare Options',
        description: 'Compare multiple options',
        category: 'Research',
        template: 'Compare {{option1}} vs {{option2}} for {{useCase}}. Include pros, cons, and recommendations.',
        variables: ['option1', 'option2', 'useCase'],
        icon: 'GitCompare'
    },
    // Business
    {
        id: 'meeting-agenda',
        name: 'Meeting Agenda',
        description: 'Create meeting agenda',
        category: 'Business',
        template: 'Create a meeting agenda for {{meetingType}} about {{topic}}. Duration: {{duration}} minutes.',
        variables: ['meetingType', 'topic', 'duration'],
        icon: 'Calendar'
    },
    {
        id: 'project-plan',
        name: 'Project Plan',
        description: 'Outline project plan',
        category: 'Business',
        template: 'Create a project plan for {{project}}. Timeline: {{timeline}}. Key deliverables: {{deliverables}}.',
        variables: ['project', 'timeline', 'deliverables'],
        icon: 'Briefcase'
    },
    // Creative
    {
        id: 'brainstorm',
        name: 'Brainstorm Ideas',
        description: 'Generate creative ideas',
        category: 'Creative',
        template: 'Brainstorm {{count}} creative ideas for {{topic}}. Target: {{target}}.',
        variables: ['count', 'topic', 'target'],
        icon: 'Lightbulb'
    },
    {
        id: 'story-outline',
        name: 'Story Outline',
        description: 'Create story outline',
        category: 'Creative',
        template: 'Create a story outline about {{theme}}. Genre: {{genre}}. Length: {{length}}.',
        variables: ['theme', 'genre', 'length'],
        icon: 'BookOpen'
    }
];

export class TemplatesService {
    private customTemplates: Map<string, PromptTemplate> = new Map();

    // Get all templates
    getAllTemplates(): PromptTemplate[] {
        return [...TEMPLATE_LIBRARY, ...Array.from(this.customTemplates.values())];
    }

    // Get by category
    getByCategory(category: string): PromptTemplate[] {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    // Get categories
    getCategories(): string[] {
        const categories = new Set(this.getAllTemplates().map(t => t.category));
        return Array.from(categories);
    }

    // Fill template
    fillTemplate(template: PromptTemplate, values: Record<string, string>): string {
        let filled = template.template;
        template.variables.forEach(variable => {
            const value = values[variable] || `[${variable}]`;
            filled = filled.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        });
        return filled;
    }

    // Add custom template
    async addCustomTemplate(template: Omit<PromptTemplate, 'id'>): Promise<string> {
        const id = `custom-${Date.now()}`;
        const newTemplate: PromptTemplate = { ...template, id };
        this.customTemplates.set(id, newTemplate);
        await this.saveCustomTemplates();
        return id;
    }

    // Delete custom template
    async deleteCustomTemplate(id: string): Promise<void> {
        this.customTemplates.delete(id);
        await this.saveCustomTemplates();
    }

    // Save/load custom templates
    private async saveCustomTemplates(): Promise<void> {
        const templates = Array.from(this.customTemplates.values());
        await chrome.storage.local.set({ 'xare-custom-templates': templates });
    }

    async loadCustomTemplates(): Promise<void> {
        const result = await chrome.storage.local.get('xare-custom-templates');
        if (result['xare-custom-templates']) {
            result['xare-custom-templates'].forEach((t: PromptTemplate) => {
                this.customTemplates.set(t.id, t);
            });
        }
    }
}

export const templatesService = new TemplatesService();
