'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Filter } from 'lucide-react';
import { createColumns } from './columns';
import { CheckInDialog } from './CheckInDialog';
import { EditParticipantDialog } from './EditParticipantDialog';
import { CancelRegistrationDialog } from './CancelRegistrationDialog';
import { ResendEmailDialog } from './ResendEmailDialog';
import { ParticipantCard } from './ParticipantCard';
import type { ParticipantRow } from '../_lib/types';

interface ParticipantsTableProps {
  data: ParticipantRow[];
  isLoading: boolean;
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDataRefresh?: () => void;
}

export function ParticipantsTable({
  data,
  isLoading,
  pageCount,
  currentPage,
  onPageChange,
  onDataRefresh,
}: ParticipantsTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resendEmailDialogOpen, setResendEmailDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantRow | null>(null);

  const handleCheckInClick = (participant: ParticipantRow) => {
    setSelectedParticipant(participant);
    setCheckInDialogOpen(true);
  };

  const handleEditClick = (participant: ParticipantRow) => {
    setSelectedParticipant(participant);
    setEditDialogOpen(true);
  };

  const handleResendEmailClick = (participant: ParticipantRow) => {
    setSelectedParticipant(participant);
    setResendEmailDialogOpen(true);
  };

  const handleCancelClick = (participant: ParticipantRow) => {
    setSelectedParticipant(participant);
    setCancelDialogOpen(true);
  };

  const handleSuccess = () => {
    // Refresh data after successful operation
    onDataRefresh?.();
  };

  const columns = useMemo(
    () =>
      createColumns({
        onCheckInClick: handleCheckInClick,
        onEditClick: handleEditClick,
        onResendEmailClick: handleResendEmailClick,
        onCancelClick: handleCancelClick,
      }),
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    manualPagination: true,
    pageCount,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="size-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Carregando participantes...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 py-12">
        <div className="rounded-full bg-gray-100 p-6 dark:bg-gray-800">
          <Users className="size-12 text-gray-400 dark:text-gray-600" />
        </div>
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nenhum participante encontrado
          </h3>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
            Tente ajustar os filtros ou realize uma nova busca para encontrar participantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile View - Cards */}
      <div className="space-y-3 sm:hidden">
        {data.map((participant, index) => (
          <div
            key={participant.id}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
          >
            <ParticipantCard
              participant={participant}
              onCheckInClick={handleCheckInClick}
            />
          </div>
        ))}
      </div>

      {/* Desktop/Tablet View - Table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 sm:block dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {currentPage} de {Math.max(pageCount, 1)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* Check-in Dialog */}
      <CheckInDialog
        participant={selectedParticipant}
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Dialog */}
      <EditParticipantDialog
        participant={selectedParticipant}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Cancel Dialog */}
      <CancelRegistrationDialog
        participant={selectedParticipant}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Resend Email Dialog */}
      <ResendEmailDialog
        participant={selectedParticipant}
        open={resendEmailDialogOpen}
        onOpenChange={setResendEmailDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
