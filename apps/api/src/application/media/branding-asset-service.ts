import type { BrandingAssetKind } from '@events-manager/contracts';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import sharp from 'sharp';
import type { MediaRepository, MediaUpload } from './media-service.js';
import { hasValidFileSignature } from './media-service.js';
import { ApiError } from '../../shared/errors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const elements = new Set(
	'svg g defs path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath mask pattern symbol use'.split(
		' ',
	),
);
const attributes = new Set(
	'id class viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity transform preserveAspectRatio version role aria-label aria-hidden focusable gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity clip-path clip-rule clipPathUnits mask maskUnits maskContentUnits patternUnits patternContentUnits patternTransform font-family font-size font-weight text-anchor dominant-baseline dx dy rotate textLength lengthAdjust vector-effect overflow xmlns xmlns:xlink xml:space href xlink:href style'.split(
		' ',
	),
);
const styleProperties = new Set(
	'fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity clip-path clip-rule mask stop-color stop-opacity font-family font-size font-weight text-anchor dominant-baseline vector-effect'.split(
		' ',
	),
);
const invalid = (message = 'Envie um arquivo de imagem válido.') =>
	new ApiError(message, 422, 'INVALID_BRANDING_ASSET');

function validateReference(value: string) {
	if (/[\\@<>]|\/\*|expression\s*\(/i.test(value))
		throw invalid('O SVG deve conter somente elementos gráficos estáticos.');
	const withoutFragments = value.replace(/url\(\s*(['"]?)#[\w:.-]+\1\s*\)/gi, '');
	if (/url\s*\(/i.test(withoutFragments)) throw invalid('O SVG não pode carregar recursos externos.');
}

function validateSvg(buffer: Buffer) {
	const source = buffer.toString('utf8');
	if (/<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i.test(source)) throw invalid('Declarações externas não são permitidas no SVG.');
	const document = new DOMParser({
		onError: () => {
			throw invalid('O SVG está malformado.');
		},
	}).parseFromString(source, 'image/svg+xml');
	const root = document.documentElement;
	if (!root || root.localName !== 'svg' || root.namespaceURI !== SVG_NS)
		throw invalid('O arquivo não contém um SVG válido.');
	const nodes = [root];
	let count = 0;
	while (nodes.length) {
		const element = nodes.pop()!;
		if (++count > 10_000 || element.namespaceURI !== SVG_NS || !elements.has(element.localName ?? ''))
			throw invalid('O SVG deve conter somente elementos gráficos estáticos.');
		for (let i = 0; i < element.attributes.length; i++) {
			const attr = element.attributes.item(i)!;
			if (!attributes.has(attr.name)) throw invalid(`Atributo não permitido no SVG: ${attr.name}.`);
			if (attr.name.startsWith('xmlns')) {
				if (![SVG_NS, 'http://www.w3.org/1999/xlink'].includes(attr.value)) throw invalid();
			} else if (attr.localName === 'href') {
				if (!/^#[\w:.-]+$/.test(attr.value)) throw invalid('O SVG não pode carregar recursos externos.');
			} else {
				validateReference(attr.value);
				if (attr.name === 'style') {
					for (const declaration of attr.value.split(';').filter((value) => value.trim())) {
						const [property] = declaration.split(':');
						if (!styleProperties.has(property.trim().toLowerCase())) throw invalid('Estilo não permitido no SVG.');
					}
				}
			}
		}
		for (let child = element.firstChild; child; child = child.nextSibling) {
			if (child.nodeType === 1) nodes.push(child as typeof root);
			else if (![3, 4, 8].includes(child.nodeType)) throw invalid();
		}
	}
	const viewBox = root
		.getAttribute('viewBox')
		?.trim()
		.split(/[\s,]+/)
		.map(Number);
	const width = viewBox?.length === 4 ? viewBox[2] : Number.parseFloat(root.getAttribute('width') ?? '');
	const height = viewBox?.length === 4 ? viewBox[3] : Number.parseFloat(root.getAttribute('height') ?? '');
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0 ||
		width > 100_000 ||
		height > 100_000
	)
		throw invalid('O SVG precisa de dimensões ou viewBox válidos.');
	return { buffer: Buffer.from(new XMLSerializer().serializeToString(root)), width, height };
}

function validateIco(buffer: Buffer) {
	if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x00010000) throw invalid('O arquivo ICO é inválido.');
	const count = buffer.readUInt16LE(4);
	if (!count || count > 256 || buffer.length < 6 + count * 16) throw invalid('O arquivo ICO é inválido.');
	let maxSize = 0;
	for (let i = 0; i < count; i++) {
		const entry = 6 + i * 16;
		const width = buffer[entry] || 256;
		const height = buffer[entry + 1] || 256;
		const size = buffer.readUInt32LE(entry + 8);
		const offset = buffer.readUInt32LE(entry + 12);
		if (width !== height || size < 4 || offset < 6 + count * 16 || offset + size > buffer.length)
			throw invalid('O ICO deve conter ícones quadrados válidos.');
		const image = buffer.subarray(offset, offset + size);
		if (!hasValidFileSignature('image/png', image) && ![40, 108, 124].includes(image.readUInt32LE(0))) throw invalid();
		maxSize = Math.max(maxSize, width);
	}
	return { width: maxSize, height: maxSize };
}

/** Restricted to the superadmin upload route. Ordinary media uploads still reject SVG. */
export class BrandingAssetService {
	constructor(private readonly repository: MediaRepository) {}

	async upload(input: MediaUpload & { kind: BrandingAssetKind }) {
		if (input.buffer.length > 5 * 1024 * 1024)
			throw new ApiError('O arquivo deve ter no máximo 5 MB.', 413, 'FILE_TOO_LARGE');
		let buffer = input.buffer;
		let dimensions: { width: number; height: number };
		let mimetype = input.mimetype;
		let extension: string;
		try {
			if (mimetype === 'image/svg+xml' && input.kind !== 'app-icon') {
				const svg = validateSvg(buffer);
				buffer = svg.buffer;
				dimensions = svg;
				extension = 'svg';
			} else if (mimetype === 'image/png' && input.kind !== 'logo') {
				if (!hasValidFileSignature(mimetype, buffer)) throw invalid();
				const image = sharp(buffer, { limitInputPixels: 1024 * 1024, failOn: 'warning' });
				const metadata = await image.metadata();
				if (metadata.format !== 'png' || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1)
					throw invalid();
				dimensions = { width: metadata.width, height: metadata.height };
				await image.raw().toBuffer();
				extension = 'png';
			} else if (['image/x-icon', 'image/vnd.microsoft.icon'].includes(mimetype) && input.kind === 'favicon') {
				dimensions = validateIco(buffer);
				mimetype = 'image/x-icon';
				extension = 'ico';
			} else {
				throw invalid(
					input.kind === 'logo'
						? 'Envie a logo em SVG.'
						: input.kind === 'app-icon'
							? 'Envie o ícone em PNG de 1024 × 1024 pixels.'
							: 'Envie o favicon em SVG, PNG ou ICO.',
				);
			}
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw invalid();
		}
		if (input.kind === 'app-icon' && (dimensions.width !== 1024 || dimensions.height !== 1024))
			throw invalid('O ícone de aplicativo deve ter 1024 × 1024 pixels.');
		if (input.kind === 'favicon' && dimensions.width !== dimensions.height)
			throw invalid('O favicon deve ser quadrado.');
		return this.repository.store({
			...input,
			buffer,
			mimetype,
			folder: 'branding',
			filename: `${input.filename.replace(/\.[^.]*$/, '')}.${extension}`,
			metadata: { branding_kind: input.kind, width: dimensions.width, height: dimensions.height },
		});
	}
}
