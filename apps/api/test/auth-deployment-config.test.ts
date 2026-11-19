import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('managed Supabase authentication configuration', () => {
	it('validates templates, OTP settings, target isolation and persistence without network access', () => {
		const result = spawnSync('python3', ['-m', 'unittest', 'discover', '-s', 'scripts/tests'], {
			cwd: resolve(import.meta.dirname, '../../..'),
			encoding: 'utf8',
			timeout: 10_000,
			env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
		});
		expect(result.status, result.stderr || result.error?.message).toBe(0);
	});
});
