'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import Container from '@/components/ui/container';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { OrganizerLanding } from '@/features/organizer-landing';
import { StatusTimeline } from '@/components/organizer-upgrade/StatusTimeline';
import { SuccessState } from '@/components/organizer-upgrade/SuccessState';
import { FAQAccordion } from '@/components/organizer-upgrade/FAQAccordion';

export default function PerfilOrganizadorPage() {
	const router = useRouter();
	const { user, isLoading, isOrganizer, hasPendingOrganizerRequest, organizerStatus } = useServerAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login?redirect=/perfil/organizador');
		}
	}, [user, isLoading, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center" role="status">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 size-10 animate-spin text-primary" aria-hidden="true" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user) return null;

	const isActiveOrganizer = isOrganizer && organizerStatus === 'active';
	const isPendingOrganizer = !isActiveOrganizer && (organizerStatus === 'pending' || hasPendingOrganizerRequest);

	if (isActiveOrganizer) {
		return (
			<Container as="section" className="space-y-12 py-8 lg:py-12">
				<SuccessState organizerName={user.first_name || 'Organizador'} />
				<FAQAccordion />
			</Container>
		);
	}

	if (isPendingOrganizer) {
		return (
			<Container as="section" className="py-8 lg:py-12">
				<StatusTimeline />
				<div className="mt-16">
					<FAQAccordion />
				</div>
			</Container>
		);
	}

	// The fee simulator uses React Query; the public layout has no provider.
	return (
		<ReactQueryProvider>
			<OrganizerLanding user={user} />
		</ReactQueryProvider>
	);
}
