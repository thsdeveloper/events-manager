export interface TicketPricingConfiguration {
	platform_fee_percentage?: number | null;
	platform_fee_minimum?: number | null;
}
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
/** Fee is per individual ticket; a free admission never incurs a minimum. */
export function calculateUnitPlatformFee(price: number, configuration: TicketPricingConfiguration): number {
	if (!Number.isFinite(price) || price < 0) throw new RangeError('Invalid ticket price');
	if (price === 0) return 0;
	const percentage = Number(configuration.platform_fee_percentage ?? 0);
	const minimum = Number(configuration.platform_fee_minimum ?? 0);
	if (!Number.isFinite(percentage) || percentage < 0 || !Number.isFinite(minimum) || minimum < 0)
		throw new RangeError('Invalid fee configuration');
	return money(Math.max(money((price * percentage) / 100), minimum));
}
export function calculateUnitBuyerPrice(
	price: number,
	serviceFeeType: string,
	configuration: TicketPricingConfiguration,
): number {
	const fee = calculateUnitPlatformFee(price, configuration);
	return money(price + (serviceFeeType === 'passed_to_buyer' ? fee : 0));
}
