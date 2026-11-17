import OpenAI from 'openai';
import type { CoverImageGenerator } from '../../application/external/external-service.js';
import { ApiError } from '../../shared/errors.js';

export class OpenAICoverGenerator implements CoverImageGenerator {
	private readonly client: OpenAI;
	constructor(apiKey: string) {
		this.client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 0 });
	}
	async generate(prompt: string) {
		try {
			// The installed SDK predates custom dimensions and complexity; use its typed HTTP transport.
			const generated = await this.client.post<OpenAI.Images.ImagesResponse>('/images/generations', {
				body: {
					model: 'gpt-image-2.6-flare',
					prompt,
					n: 1,
					size: '1536x864',
					quality: 'low',
					complexity: 'low',
					output_format: 'jpeg',
					output_compression: 85,
				},
			});
			const base64 = generated.data?.[0]?.b64_json;
			if (!base64) throw new Error('empty image');
			return Buffer.from(base64, 'base64');
		} catch {
			throw new ApiError(
				'Não foi possível gerar a capa agora. Tente novamente em instantes.',
				502,
				'IMAGE_GENERATION_FAILED',
			);
		}
	}
}
