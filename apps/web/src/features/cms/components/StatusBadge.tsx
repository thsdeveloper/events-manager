import { Badge } from '@/components/ui/badge';
import type { CmsContentStatus } from '@events-manager/contracts';
import { CalendarClock } from 'lucide-react';

import { isScheduled, statusLabel } from '../lib/status';

export function StatusBadge({ status, publishedAt }: { status: CmsContentStatus; publishedAt?: string | null }) {
	const scheduled = isScheduled(status, publishedAt ?? null);

	return (
		<Badge variant="secondary" className="gap-1">
			{scheduled && <CalendarClock className="size-3.5" />}
			{scheduled ? 'Agendado' : statusLabel(status)}
		</Badge>
	);
}
