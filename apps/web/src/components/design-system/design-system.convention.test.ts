/**
 * A faixa de capa e o conteúdo da página do evento precisam nascer do mesmo
 * container. Quando cada bloco repete `max-w-7xl` com o seu próprio padding
 * horizontal, as duas colunas deixam de se alinhar — foi o que aconteceu com o
 * hero (`p-6 md:p-12`, 48px) contra o conteúdo (`lg:px-8`, 32px).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const EVENT_PAGE = 'src/features/event-page/components/DefaultEventPage.tsx';
const EVENT_HERO = 'src/components/design-system/organisms/EventHero.tsx';
const OVERLAY_BADGE = 'src/components/design-system/molecules/OverlayBadge.tsx';

describe('página pública do evento', () => {
	const source = readFileSync(EVENT_PAGE, 'utf8');

	it('alinha capa e conteúdo pelo Container do design system', () => {
		expect(source).toContain('<Container');
	});

	it('não repete a largura máxima à mão em nenhum bloco', () => {
		expect(source).not.toContain('max-w-7xl');
	});
});

/**
 * O hero é montado com as peças do design system, e não com `span`s soltos que
 * repetem pílula, vidro fosco e sombra a cada uso. Assim uma mudança de estilo
 * acontece num lugar só e o hero herda a tipografia do resto do produto.
 */
describe('EventHero', () => {
	const source = readFileSync(EVENT_HERO, 'utf8');

	it.each([['Container'], ['OverlayBadge'], ['OverlayFact'], ['Heading']])(
		'é montado com o %s do design system',
		(component) => {
			expect(source).toContain(`<${component}`);
		},
	);

	it('não redefine selos nem blocos de informação à mão', () => {
		expect(source).not.toContain('backdrop-blur');
		expect(source).not.toContain('rounded-full');
		expect(source).not.toContain('max-w-7xl');
	});

	it('não fixa o tamanho do título fora da escala tipográfica', () => {
		expect(source).not.toMatch(/text-(6|7)xl/);
	});
});

describe('OverlayBadge', () => {
	const source = readFileSync(OVERLAY_BADGE, 'utf8');

	it('usa cantos retos, como pedido para os selos de categoria e formato', () => {
		expect(source).toContain('rounded-none');
		expect(source).not.toMatch(/rounded-(full|sm|md|lg|xl)/);
	});
});
