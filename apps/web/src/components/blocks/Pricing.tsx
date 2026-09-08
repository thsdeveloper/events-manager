import Tagline from '@/components/ui/Tagline';
import Headline from '@/components/ui/Headline';
import PricingCard from '@/components/blocks/PricingCard';

interface PricingCardType {
	id: string;
	title: string;
	description?: string;
	price?: string;
	badge?: string;
	features?: string[];
	button?: {
		id: string;
		label: string | null;
		variant: string | null;
		url: string | null;
	};
	is_highlighted?: boolean;
}

interface PricingData {
	id: string;
	tagline?: string;
	headline?: string;
	pricing_cards: PricingCardType[];
}

interface PricingProps {
	data: PricingData;
}

const Pricing = ({ data }: PricingProps) => {
	const { id, tagline, headline, pricing_cards } = data;

	if (!pricing_cards || !Array.isArray(pricing_cards)) {
		return null;
	}

	const gridClasses = (() => {
		if (pricing_cards.length === 1) return 'grid-cols-1';
		if (pricing_cards.length % 3 === 0) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

		return 'grid-cols-1 sm:grid-cols-2';
	})();

	return (
		<section>
			{tagline && <Tagline as="p" tagline={tagline} />}
			{headline && <Headline as="h2" headline={headline} />}
			<div className={`grid gap-6 mt-8 ${gridClasses}`}>
				{pricing_cards.map((card) => (
					<PricingCard key={card.id} card={card} />
				))}
			</div>
		</section>
	);
};

export default Pricing;
