import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { BrandingAssetService } from '../src/application/media/branding-asset-service.js';
import type { MediaRepository } from '../src/application/media/media-service.js';
import { partialMock } from './support/index.js';

const svg =
	'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><title>Flouvi</title><path fill="#6644ff" d="M0 0H200V80H0Z"/></svg>';
function setup() {
	const store = vi.fn(async (_input: import('../src/application/media/media-service.js').MediaUpload) => ({
		file: { id: 'asset', filename: 'brand.svg' },
		url: 'https://storage.test/brand.svg',
	}));
	const service = new BrandingAssetService(partialMock<MediaRepository>({ store }));
	const input = {
		kind: 'logo' as const,
		userId: 'admin',
		folder: 'branding',
		filename: 'brand.svg',
		mimetype: 'image/svg+xml',
		buffer: Buffer.from(svg),
	};
	return { service, store, input };
}
describe('branding asset validation', () => {
	it('stores a static SVG as a vector with its dimensions and validation metadata', async () => {
		const { service, input, store } = setup();
		await service.upload(input);
		const stored = store.mock.calls[0]?.[0] as any;
		expect(stored.mimetype).toBe('image/svg+xml');
		expect(stored.buffer.toString()).toContain('<path');
		expect(stored.metadata).toMatchObject({ branding_kind: 'logo', width: 200, height: 80 });
	});
	it.each([
		'<script>alert(1)</script>',
		'<foreignObject><iframe/></foreignObject>',
		'<image href="https://external.test/image.png"/>',
		'<use href="javascript:alert(1)"/>',
		'<path onload="alert(1)"/>',
		'<animate attributeName="href" values="javascript:alert(1)"/>',
		'<style>@import url(https://external.test/a.css)</style>',
	])('rejects active or externally linked SVG content: %s', async (unsafe) => {
		const { service, input, store } = setup();
		await expect(
			service.upload({ ...input, buffer: Buffer.from(svg.replace('<title>Flouvi</title>', unsafe)) }),
		).rejects.toMatchObject({ statusCode: 422 });
		expect(store).not.toHaveBeenCalled();
	});
	it('rejects malformed XML, entity declarations, and mismatched MIME', async () => {
		const { service, input } = setup();
		for (const content of [
			'<svg><path></svg>',
			'<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + svg,
			'<html>not svg</html>',
		])
			await expect(service.upload({ ...input, buffer: Buffer.from(content) })).rejects.toMatchObject({
				statusCode: 422,
			});
	});
	it('requires SVG for new logos and limits the upload size', async () => {
		const { service, input } = setup();
		await expect(
			service.upload({
				...input,
				mimetype: 'image/png',
				buffer: await sharp({ create: { width: 2, height: 2, channels: 4, background: '#fff' } })
					.png()
					.toBuffer(),
			}),
		).rejects.toMatchObject({ statusCode: 422 });
		await expect(service.upload({ ...input, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })).rejects.toMatchObject({
			statusCode: 413,
		});
	});
	it('preserves a valid 1024px app PNG and rejects other dimensions', async () => {
		const { service, input, store } = setup();
		const png = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#6644ff' } })
			.png()
			.toBuffer();
		await service.upload({ ...input, kind: 'app-icon', filename: 'app.png', mimetype: 'image/png', buffer: png });
		expect(store).toHaveBeenCalledWith(
			expect.objectContaining({
				buffer: png,
				metadata: expect.objectContaining({ branding_kind: 'app-icon', width: 1024, height: 1024 }),
			}),
		);
		await expect(
			service.upload({
				...input,
				kind: 'app-icon',
				mimetype: 'image/png',
				buffer: await sharp(png).resize(128, 128).png().toBuffer(),
			}),
		).rejects.toMatchObject({ statusCode: 422 });
	});
	it('accepts square SVG/PNG favicons and ICO containers, preserving their formats', async () => {
		const { service, input, store } = setup();
		await service.upload({
			...input,
			kind: 'favicon',
			buffer: Buffer.from(svg.replace('width="200"', 'width="80"').replace('0 0 200 80', '0 0 80 80')),
		});
		const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#fff' } })
			.png()
			.toBuffer();
		await service.upload({ ...input, kind: 'favicon', mimetype: 'image/png', buffer: png });
		const header = Buffer.alloc(22);
		header.writeUInt16LE(1, 2);
		header.writeUInt16LE(1, 4);
		header[6] = 32;
		header[7] = 32;
		header.writeUInt32LE(png.length, 14);
		header.writeUInt32LE(22, 18);
		await service.upload({
			...input,
			kind: 'favicon',
			mimetype: 'image/vnd.microsoft.icon',
			buffer: Buffer.concat([header, png]),
		});
		expect(store.mock.calls.at(-1)?.[0]).toMatchObject({
			mimetype: 'image/x-icon',
			metadata: { branding_kind: 'favicon', width: 32, height: 32 },
		});
	});
	it('rejects non-square favicons, broken ICO entries and truncated PNG payloads', async () => {
		const { service, input, store } = setup();
		await expect(service.upload({ ...input, kind: 'favicon' })).rejects.toMatchObject({ statusCode: 422 });
		for (const buffer of [
			Buffer.alloc(0),
			Buffer.alloc(22),
			Buffer.from('000001000100202000000100200001000000ff000000', 'hex'),
		])
			await expect(
				service.upload({ ...input, kind: 'favicon', mimetype: 'image/x-icon', buffer }),
			).rejects.toMatchObject({ statusCode: 422 });
		await expect(
			service.upload({
				...input,
				kind: 'favicon',
				mimetype: 'image/png',
				buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
			}),
		).rejects.toMatchObject({ statusCode: 422 });
		expect(store).not.toHaveBeenCalled();
	});
	it('allows local gradients and rejects external CSS references and invalid SVG dimensions', async () => {
		const { service, input } = setup();
		const safe = svg
			.replace(
				'<title>Flouvi</title>',
				'<defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/></linearGradient></defs>',
			)
			.replace('fill="#6644ff"', `style="fill:url(#a)"`);
		await service.upload({ ...input, buffer: Buffer.from(safe) });
		for (const content of [
			safe.replace('url(#a)', 'url(https://example.test/a)'),
			safe.replace('fill:url(#a)', 'background:red'),
			svg.replace('200 80', '0 0'),
		])
			await expect(service.upload({ ...input, buffer: Buffer.from(content) })).rejects.toMatchObject({
				statusCode: 422,
			});
	});
});
