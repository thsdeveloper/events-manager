'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterSheet } from './FilterSheet';
import { FilterInput, FilterSelect, FilterDate, type FilterOption } from './FilterFields';

/** Serializable field definitions can be passed directly by a Server Component. */
export type QueryFilterField = { name: string; label: string; placeholder?: string; defaultValue?: string } & (
	| { type: 'select'; options: readonly FilterOption[] }
	| { type: 'search' | 'text' | 'date'; maxLength?: number }
);

export function QueryFilterSheet({
	fields,
	title = 'Filtros',
}: {
	fields: readonly QueryFilterField[];
	title?: string;
}) {
	const params = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();
	const defaults = Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? '']));
	const values = Object.fromEntries(
		fields.map((field) => [field.name, params.get(field.name) ?? defaults[field.name]]),
	);

	return (
		<FilterSheet
			values={values}
			defaultValues={defaults}
			title={title}
			activeCount={fields.filter((field) => values[field.name] !== defaults[field.name]).length}
			onApply={(next) => {
				const query = new URLSearchParams(params.toString());
				for (const field of fields) {
					const value = next[field.name].trim();
					if (value && value !== defaults[field.name]) query.set(field.name, value);
					else query.delete(field.name);
				}
				query.delete('page');
				const suffix = query.toString();
				router.push(suffix ? `${pathname}?${suffix}` : pathname);
			}}
		>
			{(draft, setDraft) =>
				fields.map((field) =>
					field.type === 'select' ? (
						<FilterSelect
							key={field.name}
							label={field.label}
							value={draft[field.name]}
							options={field.options}
							onChange={(value) => setDraft({ ...draft, [field.name]: value })}
						/>
					) : field.type === 'date' ? (
						<FilterDate
							key={field.name}
							label={field.label}
							value={draft[field.name]}
							onChange={(value) => setDraft({ ...draft, [field.name]: value })}
						/>
					) : (
						<FilterInput
							key={field.name}
							label={field.label}
							type={field.type}
							placeholder={field.placeholder}
							maxLength={field.maxLength}
							value={draft[field.name]}
							onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
						/>
					),
				)
			}
		</FilterSheet>
	);
}
