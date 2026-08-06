import { describe, expect, it, vi } from 'vitest';
import {
	EnforceRateLimit,
	RateLimitExceeded,
	type RateLimitRepository,
} from '../src/application/security/rate-limit.js';

describe('EnforceRateLimit', () => {
	it('uses a stable one-way subject key instead of persisting PII', async () => {
		const repository: RateLimitRepository = { consume: vi.fn().mockResolvedValue(true) };
		const limiter = new EnforceRateLimit(repository);

		await limiter.execute({ scope: 'form', subject: 'pessoa@example.com', limit: 5, windowSeconds: 60 });

		expect(repository.consume).toHaveBeenCalledWith({
			key: expect.stringMatching(/^form:[a-f0-9]{64}$/),
			limit: 5,
			windowSeconds: 60,
		});
		expect(JSON.stringify(vi.mocked(repository.consume).mock.calls)).not.toContain('pessoa@example.com');
	});

	it('rejects a key after the shared repository consumes its allowance', async () => {
		const repository: RateLimitRepository = { consume: vi.fn().mockResolvedValue(false) };

		await expect(
			new EnforceRateLimit(repository).execute({ scope: 'checkout', subject: 'user-1', limit: 8, windowSeconds: 60 }),
		).rejects.toBeInstanceOf(RateLimitExceeded);
	});
});
