'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus } from 'lucide-react';
import type { EventTicket } from '@events-manager/contracts';

export interface TicketSelectionItem {
  ticketId: string;
  quantity: number;
}

interface TicketSelectionProps {
  eventId: string;
  tickets: EventTicket[];
  onCheckout: (selectedTickets: TicketSelectionItem[]) => void;
  isLoading?: boolean;
}

// Helper function to convert price strings to numbers
const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    
return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export default function TicketSelection({
  eventId,
  tickets,
  onCheckout,
  isLoading = false,
}: TicketSelectionProps) {
  const [selectedTickets, setSelectedTickets] = useState<Map<string, number>>(new Map());

  // Filtrar apenas ingressos disponíveis
  const availableTickets = useMemo(() => {
    const now = new Date();

    return tickets.filter((ticket) => {
      // Verificar status
      if (ticket.status !== 'active') return false;

      // Verificar se há estoque
      const totalQuantity = ticket.quantity ?? 0;
      const sold = ticket.quantity_sold ?? 0;
      const available = Math.max(totalQuantity - sold, 0);
      if (available <= 0) return false;

      // Verificar período de vendas
      if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) return false;
      if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) return false;

      return true;
    });
  }, [tickets]);

  // Calcular totais
  const totals = useMemo(() => {
    let subtotal = 0;
    let convenienceFee = 0;
    let total = 0;
    let totalTickets = 0;

    selectedTickets.forEach((quantity, ticketId) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || quantity <= 0) return;

      totalTickets += quantity;

      // Preço base do ingresso (o que o organizador recebe)
      const ticketPrice = toNumber(ticket.price);
      const ticketSubtotal = ticketPrice * quantity;
      subtotal += ticketSubtotal;

      // Se o comprador paga a taxa, calcular a diferença
      const serviceFeeType = ticket.service_fee_type ?? 'passed_to_buyer';
      if (serviceFeeType === 'passed_to_buyer') {
        const buyerPrice = toNumber(ticket.buyer_price || ticket.price);
        const feePerTicket = buyerPrice - ticketPrice;
        convenienceFee += feePerTicket * quantity;
        total += buyerPrice * quantity;
      } else {
        // Se organizador absorve, comprador paga apenas o preço base
        total += ticketSubtotal;
      }
    });

    return { subtotal, serviceFee: convenienceFee, total, totalTickets };
  }, [selectedTickets, tickets]);

  const handleQuantityChange = (ticketId: string, delta: number) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const currentQuantity = selectedTickets.get(ticketId) || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);

    // Validar limites
    const totalQuantity = ticket.quantity ?? 0;
    const sold = ticket.quantity_sold ?? 0;
    const available = Math.max(totalQuantity - sold, 0);
    const maxAllowed = Math.min(
      available,
      ticket.max_quantity_per_purchase || available
    );

    if (newQuantity > maxAllowed) return;

    const newSelected = new Map(selectedTickets);
    if (newQuantity === 0) {
      newSelected.delete(ticketId);
    } else {
      newSelected.set(ticketId, newQuantity);
    }

    setSelectedTickets(newSelected);
  };

  const handleDirectInput = (ticketId: string, value: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const quantity = parseInt(value) || 0;
    const totalQuantity = ticket.quantity ?? 0;
    const sold = ticket.quantity_sold ?? 0;
    const available = Math.max(totalQuantity - sold, 0);
    const maxAllowed = Math.min(
      available,
      ticket.max_quantity_per_purchase || available
    );

    const validQuantity = Math.max(0, Math.min(quantity, maxAllowed));

    const newSelected = new Map(selectedTickets);
    if (validQuantity === 0) {
      newSelected.delete(ticketId);
    } else {
      newSelected.set(ticketId, validQuantity);
    }

    setSelectedTickets(newSelected);
  };

  const handleCheckout = () => {
    const items: TicketSelectionItem[] = Array.from(selectedTickets.entries()).map(
      ([ticketId, quantity]) => ({
        ticketId,
        quantity,
      })
    );

    onCheckout(items);
  };

  const hasSelection = selectedTickets.size > 0;

  return (
    <div className="space-y-6">
      {/* Lista de Ingressos */}
      <div className="space-y-4">
        {availableTickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhum ingresso disponível no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          availableTickets.map((ticket) => {
            const totalQuantity = ticket.quantity ?? 0;
            const sold = ticket.quantity_sold ?? 0;
            const available = Math.max(totalQuantity - sold, 0);
            const selected = selectedTickets.get(ticket.id) || 0;
            const serviceFeeType = ticket.service_fee_type ?? 'passed_to_buyer';
            const isAbsorbed = serviceFeeType === 'absorbed';

            return (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      {ticket.description && (
                        <CardDescription className="mt-1">
                          {ticket.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {!isAbsorbed ? (
                        <div>
                          <div className="text-sm text-muted-foreground line-through">
                            R$ {toNumber(ticket.price).toFixed(2)}
                          </div>
                          <div className="text-2xl font-bold">
                            R$ {toNumber(ticket.buyer_price || ticket.price).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            (com taxa)
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold">
                          R$ {toNumber(ticket.price).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {available} disponíveis
                      </Badge>
                      {ticket.min_quantity_per_purchase && (
                        <span className="text-xs text-muted-foreground">
                          Mín: {ticket.min_quantity_per_purchase}
                        </span>
                      )}
                      {ticket.max_quantity_per_purchase && (
                        <span className="text-xs text-muted-foreground">
                          Máx: {ticket.max_quantity_per_purchase}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(ticket.id, -1)}
                        disabled={selected === 0 || isLoading}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        max={available}
                        value={selected || ''}
                        onChange={(e) => handleDirectInput(ticket.id, e.target.value)}
                        className="w-16 text-center"
                        disabled={isLoading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(ticket.id, 1)}
                        disabled={selected >= available || isLoading}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resumo do Pedido */}
      {hasSelection && (
        <Card className="sticky bottom-4 shadow-lg">
          <CardHeader>
            <CardTitle>Resumo da Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ingressos ({totals.totalTickets})</span>
                <span className="font-medium">R$ {totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de conveniência</span>
                  <span className="font-medium">R$ {totals.serviceFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-3 border-t-2">
                <span>TOTAL</span>
                <span className="text-purple-600">R$ {totals.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
              onClick={handleCheckout}
              disabled={!hasSelection || isLoading}
            >
              {isLoading ? 'Processando...' : 'Finalizar Compra'}
            </Button>

            <div className="space-y-1">
              <p className="text-xs text-center text-muted-foreground">
                🔒 Pagamento seguro via AbacatePay
              </p>
              {totals.serviceFee > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  A taxa de conveniência cobre custos de processamento
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
