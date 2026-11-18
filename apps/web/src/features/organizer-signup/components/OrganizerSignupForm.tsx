'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { organizerSignupSchema, type OrganizerAccountType, type OrganizerSignupInput } from '@events-manager/contracts';
import { ArrowRight, Building2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/masked-inputs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { maskCNPJ, onlyDigits } from '@/lib/br-documents';
import { cn } from '@/lib/utils';
import { ACCOUNT_TYPE_OPTIONS, formatCpf, signupDefaults, type SignupProfile } from '../lib/signup-defaults';

interface FormValues {
	accept_terms: boolean;
	account_type: OrganizerAccountType;
	description: string;
	document: string;
	email: string;
	name: string;
	phone: string;
	website: string;
}

// O schema transforma (dígitos, nulos) e descarta o CPF de pessoa física;
// o resolver é tipado com o estado bruto do formulário e a saída validada.
const resolver = zodResolver(organizerSignupSchema) as unknown as Resolver<FormValues>;

interface OrganizerSignupFormProps {
	user: SignupProfile;
	onSuccess: (organizerId?: string) => void | Promise<void>;
	initialAccountType?: OrganizerAccountType;
}

const icons = { individual: UserRound, company: Building2 } as const;

function defaultValues(user: SignupProfile, accountType: OrganizerAccountType): FormValues {
	const defaults = signupDefaults(user, accountType);

	return {
		account_type: accountType,
		name: defaults.name,
		email: defaults.email,
		phone: defaults.phone,
		document: defaults.document,
		description: '',
		website: '',
		accept_terms: false,
	};
}

/**
 * Cadastro de organizador em uma tela só. Pessoa física vende com o CPF já
 * validado no perfil (o campo é somente leitura e o documento nem viaja no
 * pedido); empresa informa o CNPJ. Validação no blur e no envio pelo mesmo
 * contrato Zod que a API usa, então o que passa aqui passa lá.
 */
export function OrganizerSignupForm({ user, onSuccess, initialAccountType = 'individual' }: OrganizerSignupFormProps) {
	const id = useId();
	const { toast } = useToast();
	const form = useForm<FormValues>({
		resolver,
		defaultValues: defaultValues(user, initialAccountType),
		mode: 'onBlur',
	});
	const accountType = form.watch('account_type');
	const profileCpf = onlyDigits(user.document ?? '');
	// Regra de negócio: pessoa física vende com os dados validados no perfil.
	// Os campos só mostram o que a API vai usar; para mudar, edita-se o perfil.
	const locked = accountType === 'individual';
	const labels = locked
		? { name: 'Nome', email: 'Seu e-mail', phone: 'Seu telefone' }
		: { name: 'Nome da organização ou marca *', email: 'E-mail de contato *', phone: 'Telefone com DDD *' };

	function switchAccountType(next: OrganizerAccountType) {
		if (next === accountType) return;
		const { description, website, accept_terms } = form.getValues();
		// Contato e textos livres sobrevivem à troca; nome e documento pertencem ao tipo escolhido.
		form.reset({ ...defaultValues(user, next), description, website, accept_terms });
	}

	async function submit(values: FormValues) {
		// O resolver já devolveu os valores transformados; o parse só devolve o tipo exato do contrato.
		const payload: OrganizerSignupInput = organizerSignupSchema.parse(values);
		try {
			const response = await fetch('/api/organizer/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) {
				const fieldErrors = (body?.context?.errors?.fieldErrors ?? {}) as Record<string, string[]>;
				for (const [field, messages] of Object.entries(fieldErrors)) {
					if (messages?.[0]) form.setError(field as keyof FormValues, { message: messages[0] });
				}
				toast({
					title: 'Não foi possível cadastrar',
					description: body?.detail ?? 'Não foi possível concluir o cadastro. Tente novamente.',
					variant: 'destructive',
				});

				return;
			}
			toast({
				title: 'Conta de organizador criada',
				description:
					body?.organizer?.status === 'pending'
						? 'Envie os dados de recebimento e os documentos para validar sua nova conta.'
						: 'Seu espaço está disponível. Complete a verificação para liberar vendas em produção.',
				variant: 'success',
			});
			await onSuccess(body?.organizer?.id);
		} catch {
			toast({
				title: 'Erro de conexão',
				description: 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.',
				variant: 'destructive',
			});
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-8">
				<FormField
					control={form.control}
					name="account_type"
					render={({ field }) => (
						<FormItem className="space-y-3">
							<FormLabel className="text-base font-semibold">Como você vai vender ingressos?</FormLabel>
							<FormControl>
								<RadioGroup
									value={field.value}
									onValueChange={(value) => switchAccountType(value as OrganizerAccountType)}
									className="grid gap-3 sm:grid-cols-2"
								>
									{ACCOUNT_TYPE_OPTIONS.map((option) => {
										const Icon = icons[option.value];
										const selected = field.value === option.value;

										return (
											<label
												key={option.value}
												htmlFor={`${id}-${option.value}`}
												className={cn(
													'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
													selected
														? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
														: 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900',
												)}
											>
												<RadioGroupItem id={`${id}-${option.value}`} value={option.value} className="mt-1" />
												<span className="min-w-0">
													<span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
														<Icon className="size-4 text-violet-600" aria-hidden="true" />
														{option.title}
													</span>
													<span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
														{option.description}
													</span>
												</span>
											</label>
										);
									})}
								</RadioGroup>
							</FormControl>
						</FormItem>
					)}
				/>

				<div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
					<div>
						<h2 className="font-semibold text-slate-950 dark:text-white">
							{locked ? 'Seus dados' : 'Dados da organização'}
						</h2>
						<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
							{locked
								? 'Vêm do seu perfil validado e aparecem na página dos seus eventos e nos e-mails enviados aos participantes.'
								: 'Aparecem na página dos seus eventos e nos e-mails enviados aos participantes.'}
						</p>
					</div>

					{accountType === 'individual' ? (
						<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
							<div className="flex items-start gap-3">
								<ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">CPF</p>
									<p className="font-mono text-lg tracking-wide text-emerald-950 dark:text-emerald-50">
										{formatCpf(profileCpf)}
									</p>
									<p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-200">
										<Lock className="size-3.5" aria-hidden="true" />
										Validado no seu perfil. Por segurança, uma conta só vende com o próprio CPF.
									</p>
								</div>
							</div>
						</div>
					) : (
						<FormField
							control={form.control}
							name="document"
							render={({ field }) => (
								<FormItem>
									<FormLabel>CNPJ *</FormLabel>
									<FormControl>
										<Input
											{...field}
											inputMode="numeric"
											placeholder="00.000.000/0000-00"
											value={maskCNPJ(field.value)}
											onChange={(event) => field.onChange(onlyDigits(event.target.value).slice(0, 14))}
										/>
									</FormControl>
									<FormDescription>Da empresa, produtora ou organização que vai receber os repasses.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{labels.name}</FormLabel>
								<FormControl>
									<Input {...field} maxLength={120} placeholder="Como o público conhece você" disabled={locked} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid gap-5 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{labels.email}</FormLabel>
									<FormControl>
										<Input {...field} type="email" autoComplete="email" disabled={locked} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{labels.phone}</FormLabel>
									<FormControl>
										<PhoneInput
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											name={field.name}
											showError={false}
											autoComplete="tel"
											disabled={locked}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{locked && (
						<p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
							<Lock className="size-3.5 shrink-0" aria-hidden="true" />
							<span>
								Dados validados no seu perfil. Para alterá-los,{' '}
								<Link
									href="/perfil?section=personal"
									className="font-medium text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
								>
									editar perfil
								</Link>
								.
							</span>
						</p>
					)}
				</div>

				<div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
					<div>
						<h2 className="font-semibold text-slate-950 dark:text-white">Sobre você (opcional)</h2>
						<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
							Ajuda o público a conhecer quem está por trás dos eventos.
						</p>
					</div>
					<FormField
						control={form.control}
						name="website"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Site ou rede social</FormLabel>
								<FormControl>
									<Input {...field} type="url" inputMode="url" placeholder="https://instagram.com/sua-marca" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Sobre seus eventos</FormLabel>
								<FormControl>
									<Textarea {...field} rows={3} maxLength={600} placeholder="Que tipo de eventos você organiza?" />
								</FormControl>
								<FormDescription>{field.value.length}/600</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="accept_terms"
					render={({ field }) => (
						<FormItem>
							<div className="flex items-start gap-3">
								<FormControl>
									<Checkbox
										id={`${id}-terms`}
										checked={field.value === true}
										onCheckedChange={(checked) => field.onChange(checked === true)}
									/>
								</FormControl>
								<label htmlFor={`${id}-terms`} className="text-sm leading-6 text-slate-700 dark:text-slate-300">
									Confirmo que as informações são verdadeiras e aceito os{' '}
									<Link
										href="/termos-de-uso"
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-violet-700 underline-offset-4 hover:underline"
									>
										termos de uso
									</Link>{' '}
									da plataforma, a{' '}
									<Link
										href="/politica-de-acesso"
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-violet-700 underline-offset-4 hover:underline"
									>
										política de acesso
									</Link>{' '}
									e a{' '}
									<Link
										href="/politica-de-privacidade"
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-violet-700 underline-offset-4 hover:underline"
									>
										política de privacidade
									</Link>
									.
								</label>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button asChild variant="ghost">
						<Link href="/perfil/organizador">Voltar</Link>
					</Button>
					<Button type="submit" size="lg" loading={form.formState.isSubmitting}>
						Criar conta de organizador
						<ArrowRight aria-hidden="true" />
					</Button>
				</div>
			</form>
		</Form>
	);
}
