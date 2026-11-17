'use client';

import { useId, useMemo, useState } from 'react';
import { barX, barY, defineChart, lineY } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { pie, polar, radialArc } from '@tanstack/charts/polar';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { ChartNoAxesCombined, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface ChartDatum {
	id: string;
	label: string;
	value: number;
	color?: string;
	detail?: string;
}
export interface MetricChartProps {
	data: ChartDatum[];
	label: string;
	valueLabel: string;
	kind?: 'bar' | 'line' | 'horizontal-bar' | 'donut';
	format?: 'integer' | 'currency';
	height?: number;
	emptyMessage?: string;
}
const formatters = {
	integer: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }),
	currency: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
};
const currencyAxis = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
	notation: 'compact',
	maximumFractionDigits: 1,
});
const axisValue = (value: number, format: 'integer' | 'currency') =>
	format === 'currency' ? currencyAxis.format(value) : Number.isInteger(value) ? formatters.integer.format(value) : '';
const palette = [1, 2, 3, 4, 5].map((index) => `hsl(var(--chart-${index}))`);
const theme = {
	foreground: 'hsl(var(--foreground))',
	muted: 'hsl(var(--muted-foreground))',
	grid: 'hsl(var(--foreground))',
	palette,
};
const shorten = (label: string) => (label.length > 22 ? `${label.slice(0, 21)}…` : label);
type PlotProps = Required<Pick<MetricChartProps, 'data' | 'label' | 'height' | 'format'>>;

function CartesianPlot({ data, label, height, format, kind }: PlotProps & { kind: 'bar' | 'line' }) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					kind === 'line'
						? lineY(data, { x: 'id', y: 'value', stroke: palette[0], strokeWidth: 2, points: true })
						: barY(data, { x: 'id', y: 'value', fill: (row) => row.color ?? palette[0], radius: 4, maxThickness: 48 }),
				],
				scales: {
					x: {
						scale: () => scaleBand<string>().padding(0.25),
						axis: {
							tickLabels: { opacity: 1 },
							ticks: { format: (value) => shorten(data.find((row) => row.id === value)?.label ?? String(value)) },
						},
					},
					y: {
						scale: scaleLinear,
						nice: true,
						grid: true,
						axis: {
							tickLabels: { opacity: 1 },
							ticks: {
								format: (value) => axisValue(value, format),
							},
						},
					},
				},
				theme,
				tooltip: {
					use: tooltip,
					format: (point) => `${point.datum.label}\n${formatters[format].format(point.datum.value)}`,
				},
			}),
		[data, format, kind],
	);

	return (
		<Chart
			definition={definition}
			height={height}
			initialWidth={640}
			ariaLabel={label}
			ariaDescription="Use as setas para explorar os valores ou consulte a tabela abaixo do gráfico."
		/>
	);
}

function HorizontalPlot({ data, label, height, format }: PlotProps) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					barX(data, { x: 'value', y: 'id', fill: (row) => row.color ?? palette[0], radius: 4, maxThickness: 32 }),
				],
				scales: {
					x: {
						scale: scaleLinear,
						nice: true,
						grid: true,
						axis: {
							tickLabels: { opacity: 1 },
							ticks: {
								format: (value) => axisValue(value, format),
							},
						},
					},
					y: {
						scale: () => scaleBand<string>().padding(0.3),
						axis: {
							tickLabels: { opacity: 1 },
							ticks: { format: (value) => shorten(data.find((row) => row.id === value)?.label ?? String(value)) },
						},
					},
				},
				theme,
				tooltip: {
					use: tooltip,
					format: (point) => `${point.datum.label}\n${formatters[format].format(point.datum.value)}`,
				},
			}),
		[data, format],
	);

	return (
		<Chart
			definition={definition}
			height={height}
			initialWidth={640}
			ariaLabel={label}
			ariaDescription="Use as setas para explorar os valores ou consulte a tabela abaixo do gráfico."
		/>
	);
}

