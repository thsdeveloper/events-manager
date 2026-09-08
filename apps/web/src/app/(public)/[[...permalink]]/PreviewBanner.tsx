import { Eye } from 'lucide-react';
import Link from 'next/link';

interface PreviewBannerProps {
	/** Mesma rota sem o token: volta à versão publicada (ou ao 404). */
	exitHref: string;
}

export default function PreviewBanner({ exitHref }: PreviewBannerProps) {
	return (
		<div
			role="status"
			className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-50"
		>
			<span className="inline-flex items-center gap-2">
				<Eye aria-hidden="true" className="size-4" />
				<strong>Pré-visualização de rascunho</strong> — esta página não está publicada
			</span>
			<Link href={exitHref} className="font-medium underline underline-offset-4">
				Sair da pré-visualização
			</Link>
		</div>
	);
}
