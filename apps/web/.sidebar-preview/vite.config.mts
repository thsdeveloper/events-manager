import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	esbuild: { jsx: 'automatic' },
	define: { 'process.env': {} },
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('../src', import.meta.url)),
			'next/image': fileURLToPath(new URL('./image.tsx', import.meta.url)),
			'next/link': fileURLToPath(new URL('./link.tsx', import.meta.url)),
			'next/navigation': fileURLToPath(new URL('./navigation.tsx', import.meta.url)),
		},
	},
	css: { postcss: fileURLToPath(new URL('..', import.meta.url)) },
	server: {
		host: '127.0.0.1',
		port: 3978,
		strictPort: true,
		fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] },
	},
});
