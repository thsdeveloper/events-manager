import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default async function InscricoesPage({ params }: PageProps) {
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
						Inscrições
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Gerenciar inscrições do evento
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="flex items-center gap-3">
						<CheckCircle className="size-5 text-green-600" />
						<div>
							<p className="text-sm text-gray-600 dark:text-gray-400">Confirmadas</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
						</div>
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="flex items-center gap-3">
						<Clock className="size-5 text-yellow-600" />
						<div>
							<p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
						</div>
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<div className="flex items-center gap-3">
						<XCircle className="size-5 text-red-600" />
						<div>
							<p className="text-sm text-gray-600 dark:text-gray-400">Canceladas</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<div className="text-center py-12 text-gray-600 dark:text-gray-400">
					Nenhuma inscrição ainda
				</div>
			</div>
		</div>
	);
}
