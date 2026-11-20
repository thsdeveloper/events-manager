export type Session = { accessToken: string; refreshToken: string; expiresIn: number };
export interface SessionStorage {
	read(): Promise<Session | null>;
	write(session: Session | null): Promise<void>;
}
export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public code?: string,
	) {
		super(message);
	}
}
export class ApiClient {
	private refreshing: Promise<void> | null = null;
	private generation = 0;
	private listeners = new Set<(value: Session | null) => void>();
	constructor(
		private base: string,
		private storage: SessionStorage,
		private fetcher: typeof fetch = fetch,
	) {}
	async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
		if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Destino de API inválido.');
		const session = await this.storage.read();
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 25_000);
		let response: Response;
		try {
			response = await this.fetcher(this.base + path, {
				...options,
				credentials: 'omit',
				signal: options.signal ?? controller.signal,
				headers: {
					'Content-Type': 'application/json',
					...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
					...options.headers,
				},
			});
		} finally {
			clearTimeout(timeout);
		}
		if (response.status === 401 && retry && session && !path.startsWith('/api/auth/mobile/')) {
			const latest = await this.storage.read();
			if (latest?.accessToken === session.accessToken) {
				if (!this.refreshing)
					this.refreshing = this.refresh(session).finally(() => {
						this.refreshing = null;
					});
				await this.refreshing;
			}
			return this.request<T>(path, options, false);
		}
		if (response.status === 204) return undefined as T;
		const body = await response.json().catch(() => ({ detail: 'Não foi possível concluir. Tente novamente.' }));
		if (!response.ok) {
			const fieldMessages =
				response.status === 422 && body.context?.errors?.fieldErrors
					? Object.values(body.context.errors.fieldErrors)
							.flat()
							.filter((message): message is string => typeof message === 'string')
					: [];
			throw new ApiError(
				fieldMessages.join(' ') || body.detail || 'Não foi possível concluir. Tente novamente.',
				response.status,
				body.title,
			);
		}
		return body as T;
	}
	private async refresh(session: Session) {
		const generation = this.generation;
		try {
			const result = await this.request<{ session: Session }>(
				'/api/auth/mobile/refresh',
				{ method: 'POST', body: JSON.stringify({ refresh_token: session.refreshToken }) },
				false,
			);
			if (generation !== this.generation) throw new ApiError('A sessão mudou. Entre novamente.', 401);
			if (!result.session?.accessToken || !result.session.refreshToken) throw new ApiError('Sessão inválida.', 401);
			await this.setSession(result.session);
		} catch (error) {
			if (error instanceof ApiError && [400, 401, 403].includes(error.status) && generation === this.generation)
				await this.setSession(null);
			throw error;
		}
	}
	async setSession(value: Session | null) {
		this.generation++;
		await this.storage.write(value);
		for (const listener of this.listeners) listener(value);
	}
	async session() {
		return this.storage.read();
	}
	subscribe(listener: (value: Session | null) => void) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
}
