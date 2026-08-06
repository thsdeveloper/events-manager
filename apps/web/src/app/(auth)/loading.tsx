import { PageLoadingState } from '@/components/design-system/molecules/PageLoadingState';

export default function AuthLoading() {
	return (
		<div className="mx-auto max-w-2xl px-6 py-16">
			<PageLoadingState label="Preparando acesso seguro" />
		</div>
	);
}
