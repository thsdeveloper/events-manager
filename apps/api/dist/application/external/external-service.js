export class PlacesService {
    gateway;
    constructor(gateway) {
        this.gateway = gateway;
    }
    async search(input) {
        return { predictions: input.trim().length >= 3 ? await this.gateway.search(input) : [] };
    }
    async reverse(latitude, longitude) {
        return { place: await this.gateway.reverse(latitude, longitude) };
    }
}
export class EventCoverService {
    categories;
    generator;
    media;
    constructor(categories, generator, media) {
        this.categories = categories;
        this.generator = generator;
        this.media = media;
    }
    async generate(input) {
        const category = input.categoryId ? await this.categories.findById(input.categoryId) : null;
        const prompt = [
            `Create a professional 16:9 landscape event cover for "${input.title}".`,
            input.shortDescription ?? input.description ?? '',
            category ? `Theme: ${category.name}. ${category.description ?? ''}` : '',
            'Use a clean cinematic composition, leave room for overlay text, and do not render words, letters, logos, or recognizable faces.',
        ]
            .filter(Boolean)
            .join(' ');
        const buffer = await this.generator.generate(prompt);
        const filename = `event-cover-${crypto.randomUUID()}.png`;
        const stored = await this.media.upload({
            buffer,
            filename,
            folder: 'ai',
            metadata: { generated: true, prompt },
            mimetype: 'image/png',
            title: input.title,
            userId: input.userId,
        });
        return {
            fileId: stored.file.id,
            assetUrl: stored.url,
            generatedPrompt: prompt,
            category,
        };
    }
}
//# sourceMappingURL=external-service.js.map