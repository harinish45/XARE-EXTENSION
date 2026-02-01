import {
    Microscope, Grid, BookOpen, Globe, Image, AtSign, Zap,
    Users, CheckCircle2, Brain, Mic, FileText, Table, Edit3,
    GitCompare, Eye, Terminal
} from 'lucide-react';

export type ChatMode =
    | 'research' | 'apps' | 'reader' | 'websearch' | 'media'
    | 'mentions' | 'workflows' | 'agents' | 'factcheck' | 'memory'
    | 'voice' | 'summarize' | 'extract' | 'forms' | 'compare'
    | 'monitor' | 'devworkspace';

interface ModeConfig {
    id: ChatMode;
    label: string;
    description: string;
    icon: any;
    gradient: string;
    category: 'intelligence' | 'content' | 'pagetools' | 'automation' | 'developer';
    greeting: string | (() => string);
    features: string[];
    service?: string;
    config?: Record<string, any>;
    requiresAPI?: boolean;
    isPremium?: boolean;
}

export const CHAT_MODES: ModeConfig[] = [
    // INTELLIGENCE CATEGORY
    {
        id: 'research',
        label: 'Deep Research',
        description: 'Multi-source investigation',
        icon: Microscope,
        gradient: 'from-purple-500/20 to-pink-500/20',
        category: 'intelligence',
        greeting: '🔬 Research mode active. What topic shall we investigate?',
        features: ['multi-source', 'citations', 'synthesis'],
        service: 'multiSourceResearchService',
        requiresAPI: true
    },
    {
        id: 'agents',
        label: 'AI Agents',
        description: 'Multi-agent collaboration',
        icon: Users,
        gradient: 'from-violet-500/20 to-purple-500/20',
        category: 'intelligence',
        greeting: '🤖 Agent team ready! Choose: Researcher, Coder, Writer, or Analyst.',
        features: ['multi-agent', 'orchestration'],
        service: 'multiAgentService',
        isPremium: true
    },
    {
        id: 'factcheck',
        label: 'Fact Check',
        description: 'Verify claims with sources',
        icon: CheckCircle2,
        gradient: 'from-green-500/20 to-emerald-500/20',
        category: 'intelligence',
        greeting: '✅ Fact-checking active. Paste claims to verify.',
        features: ['verification', 'sources', 'confidence'],
        service: 'factCheckingService',
        requiresAPI: true
    },
    {
        id: 'memory',
        label: 'Memory',
        description: 'Personalized context',
        icon: Brain,
        gradient: 'from-cyan-500/20 to-blue-500/20',
        category: 'intelligence',
        greeting: () => {
            const userName = localStorage.getItem('userName') || 'Boss';
            return `🧠 I'll remember our conversation, ${userName}!`;
        },
        features: ['memory', 'preferences', 'context'],
        service: 'conversationMemoryService'
    },
    {
        id: 'voice',
        label: 'Voice',
        description: 'Voice commands & dictation',
        icon: Mic,
        gradient: 'from-red-500/20 to-orange-500/20',
        category: 'intelligence',
        greeting: '🎤 Voice mode ready. Say "Hey XARE" to start.',
        features: ['voice-commands', 'wake-word', 'tts'],
        service: 'voiceCommandsService'
    },

    // CONTENT CATEGORY
    {
        id: 'reader',
        label: 'Reader Mode',
        description: 'Analyze documents',
        icon: BookOpen,
        gradient: 'from-green-500/20 to-emerald-500/20',
        category: 'content',
        greeting: '📖 Reader mode active. Upload a document or paste URL.',
        features: ['file-upload', 'url-analysis', '5-level-summary'],
        service: 'fiveLevelSummarizationService'
    },
    {
        id: 'websearch',
        label: 'Web Search',
        description: 'Live web results + AI',
        icon: Globe,
        gradient: 'from-orange-500/20 to-red-500/20',
        category: 'content',
        greeting: '🌐 Web search enabled. What should I find?',
        features: ['web-search', 'tavily', 'firecrawl'],
        service: 'webSearchService',
        requiresAPI: true
    },
    {
        id: 'media',
        label: 'Media',
        description: 'Image & video analysis',
        icon: Image,
        gradient: 'from-pink-500/20 to-rose-500/20',
        category: 'content',
        greeting: '🖼️ Media mode ready. Upload images or screenshots.',
        features: ['vision', 'ocr', 'image-analysis'],
        requiresAPI: true
    },
    {
        id: 'mentions',
        label: 'Mentions',
        description: 'Context from tabs',
        icon: AtSign,
        gradient: 'from-indigo-500/20 to-blue-500/20',
        category: 'content',
        greeting: '💬 Mentions mode. Select tabs for context.',
        features: ['tab-context', 'multi-tab'],
        service: 'tabContextService'
    },

    // PAGE TOOLS CATEGORY
    {
        id: 'summarize',
        label: 'Summarize Page',
        description: '5-level summaries',
        icon: FileText,
        gradient: 'from-blue-500/20 to-indigo-500/20',
        category: 'pagetools',
        greeting: '📄 Ready to summarize. Choose detail level (1-5).',
        features: ['summarization', '5-levels'],
        service: 'pageSummarizationService'
    },
    {
        id: 'extract',
        label: 'Extract Data',
        description: 'Tables & structured data',
        icon: Table,
        gradient: 'from-purple-500/20 to-pink-500/20',
        category: 'pagetools',
        greeting: '📊 Data extraction ready. What should I extract?',
        features: ['extraction', 'tables', 'lists'],
        service: 'dataExtractionService'
    },
    {
        id: 'forms',
        label: 'Smart Forms',
        description: 'Auto-fill intelligently',
        icon: Edit3,
        gradient: 'from-orange-500/20 to-yellow-500/20',
        category: 'pagetools',
        greeting: '📋 Form intelligence active. I will help fill forms smartly.',
        features: ['auto-fill', 'validation'],
        service: 'formIntelligenceService'
    },
    {
        id: 'compare',
        label: 'Compare Pages',
        description: 'Version comparison',
        icon: GitCompare,
        gradient: 'from-teal-500/20 to-cyan-500/20',
        category: 'pagetools',
        greeting: '🔄 Comparison mode. Open two tabs to compare.',
        features: ['diff', 'comparison'],
        service: 'pageComparisonService'
    },
    {
        id: 'monitor',
        label: 'Monitor Page',
        description: 'Watch for changes',
        icon: Eye,
        gradient: 'from-amber-500/20 to-orange-500/20',
        category: 'pagetools',
        greeting: '👁️ Monitoring active. I will alert you of changes.',
        features: ['monitoring', 'alerts'],
        service: 'pageMonitoringService'
    },

    // AUTOMATION CATEGORY
    {
        id: 'workflows',
        label: 'Workflows',
        description: 'Automation builder',
        icon: Zap,
        gradient: 'from-yellow-500/20 to-orange-500/20',
        category: 'automation',
        greeting: '⚡ Workflow builder ready. Let\'s automate!',
        features: ['automation', 'sequences', 'dom-manipulation'],
        service: 'automationService'
    },
    {
        id: 'apps',
        label: 'Apps',
        description: 'Integrations & actions',
        icon: Grid,
        gradient: 'from-blue-500/20 to-cyan-500/20',
        category: 'automation',
        greeting: '📱 Apps mode ready. What would you like to do?',
        features: ['integrations', 'composio', 'templates'],
        service: 'composioService'
    },

    // DEVELOPER CATEGORY
    {
        id: 'devworkspace',
        label: 'Dev Workspace',
        description: 'Cloud development',
        icon: Terminal,
        gradient: 'from-slate-500/20 to-gray-500/20',
        category: 'developer',
        greeting: '💻 Workspace ready. Connect to Daytona cloud IDE.',
        features: ['daytona', 'cloud-ide'],
        service: 'daytonaService',
        isPremium: true
    }
];

export const getModeConfig = (id: ChatMode) =>
    CHAT_MODES.find(m => m.id === id);

export const getModesByCategory = (category: string) =>
    CHAT_MODES.filter(m => m.category === category);
