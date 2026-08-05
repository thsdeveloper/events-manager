import Link from 'next/link';
import { ArrowLeft, Search, Download } from 'lucide-react';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default async function ParticipantesPage({ params }: PageProps) {
	const { evento_id: id } = await params;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href={`/admin/eventos/${id}`}
					className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
				>
					<ArrowLeft className="size-5" />
				</Link>
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Participantes
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Gerenciar participantes do evento
					</p>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar participantes..."
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
						/>
					</div>
					<button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
						<Download className="size-4" />
						Exportar
					</button>
				</div>

				<div className="text-center py-12 text-gray-600 dark:text-gray-400">
					Nenhum participante ainda
				</div>
			</div>
		</div>
	);
}
