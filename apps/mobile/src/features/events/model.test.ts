import { imageUrl, plainText } from './model';
import { birthDateIso } from '../../shared/dates';
describe('mobile presentation', () => {
	it('resolves images through the public API without exposing database credentials', () =>
		expect(imageUrl({ id: 'image-1' } as never, 'https://api.test')).toBe('https://api.test/api/media/image-1'));
	it('preserves safe external image URLs', () =>
		expect(imageUrl('https://cdn.test/event.jpg', 'https://api.test')).toBe('https://cdn.test/event.jpg'));
	it('does not load executable image URIs', () =>
		expect(imageUrl('javascript:alert(1)', 'https://api.test')).toBeUndefined());
	it('handles absent images', () => expect(imageUrl(null, 'https://api.test')).toBeUndefined());
	it('turns event rich text into readable paragraphs without script content', () =>
		expect(plainText('<p>Olá &amp; bem-vindo</p><p>Segundo</p><script>bad()</script>')).toBe(
			'Olá & bem-vindo\nSegundo',
		));
	it('keeps valid birth dates and converts the Brazilian form', () => {
		expect(birthDateIso('20/05/1990')).toBe('1990-05-20');
		expect(birthDateIso('1990-05-20')).toBe('1990-05-20');
	});
	it('rejects impossible dates', () => {
		expect(birthDateIso('31/02/2000')).toBe('');
		expect(birthDateIso('')).toBe('');
	});
});
