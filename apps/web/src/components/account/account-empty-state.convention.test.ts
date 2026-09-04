import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Os estados vazios da área da conta ("Meus ingressos", "Pagamentos") devem
 * compartilhar o mesmo componente, para que a pessoa reconheça o padrão e as
 * mudanças de estilo aconteçam em um lugar só.
 */
const consumers = ['src/components/tickets/MyTicketsContent.tsx', 'src/components/account/TransactionHistory.tsx'];

describe('account empty states', () => {
	it.each(consumers)('%s renders its empty state through AccountEmptyState', (file) => {
		const source = readFileSync(join(process.cwd(), file), 'utf8');

		expect(source).toContain('<AccountEmptyState');
		expect(source).not.toMatch(/Nenhum (ingresso|pagamento)[^<]*<\/h[23]>/);
	});
});
