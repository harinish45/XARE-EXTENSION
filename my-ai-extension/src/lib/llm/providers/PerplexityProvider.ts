import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

export class PerplexityProvider extends OpenAICompatibleProvider {
    constructor() {
        super(
            'perplexity',
            'Perplexity (Deep Research)',
            'https://api.perplexity.ai',
            'sonar-reasoning-pro'
        );
    }
}
