import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '@/lib/content/fetchers';
import EventCheckout from '@/components/events/EventCheckout';
import type { EventTicket } from '@events-manager/contracts';
import { requireAuth } from '@/lib/auth/server-auth';

interface CheckoutPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  // Requerer autenticação - redireciona para login se não autenticado
  const auth = await requireAuth(`/eventos/${(await params).slug}/checkout`);

  const { slug } = await params;

  let event;
  try {
    event = await fetchEventBySlug(slug);
  } catch (error) {
    notFound();
  }

  // Verificar se evento tem ingressos
  if (event.is_free || !event.tickets || event.tickets.length === 0) {
    notFound();
  }

  // Filtrar apenas ingressos ativos
  const activeTickets = (event.tickets || [])
    .filter((ticket): ticket is EventTicket => typeof ticket !== 'string')
    .filter((ticket) => {
      const totalQuantity = ticket.quantity ?? 0;
      const sold = ticket.quantity_sold ?? 0;
      
return ticket.status === 'active' && (totalQuantity - sold) > 0;
    });

  if (activeTickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Ingressos Esgotados</h1>
          <p className="text-muted-foreground mb-6">
            Infelizmente todos os ingressos para este evento já foram vendidos.
          </p>
          <a
            href={`/eventos/${slug}`}
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Voltar ao Evento
          </a>
        </div>
      </div>
    );
  }

  // Pré-preencher dados do participante com informações do usuário autenticado
  const defaultParticipantInfo = {
    name: `${auth.user.first_name || ''} ${auth.user.last_name || ''}`.trim() || auth.user.email,
    email: auth.user.email,
  };

  return (
    <EventCheckout
      eventId={event.id}
      eventTitle={event.title}
      tickets={activeTickets}
      defaultParticipantInfo={defaultParticipantInfo}
    />
  );
}
