import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ImageCropperDialog } from './image-cropper-dialog';

/**
 * Cropper.js 2.x registers its web components at module scope, so importing it
 * eagerly ran `class ... extends HTMLElement` during Next's server render and
 * threw "HTMLElement is not defined". This renders the dialog in a DOM-less
 * environment: it fails at import time if the library ever goes back to being a
 * static import.
 */
describe('ImageCropperDialog', () => {
	it('renders on the server without touching browser globals', () => {
		expect(typeof HTMLElement).toBe('undefined');

		const markup = renderToStaticMarkup(
			<ImageCropperDialog file={null} onCancel={() => {}} onCropped={() => {}} />,
		);

		// Closed dialog: Radix renders nothing, and crucially nothing threw.
		expect(markup).toBe('');
	});
});
