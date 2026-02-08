import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

export class PerplexityProvider extends OpenAICompatibleProvider {
    constructor() {
        super(
            'perplexity',
            'Perplexity (Deep Research)',
            'https://api.perplexity.ai',
            'llama-3.1-sonar-small-128k-online'  // Correct online model
        );
    }
}
