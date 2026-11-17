import { vi } from 'vitest';
import type { SupabaseClients } from '../../src/infrastructure/supabase/clients.js';
import { createSupabaseClientsStub } from './supabase.js';
export type MemoryRow = Record<string, unknown>;
export function eventMemory(
	options: {
		userId?: string;
		organizers?: MemoryRow[];
		tables?: Record<string, MemoryRow[]>;
		errors?: Record<string, unknown>;
	} = {},
) {
	const userId = options.userId ?? '00000000-0000-4000-8000-000000000001';
	const tables: Record<string, MemoryRow[]> = {
		organizers: options.organizers ?? [
			{ id: '00000000-0000-4000-8000-000000000002', user_id: userId, status: 'active' },
		],
		profiles: [],
		events: [],
		event_drafts: [],
		event_tickets: [],
		event_configurations: [{ id: 1, platform_fee_percentage: 5, platform_fee_minimum: 0 }],
		...options.tables,
	};
	const writes: Array<{ table: string; method: string; input: unknown }> = [];
	const stub = createSupabaseClientsStub({ user: { id: userId, email: 'organizer@example.test' } });
	const from = vi.fn((table: string) => {
		const predicates: Array<(row: MemoryRow) => boolean> = [];
		let inserted: MemoryRow[] | undefined,
			patch: MemoryRow | undefined,
			deleting = false,
			maximum: number | undefined;
		function execute(single = false) {
			const error = options.errors?.[table];
			if (error) return { data: null, error, count: null };
			let data: MemoryRow[];
			if (inserted) {
				data = inserted.map((row) => ({
					id: crypto.randomUUID(),
					date_created: '2026-10-29T12:00:00Z',
					date_updated: '2026-10-29T12:00:00Z',
					event_id: null,
					...row,
				}));
				if (
					table === 'events' &&
					data.some(
						(row) => row.source_draft_id && tables.events.some((old) => old.source_draft_id === row.source_draft_id),
					)
				)
					return {
						data: null,
						error: { code: '23505', message: 'duplicate key violates events_source_draft_id_key' },
						count: null,
					};
				(tables[table] ??= []).push(...data);
			} else {
				data = (tables[table] ?? []).filter((row) => predicates.every((fn) => fn(row)));
				if (patch) data.forEach((row) => Object.assign(row, patch));
				if (deleting) tables[table] = (tables[table] ?? []).filter((row) => !data.includes(row));
			}
			if (maximum !== undefined) data = data.slice(0, maximum);
			return { data: single ? (data[0] ?? null) : structuredClone(data), error: null, count: data.length };
		}
		const builder = {
			select() {
				return builder;
			},
			eq(key: string, value: unknown) {
				predicates.push((row) => row[key] === value);
				return builder;
			},
			is(key: string, value: unknown) {
				predicates.push((row) => (value === null ? row[key] == null : row[key] === value));
				return builder;
			},
			in(key: string, values: unknown[]) {
				predicates.push((row) => values.includes(row[key]));
				return builder;
			},
			order() {
				return builder;
			},
			limit(value: number) {
				maximum = value;
				return builder;
			},
			range() {
				return builder;
			},
			gte() {
				return builder;
			},
			ilike() {
				return builder;
			},
			insert(value: MemoryRow | MemoryRow[]) {
				inserted = Array.isArray(value) ? value : [value];
				writes.push({ table, method: 'insert', input: value });
				return builder;
			},
			update(value: MemoryRow) {
				patch = value;
				writes.push({ table, method: 'update', input: value });
				return builder;
			},
			delete() {
				deleting = true;
				writes.push({ table, method: 'delete', input: null });
				return builder;
			},
			maybeSingle() {
				return Promise.resolve(execute(true));
			},
			single() {
				return Promise.resolve(execute(true));
			},
			then(resolve: (value: ReturnType<typeof execute>) => unknown, reject?: (reason: unknown) => unknown) {
				return Promise.resolve(execute()).then(resolve, reject);
			},
		};
		return builder;
	});
	stub.clients.admin.from = from as unknown as SupabaseClients['admin']['from'];
	return { clients: stub.clients, tables, writes, from };
}
