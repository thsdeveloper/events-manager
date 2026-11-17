'use client';

import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { createColumns } from './columns';
import { CheckInDialog } from './CheckInDialog';
import { EditParticipantDialog } from './EditParticipantDialog';
import { CancelRegistrationDialog } from './CancelRegistrationDialog';
import { ResendEmailDialog } from './ResendEmailDialog';
import { ParticipantCard } from './ParticipantCard';
import type { ParticipantRow } from '../_lib/types';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

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
		[],
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
				<Spinner className="size-10 animate-spin text-muted-foreground " />
				<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Carregando ingressos...</p>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Filter aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle role="heading" aria-level={3}>
						Nenhum participante encontrado
					</EmptyTitle>
					<EmptyDescription>
						Tente ajustar os filtros ou realize uma nova busca para encontrar participantes.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
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
							onEditClick={handleEditClick}
							onResendEmailClick={handleResendEmailClick}
							onCancelClick={handleCancelClick}
						/>
					</div>
				))}
			</div>

			{/* Desktop/Tablet View - Table */}
			<Card className="hidden overflow-x-auto sm:block">
				<Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} className="text-left uppercase tracking-wider text-muted-foreground">
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody className="divide-y divide-gray-200 bg-card dark:divide-gray-700">
						{table.getRowModel().rows.map((row) => (
							<TableRow key={row.id} className="transition-colors">
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{/* Paginação */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground dark:text-muted-foreground">
					Página {currentPage} de {Math.max(pageCount, 1)}
				</span>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
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
