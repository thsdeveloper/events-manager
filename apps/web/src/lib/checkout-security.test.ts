import { expect, it } from 'vitest';
import nextConfig from '../../next.config';
it('permits the secure card iframe and encryption endpoints while blocking arbitrary frames', async () => {
	const headers = await nextConfig.headers!();
	const csp = headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')!.value;
	const frames = csp.match(/frame-src ([^;]+);/)![1].split(/\s+/);
	expect(frames).toContain('https://ui-components.evervault.com');
	expect(frames).not.toContain('*');
	expect(frames).not.toContain('https:');
	expect(csp).toContain('https://js.evervault.com');
	expect(csp.match(/script-src ([^;]+);/)![1].split(/\s+/)).toContain('https://www.abacatepay.com');
	expect(csp.match(/script-src ([^;]+);/)![1].split(/\s+/)).toContain('https://assets.abacatepay.com');
});
