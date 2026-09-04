/**
 * Cropper.js resolves to `dist/cropper.esm.raw.js` by default, a shim that
 * imports the element classes but never registers them and pulls
 * `@cropper/elements` without its shadow-DOM styles. The result renders an empty
 * box: no custom elements, no `:host { display: block }`.
 *
 * `dist/cropper.esm.js` is the self-contained build — it calls `$define()` for
 * every element and inlines their styles — so it is imported by path. This
 * declaration gives that path the package's own types.
 */
declare module 'cropperjs/dist/cropper.esm.js' {
	export * from 'cropperjs';
	export { default } from 'cropperjs';
}
