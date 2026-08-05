// Este arquivo contém as etapas 2 e 3 do formulário aprimorado
// Para adicionar ao arquivo principal ImprovedMultiStepFormWizard.tsx

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Sparkles, Info, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

const EVENT_TYPES = [
	{ value: 'shows', label: 'Shows e Festivais', emoji: '🎵' },
	{ value: 'parties', label: 'Festas e Baladas', emoji: '🎉' },
	{ value: 'corporate', label: 'Eventos Corporativos', emoji: '💼' },
	{ value: 'workshops', label: 'Workshops e Cursos', emoji: '📚' },
	{ value: 'sports', label: 'Esportivos', emoji: '⚽' },
	{ value: 'culture', label: 'Teatro e Cultura', emoji: '🎭' }
];

// Step 2: Sobre seus Eventos
export function Step2Fields({ form, experience }: { form: any; experience: string }) {
	const eventTypes = form.watch('eventTypes') || [];
	const description = form.watch('description') || '';
	const goals = form.watch('goals') || '';

	return (
		<div className="space-y-8">
			{/* Seção: Tipos de Evento */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Tipos de Evento
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="eventTypes"
					render={() => (
						<FormItem>
							<FormLabel className="text-base">
								Que tipos de eventos você organiza? *
							</FormLabel>
							<FormDescription>
								Selecione todos que se aplicam
							</FormDescription>
							<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
								{EVENT_TYPES.map((type) => (
									<FormField
										key={type.value}
										control={form.control}
										name="eventTypes"
										render={({ field }) => {
											const isChecked = field.value?.includes(type.value) || false;

											return (
												<FormItem>
													<label
														className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
															isChecked
																? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
																: 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
														}`}
													>
														<FormControl>
															<Checkbox
																checked={isChecked}
																onCheckedChange={(checked) => {
																	const current = field.value || [];
																	field.onChange(
																		checked
																			? [...current, type.value]
																			: current.filter((v: string) => v !== type.value)
																	);
																}}
																className="size-5"
															/>
														</FormControl>
														<div className="flex-1">
															<FormLabel className="flex cursor-pointer items-center gap-2 text-base font-medium">
																<span className="text-2xl">{type.emoji}</span>
																{type.label}
															</FormLabel>
														</div>
													</label>
												</FormItem>
											);
										}}
									/>
								))}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
			</section>

			<Separator />

			{/* Seção: Escala dos Eventos */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Escala dos Eventos
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="estimatedAttendees"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="estimatedAttendees" className="text-base">
									Público estimado por evento *
								</FormLabel>
								<FormControl>
									<select
										id="estimatedAttendees"
										{...field}
										className="h-12 w-full rounded-lg border-2 border-gray-200 bg-white px-4 text-base transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-950"
									>
										<option value="">Selecione...</option>
										<option value="0-100">Até 100 pessoas</option>
										<option value="100-500">100 a 500 pessoas</option>
										<option value="500-1000">500 a 1.000 pessoas</option>
										<option value="1000-5000">1.000 a 5.000 pessoas</option>
										<option value="5000+">Mais de 5.000 pessoas</option>
									</select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="eventFrequency"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="eventFrequency" className="text-base">
									Frequência de eventos *
								</FormLabel>
								<FormControl>
									<select
										id="eventFrequency"
										{...field}
										className="h-12 w-full rounded-lg border-2 border-gray-200 bg-white px-4 text-base transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-950"
									>
										<option value="">Selecione...</option>
										<option value="weekly">Semanalmente</option>
										<option value="biweekly">Quinzenalmente</option>
										<option value="monthly">Mensalmente</option>
										<option value="quarterly">Trimestralmente</option>
										<option value="occasional">Ocasionalmente</option>
									</select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			<Separator />

			{/* Seção: Conte mais */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Conte Mais
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="description" className="text-base">
								Fale sobre seus eventos *
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Textarea
										id="description"
										placeholder={
											experience === 'beginner'
												? 'Ex: Planejo organizar festas universitárias mensais com música ao vivo. Já tenho contato com alguns bares e estou formando uma equipe.'
												: eventTypes.includes('shows')
													? 'Ex: Festivais de música eletrônica com lineup internacional. Estrutura completa: 3 palcos, área vip, food trucks. Público médio de 3 mil pessoas.'
													: 'Fale sobre o tipo de evento, público-alvo, diferenciais, histórico e planos para os próximos meses...'
										}
										className="min-h-[150px] resize-none text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										maxLength={500}
										{...field}
									/>
									<div className="absolute bottom-3 right-3 flex items-center gap-2">
										<span
											className={`text-xs ${
												description.length < 50
													? 'text-red-500'
													: description.length >= 500
														? 'text-orange-500'
														: 'text-gray-400'
											}`}
										>
											{description.length}/500
										</span>
									</div>
								</div>
							</FormControl>
							<FormDescription>
								{description.length < 50 ? (
									<span className="text-red-600">
										Continue escrevendo... faltam {50 - description.length} caracteres
									</span>
								) : (
									'Quanto mais detalhes, mais rápida será a análise ✓'
								)}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Dicas contextuais baseadas no tipo de evento */}
				{eventTypes.includes('shows') && (
					<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
						<Info className="size-4 text-blue-600" />
						<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
							💡 Dica: Mencione bandas/artistas que já tocaram, estrutura de palco, equipamentos de som
						</AlertDescription>
					</Alert>
				)}

				{eventTypes.includes('corporate') && (
					<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
						<Info className="size-4 text-blue-600" />
						<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
							💡 Dica: Cite empresas atendidas (se possível), serviços oferecidos, especialidades
						</AlertDescription>
					</Alert>
				)}

				<FormField
					control={form.control}
					name="goals"
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="goals" className="text-base">
								Quais seus objetivos na plataforma? *
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Textarea
										id="goals"
										placeholder="Ex: Profissionalizar a venda de ingressos, ter relatórios de público, facilitar check-in, aumentar a visibilidade dos eventos..."
										className="min-h-[120px] resize-none text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										maxLength={300}
										{...field}
									/>
									<div className="absolute bottom-3 right-3">
										<span
											className={`text-xs ${
												goals.length >= 300 ? 'text-orange-500' : 'text-gray-400'
											}`}
										>
											{goals.length}/300
										</span>
									</div>
								</div>
							</FormControl>
							<FormDescription>
								{goals.length < 20 ? (
									<span className="text-red-600">
										Continue escrevendo... faltam {20 - goals.length} caracteres
									</span>
								) : (
									'Ajuda nossa equipe a personalizar sua experiência ✓'
								)}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</section>
		</div>
	);
}

// Step 3: Confirmação e Revisão
export function Step3Review({ form }: { form: any }) {
	const values = form.getValues();

	return (
		<div className="space-y-6">
			{/* Info Box */}
			<Alert className="border-2 border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20">
				<Sparkles className="size-5 text-purple-600" />
				<AlertTitle className="text-purple-900 dark:text-purple-100">
					Quase lá! Revise suas informações
				</AlertTitle>
				<AlertDescription className="text-purple-700 dark:text-purple-300">
					Certifique-se de que todos os dados estão corretos. Você poderá editar depois se necessário.
				</AlertDescription>
			</Alert>

			{/* Revisão dos Dados */}
			<div className="space-y-4">
				{/* Seção 1: Identificação */}
				<ReviewCard
					title="Identificação"
					emoji="👤"
					data={{
						Organização: values.organizationName,
						Email: values.contactEmail,
						Telefone: values.phone,
						'CPF/CNPJ': values.document || 'Não informado',
						Website: values.website || 'Não informado',
						Instagram: values.instagram || 'Não informado',
						Experiência:
							values.hasExperience === 'yes'
								? 'Experiente'
								: values.hasExperience === 'some'
									? 'Alguns eventos'
									: values.hasExperience === 'beginner'
										? 'Iniciante'
										: 'Não informado'
					}}
				/>

				{/* Seção 2: Sobre os Eventos */}
				<ReviewCard
					title="Sobre os Eventos"
					emoji="🎉"
					data={{
						'Tipos de evento': (() => {
							const types = values.eventTypes || [];
							const typeLabels = types.map((t: string) => {
								const found = EVENT_TYPES.find((et) => et.value === t);
								
return found ? `${found.emoji} ${found.label}` : t;
							});
							
return typeLabels.length > 0 ? typeLabels.join(', ') : 'Nenhum selecionado';
						})(),
						'Público estimado': (() => {
							const attendees = values.estimatedAttendees;
							const labels: Record<string, string> = {
								'0-100': 'Até 100 pessoas',
								'100-500': '100 a 500 pessoas',
								'500-1000': '500 a 1.000 pessoas',
								'1000-5000': '1.000 a 5.000 pessoas',
								'5000+': 'Mais de 5.000 pessoas'
							};
							
return labels[attendees] || 'Não informado';
						})(),
						Frequência: (() => {
							const frequency = values.eventFrequency;
							const labels: Record<string, string> = {
								weekly: 'Semanalmente',
								biweekly: 'Quinzenalmente',
								monthly: 'Mensalmente',
								quarterly: 'Trimestralmente',
								occasional: 'Ocasionalmente'
							};
							
return labels[frequency] || 'Não informado';
						})()
					}}
				/>

				{/* Descrição Expandida */}
				<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
					<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
						<span>📝</span>
						Sobre seus eventos
					</h4>
					<p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{values.description || 'Não informado'}
					</p>
				</div>

				<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
					<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
						<span>🎯</span>
						Seus objetivos
					</h4>
					<p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{values.goals || 'Não informado'}
					</p>
				</div>
			</div>

			{/* What Happens Next */}
			<Alert className="border-2 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
				<Info className="size-5 text-blue-600" />
				<AlertTitle className="text-blue-900 dark:text-blue-100">
					O que acontece depois?
				</AlertTitle>
				<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
					<ol className="mt-2 space-y-2">
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Nossa equipe analisa sua solicitação manualmente</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Você recebe email de aprovação em até 48 horas úteis</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Acesso liberado para criar e publicar seus eventos</span>
						</li>
					</ol>
				</AlertDescription>
			</Alert>

			{/* Termos de Uso */}
			<FormField
				control={form.control}
				name="acceptTerms"
				render={({ field }) => (
					<FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
						<FormControl>
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
								className="mt-1 size-5"
							/>
						</FormControl>
						<div className="flex-1 space-y-1 leading-none">
							<FormLabel className="cursor-pointer text-base font-semibold">
								Aceito os termos de uso e política de privacidade *
							</FormLabel>
							<FormDescription className="text-sm">
								Li e concordo com os{' '}
								<a
									href="/termos"
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 underline hover:text-purple-700"
								>
									termos de uso
								</a>{' '}
								e a{' '}
								<a
									href="/privacidade"
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 underline hover:text-purple-700"
								>
									política de privacidade
								</a>{' '}
								da plataforma.
							</FormDescription>
						</div>
					</FormItem>
				)}
			/>

			{/* Security Note */}
			<div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/40">
				<Lock className="size-5 flex-shrink-0 text-gray-400" />
				<p className="text-gray-600 dark:text-gray-400">
					Seus dados estão protegidos e serão usados apenas para análise da solicitação.
				</p>
			</div>
		</div>
	);
}

// Componente auxiliar: Card de revisão
function ReviewCard({
	title,
	emoji,
	data
}: {
	title: string;
	emoji: string;
	data: Record<string, string>;
}) {
	return (
		<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
			<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
				<span className="text-xl">{emoji}</span>
				{title}
			</h4>
			<dl className="space-y-2">
				{Object.entries(data).map(([key, value]) => (
					<div key={key} className="flex justify-between gap-4 text-sm">
						<dt className="font-medium text-gray-600 dark:text-gray-400">{key}:</dt>
						<dd className="max-w-[60%] text-right text-gray-900 dark:text-white">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
