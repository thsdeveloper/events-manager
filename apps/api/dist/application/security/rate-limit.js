import { createHash } from 'node:crypto';
export class RateLimitExceeded extends Error {
}
export class EnforceRateLimit {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(input) {
        const subjectHash = createHash('sha256').update(input.subject).digest('hex');
        const allowed = await this.repository.consume({
            key: `${input.scope}:${subjectHash}`,
            limit: input.limit,
            windowSeconds: input.windowSeconds,
        });
        if (!allowed)
            throw new RateLimitExceeded();
    }
}
//# sourceMappingURL=rate-limit.js.map