'use client';

import type { EventPageIssue, EventPageSection } from '@events-manager/contracts';
import { AlertCircle } from 'lucide-react';

interface PublishIssuesProps {
	issues: EventPageIssue[];
	sections: EventPageSection[];
}

/** Lista o que impede a publicação, com atalho para a seção envolvida. */
export function PublishIssues({ issues, sections }: PublishIssuesProps) {
	if (issues.length === 0) return null;

	return (
		<div
			role="alert"
			className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
		>
			<p className="flex items-center gap-2 font-semibold">
				<AlertCircle className="size-4" aria-hidden />
				Antes de publicar, resolva:
			</p>
			<ul className="mt-2 list-disc space-y-1 pl-6">
				{issues.map((issue, index) => {
					const sectionIndex = issue.path[0] === 'sections' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
					const section = sectionIndex !== null ? sections[sectionIndex] : null;

					return (
						<li key={`${issue.code}-${index}`}>
							{issue.message}{' '}
							{section ? (
								<a href={`#section-${section.id}`} className="font-medium underline">
									Ir para a seção
								</a>
							) : null}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
