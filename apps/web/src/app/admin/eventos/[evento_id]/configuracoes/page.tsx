import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default async function ConfiguracoesPage({ params }: PageProps) {
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
						Configurações
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-1">
						Ajustes do evento
					</p>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<form className="space-y-6">
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Visibilidade
						</h3>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="publicar"
								className="size-4 text-accent border-gray-300 rounded focus:ring-accent"
								defaultChecked
							/>
							<label htmlFor="publicar" className="text-sm text-gray-700 dark:text-gray-300">
								Publicar evento (visível ao público)
							</label>
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="inscricoes"
								className="size-4 text-accent border-gray-300 rounded focus:ring-accent"
								defaultChecked
							/>
							<label htmlFor="inscricoes" className="text-sm text-gray-700 dark:text-gray-300">
								Permitir inscrições
							</label>
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
							Notificações
						</h3>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="email-inscricao"
								className="size-4 text-accent border-gray-300 rounded focus:ring-accent"
								defaultChecked
							/>
							<label htmlFor="email-inscricao" className="text-sm text-gray-700 dark:text-gray-300">
								Enviar email de confirmação de inscrição
							</label>
						</div>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="email-lembrete"
								className="size-4 text-accent border-gray-300 rounded focus:ring-accent"
								defaultChecked
							/>
							<label htmlFor="email-lembrete" className="text-sm text-gray-700 dark:text-gray-300">
								Enviar lembretes aos participantes
							</label>
						</div>
					</div>

					<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
						<button
							type="submit"
							className="inline-flex items-center gap-2 px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
						>
							<Save className="size-4" />
							Salvar Configurações
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
