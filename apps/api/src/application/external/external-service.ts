import type { MediaService } from '../media/media-service.js';

export interface PlacePrediction {
	description: string;
	mainText: string;
	placeId: string;
	secondaryText: string | null;
}

export interface PlacesGateway {
	search(input: string): Promise<PlacePrediction[]>;
}

export interface EventCategorySummary {
	description: string | null;
	name: string;
}

export interface EventCategoryReader {
	findById(id: string): Promise<EventCategorySummary | null>;
}

export interface CoverImageGenerator {
	generate(prompt: string): Promise<Buffer>;
}

export class PlacesService {
	constructor(private readonly gateway: PlacesGateway | null) {}

	async search(input: string) {
		return { predictions: input && this.gateway ? await this.gateway.search(input) : [] };
	}
}

export class EventCoverService {
	constructor(
		private readonly categories: EventCategoryReader,
		private readonly generator: CoverImageGenerator,
		private readonly media: MediaService,
	) {}

	async generate(input: {
		categoryId?: string;
		description?: string;
		shortDescription?: string;
		title: string;
		userId: string;
	}) {
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
