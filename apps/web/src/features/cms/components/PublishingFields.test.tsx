import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { PublishingFields } from './PublishingFields';
it('schedules in the user timezone through a calendar and can return to immediate publication', async () => {
	const change = vi.fn();
	const { user } = renderWithProviders(
		<PublishingFields
			status="published"
			publishedAt={new Date(2026, 10, 17, 15, 30).toISOString()}
			onStatusChange={vi.fn()}
			onPublishedAtChange={change}
		/>,
	);
	await user.click(screen.getByRole('button', { name: 'Data de publicação' }));
	expect(screen.getByLabelText('Horário')).toHaveValue('15:30');
	await user.click(screen.getByRole('button', { name: /18 de novembro de 2026/i }));
	expect(change).toHaveBeenCalledWith(new Date(2026, 10, 18, 15, 30).toISOString());
	await user.click(screen.getByRole('button', { name: 'Limpar data' }));
	expect(change).toHaveBeenLastCalledWith(null);
});
