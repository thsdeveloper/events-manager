import { ConfirmEmailForm } from './_components/ConfirmEmailForm';

interface ConfirmEmailPageProps {
	searchParams: Promise<{ email?: string | string[] }>;
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
	const params = await searchParams;
	const email = typeof params.email === 'string' ? params.email : '';

	return <ConfirmEmailForm initialEmail={email} />;
}
