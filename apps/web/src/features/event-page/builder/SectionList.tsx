'use client';

import { Card } from '@/components/ui/card';
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EVENT_PAGE_SECTION_META, type EventPageSection } from '@events-manager/contracts';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Lock, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SECTION_ICONS } from './icons';
import { isProtectedSection, sectionSummary } from './lib';

interface SectionListProps {
	sections: EventPageSection[];
	onReorder: (sections: EventPageSection[]) => void;
	onMove: (index: number, direction: -1 | 1) => void;
	onEdit: (section: EventPageSection) => void;
	onToggleHidden: (section: EventPageSection) => void;
	onDuplicate: (section: EventPageSection) => void;
	onRemove: (section: EventPageSection) => void;
}

/**
 * Ordem das seções: arrastar pela alça (mouse ou teclado) ou pelos botões de
 * subir e descer, que também servem quem não usa mouse.
 */
export function SectionList({
	sections,
	onReorder,
	onMove,
	onEdit,
	onToggleHidden,
	onDuplicate,
	onRemove,
}: SectionListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		const from = sections.findIndex((section) => section.id === active.id);
		const to = sections.findIndex((section) => section.id === over.id);
		if (from < 0 || to < 0) return;
		onReorder(arrayMove(sections, from, to));
	};

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
				<ol aria-label="Seções da página" className="space-y-2">
					{sections.map((section, index) => (
						<SectionCard
							key={section.id}
							section={section}
							index={index}
							total={sections.length}
							onMove={onMove}
							onEdit={onEdit}
							onToggleHidden={onToggleHidden}
							onDuplicate={onDuplicate}
							onRemove={onRemove}
						/>
					))}
				</ol>
			</SortableContext>
		</DndContext>
	);
}

interface SectionCardProps extends Omit<SectionListProps, 'sections' | 'onReorder'> {
	section: EventPageSection;
	index: number;
	total: number;
}

function SectionCard({
	section,
	index,
	total,
	onMove,
	onEdit,
	onToggleHidden,
	onDuplicate,
	onRemove,
}: SectionCardProps) {
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
		id: section.id,
	});
	const meta = EVENT_PAGE_SECTION_META[section.type];
	const Icon = SECTION_ICONS[section.type];
	const locked = isProtectedSection(section);
	const summary = sectionSummary(section);

	return (
		<li
			ref={setNodeRef}
			className={isDragging ? 'relative z-10' : undefined}
			id={`section-${section.id}`}
			aria-label={`${meta.label}: ${summary}`}
			style={{ transform: CSS.Transform.toString(transform), transition }}
		>
			<Card
				className={cn(
					'flex items-center gap-2 p-2.5 transition-colors hover:border-primary/40',
					section.hidden && 'opacity-60',
					isDragging && 'z-10',
				)}
			>
				<Button
					variant="ghost"
					type="button"
					ref={setActivatorNodeRef}
					{...attributes}
					{...listeners}
					aria-label={`Arrastar ${meta.label}`}
					className="h-auto whitespace-normal cursor-grab touch-none rounded p-1 active:cursor-grabbing"
				>
					<GripVertical className="size-4" aria-hidden />
				</Button>
				<div className="flex flex-col">
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						disabled={index === 0}
						onClick={() => onMove(index, -1)}
						aria-label={`Mover ${meta.label} para cima`}
					>
						<ArrowUp className="size-3.5" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						disabled={index === total - 1}
						onClick={() => onMove(index, 1)}
						aria-label={`Mover ${meta.label} para baixo`}
					>
						<ArrowDown className="size-3.5" />
					</Button>
				</div>
				<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Icon className="size-4" aria-hidden />
				</span>
				<div className="min-w-0 flex-1">
					<p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{meta.label}
						{locked ? <Lock className="size-3" aria-label="Seção obrigatória" /> : null}
						{section.hidden ? <span className="normal-case text-muted-foreground">oculta</span> : null}
					</p>
					<p className="truncate text-sm font-medium text-foreground">{summary}</p>
					<p className="truncate text-xs text-muted-foreground">#{section.anchor}</p>
				</div>
				<div className="flex items-center gap-0.5">
					<Button
						size="icon"
						variant="ghost"
						className="size-8"
						onClick={() => onEdit(section)}
						aria-label={`Editar ${meta.label}`}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="size-8"
						disabled={locked}
						title={locked ? 'A seção de ingressos não pode ficar oculta.' : undefined}
						onClick={() => onToggleHidden(section)}
						aria-label={section.hidden ? `Mostrar ${meta.label}` : `Ocultar ${meta.label}`}
					>
						{section.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
					</Button>
					{locked ? null : (
						<Button
							size="icon"
							variant="ghost"
							className="size-8"
							onClick={() => onDuplicate(section)}
							aria-label={`Duplicar ${meta.label}`}
						>
							<Copy className="size-4" />
						</Button>
					)}
					<Button
						size="icon"
						variant="destructive"
						className="size-8"
						disabled={locked}
						title={locked ? 'A seção de ingressos é obrigatória: é por ela que se chega ao checkout.' : undefined}
						onClick={() => onRemove(section)}
						aria-label={`Remover ${meta.label}`}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</Card>
		</li>
	);
}
