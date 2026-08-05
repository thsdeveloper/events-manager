import { Settings } from 'lucide-react';

export default function ConfiguracoesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Configurações
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mt-1">
					Configure sua conta de organizador
				</p>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
				<Settings className="size-16 text-gray-400 mx-auto mb-4" />
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					Configurações em Desenvolvimento
				</h3>
				<p className="text-gray-600 dark:text-gray-400">
					Esta seção está sendo desenvolvida
				</p>
			</div>
		</div>
	);
}
