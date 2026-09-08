'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { firstError } from '../../lib/validation';
import type { CmsPostsItem } from '../../types';
import { Field } from '../FormPrimitives';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface PostsState {
	tagline: string;
	headline: string;
	limit: string;
}

function PostsFields({ value, onChange, errors }: BlockFieldsProps<PostsState>) {
	const id = useId();
	const update = (patch: Partial<PostsState>) => onChange({ ...value, ...patch });

	return (
		<div className="space-y-5">
			<Field
				id={`${id}-tagline`}
				label="Tagline"
				counter={{ value: value.tagline, max: 80 }}
				error={firstError(errors, 'tagline')}
			>
				<Input
					id={`${id}-tagline`}
					value={value.tagline}
					maxLength={80}
					onChange={(event) => update({ tagline: event.target.value })}
				/>
			</Field>
			<Field
				id={`${id}-headline`}
				label="Título"
				counter={{ value: value.headline, max: 150 }}
				error={firstError(errors, 'headline')}
			>
				<Input
					id={`${id}-headline`}
					value={value.headline}
					maxLength={150}
					onChange={(event) => update({ headline: event.target.value })}
				/>
			</Field>
			<Field id={`${id}-limit`} label="Quantidade de posts" hint="Entre 1 e 24." error={firstError(errors, 'limit')}>
				<Input
					id={`${id}-limit`}
					type="number"
					min={1}
					max={24}
					value={value.limit}
					onChange={(event) => update({ limit: event.target.value })}
				/>
			</Field>
		</div>
	);
}

export const postsBlockForm: BlockFormDefinition<CmsPostsItem, PostsState> = {
	Fields: PostsFields,
	fromItem: (item) => ({
		tagline: item?.tagline ?? '',
		headline: item?.headline ?? '',
		limit: String(item?.limit ?? 6),
	}),
	toPayload: (state) => ({ tagline: state.tagline || null, headline: state.headline || null, limit: state.limit }),
};
