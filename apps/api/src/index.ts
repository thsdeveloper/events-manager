import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = await buildApp(env);

// Fly sends SIGTERM before stopping an idle Machine or replacing a release.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
	process.once(signal, () => {
		void app.close().catch((error: unknown) => {
			app.log.error(error, 'Failed to close the API');
			process.exitCode = 1;
		});
	});
}

try {
	await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
