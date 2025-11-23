export interface AIService {
    generateDescription(imageUrl: string): Promise<string>;
}

export class AIServiceFactory {
    private static instance: AIService;

    static register(service: AIService) {
        this.instance = service;
    }

    static getService(): AIService {
        if (!this.instance) {
            throw new Error('AI Service not registered');
        }
        return this.instance;
    }
}
