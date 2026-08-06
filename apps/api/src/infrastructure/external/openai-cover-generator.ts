import OpenAI from 'openai';
import type { CoverImageGenerator } from '../../application/external/external-service.js';
import { ApiError } from '../../shared/errors.js';

export class OpenAICoverGenerator implements CoverImageGenerator {
	private readonly client: OpenAI;

	constructor(apiKey: string) {
		this.client = new OpenAI({ apiKey });
	}

	async generate(prompt: string) {
		const generated = await this.client.images.generate({
			model: 'gpt-image-1',
			prompt,
			n: 1,
			size: '1536x1024',
			quality: 'high',
		});
		const base64 = generated.data?.[0]?.b64_json;
		if (!base64) throw new ApiError('A geração não retornou uma imagem.', 502, 'IMAGE_GENERATION_FAILED');
		return Buffer.from(base64, 'base64');
	}
}
