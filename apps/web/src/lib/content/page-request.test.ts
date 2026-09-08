import { describe, expect, it } from 'vitest';
import { isDraftPreview, pageCount, parsePageNumber, previewExitHref, resolvePermalink } from './page-request';

describe('resolvePermalink', () => {
	it('joins the catch-all segments into a permalink rooted at "/"', () => {
		expect(resolvePermalink(undefined)).toBe('/');
		expect(resolvePermalink([])).toBe('/');
		expect(resolvePermalink(['sobre'])).toBe('/sobre');
		expect(resolvePermalink(['legal', 'privacidade'])).toBe('/legal/privacidade');
	});

	it('drops a trailing slash so "/sobre/" and "/sobre" hit the same page', () => {
		expect(resolvePermalink(['sobre', ''])).toBe('/sobre');
	});
});

describe('parsePageNumber', () => {
	it('accepts only positive integers and falls back to the first page', () => {
		expect(parsePageNumber('3')).toBe(3);
		expect(parsePageNumber('0')).toBe(1);
		expect(parsePageNumber('-2')).toBe(1);
		expect(parsePageNumber('2.5')).toBe(1);
		expect(parsePageNumber('abc')).toBe(1);
		expect(parsePageNumber(undefined)).toBe(1);
		expect(parsePageNumber(['4', '5'])).toBe(4);
	});
});

describe('previewExitHref', () => {
	it('keeps the route and the other query parameters but removes the preview token', () => {
		expect(previewExitHref('/sobre', { preview: 'token', page: '2' })).toBe('/sobre?page=2');
		expect(previewExitHref('/', { preview: 'token' })).toBe('/');
	});
});

describe('isDraftPreview', () => {
	it('only treats the visit as a draft preview when a token is present and the page is not published', () => {
		expect(isDraftPreview({ status: 'draft' }, 'token')).toBe(true);
		expect(isDraftPreview({ status: 'in_review' }, 'token')).toBe(true);
		expect(isDraftPreview({ status: 'published' }, 'token')).toBe(false);
		expect(isDraftPreview({ status: 'draft' }, undefined)).toBe(false);
	});
});

describe('pageCount', () => {
	it('derives how many index pages a total needs, so out-of-range pages can be refused before fetching', () => {
		expect(pageCount(0, 9)).toBe(0);
		expect(pageCount(1, 9)).toBe(1);
		expect(pageCount(9, 9)).toBe(1);
		expect(pageCount(10, 9)).toBe(2);
	});
});
