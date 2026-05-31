"use client";
import Link from "next/link";
import { Product } from "@/app/api/product";
import { getProductPricing } from "@/lib/pricing";
import "./ProductGrid.css";

export default function ProductGrid({ products = [] }: { products: Product[] }) {
	if (!products.length) return null;
	
	return (
		<ul className="productGrid">
			{products.map((product) => {
				const pricing = getProductPricing(product);

				return (
					<li key={product.id} className="productCard">
						<Link href={`/products/${product.id}`} className="productImageWrapper">
							<img
								src={`${process.env.NEXT_PUBLIC_API_URL}/images/${product.image_url}`}
								alt={product.name}
								className="productImage"
							/>
						</Link>
						<h3 className="productName">{product.name}</h3>
						<div className="productPriceRow">
							<span className="currentPrice">${pricing.currentPrice}</span>
							{pricing.hasDiscount && (
								<>
									<span className="oldPrice">${pricing.oldPrice}</span>
									<span className="productDiscount">−{pricing.discountPercent}%</span>
								</>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}