import type { Product } from "../app/api/product";

export type ProductPricing = {
	currentPrice: number;
	oldPrice: number | null;
	hasDiscount: boolean;
	discountPercent: number;
};

export function getProductPricing(product: Product): ProductPricing {
	const currentPrice = Number(product.price);
	const oldPrice = product.old_price != null ? Number(product.old_price) : null;
	const hasDiscount = oldPrice != null && !Number.isNaN(oldPrice) && oldPrice > currentPrice;
	const discountPercent = hasDiscount
		? Math.round((1 - currentPrice / oldPrice!) * 100)
		: 0;

	return { currentPrice, oldPrice, hasDiscount, discountPercent };
}