function DonutPlot({ data, label, height, format }: PlotProps) {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					polar({
						marks: [
							radialArc(pie(data, { value: 'value' }), {
								innerRadius: ({ radius }) => radius * 0.68,
								outerRadius: ({ radius }) => radius * 0.9,
								fill: (row) => row.color ?? palette[row.index % palette.length],
								stroke: 'hsl(var(--card))',
								strokeWidth: 3,
							}),
						],
						scales: { angle: null, radius: null },
					}),
				],
				scales: { x: null, y: null },
				theme,
				tooltip: {
					use: tooltip,
					format: (point) =>
						`${point.datum.label}\n${formatters[format].format(point.datum.value)} · ${(point.datum.fraction * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
				},
			}),
		[data, format],
	);

	return (
		<Chart
			definition={definition}
			height={height}
			initialWidth={640}
			ariaLabel={label}
			ariaDescription="Use as setas para explorar os valores ou consulte a tabela abaixo do gráfico."
		/>
	);
}

/** Responsive TanStack renderer with the same accessible data view for every dashboard. */
export function MetricChart({
	data,
	label,
	valueLabel,
	kind = 'bar',
	format = 'integer',
	height = 280,
	emptyMessage = 'Nenhum dado disponível neste período.',
}: MetricChartProps) {
	const [showTable, setShowTable] = useState(false);
	const tableId = useId();
	const rows = useMemo(
		() => data.filter((row) => Number.isFinite(row.value) && (kind !== 'donut' || row.value >= 0)),
		[data, kind],
	);
	const hasValues = rows.some((row) => row.value !== 0);
	const plotProps = { data: rows, label, format, height };

	return (
		<section
			aria-label={label}
			className="min-w-0 text-foreground [--ts-chart-tooltip-background:hsl(var(--popover))] [--ts-chart-tooltip-color:hsl(var(--popover-foreground))] [--ts-chart-tooltip-border:1px_solid_hsl(var(--border))] [--ts-chart-tooltip-border-radius:var(--radius)]"
		>
			{hasValues ? (
				kind === 'donut' ? (
					<DonutPlot {...plotProps} />
				) : kind === 'horizontal-bar' ? (
					<HorizontalPlot {...plotProps} />
				) : (
					<CartesianPlot {...plotProps} kind={kind} />
				)
			) : (
				<div
					role="status"
					className="flex flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground"
					style={{ minHeight: height }}
				>
					<ChartNoAxesCombined aria-hidden="true" className="size-8" />
					{emptyMessage}
				</div>
			)}
			{kind === 'donut' && hasValues && (
				<ul aria-label="Legenda" className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
					{rows.map((row, index) => (
						<li key={row.id} className="flex items-start gap-2">
							<span
								aria-hidden="true"
								className="mt-1 size-2.5 shrink-0 rounded-sm"
								style={{ backgroundColor: row.color ?? palette[index % palette.length] }}
							/>
							<span>
								{row.label} ({formatters[format].format(row.value)})
								{row.detail && <span className="block text-xs text-muted-foreground">{row.detail}</span>}
							</span>
						</li>
					))}
				</ul>
			)}
			{rows.length > 0 && (
				<>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						aria-expanded={showTable}
						aria-controls={tableId}
						onClick={() => setShowTable((value) => !value)}
					>
						<Table2 aria-hidden="true" className="size-4" />
						{showTable ? 'Ocultar tabela' : 'Ver dados em tabela'}
					</Button>
					{showTable && (
						<div id={tableId} className="mt-3 rounded-md border">
							<Table aria-label={label}>
								<TableHeader>
									<TableRow>
										<TableHead>Categoria</TableHead>
										<TableHead className="text-right">{valueLabel}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.id}>
											<TableCell>{row.label}</TableCell>
											<TableCell className="text-right tabular-nums">{formatters[format].format(row.value)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</>
			)}
		</section>
	);
}
