import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function AccessDenied({ scope = 'organization' }: { scope?: 'organization' | 'platform' }) {
	return (
		<section
			role="alert"
			className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center"
		>
			<ShieldAlert className="size-10 text-muted-foreground" aria-hidden />
			<h1 className="text-xl font-semibold">Acesso não autorizado</h1>
			<p className="text-muted-foreground">
				{scope === 'platform'
					? 'Seu cargo não permite acessar esta área. Peça ao responsável pela equipe da plataforma para revisar suas permissões.'
					: 'Seu cargo não permite acessar esta área. Peça ao proprietário da organização para revisar suas permissões ou escolha outra organização.'}
			</p>
			<Button asChild variant="outline">
				<Link href="/perfil">Ir para meu perfil</Link>
			</Button>
		</section>
	);
}
