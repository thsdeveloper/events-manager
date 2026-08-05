'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Pencil, Copy, Power, Trash2, Ticket } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getMediaAssetUrl } from '@/lib/media';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { EventTicket } from '../_lib/types';

interface TicketsTableProps {
  data: EventTicket[];
  isLoading: boolean;
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDataRefresh: () => void;
  onEditTicket: (ticket: EventTicket) => void;
}

export function TicketsTable({
  data,
  isLoading,
  pageCount,
  currentPage,
  onPageChange,
  onDataRefresh,
  onEditTicket,
}: TicketsTableProps) {
  const { toast } = useToast();
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [togglingTicketId, setTogglingTicketId] = useState<string | null>(null);

  const handleDelete = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/admin/ingressos/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir ingresso');
      }

      toast({
        title: 'Ingresso excluído',
        description: 'O ingresso foi excluído com sucesso.',
        variant: 'success',
      });

      onDataRefresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o ingresso.',
        variant: 'destructive',
      });
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleToggleStatus = async (ticket: EventTicket) => {
    setTogglingTicketId(ticket.id);

    try {
      const newStatus = ticket.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`/api/admin/ingressos/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status');
      }

      toast({
        title: newStatus === 'active' ? 'Ingresso ativado' : 'Ingresso desativado',
        description: `O ingresso foi ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso.`,
        variant: 'success',
      });

      onDataRefresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do ingresso.',
        variant: 'destructive',
      });
    } finally {
      setTogglingTicketId(null);
    }
  };

  const handleDuplicate = async (ticket: EventTicket) => {
    try {
      const response = await fetch(`/api/admin/ingressos/${ticket.id}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao duplicar ingresso');
      }

      toast({
        title: 'Ingresso duplicado',
        description: 'O ingresso foi duplicado com sucesso.',
        variant: 'success',
      });

      onDataRefresh();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível duplicar o ingresso.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: EventTicket['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Ativo
          </Badge>
        );
      case 'sold_out':
        return (
          <Badge variant="destructive">
            Esgotado
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            Inativo
          </Badge>
        );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="size-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Nenhum ingresso cadastrado
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Crie seu primeiro ingresso para começar a vender!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingresso</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Período de Venda</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ticket) => {
              const totalQuantity = ticket.quantity ?? 0;
              const sold = ticket.quantity_sold ?? 0;
              const soldPercentage = totalQuantity > 0 ? (sold / totalQuantity) * 100 : 0;

              return (
                <TableRow key={ticket.id}>
                  {/* Ingresso */}
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.title}</div>
                      {ticket.description && (
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">
                          {ticket.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Evento */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ticket.event_id.cover_image && (
                        <Image
                          src={getMediaAssetUrl(ticket.event_id.cover_image)}
                          alt={ticket.event_id.title}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm">{ticket.event_id.title}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(ticket.event_id.start_date)}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Disponibilidade */}
                  <TableCell>
                    <div className="space-y-1 min-w-[150px]">
                      <Progress value={soldPercentage} className="h-2" />
                      <div className="text-sm">
                        <span className="font-medium">{sold}</span> de{' '}
                        <span className="font-medium">{totalQuantity}</span> vendidos
                      </div>
                      <div className="text-xs text-gray-500">
                        {soldPercentage.toFixed(0)}% ocupação
                      </div>
                    </div>
                  </TableCell>

                  {/* Preço */}
                  <TableCell>
                    <div>
                      <div className="font-semibold">{formatCurrency(ticket.buyer_price ?? ticket.price ?? 0)}</div>
                      {(ticket.service_fee_type ?? 'passed_to_buyer') === 'absorbed' && (
                        <div className="text-xs text-gray-500">Taxa absorvida</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>

                  {/* Período de Venda */}
                  <TableCell>
                    <div className="text-sm">
                      {ticket.sale_start_date && ticket.sale_end_date ? (
                        <>
                          {formatDate(ticket.sale_start_date)}
                          <br />→ {formatDate(ticket.sale_end_date)}
                        </>
                      ) : ticket.sale_start_date ? (
                        <>A partir de {formatDate(ticket.sale_start_date)}</>
                      ) : ticket.sale_end_date ? (
                        <>Até {formatDate(ticket.sale_end_date)}</>
                      ) : (
                        <span className="text-gray-500">Sempre aberto</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Ações */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditTicket(ticket)}>
                          <Pencil className="mr-2 size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(ticket)}>
                          <Copy className="mr-2 size-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(ticket)}
                          disabled={togglingTicketId === ticket.id}
                        >
                          <Power className="mr-2 size-4" />
                          {ticket.status === 'active' ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingTicketId(ticket.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Página {currentPage} de {pageCount}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTicketId} onOpenChange={() => setDeletingTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ingresso?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ingresso? Esta ação não pode ser desfeita.
              {data.find((t) => t.id === deletingTicketId)?.quantity_sold ? (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Este ingresso possui{' '}
                    <strong>{data.find((t) => t.id === deletingTicketId)?.quantity_sold}</strong>{' '}
                    venda(s). As vendas já realizadas serão mantidas, mas novas vendas serão
                    impedidas.
                  </p>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTicketId && handleDelete(deletingTicketId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
