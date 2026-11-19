import { readFile } from 'node:fs/promises';

let logo: Promise<Buffer> | undefined;

/** Reuses the packaged brand asset; no image conversion or remote fetch per request. */
export function readDefaultEmailLogo() {
	return (logo ??= readFile(new URL('../../../assets/tickets/flouvi.png', import.meta.url)));
}
