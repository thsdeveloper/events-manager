/**
 * `MediaImage` recebe o arquivo inteiro ou só o id. Com o id, a única URL
 * possível é `/api/media/:id`, que responde com um redirecionamento para o
 * storage; o otimizador do `next/image` não segue redirecionamentos e devolve
 * erro, então nesse caso a imagem precisa sair sem otimização, direto para o
 * navegador, que segue o redirecionamento normalmente.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MediaImage from './MediaImage';

const ID = '00000000-0000-4000-8000-000000000051';

describe('MediaImage', () => {
	it('serves an id straight from the media route, skipping the image optimizer', () => {
		render(<MediaImage uuid={ID} alt="Capa" width={100} height={50} />);

		expect(screen.getByRole('img', { name: 'Capa' })).toHaveAttribute('src', `/api/media/${ID}`);
	});

	it('keeps the optimizer for a file with a storage path', () => {
		render(<MediaImage uuid={{ id: ID, bucket: 'media', path: 'capa.png' }} alt="Capa" width={100} height={50} />);

		expect(screen.getByRole('img', { name: 'Capa' }).getAttribute('src')).toMatch(/_next\/image|capa\.png/);
	});
});
