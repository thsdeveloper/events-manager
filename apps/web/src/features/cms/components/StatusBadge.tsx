import type { CmsContentStatus } from '@events-manager/contracts';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_STYLES, isScheduled, statusLabel } from '../lib/status';

export function StatusBadge({ status, publishedAt }: { status: CmsContentStatus; publishedAt?: string | null }) {
	const scheduled = isScheduled(status, publishedAt ?? null);

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
				scheduled ? 'bg-blue-50 text-blue-700' : STATUS_STYLES[status],
			)}
		>
			{scheduled && <CalendarClock className="size-3.5" />}
			{scheduled ? 'Agendado' : statusLabel(status)}
		</span>
	);
}
