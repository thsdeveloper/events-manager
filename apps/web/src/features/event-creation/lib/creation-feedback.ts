type Receipt = { status: string; createdAt: number };
const pending = new Map<string, Receipt>();
const prefix = 'flouvi:event-created:';

/** Memory fallback keeps navigation working when browser storage is unavailable. */
export function rememberEventCreation(eventId: string, status: string) {
	const receipt = { status, createdAt: Date.now() };
	pending.set(eventId, receipt);
	try {
		sessionStorage.setItem(prefix + eventId, JSON.stringify(receipt));
	} catch {
		/* Storage can be disabled. */
	}
}

export function consumeEventCreation(eventId: string): Receipt | null {
	let receipt = pending.get(eventId);
	pending.delete(eventId);
	try {
		const raw = sessionStorage.getItem(prefix + eventId);
		sessionStorage.removeItem(prefix + eventId);
		if (raw) receipt = JSON.parse(raw);
	} catch {
		/* Use the memory receipt if storage is unavailable. */
	}
	if (
		!receipt ||
		typeof receipt.status !== 'string' ||
		!Number.isFinite(receipt.createdAt) ||
		Date.now() - receipt.createdAt > 5 * 60 * 1000 ||
		receipt.createdAt > Date.now()
	)
		return null;

	return receipt;
}
