import { PageLoadingState } from '@/components/design-system/molecules/PageLoadingState';

export default function ProtectedLoading() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
			<PageLoadingState label="Carregando seus pagamentos" />
		</div>
	);
}
