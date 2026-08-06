'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { Button } from '@/components/ui/button';

// Import new components
import { HeroSection } from '@/components/organizer-upgrade/HeroSection';
import { BenefitsGrid } from '@/components/organizer-upgrade/BenefitsGrid';
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

	// Determine user state
	const isActiveOrganizer = isOrganizer && organizerStatus === 'active';
	const isPendingOrganizer = organizerStatus === 'pending' || hasPendingOrganizerRequest;
	const isRegularUser = !isOrganizer && !isPendingOrganizer;

	// Handlers
	const handleGetStarted = () => {
		router.push('/perfil/organizador/novo');
	};

	const handleLearnMore = () => {
		window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
	};

	const handleEditRequest = () => {
		router.push('/perfil/organizador/novo');
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				{/* STATE 1: Regular User - Show Full Marketing Flow */}
				{isRegularUser && (
					<div className="space-y-16">
						<HeroSection onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />

						<BenefitsGrid />

						{/* CTA Section */}
						<div className="text-center py-12">
							<Button
								size="lg"
								onClick={handleGetStarted}
								className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl"
							>
								Solicitar acesso agora
							</Button>
						</div>

						<FAQAccordion />
					</div>
				)}

				{/* STATE 2: Pending organizer */}
				{isPendingOrganizer && !isActiveOrganizer && (
					<div className="">
						<StatusTimeline onEdit={handleEditRequest} />

						{/* FAQ for pending users */}
						<div className="mt-16">
							<FAQAccordion />
						</div>
					</div>
				)}

				{/* STATE 3: Active Organizer - Show Success State */}
				{isActiveOrganizer && (
					<div className="mx-auto space-y-12">
						<SuccessState organizerName={user.first_name || 'Organizador'} />

						{/* FAQ for new organizers */}
						<div>
							<FAQAccordion />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
