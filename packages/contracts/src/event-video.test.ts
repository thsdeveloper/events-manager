import { describe, expect, it } from 'vitest';
import { getYouTubeVideoId } from './event-video.js';
import { eventCreateSchema, eventPatchSchema } from './schemas.js';
import { eventDraftInputSchema } from './event-drafts.js';
const base = {
	title: 'Encontro com vídeo',
	slug: 'encontro-com-video',
	start_date: '2027-01-01T12:00:00Z',
	end_date: '2027-01-01T21:00:00Z',
};
const id = 'M7lc1UVf-VE';
describe('public event presentation video', () => {
	it.each([
		`https://www.youtube.com/watch?v=${id}`,
		`https://youtu.be/${id}?si=share`,
		`https://www.youtube.com/shorts/${id}`,
		`https://m.youtube.com/live/${id}`,
		`https://www.youtube-nocookie.com/embed/${id}`,
	])('preserves a valid video URL in creation, editing and drafts: %s', (video_url) => {
		expect(eventCreateSchema.parse({ ...base, video_url })).toMatchObject({ video_url });
		expect(eventPatchSchema.parse({ video_url })).toEqual({ video_url });
		expect(eventDraftInputSchema.parse({ values: { video_url } }).values).toMatchObject({ video_url });
	});
	it.each([
		'https://example.com/watch?v=M7lc1UVf-VE',
		'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE',
		'javascript:alert(1)',
		'https://youtube.com/watch?v=bad',
		'https://youtube.com/playlist?list=123',
		'https://user@youtube.com/watch?v=M7lc1UVf-VE',
	])('rejects an invalid or unrelated URL: %s', (video_url) => {
		const parsed = eventPatchSchema.safeParse({ video_url });
		expect(parsed.success).toBe(false);
		if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(['video_url']);
	});
	it('allows removing the public video without touching private online access', () => {
		expect(eventPatchSchema.parse({ video_url: null, online_url: 'https://meet.example.test/private' })).toMatchObject({
			video_url: null,
			online_url: 'https://meet.example.test/private',
		});
		expect(eventCreateSchema.safeParse(base).success).toBe(true);
	});
});

it('keeps incomplete video links in drafts so autosave does not interrupt typing', () => {
	expect(eventDraftInputSchema.parse({ values: { video_url: 'https://youtu' } }).values.video_url).toBe(
		'https://youtu',
	);
});

it.each([
	null,
	undefined,
	'',
	'not a url',
	'ftp://youtube.com/watch?v=M7lc1UVf-VE',
	'https://youtube.com:123/watch?v=M7lc1UVf-VE',
	'https://youtube.com/channel/M7lc1UVf-VE',
	'https://www.youtube-nocookie.com/watch?v=M7lc1UVf-VE',
	'https://youtu.be/M7lc1UVf-VE/extra',
])('does not embed unsupported input %s', (value) => {
	expect(getYouTubeVideoId(value)).toBeNull();
});
it('normalizes whitespace and rejects excessively long video URLs', () => {
	expect(eventPatchSchema.parse({ video_url: '  https://youtu.be/M7lc1UVf-VE  ' }).video_url).toBe(
		'https://youtu.be/M7lc1UVf-VE',
	);
	expect(
		eventPatchSchema.safeParse({ video_url: 'https://youtu.be/M7lc1UVf-VE?data=' + 'a'.repeat(2048) }).success,
	).toBe(false);
});
