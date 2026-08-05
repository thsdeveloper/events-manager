'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { MultiStepFormWizard } from '@/components/organizer-upgrade/MultiStepFormWizard';

export default function NovoOrganizadorPage() {
	const router = useRouter();
	const {
		user,
		isLoading,
		isOrganizer,
		hasPendingOrganizerRequest,
		refresh,
	} = useServerAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login?redirect=/perfil/organizador/novo');
		}
	}, [user, isLoading, router]);

	// Redirect if user is already an organizer or has pending request
	useEffect(() => {
		if (!isLoading && (isOrganizer || hasPendingOrganizerRequest)) {
			router.push('/perfil/organizador');
		}
	}, [isLoading, isOrganizer, hasPendingOrganizerRequest, router]);

	const handleFormSubmit = () => {
		refresh();
		router.push('/perfil/organizador');
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	// Redirect users who shouldn't be here
	if (isOrganizer || hasPendingOrganizerRequest) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				{/* Page Header */}
				<div className="mb-12 text-center">
					<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
						Solicitar acesso como organizador
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						Preencha o formulário abaixo para solicitar acesso como organizador de eventos.
						Nossa equipe irá revisar sua solicitação em breve.
					</p>
				</div>

				{/* Form */}
				<MultiStepFormWizard
					user={user}
					onSuccess={handleFormSubmit}
				/>
			</div>
		</div>
	);
}
