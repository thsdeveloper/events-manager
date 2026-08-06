import { createHash } from 'node:crypto';

export interface RateLimitRepository {
	consume(input: { key: string; limit: number; windowSeconds: number }): Promise<boolean>;
}

export class RateLimitExceeded extends Error {}

export class EnforceRateLimit {
	constructor(private readonly repository: RateLimitRepository) {}

	async execute(input: { scope: string; subject: string; limit: number; windowSeconds: number }) {
		const subjectHash = createHash('sha256').update(input.subject).digest('hex');
		const allowed = await this.repository.consume({
			key: `${input.scope}:${subjectHash}`,
			limit: input.limit,
			windowSeconds: input.windowSeconds,
		});
		if (!allowed) throw new RateLimitExceeded();
	}
}
